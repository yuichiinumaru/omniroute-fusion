# Review Report: Task 0040 — RouteGuard LOCAL_ONLY / ALWAYS_PROTECTED Expansion + RCE — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0040 (`omniroute-routeguard-local-only-always-protected-expansion`); live path `docs/tasks/03-review/0040-omniroute-routeguard-local-only-always-protected-expansion.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0040-routeguard-local-only-review.md` — score 92/100, PASS WITH NOTES
- **Related reports considered**:
  - `docs/reports/07-app-api.md` / `docs/reports/04-mcp-edge-runtime.md` (F-07 / F-04-004/005 origin)
  - Task 0044 reaudit (MCP LAN + auth-disabled adjacency)
  - Hard Rules #3, #15, #17; `docs/security/ROUTE_GUARD_TIERS.md`
- **Review mode**: `re-review` (adversarial security re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers / gt-security-reviewer rigor)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `90/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Tunnel JWT cannot spawn (primary threat) | 97 | Via-proxy stamp → remote; LOCAL_ONLY + SPAWN inventory blocks listed surfaces |
| openapi/try (F-07-001) | 96 | Narrow allowlist; denylist before cookie/fetch; tests green |
| hooks RCE confine (F-07-W2-001) | 94 | LOCAL_ONLY+ALWAYS+SPAWN; `new Function` residual accepted |
| SPAWN / F-04-004–005 completeness | 84 | Listed spawn prefixes closed; **provider-login still not SPAWN** → LAN+auth-disabled anonymous Chromium residual elevated |
| ALWAYS_PROTECTED dual-layer | 88 | Classification OK; handler `always: true` still missing on export/import/restart/hooks |
| Tests / membership | 92 | Focused units 70/70 this reaudit; stale SPAWN length=2 int-test still present |
| Docs / CHANGELOG | 96 | Unchanged from prior; still accurate |

## Delta Summary

### Resolved Since Previous Review

- none (no builder path-to-100 landed between 2026-07-11 and this reaudit)

### Persistent Findings

- `PERSISTENT` **N1 (elevated severity Medium→High residual)**: Provider-login Playwright spawn is LOCAL_ONLY via regex but **not** SPAWN_CAPABLE / ALWAYS_PROTECTED. Live matrix this reaudit:
  - `isLocalOnlyPath("/api/providers/x/login") === true`
  - `isSpawnCapablePath(...) === false`
  - `isAlwaysProtectedPath(...) === false`
  - With `requireLogin=false` and private-LAN peer (LAN is treated as local for LOCAL_ONLY), management policy allows **anonymous** because F-04-005 only gates `isSpawnCapablePath` / `isAlwaysProtectedPath`.
  - Manage-scope parent-prefix bypass risk (`/api/providers/`) still applies as prior N1.
- `PERSISTENT` **N2**: export/import/restart/hooks handlers still soft-auth (`isAuthRequired` / `requireManagementAuth` without `{ always: true }`). Pipeline ALWAYS_PROTECTED remains the production gate.
- `PERSISTENT` **N3**: `tests/integration/services/route-guard-services.int.test.ts` still asserts SPAWN length === 2 (inventory is 18).
- `PERSISTENT` **N5**: hooks still compile with in-process `new Function` (task-deferred sandbox).

### Regressions

- none on primary F-07-001 / F-07-W2-001 / version-manager / tunnels / services / F-04-005 for listed SPAWN prefixes

### New Findings

- `NEW` **N6 (Low / adjacency)**: `/api/mcp/*` is LOCAL_ONLY but not SPAWN/ALWAYS — same LAN+auth-disabled anonymous path as provider-login at **policy** layer; handlers use `requireManagementAuth` without `always: true` so they also soft-open when `requireLogin=false`. MCP does not itself spawn npm/node, but it is a privileged control plane (tool surface). Cross-task with 0044; not a reopen of tunnel-JWT RCE if peer stamp/via-proxy is correct.
- `NEW` **N7 (Info)**: Primary tunnel threat remains closed: non-LAN remote + via-proxy stamped peers fail LOCAL_ONLY before spawn; openapi/try cannot re-enter LOCAL_ONLY/SPAWN/ALWAYS destinations.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full end-to-end tunnel + JWT live probe against production `21000` not run (workspace policy: do not touch prod 21000). Classification + unit policy tests used as proof.
- `EXTERNAL_BLOCKER`: none

## Findings

### Blocking

- none (primary tunnel-JWT → process spawn chain remains closed for listed SPAWN surfaces)

### Non-blocking (path-to-100) — security-impact ranked

| ID | Class | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT (elevated) | **High residual** | Provider-login not SPAWN → anonymous LAN Chromium when auth-disabled | Live probe; `management.ts:148` LAN local-eq; `management.ts:229-234` F-04-005 gate; `LOCAL_ONLY_API_PATTERNS` only | Add SPAWN entry/pattern for provider login **or** ALWAYS_PROTECTED + always-auth; unit: `isSpawnCapablePath("/api/providers/x/login")` + policy LAN anonymous reject |
| N2 | PERSISTENT | Medium | Handler dual-auth soft on export/import/restart/hooks | `export/route.ts:18`, `import:56`, `restart:5`, `hooks:86` | `{ always: true }` / always-auth parity with 0049 |
| N6 | NEW | Medium | MCP routes soft-open on LAN+auth-disabled | MCP not SPAWN; handlers without `always` | Prefer ALWAYS_PROTECTED for `/api/mcp/` **or** `requireManagementAuth({ always: true })` + policy spawn-class for process-adjacent tools |
| N3 | PERSISTENT | Low | Stale SPAWN length assert | int-test ~176–180 | Membership-only asserts |
| N4 | PERSISTENT | Low | try-proxy 400 before 403 for non-allowlisted spawn paths | prior N4 | Optional allowlist∩denylist unit |
| N5 | PERSISTENT | Info | `new Function` residual | registry compile | Separate sandbox task |

### Explicit non-issues (re-verified 2026-07-16)

| Guard | Status | Proof |
| --- | --- | --- |
| F-07-001 openapi/try | ✅ | `ALLOWED_TRY_PATH_PREFIXES` no bare `/api/`; `isDeniedTryProxyPath` before cookie/fetch |
| F-07-W2-001 hooks classification | ✅ | local+always+spawn all true |
| F-07-002…W2-003 / ngrok | ✅ | version-manager, tailscale install/daemon, antigravity-mitm, cloudflared, ngrok LOCAL+SPAWN |
| F-07-004/005 export/import/restart ALWAYS | ✅ | `isAlwaysProtectedPath` true |
| F-04-005 for SPAWN list | ✅ | services/hooks/runtime reject anonymous when auth-disabled (unit coverage) |
| Tunnel JWT re-entry via try-proxy | ✅ | denylist + allowlist |
| Focused units this reaudit | ✅ | **70/70** routeGuard + spawn-client-safe + hooks + openapi-try + management-policy |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Primary finding IDs addressed | ✅ with residual N1 inventory hole | SPAWN list 18; provider-login pattern residual |
| routeGuard + spawn inventory | ✅ | 23 LOCAL_ONLY prefixes + patterns; 18 SPAWN; 11 ALWAYS |
| openapi/try + tests | ✅ | pass |
| hooks loopback + always auth (pipeline) | ✅ | ALWAYS+LOCAL+SPAWN; handler soft residual N2 |
| F-04-005 in code | ✅ partial | works for SPAWN prefixes; incomplete for regex-only spawn surfaces |
| CHANGELOG / ROUTE_GUARD_TIERS | ✅ | prior evidence still present |

## Re-run commands (this reaudit)

```bash
node --import tsx/esm --test \
  tests/unit/authz/routeGuard.test.ts \
  tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts \
  tests/unit/authz/middleware-hooks-route-guard.test.ts \
  tests/unit/openapi-try-route.test.ts \
  tests/unit/authz/management-policy.test.ts
# → 70 pass / 0 fail

node --import tsx/esm -e '/* classification probe matrix — see Evidence */'
```

## Path To 100

1. **+5** — Close N1: SPAWN (or ALWAYS) cover for `/api/providers/{id}/login` + policy unit proving LAN+auth-disabled rejects anonymous.
2. **+3** — Close N2: handler `{ always: true }` on export/import/restart/hooks.
3. **+1** — Close N3: fix SPAWN length integration assert.
4. **+1** — Optional N6: harden MCP always-auth under open install.

## Task Ledger Patch Suggestion

See task file `Review Ledger` updated by this reaudit.

## Verdict

**HELD_IN_REVIEW_PATH_TO_100** — Score **90/100**.  
Primary adversarial claim **holds**: a tunnel-leaked JWT cannot reach process-spawn surfaces that are correctly classified SPAWN/LOCAL_ONLY when peer locality is stamped (via-proxy fails closed to remote).  
**Does not** reopen F-07-001 or hooks confinement. Residual security impact is concentrated on **unclassified spawn** (provider-login) under **trusted-LAN + requireLogin=false**, not public tunnel.

**Moved**: no (stay `docs/tasks/03-review/`)  
**Patched**: no (review-only)
