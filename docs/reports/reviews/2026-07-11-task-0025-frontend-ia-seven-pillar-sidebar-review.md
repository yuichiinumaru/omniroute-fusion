# Review Report: Task 0025 — Frontend IA Seven-Pillar Sidebar Rebuild — 2026-07-11

## Review Lineage

- **Current task**: Task 0025 (`frontend-ia-seven-pillar-sidebar`); live path at review start: `docs/tasks/03-review/0025-frontend-ia-seven-pillar-sidebar.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (score 94, HELD_IN_REVIEW_PATH_TO_100)
- **Related context**:
  - Flat-primary supersession archive: `.archive/sidebar/2026-07-10-flat-primary-nav/SNAPSHOT.md`
  - Pre-S6 archive: `.archive/sidebar/2026-07-10-seven-pillars/`
- **Review mode**: `re-review` (independent FS + tests after prior hold)
- **Reviewer profile**: `reviewers` (consolidated general-purpose)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `81/100`
- **Verdict**: `REJECT`
- **Lane recommendation**: move to `docs/tasks/02-doing/` (do **not** complete; do **not** leave in `03-review/`)

## Delta Summary

### Resolved Since Previous Review
- none of the prior path-to-100 items were closed by new evidence
- IA chrome evolved further (flat primary ≤10) but **without** reconciling related tests, fusion discoverability, or role-preset semantics

### Persistent Findings
- Epic metrics table still stale relative to live counts (now worse: claims minimal=12 / 7 accordion pillars in `SIDEBAR_SECTIONS`)

### Regressions
- **REGRESSION**: related unit suites that previously green under accordion pillars now fail against flat chrome
- **REGRESSION vs prior review inventory**: default tree no longer includes `fusions` under a `routing` section; fusion is absent from live `SIDEBAR_SECTIONS`

### New Findings
- Dead unexported pillar inventories still defined after flat-primary cutover
- `admin` / `developer` role presets are largely hollow over the flat tree
- Completion evidence and file header comment still describe accordion S6, not live chrome

### Evidence Gaps / External Blockers
- `EVIDENCE_GAP`: no browser/Playwright preset smoke
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | REGRESSION | High | Open | Related sidebar unit suites fail (7 failures) | this report | `sidebar-customization.test.ts`, `sidebar-back-compat.test.ts` — see Commands |
| F2 | REGRESSION | High | Open | Fusion not in live sidebar tree / not discoverable under Routing hub | this report | `fusionsInDefaultTree: []`; only dead `ROUTING_ITEMS` + combos subtitle; no CommandPalette hit |
| F3 | NEW | Medium | Open | Role presets hollow: admin/developer ≈ all for primary chrome | this report | live inventory: all/admin/developer visible primary = 10; admin unhides off-tree ids |
| F4 | NEW | Medium | Open | Dead pillar item arrays (~CORE_PULSE…HELP) unused by `SIDEBAR_SECTIONS` | this report | private consts never referenced outside file; `ROUTING_ITEMS` not exported |
| F5 | PERSISTENT | Low | Open | Epic metrics + task completion evidence drift | 2026-07-10 / this report | Epic claims minimal **12** and 7 pillars in `SIDEBAR_SECTIONS`; live minimal **7**, sections `main`+`devtools` |
| F6 | NEW | Low | Open | Stale guardrail header claims `SIDEBAR_SECTIONS` is 7 pillars | this report | `sidebarVisibility.ts:15-16` vs live `SIDEBAR_SECTIONS` ids |

## Findings (detailed)

### [HIGH] F1 — Targeted/related unit tests fail

**Evidence:** Reviewer-run batch (116 tests): **109 pass / 7 fail**.

Failures:

1. `tests/unit/sidebar-back-compat.test.ts` — `admin preset shows costs, costs-pricing, costs-budget, costs-quota-share`
   Admin shown-set is only `PRIMARY_SIDEBAR_ITEM_IDS` + `settings-security` + `settings-feature-flags` (`sidebarVisibility.ts:1030-1034`). Sub-cost leaves remain hidden.
2. `tests/unit/sidebar-customization.test.ts` — `applySectionOrder` cases that assume ≥3 product sections; with only `main`+`devtools`, `.slice(0,3)` leaves `ids[2]` undefined.
3. Same file — `applyItemOrder` looks up `SIDEBAR_SECTIONS` ids `"registry"` / `"help"` which **do not exist** (flat chrome).
4. Same file — `settings-sidebar item is present in system section` expects `section.id === "system"`.

**Impact:** Task exit “Targeted unit tests MUST pass with 0 failures” is not met for the sidebar suite cluster listed in Completion Evidence. Prior 94 score assumed green related suites under accordion pillars.

**Fix:** Rewrite customization/back-compat tests for `main`/`devtools` + primary hubs; either restore admin cost-leaf visibility if still product-required, or update the back-compat contract to hub-only costs (`costs` primary leaf).

### [HIGH] F2 — Fusion placement / discoverability

**Task MUST:** place `fusions` under Routing & Strategy (not a free-floating peer forever).

**Live proof:**

- Default leaves: only `PRIMARY_SIDEBAR_ITEMS` (`sidebarVisibility.ts:889-971`) — no `fusions` id.
- Inventory script: `fusionsInDefaultTree: []`.
- `fusions` appears only inside unexported/dead `ROUTING_ITEMS` (`sidebarVisibility.ts:460-467`) and `HIDEABLE_SIDEBAR_ITEM_IDS`.
- Primary routing hub is `combos` with subtitle “Combos · fusions · compression” (`:911`) — **label only**, not a link.
- `rg fusions` under `dashboard/combos` finds strategy/tuning fields, not a nav link to `/dashboard/fusions`.
- `CommandPalette.tsx`: no fusions entry.
- Flat-primary archive explicitly defers in-page hub subnavs: `.archive/sidebar/2026-07-10-flat-primary-nav/SNAPSHOT.md`.

**Impact:** Fusion is no longer a peer of Providers (good vs pre-S6 dump) but is effectively **orphaned** from chrome. That violates the spirit of “under Routing” until Routing hub subnav or an explicit leaf/group exists. Prior review’s `fusionParent === "routing"` is **not reproducible**.

**Fix (pick one, then test-enforce):**

1. Add in-page subnav/tabs on `/dashboard/combos` linking Fusions (+ compression hub), **or**
2. Reintroduce a non-default or default leaf under a routing group if flat policy allows, **or**
3. Command palette + docs deep-link path with a regression test that routing hub surfaces fusions.

### [MEDIUM] F3 — Role presets not real role views over flat tree

**Evidence (`countPresetVisibleLeaves` + shown-set analysis):**

| Preset | Visible non-debug leaves | Notes |
| --- | --- | --- |
| all | 10 | all primary |
| minimal | 7 | real short view |
| developer | 10 | same primary as all; debug tools only if `debugMode` |
| admin | 10 | same primary; “shows” `settings-security` / `settings-feature-flags` **not in `SIDEBAR_SECTIONS`** |

`countPresetVisibleLeaves` only counts non-debug section leaves (`sidebarVisibility.ts:1104-1112`), so developer debug ids never affect the metric. Admin off-tree unhides are no-ops in `Sidebar.tsx` (renders only `SIDEBAR_SECTIONS`).

**Impact:** Task exit “presets rebuilt as role views” is only solid for `minimal` vs `all`. Admin/developer are marketing labels more than differentiated nav.

**Fix:** Redefine developer/admin over `PRIMARY_SIDEBAR_ITEMS` (+ optional debug section behavior), or expand primary/debug children so unhidden ids can actually render; assert distinct visible sets in tests.

### [MEDIUM] F4 — Dead seven-pillar inventories after flat cutover

**Evidence:** `CORE_PULSE_ITEMS`, `REGISTRY_ITEMS`, `ROUTING_ITEMS`, `GOVERNANCE_ITEMS`, `OPERATIONS_ITEMS`, `OBSERVABILITY_ITEMS`, `SYSTEM_ITEMS`, `HELP_ITEMS` are defined (`sidebarVisibility.ts:302-879`) but only `PRIMARY_SIDEBAR_ITEMS` + `DEVTOOLS_ITEMS` feed `SIDEBAR_SECTIONS` (`:976-992`). Grep shows no external consumers of the private arrays. `COMPRESSION_CONTEXT_GROUP` is exported and unit-tested but also not mounted in chrome.

**Impact:** Maintainers (and future agents) can believe fusion/engines/hubs are live IA when they are inventory leftovers. Inflates file (~1100 LOC) and false confidence in completion evidence.

**Fix:** Delete dead arrays **or** move them to an explicitly named `sidebarHubInventory.ts` / archive snapshot with a comment “not rendered”; keep only hideable ids + primary chrome in the live module.

### [LOW] F5 — Evidence / epic drift

- Task Completion Evidence still lists accordion pillars, minimal **12**, and 7 product sections.
- Epic `0005` success metrics: minimal **met (12)**; prose still says “7 operational pillars in `SIDEBAR_SECTIONS`”; child path claims `04-completed/0025-…` while task was in `03-review/`.
- Live: `countPresetVisibleLeaves("minimal") === 7`, `SIDEBAR_SECTIONS = [main, devtools]`, `OPERATIONAL_PILLAR_SECTION_IDS.length === 7` (conceptual only).

**Fix:** Refresh task evidence + epic metrics to live numbers when re-promoting.

### [LOW] F6 — Stale header

`sidebarVisibility.ts:15-16` still says “S6 … SIDEBAR_SECTIONS is the 7 operational pillars” while `:240-241` and `:975` correctly document conceptual pillars + flat chrome.

**Fix:** One-line header rewrite pointing at `PRIMARY_SIDEBAR_ITEMS` + `OPERATIONAL_PILLAR_SECTION_IDS`.

## Contract Compliance (Task MUST / Exit)

| Requirement | Status | Live proof |
| --- | --- | --- |
| Exactly **7** operational pillars (export) | ⚠️ Partial | `OPERATIONAL_PILLAR_SECTION_IDS.length === 7` conceptual; **`SIDEBAR_SECTIONS` is not 7 pillars** (`main`+`devtools`) |
| Product top-level sections ≤ 8 | ✅ | 1 non-debug section |
| `fusions` under Routing | ❌ | Not in live tree; orphaned deep link |
| Compression engines = 0 default leaves | ✅ | engines absent from default leaves |
| Observe multi-table leaves collapsed | ✅ | only `activity` hub in primary; stream multi-leaves absent |
| `minimal` ≤ 12 (test-enforced) | ✅ | live **7**; flat-primary + seven-pillars tests assert ≤10 |
| Hideable IDs retained | ✅ | engines, observe stream, dual-nav, fusions remain hideable |
| Archive + provenance | ✅ | `.archive/sidebar/2026-07-10-seven-pillars/` (+ flat-primary archive) |
| Role presets all\|minimal\|developer\|admin | ⚠️ Partial | four ids exist; admin/developer not differentiated in chrome |
| Targeted unit tests 0 fail | ❌ | **7 fails** in related suites |
| CHANGELOG entry | ✅ | Unreleased S6 entry present (describes accordion era) |
| Epic metrics on close | ❌ / stale | checkbox open; epic numbers stale vs live |

## Production Wiring Proof

```
PRIMARY_SIDEBAR_ITEMS (10 hubs)
  → SIDEBAR_SECTIONS[main].children
  → Sidebar.tsx renders SIDEBAR_SECTIONS (flat; no accordion titles)
  → SidebarTab.tsx applies SIDEBAR_PRESETS → hiddenSidebarItems
OPERATIONAL_PILLAR_SECTION_IDS — docs/IA mapping only (not chrome)
Dead ROUTING_ITEMS/fusions — not rendered
```

## Live Inventory Snapshot (reviewer-executed 2026-07-11)

```json
{
  "pillarsConceptual": 7,
  "sectionIds": ["main", "devtools"],
  "productSectionCount": 1,
  "primaryCount": 10,
  "primaryIds": [
    "home", "providers", "combos", "api-manager", "activity",
    "analytics", "costs", "cli-code", "settings-general", "docs"
  ],
  "defaultLeafCount": 10,
  "enginesInTree": [],
  "observeStreamInTree": [],
  "dualNavInTree": [],
  "fusionsInDefaultTree": [],
  "presets": { "all": 10, "minimal": 7, "developer": 10, "admin": 10 },
  "minimalIds": [
    "home", "providers", "combos", "api-manager",
    "activity", "settings-general", "docs"
  ]
}
```

## Evidence Reviewed

- Task: `docs/tasks/03-review/0025-frontend-ia-seven-pillar-sidebar.md`
- Prior report: `docs/reports/reviews/2026-07-10-task-0025-…`
- Source: `sidebarVisibility.ts`, `sidebarGroupVisibility.ts`, `Sidebar.tsx`, `SidebarTab.tsx`
- Tests: seven-pillars, flat-primary, engine, observe, connect, naming, visibility, customization, back-compat, monitoring-reorg
- Archives: seven-pillars + flat-primary-nav
- Epic 0005 success metrics + child table
- CHANGELOG Unreleased S6 blurb

## Commands Run

```bash
node --import tsx/esm -e '/* live inventory pillars/presets/engines/fusions */'
# → inventory JSON above

node --import tsx/esm --test \
  tests/unit/ui/sidebar-seven-pillars.test.ts \
  tests/unit/ui/sidebar-flat-primary-nav.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/sidebar-naming-i18n.test.ts \
  tests/unit/sidebar-visibility.test.ts \
  tests/unit/sidebar-customization.test.ts \
  tests/unit/sidebar-monitoring-reorg.test.ts \
  tests/unit/sidebar-back-compat.test.ts
# → 116 tests, 109 pass, 7 fail

node --import tsx/esm --test \
  tests/unit/ui/sidebar-seven-pillars.test.ts \
  tests/unit/ui/sidebar-flat-primary-nav.test.ts
# → 10 pass / 0 fail (narrow new suites only)
```

## Commands Not Run And Why

- Full `npm run test:unit` / e2e / typecheck:core: failures already blocking acceptance; full suite not required to reject.
- Browser preset smoke: still evidence gap (unchanged).

## Path To 100 (builder checklist)

1. **Fix failing suites** (`sidebar-customization`, `sidebar-back-compat`) for flat `main`/`devtools` + hub model — re-run batch to 0 fail.
2. **Restore Fusion discoverability under Routing** (in-page subnav on combos and/or palette + test that routing hub surfaces `/dashboard/fusions`).
3. **Make admin/developer real role views** over items that actually render; assert distinct visible primary sets.
4. **Remove or archive dead pillar arrays**; keep hideable ids + primary chrome as SSoT.
5. **Rewrite header + Completion Evidence + CHANGELOG wording** for flat primary + conceptual pillars; update Epic metrics (`minimal: 7`, sections: flat main, conceptual pillars: 7).
6. Optional: Playwright apply `minimal` → ≤12 nav leaves.

## Task Ledger Patch Suggestion

```
Score 81 → REJECT → docs/tasks/02-doing/
Blockers: F1 tests, F2 fusion home, F3 hollow presets, F4 dead inventory
```

## Score Breakdown (informal)

| Area | Weight | Points |
| --- | --- | --- |
| Default leaf cap / minimal ≤12 / engines / observe | 30 | 28 |
| Seven-pillar conceptual export + archive | 15 | 13 |
| Fusion under Routing | 15 | 4 |
| Role presets as real views | 15 | 8 |
| Related tests green | 15 | 5 |
| Evidence/docs sync | 10 | 5 |
| **Total** | 100 | **81** |
