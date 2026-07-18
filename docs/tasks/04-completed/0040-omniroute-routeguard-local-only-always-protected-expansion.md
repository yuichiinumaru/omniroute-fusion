# Task 0040: RouteGuard LOCAL_ONLY / ALWAYS_PROTECTED Expansion + RCE Surfaces

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S1)
> **Action type**: HARDEN
> **Blocks**: Task 0049 (handler auth matrix consistency preferred)
> **Depends on**: none
> **Architect-2**: Upgraded 2026-07-11 — F-04-005 must be code policy not docs-only; evidence anchors verified

---

## Source reports (builder reference)

Primary:
- `docs/reports/07-app-api.md` — F-07-001, F-07-W2-001, F-07-002, F-07-003, F-07-004, F-07-005, F-07-W2-002, F-07-W2-003 (stretch: F-07-008, F-07-W2-008)

Also relevant:
- `docs/reports/04-mcp-edge-runtime.md` — F-04-004 (SPAWN_CAPABLE inventory), F-04-005 (always-auth when `requireLogin=false`)
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context (do not re-open dual-mode / fusion / IA work)

Hard Rules: **#3**, **#15**, **#17**.

---

## Objective

Close tunnel / auth-disabled **spawn and process-RCE** holes by expanding and testing the route security matrix:

1. **Deny** `/api/openapi/try` from proxying LOCAL_ONLY / SPAWN_CAPABLE destinations (and prefer a safe allowlist).
2. **Neutralize** remote `/api/middleware/hooks` `new Function` install (ALWAYS_PROTECTED + LOCAL_ONLY and/or disable remote compile).
3. Add missing **LOCAL_ONLY** (and SPAWN_CAPABLE where applicable) for version-manager, tailscale install/daemon, cloudflared, antigravity-mitm, and other spawn surfaces listed below.
4. Add missing **ALWAYS_PROTECTED** for db export/import, restart, and irreversible destructive ops.
5. Align **SPAWN_CAPABLE_PREFIXES** with LOCAL_ONLY spawn inventory (F-04-004) and implement **always-auth for spawn** even when `requireLogin=false` (F-04-005).

## Background Context

### Finding IDs (acceptance checklist)

| ID | Severity | Title |
|----|----------|-------|
| **F-07-001** | P0 | `/api/openapi/try` same-origin proxy bypasses LOCAL_ONLY spawn gates |
| **F-07-W2-001** | P0 | `/api/middleware/hooks` compiles caller JS with `new Function` (process RCE) |
| **F-07-002** | P1 | `/api/version-manager/*` install/start without LOCAL_ONLY |
| **F-07-003** | P1 | Tailscale install/daemon spawn without LOCAL_ONLY |
| **F-07-004** | P1 | DB export/import skip ALWAYS_PROTECTED |
| **F-07-005** | P1 | `/api/restart` not ALWAYS_PROTECTED (shutdown is) |
| **F-07-W2-002** | P1 | `/api/cli-tools/antigravity-mitm` spawn outside LOCAL_ONLY |
| **F-07-W2-003** | P1 | `/api/tunnels/cloudflared` download/spawn without LOCAL_ONLY |
| **F-04-004** | P1 | Incomplete SPAWN_CAPABLE vs LOCAL_ONLY spawn surfaces |
| **F-04-005** | P1 | Private LAN + `requireLogin=false` anonymous spawn-capable LOCAL_ONLY |
| Stretch | P2 | F-07-008 cli-tools/apply; F-07-W2-008 ngrok (same tunnel class as cloudflared) |

See **Source reports** above for full relative paths.

### Out of scope

- Dual-mode auth (0032–0036); fusion; frontend IA
- Full DSL sandbox rewrite for hooks (disable remote install first; deeper sandbox = stretch)
- F-07-006/007 handler-auth content (Task **0049**) beyond classification flags
- Full key redaction for `/api/cli-tools/keys` (0049 primary)

---

## Exit Conditions (GDD/TDD)

- [x] All primary finding IDs above addressed or explicitly deferred with reason in Completion Evidence
- [x] `routeGuard.ts` + `spawnCapablePrefixes.ts` inventory updated and grepped for consistency
- [x] openapi/try denylist or allowlist fix landed with tests
- [x] hooks path: not remotely compilable without loopback + always auth (Hard Rule #3 path confined)
- [x] F-04-005 policy implemented in code (spawn never anonymous on open installs)
- [x] `node --import tsx/esm --test tests/unit/authz/routeGuard.test.ts` pass
- [x] New focused tests pass (try-proxy + hooks gates)
- [x] `npm run typecheck:core` — pre-existing `apiKeys.ts` error only (unrelated)
- [x] CHANGELOG.md entry under Unreleased (security/authz)
- [x] `docs/security/ROUTE_GUARD_TIERS.md` membership table updated

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/server/authz/routeGuard.ts` — LOCAL_ONLY / ALWAYS_PROTECTED expansion + `isSpawnCapablePath` + segment-safe always-protected match
  - `src/server/authz/policies/management.ts` — F-04-005 always-auth for SPAWN_CAPABLE when `requireLogin=false`
  - `src/shared/constants/spawnCapablePrefixes.ts` — F-04-004 parity (18 prefixes)
  - `src/app/api/openapi/try/route.ts` — tight allowlist (no bare `/api/`); denylist LOCAL_ONLY/SPAWN/ALWAYS_PROTECTED before fetch
  - `src/app/api/middleware/hooks/route.ts` — sanitize errors; docs for LOCAL_ONLY gate
  - `docs/security/ROUTE_GUARD_TIERS.md` — membership tables
  - `CHANGELOG.md` — Unreleased Security entry
  - Tests: `routeGuard.test.ts`, `management-policy.test.ts`, `spawn-capable-prefixes-client-safe.test.ts`, `route-guard-version-get-exemption.test.ts`, `openapi-try-route.test.ts`, **new** `middleware-hooks-route-guard.test.ts`
- **Finding IDs closed**:
  - F-07-001, F-07-W2-001, F-07-002, F-07-003, F-07-004, F-07-005, F-07-W2-002, F-07-W2-003, F-04-004, F-04-005
  - Stretch F-07-W2-008 (ngrok) included with cloudflared class
  - Deferred: full hooks DSL/wasm sandbox (confined via LOCAL_ONLY+ALWAYS_PROTECTED+SPAWN); F-07-008 cli-tools/apply (not spawn by source scan)
- **Testes**:
  - `node --import tsx/esm --test tests/unit/authz/routeGuard.test.ts tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts tests/unit/authz/route-guard-version-get-exemption.test.ts tests/unit/authz/middleware-hooks-route-guard.test.ts tests/unit/openapi-try-route.test.ts tests/unit/authz/management-policy.test.ts` → **83 pass**
  - Related: route-guard-local-prefix, openapi-security-tiers, check-route-guard-membership → **23 pass**
- **typecheck / lint**: `npm run typecheck:core` — only pre-existing `src/lib/db/apiKeys.ts(524)` error (not from this task)
- **CHANGELOG**: Unreleased → Security → Task 0040 entry
- **Agente executor**: Grok Build subagent (Task 0040)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: gt-code-quality-reviewer (independent, parent agentID=reviewers)
- **Veredito**: PASS WITH NOTES
- **Score**: 92/100
- **Notas**: Primary F-07/F-04 exits met (openapi/try allowlist+denylist; hooks LOCAL_ONLY+ALWAYS_PROTECTED+SPAWN; version-manager/tailscale/antigravity/cloudflared/ngrok LOCAL_ONLY; export/import/restart ALWAYS_PROTECTED; F-04-005 always-auth for SPAWN). Focused tests 85/85 pass; membership gate OK. Path-to-100: (N1) provider-login pattern still not SPAWN_CAPABLE; (N2) handler-level `always: true` missing on export/import/restart/hooks; (N3) stale SPAWN length=2 int-test. Full report: `docs/reports/reviews/2026-07-11-task-0040-routeguard-local-only-review.md`. Stay in `03-review/` (S≥90). Not moved to `04-completed/` / `02-doing/`. No code patches this review.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-18 (final-gate; report id `2026-07-16-…-final-review`)
- **Reviewer profile**: `reviewers` (adversarial final-gate)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-16-task-0040-routeguard-local-only-final-review.md`
- **Lane outcome**: remains in `03-review` (S=100; not demoted; not auto-promoted)
- **Task reference**: Task 0040 (`omniroute-routeguard-local-only-always-protected-expansion`)

#### Current Open Blockers

- none (primary F-07 / F-04 IDs closed)

#### Path-to-100 Summary

- ✅ **N1**: SPAWN pattern for provider-login + LAN anonymous reject (F-04-005)
- ✅ **N2**: Handler dual-auth always for export/import/restart/hooks
- ✅ **N3**: SPAWN int-test membership-only
- ✅ **N3b**: LOCAL_ONLY int-test membership-only (unfroze length===5)
- ✅ **N6**: SUPERSEDED by Task 0044 MCP `requireManagementAuth({ always: true })`
- ✅ **N5**: SUPERSEDED — hooks sandbox deferred by design; confined via LOCAL+ALWAYS+SPAWN

#### Path-to-100 Fix (2026-07-18 final-gate)

- **Reviewer**: `reviewers` — re-verified N1–N2; applied N3b LOCAL_ONLY membership int-test
- **Files**: `tests/integration/services/route-guard-services.int.test.ts`
- **Tests**: authz focused 71 pass; route-guard int 28 pass
- **Lane**: remain `03-review/` at 100

#### Regression Guards

- openapi/try allowlist must never re-add bare `/api/`
- hooks must stay LOCAL_ONLY + ALWAYS_PROTECTED + SPAWN_CAPABLE + handler always-auth
- `isSpawnCapablePath("/api/providers/x/login")` must remain true
- F-04-005: spawn paths reject anonymous when `requireLogin=false` (loopback + LAN)
- int-tests must not freeze LOCAL_ONLY / SPAWN array lengths

### Previous Reports

- `2026-07-16 final` — `100/100` — `docs/reports/reviews/2026-07-16-task-0040-routeguard-local-only-final-review.md`
  - **Resolved**: N1–N3/N3b; N5/N6 superseded; score 100
  - **Regression guard**: openapi/try allowlist; hooks LOCAL+ALWAYS+SPAWN; F-04-005 patterns
- `2026-07-16 reaudit` — `90/100` — `docs/reports/reviews/2026-07-16-task-0040-routeguard-local-only-reaudit.md`
  - **Carried forward then fixed**: N1 provider-login SPAWN; N2 handler always; N3 SPAWN length
  - **Resolved since**: path-to-100 + final-gate (N6 via 0044)
  - **Regression guard**: openapi/try allowlist; hooks LOCAL+ALWAYS+SPAWN; F-04-005 for SPAWN prefixes+patterns
- `2026-07-11` — `92/100` — `docs/reports/reviews/2026-07-11-task-0040-routeguard-local-only-review.md`
  - **Carried forward**: N1 provider-login SPAWN hole; N2 handler always; N3 SPAWN length
  - **Resolved since**: path-to-100
  - **Regression guard**: openapi/try allowlist no bare `/api/`; hooks LOCAL+ALWAYS+SPAWN; F-04-005 for SPAWN prefixes; focused units green

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
