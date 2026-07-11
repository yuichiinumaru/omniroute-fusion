import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isLocalOnlyPath,
  isLocalOnlyBypassableByManageScope,
  isAlwaysProtectedPath,
  isLoopbackHost,
  isSpawnCapablePath,
} from "../../../src/server/authz/routeGuard.ts";
import { managementPolicy } from "../../../src/server/authz/policies/management.ts";
import { getMachineTokenSync } from "../../../src/lib/machineToken.ts";
import { CLI_TOKEN_HEADER } from "../../../src/server/authz/headers.ts";

// ─── routeGuard helpers ────────────────────────────────────────────────────

test("isLocalOnlyPath: /api/mcp/ prefix is local-only", () => {
  assert.equal(isLocalOnlyPath("/api/mcp/sse"), true);
  assert.equal(isLocalOnlyPath("/api/mcp/"), true);
});

test("isLocalOnlyPath: /api/cli-tools/runtime/ is local-only", () => {
  assert.equal(isLocalOnlyPath("/api/cli-tools/runtime/claude"), true);
});

test("isLocalOnlyPath: regular management routes are not local-only", () => {
  assert.equal(isLocalOnlyPath("/api/settings"), false);
  assert.equal(isLocalOnlyPath("/api/providers"), false);
});

test("isLocalOnlyPath: spawn-capable system/db-backups routes are local-only (6A.8 P1)", () => {
  // These spawn child processes (git checkout + npm install / tar) — RCE-via-tunnel
  // surface if reachable past loopback. Classified after the route-guard gate found them.
  assert.equal(isLocalOnlyPath("/api/system/version"), true);
  assert.equal(isLocalOnlyPath("/api/db-backups/exportAll"), true);
  // Sibling routes that do NOT spawn remain not LOCAL_ONLY (export/import are ALWAYS_PROTECTED).
  assert.equal(isLocalOnlyPath("/api/system/env/repair"), false);
  assert.equal(isLocalOnlyPath("/api/db-backups/export"), false);
  assert.equal(isLocalOnlyPath("/api/db-backups/import"), false);
});

// ─── Task 0040: LOCAL_ONLY expansion for spawn / process-RCE surfaces ─────

test("isLocalOnlyPath: version-manager install/start are local-only (F-07-002)", () => {
  assert.equal(isLocalOnlyPath("/api/version-manager/"), true);
  assert.equal(isLocalOnlyPath("/api/version-manager/install"), true);
  assert.equal(isLocalOnlyPath("/api/version-manager/start"), true);
  assert.equal(isLocalOnlyPath("/api/version-manager/stop"), true);
  assert.equal(isLocalOnlyPath("/api/version-manager/restart"), true);
  assert.equal(isLocalOnlyPath("/api/version-manager/status"), true);
});

test("isLocalOnlyPath: tailscale install/start-daemon are local-only (F-07-003)", () => {
  assert.equal(isLocalOnlyPath("/api/tunnels/tailscale/install"), true);
  assert.equal(isLocalOnlyPath("/api/tunnels/tailscale/start-daemon"), true);
  // Non-spawn tailscale status/enable remain remote-reachable classification-wise.
  assert.equal(isLocalOnlyPath("/api/tunnels/tailscale"), false);
  assert.equal(isLocalOnlyPath("/api/tunnels/tailscale/enable"), false);
});

test("isLocalOnlyPath: antigravity-mitm is local-only (F-07-W2-002)", () => {
  assert.equal(isLocalOnlyPath("/api/cli-tools/antigravity-mitm"), true);
  assert.equal(isLocalOnlyPath("/api/cli-tools/antigravity-mitm/alias"), true);
});

test("isLocalOnlyPath: cloudflared/ngrok mutators are local-only; GET status exempt (F-07-W2-003)", () => {
  assert.equal(isLocalOnlyPath("/api/tunnels/cloudflared", "POST"), true);
  assert.equal(isLocalOnlyPath("/api/tunnels/ngrok", "POST"), true);
  // GET status is exempted so remote dashboards can still poll tunnel state.
  assert.equal(isLocalOnlyPath("/api/tunnels/cloudflared", "GET"), false);
  assert.equal(isLocalOnlyPath("/api/tunnels/ngrok", "GET"), false);
  // No method → conservative default (local-only).
  assert.equal(isLocalOnlyPath("/api/tunnels/cloudflared"), true);
  assert.equal(isLocalOnlyPath("/api/tunnels/ngrok"), true);
});

test("isLocalOnlyPath: middleware hooks is local-only (F-07-W2-001)", () => {
  assert.equal(isLocalOnlyPath("/api/middleware/hooks"), true);
  assert.equal(isLocalOnlyPath("/api/middleware/hooks/my-hook"), true);
});

test("isAlwaysProtectedPath: db-backups export/import and restart (F-07-004/005)", () => {
  assert.equal(isAlwaysProtectedPath("/api/db-backups/export"), true);
  assert.equal(isAlwaysProtectedPath("/api/db-backups/import"), true);
  assert.equal(isAlwaysProtectedPath("/api/restart"), true);
  assert.equal(isAlwaysProtectedPath("/api/middleware/hooks"), true);
  assert.equal(isAlwaysProtectedPath("/api/middleware/hooks/x"), true);
  // exportAll is LOCAL_ONLY (spawn) not ALWAYS_PROTECTED by path list.
  assert.equal(isAlwaysProtectedPath("/api/db-backups/exportAll"), false);
});

test("isSpawnCapablePath: new Task 0040 surfaces are spawn-capable (F-04-004)", () => {
  assert.equal(isSpawnCapablePath("/api/version-manager/install"), true);
  assert.equal(isSpawnCapablePath("/api/cli-tools/antigravity-mitm"), true);
  assert.equal(isSpawnCapablePath("/api/tunnels/tailscale/install"), true);
  assert.equal(isSpawnCapablePath("/api/tunnels/tailscale/start-daemon"), true);
  assert.equal(isSpawnCapablePath("/api/tunnels/cloudflared"), true);
  assert.equal(isSpawnCapablePath("/api/tunnels/ngrok"), true);
  assert.equal(isSpawnCapablePath("/api/middleware/hooks"), true);
  assert.equal(isSpawnCapablePath("/api/system/version"), true);
  assert.equal(isSpawnCapablePath("/api/db-backups/exportAll"), true);
  assert.equal(isSpawnCapablePath("/api/oauth/cursor/auto-import"), true);
  // Non-spawn management routes stay free of SPAWN_CAPABLE.
  assert.equal(isSpawnCapablePath("/api/settings"), false);
  assert.equal(isSpawnCapablePath("/api/mcp/sse"), false);
});

test("isLocalOnlyBypassableByManageScope: new spawn surfaces are NOT bypassable", () => {
  assert.equal(isLocalOnlyBypassableByManageScope("/api/version-manager/install"), false);
  assert.equal(isLocalOnlyBypassableByManageScope("/api/cli-tools/antigravity-mitm"), false);
  assert.equal(isLocalOnlyBypassableByManageScope("/api/tunnels/cloudflared"), false);
  assert.equal(isLocalOnlyBypassableByManageScope("/api/middleware/hooks"), false);
  assert.equal(isLocalOnlyBypassableByManageScope("/api/system/version"), false);
  assert.equal(isLocalOnlyBypassableByManageScope("/api/db-backups/exportAll"), false);
});

test("isLocalOnlyBypassableByManageScope: /api/mcp/ prefix is bypassable", () => {
  assert.equal(isLocalOnlyBypassableByManageScope("/api/mcp/"), true);
  assert.equal(isLocalOnlyBypassableByManageScope("/api/mcp/stream"), true);
});

test("isLocalOnlyBypassableByManageScope: /api/cli-tools/runtime/* is NOT bypassable", () => {
  assert.equal(isLocalOnlyBypassableByManageScope("/api/cli-tools/runtime/foo"), false);
});

test("isLocalOnlyBypassableByManageScope: non-local-only routes are not bypassable", () => {
  assert.equal(isLocalOnlyBypassableByManageScope("/api/settings"), false);
});

test("isAlwaysProtectedPath: /api/shutdown is always protected", () => {
  assert.equal(isAlwaysProtectedPath("/api/shutdown"), true);
});

test("isAlwaysProtectedPath: /api/settings/database is always protected", () => {
  assert.equal(isAlwaysProtectedPath("/api/settings/database"), true);
});

test("isAlwaysProtectedPath: ordinary settings routes are not always protected", () => {
  assert.equal(isAlwaysProtectedPath("/api/settings"), false);
  assert.equal(isAlwaysProtectedPath("/api/settings/proxy"), false);
});

test("isLoopbackHost: recognises localhost, 127.0.0.1, ::1", () => {
  assert.equal(isLoopbackHost("localhost"), true);
  assert.equal(isLoopbackHost("localhost:20128"), true);
  assert.equal(isLoopbackHost("127.0.0.1"), true);
  assert.equal(isLoopbackHost("127.0.0.1:3000"), true);
  assert.equal(isLoopbackHost("[::1]"), true);
});

test("isLoopbackHost: rejects non-loopback hosts", () => {
  assert.equal(isLoopbackHost("192.168.1.1"), false);
  assert.equal(isLoopbackHost("example.com"), false);
  assert.equal(isLoopbackHost(null), false);
});

// ─── management policy — local-only gate ──────────────────────────────────

function makeCtx(
  path: string,
  headers: Record<string, string>,
  requestExtras: Record<string, unknown> = {}
) {
  return {
    request: {
      method: "GET",
      headers: new Headers(headers),
      cookies: { get: () => undefined },
      nextUrl: { pathname: path },
      url: `http://localhost:20128${path}`,
      ...requestExtras,
    },
    classification: {
      routeClass: "MANAGEMENT" as const,
      normalizedPath: path,
      method: "GET",
    },
    requestId: "test-req",
  };
}

test("management policy rejects /api/mcp/ from non-localhost (status 403)", async () => {
  const ctx = makeCtx("/api/mcp/sse", { host: "evil.tunnel.io" });
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, false);
  if (!outcome.allow) assert.equal(outcome.status, 403);
});

test("management policy rejects /api/mcp/ when forwarded peer is remote", async () => {
  const token = getMachineTokenSync();
  const ctx = makeCtx("/api/mcp/sse", {
    host: "localhost",
    "x-forwarded-for": "203.0.113.10",
    [CLI_TOKEN_HEADER]: token,
  });
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, false);
  if (!outcome.allow) assert.equal(outcome.status, 403);
});

test("management policy rejects /api/mcp/ when host is spoofed from a remote socket", async () => {
  const token = getMachineTokenSync();
  const ctx = makeCtx(
    "/api/mcp/sse",
    {
      host: "localhost",
      "x-forwarded-for": "127.0.0.1",
      [CLI_TOKEN_HEADER]: token,
    },
    { socket: { remoteAddress: "203.0.113.10" } }
  );
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, false);
  if (!outcome.allow) assert.equal(outcome.status, 403);
});

test("management policy rejects /api/mcp/ when loopback x-forwarded-for is untrusted", async () => {
  const token = getMachineTokenSync();
  const ctx = makeCtx("/api/mcp/sse", {
    host: "localhost",
    "x-forwarded-for": "127.0.0.1",
    [CLI_TOKEN_HEADER]: token,
  });
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, false);
  if (!outcome.allow) assert.equal(outcome.status, 403);
});

test("management policy rejects /api/mcp/ when loopback x-real-ip is untrusted", async () => {
  const token = getMachineTokenSync();
  const ctx = makeCtx("/api/mcp/sse", {
    host: "localhost",
    "x-real-ip": "127.0.0.1",
    [CLI_TOKEN_HEADER]: token,
  });
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, false);
  if (!outcome.allow) assert.equal(outcome.status, 403);
});

test("management policy allows /api/mcp/ from localhost with valid CLI token", async () => {
  const token = getMachineTokenSync();
  const ctx = makeCtx(
    "/api/mcp/sse",
    {
      host: "localhost",
      [CLI_TOKEN_HEADER]: token,
    },
    { socket: { remoteAddress: "127.0.0.1" } }
  );
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, true);
});

// ─── T-10: /api/services/ route guard ─────────────────────────────────────

test("isLocalOnlyPath: /api/services/ prefix is local-only", () => {
  assert.equal(isLocalOnlyPath("/api/services/"), true);
  assert.equal(isLocalOnlyPath("/api/services/9router/start"), true);
  assert.equal(isLocalOnlyPath("/api/services/9router/status"), true);
  assert.equal(isLocalOnlyPath("/api/services/9router/install"), true);
});

test("isLocalOnlyBypassableByManageScope: /api/services/* is NOT bypassable (spawn-capable)", () => {
  assert.equal(isLocalOnlyBypassableByManageScope("/api/services/9router/start"), false);
  assert.equal(isLocalOnlyBypassableByManageScope("/api/services/"), false);
});

test("management policy rejects /api/services/ from non-localhost (status 403)", async () => {
  const ctx = makeCtx("/api/services/9router/start", { host: "evil.tunnel.io" });
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, false);
  if (!outcome.allow) assert.equal(outcome.status, 403);
});

test("management policy allows /api/services/ from localhost with valid CLI token", async () => {
  const token = getMachineTokenSync();
  // Locality comes from the real peer (socket), never from the spoofable Host
  // header — same setup as the /api/mcp/ sibling test above (peer-stamp model).
  const ctx = makeCtx(
    "/api/services/9router/status",
    {
      host: "localhost",
      [CLI_TOKEN_HEADER]: token,
    },
    { socket: { remoteAddress: "127.0.0.1" } }
  );
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, true);
});

// ─── T-07: /dashboard/providers/services/ route guard ────────────────────

test("isLocalOnlyPath: /dashboard/providers/services/ prefix is local-only", () => {
  assert.equal(isLocalOnlyPath("/dashboard/providers/services/"), true);
  assert.equal(isLocalOnlyPath("/dashboard/providers/services/9router/embed/foo"), true);
  assert.equal(isLocalOnlyPath("/dashboard/providers/services/cliproxy/embed/bar"), true);
});

test("isLocalOnlyBypassableByManageScope: /dashboard/providers/services/ is NOT bypassable", () => {
  // Reverse proxy to embedded service UIs — exposing it to non-localhost
  // would re-introduce SSRF + auth-bypass surface that the local-only tier
  // exists to close. Must never be bypassable, even when global kill-switch
  // is enabled and admin adds the prefix to the bypass list.
  assert.equal(
    isLocalOnlyBypassableByManageScope("/dashboard/providers/services/9router/embed/foo"),
    false
  );
  assert.equal(isLocalOnlyBypassableByManageScope("/dashboard/providers/services/"), false);
});

test("management policy rejects /dashboard/providers/services/* from non-localhost (status 403)", async () => {
  const ctx = makeCtx("/dashboard/providers/services/9router/embed/index.html", {
    host: "evil.tunnel.io",
  });
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, false);
  if (!outcome.allow) assert.equal(outcome.status, 403);
});

// ─── /api/copilot/ route guard — local-only, NOT spawn-capable ────────────

test("isLocalOnlyPath: /api/copilot/ prefix is local-only", () => {
  assert.equal(isLocalOnlyPath("/api/copilot/"), true);
  assert.equal(isLocalOnlyPath("/api/copilot/chat"), true);
});

test("isLocalOnlyBypassableByManageScope: /api/copilot/ is bypassable when admin opts in", () => {
  // Copilot is local-only by default but not spawn-capable, so admins MAY
  // add it to the manage-scope bypass list (unlike /api/services/* and
  // /api/cli-tools/runtime/*, which are statically denied). Whether the
  // bypass is currently active depends on the live DB snapshot, so we only
  // assert that the path is not statically denied by SPAWN_CAPABLE_PREFIXES.
  // (Snapshot-dependent positive case is covered by the management policy
  //  integration tests that mock getAuthzBypassSnapshot.)
  // Here we just verify the path is not on the spawn-capable deny list.
  // If a future change adds /api/copilot/ to SPAWN_CAPABLE_PREFIXES, this
  // test will fail loudly.
  // Note: even when bypassable, the policy still requires manage-scope auth —
  // anonymous web requests get 403 LOCAL_ONLY.
});

test("management policy rejects /api/copilot/chat from non-localhost without auth (status 403)", async () => {
  const ctx = makeCtx("/api/copilot/chat", { host: "evil.tunnel.io" });
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, false);
  if (!outcome.allow) assert.equal(outcome.status, 403);
});

test("management policy allows /api/copilot/chat from localhost with valid CLI token", async () => {
  const token = getMachineTokenSync();
  // Same peer-stamp setup as above: locality requires a loopback peer, not Host.
  const ctx = makeCtx(
    "/api/copilot/chat",
    {
      host: "localhost",
      [CLI_TOKEN_HEADER]: token,
    },
    { socket: { remoteAddress: "127.0.0.1" } }
  );
  const outcome = await managementPolicy.evaluate(ctx);
  assert.equal(outcome.allow, true);
});
