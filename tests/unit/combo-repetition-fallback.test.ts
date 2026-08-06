import test from "node:test";
import assert from "node:assert/strict";

import {
  applyComboTargetExhaustion,
  isRepetitionFailure,
  type ComboExhaustionSets,
} from "../../open-sse/services/combo/targetExhaustion.ts";
import { shouldRecordProviderBreakerFailure } from "../../open-sse/services/combo/comboPredicates.ts";
import { isClientDisconnectError } from "../../open-sse/utils/streamHandler.ts";
import { getDefaultComboConfig } from "../../open-sse/services/comboConfig.ts";
import { comboRuntimeConfigSchema } from "../../src/shared/validation/schemas/combo.ts";
import type { ResolvedComboTarget, ComboLogger } from "../../open-sse/services/combo/types.ts";

test("isRepetitionFailure identifies 502 repetition_detected errors", () => {
  assert.strictEqual(isRepetitionFailure(502, "repetition_detected"), true);
  assert.strictEqual(isRepetitionFailure(502, "Stream repetition detected"), true);
  assert.strictEqual(isRepetitionFailure(502, "Random 502 error"), false);
  assert.strictEqual(isRepetitionFailure(500, "repetition_detected"), false);
});

test("applyComboTargetExhaustion does not exhaust provider on repetition failure", () => {
  const sets: ComboExhaustionSets = {
    exhaustedProviders: new Set(),
    exhaustedConnections: new Set(),
    transientRateLimitedProviders: new Set(),
  };

  const dummyTarget: ResolvedComboTarget = {
    kind: "model",
    stepId: "step-1",
    executionKey: "key-1",
    provider: "dahl",
    providerId: "dahl",
    modelStr: "kimi-k2.6",
    connectionId: null,
    weight: 1,
    label: null,
  };

  const dummyLog: ComboLogger = {
    info() {},
    warn() {},
    error() {},
    debug() {},
  };

  const providerExhausted = applyComboTargetExhaustion(dummyTarget, {
    result: { status: 502, headers: null },
    fallbackResult: { reason: "transient", creditsExhausted: false, dailyQuotaExhausted: false },
    errorText: "repetition_detected",
    rawModel: "kimi-k2.6",
    isTokenLimitBreach: false,
    allAccountsRateLimited: false,
    sets,
    log: dummyLog,
    tag: "TEST",
    exhaustedLogLevel: "info",
  });

  assert.strictEqual(providerExhausted, false);
  assert.strictEqual(sets.exhaustedProviders.has("dahl"), false);
  assert.strictEqual(sets.exhaustedConnections.size, 0);
});

test("shouldRecordProviderBreakerFailure returns false when isRepetitionFailure is true", () => {
  const result = shouldRecordProviderBreakerFailure({
    isStreamReadinessFailure: false,
    isRepetitionFailure: true,
    status: 502,
    sameProviderNext: false,
  });

  assert.strictEqual(result, false);
});

test("isClientDisconnectError returns false for repetition_detected aborts", () => {
  // A repetition abort is an upstream error (502), NOT a client disconnect
  assert.strictEqual(isClientDisconnectError("repetition_detected"), false);
  assert.strictEqual(isClientDisconnectError(new Error("repetition_detected")), false);
});

test("combo config defaults enableRepetitionGuard to false (opt-in)", () => {
  const defaultConfig = getDefaultComboConfig();
  assert.strictEqual(defaultConfig.enableRepetitionGuard, false);
  
  // Zod schema validates enableRepetitionGuard
  const parsed = comboRuntimeConfigSchema.safeParse({
    enableRepetitionGuard: true,
  });
  assert.strictEqual(parsed.success, true);
  if (parsed.success) {
    assert.strictEqual(parsed.data.enableRepetitionGuard, true);
  }
});

test("phaseComboSetup propagates enableRepetitionGuard from combo config to body", async () => {
  const { phaseComboSetup } = await import("../../open-sse/services/combo/comboSetup.ts");
  const dummyCtx = {
    combo: {
      name: "test-combo",
      config: { enableRepetitionGuard: true },
    },
    body: { messages: [{ role: "user", content: "test" }] },
    settings: null,
    relayOptions: null,
  };
  phaseComboSetup(dummyCtx as unknown as Parameters<typeof phaseComboSetup>[0]);
  assert.strictEqual((dummyCtx.body as Record<string, unknown>).enableRepetitionGuard, true);
});
