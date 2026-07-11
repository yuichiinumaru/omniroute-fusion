# Slice 07: App API & Public Routes — Adversarial Review (Wave 1)

**Date**: 2026-07-11  
**Reviewer**: independent adversarial (Wave 1)  
**Workspace**: `/home/sephiroth/working/ganthritor/omniroute-2`  
**Parent**: `agentID=reviewers`

## Scope

- `src/app/api/` (entire tree)
- Non-dashboard app routes: `login`, `auth`, `authorize`, `callback`, `connect`, `landing`, `status`, `forgot-password`, `maintenance`, `offline`, `privacy`, `terms`, `forbidden`, `a2a`, `docs`, 4xx/5xx pages, root `page.tsx`, etc.
- Supporting authz used by those routes: `src/server/authz/routeGuard.ts`, `policies/management.ts`, `classify.ts`, `publicApiRoutes.ts`

## Exclusions honored

| Item | Status |
|------|--------|
| Task **0036** (dual-mode auth deploy/verify) | Not investigated |
| Task **0017** (fusion docs/i18n) | Not investigated |
| Fusion epic 0010–0016, 0018 | Residual only; no competing fusion-contract findings |
| Dual-mode auth 0032–0035, 0037–0039 | Not re-audited |
| Frontend IA 0023–0031 | Dashboard UI out of scope |

## Method

1. Route pattern audit: CORS → Zod → auth → policy → handler gaps  
2. `isLocalOnlyPath` / `ALWAYS_PROTECTED` membership vs spawn-capable handlers (Hard Rules 15, 17)  
3. Error responses leaking raw `err.message` / stack (Hard Rule 12)  
4. IDOR / privilege-escalation on provider, key, cloud, relay, settings routes  
5. Public classification mismatches, dead-method / weak-auth public handlers  
6. Same-origin SSRF / LOCAL_ONLY bypass via server-side proxy routes  
7. Evidence is path:line only; no fabricated APIs

---

## Findings (severity-ordered)

### F-07-001 — `/api/openapi/try` same-origin proxy bypasses LOCAL_ONLY spawn gates

- **Severity**: P0
- **Category**: security
- **Evidence**:
  - `src/app/api/openapi/try/route.ts:12` — `ALLOWED_TRY_PATH_PREFIXES` includes full `"/api/"`
  - `src/app/api/openapi/try/route.ts:64-107` — authenticated (or `requireLogin=false`) caller drives `fetch(targetUrl)` to same origin
  - `src/app/api/openapi/try/route.ts:88-92` — forwards caller cookies onto the internal request
  - `src/server/authz/routeGuard.ts:29-45` — LOCAL_ONLY is peer-IP based; internal server→self fetch presents as loopback
- **Why it matters**: LOCAL_ONLY exists specifically so a leaked dashboard JWT over a tunnel cannot spawn children (`/api/services/*`, `/api/cli-tools/runtime/*`, `/api/plugins/*`, `/api/headroom/start`, etc.). An attacker with any management auth (or open auth-disabled install) POSTs:

  ```json
  { "method": "POST", "path": "/api/services/cliproxy/install", "body": {} }
  ```

  The proxy request is handled as loopback → LOCAL_ONLY gate passes → GHSA-fhh6-4qxv-rpqj class surface re-opens remotely.
- **Suggested fix direction**: Deny proxy paths that match `isLocalOnlyPath(path, method)` and `SPAWN_CAPABLE_PREFIXES` before fetch. Prefer an allowlist of safe read-only demo paths. Do not forward cookies to LOCAL_ONLY destinations. Add regression test: remote session → try `/api/services/...` → 403.

### F-07-002 — `/api/version-manager/*` installs/starts binaries without LOCAL_ONLY

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/app/api/version-manager/install/route.ts:11-32` — `POST` calls `install(version)` (binary download/install)
  - `src/app/api/version-manager/start/route.ts:10-25` — `sup.start()` via `ServiceSupervisor` (`spawn` in `src/lib/services/ServiceSupervisor.ts:4-66`)
  - `src/server/authz/routeGuard.ts:29-45` — no `/api/version-manager` prefix in `LOCAL_ONLY_API_PREFIXES` (confirmed absent; sibling `/api/services/` is covered)
  - Contrast: Hard Rules #15/#17 + `docs/security/ROUTE_GUARD_TIERS.md` require loopback for spawn-capable routes
- **Why it matters**: Leaked JWT / manage-scope key via tunnel can install CLIProxyAPI and spawn a long-lived child process. Parallel path `/api/services/` is correctly LOCAL_ONLY; this is a classification hole on the legacy version-manager surface.
- **Suggested fix direction**: Add `/api/version-manager/` (or at least install/start/stop/restart) to `LOCAL_ONLY_API_PREFIXES` + `SPAWN_CAPABLE_PREFIXES`, unit tests mirroring services, document in ROUTE_GUARD_TIERS.

### F-07-003 — Tailscale install/daemon routes spawn packages without LOCAL_ONLY

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/app/api/tunnels/tailscale/install/route.ts:7-27` — authenticated POST streams `installTailscale`
  - `src/app/api/tunnels/tailscale/start-daemon/route.ts:7-16` — `startTailscaleDaemon`
  - `src/lib/tailscaleTunnel.ts:1,979-1051` — `spawn("brew"|"curl"|"sudo"... )`, `execFileWithPassword("sudo", ...)`
  - `src/app/api/tunnels/tailscale/routeUtils.ts:20-22` — only `isAuthenticated` (always-auth), **not** loopback
  - Not in `LOCAL_ONLY_API_PREFIXES`
- **Why it matters**: Remote operator session (or stolen cookie) can trigger package install + sudo with optional password body — classic tunnel RCE/privilege class Hard Rules #15/#17 target.
- **Suggested fix direction**: Mark `/api/tunnels/tailscale/install`, `start-daemon`, and other spawn paths LOCAL_ONLY (+ SPAWN_CAPABLE). Keep status/enable read paths remote if needed.

### F-07-004 — DB export/import skip ALWAYS_PROTECTED; full SQLite dump when `requireLogin=false`

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/app/api/db-backups/export/route.ts:17-22` — auth only if `isAuthRequired`; else anonymous export
  - `src/app/api/db-backups/import/route.ts:55-60` — same pattern for destructive import
  - `src/server/authz/routeGuard.ts:82-86` — ALWAYS_PROTECTED only lists `/api/shutdown`, health-autopilot actions, `/api/settings/database` — **not** db-backups
  - `tests/unit/authz/routeGuard.test.ts:36-37` — explicitly asserts export/import are **not** local-only
  - Contrast: `exportAll` always requires `isAuthenticated` (`exportAll/route.ts:17-18`) and is LOCAL_ONLY
- **Why it matters**: Common LAN “no login” installs: any peer can download the live DB (API keys, encrypted OAuth material, settings) or replace the DB via import. Docs claim settings/database wipe is always-protected; export/import are equally irreversible credential exfil vectors.
- **Suggested fix direction**: Add `/api/db-backups/export`, `/api/db-backups/import` (and ideally list/restore mutations) to `ALWAYS_PROTECTED_API_PATHS`. Prefer always-`isAuthenticated` like exportAll. Consider LOCAL_ONLY for import if process/fs heavy.

### F-07-005 — `/api/restart` not ALWAYS_PROTECTED (shutdown is)

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/app/api/restart/route.ts:4-13` — `requireManagementAuth` then `process.kill(SIGTERM)`
  - `src/server/authz/routeGuard.ts:82-86` — `/api/shutdown` always-protected; `/api/restart` absent
  - `requireManagementAuth` returns null when `!isAuthRequired` (`src/lib/api/requireManagementAuth.ts:25-27`)
- **Why it matters**: With `requireLogin=false`, anonymous LAN/remote clients can terminate the process (DoS / restart storm). Inconsistent with shutdown’s always-auth design.
- **Suggested fix direction**: Add `/api/restart` to `ALWAYS_PROTECTED_API_PATHS` + tests.

### F-07-006 — Public `/api/cloud/credentials/update` lets any API key overwrite provider OAuth tokens

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/shared/constants/publicApiRoutes.ts:7` — `"/api/cloud/"` is fully PUBLIC
  - `src/app/api/cloud/credentials/update/route.ts:19-64` — any `validateApiKey` success → `updateProviderConnection` with attacker-supplied `accessToken`/`refreshToken`
  - No manage-scope / ownership check; first active connection for `provider` is overwritten (`connections[0]`)
- **Why it matters**: Client inference API keys (no `manage` scope) can poison or steal-refresh provider accounts by installing attacker refresh tokens, or disrupt service by invalidating tokens. Public classification means management pipeline never applies.
- **Suggested fix direction**: Restrict to manage-scope / dedicated cloud machine auth; bind to connection id; never accept arbitrary refresh tokens from unscoped keys. Or remove from PUBLIC and require management auth.

### F-07-007 — `/api/relay/tokens` has no handler auth; mint + leak `tokenHash` under auth-disabled

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/app/api/relay/tokens/route.ts:19-56` — GET/POST with **zero** `requireManagementAuth` / `isAuthenticated`
  - `src/app/api/relay/tokens/route.ts:51-54` — POST returns `rawToken` once
  - `src/app/api/relay/tokens/[id]/route.ts:27-42` — GET spreads `...token` including `tokenHash` (see `RelayToken` in `src/lib/db/relayProxies.ts:13-16`)
  - Pipeline only: when `requireLogin=false`, management policy allows anonymous (`management.ts:224-226`)
- **Why it matters**: Auth-disabled installs: unauthenticated mint of relay secrets → free LLM spend via relay. Even with login, missing in-handler auth is brittle if pipeline is bypassed/mis-classified. Returning SHA-256 `tokenHash` enables offline brute of short secrets if any weak generation ever appears.
- **Suggested fix direction**: Add `requireManagementAuth` to all relay token routes; strip `tokenHash` from responses; consider ALWAYS_PROTECTED for create.

### F-07-008 — `/api/cli-tools/apply` writes home-dir configs remotely (not under runtime LOCAL_ONLY)

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/app/api/cli-tools/apply/route.ts:17-24,68-78` — writes fixed paths under `os.homedir()` (`.claude`, `.codex`, etc.)
  - LOCAL_ONLY only covers `/api/cli-tools/runtime/` (`routeGuard.ts:31`), not `/apply` or `*-settings`
  - Auth is `requireCliToolsAuth` only
- **Why it matters**: Tunnel + stolen session can rewrite operator CLI configs / inject API keys into local tooling. Hard Rule #15 spirit is process/spawn, but homedir mutation is adjacent high impact.
- **Suggested fix direction**: LOCAL_ONLY for apply + settings mutators that touch disk; or explicit “remote config write” capability flag default-off for non-loopback.

### F-07-009 — Public `GET /api/monitoring/health` returns rich internal state

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/shared/constants/publicApiRoutes.ts:19-21` — public readonly prefix
  - `src/app/api/monitoring/health/route.ts:14-161` — GET has no auth; builds full payload (breakers, lockouts, sessions, credential health, rate limits, connections)
  - Only DELETE is gated (`route.ts:186-188`)
  - `/status` page fetches it unauthenticated (`src/app/status/page.tsx:39`)
- **Why it matters**: Unauthenticated recon of provider topology, quota pressure, session stickiness, credential health — useful for targeted attacks and multi-tenant privacy leaks on exposed hosts.
- **Suggested fix direction**: Split public minimal liveness (`status`, `version`, optional uptime) from authenticated full snapshot; or gate detailed fields behind auth while keeping a reduced public shape for `/status`.

### F-07-010 — `/api/health/ping` is MANAGEMENT-class but documented as public liveness

- **Severity**: P2
- **Category**: bug / wiring
- **Evidence**:
  - `src/app/api/health/ping/route.ts:13-14` — comment: “No auth required”
  - Not in `PUBLIC_API_ROUTE_PREFIXES` / `PUBLIC_READONLY_API_ROUTE_PREFIXES` (`publicApiRoutes.ts`)
  - Classifies as MANAGEMENT (`classify.ts:103-118`) → 401 when `requireLogin=true`
  - CHANGELOG / FEATURE_FLAGS / FeatureFlagsGrid expect ping for post-restart probes
- **Why it matters**: Authenticated installs break k8s/load-balancer/UI liveness that hit `/api/health/ping` without cookies.
- **Suggested fix direction**: Add `/api/health/ping` to `PUBLIC_READONLY_API_ROUTE_PREFIXES` (GET only). Keep payload minimal (already is).

### F-07-011 — A2A `/a2a` allows all requests when `OMNIROUTE_API_KEY` env unset

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/app/a2a/route.ts:67-74` — `if (!configuredKey) return true`
  - Only checks env key, not OmniRoute API key store / manage scopes
  - Path classifies as MANAGEMENT fallback (`classify.ts:121-125`); when `requireLogin=false` both layers open
  - Skills execute routing/quota introspection (`taskExecution` handlers)
- **Why it matters**: Default/local configs without `OMNIROUTE_API_KEY` expose agent protocol to the network once A2A is enabled.
- **Suggested fix direction**: Fail closed when A2A enabled without keys; integrate `isValidApiKey` + scopes; align with CLIENT_API auth path.

### F-07-012 — Trae `/authorize` plants provider connections without server-side state secret

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/app/authorize/route.ts:66-79` — parses query, `createProviderConnection` with no HMAC/state store check
  - Comments admit only client modal verifies `loginTraceID` (`route.ts:28-30`)
- **Why it matters**: Anyone who can hit the instance can inject Trae credential blobs / poison connections (esp. `requireLogin=false` or open MANAGEMENT bootstrap). CSRF-style OAuth connection planting.
- **Suggested fix direction**: Server-side pending-state table (nonce issued at authorize start, single-use, expiry) before persist.

### F-07-013 — Content-Disposition header injection via file filename

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/app/api/files/[id]/content/route.ts:27-32` — `filename="${filename}"` unsanitized from DB `file.filename`
- **Why it matters**: Stored filename with `"` / CR/LF can break response framing or inject headers in some stacks (CWE-113).
- **Suggested fix direction**: RFC 5987 `filename*` + strip `[\r\n";\\]` from fallback filename.

### F-07-014 — Widespread raw `err.message` in API error JSON (Hard Rule 12)

- **Severity**: P2
- **Category**: security / maintainability
- **Evidence** (sample, non-exhaustive):
  - `src/app/api/assess/route.ts:98-100`
  - `src/app/api/relay/tokens/route.ts:58-59`
  - `src/app/api/a2a/tasks/route.ts:43-44`
  - `src/app/api/db/health/route.ts:13-15,27-29`
  - `src/app/api/db-backups/exportAll/route.ts:107-108` — `details: error.message`
  - `src/app/api/skills/route.ts:59-60`, `skills/install/route.ts:47-48`, `skills/executions/route.ts:24-25,54`
  - `src/app/api/quota/pools/route.ts:32,60` and sibling quota routes
  - `src/app/api/tunnels/tailscale/*/route.ts` multiple raw messages
  - `src/lib/api/errorResponse.ts:37-50` — `createErrorResponseFromUnknown` prefers raw `error.message`
- **Why it matters**: Path, SQL, proxy, and FS internals leak to clients; violates project Hard Rule #12 / ERROR_SANITIZATION.
- **Suggested fix direction**: Route all handler catches through `buildErrorBody` / `sanitizeErrorMessage`; fix `createErrorResponseFromUnknown` to sanitize by default.

### F-07-015 — `/api/assess` lacks in-handler auth + can fan out expensive model calls

- **Severity**: P2
- **Category**: security / bug
- **Evidence**:
  - `src/app/api/assess/route.ts:61-102` — POST no `requireManagementAuth`
  - Uses hardcoded `localhost:20128` with env API key (`route.ts:13-16,144-147`)
  - Relies solely on MANAGEMENT + `requireLogin`
- **Why it matters**: Auth-disabled installs: unauthenticated assessment runs (cost/load DoS). Also typo env keys `OMNIROUTe_API_KEY` may silently empty-auth.
- **Suggested fix direction**: Always require management auth; fix env key names; rate-limit.

### F-07-016 — `skills/install` stores arbitrary large `handlerCode` strings; weak error handling

- **Severity**: P3
- **Category**: maintainability / security residual
- **Evidence**:
  - `src/app/api/skills/install/route.ts:8-19,35-48` — `handlerCode` up to 50k chars registered as skill `handler`
  - Executor resolves handlers by **name** map (`src/lib/skills/executor.ts:76-78`), so this is not direct RCE today — but API shape suggests code install and still pollutes DB
  - Raw error message returned (`install/route.ts:47-48`)
- **Why it matters**: Confusing contract; storage abuse; future eval of handler string would be catastrophic.
- **Suggested fix direction**: Constrain handler to registered builtin names; reject free-form code; sanitize errors.

### F-07-017 — `cli-tools/config` accepts API key via query string on GET

- **Severity**: P3
- **Category**: security
- **Evidence**:
  - `src/app/api/cli-tools/config/route.ts:18-27` — `searchParams.get("apiKey")`
- **Why it matters**: Secrets in URLs land in access logs, proxies, browser history.
- **Suggested fix direction**: POST-only body for secrets; reject query `apiKey`.

### F-07-018 — Gamification federation score trusts client-supplied score value

- **Severity**: P3
- **Category**: security
- **Evidence**:
  - `src/app/api/gamification/federation/score/route.ts:38-49` — bearer federation key then `updateScore(..., parsed.data.score)` with no server-side recompute
- **Why it matters**: Compromised/rogue peer with federation token can inflate leaderboards.
- **Suggested fix direction**: Accept event deltas only; recompute server-side; sign payloads.

---

## Dead code / orphans

| Item | Notes |
|------|-------|
| `/api/assess` combo-health stub | `route.ts:124-126` always returns empty combos message |
| Docs/skills referencing `/api/health` | Multiple skill docs & CLI snippets still cite `/api/health` while runtime ping is `/api/health/ping` (CHANGELOG already notes historical confusion) |
| `createErrorResponseFromUnknown` unsanitized path | Shared helper undermines per-route sanitization efforts |

No confirmed unused `route.ts` files in-scope; classification/wiring bugs dominate over pure dead exports.

## Wiring smells

1. **Dual auth models**: pipeline `managementPolicy` vs per-route `requireManagementAuth` / `isAuthenticated` / `isAuthRequired` inconsistently applied (relay tokens = pipeline-only; keys/combos = both; db-backups = custom).
2. **ALWAYS_PROTECTED incomplete** relative to actual irreversible ops (export, import, restart, token mint).
3. **LOCAL_ONLY incomplete** relative to spawn inventory (version-manager, tailscale install, openapi try as bypass).
4. **PUBLIC `/api/cloud/`** broader than needed (credential mutation co-located with auth bootstrap).
5. **CSRF**: dashboard mutation origin check only when subject is `dashboard_session` (`pipeline.ts:327-338`); `requireLogin=false` anonymous mutations skip origin checks entirely.
6. **A2A dual gate**: env-only auth + MANAGEMENT class — easy to misconfigure.

## Improvement opportunities

1. Single “route security matrix” generator: path → LOCAL_ONLY / ALWAYS_PROTECTED / PUBLIC / MANAGEMENT + spawn-capable flag; gate CI (`check-route-guard-membership`) already partial — extend to version-manager/tailscale/openapi try denylist.
2. Default `requireManagementAuth` wrapper in a shared `defineManagementRoute` helper to stop new routes shipping without handler auth.
3. Split health into public/minimal vs authenticated/full.
4. Ban raw `error.message` in `src/app/api/**/route.ts` via lint rule or check script.

## Residual risk / unrun checks

- Full dynamic fuzz of every `src/app/api/**/route.ts` not executed; sample focused on high-risk prefixes.
- No live tunnel RCE proof against a running instance (static + codepath proof only).
- OAuth `[provider]/[action]` is large; residual unreviewed action-level IDOR may remain (out of residual dual-mode exclusion surface where overlapping).
- MCP transports under `/api/mcp/` appear correctly LOCAL_ONLY + bypassable — not re-filed.

## Summary counts

| Severity | Count |
|----------|------:|
| P0 | 1 |
| P1 | 6 |
| P2 | 8 |
| P3 | 3 |
| **Total findings** | **18** |

| Category | Count |
|----------|------:|
| security | 15 |
| bug / wiring | 2 |
| maintainability | 1 |

**Top remediation order**: F-07-001 (openapi try LOCAL_ONLY bypass) → F-07-002/003 (spawn LOCAL_ONLY holes) → F-07-004/005/007 (always-protect destructive + relay mint) → F-07-006 (cloud credential scope).

---

# Wave 2 — Adversarial Second Pass (Slice 07)

**Date**: 2026-07-11  
**Reviewer**: independent adversarial (Wave 2)  
**Parent**: `agentID=reviewers`  
**Scope**: NEW findings only in `src/app/api/**` + non-dashboard app routes. Exclusions 0036/0017 honored. Did not re-file Wave 1 LOCAL_ONLY holes (version-manager, tailscale install/daemon, openapi/try) unless a distinct route.

## Method (Wave 2)

1. Diff Wave 1 inventory vs spawn/MITM/tunnel/hook/code-eval surfaces  
2. Handler-auth gaps on high-value mutators and recon endpoints under `requireLogin=false`  
3. Full-key / credential-backed proxy routes outside LOCAL_ONLY / ALWAYS_PROTECTED  
4. No re-audit of dual-mode auth tasks 0032–0035, 0037–0039

## Findings (Wave 2)

### F-07-W2-001 — `/api/middleware/hooks` compiles caller JS with `new Function` (process RCE)

- **Severity**: P0
- **Category**: security
- **Evidence**:
  - `src/app/api/middleware/hooks/route.ts:28,78-112` — POST accepts `code: z.string()`, persists + `registerHook(saved)`
  - `src/lib/middleware/registry.ts:54-61` — `compileHookCode` uses `new Function("context", ...)` (Hard Rule #3 forbid pattern) with **no sandbox**
  - Auth is only `requireManagementAuth` (`route.ts:79-80`), which no-ops when `requireLogin=false` (`requireManagementAuth.ts:25-27`)
  - Path is **not** in `ALWAYS_PROTECTED_API_PATHS` or `LOCAL_ONLY_API_PREFIXES` (`routeGuard.ts:29-86`)
- **Why it matters**: Auth-disabled installs: unauthenticated remote/LAN POST installs a pre-request hook that runs attacker JavaScript inside the Node process on every proxied request — full RCE / credential theft / request hijack. With login enabled, a leaked dashboard JWT (tunnel) is enough. Far more direct than GHSA-class spawn surfaces.
- **Suggested fix direction**: Treat as spawn-class: ALWAYS_PROTECTED + LOCAL_ONLY (or disable remote hook install by default). Prefer a restricted DSL / wasm / worker sandbox with no `fs`/`child_process`/`net`. Never `new Function` in-process. Add regression: `requireLogin=false` + remote POST → 403; deny `new Function` path for non-loopback.

### F-07-W2-002 — `/api/cli-tools/antigravity-mitm` spawns MITM + sudo outside LOCAL_ONLY

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/app/api/cli-tools/antigravity-mitm/route.ts:45-91` — POST `startMitm(apiKey, pwd)` after optional `sudoPassword`
  - `src/mitm/manager.ts:396,531` — `startMitm` → `spawn(process.execPath, [MITM_SERVER_PATH], ...)`
  - LOCAL_ONLY only lists `/api/cli-tools/runtime/` (`routeGuard.ts:31`), **not** `/api/cli-tools/antigravity-mitm`
  - Contrast: `/api/tools/agent-bridge/` is correctly LOCAL_ONLY + SPAWN_CAPABLE (`routeGuard.ts:35`, `spawnCapablePrefixes.ts:29`) for the same MITM class
- **Why it matters**: Parallel MITM start path re-opens Hard Rules #15/#17 for tunnel + stolen management session (or auth-disabled). Sibling agent-bridge was fixed; this route was left on the remote management surface.
- **Suggested fix direction**: Add `/api/cli-tools/antigravity-mitm` (and stop/alias if spawn) to `LOCAL_ONLY_API_PREFIXES` + `SPAWN_CAPABLE_PREFIXES`; unit-test membership; prefer consolidating onto agent-bridge server routes.

### F-07-W2-003 — `/api/tunnels/cloudflared` downloads binary + spawns without LOCAL_ONLY

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/app/api/tunnels/cloudflared/route.ts:39-60` — authenticated POST enable → `startCloudflaredTunnel()`
  - `src/lib/cloudflaredTunnel.ts:607-631,817-820` — `installManagedBinary()` downloads GitHub asset; `spawn(binary.binaryPath, ...)`
  - Not in `LOCAL_ONLY_API_PREFIXES` / `SPAWN_CAPABLE_PREFIXES` (Wave 1 covered tailscale install/daemon only)
  - `isAuthenticated` is true when `requireLogin=false` (`apiAuth.ts:286-288`) → anonymous enable on open installs
- **Why it matters**: Remote JWT (or no-login) can pull and run a managed binary and open a public tunnel into the instance — process spawn + network exposure class Hard Rules #15/#17 target.
- **Suggested fix direction**: LOCAL_ONLY for enable/disable mutations (status GET may stay remote if needed); add to SPAWN_CAPABLE; ALWAYS_PROTECTED if tunnel start must remain remote-auth-only.

### F-07-W2-004 — `/api/translator/send` has no handler auth; spends operator provider credentials

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/app/api/translator/send/route.ts:20-95` — POST with **zero** `requireManagementAuth` / `isAuthenticated`
  - Loads active `getProviderConnections({ provider })` and builds authenticated upstream headers (`route.ts:49-88`) then `fetch(url, ...)` (`route.ts:91-95`)
  - Classifies as MANAGEMENT (`classify.ts:103-118`); pipeline allows anonymous when `requireLogin=false` (`management.ts:224-226`)
- **Why it matters**: Auth-disabled (common LAN) installs become free LLM spend / credential abuse using the operator’s stored keys without an inference API key. Same brittleness as relay tokens if pipeline is mis-classified.
- **Suggested fix direction**: Always `requireManagementAuth`; rate-limit; consider manage-scope only. Do not run under open MANAGEMENT bootstrap.

### F-07-W2-005 — `/api/cli-tools/keys` returns full raw API key material remotely

- **Severity**: P1
- **Category**: security
- **Evidence**:
  - `src/app/api/cli-tools/keys/route.ts:7-17` — GET maps `rawKey: key.key` (plaintext) for every key
  - Auth is `requireCliToolsAuth` → `requireManagementAuth` only (`requireCliToolsAuth.ts:3-4`)
  - Not LOCAL_ONLY (Wave 1 F-07-008 covered `/apply` homedir writes; this is a distinct secret-exfil route)
- **Why it matters**: Auth-disabled or stolen session over tunnel dumps all OmniRoute API keys in one JSON response. Dashboard key list normally masks; this endpoint is an intentional full-reveal without reveal-flag or loopback gate.
- **Suggested fix direction**: LOCAL_ONLY and/or ALWAYS_PROTECTED; gate on `isApiKeyRevealEnabled()`; never return bulk plaintext keys to non-loopback clients.

### F-07-W2-006 — `/api/sessions` exposes live session map with no handler auth

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/app/api/sessions/route.ts:9-14` — GET returns `getActiveSessions()`, counts, `getAllActiveSessionCountsByKey()` with **no** auth call
  - MANAGEMENT class only; anonymous when `requireLogin=false`
- **Why it matters**: Unauthenticated recon of stickiness / concurrency / per-key session pressure on open installs; aids multi-tenant abuse planning.
- **Suggested fix direction**: `requireManagementAuth`; strip or hash key identifiers in response.

### F-07-W2-007 — `/api/a2a/tasks` (+ `[id]`) list/detail without in-handler auth

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/app/api/a2a/tasks/route.ts:19-41` — GET lists tasks, no auth
  - `src/app/api/a2a/tasks/[id]/route.ts:4-12` — GET returns full task object, no auth
  - Wave 1 F-07-011 covered `/a2a` protocol env-key gate only — not these management JSON routes
- **Why it matters**: Auth-disabled installs leak A2A task payloads/skills context; pipeline-only auth is brittle.
- **Suggested fix direction**: `requireManagementAuth` on all `/api/a2a/*` management routes; align with A2A enablement flag.

### F-07-W2-008 — `/api/tunnels/ngrok` can publicly expose the whole instance without LOCAL_ONLY / ALWAYS_PROTECTED

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/app/api/tunnels/ngrok/route.ts:36-59` — POST enable → `startNgrokTunnel` (accepts caller `authToken`)
  - `src/lib/ngrokTunnel.ts:67-100` — `ngrok.forward({ addr: localTargetUrl })` publishes `http://127.0.0.1:{apiPort}`
  - Same auth pattern as cloudflared (`isAuthenticated` true when login disabled); not LOCAL_ONLY
- **Why it matters**: Stolen session or open install opens a public ingress to the entire OmniRoute surface (including subsequent abuse of other management routes). Lower process-spawn risk than cloudflared but high exposure impact.
- **Suggested fix direction**: LOCAL_ONLY or ALWAYS_PROTECTED for enable; refuse when `requireLogin=false` unless explicit operator flag.

### F-07-W2-009 — `/api/cli/tokens` mint not ALWAYS_PROTECTED (anonymous `oma_` under auth-disabled)

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/app/api/cli/tokens/route.ts:26-59` — POST `createAccessToken` returns plaintext `token` once
  - Uses `requireManagementAuth` only; not in `ALWAYS_PROTECTED_API_PATHS` (`routeGuard.ts:82-86`)
  - `ADMIN_SCOPE_PREFIXES` only constrains scoped access tokens when auth is on (`accessScopes.ts:24-25`) — irrelevant when pipeline allows anonymous (`management.ts:224-226`)
  - Parallel class to Wave 1 F-07-007 (relay mint) on a different secret type
- **Why it matters**: Auth-disabled installs: unauthenticated mint of long-lived CLI admin/read tokens for later remote control even after operator later enables login (until tokens revoked).
- **Suggested fix direction**: Add `/api/cli/tokens` to ALWAYS_PROTECTED; require dashboard session or existing admin credential always.

### F-07-W2-010 — OAuth `start-callback-server` binds local HTTP listener + returns `codeVerifier` under weak auth

- **Severity**: P2
- **Category**: security
- **Evidence**:
  - `src/app/api/oauth/[provider]/[action]/route.ts:239-240,266-326` — GET action starts `startLocalServer` (Codex fixed port **1455**)
  - `src/lib/oauth/utils/server.ts:10-15` — `http.createServer` listen
  - Route is under public prefix `/api/oauth/` (`publicApiRoutes.ts:9`); only `requireOAuthRouteAuth` (`[action]/route.ts:97-100,143-144`) which skips when `requireLogin=false`
  - Response includes `codeVerifier` + `authUrl` (`route.ts:321-326`)
- **Why it matters**: On open installs, any peer can bind the host OAuth callback port and obtain PKCE material / race callback capture. Not the same as Wave 1 Trae `/authorize` plant, but same OAuth connection-poisoning family on a different action.
- **Suggested fix direction**: LOCAL_ONLY for `start-callback-server`; always require management auth regardless of public OAuth prefix; never return `codeVerifier` to non-loopback.

### F-07-W2-011 — `/api/translator/history` has no auth (routing recon)

- **Severity**: P3
- **Category**: security
- **Evidence**:
  - `src/app/api/translator/history/route.ts:10-40` — GET dumps translation events (provider, combo, connectionId, endpoint) with no auth
- **Why it matters**: Auth-disabled recon of live routing topology / connection short ids.
- **Suggested fix direction**: `requireManagementAuth`; redact connection ids for non-admin.

### F-07-W2-012 — `/api/a2a/status` unauthenticated agent capability dump

- **Severity**: P3
- **Category**: security
- **Evidence**:
  - `src/app/api/a2a/status/route.ts:5-38` — GET returns enabled flag, task stats, agent card name/skills/capabilities with no auth
- **Why it matters**: Low sensitivity alone, but free recon of A2A enablement + skill surface on exposed hosts (complements F-07-011 / W2-007).
- **Suggested fix direction**: Public minimal `{ online: boolean }` only; full card/skills behind management auth.

## Wave 2 residual

- Not re-filed: F-07-001 openapi/try, F-07-002 version-manager, F-07-003 tailscale install/daemon (known LOCAL_ONLY set).
- `agent-bridge/server` lacks in-handler auth but is correctly LOCAL_ONLY + SPAWN_CAPABLE — residual if LOCAL_ONLY peer classification ever fails.
- OAuth public prefix still broader than needed beyond paste-credentials / start-callback-server samples.

## Wave 2 summary counts (new only)

| Severity | Count |
|----------|------:|
| P0 | 1 |
| P1 | 4 |
| P2 | 5 |
| P3 | 2 |
| **Total new findings** | **12** |

| Category | Count |
|----------|------:|
| security | 12 |

**Wave 2 top remediation order**: F-07-W2-001 (hooks RCE) → F-07-W2-002/003 (MITM + cloudflared LOCAL_ONLY) → F-07-W2-004/005 (translator spend + raw keys) → F-07-W2-008/009 (ngrok exposure + CLI token mint).

### Combined Wave 1 + Wave 2 totals

| Severity | W1 | W2 | Combined |
|----------|---:|---:|---------:|
| P0 | 1 | 1 | 2 |
| P1 | 6 | 4 | 10 |
| P2 | 8 | 5 | 13 |
| P3 | 3 | 2 | 5 |
| **Total** | **18** | **12** | **30** |
