# Review Report: Task 0081 — Dashboard single-topbar chrome — independent re-review 2026-07-20

## Review Lineage

- **Current task**: Task 0081 (`omniroute-epic19-dashboard-absorb-analytics-costs-overview`); live path: `docs/tasks/03-review/0081-…`
- **Review mode**: independent FULL re-review (agentID=reviewers); builder claims UNTRUSTED
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0081-chrome-rework-review.md` (100 after peer-split path-to-100)
  - `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-independent-rereview.md` (accepted triple chrome — **voided** by operator rework)
  - `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-frontend-quality-review.md` (91 PATH_TO_100 F1–F4)
- **Skills**: frontend-quality-harness · tsjs boundary · review-report-lineage
- **Constraints**: no git; no `:21000`; source + unit proof only

## Operator Chrome Contract (scoring axis)

| Rule | Required |
|------|----------|
| Hub strips on `/home` + Cache/Tokens/Leaderboard/Profile | **Exactly one** `DashboardTopbar` |
| Story tabs (Overview…Costs) | **Peers on same strip** — not a nested PageTabBar |
| Costs-overview | **No** `CostsSubnav` under Costs peer |
| Cache/Tokens/Leaderboard/Profile | Share **same** strip (not missing / not dual) |
| Analytics dual residual | Redirect shell only; no live `AnalyticsPageClient` content home |

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: **stay `03-review/`** (no path-to-100 patches required)
- **Patches applied this review**: none

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Single topbar SSoT; content-only story hub; distinct home vs overview peers |
| `runtime_enforcement` | 100 | Anti-phantom unit matrix; URL-driven content; redirects + peer mounts |

Overall → **100**.

## Dual-Topbar Evidence Matrix (live source)

| Route / surface | Hub strip mounts | Nested strips | Verdict |
|-----------------|------------------|---------------|---------|
| `/home` (+ all `?tab=`) | `<DashboardTopbar>` ×1 in `home/page.tsx` | Story hub: **0** PageTabBar / CostsSubnav import or JSX | PASS |
| `/home?tab=overview` | same single topbar | content = UsageAnalytics + Diversity only | PASS |
| `/home?tab=costs-overview` | same single topbar | content = CostOverviewTab only (**no** CostsSubnav) | PASS |
| `/dashboard/cache` | `<DashboardTopbar>` ×1 | no PageTabBar / CostsSubnav | PASS |
| `/dashboard/tokens` | `<DashboardTopbar>` ×1 | none | PASS |
| `/dashboard/leaderboard` | `<DashboardTopbar>` ×1 | none | PASS |
| `/dashboard/profile` | `<DashboardTopbar>` ×1 | none | PASS |
| `/dashboard/analytics` (+ nested storytelling) | redirect → `/home?tab=…` | `AnalyticsPageClient` **not mounted** (archive only; still has PageTabBar internally) | PASS |
| `/dashboard/costs` overview | redirect → `/home?tab=costs-overview` | no chrome | PASS |
| `CostsSubnav.tsx` | residual deep-link helper on disk | **0** live imports under `src/` | ARCHIVE OK |

**Repo-wide greps (src):**

```
CostsSubnav import/JSX mounts:     0
AnalyticsPageClient mounts:        0 (export only; page is redirect shell)
home DashboardTopbar mounts:       1
peer DashboardTopbar mounts:       1 each (cache/tokens/leaderboard/profile)
```

**Peer order on `DashboardTopbar` (operator rework list):**  
Dashboard · Overview · Evals · Search · Utilization · Compression · Costs · Cache · Tokens · Leaderboard · Profile  
(11 peers; F2: exactly one `storyTab: "overview"`; home = bare `/home` with `!onStoryTab` active logic)

**Content host (`DashboardStoryHubClient`):** navigation comment asserts chrome lives solely in topbar; no nested hub strips.

## Redirect Proof (kept — not undone)

| from | to |
|------|-----|
| `/dashboard/analytics` (+ overview/evals/search/utilization/compression) | `/home?tab=<id>` |
| nested `analytics/{evals,search,utilization,compression}` | matching story builders |
| `/dashboard/costs` overview (+ query preserve) | `/home?tab=costs-overview` |
| combo-health / route-trace | Observe `?panel=` (0080 regression) |
| budget/pricing/quota-share | Providers (0079 regression) |

## Tests Run

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts \
  tests/unit/ui/dashboard-ia-consolidation-0056.test.ts \
  tests/unit/dashboard-shell-tabs.test.ts \
  tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts
# → 88 pass / 0 fail (full chrome + redirect batch)
```

Key anti-phantom asserts in `epic19-dashboard-storytelling-0081.test.ts`:

- home mounts DashboardTopbar exactly once
- story hub must NOT import/mount PageTabBar or CostsSubnav
- costs-overview content-only (`CostOverviewTab`)
- peer pages mount same DashboardTopbar without secondary strips
- single overview aria-current owner + distinct home peer (F2)

## Findings

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| — | — | none blocking | Single-topbar + peer list match operator rework |

### Non-scoring residuals

| ID | Note |
|----|------|
| NIT-1 | `AnalyticsPageClient` still embeds PageTabBar for archive-not-delete; unreachable via production page (redirect shell) |
| NIT-2 | `CostsSubnav` residual file (0079/0081 deep-link matrix tests still read it); zero production mounts |
| NIT-3 | `tests/e2e/analytics-tabs.spec.ts` may still navigate legacy analytics URLs (redirects work; e2e tab-shell assumptions are follow-up) |

## Lane

- **Stay** `docs/tasks/03-review/0081-omniroute-epic19-dashboard-absorb-analytics-costs-overview.md`
- No move to `02-doing` (S≥90 and no defects requiring path-to-100)

## Reviewer

- **Profile**: `gt-frontend-quality-reviewer` / independent re-reviewers agent
- **Date**: 2026-07-20
