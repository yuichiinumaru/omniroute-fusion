import test from "node:test";
import assert from "node:assert/strict";

const { GrokCliExecutor } = await import("@omniroute/open-sse/executors/grok-cli");

// Regression for #5273: Grok Build returns `400 'Model does not support parameter
// presencePenalty'` when clients (MiMoCode, Cursor, …) send OpenAI-style sampling
// params Grok Build cannot accept. transformRequest() must strip them before forwarding.
const UNSUPPORTED = [
  "presencePenalty",
  "frequencyPenalty",
  "logprobs",
  "topLogprobs",
  "presence_penalty",
  "frequency_penalty",
  "top_logprobs",
  "reasoning_effort",
];

test("#5273 grok-cli transformRequest strips unsupported camelCase and snake_case sampling params", () => {
  const executor = new GrokCliExecutor();
  const body = {
    model: "grok-build",
    messages: [{ role: "user", content: "hi" }],
    tools: [
      {
        type: "function",
        function: { name: "get_weather", description: "Get weather" },
      },
    ],
    temperature: 0.7,
    top_p: 0.9,
    presencePenalty: 0.5,
    frequencyPenalty: 0.3,
    logprobs: true,
    topLogprobs: 5,
    presence_penalty: 0.5,
    frequency_penalty: 0.3,
    top_logprobs: 5,
    reasoning_effort: "high",
  };

  const out = executor.transformRequest("grok-build", body, false, {} as never) as Record<
    string,
    unknown
  >;

  // Unsupported params (both camelCase and snake_case) are gone…
  for (const param of UNSUPPORTED) {
    assert.equal(param in out, false, `${param} must be stripped before forwarding to Grok Build`);
  }
  // …while supported params, tools, and messages survive untouched.
  assert.equal(out.temperature, 0.7);
  assert.equal(out.top_p, 0.9);
  assert.deepEqual(out.messages, [{ role: "user", content: "hi" }]);
  assert.deepEqual(out.tools, [
    {
      type: "function",
      function: { name: "get_weather", description: "Get weather" },
    },
  ]);
  assert.equal(out.model, "grok-build");
  assert.equal(out.stream, false);
});

test("#5273 grok-cli transformRequest leaves a clean body unchanged (no false stripping)", () => {
  const executor = new GrokCliExecutor();
  const out = executor.transformRequest(
    "grok-composer-2.5-fast",
    { messages: [{ role: "user", content: "ok" }], temperature: 1 },
    true,
    {} as never
  ) as Record<string, unknown>;

  assert.equal(out.temperature, 1);
  assert.equal(out.model, "grok-composer-2.5-fast");
  assert.equal(out.stream, true);
});
