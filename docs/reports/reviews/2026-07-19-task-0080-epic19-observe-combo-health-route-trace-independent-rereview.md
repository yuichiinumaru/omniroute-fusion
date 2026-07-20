# Independent Re-Review: Task 0080 — Observe absorbs combo-health + route-trace — 2026-07-19

## Review Lineage

- **Current task**: Task 0080 (`omniroute-epic19-observe-absorb-combo-health-route-trace`); lane `docs/tasks/03-review/`
- **Reviewer**: independent FULL RE-REVIEWER (`reviewers` agentID) — **builders claims untrusted**
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0080-epic19-observe-combo-health-route-trace-frontend-quality-review.md` (builders 100; open nits F-NIT-1 dual icons, F-NIT-2 focus-ring)
  - 0078 independent re-review (panel= freeze)
  - Bundled blast radius 0079/0080/0081
- **Skills**: frontend-quality-harness · tsjs-harness · code-quality
- **Review mode**: independent adversarial re-review + **path-to-100 applied** for open nits

## Score And Verdict

- **Score**: `100/100` (was 96 pre path-to-100 nits → closed this session)
- **Verdict**: `ACCEPTED_100`
- **Lane**: **stay `03-review/`**

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Observe `?panel=` mounts + subnav + analytics ops redirects + `id=` chain |
| `runtime_enforcement` | 100 (source) / gap (deploy) | Source server redirect + hub wiring proven. Live `:22000` stale image lacks combo-health/route-trace subnav links and does not redirect analytics ops tabs |

## Live adversarial IA proof (sidebar/hubs)

Authenticated `:22000` only:

| Path | Live result | Source truth |
|------|-------------|--------------|
| `/dashboard/analytics?tab=combo-health` | **200** stays on analytics | `redirect(buildObserveComboHealthPath())` |
| `/dashboard/analytics?tab=route-trace&id=req-0080` | 200 no hop | `resolveEpic19RouteTraceDestination(id)` |
| `/dashboard/analytics/combo-health` | 200 | nested → Observe builder |
| `/dashboard/activity?panel=combo-health` | 200; subnav markers **missing** combo-health/route-trace links; `data-observe-hub-subnav="activity"` | Hub reads `panel`, mounts ComboHealthTab, subnav active = panel |
| `/dashboard/activity?panel=route-trace&id=req-0080` | 200; same stale subnav | RouteExplainabilityTab + initialRequestId |
| Health link | present on live Observe as deep link | retained |

**Deploy residual F-ENV-1:** same stale `omniroute:base` image as 0079 — not an 0080 source defect.

## Path-to-100 applied this review

| Prior nit | Fix |
|-----------|-----|
| F-NIT-1 dual `health_and_safety` icons | Combo Health icon → `monitor_heart` (aligns CommandPalette); Health keeps `health_and_safety` |
| F-NIT-2 missing `focus-ring` | Added `focus-ring` to ObserveHubSubnav `Link` className (parity with ProvidersPolicySubnav) |

File: `src/shared/components/ObserveHubSubnav.tsx`

## Diff Ownership (verified)

| Surface | Owner | Present |
|---------|--------|---------|
| `ObserveHubClient` panel mounts | 0080 | ✅ ComboHealthTab / RouteExplainabilityTab; panel prefers over source |
| `ObserveHubSubnav` ops links + health | 0080 | ✅ builders; health discoverability |
| `analytics/page.tsx` ops branch | 0080 | ✅ (story branch also 0081 — dual complete) |
| nested `analytics/combo-health` | 0080 | ✅ |
| RouteExplainabilityTab `panel=route-trace` id sync | 0080 | ✅ |
| Storytelling analytics → Dashboard | 0081 | verified residual complete |
| PRIMARY analytics drop | 0082 | source primary length 7 |

## Delta Summary

### Resolved Since Previous Review

- F-NIT-1, F-NIT-2 **closed** (path-to-100)
- Prior disposition “storytelling still on analytics for 0081” — **0081 has completed** storytelling redirects; ops branch remains 0080-owned and still present

### Persistent

- F-ENV-1 live 22000 stale deploy (ops)

### Regressions

- none; 72-test observe+epic19 bundle green after subnav patch

## Contract Compliance

| Exit | Status | Evidence |
|------|--------|----------|
| Combo Health + Route Trace under Observe | PASS | ObserveHubClient + subnav builders |
| Analytics ops redirects | PASS | analytics page + nested combo-health |
| `id=` e2e chain | PASS | builder → server resolve → hub initialRequestId → tab writes id on panel |
| Health discoverability | PASS | `/dashboard/health` + `data-observe-health-link` |
| no source enum pollution | PASS | panels ∉ OBSERVE_SOURCES; tests |
| no-new-leaf | PASS | no primary combo-health/route-trace/health |
| hideable analytics-combo-health | PASS | retained |
| Unit tests | PASS | `epic19-observe-ops-redirect-0080.test.ts` + observe-hub |

## Frontend quality

| Check | Result |
|-------|--------|
| Panel vs source | **Correct** — panel wins; source enum clean |
| URL-driven chrome | searchParams-derived; no setState for panel/source |
| Deep link id | freeze-at-first-paint + tab URL sync on panel host |
| Keyboard / focus | **path-to-100** `focus-ring` on hub links |
| Visual distinguishability | **path-to-100** distinct combo-health icon |
| Archive-not-delete | tab modules imported, not rewritten |

## TS/JS axiom compliance

| Axiom | Status |
|-------|--------|
| Type Purity | ✅ `isObserveOperationalPanel`; exhaustive ObserveSource switch |
| Boundary Integrity | ✅ opaque request id query only |
| Async Determinism | ✅ Suspense around panels |
| Immutability | ✅ pure normalizers |
| State Exclusivity | ✅ `ObserveHubActive` exhaustiveness on LINKS |

## Commands run (fresh)

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts
# → 72 pass after path-to-100

npx eslint src/shared/components/ObserveHubSubnav.tsx --max-warnings 0
# → exit 0
```

## Lane outcome

- **Stay `03-review/`** at **100/100**
- Path-to-100 micro-patch landed in-tree; no bounce to `02-doing`
