# Review Report: Task 0080 — EPIC-19 Observe absorbs combo-health + route-trace — 2026-07-19

## Review Lineage

- **Current task**: Task 0080 (`omniroute-epic19-observe-absorb-combo-health-route-trace`); live path: `docs/tasks/02-doing/0080-omniroute-epic19-observe-absorb-combo-health-route-trace.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-frontend-quality-review.md` — `panel=` freeze
  - Task 0061 Observe health discoverability lineage (prior IA wave)
- **Related**: hard-blocks **0081** on analytics shell; parallel-safe vs **0079**
- **Review mode**: first independent formal review (frontend-quality + tsjs + code-quality; bundled with 0079/0081)
- **Previous task-embedded Review Trail**: empty

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept-completed` → parent may move to `03-review/`

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Observe `?panel=` mounts + subnav + analytics ops redirects + id= path |
| `runtime_enforcement` | 100 | Server `redirect()` for ops tabs; ObserveHubClient wires ComboHealth/RouteTrace; health link live on subnav |

## Diff Ownership

| Surface | Owner |
|---------|--------|
| `activity/ObserveHubClient.tsx` operational `panel=` mounts | **0080** |
| `ObserveHubSubnav` combo-health + route-trace links | **0080** |
| `analytics/page.tsx` **ops** redirect branch | **0080** (story branch co-owned / completed by **0081**) |
| `analytics/combo-health/page.tsx` | **0080** |
| `RouteExplainabilityTab` `panel=route-trace` id sync | **0080** |
| `tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts` | **0080** |
| Analytics storytelling redirects + Dashboard hub | **0081** |
| Providers costs config | **0079** |

## Delta Summary

### Resolved Since Previous Review

- N/A (first formal review)

### Persistent Findings

- none material

### Regressions

- none

### New Findings

- none open after review (nits below are non-scoring polish)

### Evidence Gaps / External Blockers

- none for unit-gate exits
- Live browser proof of `id=` deep-link UI selection not run; static chain + unit asserts cover builder → server redirect → hub prop → tab URL sync

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F-NIT-1 | NEW | Improvement | Open (non-blocking) | Combo Health + Health share icon `health_and_safety` | `ObserveHubSubnav.tsx` LINKS |
| F-NIT-2 | NEW | Improvement | Open (non-blocking) | Observe hub links omit `focus-ring` class present on ProvidersPolicySubnav | compare subnav className vs policy strip |

## Contract Compliance (exit conditions)

| Exit | Status | Evidence |
|------|--------|----------|
| Combo Health + Route Trace under Observe chrome | PASS | `ObserveHubClient` mounts tabs when `panel=combo-health\|route-trace`; subnav links via 0078 builders |
| Analytics ops tabs redirect to Observe | PASS | `analytics/page.tsx` branches before storytelling redirect |
| `id=` preserved end-to-end | PASS | `resolveEpic19RouteTraceDestination(id)` → hub `initialRequestId` → `RouteExplainabilityTab` writes `id` when `panel=route-trace` |
| Health discoverability on Observe hub | PASS | Health link `/dashboard/health` + `data-observe-health-link` + `OBSERVE_HEALTH_DEEP_LINK` |
| Storytelling tabs not stolen by 0080 alone | PASS | Matrix ownerTask 0081 for story tabs; disposition recorded |
| no-new-leaf | PASS | no primary combo-health/route-trace/health |
| hideable analytics-combo-health retained | PASS | still in hideable set |
| Unit tests | PASS | `epic19-observe-ops-redirect-0080.test.ts` + observe hub tests green |
| Completion Evidence dual-tab disposition | PASS | “operational tabs redirected; storytelling tabs still on analytics for 0081” — now fully redirected by 0081 as planned handoff |
| typecheck / eslint | PASS | exit 0 this review |

## Frontend quality (IA re-home lens)

| Check | Result |
|-------|--------|
| Panel vs source separation | **Correct** — `panel=` never pollutes `OBSERVE_SOURCES`; hub prefers operational panel over source when set |
| URL-driven chrome | **Strong** — source + panel derived from `useSearchParams` (no stale useState for panel/source) |
| Deep link id | **Sound** — freeze-at-first-paint for selection; route-trace tab keeps id in URL on panel host |
| Health discoverability | **Met** — explicit hub link (0061 contract retained) |
| Keyboard / a11y | Subnav Links + `aria-current`; PageTabBar not used for ops panels (Link strip — fine) |
| Archive-not-delete | ComboHealth/RouteExplainability modules imported, not rewritten |

## TS/JS axiom compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | `isObserveOperationalPanel`; exhaustive `ObserveSource` switch with `never` |
| Boundary Integrity | ✅ | Query id is opaque string deep-link only |
| Async Determinism | ✅ | Suspense boundaries around panels |
| Immutability | ✅ | Normalize helpers pure |
| State Exclusivity | ✅ | `ObserveHubActive = ObserveSource \| ObserveOperationalPanel \| "health"`; compile-time LINKS exhaustiveness |

## Evidence Reviewed

- Task + Completion Evidence
- `ObserveHubClient.tsx`, `ObserveHubSubnav.tsx`, `analytics/page.tsx`, nested combo-health redirect, RouteExplainabilityTab id sync
- Tests: 0080 suite + observe-hub-sidebar + dashboard-shell-tabs (ops disposition)

### Commands run (fresh this review)

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
  tests/unit/dashboard-shell-tabs.test.ts
# → all pass

npx eslint <0080 product + test files> --max-warnings 0
# → exit 0

npm run typecheck:core
# → exit 0
```

## Path To 100

Closed. Optional polish (non-blocking): differentiate Health vs Combo Health icons; add `focus-ring` on Observe hub links for parity with Providers policy strip.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-19
- **Reviewer profile**: `builders` / gt-frontend-quality-reviewer
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0080-epic19-observe-combo-health-route-trace-frontend-quality-review.md`
- **Lane outcome**: eligible for `03-review/`
```
