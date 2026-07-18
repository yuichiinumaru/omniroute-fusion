# Return Review Report: Task 0025 — Frontend IA Seven-Pillar / Flat Primary Sidebar — 2026-07-18

## Review Lineage

- **Current task**: Task 0025 (`frontend-ia-seven-pillar-sidebar`); path at review: `docs/tasks/03-review/0025-frontend-ia-seven-pillar-sidebar.md`
- **Previous reports read** (prior scores **UNTRUSTED** until re-proven):
  - `docs/reports/reviews/2026-07-18-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (claimed 100 — re-audited)
  - `docs/reports/reviews/2026-07-11-task-0025-frontend-ia-seven-pillar-sidebar-rereview.md` (87 NEEDS FIX — F4/F5/F7)
  - `docs/reports/reviews/2026-07-11-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (81 REJECT)
  - `docs/reports/reviews/2026-07-10-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (94 HELD — accordion-era; superseded)
- **Related**: Task 0024 connect exposure; Task 0054 settings hub SSoT; Task 0059 operations hub
- **Review mode**: `return-review` (independent adversarial FULL re-review; prior 100 untrusted)
- **Reviewer**: independent FULL RE-REVIEWER (`agentID=reviewers`)
- **Skills**: frontend-quality-harness, code-quality, tsjs, review-report-lineage
- **No git. No :21000.**

## Score And Verdict

- **Pre-patch independent score**: `96/100` (S ≥ 90 → path-to-100 in-lane)
- **Post path-to-100 score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane**: stay `docs/tasks/03-review/` (do not demote to `02-doing`)

## Delta Summary

### Resolved Since Prior Trusted Adversarial (2026-07-11 @ 87)

| Prior ID | Status | Live proof |
| --- | --- | --- |
| F4 dead pillar inventories | **RESOLVED** | No `CORE_PULSE_ITEMS`…`HELP_ITEMS` in `src/`; archive `2026-07-18-dead-pillar-arrays/` |
| F5 evidence / epic drift | **RESOLVED** | Epic 0005 metrics **met (7)** / primary **9**; live inventory matches |
| F7 expanded suite fails | **RESOLVED** | costs/tools/quota rewritten; expanded cluster **179/179** this review |
| F1–F3, F6 | **Still resolved** | customization/back-compat, Fusion Routing hub, role presets, flat header |

### New Residual Closed This Return-Review (path-to-100)

| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| R1 | Medium (test honesty) | **RESOLVED** | `dashboard-shell-tabs` settings-root assert still required literal `general: "/dashboard/settings/general"` after 0054 `buildSettingsPath` cutover — claimed "settings residual closed" in visibility suite only; shell-tabs still red |

### Previously closed a11y (re-verified live)

| ID | Status | Proof |
| --- | --- | --- |
| N1 collapse `aria-hidden` | Still good | Dots-only `aria-hidden`; collapse control labeled |
| N2 `aria-current` | Still good | Primary links set `aria-current={active ? "page" : undefined}` |
| N3 footer labels | Still good | restart/shutdown `aria-label` |
| N4 preset copy | Still good | Flat role-view fallbacks in SidebarTab |

### Non-blocking residual

| ID | Status | Notes |
| --- | --- | --- |
| O1 Playwright minimal leaf smoke | OPTIONAL | Unit inventory + `countPresetVisibleLeaves` enforce contract |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F4 | RESOLVED | Medium | Closed | Dead pillar dual SSoT | Grep `CORE_PULSE_ITEMS` in `src/` = 0 hits |
| F5 | RESOLVED | Low | Closed | Epic/task counts | Epic met(7); live minimal 7 / primary 9 |
| F7 | RESOLVED | High | Closed | Expanded cluster red | 179/179 post path-to-100 |
| R1 | NEW→RESOLVED | Medium | Closed this review | shell-tabs settings literal vs `buildSettingsPath` | `dashboard-shell-tabs.test.ts` accepts SSoT |
| N1–N4 | RESOLVED | Low–Med | Still closed | a11y + preset copy | Sidebar.tsx + SidebarTab + flat-primary a11y unit |

## Contract Compliance (Task MUST / Exit)

| Requirement | Status | Live proof |
| --- | --- | --- |
| Exactly **7** operational pillars (export) | ✅ | `OPERATIONAL_PILLAR_SECTION_IDS.length === 7` |
| Product top-level sections ≤ 8 | ✅ | Chrome: `main` (+ debug); conceptual pillars 7 |
| `fusions` under Routing | ✅ | Not primary peer; `RoutingHubSubnav` on combos/fusions/live/settings/studio + palette |
| Compression engines = 0 default leaves | ✅ | `enginesInTree: []` |
| Observe multi-table leaves collapsed | ✅ | single `activity` hub primary |
| `minimal` ≤ 12 (test-enforced) | ✅ | live **7**; asserts ≤12 + stretch ≤10 |
| Hideable IDs retained | ✅ | engines, observe stream, dual-nav, fusions, etc. |
| Archive + provenance | ✅ | seven-pillars + flat-primary + dead-pillar-arrays |
| Role presets all\|minimal\|developer\|admin | ✅ | 9 / 7 / 8 / 9; minimal < developer ≤ admin |
| Targeted unit tests 0 fail | ✅ | **179/179** expanded IA cluster incl. shell-tabs |
| `typecheck:core` | ✅ | PASS |
| CHANGELOG | ✅ | Unreleased Fixed this return-review |
| Epic metrics on close | ✅ | met (7) / primary 9 |

## Production Wiring Proof

```
OPERATIONAL_PILLAR_SECTION_IDS (7 conceptual)
PRIMARY_SIDEBAR_ITEMS (9 hubs)
  → SIDEBAR_SECTIONS[main].children
  → Sidebar.tsx flat <nav aria-label="Main navigation">
  → SIDEBAR_PRESETS → hiddenSidebarItems (role views)
  → Routing leaf (combos) → RoutingHubSubnav → fusions / live / compression*
  → CommandPalette routing hub extras
  → Settings SidebarTab.applyPreset → same SIDEBAR_PRESETS SSoT
```

Fusion discoverability mounts (re-verified):

| Surface | `RoutingHubSubnav` |
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
  "enginesInTree": [],
  "fusionsInDefaultTree": false,
  "presets": { "all": 9, "minimal": 7, "developer": 8, "admin": 9 },
  "roleOrder": true
}
```

## Frontend Quality (harness)

| Gate | Result |
| --- | --- |
| Visual hierarchy | Flat ≤10 hubs; subtitles nest intent; no accordion dump |
| Motion | Collapse transition only |
| Accessibility | Skip link; main nav label; `aria-current`; collapse AT-visible; footer labels; hub subnav icons `aria-hidden` |
| Performance | Settings fetch once + event bus; constants chrome |
| Type/data safety | Hideable id unions; normalize drops stale prefs |
| Design debt | Neutral icons (`currentColor`); flat chrome header documents budget |

## Path-to-100 Applied This Review

1. **R1** — `tests/unit/dashboard-shell-tabs.test.ts`: settings-root assert accepts `buildSettingsPath("general"|"resilience")` (0054 SSoT) while still allowing legacy literals.
2. **CHANGELOG** — Unreleased Fixed entry shared with Task 0024 return-review.
3. **Re-verify** — full expanded IA cluster + typecheck (no production code change required for F4/F5/F7 — already live).

## Commands Run

```bash
# Live inventory (tsx) → pillars 7, primary 9, minimal 7, roleOrder true

node --import tsx/esm --test \
  tests/unit/ui/sidebar-seven-pillars.test.ts \
  tests/unit/ui/sidebar-flat-primary-nav.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/ui/routing-hub-discoverability-0025.test.ts \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/operations-hub-discoverability-0059.test.ts \
  tests/unit/dashboard-shell-tabs.test.ts \
  tests/unit/sidebar-visibility.test.ts \
  tests/unit/sidebar-customization.test.ts \
  tests/unit/sidebar-back-compat.test.ts \
  tests/unit/sidebar-costs-section.test.ts \
  tests/unit/sidebar-costs-quota-plans.test.ts \
  tests/unit/sidebar-tools-group.test.ts \
  tests/unit/sidebar-quota-share-placement.test.ts \
  tests/unit/sidebar-monitoring-reorg.test.ts \
  tests/unit/ui/sidebar-naming-i18n.test.ts
# → 179 tests, 179 pass, 0 fail

npm run typecheck:core  # → PASS
```

## Commands Not Run And Why

- Playwright apply-`minimal` browser smoke — optional; unit contract enforces leaf caps
- Full `test:all` — targeted IA cluster is the task gate

## Regression Guards (do not regress)

- Exactly 7 `OPERATIONAL_PILLAR_SECTION_IDS`; default chrome flat primary ≤10 (live **9**)
- `countPresetVisibleLeaves("minimal") ≤ 12` (live **7**)
- Compression engines never default leaves; observe multi-leaves + analytics dual-nav stay collapsed
- Fusion discoverable under Routing (subnav + palette); studio reverse-nav mounted
- No reintroduction of dead pillar arrays / `TOOLS_GROUP` accordion
- Expanded sidebar cluster stays 0 fail (incl. shell-tabs settings SSoT assert)
- Role presets: minimal < developer ≤ admin (live 7 < 8 ≤ 9)
- Collapse control never parent-`aria-hidden`; primary nav exposes `aria-current` when active
- Settings root redirect paths stay on `buildSettingsPath` SSoT

## Scoring Notes

- Adversarial start (F4/F5/F7 verified closed; a11y re-verified): **96** (−4 R1 incomplete settings shell-tabs residual after builder claimed close)
- Path-to-100 closed R1 → **100**
- O1 Playwright optional → no score hold

## Task Ledger Patch Applied

See Review Ledger on task file (this return-review entry).
