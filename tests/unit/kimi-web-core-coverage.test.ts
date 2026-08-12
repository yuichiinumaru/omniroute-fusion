import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  KimiWebExecutor,
  frameConnectMessage,
  decodeConnectFrame,
} from "../../open-sse/executors/kimi-web.ts";
import { validateKimiWebProvider } from "../../src/lib/providers/validation/webProvidersA.ts";

async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

describe("KimiWebExecutor - Core Coverage (Mocked Connect-RPC)", () => {
  it("non-stream response extraction with Connect-RPC frame and request assertion", async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockFrame = frameConnectMessage({ content: "Hello from mocked Connect-RPC!" });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedOptions = init;
      return new Response(mockFrame, {
        status: 200,
        headers: { "Content-Type": "application/connect+json" },
      });
    }) as typeof fetch;

    try {
      const executor = new KimiWebExecutor();
      const result = await executor.execute({
        model: "k3",
        body: { messages: [{ role: "user", content: "hello world" }] },
        stream: false,
        credentials: { apiKey: "test-access-token-999" },
        signal: null,
      });

      // Assert request URL and headers
      assert.equal(capturedUrl, "https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat");
      assert.ok(capturedOptions, "Request init options should be captured");
      const headers = capturedOptions.headers as Record<string, string>;
      assert.equal(headers["Content-Type"], "application/connect+json");
      assert.equal(headers["Connect-Protocol-Version"], "1");
      assert.equal(headers["Authorization"], "Bearer test-access-token-999");
      assert.equal(headers["Origin"], "https://www.kimi.com");

      // Assert request body Connect-RPC frame
      const reqBodyBytes = capturedOptions.body as Uint8Array;
      assert.ok(reqBodyBytes instanceof Uint8Array, "Request body should be Uint8Array frame");
      const decodedReqPayload = decodeConnectFrame(reqBodyBytes) as Record<string, unknown>;
      assert.ok(decodedReqPayload, "Request body frame should decode");
      assert.equal(decodedReqPayload.model, "k3");
      assert.equal(decodedReqPayload.mode, "chat");
      assert.equal(decodedReqPayload.stream, false);

      // Assert response
      assert.equal(result.response.status, 200);
      assert.equal(result.url, "https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat");
      const resBody = (await result.response.json()) as {
        choices: Array<{ message: { content: string; role: string }; finish_reason: string }>;
        model: string;
      };
      assert.equal(resBody.model, "k3");
      assert.equal(resBody.choices[0].message.role, "assistant");
      assert.equal(resBody.choices[0].message.content, "Hello from mocked Connect-RPC!");
      assert.equal(resBody.choices[0].finish_reason, "stop");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("non-stream response extraction with nested message object content", async () => {
    const originalFetch = globalThis.fetch;
    const mockFrame = frameConnectMessage({ message: { content: "Nested message payload" } });

    globalThis.fetch = (async () => {
      return new Response(mockFrame, {
        status: 200,
        headers: { "Content-Type": "application/connect+json" },
      });
    }) as typeof fetch;

    try {
      const executor = new KimiWebExecutor();
      const result = await executor.execute({
        model: "k2d6",
        body: { messages: [{ role: "user", content: "nested test" }] },
        stream: false,
        credentials: { apiKey: "test-access-token-999" },
        signal: null,
      });

      assert.equal(result.response.status, 200);
      const resBody = (await result.response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      assert.equal(resBody.choices[0].message.content, "Nested message payload");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("non-stream response decode failure returns 502 error", async () => {
    const originalFetch = globalThis.fetch;
    // Malformed Connect-RPC frame (short envelope)
    const malformedFrame = new Uint8Array([0, 0, 0, 0, 10, 1, 2, 3]);

    globalThis.fetch = (async () => {
      return new Response(malformedFrame, {
        status: 200,
        headers: { "Content-Type": "application/connect+json" },
      });
    }) as typeof fetch;

    try {
      const executor = new KimiWebExecutor();
      const result = await executor.execute({
        model: "k3",
        body: { messages: [{ role: "user", content: "malformed" }] },
        stream: false,
        credentials: { apiKey: "test-access-token-999" },
        signal: null,
      });

      assert.equal(result.response.status, 502);
      const resBody = (await result.response.json()) as { error: { message: string } };
      assert.ok(
        resBody.error.message.includes("Failed to decode Kimi response frame"),
        "Error message should indicate frame decode failure"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("multiple streaming frames converted to SSE deltas plus [DONE]", async () => {
    const originalFetch = globalThis.fetch;
    const frame1 = frameConnectMessage({ content: "Hello " });
    const frame2 = frameConnectMessage({ delta: { content: "world!" } });

    // Combine frames into a single Uint8Array payload for stream
    const combinedBytes = new Uint8Array(frame1.length + frame2.length);
    combinedBytes.set(frame1, 0);
    combinedBytes.set(frame2, frame1.length);

    globalThis.fetch = (async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(combinedBytes);
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "application/connect+json" },
      });
    }) as typeof fetch;

    try {
      const executor = new KimiWebExecutor();
      const result = await executor.execute({
        model: "k3",
        body: { messages: [{ role: "user", content: "stream test" }] },
        stream: true,
        credentials: { apiKey: "test-access-token-999" },
        signal: null,
      });

      assert.equal(result.response.status, 200);
      assert.equal(result.response.headers.get("Content-Type"), "text/event-stream");

      const sseText = await readStreamToString(result.response.body as ReadableStream<Uint8Array>);

      assert.ok(sseText.includes('data: {"id":"chatcmpl-kimi-'), "Should contain chatcmpl chunk");
      assert.ok(sseText.includes('"content":"Hello "'), "Should contain first delta");
      assert.ok(sseText.includes('"content":"world!"'), "Should contain second delta");
      assert.ok(sseText.endsWith("data: [DONE]\n\n"), "Should end with [DONE]");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("aborted stream suppresses misleading [DONE]", async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();
    const frame1 = frameConnectMessage({ content: "Partial response " });

    globalThis.fetch = (async () => {
      const stream = new ReadableStream({
        start(streamController) {
          streamController.enqueue(frame1);
          // Abort signal right after first chunk
          controller.abort();
          streamController.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "application/connect+json" },
      });
    }) as typeof fetch;

    try {
      const executor = new KimiWebExecutor();
      const result = await executor.execute({
        model: "k3",
        body: { messages: [{ role: "user", content: "abort test" }] },
        stream: true,
        credentials: { apiKey: "test-access-token-999" },
        signal: controller.signal,
      });

      assert.equal(result.response.status, 200);
      const sseText = await readStreamToString(result.response.body as ReadableStream<Uint8Array>);

      assert.ok(sseText.includes('"content":"Partial response "'), "Should emit partial delta");
      assert.ok(!sseText.includes("data: [DONE]\n\n"), "Should NOT emit [DONE] when stream is aborted");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("HTTP non-OK response returns sanitized error", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      return new Response("Rate limit exceeded", { status: 429 });
    }) as typeof fetch;

    try {
      const executor = new KimiWebExecutor();
      const result = await executor.execute({
        model: "k3",
        body: { messages: [{ role: "user", content: "rate limit test" }] },
        stream: false,
        credentials: { apiKey: "test-access-token-999" },
        signal: null,
      });

      assert.equal(result.response.status, 429);
      const resBody = (await result.response.json()) as { error: { message: string } };
      assert.equal(resBody.error.message, "Kimi error: Rate limit exceeded");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetch rejection maps to 502 path", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      throw new Error("DNS resolution failed");
    }) as typeof fetch;

    try {
      const executor = new KimiWebExecutor();
      const result = await executor.execute({
        model: "k3",
        body: { messages: [{ role: "user", content: "fetch rejection test" }] },
        stream: false,
        credentials: { apiKey: "test-access-token-999" },
        signal: null,
      });

      assert.equal(result.response.status, 502);
      const resBody = (await result.response.json()) as { error: { message: string } };
      assert.equal(resBody.error.message, "Kimi fetch failed: DNS resolution failed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("validateKimiWebProvider - Core Coverage (Mocked)", () => {
  it("returns error when apiKey is missing or empty", async () => {
    const res1 = await validateKimiWebProvider({ apiKey: "" });
    assert.equal(res1.valid, false);
    assert.ok(res1.error?.includes("Missing Kimi access_token"));

    const res2 = await validateKimiWebProvider({});
    assert.equal(res2.valid, false);
    assert.ok(res2.error?.includes("Missing Kimi access_token"));
  });

  it("returns error when HTTP 401 or 403 returned by user probe", async () => {
    const originalFetch = globalThis.fetch;
    let probedUrl = "";
    let authHeader = "";

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      probedUrl = String(input);
      const headers = (init?.headers || {}) as Record<string, string>;
      authHeader = headers["Authorization"] || "";
      return new Response("Unauthorized", { status: 401 });
    }) as typeof fetch;

    try {
      const res = await validateKimiWebProvider({ apiKey: "expired-token-123" });
      assert.equal(probedUrl, "https://www.kimi.com/api/user");
      assert.equal(authHeader, "Bearer expired-token-123");
      assert.equal(res.valid, false);
      assert.equal(res.error, "Kimi access token is invalid or expired");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns error when HTTP 500 returned by user probe", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      return new Response("Internal Server Error Details", { status: 500 });
    }) as typeof fetch;

    try {
      const res = await validateKimiWebProvider({ apiKey: "token-500" });
      assert.equal(res.valid, false);
      assert.equal(res.error, "Kimi validation failed (HTTP 500): Internal Server Error Details");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns valid true when user probe succeeds with 200 OK", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ user: { id: "user_123" } }), { status: 200 });
    }) as typeof fetch;

    try {
      const res = await validateKimiWebProvider({ apiKey: "valid-token-123" });
      assert.equal(res.valid, true);
      assert.equal(res.error, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns validation error result when user probe fetch throws", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      throw new Error("Connection reset by peer");
    }) as typeof fetch;

    try {
      const res = await validateKimiWebProvider({ apiKey: "valid-token-123" });
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes("Connection reset by peer"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
