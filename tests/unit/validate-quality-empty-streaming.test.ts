import test from "node:test";
import assert from "node:assert/strict";
import { validateResponseQuality } from "../../open-sse/services/combo/validateQuality.ts";

function makeStreamingResponse(sseChunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of sseChunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function makeNonStreamingResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const silentLog = { warn: () => {} };

test("streaming response with only [DONE] returns valid: false and reason empty_streaming_content", async () => {
  const res = makeStreamingResponse(["data: [DONE]\n\n"]);
  const out = await validateResponseQuality(res, true, silentLog);
  assert.equal(out.valid, false);
  assert.equal(out.reason, "empty_streaming_content");
});

test("streaming response with only role delta and [DONE] returns valid: false and reason empty_streaming_content", async () => {
  const res = makeStreamingResponse([
    'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":12345,"model":"z-ai/glm-5.2","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":12345,"model":"z-ai/glm-5.2","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
    "data: [DONE]\n\n",
  ]);
  const out = await validateResponseQuality(res, true, silentLog);
  assert.equal(out.valid, false);
  assert.equal(out.reason, "empty_streaming_content");
});

test("streaming response with single whitespace-only delta returns valid: false and reason empty_streaming_content", async () => {
  const res = makeStreamingResponse([
    'data: {"choices":[{"index":0,"delta":{"content":" "},"finish_reason":null}]}\n\n',
    'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
    "data: [DONE]\n\n",
  ]);
  const out = await validateResponseQuality(res, true, silentLog);
  assert.equal(out.valid, false);
  assert.equal(out.reason, "empty_streaming_content");
});

test("streaming response with whitespace delta followed by real content returns valid: true", async () => {
  const res = makeStreamingResponse([
    'data: {"choices":[{"index":0,"delta":{"content":" "},"finish_reason":null}]}\n\n',
    'data: {"choices":[{"index":0,"delta":{"content":"Hello world"},"finish_reason":null}]}\n\n',
    "data: [DONE]\n\n",
  ]);
  const out = await validateResponseQuality(res, true, silentLog);
  assert.equal(out.valid, true);
  assert.ok(out.clonedResponse instanceof Response);
});

test("streaming response with reasoning_content but no content returns valid: true", async () => {
  const res = makeStreamingResponse([
    'data: {"choices":[{"index":0,"delta":{"reasoning_content":"Thinking deeply..."},"finish_reason":null}]}\n\n',
    'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
    "data: [DONE]\n\n",
  ]);
  const out = await validateResponseQuality(res, true, silentLog);
  assert.equal(out.valid, true);
  assert.ok(out.clonedResponse instanceof Response);
});

test("non-streaming empty content response returns valid: false (regression)", async () => {
  const res = makeNonStreamingResponse({
    choices: [{ message: { content: "" } }],
  });
  const out = await validateResponseQuality(res, false, silentLog);
  assert.equal(out.valid, false);
});
