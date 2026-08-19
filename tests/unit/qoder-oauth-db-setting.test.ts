import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Set DATA_DIR to isolated temp dir before importing DB modules
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-test-qoder-oauth-"));
process.env.DATA_DIR = tmpDir;

const core = await import("../../src/lib/db/core.ts");
const { setFeatureFlagOverride, removeFeatureFlagOverride, clearAllFeatureFlagOverrides } =
  await import("../../src/lib/db/featureFlags.ts");
const { getSettings, updateSettings } = await import("../../src/lib/db/settings.ts");
const {
  QODER_CONFIG,
  resolveQoderOAuthEnabled,
  resolveQoderOAuthAuthorizeUrl,
  resolveQoderOAuthTokenUrl,
  resolveQoderOAuthUserInfoUrl,
  resolveQoderOAuthClientId,
  resolveQoderOAuthClientSecret,
  getQoderConfig,
  resetQoderConfigOverrides,
} = await import("../../src/lib/oauth/constants/oauth.ts");
const { qoder } = await import("../../src/lib/oauth/providers/qoder.ts");
const { generateAuthData } = await import("../../src/lib/oauth/providers.ts");
const { refreshQoderToken } = await import("../../open-sse/services/tokenRefresh.ts");
const settingsRoute = await import("../../src/app/api/settings/route.ts");
const oauthRoute = await import("../../src/app/api/oauth/[provider]/[action]/route.ts");

const ENV_KEYS = [
  "QODER_OAUTH_ENABLED",
  "ENABLE_QODER_OAUTH",
  "QODER_OAUTH_AUTHORIZE_URL",
  "QODER_OAUTH_TOKEN_URL",
  "QODER_OAUTH_USERINFO_URL",
  "QODER_OAUTH_CLIENT_ID",
  "QODER_OAUTH_CLIENT_SECRET",
];

function cleanEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("Qoder OAuth DB Setting & Feature Flag (Task 0170)", () => {
  beforeEach(() => {
    resetQoderConfigOverrides();
    cleanEnv();
    clearAllFeatureFlagOverrides();
    core.resetDbInstance();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  after(() => {
    resetQoderConfigOverrides();
    cleanEnv();
    core.resetDbInstance();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("is disabled by default when no DB setting, feature flag, or env vars are set", () => {
    assert.strictEqual(resolveQoderOAuthEnabled(), false);
    assert.strictEqual(QODER_CONFIG.enabled, false);
    assert.strictEqual(
      qoder.buildAuthUrl(QODER_CONFIG, "http://localhost/callback", "state"),
      null
    );

    const authData = generateAuthData("qoder", "http://localhost/callback");
    assert.strictEqual(authData.authUrl, null);
  });

  it("dynamically enables Qoder OAuth via DB setting without server restart", async () => {
    assert.strictEqual(resolveQoderOAuthEnabled(), false);

    await updateSettings({ qoderOAuthEnabled: true });

    assert.strictEqual(resolveQoderOAuthEnabled(), true);
    assert.strictEqual(QODER_CONFIG.enabled, true);

    const authUrl = qoder.buildAuthUrl(QODER_CONFIG, "http://localhost/callback", "test-state");
    assert.ok(typeof authUrl === "string");
    assert.ok(authUrl.startsWith("https://api.qoder.com/oauth/authorize?"));
    assert.ok(authUrl.includes("client_id=qoder-client"));
    assert.ok(authUrl.includes("state=test-state"));

    const authData = generateAuthData("qoder", "http://localhost/callback");
    assert.ok(typeof authData.authUrl === "string");
    assert.ok(authData.authUrl.includes("client_id=qoder-client"));
  });

  it("supports custom endpoint URLs configured via DB settings", async () => {
    await updateSettings({
      qoderOAuthEnabled: true,
      qoderOAuthAuthorizeUrl: "https://auth.custom-qoder.dev/oauth/authorize",
      qoderOAuthTokenUrl: "https://auth.custom-qoder.dev/oauth/token",
      qoderOAuthUserInfoUrl: "https://auth.custom-qoder.dev/api/user",
      qoderOAuthClientId: "custom-client-123",
      qoderOAuthClientSecret: "custom-secret-456",
    });

    assert.strictEqual(
      resolveQoderOAuthAuthorizeUrl(),
      "https://auth.custom-qoder.dev/oauth/authorize"
    );
    assert.strictEqual(resolveQoderOAuthTokenUrl(), "https://auth.custom-qoder.dev/oauth/token");
    assert.strictEqual(resolveQoderOAuthUserInfoUrl(), "https://auth.custom-qoder.dev/api/user");
    assert.strictEqual(resolveQoderOAuthClientId(), "custom-client-123");
    assert.strictEqual(resolveQoderOAuthClientSecret(), "custom-secret-456");

    const authUrl = qoder.buildAuthUrl(QODER_CONFIG, "http://localhost/callback", "state-999");
    assert.ok(authUrl?.startsWith("https://auth.custom-qoder.dev/oauth/authorize?"));
    assert.ok(authUrl?.includes("client_id=custom-client-123"));
  });

  it("dynamically disables Qoder OAuth when DB setting is set to false", async () => {
    await updateSettings({ qoderOAuthEnabled: true });
    assert.strictEqual(resolveQoderOAuthEnabled(), true);

    await updateSettings({ qoderOAuthEnabled: false });
    assert.strictEqual(resolveQoderOAuthEnabled(), false);
    assert.strictEqual(QODER_CONFIG.enabled, false);
    assert.strictEqual(
      qoder.buildAuthUrl(QODER_CONFIG, "http://localhost/callback", "state"),
      null
    );
  });

  it("enables Qoder OAuth dynamically via Feature Flag DB override", () => {
    assert.strictEqual(resolveQoderOAuthEnabled(), false);

    setFeatureFlagOverride("QODER_OAUTH_ENABLED", "true");

    assert.strictEqual(resolveQoderOAuthEnabled(), true);
    assert.strictEqual(QODER_CONFIG.enabled, true);

    const authUrl = qoder.buildAuthUrl(QODER_CONFIG, "http://localhost/callback", "state-ff");
    assert.ok(typeof authUrl === "string");
  });

  it("Feature Flag override takes precedence over DB settings and env vars", async () => {
    // DB setting true, but feature flag explicitly false
    await updateSettings({ qoderOAuthEnabled: true });
    setFeatureFlagOverride("QODER_OAUTH_ENABLED", "false");
    assert.strictEqual(resolveQoderOAuthEnabled(), false);

    // DB setting false, but feature flag explicitly true
    await updateSettings({ qoderOAuthEnabled: false });
    setFeatureFlagOverride("QODER_OAUTH_ENABLED", "true");
    assert.strictEqual(resolveQoderOAuthEnabled(), true);
  });

  it("falls back to environment variables if no DB setting or feature flag override exists", () => {
    process.env.QODER_OAUTH_AUTHORIZE_URL = "https://env.qoder.com/authorize";
    process.env.QODER_OAUTH_TOKEN_URL = "https://env.qoder.com/token";
    process.env.QODER_OAUTH_USERINFO_URL = "https://env.qoder.com/user";
    process.env.QODER_OAUTH_CLIENT_ID = "env-client";
    process.env.QODER_OAUTH_CLIENT_SECRET = "env-secret";

    assert.strictEqual(resolveQoderOAuthEnabled(), true);
    assert.strictEqual(QODER_CONFIG.enabled, true);
    assert.strictEqual(resolveQoderOAuthAuthorizeUrl(), "https://env.qoder.com/authorize");
    assert.strictEqual(resolveQoderOAuthTokenUrl(), "https://env.qoder.com/token");
    assert.strictEqual(resolveQoderOAuthUserInfoUrl(), "https://env.qoder.com/user");
    assert.strictEqual(resolveQoderOAuthClientId(), "env-client");
    assert.strictEqual(resolveQoderOAuthClientSecret(), "env-secret");

    const authUrl = qoder.buildAuthUrl(QODER_CONFIG, "http://localhost/callback", "state-env");
    assert.ok(authUrl?.startsWith("https://env.qoder.com/authorize?"));
  });

  it("returns standard disabled error message when exchange is attempted while disabled", async () => {
    assert.strictEqual(QODER_CONFIG.enabled, false);

    await assert.rejects(
      async () => {
        await qoder.exchangeToken(QODER_CONFIG, "test-code", "http://localhost/callback");
      },
      {
        name: "Error",
        message:
          "Qoder browser OAuth is experimental and disabled by default. Configure QODER_OAUTH_* environment variables or use a Personal Access Token.",
      }
    );

    await assert.rejects(
      async () => {
        await qoder.postExchange({ access_token: "test-token" });
      },
      {
        name: "Error",
        message:
          "Qoder browser OAuth is experimental and disabled by default. Configure QODER_OAUTH_* environment variables or use a Personal Access Token.",
      }
    );
  });

  it("supports object-level assignment for test harnesses and structuredClone", () => {
    const original = structuredClone(QODER_CONFIG);
    assert.strictEqual(typeof original.enabled, "boolean");

    Object.assign(QODER_CONFIG, {
      enabled: true,
      clientId: "mock-client",
      clientSecret: "mock-secret",
      authorizeUrl: "https://mock.qoder.dev/auth",
      tokenUrl: "https://mock.qoder.dev/token",
      userInfoUrl: "https://mock.qoder.dev/user",
    });

    assert.strictEqual(QODER_CONFIG.enabled, true);
    assert.strictEqual(QODER_CONFIG.clientId, "mock-client");
    assert.strictEqual(QODER_CONFIG.clientSecret, "mock-secret");
    assert.strictEqual(QODER_CONFIG.authorizeUrl, "https://mock.qoder.dev/auth");

    const conf = getQoderConfig();
    assert.strictEqual(conf.enabled, true);
    assert.strictEqual(conf.clientId, "mock-client");

    resetQoderConfigOverrides();
    assert.strictEqual(QODER_CONFIG.enabled, false);
  });

  it("GET /api/settings never exposes qoderOAuthClientSecret and returns hasQoderOAuthClientSecret", async () => {
    await updateSettings({
      qoderOAuthEnabled: true,
      qoderOAuthClientSecret: "super-secret-12345",
    });

    const getReq = new Request("http://localhost/api/settings");
    const res = await settingsRoute.GET(getReq);
    assert.strictEqual(res.status, 200);

    const body = (await res.json()) as Record<string, unknown>;
    assert.strictEqual(body.qoderOAuthEnabled, true);
    assert.strictEqual(body.hasQoderOAuthClientSecret, true);
    assert.strictEqual(body["qoderOAuthClientSecret"], undefined);
    assert.strictEqual(body["clientSecret"], undefined);
  });

  it("PATCH /api/settings updates Qoder OAuth settings dynamically", async () => {
    const patchReq = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qoderOAuthEnabled: true,
        qoderOAuthClientId: "api-client-id",
        qoderOAuthAuthorizeUrl: "https://api-auth.qoder.com/oauth/authorize",
      }),
    });

    const res = await settingsRoute.PATCH(patchReq);
    assert.strictEqual(res.status, 200);

    assert.strictEqual(resolveQoderOAuthEnabled(), true);
    assert.strictEqual(resolveQoderOAuthClientId(), "api-client-id");
    assert.strictEqual(
      resolveQoderOAuthAuthorizeUrl(),
      "https://api-auth.qoder.com/oauth/authorize"
    );
  });

  it("PATCH /api/settings never exposes qoderOAuthClientSecret in response and returns hasQoderOAuthClientSecret", async () => {
    const patchReq = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qoderOAuthEnabled: true,
        qoderOAuthClientId: "patch-client-id",
        qoderOAuthClientSecret: "super-secret-patch-value",
      }),
    });

    const res = await settingsRoute.PATCH(patchReq);
    assert.strictEqual(res.status, 200);

    const body = (await res.json()) as Record<string, unknown>;
    assert.strictEqual(body.qoderOAuthEnabled, true);
    assert.strictEqual(body.qoderOAuthClientId, "patch-client-id");
    assert.strictEqual(body.hasQoderOAuthClientSecret, true);
    assert.strictEqual(body["qoderOAuthClientSecret"], undefined);
    assert.strictEqual(body["clientSecret"], undefined);
  });

  it("PUT /api/settings never exposes qoderOAuthClientSecret in response and returns hasQoderOAuthClientSecret", async () => {
    const putReq = new Request("http://localhost/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qoderOAuthEnabled: true,
        qoderOAuthClientId: "put-client-id",
        qoderOAuthClientSecret: "super-secret-put-value",
      }),
    });

    const res = await settingsRoute.PUT(putReq);
    assert.strictEqual(res.status, 200);

    const body = (await res.json()) as Record<string, unknown>;
    assert.strictEqual(body.qoderOAuthEnabled, true);
    assert.strictEqual(body.qoderOAuthClientId, "put-client-id");
    assert.strictEqual(body.hasQoderOAuthClientSecret, true);
    assert.strictEqual(body["qoderOAuthClientSecret"], undefined);
    assert.strictEqual(body["clientSecret"], undefined);
  });

  it("refreshQoderToken dynamically resolves tokenUrl, clientId, and clientSecret from DB settings", async () => {
    await updateSettings({
      qoderOAuthEnabled: true,
      qoderOAuthTokenUrl: "https://auth.custom-qoder.dev/oauth/token",
      qoderOAuthClientId: "custom-refresh-client",
      qoderOAuthClientSecret: "custom-refresh-secret",
    });

    const calls: { url: string; options: RequestInit }[] = [];
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (url: string | URL | Request, options: RequestInit = {}) => {
        calls.push({ url: String(url), options });
        return new Response(
          JSON.stringify({
            access_token: "refreshed-access-token-123",
            refresh_token: "refreshed-refresh-token-456",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as typeof fetch;

      const result = await refreshQoderToken("old-refresh-token", {
        warn: () => {},
        error: () => {},
        info: () => {},
      });

      assert.deepStrictEqual(result, {
        accessToken: "refreshed-access-token-123",
        refreshToken: "refreshed-refresh-token-456",
        expiresIn: 3600,
      });

      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].url, "https://auth.custom-qoder.dev/oauth/token");
      const expectedAuth = `Basic ${btoa("custom-refresh-client:custom-refresh-secret")}`;
      const headers = calls[0].options.headers as Record<string, string>;
      assert.strictEqual(headers.Authorization, expectedAuth);
      assert.strictEqual(calls[0].options.method, "POST");
      const bodyStr = String(calls[0].options.body);
      assert.ok(bodyStr.includes("grant_type=refresh_token"));
      assert.ok(bodyStr.includes("refresh_token=old-refresh-token"));
      assert.ok(bodyStr.includes("client_id=custom-refresh-client"));
      assert.ok(bodyStr.includes("client_secret=custom-refresh-secret"));
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("refreshQoderToken skips refresh when OAuth is not enabled/configured", async () => {
    let warnLogged = false;
    const log = {
      warn: (_topic: string, msg: string) => {
        if (msg.includes("Qoder OAuth refresh skipped")) warnLogged = true;
      },
      error: () => {},
      info: () => {},
    };

    const result = await refreshQoderToken("some-token", log);
    assert.strictEqual(result, null);
    assert.strictEqual(warnLogged, true);
  });

  it("refreshQoderToken returns null with 0 fetch calls when qoderOAuthEnabled DB setting is false even with env vars set", async () => {
    // Set environment variables that would otherwise enable Qoder OAuth
    process.env.QODER_OAUTH_AUTHORIZE_URL = "https://env.qoder.com/authorize";
    process.env.QODER_OAUTH_TOKEN_URL = "https://env.qoder.com/token";
    process.env.QODER_OAUTH_USERINFO_URL = "https://env.qoder.com/user";
    process.env.QODER_OAUTH_CLIENT_ID = "env-client";
    process.env.QODER_OAUTH_CLIENT_SECRET = "env-secret";

    // Explicitly disable via DB setting
    await updateSettings({ qoderOAuthEnabled: false });

    // Verify resolveQoderOAuthEnabled honours the DB override
    assert.strictEqual(resolveQoderOAuthEnabled(), false);

    const fetchCalls: unknown[] = [];
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (...args: unknown[]) => {
        fetchCalls.push(args);
        return new Response(
          JSON.stringify({
            access_token: "should-not-appear",
            refresh_token: "should-not-appear",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as typeof fetch;

      const result = await refreshQoderToken("old-refresh-token", {
        warn: () => {},
        error: () => {},
        info: () => {},
      });

      // Must return null — no token refresh performed
      assert.strictEqual(result, null);
      // Must have made 0 fetch calls — the enabled guard should short-circuit
      assert.strictEqual(fetchCalls.length, 0);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("refreshQoderToken returns null with 0 fetch calls when feature flag disables OAuth even with env vars set", async () => {
    // Set environment variables that would otherwise enable Qoder OAuth
    process.env.QODER_OAUTH_AUTHORIZE_URL = "https://env.qoder.com/authorize";
    process.env.QODER_OAUTH_TOKEN_URL = "https://env.qoder.com/token";
    process.env.QODER_OAUTH_USERINFO_URL = "https://env.qoder.com/user";
    process.env.QODER_OAUTH_CLIENT_ID = "env-client";
    process.env.QODER_OAUTH_CLIENT_SECRET = "env-secret";

    // Explicitly disable via Feature Flag
    setFeatureFlagOverride("QODER_OAUTH_ENABLED", "false");

    assert.strictEqual(resolveQoderOAuthEnabled(), false);

    const fetchCalls: unknown[] = [];
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (...args: unknown[]) => {
        fetchCalls.push(args);
        return new Response(
          JSON.stringify({
            access_token: "should-not-appear",
            refresh_token: "should-not-appear",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as typeof fetch;

      const result = await refreshQoderToken("old-refresh-token", {
        warn: () => {},
        error: () => {},
        info: () => {},
      });

      assert.strictEqual(result, null);
      assert.strictEqual(fetchCalls.length, 0);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("ProviderModalsPanel wires and renders QoderOAuthSettingsModal for qoder provider", () => {
    const modalsPanelSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/(dashboard)/dashboard/providers/[id]/components/ProviderModalsPanel.tsx"
      ),
      "utf8"
    );
    assert.match(
      modalsPanelSource,
      /import\s+QoderOAuthSettingsModal\s+from\s+["']\.\/QoderOAuthSettingsModal["']/
    );
    assert.match(
      modalsPanelSource,
      /providerId\s*===\s*["']qoder["']\s*\?\s*\(\s*<QoderOAuthSettingsModal/
    );
  });

  it("GET /api/oauth/qoder/authorize returns disabled messaging when off and valid authUrl when enabled", async () => {
    // 1. When disabled
    const disabledReq = new Request(
      "http://localhost/api/oauth/qoder/authorize?redirect_uri=http://localhost:8080/callback"
    );
    const disabledRes = await oauthRoute.GET(disabledReq, {
      params: Promise.resolve({ provider: "qoder", action: "authorize" }),
    });

    const disabledBody = (await disabledRes.json()) as Record<string, unknown>;
    assert.strictEqual(disabledBody.supported, false);
    assert.strictEqual(
      disabledBody.error,
      "Qoder browser OAuth is experimental and disabled by default. Configure QODER_OAUTH_* environment variables or use a Personal Access Token."
    );
    assert.strictEqual(disabledBody.authUrl, null);

    // 2. Enable via DB setting
    await updateSettings({ qoderOAuthEnabled: true });

    const enabledReq = new Request(
      "http://localhost/api/oauth/qoder/authorize?redirect_uri=http://localhost:8080/callback"
    );
    const enabledRes = await oauthRoute.GET(enabledReq, {
      params: Promise.resolve({ provider: "qoder", action: "authorize" }),
    });

    const enabledBody = (await enabledRes.json()) as Record<string, unknown>;
    assert.ok(typeof enabledBody.authUrl === "string");
    assert.ok((enabledBody.authUrl as string).startsWith("https://api.qoder.com/oauth/authorize?"));
    assert.strictEqual(enabledBody.error, undefined);
  });
});
