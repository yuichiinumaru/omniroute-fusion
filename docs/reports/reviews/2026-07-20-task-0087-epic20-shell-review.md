# Review Report: Task 0087 — EPIC-20 T20-B Operations Shell Topbar — Frontend Quality (2026-07-20)

## Review Lineage

- **Current task**: Task 0087 (`omniroute-epic20-operations-shell-topbar`); live path at review start: `docs/tasks/02-doing/0087-omniroute-epic20-operations-shell-topbar.md`
- **Previous reports**: none found for 0087 (first formal review)
- **Related context**:
  - Task 0086 SSoT freeze: `src/shared/constants/epic20Operations.ts` + `tests/unit/ui/epic20-operations-matrix-0086.test.ts`
  - EPIC-19 single-topbar patterns: `DashboardTopbar`, `ProvidersTopBar`, settings layout
  - EPIC-20 parent: `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`
  - Parallel mid-flight peers under same tree (0088–0097) — reviewed only for anti-phantom vs shell host
- **Review mode**: `initial` (frontend-quality + tsjs + code-quality)
- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Skills**: `code-quality-harness` + `frontend-quality-harness` + `tsjs-harness`
- **Report date**: 2026-07-20
- **Constraints honored**: no git; no `:21000`

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100` / `PASS_PERFECT`
- **Lane recommendation**: move to `docs/tasks/03-review/` (S=100)

### Dual Score (UI shell / chrome host)

| Dimension | Score | Notes |
|-----------|-------|-------|
| local_implementation | 100 | Layout host, topbar, path builders, stubs, unit anti-phantom |
| runtime_enforcement | 100 | App Router tree under `(dashboard)/operations`, legacy redirect, sidebar href + active match live in product sources |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | Peers typed via `OperationsTopbarId`; `isOperationsTopbarId` gate before `notFound()`; labels `Readonly<Record<…>>` |
| Boundary Integrity | ✅ | Chrome-only; no auth/API/credential surfaces |
| Async Determinism | ✅ | Segment page `await params` only; no floating promises |
| Immutability | ✅ | Icons/labels/ids from frozen 0086 consts |
| State Exclusivity | ✅ | Active peer is single `OperationsTopbarId`; hub root maps to default `endpoints` without dual hosts |

## Frontend quality (task-owned)

| Dimension | Status | Notes |
|-----------|--------|-------|
| Visual hierarchy | ✅ | Shared `HUB_SUBNAV_*` tokens; primary active tint |
| Responsive layout | ✅ | `overflow-x-auto` + `shrink-0` for 10 peers |
| Keyboard / focus | ✅ | `focus-ring` on links; native `<Link>` navigation |
| Semantics / a11y | ✅ | `<nav aria-label="Operations navigation">`, `aria-current="page"`, decorative icons `aria-hidden` |
| Motion discipline | ✅ | No decorative motion on chrome |
| Performance | ✅ | Client island = topbar only; layout uses children slot so page bodies can stay server components |
| Single-topbar law (HR #22) | ✅ | Exactly one `OperationsTopbar` mount in layout; zero PageTabBar / CostsSubnav / DashboardTopbar / ObserveHubSubnav on shell |
| Self-evident paths (HR #23) | ✅ | Live `/operations` + `/operations/{id}` |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 100 | All Done-when + exit checklist items for 0087 shell met |
| Single topbar via layout | 100 | `layout.tsx` sole `<OperationsTopbar />`; pages export content only |
| 10 peers from 0086 | 100 | `OPERATIONS_TOPBAR_IDS` + labels; CoreMCP ≠ “MCP Server” |
| `/operations` routes | 100 | hub + `[segment]` + static peer pages under shell |
| `/dashboard/operations` redirect | 100 | `redirect(buildOperationsHubPath())` only |
| Sidebar active | 100 | href `/operations`; prefix match lights all 10 peers; legacy alias for `/dashboard/operations` |
| Anti-phantom ≤1 | 100 | unit suite + full-tree grep: sole mount site is layout |
| Tests / typecheck / lint | 100 | shell suite green; `typecheck:core` exit 0; eslint on touched shell files exit 0 |
| Scope discipline | 100 | No Endpoint/CoreMCP/Agents fusion ownership claimed; stubs note 0088–0090 |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| `/operations` route tree + layout with **single** Operations topbar | ✅ | `src/app/(dashboard)/operations/layout.tsx` mounts once; `data-operations-shell` |
| All 10 peer routes resolve (placeholders OK) | ✅ | `[segment]/page.tsx` + static peers under same layout; `notFound()` for unknown segments |
| Exactly one topbar (`data-operations-topbar` / test id) | ✅ | `data-operations-topbar={active}` + `data-testid="operations-topbar"` |
| Active peers + `buildOperationsPath` only | ✅ | `OperationsTopbar.tsx` maps `OPERATIONS_TOPBAR_IDS` → `buildOperationsPath(id)` |
| `/dashboard/operations` → hub builder | ✅ | `dashboard/operations/page.tsx` → `buildOperationsHubPath()` |
| One primary Operations leaf; active for `/operations/*` | ✅ | `PRIMARY_SIDEBAR_ITEMS` length 7; `getActiveSidebarHref` matrix for hub + 10 peers |
| Anti-phantom unit test | ✅ | `tests/unit/ui/epic20-operations-shell-0087.test.ts` — 14/14 pass |
| Cards only as content under default peer | ✅ | `OperationsHubClient` has hub test id; no topbar markers |
| `npm run typecheck:core` | ✅ | exit 0 this session |
| Lint on touched shell files | ✅ | eslint exit 0 on ops shell + sidebarRouteMatch + 0087 test |
| Chrome matrix in evidence | ✅ | layout=1; page bodies=0 |

### Chrome matrix (verified)

| Route family | OperationsTopbar mount | Forbidden hub chrome |
|--------------|------------------------|----------------------|
| `/operations` (layout host) | 1 | 0 PageTabBar / CostsSubnav / DashboardTopbar |
| `/operations/{id}` (dynamic or static peer) | 1 (layout only) | 0 |
| Hub cards / placeholders / peer bodies | 0 | cards are content only |
| Full `operations/**` tree grep | only `layout.tsx` renders `<OperationsTopbar` | no forbidden imports as hub chrome |

### Anti-hallucination guardrails

| Guard | Status |
| --- | --- |
| Do not invent peers beyond 0086’s 10 | ✅ |
| Do not mount DashboardTopbar / CostsSubnav / Endpoint strip as Ops hub chrome | ✅ |
| Do not add primary leaves | ✅ `PRIMARY_SIDEBAR_ITEMS.length === 7` |
| Do not claim Endpoint fusion complete | ✅ stubs / parallel peers owned by later tasks |
| Do not reintroduce reverse-chrome on all legacy destinations | ✅ 0076 D1 still documented; shell is self-chrome only |
| Anti-phantom mount ≤ 1 with evidence | ✅ |

## Evidence Commands (this session)

```bash
node --import tsx/esm --test tests/unit/ui/epic20-operations-shell-0087.test.ts
# → 14/14 pass

node --import tsx/esm --test tests/unit/ui/epic20-operations-matrix-0086.test.ts
# → green (0086 contract still holds)

npm run typecheck:core
# → exit 0

npx eslint "src/app/(dashboard)/operations/layout.tsx" \
  "src/app/(dashboard)/operations/OperationsTopbar.tsx" \
  "src/app/(dashboard)/operations/page.tsx" \
  "src/app/(dashboard)/operations/[segment]/page.tsx" \
  "src/app/(dashboard)/operations/OperationsHubClient.tsx" \
  "src/app/(dashboard)/operations/OperationsSegmentPlaceholder.tsx" \
  "src/app/(dashboard)/dashboard/operations/**/*.{ts,tsx}" \
  "src/shared/utils/sidebarRouteMatch.ts" \
  "tests/unit/ui/epic20-operations-shell-0087.test.ts"
# → exit 0

# Full-tree anti-phantom
rg -n "<OperationsTopbar\\b|PageTabBar|CostsSubnav|DashboardTopbar|ObserveHubSubnav" \
  "src/app/(dashboard)/operations" --glob '*.tsx'
# → sole <OperationsTopbar mount = layout.tsx
```

Live active-state spot-check (Node import):

- leafCount=7, opsHref=`/operations`
- every `/operations/{id}` for 10 peers → active `/operations`

## Findings

### Blocking

- none

### Debt / Improvement (not scored — residuals)

| ID | Severity | Notes |
|----|----------|-------|
| R1 | INFO | Anti-phantom unit suite greps shell files only; full-tree rg (done in review) is stronger — optional follow-up to extend 0087 tests to `operations/**/*.tsx` as peers land |
| R2 | INFO | Topbar labels are English SSoT from 0086 (not next-intl). Intentional freeze; i18n can follow product localization of Ops chrome |
| R3 | INFO | Hub root `/operations` and `/operations/endpoints` both show card content until 0088 fusion — frozen by 0086 hub-vs-default-peer split |
| R4 | EXTERNAL | Parallel EPIC-20 tasks (0088/0089/0093/…) currently mutate `operationsHub` hrefs and legacy redirects; older suites `operations-hub-discoverability-0059` and parts of `ops-testing-reverse-chrome-0076` fail **outside 0087 ownership**. Owners of those slices must update inventory tests when re-homing hrefs. **0087 shell suite remains green.** |

### Regressions

- none in 0087-owned chrome contract

## Architecture Notes (durable)

1. **Layout owns chrome** — preferred pattern so 0088–0090 cannot double-mount topbar.
2. **Path builders only** — no ad-hoc `/operations/...` strings in topbar links.
3. **Dynamic `[segment]` + static peer folders** — static routes take precedence for fused peers; layout still wraps them → mount count stays 1.
4. **Sidebar**: `/operations/*` lights via primary href prefix match; legacy `/dashboard/operations` needs alias until fully retired.

## Verdict Detail

Task 0087 fully delivers the Operations shell contract: single layout-hosted topbar, ten 0086 peers, canonical `/operations/*` routes, legacy hub redirect via builder, single sidebar leaf with correct active state, and anti-phantom proof. Score **100**. Move to `03-review`.

## Path to 100

- Already 100 — no builder rework required for shell acceptance.
- Optional non-blocking: expand anti-phantom test glob to all `operations/**` peer pages as fusions merge (R1).
