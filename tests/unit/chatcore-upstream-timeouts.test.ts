import test from "node:test";
import assert from "node:assert/strict";

import {
  createBodyTimeoutError,
  createUpstreamStartTimeoutError,
  createAbortError,
  computeBillableTokens,
  getExecutorTimeoutMs,
  normalizeExecutorResult,
  resolveUpstreamTimeoutMs,
} from "../../open-sse/handlers/chatCore/upstreamTimeouts.ts";
import { FETCH_TIMEOUT_MS } from "../../open-sse/config/constants.ts";
import { MAX_TIMER_TIMEOUT_MS } from "../../src/shared/utils/runtimeTimeouts.ts";

test("error factories set name and message", () => {
  const body = createBodyTimeoutError(1234);
  assert.equal(body.name, "BodyTimeoutError");
  assert.match(body.message, /1234ms/);

  const start = createUpstreamStartTimeoutError(500, "openai", "gpt-4o");
  assert.equal(start.name, "TimeoutError");
  assert.match(start.message, /openai\/gpt-4o/);

  const ctrl = new AbortController();
  ctrl.abort("nope");
  const ab = createAbortError(ctrl.signal);
  assert.equal(ab.name, "AbortError");
});

test("computeBillableTokens sums input+output+reasoning (no cache double-count)", () => {
  const total = computeBillableTokens({
    prompt_tokens: 10,
    completion_tokens: 5,
    reasoning_tokens: 2,
  });
  assert.equal(total, 17);
});

test("getExecutorTimeoutMs floors valid values and falls back to default", () => {
  assert.equal(getExecutorTimeoutMs({ getTimeoutMs: () => 1234.9 }), 1234);
  assert.equal(getExecutorTimeoutMs({ getTimeoutMs: () => NaN }), getExecutorTimeoutMs(null));
  assert.ok(Number.isFinite(getExecutorTimeoutMs(null)));
});

test("normalizeExecutorResult wraps bare Response and passes through rich result", () => {
  const r = new Response("x");
  const wrapped = normalizeExecutorResult(r);
  assert.equal(wrapped.response, r);
  assert.equal(wrapped.url, "");
  const rich = normalizeExecutorResult({ response: r, url: "u", headers: { a: "b" } });
  assert.equal(rich.url, "u");
  assert.equal(rich.headers.a, "b");
});

test("resolveUpstreamTimeoutMs respects strict precedence: model > provider > combo > global > default", () => {
  // Model beats all lower levels
  assert.equal(
    resolveUpstreamTimeoutMs({
      modelTimeoutMs: 5000,
      providerTimeoutMs: 10000,
      comboTimeoutMs: 15000,
      globalTimeoutMs: 20000,
      defaultTimeoutMs: 30000,
    }),
    5000
  );

  // Provider beats combo, global, default
  assert.equal(
    resolveUpstreamTimeoutMs({
      modelTimeoutMs: undefined,
      providerTimeoutMs: 10000,
      comboTimeoutMs: 15000,
      globalTimeoutMs: 20000,
      defaultTimeoutMs: 30000,
    }),
    10000
  );

  // Combo beats global, default
  assert.equal(
    resolveUpstreamTimeoutMs({
      modelTimeoutMs: null,
      providerTimeoutMs: 0,
      comboTimeoutMs: 15000,
      globalTimeoutMs: 20000,
      defaultTimeoutMs: 30000,
    }),
    15000
  );

  // Global beats default
  assert.equal(
    resolveUpstreamTimeoutMs({
      modelTimeoutMs: -1,
      providerTimeoutMs: NaN,
      comboTimeoutMs: 0,
      globalTimeoutMs: 20000,
      defaultTimeoutMs: 30000,
    }),
    20000
  );

  // Default is returned when higher levels are missing or invalid
  assert.equal(
    resolveUpstreamTimeoutMs({
      modelTimeoutMs: 0,
      providerTimeoutMs: -500,
      comboTimeoutMs: NaN,
      globalTimeoutMs: null,
      defaultTimeoutMs: 30000,
    }),
    30000
  );

  // Fallback to FETCH_TIMEOUT_MS when defaultTimeoutMs is omitted
  assert.equal(
    resolveUpstreamTimeoutMs({
      modelTimeoutMs: 0,
      providerTimeoutMs: 0,
    }),
    FETCH_TIMEOUT_MS
  );
});

test("resolveUpstreamTimeoutMs clamps values to MAX_TIMER_TIMEOUT_MS", () => {
  const hugeValue = MAX_TIMER_TIMEOUT_MS + 100000;
  assert.equal(
    resolveUpstreamTimeoutMs({
      modelTimeoutMs: hugeValue,
    }),
    MAX_TIMER_TIMEOUT_MS
  );
});
