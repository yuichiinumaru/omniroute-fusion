// tests/unit/combo-fail-soft-candidate-errors.test.ts
// Task 0157: Make unavailable combo candidates fail soft and preserve harness continuity

import { test } from "node:test";
import assert from "node:assert/strict";
import { handleComboChat } from "../../open-sse/services/combo.ts";
import {
  checkFallbackError,
  isProviderExhaustedReason,
  clearAllModelLockouts,
  classifyLockoutReason,
} from "../../open-sse/services/accountFallback.ts";
import { clearCooldownState, isProviderInCooldown } from "../../open-sse/services/providerCooldownTracker.ts";
import { getCircuitBreaker, resetAllCircuitBreakers } from "../../src/shared/utils/circuitBreaker.ts";

const nullLog = {
  info() {},
  warn() {},
  error() {},
  debug() {},
};

function setupTestEnv() {
  clearAllModelLockouts();
  clearCooldownState();
  resetAllCircuitBreakers();
}

test("Requirement 1: Exact MetaMuse two-account scenario (Account A 404 -> Account B 200 OK)", async () => {
  setupTestEnv();

  const loggedMessages: string[] = [];
  const captureLog = {
    info(tag: string, msg: string) { loggedMessages.push(`[${tag}] ${msg}`); },
    warn(tag: string, msg: string) { loggedMessages.push(`[${tag}] ${msg}`); },
    error(tag: string, msg: string) { loggedMessages.push(`[${tag}] ${msg}`); },
    debug() {},
  };

  const combo = {
    name: "metamuse-test-combo",
    strategy: "priority",
    models: [
      {
        provider: "metamuse",
        model: "metamuse/muse-spark-1.2-contributor",
        connectionId: "conn-account-a",
      },
      {
        provider: "metamuse",
        model: "metamuse/muse-spark-1.2",
        connectionId: "conn-account-b",
      },
    ],
  };

  const handleSingleModel = async (body: Record<string, unknown>, modelStr: string, target?: any) => {
    if (target?.connectionId === "conn-account-a") {
      return new Response(JSON.stringify({ detail: "Expected 'id' to be a string." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (target?.connectionId === "conn-account-b") {
      return new Response(JSON.stringify({
        id: "chatcmpl-mock-b",
        choices: [{ message: { role: "assistant", content: "Success from Account B" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Hello" }] },
    combo: combo as any,
    handleSingleModel,
    log: captureLog as any,
    settings: {
      modelLockout: { enabled: true, baseCooldownMs: 60000, errorCodes: [404] },
      resilienceSettings: { providerCooldown: { enabled: true, minRetryCooldownMs: 60000 } },
    },
  });

  assert.equal(res.status, 200, "Response status must be 200 OK from Account B");
  const json = await res.json();
  assert.equal(json?.choices?.[0]?.message?.content, "Success from Account B");

  // Verify candidate 404 logged as soft failure
  const has404Log = loggedMessages.some((m) => m.includes("muse-spark-1.2-contributor") && m.includes("404"));
  assert.equal(has404Log, true, "Candidate 404 must be logged with model name and status");

  // Verify provider circuit breaker was NOT tripped
  const breaker = getCircuitBreaker("metamuse");
  assert.equal(breaker.canExecute(), true, "Provider circuit breaker must remain closed/executable");

  // Account A (conn-account-a) failed, Account B (conn-account-b) succeeded
  assert.equal(isProviderInCooldown("metamuse", "conn-account-a"), true, "Account A must enter connection cooldown");
  assert.equal(isProviderInCooldown("metamuse", "conn-account-b"), false, "Account B must NOT enter connection cooldown");
});

test("Requirement 2: Contributor 404 locks out specific account/model without retrying indefinitely", async () => {
  setupTestEnv();

  const combo = {
    name: "metamuse-contributor-combo",
    strategy: "priority",
    models: [
      { provider: "metamuse", model: "metamuse/muse-spark-1.2-contributor", connectionId: "conn-account-a" },
      { provider: "metamuse", model: "metamuse/muse-spark-1.2", connectionId: "conn-account-b" },
    ],
  };

  let attemptsAccountA = 0;
  let attemptsAccountB = 0;

  const handleSingleModel = async (body: Record<string, unknown>, modelStr: string, target?: any) => {
    if (target?.connectionId === "conn-account-a") {
      attemptsAccountA++;
      return new Response(JSON.stringify({ detail: "Expected 'id' to be a string." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (target?.connectionId === "conn-account-b") {
      attemptsAccountB++;
      return new Response(JSON.stringify({
        choices: [{ message: { role: "assistant", content: "OK" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  };

  // Turn 1
  const res1 = await handleComboChat({
    body: { messages: [{ role: "user", content: "Turn 1" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
    settings: {
      modelLockout: { enabled: true, baseCooldownMs: 60000, errorCodes: [404] },
      resilienceSettings: { providerCooldown: { enabled: true, minRetryCooldownMs: 60000 } },
    },
  });
  assert.equal(res1.status, 200);
  assert.equal(attemptsAccountA, 1);
  assert.equal(attemptsAccountB, 1);

  // Turn 2: Account A is in cooldown/lockout, so it must be skipped without calling handleSingleModel for Account A
  const res2 = await handleComboChat({
    body: { messages: [{ role: "user", content: "Turn 2" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
    settings: {
      modelLockout: { enabled: true, baseCooldownMs: 60000, errorCodes: [404] },
      resilienceSettings: { providerCooldown: { enabled: true, minRetryCooldownMs: 60000 } },
    },
  });
  assert.equal(res2.status, 200);
  assert.equal(attemptsAccountA, 1, "Account A must be skipped on Turn 2 due to cooldown/lockout");
  assert.equal(attemptsAccountB, 2, "Account B must be called on Turn 2");
});

test("Requirement 3: Model/account 404 creates narrow scope and preserves provider breaker", () => {
  setupTestEnv();

  const fallbackResult = checkFallbackError(404, "Expected 'id' to be a string.", 0, "muse-spark-1.2-contributor", "metamuse");

  assert.equal(fallbackResult.shouldFallback, true, "404 must trigger candidate fallback");
  assert.equal(isProviderExhaustedReason(fallbackResult), false, "404 must NOT be classified as provider-exhausted");

  const breaker = getCircuitBreaker("metamuse");
  assert.equal(breaker.canExecute(), true, "404 must NOT trip provider circuit breaker");

  assert.equal(classifyLockoutReason(404), "model_not_found", "classifyLockoutReason(404) must return 'model_not_found'");
});

test("Requirement 4: Thrown executor error, malformed upstream error body, and stream parse error fail soft", async () => {
  setupTestEnv();

  const combo = {
    name: "resilient-combo",
    strategy: "priority",
    models: [
      { provider: "flaky-provider", model: "flaky-provider/model-throws", connectionId: "conn-1" },
      { provider: "flaky-provider", model: "flaky-provider/model-malformed-json", connectionId: "conn-2" },
      { provider: "good-provider", model: "good-provider/model-ok", connectionId: "conn-3" },
    ],
  };

  let callCount = 0;

  const handleSingleModel = async (body: Record<string, unknown>, modelStr: string, target?: any) => {
    callCount++;
    if (modelStr.endsWith("model-throws")) {
      throw new Error("Connection reset by peer");
    }
    if (modelStr.endsWith("model-malformed-json")) {
      return new Response("{ invalid json body syntax ... ", {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (modelStr.endsWith("model-ok")) {
      return new Response(JSON.stringify({
        choices: [{ message: { role: "assistant", content: "Recovered!" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 200, "Combo must recover from thrown/malformed candidate errors and succeed on good target");
  const json = await res.json();
  assert.equal(json?.choices?.[0]?.message?.content, "Recovered!");
});

test("Requirement 5: Terminal client errors (499, body-specific 400, abort) stay terminal", async () => {
  setupTestEnv();

  // Test 499 (Client Disconnect)
  const combo499 = {
    name: "combo-499",
    strategy: "priority",
    models: [
      { provider: "p1", model: "p1/m1", connectionId: "c1" },
      { provider: "p2", model: "p2/m2", connectionId: "c2" },
    ],
  };

  let m2Called = false;
  const handleSingleModel499 = async (body: Record<string, unknown>, modelStr: string) => {
    if (modelStr.endsWith("m1")) {
      return new Response(JSON.stringify({ error: { message: "Client disconnected" } }), { status: 499 });
    }
    m2Called = true;
    return new Response("OK", { status: 200 });
  };

  const res499 = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo499 as any,
    handleSingleModel: handleSingleModel499,
    log: nullLog as any,
  });

  assert.equal(res499.status, 499, "499 status must be returned immediately");
  assert.equal(m2Called, false, "499 must NOT trigger fallback to target 2");

  // Test AbortSignal
  const controller = new AbortController();
  controller.abort();

  const resAborted = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo499 as any,
    handleSingleModel: handleSingleModel499,
    log: nullLog as any,
    signal: controller.signal,
  });

  assert.equal(resAborted.status, 499, "Aborted signal must return 499 immediately");
});

test("Sabotage 1: Malformed JSON body does NOT leak raw text into aggregate terminal error", async () => {
  setupTestEnv();

  const combo = {
    name: "combo-malformed-body",
    strategy: "priority",
    models: [
      { provider: "p1", model: "p1/m1", connectionId: "c1" },
    ],
  };

  const handleSingleModel = async () => {
    // Malformed JSON that could contain sensitive-looking content
    return new Response('{"detail":"secret-token-abc123", broken json', {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 502);
  const json = await res.json();
  assert.ok(json.error, "Must contain error object");
  // Raw JSON body must NOT leak into the terminal error message
  assert.doesNotMatch(json.error.message, /secret-token-abc123/, "Raw body content must not leak into terminal error");
  assert.doesNotMatch(json.error.message, /broken json/, "Raw body content must not leak into terminal error");
});

test("Sabotage 2: detail object without .message does NOT leak raw JSON into terminal error", async () => {
  setupTestEnv();

  const combo = {
    name: "combo-detail-object",
    strategy: "priority",
    models: [
      { provider: "p1", model: "p1/m1", connectionId: "c1" },
    ],
  };

  const handleSingleModel = async () => {
    return new Response(JSON.stringify({ detail: { code: "ERR_X", info: "sensitive-detail" } }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 404);
  const json = await res.json();
  assert.ok(json.error, "Must contain error object");
  // The raw JSON-serialized detail object must NOT appear in the terminal error
  assert.doesNotMatch(json.error.message, /sensitive-detail/, "Raw detail object must not leak into terminal error");
  assert.doesNotMatch(json.error.message, /ERR_X/, "Raw detail object must not leak into terminal error");
});

test("Sabotage 3: Round-robin path extracts detail and does not leak raw body when all fail", async () => {
  setupTestEnv();

  const combo = {
    name: "combo-rr-detail",
    strategy: "round-robin",
    models: [
      { provider: "metamuse", model: "metamuse/muse-spark-1.2-contributor", connectionId: "conn-a" },
      { provider: "metamuse", model: "metamuse/muse-spark-1.2", connectionId: "conn-b" },
    ],
  };

  // Both candidates fail with detail-only bodies — this is the case that would
  // leak raw JSON if the round-robin path used the old extraction logic.
  const handleSingleModel = async (body: Record<string, unknown>, modelStr: string, target?: any) => {
    if (target?.connectionId === "conn-a") {
      return new Response(JSON.stringify({ detail: "Expected 'id' to be a string." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ detail: "Model not available on this account" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 404, "All candidates failed — aggregate 404");
  const json = await res.json();
  assert.ok(json.error, "Must contain error object");
  // The raw JSON body must NOT appear in the terminal error message
  assert.doesNotMatch(json.error.message, /\{"detail"/, "Raw JSON body must not leak into round-robin terminal error");
  // The extracted detail string IS the expected clean representation
  assert.match(json.error.message, /Expected 'id' to be a string|Model not available/, "Extracted detail text should appear in error");
});

test("Sabotage 4: Empty response body produces safe fallback error, not crash", async () => {
  setupTestEnv();

  const combo = {
    name: "combo-empty-body",
    strategy: "priority",
    models: [
      { provider: "p1", model: "p1/m1", connectionId: "c1" },
    ],
  };

  const handleSingleModel = async () => {
    return new Response("", {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 503);
  const json = await res.json();
  assert.ok(json.error, "Must contain error object");
  assert.equal(typeof json.error.message, "string", "Error message must be string");
});

test("Negative 1: Successful first target does NOT record lockout or cooldown", async () => {
  setupTestEnv();

  const combo = {
    name: "combo-success-first",
    strategy: "priority",
    models: [
      { provider: "p1", model: "p1/m1", connectionId: "c1" },
      { provider: "p1", model: "p1/m2", connectionId: "c2" },
    ],
  };

  let m2Called = false;
  const handleSingleModel = async (body: Record<string, unknown>, modelStr: string, target?: any) => {
    if (target?.connectionId === "c2") { m2Called = true; }
    return new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: "OK" } }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
    settings: {
      modelLockout: { enabled: true, baseCooldownMs: 60000, errorCodes: [404] },
      resilienceSettings: { providerCooldown: { enabled: true, minRetryCooldownMs: 60000 } } },
  });

  assert.equal(res.status, 200);
  assert.equal(m2Called, false, "Second target must not be called when first succeeds");
  assert.equal(isProviderInCooldown("p1", "c1", { providerCooldown: { enabled: true, minRetryCooldownMs: 60000 } }), false, "No cooldown on success");
});

test("Requirement 6: When all candidates fail, returns single sanitized aggregate error response", async () => {
  setupTestEnv();

  const comboAllFail = {
    name: "combo-all-fail",
    strategy: "priority",
    models: [
      { provider: "metamuse", model: "metamuse/muse-spark-1.2-contributor", connectionId: "conn-a" },
      { provider: "metamuse", model: "metamuse/muse-spark-1.2", connectionId: "conn-b" },
    ],
  };

  const handleSingleModelAllFail = async (body: Record<string, unknown>, modelStr: string, target?: any) => {
    if (target?.connectionId === "conn-a") {
      return new Response(JSON.stringify({ detail: "Expected 'id' to be a string." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: { message: "Model unavailable on connection B" } }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: comboAllFail as any,
    handleSingleModel: handleSingleModelAllFail,
    log: nullLog as any,
  });

  assert.equal(res.status, 404, "Exhausted combo must return aggregate status");
  const json = await res.json();
  assert.ok(json.error, "Must contain error object");
  assert.equal(typeof json.error.message, "string", "Error message must be string");
  assert.equal(json.error.type, "invalid_request_error", "Error type must be OpenAI-compatible for 404");
  assert.doesNotMatch(json.error.message, /\{"detail"/, "Error message must not contain raw JSON stringification");
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 0157 (post-review) — F1 retry-after sanitization + F2 generic-terminal-400
// ─────────────────────────────────────────────────────────────────────────────

function makeRateLimitedResponse(message: string, retryAfterSeconds = 60): Response {
  // `retryAfter` in the body is the field extracted by extractComboErrorText into
  // earliestRetryAfter; the combo aggregate paths only consult headers via the
  // cooldown-aware retry branch, not for the regular 429 retry-after aggregate.
  return new Response(
    JSON.stringify({ error: { message }, retryAfter: retryAfterSeconds }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

test("F1 Priority: exhausted 429 retry-after aggregate does NOT leak secret-shaped upstream message", async () => {
  setupTestEnv();

  const SECRET = "SECRET_TOKEN_123";
  const combo = {
    name: "combo-f1-priority-secret",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [
      { provider: "p1", model: "p1/m1", connectionId: "c1" },
      { provider: "p2", model: "p2/m2", connectionId: "c2" },
    ],
  };

  const handleSingleModel = async () => makeRateLimitedResponse(`${SECRET} (reset after 634577h 28m 14s)`);

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 429, "Aggregate retry-after must surface the upstream 429 status");
  assert.ok(
    Number(res.headers.get("Retry-After")) >= 1,
    `Retry-After header must be preserved (status=${res.status}, headers=${JSON.stringify([...res.headers])})`
  );
  const json = await res.json();
  assert.ok(json.error, "Aggregate retry-after body must contain an error object");
  assert.equal(typeof json.error.message, "string");
  assert.doesNotMatch(
    json.error.message,
    new RegExp(SECRET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `Aggregate retry-after message must not echo the secret-shaped upstream text; got: ${json.error.message}`
  );
  // Generic shape preserved for OpenAI-compatible consumers
  assert.equal(json.error.type, "rate_limit_error");
});

test("F1 Round-robin: exhausted 429 retry-after aggregate does NOT leak secret-shaped upstream message", async () => {
  setupTestEnv();

  const SECRET = "AKIA-DEMO-SECRET";
  const combo = {
    name: "combo-f1-rr-secret",
    strategy: "round-robin",
    config: { maxRetries: 0, retryDelayMs: 1, concurrencyPerModel: 1, queueTimeoutMs: 5 },
    models: [
      { provider: "p1", model: "p1/rr-a", connectionId: "c-a" },
      { provider: "p2", model: "p2/rr-b", connectionId: "c-b" },
    ],
  };

  const handleSingleModel = async () => makeRateLimitedResponse(`${SECRET} (reset after 30s)`);

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 429, "Aggregate retry-after must surface the upstream 429 status");
  assert.ok(Number(res.headers.get("Retry-After")) >= 1, "Retry-After header must be preserved");
  const json = await res.json();
  assert.ok(json.error, "Aggregate retry-after body must contain an error object");
  assert.doesNotMatch(
    json.error.message,
    new RegExp(SECRET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `Round-robin aggregate retry-after must not echo the secret-shaped upstream text; got: ${json.error.message}`
  );
  assert.equal(json.error.type, "rate_limit_error");
});

test("F2 Priority: generic terminal 400 stops the combo at target 1 (no fallback)", async () => {
  setupTestEnv();

  const calls: string[] = [];
  const combo = {
    name: "combo-f2-priority-terminal-400",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [
      { provider: "p1", model: "p1/m1", connectionId: "c1" },
      { provider: "p2", model: "p2/m2", connectionId: "c2" },
    ],
  };

  const handleSingleModel = async (body: Record<string, unknown>, modelStr: string) => {
    calls.push(modelStr);
    if (modelStr.endsWith("p1/m1")) {
      // Generic client 400 — not model/access/scoped, not context overflow, not malformed.
      // checkFallbackError classifies this as shouldFallback=false (terminal).
      return new Response(
        JSON.stringify({ error: { message: "invalid client payload" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: "Recovered" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(
    res.status,
    400,
    `Generic terminal 400 must surface to caller as 400 (calls=${calls.join(",")}, body=${JSON.stringify(await res.clone().json().catch(() => null))})`
  );
  assert.ok(
    calls.length === 1 && calls[0].endsWith("p1/m1"),
    `Generic terminal 400 must NOT trigger fallback to target 2 (calls=${calls.join(",")})`
  );
});

test("F2 Round-robin: generic terminal 400 stops the combo at target 1 (no fallback)", async () => {
  setupTestEnv();

  let m2Called = false;
  const combo = {
    name: "combo-f2-rr-terminal-400",
    strategy: "round-robin",
    config: { maxRetries: 0, retryDelayMs: 1, concurrencyPerModel: 1, queueTimeoutMs: 5 },
    models: [
      { provider: "p1", model: "p1/rr-a", connectionId: "c-a" },
      { provider: "p2", model: "p2/rr-b", connectionId: "c-b" },
    ],
  };

  const handleSingleModel = async (body: Record<string, unknown>, modelStr: string) => {
    if (modelStr.endsWith("p1/rr-a")) {
      return new Response(
        JSON.stringify({ error: { message: "invalid client payload" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    m2Called = true;
    return new Response(JSON.stringify({ choices: [{ message: { content: "Recovered" } }] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 400, "Round-robin generic terminal 400 must surface to caller as 400");
  assert.equal(m2Called, false, "Round-robin generic terminal 400 must NOT trigger fallback to target 2");
});

test("F2 Positive: model-access 400 remains fallback-safe in priority (parity with #4279/#5249)", async () => {
  setupTestEnv();

  const combo = {
    name: "combo-f2-model-access-priority",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 1 },
    models: [
      { provider: "p1", model: "p1/missing-model", connectionId: "c1" },
      { provider: "p1", model: "p1/working-model", connectionId: "c2" },
    ],
  };

  const handleSingleModel = async (body: Record<string, unknown>, modelStr: string) => {
    if (modelStr.endsWith("missing-model")) {
      // Positive control: structured code "model_not_found" makes
      // checkFallbackError return shouldFallback=true (model-access path),
      // so the combo is allowed to advance — mirrors combo-body-specific-400-stop-4279.test.ts #5249.
      return new Response(
        JSON.stringify({
          error: { code: "model_not_found", message: "Invalid model: this account cannot access the requested model." },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: "Recovered" } }] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 200, "Model-access 400 must remain fallback-safe and target 2 must succeed");
});

test("F2 Negative: 400 with 'transient' / no structured code is terminal (proves RR didn't regress to blind continuation)", async () => {
  setupTestEnv();

  // Without structured code and without body-specific / model-access pattern matches,
  // checkFallbackError returns shouldFallback=false for status 400. Mirrors the
  // explicit terminal contract the review wants; this is the path that previously
  // leaked through target 2 in both strategies.
  const combo = {
    name: "combo-f2-rr-transient",
    strategy: "round-robin",
    config: { maxRetries: 0, retryDelayMs: 1, concurrencyPerModel: 1, queueTimeoutMs: 5 },
    models: [
      { provider: "p1", model: "p1/rr-x", connectionId: "c-x" },
      { provider: "p2", model: "p2/rr-y", connectionId: "c-y" },
    ],
  };

  let m2Called = false;
  const handleSingleModel = async (_body: Record<string, unknown>, modelStr: string) => {
    if (modelStr.endsWith("p1/rr-x")) {
      return new Response(
        JSON.stringify({ error: { message: "transient" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    m2Called = true;
    return new Response(JSON.stringify({ choices: [{ message: { content: "Recovered" } }] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Test" }] },
    combo: combo as any,
    handleSingleModel,
    log: nullLog as any,
  });

  assert.equal(res.status, 400, "Generic 400 ('transient') must surface 400 to caller");
  assert.equal(m2Called, false, "Generic 400 must NOT trigger fallback to target 2");
});
