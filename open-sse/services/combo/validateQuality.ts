/**
 * Combo response-quality validation extracted from combo.ts.
 *
 * `validateResponseQuality` (bounded SSE peek + non-streaming content check) and
 * `toRetryAfterDisplayValue` moved out of the combo.ts god-file (Quality Gate v2
 * / Fase 9). Logic unchanged; re-exported from combo.ts for compatibility.
 */

import { createSSEDataLineNormalizer } from "../../utils/streamHelpers.ts";
import { getReasoningTokens } from "../../../src/lib/usage/tokenAccounting.ts";
import type { ComboRetryAfter } from "./types.ts";

export function toRetryAfterDisplayValue(value: ComboRetryAfter): string | Date {
  if (typeof value !== "number") return value;
  if (value > 0 && value < 1_000_000_000) {
    return new Date(Date.now() + value * 1000);
  }
  return new Date(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function responsesApiOutputHasContent(output: unknown): boolean {
  return (
    Array.isArray(output) &&
    output.some((item) => {
      if (!item || typeof item !== "object") return false;
      // SAFETY: line 29 verified item is a truthy object; Record cast is structural type narrowing.
      const record = item as Record<string, unknown>;
      if (record.type !== "message") return Boolean(record.type);
      const content = record.content;
      return (
        Array.isArray(content) &&
        content.some(
          (part) =>
            !!part &&
            typeof part === "object" &&
            // SAFETY: line 38 verified part is a truthy object; Record cast is structural type narrowing.
            typeof (part as Record<string, unknown>).text === "string" &&
            // SAFETY: line 39 verified part.text is string; Record cast is structural type narrowing.
            ((part as Record<string, string>).text as string).length > 0
        )
      );
    })
  );
}

/**
 * Validate that a successful (HTTP 200) response actually contains meaningful content.
 * Returns { valid: true, clonedResponse } or { valid: false, reason }.
 *
 * Streaming path: bounded SSE peek — reads just enough of the event stream to detect
 * content (content_block_*, delta.content, tool_calls, reasoning_content) without
 * de-streaming non-empty responses. On content found, returns a clonedResponse that
 * replays the buffered prefix + forwards the original reader tail.
 *
 * Empty-content detection (streaming): when the stream ends without any meaningful
 * content (accumulatedContentText.trim().length === 0, no reasoning, no tool_calls,
 * no structural output), returns `{ valid: false, reason: "empty_streaming_content" }`.
 * Claude-specific path additionally checks for `message_start` → `message_stop` with
 * zero `content_block_*` events (e.g. content_filter stop_reason).
 *
 * Non-streaming path: validates JSON body has at least one choice with non-empty
 * content, tool_calls, or reasoning_content.
 */
export async function validateResponseQuality(
  response: Response,
  isStreaming: boolean,
  log: { warn?: (...args: unknown[]) => void }
): Promise<{ valid: boolean; reason?: string; clonedResponse?: Response }> {
  // Issue #3685: For Claude SSE streaming responses, use a BOUNDED PEEK to
  // detect the empty-content-block pattern (content_filter stop_reason with
  // no content_block_* events) WITHOUT de-streaming non-empty responses.
  //
  // Parse SSE events incrementally. Stop buffering once a content_block_* event
  // or a known non-Claude SSE payload appears, replay the buffered prefix, then
  // pipe the original reader so the rest of the stream keeps flowing normally.
  // Only fail over when a complete Claude lifecycle ends without content_block.
  //
  // Non-text/event-stream streaming responses are not buffered at all.
  if (isStreaming) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      return { valid: true };
    }

    if (!response.body) {
      return { valid: true };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    // Raw Uint8Array chunks accumulated so far — used to replay the prefix
    // in the returned clonedResponse.
    const bufferedChunks: Uint8Array[] = [];
    // Decoded text accumulated across chunks for incremental SSE parsing.
    // Only the tail of the most-recently-processed line window remains here
    // between iterations (incomplete lines are deferred to the next chunk).
    let decodedSoFar = "";

    // SSE lifecycle & content state.
    let hasMessageStart = false;
    let hasContentBlock = false;
    let hasLifecycleEnd = false;
    let accumulatedContentText = "";
    let hasReasoningContent = false;
    let hasToolCalls = false;
    let hasOtherStructuralOutput = false;
    const sseLineNormalizer = createSSEDataLineNormalizer();
    let pendingEventType = "";

    function inspectParsedStreamPayload(parsed: Record<string, unknown>, eventType: string): void {
      if (Array.isArray(parsed.choices)) {
        for (const choice of parsed.choices) {
          if (!isRecord(choice)) continue;
          const delta = isRecord(choice.delta) ? choice.delta : null;
          if (!delta) continue;
          if (typeof delta.content === "string") {
            accumulatedContentText += delta.content;
          }
          const reasoning = delta.reasoning_content ?? delta.reasoning ?? delta.reasoning_text;
          if (typeof reasoning === "string" && reasoning.trim().length > 0) {
            hasReasoningContent = true;
          }
          if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) {
            hasToolCalls = true;
          }
        }
      }

      const type = typeof parsed.type === "string" ? parsed.type : eventType;
      if (type.startsWith("response.")) {
        if (
          type === "response.output_text.delta" ||
          type === "response.reasoning_text.delta" ||
          type === "response.reasoning_summary_text.delta" ||
          type === "response.function_call_arguments.delta"
        ) {
          if (typeof parsed.delta === "string") accumulatedContentText += parsed.delta;
          if (typeof parsed.text === "string") accumulatedContentText += parsed.text;
          if (typeof parsed.arguments === "string" && parsed.arguments.trim().length > 0) {
            hasToolCalls = true;
          }
        } else if (
          type === "response.output_item.added" ||
          type === "response.output_item.done" ||
          type === "response.content_part.added"
        ) {
          hasOtherStructuralOutput = true;
        } else if (type === "response.completed" && isRecord(parsed.response)) {
          const output = parsed.response.output;
          if (Array.isArray(output) && output.length > 0) {
            hasOtherStructuralOutput = true;
          }
        }
      }

      const candidates = Array.isArray(parsed.candidates)
        ? parsed.candidates
        : isRecord(parsed.response) && Array.isArray(parsed.response.candidates)
          ? parsed.response.candidates
          : null;
      if (candidates) {
        for (const candidate of candidates) {
          if (!isRecord(candidate)) continue;
          const content = isRecord(candidate.content) ? candidate.content : null;
          const parts = Array.isArray(content?.parts) ? content.parts : null;
          if (parts) {
            for (const part of parts) {
              if (!isRecord(part)) continue;
              if (typeof part.text === "string") accumulatedContentText += part.text;
              if (isRecord(part.functionCall) || isRecord(part.executableCode)) {
                hasToolCalls = true;
              }
            }
          }
        }
      }
    }

    /**
     * Parse any complete SSE lines from `decodedSoFar`, updating lifecycle
     * flags in the closure. The last (potentially incomplete) line is kept in
     * `decodedSoFar` for the next iteration.
     *
     * Returns true when content or structural events are detected — the caller
     * should stop peeking and treat the stream as non-empty.
     */
    function parseAccumulatedSse(): boolean {
      const lines = decodedSoFar.split(/\r?\n/);
      // Retain the potentially-incomplete trailing fragment.
      decodedSoFar = lines[lines.length - 1];

      for (const line of sseLineNormalizer.normalize(lines.slice(0, -1))) {
        const trimmed = line.trim();

        if (trimmed.startsWith("event:")) {
          pendingEventType = trimmed.slice(6).trim();
          continue;
        }

        if (!trimmed.startsWith("data:")) {
          if (!trimmed) pendingEventType = "";
          continue;
        }

        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data);
        } catch {
          if (!data.startsWith("{") && !data.startsWith("[")) {
            accumulatedContentText += data;
            if (accumulatedContentText.trim().length > 0) return true;
          }
          continue;
        }

        const eventType =
          (typeof parsed.type === "string" ? parsed.type : null) || pendingEventType || "";
        pendingEventType = "";

        switch (eventType) {
          case "message_start":
            hasMessageStart = true;
            break;
          case "content_block_start":
          case "content_block_delta":
          case "content_block_stop":
            hasContentBlock = true;
            // Signal caller to stop buffering immediately.
            return true;
          case "message_stop":
            hasLifecycleEnd = true;
            break;
          case "message_delta": {
            const delta = parsed.delta;
            if (
              delta &&
              typeof delta === "object" &&
              // SAFETY: line 244-245 verified delta is truthy object.
              (delta as Record<string, unknown>).stop_reason != null
            ) {
              hasLifecycleEnd = true;
            }
            break;
          }
          default:
            break;
        }

        inspectParsedStreamPayload(parsed, eventType);

        if (
          accumulatedContentText.trim().length > 0 ||
          hasReasoningContent ||
          hasToolCalls ||
          hasOtherStructuralOutput
        ) {
          return true;
        }
      }
      return false;
    }

    /**
     * Build a Response whose body first replays all bytes in `bufferedChunks`,
     * then forwards the remainder of `readerToForward` chunk-by-chunk.
     * Preserves the original response's status, statusText, and headers.
     */
    function buildReplayResponse(
      readerToForward: ReadableStreamDefaultReader<Uint8Array>
    ): Response {
      // Snapshot the prefix so mutations after this point don't affect it.
      const prefix = bufferedChunks.slice();
      let prefixIdx = 0;
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          // 1. Drain the buffered prefix one chunk at a time.
          if (prefixIdx < prefix.length) {
            controller.enqueue(prefix[prefixIdx++]);
            return;
          }
          // 2. Forward the remainder from the original reader.
          try {
            const { done, value } = await readerToForward.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    // Main bounded-peek loop.
    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Stream finished — flush the TextDecoder and parse any remaining text.
          const tail = decoder.decode(undefined, { stream: false });
          if (tail) decodedSoFar += tail;
          if (decodedSoFar.trim()) decodedSoFar += "\n\n";
          parseAccumulatedSse();

          if (hasMessageStart && hasLifecycleEnd && !hasContentBlock) {
            // Complete Claude lifecycle with zero content blocks → failover.
            log.warn?.(
              "COMBO",
              "Streaming Claude response has complete lifecycle but zero content blocks (content_filter?) — marking as invalid for combo failover"
            );
            return { valid: false, reason: "streaming empty content block" };
          }

          // Issue #5171: OpenAI-compatible streaming responses (NVIDIA NIM, etc.)
          // may return 200 OK with zero output tokens — only [DONE], no content
          // deltas. Detect this and trigger combo fallback instead of silently
          // terminating the chain. Whitespace-only content counts as empty.
          const hasMeaningfulContent =
            accumulatedContentText.trim().length > 0 ||
            hasReasoningContent ||
            hasToolCalls ||
            hasOtherStructuralOutput;

          if (!hasMeaningfulContent) {
            log.warn?.(
              "COMBO",
              "Streaming response completed with zero meaningful content (empty_streaming_content) — marking as invalid for combo failover"
            );
            return { valid: false, reason: "empty_streaming_content" };
          }

          // Valid stream with content — replay all buffered bytes.
          // The reader is exhausted so the forwarding reader will
          // immediately signal done.
          const clonedResponse = buildReplayResponse(reader);
          return { valid: true, clonedResponse };
        }

        // Accumulate raw bytes for potential replay.
        bufferedChunks.push(value);

        // Decode incrementally (stream:true keeps multi-byte char state).
        decodedSoFar += decoder.decode(value, { stream: true });
        const foundContent = parseAccumulatedSse();

        if (foundContent) {
          // A content_block_* event was found — stop peeking. Return a
          // clonedResponse that replays all buffered bytes (the current chunk
          // is already in bufferedChunks) and then forwards the remainder of
          // the original reader unchanged.
          const clonedResponse = buildReplayResponse(reader);
          return { valid: true, clonedResponse };
        }
      }
    } catch {
      // If reading the stream fails, pass through — other mechanisms
      // (stream readiness timeout) will catch truly broken streams.
      return { valid: true };
    }
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("text/")) {
    return { valid: true };
  }

  let cloned: Response;
  try {
    cloned = response.clone();
  } catch {
    return { valid: true };
  }

  let text: string;
  try {
    text = await cloned.text();
  } catch {
    return { valid: true };
  }

  if (!text || text.trim().length === 0) {
    return { valid: false, reason: "empty response body" };
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    if (text.startsWith("data:") || text.startsWith("event:")) return { valid: true };
    return { valid: false, reason: "response is not valid JSON" };
  }

  const choices = json?.choices;
  if (json?.object === "response") {
    if (!responsesApiOutputHasContent(json.output)) return { valid: false, reason: "empty_choices" };
    const status = typeof json.status === "string" ? json.status : "";
    if (status && !["completed", "done"].includes(status)) {
      return { valid: false, reason: "no_terminal" };
    }
    return {
      valid: true,
      clonedResponse: new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
    };
  }

  if (!Array.isArray(choices) || choices.length === 0) {
    if (json?.output || json?.result || json?.data || json?.response) return { valid: true };
    if (json?.error) {
      // SAFETY: line 427 verified json.error is truthy.
      const err = json.error as Record<string, unknown>;
      return {
        valid: false,
        reason: `upstream error in 200 body: ${err?.message || JSON.stringify(json.error).substring(0, 200)}`,
      };
    }
    return { valid: true };
  }

  const firstChoice = choices[0];
  const message = firstChoice?.message || firstChoice?.delta;
  if (!message) {
    return { valid: false, reason: "choice has no message object" };
  }

  const content = message.content;
  const toolCalls = message.tool_calls;
  // Issue #2341: Reasoning models (Kimi-K2.5-TEE, GLM-5-TEE, etc.) emit their
  // output in `reasoning_content` (or `reasoning`) with `content: null`. The
  // validator used to flag those as empty and trigger a false-positive 502
  // fallback. Count a non-empty reasoning_content as valid output too.
  const reasoningContent = message.reasoning_content ?? message.reasoning;
  const hasReasoningContent =
    typeof reasoningContent === "string" && reasoningContent.trim().length > 0;
  const hasContent =
    (content !== null && content !== undefined && content !== "") || hasReasoningContent;
  const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0;

  if (!hasContent && !hasToolCalls) {
    return { valid: false, reason: "empty content and no tool_calls in response" };
  }

  // Issue #3587: Reasoning models (deepseek-v4-flash, nemotron, etc.) may consume
  // ALL max_tokens for reasoning_tokens, leaving content empty. When content is
  // empty but reasoning_content exists, and usage shows reasoning consumed nearly
  // all completion tokens, treat as invalid so the combo loop retries with more
  // tokens or falls back to a non-reasoning model.
  const contentIsEmpty = content === null || content === undefined || content === "";
  if (contentIsEmpty && hasReasoningContent && !hasToolCalls) {
    // SAFETY: line 467 json?.usage assertion is for type narrowing on optional object.
    const usage = json?.usage as Record<string, unknown> | undefined;
    if (usage) {
      const completionTokens = Number(usage.completion_tokens) || 0;
      const reasoningTokens = getReasoningTokens(usage);
      // If reasoning consumed 90%+ of completion tokens, the model ran out of
      // budget before producing any content output.
      if (completionTokens > 0 && reasoningTokens >= completionTokens * 0.9) {
        return {
          valid: false,
          reason: `reasoning consumed ${reasoningTokens}/${completionTokens} tokens — no content output`,
        };
      }
    }
  }

  return {
    valid: true,
    clonedResponse: new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
  };
}
