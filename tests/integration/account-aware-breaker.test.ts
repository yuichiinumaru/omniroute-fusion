// tests/integration/account-aware-breaker.test.ts
// Task 0143: Preserve healthy accounts when provider breaker is open

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getCircuitBreaker,
  resetAllCircuitBreakers,
} from "../../src/shared/utils/circuitBreaker.ts";
import {
  checkFallbackError,
  isProviderFailureCode,
  lockModel,
  clearModelLock,
  hasHealthyAccount,
} from "../../open-sse/services/accountFallback.ts";
import { isProviderCircuitBlocking } from "../../open-sse/services/combo/comboPredicates.ts";
import { checkPipelineGates } from "../../src/sse/handlers/chatHelpers.ts";

test("Requirement 1: Failure classification distinguishes provider-wide outage from account/model failure", () => {
  // Provider-wide outage codes: 408, 429, 500, 502, 503, 504
  assert.equal(isProviderFailureCode(500), true);
  assert.equal(isProviderFailureCode(502), true);
  assert.equal(isProviderFailureCode(503), true);
  assert.equal(isProviderFailureCode(504), true);
  assert.equal(isProviderFailureCode(408), true);

  // Account/model scoped non-provider codes: 400, 401, 403, 404
  assert.equal(isProviderFailureCode(400), false);
  assert.equal(isProviderFailureCode(401), false);
  assert.equal(isProviderFailureCode(403), false);
  assert.equal(isProviderFailureCode(404), false);

  const fb401 = checkFallbackError(401, "unauthorized", 0, "gpt-4o", "openai");
  assert.equal(fb401.shouldFallback, true);

  const fb404 = checkFallbackError(404, "model_not_found", 0, "gpt-4o", "openai");
  assert.equal(fb404.shouldFallback, true);
});

test("Requirement 2: Two accounts — Account 1 cooldown does NOT hide healthy Account 2 when breaker is OPEN", async () => {
  resetAllCircuitBreakers();

  const conn1 = {
    id: "conn-1",
    provider: "test-prov-2acc",
    isActive: true,
    testStatus: "active",
    rateLimitedUntil: new Date(Date.now() + 60000).toISOString(), // cooling down
  };

  const conn2 = {
    id: "conn-2",
    provider: "test-prov-2acc",
    isActive: true,
    testStatus: "active",
    rateLimitedUntil: null, // healthy!
  };

  const connections = [conn1, conn2];

  // Open the provider breaker for test-prov-2acc
  const breaker = getCircuitBreaker("test-prov-2acc", { failureThreshold: 1 });
  breaker._onFailure();
  assert.equal(breaker.canExecute(), false, "Breaker must be OPEN");

  // hasHealthyAccount MUST identify conn2 as healthy
  const healthy = await hasHealthyAccount("test-prov-2acc", "gpt-4o", { connections });
  assert.equal(healthy, true, "hasHealthyAccount must be true because conn-2 is healthy");

  // isProviderCircuitBlocking MUST NOT block when conn2 is healthy
  const blocking = await isProviderCircuitBlocking("test-prov-2acc", "gpt-4o", { connections });
  assert.equal(blocking, false, "isProviderCircuitBlocking must return false when healthy account exists");
});

test("Requirement 3: Provider outage — when ALL accounts are in cooldown, provider breaker blocks fail-safe", async () => {
  resetAllCircuitBreakers();

  const conn1 = {
    id: "conn-1",
    provider: "test-prov-outage",
    isActive: true,
    testStatus: "active",
    rateLimitedUntil: new Date(Date.now() + 60000).toISOString(),
  };

  const conn2 = {
    id: "conn-2",
    provider: "test-prov-outage",
    isActive: true,
    testStatus: "active",
    rateLimitedUntil: new Date(Date.now() + 60000).toISOString(),
  };

  const connections = [conn1, conn2];

  // Open the provider breaker
  const breaker = getCircuitBreaker("test-prov-outage", { failureThreshold: 1 });
  breaker._onFailure();
  assert.equal(breaker.canExecute(), false, "Breaker must be OPEN");

  const healthy = await hasHealthyAccount("test-prov-outage", "gpt-4o", { connections });
  assert.equal(healthy, false, "hasHealthyAccount must be false when all accounts are in cooldown");

  const blocking = await isProviderCircuitBlocking("test-prov-outage", "gpt-4o", { connections });
  assert.equal(blocking, true, "isProviderCircuitBlocking must be true when no healthy account exists");

  const gate = await checkPipelineGates("test-prov-outage", "gpt-4o");
  assert.notEqual(gate, null, "Pipeline gate must reject when provider breaker is OPEN and no healthy account");
  assert.equal(gate?.status, 503);
});

test("Requirement 4: Model lockout is narrower than connection cooldown", async () => {
  resetAllCircuitBreakers();

  const conn1 = {
    id: "conn-model-lock",
    provider: "test-prov-ml",
    isActive: true,
    testStatus: "active",
    rateLimitedUntil: null, // connection itself is active!
  };

  // Lock model-A only
  lockModel("test-prov-ml", "conn-model-lock", "model-A", "quota_exhausted", 60000);

  const healthyModelA = await hasHealthyAccount("test-prov-ml", "model-A", { connections: [conn1] });
  assert.equal(healthyModelA, false, "model-A must be locked on conn-model-lock");

  const healthyModelB = await hasHealthyAccount("test-prov-ml", "model-B", { connections: [conn1] });
  assert.equal(healthyModelB, true, "model-B must remain healthy on conn-model-lock");

  clearModelLock("test-prov-ml", "conn-model-lock", "model-A");
});

test("Requirement 5: Forced/operator bypass remains auditable and passes pipeline gate", async () => {
  resetAllCircuitBreakers();

  const breaker = getCircuitBreaker("test-prov-bypass", { failureThreshold: 1 });
  breaker._onFailure();
  assert.equal(breaker.canExecute(), false, "Breaker must be OPEN");

  const gate = await checkPipelineGates("test-prov-bypass", "gpt-4o", {
    ignoreCircuitBreaker: true,
    bypassReason: "operator test bypass",
  });
  assert.equal(gate, null, "Pipeline gate must return null when ignoreCircuitBreaker is true");
});
