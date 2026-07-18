# Review Report: Task 0040 — RouteGuard LOCAL_ONLY / ALWAYS_PROTECTED Expansion — 2026-07-16 (final-gate)

## Review Lineage

- **Current task**: Task 0040 (`omniroute-routeguard-local-only-always-protected-expansion`); live path `docs/tasks/03-review/0040-omniroute-routeguard-local-only-always-protected-expansion.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0040-routeguard-local-only-review.md` — 92/100
  - `docs/reports/reviews/2026-07-16-task-0040-routeguard-local-only-reaudit.md` — 90/100 HELD_IN_REVIEW_PATH_TO_100
- **Related reports considered**:
  - `docs/security/ROUTE_GUARD_TIERS.md`
  - Task 0044 MCP always-auth (closes adjacency N6 at handlers)
  - Hard Rules #3, #15, #17
- **Review mode**: `final-gate` (security re-review + path-to-100)
- **Reviewer profile**: `reviewers` (agentID=reviewers — security / authz rigor)
- **Parent agentID**: `reviewers`
- **Evidence date**: 2026-07-18

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` (remain `03-review/`; do not demote; no auto-promotion)
- **Delta vs previous reaudit**: **+10** (N1–N3 path-to-100 applied; N6 SUPERSEDED by 0044 handlers; LOCAL_ONLY int-test unfrozen this gate)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Tunnel JWT cannot spawn | 100 | LOCAL_ONLY + peer stamp; SPAWN inventory + patterns |
| openapi/try F-07-001 | 100 | Allowlist no bare `/api/`; denylist before fetch |
| hooks RCE confine F-07-W2-001 | 100 | LOCAL+ALWAYS+SPAWN + handler `{ always: true }` |
| SPAWN / F-04-004–005 | 100 | 18 prefixes + provider-login pattern; LAN anonymous reject |
| ALWAYS_PROTECTED dual-layer | 100 | Classification + export/import/restart/hooks always-auth |
| Tests / membership | 100 | Units 71 pass; int-test membership-only (no frozen lengths) |
| Docs / CHANGELOG | 100 | ROUTE_GUARD_TIERS + Unreleased Security |

### Axiom / security compliance

| Axiom | Status | Notes |
| --- | --- | --- |
| Hard Rule #3 (no remote eval path open) | ✅ | hooks confined LOCAL+ALWAYS+SPAWN; new Function task-deferred sandbox |
| Hard Rule #15/#17 (spawn loopback) | ✅ | SPAWN prefixes + provider-login pattern |
| F-04-005 always-auth for spawn | ✅ | `isSpawnCapablePath` blocks `requireLogin=false` anonymous |
| Segment-safe always-protect match | ✅ | `pathMatchesGuardPrefix` export vs exportAll |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` **N1**: `SPAWN_CAPABLE_PATTERNS` / `isSpawnCapablePath("/api/providers/x/login") === true`; management policy rejects LAN anonymous when auth-disabled
- `RESOLVED` **N2**: export/import/restart/hooks use `requireManagementAuth({ always: true })`
- `RESOLVED` **N3**: SPAWN int-test membership-only (no length===2)
- `RESOLVED` **N3b** (this gate): LOCAL_ONLY int-test no longer freezes length===5; membership invariants for Task 0040 surfaces
- `SUPERSEDED` **N6**: MCP handlers use `{ always: true }` (Task 0044 path-to-100); not tunnel-JWT RCE; out of primary 0040 spawn inventory
- `SUPERSEDED` **N5**: full hooks DSL/wasm sandbox explicitly deferred by task; confined by classification

### Persistent Findings

- none open for primary finding IDs (F-07-001…W2-003, F-04-004/005)

### Regressions

- none on classification matrix (live probe 2026-07-18):

| Path | local | spawn | always |
| --- | --- | --- | --- |
| `/api/providers/x/login` | true | **true** | false |
| `/api/middleware/hooks` | true | true | true |
| `/api/db-backups/export` | false | false | true |
| `/api/restart` | false | false | true |
| `/api/version-manager/install` | true | true | false |
| `/api/tunnels/cloudflared` | true | true | false |
| `/api/mcp/sse` | true | false | false† |

† Pipeline not ALWAYS_PROTECTED; handlers dual-layer always-auth (0044).

### New Findings

- none

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full end-to-end tunnel + JWT live probe against production **21000** not run (workspace policy: do not touch prod 21000). Classification + unit policy tests used as proof.
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| N1 | RESOLVED | High residual → closed | Closed | provider-login SPAWN | routeGuard + management-policy tests |
| N2 | RESOLVED | Medium | Closed | handler always dual-auth | export/import/restart/hooks routes |
| N3 | RESOLVED | Low | Closed | SPAWN length freeze | int-test membership |
| N3b | RESOLVED | Low | Closed | LOCAL_ONLY length freeze | int-test membership (this gate) |
| N5 | SUPERSEDED | Info | Deferred by design | new Function sandbox | task out-of-scope; confined |
| N6 | SUPERSEDED | Medium adjacency | Closed externally | MCP soft-open | 0044 always-auth handlers |
| G1 | Guard | — | Pass | openapi/try denylist | openapi-try-route tests |
| G2 | Guard | — | Pass | F-04-005 SPAWN | management-policy tests |

## Contract Compliance

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Primary F-07 / F-04 IDs addressed | ✅ | classification + units |
| routeGuard + SPAWN inventory | ✅ | 23 LOCAL prefixes + patterns; 18 SPAWN; 11 ALWAYS |
| openapi/try allowlist+denylist + tests | ✅ | pass |
| hooks not remotely open | ✅ | LOCAL+ALWAYS+SPAWN + always-auth |
| F-04-005 in code | ✅ | spawn path rejects anonymous auth-disabled |
| routeGuard unit tests | ✅ | 71 pass focused suite |
| CHANGELOG + ROUTE_GUARD_TIERS | ✅ | present |
| Stretch ngrok | ✅ | LOCAL+SPAWN with cloudflared class |

## Path-to-100 Applied (this gate)

1. Unfroze `LOCAL_ONLY_API_PREFIXES.length === 5` in `tests/integration/services/route-guard-services.int.test.ts` → membership invariants including version-manager + hooks (parity with SPAWN N3 fix).
2. Re-verified N1–N2 production wiring and F-04-005 policy units (already landed 2026-07-18 builder path-to-100).

## Evidence Reviewed

- `src/server/authz/routeGuard.ts`, `policies/management.ts`
- `src/shared/constants/spawnCapablePrefixes.ts`
- `src/app/api/openapi/try/route.ts`, `middleware/hooks/route.ts`, `db-backups/export|import`, `restart`
- Tests: routeGuard, spawn-client-safe, hooks-guard, openapi-try, management-policy, route-guard-services.int
- Commands:
  ```bash
  node --import tsx/esm --test tests/unit/authz/routeGuard.test.ts \
    tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts \
    tests/unit/authz/middleware-hooks-route-guard.test.ts \
    tests/unit/openapi-try-route.test.ts \
    tests/unit/authz/management-policy.test.ts
  # → 71 pass

  node --import tsx/esm --test tests/integration/services/route-guard-services.int.test.ts
  # → 28 pass
  ```

## Path To 100

- **none remaining** — score 100

## Task Ledger Patch Suggestion

Score `100/100`, `ACCEPTED_100`, remain `03-review/`. Record N3b LOCAL_ONLY int-test unfreeze under this final-gate.
