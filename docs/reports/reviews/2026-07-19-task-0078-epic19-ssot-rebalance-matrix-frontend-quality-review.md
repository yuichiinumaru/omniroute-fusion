# Review Report: Task 0078 — EPIC-19 SSoT map / rebalance matrix — 2026-07-19

## Review Lineage

- **Current task**: Task 0078 (`omniroute-epic19-ssot-map-rebalance-matrix`); live path at review start: `docs/tasks/02-doing/0078-omniroute-epic19-ssot-map-rebalance-matrix.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0064-0078-path-to-100-gt-ts-expert.md` — score **100** for 0078 (freeze-scope; builder path-to-100)
  - Task-embedded Review Trail (gt-ts-expert 2026-07-19) — **APROVADO / 100**
- **Related reports considered**:
  - `docs/reports/audits/2026-07-19-wave3-frontend-ia-operator-claims-verification.md` — B5 costs config vs storytelling; A5 no-new-leaf
  - `docs/tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md` — locked product matrix
- **Review mode**: `re-review` (independent frontend-quality + tsjs + code-quality gates; builders parallel-review subagent)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept-completed` → move to `03-review/` (parent score gate: 100→03-review)

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Builders + matrix + unit tests + planned-only docs; single shape per family |
| `runtime_enforcement` | N/A | Freeze contract explicitly defers page `redirect()` / leaf drop to **0079–0082**; consumers already import builders (proof freeze is usable) |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED`: Stale matrix `note` strings that claimed usage/settings still hop through `/dashboard/costs/*` intermediate URLs — live pages already call builders directly (0079). Notes updated to current provenance without changing destinations.

### Persistent Findings

- none material for freeze scope

### Regressions

- none

### New Findings

- none open after note accuracy fix

### Evidence Gaps / External Blockers

- none for 0078 scope
- Residual product work (not score blockers): soft inbound links (DashboardTopbar, HomePageClient, ComboControlCenter, ApiManager) → **0080/0081/0082**; full Dashboard storytelling shell → **0081**; leaf drop → **0082**

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Improvement | Closed | Matrix notes claimed intermediate costs hops that live code no longer uses | this review | `epic19Rebalance.ts` usage/settings rows; `usage/page.tsx`, `settings/pricing/page.tsx` |

## Contract Compliance (exit conditions)

| Exit | Status | Evidence |
|------|--------|----------|
| UI.md **only** `## EPIC-19 IA rebalance (planned)` | PASS | Planned language; cites `epic19Rebalance.ts`; no live leaf-gone claim |
| NAV-TREE **only** `## EPIC-19 target` planned L0–L1 | PASS | Length-7 L0; L1 by hub; changelog row 2026-07-19 |
| Code SSoT builders + matrix, no “or” shapes | PASS | Providers nested; Observe `?panel=`; Dashboard `/home?tab=` |
| Observe `panel=` separate from log `source` | PASS | Tests assert panels ∉ `OBSERVE_SOURCES`; builders call `buildObserveHubPath("activity", {panel})` |
| Dashboard `/home?tab=` matches live home href | PASS | `PRIMARY_SIDEBAR_ITEMS` home href `/home` |
| Inventory rg recorded with owners | PASS | Completion Evidence table + re-run this review |
| Unit matrix tests pass | PASS | **18/18** |
| Observe hub regression | PASS | **28/28** |
| `typecheck:core` | PASS | exit 0 |
| eslint touched TS | PASS | exit 0 |
| Pre-cutover primary still includes analytics+costs | PASS | length **9**; ids include both |
| Planned primary length **7** | PASS | `EPIC19_TARGET_PRIMARY_SIDEBAR_IDS` |
| Anti-leaf playground/translator/search-tools/labs | PASS | forbidden set + live primary asserts |
| Leaf cutover not claimed live | PASS | docs + `EPIC19_LEAVES_TO_DROP` deferred to 0082 |
| CHANGELOG Unreleased | PASS | EPIC-19 matrix freeze bullet present |

## Frontend quality (IA freeze lens)

| Check | Result |
|-------|--------|
| Visual / motion chrome change in this task | N/A by design — constants + planned docs only |
| Navigation hierarchy clarity | **Strong** — intent model (Configure / Debug / Story / Labs) documented once in UI.md + NAV-TREE |
| Dual-nav / dual-host risk | **Mitigated** — one string form per family; builders used by matrix `to` |
| Discoverability contract for operational panels | **Sound** — `panel=` coexists with `source=` without enum pollution; health deep link retained |
| Accessibility of future tab destinations | Path contracts are stable query/nested routes (0080/0081 own a11y of shells); freeze does not introduce inaccessible chrome |
| Responsive / hydration / bundle | N/A pure constants; no client components in 0078 deliverable |
| Downstream adoption | **Validated** — 0079/0080 product files already import builders (`ProvidersPolicySubnav`, costs redirects, analytics operational redirects, ObserveHubSubnav) |

## TS/JS axiom compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | No `any`; typed unions + membership guards |
| Boundary Integrity | ✅ | Guards `isObserveOperationalPanel` / `isDashboardStoryTab`; no untrusted I/O parsers required for freeze |
| Async Determinism | N/A | Sync pure functions |
| Immutability | ✅ | `readonly` matrix + `as const` destination constants |
| State Exclusivity | ✅ | panel vs source; forbidden primary leaves; pre-cutover vs planned primary separation |

## Evidence Reviewed

- Task file: `docs/tasks/02-doing/0078-omniroute-epic19-ssot-map-rebalance-matrix.md`
- Source: `src/shared/constants/epic19Rebalance.ts`, `observeHub.ts`, `sidebarVisibility.ts` (PRIMARY_SIDEBAR*)
- Docs: `docs/guides/UI.md` § EPIC-19; `docs/architecture/NAV-TREE-TARGET.md` § EPIC-19 target
- Tests: `tests/unit/ui/epic19-rebalance-matrix-0078.test.ts`, `tests/unit/ui/observe-hub-sidebar.test.ts`
- Live consumers (wiring proof of freeze utility, not 0078 ownership): costs redirects, providers policy subnav, analytics operational redirects, usage budget branch
- Runtime wiring proof for 0078: **non-runtime freeze module** by contract; consumers prove builders are production-ready

### Commands run (fresh this review)

```bash
node --import tsx/esm --test tests/unit/ui/epic19-rebalance-matrix-0078.test.ts
# → 18/18 pass

node --import tsx/esm --test tests/unit/ui/observe-hub-sidebar.test.ts
# → 28/28 pass

rg -n "dashboard/costs|dashboard/analytics|costs/budget" src/app src/shared --glob '*.{ts,tsx}'
# → inventory consistent with Completion Evidence owners

npx eslint src/shared/constants/epic19Rebalance.ts tests/unit/ui/epic19-rebalance-matrix-0078.test.ts
# → exit 0

npm run typecheck:core
# → exit 0
```

### Commands not run and why

- `npm run test:e2e` / browser smoke — no chrome cutover in 0078; N/A
- Port 21000 / 22000 — forbidden / not required for constants freeze

## Path To 100

Closed. Optional residual (non-blocking, other tasks):

1. Soft link rewires (topbar / ComboControlCenter / ApiManager / HomePageClient) when 0080–0082 land
2. Dashboard storytelling shell + costs overview `redirect()` → 0081
3. Live primary leaf drop + UI.md live dump → 0082

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-19
- **Reviewer profile**: `builders` / gt-frontend-quality-reviewer
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-frontend-quality-review.md`
- **Lane outcome**: moved to `03-review/`
```
