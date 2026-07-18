# Review Report: Task 0058 — Routing + Context Compression IA — 2026-07-16

## Review Lineage

- **Current task**: Task 0058 (`omniroute-routing-context-compression-ia`); live path at review start: `docs/tasks/03-review/0058-omniroute-routing-context-compression-ia.md`
- **Previous reports read**: none under `docs/reports/reviews/` for 0058
- **Related context**: Routing hub subnav from Task 0025; compression settings panel + engine catalog
- **Review mode**: `initial` (independent FS + tests)
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / consolidated)
- **Parent agentID**: `reviewers`
- **Report date**: 2026-07-16 (filename keeps task campaign date `2026-07-14` per request)

## Score And Verdict

- **Score**: `88/100`
- **Verdict**: `NEEDS FIX`
- **Lane recommendation**: move to `docs/tasks/02-doing/` (S < 90 — do **not** leave in `03-review/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Routing topbar (Live + Settings + Studio) | 98 | Five links + active ids; Live/Studio/settings mount matching `active` |
| Compression redirect hub | 97 | `/dashboard/compression` → settings; studio preserved |
| Conditional mode composition (on load) | 90 | `ENGINE_IDS` order, empty → null, custom caveman/rtk + generic `EngineConfigPage` |
| Conditional mode composition (interactive) | 62 | Sections do **not** update when `CompressionPanel` toggles engines on the same page |
| Embedded mode quality | 72 | Full-page chrome + circular panel-pointer; caveman Advanced re-embeds legacy settings tab |
| Tests / evidence honesty | 94 | Claimed suites re-run green; typecheck green; evidence accurate about combos exclusion |
| Scope discipline | 96 | IA only; standalone routes kept; no algorithm changes |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none

### Regressions

- none against Combos/Fusions pages (still mount `RoutingHubSubnav` with correct active)

### New Findings

- `NEW` F1 (Medium): enabled sections stale after same-page engine toggle
- `NEW` F2 (Medium): embed full standalone page chrome under settings (duplicate headers / circular pointer / caveman Advanced dual-editor)
- `NEW` N1 (Low): Command palette lacks Live (and Compression Settings); Studio present
- `NOTE` N2 (Info): `/dashboard/context/combos` intentionally not auto-embedded — documented; matches catalog-vs-route reality

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Medium | Open | Enabled engine sections do not recompose when panel toggles engines | this report | `EnabledEngineSections.tsx:49-79` one-shot `useEffect([])` fetch; `CompressionPanel.tsx:156-162` `setEngine` only updates local panel state |
| F2 | NEW | Medium | Open | Embedded modes render standalone full-page UI inside settings | this report | `EngineConfigPage.tsx:260-291` `h1` + panel-pointer to settings; `CavemanContextPageClient.tsx:129-148,270` full header + Advanced `CompressionSettingsTab` |
| N1 | NEW | Low | Open | Palette discoverability incomplete vs topbar | this report | `CommandPalette.tsx` has fusions + compression-studio; no `/dashboard/combos/live` |
| N2 | NEW | Info | Accepted | Named compression combos not in engine sections | this report | Task completion note + `ENGINE_IDS` has no `combos` id |
| G1 | — | Guard | Pass | Topbar has Combos, Fusions, Live, Compression Settings, Studio | this report | `RoutingHubSubnav.tsx:25-39` |
| G2 | — | Guard | Pass | Live + Studio mount hub with correct active | this report | `combos/live/page.tsx:25`; `compression/studio/page.tsx:11` |
| G3 | — | Guard | Pass | Compression root redirects to context settings | this report | `compression/page.tsx:10` |
| G4 | — | Guard | Pass | Standalone mode routes exist for every catalog engine | this report | `routing-hub-discoverability-0025` + FS check for all `ENGINE_IDS` |
| G5 | — | Guard | Pass | Empty / order / error composition unit-tested | this report | `enabled-engine-sections-0058.test.tsx` 3/3 PASS |

## Findings (detailed)

### [MEDIUM] F1 — Same-page toggle does not recompose enabled sections

**Evidence:**

- `EnabledEngineSections` loads `/api/settings/compression` once on mount (`useEffect` deps `[]` at `EnabledEngineSections.tsx:49-79`).
- `CompressionPanel` owns a separate `config` state and persists engine toggles via `setEngine` → `save({ engines })` (`CompressionPanel.tsx:156-162`) without notifying siblings.
- No `visibilitychange` / shared context / callback bridge between panel and sections.

**Impact:** Target UX is *conditional modes under settings* (examples: enable caveman → settings + caveman content). On the primary interaction path (toggle engine on the settings page), the detail section does not appear or disappear until a full reload. On-load composition works; interactive composition does not.

**Fix (minimal):**

1. Lift `engines` (or full compression config) to `settings/page.tsx` and pass into both `CompressionPanel` and `EnabledEngineSections`, **or**
2. After successful `save({ engines })` in the panel, dispatch a small custom event / shared store that `EnabledEngineSections` listens to and re-filters, **or**
3. Have `EnabledEngineSections` accept `engines` as a controlled prop from a parent that owns the fetch.

Add a unit/integration test: mock save path → assert section `data-engine-id` list updates without remounting the whole route.

### [MEDIUM] F2 — Embed quality: full-page chrome + dual settings surface

**Evidence:**

- Generic embed path uses `EngineConfigPage`, which always renders a page-level `h1` and a “Turn this layer on/off … in Compression Settings” notice (`EngineConfigPage.tsx:260-291`) even when already nested under `/dashboard/context/settings`.
- Caveman embed is the full `CavemanContextPageClient` (`h1`, max-width page shell). In Advanced view it mounts `CompressionSettingsTab` (`CavemanContextPageClient.tsx:270`) — a second, independent compression settings editor stacked under `CompressionPanel` on the same route.
- RTK embed likewise uses full standalone page shell (`RtkContextPageClient.tsx:152-158`).

**Impact:** Enabling multiple engines produces stacked “mini-apps” (duplicate titles, nested max-widths, circular “go to settings” copy). Caveman Advanced can present two unsynced editors of overlapping compression settings on one page — confusing and error-prone.

**Fix (minimal, IA-only):**

1. Add an optional `embedded?: boolean` (or `variant="embedded"`) to `EngineConfigPage` / custom clients: hide outer `h1`, hide panel-pointer when `embedded`, reduce padding.
2. For caveman Advanced under settings, do **not** mount `CompressionSettingsTab` when `embedded` (panel above is SSOT for master/engine grid).

Standalone routes keep current full chrome (`embedded={false}` default).

### [LOW] N1 — Command palette missing Live

**Evidence:** `CommandPalette.tsx` includes fusions + compression-studio; no Live entry for `/dashboard/combos/live`. Task exit conditions only require topbar exposure (which is done).

**Impact:** Discoverability gap for keyboard/palette users; not a topbar contract failure.

**Fix:** Optional path-to-100 — add Live (+ optionally Compression Settings) palette entries mirroring topbar hrefs.

### [INFO] N2 — `context/combos` not auto-embedded

**Evidence:** Target UX bullet list includes `/dashboard/context/combos`, but that route is a named-combos manager, not an `ENGINE_IDS` entry. Completion evidence documents intentional exclusion. Composition correctly keys off `ENGINE_IDS` / `engines[id].enabled`.

**Impact:** None for catalog engines. Accept as intentional unless product wants combos manager always/optionally under settings.

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Routing topbar includes Combos, Fusions, Live, Compression Settings, Compression Studio | ✅ | `RoutingHubSubnav.tsx:25-39` |
| `/dashboard/combos/live` reachable from Routing topbar | ✅ | link `id: "live"` + `active="live"` on live page |
| `/dashboard/compression` redirects to `/dashboard/context/settings` | ✅ | `compression/page.tsx:10`; not caveman |
| `/dashboard/compression/studio` remains reachable | ✅ | studio page + topbar link; mounts subnav |
| `/dashboard/context/settings` renders only enabled mode sections below settings | ⚠️ partial | On load: yes (`EnabledEngineSections`). After in-page toggle: no (F1) |
| Standalone mode routes still work | ✅ | All `ENGINE_IDS` have `context/{id}/page.tsx`; pages unchanged wrappers |
| `npm run typecheck:core` passes | ✅ | Reviewer re-run exit 0 |
| Targeted route smoke checks pass | ✅ | See Commands |

## Commands (reviewer re-run)

```text
node --import tsx/esm --test tests/unit/ui/routing-hub-discoverability-0025.test.ts
→ 10/10 pass (suite grew vs claim of 9; all green)

npx vitest run tests/unit/ui/enabled-engine-sections-0058.test.tsx tests/unit/ui/compression-settings-page.test.tsx
→ 5/5 pass

npm run typecheck:core
→ exit 0
```

## Open Questions

- None blocking product intent: F1/F2 fixes are clear without design debate.
- Optional: should named compression combos (`/dashboard/context/combos`) ever appear under settings as a non-engine section? Current exclusion is coherent.

## Path To ≥90

1. **Required:** Fix F1 — sections track current enabled engines after panel toggles (shared state or refresh bridge + test).
2. **Strongly recommended for ≥95:** Fix F2 — `embedded` chrome variant; suppress caveman Advanced `CompressionSettingsTab` when embedded.
3. **Optional:** N1 palette Live entry.
4. Changelog still deferred to post-acceptance (subtask 8) — OK.

## Verdict Summary

Core IA wiring (topbar Live/Settings/Studio, compression hub redirect, on-load conditional embed, standalone routes, tests, typecheck) is in place and evidence is honest. Score is held under 90 by incomplete interactive composition (F1) and rough embed chrome that undermines the “settings + enabled modes” hub (F2).

**Lane action:** move task file to `docs/tasks/02-doing/`.
