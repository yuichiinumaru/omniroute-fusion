# Review Report: Task 0086 — EPIC-20 T20-A SSoT Operations topbar + path builders + redirect matrix — 2026-07-20

## Review Lineage

- **Current task**: Task 0086 (`omniroute-epic20-ssot-operations-topbar-paths`); review-start path: `docs/tasks/02-doing/0086-omniroute-epic20-ssot-operations-topbar-paths.md`
- **Previous reports read**: none for 0086 (first independent review)
- **Pattern reference**: `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-frontend-quality-review.md` (EPIC-19 freeze twin)
- **Product law**: `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` §2 (I) + §5 (II)
- **Review mode**: independent formal review (frontend-quality + tsjs + code-quality gates); **no git**; **no :21000**
- **Reviewer**: gt-frontend-quality-reviewer (+ docs); parent agentID=`builders`

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept` → move to `03-review/` (parent score gate: 100→03-review)

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | 10 topbar ids + labels + builders + 30-row matrix + Traffic Observe freeze + UI.md planned section + 25 unit asserts |
| `runtime_enforcement` | N/A | Freeze contract explicitly defers Next.js `/operations/*` shell + product `redirect()` to **0087–0099**; no live chrome claim |

## Delta Summary

### Resolved Since Previous Review

- N/A (first review)

### Persistent Findings

- none material for freeze scope

### Regressions

- none

### New Findings

- none open (optional residual note only — see Improvements)

### Evidence Gaps / External Blockers

- none for 0086 scope
- Residual product work (not score blockers): Operations shell topbar (**0087**); Endpoint / CoreMCP / Agents fusions (**0088–0090**); later T20-F…T20-O; Traffic panel mount (**0098**); Testing absorb (**0099**)

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | No open findings in freeze scope | — |

### Improvements (non-blocking / optional for later slices)

| ID | Severity | Summary | Owner |
| --- | --- | --- | --- |
| I1 | Info | `/dashboard/cli-tools` is **not** a matrix `from` row; live `next.config` permanent-redirects → `/dashboard/cli-code` which **is** mapped → `/operations/agents`. Explicit residual row optional for bookmark clarity when 0090 lands redirects. | 0090 / next.config already covers |
| I2 | Info | `EPIC20_TRAFFIC_INSPECTOR_PATH` is a string constant **and** `buildObserveTrafficInspectorPath()` rebuilds via `buildObserveHubPath` with a cast. Unit test freezes equality — dual source is intentional freeze + builder reuse; keep test if `OBSERVE_HUB_PATH` ever moves. | 0098 if Observe host renames |

## Contract Compliance (exit conditions)

| Exit | Status | Evidence |
|------|--------|----------|
| Exactly **10** Operations topbar ids, Epic §2 order | **PASS** | `OPERATIONS_TOPBAR_IDS` = endpoints…media; labels match Epic §2 |
| `buildOperationsPath(id)` → `/operations/{id}` | **PASS** | All 10 peers; no query-as-path; no `/dashboard/` host |
| Hub root freeze **one** shape (no “or”) | **PASS** | `OPERATIONS_HUB_PATH` / `buildOperationsHubPath()` = `/operations`; `OPERATIONS_DEFAULT_TOPBAR_ID = "endpoints"` is shell selection only (not hub URL rewrite) |
| Redirect matrix Epic §5 + inventory aliases; every `to` from builders | **PASS** | 30 unique `from` rows; allowedTos = hub + 10 peers + Traffic Observe builder |
| Zero “or” destination shapes in constants | **PASS** | No `or` in matrix `to`/`note`; Traffic single string |
| Traffic Inspector **out of Ops topbar**, one frozen string | **PASS** | `EPIC20_TRAFFIC_INSPECTOR_PATH = /dashboard/activity?panel=traffic`; hub=`observe`; ownerTask=`0098`; not `source=traffic` |
| UI.md **only** `## EPIC-20 Operations hub reform (planned)` product section | **PASS** | New section + Related-docs index rows; reverse-chrome (0076), live primary §2.1 (0082), EPIC-19 sections untouched |
| Anti-leaf: 0 new primary leaves | **PASS** | `PRIMARY_SIDEBAR_ITEMS.length === 7`; single `operations` leaf; forbidden set excludes labs/testing/mcp/media peers from primary |
| Anti multi-topbar: segment-2 = one peer list of 10 | **PASS** | Forbidden endpoint tabs / protocol strip / memory tabs ∉ `OPERATIONS_TOPBAR_IDS`; docs “exactly one” |
| Unit test file + pass | **PASS** | `tests/unit/ui/epic20-operations-matrix-0086.test.ts` → **25/25** |
| Maps live Ops hub + Testing hub hrefs | **PASS** | All `OPERATIONS_HUB_HREFS` (16) + all `TESTING_HUB_GROUPS` hrefs in matrix |
| context-sources → integrations; catalog → endpoints; testing → labs | **PASS** | Dedicated asserts |
| No live `/operations/*` product routes claimed | **PASS** | No `src/app/operations`; JSDoc + UI.md “planned / destination freeze only” |
| `typecheck:core` | **PASS** | exit 0 |
| CHANGELOG Unreleased | **PASS** | EPIC-20 Operations topbar path freeze bullet |
| No PRIMARY_SIDEBAR / product shell mutation | **PASS** | Exclusive files: `epic20Operations.ts`, test, UI.md section, CHANGELOG |

## Frontend quality (IA freeze lens)

| Check | Result |
|-------|--------|
| Visual / motion chrome in this task | **N/A by design** — constants + planned docs only (0087 owns shell) |
| Navigation hierarchy clarity | **Strong** — sidebar Operations → single topbar of 10 peers → vertical collapsibles (documented; deferred mount) |
| Dual-nav / dual-host risk | **Mitigated** — builders forbid `/dashboard/operations/{id}` product shape; matrix `to` only `/operations` / `/operations/{id}` / Observe Traffic |
| Self-evident path law (HR #23) | **Frozen** — target `/{sidebar-leaf}/{topbar-item}` = `/operations/{id}` |
| Chrome law (HR #22) | **Frozen** — exactly one Ops topbar peer list; Endpoint dual strip + MCP/A2A protocol strip must not reappear as segment-2 peers |
| Traffic discoverability | **Sound** — Observe `?panel=traffic` coexists with log `?source=` without enum pollution (`isObserveSource("traffic") === false`) |
| Accessibility of future tab destinations | Path contracts stable for 0087+ shells; freeze does not introduce inaccessible chrome |
| Responsive / hydration / bundle | N/A pure constants; no client components in 0086 deliverable |
| Downstream import discipline | Module ready for 0087–0090; no ad-hoc product consumers yet (correct for freeze-first) |

## TS/JS axiom compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | No `any`; `OperationsTopbarId` union + `isOperationsTopbarId`; `Epic20RedirectEntry` typed |
| Boundary Integrity | ✅ | Pure constants/builders; Traffic uses `buildObserveHubPath` extras `panel` only |
| Async Determinism | N/A | Sync pure functions |
| Immutability | ✅ | `as const` ids; `readonly` matrix; readonly forbidden sets |
| State Exclusivity | ✅ | Ops peers vs Observe traffic; hub root vs default peer path; forbidden sub-topbar ids separate from peer list |

## Code quality (freeze module)

| Check | Result |
|-------|--------|
| Single SSoT module | ✅ `src/shared/constants/epic20Operations.ts` (459 lines); ops card inventory stays in `operationsHub.ts` until 0087 |
| JSDoc cites EPIC-20 | ✅ File header + hub/default/traffic freezes |
| Pattern after 0078 | ✅ builders + matrix + anti-leaf + unit tests first |
| Separation of concerns | ✅ Card launchpad (`operationsHub.ts`) untouched; topbar SSoT separate |

## Evidence Reviewed

- Task: `docs/tasks/02-doing/0086-omniroute-epic20-ssot-operations-topbar-paths.md`
- Source: `src/shared/constants/epic20Operations.ts`
- Related read: `operationsHub.ts`, `testingHub.ts`, `observeHub.ts` (`buildObserveHubPath`), `sidebarVisibility.ts` (`PRIMARY_SIDEBAR_*`, `CONNECT_CATALOG_SSOT_HREF`)
- Docs: `docs/guides/UI.md` § EPIC-20 Operations hub reform (planned); reverse-chrome + §2.1 + EPIC-19 sections intact
- Product law: `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` §2 + §5
- Tests: `tests/unit/ui/epic20-operations-matrix-0086.test.ts`
- CHANGELOG Unreleased bullet for Task 0086

### Commands run (fresh this review)

```bash
node --import tsx/esm --test tests/unit/ui/epic20-operations-matrix-0086.test.ts
# → 25 pass / 0 fail

npm run typecheck:core
# → exit 0

# Matrix coverage probe
# OPERATIONS_HUB_HREFS → all mapped
# TESTING_HUB_GROUPS hrefs → all mapped
# PRIMARY_SIDEBAR_ITEMS.length === 7; ids: home,providers,combos,activity,operations,settings-general,docs
# No src/app/operations product tree
```

### Matrix dump verified (canonical `to` set)

| `to` | Role |
|------|------|
| `/operations` | Hub root |
| `/operations/endpoints` … `/operations/media` | 10 peers |
| `/dashboard/activity?panel=traffic` | Traffic Inspector (Observe only) |

Hub default: **`/operations`** + shell highlight `endpoints` (not `/operations/endpoints` as hub URL).

## Recommendation

**ACCEPT at 100.** Move task file to `docs/tasks/03-review/`. Unblocks **0087–0090** (and later T20 product slices) to import builders only.

No path-to-100 edits required from this reviewer.
