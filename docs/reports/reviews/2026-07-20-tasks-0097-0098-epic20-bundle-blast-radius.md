# Cross-Task Blast Radius — 0097 Media Ops + 0098 Traffic Observe (2026-07-20)

Bundled frontend-quality review of two **parallel-safe** EPIC-20 slices (different hubs). Scores remain independent (see per-task reports).

## Shared files

| Path | 0097 | 0098 | Conflict risk |
|------|------|------|---------------|
| `src/shared/constants/epic20Operations.ts` | media matrix row (0086 freeze; redirect consumes) | traffic freeze + matrix row + builder | Low — disjoint symbols |
| `src/shared/components/Header.tsx` | `/operations/media` title match | traffic description key (pre-existing/related) | Low if edits stay localized |
| `CHANGELOG.md` Unreleased | both append | both append | Serial merge hygiene only |
| Ops layout / topbar | host for Media | **must not** host Traffic | None if 0098 stays Observe-only ✅ |
| ObserveHubSubnav / activity hub | **must not** mount Media | host for Traffic | None if 0097 stays Ops-only ✅ |

## Shared interfaces

| Symbol | Owner after wave | Callers |
|--------|------------------|---------|
| `buildOperationsPath("media")` | 0086/0097 | Media routes, matrix, tests |
| `buildObserveTrafficInspectorPath` / `EPIC20_TRAFFIC_INSPECTOR_PATH` | 0086/0098 | Observe subnav, redirect, matrix, tests |
| `ObserveOperationalPanel` + `"traffic"` | 0098 extends 0080 | ObserveHubClient exhaustive switch |
| `SIDEBAR_ACTIVE_HUB_ALIASES` traffic row | 0098 extends 0084 | sidebar active matcher |

## Generated surfaces

- CHANGELOG Unreleased entries for both tasks (present).
- No OpenAPI / API surface change for either task.

## Regression risk if only one accepted

| Accept only… | Risk |
|--------------|------|
| 0097 alone | Media under Ops correct; Traffic still tools+Ops card until 0098 — known pre-0098 debt |
| 0098 alone | Traffic under Observe correct; Media still cache path until 0097 — known pre-0097 debt |
| Both | Intended EPIC-20 cross-cut: Media Ops peer + Traffic Observe peer |

## Serial residual

| Downstream | Dependency |
|------------|------------|
| **0099** Testing hub retire | Needs Media deep link readiness (0097) + Ops integrations cleanup awareness (0098 card already gone) |
| **0100** Ops chrome tests gate | Needs both Media + Traffic rows in matrix |
| CommandPalette media href | Still legacy — **0099** |

## Diff ownership map (canonical)

| File / symbol | Owning task |
|---------------|-------------|
| `operations/media/**` | 0097 |
| `dashboard/cache/media` redirect | 0097 |
| `ObserveHubSubnav` traffic peer | 0098 |
| `ObserveHubClient` `case "traffic"` | 0098 |
| `tools/traffic-inspector/page.tsx` redirect | 0098 |
| `operationsHub` traffic card removal | 0098 |
| `sidebarRouteMatch` traffic alias | 0098 |
| Labs fusion | 0096 (out of bundle) |

## Independence statement

Evidence for 0097 Media chrome was **not** used to promote 0098, and vice versa. Shared regression suite runs (0086 matrix, sidebar-route-match) are explicitly linked where they prove each task’s contract.
