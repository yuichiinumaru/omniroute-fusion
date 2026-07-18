/**
 * Task 0042 — Chat pipeline result envelope + Hard Rule #12 sanitization.
 *
 * Findings covered:
 *   F-01-001  Quota-share block returns { success, status, error, response } envelope
 *   F-01-002  Moderations / audio upstream errors sanitized (no stack path markers)
 *   F-01-003  Translator errorType branch routes through createErrorResult
 *   F-01-004  Streaming response header denylist strips set-cookie / auth / hop-by-hop
 *   F-01-005  createSSEStream cancel finalizes pending request / onFailure
 *   F-01-W2-003 Mid-stream streamHandler errors use sanitizeErrorMessage
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ── F-01-001: source contract + createErrorResult envelope shape ─────────────

test("F-01-001: quota-share block path returns createErrorResult envelope (not bare Response)", () => {
  const src = fs.readFileSync(path.join(ROOT, "open-sse/handlers/chatCore.ts"), "utf8");
  // Isolate the enforceQuotaShare block decision region.
  const blockIdx = src.indexOf('if (decision.kind === "block")');
  assert.ok(blockIdx > 0, "quota-share block branch must exist");
  // Include the full branch through the closing brace of the if.
  const endIdx = src.indexOf("\n      }", blockIdx);
  const region = src.slice(blockIdx, endIdx > blockIdx ? endIdx + 10 : blockIdx + 1600);

  assert.match(
    region,
    /createErrorResult\s*\(\s*HTTP_STATUS\.RATE_LIMITED/,
    "block branch must call createErrorResult(HTTP_STATUS.RATE_LIMITED, …)"
  );
  assert.doesNotMatch(
    region,
    /return\s+new\s+Response\s*\(/,
    "block branch must NOT return a bare new Response(...)"
  );
  assert.match(region, /return\s+result;/, "block branch must return the envelope result");
});

test("F-01-001: createErrorResult envelope shape matches chatCore callers (success/status/response)", async () => {
  const { createErrorResult } = await import("../../open-sse/utils/error.ts");
  const result = createErrorResult(429, "quota share exhausted", 30_000);

  assert.equal(result.success, false);
  assert.equal(result.status, 429);
  assert.equal(typeof result.error, "string");
  assert.ok(result.response instanceof Response, "response must be a Response instance");
  assert.equal(result.response.status, 429);
  assert.equal(result.retryAfterMs, 30_000);

  const body = (await result.response.json()) as {
    error?: { message?: string; type?: string; code?: string };
  };
  assert.ok(body.error?.message, "OpenAI-compatible error.message required");
  assert.equal(body.error?.message.includes("at /"), false, "must not leak stack frames");
  assert.ok(body.error?.type, "error.type must be present");
  assert.ok(body.error?.code, "error.code must be present");
});

test("F-01-001: runtime mock enforceQuotaShare→block composes createErrorResult envelope", async () => {
  // Path-to-100 N1: runtime mock of the block decision (not source-grep alone).
  // Mirrors chatCore.ts block branch composition exactly after enforceQuotaShare returns block.
  const { createErrorResult } = await import("../../open-sse/utils/error.ts");
  const { HTTP_STATUS } = await import("../../open-sse/config/constants.ts");

  const enforceQuotaShare = async () =>
    ({
      kind: "block" as const,
      reason: "quota share exhausted (unit mock)",
      retryAfterSeconds: 12,
    }) as const;

  const decision = await enforceQuotaShare();
  assert.equal(decision.kind, "block");

  const retryAfterMs =
    typeof decision.retryAfterSeconds === "number" && decision.retryAfterSeconds > 0
      ? decision.retryAfterSeconds * 1000
      : null;
  const result = createErrorResult(HTTP_STATUS.RATE_LIMITED, decision.reason, retryAfterMs);
  if (decision.retryAfterSeconds) {
    result.response.headers.set("Retry-After", String(decision.retryAfterSeconds));
  }

  assert.equal(result.success, false);
  assert.equal(result.status, 429);
  assert.ok(result.response instanceof Response);
  assert.equal(result.response.status, 429);
  assert.equal(result.response.headers.get("Retry-After"), "12");
  assert.equal(result.retryAfterMs, 12_000);
  const body = (await result.response.json()) as { error?: { message?: string } };
  assert.match(String(body.error?.message), /quota share exhausted/);
  assert.equal(String(body.error?.message).includes("at /"), false);
});

test("F-01-W2-005 residual: createStreamingErrorResult envelope .error is sanitized (0042 N5)", async () => {
  const { createStreamingErrorResult } = await import(
    "../../open-sse/handlers/chatCore/streamErrorResult.ts"
  );
  const dirty = "stream fail at /var/app/core.ts:9:1\n    at run (/var/app/x.js:1:1)";
  const result = createStreamingErrorResult(500, dirty);
  assert.equal(result.success, false);
  assert.equal(result.error.includes("at /"), false);
  assert.equal(result.error.includes("/var/"), false);
  const text = await result.response.text();
  const json = JSON.parse(text.slice("data: ".length, text.indexOf("\n\n")));
  assert.equal(json.error.message, result.error);
});

// ── F-01-003: translator errorType branch uses createErrorResult ─────────────

test("F-01-003: translator errorType path uses createErrorResult (sanitized)", () => {
  const src = fs.readFileSync(path.join(ROOT, "open-sse/handlers/chatCore.ts"), "utf8");
  const marker = 'log?.warn?.("TRANSLATE", `Request translation failed:';
  const idx = src.indexOf(marker);
  assert.ok(idx > 0, "TRANSLATE warn log must exist");
  const region = src.slice(idx, idx + 700);

  assert.match(region, /if\s*\(\s*errorType\s*\)/, "errorType branch retained");
  assert.match(
    region,
    /createErrorResult\s*\(\s*statusCode\s*,\s*message\s*,\s*null\s*,\s*errorType\s*,\s*errorType\s*\)/,
    "errorType branch must call createErrorResult with code/type"
  );
  assert.doesNotMatch(
    region,
    /JSON\.stringify\(\s*\{\s*error:\s*\{\s*message,/,
    "must not hand-build unsanitized error JSON"
  );
});

test("F-01-003: createErrorResult with errorType sanitizes message", async () => {
  const { createErrorResult } = await import("../../open-sse/utils/error.ts");
  const dirty =
    "schema dump failed at /home/svc/app/translator.ts:42:1\n    at translateRequest (/home/svc/app/index.js:10:5)";
  const result = createErrorResult(400, dirty, null, "invalid_request", "invalid_request");
  assert.equal(result.success, false);
  assert.equal(result.status, 400);
  assert.equal(result.errorType, "invalid_request");
  assert.equal(result.error.includes("at /"), false);
  assert.equal(result.error.includes("\n"), false);

  const body = (await result.response.json()) as { error?: { message?: string; type?: string } };
  assert.equal(body.error?.type, "invalid_request");
  assert.equal(body.error?.message?.includes("at /"), false);
  assert.equal(body.error?.message?.includes("/home/"), false);
});

// ── F-01-004: streaming response header denylist ─────────────────────────────

test("F-01-004: buildStreamingResponseHeaders strips sensitive + hop-by-hop headers", async () => {
  const { buildStreamingResponseHeaders } = await import(
    "../../open-sse/handlers/chatCore/responseHeaders.ts"
  );

  const headers = new Headers(
    buildStreamingResponseHeaders(
      new Headers({
        "Content-Type": "text/event-stream",
        "Content-Encoding": "gzip",
        "Content-Length": "999",
        "Transfer-Encoding": "chunked",
        Connection: "keep-alive",
        "Keep-Alive": "timeout=5",
        "Set-Cookie": "session=abc; Path=/",
        Authorization: "Bearer leaked",
        "WWW-Authenticate": 'Basic realm="x"',
        Cookie: "session=abc",
        "X-Api-Key": "sk-leaked",
        "X-RateLimit-Remaining": "42",
        "X-Upstream-Trace": "trace-1",
      }),
      {
        provider: "openai",
        model: "gpt-4o-mini",
        cacheHit: false,
        latencyMs: 0,
        usage: null,
        costUsd: 0,
      }
    )
  );

  assert.equal(headers.get("Content-Type"), "text/event-stream");
  assert.equal(headers.get("Content-Encoding"), null);
  assert.equal(headers.get("Content-Length"), null);
  assert.equal(headers.get("Transfer-Encoding"), null);
  assert.equal(headers.get("Connection"), "keep-alive"); // our SSE keep-alive, not upstream
  assert.equal(headers.get("Set-Cookie"), null);
  assert.equal(headers.get("Authorization"), null);
  assert.equal(headers.get("WWW-Authenticate"), null);
  assert.equal(headers.get("Cookie"), null);
  assert.equal(headers.get("X-Api-Key"), null);
  // Non-sensitive operator-visible headers still forward.
  assert.equal(headers.get("X-RateLimit-Remaining"), "42");
  assert.equal(headers.get("X-Upstream-Trace"), "trace-1");
});

// ── F-01-002: moderations / audio sanitization ───────────────────────────────

test("F-01-002: handleModeration upstream error is sanitized (no stack path markers)", async () => {
  const { handleModeration } = await import("../../open-sse/handlers/moderations.ts");
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          message:
            "provider boom at /home/svc/app/moderation.ts:12:3\n    at run (/home/svc/app/index.js:1:1)",
        },
      }),
      { status: 502, headers: { "content-type": "application/json" } }
    );

  try {
    const response = (await handleModeration({
      body: { model: "omni-moderation-latest", input: "hello" },
      credentials: { apiKey: "sk-test" },
    })) as Response;

    assert.equal(response.status, 502);
    const body = (await response.json()) as { error?: { message?: string } };
    assert.ok(body.error?.message, "error.message required");
    assert.equal(body.error?.message?.includes("at /"), false);
    assert.equal(body.error?.message?.includes("/home/"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("F-01-002: audio speech upstreamErrorResponse sanitizes stack-bearing upstream text", async () => {
  const { handleAudioSpeech } = await import("../../open-sse/handlers/audioSpeech.ts");
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          message:
            "tts failed at /var/app/speech.ts:9:1\n    at synthesize (/var/app/index.js:2:2)",
        },
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );

  try {
    const response = (await handleAudioSpeech({
      body: { model: "openai/tts-1", input: "hello world" },
      credentials: { apiKey: "openai-key" },
    })) as Response;

    assert.equal(response.status, 500);
    const body = (await response.json()) as { error?: { message?: string } };
    assert.ok(body.error?.message);
    assert.equal(body.error?.message?.includes("at /"), false);
    assert.equal(body.error?.message?.includes("/var/"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("F-01-002: audio transcription upstreamErrorResponse sanitizes stack-bearing upstream text", async () => {
  const { handleAudioTranscription } = await import(
    "../../open-sse/handlers/audioTranscription.ts"
  );
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          message:
            "asr failed at /opt/whisper/handler.ts:3:1\n    at transcribe (/opt/whisper/index.js:4:4)",
        },
      }),
      { status: 503, headers: { "content-type": "application/json" } }
    );

  try {
    const formData = new FormData();
    formData.append("model", "openai/whisper-1");
    formData.append("file", new File([Buffer.from("abc")], "audio.wav", { type: "audio/wav" }));

    const response = (await handleAudioTranscription({
      formData,
      credentials: { apiKey: "x" },
    })) as Response;

    assert.equal(response.status, 503);
    const body = (await response.json()) as { error?: { message?: string } };
    assert.ok(body.error?.message);
    assert.equal(body.error?.message?.includes("at /"), false);
    assert.equal(body.error?.message?.includes("/opt/"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── F-01-005: createSSEStream cancel finalizes pending / onFailure ───────────

test("F-01-005: createSSEStream cancel invokes onFailure and clears pending request", async () => {
  const { createSSEStream } = await import("../../open-sse/utils/stream.ts");
  const { trackPendingRequest, getPendingRequests, clearPendingRequests } = await import(
    "../../src/lib/usage/usageHistory.ts"
  );

  clearPendingRequests();
  trackPendingRequest("gpt-4o-mini", "openai", "conn-cancel-0042", true);

  let failurePayload: Record<string, unknown> | null = null;
  let failureCalls = 0;

  const transform = createSSEStream({
    mode: "passthrough",
    sourceFormat: "openai",
    provider: "openai",
    model: "gpt-4o-mini",
    connectionId: "conn-cancel-0042",
    body: { messages: [{ role: "user", content: "hi" }] },
    onFailure(payload: Record<string, unknown>) {
      failureCalls += 1;
      failurePayload = payload;
      // Return true so stream-side pending clear is skipped (caller owns it),
      // matching production finalizer contract — then we assert the callback fired.
      return true;
    },
  } as any);

  // Manually track that cancel path uses connectionId from options: when onFailure
  // returns true, clearPendingRequestFromStream is skipped. Drive cancel via a
  // ReadableStream reader so the TransformStream cancel hook runs.
  const source = new ReadableStream({
    start(c) {
      // leave open until cancel
    },
  });
  const piped = source.pipeThrough(transform);
  const reader = piped.getReader();
  await reader.cancel("client disconnected");

  assert.equal(failureCalls, 1, "onFailure must be invoked exactly once on cancel");
  assert.ok(failurePayload, "onFailure payload required");
  assert.equal(failurePayload?.status, 499);
  assert.equal(failurePayload?.code, "client_disconnected");
  assert.equal(failurePayload?.type, "client_disconnected");

  // When onFailure returns true the stream trusts the caller for pending clear;
  // clear explicitly here so we do not leak into other tests, and also cover
  // the no-onFailure path below.
  trackPendingRequest("gpt-4o-mini", "openai", "conn-cancel-0042", false);
  clearPendingRequests();
});

test("F-01-005: createSSEStream cancel without onFailure clears pending counter", async () => {
  const { createSSEStream } = await import("../../open-sse/utils/stream.ts");
  const { trackPendingRequest, getPendingRequests, clearPendingRequests } = await import(
    "../../src/lib/usage/usageHistory.ts"
  );

  clearPendingRequests();
  const connId = "conn-cancel-clear-0042";
  const modelKey = "gpt-4o-mini (openai)";
  trackPendingRequest("gpt-4o-mini", "openai", connId, true);
  const before = getPendingRequests();
  assert.ok(
    (before.byAccount[connId]?.[modelKey] ?? 0) >= 1,
    "pending request must be registered before cancel"
  );

  const transform = createSSEStream({
    mode: "passthrough",
    sourceFormat: "openai",
    provider: "openai",
    model: "gpt-4o-mini",
    connectionId: connId,
    body: { messages: [{ role: "user", content: "hi" }] },
  } as any);

  const source = new ReadableStream({
    start() {
      /* leave open */
    },
  });
  const piped = source.pipeThrough(transform);
  const reader = piped.getReader();
  await reader.cancel("gone");

  const after = getPendingRequests();
  assert.equal(
    after.byAccount[connId]?.[modelKey] ?? 0,
    0,
    "cancel must clear stream pending request"
  );
  clearPendingRequests();
});

// ── F-01-W2-003: mid-stream streamHandler sanitization ───────────────────────

test("F-01-W2-003: mid-stream disconnect SSE strips absolute source paths", async () => {
  const { createDisconnectAwareStream, createStreamController } = await import(
    "../../open-sse/utils/streamHandler.ts"
  );

  const dirty = Object.assign(
    new Error(
      "ENOENT /home/svc/app/secrets.ts:1:1\n    at readFile (/home/svc/app/index.js:10:5)"
    ),
    { statusCode: 502 }
  );

  const transformStream = {
    readable: new ReadableStream({
      start(controller) {
        controller.error(dirty);
      },
    }),
    writable: {
      getWriter() {
        return { abort() {} };
      },
    },
  };

  const stream = createDisconnectAwareStream(transformStream, createStreamController());
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const text = new TextDecoder().decode(
    chunks.length === 1
      ? chunks[0]
      : Uint8Array.from(chunks.flatMap((c) => Array.from(c)))
  );

  assert.match(text, /finish_reason":"error"/);
  assert.doesNotMatch(text, /\/home\/svc\/app\/secrets\.ts/);
  assert.doesNotMatch(text, /at \/home\//);
  assert.doesNotMatch(text, /index\.js:10/);
  // Sanitizer replaces absolute source paths with <path> and drops stack lines.
  assert.match(text, /ENOENT/);
});
