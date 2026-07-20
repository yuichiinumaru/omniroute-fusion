# Review Report: Task 0081 — Chrome rework (single Dashboard topbar) — 2026-07-19

## Review Lineage

- **Current task**: Task 0081 (`omniroute-epic19-dashboard-absorb-analytics-costs-overview`); live path at review start: `docs/tasks/02-doing/0081-…`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-frontend-quality-review.md` (91, PATH_TO_100; F1–F4)
  - `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-rereview.md` (builders 100)
  - `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-independent-rereview.md` (independent 100; accepted triple chrome — superseded by operator chrome rework)
- **Related**: EPIC-19 rework addendum (operator single-topbar law); AGENTS.md Dashboard IA section; Tasks 0078/0079/0080/0082
- **Review mode**: formal chrome-rework re-review + path-to-100 fix (Frontend Quality + code-quality + tsjs)
- **Harnesses**: frontend-quality-harness · code-quality-harness · tsjs-harness

## Score And Verdict

- **Initial score (builder chrome rework as landed)**: `92/100`
- **After path-to-100 (this review)**: `100/100`
- **Verdict**: `ACCEPT`
- **Lane recommendation**: promote to `03-review/`

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Single topbar SSoT; content-only hub; peer split with distinct destinations; anti-phantom tests |
| `runtime_enforcement` | 100 | `/home` + peer pages mount one `DashboardTopbar`; redirects unchanged; URL drives content |

Overall → **100**.

## Diff Ownership (chrome rework)

| Surface | Owner |
|---------|--------|
| `home/DashboardTopbar.tsx` peers + active logic | **0081** |
| `home/DashboardStoryHubClient.tsx` content-only host | **0081** |
| `home/page.tsx` single topbar mount | **0081** |
| `dashboard/{cache,tokens,leaderboard,profile}/page.tsx` same topbar | **0081** |
| Story hub: no PageTabBar / CostsSubnav | **0081** |
| Redirects analytics/costs overview (kept) | **0081** (prior) |
| PRIMARY leaf drop | **0082** (untouched) |
| Providers config chrome | **0079** |
| Observe ops | **0080** |

## Operator Contract (chrome)

Peers on **exactly one** strip:

| Peer | Destination | Active when |
|------|-------------|-------------|
| Dashboard/Home | `/home` | `/home` and no story `?tab=` |
| Overview (ex-analytics) | `/home?tab=overview` | `tab=overview` |
| Evals | `/home?tab=evals` | `tab=evals` |
| Search | `/home?tab=search` | `tab=search` |
| Utilization | `/home?tab=utilization` | `tab=utilization` |
| Compression | `/home?tab=compression` | `tab=compression` |
| Costs | `/home?tab=costs-overview` | `tab=costs-overview` |
| Cache | `/dashboard/cache` | path prefix |
| Tokens | `/dashboard/tokens` | path prefix |
| Leaderboard | `/dashboard/leaderboard` | path prefix |
| Profile | `/dashboard/profile` | path prefix |

Content split (after path-to-100):

- Bare `/home` → `HomePageClient` only
- `?tab=overview` → `UsageAnalytics` + `DiversityScoreCard` only
- Other story tabs unchanged; costs-overview mounts `CostOverviewTab` only (no CostsSubnav)

## Delta Summary

### Resolved Since Previous Reviews (storytelling)

| ID | Class | Status | Notes |
|----|-------|--------|-------|
| F1 | URL ↔ content desync | RESOLVED (prior) | Hub derives surface from `useSearchParams` |
| F2 | Dual aria-current Dashboard+Analytics both overview | RESOLVED (prior) then re-opened as merge | See CR1 |
| F3 | CostsSubnav triple chrome | RESOLVED (rework) | Not mounted on hub; content-only costs-overview |
| IR1/IR2 e2e edge | Prior independent | RESOLVED (prior) | Out of chrome-rework scope |

### Findings This Review

| ID | Class | Severity | Status | Summary |
|----|-------|----------|--------|---------|
| **CR1** | NEW (vs operator list) | Debt / UX honesty | **FIXED this review** | Builder merged “Dashboard/Home · Overview” into one peer labeled Dashboard at `?tab=overview`. Operator list requires **both** labels as peers with distinct destinations and no dual `aria-current`. |
| **CR2** | — | — | RESOLVED by rework | No PageTabBar + CostsSubnav stack on `/home` or peer pages |
| **CR3** | — | — | RESOLVED by rework | Cache/Tokens/Leaderboard/Profile share same `DashboardTopbar` |

### Path-to-100 Fix (this session)

1. `DashboardTopbar.tsx` — 11 peers; `kind: "home" | "story" | "path"`; home active only when `onHome && !onStoryTab`; Overview sole `storyTab: "overview"`.
2. `DashboardStoryHubClient.tsx` — `resolveHubSurface`: null/unknown → `home` cockpit; `overview` → analytics overview only.
3. Tests — operator peer label list; home vs overview content split; F2 still exactly one `storyTab: "overview"`.

## Contract Compliance

| Exit | Status | Evidence |
|------|--------|----------|
| Exactly one topbar on `/home` | **PASS** | `home/page.tsx` one `<DashboardTopbar />`; hub imports no PageTabBar/CostsSubnav |
| costs-overview does not render CostsSubnav | **PASS** | hub mount matrix + CostOverviewTab only |
| Anti-phantom unit tests | **PASS** | `epic19-dashboard-storytelling-0081` single-topbar describes |
| Sidebar Dashboard active on `/home?tab=*` | **PASS** | pathname `/home` + `exact: true` via `getActiveSidebarHref` |
| Cache/Tokens/Leaderboard/Profile same topbar | **PASS** | each page mounts `DashboardTopbar` once; no PageTabBar/CostsSubnav |
| Operator peer list (Dashboard **and** Overview) | **PASS** (after CR1 fix) | 11 peers; distinct `/home` vs `?tab=overview` |
| No dual aria-current on overview | **PASS** | one `storyTab: "overview"`; home excluded when any story tab set |
| Redirects analytics/costs kept | **PASS** | matrix + page shells unchanged |
| Ops still Observe / Providers still Providers | **PASS** | 0080/0079 regression suites |
| no-new-leaf / no silent PRIMARY drop | **PASS** | 0081 suite; 0082 owns leaf drop |
| typecheck:core | **PASS** | exit 0 |
| eslint touched | **PASS** | `--max-warnings 0` exit 0 |
| Unit suite | **PASS** | **81 pass / 0 fail** (0081 + 0056 + 0078 + 0079 + 0080 + dashboard-shell-tabs) |

## Frontend Quality Lens

| Check | Result |
|-------|--------|
| Single hub topbar | **Met** — `data-dashboard-topbar` once per route mount |
| Visual hierarchy / peer order | **Met** — operator order |
| Keyboard / focus | **Met** — `focus-ring` on Links; nav `aria-label` |
| aria-current exclusivity | **Met** — home vs story vs path kinds |
| Motion | N/A (static strip) |
| Responsive strip | Inherits `HUB_SUBNAV_SHELL_CLASS` (pre-existing hub pattern) |
| URL honesty | **Met** — surface from `searchParams.get("tab")` |
| Bundle / hydration | Suspense boundaries around `useSearchParams` |

## Type / TSJS Lens

| Check | Result |
|-------|--------|
| Discriminated peer union | `kind: home \| story \| path` with `satisfies readonly TopbarLinkItem[]` |
| Story tab typing | `DashboardStoryTab` from 0078 SSoT; home is not a story tab (no SSoT break) |
| Unsafe any | None introduced |
| Boundary | Client topbar + hub; server `home/page.tsx` setup gate intact |

## Anti-Phantom Matrix (source-asserted)

| Route family | Topbar mounts | Nested PageTabBar | Nested CostsSubnav |
|--------------|--------------:|:-----------------:|:------------------:|
| `/home` (+ any `?tab=`) | 1 | 0 | 0 |
| `/dashboard/cache` | 1 | 0 | 0 |
| `/dashboard/tokens` | 1 | 0 | 0 |
| `/dashboard/leaderboard` | 1 | 0 | 0 |
| `/dashboard/profile` | 1 | 0 | 0 |

Archive residuals (not live chrome): `AnalyticsPageClient` still defines PageTabBar (redirect shell prevents mount); `CostsSubnav.tsx` residual for deep-link/0079 tests — **not** mounted on Dashboard hub.

## Commands Run

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts \
  tests/unit/ui/dashboard-ia-consolidation-0056.test.ts \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
  tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
  tests/unit/dashboard-shell-tabs.test.ts
# → 81 pass / 0 fail

npx eslint <touched chrome files> --max-warnings 0  # exit 0
npm run typecheck:core  # exit 0
```

## Residual / Non-Blocking

- Sidebar i18n namespace still lacks keys for `overview` / `evals` / `search` / `utilization` / `compression` — `sidebarText` falls back to English labels (same pattern as prior topbar peers). Optional polish outside chrome exit conditions.
- e2e `analytics-tabs.spec.ts` residual documented in prior completion evidence; unit gate owns chrome contract.
- No browser visual QA on :21000 (forbidden) / :22000 not required for unit-proven chrome.

## Lane Outcome

- **Score**: 100/100 ACCEPT after path-to-100 (CR1 peer split)
- **Move**: `02-doing` → `03-review`
- **Reviewer**: gt-frontend-quality-reviewer (parent builders)
- **Date**: 2026-07-19
