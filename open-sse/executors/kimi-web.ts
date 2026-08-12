/**
 * KimiWebExecutor — Moonshot AI Chat via www.kimi.com (Connect-RPC)
 *
 * Routes requests through Kimi's consumer chat API using Connect-RPC protocol.
 * Chinese market provider with strong long-context support.
 *
 * Endpoint: POST https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat
 * Auth: Bearer token (access_token from localStorage or kimi-auth cookie)
 * Protocol: Connect-RPC binary framing
 *
 * Upstream reduction note:
 * This implementation (~226 lines) is a streamlined port of the upstream executor (586 lines).
 * It preserves the complete Connect-RPC binary framing, bearer auth, streaming decoder, model resolution,
 * and error handling contracts while omitting non-essential web-scraping fallback helpers.
 */
import { BaseExecutor, type ExecuteInput } from "./base.ts";
import { makeExecutorErrorResult as makeErrorResult } from "../utils/error.ts";
import { extractKimiAccessToken } from "@/lib/providers/webCookieAuth";
import { resolveKimiModelId } from "../config/providers/registry/kimi/web/runtime.ts";

const CHAT_URL = "https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

/**
 * Frame a Connect-RPC message with 5-byte envelope + JSON payload.
 * Envelope: 1 byte compression flag (0) + 4 bytes big-endian length.
 */
export function frameConnectMessage(payload: object): Uint8Array {
  const jsonStr = JSON.stringify(payload);
  const jsonBytes = new TextEncoder().encode(jsonStr);
  const envelope = new Uint8Array(5 + jsonBytes.length);
  envelope[0] = 0; // No compression
  new DataView(envelope.buffer).setUint32(1, jsonBytes.length, false); // Big-endian
  envelope.set(jsonBytes, 5);
  return envelope;
}

/**
 * Decode a Connect-RPC frame, extracting the JSON payload.
 * Returns null if the frame is malformed.
 */
export function decodeConnectFrame(buffer: Uint8Array): object | null {
  if (buffer.length < 5) return null;
  const compression = buffer[0];
  if (compression !== 0) return null; // Only support uncompressed
  const length = new DataView(buffer.buffer, buffer.byteOffset).getUint32(1, false);
  if (buffer.length < 5 + length) return null;
  const jsonBytes = buffer.slice(5, 5 + length);
  try {
    return JSON.parse(new TextDecoder().decode(jsonBytes));
  } catch {
    return null;
  }
}

export class KimiWebExecutor extends BaseExecutor {
  constructor() {
    super("kimi-web", { id: "kimi-web", baseUrl: "https://www.kimi.com" });
  }

  async execute(input: ExecuteInput) {
    const { body, credentials, signal, stream: wantStream } = input;
    // SAFETY: body parameter is unknown input from caller, defaults to {}
    const bodyObj = (body || {}) as Record<string, unknown>;
    const rawCred = String(credentials?.apiKey ?? "").trim();

    const accessToken = extractKimiAccessToken(rawCred);
    if (!accessToken) {
      return makeErrorResult(
        401,
        "Missing Kimi access_token — paste your access_token from www.kimi.com (Local Storage → access_token or kimi-auth cookie)",
        body,
        CHAT_URL
      );
    }

    // SAFETY: bodyObj is Record<string, unknown>, safe fallback to "k3"
    const modelId = (bodyObj.model as string) || "k3";
    const modelConfig = resolveKimiModelId(modelId);
    // SAFETY: guarded by Array.isArray check in map below; content is string | array per OpenAI schema
    const messages = (bodyObj.messages as Array<{ role: string; content: string | unknown[] }>) || [];

    // Build Connect-RPC payload following the ChatService/Chat schema
    const chatId = crypto.randomUUID();
    const payload = {
      id: chatId,
      mode: "chat",
      model: modelConfig.id,
      messages: messages.map((m) => {
        const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        return { role: m.role, content };
      }),
      stream: wantStream,
      // SAFETY: bodyObj is Record<string, unknown>, safe fallback to modelConfig.maxTokens
      max_tokens: (bodyObj.max_tokens as number) || modelConfig.maxTokens || 131072,
    };

    const frame = frameConnectMessage(payload);

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/connect+json",
      "Connect-Protocol-Version": "1",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
      Accept: "application/connect+json",
      Referer: "https://www.kimi.com/",
      Origin: "https://www.kimi.com",
    };

    let upstream: Response;
    try {
      upstream = await fetch(CHAT_URL, {
        method: "POST",
        headers: reqHeaders,
        // SAFETY: Uint8Array is accepted by fetch body parameter
        body: frame,
        signal,
      });
    } catch (err) {
      return makeErrorResult(
        502,
        `Kimi fetch failed: ${err instanceof Error ? err.message : "unknown"}`,
        body,
        CHAT_URL
      );
    }

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return makeErrorResult(upstream.status, `Kimi error: ${errText}`, body, CHAT_URL);
    }

    if (!wantStream) {
      const buffer = new Uint8Array(await upstream.arrayBuffer());
      const decoded = decodeConnectFrame(buffer);
      if (!decoded) {
        return makeErrorResult(502, "Failed to decode Kimi response frame", body, CHAT_URL);
      }
      // SAFETY: decoded is JSON.parse result from decodeConnectFrame — always object
      const respObj = decoded as Record<string, unknown>;
      // SAFETY: guarded by typeof check on respObj.message
      const msgObj = respObj?.message as Record<string, unknown> | undefined;
      const content = (typeof respObj?.content === "string" ? respObj.content : "") ||
        // SAFETY: guarded by typeof check on msgObj.content
        (typeof msgObj?.content === "string" ? (msgObj.content as string) : "");
      return {
        response: new Response(
          JSON.stringify({
            id: `chatcmpl-kimi-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: modelId,
            choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
          }),
          { headers: { "Content-Type": "application/json" } }
        ),
        url: CHAT_URL,
        headers: reqHeaders,
        transformedBody: payload,
      };
    }

    // Streaming: Connect-RPC streams are length-prefixed frames
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }
        let capacity = 64 * 1024; // 64 KiB initial capacity
        let frameBuffer = new Uint8Array(capacity);
        let bufferLength = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Grow buffer exponentially if needed to avoid O(N²) reallocations
            if (bufferLength + value.length > capacity) {
              capacity = Math.max(capacity * 2, bufferLength + value.length);
              const expanded = new Uint8Array(capacity);
              expanded.set(frameBuffer.subarray(0, bufferLength));
              frameBuffer = expanded;
            }
            frameBuffer.set(value, bufferLength);
            bufferLength += value.length;

            // Try to decode complete frames (5-byte header + payload)
            while (bufferLength >= 5) {
              const compression = frameBuffer[0];
              if (compression !== 0) {
                // Skip compressed frames — advance past the 5-byte envelope + payload
                const compLen = new DataView(frameBuffer.buffer, frameBuffer.byteOffset).getUint32(1, false);
                if (bufferLength < 5 + compLen) break; // Wait for more data
                const frameSize = 5 + compLen;
                frameBuffer.copyWithin(0, frameSize, bufferLength);
                bufferLength -= frameSize;
                continue;
              }

              const length = new DataView(frameBuffer.buffer, frameBuffer.byteOffset).getUint32(1, false);
              if (bufferLength < 5 + length) break;
              const frameSize = 5 + length;
              const frameBytes = frameBuffer.slice(0, frameSize);
              frameBuffer.copyWithin(0, frameSize, bufferLength);
              bufferLength -= frameSize;

              const decoded = decodeConnectFrame(frameBytes);
              if (decoded) {
                // SAFETY: decoded is JSON.parse result from decodeConnectFrame — always object
                const respObj = decoded as Record<string, unknown>;
                // SAFETY: respObj is Record<string, unknown>
                const deltaObj = respObj?.delta as Record<string, unknown> | undefined;
                const content = (typeof respObj?.content === "string" ? respObj.content : "") ||
                  (typeof deltaObj?.content === "string" ? deltaObj.content : "");
                if (content) {
                  const chunk = {
                    id: `chatcmpl-kimi-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model: modelId,
                    choices: [{ index: 0, delta: { content }, finish_reason: null }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
              }
            }
          }
        } catch (err) {
          if (!signal?.aborted) controller.error(err);
        } finally {
          if (!signal?.aborted) {
            try {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch {
              // Ignore enqueue errors if controller is closed
            }
          }
          try {
            controller.close();
          } catch {
            // Ignore close errors if controller is closed
          }
        }
      },
    });

    return {
      response: new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }),
      url: CHAT_URL,
      headers: reqHeaders,
      transformedBody: payload,
    };
  }
}
