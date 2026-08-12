/**
 * Grok Build OAuth Provider — regression tests for import-token fallback (#0151)
 *
 * The fork added device-code (primary) and browser PKCE (additional) flows on
 * top of the existing auth.json / raw JWT import fallback (Task #7358 / #7013
 * upstream). These tests preserve backwards-compatible behaviour for the
 * paste-token / auth.json import path so users with existing ~/.grok/auth.json
 * files keep working unchanged.
 *
 * The device-code / PKCE-specific assertions live in:
 *   - tests/unit/grok-cli-device-code.test.ts
 *   - tests/unit/grok-cli-pkce.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";

const { grokCli } = await import("../../src/lib/oauth/providers/grok-cli.ts");
const { resolvePublicCred } = await import("@omniroute/open-sse/utils/publicCreds");
const { GROK_BUILD_OAUTH_CONFIG, GROK_CLI_CONFIG } = await import(
  "../../src/lib/oauth/constants/oauth.ts"
);

function createJwt(payload) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url").replace(/=/g, "");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

test("Grok Build OAuth Provider - flowType is device_code with browser PKCE as additional capability", () => {
  assert.equal(grokCli.flowType, "device_code");
  assert.equal(grokCli.supportsBrowserPkce, true);
});

test("Grok Build OAuth Provider - config matches the verified Grok Build PKCE config", () => {
  assert.ok(grokCli.config.clientId, "clientId should be defined");
  // The public client_id must come from the embedded default (Hard Rule #11),
  // not a string literal — assert it matches resolvePublicCred("grok_id").
  assert.equal(
    grokCli.config.clientId,
    resolvePublicCred("grok_id", "GROK_OAUTH_CLIENT_ID"),
    "clientId must resolve from the embedded grok_id default"
  );
  assert.equal(grokCli.config.tokenUrl, "https://auth.x.ai/oauth2/token");
  assert.equal(grokCli.config.authorizeUrl, "https://auth.x.ai/oauth2/authorize");
  // The browser PKCE config carries the verified Grok Build entitlement scope.
  assert.ok(
    grokCli.config.scope.includes("grok-cli:access"),
    "PKCE scope must include the Grok Build entitlement"
  );
  // The PKCE config is the canonical reference used by OAuthModal & provider
  // pinning tests, so config.reference-equals GROK_BUILD_OAUTH_CONFIG.
  assert.equal(grokCli.config, GROK_BUILD_OAUTH_CONFIG);
});

test("publicCreds: grok_id embedded default is present and decodes", () => {
  const decoded = resolvePublicCred("grok_id");
  assert.ok(decoded.length > 0, "grok_id must decode to a non-empty client id");
});

test("GROK_CLI_CONFIG exposes device-code endpoints separate from the PKCE config", () => {
  // The device-code config keeps the upstream GROK_CLI_CONFIG surface; the
  // PKCE config carries the browser PKCE endpoints/scopes/callback shape.
  assert.equal(GROK_CLI_CONFIG.tokenUrl, "https://auth.x.ai/oauth2/token");
  assert.equal(GROK_CLI_CONFIG.deviceCodeUrl, "https://auth.x.ai/oauth2/device/code");
});

test("Grok Build OAuth Provider - mapTokens from raw JWT (import fallback)", () => {
  // Create a valid JWT with base64url-encoded payload
  const payload = {
    sub: "12345",
    email: "test@example.com",
    team_id: "team-67890",
    tier: 1,
    principal_type: "User",
  };
  const mockJwt = createJwt(payload);

  const result = grokCli.mapTokens(mockJwt, null);

  assert.equal(result.accessToken, mockJwt);
  assert.equal(result.refreshToken, null);
  assert.equal(result.email, "test@example.com");
  assert.equal(result.providerSpecificData?.userId, "12345");
  assert.equal(result.providerSpecificData?.teamId, "team-67890");
  assert.equal(result.providerSpecificData?.tier, 1);
});

test("Grok Build OAuth Provider - mapTokens from auth.json (import fallback)", () => {
  const authJson = {
    "https://auth.x.ai::clientId": {
      key: createJwt({ email: "test@example.com" }),
      refresh_token: "test-refresh-token",
    },
  };
  const result = grokCli.mapTokens(authJson, null);

  assert.ok(result.accessToken.includes("eyJ"), "accessToken should be JWT");
  assert.equal(result.refreshToken, "test-refresh-token");
  assert.equal(result.email, "test@example.com");
});

test("Grok Build OAuth Provider - mapTokens from empty string", () => {
  const result = grokCli.mapTokens("", null);
  assert.equal(result.accessToken, "");
});

test("Grok Build OAuth Provider - mapTokens from object with accessToken", () => {
  const input = { accessToken: "direct-token" };
  const result = grokCli.mapTokens(input, null);
  assert.equal(result.accessToken, "direct-token");
});

test("Grok Build OAuth Provider - mapTokens from route-wrapped auth.json", () => {
  // The route handler wraps the token: { accessToken: <token> }.
  // This simulates what the import-token endpoint passes to mapTokens.
  const authJson = {
    "https://auth.x.ai::b1a00492-073a-47ea-816f-4c329264a828": {
      key: createJwt({ email: "test@example.com" }),
      refresh_token: "test-refresh-token-wrapped",
      expires_at: "2026-12-31T00:00:00Z",
    },
  };
  const wrapped = { accessToken: authJson };
  const result = grokCli.mapTokens(wrapped, null);

  assert.ok(
    result.accessToken.startsWith("eyJ"),
    "accessToken should be JWT from wrapped auth.json"
  );
  assert.equal(result.refreshToken, "test-refresh-token-wrapped");
  assert.equal(result.email, "test@example.com");
  assert.ok(result.providerSpecificData?.rawAuthJson, "rawAuthJson should be populated");
  assert.deepEqual(
    result.providerSpecificData?.rawAuthJson,
    authJson,
    "rawAuthJson should equal the original auth.json"
  );
});

test("Grok Build OAuth Provider - mapTokens from direct auth.json has rawAuthJson", () => {
  const authJson = {
    "https://auth.x.ai::clientId": {
      key: createJwt({ email: "test@example.com" }),
      refresh_token: "direct-refresh",
    },
  };
  const result = grokCli.mapTokens(authJson, null);

  assert.ok(result.accessToken.startsWith("eyJ"));
  assert.equal(result.refreshToken, "direct-refresh");
  assert.deepEqual(result.providerSpecificData?.rawAuthJson, authJson);
});

test("Grok Build OAuth Provider - mapTokens from raw JWT has no rawAuthJson", () => {
  const payload = { sub: "12345", email: "test@example.com" };
  const mockJwt = createJwt(payload);
  const result = grokCli.mapTokens(mockJwt, null);

  assert.equal(result.accessToken, mockJwt);
  assert.equal(result.refreshToken, null);
  assert.equal(result.providerSpecificData?.rawAuthJson, undefined);
});

test("Grok Build OAuth Provider - mapTokens browser (snake_case access_token) routes through browser mapper", () => {
  const browserTokens = {
    access_token: "browser-access",
    refresh_token: "browser-refresh",
    id_token: createJwt({ email: "browser@example.com", name: "Browser User" }),
    expires_in: 3600,
    token_type: "Bearer",
    scope: "openid profile email offline_access grok-cli:access",
  };
  const result = grokCli.mapTokens(browserTokens);
  assert.equal(result.accessToken, "browser-access");
  assert.equal(result.refreshToken, "browser-refresh");
  assert.equal(result.email, "browser@example.com");
  assert.equal(result.idToken, browserTokens.id_token);
  assert.equal(result.tokenType, "Bearer");
  assert.equal(result.scope, browserTokens.scope);
  assert.equal(
    result.providerSpecificData?.scope,
    browserTokens.scope,
    "Browser tokens persist scope in providerSpecificData"
  );
});

test("Grok Build OAuth Provider - mapTokens preserves refresh_token/principal_id fields (Task 0149 wiring)", () => {
  // Task 0149 reads providerSpecificData.principalType + principalId during
  // token refresh; this test pins those keys so the refresh contract stays
  // intact regardless of which flow acquired the tokens.
  const jwt = createJwt({
    sub: "ignored-sub",
    email: "team-user@example.com",
    principal_type: "Team",
    principal_id: "team-principal-id",
    organization_id: "team-principal-id",
  });
  const result = grokCli.mapTokens(jwt);
  assert.equal(result.providerSpecificData.principalType, "Team");
  assert.equal(result.providerSpecificData.principalId, "team-principal-id");
  assert.equal(result.providerSpecificData.userId, "team-principal-id");
  assert.equal(result.providerSpecificData.teamId, "team-principal-id");
});
