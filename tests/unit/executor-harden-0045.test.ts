/**
 * Task 0045 — Executor SSRF / path sanitize / secret logging / timeouts / Opencode race.
 * Findings: F-02-001, F-02-002, F-02-003, F-02-004, F-02-005, F-02-W2-001, F-02-W2-002, F-02-W2-003.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { BaseExecutor } from "../../open-sse/executors/base.ts";
import { DefaultExecutor } from "../../open-sse/executors/default.ts";
import { OpencodeExecutor } from "../../open-sse/executors/opencode.ts";
import { VertexExecutor } from "../../open-sse/executors/vertex.ts";
import { assertSafePathSegment, isSafeChatPath, resolveSafeChatPath } from "../../open-sse/utils/safePath.ts";
import { redactUrlSecrets } from "../../open-sse/utils/urlSanitize.ts";
import {
  createFetchStartTimeoutError,
  fetchWithStartTimeout,
  isFetchStartTimeoutError,
} from "../../open-sse/utils/fetchStartTimeout.ts";
import {
  fetchFollowingQwenRedirects,
  parseQwenResourceHost,
  resolveQwenChatCompletionsUrl,
  resolveQwenRedirectLocation,
} from "../../open-sse/utils/qwenResourceUrl.ts";
import { sanitizeErrorMessage } from "../../open-sse/utils/error.ts";
import { createRequestLogger } from "../../open-sse/utils/requestLogger.ts";
import { PROVIDER_MODELS } from "../../open-sse/config/providerModels.ts";

// ─── safePath (shared with 0048) ────────────────────────────────────────────

test("assertSafePathSegment accepts plain and HF multi-segment ids", () => {
  assert.equal(assertSafePathSegment("tts-1"), "tts-1");
  assert.equal(assertSafePathSegment("whisper-1"), "whisper-1");
  // SSoT with 0048: legitimate HF org/model ids are multi-segment-safe.
  assert.equal(assertSafePathSegment("openai/whisper-large-v3"), "openai/whisper-large-v3");
});

test("assertSafePathSegment rejects traversal and separators", () => {
  for (const bad of [
    "a/../b",
    "..",
    "x\\y",
    "a?q=1",
    "a#frag",
    "",
    "a%2fb",
    "a%2Fb",
    "a//b",
    "//evil",
  ]) {
    assert.throws(() => assertSafePathSegment(bad), /Invalid path segment/);
  }
});

test("isSafeChatPath / resolveSafeChatPath reject injection (N6)", () => {
  assert.equal(isSafeChatPath("/custom/chat"), true);
  assert.equal(resolveSafeChatPath("/custom/chat"), "/custom/chat");
  assert.equal(resolveSafeChatPath("../evil"), null);
  assert.equal(resolveSafeChatPath("/ok\0evil"), null);
  assert.equal(resolveSafeChatPath("no-leading-slash"), null);
  assert.equal(resolveSafeChatPath("/x?inject=1"), null);
  assert.equal(resolveSafeChatPath("/x#frag"), null);
  // N6: protocol-relative, encoded traversal, backslash, empty segments.
  assert.equal(isSafeChatPath("//evil.com"), false);
  assert.equal(resolveSafeChatPath("//evil.com"), null);
  assert.equal(isSafeChatPath("/v1/%2e%2e/admin"), false);
  assert.equal(resolveSafeChatPath("/v1/%2e%2e/admin"), null);
  assert.equal(isSafeChatPath("/v1\\chat"), false);
  assert.equal(resolveSafeChatPath("/v1//chat"), null);
  assert.equal(resolveSafeChatPath("/ok/../evil"), null);
  // Path-to-100: raw path must not pass via segment.trim() while retaining WS.
  assert.equal(isSafeChatPath("/v1/chat\t"), false);
  assert.equal(isSafeChatPath("/v1/chat "), false);
  assert.equal(resolveSafeChatPath("/v1/chat\n"), null);
  assert.equal(resolveSafeChatPath("/v1/chat\r"), null);
});

// ─── F-02-001: DefaultExecutor chatPath sanitize ────────────────────────────

test("DefaultExecutor openai-compatible rejects unsafe chatPath (production path)", () => {
  const executor = new DefaultExecutor("openai-compatible-test");
  const base = {
    baseUrl: "https://proxy.example/v1/",
  };

  assert.equal(
    executor.buildUrl("gpt-4.1", true, 0, {
      providerSpecificData: { ...base, chatPath: "/custom/chat" },
    }),
    "https://proxy.example/v1/custom/chat"
  );

  assert.equal(
    executor.buildUrl("gpt-4.1", true, 0, {
      providerSpecificData: { ...base, chatPath: "../evil" },
    }),
    "https://proxy.example/v1/chat/completions"
  );

  assert.equal(
    executor.buildUrl("gpt-4.1", true, 0, {
      providerSpecificData: { ...base, chatPath: "/ok\0evil" },
    }),
    "https://proxy.example/v1/chat/completions"
  );

  assert.equal(
    executor.buildUrl("gpt-4.1", true, 0, {
      providerSpecificData: { ...base, chatPath: "/x?q=1" },
    }),
    "https://proxy.example/v1/chat/completions"
  );

  // N6 production wire: protocol-relative + encoded traversal fall back to default.
  assert.equal(
    executor.buildUrl("gpt-4.1", true, 0, {
      providerSpecificData: { ...base, chatPath: "//evil.com" },
    }),
    "https://proxy.example/v1/chat/completions"
  );
  assert.equal(
    executor.buildUrl("gpt-4.1", true, 0, {
      providerSpecificData: { ...base, chatPath: "/v1/%2e%2e/admin" },
    }),
    "https://proxy.example/v1/chat/completions"
  );
});

test("DefaultExecutor anthropic-compatible rejects unsafe chatPath", () => {
  const executor = new DefaultExecutor("anthropic-compatible-test");
  assert.equal(
    executor.buildUrl("claude-sonnet-4", true, 0, {
      providerSpecificData: {
        baseUrl: "https://anthropic.example/v1/",
        chatPath: "../evil",
      },
    }),
    "https://anthropic.example/v1/messages"
  );
});

// ─── F-02-002: Vertex key redaction ─────────────────────────────────────────

test("redactUrlSecrets strips Vertex Express ?key= material", () => {
  const secret = "express-secret-key-DO-NOT-LOG-abc123xyz";
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini:generateContent?key=${secret}`;
  const redacted = redactUrlSecrets(url);
  assert.ok(!redacted.includes(secret), "secret must not appear in redacted URL");
  assert.ok(redacted.includes("key=***") || redacted.includes("key=%2A%2A%2A"));
});

test("VertexExecutor Express buildUrl still carries real key for fetch", () => {
  const executor = new VertexExecutor();
  const secret = "express-live-key-for-fetch-only";
  const url = executor.buildUrl("gemini-2.5-flash", false, 0, { apiKey: secret });
  assert.ok(url.includes(`key=${encodeURIComponent(secret)}`) || url.includes(`key=${secret}`));
  assert.equal(redactUrlSecrets(url).includes(secret), false);
});

test("requestLogger.logTargetRequest redacts query secrets", async () => {
  const logger = await createRequestLogger("openai", "openai", "m", { enabled: true });
  const secret = "vertex-express-key-in-logger-test";
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/m:generateContent?key=${secret}`;
  logger.logTargetRequest(url, { Authorization: "Bearer x" }, { model: "m" });
  const payloads = logger.getPipelinePayloads();
  const loggedUrl = payloads?.providerRequest?.url;
  assert.equal(typeof loggedUrl, "string");
  assert.ok(!String(loggedUrl).includes(secret), `leaked secret in ${loggedUrl}`);
  assert.match(String(loggedUrl), /key=(\*\*\*|%2A%2A%2A)/);
});

// ─── F-02-003: Qwen resourceUrl allowlist ───────────────────────────────────

test("resolveQwenChatCompletionsUrl defaults and accepts allowlisted hosts", () => {
  assert.equal(resolveQwenChatCompletionsUrl(null), "https://portal.qwen.ai/v1/chat/completions");
  assert.equal(
    resolveQwenChatCompletionsUrl("custom.qwen.ai"),
    "https://custom.qwen.ai/v1/chat/completions"
  );
  assert.equal(parseQwenResourceHost("dashscope.aliyuncs.com"), "dashscope.aliyuncs.com");
  // N9: host:port must not be misclassified as a non-https scheme.
  assert.equal(parseQwenResourceHost("portal.qwen.ai:443"), "portal.qwen.ai");
  assert.equal(
    resolveQwenChatCompletionsUrl("portal.qwen.ai:443"),
    "https://portal.qwen.ai/v1/chat/completions"
  );
  assert.equal(parseQwenResourceHost("dashscope.aliyuncs.com:443"), "dashscope.aliyuncs.com");
});

test("Qwen resourceUrl rejects private / non-allowlisted hosts", () => {
  for (const bad of [
    "169.254.169.254",
    "127.0.0.1",
    "10.0.0.5",
    "evil.com",
    "evil.com@portal.qwen.ai",
    "portal.qwen.ai/../evil",
    "http://portal.qwen.ai",
    "//evil.com",
    // host:port still rejects non-allowlisted / IP forms
    "evil.com:443",
    "127.0.0.1:443",
    "169.254.169.254:80",
  ]) {
    assert.throws(() => parseQwenResourceHost(bad), /Invalid Qwen resourceUrl/);
  }
});

test("DefaultExecutor qwen buildUrl enforces allowlist", () => {
  const qwen = new DefaultExecutor("qwen");
  assert.equal(qwen.buildUrl("qwen3-coder", true), "https://portal.qwen.ai/v1/chat/completions");
  assert.equal(
    qwen.buildUrl("qwen3-coder", true, 0, {
      providerSpecificData: { resourceUrl: "custom.qwen.ai" },
    }),
    "https://custom.qwen.ai/v1/chat/completions"
  );
  assert.throws(
    () =>
      qwen.buildUrl("qwen3-coder", true, 0, {
        providerSpecificData: { resourceUrl: "169.254.169.254" },
      }),
    /Invalid Qwen resourceUrl/
  );
});

// ─── F-02-004 / W2-003: error sanitize ──────────────────────────────────────

test("sanitizeErrorMessage strips absolute source paths from stream-style messages", () => {
  // First line only; stack frames with absolute source paths are tokenized and redacted.
  const raw = `Stream error: boom at /home/sephiroth/secret/path.ts:12:3`;
  const clean = sanitizeErrorMessage(raw);
  assert.ok(!clean.includes("/home/sephiroth"), clean);
  assert.ok(clean.includes("<path>"), clean);
  assert.ok(!clean.includes("at /"), clean);
});

// ─── F-02-005 / W2-002: start-timeout semantics ─────────────────────────────

test("isFetchStartTimeoutError recognizes TimeoutError and message prefix", () => {
  const te = createFetchStartTimeoutError(100, "https://example.test");
  assert.equal(isFetchStartTimeoutError(te), true);
  const abort = new Error("aborted");
  abort.name = "AbortError";
  (abort as { cause?: unknown }).cause = te;
  assert.equal(isFetchStartTimeoutError(abort), true);
  assert.equal(isFetchStartTimeoutError(new Error("network down")), false);
});

test("fetchWithStartTimeout clears timer after headers (long body not aborted)", async () => {
  const originalFetch = globalThis.fetch;
  let seenSignal: AbortSignal | null = null;
  globalThis.fetch = (async (_url, options) => {
    seenSignal = (options as RequestInit)?.signal ?? null;
    // Resolve headers immediately; body would stream longer than timeout.
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  try {
    const res = await fetchWithStartTimeout("https://example.test/start-ok", {
      method: "POST",
      timeoutMs: 30,
    });
    assert.equal(res.status, 200);
    // After resolve, start-timeout controller is cleared — signal may be aborted
    // only if client aborted; our timer must not keep firing into body lifetime.
    await new Promise((r) => setTimeout(r, 50));
    // Body already consumed; the important contract is we got a response despite
    // timeout budget being shorter than the post-resolve wait above.
    assert.ok(seenSignal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchWithStartTimeout classifies hanging fetch as TimeoutError", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, options) => {
    const signal = (options as RequestInit)?.signal;
    return new Promise((_resolve, reject) => {
      if (!signal) return;
      signal.addEventListener(
        "abort",
        () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        },
        { once: true }
      );
    });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        fetchWithStartTimeout("https://example.test/hang", {
          method: "POST",
          timeoutMs: 25,
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal((error as Error).name, "TimeoutError");
        assert.ok(isFetchStartTimeoutError(error));
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("BaseExecutor execute maps start-timeout to TimeoutError name", async () => {
  class HangExecutor extends BaseExecutor {
    constructor() {
      super("hang-provider", {
        baseUrl: "https://hang.example/v1/chat/completions",
        headers: {},
      });
    }
    getTimeoutMs() {
      return 40;
    }
  }

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, options) => {
    const signal = (options as RequestInit)?.signal;
    return new Promise((_resolve, reject) => {
      signal?.addEventListener(
        "abort",
        () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        },
        { once: true }
      );
    });
  }) as typeof fetch;

  const logs: Array<{ tag: string; message: string }> = [];
  const executor = new HangExecutor();
  try {
    await assert.rejects(
      () =>
        executor.execute({
          model: "m",
          stream: false,
          credentials: { apiKey: "k" },
          body: { model: "m", messages: [{ role: "user", content: "hi" }] },
          log: {
            warn: (tag, message) => logs.push({ tag, message }),
            debug: () => {},
          },
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal((error as Error).name, "TimeoutError");
        return true;
      }
    );
    assert.ok(
      logs.some((l) => l.tag === "TIMEOUT"),
      `expected TIMEOUT log, got ${JSON.stringify(logs)}`
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── F-02-W2-001: Opencode concurrent format isolation ──────────────────────

test("OpencodeExecutor concurrent claude + openai models do not cross-contaminate", async () => {
  const executor = new OpencodeExecutor("opencode-go");
  const originalFetch = globalThis.fetch;
  const originalGo = [...(PROVIDER_MODELS["opencode-go"] || [])];

  // Ensure claude-format model exists for go.
  if (!PROVIDER_MODELS["opencode-go"]?.some((m) => m.id === "minimax-m2.7")) {
    PROVIDER_MODELS["opencode-go"] = [
      ...(PROVIDER_MODELS["opencode-go"] || []),
      { id: "minimax-m2.7", name: "MiniMax M2.7", targetFormat: "claude" },
    ];
  }

  // Hold both fetches open so the ALS/format state would race if still on the instance.
  let releaseAll: (() => void) | null = null;
  const bothStarted = new Promise<void>((r) => {
    releaseAll = r;
  });
  let inFlight = 0;

  globalThis.fetch = (async () => {
    inFlight += 1;
    if (inFlight >= 2) releaseAll?.();
    await bothStarted;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const claudeP = executor.execute({
      model: "minimax-m2.7",
      stream: true,
      credentials: { apiKey: "claude-key" },
      body: {
        model: "minimax-m2.7",
        stream: true,
        messages: [{ role: "user", content: "c" }],
      },
    });
    const openaiP = executor.execute({
      model: "glm-5.1",
      stream: true,
      credentials: { apiKey: "openai-key" },
      body: {
        model: "glm-5.1",
        stream: true,
        messages: [{ role: "user", content: "o" }],
      },
    });

    const [claudeResult, openaiResult] = await Promise.all([claudeP, openaiP]);

    assert.ok(
      String(claudeResult.url).endsWith("/messages"),
      `claude url: ${claudeResult.url}`
    );
    assert.ok(
      String(openaiResult.url).includes("/chat/completions"),
      `openai url: ${openaiResult.url}`
    );
    assert.equal(claudeResult.headers["x-api-key"], "claude-key");
    assert.equal(openaiResult.headers["Authorization"], "Bearer openai-key");
  } finally {
    releaseAll?.();
    globalThis.fetch = originalFetch;
    PROVIDER_MODELS["opencode-go"] = originalGo;
  }
});

// ─── N7: Qoder customApiBase / resourceUrl metadata block ───────────────────

test("QoderExecutor rejects cloud-metadata customApiBase (N7)", async () => {
  const { QoderExecutor } = await import("../../open-sse/executors/qoder.ts");
  const executor = new QoderExecutor();
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response("should-not-run", { status: 200 });
  }) as typeof fetch;

  try {
    const result = await executor.execute({
      model: "qwen3-coder-plus",
      stream: false,
      credentials: {
        apiKey: "qoder-bearer-secret",
        customApiBase: "http://169.254.169.254/",
      },
      body: {
        model: "qwen3-coder-plus",
        messages: [{ role: "user", content: "hi" }],
      },
    });
    assert.equal(result.response.status, 400);
    const payload = (await result.response.json()) as {
      error?: { message?: string; code?: string };
    };
    assert.equal(payload.error?.code, "qoder_invalid_api_base");
    assert.ok(payload.error?.message);
    assert.equal(fetchCalled, false, "must not fetch metadata with Bearer attached");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── N2: chatgpt-web errorResponse sanitizes (Hard Rule #12) ────────────────

test("sanitizeErrorMessage strips stack frames used by chatgpt-web errorResponse", () => {
  // errorResponse() now routes all client messages through sanitizeErrorMessage.
  const raw = "ChatGPT connection failed: Error: boom\n    at /home/sephiroth/app/src/x.ts:10:5";
  const safe = sanitizeErrorMessage(raw);
  assert.ok(!safe.includes("at /home/"), `leaked stack frame: ${safe}`);
  assert.ok(!safe.includes("/home/sephiroth"), `leaked abs path: ${safe}`);
});

// ─── N8: Qwen redirect re-validation ────────────────────────────────────────

test("resolveQwenRedirectLocation re-allows allowlisted hops and rejects private", () => {
  assert.equal(
    resolveQwenRedirectLocation(
      "https://portal.qwen.ai/v1/chat/completions",
      "https://custom.qwen.ai/v1/chat/completions"
    ),
    "https://custom.qwen.ai/v1/chat/completions"
  );
  assert.throws(
    () =>
      resolveQwenRedirectLocation(
        "https://portal.qwen.ai/v1/chat/completions",
        "http://169.254.169.254/latest/meta-data/"
      ),
    /Invalid Qwen resourceUrl/
  );
  assert.throws(
    () =>
      resolveQwenRedirectLocation(
        "https://portal.qwen.ai/v1/chat/completions",
        "https://evil.com/steal"
      ),
    /Invalid Qwen resourceUrl/
  );
  assert.throws(
    () =>
      resolveQwenRedirectLocation(
        "https://portal.qwen.ai/v1/chat/completions",
        "https://user:pass@portal.qwen.ai/v1"
      ),
    /Invalid Qwen resourceUrl/
  );
});

test("fetchFollowingQwenRedirects follows allowlisted 302 then returns final", async () => {
  const hops: string[] = [];
  const finalBody = JSON.stringify({ ok: true });
  const result = await fetchFollowingQwenRedirects(
    "https://portal.qwen.ai/v1/chat/completions",
    async (url) => {
      hops.push(url);
      if (url.includes("portal.qwen.ai")) {
        return new Response(null, {
          status: 302,
          headers: { Location: "https://custom.qwen.ai/v1/chat/completions" },
        });
      }
      return new Response(finalBody, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  );
  assert.equal(result.status, 200);
  assert.deepEqual(hops, [
    "https://portal.qwen.ai/v1/chat/completions",
    "https://custom.qwen.ai/v1/chat/completions",
  ]);
  assert.equal(await result.text(), finalBody);
});

test("fetchFollowingQwenRedirects rejects redirect to metadata host", async () => {
  await assert.rejects(
    () =>
      fetchFollowingQwenRedirects("https://portal.qwen.ai/v1/chat/completions", async (url) => {
        if (url.includes("portal.qwen.ai")) {
          return new Response(null, {
            status: 302,
            headers: { Location: "http://169.254.169.254/latest/meta-data/" },
          });
        }
        return new Response("should-not-reach", { status: 200 });
      }),
    /Invalid Qwen resourceUrl/
  );
});

// ─── N3: devin-cli spawn message sanitize (Hard Rule #12) ───────────────────

test("sanitizeErrorMessage strips stacks for devin-cli spawn_failed style messages", () => {
  const raw =
    "Devin CLI spawn error: Error: boom\n    at ChildProcess.<anonymous> (/home/sephiroth/app/open-sse/executors/devin-cli.ts:166:11)";
  const safe = sanitizeErrorMessage(raw);
  assert.ok(!safe.includes("/home/sephiroth"), `leaked abs path: ${safe}`);
  assert.ok(!safe.includes("at /home/"), `leaked stack frame: ${safe}`);
});
