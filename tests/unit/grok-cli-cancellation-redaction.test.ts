/**
 * Grok Build OAuth — redaction and state-isolation tests (Task 0151)
 *
 * These tests target the contract surface required by the task spec that is
 * not already covered in grok-cli-device-code.test.ts / grok-cli-pkce.test.ts:
 *
 *   - Upstream error sanitization: when the device-code or token-exchange
 *     endpoint echoes a token-shaped `error_description` (xAI has historically
 *     echoed authorization codes/tokens in error bodies), the thrown Error
 *     MUST NOT include the raw token — it must be redacted to a stable
 *     placeholder so it is safe to surface in UI/logs.
 *   - The PKCE state param is forwarded by the exchange request so the server
 *     can validate the round-trip (the manual-paste path in OAuthModal
 *     derives state from the callback URL and hands it to /exchange).
 *
 * Cancellation: the device-code polling loop is owned by OAuthModal (the
 * UI's startPolling function), not by requestDeviceCode/pollToken. The
 * modal's polling loop is already bounded (maxAttempts=60) and reacts to
 * the modal close handler — see OAuthModal.tsx::startPolling.
 *
 * Captures the TDD red→green evidence for Hard Rule #18.
 */

import test from "node:test";
import assert from "node:assert/strict";

const { grokCli } = await import("../../src/lib/oauth/providers/grok-cli.ts");
const { exchangeGrokBuildToken } = await import("../../src/lib/oauth/providers/grok-cli-oauth.ts");
const { GROK_CLI_CONFIG, GROK_BUILD_OAUTH_CONFIG } = await import(
  "../../src/lib/oauth/constants/oauth.ts"
);

const originalFetch = globalThis.fetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ── Redaction ─────────────────────────────────────────────────────────────

test("requestDeviceCode: upstream error_description is sanitized (no token leak)", async () => {
  // xAI has historically echoed a token in the error body. The provider must
  // redact any JWT-shaped substring (three base64url segments separated by
  // dots, prefix `eyJ`) before throwing.
  const fakeToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.abcdefghij";
  globalThis.fetch = async () =>
    jsonResponse(
      {
        error: "invalid_client",
        error_description: `client rejected: bearer ${fakeToken} attached`,
      },
      400
    );

  await assert.rejects(
    () => grokCli.requestDeviceCode(),
    (err) => {
      const message = err instanceof Error ? err.message : String(err);
      assert.ok(
        !message.includes(fakeToken),
        `error message must not contain the leaked token. got: ${message}`
      );
      // The redacted placeholder MUST still preserve a useful prefix so the
      // dashboard can show "client rejected: bearer [REDACTED] attached" etc.
      assert.match(
        message,
        /client rejected/i,
        "error_description prefix must still be surfaced"
      );
      assert.match(
        message,
        /\[REDACTED\]/i,
        "token substring must be replaced with a placeholder"
      );
      return true;
    }
  );
});

test("requestDeviceCode: non-token error_description is forwarded verbatim", async () => {
  // Non-token error strings (e.g. "client_id is required") must NOT be
  // redacted or modified — the operator needs the upstream message.
  globalThis.fetch = async () =>
    jsonResponse(
      {
        error: "invalid_client",
        error_description: "client_id is required for this endpoint",
      },
      400
    );

  await assert.rejects(
    () => grokCli.requestDeviceCode(),
    /client_id is required/i
  );
});

test("exchangeGrokBuildToken: raw response text is sanitized (no token leak)", async () => {
  const fakeToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.zzzzzzzzzz";
  globalThis.fetch = async () =>
    new Response(`server exploded: ${fakeToken} attached`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });

  await assert.rejects(
    () =>
      exchangeGrokBuildToken(
        GROK_BUILD_OAUTH_CONFIG,
        "code",
        "http://127.0.0.1:56122/cb",
        "verifier"
      ),
    (err) => {
      const message = err instanceof Error ? err.message : String(err);
      assert.ok(
        !message.includes(fakeToken),
        `error message must not contain the leaked token. got: ${message}`
      );
      assert.match(message, /Grok Build token exchange failed/);
      assert.match(message, /\[REDACTED\]/i);
      return true;
    }
  );
});

// ── PKCE state forwarding ─────────────────────────────────────────────────

test("exchangeToken: state is forwarded alongside code to the upstream token endpoint", async () => {
  let capturedBody = null;
  globalThis.fetch = async (_url, init) => {
    capturedBody = new URLSearchParams(init.body);
    return jsonResponse({
      access_token: "bt-access",
      refresh_token: "bt-refresh",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "openid profile email offline_access grok-cli:access",
    });
  };

  await grokCli.exchangeToken(
    GROK_BUILD_OAUTH_CONFIG,
    "code-from-redirect",
    "http://127.0.0.1:56122/callback",
    "verifier-string",
    "state-from-authorize-url"
  );

  assert.equal(capturedBody.get("code"), "code-from-redirect");
  assert.equal(capturedBody.get("code_verifier"), "verifier-string");
  assert.equal(capturedBody.get("state"), "state-from-authorize-url");
});

test("exchangeToken: state is omitted when caller does not provide one", async () => {
  let capturedBody = null;
  globalThis.fetch = async (_url, init) => {
    capturedBody = new URLSearchParams(init.body);
    return jsonResponse({
      access_token: "bt-access",
      refresh_token: "bt-refresh",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "openid profile email offline_access grok-cli:access",
    });
  };

  await grokCli.exchangeToken(
    GROK_BUILD_OAUTH_CONFIG,
    "code-from-redirect",
    "http://127.0.0.1:56122/callback",
    "verifier-string"
  );

  assert.equal(
    capturedBody.get("state"),
    null,
    "state must be omitted from the upstream request when not supplied"
  );
});
