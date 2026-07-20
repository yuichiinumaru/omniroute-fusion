# Independent Re-Review: Task 0080 — Observe Chrome (Health Sidebar + Single Strip) — 2026-07-20

## Review Lineage

- **Agent**: independent FULL RE-REVIEWER (`reviewers`; builders untrusted)
- **Tasks**: 0080 residual (health lights Observe + single chrome) — shared SSoT with **0084**
- **Authority**: Operator intent 2026-07-20; `AGENTS.md` Dashboard IA single-topbar; residual addendum on task
- **Prior builder scores**: `100/100` ACCEPTED (untrusted until live matrix re-proved)

## Score And Verdict

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | **100** | Ops panels, redirects, `id=`, health discoverability, SSoT alias for health, single strip |
| `source_runtime_enforcement` | **100** | Pure matcher + PRIMARY items; unit matrix; Sidebar `aria-current` wire |
| `live_runtime_22000` | **55** | Activity + `?panel=` light Observe; **`/dashboard/health` does not** on deployed image (alias absent in container build) |
| **Composite (lane)** | **94** | Source complete after path-to-100; live lag is **ops redeploy**, not missing matcher code |

- **Verdict**: `ACCEPTED_SOURCE_100` + **LIVE_DEPLOY_BLOCKER** (redeploy `omniroute` test image on `:22000` with current workspace)
- **Lane**: stay `docs/tasks/03-review/` (code gate closed; operator redeploy for live green)

## Operator residual matrix (this review)

| Requirement | Source | Live `:22000` (auth HTML) |
|-------------|--------|---------------------------|
| `/dashboard/health` → sidebar Observe (`activity`) `aria-current` | **PASS** (`SIDEBAR_ACTIVE_HUB_ALIASES`) | **FAIL** — activity link muted, no `aria-current` |
| Activity + `?panel=combo-health\|route-trace` light Observe | **PASS** (pathname prefix) | **PASS** — `bg-primary/10` + `aria-current` on `/dashboard/activity` |
| Exactly one `ObserveHubSubnav` on activity / panels | **PASS** (1 mount) | **PASS** — `data-observe-hub-subnav` count 1; slots activity/combo-health/route-trace |
| Exactly one strip on health (no PageTabBar) | **PASS** after path-to-100 | SSR loading previously 0 subnav; code now mounts on loading/error/success |
| No dual PageTabBar + ObserveHubSubnav | **PASS** | **PASS** on observe routes (0 PageTabBar hints) |

## Path-to-100 applied this review

1. **Health chrome always present** — loading and error branches now mount `<ObserveHubSubnav active="health" />` so first paint / failure never drops Observe hub strip.
   - File: `src/app/(dashboard)/dashboard/health/page.tsx`
2. **Tests tightened** — health must have **3** exclusive branch mounts (loading/error/success); never zero.
   - `tests/unit/ui/observe-hub-sidebar.test.ts`
   - `tests/unit/ui/observe-settings-ia-gaps-0061.test.ts`

## Live deploy evidence (blocker)

Container `omniroute` (`b6c48cb39ffe`, image `omniroute:base`, started 2026-07-20T00:03Z):

```text
resolveSidebarHubAlias count in /app/.build: 0
SIDEBAR_ACTIVE_HUB_ALIASES count in /app/.build: 0
```

Contrast: workspace `src/shared/utils/sidebarRouteMatch.ts` defines both; unit matrix 11/11 green against live `PRIMARY_SIDEBAR_ITEMS`.

Prefix-only routes work on live (activity, combos/live); **alias** routes fail (health, fusions, compression) — pattern matches missing SSoT in image, not a logic bug in source.

**Do not touch `:21000` (production).** Redeploy **only** `:22000` test container from current tree to clear live blocker.

## Core 0080 contract (re-verified)

| Exit | Status |
|------|--------|
| Combo Health + Route Trace under Observe `?panel=` | **PASS** (source + live panels) |
| Analytics ops redirects only | **PASS** (`epic19-observe-ops-redirect-0080` green) |
| `id=` deep link | **PASS** |
| Health discoverability link | **PASS** |
| no-new-leaf | **PASS** (PRIMARY still 7) |
| 0081 disposition | **PASS** — storytelling stays on analytics |

## Findings

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| F1 | LIVE_DEPLOY | High (ops) | **Open** | `:22000` image lacks hub-alias SSoT → Health sidebar inactive |
| F2 | CHROME | Medium | **Closed this review** | Health loading/error omitted ObserveHubSubnav |

## Commands

```bash
node --import tsx/esm --test \
  tests/unit/sidebar-route-match.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/ui/observe-settings-ia-gaps-0061.test.ts \
  tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts
# → 66 pass, 0 fail

npm run typecheck:core
# → exit 0

# Live (auth cookie via /api/auth/login + INITIAL_PASSWORD):
# GET /dashboard/activity?panel=* → Observe aria-current PASS
# GET /dashboard/health → Observe aria-current FAIL (stale image)
```

## Sidebar-active matrix proof (source + PRIMARY)

| Path | Expected leaf href | Result |
|------|--------------------|--------|
| `/dashboard/health` | `/dashboard/activity` | PASS (source) |
| `/dashboard/activity` (+ panels via query strip) | `/dashboard/activity` | PASS |
| `/dashboard/fusions` (+ children) | `/dashboard/combos` | PASS (source; 0084) |
| `/dashboard/compression/*` | `/dashboard/combos` | PASS (source; 0084) |
| `/dashboard/combos/live` | `/dashboard/combos` | PASS source **and** live |
| Anti-phantom providers/home | not lit | PASS |

## Lane recommendation

- Keep **03-review** — implementation accepted; residual is **redeploy test stack**.
- After redeploy: re-hit `/dashboard/health` and expect sidebar Observe `aria-current="page"` + `bg-primary/10`.
