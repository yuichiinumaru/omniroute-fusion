/**
 * Task 0043 — Combo / Auto-Combo Resilience Wiring (F-04-001, F-03-001…004, W2-001/002)
 *
 * Covers:
 * - Soft-failure {success:false,status:502} does NOT close HALF_OPEN as success
 * - RR records provider breaker failures + pre-skips OPEN/model-lock before semaphore
 * - HALF_OPEN probe budget via canExecute / tryReserveExecution
 * - Runtime-unit exhaustedConnections uses provider:connectionId (F-03-002)
 * - Auto-combo empty-pool never re-admits OPEN providers
 * - Auto-combo re-evaluate uses live breaker state + incident mode
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-0043-resilience-"));
const ORIGINAL_DATA_DIR = process.env.DATA_DIR;
process.env.DATA_DIR = TEST_DATA_DIR;

const circuitBreaker = await import("../../src/shared/utils/circuitBreaker.ts");
const softChatOutcome = await import("../../src/shared/utils/softChatBreakerOutcome.ts");
const accountFallback = await import("../../open-sse/services/accountFallback.ts");
const comboPredicates = await import("../../open-sse/services/combo/comboPredicates.ts");
const autoEngine = await import("../../open-sse/services/autoCombo/engine.ts");
const selfHealing = await import("../../open-sse/services/autoCombo/selfHealing.ts");
const runtimeUnits = await import("../../open-sse/services/combo/runtimeUnits.ts");
const comboService = await import("../../open-sse/services/combo.ts");
const chatHelpers = await import("../../src/sse/handlers/chatHelpers.ts");
const dbCore = await import("../../src/lib/db/core.ts");

const {
  CircuitBreaker,
  getCircuitBreaker,
  resetAllCircuitBreakers,
  STATE,
} = circuitBreaker;
const {
  classifySoftChatBreakerOutcome,
  PROVIDER_BREAKER_FAILURE_STATUSES,
} = softChatOutcome;
const {
  recordProviderFailure,
  clearProviderFailure,
  isModelLocked,
  recordModelLockoutFailure,
  clearAllModelLockouts,
} = accountFallback;
const {
  isProviderCircuitBlocking,
  shouldRecordProviderBreakerFailure,
  getExhaustedTargetSkipReason,
} = comboPredicates;
const { selectProvider } = autoEngine;
const { getSelfHealingManager } = selfHealing;
const { executeRuntimeUnitCombo } = runtimeUnits;
const { handleComboChat } = comboService;
const { executeChatWithBreaker } = chatHelpers;

const healer = getSelfHealingManager();

function resetHealer() {
  healer.exclusions.clear();
  healer.incidentMode = false;
}

function silentLog() {
  return {
    info() {},
    warn() {},
    debug() {},
    error() {},
  };
}

function modelUnit(args: {
  modelStr: string;
  provider: string;
  connectionId: string;
  stepId: string;
  executionKey: string;
}) {
  return {
    kind: "model" as const,
    stepId: args.stepId,
    executionKey: args.executionKey,
    modelStr: args.modelStr,
    provider: args.provider,
    providerId: null,
    connectionId: args.connectionId,
    weight: 1,
    label: null,
  };
}

function okJson(content = "ok") {
  return Response.json({ choices: [{ message: { role: "assistant", content } }] });
}

function errJson(status: number, message: string) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function baseNesting(comboName = "nested-root") {
  return {
    depth: 0,
    maxDepth: 3,
    visitedComboNames: [comboName],
    rootComboName: comboName,
    attemptBudget: { count: 0, limit: 400 },
  };
}

test.beforeEach(() => {
  resetAllCircuitBreakers();
  resetHealer();
  clearAllModelLockouts();
});

test.after(() => {
  resetAllCircuitBreakers();
  resetHealer();
  clearAllModelLockouts();
  try {
    dbCore.resetDbInstance();
  } catch {
    /* ignore */
  }
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  if (ORIGINAL_DATA_DIR === undefined) {
    delete process.env.DATA_DIR;
  } else {
    process.env.DATA_DIR = ORIGINAL_DATA_DIR;
  }
});

// ─── F-04-001: soft-failure must not heal HALF_OPEN ─────────────────────────

test("F-04-001: tryReserveExecution + soft-fail does not close HALF_OPEN as success", () => {
  const cb = new CircuitBreaker("soft-fail-probe", {
    failureThreshold: 1,
    resetTimeout: 10,
    halfOpenRequests: 1,
  });
  // Force OPEN then expire into HALF_OPEN
  cb._onFailure();
  assert.equal(cb.getStatus().state, STATE.OPEN);
  cb.lastFailureTime = Date.now() - 20;
  assert.equal(cb.canExecute(), true, "timeout should refresh to HALF_OPEN");
  assert.equal(cb.getStatus().state, STATE.HALF_OPEN);

  assert.equal(cb.tryReserveExecution(), true, "probe slot reserved");
  assert.equal(cb.canExecute(), false, "probe budget exhausted after reserve");
  assert.equal(cb.getStatus().state, STATE.HALF_OPEN, "still HALF_OPEN until outcome");

  // Soft-failure path: caller must NOT call _onSuccess (execute used to).
  // Without _onSuccess the breaker stays HALF_OPEN (or re-opens via _onFailure).
  assert.notEqual(cb.getStatus().state, STATE.CLOSED);

  cb._onFailure(); // soft 502 classified as probe fail
  assert.equal(cb.getStatus().state, STATE.OPEN, "probe soft-fail re-opens breaker");
});

test("F-04-001: breaker.execute still treats throw-free return as success (legacy API)", async () => {
  const cb = new CircuitBreaker("execute-legacy", {
    failureThreshold: 1,
    resetTimeout: 10,
    halfOpenRequests: 1,
  });
  cb._onFailure();
  cb.lastFailureTime = Date.now() - 20;
  assert.equal(cb.getStatus().state, STATE.HALF_OPEN);

  // execute() keeps success-on-return for non-chat callers; chat uses tryReserve + post-result.
  const soft = await cb.execute(async () => ({ success: false, status: 502 }));
  assert.equal(soft.status, 502);
  assert.equal(cb.getStatus().state, STATE.CLOSED, "legacy execute still closes on non-throw");
});

test("F-04-001: classifySoftChatBreakerOutcome matrix (SSoT for chat.ts)", () => {
  // HALF_OPEN soft 502 always fails probe — combo or not, even when accounts remain.
  assert.equal(
    classifySoftChatBreakerOutcome({
      success: false,
      status: 502,
      breakerState: "HALF_OPEN",
      isCombo: true,
      willRetryAnotherAccount: true,
    }),
    "failure"
  );
  assert.equal(
    classifySoftChatBreakerOutcome({
      success: false,
      status: 502,
      breakerState: "HALF_OPEN",
      isCombo: false,
      willRetryAnotherAccount: false,
    }),
    "failure"
  );
  // Soft 502 must never classify as success.
  assert.notEqual(
    classifySoftChatBreakerOutcome({
      success: false,
      status: 502,
      breakerState: "HALF_OPEN",
      isCombo: false,
      willRetryAnotherAccount: false,
    }),
    "success"
  );
  // Real success heals.
  assert.equal(
    classifySoftChatBreakerOutcome({
      success: true,
      status: 200,
      breakerState: "HALF_OPEN",
      isCombo: false,
      willRetryAnotherAccount: false,
    }),
    "success"
  );
  // Terminal non-combo provider failure records; combo defers to recordProviderFailure.
  assert.equal(
    classifySoftChatBreakerOutcome({
      success: false,
      status: 502,
      breakerState: "CLOSED",
      isCombo: false,
      willRetryAnotherAccount: false,
    }),
    "failure"
  );
  assert.equal(
    classifySoftChatBreakerOutcome({
      success: false,
      status: 502,
      breakerState: "CLOSED",
      isCombo: true,
      willRetryAnotherAccount: false,
    }),
    "none"
  );
  // Account rotation (not HALF_OPEN) does not trip while more accounts remain.
  assert.equal(
    classifySoftChatBreakerOutcome({
      success: false,
      status: 502,
      breakerState: "CLOSED",
      isCombo: false,
      willRetryAnotherAccount: true,
    }),
    "none"
  );
  // HALF_OPEN + soft non-provider status still fails the probe (re-open) so a
  // burned tryReserve slot cannot leave halfOpenAllowed=0 stuck forever.
  assert.equal(
    classifySoftChatBreakerOutcome({
      success: false,
      status: 429,
      breakerState: "HALF_OPEN",
      isCombo: false,
      willRetryAnotherAccount: false,
    }),
    "failure"
  );
  // CLOSED + 429 must not trip provider breaker (account cooldown owns 429).
  assert.equal(
    classifySoftChatBreakerOutcome({
      success: false,
      status: 429,
      breakerState: "CLOSED",
      isCombo: false,
      willRetryAnotherAccount: false,
    }),
    "none"
  );
  assert.ok(PROVIDER_BREAKER_FAILURE_STATUSES.has(502));
  assert.equal(PROVIDER_BREAKER_FAILURE_STATUSES.has(429), false);
});

test("F-04-001: HALF_OPEN soft 429 re-opens after tryReserve (no stuck probe budget)", () => {
  const cb = new CircuitBreaker("soft-429-probe", {
    failureThreshold: 1,
    resetTimeout: 10,
    halfOpenRequests: 1,
  });
  cb._onFailure();
  cb.lastFailureTime = Date.now() - 20;
  assert.equal(cb.getStatus().state, STATE.HALF_OPEN);
  assert.equal(cb.tryReserveExecution(), true);
  assert.equal(cb.canExecute(), false);

  const outcome = classifySoftChatBreakerOutcome({
    success: false,
    status: 429,
    breakerState: cb.getStatus().state,
    isCombo: false,
    willRetryAnotherAccount: false,
  });
  assert.equal(outcome, "failure");
  cb._onFailure();
  assert.equal(cb.getStatus().state, STATE.OPEN, "probe soft-fail must re-open, not stick HALF_OPEN");
  // After OPEN timeout, lazy recovery can grant a fresh HALF_OPEN budget again.
  cb.lastFailureTime = Date.now() - 20;
  assert.equal(cb.canExecute(), true);
  assert.equal(cb.getStatus().state, STATE.HALF_OPEN);
});

test("F-04-001: executeChatWithBreaker does not close HALF_OPEN on soft 502 (real helper)", async () => {
  const provider = `chat-soft-${Date.now()}`;
  const breaker = getCircuitBreaker(provider, {
    failureThreshold: 1,
    resetTimeout: 60_000,
    halfOpenRequests: 1,
  });
  breaker._onFailure();
  breaker.lastFailureTime = Date.now() - 61_000;
  assert.equal(breaker.getStatus().state, STATE.HALF_OPEN);

  const originalFetch = globalThis.fetch;
  // Soft upstream failure: non-throwing HTTP 502 so handleChatCore returns
  // { success:false } without throwing into breaker.execute success semantics.
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: "upstream bad gateway" } }), {
      status: 502,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  const credentials = {
    connectionId: "conn_soft_502",
    apiKey: "sk-soft-502",
    providerSpecificData: {},
  };

  try {
    const { result } = await executeChatWithBreaker({
      bypassCircuitBreaker: false,
      breaker,
      body: {
        model: `${provider}/soft-model`,
        messages: [{ role: "user", content: "ping" }],
        stream: false,
      },
      provider,
      model: "soft-model",
      refreshedCredentials: credentials,
      proxyInfo: null,
      log: console,
      clientRawRequest: null,
      credentials,
      apiKeyInfo: null,
      userAgent: "0043-test",
      comboName: null,
      comboStrategy: null,
      isCombo: false,
      extendedContext: false,
      comboStepId: null,
      comboExecutionKey: null,
    });

    assert.equal(result?.success, false, "soft fail must not be success");
    assert.equal(Number(result?.status), 502);
    // executeChatWithBreaker reserves probe but must NOT _onSuccess soft results.
    // State remains HALF_OPEN (or OPEN if throw path recorded) — never CLOSED.
    assert.notEqual(
      breaker.getStatus().state,
      STATE.CLOSED,
      "soft 502 must not heal HALF_OPEN via execute() success semantics"
    );

    // Apply the same pure classifier chat.ts uses for post-result (F-04-001 SSoT).
    const outcome = classifySoftChatBreakerOutcome({
      success: Boolean(result?.success),
      status: Number(result?.status),
      breakerState: breaker.getStatus().state,
      isCombo: false,
      willRetryAnotherAccount: false,
    });
    assert.equal(outcome, "failure", "soft 502 under HALF_OPEN must classify as failure");
    if (outcome === "failure") {
      breaker._onFailure();
    }
    assert.equal(breaker.getStatus().state, STATE.OPEN, "post-result soft-fail re-opens");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("F-04-001: chatHelpers gate path uses tryReserveExecution not breaker.execute wrap", () => {
  // Structural guard — re-wrapping soft results in execute() would re-open F-04-001.
  const src = fs.readFileSync(
    path.join(process.cwd(), "src/sse/handlers/chatHelpers.ts"),
    "utf8"
  );
  assert.match(src, /tryReserveExecution\(\)/);
  assert.match(src, /F-04-001/);
  // The soft-fail comment + gate-only path must remain (execute used to wrap chatFn).
  assert.match(src, /do NOT wrap soft-failure/i);
});

test("F-04-001: chat.ts wires classifySoftChatBreakerOutcome for soft outcomes", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src/sse/handlers/chat.ts"), "utf8");
  assert.match(src, /classifySoftChatBreakerOutcome/);
  assert.match(src, /softChatBreakerOutcome/);
  // Soft fail must not call _onSuccess; success path goes through classifier.
  assert.match(src, /softOutcome === "success"/);
  assert.match(src, /terminalSoftOutcome === "failure"/);
});

// ─── F-03-001 / recordProviderFailure HALF_OPEN ─────────────────────────────

test("F-03-001: recordProviderFailure records on HALF_OPEN even when probe budget is 0", () => {
  const provider = `rr-halfopen-${Date.now()}`;
  const breaker = getCircuitBreaker(provider, {
    failureThreshold: 1,
    resetTimeout: 60_000,
    halfOpenRequests: 1,
  });
  breaker._onFailure();
  breaker.lastFailureTime = Date.now() - 61_000;
  assert.equal(breaker.getStatus().state, STATE.HALF_OPEN);
  assert.equal(breaker.tryReserveExecution(), true);
  assert.equal(breaker.canExecute(), false);

  // Old bug: !canExecute() skipped recording → HALF_OPEN stuck forever.
  recordProviderFailure(provider, undefined, null, {
    failureThreshold: 1,
    resetTimeoutMs: 60_000,
  });
  assert.equal(getCircuitBreaker(provider).getStatus().state, STATE.OPEN);
  clearProviderFailure(provider);
});

test("F-03-001: shouldRecordProviderBreakerFailure is true for RR-style 502", () => {
  assert.equal(
    shouldRecordProviderBreakerFailure({
      isStreamReadinessFailure: false,
      status: 502,
      sameProviderNext: false,
      skipProviderBreaker: false,
    }),
    true
  );
});

// ─── F-03-003 / F-03-004: canExecute pre-gates ───────────────────────────────

test("F-03-003: isProviderCircuitBlocking is true when HALF_OPEN budget exhausted", () => {
  const provider = `block-half-${Date.now()}`;
  const breaker = getCircuitBreaker(provider, {
    failureThreshold: 1,
    resetTimeout: 10,
    halfOpenRequests: 1,
  });
  breaker._onFailure();
  breaker.lastFailureTime = Date.now() - 20;
  assert.equal(breaker.getStatus().state, STATE.HALF_OPEN);
  assert.equal(isProviderCircuitBlocking(provider), false, "probe still available");
  assert.equal(breaker.tryReserveExecution(), true);
  assert.equal(
    isProviderCircuitBlocking(provider),
    true,
    "HALF_OPEN with 0 slots must block (not just OPEN)"
  );
});

test("F-03-003: isProviderCircuitBlocking is true when OPEN", () => {
  const provider = `block-open-${Date.now()}`;
  const breaker = getCircuitBreaker(provider, {
    failureThreshold: 1,
    resetTimeout: 60_000,
  });
  breaker._onFailure();
  assert.equal(breaker.getStatus().state, STATE.OPEN);
  assert.equal(isProviderCircuitBlocking(provider), true);
});

test("F-03-004: model lockout is detectable for RR pre-skip", () => {
  const provider = `lock-rr-${Date.now()}`;
  const connectionId = "conn-lock-1";
  const model = "test-model";
  recordModelLockoutFailure(
    provider,
    connectionId,
    model,
    "rate_limit",
    429,
    60_000,
    null,
    { exactCooldownMs: 60_000 }
  );
  assert.equal(isModelLocked(provider, connectionId, model), true);
  assert.equal(isModelLocked(provider, connectionId, "other-model"), false);
});

// ─── F-03-W2-001 / F-03-W2-002: auto-combo ───────────────────────────────────

const baseWeights = {
  quota: 0.2,
  health: 0.2,
  cost: 0.15,
  latency: 0.15,
  taskFit: 0.2,
  stability: 0.1,
};

const baseConfig = {
  id: "auto-resilience",
  name: "Auto Resilience",
  type: "auto" as const,
  candidatePool: [] as string[],
  weights: baseWeights,
  explorationRate: 0,
};

test("F-03-W2-001: empty-pool does not re-admit OPEN providers", () => {
  assert.throws(
    () =>
      selectProvider(baseConfig, [
        {
          provider: "dead-a",
          model: "m1",
          quotaRemaining: 90,
          quotaTotal: 100,
          circuitBreakerState: "OPEN",
          costPer1MTokens: 1,
          p95LatencyMs: 100,
          latencyStdDev: 5,
          errorRate: 0.5,
        },
        {
          provider: "dead-b",
          model: "m2",
          quotaRemaining: 90,
          quotaTotal: 100,
          circuitBreakerState: "OPEN",
          costPer1MTokens: 1,
          p95LatencyMs: 100,
          latencyStdDev: 5,
          errorRate: 0.5,
        },
      ]),
    /no healthy candidates/i
  );
});

test("F-03-W2-001: candidatePool miss still admits CLOSED candidates", () => {
  const result = selectProvider(
    { ...baseConfig, candidatePool: ["missing-provider"] },
    [
      {
        provider: "openai",
        model: "gpt-4o",
        quotaRemaining: 80,
        quotaTotal: 100,
        circuitBreakerState: "CLOSED",
        costPer1MTokens: 8,
        p95LatencyMs: 400,
        latencyStdDev: 15,
        errorRate: 0.01,
      },
    ],
    "documentation"
  );
  assert.equal(result.provider, "openai");
});

test("F-03-W2-001: HALF_OPEN soft re-admission when only probes remain", () => {
  const result = selectProvider(baseConfig, [
    {
      provider: "open-provider",
      model: "m-open",
      quotaRemaining: 50,
      quotaTotal: 100,
      circuitBreakerState: "OPEN",
      costPer1MTokens: 1,
      p95LatencyMs: 50,
      latencyStdDev: 5,
      errorRate: 0.9,
    },
    {
      provider: "probe-provider",
      model: "m-probe",
      quotaRemaining: 50,
      quotaTotal: 100,
      circuitBreakerState: "HALF_OPEN",
      costPer1MTokens: 5,
      p95LatencyMs: 200,
      latencyStdDev: 10,
      errorRate: 0.2,
    },
  ]);
  assert.equal(result.provider, "probe-provider");
  assert.ok(result.excluded.includes("open-provider"));
});

test("F-03-W2-002: selectProvider updates incident mode from live OPEN majority", () => {
  resetHealer();
  const originalRandom = Math.random;
  Math.random = () => 0; // force exploitation path when exploration would otherwise fire
  try {
    const result = selectProvider(
      { ...baseConfig, explorationRate: 1 },
      [
        {
          provider: "healthy",
          model: "ok",
          quotaRemaining: 90,
          quotaTotal: 100,
          circuitBreakerState: "CLOSED",
          costPer1MTokens: 10,
          p95LatencyMs: 300,
          latencyStdDev: 10,
          errorRate: 0.01,
        },
        {
          provider: "open-1",
          model: "bad",
          quotaRemaining: 90,
          quotaTotal: 100,
          circuitBreakerState: "OPEN",
          costPer1MTokens: 1,
          p95LatencyMs: 50,
          latencyStdDev: 5,
          errorRate: 0.5,
        },
        {
          provider: "open-2",
          model: "bad2",
          quotaRemaining: 90,
          quotaTotal: 100,
          circuitBreakerState: "OPEN",
          costPer1MTokens: 1,
          p95LatencyMs: 50,
          latencyStdDev: 5,
          errorRate: 0.5,
        },
      ],
      "simple"
    );
    assert.equal(healer.isInIncidentMode(), true, "2/3 OPEN → incident mode");
    assert.equal(result.provider, "healthy");
    assert.equal(result.isExploration, false, "incident mode disables exploration");
  } finally {
    Math.random = originalRandom;
  }
});

test("F-03-W2-002: re-evaluate uses live breaker state not hardcoded CLOSED", () => {
  resetHealer();
  // Pre-exclude via low score path is hard; instead ensure OPEN candidate is excluded
  // in the second evaluate pass even if score is high.
  const result = selectProvider(baseConfig, [
    {
      provider: "closed-ok",
      model: "ok",
      quotaRemaining: 10,
      quotaTotal: 100,
      circuitBreakerState: "CLOSED",
      costPer1MTokens: 50,
      p95LatencyMs: 2000,
      latencyStdDev: 100,
      errorRate: 0.1,
    },
    {
      provider: "still-open",
      model: "cheap-fast",
      quotaRemaining: 100,
      quotaTotal: 100,
      circuitBreakerState: "OPEN",
      costPer1MTokens: 0.1,
      p95LatencyMs: 10,
      latencyStdDev: 1,
      errorRate: 0,
    },
  ]);
  assert.equal(result.provider, "closed-ok");
  assert.ok(result.excluded.includes("still-open"));
});

// ─── F-03-002: runtime-unit exhaustedConnections key format ─────────────────

test("F-03-002: getExhaustedTargetSkipReason matches provider:connectionId keys", () => {
  const exhaustedConnections = new Set(["openai:conn-shared"]);
  const exhaustedProviders = new Set<string>();
  const target = modelUnit({
    modelStr: "openai/gpt-secondary",
    provider: "openai",
    connectionId: "conn-shared",
    stepId: "s2",
    executionKey: "k2",
  });

  // Bare connectionId must NOT match (old runtimeUnits bug).
  assert.equal(
    exhaustedConnections.has(target.connectionId!),
    false,
    "writers use provider-scoped keys only"
  );
  assert.equal(exhaustedConnections.has("openai:conn-shared"), true);

  const reason = getExhaustedTargetSkipReason(target, exhaustedProviders, exhaustedConnections);
  assert.ok(reason, "shared helper must skip provider:conn keys");
  assert.match(String(reason), /connection/i);
});

test("F-03-002: executeRuntimeUnitCombo pre-skips same connection after connection-level 502", async () => {
  const provider = "openai";
  const connectionId = "conn-exh-1";
  const comboName = "runtime-exh";
  const calls: string[] = [];
  const logs: string[] = [];

  const units = [
    modelUnit({
      modelStr: "openai/first",
      provider,
      connectionId,
      stepId: "u1",
      executionKey: "e1",
    }),
    modelUnit({
      modelStr: "openai/second",
      provider,
      connectionId,
      stepId: "u2",
      executionKey: "e2",
    }),
  ];

  const combo = {
    name: comboName,
    strategy: "priority",
    models: units.map((u) => u.modelStr),
  };

  const nesting = baseNesting(comboName);
  const baseOptions = {
    body: { stream: false, messages: [{ role: "user", content: "x" }] },
    combo,
    handleSingleModel: async () => errJson(503, "should not recurse"),
    log: silentLog(),
    allCombos: [combo],
    nesting,
  };

  const result = await executeRuntimeUnitCombo({
    body: { stream: false, messages: [{ role: "user", content: "x" }] },
    combo,
    strategy: "priority",
    units,
    handleSingleModel: async (_body, modelStr) => {
      calls.push(modelStr);
      // First unit: connection-level 502 → marks exhaustedConnections as provider:conn
      if (modelStr === "openai/first") {
        return errJson(502, "upstream gateway error");
      }
      // Second unit must be pre-skipped; if reached, would "succeed" and hide the bug.
      return okJson(`unexpected-${modelStr}`);
    },
    isModelAvailable: async () => true,
    log: {
      info(_tag: string, msg: string) {
        logs.push(String(msg));
      },
      warn() {},
      debug() {},
      error() {},
    },
    config: { maxRetries: 0, retryDelayMs: 0 },
    settings: null,
    allCombos: [combo],
    signal: null,
    nesting,
    baseOptions,
    runCombo: async () => errJson(503, "no nested combo"),
  });

  assert.deepEqual(calls, ["openai/first"], "second same-connection unit must be pre-skipped");
  assert.ok(
    logs.some((m) => /connection/i.test(m) && /conn-exh-1|skip/i.test(m)),
    `expected connection skip log, got: ${logs.join(" | ")}`
  );
  assert.equal(result.response.status, 502, "last failed unit response preserved");
  assert.equal(result.unit, null);
});

// ─── F-03-001 / F-03-004: RR recordFailure + pre-skip before semaphore ───────

test("F-03-001: RR failure path records provider breaker via recordProviderFailure", async () => {
  const provider = `rr-fail-${Date.now()}`;
  const modelStr = `${provider}/m-rr`;
  // Pre-create so we can read failureCount before/after. configureProviderBreaker may
  // re-apply profile defaults (threshold often >1), so assert count increase not OPEN.
  const breaker = getCircuitBreaker(provider, {
    failureThreshold: 5,
    resetTimeout: 60_000,
  });
  const before = breaker.getStatus().failureCount;

  const result = await handleComboChat({
    body: { stream: false, messages: [{ role: "user", content: "rr-fail" }] },
    combo: {
      name: "rr-fail-combo",
      strategy: "round-robin",
      models: [modelStr],
      config: {
        maxRetries: 0,
        concurrencyPerModel: 1,
        queueTimeoutMs: 500,
        queueDepth: 1,
      },
    },
    handleSingleModel: async () => errJson(502, "rr upstream 502"),
    isModelAvailable: async () => true,
    log: silentLog(),
    settings: null,
    allCombos: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 502);
  const after = getCircuitBreaker(provider).getStatus().failureCount;
  assert.ok(
    after > before,
    `RR path must call recordProviderFailure on 502 (failureCount ${before} → ${after})`
  );
  clearProviderFailure(provider);
});

test("F-03-004: RR pre-skips OPEN provider before calling handleSingleModel (no semaphore work)", async () => {
  const provider = `rr-open-${Date.now()}`;
  const modelStr = `${provider}/m-blocked`;
  const healthyProvider = `rr-ok-${Date.now()}`;
  const healthyModel = `${healthyProvider}/m-ok`;

  const breaker = getCircuitBreaker(provider, {
    failureThreshold: 1,
    resetTimeout: 60_000,
  });
  breaker._onFailure();
  assert.equal(breaker.getStatus().state, STATE.OPEN);
  assert.equal(isProviderCircuitBlocking(provider), true);

  const calls: string[] = [];
  const logs: string[] = [];

  const result = await handleComboChat({
    body: { stream: false, messages: [{ role: "user", content: "rr-open" }] },
    combo: {
      name: "rr-open-combo",
      strategy: "round-robin",
      // OPEN provider first in rotation; healthy second must serve.
      models: [modelStr, healthyModel],
      config: {
        maxRetries: 0,
        concurrencyPerModel: 1,
        queueTimeoutMs: 500,
        queueDepth: 1,
      },
    },
    handleSingleModel: async (_body, model) => {
      calls.push(model);
      return okJson(`served-${model}`);
    },
    isModelAvailable: async () => true,
    log: {
      info(_tag: string, msg: string) {
        logs.push(String(msg));
      },
      warn() {},
      debug() {},
      error() {},
    },
    settings: null,
    allCombos: null,
  });

  assert.equal(result.ok, true);
  assert.ok(!calls.includes(modelStr), "OPEN provider must not be dispatched");
  assert.deepEqual(calls, [healthyModel]);
  assert.ok(
    logs.some((m) => /circuit breaker not executable/i.test(m)),
    `expected circuit pre-skip log, got: ${logs.join(" | ")}`
  );
});

test("F-03-004: RR pre-skips model-locked target before handleSingleModel", async () => {
  const provider = `rr-lock-${Date.now()}`;
  const connectionId = "conn-rr-lock";
  const rawModel = "locked-model";
  const modelStr = `${provider}/${rawModel}`;
  const altModel = `${provider}/other-model`;

  recordModelLockoutFailure(
    provider,
    connectionId,
    rawModel,
    "rate_limit",
    429,
    60_000,
    null,
    { exactCooldownMs: 60_000 }
  );
  assert.equal(isModelLocked(provider, connectionId, rawModel), true);

  const calls: string[] = [];

  // Pin connectionId via models as objects when supported; string models rely on
  // connection resolution. Use object-form targets if the combo schema accepts them.
  const result = await handleComboChat({
    body: { stream: false, messages: [{ role: "user", content: "rr-lock" }] },
    combo: {
      name: "rr-lock-combo",
      strategy: "round-robin",
      models: [
        { model: modelStr, connectionId },
        { model: altModel, connectionId },
      ],
      config: {
        maxRetries: 0,
        concurrencyPerModel: 1,
        queueTimeoutMs: 500,
        queueDepth: 1,
      },
    },
    handleSingleModel: async (_body, model) => {
      calls.push(model);
      return okJson(`served-${model}`);
    },
    isModelAvailable: async () => true,
    log: silentLog(),
    settings: {
      resilienceSettings: {
        modelLockout: { enabled: true, errorCodes: [429], baseCooldownMs: 60_000 },
      },
    },
    allCombos: null,
  });

  assert.equal(result.ok, true);
  assert.ok(!calls.includes(modelStr), "locked model must be pre-skipped");
  assert.ok(calls.includes(altModel), "unlocked sibling model still served");
});
