# Review Report: Task 0084 — EPIC-19 T19-G Sidebar Active (Routing + Observe Deep Routes) — 2026-07-19

## Review Lineage

- **Current task**: Task 0084 (`omniroute-epic19-sidebar-active-routing-observe-deep-routes`); live path at review: `docs/tasks/02-doing/0084-…` → promote `03-review/`
- **Related residual**: Task **0080** rework (health lights Observe + single Observe chrome) shares `sidebarRouteMatch.ts` SSoT
- **Authority**: EPIC-19 operator residual; inventory `docs/reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md` §1.3; `AGENTS.md` Dashboard IA (single-topbar + auto-evident sidebar)
- **Review mode**: formal frontend-quality + tsjs + code-quality (gt-frontend-quality-reviewer; parent `builders`)
- **Scope**: chrome-only active-map — **no** URL rename (0085 owns nest)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept-completed` → **`03-review/`**

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Explicit `SIDEBAR_ACTIVE_HUB_ALIASES` + `getActiveSidebarHref` hub-first resolve; Sidebar already consumes SSoT |
| `runtime_enforcement` | 100 | Pure matcher unit matrix green; `Sidebar.tsx` `activeHref === item.href` + `aria-current="page"` |

## Diff Ownership

| Surface | Owner |
|---------|--------|
| `src/shared/utils/sidebarRouteMatch.ts` — aliases + resolve | **0084** (shared residual with **0080**) |
| `tests/unit/sidebar-route-match.test.ts` — matrix + anti-phantom | **0084** |
| `tests/unit/ui/observe-hub-sidebar.test.ts` — single chrome strip | **0080** residual (co-asserted) |
| `Sidebar.tsx` wiring | Pre-existing consumer; no new leaves |
| Path rename nest under hub | **0085** (out of scope) |
| Multi-topbar Observe/Routing chrome | **0079/0081** ownership boundaries honored |

## Delta Summary

### Resolved (this task)

- Fusions / compression / context no longer leave Routing unlit (prefix-on-`/dashboard/combos` alone cannot match siblings)
- Health lights Observe via `/dashboard/health` → `activity` alias
- Explicit SSoT table (longest-prefix) instead of fragile ad-hoc string hacks
- Anti-phantom: deep routes do not light providers/home/operations/settings
- Hidden primary leaf → alias ignored (no phantom green on missing rail item)

### Persistent Findings

- none material

### Regressions

- none

### New Findings

- none open (optional nits non-scoring below)

### Evidence Gaps / External Blockers

- Live browser on `:22000` not required by exit conditions; pure unit + typecheck gate satisfied. **Do not** use `:21000`.

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | No blocking or scoring findings | — |

### Optional non-scoring notes

| ID | Severity | Summary |
| --- | --- | --- |
| F-NIT-1 | Improvement | Settings hub already nests under `/dashboard/settings/*` (prefix match); inventory Phase A mentioned Settings active map — already works without alias. No action for 0084. |
| F-NIT-2 | Improvement | Component render test for `aria-current` on fusions path not present; pure-function matrix + Sidebar wire is sufficient for this task’s exit bar. |

## Contract Compliance (exit conditions)

| Exit | Status | Evidence |
|------|--------|----------|
| `/dashboard/fusions` (+ children) light Routing (`combos`) | **PASS** | alias `/dashboard/fusions` → `combos` / `/dashboard/combos`; matrix paths include `/new`, `/:id` |
| Compression studio/settings/context light Routing | **PASS** | aliases `/dashboard/compression`, `/dashboard/context`; tests cover studio + context/settings/combos/caveman/rtk |
| Combos + live light Routing | **PASS** | prefix on primary href (no alias needed); `ROUTING_PATHS` includes `/dashboard/combos`, `/dashboard/combos/live` |
| `/dashboard/health` lights Observe (`activity`) | **PASS** | alias → `activity` / `/dashboard/activity` |
| Observe panels (`?panel=` / sources) light Observe | **PASS** | pathname remains `/dashboard/activity` (`usePathname` strips query); prefix match |
| Unit active-match matrix + anti-phantom | **PASS** | `tests/unit/sidebar-route-match.test.ts` — 11/11 |
| No new primary leaves | **PASS** | `PRIMARY_SIDEBAR_ITEMS` still 7; matcher remaps only |
| SSoT path → primary leaf id | **PASS** | `SIDEBAR_ACTIVE_HUB_ALIASES` + `resolveSidebarHubAlias` |
| `typecheck:core` | **PASS** | exit 0 this review |
| Targeted unit tests | **PASS** | sidebar-route-match + observe-hub-sidebar (single chrome) |

## Frontend quality (IA / a11y / chrome)

| Check | Result |
|-------|--------|
| Auto-evident sidebar | **Met** — green rail matches hub membership for documented deep destinations |
| `aria-current` | **Met** — Sidebar sets `aria-current="page"` when `activeHref === item.href` |
| Single primary leaf lit | **Met** — alias short-circuits to one `primaryHref`; longest-prefix ready if nested aliases appear |
| No multi-topbar regression | **Out of primary scope** — 0084 does not touch hub strips; observe residual asserts one `ObserveHubSubnav` on activity + health |
| No URL rename | **Correct** — inventory “active-map only” Phase A; 0085 deferred |
| Visual active styles | Primary token classes (`bg-primary/10 text-primary`) unchanged — correct reuse |

## TS/JS axiom compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | `SidebarHubPrimaryLeafId = "combos" \| "activity"`; readonly alias rows |
| Boundary Integrity | ✅ | Pure pathname matcher; no DOM / router side effects |
| Async Determinism | ✅ | Sync pure functions |
| Immutability | ✅ | `as const` alias table; no mutation of items |
| State Exclusivity | ✅ | Single `activeHref` derivation in Sidebar from SSoT |

## Inventory path coverage (task “Done when”)

| Path family | Inventory §1.3 broken before | After 0084 |
|-------------|------------------------------|------------|
| `/dashboard/fusions` | No | Routing |
| `/dashboard/context/*` | No | Routing |
| `/dashboard/compression/*` | No | Routing |
| `/dashboard/combos` (+ live) | Yes | Routing (unchanged prefix) |
| `/dashboard/activity?panel=*` | Yes | Observe (path) |
| `/dashboard/health` | No | Observe |

## Evidence Reviewed

- Task 0084 Completion Evidence
- `src/shared/utils/sidebarRouteMatch.ts`
- `src/shared/components/Sidebar.tsx` (`getActiveSidebarHref`, `aria-current`)
- `src/shared/constants/sidebarVisibility.ts` (`PRIMARY_SIDEBAR_ITEMS` = 7)
- `src/shared/components/RoutingHubSubnav.tsx` / `ObserveHubSubnav.tsx` (destination inventory only)
- `tests/unit/sidebar-route-match.test.ts`
- `tests/unit/ui/observe-hub-sidebar.test.ts` (single chrome co-gate)
- Inventory audit §1.3 / § operator residual table

### Commands run (fresh this review)

```bash
node --import tsx/esm --test \
  tests/unit/sidebar-route-match.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts
# → 40 pass, 0 fail

npm run typecheck:core
# → exit 0
```

## Path To 100

Closed at **100**. No remediation required.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-19
- **Reviewer profile**: `builders` / gt-frontend-quality-reviewer
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0084-epic19-sidebar-active-routing-observe-frontend-quality-review.md`
- **Lane outcome**: move to `docs/tasks/03-review/`
```
