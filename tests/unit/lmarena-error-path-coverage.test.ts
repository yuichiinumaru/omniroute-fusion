/**
 * Task 0147 — LM Arena error-path coverage.
 *
 * Deterministic, mock-only tests for the branches Task 0121 left uncovered:
 *   1. native TLS unavailable (`TlsClientUnavailableError`) → sanitized 502;
 *   2. Cloudflare / bot challenge payloads → `cloudflare_or_bot` retry/re-login
 *      error (both the 403 path and the text-detector path);
 *   3. generic network failure stays distinct from provider HTTP failure;
 *   4. streaming abort/cancel never emits misleading completion data;
 *   5. sanitized 502 / retry / re-login contracts preserved, with no
 *      cookie/reCAPTCHA-secret leakage into any error body.
 *
 * All tests drive the production `LMArenaExecutor.execute()` path through the
 * existing `__setTlsFetchOverrideForTesting` seam (added by Task 0121) and the
 * exported `createOpenAIArenaStream`. No live server is used: never :22000 /
 * :23456, no network, no native TLS binding.
 *
 * Run: node --import tsx/esm --test tests/unit/lmarena-error-path-coverage.test.ts
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import {
  LMArenaExecutor,
  clearLMArenaDeadCatalogModels,
} from "../../open-sse/executors/lmarena.ts";
import {
  TlsClientUnavailableError,
  __setTlsFetchOverrideForTesting,
  isCloudflareChallenge,
} from "../../open-sse/services/lmarenaTlsClient.ts";
import { createOpenAIArenaStream } from "../../open-sse/executors/lmarena/response.ts";
import type { ExecuteInput } from "../../open-sse/executors/base.ts";

const SILENT_LOG: ExecuteInput["log"] = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/** Secret-shaped markers injected into every fixture to prove no leakage. */
const COOKIE_VALUE_MARKER = "SECRET_COOKIE_MARKER_0147";
const COOKIE_FIXTURE = `arena-auth-prod-v1=${COOKIE_VALUE_MARKER}`;
const RECAPTCHA_MARKER = "SECRET_RECAPTCHA_MARKER_0147";

/** Cloudflare interstitial payload (matches the isCloudflareChallenge detector). */
const CLOUDFLARE_CHALLENGE_HTML =
  "<!DOCTYPE html><html><head><title>Just a moment...</title></head>" +
  "<body>Checking your browser before accessing arena.ai... " +
  '<script>window._cf_chl_opt = { cvId: "1" }</script></body></html>';

/** Generic anti-bot page (non-CF marker) — issue #3180 payload shape. */
const BOT_BLOCK_HTML =
  "<!DOCTYPE html><html><body>Request rejected by anti-bot rules.</body></html>";

function credentialsWithSecrets(includeRecaptcha = true): ExecuteInput["credentials"] {
  const raw: Record<string, unknown> = {
    cookie: COOKIE_FIXTURE,
    ...(includeRecaptcha ? { providerSpecificData: { recaptchaV3Token: RECAPTCHA_MARKER } } : {}),
  };
  return raw as unknown as ExecuteInput["credentials"];
}

function executeArgs(
  overrides: {
    model?: string;
    stream?: boolean;
    credentials?: ExecuteInput["credentials"];
  } = {}
): ExecuteInput {
  return {
    model: overrides.model ?? "gpt-4",
    body: { messages: [{ role: "user", content: "Hi" }] },
    stream: overrides.stream ?? false,
    credentials: overrides.credentials ?? credentialsWithSecrets(),
    signal: new AbortController().signal,
    log: SILENT_LOG,
  };
}

/** Assert the serialized error body leaks neither the cookie value nor the reCAPTCHA token. */
function assertNoSecretLeakage(serializedBody: string): void {
  assert.ok(
    !serializedBody.includes(COOKIE_VALUE_MARKER),
    "error body must not contain the session cookie value"
  );
  assert.ok(
    !serializedBody.includes(RECAPTCHA_MARKER),
    "error body must not contain the reCAPTCHA v3 token value"
  );
}

function toText(value: Uint8Array | string | undefined): string {
  if (value === undefined) return "";
  return typeof value === "string" ? value : new TextDecoder().decode(value);
}

after(() => {
  clearLMArenaDeadCatalogModels();
});

describe("Task 0147 — native TLS unavailable → sanitized 502", () => {
  it("maps TlsClientUnavailableError to 502 upstream_error/TLS_CLIENT_UNAVAILABLE", async () => {
    __setTlsFetchOverrideForTesting(async () => {
      throw new TlsClientUnavailableError("native binding failed to load");
    });

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(executeArgs());

      assert.equal(result.response.status, 502);
      const json = await result.response.json();
      assert.equal(json.error.type, "upstream_error");
      assert.equal(json.error.code, "TLS_CLIENT_UNAVAILABLE");
      assert.ok(
        json.error.message.includes("Arena TLS impersonation unavailable"),
        "message should keep the TLS-unavailable prefix"
      );
      assert.ok(
        json.error.message.includes("Install/repair tls-client-node native binary"),
        "message should keep the repair hint"
      );
      assertNoSecretLeakage(JSON.stringify(json));
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });
});

describe("Task 0147 — Cloudflare / bot challenge mapping", () => {
  it("maps a Cloudflare challenge (403) to cloudflare_or_bot with re-login guidance", async () => {
    __setTlsFetchOverrideForTesting(async () => ({
      status: 403,
      headers: new Headers({ "content-type": "text/html" }),
      text: CLOUDFLARE_CHALLENGE_HTML,
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(executeArgs());

      assert.equal(result.response.status, 403);
      const json = await result.response.json();
      assert.equal(json.error.type, "api_error");
      assert.equal(json.error.code, "cloudflare_or_bot");
      assert.ok(
        json.error.message.includes("Cloudflare bot management"),
        "message should name Cloudflare bot management"
      );
      assert.ok(
        json.error.message.includes("cf_clearance"),
        "message should carry the re-login (fresh cookie / cf_clearance) contract"
      );
      assertNoSecretLeakage(JSON.stringify(json));
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });

  it("detects a Cloudflare challenge by body text even with a 200 status", async () => {
    __setTlsFetchOverrideForTesting(async () => ({
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      text: CLOUDFLARE_CHALLENGE_HTML,
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(executeArgs());

      // Current contract: upstream status is preserved, but the payload is a
      // cloudflare_or_bot error, never a successful completion.
      assert.equal(result.response.status, 200);
      const json = await result.response.json();
      assert.equal(json.error.code, "cloudflare_or_bot");
      assert.ok(json.error.message.includes("Cloudflare bot management"));
      assert.ok(!json.choices, "challenge payload must not produce a completion");
      assertNoSecretLeakage(JSON.stringify(json));
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });

  it("maps a non-CF anti-bot page (no recaptcha) to cloudflare_or_bot with retry hint", async () => {
    __setTlsFetchOverrideForTesting(async () => ({
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      text: BOT_BLOCK_HTML,
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(
        executeArgs({ credentials: credentialsWithSecrets(false) })
      );

      assert.equal(result.response.status, 200);
      const json = await result.response.json();
      assert.equal(json.error.code, "cloudflare_or_bot");
      assert.ok(
        json.error.message.includes("Arena API error: 200"),
        "message should keep the upstream status"
      );
      assert.ok(
        json.error.message.includes("reCAPTCHA v3 token"),
        "message should carry the reCAPTCHA retry hint when no token was sent"
      );
      assert.ok(
        json.error.message.includes("session cookie"),
        "message should carry the session-cookie re-login hint"
      );
      assertNoSecretLeakage(JSON.stringify(json));
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });

  it("suppresses the reCAPTCHA retry hint when a token was supplied", async () => {
    __setTlsFetchOverrideForTesting(async () => ({
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      text: BOT_BLOCK_HTML,
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(executeArgs());

      assert.equal(result.response.status, 200);
      const json = await result.response.json();
      assert.equal(json.error.code, "cloudflare_or_bot");
      assert.equal(
        json.error.message,
        "Arena API error: 200",
        "with a recaptcha token present the hint must be suppressed"
      );
      assertNoSecretLeakage(JSON.stringify(json));
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });

  it("maps a 403 anti-bot JSON payload to cloudflare_or_bot (issue #3180 shape)", async () => {
    __setTlsFetchOverrideForTesting(async () => ({
      status: 403,
      headers: new Headers({ "content-type": "application/json" }),
      text: JSON.stringify({ error: "Request rejected by anti-bot rules." }),
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(executeArgs());

      assert.equal(result.response.status, 403);
      const json = await result.response.json();
      assert.equal(json.error.code, "cloudflare_or_bot");
      assert.ok(json.error.message.includes("Arena API error: 403"));
      assertNoSecretLeakage(JSON.stringify(json));
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });

  it("isCloudflareChallenge detects known markers and rejects normal payloads", () => {
    for (const sample of [
      "Just a moment...",
      "window._cf_chl_opt",
      "challenges.cloudflare.com",
      "Attention Required!",
      "cf-chl-running",
    ]) {
      assert.equal(isCloudflareChallenge(sample), true, `marker: ${sample}`);
    }
    assert.equal(isCloudflareChallenge('0:{"text":"hi"}'), false);
    assert.equal(isCloudflareChallenge(BOT_BLOCK_HTML), false);
    assert.equal(isCloudflareChallenge(""), false);
    assert.equal(isCloudflareChallenge(null), false);
    assert.equal(isCloudflareChallenge(undefined), false);
  });
});

describe("Task 0147 — generic network failure vs provider HTTP failure", () => {
  it("maps a thrown generic network error to 502 network_error/request_failed", async () => {
    __setTlsFetchOverrideForTesting(async () => {
      throw new Error("fetch failed: ECONNRESET at https://arena.ai");
    });

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(executeArgs());

      assert.equal(result.response.status, 502);
      const json = await result.response.json();
      assert.equal(json.error.type, "network_error");
      assert.equal(json.error.code, "request_failed");
      assert.ok(json.error.message.includes("fetch failed"));
      assertNoSecretLeakage(JSON.stringify(json));
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });

  it("keeps provider HTTP failures distinct (429 → api_error/429, not network_error)", async () => {
    __setTlsFetchOverrideForTesting(async () => ({
      status: 429,
      headers: new Headers({ "content-type": "application/json" }),
      text: JSON.stringify({ error: { message: "Rate limit exceeded" } }),
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(executeArgs());

      assert.equal(result.response.status, 429);
      const json = await result.response.json();
      assert.equal(json.error.type, "api_error");
      assert.equal(json.error.code, "429");
      assert.equal(json.error.message, "Rate limit exceeded");
      assertNoSecretLeakage(JSON.stringify(json));
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });

  it("does not misclassify a 2xx non-challenge result as an error (positive control)", async () => {
    __setTlsFetchOverrideForTesting(async () => ({
      status: 200,
      headers: new Headers({ "content-type": "text/event-stream" }),
      text: '0:{"text":"ok"}\nd:{}\n',
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(executeArgs());

      assert.equal(result.response.status, 200);
      const json = await result.response.json();
      assert.equal(json.choices[0].message.content, "ok");
      assert.ok(!json.error, "2xx result must not carry an error object");
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });
});

describe("Task 0147 — sanitized 502 / retry contract", () => {
  it("maps an upstream 502 to api_error/502 with a sanitized, path-redacted message", async () => {
    __setTlsFetchOverrideForTesting(async () => ({
      status: 502,
      headers: new Headers({ "content-type": "application/json" }),
      text: JSON.stringify({ error: { message: "Upstream exploded: /var/log/app.ts" } }),
      body: null,
    }));

    try {
      const executor = new LMArenaExecutor();
      const result = await executor.execute(executeArgs());

      assert.equal(result.response.status, 502);
      const json = await result.response.json();
      assert.equal(json.error.type, "api_error");
      assert.equal(json.error.code, "502");
      assert.ok(json.error.message.includes("Upstream exploded"));
      assert.ok(json.error.message.includes("<path>"), "absolute path should be redacted");
      assert.ok(!json.error.message.includes("/var/log/app.ts"));
      assertNoSecretLeakage(JSON.stringify(json));
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });
});

describe("Task 0147 — streaming cancellation", () => {
  it("aborting mid-stream emits no [DONE]/stop completion data after the abort", async () => {
    const encoder = new TextEncoder();
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('0:{"text":"Hello"}\n'));
        // The source never closes on its own — read() stays pending until
        // cancellation, which makes the abort path deterministic.
      },
    });
    const reader = source.getReader();
    const ac = new AbortController();
    const out = createOpenAIArenaStream({
      reader,
      model: "gpt-4",
      signal: ac.signal,
      log: SILENT_LOG,
    });
    const outputReader = out.getReader();

    const first = await outputReader.read();
    assert.equal(first.done, false);
    const firstText = toText(first.value);
    assert.ok(firstText.includes("Hello"), "chunks before abort must be preserved");

    ac.abort();

    // Fixed contract (Task 0147): an aborted stream terminates cleanly — the
    // abort landing on a pending read must not be misread as a clean EOF.
    const rest = await outputReader.read();
    assert.equal(rest.done, true, "stream must close cleanly after abort");

    const all = [firstText].join("");
    assert.ok(!all.includes("[DONE]"), "aborted stream must not emit [DONE]");
    assert.ok(
      !all.includes('"finish_reason":"stop"'),
      "aborted stream must not emit a stop finish_reason"
    );
  });

  it("consumer cancel propagates to the upstream reader and closes with no completion data", async () => {
    const encoder = new TextEncoder();
    let sourceCancelled = false;
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('0:{"text":"partial"}\n'));
      },
      cancel() {
        sourceCancelled = true;
      },
    });
    const reader = source.getReader();
    const ac = new AbortController();
    const out = createOpenAIArenaStream({
      reader,
      model: "gpt-4",
      signal: ac.signal,
      log: SILENT_LOG,
    });
    const outputReader = out.getReader();

    const first = await outputReader.read();
    assert.equal(first.done, false);
    assert.ok(toText(first.value).includes("partial"));

    // Consumer disconnect: cancel via the held reader (cancel() on a locked
    // stream throws ERR_INVALID_STATE).
    await outputReader.cancel();
    assert.equal(sourceCancelled, true, "cancelling the output must cancel the upstream reader");

    const rest = await outputReader.read();
    assert.equal(rest.done, true, "cancelled stream must close cleanly");
    assert.ok(!toText(first.value).includes("[DONE]"));
    assert.ok(!toText(first.value).includes('"finish_reason":"stop"'));
  });
});
