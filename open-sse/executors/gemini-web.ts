/**
 * GeminiWebExecutor — Gemini Web Session Provider
 *
 * Routes requests through Google Gemini's web interface using browser
 * cookies via direct HTTP, exactly like gemini-business.ts and claude-web.ts.
 * Translates between OpenAI chat completions format and Gemini's internal
 * StreamGenerate API.
 *
 * Auth: Cookie-based (__Secure-1PSID + __Secure-1PSIDTS from gemini.google.com)
 * Method: Direct HTTP POST to the internal StreamGenerate endpoint (no browser)
 *
 * Note: Streaming is pseudo-streaming — waits for full Gemini response then
 * sends as single SSE chunk. Gemini's StreamGenerate endpoint returns complete
 * responses, not chunked streams.
 *
 * Why this is not Playwright-based:
 *   The same StreamGenerate endpoint used by the browser is callable directly
 *   with HTTP + cookies, avoiding the cost and fragility of headless Chromium.
 *
 * Reference: https://github.com/Sophomoresty/gemini-web2api (gemini_web2api.py)
 */

import { BaseExecutor, mergeAbortSignals, type ExecuteInput } from "./base.ts";
import { makeExecutorErrorResult as makeErrorResult } from "../utils/error.ts";
import { computeSapisidHash } from "../utils/sapisidHash.ts";
import { randomUUID } from "node:crypto";

// ─── Constants ──────────────────────────────────────────────────────────────

const GEMINI_URL = "https://gemini.google.com/app";

const GEMINI_WEB_FETCH_TIMEOUT_MS = 60_000;

const GEMINI_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

/**
 * Whether an error came from Playwright failing to launch because the browser binary is not
 * installed (`chromium.launch: Executable doesn't exist at ...`). This is a host/config
 * problem, not a transient upstream fault, so the executor must NOT surface it as a retryable
 * 500 (which marks the account unavailable and loops / trips the provider breaker). See #3516.
 *
 * Retained as a classifier even though gemini-web no longer uses Playwright — unit tests in
 * tests/unit/gemini-web-missing-browser-3516.test.ts assert the regex behavior, and keeping
 * it exported preserves that regression coverage without introducing any browser dependency.
 */
export function isMissingBrowserExecutable(message: string): boolean {
  if (!message) return false;
  return /executable doesn't exist|executablenotfound|playwright install|chromium.*download/i.test(
    message
  );
}

/**
 * Model ID → StreamGenerate MODE_CATEGORY enum value.
 *
 * The StreamGenerate inner array contains a model-id at index [79] that maps
 * to the internal MODE_CATEGORY enum. See gemini-web2api.py.
 */
const MODEL_CATEGORY_MAP: Record<string, number> = {
  "gemini-3-pro": 70,
  "gemini-3-ultra": 71,
  "gemini-3-flash": 75,
  "gemini-2.5-pro": 53,
  "gemini-2.5-flash": 54,
  "gemini-2.5-flash-thinking": 55,
  "gemini-2.0-pro": 51,
  "gemini-2.0-flash": 52,
  "gemini-2.0-flash-thinking": 56,
  "gemini-3-pro-image": 76,
  "gemini-2.0-flash-image": 57,
  "veo-3.1-generate": 80,
};

const DEFAULT_MODEL = "gemini-2.5-pro";
const DEFAULT_MODEL_CATEGORY = 53;

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeminiMessage {
  role: string;
  content: unknown;
}

interface GeminiRequestBody {
  messages: GeminiMessage[];
  model?: string;
  stream?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatChatCompletion(content: string, model: string, finishReason = "stop") {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: finishReason }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

function formatStreamChunk(content: string, model: string, finishReason: string | null = null) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: content ? { content } : {}, finish_reason: finishReason }],
  };
}

/**
 * Parse cookie string, stripping attributes (Path, Domain, Expires, etc.)
 * Input: full browser cookie string or just "name=value; name2=value2"
 * Output: array of { name, value } pairs
 */
function parseCookies(raw: string): Array<{ name: string; value: string }> {
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) return null;
      const name = part.substring(0, eqIdx).trim();
      const value = part.substring(eqIdx + 1).trim();
      // Skip cookie attributes that aren't name=value pairs.
      // Includes modern attr names (Priority, Partitioned) that browsers
      // tolerate but raw HTTP `Cookie:` headers must not carry as fake pairs.
      if (!name || !value) return null;
      const lowerName = name.toLowerCase();
      if (
        [
          "path",
          "domain",
          "expires",
          "max-age",
          "secure",
          "httponly",
          "samesite",
          "priority",
          "partitioned",
        ].includes(lowerName)
      ) {
        return null;
      }
      return { name, value };
    })
    .filter(Boolean) as Array<{ name: string; value: string }>;
}

/** Normalize a raw cookie string into a clean `name=value; name2=value2` header value. */
function toCookieHeader(raw: string): string {
  return parseCookies(raw)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

function extractCookieValue(cookie: string, name: string): string | null {
  const pairs = cookie.split(";");
  for (const pair of pairs) {
    const [k, ...rest] = pair.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

/**
 * Build the StreamGenerate inner array (80 slots, protobuf-like).
 * Slot [0]   = [prompt, 0, null, null, null, null, 0]
 * Slot [1]   = ["en"]                       (language)
 * Slot [2]   = ["", "", "", null, ...]      (conversation state)
 * Slot [17]  = [[thinkMode]]                (thinking depth 0-4)
 * Slot [79]  = model_id (MODE_CATEGORY enum)
 * Slot [59]  = UUID
 * See gemini-web2api.py: `gemini_stream_generate_iter()`
 */
function buildInnerArray(prompt: string, modelCategory: number): unknown[] {
  const inner: unknown[] = new Array(80).fill(null);
  inner[0] = [prompt, 0, null, null, null, null, 0];
  inner[1] = ["en"];
  inner[2] = ["", "", "", null, null, null, null, null, null, ""];
  inner[6] = [0];
  inner[7] = 1;
  inner[10] = 1;
  inner[11] = 0;
  inner[17] = [[0]]; // 0 = deepest thinking
  inner[18] = 0;
  inner[27] = 1;
  inner[30] = [4];
  inner[41] = [2];
  inner[53] = 0;
  inner[59] = randomUUID();
  inner[61] = [];
  inner[68] = 1;
  inner[79] = modelCategory;
  return inner;
}

/**
 * Parse Gemini StreamGenerate response text.
 *
 * Response format:
 *   )]}'
 *   <length>
 *   [["wrb.fr", null, "<JSON string>"]]
 *   <length>
 *   [["wrb.fr", null, "<JSON string>"]]
 *
 * The JSON string contains nested array: inner[4][0][1] = ["text chunks"]
 * Gemini fragments long responses across multiple wrb.fr lines, so we
 * concatenate text from EVERY content-bearing line (not just the first).
 * This mirrors the proven parseStreamResponse in gemini-business.ts.
 */
function parseStreamResponse(raw: string): string {
  const lines = raw.split("\n");
  const textChunks: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === ")]}'" || /^\d+$/.test(line)) continue;
    if (!line.includes("wrb.fr")) continue;
    try {
      const arr = JSON.parse(line);
      if (!Array.isArray(arr) || !arr[0] || arr[0][0] !== "wrb.fr") continue;
      const payload = arr[0]?.[2];
      if (typeof payload !== "string") continue;
      const inner = JSON.parse(payload);
      // Defensive: check each level before accessing
      const responseArray = inner?.[4]?.[0]?.[1];
      if (!Array.isArray(responseArray)) continue;
      const chunkText = responseArray.filter((c: unknown) => typeof c === "string").join("");
      if (chunkText) textChunks.push(chunkText);
    } catch {
      // Skip unparseable lines (binary chunks, etc.)
    }
  }

  return textChunks.join("");
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function readCredentialString(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed || "";
}

function readProviderSpecificString(providerSpecificData: unknown, keys: string[]): string {
  if (!providerSpecificData || typeof providerSpecificData !== "object") return "";
  const data = providerSpecificData as Record<string, unknown>;
  for (const key of keys) {
    const v = data[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

// ─── Executor ───────────────────────────────────────────────────────────────

export class GeminiWebExecutor extends BaseExecutor {
  constructor() {
    super("gemini-web", { id: "gemini-web", baseUrl: GEMINI_URL });
  }

  async execute(input: ExecuteInput) {
    const { model, body, stream, credentials, signal } = input;
    const requestBody = body as GeminiRequestBody;

    // Extract cookies from credentials — accept either apiKey/cookie (raw cookie
    // string) or individual __Secure-1PSID / __Secure-1PSIDTS keys in
    // providerSpecificData (same precedence as gemini-business.ts).
    const directCookie =
      readCredentialString(credentials?.apiKey) ||
      readCredentialString(
        (credentials as Record<string, unknown> | undefined)?.cookie
      );
    const psid = readProviderSpecificString(credentials?.providerSpecificData, [
      "__Secure-1PSID",
      "cookie",
    ]);
    const psidts = readProviderSpecificString(credentials?.providerSpecificData, [
      "__Secure-1PSIDTS",
    ]);
    const rawCookie = directCookie || [psid, psidts].filter(Boolean).join("; ");
    const cookie = rawCookie ? toCookieHeader(rawCookie) : "";

    if (!cookie) {
      return makeErrorResult(
        401,
        "Missing Gemini cookies. Set __Secure-1PSID and __Secure-1PSIDTS from gemini.google.com.",
        body,
        GEMINI_URL
      );
    }

    // Extract prompt from OpenAI-format messages (last user message).
    const messages = requestBody.messages || [];
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const prompt = extractTextContent(lastUserMsg?.content);

    if (!prompt) {
      return makeErrorResult(400, "No user message found", body, GEMINI_URL);
    }

    // Resolve model and its MODE_CATEGORY
    const modelId = (model as string) || DEFAULT_MODEL;
    const modelCategory = MODEL_CATEGORY_MAP[modelId] ?? DEFAULT_MODEL_CATEGORY;

    // Build the StreamGenerate form payload (f.req=<JSON inner array>)
    const baseOrigin = "https://gemini.google.com";
    const innerArray = buildInnerArray(prompt, modelCategory);
    const streamUrl = `${baseOrigin}/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20240619.16_p0&hl=en&_reqid=${Math.floor(Math.random() * 900000) + 100000}&rt=c`;

    const formBody = new URLSearchParams();
    formBody.set("f.req", JSON.stringify([null, JSON.stringify(innerArray)]));

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: cookie,
      "X-Same-Domain": "1",
      "User-Agent": GEMINI_USER_AGENT,
      Origin: baseOrigin,
      Referer: `${baseOrigin}/app`,
    };

    // Add SAPISID hash auth header if we can compute it (improves reliability).
    const sapisid =
      extractCookieValue(cookie, "SAPISID") || extractCookieValue(cookie, "__Secure-3PAPISID");
    if (sapisid) {
      headers["Authorization"] = computeSapisidHash(sapisid, baseOrigin);
    }

    // Combine the caller-supplied abort signal with a fetch timeout. `mergeAbortSignals`
    // requires both args to be non-null AbortSignals (it reads .aborted/.reason immediately),
    // so when the caller didn't pass one we feed a never-firing controller signal. This mirrors
    // the combining pattern used in BaseExecutor.execute() (base.ts:928-931).
    const neverAbort = new AbortController();
    const timeoutSignal = AbortSignal.timeout(GEMINI_WEB_FETCH_TIMEOUT_MS);
    const fetchSignal = mergeAbortSignals(signal ?? neverAbort.signal, timeoutSignal);

    let response: Response;
    try {
      response = await fetch(streamUrl, {
        method: "POST",
        headers,
        body: formBody.toString(),
        signal: fetchSignal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "fetch failed";
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      if (signal?.aborted) {
        return makeErrorResult(499, "Request aborted", body, streamUrl);
      }
      return makeErrorResult(
        isTimeout ? 504 : 502,
        `Gemini Web ${isTimeout ? "request timed out" : "network error"}: ${message}`,
        body,
        streamUrl
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 401 || response.status === 403) {
        return makeErrorResult(
          response.status,
          "Gemini Web session expired or unauthorized. Re-extract __Secure-1PSID / __Secure-1PSIDTS cookies from gemini.google.com.",
          body,
          streamUrl
        );
      }
      if (response.status === 429) {
        return makeErrorResult(
          429,
          "Gemini Web rate limit reached. Wait and try again later.",
          body,
          streamUrl
        );
      }
      return makeErrorResult(
        response.status,
        `Gemini Web returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        body,
        streamUrl
      );
    }

    const rawText = await response.text();
    const responseText = parseStreamResponse(rawText);

    if (!responseText) {
      return makeErrorResult(
        502,
        "No response from Gemini. The cookie may be expired or the session was rejected.",
        body,
        streamUrl
      );
    }

    if (stream) {
      // Pseudo-streaming: send complete response as single SSE chunk
      // Gemini's StreamGenerate returns complete responses, not chunked streams
      const encoder = new TextEncoder();
      const readable = new ReadableStream(
        {
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify(formatStreamChunk(responseText, modelId))}\n\n`
              )
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify(formatStreamChunk("", modelId, "stop"))}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        },
        { highWaterMark: 16384 }
      );
      return {
        response: new Response(readable, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }),
        url: streamUrl,
        headers: {},
        transformedBody: body,
      };
    }

    return {
      response: new Response(JSON.stringify(formatChatCompletion(responseText, modelId)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      url: streamUrl,
      headers: {},
      transformedBody: body,
    };
  }
}
