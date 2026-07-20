# Review Report: Task 0081 — EPIC-19 Dashboard absorbs analytics storytelling + costs overview — 2026-07-19

## Review Lineage

- **Current task**: Task 0081 (`omniroute-epic19-dashboard-absorb-analytics-costs-overview`); live path: `docs/tasks/02-doing/0081-omniroute-epic19-dashboard-absorb-analytics-costs-overview.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-frontend-quality-review.md`
  - Sibling wave reports (same session): 0079 Providers, 0080 Observe
- **Related**: hard-depends **0080**; soft CostsSubnav Overview vs **0079**; blocks **0082**
- **Review mode**: first independent formal review (frontend-quality + tsjs + code-quality; bundled wave)
- **Previous task-embedded Review Trail**: empty

## Score And Verdict

- **Score**: `91/100`
- **Verdict**: `PATH_TO_100`
- **Lane recommendation**: remain in `02-doing` until path-to-100 closed; do **not** promote to `03-review/` at 91

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 93 | Story hub + redirects + matrix tests strong; tab state + stale 0056 residual |
| `runtime_enforcement` | 91 | Server redirects wired; **Topbar ↔ story hub tab content can desync** under client nav on `/home` |

Overall capped by weaker dimension → **91**.

## Diff Ownership

| Surface | Owner |
|---------|--------|
| `home/DashboardStoryHubClient.tsx` + `home/page.tsx` story shell | **0081** |
| `home/DashboardTopbar.tsx` storytelling peer hrefs | **0081** |
| `analytics/page.tsx` storytelling redirect branch | **0081** (ops branch remains 0080) |
| nested `analytics/{evals,search,utilization,compression}/page.tsx` | **0081** |
| `costs/page.tsx` overview redirect | **0081** |
| CostsSubnav **Overview** href only | **0081** |
| Deep-link honesty (HomePageClient, ComboControlCenter, ApiManager) | **0081** |
| `tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts` | **0081** |
| Providers policy routes / three config CostsSubnav hrefs | **0079** |
| Observe ops mounts | **0080** |
| PRIMARY leaf drop | **0082** |

## Delta Summary

### Resolved Since Previous Review

- N/A (first formal review)

### Persistent Findings

- none prior

### Regressions

- **R1**: `tests/unit/ui/dashboard-ia-consolidation-0056.test.ts` — 3 failures after storytelling re-home (Topbar hrefs, CostsSubnav Overview, costs overview no longer mounts CostsSubnav)

### New Findings

- **F1**: Dashboard story hub `activeTab` is `useState` init-only; does not follow `useSearchParams()` when Topbar/Link navigates between `/home?tab=*` values
- **F2**: DashboardTopbar dual items (Dashboard + Analytics) both `storyTab: "overview"` → dual `aria-current` on overview
- **F3**: CostsSubnav orphaned (zero production imports) after costs overview redirect — removes last in-app strip to Providers policy surfaces (cross-task discoverability)

### Evidence Gaps / External Blockers

- e2e `tests/e2e/analytics-tabs.spec.ts` documented residual (redirects may keep navigation green; tab-shell assumptions stale) — non-blocking unit gate, track for follow-up

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | NEW | Serious (UX) | Open | Story hub tab content desyncs from URL on Topbar/client nav | `DashboardStoryHubClient.tsx` L79–81 vs `DashboardTopbar` Links to `buildDashboardStoryPath` |
| R1 | REGRESSION | Debt | Open | 0056 suite fails (3/6) after 0081 chrome moves | `dashboard-ia-consolidation-0056.test.ts` |
| F2 | NEW | Improvement | Open | Dual active Dashboard + Analytics on overview | `DashboardTopbar.tsx` DASHBOARD_LINKS |
| F3 | NEW | Debt (cross-task) | Open | CostsSubnav unmounted; Providers policy discovery weak | rg: CostsSubnav only self-definition + tests |
| F4 | NEW | Docs | Open | Compliance checklist still unchecked in task file | task L192–197 |

## Contract Compliance (exit conditions)

| Exit | Status | Evidence |
|------|--------|----------|
| Dashboard hosts six storytelling tabs on `/home?tab=` | PASS (structure) | `DashboardStoryHubClient` + `DASHBOARD_STORY_TABS` exhaustive meta assert |
| Analytics storytelling + costs overview redirect | PASS | `analytics/page.tsx` + nested + `costs/page.tsx` |
| CostsSubnav Overview → Dashboard only | PASS | Overview builder; three config hrefs still Providers |
| Ops tabs still Observe | PASS | analytics ops branch + regression tests |
| Providers config still Providers | PASS | 0079 regression asserts in 0081 suite |
| Deep-link rg inventory | PASS | Completion Evidence residuals listed (sidebar leaves → 0082) |
| Unit test 0081 suite | PASS | green this review |
| Update/quarantine obsolete shell tests | **FAIL** | 0056 still asserts pre-0081 Topbar + costs overview mounts |
| no-new-leaf / no PRIMARY drop | PASS | analytics+costs leaves retained |
| typecheck / eslint | PASS | exit 0 (4 pre-existing warnings noted by executor outside blocking gate) |
| Working mounts | **PARTIAL** | Components import correctly; URL↔content honesty broken for Topbar path (F1) |

## Frontend quality (storytelling hub lens)

| Check | Result |
|-------|--------|
| Single host `/home?tab=` | **Met** — builders always include `tab=` |
| PageTabBar a11y | **Good** — role=tablist, arrows, `aria-label="Dashboard sections"` |
| URL honesty | **Fail** — Topbar reads URL; hub content reads stale useState (F1). Observe hub does it right (derive from searchParams) |
| Archive-not-delete | **Met** — import analytics/costs modules; AnalyticsPageClient archived comment |
| Dual Analytics peer on Topbar | **Weak** — Analytics label still present pointing at overview (leaf not dropped — OK) but dual-active (F2) |
| Costs overview query preserve | **Good** — `costs/page.tsx` copies range/apiKeyIds/groupBy onto destination |
| Bundle / hydration | Story hub is client with Suspense; acceptable; no egregious double shells |

## TS/JS axiom compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | `DashboardStoryTab` + exhaustive STORY_TAB_META compile assert |
| Boundary Integrity | ✅ | tab normalize via `isDashboardStoryTab` |
| Async Determinism | ⚠️ | Client tab state not co-determined with Next searchParams (F1) |
| Immutability | ✅ | Meta tables const |
| State Exclusivity | ⚠️ | Representable invalid UI: Topbar “Costs” active while content is Overview |

## Evidence Reviewed

- Task + Completion Evidence
- `home/DashboardStoryHubClient.tsx`, `home/page.tsx`, `DashboardTopbar.tsx`
- Redirect shells: analytics root/nested, costs overview
- CostsSubnav Overview retarget
- Deep links: HomePageClient, ComboControlCenter, ApiManager
- Tests: 0081 + 0080 + 0079 + 0078 + dashboard-shell-tabs; **0056 fails**

### Commands run (fresh this review)

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts \
  tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
  tests/unit/dashboard-shell-tabs.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts
# → 95/95 pass

node --import tsx/esm --test tests/unit/ui/dashboard-ia-consolidation-0056.test.ts
# → 3 pass / 3 fail (Topbar hrefs, CostsSubnav Overview, costs overview CostsSubnav mount)

npx eslint <0081 product + test files> --max-warnings 0
# → exit 0

npm run typecheck:core
# → exit 0
```

## Path To 100 (ordered)

1. **F1 — URL-driven story tab (required)**  
   Prefer URL as source of truth (Observe / PlaygroundStudio style), e.g.:
   - `const activeTab = normalizeStoryTab(searchParams.get("tab"));`  
   - On PageTabBar change: `router.replace(buildDashboardStoryPath(...))` **or** keep replaceState **and** clear/sync local override when `searchParams` changes.  
   Prove with a unit/source assert or component test that Topbar `href` targets and hub selection share the same tab id after navigation semantics.

2. **R1 — Update 0056**  
   Align `dashboard-ia-consolidation-0056.test.ts` with post-0081 reality:
   - Topbar analytics/costs → `buildDashboardStoryPath(...)` (not `/dashboard/analytics|costs`)
   - Overview active via storyTab / searchParams
   - costs overview is redirect shell (no CostsSubnav mount)

3. **F2 — Topbar dual-active**  
   Either drop redundant Analytics peer until 0082, or give Analytics a non-overview meaning, or active-match only one overview control (`labelKey === "dashboard"` vs story chips).

4. **F3 — Policy discoverability residual**  
   After CostsSubnav unmount, add **one** honest entry to Providers policy (e.g. `ProvidersTopBar` / Providers root chips / costs-overview secondary links). Coordinate with 0079 ownership if editing Providers chrome.

5. **F4** — Check Compliance Checklist boxes after re-grep.

6. Re-run: 0081 suite + 0056 + typecheck:core + eslint touched files.

## Remediation Note (fixer 2026-07-19 — path-to-100 closed, re-review pending)

| Finding | Status | Implementation |
|---------|--------|----------------|
| F1 | **Fixed** | `DashboardStoryHubClient`: `activeTab = normalizeStoryTab(searchParams.get("tab"))`; `router.replace(buildDashboardStoryPath)`; `syncSearchParam={false}` |
| R1 | **Fixed** | `dashboard-ia-consolidation-0056.test.ts` aligned (story builders, single overview, costs redirect shell) — 6/6 green |
| F2 | **Fixed** | Dropped Analytics dual peer; single `storyTab: "overview"` on Dashboard |
| F3 | **Fixed** | `CostsSubnav` remounted on costs-overview; `ProvidersPolicySubnav` Overview → `buildDashboardStoryPath("costs-overview")` |
| F4 | **Fixed** | Task compliance checklist checked |

**Verification** (fixer): 77 pass / 0 fail across 0081+0056+0079+0080+0078+shell-tabs; `typecheck:core` exit 0; eslint touched files exit 0.

Task remains in `02-doing` for re-review promotion (fixer does not move lane).

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-19
- **Reviewer profile**: `builders` / gt-frontend-quality-reviewer
- **Score**: `91/100`
- **Verdict**: `PATH_TO_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-frontend-quality-review.md`
- **Blockers**: F1 URL↔tab desync; R1 0056 suite red
- **Lane outcome**: remain `02-doing` until path-to-100
```
