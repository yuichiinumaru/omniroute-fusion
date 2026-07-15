# Re-Review Report: Task 0025 — Frontend IA Seven-Pillar / Flat Primary Sidebar — 2026-07-11

## Review Lineage

- **Current task**: Task 0025 (`frontend-ia-seven-pillar-sidebar`); path at review start: `docs/tasks/03-review/0025-frontend-ia-seven-pillar-sidebar.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (score 81, REJECT)
  - `docs/reports/reviews/2026-07-10-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (score 94, HELD — accordion-era; superseded)
- **Related context**:
  - Path-to-100 commit: `57857f5` (`fix(ui): path-to-100 for returned IA tasks 0024 and 0025`)
  - Flat-primary archive: `.archive/sidebar/2026-07-10-flat-primary-nav/SNAPSHOT.md`
  - Pre-S6 archive: `.archive/sidebar/2026-07-10-seven-pillars/`
- **Review mode**: `re-review` (independent FS + tests after path-to-100)
- **Reviewer profile**: `reviewers` (consolidated general-purpose)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `87/100`
- **Verdict**: `NEEDS FIX` (REJECT for lane; path-to-100 incomplete)
- **Lane recommendation**: move to `docs/tasks/02-doing/` (do **not** complete; do **not** leave in `03-review/`)

## Delta Summary

### Resolved Since Previous Review (81 REJECT)

| Prior ID | Status | Proof |
| --- | --- | --- |
| F1 (High) customization/back-compat 7 fails | **Closed (scoped batch)** | Prior review batch + routing-hub tests: **126 pass / 0 fail** |
| F2 (High) Fusion not under Routing | **Closed** | `RoutingHubSubnav` on combos + fusions; CommandPalette `fusions` + compression-studio; `routing-hub-discoverability-0025.test.ts` green |
| F3 (Medium) hollow admin/developer | **Mostly closed** | Live primary visible: minimal **7**, developer **9**, admin **10** (`minimal < developer ≤ admin`) |
| F6 (Low) stale S6 header | **Closed** | `sidebarVisibility.ts:1-21` documents flat chrome + conceptual pillars |

### Persistent / Incomplete Path-to-100

| Prior ID | Status | Notes |
| --- | --- | --- |
| F4 (Medium) dead pillar inventories | **Open** | `CORE_PULSE_ITEMS`…`HELP_ITEMS` still defined; only `PRIMARY_SIDEBAR_ITEMS` + `DEVTOOLS_ITEMS` feed chrome |
| F5 (Low) evidence / epic drift | **Open** | Task Completion Evidence still claims minimal **12** accordion leaves; Epic 0005 metrics **met (12)**; live minimal **7** |

### Regressions / New Findings

- **NEW (High residual) F7**: Expanded sidebar unit cluster still has **17 failures** (`sidebar-costs-section`, `sidebar-costs-quota-plans`, `sidebar-tools-group`, `sidebar-icon-accents-3812`). Path-to-100 fixed only the previously named customization/back-compat files; completion evidence still claims those cost/tools suites were green under S6.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | REGRESSION | High | **Closed (scoped)** | Prior 7 customization/back-compat fails | 2026-07-11 review | Batch 126/0 this re-review |
| F2 | REGRESSION | High | **Closed** | Fusion discoverability under Routing | 2026-07-11 review | Subnav + palette + unit tests |
| F3 | NEW→fix | Medium | **Closed w/ notes** | Role presets hollow | 2026-07-11 review | Distinct 7/9/10 primary counts |
| F4 | NEW | Medium | **Open** | Dead pillar item arrays after flat cutover | 2026-07-11 review | ~lines 306–884 unused by `SIDEBAR_SECTIONS` |
| F5 | PERSISTENT | Low | **Open** | Epic/task evidence drift | 2026-07-10 / 11 | Evidence minimal=12; epic met(12); live 7 |
| F6 | NEW | Low | **Closed** | Stale header | 2026-07-11 review | Header rewritten |
| F7 | NEW residual | High | **Open** | Broader related sidebar suites still fail (17) | this re-review | costs-section, costs-quota, tools-group, icon-accents-3812 |

## Findings (detailed)

### [CLOSED] F1 — Prior 7 related unit failures

**Evidence:** Exact prior-review command set (plus `routing-hub-discoverability-0025`):

```
126 tests, 126 pass, 0 fail
```

Includes: `sidebar-customization`, `sidebar-back-compat`, seven-pillars, flat-primary, engines, observe, connect, naming, visibility, monitoring-reorg.

**Impact:** Named high blocker from REJECT is fixed for that batch.

### [CLOSED] F2 — Fusion under Routing discoverability

**Evidence:**

- `src/shared/components/RoutingHubSubnav.tsx` — links `/dashboard/combos`, `/dashboard/fusions`, `/dashboard/compression/studio`
- Mounted: `combos/page.tsx:1047` (`active="combos"`), `fusions/page.tsx:134` (`active="fusions"`)
- `CommandPalette.tsx:133-155` — routing hub extras include `fusions` + `compression-studio`
- Not a primary peer: `PRIMARY_SIDEBAR_ITEM_IDS` excludes `fusions` (inventory + tests)

**Residual (non-blocking):** Compression studio page does **not** mount `RoutingHubSubnav`, so hub reverse-nav is one-way from compression. Combos/fusions/palette satisfy “discoverable under Routing.”

### [CLOSED w/ notes] F3 — Role presets

Live `countPresetVisibleLeaves`:

| Preset | Visible primary leaves | Diff vs all |
| --- | --- | --- |
| all | 10 | full primary |
| minimal | 7 | real short view |
| developer | 9 | omits `docs` |
| admin | 10 | = all primary; also “shows” off-tree `settings-security` / `settings-feature-flags` (still no-op in chrome) |

**Impact:** Presets are no longer hollow clones for primary chrome. Admin off-tree unhides remain prefs-only (documented in source). Acceptable for flat model if evidence stops claiming rich admin persona trees.

### [OPEN / MEDIUM] F4 — Dead pillar inventories

**Evidence:** Private arrays still defined in `sidebarVisibility.ts`:

- `CORE_PULSE_ITEMS` (~306), `REGISTRY_ITEMS` (~370), `ROUTING_ITEMS` (~447, still holds `fusions` leaf def), `GOVERNANCE_ITEMS` (~482), `OPERATIONS_ITEMS` (~703), `OBSERVABILITY_ITEMS` (~731), `SYSTEM_ITEMS` (~772), `HELP_ITEMS` (~859)

Live chrome only uses `PRIMARY_SIDEBAR_ITEMS` → `SIDEBAR_SECTIONS[main]` + `DEVTOOLS_ITEMS` → `devtools` (~893–997).

`COMPRESSION_CONTEXT_GROUP` exported and unit-tested but **not** mounted in `SIDEBAR_SECTIONS`.

**Impact:** Dual SSoT. Legacy suites (`sidebar-costs-section`, `sidebar-tools-group`) still assert `SIDEBAR_SECTIONS` has `governance` / `operations` groups that exist only in dead arrays → F7.

**Fix:** Delete dead arrays **or** move to explicit non-rendered hub inventory module/archive; retarget remaining tests to primary hubs + hideable ids + in-page subnav contracts.

### [OPEN / LOW] F5 — Evidence / epic drift

- Task Completion Evidence (still in file): minimal **12** leaves including `endpoints`, `health`, `changelog` — **not live**.
- Epic 0005 success metrics: **met (12)** for minimal; prose still reads as accordion pillars in places; child path still points at `04-completed/0025-…` while task is not completed.
- Live: minimal **7**, primary **10**, sections `main`+`devtools`, conceptual pillars **7**.
- CHANGELOG path-to-100 line (Unreleased Fixed) is accurate; historical Unreleased “Seven-pillar sidebar rebuild” entry still describes accordion-era counts.

**Fix:** Rewrite Completion Evidence + epic metrics to live numbers before next promote.

### [OPEN / HIGH residual] F7 — Expanded related sidebar suites still fail

**Evidence (reviewer-executed full sidebar glob):**

```
156 tests, 139 pass, 17 fail
```

Failures:

1. `tests/unit/sidebar-costs-section.test.ts` — 7 fails (expects `governance` / `observability` sections)
2. `tests/unit/sidebar-costs-quota-plans.test.ts` — 2 fails (`sectionItems("governance")`)
3. `tests/unit/sidebar-tools-group.test.ts` — 5 fails (expects `operations` + `tools` group)
4. `tests/unit/sidebar-icon-accents-3812.test.ts` — 3 fails (`getSidebarIconAccent` now always `currentColor`; carnival hex accents retired)

**Impact:** Task exit “Targeted unit tests MUST pass with 0 failures” and Completion Evidence claim that costs/tools suites were updated remain false. Regression guard “Related sidebar unit suites green” is only true for the **narrow** prior-review batch, not the full sidebar cluster that Completion Evidence listed.

**Fix:** Rewrite costs/tools tests for flat hubs (`costs` primary leaf; Operations hub leaf; deep cost routes hideable-only or costs in-page tabs). Update or retire `#3812` accent tests to match neutral-icon policy (`sidebar-flat-primary-nav` already asserts `currentColor`).

## Contract Compliance (Task MUST / Exit)

| Requirement | Status | Live proof |
| --- | --- | --- |
| Exactly **7** operational pillars (export) | ✅ conceptual | `OPERATIONAL_PILLAR_SECTION_IDS.length === 7`; chrome is flat (accepted post-flat cutover) |
| Product top-level sections ≤ 8 | ✅ | 1 non-debug (`main`) |
| `fusions` under Routing | ✅ | Hub subnav + palette (not primary peer) |
| Compression engines = 0 default leaves | ✅ | engines absent from default leaves |
| Observe multi-table leaves collapsed | ✅ | only `activity` hub primary |
| `minimal` ≤ 12 (test-enforced) | ✅ | live **7**; flat-primary/seven-pillars assert ≤10 |
| Hideable IDs retained | ✅ | engines, observe stream, dual-nav, fusions hideable |
| Archive + provenance | ✅ | seven-pillars + flat-primary archives |
| Role presets all\|minimal\|developer\|admin | ✅ improved | distinct 7/9/10 primary |
| Targeted unit tests 0 fail | ⚠️ Partial | Prior batch 0 fail; **expanded cluster 17 fail** |
| CHANGELOG entry | ✅ | Unreleased S6 + path-to-100 Fixed blurb |
| Epic metrics on close | ❌ / stale | still **met (12)**; evidence not refreshed |

## Production Wiring Proof

```
PRIMARY_SIDEBAR_ITEMS (10 hubs)
  → SIDEBAR_SECTIONS[main].children
  → Sidebar.tsx renders SIDEBAR_SECTIONS (flat)
  → Routing leaf (combos) → RoutingHubSubnav → fusions / compression
  → CommandPalette routingHubExtras → fusions / compression-studio
  → SIDEBAR_PRESETS → hiddenSidebarItems (role views)
OPERATIONAL_PILLAR_SECTION_IDS — conceptual mapping only
Dead GOVERNANCE_ITEMS / OPERATIONS_ITEMS / ROUTING_ITEMS — not rendered
```

## Live Inventory Snapshot (reviewer-executed 2026-07-11 re-review)

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
  "presets": { "all": 10, "minimal": 7, "developer": 9, "admin": 10 },
  "minimalIds": [
    "home", "providers", "combos", "api-manager",
    "activity", "settings-general", "docs"
  ],
  "fusionDiscoverability": {
    "routingHubSubnav": true,
    "combosMountsSubnav": true,
    "fusionsMountsSubnav": true,
    "commandPaletteFusions": true,
    "compressionStudioMountsSubnav": false
  }
}
```

## Evidence Reviewed

- Task: `docs/tasks/03-review/0025-frontend-ia-seven-pillar-sidebar.md` (ledger still shows 81 REJECT blockers open)
- Prior report: `docs/reports/reviews/2026-07-11-task-0025-…-review.md`
- Commit: `57857f5` path-to-100
- Source: `sidebarVisibility.ts`, `RoutingHubSubnav.tsx`, combos/fusions pages, `CommandPalette.tsx`, `Sidebar.tsx`
- Tests: prior batch (126/0) + expanded sidebar glob (139/17)
- Archives: seven-pillars + flat-primary-nav + PROVENANCE-INDEX
- Epic 0005 success metrics table
- CHANGELOG Unreleased Fixed path-to-100 + historical S6 entry

## Commands Run

```bash
node --import tsx/esm -e '/* live inventory pillars/presets/fusions */'
# → inventory JSON above

node --import tsx/esm --test \
  tests/unit/ui/sidebar-seven-pillars.test.ts \
  tests/unit/ui/sidebar-flat-primary-nav.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/sidebar-naming-i18n.test.ts \
  tests/unit/ui/routing-hub-discoverability-0025.test.ts \
  tests/unit/sidebar-visibility.test.ts \
  tests/unit/sidebar-customization.test.ts \
  tests/unit/sidebar-monitoring-reorg.test.ts \
  tests/unit/sidebar-back-compat.test.ts
# → 126 tests, 126 pass, 0 fail

node --import tsx/esm --test \
  tests/unit/sidebar*.test.ts \
  tests/unit/ui/sidebar*.test.ts \
  tests/unit/ui/routing-hub*.test.ts \
  tests/unit/ui/observe-hub*.test.ts \
  tests/unit/ui/connect-exposure*.test.ts
# → 156 tests, 139 pass, 17 fail
```

## Commands Not Run And Why

- Full `npm run test:unit` / e2e / typecheck:core: expanded sidebar failures already block ≥90; full suite not required for this verdict.
- Browser preset smoke: still evidence gap (optional path-to-100 #6).

## Path To 100 (builder checklist)

1. **Rewrite or retire failing suites** (`sidebar-costs-section`, `sidebar-costs-quota-plans`, `sidebar-tools-group`, `sidebar-icon-accents-3812`) for flat `main`/`devtools` + hub model — full sidebar glob **0 fail**.
2. **Delete or archive dead pillar arrays** (`CORE_PULSE…HELP`); keep hideable ids + primary chrome as SSoT; keep `COMPRESSION_CONTEXT_GROUP` only if still intentionally contracted, or assert hub via routing subnav instead.
3. **Refresh Completion Evidence + Epic 0005 metrics** to live counts (`minimal: 7`, primary: 10, sections: `main`+`devtools`, conceptual pillars: 7); update task ledger open blockers.
4. Optional: mount `RoutingHubSubnav` on compression studio for reverse hub nav; optional Playwright apply `minimal` → ≤12 nav leaves.

## Task Ledger Patch Suggestion

```
Score 87 → NEEDS FIX → docs/tasks/02-doing/
Closed: F1 (scoped), F2, F3, F6
Open: F4 dead inventory, F5 evidence, F7 expanded suite 17 fails
```

## Score Breakdown

| Area | Weight | Points |
| --- | --- | --- |
| Default leaf cap / minimal ≤12 / engines / observe | 30 | 30 |
| Seven-pillar conceptual export + archive honesty | 15 | 11 |
| Fusion under Routing | 15 | 14 |
| Role presets as real views | 15 | 13 |
| Related tests green | 15 | 10 |
| Evidence/docs sync | 10 | 5 |
| **Total** | 100 | **87** |

### Verify checklist (operator request)

| Check | Result |
| --- | --- |
| Flat tests green (seven-pillars + flat-primary + prior batch) | ✅ 126/0 |
| Fusion under Routing discoverability | ✅ subnav + palette |
| Presets not hollow | ✅ 7 / 9 / 10 differentiated |
| No 7 related unit failures (prior F1) | ✅ those 7 fixed |
| Full sidebar cluster clean | ❌ 17 residual fails |
