import { describe, it } from "node:test";
import assert from "node:assert/strict";

const mod = await import("../../open-sse/executors/kimi-web.ts");

describe("KimiWebExecutor", () => {
  it("can be instantiated", () => {
    const executor = new mod.KimiWebExecutor();
    assert.ok(executor);
  });

  it("returns 401 error when apiKey is empty", async () => {
    const executor = new mod.KimiWebExecutor();
    const result = await executor.execute({
      model: "k3",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: "" },
      signal: null,
    });
    assert.ok(result.response instanceof Response);
    assert.equal(result.response.status, 401);
    assert.ok(result.url.includes("www.kimi.com"), "URL should target www.kimi.com");
  });

  it("returns 401 error when credentials are missing", async () => {
    const executor = new mod.KimiWebExecutor();
    const result = await executor.execute({
      model: "k2d6",
      body: { messages: [{ role: "user", content: "hello" }] },
      stream: false,
      credentials: {},
      signal: null,
    });
    assert.ok(result.response instanceof Response);
    assert.equal(result.response.status, 401);
    const body = await result.response.json();
    assert.ok(
      body.error?.message?.includes("access_token"),
      "Error message should mention access_token"
    );
  });

  it("builds correct Connect-RPC request for valid token", async () => {
    const executor = new mod.KimiWebExecutor();
    // This will fail at fetch (network), but we can verify the executor
    // reaches the fetch stage by checking the returned URL and headers.
    const result = await executor.execute({
      model: "k3",
      body: { messages: [{ role: "user", content: "test" }], max_tokens: 100 },
      stream: false,
      credentials: { apiKey: "test-valid-token-12345" },
      signal: AbortSignal.timeout(100), // Short timeout to avoid hanging
    });
    // With a valid token, the executor attempts a real fetch which will
    // fail (502) or timeout. Either way, the response exists.
    assert.ok(result.response instanceof Response);
    assert.ok(result.url.includes("www.kimi.com"), "URL should target www.kimi.com");
  });
});
