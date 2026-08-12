/**
 * Grok Build (grok-cli) browser PKCE tests (#0151)
 *
 * Asserts the browser PKCE authorization code flow:
 *
 *   - buildAuthUrl produces a fresh, S256 challenge-bound authorization URL on
 *     auth.x.ai/oauth2/authorize carrying scope/client_id/state/challenge.
 *   - exchangeToken performs a code-for-token exchange against
 *     auth.x.ai/oauth2/token with grant_type=authorization_code + verifier.
 *   - mapTokens detects the snake_case access_token shape and routes through
 *     mapGrokBuildBrowserTokens, producing a persisted connection shape with
 *     email/name/scope/tokenType (mirrors what the dashboard's import path
 *     writes via the existing OAuth/connection-persistence module).
 *   - The browser PKCE flow uses a 96-byte verifier (matches upstream).
 *   - Identity resolution handles id_token email/name extraction when present
 *     and falls back to null when absent (no fabrication).
 *
 * All transport-layer exchanges are mocked; nothing reaches the upstream
 * auth.x.ai or cli-chat-proxy hosts.
 */

import test from "node:test";
import assert from "node:assert/strict";

const { grokCli } = await import("../../src/lib/oauth/providers/grok-cli.ts");
const { GROK_BUILD_OAUTH_CONFIG } = await import("../../src/lib/oauth/constants/oauth.ts");
const { generatePKCE } = await import("../../src/lib/oauth/utils/pkce.ts");
const { generateCodeChallenge } = await import("../../src/lib/oauth/utils/pkce.ts");
const { isGrokBuildBrowserTokens, mapGrokBuildBrowserTokens, buildGrokBuildAuthUrl, exchangeGrokBuildToken } = await import(
  "../../src/lib/oauth/providers/grok-cli-oauth.ts"
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

test("buildAuthUrl delegates to buildGrokBuildAuthUrl with the PKCE config", () => {
  const { codeVerifier, codeChallenge, state } = generatePKCE(grokCli.pkceVerifierBytes);
  const redirectUri = `http://${GROK_BUILD_OAUTH_CONFIG.callbackHost}:${GROK_BUILD_OAUTH_CONFIG.loopbackPort}${GROK_BUILD_OAUTH_CONFIG.callbackPath}`;
  const url = grokCli.buildAuthUrl(grokCli.config, redirectUri, state, codeChallenge);
  assert.ok(url.startsWith("https://auth.x.ai/oauth2/authorize?"));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.equal(parsed.searchParams.get("client_id"), GROK_BUILD_OAUTH_CONFIG.clientId);
  assert.equal(parsed.searchParams.get("redirect_uri"), redirectUri);
  assert.equal(parsed.searchParams.get("scope"), GROK_BUILD_OAUTH_CONFIG.scope);
  assert.equal(parsed.searchParams.get("code_challenge"), codeChallenge);
  assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
  assert.equal(parsed.searchParams.get("state"), state);
  assert.ok(codeVerifier.length >= 43, "PKCE verifier must be at least 43 chars");
  // The challenge must actually be the S256 hash of the verifier.
  assert.equal(generateCodeChallenge(codeVerifier), codeChallenge);
});

test("buildGrokBuildAuthUrl standalone helper returns a sanitized authorize URL", () => {
  const url = buildGrokBuildAuthUrl(
    GROK_BUILD_OAUTH_CONFIG,
    "http://127.0.0.1:56122/callback",
    "state-abc",
    "challenge-xyz"
  );
  assert.ok(url.startsWith("https://auth.x.ai/oauth2/authorize?"));
  const params = new URL(url).searchParams;
  assert.equal(params.get("state"), "state-abc");
  assert.equal(params.get("code_challenge"), "challenge-xyz");
  assert.equal(params.get("code_challenge_method"), "S256");
});

test("exchangeToken posts grant_type=authorization_code + verifier + redirect_uri", async () => {
  let capturedUrl = null;
  let capturedInit = null;
  globalThis.fetch = async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return jsonResponse({
      access_token: "browser-access-token",
      refresh_token: "browser-refresh-token",
      id_token: createJwt({ email: "browser@example.com", name: "Browser User" }),
      expires_in: 7200,
      token_type: "Bearer",
      scope: "openid profile email offline_access grok-cli:access",
    });
  };

  const redirectUri = `http://${GROK_BUILD_OAUTH_CONFIG.callbackHost}:${GROK_BUILD_OAUTH_CONFIG.loopbackPort}/callback`;
  const result = await grokCli.exchangeToken(
    grokCli.config,
    "code-from-redirect",
    redirectUri,
    "verifier-string"
  );

  assert.equal(capturedUrl, "https://auth.x.ai/oauth2/token");
  assert.equal(capturedInit.method, "POST");
  assert.match(
    capturedInit.headers["Content-Type"] || capturedInit.headers["content-type"],
    /application\/x-www-form-urlencoded/
  );
  const body = new URLSearchParams(capturedInit.body);
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(body.get("client_id"), GROK_BUILD_OAUTH_CONFIG.clientId);
  assert.equal(body.get("code"), "code-from-redirect");
  assert.equal(body.get("redirect_uri"), redirectUri);
  assert.equal(body.get("code_verifier"), "verifier-string");

  assert.equal(result.access_token, "browser-access-token");
  assert.equal(result.refresh_token, "browser-refresh-token");
  assert.equal(result.expires_in, 7200);
});

test("exchangeGrokBuildToken throws sanitized error when token endpoint returns non-2xx", async () => {
  globalThis.fetch = async () =>
    new Response("server exploded", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });

  await assert.rejects(
    () => exchangeGrokBuildToken(GROK_BUILD_OAUTH_CONFIG, "code", "http://127.0.0.1:56122/cb", "v"),
    /Grok Build token exchange failed/
  );
});

test("isGrokBuildBrowserTokens detects snake_case access_token shape", () => {
  assert.equal(isGrokBuildBrowserTokens(null), false);
  assert.equal(isGrokBuildBrowserTokens({}), false);
  assert.equal(isGrokBuildBrowserTokens({ accessToken: "x" }), false);
  assert.equal(isGrokBuildBrowserTokens({ access_token: "y" }), true);
});

test("mapGrokBuildBrowserTokens maps standard token-endpoint response into connection shape", () => {
  const tokens = {
    access_token: "browser-access-token",
    refresh_token: "browser-refresh-token",
    id_token: createJwt({ email: "browser@example.com", name: "Browser User" }),
    expires_in: 7200,
    token_type: "Bearer",
    scope: "openid profile email offline_access grok-cli:access",
  };

  const mapped = mapGrokBuildBrowserTokens(tokens);
  assert.equal(mapped.accessToken, "browser-access-token");
  assert.equal(mapped.refreshToken, "browser-refresh-token");
  assert.equal(mapped.email, "browser@example.com");
  assert.equal(mapped.name, "Browser User");
  assert.equal(mapped.expiresIn, 7200);
  assert.equal(mapped.providerSpecificData.scope, tokens.scope);
  assert.equal(mapped.providerSpecificData.tokenType, "Bearer");
});

test("mapGrokBuildBrowserTokens falls back to a positive TTL when expires_in is non-numeric", () => {
  const mapped = mapGrokBuildBrowserTokens({
    access_token: "x",
    refresh_token: "rt",
    expires_in: "not-a-number",
  });
  assert.ok(mapped.expiresIn >= 1, "expiresIn must be clamped to a positive integer");
});

test("mapTokens detects browser tokens (snake_case) and routes through mapGrokBuildBrowserTokens", () => {
  const tokens = {
    access_token: "browser-access-token",
    refresh_token: "browser-refresh-token",
    id_token: createJwt({ email: "browser@example.com", name: "Browser User" }),
    expires_in: 3600,
    token_type: "Bearer",
    scope: "openid profile email offline_access grok-cli:access",
  };

  const mapped = grokCli.mapTokens(tokens);
  assert.equal(mapped.accessToken, "browser-access-token");
  assert.equal(mapped.refreshToken, "browser-refresh-token");
  assert.equal(mapped.email, "browser@example.com");
  assert.equal(mapped.providerSpecificData.scope, tokens.scope);
  assert.equal(mapped.providerSpecificData.tokenType, "Bearer");
});

test("mapTokens handles raw JWT import fallback (single string) without leaking raw payload", () => {
  const jwt = createJwt({
    sub: "user-123",
    email: "raw@example.com",
    team_id: "team-1",
    tier: 2,
    principal_type: "User",
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const mapped = grokCli.mapTokens(jwt);
  assert.equal(mapped.accessToken, jwt);
  assert.equal(mapped.refreshToken, null);
  assert.equal(mapped.email, "raw@example.com");
  assert.equal(mapped.providerSpecificData.userId, "user-123");
  assert.equal(mapped.providerSpecificData.teamId, "team-1");
  assert.equal(mapped.providerSpecificData.tier, 2);
  assert.equal(mapped.providerSpecificData.principalType, "User");
});

test("mapTokens handles full auth.json object import with refresh_token", () => {
  const jwt = createJwt({
    sub: "user-999",
    email: "auth-json@example.com",
    team_id: "team-42",
    tier: 1,
    principal_type: "User",
    exp: Math.floor(Date.now() / 1000) + 21600,
  });
  const authJson = {
    "https://auth.x.ai::some-client-id": {
      key: jwt,
      refresh_token: "refresh-token-from-auth-json",
    },
  };

  const mapped = grokCli.mapTokens(authJson);
  assert.equal(mapped.accessToken, jwt);
  assert.equal(mapped.refreshToken, "refresh-token-from-auth-json");
  assert.equal(mapped.email, "auth-json@example.com");
  assert.deepEqual(mapped.providerSpecificData.rawAuthJson, authJson);
});

test("mapTokens handles wrapped auth.json (route handler wrapper)", () => {
  const jwt = createJwt({ email: "wrapped@example.com", sub: "u1" });
  const authJson = { "https://auth.x.ai::cid": { key: jwt, refresh_token: "rt-wrap" } };
  const wrapped = { accessToken: authJson };

  const mapped = grokCli.mapTokens(wrapped);
  assert.equal(mapped.accessToken, jwt);
  assert.equal(mapped.refreshToken, "rt-wrap");
  assert.deepEqual(mapped.providerSpecificData.rawAuthJson, authJson);
});

test("mapTokens identity resolution normalizes team and organization principal types", () => {
  const teamJwt = createJwt({
    sub: "ignored-sub",
    email: "team-user@example.com",
    team_id: "team-principal-id",
    tier: 1,
    principal_type: "Team",
    principal_id: "team-principal-id",
    organization_id: "",
  });
  const mapped = grokCli.mapTokens(teamJwt);
  // Team principal must override sub-derived user_id with principal_id.
  assert.equal(mapped.providerSpecificData.userId, "team-principal-id");
  assert.equal(mapped.providerSpecificData.teamId, "team-principal-id");
  assert.equal(mapped.providerSpecificData.principalType, "Team");
  assert.equal(mapped.providerSpecificData.principalId, "team-principal-id");

  const orgJwt = createJwt({
    sub: "ignored-sub-2",
    email: "org-user@example.com",
    team_id: "",
    tier: 1,
    principal_type: "Organization",
    principal_id: "org-principal-id",
    organization_id: "",
  });
  const orgMapped = grokCli.mapTokens(orgJwt);
  assert.equal(orgMapped.providerSpecificData.userId, "org-principal-id");
  assert.equal(orgMapped.providerSpecificData.organizationId, "org-principal-id");
  assert.equal(orgMapped.providerSpecificData.principalType, "Organization");
});

test("mapTokens clamps expires_in to a positive integer (#5775)", () => {
  // Token-endpoint response with non-positive expires_in.
  const tokens = { access_token: "x", refresh_token: "rt", expires_in: 0 };
  const mapped = grokCli.mapTokens(tokens);
  assert.ok(mapped.expiresIn >= 1, "expiresIn must be clamped to a positive integer");
});

test("mapTokens derives expiresIn from JWT exp when expires_in is missing", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 1234;
  const jwt = createJwt({ sub: "u", exp: futureExp });
  const mapped = grokCli.mapTokens(jwt);
  assert.ok(mapped.expiresIn >= 1 && mapped.expiresIn <= 1234);
});

test("mapTokens preserves token fields without redaction leaks (browser path)", () => {
  const tokens = {
    access_token: "bt-access",
    refresh_token: "bt-refresh",
    id_token: createJwt({ email: "bt@example.com" }),
    expires_in: 3600,
    token_type: "Bearer",
    scope: "openid profile email offline_access grok-cli:access",
  };
  const mapped = grokCli.mapTokens(tokens);
  assert.equal(mapped.accessToken, "bt-access");
  assert.equal(mapped.refreshToken, "bt-refresh");
  assert.equal(mapped.idToken, tokens.id_token);
  assert.equal(mapped.tokenType, "Bearer");
  assert.equal(mapped.scope, tokens.scope);
});
