# Review Report: Task 0081 — EPIC-19 Dashboard absorbs analytics storytelling + costs overview — 2026-07-19 (re-review)

## Review Lineage

- **Current task**: Task 0081 (`omniroute-epic19-dashboard-absorb-analytics-costs-overview`); live path at review start: `docs/tasks/02-doing/0081-omniroute-epic19-dashboard-absorb-analytics-costs-overview.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-frontend-quality-review.md` (**91/100**, `PATH_TO_100`)
  - Fixer remediation note embedded in that report + task Completion Evidence (path-to-100 residual fix)
  - Bundle: `docs/reports/reviews/2026-07-19-epic19-0079-0080-0081-bundled-blast-radius.md`
  - Siblings (context only): 0078 / 0079 / 0080 frontend-quality reports
- **Review mode**: formal **re-review** after path-to-100 fixer (frontend-quality + tsjs + code-quality)
- **Reviewer**: `gt-frontend-quality-reviewer` (`builders` parent)
- **Claim under test**: F1 / R1 / F2 / F3 / F4 closed

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPT`
- **Lane recommendation**: move to `docs/tasks/03-review/` (score gate 100)

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Story hub URL-sourced tab; Topbar single overview; CostsSubnav remount; ProvidersPolicy Overview back-link; 0056 green; 0081 path-to-100 suite green |
| `runtime_enforcement` | 100 | `home/page.tsx` wires Topbar + StoryHub; analytics/costs server redirects live; Topbar Links and hub content share `?tab=` via `useSearchParams` + `router.replace` |

Overall capped by weaker dimension → **100**.

## Diff Ownership (unchanged)

| Surface | Owner |
|---------|--------|
| `home/DashboardStoryHubClient.tsx` + `home/page.tsx` story shell | **0081** |
| `home/DashboardTopbar.tsx` storytelling peer hrefs | **0081** |
| `analytics/page.tsx` storytelling redirect branch | **0081** (ops branch 0080) |
| nested `analytics/{evals,search,utilization,compression}/page.tsx` | **0081** |
| `costs/page.tsx` overview redirect | **0081** |
| CostsSubnav **Overview** href + remount on costs-overview | **0081** |
| `ProvidersPolicySubnav` Overview → Dashboard costs-overview | **0081** (F3 reverse discoverability) |
| Deep-link honesty (HomePageClient, ComboControlCenter, ApiManager, CommandPalette) | **0081** |
| Providers config routes / three config CostsSubnav hrefs | **0079** |
| Observe ops mounts | **0080** |
| PRIMARY leaf drop | **0082** (already live: 7-id primary without analytics/costs) |

## Delta Summary

### Resolved Since Previous Review (91 → 100)

| ID | Class | Prior status | Now | Proof |
|----|-------|--------------|-----|-------|
| **F1** | RESOLVED | Open — `useState` init-only tab desync | Closed | `DashboardStoryHubClient.tsx` L84–87: `activeTab = normalizeStoryTab(searchParams.get("tab"))`; L102–107: `router.replace(buildDashboardStoryPath(next))`; `syncSearchParam={false}` |
| **R1** | RESOLVED | Open — 0056 3/6 red | Closed | `dashboard-ia-consolidation-0056.test.ts` 6/6 green; story builders + single overview + costs redirect shell |
| **F2** | RESOLVED | Open — dual Dashboard + Analytics `storyTab: "overview"` | Closed | Topbar: single `storyTab: "overview"` on Dashboard only; no `labelKey: "analytics"` |
| **F3** | RESOLVED | Open — CostsSubnav orphaned | Closed | Mounted under costs-overview surface; `ProvidersPolicySubnav` Overview → `buildDashboardStoryPath("costs-overview")` |
| **F4** | RESOLVED | Open — compliance boxes unchecked | Closed | Task compliance checklist `[x]` |

### Persistent Findings

- none

### Regressions

- none (R1 fixed; no new red suites in epic19 matrix cluster)

### New Findings

- none blocking

### Evidence Gaps / External Blockers (non-blocking)

| ID | Class | Severity | Summary |
|----|-------|----------|---------|
| E1 | EVIDENCE_GAP (accepted residual) | Info | `tests/e2e/analytics-tabs.spec.ts` still hits `/dashboard/analytics` and expects a legacy tab set including **combo health**. Redirects land on Dashboard story hub (no combo-health tab). Task contract + prior review allow **document-only** residual for unit gate; follow-up e2e pass is out of 0081 blockers. |

## Findings Table

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | — | Closed | URL is source of truth for story tab | StoryHub L84–107; 0081 path-to-100 tests |
| R1 | RESOLVED | — | Closed | 0056 aligned to post-0081 chrome | 0056 suite 6/6 |
| F2 | RESOLVED | — | Closed | Single overview aria-current owner on Topbar | Topbar L33–47; assert one `storyTab: "overview"` |
| F3 | RESOLVED | — | Closed | Costs↔Providers policy strip bidirectional | StoryHub CostsSubnav mount; ProvidersPolicySubnav Overview |
| F4 | RESOLVED | — | Closed | Compliance checklist checked | task L192–197 |
| E1 | EVIDENCE_GAP | Info | Accepted residual | Stale e2e tab-shell assumptions | `tests/e2e/analytics-tabs.spec.ts` L125–147 |

## Contract Compliance (exit conditions re-verified)

| Exit | Status | Evidence |
|------|--------|----------|
| Dashboard hosts six storytelling tabs on `/home?tab=` | **PASS** | `STORY_TAB_META` + exhaustive type assert; PageTabBar options |
| Analytics storytelling + costs overview redirect | **PASS** | `analytics/page.tsx` + nested; `costs/page.tsx` preserves range/apiKeyIds/groupBy |
| CostsSubnav Overview → Dashboard only | **PASS** | `buildDashboardStoryPath("costs-overview")`; config → Providers builders |
| Ops tabs still Observe | **PASS** | analytics ops branch + 0080 regression suite |
| Providers config still Providers | **PASS** | 0079 regression + 0081 negative asserts |
| Deep-link rg inventory | **PASS** | peers use builders; matrix `from` + comments intentional; modules archive-imported |
| Unit test 0081 suite | **PASS** | green this re-review |
| Update/quarantine obsolete shell tests | **PASS** | 0056 updated; e2e documented residual (contract) |
| no-new-leaf / PRIMARY drop scope | **PASS** | 0081 did not re-add leaves; live primary is 7-id post-0082 |
| typecheck / eslint | **PASS** | `typecheck:core` exit 0; eslint touched files `--max-warnings 0` exit 0 |
| Working mounts + URL honesty | **PASS** | F1 closed; Topbar + hub share `?tab=` |

## Frontend quality (storytelling hub lens)

| Check | Result |
|-------|--------|
| Single host `/home?tab=` | **Met** — builders always set `tab=` |
| PageTabBar a11y | **Good** — role=tablist, `aria-label="Dashboard sections"`, keyboard via PageTabBar |
| URL honesty | **Met** — derive from `useSearchParams`; tab change uses `router.replace` (Observe pattern) |
| Archive-not-delete | **Met** — import analytics/costs modules; redirect shells only |
| Dual Analytics peer | **Met** — removed; single overview control |
| Costs overview query preserve | **Met** — costs page copies non-tab params |
| Policy discoverability | **Met** — CostsSubnav on costs-overview + ProvidersPolicy Overview reverse link |
| Bundle / hydration | Acceptable client Suspense boundaries; no dual content shell |

## TS/JS axiom compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | `DashboardStoryTab` + exhaustive meta |
| Boundary Integrity | ✅ | `isDashboardStoryTab` / `normalizeStoryTab` |
| Async Determinism | ✅ | URL co-determines tab; no stale local override |
| Immutability | ✅ | const meta tables |
| State Exclusivity | ✅ | One active story tab id; Topbar story matches via same param |

Nested `aria-current=page` on Topbar "Costs" and CostsSubnav "Overview" when `tab=costs-overview` is intentional dual-region chrome (distinct `aria-label` navs), not the F2 dual-peer bug.

## Evidence Reviewed (live FS)

- Task + path-to-100 Completion Evidence
- `home/DashboardStoryHubClient.tsx`, `home/DashboardTopbar.tsx`, `home/page.tsx`
- Redirect shells: analytics root/nested, costs overview
- `CostsSubnav.tsx`, `ProvidersPolicySubnav.tsx`
- Deep links: HomePageClient, ApiManager, CommandPalette, epic19Rebalance builders
- Tests: 0081 (incl. path-to-100 describes), 0056, 0079, 0080, 0078, dashboard-shell-tabs

### Commands run (fresh this re-review)

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts \
  tests/unit/ui/dashboard-ia-consolidation-0056.test.ts \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
  tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
  tests/unit/dashboard-shell-tabs.test.ts
# → 77 pass / 0 fail

npx eslint <0081 product + test files> --max-warnings 0
# → exit 0

npm run typecheck:core
# → exit 0

rg -n "dashboard/analytics|dashboard/costs|/home\\?tab" src/app src/shared --glob '*.{ts,tsx}'
# residual inventory: builders, archive imports, matrix froms, comments only
```

## Path To 100

**Empty** — all prior blockers closed; score is 100.

### Optional follow-up (not scoring / not 0081 gate)

1. Refresh or quarantine `tests/e2e/analytics-tabs.spec.ts` to `/home?tab=*` story set (drop combo-health expectation; ops covered under Observe e2e if any).

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-19
- **Reviewer profile**: `builders` / gt-frontend-quality-reviewer
- **Score**: `100/100`
- **Verdict**: `ACCEPT`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-rereview.md`
- **Blockers**: none
- **Lane outcome**: move `03-review/`

### Previous Reports
- `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-frontend-quality-review.md` (91, PATH_TO_100)
```
