import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  looksLikeSse,
  isWafChallenge,
  resetClientCache,
  TlsClientHangError,
  TlsClientUnavailableError,
  BX_UMIDTOKEN_FALLBACK,
  __setTlsFetchOverrideForTesting,
  tlsFetchQwen,
  type TlsFetchOptions,
  type TlsFetchResult,
} from "../../open-sse/services/qwenTlsClient.ts";

describe("qwenTlsClient coverage", () => {
  beforeEach(() => {
    __setTlsFetchOverrideForTesting(null);
  });

  afterEach(() => {
    __setTlsFetchOverrideForTesting(null);
  });

  describe("looksLikeSse", () => {
    it("returns true for valid SSE line prefixes and comment lines", () => {
      assert.equal(looksLikeSse("data: {\"choices\":[]}\n\n"), true);
      assert.equal(looksLikeSse("event: message\n"), true);
      assert.equal(looksLikeSse("id: 12345\n"), true);
      assert.equal(looksLikeSse("retry: 1000\n"), true);
      assert.equal(looksLikeSse(": ping comment\n"), true);
      assert.equal(looksLikeSse("  \n\r\ndata: leading whitespace\n"), true);
    });

    it("returns false for non-SSE text, HTML, and JSON", () => {
      assert.equal(looksLikeSse("<html><head>WAF</head></html>"), false);
      assert.equal(looksLikeSse("{\"success\":false,\"code\":500}"), false);
      assert.equal(looksLikeSse(""), false);
      assert.equal(looksLikeSse("   "), false);
      assert.equal(looksLikeSse("random plain text without sse prefix"), false);
    });
  });

  describe("isWafChallenge", () => {
    it("detects Alibaba WAF / baxia challenge signatures", () => {
      assert.equal(isWafChallenge('<meta name="aliyun_waf_aa" content="123">'), true);
      assert.equal(isWafChallenge("<script>window.baxia = {};</script>"), true);
      assert.equal(isWafChallenge("<h1>Attention Required! | Alibaba Cloud</h1>"), true);
    });

    it("returns false for non-WAF HTML, JSON, empty, and null/undefined values", () => {
      assert.equal(isWafChallenge("<html><body>Hello World</body></html>"), false);
      assert.equal(isWafChallenge("{\"status\":\"ok\"}"), false);
      assert.equal(isWafChallenge(""), false);
      assert.equal(isWafChallenge(null), false);
      assert.equal(isWafChallenge(undefined), false);
    });
  });

  describe("Error classes & constants", () => {
    it("TlsClientHangError has correct name and inherits Error", () => {
      const err = new TlsClientHangError("native binding timed out");
      assert.equal(err.name, "TlsClientHangError");
      assert.equal(err.message, "native binding timed out");
      assert.ok(err instanceof Error);
    });

    it("TlsClientUnavailableError has correct name and inherits Error", () => {
      const err = new TlsClientUnavailableError("binary missing");
      assert.equal(err.name, "TlsClientUnavailableError");
      assert.equal(err.message, "binary missing");
      assert.ok(err instanceof Error);
    });

    it("BX_UMIDTOKEN_FALLBACK is non-empty string", () => {
      assert.equal(typeof BX_UMIDTOKEN_FALLBACK, "string");
      assert.ok(BX_UMIDTOKEN_FALLBACK.length > 10);
    });

    it("resetClientCache executes without throwing", () => {
      assert.doesNotThrow(() => {
        resetClientCache();
      });
    });
  });

  describe("TLS fetch override mechanism", () => {
    it("override receives the exact url and options the caller passed", async () => {
      const secretToken = "SECRET_TOKEN_EYJhbGciOiJIUzI1NiJ9.abc";
      const secretCookie = "cna=SUPER_SECRET_CNA; ssxmod_itna=SECRET_ITNA";
      let capturedUrl = "";
      let capturedHeaders: TlsFetchOptions["headers"] | undefined;

      __setTlsFetchOverrideForTesting(async (url: string, opts: TlsFetchOptions) => {
        capturedUrl = url;
        capturedHeaders = opts.headers;
        return {
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: JSON.stringify({ ok: true }),
          body: null,
        };
      });

      await tlsFetchQwen("https://chat.qwen.ai/api/v2/chats/new", {
        headers: {
          Authorization: `Bearer ${secretToken}`,
          Cookie: secretCookie,
        },
        method: "POST",
        timeoutMs: 15_000,
      });

      assert.equal(capturedUrl, "https://chat.qwen.ai/api/v2/chats/new");
      assert.equal(capturedHeaders?.Authorization, `Bearer ${secretToken}`);
      assert.equal(capturedHeaders?.Cookie, secretCookie);
    });

    it("override return value is propagated back to the caller verbatim", async () => {
      __setTlsFetchOverrideForTesting(async () => {
        return {
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          text: JSON.stringify({ error: "Unauthorized" }),
          body: null,
        };
      });

      const res = await tlsFetchQwen("https://chat.qwen.ai/api/v2/chats/new", {
        headers: { Cookie: "token=SECRET_JWT_VAL; cna=SECRET_CNA" },
      });

      assert.equal(res.status, 401);
      assert.ok(res.text?.includes("Unauthorized"));
    });

    it("override-thrown error is propagated back to the caller", async () => {
      __setTlsFetchOverrideForTesting(async () => {
        throw new Error("simulated upstream failure");
      });

      try {
        await tlsFetchQwen("https://chat.qwen.ai/api/v2/chats/new", {});
        assert.fail("should have thrown");
      } catch (err: unknown) {
        assert.ok(err instanceof Error);
        assert.equal(err.message, "simulated upstream failure");
      }
    });
  });
});
