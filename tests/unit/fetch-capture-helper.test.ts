import test from "node:test";
import assert from "node:assert/strict";
import { withFetchCapture } from "../helpers/fetchCapture.ts";

// Task 0178 — exception-safe fetch capture helper.
//
// RED phase: `withFetchCapture` does not exist yet, so this module fails to
// load. GREEN is achieved once tests/helpers/fetchCapture.ts implements it.
// These tests prove the helper's contract WITHOUT touching production code:
//   1. it records observable boundary evidence (url, method, headers, body);
//   2. it RESTORES globalThis.fetch in a finally path even when the callback
//      throws (the audit I3 isolation risk);
//   3. it exposes sanitized evidence that redacts credentials while keeping
//      the assertion surface intact.
// This file lives in tests/unit/*.test.ts so the native runner collects it.

const JSON_HEADERS = { "Content-Type": "application/json" };

test("withFetchCapture records url/method/headers/parsed body and restores fetch", async () => {
  const original = globalThis.fetch;

  await withFetchCapture(
    async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS }),
    async (capture) => {
      const res = await fetch("https://upstream.test/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer sk-test-only", ...JSON_HEADERS },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "hello" }],
        }),
      });
      assert.equal(res.status, 200);

      // Observable boundary evidence must be available for assertions.
      assert.equal(capture.calls.length, 1);
      const call = capture.calls[0];
      assert.equal(call.url, "https://upstream.test/v1/chat/completions");
      assert.equal(call.method, "POST");
      assert.equal(call.headers.Authorization, "Bearer sk-test-only");

      // Type-safe body assertion via bodyAs<T>()
      const body = call.bodyAs<{ model: string; messages: Array<{ content: string }> }>();
      assert.equal(body.model, "gpt-4o-mini");
      assert.equal(body.messages[0].content, "hello");
    }
  );

  // Restoration is observable after a normal completion as well.
  assert.equal(globalThis.fetch, original, "globalThis.fetch must be restored after the callback");
});

test("withFetchCapture resolves with the callback result", async () => {
  const result = await withFetchCapture(
    async () => new Response("{}"),
    async () => 42
  );
  assert.equal(result, 42);
});

test("withFetchCapture RESTORES globalThis.fetch after a deliberately thrown callback", async () => {
  const original = globalThis.fetch;

  await assert.rejects(
    withFetchCapture(
      async () => new Response("{}"),
      async () => {
        throw new Error("boom: capture leaked the mock");
      }
    ),
    /boom: capture leaked the mock/
  );

  // The isolation contract: a thrown test must not leak the global mock.
  assert.equal(globalThis.fetch, original, "globalThis.fetch must be restored after a THROW");
});

test("withFetchCapture restores fetch when the DISPATCHER throws too", async () => {
  const original = globalThis.fetch;

  await assert.rejects(
    withFetchCapture(
      async () => {
        throw new Error("dispatcher boom");
      },
      async () => {
        await fetch("https://upstream.test/v1");
      }
    ),
    /dispatcher boom/
  );

  assert.equal(
    globalThis.fetch,
    original,
    "globalThis.fetch must be restored after dispatcher throw"
  );
});

test("toSanitizedEvidence redacts credentials and truncates large bodies", async () => {
  await withFetchCapture(
    async () => new Response("{}"),
    async (capture) => {
      await fetch("https://upstream.test/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer super-secret-key",
          Cookie: "session=abc123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: "sk-leak",
          model: "gpt-4o-mini",
          blob: "x".repeat(500),
        }),
      });

      // The assertion surface keeps the values the test needs…
      const call = capture.calls[0];
      assert.equal(call.headers.Authorization, "Bearer super-secret-key");
      assert.equal(call.bodyAs<{ apiKey: string }>().apiKey, "sk-leak");

      // …while sanitized evidence redacts them for logs/failure reports.
      const evidence = capture.toSanitizedEvidence();
      assert.equal(evidence.length, 1);
      assert.equal(evidence[0].headers.Authorization, "<redacted>");
      assert.equal(evidence[0].headers.Cookie, "<redacted>");
      assert.equal((evidence[0].body as { apiKey: string }).apiKey, "<redacted>");
      assert.ok(
        (evidence[0].body as { blob: string }).blob.length < 500,
        "large body values must be truncated"
      );
    }
  );
});

test("toSanitizedEvidence redacts sensitive URL query parameters while preserving raw URL in capture.calls", async () => {
  await withFetchCapture(
    async () => new Response("{}"),
    async (capture) => {
      const rawUrl = "https://upstream.test/v1/generate?key=secret-api-key&model=gemini-2.5-flash";
      await fetch(rawUrl, { method: "GET" });

      // Raw URL for boundary test assertions remains unchanged.
      assert.equal(capture.calls[0].url, rawUrl);

      // Sanitized evidence redacts sensitive query param 'key'.
      const evidence = capture.toSanitizedEvidence();
      assert.equal(evidence.length, 1);
      assert.match(evidence[0].url, /key=%3Credacted%3E|key=<redacted>/);
      assert.match(evidence[0].url, /model=gemini-2\.5-flash/);
      assert.ok(
        !evidence[0].url.includes("secret-api-key"),
        "raw API key must be redacted in URL evidence"
      );
    }
  );
});

test("withFetchCapture merges Request.headers with init.headers (init overrides duplicates)", async () => {
  await withFetchCapture(
    async () => new Response("{}"),
    async (capture) => {
      const req = new Request("https://upstream.test/v1/chat", {
        headers: {
          "x-base-header": "base-value",
          "x-overlap": "base-overlap",
          "content-type": "application/json",
        },
      });

      await fetch(req, {
        headers: {
          "x-overlap": "override-value",
          "X-Init-Header": "init-value",
        },
      });

      assert.equal(capture.calls.length, 1);
      const call = capture.calls[0];
      assert.equal(call.headers["x-base-header"], "base-value");
      assert.equal(call.headers["content-type"], "application/json");
      assert.equal(call.headers["x-overlap"], "override-value");
      assert.equal(call.headers["X-Init-Header"], "init-value");
    }
  );
});

test("withFetchCapture extracts body and headers when called with Request input object", async () => {
  await withFetchCapture(
    async () => new Response("{}"),
    async (capture) => {
      const req = new Request("https://upstream.test/v1/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "hello from Request object" }),
      });

      await fetch(req);

      assert.equal(capture.calls.length, 1);
      const call = capture.calls[0];
      assert.equal(call.method, "POST");
      assert.equal(call.headers["content-type"], "application/json");
      const body = call.bodyAs<{ message: string }>();
      assert.equal(body.message, "hello from Request object");
    }
  );
});

test("withFetchCapture captures every call in order", async () => {
  let n = 0;
  await withFetchCapture(
    async () => {
      n += 1;
      return new Response(JSON.stringify({ n }), { status: 200, headers: JSON_HEADERS });
    },
    async (capture) => {
      await fetch("https://upstream.test/a", { method: "GET" });
      await fetch("https://upstream.test/b", { method: "POST", body: JSON.stringify({ x: 1 }) });
      assert.equal(capture.calls.length, 2);
      assert.equal(capture.calls[0].url, "https://upstream.test/a");
      assert.equal(capture.calls[0].method, "GET");
      assert.equal(capture.calls[1].url, "https://upstream.test/b");
      assert.equal(capture.calls[1].method, "POST");
      assert.equal(capture.calls[1].bodyAs<{ x: number }>().x, 1);
    }
  );
});
