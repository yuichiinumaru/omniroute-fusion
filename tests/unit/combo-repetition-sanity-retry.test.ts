import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_REPETITION_SANITY_INSTRUCTION,
  injectRepetitionSanityInstruction,
} from "../../open-sse/services/comboAgentMiddleware.ts";
import {
  getDefaultComboConfig,
  resolveComboConfig,
} from "../../open-sse/services/comboConfig.ts";
import { comboRuntimeConfigSchema } from "../../src/shared/validation/schemas/combo.ts";
import { handleComboChat, resolveRepetitionGuardParams } from "../../open-sse/services/combo.ts";

function createMockLog() {
  return {
    info() {},
    warn() {},
    error() {},
    debug() {},
  };
}

function create502RepetitionResponse() {
  return new Response(
    JSON.stringify({
      error: {
        message: "repetition_detected",
        code: "repetition_detected",
        type: "repetition_error",
      },
    }),
    {
      status: 502,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function create500ErrorResponse() {
  return new Response(
    JSON.stringify({
      error: {
        message: "Internal Server Error",
      },
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function create200SuccessResponse(text = "Healthy response") {
  return new Response(
    JSON.stringify({
      choices: [{ message: { role: "assistant", content: text } }],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

test("injectRepetitionSanityInstruction injects system note as suffix message", () => {
  const body = {
    messages: [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello" },
    ],
  };

  const updated = injectRepetitionSanityInstruction(body);
  const messages = updated.messages as Array<Record<string, unknown>>;

  assert.strictEqual(messages.length, 3);
  assert.strictEqual(messages[0].role, "system");
  assert.strictEqual(messages[0].content, "You are helpful.");
  assert.strictEqual(messages[1].role, "system");
  assert.strictEqual(messages[1].content, DEFAULT_REPETITION_SANITY_INSTRUCTION);
  assert.strictEqual(messages[2].role, "user");
  assert.strictEqual(messages[2].content, "Hello");
});

test("comboConfigSchema and resolveComboConfig support repetitionRetryLimit", () => {
  const defaultConfig = getDefaultComboConfig();
  assert.strictEqual(defaultConfig.enableRepetitionGuard, false);
  assert.strictEqual((defaultConfig as Record<string, unknown>).repetitionRetryLimit, 1);

  const parsed = comboRuntimeConfigSchema.safeParse({
    enableRepetitionGuard: true,
    repetitionRetryLimit: 2,
  });
  assert.strictEqual(parsed.success, true);
  if (parsed.success) {
    assert.strictEqual((parsed.data as Record<string, unknown>).repetitionRetryLimit, 2);
  }

  const resolved = resolveComboConfig(
    { name: "test", config: { enableRepetitionGuard: true, repetitionRetryLimit: 3 } },
    null
  );
  assert.strictEqual(resolved.enableRepetitionGuard, true);
  assert.strictEqual(resolved.repetitionRetryLimit, 3);
});

test("resolveRepetitionGuardParams resolves enableRepetitionGuard and repetitionRetryLimit", () => {
  // Disabled by default
  const res1 = resolveRepetitionGuardParams({}, {});
  assert.strictEqual(res1.enableRepetitionGuard, false);
  assert.strictEqual(res1.repetitionRetryLimit, 0);

  // Enabled via config
  const res2 = resolveRepetitionGuardParams({ enableRepetitionGuard: true }, {});
  assert.strictEqual(res2.enableRepetitionGuard, true);
  assert.strictEqual(res2.repetitionRetryLimit, 1);

  // Enabled via body with custom budget
  const res3 = resolveRepetitionGuardParams(
    { enableRepetitionGuard: true, repetitionRetryLimit: 1 },
    { repetitionRetryLimit: 2 }
  );
  assert.strictEqual(res3.enableRepetitionGuard, true);
  assert.strictEqual(res3.repetitionRetryLimit, 2);
});

test("repetition sanity retry: budget 1 retries same target ONCE with sanity instruction on repetition failure", async () => {
  const combo = {
    name: "retry-b1",
    config: { maxRetries: 0, enableRepetitionGuard: true, repetitionRetryLimit: 1 },
    models: ["prov-b1/mod-a", "prov-b1-fb/mod-b"],
  };

  const dispatches: Array<{ modelStr: string; body: Record<string, unknown> }> = [];

  const response = await handleComboChat({
    body: { messages: [{ role: "user", content: "loop test" }] },
    combo,
    handleSingleModel: async (body: Record<string, unknown>, modelStr: string) => {
      dispatches.push({ modelStr, body });
      if (dispatches.length === 1) {
        // First attempt on target 1 fails with repetition
        return create502RepetitionResponse();
      }
      // Retry attempt on target 1 succeeds!
      return create200SuccessResponse("Recovered response");
    },
    isModelAvailable: async () => true,
    log: createMockLog(),
    settings: null,
    allCombos: null,
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(dispatches.length, 2);
  // Both calls targeted same model
  assert.strictEqual(dispatches[0].modelStr, "prov-b1/mod-a");
  assert.strictEqual(dispatches[1].modelStr, "prov-b1/mod-a");

  // First dispatch had no system note
  const msgs1 = dispatches[0].body.messages as Array<Record<string, unknown>>;
  assert.strictEqual(msgs1.length, 1);

  // Second dispatch (retry) received sanity instruction
  const msgs2 = dispatches[1].body.messages as Array<Record<string, unknown>>;
  assert.strictEqual(msgs2.length, 2);
  assert.strictEqual(msgs2[0].role, "system");
  assert.strictEqual(msgs2[0].content, DEFAULT_REPETITION_SANITY_INSTRUCTION);
});

test("repetition sanity retry: budget 1 falls through to next target when 2nd repetition fails", async () => {
  const combo = {
    name: "retry-b1-fallthrough",
    config: { maxRetries: 0, enableRepetitionGuard: true, repetitionRetryLimit: 1 },
    models: ["prov-b1ft/mod-a", "prov-b1ft-fb/mod-b"],
  };

  const dispatches: Array<{ modelStr: string; body: Record<string, unknown> }> = [];

  const response = await handleComboChat({
    body: { messages: [{ role: "user", content: "persistent loop" }] },
    combo,
    handleSingleModel: async (body: Record<string, unknown>, modelStr: string) => {
      dispatches.push({ modelStr, body });
      if (modelStr === "prov-b1ft/mod-a") {
        // Both attempt 1 and sanity retry fail with repetition
        return create502RepetitionResponse();
      }
      // Fallback model succeeds
      return create200SuccessResponse("Fallback response");
    },
    isModelAvailable: async () => true,
    log: createMockLog(),
    settings: null,
    allCombos: null,
  });

  assert.strictEqual(response.status, 200);
  // 2 dispatches to prov-b1ft/mod-a (initial + 1 sanity retry), then 1 to prov-b1ft-fb/mod-b
  assert.strictEqual(dispatches.length, 3);
  assert.strictEqual(dispatches[0].modelStr, "prov-b1ft/mod-a");
  assert.strictEqual(dispatches[1].modelStr, "prov-b1ft/mod-a");
  assert.strictEqual(dispatches[2].modelStr, "prov-b1ft-fb/mod-b");

  // Fallback model did NOT receive repetition sanity instruction
  const msgs3 = dispatches[2].body.messages as Array<Record<string, unknown>>;
  assert.strictEqual(msgs3.length, 1);
});

test("repetition sanity retry: budget 0 performs 0 retries and falls through immediately", async () => {
  const combo = {
    name: "retry-b0",
    config: { maxRetries: 0, enableRepetitionGuard: true, repetitionRetryLimit: 0 },
    models: ["prov-b0/mod-a", "prov-b0-fb/mod-b"],
  };

  const dispatches: string[] = [];

  const response = await handleComboChat({
    body: { messages: [{ role: "user", content: "budget 0 test" }] },
    combo,
    handleSingleModel: async (_body: Record<string, unknown>, modelStr: string) => {
      dispatches.push(modelStr);
      if (modelStr === "prov-b0/mod-a") {
        return create502RepetitionResponse();
      }
      return create200SuccessResponse("Fallback response");
    },
    isModelAvailable: async () => true,
    log: createMockLog(),
    settings: null,
    allCombos: null,
  });

  assert.strictEqual(response.status, 200);
  // Exactly 2 dispatches: 1 to target 1 (no retry), 1 to target 2
  assert.deepStrictEqual(dispatches, ["prov-b0/mod-a", "prov-b0-fb/mod-b"]);
});

test("repetition sanity retry: budget 2 retries up to 2 times on same target before falling through", async () => {
  const combo = {
    name: "retry-b2",
    config: { maxRetries: 0, enableRepetitionGuard: true, repetitionRetryLimit: 2 },
    models: ["prov-b2/mod-a", "prov-b2-fb/mod-b"],
  };

  const dispatches: string[] = [];

  const response = await handleComboChat({
    body: { messages: [{ role: "user", content: "budget 2 test" }] },
    combo,
    handleSingleModel: async (_body: Record<string, unknown>, modelStr: string) => {
      dispatches.push(modelStr);
      if (modelStr === "prov-b2/mod-a") {
        return create502RepetitionResponse();
      }
      return create200SuccessResponse("Fallback response");
    },
    isModelAvailable: async () => true,
    log: createMockLog(),
    settings: null,
    allCombos: null,
  });

  assert.strictEqual(response.status, 200);
  // 3 dispatches to prov-b2/mod-a (1 initial + 2 retries), then 1 to prov-b2-fb/mod-b
  assert.deepStrictEqual(dispatches, [
    "prov-b2/mod-a",
    "prov-b2/mod-a",
    "prov-b2/mod-a",
    "prov-b2-fb/mod-b",
  ]);
});

test("repetition sanity retry: non-repetition error (500) does NOT trigger sanity retry or consume budget", async () => {
  const combo = {
    name: "non-repetition-500",
    config: { maxRetries: 0, enableRepetitionGuard: true, repetitionRetryLimit: 1 },
    models: ["prov-500/mod-a", "prov-500-fb/mod-b"],
  };

  const dispatches: Array<{ modelStr: string; body: Record<string, unknown> }> = [];

  const response = await handleComboChat({
    body: { messages: [{ role: "user", content: "500 test" }] },
    combo,
    handleSingleModel: async (body: Record<string, unknown>, modelStr: string) => {
      dispatches.push({ modelStr, body });
      if (modelStr === "prov-500/mod-a") {
        return create500ErrorResponse();
      }
      return create200SuccessResponse("Fallback response");
    },
    isModelAvailable: async () => true,
    log: createMockLog(),
    settings: null,
    allCombos: null,
  });

  assert.strictEqual(response.status, 200);
  // Target 1 attempted once (no sanity retry on 500), then falls through to target 2
  assert.strictEqual(dispatches.length, 2);
  assert.strictEqual(dispatches[0].modelStr, "prov-500/mod-a");
  assert.strictEqual(dispatches[1].modelStr, "prov-500-fb/mod-b");

  // Neither received sanity instruction
  assert.strictEqual(
    (dispatches[0].body.messages as Array<Record<string, unknown>>).length,
    1
  );
  assert.strictEqual(
    (dispatches[1].body.messages as Array<Record<string, unknown>>).length,
    1
  );
});

test("repetition sanity retry: cancellation/abort prevents sanity retry and returns 499", async () => {
  const combo = {
    name: "cancellation-test",
    config: { maxRetries: 0, enableRepetitionGuard: true, repetitionRetryLimit: 1 },
    models: ["prov-cancel/mod-a", "prov-cancel-fb/mod-b"],
  };

  const controller = new AbortController();
  const dispatches: string[] = [];

  const response = await handleComboChat({
    body: { messages: [{ role: "user", content: "cancel test" }] },
    combo,
    signal: controller.signal,
    handleSingleModel: async (_body: Record<string, unknown>, modelStr: string) => {
      dispatches.push(modelStr);
      // Abort controller before returning repetition response
      controller.abort();
      return create502RepetitionResponse();
    },
    isModelAvailable: async () => true,
    log: createMockLog(),
    settings: null,
    allCombos: null,
  });

  assert.strictEqual(response.status, 499);
  // Dispatched only once; abort signal prevented sanity retry and stopped combo loop
  assert.strictEqual(dispatches.length, 1);
  assert.strictEqual(dispatches[0], "prov-cancel/mod-a");
});

test("repetition sanity retry: disabled guard (enableRepetitionGuard=false) performs 0 retries", async () => {
  const combo = {
    name: "guard-disabled",
    config: { maxRetries: 0, enableRepetitionGuard: false },
    models: ["prov-dis/mod-a", "prov-dis-fb/mod-b"],
  };

  const dispatches: string[] = [];

  const response = await handleComboChat({
    body: { messages: [{ role: "user", content: "guard off test" }] },
    combo,
    handleSingleModel: async (_body: Record<string, unknown>, modelStr: string) => {
      dispatches.push(modelStr);
      if (modelStr === "prov-dis/mod-a") {
        return create502RepetitionResponse();
      }
      return create200SuccessResponse("Fallback response");
    },
    isModelAvailable: async () => true,
    log: createMockLog(),
    settings: null,
    allCombos: null,
  });

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(dispatches, ["prov-dis/mod-a", "prov-dis-fb/mod-b"]);
});
