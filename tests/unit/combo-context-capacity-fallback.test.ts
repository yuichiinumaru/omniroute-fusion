/**
 * Task 0179 — Context-capacity 400s must fail soft in combos.
 *
 * The incident message is:
 *   "This model configuration accepts at most 202749 combined input and output tokens.
 *    However, your request has 157455 input tokens and asks for 48000 output tokens
 *    (205455 tokens total). Please reduce the input length or requested output length."
 *
 * These are model-specific capacity limits, not malformed client payloads, so a
 * combo MUST continue to the next eligible target. Generic terminal 400s must
 * still stop the combo per Task 0157.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  checkFallbackError,
  clearAllModelLockouts,
  getProvidersInCooldown,
} from "../../open-sse/services/accountFallback.ts";
import { clearCooldownState } from "../../open-sse/services/providerCooldownTracker.ts";
import { resetAllCircuitBreakers } from "../../src/shared/utils/circuitBreaker.ts";
import { handleComboChat } from "../../open-sse/services/combo.ts";

type HandleComboOptions = Parameters<typeof handleComboChat>[0];
type ComboConfig = HandleComboOptions["combo"];
type ComboLogger = HandleComboOptions["log"];

const INCIDENT = [
  "This model configuration accepts at most 202749 combined input and output tokens.",
  "However, your request has 157455 input tokens and asks for 48000 output tokens",
  "(205455 tokens total). Please reduce the input length or requested output length.",
].join("\n");

function setupTestEnv() {
  clearAllModelLockouts();
  clearCooldownState();
  resetAllCircuitBreakers();
}

const nullLog: ComboLogger = {
  info() {},
  warn() {},
  error() {},
  debug() {},
};

function capacity400(): Response {
  return new Response(JSON.stringify({ error: { message: INCIDENT } }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function okResponse(): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { role: "assistant", content: "Recovered" } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. checkFallbackError classifies capacity 400 as fallback-safe, zero cooldown
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 checkFallbackError treats capacity-exceeded 400 as fallback-worthy MODEL_CAPACITY", () => {
  const res = checkFallbackError(400, INCIDENT, 0, null, "any-provider", null, null, {});
  assert.equal(res.shouldFallback, true, "capacity 400 must be fallback-worthy");
  assert.equal(res.cooldownMs, 0, "capacity 400 must have zero cooldown");
  assert.equal(res.reason, "model_capacity", "reason must be model_capacity");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Priority — capacity failure on A → B succeeds → status 200, both called
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 Priority: capacity 400 on A falls through to B", async () => {
  setupTestEnv();

  const calls: string[] = [];
  const combo: ComboConfig = {
    name: "0179-priority-capacity",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [
      { provider: "p1", model: "p1/a", connectionId: "c1" },
      { provider: "p2", model: "p2/b", connectionId: "c2" },
    ],
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo,
    handleSingleModel: async (_: Record<string, unknown>, m: string) => {
      calls.push(m);
      if (m === "p1/a") return capacity400();
      return okResponse();
    },
    isModelAvailable: async () => true,
    log: nullLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 1 } },
    relayOptions: null,
    allCombos: null,
  });

  assert.equal(res.status, 200, "capacity 400 must fall through — caller gets B's 200");
  assert.deepEqual(calls, ["p1/a", "p2/b"], "both models must be attempted");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Round-robin — capacity failure on A → B succeeds → status 200, both called
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 Round-robin: capacity 400 on A falls through to B", async () => {
  setupTestEnv();

  const calls: string[] = [];
  const combo: ComboConfig = {
    name: "0179-rr-capacity",
    strategy: "round-robin",
    config: { maxRetries: 0, retryDelayMs: 1, concurrencyPerModel: 1, queueTimeoutMs: 5 },
    models: [
      { provider: "p1", model: "p1/rr-a", connectionId: "c-a" },
      { provider: "p2", model: "p2/rr-b", connectionId: "c-b" },
    ],
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo,
    handleSingleModel: async (_: Record<string, unknown>, m: string) => {
      calls.push(m);
      if (m === "p1/rr-a") return capacity400();
      return okResponse();
    },
    isModelAvailable: async () => true,
    log: nullLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 1 } },
    relayOptions: null,
    allCombos: null,
  });

  assert.equal(res.status, 200, "RR capacity 400 must fall through — caller gets B's 200");
  assert.deepEqual(calls, ["p1/rr-a", "p2/rr-b"], "both RR models must be attempted");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Runtime-unit execute mode — capacity failure on unit A → unit B succeeds
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 Runtime-unit execute mode: capacity 400 on unit A falls through to unit B", async () => {
  setupTestEnv();

  const calls: string[] = [];
  const outer: ComboConfig = {
    name: "0179-runtime-unit-capacity",
    strategy: "priority",
    models: [
      { kind: "model", provider: "p1", model: "p1/unit-a", connectionId: "c1", executionKey: "k1", stepId: "s1" },
      { kind: "model", provider: "p2", model: "p2/unit-b", connectionId: "c2", executionKey: "k2", stepId: "s2" },
    ],
    config: { nestedComboMode: "execute", maxRetries: 0, retryDelayMs: 0 },
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: outer,
    handleSingleModel: async (_: Record<string, unknown>, m: string) => {
      calls.push(m);
      if (m === "p1/unit-a") return capacity400();
      return okResponse();
    },
    isModelAvailable: async () => true,
    log: nullLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 0 } },
    relayOptions: null,
    allCombos: [outer],
  });

  assert.equal(res.status, 200, "runtime-unit capacity 400 must fall through — caller gets unit B's 200");
  assert.deepEqual(calls, ["p1/unit-a", "p2/unit-b"], "both runtime units must be attempted");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Generic terminal 400 still stops the combo (Task 0157 contract preserved)
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 Priority: generic terminal 400 still stops the combo at target 1", async () => {
  setupTestEnv();

  const calls: string[] = [];
  const combo: ComboConfig = {
    name: "0179-priority-terminal",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [
      { provider: "p1", model: "p1/x", connectionId: "c1" },
      { provider: "p2", model: "p2/y", connectionId: "c2" },
    ],
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo,
    handleSingleModel: async (_: Record<string, unknown>, m: string) => {
      calls.push(m);
      return new Response(
        JSON.stringify({ error: { message: "invalid client payload" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    },
    isModelAvailable: async () => true,
    log: nullLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 1 } },
    relayOptions: null,
    allCombos: null,
  });

  assert.equal(res.status, 400, "generic terminal 400 must surface to caller");
  assert.equal(calls.length, 1, "generic terminal 400 must NOT trigger fallback");
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. All-candidates capacity failure → bounded sanitized final error
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 All-candidates capacity failure returns sanitized aggregate 400", async () => {
  setupTestEnv();

  const combo: ComboConfig = {
    name: "0179-all-fail-capacity",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [
      { provider: "p1", model: "p1/m1", connectionId: "c1" },
      { provider: "p2", model: "p2/m2", connectionId: "c2" },
    ],
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo,
    handleSingleModel: async () => capacity400(),
    isModelAvailable: async () => true,
    log: nullLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 1 } },
    relayOptions: null,
    allCombos: null,
  });

  assert.equal(res.status, 400, "aggregate capacity failure must return 400");
  const body = (await res.json()) as { error?: { message?: string } };
  assert.ok(body.error, "aggregate body must contain error object");
  assert.equal(typeof body.error.message, "string", "message must be string");
  assert.ok((body.error.message ?? "").length <= 600, "aggregate message must be bounded");
  assert.doesNotMatch(body.error.message ?? "", /\{"detail"/, "must not leak raw JSON detail");
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Capacity failure does NOT trip the provider-wide circuit breaker
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 Capacity 400 does not trip the provider circuit breaker", async () => {
  setupTestEnv();

  const combo: ComboConfig = {
    name: "0179-no-breaker",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [
      { provider: "shared", model: "shared/a", connectionId: "c1" },
      { provider: "shared", model: "shared/b", connectionId: "c2" },
    ],
  };

  await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo,
    handleSingleModel: async (_: Record<string, unknown>, m: string) => {
      if (m === "shared/a") return capacity400();
      return okResponse();
    },
    isModelAvailable: async () => true,
    log: nullLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 1 } },
    relayOptions: null,
    allCombos: null,
  });

  const inCooldown = getProvidersInCooldown();
  assert.equal(
    inCooldown.some((e) => e.provider === "shared"),
    false,
    "capacity 400 must not trip the provider breaker"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Capacity failure does NOT create a durable model lockout
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 Capacity 400 does not create a model lockout", async () => {
  setupTestEnv();

  const combo: ComboConfig = {
    name: "0179-no-lockout",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [{ provider: "p1", model: "p1/a", connectionId: "c1" }],
  };

  await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo,
    handleSingleModel: async () => capacity400(),
    isModelAvailable: async () => true,
    log: nullLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 1 } },
    relayOptions: null,
    allCombos: null,
  });

  const { getAllModelLockouts } = await import("../../open-sse/services/accountFallback.ts");
  const locks = getAllModelLockouts();
  assert.equal(locks.some((l) => l.model === "p1/a"), false, "capacity 400 must not create a model lockout");
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Same-provider next candidate is still eligible after a capacity 400
//    (proves 400 did not poison exhaustedProviders/exhaustedConnections)
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 Same-provider next candidate is tried after capacity 400", async () => {
  setupTestEnv();

  const calls: string[] = [];
  const combo: ComboConfig = {
    name: "0179-same-provider",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [
      { provider: "sp1", model: "sp1/a", connectionId: "sp1-c1" },
      { provider: "sp1", model: "sp1/b", connectionId: "sp1-c2" },
    ],
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo,
    handleSingleModel: async (_: Record<string, unknown>, m: string) => {
      calls.push(m);
      if (m === "sp1/a") return capacity400();
      return okResponse();
    },
    isModelAvailable: async () => true,
    log: nullLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 1 } },
    relayOptions: null,
    allCombos: null,
  });

  assert.equal(res.status, 200, "same-provider fallback must succeed");
  assert.deepEqual(calls, ["sp1/a", "sp1/b"], "same-provider model b must be tried");
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Candidate failure log identifies provider/model/status/fallback reason
//     without recording the full prompt or sensitive headers
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 Candidate capacity failure logs provider/model/status/reason only", async () => {
  setupTestEnv();

  const logEntries: string[] = [];
  const captureLog: ComboLogger = {
    info: (_tag: string, msg: string) => { logEntries.push(`[info] ${msg}`); },
    warn: (_tag: string, msg: string) => { logEntries.push(`[warn] ${msg}`); },
    error: (_tag: string, msg: string) => { logEntries.push(`[error] ${msg}`); },
    debug: (_tag: string, msg: string) => { logEntries.push(`[debug] ${msg}`); },
  };

  const combo: ComboConfig = {
    name: "0179-log-capacity",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [{ provider: "p1", model: "p1/a", connectionId: "c1" }],
  };

  await handleComboChat({
    body: { messages: [{ role: "user", content: "SECRET_PROMPT_TOKEN" }] },
    combo,
    handleSingleModel: async () => capacity400(),
    isModelAvailable: async () => true,
    log: captureLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 1 } },
    relayOptions: null,
    allCombos: null,
  });

  const failureLog = logEntries.find((e) => e.includes("p1/a") && e.includes("400"));
  assert.ok(failureLog, `failure log must mention model and status; got: ${logEntries.join("\n")}`);
  assert.ok(
    !logEntries.some((e) => e.includes("SECRET_PROMPT_TOKEN")),
    "full prompt must not leak into logs"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Runtime-unit execute mode — generic terminal 400 stops at target 1 (no fallback)
// ─────────────────────────────────────────────────────────────────────────────
test("#0179 Runtime-unit execute mode: generic terminal 400 stops at target 1 (no fallback)", async () => {
  setupTestEnv();

  const calls: string[] = [];
  const childCombo: ComboConfig = {
    name: "child-combo-terminal",
    strategy: "priority",
    models: [
      { provider: "p1", model: "p1/unit-x", connectionId: "c1" },
      { provider: "p2", model: "p2/unit-y", connectionId: "c2" },
    ],
    config: { maxRetries: 0, retryDelayMs: 0 },
  };

  const outerCombo: ComboConfig = {
    name: "0179-runtime-unit-terminal",
    strategy: "priority",
    models: [
      { kind: "combo-ref", comboName: "child-combo-terminal" },
      { provider: "p3", model: "p3/unit-z", connectionId: "c3" },
    ],
    config: { nestedComboMode: "execute", maxRetries: 0, retryDelayMs: 0 },
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: outerCombo,
    handleSingleModel: async (_: Record<string, unknown>, m: string) => {
      calls.push(m);
      if (m === "p1/unit-x") {
        return new Response(
          JSON.stringify({ error: { message: "invalid client payload" } }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      return okResponse();
    },
    isModelAvailable: async () => true,
    log: nullLog,
    settings: { comboDefaults: { concurrencyPerModel: 1, queueTimeoutMs: 5, maxRetries: 0, retryDelayMs: 0 } },
    relayOptions: null,
    allCombos: [outerCombo, childCombo],
  });

  assert.equal(res.status, 400, "runtime-unit generic terminal 400 must surface to caller as 400");
  assert.deepEqual(calls, ["p1/unit-x"], "runtime-unit generic terminal 400 must NOT trigger fallback to target 2");
});
