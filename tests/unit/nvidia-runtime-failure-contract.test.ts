/**
 * Task 0139: NVIDIA NIM Runtime Failure Contract & Classification Matrix Tests
 *
 * Classification Matrix:
 * ┌─────────────────────────────┬────────┬─────────────────────────────┬────────────────────────────────┬────────────────────────────┐
 * │ Category                    │ Status │ Detector                    │ Classification                 │ Combo Action               │
 * ├─────────────────────────────┼────────┼─────────────────────────────┼────────────────────────────────┼────────────────────────────┤
 * │ 1. Synthetic 524 Timeout    │ 524    │ combo.ts timeout controller │ Connection-level failure       │ Skips same-conn targets,   │
 * │                             │        │                             │ (targetExhaustion)             │ advances to next combo     │
 * ├─────────────────────────────┼────────┼─────────────────────────────┼────────────────────────────────┼────────────────────────────┤
 * │ 2. Post-Tool Empty Stream   │ 200    │ validateResponseQuality     │ Model-level quality failure    │ Advances to next combo     │
 * │    (0 output tokens)        │        │ (empty_streaming_content)   │ (NOT connection exhaustion)    │ target (model fallback)    │
 * ├─────────────────────────────┼────────┼─────────────────────────────┼────────────────────────────────┼────────────────────────────┤
 * │ 3. Valid Tool-Only Output   │ 200    │ validateResponseQuality     │ Valid completion               │ Succeeds & returns stream  │
 * │    (tool_calls, 0 text)     │        │ (hasToolCalls = true)       │ (valid: true)                  │ to client                  │
 * ├─────────────────────────────┼────────┼─────────────────────────────┼────────────────────────────────┼────────────────────────────┤
 * │ 4. Upstream 5xx Error       │ 500/503│ Upstream response handler   │ Connection-level failure       │ Skips same-conn targets,   │
 * │    (NVIDIA API error)       │        │                             │ (targetExhaustion)             │ advances to next target    │
 * └─────────────────────────────┴────────┴─────────────────────────────┴────────────────────────────────┴────────────────────────────┘
 */

import test from "node:test";
import assert from "node:assert/strict";
import { validateResponseQuality } from "../../open-sse/services/combo/validateQuality.ts";
import { applyComboTargetExhaustion, isEmptyContentFailure, type ComboExhaustionSets } from "../../open-sse/services/combo/targetExhaustion.ts";
import type { ResolvedComboTarget, ComboLogger } from "../../open-sse/services/combo/types.ts";

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

function makeNvidiaTarget(overrides: Partial<ResolvedComboTarget> = {}): ResolvedComboTarget {
  return {
    kind: "model",
    stepId: "step-nvidia-1",
    executionKey: "nvidia-deepseek-v4-pro",
    modelStr: "deepseek-ai/deepseek-v4-pro",
    provider: "nvidia",
    providerId: "nvidia",
    connectionId: "conn-nvidia-primary",
    allowedConnectionIds: null,
    weight: 1,
    label: "NVIDIA Primary Account",
    failoverBeforeRetry: undefined,
    ...overrides,
  };
}

function makeLogger() {
  const logs: { level: string; tag: string; message: string }[] = [];
  return {
    info: (tag: string, msg: string) => logs.push({ level: "info", tag, message: msg }),
    warn: (tag: string, msg: string) => logs.push({ level: "warn", tag, message: msg }),
    error: (tag: string, msg: string) => logs.push({ level: "error", tag, message: msg }),
    debug: (tag: string, msg: string) => logs.push({ level: "debug", tag, message: msg }),
    logs,
  };
}

function makeSets(): ComboExhaustionSets {
  return {
    exhaustedProviders: new Set<string>(),
    exhaustedConnections: new Set<string>(),
    transientRateLimitedProviders: new Set<string>(),
  };
}

// ---------------------------------------------------------------------------
// 1. Synthetic 524 Timeout Classification & Diagnostics
// ---------------------------------------------------------------------------

test("NVIDIA NIM synthetic 524 timeout is classified as connection-level failure in targetExhaustion", () => {
  const sets = makeSets();
  const logger = makeLogger();
  const target = makeNvidiaTarget();

  const providerExhausted = applyComboTargetExhaustion(target, {
    result: { status: 524 },
    fallbackResult: { reason: "timeout" },
    errorText: "Model deepseek-ai/deepseek-v4-pro timed out after 120000ms",
    rawModel: "deepseek-ai/deepseek-v4-pro",
    isTokenLimitBreach: false,
    allAccountsRateLimited: false,
    sets,
    log: logger as unknown as ComboLogger,
    tag: "COMBO",
    exhaustedLogLevel: "info",
  });

  assert.equal(providerExhausted, false);
  assert.equal(sets.exhaustedConnections.has("nvidia:conn-nvidia-primary"), true);
  assert.equal(sets.exhaustedProviders.has("nvidia"), false);
  assert.ok(logger.logs.some((l) => l.message.includes("nvidia connection conn-nvidia-primary error (524)")));
});

test("NVIDIA NIM synthetic 524 timeout without connectionId exhausts provider", () => {
  const sets = makeSets();
  const logger = makeLogger();
  const target = makeNvidiaTarget({ connectionId: null });

  const providerExhausted = applyComboTargetExhaustion(target, {
    result: { status: 524 },
    fallbackResult: { reason: "timeout" },
    errorText: "Model z-ai/glm-5.2 timed out",
    rawModel: "z-ai/glm-5.2",
    isTokenLimitBreach: false,
    allAccountsRateLimited: false,
    sets,
    log: logger as unknown as ComboLogger,
    tag: "COMBO",
    exhaustedLogLevel: "info",
  });

  assert.equal(providerExhausted, false);
  assert.equal(sets.exhaustedProviders.has("nvidia"), true);
});

// ---------------------------------------------------------------------------
// 2. Post-Tool Empty Stream Classification
// ---------------------------------------------------------------------------

test("NVIDIA NIM post-tool 0-token stream is detected as empty_streaming_content for model-level fallback", async () => {
  const silentLog = { warn: () => {} };
  const nvidiaPostToolStream = makeStreamingResponse([
    'data: {"id":"chatcmpl-nv1","object":"chat.completion.chunk","created":1700000000,"model":"z-ai/glm-5.2","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-nv1","object":"chat.completion.chunk","created":1700000000,"model":"z-ai/glm-5.2","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
    "data: [DONE]\n\n",
  ]);

  const quality = await validateResponseQuality(nvidiaPostToolStream, true, silentLog);

  assert.equal(quality.valid, false);
  assert.equal(quality.reason, "empty_streaming_content");
});

test("NVIDIA NIM post-tool 0-token stream quality failure does NOT trigger provider connection exhaustion", () => {
  const sets = makeSets();
  const logger = makeLogger();
  const target = makeNvidiaTarget();

  const providerExhausted = applyComboTargetExhaustion(target, {
    result: { status: 502 },
    fallbackResult: { reason: "quality_failure" },
    errorText: "Upstream response failed quality validation: empty_streaming_content",
    rawModel: "z-ai/glm-5.2",
    isTokenLimitBreach: false,
    allAccountsRateLimited: false,
    sets,
    log: logger as unknown as ComboLogger,
    tag: "COMBO",
    exhaustedLogLevel: "info",
  });

  assert.equal(providerExhausted, false);
  assert.equal(sets.exhaustedConnections.has("nvidia:conn-nvidia-primary"), false);
  assert.equal(sets.exhaustedProviders.has("nvidia"), false);
});

// ---------------------------------------------------------------------------
// 3. Valid Tool-Only Completion Preservation
// ---------------------------------------------------------------------------

test("NVIDIA NIM valid tool-only stream (tool_calls emitted, 0 text content) evaluates as valid: true", async () => {
  const silentLog = { warn: () => {} };
  const nvidiaToolStream = makeStreamingResponse([
    'data: {"id":"chatcmpl-nv2","object":"chat.completion.chunk","created":1700000000,"model":"deepseek-ai/deepseek-v4-pro","choices":[{"index":0,"delta":{"role":"assistant","tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"get_weather","arguments":"{\\"location\\":\\"San Francisco\\"}"}}]},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-nv2","object":"chat.completion.chunk","created":1700000000,"model":"deepseek-ai/deepseek-v4-pro","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}\n\n',
    "data: [DONE]\n\n",
  ]);

  const quality = await validateResponseQuality(nvidiaToolStream, true, silentLog);

  assert.equal(quality.valid, true);
  assert.ok(quality.clonedResponse instanceof Response);
});

// ---------------------------------------------------------------------------
// 4. Upstream Errors & Provider Outage Protection
// ---------------------------------------------------------------------------

test("NVIDIA NIM upstream 503 error retains provider-wide outage protection", () => {
  const sets = makeSets();
  const logger = makeLogger();
  const target = makeNvidiaTarget();

  const providerExhausted = applyComboTargetExhaustion(target, {
    result: { status: 503 },
    fallbackResult: { reason: "server_error" },
    errorText: "503 Service Unavailable",
    rawModel: "nvidia/nemotron-3-super-120b-a12b",
    isTokenLimitBreach: false,
    allAccountsRateLimited: false,
    sets,
    log: logger as unknown as ComboLogger,
    tag: "COMBO",
    exhaustedLogLevel: "info",
  });

  assert.equal(providerExhausted, false);
  assert.equal(sets.exhaustedConnections.has("nvidia:conn-nvidia-primary"), true);
});

// ---------------------------------------------------------------------------
// 5. NVIDIA Model/Account Identifiers & Diagnostics
// ---------------------------------------------------------------------------

test("NVIDIA NIM model and connection identifiers are correctly preserved in structured target state", () => {
  const target = makeNvidiaTarget({
    modelStr: "nvidia/nemotron-3-super-120b-a12b",
    connectionId: "conn-nvidia-secondary",
    label: "Secondary Account",
  });

  assert.equal(target.provider, "nvidia");
  assert.equal(target.modelStr, "nvidia/nemotron-3-super-120b-a12b");
  assert.equal(target.connectionId, "conn-nvidia-secondary");
  assert.equal(target.label, "Secondary Account");
});

// ---------------------------------------------------------------------------
// 6. Production Function Classification Boundary (isEmptyContentFailure & Matrix)
// ---------------------------------------------------------------------------

test("isEmptyContentFailure production classification boundary correctly identifies empty content under 502", () => {
  // Status 502 with empty_streaming_content / empty content patterns must be classified as model-level empty content failure
  assert.equal(isEmptyContentFailure(502, "Upstream response failed quality validation: empty_streaming_content"), true);
  assert.equal(isEmptyContentFailure(502, "empty_content"), true);
  assert.equal(isEmptyContentFailure(502, "empty content"), true);
  assert.equal(isEmptyContentFailure(502, "HTTP 502: Empty Content received"), true);

  // Non-502 status with empty_streaming_content must NOT be classified as empty content failure (e.g. 500, 503, 524)
  assert.equal(isEmptyContentFailure(500, "empty_streaming_content"), false);
  assert.equal(isEmptyContentFailure(503, "empty_streaming_content"), false);
  assert.equal(isEmptyContentFailure(524, "empty_streaming_content"), false);

  // Status 502 with unrelated error text must NOT be classified as empty content failure
  assert.equal(isEmptyContentFailure(502, "Bad Gateway: Upstream connection reset"), false);
  assert.equal(isEmptyContentFailure(502, "repetition_detected"), false);
});

test("Classification boundary matrix handles empty_streaming_content, synthetic 524, valid tool-only, and upstream 5xx correctly", async () => {
  // Boundary 1: empty_streaming_content (502) -> model-level quality failure, no connection exhaustion
  assert.equal(isEmptyContentFailure(502, "Upstream response failed quality validation: empty_streaming_content"), true);

  // Boundary 2: Synthetic 524 -> connection-level failure in targetExhaustion
  const sets524 = makeSets();
  const logger524 = makeLogger();
  const target524 = makeNvidiaTarget();
  applyComboTargetExhaustion(target524, {
    result: { status: 524 },
    fallbackResult: { reason: "timeout" },
    errorText: "Model deepseek-ai/deepseek-v4-pro timed out after 120000ms",
    rawModel: "deepseek-ai/deepseek-v4-pro",
    isTokenLimitBreach: false,
    allAccountsRateLimited: false,
    sets: sets524,
    log: logger524 as unknown as ComboLogger,
    tag: "COMBO",
    exhaustedLogLevel: "info",
  });
  assert.equal(sets524.exhaustedConnections.has("nvidia:conn-nvidia-primary"), true);

  // Boundary 3: Valid Tool-Only -> validateResponseQuality returns valid: true
  const toolStream = makeStreamingResponse([
    'data: {"id":"chatcmpl-tool","object":"chat.completion.chunk","created":1700000000,"model":"deepseek-ai/deepseek-v4-pro","choices":[{"index":0,"delta":{"role":"assistant","tool_calls":[{"index":0,"id":"c1","type":"function","function":{"name":"f1","arguments":"{}"}}]},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-tool","object":"chat.completion.chunk","created":1700000000,"model":"deepseek-ai/deepseek-v4-pro","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}\n\n',
    "data: [DONE]\n\n",
  ]);
  const toolQuality = await validateResponseQuality(toolStream, true, { warn: () => {} });
  assert.equal(toolQuality.valid, true);

  // Boundary 4: Upstream 5xx (500/503) -> connection-level failure in targetExhaustion
  const sets503 = makeSets();
  const logger503 = makeLogger();
  const target503 = makeNvidiaTarget();
  applyComboTargetExhaustion(target503, {
    result: { status: 503 },
    fallbackResult: { reason: "server_error" },
    errorText: "503 Service Unavailable",
    rawModel: "nvidia/nemotron-3-super-120b-a12b",
    isTokenLimitBreach: false,
    allAccountsRateLimited: false,
    sets: sets503,
    log: logger503 as unknown as ComboLogger,
    tag: "COMBO",
    exhaustedLogLevel: "info",
  });
  assert.equal(sets503.exhaustedConnections.has("nvidia:conn-nvidia-primary"), true);
});
