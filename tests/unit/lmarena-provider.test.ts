/**
 * LMArena Provider — Unit Tests (Phase 2A of issue #3368)
 *
 * Run: node --import tsx/esm --test tests/unit/lmarena-provider.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WEB_COOKIE_PROVIDERS } from "../../src/shared/constants/providers.ts";
import {
  getWebSessionCredentialRequirement,
  requiresWebSessionCredential,
  hasUsableWebSessionCredential,
} from "../../src/shared/providers/webSessionCredentials.ts";
import { LMArenaExecutor, parseArenaSSE } from "../../open-sse/executors/lmarena.ts";
import { __setTlsFetchOverrideForTesting } from "../../open-sse/services/lmarenaTlsClient.ts";

describe("LMArena Provider Definition", () => {
  it("is registered in WEB_COOKIE_PROVIDERS", () => {
    assert.ok(WEB_COOKIE_PROVIDERS.lmarena, "lmarena should be in WEB_COOKIE_PROVIDERS");
    assert.equal(WEB_COOKIE_PROVIDERS.lmarena.id, "lmarena");
    assert.equal(WEB_COOKIE_PROVIDERS.lmarena.alias, "lma");
    assert.equal(WEB_COOKIE_PROVIDERS.lmarena.name, "LMArena (Free)");
    assert.equal(WEB_COOKIE_PROVIDERS.lmarena.website, "https://lmarena.ai");
    assert.equal(WEB_COOKIE_PROVIDERS.lmarena.hasFree, true);
    assert.equal(WEB_COOKIE_PROVIDERS.lmarena.riskNoticeVariant, "webCookie");
  });

  it("has correct metadata", () => {
    const provider = WEB_COOKIE_PROVIDERS.lmarena;
    assert.ok(provider.freeNote, "Should have freeNote");
    assert.ok(provider.authHint, "Should have authHint");
    assert.ok(provider.icon, "Should have icon");
    assert.ok(provider.color, "Should have color");
    assert.ok(provider.textIcon, "Should have textIcon");
  });
});

describe("LMArena Credential Requirements", () => {
  it("requires web session credential", () => {
    assert.equal(requiresWebSessionCredential("lmarena"), true);
  });

  it("has correct credential requirement", () => {
    const req = getWebSessionCredentialRequirement("lmarena");
    assert.ok(req, "Should have credential requirement");
    assert.equal(req.kind, "cookie");
    // #3810: lmarena.ai's real auth cookie is `arena-auth-prod-v1`, not `session`
    assert.equal(req.credentialName, "arena-auth-prod-v1");
    assert.ok(req.placeholder.includes("arena-auth-prod-v1"));
    assert.ok(req.placeholder.includes("lmarena.ai"));
    assert.equal(req.acceptsFullCookieHeader, true);
    assert.ok(req.storageKeys.includes("cookie"));
    assert.ok(req.storageKeys.includes("arena-auth-prod-v1"));
    // legacy `session` key retained for back-compat with already-saved credentials
    assert.ok(req.storageKeys.includes("session"));
  });

  it("validates usable credentials correctly", () => {
    assert.equal(hasUsableWebSessionCredential("lmarena", { cookie: "session=abc123" }), true);
    assert.equal(hasUsableWebSessionCredential("lmarena", { session: "abc123" }), true);
    assert.equal(hasUsableWebSessionCredential("lmarena", { cookie: "" }), false);
    assert.equal(hasUsableWebSessionCredential("lmarena", {}), false);
  });
});

describe("LMArena Executor", () => {
  it("can be instantiated", () => {
    const executor = new LMArenaExecutor();
    assert.ok(executor, "Executor should be instantiated");
  });

  it("has correct provider ID", () => {
    const executor = new LMArenaExecutor();
    assert.equal((executor as any).provider, "lmarena");
  });

  it("builds correct URL (arena.ai/nextjs-api/stream/create-evaluation)", () => {
    const executor = new LMArenaExecutor();
    const url = (executor as any).buildUrl("gpt-4");
    assert.ok(url.includes("arena.ai"), "URL should include arena.ai");
    assert.ok(url.includes("/nextjs-api/stream/create-evaluation"), "URL should include /nextjs-api/stream/create-evaluation");
  });

  it("builds headers with cookie", () => {
    const executor = new LMArenaExecutor();
    const headers = (executor as any).buildHeaders("gpt-4", { cookie: "session=abc123" }, {});
    assert.ok(headers.Cookie, "Should have Cookie header");
    assert.equal(headers.Cookie, "session=abc123");
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(headers.Accept, "text/event-stream");
  });

  it("builds headers without cookie when not provided", () => {
    const executor = new LMArenaExecutor();
    const headers = (executor as any).buildHeaders("gpt-4", {}, {});
    assert.ok(!headers.Cookie, "Should not have Cookie header when no cookie provided");
  });

  it("reads cookie from credentials correctly", () => {
    const executor = new LMArenaExecutor();

    // Direct cookie field
    let headers = (executor as any).buildHeaders("gpt-4", { cookie: "session=abc" }, {});
    assert.equal(headers.Cookie, "session=abc");

    // apiKey field (dashboard form)
    headers = (executor as any).buildHeaders("gpt-4", { apiKey: "session=def" }, {});
    assert.equal(headers.Cookie, "session=def");

    // providerSpecificData.cookie
    headers = (executor as any).buildHeaders(
      "gpt-4",
      { providerSpecificData: { cookie: "session=ghi" } },
      {}
    );
    assert.equal(headers.Cookie, "session=ghi");

    // Priority: direct > apiKey > providerSpecificData
    headers = (executor as any).buildHeaders(
      "gpt-4",
      { cookie: "session=abc", apiKey: "session=def" },
      {}
    );
    assert.equal(headers.Cookie, "session=abc");
  });

  it("parses LMArena SSE text events (a0: prefix)", () => {
    const textEvent = 'a0:{"text":"Hello, world!"}';
    const result = parseArenaSSE(textEvent);

    assert.ok(result, "Should parse text event");
    assert.equal(result.type, "text");
    assert.equal(result.content, "Hello, world!");
  });

  it("parses LMArena SSE thinking events (ag: prefix)", () => {
    const thinkingEvent = 'ag:{"thinking":"Let me analyze this..."}';
    const result = parseArenaSSE(thinkingEvent);

    assert.ok(result, "Should parse thinking event");
    assert.equal(result.type, "thinking");
    assert.equal(result.content, "Let me analyze this...");
  });

  it("parses LMArena SSE error events (a3: and ae: prefixes)", () => {
    const errorEvent1 = 'a3:{"error":"Rate limit exceeded"}';
    const result1 = parseArenaSSE(errorEvent1);
    assert.ok(result1, "Should parse a3: error event");
    assert.equal(result1.type, "error");
    assert.equal(result1.content, "Rate limit exceeded");

    const errorEvent2 = 'ae:{"error":"Invalid session"}';
    const result2 = parseArenaSSE(errorEvent2);
    assert.ok(result2, "Should parse ae: error event");
    assert.equal(result2.type, "error");
    assert.equal(result2.content, "Invalid session");
  });

  it("parses LMArena SSE done event (ad: prefix)", () => {
    const doneEvent = "ad:{}";
    const result = parseArenaSSE(doneEvent);

    assert.ok(result, "Should parse done event");
    assert.equal(result.type, "done");
  });

  it("handles malformed SSE events gracefully", () => {
    const malformedEvent = "invalid:data";
    const result = parseArenaSSE(malformedEvent);

    assert.equal(result, null, "Should return null for malformed events");
  });

  it("transforms OpenAI messages to create-evaluation format", () => {
    const executor = new LMArenaExecutor();
    const transformRequest = (executor as any).transformRequest.bind(executor);

    const openaiBody = {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello!" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ],
    };

    const arenaBody = transformRequest("gpt-4", openaiBody);

    assert.ok(arenaBody, "Should transform request body");
    assert.equal(arenaBody.mode, "direct-battle", "Should have mode direct-battle");
    assert.equal(arenaBody.modelAId, "gpt-4", "Should set modelAId");
    assert.equal(arenaBody.modality, "chat", "Should have modality chat");
    assert.ok(arenaBody.id, "Should have id");
    assert.ok(arenaBody.userMessageId, "Should have userMessageId");
    assert.ok(arenaBody.modelAMessageId, "Should have modelAMessageId");
    assert.ok(arenaBody.userMessage, "Should have userMessage");
    assert.ok(arenaBody.userMessage.content.length > 0, "userMessage.content should not be empty");
  });

  it("returns 401 when cookie is missing", async () => {
    const executor = new LMArenaExecutor();

    const result = await executor.execute({
      model: "gpt-4",
      body: { messages: [{ role: "user", content: "Hello" }] },
      stream: false,
      credentials: {},
      signal: new AbortController().signal,
      log: console,
    });

    assert.equal(result.response.status, 401, "Should return 401 for missing cookie");
    const errorBody = await result.response.json();
    assert.ok(errorBody.error, "Should have error object");
    assert.ok(errorBody.error.message.includes("cookie"), "Error should mention cookie");
  });

  it("handles streaming response correctly via TLS mock", async () => {
    const mockSSE = '0:{"text":"Hello"}\n0:{"text":", world!"}\nd:{}\n';

    __setTlsFetchOverrideForTesting(async () => ({
      status: 200,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      text: mockSSE,
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute({
        model: "gpt-4",
        body: { messages: [{ role: "user", content: "Hello" }], stream: true },
        stream: true,
        credentials: { cookie: "session=test" } as any,
        signal: new AbortController().signal,
        log: console,
      });

      assert.equal(result.response.status, 200, "Should return 200 for successful streaming");
      assert.ok(result.response.body, "Should have response body for streaming");
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });

  it("handles error response from LMArena API via TLS mock", async () => {
    __setTlsFetchOverrideForTesting(async () => ({
      status: 429,
      headers: new Headers({ "Content-Type": "application/json" }),
      text: JSON.stringify({ error: { message: "Rate limit exceeded" } }),
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute({
        model: "gpt-4",
        body: { messages: [{ role: "user", content: "Hello" }] },
        stream: false,
        credentials: { cookie: "session=test" } as any,
        signal: new AbortController().signal,
        log: console,
      });

      assert.equal(result.response.status, 429, "Should return 429 for rate limit");
      const errorBody = await result.response.json();
      assert.ok(errorBody.error, "Should have error object");
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });
});
