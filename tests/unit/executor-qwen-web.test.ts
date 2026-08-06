import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { __setTlsFetchOverrideForTesting, type TlsFetchOptions, type TlsFetchResult } from "../../open-sse/services/qwenTlsClient.ts";
import type { ExecuteInput } from "../../open-sse/executors/base.ts";
const mod = await import("../../open-sse/executors/qwen-web.ts");
const { REGISTRY } = await import("../../open-sse/config/providerRegistry.ts");
const { FREE_MODEL_BUDGETS } = await import("../../open-sse/config/freeModelCatalog.data.ts");

type TlsCall = { url: string; options: TlsFetchOptions };

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

let calls: TlsCall[] = [];

/** Build an SSE TlsFetchResult from an array of v2 "phase" delta events. */
function sseTlsResult(events: Array<Record<string, unknown>>): TlsFetchResult {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const ev of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return {
    status: 200,
    headers: new Headers({ "content-type": "text/event-stream" }),
    text: null,
    body: stream,
  };
}

function chatCreatedTlsResult(id = "chat-abc"): TlsFetchResult {
  return {
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    text: JSON.stringify({ success: true, data: { id } }),
    body: null,
  };
}

/** The 504 + HTML page Alibaba's gateway returns for the retired v1 endpoint
 *  and for WAF-blocked requests. */
function wafHtmlTlsResult(status = 504): TlsFetchResult {
  const html =
    "<html>\n<head><title>504 Gateway Time-out</title></head>\n<body>\n" +
    '<center><h1>504 Gateway Time-out</h1></center>\n<hr><center>alibaba-ga</center>\n' +
    '<meta name="aliyun_waf_aa" content="ff926c7f07e45e2e487a29a6197d3460">\n</body>\n</html>';
  return {
    status,
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: html,
    body: null,
  };
}

beforeEach(() => {
  calls = [];
  __setTlsFetchOverrideForTesting(null);
});

afterEach(() => {
  __setTlsFetchOverrideForTesting(null);
});

describe("QwenWebExecutor (v2 migration)", () => {
  it("can be instantiated", () => {
    assert.ok(new mod.QwenWebExecutor());
  });

  it("uses the v2 two-step flow: chats/new then chat/completions?chat_id=", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult("chat-xyz");
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "Hello", status: "typing" } }] },
        { choices: [{ delta: { phase: "answer", content: " world", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: "token=jwt-tok; cna=abc; ssxmod_itna=1-xyz" },
      signal: null,
    };
    const result = await executor.execute(input);

    assert.equal(calls.length, 2, "should make exactly two upstream calls");
    assert.match(calls[0].url, /\/api\/v2\/chats\/new$/);
    assert.equal(calls[0].options.method, "POST");
    assert.match(calls[1].url, /\/api\/v2\/chat\/completions\?chat_id=chat-xyz/);
    assert.equal(calls[1].options.method, "POST");

    // chats/new payload shape
    const newBody = JSON.parse(calls[0].options.body || "{}");
    assert.deepEqual(newBody.models, ["qwen3.7-max"]);
    assert.equal(newBody.chat_type, "t2t");
    assert.equal(newBody.chat_mode, "normal");

    // completion payload references the created chat_id
    const compBody = JSON.parse(calls[1].options.body || "{}");
    assert.equal(compBody.chat_id, "chat-xyz");
    assert.equal(compBody.model, "qwen3.7-max");
    assert.equal(compBody.messages[0].role, "user");
    assert.equal(compBody.messages[0].content, "hi");

    const json = (await result.response.json()) as ChatCompletionResponse;
    assert.equal(json.choices?.[0]?.message?.content, "Hello world");
  });

  it("replays the full cookie jar and the extracted bearer token on every call", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "ok", status: "finished" } }] },
      ]);
    });

    const cookieBlob = "token=jwt-secret; cna=CNA1; ssxmod_itna=1-AAA; ssxmod_itna2=1-BBB";
    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-plus",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: cookieBlob },
      signal: null,
    };
    await executor.execute(input);

    for (const call of calls) {
      const headers = (call.options.headers || {}) as Record<string, string>;
      const cookie = headers.Cookie || headers.cookie || "";
      assert.match(cookie, /cna=CNA1/, "full cookie jar must be replayed");
      assert.match(cookie, /ssxmod_itna=1-AAA/, "WAF cookies must be replayed");
      const auth = headers.Authorization || headers.authorization || "";
      assert.equal(auth, "Bearer jwt-secret", "bearer token extracted from token= cookie");
    }
  });

  it("sends the anti-bot headers required by the v2 endpoint", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "ok", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-plus",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: "token=t; cna=c" },
      signal: null,
    };
    await executor.execute(input);

    const headers = (calls[0].options.headers || {}) as Record<string, string>;
    assert.ok(headers["bx-v"], "bx-v header present");
    assert.ok(headers["bx-umidtoken"], "bx-umidtoken header present");
    assert.equal(headers.source || headers.Source, "web", "source: web header present");
  });

  it("sends the SPA version: 0.2.66 header on all requests", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "ok", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-plus",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: "token=t; cna=c" },
      signal: null,
    };
    await executor.execute(input);

    for (const call of calls) {
      const headers = (call.options.headers || {}) as Record<string, string>;
      assert.equal(headers.version, "0.2.66", "version header must be 0.2.66");
    }
  });

  it("preserves array content without turning parts into [object Object]", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "ok", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-plus",
      body: {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "hello world" },
              { type: "image_url", image_url: { url: "https://example.com/img.png" } },
            ],
          },
        ],
      },
      stream: false,
      credentials: { apiKey: "token=t; cna=c" },
      signal: null,
    };
    await executor.execute(input);

    const compBody = JSON.parse(calls[1].options.body || "{}");
    const content = compBody.messages[0].content;
    assert.ok(!content.includes("[object Object]"), "content must not contain [object Object]");
    assert.match(content, /hello world/, "text parts from array content must be preserved");
  });

  it("handles simple string content unchanged", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "ok", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-plus",
      body: { messages: [{ role: "user", content: "simple string prompt" }] },
      stream: false,
      credentials: { apiKey: "token=t; cna=c" },
      signal: null,
    };
    await executor.execute(input);

    const compBody = JSON.parse(calls[1].options.body || "{}");
    assert.equal(compBody.messages[0].content, "simple string prompt");
  });

  it("handles null and undefined content gracefully without crashing", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "ok", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-plus",
      body: {
        messages: [
          { role: "system", content: null },
          { role: "user", content: undefined },
        ],
      },
      stream: false,
      credentials: { apiKey: "token=t; cna=c" },
      signal: null,
    };
    await executor.execute(input);

    const compBody = JSON.parse(calls[1].options.body || "{}");
    assert.equal(compBody.messages[0].content, "");
  });

  it("maps the thinking phase to reasoning_content, not the answer content", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "think", content: "let me think", status: "typing" } }] },
        { choices: [{ delta: { phase: "think", content: "...", status: "finished" } }] },
        { choices: [{ delta: { phase: "answer", content: "Final answer", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: "token=t; cna=c" },
      signal: null,
    };
    const result = await executor.execute(input);

    const json = (await result.response.json()) as ChatCompletionResponse;
    assert.equal(json.choices?.[0]?.message?.content, "Final answer");
    assert.ok(
      !String(json.choices?.[0]?.message?.content).includes("let me think"),
      "thinking content must not leak into the answer"
    );
  });

  it("classifies the retired-v1 / WAF 504 HTML page as a clear auth error (not raw HTML)", async () => {
    __setTlsFetchOverrideForTesting(async (url: string) => {
      if (String(url).includes("/api/v2/chats/new")) return wafHtmlTlsResult(504);
      return chatCreatedTlsResult();
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: "token=stale; cna=c" },
      signal: null,
    };
    const result = await executor.execute(input);

    assert.ok([401, 403].includes(result.response.status), "should map to an auth status");
    const json = (await result.response.json()) as ChatCompletionResponse;
    const msg = String(json.error?.message || "");
    assert.ok(!msg.includes("<html"), "raw HTML must not be returned to the client");
    assert.match(msg, /session|expired|WAF|re-?login|cookie/i, "actionable error message");
  });

  it("streams answer-phase content as OpenAI chat.completion.chunk deltas", async () => {
    __setTlsFetchOverrideForTesting(async (url: string) => {
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "Hi", status: "typing" } }] },
        { choices: [{ delta: { phase: "answer", content: " there", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: "token=t; cna=c" },
      signal: null,
    };
    const result = await executor.execute(input);

    const text = await result.response.text();
    assert.match(text, /chat\.completion\.chunk/);
    assert.match(text, /"content":"Hi"/);
    assert.match(text, /"content":" there"/);
    assert.match(text, /data: \[DONE\]/);
  });

  it("accepts a bare token (back-compat) without a cookie jar", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "ok", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3.7-plus",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: "barejwttoken" },
      signal: null,
    };
    await executor.execute(input);

    const headers = (calls[0].options.headers || {}) as Record<string, string>;
    assert.equal(headers.Authorization || headers.authorization, "Bearer barejwttoken");
  });

  it("registry points at the v2 endpoint and the current model catalog", () => {
    const provider = REGISTRY["qwen-web"];
    assert.ok(provider, "qwen-web must be registered");
    assert.match(provider.baseUrl, /\/api\/v2\/chat\/completions$/, "registry must use v2 endpoint");
    const ids = provider.models.map((m) => m.id);
    assert.deepEqual(ids.sort(), ["qwen3.6-plus", "qwen3.7-max", "qwen3.7-plus"]);
  });

  it("free-model catalog lists the current qwen-web ids (not the retired ones)", () => {
    const qwenModels = FREE_MODEL_BUDGETS.filter((m) => m.provider === "qwen-web");
    const ids = qwenModels.map((m) => m.modelId);
    assert.ok(ids.includes("qwen3.7-max"), "catalog must list qwen3.7-max");
    assert.ok(!ids.includes("qwen-plus"), "retired qwen-plus must be gone");
    assert.ok(
      qwenModels.every((m) => m.freeType !== "discontinued"),
      "qwen-web is no longer discontinued after the v2 migration"
    );
  });

  it("maps legacy model ids to the current upstream catalog", async () => {
    __setTlsFetchOverrideForTesting(async (url: string, options: TlsFetchOptions) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/api/v2/chats/new")) return chatCreatedTlsResult();
      return sseTlsResult([
        { choices: [{ delta: { phase: "answer", content: "ok", status: "finished" } }] },
      ]);
    });

    const executor = new mod.QwenWebExecutor();
    const input: ExecuteInput = {
      model: "qwen3-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: "token=t; cna=c" },
      signal: null,
    };
    await executor.execute(input);

    const newBody = JSON.parse(calls[0].options.body || "{}");
    assert.match(newBody.models[0], /^qwen3\.[67]-/, "legacy qwen3-max maps to a current model id");
  });

  describe("parseSseDelta phase mapping", () => {
    it("maps thinking_summary and think phases to kind: think", () => {
      const line1 = 'data: {"choices":[{"delta":{"phase":"thinking_summary","content":"reasoning summary"}}]}';
      const line2 = 'data: {"choices":[{"delta":{"phase":"think","content":"deep thought"}}]}';
      assert.deepEqual(mod.parseSseDelta(line1), { kind: "think", text: "reasoning summary" });
      assert.deepEqual(mod.parseSseDelta(line2), { kind: "think", text: "deep thought" });
    });

    it("maps answer, null, and undefined phases to kind: answer", () => {
      const lineAnswer = 'data: {"choices":[{"delta":{"phase":"answer","content":"hello"}}]}';
      const lineNull = 'data: {"choices":[{"delta":{"phase":null,"content":"hello null"}}]}';
      const lineUndefined = 'data: {"choices":[{"delta":{"content":"hello undefined"}}]}';

      assert.deepEqual(mod.parseSseDelta(lineAnswer), { kind: "answer", text: "hello" });
      assert.deepEqual(mod.parseSseDelta(lineNull), { kind: "answer", text: "hello null" });
      assert.deepEqual(mod.parseSseDelta(lineUndefined), { kind: "answer", text: "hello undefined" });
    });

    it("returns null for non-data lines, [DONE], malformed JSON, and unknown phases", () => {
      assert.equal(mod.parseSseDelta("event: ping"), null);
      assert.equal(mod.parseSseDelta("data: [DONE]"), null);
      assert.equal(mod.parseSseDelta("data: "), null);
      assert.equal(mod.parseSseDelta("data: {invalid json}"), null);
      assert.equal(mod.parseSseDelta('data: {"choices":[{"delta":{"phase":"unrecognized_phase","content":"test"}}]}'), null);
      assert.equal(mod.parseSseDelta('data: {"other_shape": true}'), null);
    });
  });
});
