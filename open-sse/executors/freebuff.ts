import { randomUUID } from "crypto";
import {
  BaseExecutor,
  mergeUpstreamExtraHeaders,
  type ExecuteInput,
  type ProviderCredentials,
} from "./base.ts";
import {
  ensureFreebuffSession,
  releaseFreebuffSession,
  ProviderError,
} from "../services/freebuffSession.ts";
import { recordProviderFailure } from "../services/accountFallback.ts";
import { getProviderErrorRuleMatch } from "../config/providerErrorRules.ts";
import {
  sanitizeErrorMessageForResponse,
  buildErrorBody,
} from "../utils/error.ts";

export const FREEBUFF_DOWNGRADE_MODEL_ID = "inclusionai/ling-3.0-tiny:free";

export const GENERIC_TOOL_NAMES: ReadonlySet<string> = new Set([
  "write_file",
  "web_search",
  "glob",
  "skill",
  "apply_patch",
]);

export const FREEBUFF_CUSTOM_TOOL_NAMES = ["decide"] as const;

export const COMPOSIO_META_TOOL_NAMES = [
  "composio_manage_connections",
  "composio_multi_execute_tool",
  "composio_search_tools",
  "composio_get_tool_schemas",
] as const;

export const FREEBUFF_SIGNATURE_TOOL_NAMES: ReadonlySet<string> = new Set([
  "add_subgoal",
  "add_message",
  "ask_user",
  "browser_logs",
  "code_search",
  "cloud_plan_ready",
  "create_plan",
  "decide",
  "end_turn",
  "find_files",
  "gravity_index",
  "list_directory",
  "lookup_agent_info",
  "propose_str_replace",
  "propose_write_file",
  "read_docs",
  "read_files",
  "read_subtree",
  "read_url",
  "render_ui",
  "run_file_change_hooks",
  "run_terminal_command",
  "set_messages",
  "set_output",
  "spawn_agents",
  "spawn_agent_inline",
  "str_replace",
  "suggest_followups",
  "task_completed",
  "think_deeply",
  "update_subgoal",
  "write_todos",
  ...COMPOSIO_META_TOOL_NAMES,
]);

export const FREEBUFF_DEFAULT_SIGNATURE_TOOL = {
  type: "function",
  function: {
    name: "think_deeply",
    description: "Think deeply about the task and plan next steps",
    parameters: {
      type: "object",
      properties: {
        thought: { type: "string", description: "Detailed reasoning" },
      },
      required: ["thought"],
    },
  },
};

export function readToolNames(tools: unknown): string[] {
  if (!Array.isArray(tools)) return [];
  return tools
    .map((tool) =>
      tool && typeof tool === "object"
        ? (tool as { function?: { name?: unknown }; name?: unknown }).function?.name ||
          (tool as { name?: unknown }).name
        : undefined
    )
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

export function hasSignatureTool(tools: unknown): boolean {
  const offered = readToolNames(tools);
  return offered.some((name) => FREEBUFF_SIGNATURE_TOOL_NAMES.has(name));
}

export class FreebuffExecutor extends BaseExecutor {
  constructor() {
    super("freebuff", {
      id: "freebuff",
      baseUrl: "https://codebuff.com/api/v1/chat/completions",
    });
  }

  buildUrl(_model: string, _stream: boolean, _urlIndex = 0, _credentials = null): string {
    return "https://codebuff.com/api/v1/chat/completions";
  }

  buildHeaders(
    credentials?: ProviderCredentials,
    stream = false,
    _clientHeaders?: Record<string, string>,
    model?: string
  ): Record<string, string> {
    const token = credentials?.accessToken || credentials?.apiKey || "";
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ai-sdk/openai-compatible/0.1.0/codebuff",
      Accept: stream ? "text/event-stream" : "application/json",
    };
    if (model) {
      headers["x-freebuff-model"] = model;
    }
    return headers;
  }

  transformRequest(
    model: string,
    body: unknown,
    stream: boolean,
    credentials: ProviderCredentials
  ): unknown {
    const transformed = super.transformRequest(model, body, stream, credentials);
    if (!transformed || typeof transformed !== "object" || Array.isArray(transformed)) {
      return transformed;
    }
    const out = { ...(transformed as Record<string, unknown>) };
    out.model = model;
    out.stream = stream;

    const existingMeta =
      out.codebuff_metadata && typeof out.codebuff_metadata === "object"
        ? (out.codebuff_metadata as Record<string, unknown>)
        : {};

    const hasToolsArray = Array.isArray(out.tools) && out.tools.length > 0;
    const hasToolChoice = out.tool_choice !== undefined;

    if (hasToolsArray) {
      const offeredNames = readToolNames(out.tools);
      const isSignaturePresent = offeredNames.some((name) =>
        FREEBUFF_SIGNATURE_TOOL_NAMES.has(name)
      );

      if (!isSignaturePresent) {
        out.tools = [...(out.tools as unknown[]), FREEBUFF_DEFAULT_SIGNATURE_TOOL];
      }

      out.codebuff_metadata = {
        client: "codebuff-cli",
        client_id: "cb-client-01",
        run_id: `run-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        foreign_toolset: false,
        ...existingMeta,
      };
    } else if (hasToolChoice) {
      out.tools = [FREEBUFF_DEFAULT_SIGNATURE_TOOL];
      out.codebuff_metadata = {
        client: "codebuff-cli",
        client_id: "cb-client-01",
        run_id: `run-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        foreign_toolset: false,
        ...existingMeta,
      };
    } else {
      out.codebuff_metadata = {
        client: "codebuff-cli",
        ...existingMeta,
      };
    }

    return out;
  }

  async execute(input: ExecuteInput) {
    const {
      model,
      body,
      stream,
      credentials,
      signal,
      log,
      upstreamExtraHeaders,
      clientHeaders,
    } = input;

    const url = this.buildUrl(model, stream, 0, credentials);
    const activeCredentials = credentials;
    let instanceId: string;

    try {
      instanceId = await ensureFreebuffSession(activeCredentials, model, { signal });
    } catch (err: unknown) {
      log?.error?.("FREEBUFF", `Session admission error: ${sanitizeErrorMessageForResponse(err)}`);
      if (err instanceof ProviderError && err.status === 429) {
        recordProviderFailure("freebuff", log, activeCredentials?.connectionId);
        const reason = err.reason || "rate_limited";
        const safeMessage =
          sanitizeErrorMessageForResponse(err.message) ||
          "Freebuff session admission rate limit exceeded";

        let retryAfterSec = err.retryAfter;
        if (!retryAfterSec) {
          const ruleMatch = getProviderErrorRuleMatch(
            "freebuff",
            429,
            {},
            { error: reason, reason, message: safeMessage }
          );
          if (ruleMatch?.cooldownMs) {
            retryAfterSec = Math.ceil(ruleMatch.cooldownMs / 1000);
          }
        }
        if (!retryAfterSec || retryAfterSec <= 0) {
          retryAfterSec = 5;
        }

        const errorBody = {
          error: {
            message: safeMessage,
            type: "rate_limit_error",
            code: "rate_limit_exceeded",
            reason,
            retry_after: retryAfterSec,
          },
        };
        const structured429 = new Response(JSON.stringify(errorBody), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSec),
          },
        });
        return {
          response: structured429,
          url,
          headers: this.buildHeaders(activeCredentials, stream, clientHeaders, model),
          transformedBody: this.transformRequest(model, body, stream, activeCredentials),
        };
      }
      throw err;
    }

    const makeAttempt = async (currentInstanceId: string) => {
      const headers = this.buildHeaders(activeCredentials, stream, clientHeaders, model);
      headers["x-freebuff-instance-id"] = currentInstanceId;
      headers["x-freebuff-model"] = model;
      mergeUpstreamExtraHeaders(headers, upstreamExtraHeaders);

      const transformedBody = this.transformRequest(
        model,
        body,
        stream,
        activeCredentials
      ) as Record<string, unknown>;

      const codebuffMeta =
        transformedBody.codebuff_metadata &&
        typeof transformedBody.codebuff_metadata === "object"
          ? { ...(transformedBody.codebuff_metadata as Record<string, unknown>) }
          : {};

      codebuffMeta.freebuff_instance_id = currentInstanceId;
      codebuffMeta.client = "codebuff-cli";
      if (!codebuffMeta.client_id) {
        codebuffMeta.client_id = "cb-client-01";
      }
      if (!codebuffMeta.run_id) {
        codebuffMeta.run_id = `run-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
      }

      const hasTools =
        (Array.isArray(transformedBody.tools) && transformedBody.tools.length > 0) ||
        transformedBody.tool_choice !== undefined;

      if (hasTools) {
        codebuffMeta.foreign_toolset = false;
      }
      transformedBody.codebuff_metadata = codebuffMeta;

      const bodyString = JSON.stringify(transformedBody);
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: bodyString,
        signal,
      });

      return { response, headers, transformedBody };
    };

    let attemptResult = await makeAttempt(instanceId);

    // Status code handling:
    // 428: waiting room required -> re-admit
    // 409: model locked / superseded -> release and re-admit
    // 410: session expired -> renew
    if (
      attemptResult.response.status === 428 ||
      attemptResult.response.status === 409 ||
      attemptResult.response.status === 410
    ) {
      const status = attemptResult.response.status;
      log?.warn?.(
        "FREEBUFF",
        `Received HTTP ${status} from Freebuff upstream, attempting session recovery`
      );

      if (status === 409) {
        await releaseFreebuffSession(activeCredentials, { signal });
      }

      instanceId = await ensureFreebuffSession(activeCredentials, model, {
        signal,
        forceRenew: true,
      });
      attemptResult = await makeAttempt(instanceId);
    }

    // 429 Status code handling (rate_limited, ip_capped, free_mode_capacity_deferred):
    // Map upstream 429 to structured RATE_LIMIT_EXCEEDED response with Retry-After
    if (attemptResult.response.status === 429) {
      recordProviderFailure("freebuff", log, activeCredentials?.connectionId);
      const retryAfterHeader = attemptResult.response.headers.get("retry-after");
      let retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
      if (typeof retryAfterSec === "number" && (!Number.isFinite(retryAfterSec) || retryAfterSec <= 0)) {
        retryAfterSec = undefined;
      }

      let rawText = "";
      let reason = "rate_limit_exceeded";
      let message = "Freebuff rate limit exceeded";
      let parsedBody: unknown = undefined;

      try {
        rawText = await attemptResult.response.text();
        const parsed = JSON.parse(rawText) as {
          error?: string | { message?: string; code?: string; type?: string };
          message?: string;
          reason?: string;
          retry_after?: number;
        };
        parsedBody = parsed;

        if (typeof parsed.error === "string") {
          reason = parsed.error;
          message = parsed.message || parsed.error;
        } else if (parsed.error && typeof parsed.error === "object") {
          message = parsed.error.message || message;
          reason = parsed.error.code || reason;
        } else if (parsed.message) {
          message = parsed.message;
        }

        if (parsed.reason) {
          reason = parsed.reason;
        }
        if (typeof parsed.retry_after === "number" && parsed.retry_after > 0) {
          retryAfterSec = parsed.retry_after;
        }
      } catch {
        message = rawText || "Rate limit exceeded";
        parsedBody = rawText;
      }

      const lower = `${reason} ${message} ${rawText}`.toLowerCase();
      if (lower.includes("free_mode_capacity_deferred")) {
        reason = "free_mode_capacity_deferred";
      } else if (lower.includes("ip_capped")) {
        reason = "ip_capped";
      } else if (lower.includes("rate_limited")) {
        reason = "rate_limited";
      }

      const ruleMatch = getProviderErrorRuleMatch(
        "freebuff",
        429,
        attemptResult.response.headers,
        parsedBody ?? { error: reason, reason, message }
      );
      if (!retryAfterSec && ruleMatch?.cooldownMs) {
        retryAfterSec = Math.ceil(ruleMatch.cooldownMs / 1000);
      }
      if (!retryAfterSec || retryAfterSec <= 0) {
        retryAfterSec = 5;
      }

      const safeMessage = sanitizeErrorMessageForResponse(message) || "Freebuff rate limit exceeded";
      log?.warn?.(
        "FREEBUFF",
        `Rate limit encountered (429 - ${reason}): ${safeMessage}, retry-after: ${retryAfterSec}s`
      );

      const errorBody = {
        error: {
          message: safeMessage,
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
          reason,
          retry_after: retryAfterSec,
        },
      };

      const structured429 = new Response(JSON.stringify(errorBody), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
        },
      });

      return {
        response: structured429,
        url,
        headers: attemptResult.headers,
        transformedBody: attemptResult.transformedBody,
      };
    }

    // Other non-ok responses: sanitize error message so no stack traces or raw paths leak
    if (!attemptResult.response.ok) {
      const status = attemptResult.response.status;
      let rawText = "";
      try {
        rawText = await attemptResult.response.text();
      } catch {
        rawText = `HTTP_${status}`;
      }

      let parsedMsg = rawText;
      let errType = "upstream_error";
      let errCode = `HTTP_${status}`;
      try {
        const parsed = JSON.parse(rawText) as {
          error?: string | { message?: string; code?: string; type?: string };
          message?: string;
        };
        if (typeof parsed.error === "string") {
          parsedMsg = parsed.error;
        } else if (parsed.error && typeof parsed.error === "object") {
          parsedMsg = parsed.error.message || parsedMsg;
          errCode = parsed.error.code || errCode;
          errType = parsed.error.type || errType;
        } else if (parsed.message) {
          parsedMsg = parsed.message;
        }
      } catch {
        // use rawText
      }

      const safeMessage = sanitizeErrorMessageForResponse(parsedMsg) || `Upstream error (${status})`;
      const errorBody = buildErrorBody(status, safeMessage);
      if (errCode) errorBody.error.code = errCode;
      if (errType) errorBody.error.type = errType;

      const errorResp = new Response(JSON.stringify(errorBody), {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      });

      return {
        response: errorResp,
        url,
        headers: attemptResult.headers,
        transformedBody: attemptResult.transformedBody,
      };
    }

    return {
      response: attemptResult.response,
      url,
      headers: attemptResult.headers,
      transformedBody: attemptResult.transformedBody,
    };
  }
}

export default FreebuffExecutor;
