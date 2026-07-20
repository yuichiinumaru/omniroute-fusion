# Independent Re-Review: Task 0084 — Sidebar Active Routing/Observe Deep Routes — 2026-07-20

## Review Lineage

- **Agent**: independent FULL RE-REVIEWER (`reviewers`; builders untrusted)
- **Task**: 0084 EPIC-19 T19-G — path → primary leaf SSoT
- **Shared residual**: 0080 health → Observe (same `sidebarRouteMatch.ts`)
- **Authority**: Operator live-proof list; inventory active-state path mismatch

## Score And Verdict

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | **100** | `SIDEBAR_ACTIVE_HUB_ALIASES` + `resolveSidebarHubAlias` + hub-first `getActiveSidebarHref` |
| `source_runtime_enforcement` | **100** | Unit matrix + live `PRIMARY_SIDEBAR_ITEMS` (7 leaves) node proof |
| `live_runtime_22000` | **55** | Prefix routes OK; **alias routes unlit** (image missing SSoT symbols) |
| **Composite (lane)** | **94** | Code complete; live gate = redeploy `:22000` only |

- **Verdict**: `ACCEPTED_SOURCE_100` + **LIVE_DEPLOY_BLOCKER**
- **Lane**: stay `docs/tasks/03-review/`

## SSoT proof

```ts
// src/shared/utils/sidebarRouteMatch.ts
SIDEBAR_ACTIVE_HUB_ALIASES:
  /dashboard/fusions      → combos  /dashboard/combos
  /dashboard/compression  → combos  /dashboard/combos
  /dashboard/context      → combos  /dashboard/combos
  /dashboard/health       → activity /dashboard/activity

getActiveSidebarHref: resolve alias first (if primary visible), else longest prefix match
Sidebar.tsx: activeHref === item.href → aria-current="page" + bg-primary/10 text-primary
```

No new primary leaves. `PRIMARY_SIDEBAR_ITEMS.length === 7`.

## Operator live-proof matrix

| Path | Expected sidebar | Source (PRIMARY) | Live `:22000` DOM |
|------|------------------|------------------|-------------------|
| `/dashboard/health` | Observe | **PASS** | **FAIL** (muted activity link) |
| `/dashboard/fusions` | Routing | **PASS** | **FAIL** (no combos aria-current) |
| `/dashboard/compression/studio` | Routing | **PASS** | **FAIL** |
| `/dashboard/compression/settings` | Routing | **PASS** (prefix) | not re-fetched; same alias family |
| `/dashboard/combos/live` | Routing | **PASS** | **PASS** |
| `/dashboard/activity?panel=*` | Observe | **PASS** | **PASS** |

Anti-phantom: providers/home not active on deep routes (unit + live where active exists).

## Why live fails while source passes

```text
docker exec omniroute:  resolveSidebarHubAlias → 0 hits in /app/.build
workspace:              aliases present; node --test 11/11
```

Regression pattern: routes that **only** need prefix match work; routes that **need** hub aliases do not. Confirms deploy lag, not wrong table design.

## Contract compliance

| Exit | Status |
|------|--------|
| Fusions/compression/context light Routing | **PASS** source |
| Combos + live light Routing | **PASS** source + live |
| Health lights Observe | **PASS** source / **FAIL** live image |
| Observe panels light Observe | **PASS** source + live |
| Unit matrix + anti-phantom | **PASS** 11/11 |
| No new leaves | **PASS** |
| typecheck:core | **PASS** |

## Findings

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| F1 | LIVE_DEPLOY | High (ops) | Open | Rebuild/redeploy test container so alias SSoT ships |
| F-NIT-1 | Test depth | Low | Open optional | No React render test for Sidebar `aria-current` (pure-fn matrix sufficient for task bar) |

## Commands

```bash
node --import tsx/esm --test tests/unit/sidebar-route-match.test.ts
# 11/11

node --import tsx/esm -e '... getActiveSidebarHref vs PRIMARY_SIDEBAR_ITEMS matrix ...'
# ALL PASS (health, fusions, compression, combos/live, anti-phantom)

# Live auth HTML: combos/live PASS; health/fusions/compression FAIL
```

## Path to 100 (live)

1. Rebuild app artifact from current workspace (includes `sidebarRouteMatch` aliases + health chrome fix from 0080 re-review).
2. Redeploy **only** Docker service bound to **`:22000`** (never `:21000`).
3. Re-auth GET matrix; expect Observe `aria-current` on `/dashboard/health` and Routing on fusions/compression.

## Lane

Stay **03-review**. No code defect remaining for 0084 SSoT. Operator live green = redeploy.
