---
title: "Route Guard Tiers"
---

# Route Guard Tiers

## Overview

All OmniRoute management API routes are classified into one of three protection
tiers. Classification is static, defined in `src/server/authz/routeGuard.ts`,
and evaluated before any other auth branch runs.

## Tiers

### Tier 1 — LOCAL_ONLY

**Enforced by:** `isLocalOnlyPath(path)` → loopback host check
**Bypass:** None by default. Narrow carve-out for paths in
`LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES` when the request carries a valid
API key with the `manage` scope (see [Manage-scope carve-out](#manage-scope-carve-out)).

These routes spawn child processes or execute runtime code. Exposing them to
non-loopback traffic would allow an attacker who obtained a valid JWT (e.g.,
via a Cloudflared/Ngrok tunnel) to trigger process spawning — a known CVE
class (GHSA-fhh6-4qxv-rpqj).

| Prefix / path                          | Reason                                                              | Bypassable by `manage`? |
| -------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| `/api/mcp/`                            | MCP server — stdio bridges and SSE handlers                         | Yes                     |
| `/api/cli-tools/runtime/`              | CLI tool runtime — executes arbitrary plugin code                   | No (strict-loopback)    |
| `/api/services/`                       | Embedded services (9router, CLIProxy) — npm install+spawn           | No (strict-loopback)    |
| `/dashboard/providers/services/`       | Reverse proxy to embedded service UIs                               | No                      |
| `/api/copilot/`                        | Unauthenticated LLM driver — CLI-only by default                    | Yes (opt-in)            |
| `/api/tools/agent-bridge/`             | MITM server + DNS edits                                             | No                      |
| `/api/tools/traffic-inspector/`        | http-proxy listener + system proxy                                  | No                      |
| `/api/plugins/` (+ bare `/api/plugins`)| Plugin load/execute via worker_threads + child_process              | No                      |
| `/api/system/version`                  | Auto-update: git checkout + npm install (GET status exempt)         | No                      |
| `/api/db-backups/exportAll`            | Spawns tar for full export archive                                  | No                      |
| `/api/local/`                          | 1-click local service launchers (podman/docker)                     | No                      |
| `/api/headroom/start` / `stop`         | Headroom python CLI lifecycle                                       | No                      |
| `/api/oauth/cursor/auto-import`        | `execFile("which", ["cursor"])`                                     | No                      |
| `/api/version-manager/`                | CLIProxyAPI install/start/stop/restart (Task 0040 / F-07-002)       | No                      |
| `/api/cli-tools/antigravity-mitm`      | MITM spawn + sudo (F-07-W2-002)                                     | No                      |
| `/api/tunnels/tailscale/install`       | Package install spawn (F-07-003)                                    | No                      |
| `/api/tunnels/tailscale/start-daemon`  | Daemon start spawn (F-07-003)                                       | No                      |
| `/api/tunnels/cloudflared`             | Binary download + spawn; GET status exempt (F-07-W2-003)            | No                      |
| `/api/tunnels/ngrok`                   | Same tunnel class as cloudflared; GET status exempt                 | No                      |
| `/api/middleware/hooks`                | Compiles caller JS via `new Function` — process RCE (F-07-W2-001)   | No                      |
| `/api/cli-tools/keys`                  | API key inventory — no remote bulk secret dump (Task 0049 / F-07-W2-005) | No                  |
| Pattern: `/api/providers/{id}/login`   | Headful Playwright Chromium spawn (also SPAWN_CAPABLE pattern)      | No                      |

**Response on violation:** `403 LOCAL_ONLY`

#### Manage-scope carve-out

A subset of LOCAL_ONLY paths MAY also be accessed from non-loopback if and
only if the request carries an `Authorization: Bearer <api-key>` whose
metadata includes the `manage` scope (or `admin`). The carve-out is gated
explicitly per-path via `LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES` so the
default for any new LOCAL_ONLY path remains strict-loopback. Unauthenticated
requests and requests with non-manage keys are still rejected with
`403 LOCAL_ONLY`.

Today the only bypassable prefix is `/api/mcp/`. `/api/cli-tools/runtime/` and
`/api/services/` are intentionally excluded because they can spawn arbitrary
subprocesses (`npm install`, `node`), which is the exact CVE class the
LOCAL_ONLY tier exists to prevent.

| Request                                     | Path                       | Result              |
| ------------------------------------------- | -------------------------- | ------------------- |
| Non-loopback, no Bearer                     | `/api/mcp/*`               | 403 LOCAL_ONLY      |
| Non-loopback, Bearer with `manage` scope    | `/api/mcp/*`               | Allow               |
| Non-loopback, Bearer without `manage` scope | `/api/mcp/*`               | 403 LOCAL_ONLY      |
| Non-loopback, Bearer with `manage` scope    | `/api/cli-tools/runtime/*` | 403 LOCAL_ONLY      |
| Loopback, any/no Bearer                     | any LOCAL_ONLY             | Allow (gate passes) |

### Tier 2 — ALWAYS_PROTECTED

**Enforced by:** `isAlwaysProtectedPath(path)` → skip `requireLogin=false` bypass
**Bypass:** None when `requireLogin=false`; JWT always required

These routes are destructive or irreversible. Allowing them in a "no-password"
install would mean anyone on the same LAN could wipe the database or kill the
server process.

| Path                                       | Reason                                              |
| ------------------------------------------ | --------------------------------------------------- |
| `/api/shutdown`                            | Terminates the server process                       |
| `/api/restart`                             | `process.kill(SIGTERM)` — sibling of shutdown (F-07-005) |
| `/api/settings/database`                   | Database export, import, and wipe                   |
| `/api/providers/health-autopilot/actions`  | Irreversible health-autopilot mutations             |
| `/api/db-backups/export`                   | Live SQLite dump — credential exfil (F-07-004)      |
| `/api/db-backups/import`                   | Destructive DB replace (F-07-004)                   |
| `/api/middleware/hooks`                    | `new Function` install always needs auth (F-07-W2-001) |
| `/api/relay/tokens`                        | Relay secret mint/list (Task 0049 / F-07-007)           |
| `/api/translator/send`                     | Spends operator provider credentials (F-07-W2-004)      |
| `/api/cloud/credentials`                   | Overwrite provider OAuth tokens (F-07-006)              |
| `/api/cli-tools/keys`                      | Key inventory / residual reveal surface (F-07-W2-005)   |

### SPAWN_CAPABLE (deny-list for manage-scope bypass + always-auth)

Defined in `src/shared/constants/spawnCapablePrefixes.ts` (flat prefixes) plus
`SPAWN_CAPABLE_PATTERNS` in `src/server/authz/routeGuard.ts` for dynamic segments
(e.g. `/api/providers/{id}/login` Playwright Chromium spawn). Every entry is also
LOCAL_ONLY (or a LOCAL_ONLY subpath). Runtime effects:

1. **Never bypassable** via `localOnlyManageScopeBypassPrefixes` (zod + runtime).
   `isLocalOnlyBypassableByManageScope` also rejects when the *request path*
   itself is spawn-capable (blocks parent-prefix bypass of login).
2. **Always require auth** even when `requireLogin=false` (F-04-005) — the
   management policy skips the anonymous allow for these paths.

| Pattern / path | Reason |
| -------------- | ------ |
| Flat prefixes in `SPAWN_CAPABLE_PREFIXES` | npm/node/MITM/tunnel/hooks compile surfaces |
| Pattern: `/api/providers/{id}/login` | Headful Playwright Chromium (Task 0040 N1) |

**Response on violation:** `401 Authentication required`

### Tier 3 — MANAGEMENT (default)

All other management routes. Auth required unless `requireLogin=false` is
configured. CLI tokens can authenticate these routes (loopback + valid HMAC).

## Evaluation order

```
managementPolicy.evaluate(ctx)
  1. isLocalOnlyPath(path)?
     → loopback                                  → fall through
     → non-loopback, manage-scope Bearer
        AND isLocalOnlyBypassableByManageScope   → allow (management_key)
     → otherwise                                  → reject 403 LOCAL_ONLY
  2. isInternalModelSyncRequest(ctx)?
     → allow (system)
  3. hasValidCliToken(headers)?
     → allow (cli) [loopback + timingSafeEqual HMAC check]
  4. isAlwaysProtectedPath(path) OR isSpawnCapablePath(path) OR requireLogin=true?
     → isDashboardSessionAuthenticated?
        → allow (dashboard_session)
     → manage-scope Bearer / access token?
        → allow (management_key)
     → reject 401/403
  5. requireLogin=false AND not always-protected AND not spawn-capable?
     → allow (anonymous)
```

**F-04-005**: spawn-capable routes never grant anonymous access on open
(`requireLogin=false`) installs. Local CLI still authenticates via the loopback
CLI token (step 3).

Step 1's manage-scope branch is the only authenticated path that can satisfy a
LOCAL_ONLY route; the auth-backend failure mode returns 503 (not 403) so an
expired DB doesn't silently downgrade to "deny".

## Adding a new spawn-capable route

1. Add the path prefix to `LOCAL_ONLY_API_PREFIXES` in
   `src/server/authz/routeGuard.ts`
2. Add a test in `tests/unit/authz/routeGuard.test.ts` asserting that
   `isLocalOnlyPath()` returns true for the new prefix
3. **Never skip this step** — see Hard Rule #15 in `CLAUDE.md`
4. Decide: does this route ALSO belong in `LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES`?
   Default answer is **no**. Only opt-in when the route is safe to expose to a
   manage-scope holder (i.e. does NOT spawn arbitrary user-controlled code).

## Adding a manage-scope-bypassable path

1. Confirm the route does not execute user-supplied code or commands. If it
   does, stop — this carve-out is the wrong tool.
2. Append the prefix to `LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES` in
   `src/server/authz/routeGuard.ts`
3. Add coverage in `tests/unit/authz/management-policy.test.ts` for all four
   request shapes: no Bearer (403), manage Bearer (allow), non-manage Bearer
   (403), and the per-prefix regression that `/api/cli-tools/runtime/*` stays
   strict-loopback even with a manage Bearer.

## Files

| File                                         | Purpose                        |
| -------------------------------------------- | ------------------------------ |
| `src/server/authz/routeGuard.ts`             | Constants and helper functions |
| `src/server/authz/policies/management.ts`    | Evaluation logic               |
| `tests/unit/authz/routeGuard.test.ts`        | Unit tests for tier helpers    |
| `tests/unit/authz/management-policy.test.ts` | Unit tests for evaluate()      |

## Documenting Security Tiers in OpenAPI

When adding a new route to `docs/openapi.yaml`, apply the corresponding
vendor extension if the route is classified by `routeGuard.ts`:

| routeGuard.ts classification  | YAML annotation            | Enforcement                                     |
| ----------------------------- | -------------------------- | ----------------------------------------------- |
| `LOCAL_ONLY_API_PREFIXES`     | `x-loopback-only: true`    | Blocked from non-loopback unconditionally       |
| `ALWAYS_PROTECTED_API_PATHS`  | `x-always-protected: true` | Auth required even with `requireLogin=false`    |
| Internal admin/debug route    | `x-internal: true`         | Hidden from /dashboard/api-endpoints by default |
| None (public / standard auth) | (no annotation needed)     | Standard `requireLogin`-controlled access       |

### Validation

Two scripts enforce consistency between YAML annotations and `routeGuard.ts`:

- `scripts/check/check-openapi-coverage.mjs` — fails if coverage < 99%
- `scripts/check/check-openapi-security-tiers.mjs` — fails if `x-loopback-only` or
  `x-always-protected` annotations diverge from the compile-time constants

Both scripts run in the pre-commit hook and in CI.

### False Positive Rule

If `x-always-protected` or `x-loopback-only` is annotated on a route that is NOT in
the `routeGuard.ts` constant, the coverage script fails. The fix is always to align the
YAML to what `routeGuard.ts` actually enforces — not to add routes to `routeGuard.ts`
without also implementing the enforcement logic.

---

## See also

- `docs/security/CLI_TOKEN.md` — CLI machine-ID token
- `docs/architecture/AUTHZ_GUIDE.md` — full authorization pipeline
- `docs/frameworks/MCP-SERVER.md` — MCP server transports and scopes
