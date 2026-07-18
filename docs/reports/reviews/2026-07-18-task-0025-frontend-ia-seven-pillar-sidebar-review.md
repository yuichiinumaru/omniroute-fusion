# Review Report: Task 0025 — Frontend IA Seven-Pillar / Flat Primary Sidebar — 2026-07-18

## Review Lineage

- **Current task**: Task 0025 (`frontend-ia-seven-pillar-sidebar`); path at review start: `docs/tasks/02-doing/0025-frontend-ia-seven-pillar-sidebar.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0025-frontend-ia-seven-pillar-sidebar-rereview.md` (score 87, NEEDS FIX — F4/F5/F7 open)
  - `docs/reports/reviews/2026-07-11-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (score 81, REJECT — F1–F6)
  - `docs/reports/reviews/2026-07-10-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (score 94, HELD — accordion-era; superseded)
- **Related context**:
  - Builder waves 2026-07-18 (engineer F4/F5/F7) + 2026-07-18b (settings redirect residual)
  - Archives: `.archive/sidebar/2026-07-10-seven-pillars/`, `…/flat-primary-nav/`, `…/2026-07-18-dead-pillar-arrays/`
- **Review mode**: `re-review` (frontend-quality + tsjs + code-quality gates; path-to-100 a11y polish by reviewer)
- **Reviewer**: `gt-frontend-quality-reviewer` under parent `agentID=builders`
- **No git. No :21000.**

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPT`
- **Lane recommendation**: move to `docs/tasks/03-review/` (parent may complete after wave closeout)

## Delta Summary

### Resolved Since Prior Re-Review (87 NEEDS FIX)

| Prior ID | Status | Proof |
| --- | --- | --- |
| F1 customization/back-compat | **RESOLVED** (prior) | Expanded suite green |
| F2 Fusion under Routing | **RESOLVED** (prior) | `RoutingHubSubnav` on combos/fusions/live/settings/studio + palette |
| F3 role presets hollow | **RESOLVED** (prior) | Live 7 < 8 ≤ 9 primary |
| F4 dead pillar inventories | **RESOLVED** | `CORE_PULSE…HELP` deleted; archive `2026-07-18-dead-pillar-arrays/` |
| F5 evidence / epic drift | **RESOLVED** | Epic 0005 metrics **met (7)** / primary **9**; task evidence refreshed |
| F6 stale header | **RESOLVED** (prior) | Flat-chrome header in `sidebarVisibility.ts` |
| F7 expanded suite fails | **RESOLVED** | costs/tools/quota rewritten; **170/170 PASS** this review |

### New Residual Closed This Review (path-to-100)

| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| N1 | Medium a11y | **RESOLVED** | Collapse control was under `aria-hidden="true"` parent → AT-invisible |
| N2 | Low a11y | **RESOLVED** | Primary nav links lacked `aria-current="page"` |
| N3 | Low a11y | **RESOLVED** | Restart/shutdown icon-only (collapsed) lacked `aria-label` |
| N4 | Low UX copy | **RESOLVED** | SidebarTab preset descriptions still accordion-era |

### Non-blocking residual (explicitly optional)

| ID | Status | Notes |
| --- | --- | --- |
| O1 Playwright minimal leaf smoke | **OPTIONAL** | Unit inventory + `countPresetVisibleLeaves` enforce contract; browser smoke not required for ACCEPT |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F4 | RESOLVED | Medium | Closed | Dead pillar dual SSoT | No `CORE_PULSE_ITEMS` etc. in live module; archive SNAPSHOT |
| F5 | RESOLVED | Low | Closed | Epic/task counts | Epic met(7); live inventory matches |
| F7 | RESOLVED | High | Closed | Expanded sidebar cluster | 170 pass / 0 fail |
| N1 | NEW→RESOLVED | Medium | Closed | Collapse `aria-hidden` | `Sidebar.tsx` dots-only `aria-hidden`; test guard |
| N2 | NEW→RESOLVED | Low | Closed | Missing `aria-current` | Links set `aria-current={active ? "page" : undefined}` |
| N3 | NEW→RESOLVED | Low | Closed | Footer control labels | `aria-label` on restart/shutdown |
| N4 | NEW→RESOLVED | Low | Closed | Stale preset blurbs | Flat role-view fallbacks in `SidebarTab.tsx` |

## Contract Compliance (Task MUST / Exit)

| Requirement | Status | Live proof |
| --- | --- | --- |
| Exactly **7** operational pillars (export) | ✅ | `OPERATIONAL_PILLAR_SECTION_IDS.length === 7` |
| Product top-level sections ≤ 8 | ✅ | Chrome: `main` (+ debug); conceptual pillars 7 |
| `fusions` under Routing | ✅ | Not primary peer; hub subnav + palette |
| Compression engines = 0 default leaves | ✅ | `enginesInTree: []` |
| Observe multi-table leaves collapsed | ✅ | single `activity` hub primary |
| `minimal` ≤ 12 (test-enforced) | ✅ | live **7**; assert ≤12 + stretch ≤10 + exact 7 |
| Hideable IDs retained | ✅ | engines, observe stream, dual-nav, fusions, etc. |
| Archive + provenance | ✅ | seven-pillars + flat-primary + dead-pillar-arrays |
| Role presets all\|minimal\|developer\|admin | ✅ | 9 / 7 / 8 / 9; minimal < developer ≤ admin |
| Targeted unit tests 0 fail | ✅ | **170/170** expanded cluster |
| `typecheck:core` | ✅ | PASS |
| CHANGELOG entry | ✅ | Unreleased Fixed path-to-100 + historical S6 entry |
| Epic metrics on close | ✅ | met (7) / primary 9 |

## Production Wiring Proof

```
OPERATIONAL_PILLAR_SECTION_IDS (7 conceptual) — docs/mapping only
PRIMARY_SIDEBAR_ITEMS (9 hubs)
  → SIDEBAR_SECTIONS[main].children
  → Sidebar.tsx flat <nav aria-label="Main navigation">
  → SIDEBAR_PRESETS → hiddenSidebarItems (role views)
  → Routing leaf (combos) → RoutingHubSubnav → fusions / live / compression*
  → CommandPalette routing hub extras → fusions + compression-studio + live
  → Settings SidebarTab.applyPreset → same SIDEBAR_PRESETS SSoT
```

Fusion discoverability mounts:

| Surface | Mounts `RoutingHubSubnav` |
| --- | --- |
| `combos/page.tsx` | ✅ `active="combos"` |
| `fusions/page.tsx` | ✅ `active="fusions"` |
| `combos/live/page.tsx` | ✅ `active="live"` |
| `context/settings/page.tsx` | ✅ `active="compression-settings"` |
| `compression/studio/page.tsx` | ✅ `active="compression-studio"` |

## Live Inventory Snapshot (reviewer-executed 2026-07-18)

```json
{
  "pillarsConceptual": 7,
  "sectionIds": ["main", "devtools"],
  "primaryCount": 9,
  "primaryIds": [
    "home", "providers", "combos", "activity", "analytics",
    "costs", "operations", "settings-general", "docs"
  ],
  "defaultLeafCount": 9,
  "enginesInTree": [],
  "dualNavInTree": [],
  "fusionsInDefaultTree": false,
  "presets": { "all": 9, "minimal": 7, "developer": 8, "admin": 9 },
  "minimalIds": [
    "home", "providers", "combos", "activity",
    "operations", "settings-general", "docs"
  ],
  "roleOrder": true
}
```

## Frontend Quality (harness)

| Gate | Result |
| --- | --- |
| Visual hierarchy | Flat ≤10 hubs; subtitles carry nested intent; no accordion dump |
| Motion | Collapse transition only; no carnival motion |
| Accessibility | Skip link; main nav label; `aria-current`; collapse AT-visible; footer labels |
| Performance | Settings fetch once + event bus; no re-fetch loops in chrome |
| Type/data safety | Zod-free constants module; hideable id unions; normalize drops stale prefs |
| Design debt | Neutral icons (`currentColor`); flat chrome header documents budget |

## Commands Run

```bash
# Live inventory (node --import tsx/esm -e …) → JSON above

npm run typecheck:core
# → PASS

node --import tsx/esm --test \
  tests/unit/ui/sidebar-seven-pillars.test.ts \
  tests/unit/ui/sidebar-flat-primary-nav.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/sidebar-naming-i18n.test.ts \
  tests/unit/sidebar-visibility.test.ts \
  tests/unit/sidebar-customization.test.ts \
  tests/unit/sidebar-back-compat.test.ts \
  tests/unit/sidebar-costs-section.test.ts \
  tests/unit/sidebar-costs-quota-plans.test.ts \
  tests/unit/sidebar-tools-group.test.ts \
  tests/unit/sidebar-quota-share-placement.test.ts \
  tests/unit/sidebar-monitoring-reorg.test.ts \
  tests/unit/sidebar-cli-renames.test.ts \
  tests/unit/sidebar-route-match.test.ts \
  tests/unit/dashboard-sidebar-desktop-visible.test.ts \
  tests/unit/ui/routing-hub-discoverability-0025.test.ts
# → 170 tests, 170 pass, 0 fail
```

## Path-to-100 Applied This Review

1. **N1** — `Sidebar.tsx`: move `aria-hidden` to decorative traffic-light dots only; keep collapse control focusable/AT-visible; `type="button"`.
2. **N2** — set `aria-current="page"` on active internal + external nav links.
3. **N3** — `aria-label` + `aria-hidden` icons on restart/shutdown.
4. **N4** — SidebarTab preset description fallbacks match flat role views (no en.json edit — avoid locale churn / 0024 collision surface).
5. **Tests** — strengthen minimal ≤12 contract + exact 7; static a11y regression guard in `sidebar-flat-primary-nav.test.ts`.

## Path to 100 (post-fix)

None. Score 100.

Optional later (out of scope): Playwright apply-`minimal` leaf smoke; i18n keys for new preset description strings if product wants non-fallback locales.

## Regression Guards (do not regress)

- Exactly 7 `OPERATIONAL_PILLAR_SECTION_IDS`; default chrome flat primary ≤10 (live **9**)
- `countPresetVisibleLeaves("minimal") ≤ 12` (live **7**)
- Compression engines never default leaves; observe multi-leaves + analytics dual-nav stay collapsed
- Fusion discoverable under Routing (subnav + palette); studio reverse-nav mounted
- No reintroduction of dead pillar arrays / `TOOLS_GROUP` accordion
- Expanded sidebar cluster stays 0 fail; archives retained
- Role presets: minimal < developer ≤ admin (live 7 < 8 ≤ 9)
- Collapse control never parent-`aria-hidden`; primary nav exposes `aria-current` when active

## Task Ledger Patch Suggestion

```markdown
### Reviewer gate (2026-07-18) — gt-frontend-quality-reviewer
- **Score**: 100/100 ACCEPT
- **Full report**: docs/reports/reviews/2026-07-18-task-0025-frontend-ia-seven-pillar-sidebar-review.md
- **Lane**: → docs/tasks/03-review/
- Prior F4/F5/F7 RESOLVED; N1–N4 a11y/copy closed in this wave
```

## Files Touched By This Reviewer (path-to-100 only)

- `src/shared/components/Sidebar.tsx`
- `src/app/(dashboard)/dashboard/settings/components/SidebarTab.tsx`
- `tests/unit/ui/sidebar-flat-primary-nav.test.ts`
- This report
- Task ledger + lane move
