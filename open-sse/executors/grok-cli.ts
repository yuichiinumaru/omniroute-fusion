/**
 * GrokCliExecutor — Grok Build Provider
 *
 * Routes Responses API requests through Grok's chat proxy using OAuth authentication.
 * The standard BaseExecutor transport provides streaming, retries, abort propagation,
 * proxy-aware fetch dispatch, upstream-header merging, and credential-refresh persistence.
 */

import { PROVIDERS } from "../config/constants.ts";
import {
  getGrokBuildSessionHeaders,
  GROK_BUILD_DEFAULT_REASONING_EFFORT,
  GROK_BUILD_REASONING_INCLUDE,
  GROK_BUILD_RESPONSES_URL,
  GROK_BUILD_TOKEN_URL,
} from "../config/grokBuild.ts";
import { sanitizeErrorMessage } from "../utils/errorSanitizer.ts";
import { sanitizeErrorMessageForResponse, createErrorResult } from "../utils/error.ts";
import { isModelDenylisted } from "../../src/shared/utils/providerModelId.ts";
import { resolvePublicCred } from "../utils/publicCreds.ts";
import {
  BaseExecutor,
  type ExecuteInput,
  type ExecutorLog,
  type ProviderCredentials,
} from "./base.ts";

const GROK_BUILD_MAX_TOOLS = 200;
const GROK_BUILD_SUPPORTED_REASONING_EFFORTS = new Set(["low", "medium", "high"]);
/**
 * Depth ceiling for the recursive array flattening in
 * `sanitizeGrokBuildFunctionCallOutput`. Agent tool results are shallow in
 * practice; a hostile or buggy client that nests arrays thousands of levels deep
 * would otherwise blow the V8 call stack inside `transformRequest` and abort the
 * request with a RangeError instead of a sanitized upstream error.
 */
const GROK_BUILD_MAX_OUTPUT_DEPTH = 32;
/**
 * Lone (unpaired) UTF-16 surrogates are not encodable as JSON text and make
 * Grok's strict body parser reject the whole request. Well-formed surrogate
 * PAIRS (emoji, astral-plane glyphs) are valid and must survive untouched — a
 * blanket `[\uD800-\uDFFF]` replacement corrupts them into two replacement
 * characters, silently mangling legitimate tool output.
 */
const GROK_BUILD_LONE_SURROGATE_PATTERN =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const GROK_BUILD_REFRESH_MAX_ATTEMPTS = 3;
const GROK_BUILD_REFRESH_MIN_DELAY_MS = 200;
const GROK_BUILD_TERMINAL_REFRESH_ERRORS = new Set(["invalid_grant", "invalid_client"]);
const GROK_BUILD_UNSUPPORTED_PARAMS = [
  "presencePenalty",
  "frequencyPenalty",
  "logprobs",
  "topLogprobs",
  "presence_penalty",
  "frequency_penalty",
  "top_logprobs",
  "reasoning_effort",
];

/**
 * Grok Build's cli-chat-proxy is stricter about Responses `function_call_output.output`
 * than OpenAI's Responses API. Agent tool results can contain truncated / incomplete
 * JSON strings or invalid `\uXXXX` escapes, which fail upstream with:
 *   Failed to parse the request body as JSON: input[N].output: unexpected end of hex escape
 *
 * Normalize outputs to valid JSON text (or plain text) before dispatch (#7611).
 *
 * Contract: ALWAYS returns a string. `JSON.stringify` returns `undefined` (it does
 * not throw) for functions, symbols, and bare `undefined`, so every stringify
 * result is re-checked before it is handed back — otherwise the declared `string`
 * return type would be a lie and the item would ship upstream with a missing
 * `output` field, reproducing the very parse failure this repair exists to avoid.
 */
function sanitizeGrokBuildFunctionCallOutput(output: unknown, depth = 0): string {
  if (output == null) return "";
  if (typeof output === "string") {
    const value = output;
    const reparsed = reserializeJson(value);
    if (reparsed !== null) return reparsed;
    // Drop incomplete \u escapes (0-3 hex digits) that break strict JSON parsers.
    const repaired = value.replace(/\\u([0-9A-Fa-f]{0,3})(?![0-9A-Fa-f])/g, "");
    const reparsedRepaired = reserializeJson(repaired);
    if (reparsedRepaired !== null) return reparsedRepaired;
    // Replace only UNPAIRED surrogates; valid pairs (emoji) must survive.
    return repaired.replace(GROK_BUILD_LONE_SURROGATE_PATTERN, "\uFFFD");
  }
  if (Array.isArray(output)) {
    // Bounded recursion: beyond the depth ceiling, fall back to a non-recursive
    // serialization instead of overflowing the stack.
    if (depth >= GROK_BUILD_MAX_OUTPUT_DEPTH) return stringifyUnknown(output);
    const textParts = output
      .map((part) => {
        if (part && typeof part === "object" && !Array.isArray(part)) {
          const rec = part as Record<string, unknown>;
          if (typeof rec.text === "string") return rec.text;
        }
        return typeof part === "string" ? part : stringifyUnknown(part);
      })
      .join("\n");
    return sanitizeGrokBuildFunctionCallOutput(textParts, depth + 1);
  }
  return stringifyUnknown(output);
}

/**
 * `JSON.stringify` has two distinct non-string outcomes that must not be
 * conflated: it THROWS on circular structures / BigInt, and it RETURNS
 * `undefined` for functions, symbols, and `undefined`. Collapse both into a
 * safe string so callers never receive a non-string value.
 */
function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized === "string") return serialized;
  } catch {
    // Circular structure, BigInt, a throwing toJSON, or a structure deep enough
    // to overflow JSON.stringify's native recursion — fall through.
  }
  try {
    // `String(deeplyNestedArray)` recurses through Array.prototype.join and can
    // overflow the stack on its own, so this fallback is guarded too.
    return String(value);
  } catch {
    return "";
  }
}

/**
 * Parse `value` and re-serialize it canonically. Returns `null` when the value
 * is not valid JSON or does not re-serialize to a string, so the caller can fall
 * through to the repair path instead of shipping `undefined` upstream.
 */
function reserializeJson(value: string): string | null {
  try {
    const serialized = JSON.stringify(JSON.parse(value));
    return typeof serialized === "string" ? serialized : null;
  } catch {
    return null;
  }
}

function sanitizeGrokBuildResponsesBody(body: Record<string, unknown>): Record<string, unknown> {
  const input = body.input;
  if (!Array.isArray(input)) return body;
  let changed = false;
  const nextInput = input.map((item) => {
    if (!item || typeof item !== "object") return item;
    const rec = item as Record<string, unknown>;
    if (rec.type !== "function_call_output") return item;
    const sanitized = sanitizeGrokBuildFunctionCallOutput(rec.output);
    if (sanitized === rec.output) return item;
    changed = true;
    return { ...rec, output: sanitized };
  });
  return changed ? { ...body, input: nextInput } : body;
}

type GrokBuildRefreshResult = Partial<ProviderCredentials> | null | undefined;

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Redact known credential material from a message before it reaches a log sink.
 *
 * Transport-layer failures routinely embed the request they were building
 * (proxy/TLS/URL errors, upstream `error_description` echoes), so a raw
 * `error.message` can carry the refresh or access token verbatim. Neither
 * `sanitizeErrorMessage()` nor path stripping removes those — they are opaque
 * high-entropy strings — so redact the exact secret values we hold.
 * See AGENTS.md Hard Rule #12 and the task's "never log bearer/refresh tokens".
 */
function redactGrokBuildSecrets(message: string, credentials: ProviderCredentials): string {
  let safe = message;
  for (const secret of [credentials?.refreshToken, credentials?.accessToken]) {
    if (typeof secret === "string" && secret.length >= 8) {
      safe = safe.split(secret).join("[REDACTED]");
    }
  }
  return safe;
}

function getRefreshRetryDelayMs(retryNumber: number): number {
  const baseDelay = Math.min(
    2_000,
    GROK_BUILD_REFRESH_MIN_DELAY_MS * 2 ** Math.max(0, retryNumber - 1)
  );
  return Math.max(1, Math.round(baseDelay * (0.5 + Math.random())));
}

function asRequestRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function ensureReasoningInclude(value: unknown): unknown[] {
  const include = Array.isArray(value) ? [...value] : [];
  if (!include.includes(GROK_BUILD_REASONING_INCLUDE)) {
    include.push(GROK_BUILD_REASONING_INCLUDE);
  }
  return include;
}

function normalizeGrokBuildReasoning(
  value: unknown,
  model: string
): Record<string, unknown> | null {
  const reasoning = asRequestRecord(value);
  const hasExplicitEffort = Object.prototype.hasOwnProperty.call(reasoning, "effort");
  if (!GROK_BUILD_SUPPORTED_REASONING_EFFORTS.has(String(reasoning.effort))) {
    delete reasoning.effort;
  }
  if (model === "grok-composer-2.5-fast") {
    delete reasoning.effort;
  } else if (!hasExplicitEffort) {
    reasoning.effort = GROK_BUILD_DEFAULT_REASONING_EFFORT;
  }
  return Object.keys(reasoning).length > 0 ? reasoning : null;
}

function stripUnsupportedGrokBuildParams(request: Record<string, unknown>): void {
  for (const param of GROK_BUILD_UNSUPPORTED_PARAMS) {
    delete request[param];
  }
}

async function refreshGrokBuildCredentialsOnce(
  body: URLSearchParams,
  credentials: ProviderCredentials,
  attempt: number,
  log?: ExecutorLog | null
): Promise<GrokBuildRefreshResult> {
  try {
    const response = await fetch(GROK_BUILD_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const errorCode = nonEmptyString(data.error);
      const isTerminal =
        attempt === GROK_BUILD_REFRESH_MAX_ATTEMPTS ||
        (errorCode !== null && GROK_BUILD_TERMINAL_REFRESH_ERRORS.has(errorCode));
      log?.warn?.("TOKEN_REFRESH", `Grok Build: refresh failed with status ${response.status}`);
      return isTerminal ? null : undefined;
    }

    const accessToken = nonEmptyString(data.access_token);
    if (!accessToken) {
      log?.warn?.("TOKEN_REFRESH", "Grok Build: no access_token in refresh response");
      return attempt === GROK_BUILD_REFRESH_MAX_ATTEMPTS ? null : undefined;
    }

    const expiresIn =
      typeof data.expires_in === "number" && Number.isFinite(data.expires_in) && data.expires_in > 0
        ? data.expires_in
        : 21600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    log?.info?.("TOKEN_REFRESH", `Grok Build: token refreshed, expires ${expiresAt}`);

    return {
      accessToken,
      refreshToken: nonEmptyString(data.refresh_token) || credentials.refreshToken,
      expiresAt,
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    log?.warn?.(
      "TOKEN_REFRESH",
      `Grok Build: refresh error: ${redactGrokBuildSecrets(
        sanitizeErrorMessage(rawMessage),
        credentials
      )}`
    );
    return attempt === GROK_BUILD_REFRESH_MAX_ATTEMPTS ? null : undefined;
  }
}

export class GrokCliExecutor extends BaseExecutor {
  constructor() {
    super("grok-cli", PROVIDERS["grok-cli"]);
  }

  async execute(input: ExecuteInput) {
    const requestedModel = input.model || "grok-composer-2.5-fast";
    // Task 0160 re-evaluation + Task 0176: "passthrough pleno + denylist
    // explícita". The static registry list is catalog info (passthroughModels:
    // true), so unknown ids are left for the UPSTREAM to classify. Only the
    // sourced denylist (legacy grok-build shorthand) is rejected here.
    if (isModelDenylisted("grok-cli", requestedModel)) {
      return createErrorResult(
        400,
        `Unknown model '${requestedModel}' for provider 'grok-cli' (denylisted).`,
        null,
        "unknown_model",
        "invalid_request_error"
      );
    }

    const result = await super.execute({ ...input, model: requestedModel });
    if (result.response.ok) return result;

    const rawBody = await result.response.clone().text().catch(() => "");
    let parsed: Record<string, unknown> = {};
    try {
      const value = JSON.parse(rawBody);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
      }
    } catch {
      // Preserve only a bounded, sanitized status message below.
    }

    const upstreamError =
      parsed.error && typeof parsed.error === "object" && !Array.isArray(parsed.error)
        ? (parsed.error as Record<string, unknown>)
        : {};
    const upstreamMessage =
      typeof upstreamError.message === "string"
        ? upstreamError.message
        : typeof parsed.error === "string"
          ? parsed.error
          : rawBody || `HTTP ${result.response.status}`;
    const safeMessage = sanitizeErrorMessageForResponse(upstreamMessage);
    const contextualMessage = `grok-cli/${requestedModel}: ${safeMessage}`;
    const errorCode =
      typeof upstreamError.code === "string" ? upstreamError.code : "upstream_error";
    const errorType =
      typeof upstreamError.type === "string" ? upstreamError.type : "upstream_error";

    return createErrorResult(
      result.response.status,
      contextualMessage,
      null,
      errorCode,
      errorType
    );
  }

  buildUrl(
    _model: string,
    _stream: boolean,
    _urlIndex = 0,
    _credentials: ProviderCredentials | null = null
  ) {
    return GROK_BUILD_RESPONSES_URL;
  }

  async refreshCredentials(
    credentials: ProviderCredentials,
    log?: ExecutorLog | null
  ): Promise<Partial<ProviderCredentials> | null> {
    if (!credentials?.refreshToken) {
      log?.warn?.("TOKEN_REFRESH", "Grok Build: no refresh token available");
      return null;
    }

    const clientId = resolvePublicCred("grok_id", "GROK_OAUTH_CLIENT_ID");

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: credentials.refreshToken,
    });

    const providerData = credentials.providerSpecificData || {};
    const principalType = nonEmptyString(providerData.principalType);
    const principalId = nonEmptyString(providerData.principalId);
    if (principalType) body.set("principal_type", principalType);
    if (principalId) body.set("principal_id", principalId);

    for (let attempt = 1; attempt <= GROK_BUILD_REFRESH_MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        const delayMs = getRefreshRetryDelayMs(attempt - 1);
        log?.debug?.(
          "TOKEN_REFRESH",
          `Grok Build: retrying token refresh (${attempt}/${GROK_BUILD_REFRESH_MAX_ATTEMPTS})`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const refreshed = await refreshGrokBuildCredentialsOnce(body, credentials, attempt, log);
      if (refreshed !== undefined) return refreshed;
    }

    return null;
  }

  buildHeaders(
    credentials: ProviderCredentials,
    stream = true,
    clientHeaders?: Record<string, string> | null,
    model?: string
  ) {
    const headers = super.buildHeaders(credentials, stream, clientHeaders, model);
    const providerData = credentials.providerSpecificData || {};
    const principalType = nonEmptyString(providerData.principalType);
    const sessionHeaders = getGrokBuildSessionHeaders({
      model,
      stream,
      userId: nonEmptyString(providerData.userId),
      email: nonEmptyString(credentials.email) || nonEmptyString(providerData.email),
      principalType,
    });

    // Preserve the standard GROK_CLI_USER_AGENT override produced by BaseExecutor.
    if (headers["User-Agent"] || headers["user-agent"]) {
      delete sessionHeaders["User-Agent"];
    }

    return { ...headers, ...sessionHeaders };
  }

  transformRequest(
    model: string,
    body: unknown,
    stream: boolean,
    _credentials: ProviderCredentials
  ) {
    const base = super.transformRequest(model, body, stream, _credentials);
    const transformed = asRequestRecord(base);
    const effectiveModel = (transformed.model as string) || model || "grok-composer-2.5-fast";
    transformed.model = effectiveModel;
    transformed.stream = !!stream;

    // Grok Build applies these Responses defaults before every request.
    if (transformed.store === undefined) transformed.store = false;
    transformed.include = ensureReasoningInclude(transformed.include);

    // OpenAI-compatible clients may carry fields the Grok Responses endpoint rejects.
    stripUnsupportedGrokBuildParams(transformed);

    const reasoning = normalizeGrokBuildReasoning(transformed.reasoning, effectiveModel);
    if (reasoning) {
      transformed.reasoning = reasoning;
    } else {
      delete transformed.reasoning;
    }

    // xAI's cli-chat-proxy rejects requests containing more than 200 tools.
    if (Array.isArray(transformed.tools) && transformed.tools.length > GROK_BUILD_MAX_TOOLS) {
      transformed.tools = transformed.tools.slice(0, GROK_BUILD_MAX_TOOLS);
    }

    // Repair tool-result payloads that would fail Grok's strict JSON body parser (#7611).
    return sanitizeGrokBuildResponsesBody(transformed);
  }
}
