# Review Report: Task 0082 — EPIC-19 sidebar drop Analytics + Costs leaves — 2026-07-19

## Review Lineage

- **Current task**: Task 0082 (`omniroute-epic19-sidebar-drop-analytics-costs-leaves`); start path: `docs/tasks/02-doing/0082-…`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-frontend-quality-review.md` (91 / PATH_TO_100; F1 Topbar↔tab desync)
  - `docs/reports/reviews/2026-07-19-epic19-0079-0080-0081-bundled-blast-radius.md`
  - `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-frontend-quality-review.md`
- **Related**: hard-depends **0078–0081**; soft-blocks **0083**
- **Review mode**: first independent formal review (frontend-quality + tsjs + code-quality)
- **Parent note**: score live FS honestly; if leaf drop correct and discoverability via builders/palette holds, can accept despite 0081 residuals

## Score And Verdict

### Initial score (pre path-to-100)

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 96 | 7-leaf cutover, hideable archive, palette builders, provenance, SSoT tests green |
| `runtime_enforcement` / docs honesty | 93 | Live §2 + NAV-TREE §2 correct; planned banners still claimed 9-leaf live until 0082 |

**Initial overall**: **95/100** → `PATH_TO_100` (doc honesty residual in planned-status banners).

### After path-to-100 (this review)

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Strengthened admin-preset assert; cutover suite 12/12 |
| `docs honesty` | 100 | Planned status banners flipped to “live as of 0082”; CHANGELOG Unreleased |
| `discoverability gate` | Accept | Palette + builders + redirect matrix hold; 0081 F1 remains **0081-owned residual** (does not block leaf drop) |

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: move to `03-review/` (parent gate: 100→03-review)

## Diff Ownership

| Surface | Owner |
|---------|--------|
| `PRIMARY_SIDEBAR_ITEMS` membership + presets | **0082** |
| Hideable analytics/costs family retention | **0082** |
| CommandPalette `epic19HubExtras` deep links | **0082** |
| Live `UI.md` §2 + NAV-TREE §2 | **0082** |
| `.archive/sidebar/2026-07-19-epic19-analytics-costs-cutover/` | **0082** |
| `tests/unit/ui/epic19-sidebar-cutover-0082.test.ts` + residual length-9 rewrites | **0082** |
| Dashboard story hub / Topbar URL sync (F1/F2) | **0081** residual |
| Providers / Observe content homes | **0079 / 0080** |
| Matrix freeze shapes | **0078** |

## Delta Summary

### Resolved in path-to-100 (this review)

- **D1**: `docs/guides/UI.md` EPIC-19 status no longer claims live §2.1 is 9 leaves / “not yet” leaf drop
- **D2**: `docs/architecture/NAV-TREE-TARGET.md` EPIC-19 target status no longer claims §2 still documents 9-leaf chrome
- **D3**: Root `CHANGELOG.md` Unreleased documents 0082 cutover
- **D4**: Admin preset unit assert now requires `costs`/`analytics` in `hiddenItems` (not a tautology)

### Persistent findings (out of 0082 score)

| ID | Owner | Severity | Summary |
|----|-------|----------|---------|
| 0081-F1 | 0081 | Serious UX | `DashboardStoryHubClient` still init-only `useState` for tab; Topbar client nav can desync content (Observe hub derives from `searchParams` correctly) |
| 0081-F2 | 0081 | Improvement | Topbar dual “Dashboard” + “Analytics” both `storyTab: "overview"` → dual `aria-current` |
| 0081-F3 | 0081 / product | Debt | CostsSubnav orphaned; Providers policy discovery via palette extras (0082) mitigates |

**Gate decision**: leaf drop is correct; discoverability via `buildDashboardStoryPath` / Providers builders / Observe builders + CommandPalette holds → **accept 0082** without waiting for 0081 F1 close.

### Regressions

- none in 0082 scope (0056 suite green post-0081 rewrites; cutover suite green)

## Findings (0082-owned)

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | DOCS | Medium | **Closed** (path-to-100) | Planned banners contradicted live §2 after cutover | UI.md L188–208; NAV-TREE L322–328 → flipped |
| F2 | TEST | Low | **Closed** (path-to-100) | Admin preset assert always true via OR | `epic19-sidebar-cutover-0082.test.ts` |
| F3 | UX residual | N/A score | Open (0081) | Story hub URL desync | not 0082 exclusive ownership |

## Contract Compliance (exit conditions)

| Exit | Status | Evidence |
|------|--------|----------|
| `PRIMARY_SIDEBAR_ITEMS` no analytics/costs peers | **PASS** | Live dump: 7 ids; `home…docs` |
| Length 7 exact id set | **PASS** | Matches `EPIC19_TARGET_PRIMARY_SIDEBAR_IDS` |
| Command palette no dual primary hub paths | **PASS** | No `href: "/dashboard/analytics\|costs"`; uses builders |
| Hideable analytics/costs family retained | **PASS** | `HIDEABLE_SIDEBAR_ITEM_IDS` + admin hiddenItems |
| Provenance under `.archive/sidebar/` | **PASS** | `2026-07-19-epic19-analytics-costs-cutover/{PROVENANCE,SNAPSHOT}.md` + index row |
| Unit tests length/ids + residual rewrites | **PASS** | 0082 suite **12/12**; broader targeted **190/190** earlier this review |
| Redirect matrix still green | **PASS** | 0078–0081 suites green in same run |
| 0 playground/translator/search-tools/testing primary | **PASS** | `EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS` asserts |
| Live UI.md §2 + NAV-TREE §2 match code | **PASS** | §2 tables + post path-to-100 status honesty |
| Archive-not-delete routes | **PASS** | redirect shells remain |
| typecheck/lint (executor evidence) | **PASS** | Completion Evidence; no production regression introduced by path-to-100 docs/test only |

## Frontend quality (sidebar cutover lens)

| Check | Result |
|-------|--------|
| Visual hierarchy / dual mental model | **Met** — Analytics/Costs no longer peer leaves next to Dashboard/Providers/Observe |
| Discoverability after drop | **Met via palette + builders**; partial via Topbar if 0081 F1 open |
| a11y sidebar | **Met** — fewer leaves; no new accordion; icons neutral `currentColor` |
| Archive-not-delete | **Met** — hideable ids + redirects + provenance |
| No budget fill with labs | **Met** — Testing/labs remain non-primary |
| Motion / perf | N/A — constants + palette extras only |
| i18n chrome keys | **Met** — en palette/subtitle keys present; primary `i18nKey`s resolve |

## TS/JS axiom compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | Hideable id union retained; PRIMARY items typed `SidebarItemDefinition` |
| Boundary Integrity | ✅ | Palette uses epic19 builders, not ad-hoc hub paths |
| Async Determinism | ✅ (0082) | No new client state machines in cutover |
| Immutability | ✅ | PRIMARY/presets const tables |
| State Exclusivity | ✅ (sidebar) | Single primary set SSoT |

## Evidence Reviewed

- `src/shared/constants/sidebarVisibility.ts` (PRIMARY + hideable + presets + comments)
- `src/shared/components/CommandPalette.tsx` (`epic19HubExtras`)
- `src/shared/constants/epic19Rebalance.ts` (target ids + matrix)
- `.archive/sidebar/2026-07-19-epic19-analytics-costs-cutover/*`, `.archive/PROVENANCE-INDEX.md`
- `docs/guides/UI.md` §2 + EPIC-19 section; `docs/architecture/NAV-TREE-TARGET.md` §2 + EPIC-19
- Tests: `epic19-sidebar-cutover-0082` + residual sidebar suites + 0078–0081 matrix suites
- 0081 story hub / Topbar residual (discoverability gate only)

## Commands Run

```bash
# Live PRIMARY dump
node --import tsx/esm -e "import { PRIMARY_SIDEBAR_ITEMS } from './src/shared/constants/sidebarVisibility.ts'; …"
# → home…docs len 7

# Targeted unit suite (190 pass / 0 fail) including 0082 + 0078–0081 + residual sidebar
node --import tsx/esm --test tests/unit/ui/epic19-sidebar-cutover-0082.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
  tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts \
  tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts \
  tests/unit/sidebar-visibility.test.ts \
  tests/unit/ui/sidebar-flat-primary-nav.test.ts \
  … # full list in Completion Evidence

# Post path-to-100
node --import tsx/esm --test tests/unit/ui/epic19-sidebar-cutover-0082.test.ts  # 12/12
node --import tsx/esm --test tests/unit/ui/dashboard-ia-consolidation-0056.test.ts  # 6/6
```

## Path-to-100 Actions (this reviewer)

1. Flipped UI.md + NAV-TREE planned-status banners to **live as of 0082** (doc accuracy vs §2)
2. CHANGELOG Unreleased bullet for 0082 cutover
3. Strengthened admin-preset hide assert in `epic19-sidebar-cutover-0082.test.ts`
4. Re-ran cutover suite → green

## Residual handoff (not blocking 0082)

- **0081** should close F1 by deriving story tab from `useSearchParams()` (ObserveHub pattern) and F2 dual-overview Topbar labels
- **0083** verify-only Tools→Ops can assume 7-leaf chrome is live

## Final recommendation

**ACCEPT 100** — promote task file to `docs/tasks/03-review/` with Review Trail filled.
