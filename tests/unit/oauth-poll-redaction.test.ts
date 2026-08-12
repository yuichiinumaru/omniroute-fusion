/**
 * Task 0151 F4 — device-code poll errorDescription redaction (route-level regression)
 *
 * The device-code `poll` error path MUST NOT leak upstream token-shaped text
 * to the browser. Provenance:
 *   grok-cli.ts::pollToken() returns upstream `error_description` → which
 *   providers.ts::pollForToken() forwards as `errorDescription` → which
 *   /api/oauth/{provider}/poll exposes as `errorDescription` in the JSON
 *   response and OAuthModal renders directly. The sanitization boundary is
 *   grok-cli.ts::redactGrokBuildSecrets() (JWT-shape `eyJ…` → `[REDACTED]`)
 *   plus the generic `sanitizeErrorMessage` path/stack strip; the route is
 *   the final defense-in-depth layer before the client.
 *
 * This file ties entrypoint → runtime call-site → helper:
 *   route POST /poll → pollForToken → grokCli.pollToken → redactGrokBuildSecrets
 * so a helper-only unit test is insufficient — a synthetic JWT-shaped marker
 * injected at the upstream device poll response must be absent from the
 * route's `errorDescription`, while actionable non-secret diagnostics survive,
 * and pending/slow_down/terminal semantics are preserved.
 *
 * No real OAuth/network/provider credentials, no :22000.
 */

import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

if (!process.env.DATA_DIR) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-poll-redact-"));
  process.env.DATA_DIR = d;
}

const { grokCli } = await import("../../src/lib/oauth/providers/grok-cli.ts");
const { pollForToken } = await import("../../src/lib/oauth/providers.ts");
const route = await import("../../src/app/api/oauth/[provider]/[action]/route.ts");

const SYNTH_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.F4_SYNTH_JWT_SENTINEL_abc123____MARKER";
const SYNTH_JWT_MARKER = "F4_SYNTH_JWT_SENTINEL_abc123____MARKER";

// The marker must contain the JWT header prefix eyJ so the narrow
// redactGrokBuildSecrets() pattern fires, and the sentinel suffix so the
// test can prove ABSENCE without relying on the full JWT string matching.

function jsonResp(body: unknown, status = 400): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const savedFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = savedFetch;
  // Clear any HMR callback sessions that oauth-route-state may have left
  (globalThis as unknown as Record<string, unknown>).__codexCallbackState = null;
  (globalThis as unknown as Record<string, unknown>).__windsurfCallbackState = null;
});

function makePollReq(provider: string, body: unknown): Request {
  return new Request(`http://localhost:20128/api/oauth/${provider}/poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function p(provider: string, action: string) {
  return Promise.resolve({ provider, action });
}

// ── Provider-level: grokCli.pollToken() ─────────────────────────────────────

test("F4: grokCli.pollToken() redacts JWT-shaped error_description and preserves actionable text", async () => {
  globalThis.fetch = async () =>
    jsonResp({
      error: "expired_token",
      error_description: `The device code has expired — retry. leaked=${SYNTH_JWT} Bearer ${SYNTH_JWT}`,
    });

  const res = await grokCli.pollToken(undefined, "DEV_F4_A");
  const desc = String(res.data.error_description ?? "");
  assert.equal(
    desc.includes(SYNTH_JWT_MARKER),
    false,
    `pollToken leaked synthetic JWT marker: ${desc.slice(0, 700)}`
  );
  assert.equal(desc.includes(SYNTH_JWT.slice(0, 30)), false, "JWT prefix must not leak");
  assert.match(desc, /\[REDACTED\]/, "JWT must be replaced with [REDACTED]");
  assert.match(desc, /expired/i, "actionable prefix 'expired' must survive redaction");
});

test("F4: grokCli.pollToken() leaves non-token diagnostics verbatim (no false-positive redaction)", async () => {
  globalThis.fetch = async () =>
    jsonResp({
      error: "invalid_client",
      error_description: "client_id is required for this endpoint",
    });

  const res = await grokCli.pollToken(undefined, "DEV_F4_B");
  assert.match(
    String(res.data.error_description ?? ""),
    /client_id is required/i,
    "non-token diagnostic must be forwarded verbatim"
  );
  assert.equal(
    String(res.data.error_description ?? "").includes("[REDACTED]"),
    false,
    "non-token diagnostic must not be spuriously redacted"
  );
});

// ── Orchestrator-level: pollForToken() ──────────────────────────────────────

test("F4: pollForToken(grok-cli) redacts synthetic JWT and maps pending/slow_down/terminal correctly through the orchestrator", async () => {
  // pending case — authorization_pending is a polling-not-yet-complete state.
  // At the HTTP layer the upstream returns 400 (ok=false), so pollForToken's
  // generic bottom branch does NOT set `pending` — the route coalesces via
  // `error === "authorization_pending"`. The provider layer still MUST redact.
  globalThis.fetch = async () =>
    jsonResp({
      error: "authorization_pending",
      error_description: `authorization_pending leaked=${SYNTH_JWT}`,
    });
  let wrapped = await pollForToken("grok-cli", "DEV_F4_PENDING");
  assert.equal(wrapped.success, false);
  assert.equal(wrapped.error, "authorization_pending");
  // Original semantics: ok=false → pending is undefined; route coalesces.
  // Assert the redaction still happened and that terminal pending semantics hold.
  assert.equal(
    (wrapped as { pending?: boolean }).pending,
    undefined,
    "authorization_pending at HTTP 400 → pending undefined at orchestrator (route coalesces to true)"
  );
  assert.equal(
    String((wrapped as { errorDescription?: string }).errorDescription ?? "").includes(
      SYNTH_JWT_MARKER
    ),
    false,
    "pollForToken pending path leaked marker"
  );
  assert.match(String((wrapped as { errorDescription?: string }).errorDescription ?? ""), /\[REDACTED\]/);

  // slow_down at HTTP 400 also → pending undefined at orchestrator, route coalesces to pending:true
  globalThis.fetch = async () =>
    jsonResp({ error: "slow_down", error_description: `slow_down leaked=${SYNTH_JWT}` });
  wrapped = await pollForToken("grok-cli", "DEV_F4_SLOW");
  assert.equal(wrapped.error, "slow_down");
  assert.equal(
    (wrapped as { pending?: boolean }).pending,
    undefined,
    "slow_down at HTTP 400 → pending undefined at orchestrator (route coalesces)"
  );
  assert.equal(
    String((wrapped as { errorDescription?: string }).errorDescription ?? "").includes(
      SYNTH_JWT_MARKER
    ),
    false
  );

  // terminal case — expired_token → errorDescription still redacted, not pending at either layer
  globalThis.fetch = async () =>
    jsonResp({
      error: "expired_token",
      error_description: `expired leaked=${SYNTH_JWT} Bearer ${SYNTH_JWT}`,
    });
  wrapped = await pollForToken("grok-cli", "DEV_F4_TERM");
  assert.equal(wrapped.error, "expired_token");
  assert.equal((wrapped as { pending?: boolean }).pending, undefined, "terminal must not be pending");
  assert.equal(
    String((wrapped as { errorDescription?: string }).errorDescription ?? "").includes(
      SYNTH_JWT_MARKER
    ),
    false
  );
  assert.match(String((wrapped as { errorDescription?: string }).errorDescription ?? ""), /\[REDACTED\]/);
});

test("F4: pollForToken(grok-cli) preserves actionable non-secret terminal text", async () => {
  globalThis.fetch = async () =>
    jsonResp({ error: "access_denied", error_description: "The user denied the request." });
  const wrapped = await pollForToken("grok-cli", "DEV_F4_DENIED");
  assert.equal(wrapped.error, "access_denied");
  assert.match(String((wrapped as { errorDescription?: string }).errorDescription ?? ""), /denied/i);
});

// ── Route-level: POST /api/oauth/grok-cli/poll ──────────────────────────────

test("F4 route: POST /api/oauth/grok-cli/poll never exposes synthetic JWT in errorDescription (defense-in-depth), preserves pending/slow_down/terminal semantics", async () => {
  // Mock the inner tokenUrl fetch that grokCli.pollToken() calls — the route
  // will call pollForToken("grok-cli", deviceCode) which in turn fetches
  // GROK_CLI_CONFIG.tokenUrl (https://auth.x.ai/oauth2/token).
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("auth.x.ai")) {
      return jsonResp({
        error: "expired_token",
        error_description: `poll failed leaked=${SYNTH_JWT} cookie=session=${SYNTH_JWT} Bearer ${SYNTH_JWT} actionable=retry`,
      });
    }
    return new Response(JSON.stringify({ error: "unhandled " + url }), { status: 500 });
  };

  const req = makePollReq("grok-cli", { deviceCode: "DEV_F4_ROUTE" });
  const http = await route.POST(req, { params: p("grok-cli", "poll") });
  const body = (await http.json()) as Record<string, unknown>;

  assert.equal(body.success, false, "poll error must return success:false");
  assert.ok(body.error, "error field must be present");
  const desc = String((body as { errorDescription?: string }).errorDescription ?? "");
  assert.equal(desc.includes(SYNTH_JWT_MARKER), false, `route leaked synthetic marker: ${JSON.stringify(body).slice(0, 900)}`);
  assert.equal(desc.includes(SYNTH_JWT.slice(0, 30)), false, "JWT fragment must not appear in route response");
  assert.match(desc, /\[REDACTED\]/, "route-level errorDescription must contain [REDACTED] placeholder");
  // The route must never leak pending=true for a terminal error
  assert.equal((body as { pending?: boolean }).pending, false, "terminal expired_token must not be pending at route layer");

  // Also prove non-token actionable diagnostics still flow to the browser
  // (so the fix does not over-redact).
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("auth.x.ai")) {
      return jsonResp({
        error: "access_denied",
        error_description: "The user denied the request.",
      });
    }
    return new Response(JSON.stringify({ error: "unhandled" }), { status: 500 });
  };
  const req2 = makePollReq("grok-cli", { deviceCode: "DEV_F4_ROUTE2" });
  const http2 = await route.POST(req2, { params: p("grok-cli", "poll") });
  const body2 = (await http2.json()) as Record<string, unknown>;
  assert.match(String((body2 as { errorDescription?: string }).errorDescription ?? ""), /denied/i, "non-token terminal diagnostic must survive to route response");
});

test("F4 route: POST /api/oauth/grok-cli/poll preserves pending=true for authorization_pending and coalesces slow_down at route layer", async () => {
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("auth.x.ai")) {
      return jsonResp({ error: "authorization_pending", error_description: "The user has not yet completed authorization." });
    }
    return new Response(JSON.stringify({ error: "unhandled" }), { status: 500 });
  };
  let req = makePollReq("grok-cli", { deviceCode: "DEV_F4_PEND" });
  let http = await route.POST(req, { params: p("grok-cli", "poll") });
  let body = (await http.json()) as Record<string, unknown>;
  assert.equal((body as { pending?: boolean }).pending, true, "authorization_pending → pending:true at route layer");
  assert.equal(body.success, false);

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("auth.x.ai")) {
      return jsonResp({ error: "slow_down", error_description: "You are polling too quickly." });
    }
    return new Response(JSON.stringify({ error: "unhandled" }), { status: 500 });
  };
  req = makePollReq("grok-cli", { deviceCode: "DEV_F4_SLOW2" });
  http = await route.POST(req, { params: p("grok-cli", "poll") });
  body = (await http.json()) as Record<string, unknown>;
  assert.equal((body as { pending?: boolean }).pending, true, "slow_down → pending:true per route isPending (authorization_pending || slow_down); orchestrator distinguishes but route coalesces for UX");
});
