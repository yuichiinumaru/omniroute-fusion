// tests/unit/combo-402-fallback.test.ts
// Task 0118: Fix Kiro/GLM-5 402 false-provider-exhaustion blocking combo fallback

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkFallbackError,
  isProviderExhaustedReason,
} from "../../open-sse/services/accountFallback.ts";
import {
  applyComboTargetExhaustion,
  type ComboExhaustionSets,
} from "../../open-sse/services/combo/targetExhaustion.ts";
import { getExhaustedTargetSkipReason } from "../../open-sse/services/combo/comboPredicates.ts";
import type { ResolvedComboTarget } from "../../open-sse/services/combo/types.ts";

const log = { info() {}, warn() {}, error() {}, debug() {} };

function createSets(): ComboExhaustionSets {
  return {
    exhaustedProviders: new Set<string>(),
    exhaustedConnections: new Set<string>(),
    transientRateLimitedProviders: new Set<string>(),
  };
}

function makeTarget(provider: string, modelStr: string, connectionId?: string): ResolvedComboTarget {
  return {
    kind: "model",
    executionKey: `${provider}:${modelStr}`,
    modelStr,
    provider,
    providerId: provider,
    connectionId: connectionId ?? null,
  } as unknown as ResolvedComboTarget;
}

const baseOpts = {
  errorText: "You have reached the limit.",
  rawModel: "glm-5",
  isTokenLimitBreach: false,
  allAccountsRateLimited: false,
  log,
  tag: "COMBO",
  exhaustedLogLevel: "info" as const,
};

// Requirement 1: checkFallbackError + isProviderExhaustedReason behavior for 402
test("Requirement 1: 402 status does NOT classify as provider-exhausted reason", () => {
  const result = checkFallbackError(402, "You have reached the limit.", 0, "glm-5", "kiro");
  assert.equal(result.shouldFallback, true);
  // isProviderExhaustedReason MUST return false for 402 / per-account quota
  assert.equal(isProviderExhaustedReason(result), false);
});

// Requirement 2: applyComboTargetExhaustion does NOT add provider to exhaustedProviders on 402
test("Requirement 2: applyComboTargetExhaustion does NOT mark provider exhausted for 402", () => {
  const sets = createSets();
  const target = makeTarget("kiro", "kiro/glm-5", "conn-kiro-1");
  const fallbackResult = checkFallbackError(402, "You have reached the limit.", 0, "glm-5", "kiro");

  const isExhausted = applyComboTargetExhaustion(target, {
    ...baseOpts,
    result: { status: 402 },
    fallbackResult,
    sets,
  });

  assert.equal(isExhausted, false, "providerExhausted return value must be false for 402");
  assert.equal(sets.exhaustedProviders.has("kiro"), false, "kiro must NOT be added to exhaustedProviders");
});

// Requirement 3: Same-provider multi-target fallback works after 402 (Kiro-1 fails with 402 -> advances to Kiro-2)
test("Requirement 3: combo with two Kiro targets advances from Kiro-1 (402) to Kiro-2", () => {
  const sets = createSets();
  const target1 = makeTarget("kiro", "kiro/glm-5", "conn-kiro-1");
  const target2 = makeTarget("kiro", "kiro/glm-5", "conn-kiro-2");
  const target3 = makeTarget("openai", "openai/gpt-4o", "conn-openai-1");

  // Kiro-1 fails with 402
  const fallbackResult1 = checkFallbackError(402, "You have reached the limit.", 0, "glm-5", "kiro");
  applyComboTargetExhaustion(target1, {
    ...baseOpts,
    result: { status: 402 },
    fallbackResult: fallbackResult1,
    sets,
  });

  // Check if Target 2 (Kiro-2) is skipped
  const skipReasonTarget2 = getExhaustedTargetSkipReason(target2, sets.exhaustedProviders, sets.exhaustedConnections);
  assert.equal(skipReasonTarget2, null, "Kiro-2 must NOT be skipped after Kiro-1 402");

  // Check if Target 3 (OpenAI-1) is skipped
  const skipReasonTarget3 = getExhaustedTargetSkipReason(target3, sets.exhaustedProviders, sets.exhaustedConnections);
  assert.equal(skipReasonTarget3, null, "OpenAI-1 must NOT be skipped after Kiro-1 402");
});

// Requirement 4: Cross-provider fallback works after 402 (Kiro-1 fails with 402 -> advances to OpenAI-1)
test("Requirement 4: combo with one Kiro target + one OpenAI target advances from Kiro (402) to OpenAI", () => {
  const sets = createSets();
  const target1 = makeTarget("kiro", "kiro/glm-5", "conn-kiro-1");
  const target2 = makeTarget("openai", "openai/gpt-4o", "conn-openai-1");

  // Kiro fails with 402
  const fallbackResult1 = checkFallbackError(402, "You have reached the limit.", 0, "glm-5", "kiro");
  applyComboTargetExhaustion(target1, {
    ...baseOpts,
    result: { status: 402 },
    fallbackResult: fallbackResult1,
    sets,
  });

  // Target 2 (OpenAI-1) must be attempted
  const skipReason = getExhaustedTargetSkipReason(target2, sets.exhaustedProviders, sets.exhaustedConnections);
  assert.equal(skipReason, null, "OpenAI-1 must be eligible for fallback after Kiro 402");
});

// Requirement 5: 401 truly terminal auth error STILL marks provider as exhausted (regression guard)
test("Requirement 5: 401 terminal auth error DOES mark provider as exhausted", () => {
  const sets = createSets();
  const target1 = makeTarget("kiro", "kiro/glm-5"); // no connectionId -> provider-level auth error
  const fallbackResult1 = checkFallbackError(401, "account_deactivated", 0, "glm-5", "kiro");

  assert.equal(isProviderExhaustedReason(fallbackResult1), true, "isProviderExhaustedReason must be true for 401 auth error");

  const isExhausted = applyComboTargetExhaustion(target1, {
    ...baseOpts,
    errorText: "account_deactivated",
    result: { status: 401 },
    fallbackResult: fallbackResult1,
    sets,
  });

  assert.equal(isExhausted, true, "providerExhausted must be true for 401 auth error");
  assert.equal(sets.exhaustedProviders.has("kiro"), true, "kiro must be added to exhaustedProviders for 401 auth error");
});
