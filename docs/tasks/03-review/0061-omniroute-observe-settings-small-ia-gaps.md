# Task 0061: Observe + Settings Small IA Gaps — Health Link and Appearance Tab Decision

> **Status**: `[x]` Implementation complete — awaiting review (stays in 02-doing/)
> **Priority**: 🟢 P2
> **Type**: `fix` (small information architecture gaps)
> **Action type**: EXPOSE + UX_VIS
> **Origin**: User localhost:21000 vs 22000 IA sweep (2026-07-14)
> **Source evidence**: Observe/Testing/Settings read-only investigation packet
> **Depends on**: Task 0053 (appearance stripped), Task 0054 (settings tabs)
> **Blocks**: none

---

## Objective

Close two small IA gaps left after the major theme/settings work:

1. `/dashboard/health` is a full working page but is orphaned from navigation.
2. `/dashboard/settings/appearance` still exists and contains functional settings, but it is not in the Settings tab bar after Task 0054/0053.

---

## Current Evidence

### Observe / Health

Observe hub is mostly correct:

- `/dashboard/activity` uses `ObserveHubClient` with PageTabBar for:
  - Activity
  - Request Logs
  - Proxy Logs
  - Console
  - Audit
  - MCP Audit
  - A2A Audit
- `/dashboard/logs/proxy` redirects correctly to `/dashboard/activity?source=proxy`.
- `/dashboard/logs` redirects correctly to request logs.

Gap:

`/dashboard/health` exists and is a large functional page, but sidebar navigation does not expose it. `CORE_PULSE_ITEMS` defines a health item, but it is not included in `SIDEBAR_SECTIONS` or `PRIMARY_SIDEBAR_ITEMS`.

### Settings / Appearance

All settings routes exist:

```txt
/settings/access-tokens
/settings/advanced
/settings/ai
/settings/appearance
/settings/feature-flags
/settings/general
/settings/resilience
/settings/routing
/settings/security
/settings/sidebar
```

But `settings/layout.tsx` currently has only 9 tabs and excludes `appearance`.

`/dashboard/settings/appearance` still renders `AppearanceTab`, which Task 0053 stripped of theme/color/branding customization but kept functional settings:

- endpoint tunnel visibility
- home pin toggles
- combo config mode
- quota auto-refresh
- account email visibility
- health-check log visibility
- Electron autostart

Result: direct URL and sidebar link still work, but tabbar highlights General because `appearance` is unknown to `pathToTabValue()`.

---

## Target UX Decisions

### Health

Preferred: expose Health under Observe.

Options:

- **Option A (recommended)**: Add Health to Observe sidebar/hub link set, but keep it as a separate page.
- **Option B**: Add Health as an Observe tab. This is less ideal because Observe tabs are log streams; health is a dashboard.
- **Option C**: Leave it orphaned. Not recommended.

### Appearance

Need one explicit decision:

- **Option A**: Add Appearance back to Settings tabbar.
  - Pros: fastest, preserves existing functional settings.
  - Cons: name "Appearance" is now misleading because theme/branding UI was removed.
- **Option B (recommended naming)**: Add it back but rename tab label to **Interface** or **Preferences**.
  - Pros: preserves page, avoids misleading appearance/theme implication.
  - Cons: may need i18n/label updates.
- **Option C**: Move remaining functional settings into other tabs and redirect `/settings/appearance` to General.
  - Pros: cleanest long-term.
  - Cons: more work.

User listed `/settings/appearance` as expected in Settings, so do not silently remove it without approval.

---

## Subtasks

- [x] 1. Read all files in the Where table before modifying.
- [x] 2. Health navigation decision.
  - [x] 2a. Verify `CORE_PULSE_ITEMS` and `OBSERVABILITY_ITEMS` in `sidebarVisibility.ts`.
  - [x] 2b. Add Health to the chosen navigation surface.
  - [x] 2c. Preserve direct `/dashboard/health` route.
- [x] 3. Appearance settings decision.
  - [x] 3a. Confirm remaining functional settings in `AppearanceTab.tsx`.
  - [x] 3b. Choose Add-back / Rename / Redirect strategy.
  - [x] 3c. If add-back: update `SETTINGS_TABS` in `settings/layout.tsx`.
  - [x] 3d. If rename: ensure label/icon are clear and not theme-customization misleading.
  - [x] 3e. If redirect: relocate functional settings first. *(N/A — Option B add-back + rename label)*
- [x] 4. Update tests/static checks if existing tests assert Settings tab count.
- [x] 5. Run typecheck and relevant tests.
- [x] 6. Update changelog after reviewer acceptance.

---

## Anti-Hallucination Guardrails

1. Do **not** reintroduce theme/color/branding customization UI removed by Task 0053.
2. Do **not** delete `/dashboard/settings/appearance` unless remaining functional settings are relocated.
3. Do **not** put Health into Observe log-stream tabs unless consciously chosen; health is not a log stream.
4. Do **not** break `/dashboard/logs/proxy` redirect — it already works.
5. Preserve stored sidebar/hideable IDs unless a migration is explicitly implemented.

---

## Validation / Exit Conditions

- [x] `/dashboard/health` is discoverable from navigation.
- [x] `/dashboard/logs/proxy` still redirects to Observe proxy logs.
- [x] Settings tabbar handles `/dashboard/settings/appearance` correctly OR route redirects intentionally.
- [x] If Appearance remains, tab label no longer implies theme customization unless acceptable.
- [x] No theme/color/branding customization UI returns.
- [x] `npm run typecheck:core` passes.

---

## Where

| File | Action | Purpose |
|------|--------|---------|
| `src/shared/constants/sidebarVisibility.ts` | MODIFY | Expose health / preserve settings IDs |
| `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx` | READ/MODIFY (if Health tab chosen) | Observe hub tabs |
| `src/shared/constants/observeHub.ts` | READ/MODIFY (if Health tab chosen) | Observe redirects/source model |
| `src/app/(dashboard)/dashboard/health/page.tsx` | READ | Health page scope |
| `src/app/(dashboard)/dashboard/logs/proxy/page.tsx` | READ | Existing proxy redirect |
| `src/app/(dashboard)/dashboard/settings/layout.tsx` | MODIFY | Appearance/Interface tab decision |
| `src/app/(dashboard)/dashboard/settings/appearance/page.tsx` | READ/MODIFY | Appearance route behavior |
| `src/app/(dashboard)/dashboard/settings/components/AppearanceTab.tsx` | READ/MODIFY | Remaining functional settings |
| `.changelog/` | APPEND AFTER REVIEW | Record IA gap closure |

## Completion Evidence

- Health navigation diff:
  - Exported `HEALTH_NAV_ITEM` in `src/shared/constants/sidebarVisibility.ts` and included it in conceptual `OBSERVABILITY_ITEMS`.
  - Observe hub (`ObserveHubClient.tsx`) shows a peer **Health** link (`data-observe-health-link`) to `/dashboard/health` — **not** an Observe stream tab.
  - Command palette `observeHubExtras` adds Health for quick nav.
  - Header deep-link meta for `/dashboard/health`.
  - Primary Observe leaf subtitle now `Logs · audit · health`.
  - Hideable id `health` preserved; **not** added to `PRIMARY_SIDEBAR_ITEMS` (still 9 leaves).
- Appearance/Interface decision:
  - **Option B applied**: Settings tabbar re-adds `value: "appearance"` with **label `"Interface"`** and icon `display_settings`.
  - Route remains `/dashboard/settings/appearance` (no hard rename / redirect).
  - `pathToTabValue()` now highlights Interface when on appearance path (no longer falls back to General).
  - `AppearanceTab` functional prefs unchanged; no theme/color/branding UI reintroduced.
  - SYSTEM_ITEMS / Header use Interface wording + `display_settings` icon; settings primary subtitle `System · interface · network`.
- Settings tab screenshot: N/A (headless builder validation via static tests).
- Observe/sidebar screenshot: N/A (headless builder validation via static tests).
- Typecheck result: `npm run typecheck:core` — **PASS** (exit 0).
- Tests:
  - `tests/unit/ui/observe-settings-ia-gaps-0061.test.ts` (new) — PASS
  - `tests/unit/ui/observe-hub-sidebar.test.ts` — PASS
  - `tests/unit/settings-ui-layout-static.test.ts` — PASS
  - `tests/unit/sidebar-visibility.test.ts` — PASS
  - `tests/unit/ui/sidebar-flat-primary-nav.test.ts` — PASS
  - Aggregate: **57/57 pass**
- Changelog ref: `CHANGELOG.md` → `[Unreleased]` / Changed / `Observe Health link + Settings Interface tab (Task 0061)`.

## Changelog Draft (append after review)

```markdown
## [2026-07-14] - Observe Health link + Settings Interface tab (Task 0061)
### Changed
- Observe hub surfaces a discoverable Health link to `/dashboard/health` (separate dashboard page, not a log-stream tab); command palette includes Health.
- Settings PageTabBar re-adds the appearance route as **Interface** (functional prefs only; theme/branding stays removed from Task 0053).
### Fixed
- `/dashboard/settings/appearance` no longer falls back to the General tab highlight when opened via URL or sidebar deep link.
**Author**: builders (Task 0061)
```

## Files modified

| File | Change |
|------|--------|
| `src/shared/constants/sidebarVisibility.ts` | `HEALTH_NAV_ITEM`, OBSERVABILITY health entry, Interface label/icon, subtitle copy |
| `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx` | Health discoverability link |
| `src/shared/components/CommandPalette.tsx` | `observeHubExtras` Health entry |
| `src/shared/components/Header.tsx` | Health + Interface deep-header titles |
| `src/app/(dashboard)/dashboard/settings/layout.tsx` | Interface tab (`appearance` value) |
| `src/app/(dashboard)/dashboard/settings/components/AppearanceTab.tsx` | Doc comment only (Interface naming) |
| `tests/unit/ui/observe-settings-ia-gaps-0061.test.ts` | **CREATE** coverage |
| `tests/unit/ui/observe-hub-sidebar.test.ts` | Health link assertion |
| `tests/unit/settings-ui-layout-static.test.ts` | Interface tab assertion |

## Review Ledger

### 2026-07-14 — TS reviewer acceptance

- Score: **100/100** after reviewer path-to-100.
- Path-to-100 applied: added a `// SAFETY:` justification for the `useTranslations("sidebar") as SidebarTranslator` alias in `ObserveHubClient.tsx`.
- Re-verified:
  - `npm run typecheck:core` — PASS.
  - `node --import tsx/esm --test tests/unit/ui/observe-settings-ia-gaps-0061.test.ts tests/unit/ui/observe-hub-sidebar.test.ts tests/unit/settings-ui-layout-static.test.ts tests/unit/sidebar-visibility.test.ts tests/unit/ui/sidebar-flat-primary-nav.test.ts` — PASS, 57/57.
- Contract checks: `/dashboard/health` discoverable via Observe link + command palette, Settings tabbar includes **Interface** for `appearance`, `/dashboard/logs/proxy` redirects via `buildObserveHubPath("proxy")`, and theme/color/branding customization UI remains absent.

## Remaining risks

- en.json still has legacy `settingsAppearance` / `settingsAppearanceDescription` strings (“Theme…”); tabbar uses hardcoded **Interface** label, so live Settings chrome is correct without a full i18n sweep. Optional follow-up: update en (+ locales) subtitle/description copy.
- Pre-existing ElectronAPI autostart typing noise on AppearanceTab is unchanged (not introduced by this task).
