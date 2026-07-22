# Review Report: Task 0098 — EPIC-20 T20-M Traffic Inspector → Observe Peer — Frontend Quality (2026-07-20)

## Review Lineage

- **Current task**: Task 0098 (`omniroute-epic20-traffic-inspector-observe`); live path at review start: `docs/tasks/02-doing/0098-omniroute-epic20-traffic-inspector-observe.md`
- **Previous reports**: none found for 0098 (first formal review)
- **Related context**:
  - EPIC-20 §0/§2: Traffic **out of** Operations topbar
  - 0086 freeze already defined `EPIC20_TRAFFIC_INSPECTOR_PATH`
  - Soft 0084 `sidebarRouteMatch` alias patterns
  - Soft 0080 Observe operational panels (`?panel=`)
  - Parallel Media **0097** / Labs **0096** (disjoint hubs)
- **Review mode**: `initial` (frontend-quality + tsjs + code-quality)
- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Skills**: `code-quality-harness` + `frontend-quality-harness` + `tsjs-harness`
- **Report date**: 2026-07-20
- **Constraints honored**: no git; no `:21000`

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100` / `PASS_PERFECT`
- **Lane recommendation**: move to `docs/tasks/03-review/` (S=100)

### Dual Score (UI chrome re-home + Observe IA)

| Dimension | Score | Notes |
|-----------|-------|-------|
| local_implementation | 100 | Frozen path, Observe peer, redirect, Ops card drop, unit matrix |
| runtime_enforcement | 100 | ObserveHubClient mounts inspector on `panel=traffic`; sidebar alias live; API guards unchanged |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | `ObserveOperationalPanel` includes `"traffic"`; exhaustive switch + compile-time LINKS coverage |
| Boundary Integrity | ✅ | No authz weaken; spawn/local-only prefixes retained |
| Async Determinism | ✅ | URL-driven panel select (no setState-in-effect for panel); stream hooks pre-existing |
| Immutability | ✅ | Path builders / frozen const path |
| State Exclusivity | ✅ | `panel=` vs `source=` separation; traffic is operational panel only |

## Frontend quality (task-owned)

| Dimension | Status | Notes |
|-----------|--------|-------|
| Visual hierarchy | ✅ | Single Observe subnav → Traffic Inspector content |
| Responsive layout | ✅ | Shared `HUB_SUBNAV_*` tokens; inspector layout pre-existing |
| Keyboard / focus | ✅ | Subnav `Link` + `focus-ring` + `aria-current` |
| Semantics / a11y | ✅ | `<nav aria-label="Observe sections">`; peer link discoverable |
| Motion discipline | ✅ | No decorative motion added |
| Performance | ✅ | Conditional mount of inspector client on panel only |
| Single-topbar law (HR #22) | ✅ | Exactly one `ObserveHubSubnav` on activity hub; no Ops topbar stack |
| Self-evident paths (HR #23) | ✅ | Frozen `/dashboard/activity?panel=traffic` (panel peer pattern consistent with combo-health / route-trace) |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Frozen path choice documented | 100 | `/dashboard/activity?panel=traffic` (choice B-style activity peer) |
| Observe topbar peer | 100 | `ObserveHubSubnav` id `traffic` via builder |
| Legacy redirect | 100 | tools/traffic-inspector page → builder |
| Ops card disposition | 100 | **removed here** (not deferred) |
| Sidebar Observe active | 100 | alias + primary prefix |
| Not Ops topbar peer | 100 | `isOperationsTopbarId("traffic")` false |
| No new primary leaf | 100 | forbidden list + primary length |
| No OBSERVE_SOURCES pollution | 100 | panel= only |
| API local-only / spawn | 100 | prefixes still present |
| Tests / typecheck / lint | 100 | 0098 suite green; related 89/89; typecheck 0; eslint 0 |
| Scope discipline | 100 | No MITM rewrite; no Ops Labs/Media touch |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Canonical Traffic path frozen + Observe peer | ✅ | `EPIC20_TRAFFIC_INSPECTOR_PATH` + subnav link |
| Legacy tools path redirects | ✅ | `redirect(buildObserveTrafficInspectorPath())` + matrix ownerTask 0098 |
| Sidebar Observe active | ✅ | `SIDEBAR_ACTIVE_HUB_ALIASES` pathPrefix tools/traffic-inspector → activity |
| Ops hub no Traffic card | ✅ | removed from `OPERATIONS_HUB_GROUPS` Integrations |
| Observe strip mount ≤ 1 | ✅ | single `<ObserveHubSubnav` in ObserveHubClient |
| Unit tests | ✅ | `epic20-traffic-observe-0098.test.ts` + related green |
| Guard tests / prefixes | ✅ | spawn + routeGuard still include `/api/tools/traffic-inspector/` |
| typecheck:core | ✅ | exit 0 |
| lint on touched | ✅ | eslint exit 0 this session (task exit box was blank; verified) |
| CHANGELOG + frozen path in Evidence | ✅ | Unreleased T20-M + Evidence filled |

### Chrome matrix (verified)

| Route family | ObserveHubSubnav | OperationsTopbar / PageTabBar |
|--------------|------------------|-------------------------------|
| `/dashboard/activity?panel=traffic` | 1 (hub client) | 0 |
| legacy `tools/traffic-inspector` | 0 (redirect shell) | 0 |
| Ops hub cards | n/a | Traffic card gone |

### Anti-hallucination guardrails

| Guard | Status |
| --- | --- |
| Do not put Traffic on Ops topbar | ✅ |
| Do not add second Observe strip | ✅ |
| Do not weaken traffic-inspector API guards | ✅ |
| Do not invent `source=traffic` | ✅ panel= only |
| Frozen path not TBD | ✅ documented in Evidence |
| PORT 21000 untouched | ✅ |

## Evidence Commands (this session)

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic20-traffic-observe-0098.test.ts \
  tests/unit/sidebar-route-match.test.ts \
  tests/unit/ui/operations-hub-discoverability-0059.test.ts \
  tests/unit/ui/epic20-operations-matrix-0086.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts
# → 89 pass / 0 fail

npm run typecheck:core
# → exit 0

npx eslint \
  "src/shared/constants/epic19Rebalance.ts" \
  "src/shared/constants/epic20Operations.ts" \
  "src/shared/components/ObserveHubSubnav.tsx" \
  "src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx" \
  "src/app/(dashboard)/dashboard/tools/traffic-inspector/page.tsx" \
  "src/shared/constants/operationsHub.ts" \
  "src/shared/utils/sidebarRouteMatch.ts" \
  "tests/unit/ui/epic20-traffic-observe-0098.test.ts" \
  "tests/unit/sidebar-route-match.test.ts"
# → exit 0
```

## Findings

### Blocking

- none

### Debt / Improvement (not scored — residuals)

| ID | Severity | Notes |
|----|----------|-------|
| R1 | INFO | Inspector UI co-located under `tools/traffic-inspector/` (client/hooks/components); only `page.tsx` redirects. Acceptable archive co-location; optional later move under `activity/` for path self-evidence of source tree. |
| R2 | INFO | Full `/observe/traffic` pilot path not chosen — frozen activity `?panel=` peer matches combo-health/route-trace pattern (0085 phase-0 inventory-friendly). Self-evident path rename remains phased EPIC inventory work. |
| R3 | INFO | Task file subtask/compliance checkboxes were left unchecked by executor despite Evidence; **hygiene fixed at review** — code contract already satisfied. |

### Regressions

- none in 0098-owned Observe Traffic contract

## Diff Ownership

| Surface | Owner |
|---------|-------|
| Observe peer `traffic` + ObserveHubClient case | **0098** |
| `epic19Rebalance` traffic panel + builders | **0098** (extends 0080) |
| `buildObserveTrafficInspectorPath` / freeze string | 0086 freeze; **0098** wires runtime |
| legacy tools redirect page | **0098** |
| Ops hub traffic card removal | **0098** (preferred here) |
| sidebar alias traffic-inspector → activity | **0098** (extends 0084) |
| Media / Labs | **0097** / **0096** |
| Testing bulk retire | **0099** |
| API routeGuard/spawn prefixes | read-only verify **0098** |

## Architecture Notes (durable)

1. **Traffic is Observe investigate/debug**, never Ops connectivity — matrix + Ops card removal encode that.
2. **`?panel=` operational panels** (combo-health, route-trace, traffic) stay out of `OBSERVE_SOURCES` log enum.
3. **Single Observe strip** remains the only hub chrome; inspector-internal toolbars are content chrome.
4. **API paths stay under `/api/tools/traffic-inspector/`** with local-only/spawn guards — UI re-home must not move API without security review.

## Verdict Detail

Task 0098 freezes Traffic under Observe at `/dashboard/activity?panel=traffic`, mounts it under one Observe strip, redirects legacy tools path, removes Ops discovery, lights sidebar Observe, and keeps API guards. Score **100**. Move to `03-review`.

## Path to 100

- Already 100 — no builder rework required for Traffic→Observe acceptance.
- Optional non-blocking: source-tree co-location move (R1); future self-evident `/observe/*` rename (R2).
