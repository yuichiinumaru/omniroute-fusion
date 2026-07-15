# Review Report: Task 0040 — RouteGuard LOCAL_ONLY / ALWAYS_PROTECTED Expansion + RCE — 2026-07-11

## Review Lineage

- **Current task**: Task 0040 (`omniroute-routeguard-local-only-always-protected-expansion`); live path `docs/tasks/03-review/0040-omniroute-routeguard-local-only-always-protected-expansion.md`
- **Previous reports read**: none (first formal review for 0040)
- **Related reports / deps considered**:
  - `docs/reports/07-app-api.md` — F-07-001, F-07-W2-001, F-07-002…005, F-07-W2-002/003/008
  - `docs/reports/04-mcp-edge-runtime.md` — F-04-004, F-04-005
  - Hard Rules #3, #15, #17; `docs/security/ROUTE_GUARD_TIERS.md`
- **Review mode**: `initial-review`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 95 | All primary exit boxes have live evidence; stretch deferred with reason |
| F-07-001 openapi/try | 96 | Bare `/api/` removed; allowlist client-API only; denylist before fetch |
| F-07-W2-001 hooks RCE | 93 | Confined LOCAL_ONLY+ALWAYS_PROTECTED+SPAWN; `new Function` residual deferred as designed |
| LOCAL_ONLY spawn inventory | 94 | version-manager, tailscale, antigravity-mitm, cloudflared/ngrok hooks |
| ALWAYS_PROTECTED | 92 | export/import/restart/hooks classified; handler-level dual auth incomplete |
| F-04-004/005 SPAWN + always-auth | 90 | SPAWN expanded + policy always-auth; provider-login pattern still not SPAWN |
| Tests / verification | 94 | 85/85 focused unit pass; membership gate OK; one stale int-test constant |
| Docs / CHANGELOG | 96 | ROUTE_GUARD_TIERS + Unreleased Security entry present |

## Findings

### Blocking

- none

### Non-blocking (path-to-100)

| ID | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- |
| N1 | Medium | F-04-004 residual: Playwright provider-login is LOCAL_ONLY via regex but **not** SPAWN_CAPABLE | `routeGuard.ts:69-71` `LOCAL_ONLY_API_PATTERNS` `/api/providers/{id}/login`; `spawnCapablePrefixes.ts` has no provider-login entry; `isSpawnCapablePath("/api/providers/abc/login") === false` (live check this review) | Add a SPAWN deny entry or dedicated pattern helper so manage-scope bypass cannot re-open remote Chromium spawn (e.g. reject `/api/providers/` parent prefixes / match login pattern in `isLocalOnlyBypassableByManageScope`) + unit test |
| N2 | Medium | ALWAYS_PROTECTED classification is pipeline-only for several Tier-2 routes; handlers still honor open-install bypass | `db-backups/export/route.ts:18-22` / `import/route.ts:56-60` use `if (await isAuthRequired)`; `restart/route.ts:5` and `middleware/hooks/route.ts:86` call `requireManagementAuth(request)` **without** `{ always: true }` — contrast Task 0049 surfaces (`relay/tokens`, `cli-tools/keys`, `translator/send`) which use `always: true` | Switch export/import to always-auth (or `requireManagementAuth({ always: true })`); pass `{ always: true }` for restart + hooks. Keeps defense-in-depth if pipeline mis-wiring |
| N3 | Low | Stale integration constant: expects exactly 2 SPAWN_CAPABLE prefixes | `tests/integration/services/route-guard-services.int.test.ts:176-180` | Update length assert to current inventory (18) or assert membership of required prefixes only (no hard-coded total) |
| N4 | Low | openapi/try HTTP regression hits allowlist (400) before denylist (403) for spawn paths | `openapi-try-route.test.ts:145-174` accepts 400\|403; denylist only unit-tested via `isDeniedTryProxyPath` | Optional: unit/integration that temporarily includes a denylisted path under allowlist to prove 403 + no cookie forward |
| N5 | Info | Hard Rule #3 residual: hooks still compile with `new Function` in-process | `src/lib/middleware/registry.ts` (compile path); task explicitly defers full sandbox | Accept for this task; track DSL/wasm sandbox separately |

### Explicit non-issues (verified)

| Guard | Status | Proof |
| --- | --- | --- |
| F-07-001 bare `/api/` allowlist | ✅ | `ALLOWED_TRY_PATH_PREFIXES` = `/api/v1/`, `/v1/`, `/v1beta/`, `/a2a`, `/.well-known/agent.json` only |
| F-07-001 denylist before fetch | ✅ | `isDeniedTryProxyPath` + early 403; no fetch/cookie on denied paths (unit) |
| F-07-W2-001 remote hooks gate | ✅ | LOCAL_ONLY + ALWAYS_PROTECTED + SPAWN; policy rejects non-loopback 403 |
| F-07-002 version-manager | ✅ | `/api/version-manager/` in LOCAL_ONLY + SPAWN |
| F-07-003 tailscale install/daemon | ✅ | install + start-daemon prefixes only (not entire tailscale tree) |
| F-07-004 export/import ALWAYS_PROTECTED | ✅ | `isAlwaysProtectedPath` true; segment-safe vs `exportAll` |
| F-07-005 restart ALWAYS_PROTECTED | ✅ | listed beside `/api/shutdown` |
| F-07-W2-002 antigravity-mitm | ✅ | LOCAL_ONLY + SPAWN |
| F-07-W2-003 / stretch W2-008 tunnels | ✅ | cloudflared + ngrok LOCAL_ONLY/SPAWN; GET status exempt |
| F-04-005 anonymous spawn | ✅ | management policy skips `auth-disabled` for SPAWN + ALWAYS_PROTECTED; LAN peer `192.168.x` → 401 on services/hooks/restart; ordinary `/api/settings` still anonymous |
| SPAWN manage-scope deny | ✅ | new prefixes non-bypassable via `isLocalOnlyBypassableByManageScope` |
| Membership gate | ✅ | `check-route-guard-membership` → OK (0 new gaps) |
| Docs + CHANGELOG | ✅ | `ROUTE_GUARD_TIERS.md` tables + Unreleased Security Task 0040 |
| Focused tests | ✅ | **85 pass / 0 fail** (re-run this review) |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Primary finding IDs addressed or deferred | ✅ | Closed list in task evidence; hooks sandbox deferred; F-07-008 apply deferred |
| `routeGuard` + `spawnCapablePrefixes` inventory | ✅ | 23 LOCAL_ONLY prefixes + patterns; 18 SPAWN; expanded ALWAYS_PROTECTED |
| openapi/try denylist/allowlist + tests | ✅ | route + `openapi-try-route.test.ts` |
| hooks not remotely compilable without loopback + always auth | ✅ | LOCAL_ONLY + ALWAYS_PROTECTED + SPAWN + policy |
| F-04-005 in code | ✅ | `management.ts:224-235` `!isSpawnCapablePath` gate |
| `routeGuard.test.ts` pass | ✅ | included in 85-pass suite |
| Focused try + hooks tests | ✅ | openapi-try + middleware-hooks-route-guard |
| typecheck:core | ⚠️ | Task claims pre-existing `apiKeys.ts:524` only — not re-run full typecheck this review (unrelated residual accepted if pre-existing) |
| CHANGELOG Unreleased security | ✅ | Task 0040 bullet block |
| `ROUTE_GUARD_TIERS.md` updated | ✅ | membership tables include Task 0040 rows |

## Path to 100

1. **+4** — Close N1: treat provider-login as SPAWN_CAPABLE (or equivalent bypass-deny for the login pattern) with regression tests for manage-scope parent-prefix attempts.
2. **+3** — Close N2: handler-level `always: true` / always-auth for export, import, restart, hooks (parity with Task 0049 ALWAYS_PROTECTED handlers).
3. **+1** — Close N3: fix SPAWN length assert in services route-guard integration test.

## Findings (severity-ordered, reviewer format)

- [MEDIUM] `src/shared/constants/spawnCapablePrefixes.ts` / `routeGuard.ts:69-71` — Provider-login spawn not on SPAWN deny-list.
  Evidence: F-04-004 explicitly listed the Playwright login pattern; live `isSpawnCapablePath("/api/providers/abc/login")` is false while `isLocalOnlyPath` is true.
  Impact: Operator (or compromised manage key) can PATCH `localOnlyManageScopeBypassPrefixes` to include `/api/providers/` (not blocked by SPAWN parent/child check) and re-open remote Chromium spawn.
  Fix: Add SPAWN coverage for the login surface or hard-deny provider paths that match the login pattern in bypass evaluation + tests.

- [MEDIUM] `src/app/api/db-backups/export/route.ts:18`, `import/route.ts:56`, `restart/route.ts:5`, `middleware/hooks/route.ts:86` — Handler auth still open-install soft.
  Evidence: Conditional `isAuthRequired` / `requireManagementAuth` without `{ always: true }`.
  Impact: Production path is protected by `src/proxy.ts` → `runAuthzPipeline` + ALWAYS_PROTECTED/SPAWN policy; dual-layer gap if a caller hits handlers outside the pipeline (tests, future entrypoints).
  Fix: Mirror 0049 `{ always: true }` pattern.

- [LOW] `tests/integration/services/route-guard-services.int.test.ts:176-180` — Stale “exactly 2 SPAWN” assert will fail when services integration suite runs.
  Evidence: SPAWN list now has 18 entries.
  Impact: False CI red on integration path; confuses membership health signal.
  Fix: Membership assertions without fixed total.

## Open Questions

- none blocking approval

## Verdict

**PASS WITH NOTES** — Score **92/100**. Primary P0/P1 tunnel-RCE and auth-disabled spawn exits are met with greppable code + passing unit suite. Residual F-04-004 provider-login SPAWN hole and handler dual-auth are path-to-100, not reopen of the original remote-anonymous spawn matrix for the listed Task 0040 surfaces.

**Moved**: no (stay `docs/tasks/03-review/`)
**Patched**: no (review-only)
