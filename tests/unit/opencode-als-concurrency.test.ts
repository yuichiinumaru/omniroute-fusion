import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { OpencodeExecutor } = await import("../../open-sse/executors/opencode.ts");

describe("OpencodeExecutor — AsyncLocalStorage Concurrency Isolation (ALS)", () => {
  it("isolates requestFormat across concurrent executions on the same executor instance", async () => {
    const executor = new OpencodeExecutor("opencode-go");
    const originalFetch = globalThis.fetch;

    const observedCalls: Array<{
      model: string;
      url: string;
      anthropicVersion?: string;
    }> = [];

    // Mock fetch with artificial jitter to interleave async execution frames
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      const urlStr = String(url);
      const headers = (options?.headers ?? {}) as Record<string, string>;
      const body = JSON.parse(String(options?.body || "{}"));
      const model = body.model;

      // Small jitter delay to simulate concurrent I/O
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 + 5));

      observedCalls.push({
        model,
        url: urlStr,
        anthropicVersion: headers["anthropic-version"],
      });

      return new Response(JSON.stringify({ id: "resp", choices: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    try {
      // Fire 20 interleaved requests of alternating formats:
      // - qwen3.7-max is registered with targetFormat: "claude" -> /messages endpoint + anthropic-version
      // - deepseek-v4-flash uses default "openai" format -> /chat/completions endpoint
      const tasks = Array.from({ length: 20 }, (_, i) => {
        const isClaude = i % 2 === 0;
        const model = isClaude ? "qwen3.7-max" : "deepseek-v4-flash";
        return executor.execute({
          model,
          stream: true,
          credentials: { apiKey: `key-${i}` },
          body: {
            model,
            stream: true,
            messages: [{ role: "user", content: `msg ${i}` }],
          },
        });
      });

      await Promise.all(tasks);

      assert.equal(observedCalls.length, 20, "all 20 requests must have dispatched");

      for (const call of observedCalls) {
        if (call.model === "qwen3.7-max") {
          assert.equal(
            call.url,
            "https://opencode.ai/zen/go/v1/messages",
            "qwen3.7-max must route to /messages under ALS isolation"
          );
          assert.equal(
            call.anthropicVersion,
            "2023-06-01",
            "qwen3.7-max must carry anthropic-version under ALS isolation"
          );
        } else if (call.model === "deepseek-v4-flash") {
          assert.equal(
            call.url,
            "https://opencode.ai/zen/go/v1/chat/completions",
            "deepseek-v4-flash must route to /chat/completions under ALS isolation"
          );
          assert.equal(
            call.anthropicVersion,
            undefined,
            "deepseek-v4-flash must not carry anthropic-version under ALS isolation"
          );
        }
      }

      // Ensure the deprecated instance field _requestFormat was not contaminated
      assert.equal(
        executor._requestFormat,
        null,
        "instance field _requestFormat should remain null during and after ALS runs"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
