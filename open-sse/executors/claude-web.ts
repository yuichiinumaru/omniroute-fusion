/**
 * ClaudeWebExecutor — Claude Web Session Provider
 *
 * Routes requests through Claude's web interface using session credentials,
 * translating between OpenAI chat completions format and Claude's real API format.
 *
 * Real API Structure:
 *   Endpoint: https://claude.ai/api/organizations/{orgId}/chat_conversations/{convId}/completion
 *   Method: POST
 *   Content-Type: application/json
 *   Accept: text/event-stream
 *
 * Auth pipeline (per request):
 *   1. Extract session cookie and device ID from credentials
 *   2. Build conversation URL with orgId and convId
 *   3. Construct full request payload with model, tools, UUID references
 *   4. Make authenticated POST request to Claude Web API
 *   5. Handle SSE response stream with proper message parsing
 *
 * Response is streamed as server-sent events (SSE format).
 */
import { BaseExecutor, type ExecuteInput } from "./base.ts";
import { FETCH_TIMEOUT_MS } from "../config/constants.ts";
import { tlsFetchClaude } from "../services/claudeTlsClient.ts";
import { getCfClearanceToken } from "../services/claudeTurnstileSolver.ts";
import { normalizeSessionCookieHeader } from "@/lib/providers/webCookieAuth";
import { randomUUID } from "crypto";
import { sanitizeErrorMessage } from "../utils/error.ts";
import { tryBackedChat } from "../services/browserBackedChat.ts";
import { openaiToClaudeRequest } from "../translator/request/openai-to-claude.ts";

// ─── Constants ──────────────────────────────────────────────────────────────
const CLAUDE_WEB_API_BASE = "https://claude.ai/api";
const CLAUDE_WEB_ORGS_URL = `${CLAUDE_WEB_API_BASE}/organizations`;

const CLAUDE_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

// Session cookie constants
const CLAUDE_SESSION_COOKIE_NAME = "sessionKey";

/**
 * Read the Claude Web session cookie from the credentials object.
 *
 * Lookup order (most-specific first):
 *   1. `credentials.cookie` — direct field (programmatic / older callers)
 *   2. `credentials.apiKey` — what the dashboard form posts (the
 *      connection row's `api_key` column stores the cookie string after
 *      encryption; `getProviderCredentials()` decrypts and surfaces it
 *      back as `apiKey`)
 *   3. `credentials.providerSpecificData.cookie` — escape hatch for
 *      callers that route the cookie through the per-provider metadata
 *
 * Without the apiKey fallback, the executor could never see a real
 * cookie through the standard /api/v1/chat/completions path — the
 * dashboard posts the cookie in the connection's `apiKey` field, but
 * this executor was historically reading `cookie` only.
 */
function readClaudeWebCookie(credentials: unknown): string {
  if (!credentials || typeof credentials !== "object") return "";
  const c = credentials as Record<string, unknown>;
  const direct = typeof c.cookie === "string" ? c.cookie : "";
  if (direct.trim()) return direct;
  const apiKey = typeof c.apiKey === "string" ? c.apiKey : "";
  if (apiKey.trim()) return apiKey;
  const psd = c.providerSpecificData;
  if (psd && typeof psd === "object") {
    const nested = (psd as Record<string, unknown>).cookie;
    if (typeof nested === "string" && nested.trim()) return nested;
  }
  return "";
}

/**
 * Read the optional Claude Web device ID from the credentials object.
 * Mirrors `readClaudeWebCookie` so callers can use the same priority
 * chain (direct → apiKey → providerSpecificData).
 */
function readClaudeWebDeviceId(credentials: unknown): string | undefined {
  if (!credentials || typeof credentials !== "object") return undefined;
  const c = credentials as Record<string, unknown>;
  if (typeof c.deviceId === "string" && c.deviceId.trim()) return c.deviceId;
  const psd = c.providerSpecificData;
  if (psd && typeof psd === "object") {
    const nested = (psd as Record<string, unknown>).deviceId;
    if (typeof nested === "string" && nested.trim()) return nested;
  }
  return undefined;
}

// Default model when not specified
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-6";

/**
 * Stream chunk from Claude Web API (Messages API SSE format)
 */
interface ClaudeWebStreamChunk {
  type?: string;
  index?: number;
  completion?: string;
  stop_reason?: string | null;
  model?: string;
  delta?: Record<string, unknown>;
  content_block?: Record<string, unknown>;
  [key: string]: unknown;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Build browser-like headers for Claude Web API
 */
function getBrowserHeaders(deviceId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Content-Type": "application/json",
    Origin: "https://claude.ai",
    Pragma: "no-cache",
    Priority: "u=1, i",
    Referer: "https://claude.ai/new",
    "Sec-Ch-Ua": '"Chromium";v="149", "Not-A.Brand";v="24", "Google Chrome";v="149"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Linux"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": CLAUDE_USER_AGENT,
    // Anthropic-specific headers
    "anthropic-client-platform": "web_claude_ai",
  };

  if (deviceId) {
    headers["anthropic-device-id"] = deviceId;
  }

  return headers;
}

/**
 * Normalize cookie header for Claude Web API
 */
function normalizeClaudeSessionCookie(rawValue: string): string {
  return normalizeSessionCookieHeader(rawValue, CLAUDE_SESSION_COOKIE_NAME);
}
/**
 * Normalize cookie and auto-inject cf_clearance if missing
 */
async function normalizeClaudeSessionCookieWithAutoRefresh(
  rawValue: string,
  options?: { allowAutoSolve?: boolean; log?: any }
): Promise<string> {
  let normalized = normalizeClaudeSessionCookie(rawValue);

  // Check if cf_clearance is already in the cookie
  if (normalized.includes("cf_clearance=")) {
    return normalized;
  }

  // If auto-solve is enabled, try to solve Turnstile and get fresh cf_clearance
  if (options?.allowAutoSolve !== false) {
    try {
      options?.log?.info?.("CLAUDE-WEB", "cf_clearance missing, attempting to solve Turnstile...");
      const cfClearance = await getCfClearanceToken();

      // Append cf_clearance to existing cookies
      const cfCookie = `cf_clearance=${cfClearance}`;
      normalized = normalized ? `${normalized}; ${cfCookie}` : cfCookie;

      options?.log?.info?.("CLAUDE-WEB", "cf_clearance injected successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options?.log?.warn?.("CLAUDE-WEB", `cf_clearance injection failed: ${message}`);
      // Continue anyway - the retry wrapper will handle 403
    }
  }

  return normalized;
}

/**
 * Get default tool definitions for Claude Web API
 *
 * These are tools that the web UI registers by default. We merge them
 * alongside any user-specified tools so Claude always has access to
 * web_search, artifacts, repl, etc.
 */
function getDefaultTools(): Array<Record<string, unknown>> {
  return [
    {
      name: "show_widget",
      description: "Display interactive widgets and visualizations",
      input_schema: {
        type: "object",
        properties: {
          widget_type: {
            type: "string",
            description: "Type of widget to display",
          },
        },
      },
      integration_name: "visualize",
      is_mcp_app: true,
    },
    {
      name: "read_me",
      description: "Read and reference documents",
      input_schema: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Path to the file to read",
          },
        },
      },
      integration_name: "visualize",
      is_mcp_app: false,
    },
    {
      type: "web_search_v0",
      name: "web_search",
    },
    {
      type: "artifacts_v0",
      name: "artifacts",
    },
    {
      type: "repl_v0",
      name: "repl",
    },
    { type: "widget", name: "weather_fetch" },
    { type: "widget", name: "recipe_display_v0" },
    { type: "widget", name: "places_map_display_v0" },
    { type: "widget", name: "message_compose_v1" },
    { type: "widget", name: "ask_user_input_v0" },
    { type: "widget", name: "recommend_claude_apps" },
    { type: "widget", name: "places_search" },
    { type: "widget", name: "fetch_sports_data" },
  ];
}

/**
 * Transform OpenAI format to Claude Web format using the official translator.
 *
 * Preserves full conversation context (system prompt, message history,
 * tool calls/results) instead of extracting only the last user message.
 *
 * The web API accepts the Messages API format for the request body. We
 * adapt the translator output by:
 *   - Stripping `model` (determined by the conversation, not the body)
 *   - Stripping `stream` (always true for web API SSE)
 *   - Converting `system` array to a plain string if present
 *   - Removing `cache_control` from all content blocks (not supported by web API)
 *   - Removing `redacted_thinking` blocks from assistant messages (not supported)
 *   - Removing `tool_choice` (web API doesn't enforce tool choice)
 *   - Merging web built-in tools (web_search, artifacts, repl) alongside user tools
 *   - Disabling `proxy_` tool name prefix (OAuth-only, would break web tool routing)
 */
function transformToClaude(
  body: Record<string, unknown>,
  model: string,
  isStream: boolean
): Record<string, unknown> {
  // Validate messages before any translation
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const nonSystemMessages = messages.filter(
    (m: Record<string, unknown>) => m.role !== "system" && m.role !== "developer"
  );
  if (nonSystemMessages.length === 0) {
    throw new Error("No user or assistant messages found in request");
  }

  // Clone body and disable tool prefix for web API (no Claude OAuth prefix needed).
  // The web API routes tool_use by registered tool names — the proxy_ prefix
  // would break web_search, artifacts, and other built-in tools.
  const bodyForTranslator = { ...body, _disableToolPrefix: true };

  const translated = openaiToClaudeRequest(model, bodyForTranslator, isStream);

  // Remove fields the web API doesn't need or determines differently
  delete translated.model;
  delete translated.stream;
  delete translated._toolNameMap;
  delete translated.tool_choice;
  delete translated.thinking;
  delete translated.output_config;

  // Convert system array to string for web API compatibility.
  // The web API may expect a plain string rather than the Messages API
  // block format with cache_control metadata.
  if (Array.isArray(translated.system) && translated.system.length > 0) {
    const systemText = translated.system
      .map((block: Record<string, unknown>) => block.text ?? "")
      .filter(Boolean)
      .join("\n");
    if (systemText) {
      translated.system = systemText;
    } else {
      delete translated.system;
    }
  }

  // Strip web-incompatible fields from messages content blocks:
  //   - cache_control (not supported by web API)
  //   - thinking and redacted_thinking blocks (extended thinking, not supported
  //     by the web API — would cause 400 in multi-turn requests with
  //     reasoning_content from prior turns)
  if (Array.isArray(translated.messages)) {
    for (const msg of translated.messages) {
      if (Array.isArray(msg.content)) {
        msg.content = msg.content.filter(
          (block: Record<string, unknown>) =>
            block.type !== "redacted_thinking" && block.type !== "thinking"
        );
        for (const block of msg.content as Array<Record<string, unknown>>) {
          delete block.cache_control;
        }
      }
    }
  }

  // Merge web built-in tools with user tools.
  // The web API has default tools (web_search, artifacts, repl) that we
  // always want available. We add them alongside user-specified tools.
  if (Array.isArray(translated.tools)) {
    // Strip cache_control and defer_loading from translator-generated tools
    for (const tool of translated.tools as Array<Record<string, unknown>>) {
      delete tool.cache_control;
      delete tool.defer_loading;
    }

    // Merge with Claude web built-in tools, avoiding duplicates by name
    const userToolNames = new Set(
      (translated.tools as Array<Record<string, unknown>>).map((t) => String(t.name ?? ""))
    );
    for (const builtinTool of getDefaultTools()) {
      const builtinName = String(builtinTool.name ?? "");
      if (builtinName && !userToolNames.has(builtinName)) {
        (translated.tools as Array<Record<string, unknown>>).push(builtinTool);
      }
    }
  } else {
    // No user tools specified — send only the web built-in tools
    translated.tools = getDefaultTools();
  }

  return translated;
}

/**
 * Transform Claude Web response to OpenAI format (streaming chunk).
 *
 * Returns a base chunk that callers can extend with tool_calls or
 * alternate finish_reason values.
 */
function transformFromClaude(
  claudeContent: string,
  model: string,
  stopReason?: string
): Record<string, unknown> {
  const mappedFinishReason =
    stopReason === "end_turn"
      ? "stop"
      : stopReason === "tool_use"
        ? null // tool_calls emitted separately; finish_reason set on final chunk
        : stopReason === "max_tokens"
          ? "length"
          : null;

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: {
          content: claudeContent,
        },
        finish_reason: mappedFinishReason,
        logprobs: null,
      },
    ],
  };
}

/**
 * Build an OpenAI streaming chunk for a completed tool_call.
 */
function buildToolCallChunk(
  model: string,
  toolCallIndex: number,
  id: string,
  name: string,
  args: string
): string {
  const chunk = {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: toolCallIndex,
              id,
              type: "function",
              function: { name, arguments: args },
            },
          ],
        },
        finish_reason: null,
        logprobs: null,
      },
    ],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * Build an OpenAI streaming chunk with only a finish_reason (no delta).
 */
function buildFinishReasonChunk(
  model: string,
  finishReason: string | null
): string {
  const chunk = {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: finishReason,
        logprobs: null,
      },
    ],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * Verify session is still valid by checking if the organizations endpoint
 * returns a successful response. Claude's API does not have a /api/auth/session
 * endpoint (unlike ChatGPT), so we use /api/organizations which requires a
 * valid session cookie and returns 200 only with valid credentials.
 */
async function verifyCookieValidity(
  cookieHeader: string,
  deviceId: string | undefined,
  signal?: AbortSignal
): Promise<boolean> {
  try {
    // Start-only: tlsFetchClaude applies timeoutMs; do not also attach
    // AbortSignal.timeout (F-02-W2-002 residual N1) which would kill long waits
    // after headers if this ever became a streaming call.
    const response = await tlsFetchClaude(CLAUDE_WEB_ORGS_URL, {
      method: "GET",
      headers: {
        ...getBrowserHeaders(deviceId),
        Cookie: cookieHeader,
      },
      timeoutMs: FETCH_TIMEOUT_MS,
      signal,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Get user's organization ID from session
 */
async function getOrganizationId(
  cookieHeader: string,
  deviceId: string | undefined,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const response = await tlsFetchClaude(CLAUDE_WEB_ORGS_URL, {
      method: "GET",
      headers: {
        ...getBrowserHeaders(deviceId),
        Cookie: cookieHeader,
      },
      timeoutMs: FETCH_TIMEOUT_MS,
      signal,
    });
    if (response.status !== 200) {
      return null;
    }
    const data = JSON.parse(response.text ?? "[]") as Array<{
      id: string;
      uuid?: string;
      [key: string]: unknown;
    }>;
    return data?.[0]?.uuid || data?.[0]?.id || null;
  } catch (error) {
    return null;
  }
}

function shouldUseBrowserBacked(): boolean {
  const flag = process.env.WEB_COOKIE_USE_BROWSER;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  const poolFlag = process.env.OMNIROUTE_BROWSER_POOL;
  return poolFlag === "on" || poolFlag === "1" || poolFlag === "true";
}

function extractLastUserText(body: Record<string, unknown>): string {
  const messages = Array.isArray(body.messages)
    ? (body.messages as Array<Record<string, unknown>>)
    : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const content = messages[i].content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((c) => (typeof c === "object" && c && "text" in c ? String(c.text) : ""))
          .filter(Boolean)
          .join("\n");
      }
    }
  }
  return "Reply with OK";
}

/**
 * Read Claude Web SSE chunks from an upstream response body and pipe them
 * through transformFromClaude to produce OpenAI chat.completion.chunk SSE.
 *
 * Handles text content, tool_use blocks (converted to OpenAI tool_calls),
 * and proper finish_reason mapping (end_turn → stop, tool_use → tool_calls,
 * max_tokens → length).
 *
 * The upstream body may arrive as a ReadableStream directly (tlsBody) or
 * via upstreamResp.body (browser-backed path, where the Response type is
 * accurate). tlsBody takes priority when non-null.
 *
 * Returns a Response whose body is the transformed SSE stream. The client
 * receives standard OpenAI-format streaming chunks.
 */
async function buildClaudeStreamingResponse(
  upstreamResp: Response,
  model: string,
  log:
    | { warn?: (tag: string, msg: string) => void; error?: (tag: string, msg: string) => void }
    | null
    | undefined,
  tlsBody: ReadableStream<Uint8Array> | null | undefined
): Promise<Response> {
  const src = tlsBody ?? upstreamResp.body;
  if (!src) {
    return new Response(
      JSON.stringify({
        error: {
          message: "No upstream response body available",
          type: "upstream_error",
        },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  interface ToolCallState {
    id: string;
    name: string;
    args: string;
    index: number;
  }

  let finished = false;
  let hasSentToolCalls = false;
  let hasSentFinishReason = false;
  const toolCallsByIndex = new Map<number, ToolCallState>();

  const transformed = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = src!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE lines are separated by \n or \r\n; Claude sends
          // data: {...}\n\n (double newline separating events).
          const lines = buffer.split("\n");
          // Keep the last potentially-incomplete line in the buffer.
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6); // strip "data: "
            try {
              const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

              // === content_block_start ===
              // Signals the start of a new content block (text or tool_use).
              if (parsed.type === "content_block_start") {
                const block = parsed.content_block as Record<string, unknown> | undefined;
                const blockIndex = parsed.index as number;
                if (!block) continue;

                if (block.type === "tool_use") {
                  const toolId = String(block.id ?? "");
                  const toolName = String(block.name ?? "");
                  const initialInput = block.input as Record<string, unknown> | undefined;
                  let initialArgs = "";
                  if (initialInput && Object.keys(initialInput).length > 0) {
                    try {
                      initialArgs = JSON.stringify(initialInput);
                    } catch {
                      initialArgs = "";
                    }
                  }
                  toolCallsByIndex.set(blockIndex, {
                    id: toolId,
                    name: toolName,
                    args: initialArgs,
                    index: toolCallsByIndex.size,
                  });
                }
              }
              // === content_block_delta ===
              // Text: emit the text content.
              // Input_json_delta: accumulate arguments for tool_use.
              else if (parsed.type === "content_block_delta") {
                const delta = parsed.delta as Record<string, unknown> | undefined;
                const blockIndex = parsed.index as number;
                if (!delta) continue;

                if (delta.type === "text_delta" || delta.type === "text") {
                  const text = delta.text as string | undefined;
                  if (text) {
                    const chunk = transformFromClaude(text, model);
                    const out = `data: ${JSON.stringify(chunk)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(out));
                  }
                } else if (delta.type === "input_json_delta") {
                  const partialJson = delta.partial_json as string | undefined;
                  if (partialJson) {
                    const state = toolCallsByIndex.get(blockIndex);
                    if (state) {
                      state.args += partialJson;
                    }
                  }
                }
              }
              // === content_block_stop ===
              // A content block finished. If it was a tool_use, emit the
              // complete tool_call chunk now.
              else if (parsed.type === "content_block_stop") {
                const blockIndex = parsed.index as number;
                const state = toolCallsByIndex.get(blockIndex);
                if (state) {
                  hasSentToolCalls = true;
                  const out = buildToolCallChunk(
                    model,
                    state.index,
                    state.id,
                    state.name,
                    state.args
                  );
                  controller.enqueue(new TextEncoder().encode(out));
                }
              }
              // === message_delta ===
              // May carry a stop_reason.
              else if (parsed.type === "message_delta") {
                const delta = parsed.delta as Record<string, unknown> | undefined;
                if (delta?.stop_reason) {
                  const stopReason = delta.stop_reason as string;
                  let finishReason: string | null = null;

                  if (stopReason === "end_turn" || stopReason === "stop_sequence" || stopReason === "refusal") {
                    finishReason = "stop";
                  } else if (stopReason === "tool_use") {
                    finishReason = "tool_calls";
                  } else if (stopReason === "max_tokens") {
                    finishReason = "length";
                  } else {
                    // Defensive: never leave finishReason as null for known
                    // Claude stop_reasons. Logs warning so we can detect when
                    // Anthropic adds new stop_reasons in the protocol.
                    finishReason = "stop";
                    log?.warn?.(
                      "CLAUDE-WEB-STREAM",
                      `Unknown stop_reason: ${stopReason}, defaulting to "stop"`
                    );
                  }

                  // Emit finish_reason chunk after all tool_calls have been sent.
                  // Guard against double emission: message_stop may also try to
                  // emit a finish chunk if it arrives without a preceding message_delta.
                  if (!hasSentFinishReason) {
                    hasSentFinishReason = true;
                    const out = buildFinishReasonChunk(model, finishReason);
                    controller.enqueue(new TextEncoder().encode(out));
                  }
                }
              }
              // === message_stop ===
              // Final event from Claude.
              else if (parsed.type === "message_stop") {
                // Guarantee finish_reason is emitted exactly once, covering the
                // edge case where message_delta did not arrive or arrived with
                // an unmapped stop_reason. Without this guard, clients would
                // receive tool_calls chunks but no terminator, leaving OpenAI
                // clients in a "stream still in progress" state.
                if (!hasSentFinishReason) {
                  hasSentFinishReason = true;
                  const fallbackReason = hasSentToolCalls ? "tool_calls" : "stop";
                  const out = buildFinishReasonChunk(model, fallbackReason);
                  controller.enqueue(new TextEncoder().encode(out));
                }
                finished = true;
              }
              // === error ===
              // Claude can send error events mid-stream.
              else if (parsed.type === "error") {
                const errorMsg =
                  (parsed.error as Record<string, unknown> | undefined)?.message ?? "Unknown error";
                log?.error?.("CLAUDE-WEB-STREAM", `Stream error event: ${errorMsg}`);
                const errorBody = JSON.stringify({
                  error: { message: String(errorMsg), type: "upstream_error" },
                });
                controller.enqueue(new TextEncoder().encode(`data: ${errorBody}\n\n`));
                finished = true;
                break;
              }
            } catch {
              // Skip lines that aren't valid JSON (metadata, ping, etc.)
            }
          }
          if (finished) break;
        }

        // Flush remaining buffer.
        if (!finished && buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.slice(6)) as Record<string, unknown>;
              if (parsed.type === "content_block_delta") {
                const delta = parsed.delta as Record<string, unknown> | undefined;
                const text = delta?.text as string | undefined;
                if (text) {
                  const chunk = transformFromClaude(text, model);
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`)
                  );
                }
              }
            } catch {
              /* skip */
            }
          }
        }

        // Send terminal DONE marker unconditionally. OpenAI clients expect
        // [DONE] as the universal stream terminator, regardless of whether
        // message_stop was received. Conditional emission (gated on !finished)
        // could leave clients hanging waiting for [DONE].
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      } catch (err) {
        log?.error?.("CLAUDE-WEB-STREAM", `Stream error: ${String(err)}`);
        controller.error(err);
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* ok */
        }
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(transformed, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Accumulate SSE chunks from Claude Web API and return a single JSON
 * response in OpenAI chat.completion format (non-streaming).
 *
 * Handles text content, tool_use blocks (converted to OpenAI tool_calls),
 * proper finish_reason mapping, and mid-stream error events.
 */
async function buildNonStreamingResponse(
  upstreamResp: Response,
  model: string,
  inputBody: Record<string, unknown>,
  log:
    | { warn?: (tag: string, msg: string) => void; error?: (tag: string, msg: string) => void }
    | null
    | undefined,
  tlsBody: ReadableStream<Uint8Array> | null | undefined
): Promise<Response> {
  const src = tlsBody ?? upstreamResp.body;
  if (!src) {
    return new Response(
      JSON.stringify({
        error: {
          message: "No upstream response body available",
          type: "upstream_error",
        },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  interface ToolCallState {
    id: string;
    name: string;
    args: string;
    index: number;
  }

  let fullText = "";
  let stopReason: string | undefined;
  let hasToolCalls = false;
  let finished = false;
  const toolCallsByIndex = new Map<number, ToolCallState>();
  const reader = src.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

          if (parsed.type === "content_block_start") {
            const block = parsed.content_block as Record<string, unknown> | undefined;
            const blockIndex = parsed.index as number;
            if (!block) continue;

            if (block.type === "tool_use") {
              const toolId = String(block.id ?? "");
              const toolName = String(block.name ?? "");
              const initialInput = block.input as Record<string, unknown> | undefined;
              let initialArgs = "";
              if (initialInput && Object.keys(initialInput).length > 0) {
                try {
                  initialArgs = JSON.stringify(initialInput);
                } catch {
                  initialArgs = "";
                }
              }
              toolCallsByIndex.set(blockIndex, {
                id: toolId,
                name: toolName,
                args: initialArgs,
                index: toolCallsByIndex.size,
              });
            }
          } else if (parsed.type === "content_block_delta") {
            const delta = parsed.delta as Record<string, unknown> | undefined;
            const blockIndex = parsed.index as number;
            if (!delta) continue;

            if (delta.type === "text_delta" || delta.type === "text") {
              const text = delta.text as string | undefined;
              if (text) fullText += text;
            } else if (delta.type === "input_json_delta") {
              const partialJson = delta.partial_json as string | undefined;
              if (partialJson) {
                const state = toolCallsByIndex.get(blockIndex);
                if (state) {
                  state.args += partialJson;
                }
              }
            }
          } else if (parsed.type === "content_block_stop") {
            const blockIndex = parsed.index as number;
            const state = toolCallsByIndex.get(blockIndex);
            if (state) {
              hasToolCalls = true;
            }
          } else if (parsed.type === "message_delta") {
            const delta = parsed.delta as Record<string, unknown> | undefined;
            if (delta?.stop_reason) stopReason = delta.stop_reason as string;
          } else if (parsed.type === "message_stop") {
            finished = true; // signal outer while to stop reading
          } else if (parsed.type === "error") {
            const errorMsg =
              (parsed.error as Record<string, unknown> | undefined)?.message ?? "Unknown error";
            log?.error?.("CLAUDE-WEB-NONSTREAM", `Stream error event: ${errorMsg}`);
            return new Response(
              JSON.stringify({
                error: { message: String(errorMsg), type: "upstream_error" },
              }),
              { status: 502, headers: { "Content-Type": "application/json" } }
            );
          }
        } catch {
          /* skip non-JSON lines */
        }
      }
      if (finished) break;
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(trimmed.slice(6)) as Record<string, unknown>;
          if (parsed.type === "content_block_delta") {
            const delta = parsed.delta as Record<string, unknown> | undefined;
            const text = delta?.text as string | undefined;
            if (text) fullText += text;
          }
        } catch {
          /* skip */
        }
      }
    }
  } catch (err) {
    log?.error?.("CLAUDE-WEB-NONSTREAM", `Stream read error: ${String(err)}`);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ok */
    }
  }

  // Map stop_reason to OpenAI finish_reason
  const finishReason =
    stopReason === "end_turn"
      ? "stop"
      : stopReason === "tool_use"
        ? "tool_calls"
        : stopReason === "max_tokens"
          ? "length"
          : "stop";

  // Calculate approximate token counts
  const inputMessages = Array.isArray(inputBody.messages) ? inputBody.messages : [];
  const inputText = inputMessages
    .map((m: Record<string, unknown>) => String(m.content ?? ""))
    .join(" ");
  const promptTokens = Math.ceil(inputText.length / 4);
  const completionTokens = Math.ceil(fullText.length / 4);

  // Build tool_calls array if any tool_use blocks were received
  const toolCalls: Array<Record<string, unknown>> = [];
  if (hasToolCalls) {
    for (const [_, state] of toolCallsByIndex) {
      toolCalls.push({
        id: state.id,
        type: "function",
        function: {
          name: state.name,
          arguments: state.args,
        },
      });
    }
  }

  const message: Record<string, unknown> = { role: "assistant" };
  if (hasToolCalls) {
    message.content = fullText || null;
    message.tool_calls = toolCalls;
  } else {
    message.content = fullText;
  }

  return new Response(
    JSON.stringify({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: finishReason,
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ─── Main Executor Class ────────────────────────────────────────────────────

export class ClaudeWebExecutor extends BaseExecutor {
  constructor() {
    super("claude-web", {
      baseUrl: CLAUDE_WEB_API_BASE,
    });
  }

  /**
   * Test connection to Claude Web API
   */
  async testConnection(
    credentials: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<boolean> {
    try {
      const rawCookie = readClaudeWebCookie(credentials);
      if (!rawCookie.trim()) {
        return false;
      }

      const cookieHeader = await normalizeClaudeSessionCookieWithAutoRefresh(rawCookie, {
        allowAutoSolve: false,
      });
      const deviceId = readClaudeWebDeviceId(credentials);

      return await verifyCookieValidity(cookieHeader, deviceId, signal);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's organization ID from session
   */
  async execute({ model, body, stream, credentials, signal, log }: ExecuteInput) {
    const bodyObj = (body || {}) as Record<string, unknown>;

    try {
      // Validate input
      if (!credentials || typeof credentials !== "object") {
        const errorResp = new Response(
          JSON.stringify({
            error: {
              message: "Invalid credentials",
              type: "invalid_request_error",
            },
          }),
          {
            status: 400,
            statusText: "Bad Request",
            headers: { "Content-Type": "application/json" },
          }
        );
        return {
          response: errorResp,
          url: "",
          headers: {},
          transformedBody: bodyObj,
        };
      }

      const rawCookie = readClaudeWebCookie(credentials);
      if (!rawCookie.trim()) {
        const errorResp = new Response(
          JSON.stringify({
            error: {
              message: "Missing session cookie",
              type: "authentication_error",
            },
          }),
          {
            status: 401,
            statusText: "Unauthorized",
            headers: { "Content-Type": "application/json" },
          }
        );
        return {
          response: errorResp,
          url: "",
          headers: {},
          transformedBody: bodyObj,
        };
      }

      const cookieHeader = await normalizeClaudeSessionCookieWithAutoRefresh(rawCookie, {
        allowAutoSolve: true,
        log,
      });
      const deviceId = readClaudeWebDeviceId(credentials);

      // Transform request to Claude format
      let claudePayload: Record<string, unknown>;
      try {
        claudePayload = transformToClaude(bodyObj, model, stream);
      } catch (transformError) {
        const errorResp = new Response(
          JSON.stringify({
            error: {
              message:
                transformError instanceof Error ? transformError.message : "Invalid request format",
              type: "invalid_request_error",
            },
          }),
          {
            status: 400,
            statusText: "Bad Request",
            headers: { "Content-Type": "application/json" },
          }
        );
        return {
          response: errorResp,
          url: "",
          headers: {},
          transformedBody: bodyObj,
        };
      }

      // Get organization and conversation IDs
      let orgId = (credentials as any)?.orgId as string | undefined;
      let conversationId = (credentials as any)?.conversationId as string | undefined;

      if (!orgId) {
        orgId = await getOrganizationId(cookieHeader, deviceId, signal);
        if (!orgId) {
          log?.warn?.("CLAUDE-WEB", "Could not retrieve organization ID, using fallback");
          // Fallback: use empty org ID, API might create conversation
          orgId = "";
        }
      }

      if (!conversationId) {
        // Generate a new conversation ID if not provided
        conversationId = randomUUID();
      }

      // Prepare browser-emulated headers (used by both paths)
      const headers = getBrowserHeaders(deviceId);

      // Browser-backed path: opt-in via OMNIROUTE_BROWSER_POOL=on or
      // WEB_COOKIE_USE_BROWSER=1. Routes the chat through a shared
      // Playwright/Cloakbrowser page with the user's session cookies
      // injected, so Claude's Cloudflare Turnstile / session fingerprint
      // checks are satisfied by a real browser context. This is the
      // only way to get HTTP 200 from a sandbox/VPS IP where the
      // pasted cf_clearance is bound to a different fingerprint and
      // Cloudflare refuses the request. The browser's fetch hits the
      // /completion endpoint directly (the conversation id is created
      // by the page itself), so the placeholder in the matcher is
      // harmless.
      if (shouldUseBrowserBacked()) {
        const userText = extractLastUserText(bodyObj);
        const completionUrl = orgId
          ? `${CLAUDE_WEB_API_BASE}/organizations/${orgId}/chat_conversations/PLACEHOLDER/completion`
          : `${CLAUDE_WEB_API_BASE}/chat_conversations/PLACEHOLDER/completion`;
        const result = await tryBackedChat({
          poolKey: "claude-web",
          chatPageUrl: "https://claude.ai/new",
          chatUrl: completionUrl,
          chatUrlMatchDomain: "claude.ai",
          cookieString: rawCookie,
          cookieDomain: ".claude.ai",
          userMessage: userText,
          inputSelector: "div[contenteditable='true']",
          postSubmitWaitMs: 15000,
          signal: signal ?? null,
        });
        if (result.status > 0) {
          // Wrap captured SSE body as a Response so the existing
          // stream parser (transformFromClaude) can be reused.
          const upstreamResp = new Response(result.body, {
            status: result.status,
            headers: {
              "Content-Type": result.contentType || "text/event-stream",
            },
          });
          // Reuse the streaming transformer from below.
          const response = stream
            ? await buildClaudeStreamingResponse(upstreamResp, model, log, null)
            : await buildNonStreamingResponse(upstreamResp, model, bodyObj, log, null);
          return {
            response,
            url: completionUrl,
            headers,
            transformedBody: claudePayload,
          };
        }
        const errorResp = new Response(
          JSON.stringify({
            error: {
              message: `Claude Web browser-backed chat captured no upstream response (timing: ${JSON.stringify(
                result.timing
              )})`,
              type: "upstream_error",
            },
          }),
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          }
        );
        return {
          response: errorResp,
          url: completionUrl,
          headers,
          transformedBody: claudePayload,
        };
      }

      // Build completion URL
      const completionUrl =
        orgId && conversationId
          ? `${CLAUDE_WEB_API_BASE}/organizations/${orgId}/chat_conversations/${conversationId}/completion`
          : `${CLAUDE_WEB_API_BASE}/chat_conversations/new/completion`;

      // Prepare request — start-only timeout via tlsFetchClaude.timeoutMs.
      // Do NOT merge AbortSignal.timeout(FETCH_TIMEOUT_MS) into the body lifetime
      // (F-02-W2-002 residual N1); streaming completions can outlive the start budget.
      log?.debug?.("CLAUDE-WEB", `Making request to ${completionUrl}`);

      // cf_clearance is already injected via normalizeClaudeSessionCookieWithAutoRefresh above

      const fetchResponse = await tlsFetchClaude(completionUrl, {
        method: "POST",
        headers: {
          ...headers,
          Cookie: cookieHeader,
        },
        body: JSON.stringify(claudePayload),
        timeoutMs: FETCH_TIMEOUT_MS,
        stream: true,
        signal,
      });

      // Handle errors
      if (fetchResponse.status < 200 || fetchResponse.status >= 300) {
        log?.error?.("CLAUDE-WEB", `HTTP ${fetchResponse.status}`);

        if (fetchResponse.status === 401) {
          const errorResp = new Response(
            JSON.stringify({
              error: {
                message: "Session expired or invalid",
                type: "authentication_error",
              },
            }),
            {
              status: 401,
              statusText: "Unauthorized",
              headers: { "Content-Type": "application/json" },
            }
          );
          return {
            response: errorResp,
            url: completionUrl,
            headers,
            transformedBody: claudePayload,
          };
        }

        if (fetchResponse.status === 429) {
          const errorResp = new Response(
            JSON.stringify({
              error: {
                message: "Rate limited by Claude Web API",
                type: "rate_limit_error",
              },
            }),
            {
              status: 429,
              statusText: "Too Many Requests",
              headers: { "Content-Type": "application/json" },
            }
          );
          return {
            response: errorResp,
            url: completionUrl,
            headers,
            transformedBody: claudePayload,
          };
        }

        // Read the upstream body. `tlsFetchClaude` writes non-SSE error
        // bodies (Cloudflare challenge pages, HTML rate-limit responses,
        // Anthropic JSON errors) into `body`, not `text` — `text` is only
        // populated for non-streaming requests. Reading the wrong field
        // here produced the cryptic "[403]: Claude Web API error: " with
        // no diagnostic info. The earlier code did exactly that and made
        // 403 from Cloudflare look indistinguishable from a real Claude
        // rejection.
        //
        // `body` may be a ReadableStream (SSE path) even when status is
        // non-2xx — drain a small prefix so we can classify the failure
        // (Cloudflare challenge vs upstream JSON) without buffering the
        // whole response. If the read fails or times out, fall back to an
        // empty string and let the generic error message stand.
        let errorText = "";
        let cfMitigated: string | null = null;
        try {
          if (fetchResponse.body) {
            const reader = fetchResponse.body.getReader();
            const decoder = new TextDecoder();
            const chunks: Uint8Array[] = [];
            let total = 0;
            const maxBytes = 2048; // enough to identify a Cloudflare challenge
            while (total < maxBytes) {
              const { value, done } = await reader.read();
              if (done || !value) break;
              chunks.push(value);
              total += value.byteLength;
            }
            // Release the reader so the underlying tls-client connection
            // can be reused for the next request. Without cancel() the
            // connection can hang on a still-open stream.
            try {
              reader.releaseLock();
            } catch {
              /* already released */
            }
            if (chunks.length === 1) {
              errorText = decoder.decode(chunks[0]);
            } else {
              const combined = new Uint8Array(total);
              let offset = 0;
              for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.byteLength;
              }
              errorText = decoder.decode(combined);
            }
          } else if (fetchResponse.text) {
            errorText = fetchResponse.text;
          }
        } catch {
          errorText = "";
        }

        // Surface Cloudflare challenge pages as a distinct, actionable
        // error so dashboards / logs don't show an empty "Claude Web API
        // error:" body. The most common cause is a sandbox / data-center
        // IP that Cloudflare has flagged; the cf_clearance cookie bound
        // to a different IP won't pass the challenge.
        cfMitigated = fetchResponse.headers.get("cf-mitigated");
        const isCloudflareChallenge =
          fetchResponse.status === 403 &&
          (cfMitigated === "challenge" ||
            /<title>\s*Just a moment/i.test(errorText) ||
            /<title>\s*Attention Required/i.test(errorText));

        let errorMessage: string;
        if (isCloudflareChallenge) {
          errorMessage =
            "Claude Web returned a Cloudflare bot-management challenge " +
            `(cf-mitigated=${cfMitigated ?? "challenge"}). ` +
            "The sandbox / VPS IP appears to be flagged; the cf_clearance " +
            "cookie pasted from a residential IP won't pass. Probe from a " +
            "residential network, or use the official Anthropic API " +
            "(provider: 'claude') instead.";
        } else {
          // Trim the body to keep the error message compact but still
          // useful — most real Claude errors are short JSON; Cloudflare
          // HTML bodies are caught above.
          const trimmed = errorText.trim().slice(0, 500);
          errorMessage = trimmed
            ? `Claude Web API error (${fetchResponse.status}): ${trimmed}`
            : `Claude Web API error (${fetchResponse.status}) with no response body`;
        }

        const errorResp = new Response(
          JSON.stringify({
            error: {
              message: errorMessage,
              type: isCloudflareChallenge ? "cloudflare_challenge" : "api_error",
              code: isCloudflareChallenge
                ? "cf_mitigated_challenge"
                : `HTTP_${fetchResponse.status}`,
              ...(cfMitigated ? { cfMitigated } : {}),
            },
          }),
          {
            status: fetchResponse.status,
            statusText: "HTTP Error",
            headers: { "Content-Type": "application/json" },
          }
        );
        return {
          response: errorResp,
          url: completionUrl,
          headers,
          transformedBody: claudePayload,
        };
      }

      // Stream or accumulate the response based on the stream parameter.
      if (stream) {
        return {
          response: await buildClaudeStreamingResponse(
            fetchResponse,
            model,
            log,
            fetchResponse.body
          ),
          url: completionUrl,
          headers,
          transformedBody: claudePayload,
        };
      }
      return {
        response: await buildNonStreamingResponse(
          fetchResponse,
          model,
          bodyObj,
          log,
          fetchResponse.body
        ),
        url: completionUrl,
        headers,
        transformedBody: claudePayload,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log?.error?.("CLAUDE-WEB", `Fetch failed: ${errorMessage}`);

      const errorResp = new Response(
        JSON.stringify({
          error: {
            message: `Claude Web connection failed: ${sanitizeErrorMessage(errorMessage)}`,
            type: "api_connection_error",
          },
        }),
        {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "application/json" },
        }
      );

      return {
        response: errorResp,
        url: "",
        headers: {},
        transformedBody: bodyObj,
      };
    }
  }
}
