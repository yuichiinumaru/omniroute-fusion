import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  resolveUpstreamTimeoutMs,
  getExecutorTimeoutMs,
} from "../../open-sse/handlers/chatCore/upstreamTimeouts.ts";
import { resolveStreamReadinessTimeout } from "../../open-sse/utils/streamReadinessPolicy.ts";
import { FETCH_TIMEOUT_MS, STREAM_IDLE_TIMEOUT_MS } from "../../open-sse/config/constants.ts";
import { MAX_TIMER_TIMEOUT_MS } from "../../src/shared/utils/runtimeTimeouts.ts";

const chatCoreSource = fs.readFileSync(
  path.resolve(process.cwd(), "open-sse/handlers/chatCore.ts"),
  "utf8"
);

test("resolveUpstreamTimeoutMs model override beats provider, combo, global, and default", () => {
  const result = resolveUpstreamTimeoutMs({
    modelTimeoutMs: 12000,
    providerTimeoutMs: 30000,
    comboTimeoutMs: 45000,
    globalTimeoutMs: 60000,
    defaultTimeoutMs: 120000,
  });
  assert.equal(result, 12000);
});

test("resolveUpstreamTimeoutMs provider override beats combo, global, and default when model is unset", () => {
  const result = resolveUpstreamTimeoutMs({
    modelTimeoutMs: null,
    providerTimeoutMs: 25000,
    comboTimeoutMs: 45000,
    globalTimeoutMs: 60000,
    defaultTimeoutMs: 120000,
  });
  assert.equal(result, 25000);
});

test("resolveUpstreamTimeoutMs combo override beats global and default when model and provider are unset", () => {
  const result = resolveUpstreamTimeoutMs({
    modelTimeoutMs: undefined,
    providerTimeoutMs: undefined,
    comboTimeoutMs: 35000,
    globalTimeoutMs: 60000,
    defaultTimeoutMs: 120000,
  });
  assert.equal(result, 35000);
});

test("resolveUpstreamTimeoutMs global override beats default when higher levels are unset", () => {
  const result = resolveUpstreamTimeoutMs({
    modelTimeoutMs: 0,
    providerTimeoutMs: -100,
    comboTimeoutMs: NaN,
    globalTimeoutMs: 50000,
    defaultTimeoutMs: 120000,
  });
  assert.equal(result, 50000);
});

test("getExecutorTimeoutMs integrates options with executor.getTimeoutMs()", () => {
  const dummyExecutor = {
    getTimeoutMs: () => 60000,
  };

  // Model override in options beats executor.getTimeoutMs()
  assert.equal(
    getExecutorTimeoutMs(dummyExecutor, { modelTimeoutMs: 15000 }),
    15000
  );

  // When model is unset, providerTimeoutMs in options (or executor.getTimeoutMs()) is used
  assert.equal(
    getExecutorTimeoutMs(dummyExecutor, { comboTimeoutMs: 80000 }),
    60000
  );
});

test("chatCore timeout wiring uses consolidated settings, not an undefined requestOptions", () => {
  assert.doesNotMatch(chatCoreSource, /requestOptions/);
  assert.match(chatCoreSource, /globalTimeoutMs:\s*settings\?\.globalTimeoutMs/);
});

test("stream-idle and readiness timeout semantics are preserved independently", () => {
  // STREAM_IDLE_TIMEOUT_MS remains separate concern
  assert.ok(STREAM_IDLE_TIMEOUT_MS > 0);

  // Stream readiness policy for Codex GPT-5.5 high-reasoning is preserved
  const readiness = resolveStreamReadinessTimeout({
    baseTimeoutMs: 80_000,
    provider: "codex",
    model: "gpt-5.5-high",
    body: { messages: [{ role: "user", content: "hi" }] },
  });
  assert.ok(readiness.timeoutMs >= 110_000);
  assert.ok(readiness.reasons.includes("codex_gpt_5_5_high_reasoning"));
});
