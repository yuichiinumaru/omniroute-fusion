# Review Report: Task 0081 — Dashboard peer topbar coverage residual — 2026-07-20

## Review Lineage

- **Current task**: Task 0081 (`omniroute-epic19-dashboard-absorb-analytics-costs-overview`); live path: `docs/tasks/03-review/0081-…`
- **Operator residual**: after chrome rework, Cache / Tokens / Leaderboard / Profile “não mostram topbar unificada”
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0081-chrome-rework-review.md` (100; CR1 peer split; claimed peer topbar PASS)
  - `docs/tasks/03-review/0081-…` Completion Evidence + rework addendum
- **Related**: EPIC-19 single-topbar law; AGENTS.md Dashboard IA; secondary check 0084 Routing hub matchers
- **Review mode**: independent FULL re-review (Frontend Quality) + residual path-to-100
- **Harnesses**: frontend-quality-harness · code-quality-harness

## Score And Verdict

| Stage | Score | Verdict |
|-------|------:|---------|
| As landed in `03-review` (pre residual fix) | **96** | ACCEPT with residual (not reject — mounts present; Profile loading path incomplete) |
| After path-to-100 (this session) | **100** | **ACCEPT** |

**Lane recommendation**: remain `03-review/` (ready for promote / next gate). Do **not** return to `02-doing`.

### Dual score (post-fix)

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | All four peers mount one `DashboardTopbar`; Profile loading no longer strips chrome |
| `runtime_enforcement` | 100 | Tests assert mount count === 1 + no loading early-return before topbar |

Overall → **100**.

## Scope Contract (this residual)

Verify operator residual:

| Peer page | Path | Must show unified `DashboardTopbar` |
|-----------|------|-------------------------------------|
| Cache | `/dashboard/cache` | yes |
| Tokens | `/dashboard/tokens` | yes |
| Leaderboard | `/dashboard/leaderboard` | yes |
| Profile | `/dashboard/profile` | yes |

Also: `TOPBAR_LINKS` / `DASHBOARD_LINKS` SSoT includes those path peers; secondary Routing hub active state via 0084 matchers.

## Live Code Findings

### Peer mount matrix (source of truth)

| Page | Import `../../home/DashboardTopbar` | JSX `<DashboardTopbar />` | Early return before topbar? | Anti-phantom (no PageTabBar/CostsSubnav) |
|------|-------------------------------------|---------------------------|-----------------------------|------------------------------------------|
| `cache/page.tsx` | **YES** | **YES** (outer return) | **NO** — loading is in-tree under topbar | **PASS** |
| `tokens/page.tsx` | **YES** | **YES** (outer return) | **NO** | **PASS** |
| `leaderboard/page.tsx` | **YES** | **YES** (outer return) | **NO** | **PASS** |
| `profile/page.tsx` | **YES** | **YES** | **WAS YES → FIXED** | **PASS** |

### Finding **PR1** (residual) — Profile loading shell omitted hub topbar

| Field | Value |
|-------|--------|
| **ID** | PR1 |
| **Class** | chrome completeness / UX honesty |
| **Severity** | **Debt → fixed** (was the only live residual matching operator “sem topbar”) |
| **Status** | **FIXED this review** |
| **Evidence (before)** | `profile/page.tsx` early `if (loading) return (…)` with **no** `<DashboardTopbar />` — first paint / slow API = blank chrome |
| **Fix** | Always mount `<DashboardTopbar />` above loading/content branch; loading is sibling content under the same shell |
| **Regression guard** | `epic19-dashboard-storytelling-0081` → “peer pages never early-return before DashboardTopbar (loading-safe chrome)” + mount count === 1 |

### Non-findings (operator residual cleared for Cache/Tokens/Leaderboard)

| Check | Result |
|-------|--------|
| `DASHBOARD_LINKS` includes `/dashboard/cache`, `/tokens`, `/leaderboard`, `/profile` | **PASS** — `kind: "path"` peers in `DashboardTopbar.tsx` |
| Active state for path peers | **PASS** — `pathname === href \|\| startsWith(href + "/")` |
| Exactly one strip SSoT (`data-dashboard-topbar`) | **PASS** — single nav; Suspense wrapper for `useSearchParams` |
| Home mounts one topbar; story hub content-only | **PASS** — prior chrome rework still holds |
| No dual Analytics/Costs peer hrefs | **PASS** — story builders only |

### Suspense note (non-blocking)

`DashboardTopbar` wraps nav in `<Suspense fallback={null}>`. During searchParams hydration the strip may flash empty for one frame on all client peer pages. Same pattern as other hub strips; **not** “missing topbar” residual. Do not treat as blocker.

## Secondary check — Routing hub (0084)

| Path | Alias → primary leaf | Evidence |
|------|----------------------|----------|
| `/dashboard/fusions` (+ `/new`, `/[id]`) | `combos` | `SIDEBAR_ACTIVE_HUB_ALIASES` + `sidebar-route-match.test.ts` |
| `/dashboard/compression` (+ studio) | `combos` | same |
| `/dashboard/context` (+ settings, combos, …) | `combos` | same |
| `/dashboard/health` | `activity` (Observe) | same |

**Verdict secondary**: **PASS** — fusions / context/settings / compression studio light Routing via 0084 matchers. Out of 0081 ownership; no residual for this re-review.

## Contract Compliance (0081 chrome + residual)

| Exit | Status | Evidence |
|------|--------|----------|
| Cache mounts unified topbar | **PASS** | source + 0081 peer test |
| Tokens mounts unified topbar | **PASS** | source + 0081 peer test |
| Leaderboard mounts unified topbar | **PASS** | source + 0081 peer test |
| Profile mounts unified topbar on **all** render paths | **PASS** (after PR1) | loading + content both under topbar |
| Peer mount count === 1 | **PASS** | strengthened unit assert |
| No PageTabBar / CostsSubnav stack on peers | **PASS** | anti-phantom asserts |
| Operator 11-peer list + F2 overview exclusivity | **PASS** | prior chrome rework + suite |
| Redirects analytics/costs kept | **PASS** | 0081 redirect describes |
| Unit suite green | **PASS** | 26/26 on 0081 primary file post-fix |

## Path-to-100 (this session)

1. **`src/app/(dashboard)/dashboard/profile/page.tsx`** — hoist `DashboardTopbar` above loading branch; content in ternary.
2. **`tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts`** — mount count === 1; loading early-return must not precede topbar.

### Commands

```bash
node --import tsx/esm --test tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts
# → 26 pass / 0 fail (includes new loading-safe chrome test)

npx eslint "src/app/(dashboard)/dashboard/profile/page.tsx" \
  "tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts" --max-warnings 0
# → exit 0

npx prettier --write "src/app/(dashboard)/dashboard/profile/page.tsx"
```

## Frontend Quality Lens

| Check | Result |
|-------|--------|
| Single hub topbar on peers | **Met** after PR1 |
| Loading resilience | **Met** — Profile no longer drops chrome while fetching gamification APIs |
| aria-current on path peers | **Met** — path kind active logic |
| Keyboard / focus-ring | **Met** — shared hub subnav classes |
| Layout resilience | **Met** — topbar sticky to page shell, not content fetch |

## Recommendation for 0081

- **Score**: **100/100** after residual path-to-100.
- **Verdict**: **ACCEPT** — operator residual “Cache/Tokens/Leaderboard/Profile without unified topbar” closed: three peers already correct; Profile loading gap fixed under this re-review.
- **Lane**: stay **`03-review/`** (or promote per pipeline). **Do not reject to `02-doing`**.
- **0082** still owns primary leaf drop for analytics/costs; orthogonal.

## Files Touched (this residual only)

| File | Change |
|------|--------|
| `src/app/(dashboard)/dashboard/profile/page.tsx` | loading-safe topbar mount |
| `tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts` | peer mount count + early-return guard |
| `docs/tasks/03-review/0081-…` | ledger residual entry |
| this report | full residual re-review |

## Agent

- **Reviewer + residual fixer**: Frontend Quality Reviewer (agentID=reviewers)
- **Date**: 2026-07-20
