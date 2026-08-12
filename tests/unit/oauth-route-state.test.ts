/**
 * OAuth route — PKCE callback-session state boundary (Task 0151 F2)
 *
 * The route must store the generated state with the callback server session
 * (on `GET /api/oauth/{provider}/start-callback-server`) and compare it
 * server-side on `POST /api/oauth/{provider}/exchange` (matching pkce/poll-callback
 * flow) and `POST /api/oauth/{provider}/poll-callback`. Missing or mismatched
 * state must reject with a safe 400/400-like payload before any token exchange.
 * Manual input must not default a missing state to the expected value (UI-side
 * guard), but the route must still enforce independently — a direct POST with
 * no state must fail even if the UI guard is bypassed.
 *
 * Device-code non-PKCE semantics must be preserved: providers whose poll is
 * non-PKCE never create a callback session, so /exchange without state must
 * remain acceptable for those flows (not tested here — covered by the
 * kiro/github providers). This file focuses on PKCE-enabled providers:
 * grok-cli and codex.
 *
 * Uses the real route handlers via import + lightweight fetch mocking for the
 * provider layer; no network, no :22000, no real OAuth credentials.
 */

import test from "node:test";
import assert from "node:assert/strict";

// Provide a DATA_DIR so imports that touch dataPaths/sqlite don't hit the real DB
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
if (!process.env.DATA_DIR) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-route-state-"));
  process.env.DATA_DIR = d;
}

function makeReq(url: string, init: RequestInit = {}): Request {
  // Minimal shim: isAuthRequired/isAuthenticated read no auth header and return false
  // so auth gating is skipped; that's correct for this unit boundary (auth is not
  // the contract under test).
  const headers = new Headers(init.headers as HeadersInit | undefined);
  // Some checks read x-forwarded-host; not needed here.
  return new Request(url, { ...init, headers });
}

function params(provider: string, action: string) {
  return Promise.resolve({ provider, action });
}

const route = await import("../../src/app/api/oauth/[provider]/[action]/route.ts");

// Helpers to synthesize the callback session shape the route expects
function seedCallbackSession(provider: string, expectedState: string) {
  // Mimic what handleStartCallbackServer writes: { expectedState, codeVerifier, redirectUri, ... }
  // Provider key differs: codex -> __codexCallbackState, grok-cli -> __codexCallbackState as well
  const key = provider === "codex" || provider === "grok-cli" ? "__codexCallbackState" : "__windsurfCallbackState";
  const g = globalThis as unknown as Record<string, unknown>;
  (g as Record<string, unknown>)[key] = {
    callbackParams: null,
    close: () => {},
    port: 1455,
    redirectUri: `http://localhost:1455/auth/callback`,
    codeVerifier: "verifier-seeded",
    expectedState,
    startedAt: Date.now(),
  };
}

function clearCallbackSession(provider: string) {
  const key = provider === "codex" || provider === "grok-cli" ? "__codexCallbackState" : "__windsurfCallbackState";
  const g = globalThis as unknown as Record<string, unknown>;
  (g as Record<string, unknown>)[key] = null;
}

function seedPollCallbackParams(provider: string, params: Record<string, string>) {
  const key = provider === "codex" || provider === "grok-cli" ? "__codexCallbackState" : "__windsurfCallbackState";
  const g = globalThis as unknown as Record<string, unknown>;
  const slot = (g as Record<string, unknown>)[key] as Record<string, unknown> | null;
  if (!slot) throw new Error(`no callback session to seed poll-callback params for ${provider}`);
  (slot as Record<string, unknown>).callbackParams = params;
}

// Stub the provider layer so the route's exchange/poll path doesn't hit upstream.
// We only need the route to reach the state gate (which runs before proxy/exchange),
// but for the matching-state happy path the exchange would run — so mock fetch.
// Easiest: monkey-patch global fetch to return a fake token endpoint response for
// the grok-cli/codex exchange burst. The route uses `exchangeTokens(provider, ...)`
// which internally does `fetch(tokenUrl, ...)`.
let savedFetch: typeof globalThis.fetch | undefined;

function beginFetchStub() {
  savedFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    // Token exchange endpoint for grok-cli/codex (auth.x.ai / auth.openai)
    if (/\/oauth\/token/.test(url) || /auth\.x\.ai\/oauth2\/token/.test(url) || /auth\.openai\.com\/oauth\/token/.test(url)) {
      return new Response(
        JSON.stringify({
          access_token: "fake-access-token",
          refresh_token: "fake-refresh-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "openid profile email offline_access",
          id_token: "fake-id-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    // Fallback: echo 404 so missing stubs are obvious
    return new Response(JSON.stringify({ error: "unhandled stub " + url }), { status: 501 });
  }) as unknown as typeof globalThis.fetch;
}

function endFetchStub() {
  if (savedFetch) globalThis.fetch = savedFetch;
  savedFetch = undefined;
}

test.afterEach(() => {
  clearCallbackSession("grok-cli");
  clearCallbackSession("codex");
  endFetchStub();
});

// ── /exchange: missing / mismatched / matching state ────────────────────────

test("POST /exchange grok-cli: missing state with an active callback session is rejected (400)", async () => {
  seedCallbackSession("grok-cli", "expected-state-aaa");
  beginFetchStub();

  const req = makeReq("http://localhost:20128/api/oauth/grok-cli/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "code-123",
      redirectUri: "http://localhost:1455/auth/callback",
      codeVerifier: "verifier-seeded",
      // state omitted — must be rejected
    }),
  });

  const res = await route.POST(req, { params: params("grok-cli", "exchange") });
  const body = (await res.json()) as Record<string, unknown>;

  assert.equal(res.status, 400, `expected 400, got ${res.status} ${JSON.stringify(body)}`);
  const err = (body as { error?: { message?: string } }).error;
  assert.match(String(err?.message ?? body.error ?? ""), /state mismatch/i);
});

test("POST /exchange grok-cli: mismatched state with an active callback session is rejected (400)", async () => {
  seedCallbackSession("grok-cli", "expected-state-bbb");
  beginFetchStub();

  const req = makeReq("http://localhost:20128/api/oauth/grok-cli/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "code-123",
      redirectUri: "http://localhost:1455/auth/callback",
      codeVerifier: "verifier-seeded",
      state: "WRONG-STATE",
    }),
  });

  const res = await route.POST(req, { params: params("grok-cli", "exchange") });
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(res.status, 400);
  assert.match(String(((body.error as Record<string, unknown>)?.message as string) ?? body.error ?? ""), /state mismatch/i);
});

test("POST /exchange grok-cli: matching state with an active callback session passes the gate (not 400 state-mismatch)", async () => {
  // For a full happy-path we'd need a DB + provider upsert. Instead just prove the
  // route does NOT return the state-mismatch 400 — it should attempt exchange and then
  // either succeed or fail at the persistence layer, not at the state gate.
  // To keep the test DB-free, we seeded fetch but still lack SQLite tables — so
  // the route will return 500 after exchange rather than 200. That's fine: the point
  // is it was NOT rejected at the state gate (not 400).
  seedCallbackSession("grok-cli", "expected-state-ccc");
  beginFetchStub();

  const req = makeReq("http://localhost:20128/api/oauth/grok-cli/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "code-123",
      redirectUri: "http://localhost:1455/auth/callback",
      codeVerifier: "verifier-seeded",
      state: "expected-state-ccc",
    }),
  });

  const res = await route.POST(req, { params: params("grok-cli", "exchange") });
  // Must NOT be the state-gate 400. 500 (DB/extra exchange failure) is acceptable hence.
  assert.notEqual(res.status, 400, `matching state must not be rejected at the state gate (got 400 ${JSON.stringify(await res.clone().json().catch(() => ({})))})`);
});

test("POST /exchange grok-cli: without an active callback session, missing state is not rejected at the state gate", async () => {
  clearCallbackSession("grok-cli");
  beginFetchStub();

  const req = makeReq("http://localhost:20128/api/oauth/grok-cli/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "code-123",
      redirectUri: "http://127.0.0.1:56122/callback",
      codeVerifier: "verifier-seeded",
    }),
  });

  const res = await route.POST(req, { params: params("grok-cli", "exchange") });
  // When there's no callback session (e.g. manual paste on a fresh boot, or session expired),
  // the route cannot know the expected state at this layer — so it must not 400 here.
  // The exchange may still fail downstream for other reasons, but not for state.
  const body = (await res.clone().json().catch(() => ({}))) as Record<string, unknown>;
  const isStateMismatch400 =
    res.status === 400 && /state mismatch/i.test(String((body.error as Record<string, unknown>)?.message ?? body.error ?? ""));
  assert.equal(isStateMismatch400, false, `no-session missing-state must not 400 as state_mismatch; got ${res.status} ${JSON.stringify(body)}`);
});

// ── /poll-callback: missing / mismatched / matching state ───────────────────

test("POST /poll-callback grok-cli: missing callback state is rejected (400-like)", async () => {
  seedCallbackSession("grok-cli", "expected-state-ddd");
  seedPollCallbackParams("grok-cli", { code: "code-xyz" /* state omitted */ });

  const req = makeReq("http://localhost:20128/api/oauth/grok-cli/poll-callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const res = await route.POST(req, { params: params("grok-cli", "poll-callback") });
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(res.status, 400);
  assert.equal(body.error, "state_mismatch");
});

test("POST /poll-callback grok-cli: mismatched callback state is rejected", async () => {
  seedCallbackSession("grok-cli", "expected-state-eee");
  seedPollCallbackParams("grok-cli", { code: "code-xyz", state: "WRONG" });

  const req = makeReq("http://localhost:20128/api/oauth/grok-cli/poll-callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const res = await route.POST(req, { params: params("grok-cli", "poll-callback") });
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(res.status, 400);
  assert.equal(body.error, "state_mismatch");
});

test("POST /poll-callback grok-cli: matching callback state is not rejected at the state gate", async () => {
  seedCallbackSession("grok-cli", "expected-state-fff");
  seedPollCallbackParams("grok-cli", { code: "code-xyz", state: "expected-state-fff" });
  beginFetchStub();

  const req = makeReq("http://localhost:20128/api/oauth/grok-cli/poll-callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const res = await route.POST(req, { params: params("grok-cli", "poll-callback") });
  // Should not be a state_mismatch rejection; may still 500 due to DB, but not 400 state gate.
  const body = (await res.clone().json().catch(() => ({}))) as Record<string, unknown>;
  const isStateMismatch = res.status === 400 && body.error === "state_mismatch";
  assert.equal(isStateMismatch, false, `matching poll-callback state must not be rejected; got ${res.status} ${JSON.stringify(body)}`);
});

test("POST /poll-callback codex: missing callback state is rejected", async () => {
  seedCallbackSession("codex", "expected-state-ggg");
  seedPollCallbackParams("codex", { code: "code-xyz" });

  const req = makeReq("http://localhost:20128/api/oauth/codex/poll-callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const res = await route.POST(req, { params: params("codex", "poll-callback") });
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(res.status, 400);
  assert.equal(body.error, "state_mismatch");
});

test("token/error redaction is preserved: route sanitize helpers still apply on state path", async () => {
  // Sanity: the import fallback (which doesn't use state) must still sanitize
  // token-shaped bodies. Just prove the route module still exposes the redaction
  // surface indirectly — the provider's exchangeGrokBuildToken helper redacts.
  const { exchangeGrokBuildToken } = await import("../../src/lib/oauth/providers/grok-cli-oauth.ts");
  const { GROK_BUILD_OAUTH_CONFIG } = await import("../../src/lib/oauth/constants/oauth.ts");
  const fakeToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.leakedtokenhere";
  const saved = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(`server exploded: ${fakeToken} attached`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    })) as unknown as typeof globalThis.fetch;
  try {
    await assert.rejects(
      () => exchangeGrokBuildToken(GROK_BUILD_OAUTH_CONFIG, "code", "http://127.0.0.1:56122/cb", "verifier"),
      (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        return !msg.includes(fakeToken) && /\[REDACTED\]/i.test(msg) && /Grok Build token exchange failed/i.test(msg);
      }
    );
  } finally {
    globalThis.fetch = saved;
  }
});

test("device-code non-PKCE semantics preserved: no callback session => no state gate on poll-callback (provider not in PKCE set)", async () => {
  // github is a device-code non-PKCE provider — poll-callback is not even supported, so
  // the route returns 400 for wrong action, not for state. Just prove it doesn't
  // accidentally enter the PKCE state path.
  const req = makeReq("http://localhost:20128/api/oauth/github/poll-callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const res = await route.POST(req, { params: params("github", "poll-callback") });
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(res.status, 400);
  assert.match(String(body.error ?? ""), /poll-callback only supported/i);
  // Importantly, NOT a state_mismatch — device-code providers never hit the PKCE gate
  assert.notEqual(body.error, "state_mismatch");
});
