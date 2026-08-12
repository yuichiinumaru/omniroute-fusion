/**
 * Grok Build (grok-cli) device-code lifecycle tests (#0151)
 *
 * The fork's grok-cli provider exposes a device-code flow that mirrors the
 * upstream xAI Grok Build cli-chat-proxy contract. These tests MUST drive the
 * provider's `requestDeviceCode` / `pollToken` directly through mocked fetch
 * responses — no real network, no real OAuth credentials — and MUST assert the
 * lifecycle states that the dashboard renders:
 *
 *   - request returns a sanitized { device_code, user_code, verification_uri,
 *     verification_uri_complete, expires_in, interval } shape
 *   - poll distinguishes pending / slow_down / success / timeout / terminal
 *   - user-facing fields NEVER leak the access_token, refresh_token, or id_token
 *   - timeout/cancel/terminal errors are surfaced without raw OAuth responses
 *
 * Capturing the TDD red→green here is part of the task's Hard Rule #18 proof.
 */

import test from "node:test";
import assert from "node:assert/strict";

const { grokCli } = await import("../../src/lib/oauth/providers/grok-cli.ts");
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

function createJwt(payload) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url").replace(/=/g, "");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("grokCli.flowType is device_code with browser PKCE as additional capability", () => {
  assert.equal(grokCli.flowType, "device_code");
  assert.equal(grokCli.supportsBrowserPkce, true);
});

test("grokCli.config is the verified Grok Build browser PKCE config", () => {
  assert.equal(
    grokCli.config.clientId,
    GROK_BUILD_OAUTH_CONFIG.clientId,
    "config.clientId must reference the Grok Build PKCE config"
  );
  assert.equal(grokCli.config.authorizeUrl, "https://auth.x.ai/oauth2/authorize");
  assert.equal(grokCli.config.tokenUrl, "https://auth.x.ai/oauth2/token");
  assert.equal(grokCli.config.codeChallengeMethod, "S256");
  assert.equal(grokCli.config.callbackPath, "/callback");
  assert.equal(grokCli.config.callbackHost, "127.0.0.1");
  assert.equal(grokCli.config.loopbackPort, 56122);
  assert.ok(
    grokCli.config.scope.includes("grok-cli:access"),
    "PKCE scope must include the Grok Build entitlement"
  );
});

test("grokCli.fixedPort / callbackPath / callbackHost / pkceVerifierBytes match upstream", () => {
  assert.equal(grokCli.fixedPort, 56122);
  assert.equal(grokCli.callbackPath, "/callback");
  assert.equal(grokCli.callbackHost, "127.0.0.1");
  assert.equal(grokCli.pkceVerifierBytes, 96);
});

test("GROK_CLI_CONFIG carries verified device-code endpoints + scope", () => {
  // Sources are checked: must match the upstream contract and the Task 0149
  // shared header fingerprint module (open-sse/config/grokBuild.ts).
  assert.equal(GROK_CLI_CONFIG.issuer, "https://auth.x.ai");
  assert.equal(GROK_CLI_CONFIG.deviceCodeUrl, "https://auth.x.ai/oauth2/device/code");
  assert.equal(GROK_CLI_CONFIG.tokenUrl, "https://auth.x.ai/oauth2/token");
  assert.ok(
    typeof GROK_CLI_CONFIG.scope === "string" && GROK_CLI_CONFIG.scope.length > 0,
    "device-code scope must be a non-empty string"
  );
  assert.ok(
    GROK_CLI_CONFIG.scope.split(" ").includes("grok-cli:access"),
    "device-code scope must include the Grok Build entitlement"
  );
});

test("requestDeviceCode posts to GROK_CLI_CONFIG.deviceCodeUrl with verified client_id + scope + referrer", async () => {
  let capturedUrl = null;
  let capturedInit = null;
  globalThis.fetch = async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return jsonResponse({
      device_code: "DEV-12345",
      user_code: "ABCD-EFGH",
      verification_uri: "https://auth.x.ai/device",
      verification_uri_complete: "https://auth.x.ai/device?user_code=ABCD-EFGH",
      expires_in: 600,
      interval: 5,
    });
  };

  const result = await grokCli.requestDeviceCode();

  assert.equal(capturedUrl, "https://auth.x.ai/oauth2/device/code");
  assert.equal(capturedInit.method, "POST");
  const body = new URLSearchParams(capturedInit.body);
  assert.equal(body.get("client_id"), GROK_CLI_CONFIG.clientId);
  assert.equal(body.get("scope"), GROK_CLI_CONFIG.scope);
  assert.equal(body.get("referrer"), "grok-build");

  assert.equal(result.device_code, "DEV-12345");
  assert.equal(result.user_code, "ABCD-EFGH");
  assert.equal(result.verification_uri, "https://auth.x.ai/device");
  assert.equal(
    result.verification_uri_complete,
    "https://auth.x.ai/device?user_code=ABCD-EFGH"
  );
  assert.equal(result.expires_in, 600);
  assert.equal(result.interval, 5);
});

test("requestDeviceCode rejects non-https verification URLs", async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      device_code: "DEV-1",
      user_code: "ABCD-1234",
      verification_uri: "javascript:alert(1)",
      expires_in: 600,
      interval: 5,
    });

  await assert.rejects(
    () => grokCli.requestDeviceCode(),
    /invalid verification URL|unsupported verification URL/i,
    "non-https verification_uri must be rejected"
  );
});

test("requestDeviceCode rejects HTTP verification URLs that aren't loopback", async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      device_code: "DEV-1",
      user_code: "ABCD-1234",
      verification_uri: "http://example.com/device",
      expires_in: 600,
      interval: 5,
    });

  await assert.rejects(
    () => grokCli.requestDeviceCode(),
    /invalid verification URL|unsupported verification URL/i
  );
});

test("requestDeviceCode rejects malformed user_code shapes", async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      device_code: "DEV-1",
      user_code: "bad code with spaces & chars!",
      verification_uri: "https://auth.x.ai/device",
      expires_in: 600,
      interval: 5,
    });

  await assert.rejects(
    () => grokCli.requestDeviceCode(),
    /invalid device code/i
  );
});

test("requestDeviceCode rejects control characters in verification URL", async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      device_code: "DEV-1",
      user_code: "ABCD-1234",
      verification_uri: "https://auth.x.ai/device\n\x07",
      expires_in: 600,
      interval: 5,
    });

  await assert.rejects(
    () => grokCli.requestDeviceCode(),
    /invalid verification URL/i
  );
});

test("requestDeviceCode surfaces upstream error_description on non-2xx response", async () => {
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
    /client_id is required/i,
    "Upstream error_description must surface sanitized"
  );
});

test("pollToken returns ok=false with authorization_pending on pending poll", async () => {
  globalThis.fetch = async () =>
    jsonResponse(
      {
        error: "authorization_pending",
        error_description: "The user has not yet completed authorization.",
      },
      400
    );

  const result = await grokCli.pollToken(undefined, "DEV-12345");
  assert.equal(result.ok, false);
  assert.equal(result.data.error, "authorization_pending");
  assert.equal(result.data.error_description, "The user has not yet completed authorization.");
});

test("pollToken distinguishes slow_down as pending (no leak of token fields)", async () => {
  globalThis.fetch = async () =>
    jsonResponse(
      {
        error: "slow_down",
        error_description: "You are polling too quickly.",
      },
      400
    );

  const result = await grokCli.pollToken(undefined, "DEV-12345");
  assert.equal(result.ok, false);
  assert.equal(result.data.error, "slow_down");
  assert.equal(
    "access_token" in (result.data || {}),
    false,
    "Pending polls MUST NOT leak access_token"
  );
});

test("pollToken returns ok=true with access_token on success and maps to identity/expiry", async () => {
  const accessJwt = createJwt({
    sub: "user-7777",
    email: "user@example.com",
    team_id: "team-9",
    tier: 1,
    principal_type: "User",
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const idJwt = createJwt({
    email: "user@example.com",
    name: "Test User",
  });

  globalThis.fetch = async () =>
    jsonResponse({
      access_token: accessJwt,
      refresh_token: "rt-secret-9999",
      id_token: idJwt,
      expires_in: 3600,
      token_type: "Bearer",
      scope: "openid profile email offline_access grok-cli:access",
    });

  const result = await grokCli.pollToken(undefined, "DEV-12345");
  assert.equal(result.ok, true);
  assert.equal(result.data.access_token, accessJwt);
  assert.equal(result.data.refresh_token, "rt-secret-9999");

  // mapTokens must round-trip the standard token-endpoint response through
  // isGrokBuildBrowserTokens detection (snake_case access_token) without
  // returning secrets that bypass identity/expiry mapping.
  const mapped = grokCli.mapTokens(result.data);
  assert.equal(mapped.accessToken, accessJwt);
  assert.equal(mapped.refreshToken, "rt-secret-9999");
  assert.equal(mapped.email, "user@example.com");
  assert.ok(
    mapped.expiresIn > 0 && mapped.expiresIn <= 3600,
    "expiresIn must be clamped to a positive integer within the JWT exp window"
  );
});

test("pollToken surfaces expired_token as a terminal error", async () => {
  globalThis.fetch = async () =>
    jsonResponse(
      {
        error: "expired_token",
        error_description: "The device code has expired.",
      },
      400
    );

  const result = await grokCli.pollToken(undefined, "DEV-12345");
  assert.equal(result.ok, false);
  assert.equal(result.data.error, "expired_token");
});

test("pollToken surfaces access_denied as a terminal error", async () => {
  globalThis.fetch = async () =>
    jsonResponse(
      {
        error: "access_denied",
        error_description: "The user denied the request.",
      },
      400
    );

  const result = await grokCli.pollToken(undefined, "DEV-12345");
  assert.equal(result.ok, false);
  assert.equal(result.data.error, "access_denied");
});

test("pollToken success preserves Grok identity claims (principalType/principalId/userId) for refresh + headers", async () => {
  // The executor reads providerSpecificData.principalType + principalId on
  // every refresh and userId for request headers. The device-code flow is the
  // PRIMARY grok-cli login, so it MUST surface these — otherwise a device-code
  // login silently degrades refresh/header behavior against a paste-token
  // import. The access_token here is the long-lived Grok Build JWT that still
  // carries the custom claims (mirrors what the paste-token path reads).
  const accessJwt = createJwt({
    sub: "user-7777",
    email: "user@example.com",
    team_id: "team-9",
    tier: 1,
    principal_type: "Team",
    principal_id: "team-principal-id",
  });
  const idJwt = createJwt({ email: "user@example.com", name: "Test User" });

  globalThis.fetch = async () =>
    jsonResponse({
      access_token: accessJwt,
      refresh_token: "rt-secret-9999",
      id_token: idJwt,
      expires_in: 3600,
      token_type: "Bearer",
      scope: "openid profile email offline_access grok-cli:access",
    });

  const result = await grokCli.pollToken(undefined, "DEV-12345");
  assert.equal(result.ok, true);

  const mapped = grokCli.mapTokens(result.data);
  assert.equal(mapped.email, "user@example.com", "email still resolves off id_token");
  assert.equal(mapped.providerSpecificData.principalType, "Team");
  assert.equal(mapped.providerSpecificData.principalId, "team-principal-id");
  assert.equal(mapped.providerSpecificData.teamId, "team-principal-id");
  // Team principal keys the connection off principal_id, not sub.
  assert.equal(mapped.providerSpecificData.userId, "team-principal-id");
  assert.equal(mapped.providerSpecificData.tier, 1);
});

test("pollToken success with opaque (non-JWT) access_token adds no identity claims (PKCE parity)", async () => {
  // The browser-PKCE exchange returns an opaque bearer token. That must decode
  // to NO Grok claims, so providerSpecificData stays {scope, tokenType} and
  // the device-code claim-extraction never fires for the PKCE path.
  const idJwt = createJwt({ email: "pkce@example.com", name: "PKCE User" });
  globalThis.fetch = async () =>
    jsonResponse({
      access_token: "opaque-bearer-string",
      refresh_token: "rt-pkce",
      id_token: idJwt,
      expires_in: 7200,
      token_type: "Bearer",
      scope: "openid profile email offline_access grok-cli:access",
    });

  const result = await grokCli.pollToken(undefined, "DEV-OPAQUE");
  assert.equal(result.ok, true);
  const mapped = grokCli.mapTokens(result.data);
  assert.deepEqual(
    mapped.providerSpecificData,
    {
      scope: "openid profile email offline_access grok-cli:access",
      tokenType: "Bearer",
    },
    "opaque PKCE access_token must not leak synthetic identity claims"
  );
  assert.equal(mapped.email, "pkce@example.com");
});

test("requestDeviceCode falls back to verification_uri when complete is missing", async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      device_code: "DEV-2",
      user_code: "ZZZZ-9999",
      verification_uri: "https://auth.x.ai/device",
      expires_in: 300,
      interval: 7,
    });

  const result = await grokCli.requestDeviceCode();
  assert.equal(result.verification_uri_complete, "https://auth.x.ai/device");
  assert.equal(result.expires_in, 300);
  assert.equal(result.interval, 7);
});

test("requestDeviceCode defaults interval=5 / expires_in=1800 when upstream omits them", async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      device_code: "DEV-3",
      user_code: "AAAA-1111",
      verification_uri: "https://auth.x.ai/device",
    });

  const result = await grokCli.requestDeviceCode();
  assert.equal(result.expires_in, 1800);
  assert.equal(result.interval, 5);
});
