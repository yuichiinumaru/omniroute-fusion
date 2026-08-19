import test from "node:test";
import assert from "node:assert/strict";

const { GrokCliExecutor } = await import("@omniroute/open-sse/executors/grok-cli");

function installUpstreamCapture() {
  let capturedBody: Record<string, unknown> | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL | string, init: RequestInit = {}) => {
    try {
      capturedBody = JSON.parse(String(init.body));
    } catch {
      capturedBody = null;
    }
    return new Response(JSON.stringify({ id: "resp_test_123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  return {
    getCapturedBody: () => capturedBody,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

test("grok-4.6 with no reasoning in request receives reasoning: { effort: 'high' } default", async () => {
  const executor = new GrokCliExecutor();
  const capture = installUpstreamCapture();

  try {
    await executor.execute({
      model: "grok-4.6",
      body: { input: [{ type: "message", role: "user", content: "hi" }] },
      stream: false,
      credentials: { accessToken: "sk-test-token" } as never,
      log: { debug() {}, info() {}, warn() {}, error() {} } as never,
    });

    const body = capture.getCapturedBody();
    assert.ok(body, "expected upstream request body");
    assert.equal(body.model, "grok-4.6");
    assert.deepEqual(body.reasoning, { effort: "high" });
  } finally {
    capture.restore();
  }
});

test("grok-4.5 with no reasoning in request maintains reasoning: { effort: 'high' } default (regression)", async () => {
  const executor = new GrokCliExecutor();
  const capture = installUpstreamCapture();

  try {
    await executor.execute({
      model: "grok-4.5",
      body: { input: [{ type: "message", role: "user", content: "hi" }] },
      stream: false,
      credentials: { accessToken: "sk-test-token" } as never,
      log: { debug() {}, info() {}, warn() {}, error() {} } as never,
    });

    const body = capture.getCapturedBody();
    assert.ok(body, "expected upstream request body");
    assert.equal(body.model, "grok-4.5");
    assert.deepEqual(body.reasoning, { effort: "high" });
  } finally {
    capture.restore();
  }
});

test("grok-4.6 with explicit low, medium, or high preserves reasoning effort exactly", async () => {
  const executor = new GrokCliExecutor();
  const efforts = ["low", "medium", "high"] as const;

  for (const effort of efforts) {
    const capture = installUpstreamCapture();
    try {
      await executor.execute({
        model: "grok-4.6",
        body: {
          input: [{ type: "message", role: "user", content: "hi" }],
          reasoning: { effort },
        },
        stream: false,
        credentials: { accessToken: "sk-test-token" } as never,
        log: { debug() {}, info() {}, warn() {}, error() {} } as never,
      });

      const body = capture.getCapturedBody();
      assert.ok(body, "expected upstream request body");
      assert.equal(body.model, "grok-4.6");
      assert.deepEqual(body.reasoning, { effort });
    } finally {
      capture.restore();
    }
  }
});

test("grok-4.6 with explicit unsupported effort (max, xhigh) drops reasoning and does NOT substitute high", async () => {
  const executor = new GrokCliExecutor();
  const invalidEfforts = ["max", "xhigh"];

  for (const effort of invalidEfforts) {
    const capture = installUpstreamCapture();
    try {
      await executor.execute({
        model: "grok-4.6",
        body: {
          input: [{ type: "message", role: "user", content: "hi" }],
          reasoning: { effort },
        },
        stream: false,
        credentials: { accessToken: "sk-test-token" } as never,
        log: { debug() {}, info() {}, warn() {}, error() {} } as never,
      });

      const body = capture.getCapturedBody();
      assert.ok(body, "expected upstream request body");
      assert.equal(body.model, "grok-4.6");
      assert.equal("reasoning" in body, false, `explicit invalid effort '${effort}' must drop reasoning`);
    } finally {
      capture.restore();
    }
  }
});

test("grok-composer-2.5-fast with no effort receives no reasoning object at all", async () => {
  const executor = new GrokCliExecutor();
  const capture = installUpstreamCapture();

  try {
    await executor.execute({
      model: "grok-composer-2.5-fast",
      body: { input: [{ type: "message", role: "user", content: "hi" }] },
      stream: false,
      credentials: { accessToken: "sk-test-token" } as never,
      log: { debug() {}, info() {}, warn() {}, error() {} } as never,
    });

    const body = capture.getCapturedBody();
    assert.ok(body, "expected upstream request body");
    assert.equal(body.model, "grok-composer-2.5-fast");
    assert.equal("reasoning" in body, false, "composer model must not carry reasoning");
  } finally {
    capture.restore();
  }
});

test("grok-4.6 with snake_case reasoning_effort has reasoning_effort stripped and gets default reasoning: { effort: 'high' }", async () => {
  const executor = new GrokCliExecutor();
  const capture = installUpstreamCapture();

  try {
    await executor.execute({
      model: "grok-4.6",
      body: {
        input: [{ type: "message", role: "user", content: "hi" }],
        reasoning_effort: "high",
      },
      stream: false,
      credentials: { accessToken: "sk-test-token" } as never,
      log: { debug() {}, info() {}, warn() {}, error() {} } as never,
    });

    const body = capture.getCapturedBody();
    assert.ok(body, "expected upstream request body");
    assert.equal("reasoning_effort" in body, false, "snake_case reasoning_effort must be stripped");
    assert.deepEqual(body.reasoning, { effort: "high" });
  } finally {
    capture.restore();
  }
});
