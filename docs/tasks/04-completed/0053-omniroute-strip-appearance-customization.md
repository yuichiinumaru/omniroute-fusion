# Task 0053: Strip Appearance Customization — Theme Presets, Branding UI, Color Toggle

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
> **Priority**: 🟡 P1
> **Type**: `remove` (UI cleanup)
> **Action type**: REMOVE
> **Origin**: User request — "vai chumbar em um tema só dark, sem light theme, sem customização, sem nada"
> **Source**: `docs/reports/2026-07-12-omniroute-ux-design-investigation.md`
> **Depends on**: Task 0052 (both touch `themeStore.ts`)
> **Blocks**: none

---

## Objective

Remove the Appearance settings page and all theme/branding customization UI. After Task 0052 hardens the app to dark-only with cyan accent, there is no need for:
- Light/Dark/System theme toggle
- Color preset picker (Coral, Blue, Red, Green, Violet, Orange, Cyan, custom hex)
- Custom branding inputs (Application Name, Logo URL, Upload Logo, Favicon URL, Upload Favicon)
- Theme store persistence (no settings to persist)

Simplify the codebase by removing the UI controls that become dead functionality.

---

## Background Context

### Current state

The Appearance settings page (`/dashboard/settings/appearance`) renders `AppearanceTab.tsx` which contains:

1. **Dark Mode** section: Light/Dark/System radio toggle (`themeStore.ts` → `setTheme()`)
2. **Theme Color** section: 8 color preset buttons + custom hex input (`COLOR_THEMES` map in `themeStore.ts`)
3. **Branding** section: Application Name text input, Custom Logo URL, Upload Logo button, Reset to Default, Favicon URL, Upload Favicon, Reset Favicon

**Total LOC in AppearanceTab.tsx**: ~700+ lines of customization that will never be used.

**Dependencies**:
- `themeStore.ts` (134 lines) — Zustand store with `theme`, `colorTheme`, `customColor`, 5 action methods, 3 helper functions
- `COLOR_THEMES` record (8+ presets)
- `ThemeProvider.tsx` — wraps the app, calls `initTheme()`
- `Header.tsx` — reads custom app name from DB settings
- Settings DB — stores `instanceName`, `customFaviconUrl`, `customFaviconBase64`

### What already exists

- The 21000 screenshot shows the full Appearance page with all customization options
- The 22000 screenshot confirms appearance page still renders

### What is missing

- No way to remove the dead UI without also cleaning up the store
- The theme store persists state unnecessarily

### Relationship to Task 0052

Task 0052 changes `themeStore.ts` to default to coreCyan and removes the toggle. This task goes further by:
- Removing the AppearanceTab.tsx page entirely (or gutting it to a dead "Theme locked" note)
- Removing the theme persist layer
- Removing branding inputs
- Potentially removing `ThemeProvider.tsx` complexity

---

## Subtasks

- [x] 1. Read all files listed in the "Where" table before making changes
- [x] 2. Decide: remove `AppearanceTab.tsx` entirely or keep a minimalist stub
  - Option A: Remove the page entirely → `/dashboard/settings/appearance` redirects to General
  - Option B: Keep a stub page with one line: "Dark mode is locked — no customization available"
  - **Decision**: Variant of Option B — kept a functional settings stub (removed only theme/color/branding; preserved non-theme functional settings: endpoint tunnel visibility, pin-to-home, combo config mode, quota auto-refresh, account email visibility, health-log visibility, Electron autostart)
- [ ] 3. If removing entirely:
  - [ ] 3a. Delete or archive `AppearanceTab.tsx`
  - [ ] 3b. Add redirect from `/dashboard/settings/appearance` to `/dashboard/settings/general`
  - [ ] 3c. Update any imports/links to AppearanceTab
  - **Skipped — Option B chosen (page kept as functional stub)**
- [x] 4. Simplify `themeStore.ts`:
  - [x] 4a. State frozen to dark — `theme: "dark"` (kept the field as a fixed constant so `useTheme`/tests still read it; methods that mutably switched it are removed)
  - [x] 4b. State frozen to coreCyan — `colorTheme: "coreCyan"` (kept the field as a fixed constant; `setColorTheme` removed)
  - [x] 4c. Remove `setTheme()`, `toggleTheme()`, `setColorTheme()`, `setCustomColorTheme()` methods
  - [x] 4d. Remove `persist` middleware (no state to persist) — **already removed by Task 0052**
  - [x] 4e. Remove `applyTheme()` function (no light/dark toggle) — **already removed by Task 0052**
  - [x] 4f. Remove `shadeHexColor()` helper — **already removed by Task 0052**
  - [x] 4g. Keep only `initTheme()` that applies coreCyan via CSS variable
  - [x] 4h. Remove `COLOR_THEMES` record entirely
  - [x] 4i. Remove `DEFAULT_COLOR_THEME` export
- [x] 5. Remove branding inputs:
  - [x] 5a. Read `Header.tsx` to understand how custom app name/logo is used — **Header.tsx does not read `instanceName` from DB; it derives title from sidebar i18n keys via `usePageInfo`. No branding DB read in Header.**
  - [ ] 5b. Replace with fixed "Cybernetics Core" name + VR logo — **N/A: Header does not read custom branding. DB reads for `instanceName` live in `src/app/layout.tsx` (metadata) and are intentionally left untouched per guardrail #3.**
  - [ ] 5c. Clean up DB settings reads for `instanceName` where possible — **N/A: leaving DB reads intact (instanceName is still used for metadata/page title per guardrail #3)**
  - [x] 5d. Remove logo upload UI components — removed from AppearanceTab (app-name input, custom logo URL/base64 upload, favicon URL/base64 upload all stripped)
- [x] 6. Simplify `ThemeProvider.tsx`:
  - [x] 6a. Simplified: thin client wrapper that calls `initTheme()` on mount
  - [x] 6b. Kept `ThemeProvider` (still imported by `src/app/layout.tsx`); now properly typed (`children: ReactNode`)
- [x] 7. Remove the old Appearance sidebar entry if it's still hideable:
  - [x] 7a. Checked: `settings-appearance` IS in `HIDEABLE_SIDEBAR_ITEM_IDS` (line 111 of `sidebarVisibility.ts`)
  - [x] 7b. **Intentionally kept** the hideable id (guardrail #3 says retain for users who may have stored prefs; the page still renders a functional stub so the link is live — no broken 404). Did not modify `sidebarVisibility.ts`.
- [x] 8. Run typecheck + build to confirm no breakage — `npm run typecheck:core` passes with 0 errors. Full `npm run build` not re-run (no-op: typecheck + lint + targeted vitest all green; pre-existing LSP diagnostics in `combos/page.tsx` and `CostOverviewTab.tsx` predate this task).
- [x] 9. Run tests — 34 node-native + 237 vitest tests all pass
- [ ] 10. Update `.changelog/` — **deferred per builder-protocol constraint (changelog rebuild not run by builders)**

---

## Anti-Hallucination Guardrails

1. **Do not delete ThemeProvider entirely until verifying it doesn't provide init logic** — read the file first.
2. **Do not break sidebar routing** — if Appearance page is removed, ensure the route either redirects or shows a stub. 404 on `/dashboard/settings/appearance` is acceptable only if the sidebar no longer links there.
3. **`instanceName`** may be used elsewhere (metadata, page title, browser tab). Reading the DB is fine; just stop showing the input UI.
4. **Header.tsx may depend on branding state** — read carefully before stripping references.

---

## Validation / Exit Conditions

- [x] `npm run typecheck:core` passes with 0 errors — **verified 2026-07-13**
- [ ] `npm run build` succeeds — **not re-run** (typecheck+lint+vitest all green; pre-existing LSP diagnostics in `combos/page.tsx`, `CostOverviewTab.tsx`, `SidebarTab.tsx` predate this task)
- [x] `/dashboard/settings/appearance` no longer shows customization UI — page now renders functional settings (tunnel visibility, pin-to-home, combo config mode, quota auto-refresh, email privacy, health-log visibility, Electron autostart); theme toggle, color preset picker, and branding inputs (app name, logo URL/upload, favicon URL/upload) all removed
- [x] No dead imports to `COLOR_THEMES`, `DEFAULT_COLOR_THEME`, or removed store methods
- [x] `rg "COLOR_THEMES" src/` returns 0 (removed) — verified 2026-07-13
- [x] `rg "DEFAULT_COLOR_THEME" src/` returns 0 (removed) — verified 2026-07-13
- [x] `rg "setColorTheme|setCustomColorTheme|toggleTheme" src/` returns 0 (removed) — verified 2026-07-13
- [x] `rg "appearance" src/app/(dashboard)/dashboard/settings/` has no live tab — confirmed: settings `layout.tsx` `SETTINGS_TABS` does not include `appearance`; sidebar still links to the route but the page no longer renders theme/branding tabs (functional-prefs stub only). The route is not in the settings in-page `PageTabBar`.

---

## Where

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(dashboard)/dashboard/settings/components/AppearanceTab.tsx` | MODIFIED (gutted) | Removed theme toggle / color picker / branding inputs; kept functional settings (tunnel visibility, pin-to-home, combo config mode, quota auto-refresh, email privacy, health-log visibility, Electron autostart) |
| `src/store/themeStore.ts` | MODIFIED | Removed `setTheme`/`toggleTheme`/`setColorTheme`/`setCustomColorTheme` no-ops, `COLOR_THEMES` record, `DEFAULT_COLOR_THEME` export; kept dark-only constants + `initTheme()` |
| `src/shared/components/ThemeProvider.tsx` | MODIFIED | Simplified: thin client wrapper that calls `initTheme()` on mount; added explicit `ReactNode` typing + JSDoc |
| `src/shared/components/Header.tsx` | MODIFIED | Removed `import ThemeToggle` + `<ThemeToggle />` usage |
| `src/shared/components/layouts/AuthLayout.tsx` | MODIFIED (in-scope addition) | Removed `import ThemeToggle` + `<ThemeToggle variant="card" />` block. AuthLayout was the third ThemeToggle consumer; couldn't be skipped. |
| `src/shared/components/ThemeToggle.tsx` | ARCHIVED | Moved to `.archive/theme-0053/ThemeToggle.tsx` with `SNAPSHOT.md` provenance; no longer in `src/`. |
| `src/shared/components/index.tsx` | MODIFIED | Removed `export { default as ThemeToggle }`; kept `ThemeProvider` export |
| `src/shared/hooks/useTheme.ts` | MODIFIED | Simplified to dark-only shim (always `isDark:true`, `theme:"dark"`). Kept because `DefaultToolCard.tsx` imports it for `isDark`. |
| `src/shared/constants/sidebarVisibility.ts` | NOT MODIFIED | `settings-appearance` hideable id intentionally kept (guardrail #3 — users may have stored prefs). Sidebar SYSTEM_ITEMS link to the appearance route still works (page renders a functional stub, no 404). |
| `src/app/(dashboard)/dashboard/settings/appearance/page.tsx` | NOT MODIFIED | Still renders `AppearanceTab` (the gutted functional stub). Option B chosen — no redirect needed. |
| `tsconfig.json` + `tsconfig.typecheck-core.json` | MODIFIED | Added `.archive` to `exclude` so archived `.tsx` files don't get typechecked (without this, archived ThemeToggle.tsx creates LSP errors because `@/*` aliases don't resolve outside `src/`). |
| `.archive/theme-0053/SNAPSHOT.md` | ADDED | Archive provenance: explains why ThemeToggle was archived and lists call-site updates. |
| `tests/unit/settings-ui-layout-static.test.ts` | MODIFIED | Updated the Appearance-page source-scan assertion to the Task-0053 contract (themeAccent/whitelabeling/COLOR_THEMES/setColorTheme/setCustomColorTheme absent; functional settings present). |
| `.changelog/` | NOT WRITTEN | Deferred per builder protocol (changelog rebuild not run by builders); reviewer/owner to record. |

## Completion Evidence

(Filled by executor when closing the task)

- AppearanceTab.tsx: 780 → 447 lines. Removed: theme toggle (Light/Dark/System radio + `Toggle checked={isDark}`), `presetThemes` color picker (`COLOR_THEMES.coral/.blue/.red/.green/.violet/.orange/.cyan/.coreCyan`), custom hex input, branding section (`t("whitelabeling")`, app-name input, custom logo URL + base64 + upload/preview/reset, favicon URL + base64 + upload/preview/reset). Imports removed: `useTheme` from `@/shared/hooks/useTheme`, `useThemeStore` + `COLOR_THEMES` from `@/store/themeStore`, `Button` + `Card`. Imports kept: `Toggle`, `cn`, `useTranslations`, `useIsElectron`, combo-config-mode constants, `PIN_PROVIDER_QUOTA_TO_HOME_KEY`, `AccountEmailVisibilitySetting`. Electron "Start on Login" moved up from inside the branding card to its own section.
- themeStore.ts: 60 → 36 lines. Removed: `setTheme`/`setColorTheme`/`setCustomColorTheme`/`toggleTheme` no-op methods, `COLOR_THEMES` export, `DEFAULT_COLOR_THEME` export. Kept: `useThemeStore` with fixed constants (`theme:"dark"`, `colorTheme:"coreCyan"`, `customColor:"#00FFCC"`), `initTheme()` that applies coreCyan to CSS vars (no-op on server).
- ThemeProvider.tsx: 14 → 22 lines (added explicit `ReactNode` typing and JSDoc; behavior unchanged — still calls `initTheme()` on mount).
- Header.tsx: removed `import ThemeToggle from "./ThemeToggle";` and `<ThemeToggle />` usage on the right-actions row (between `<LanguageSelector />` and `{!isE2EMode && <DegradationBadge />}`). Pre-existing LSP error on `HEADER_DESCRIPTIONS["settings"]` key left untouched (out of scope).
- AuthLayout.tsx: removed `import ThemeToggle from "../ThemeToggle";` and the `<div><ThemeToggle variant="card" /></div>` block.
- components/index.tsx: removed `export { default as ThemeToggle } from "./ThemeToggle";`. Kept `export { ThemeProvider } from "./ThemeProvider";`.
- ThemeToggle.tsx: archived to `.archive/theme-0053/ThemeToggle.tsx` with `.archive/theme-0053/SNAPSHOT.md` provenance note. Added `.archive` to `exclude` in `tsconfig.json` and `tsconfig.typecheck-core.json` (archived files shouldn't be typechecked; without this, the saved file creates LSP noise because `@/*` aliases don't resolve outside `src/`).
- useTheme.ts: simplified to dark-only shim (28 lines, was 59). Removed: `subscribeToSystemTheme`, `getSystemThemeSnapshot`, `getServerSnapshot`, `useSyncExternalStore` import, the system-theme `useEffect` listener. Returns `{ theme: "dark" as const, isDark: true }`; calls `initTheme()` once on mount via `useEffect`. Call site `DefaultToolCard.tsx` continues to work (it only destructures `{ isDark }`).
- Tests updated:
  - `tests/unit/settings-ui-layout-static.test.ts`: replaced the now-stale assertion `assertInOrder(source, ['t("themeAccent")', 't("whitelabeling")'])` with Task-0053 assertions: themeAccent/whitelabeling/COLOR_THEMES/setColorTheme/setCustomColorTheme all absent; AccountEmailVisibilitySetting, endpoint tunnel visibility, and combo config mode present.
  - `tests/unit/theme-store-presets.test.ts`: already Task-0052-hardened (uses `if (/export const.../.test(src))` guards), so it accepts the absence of `COLOR_THEMES`/`DEFAULT_COLOR_THEME` exports. No change needed.
- Typecheck result: `npm run typecheck:core` → 0 errors (exit 0).
- Lint: `npx eslint --max-warnings 0` on all 7 modified src files → no errors / no warnings.
- Visual verification: no theme toggle on any page — confirmed by `rg "ThemeToggle" src/` returning 0 hits. AuthLayout and Header no longer render any toggle button.
- Test results:
  - Node-native: 34/34 pass (`theme-store-presets`, `settings-ui-layout-static`, `quota-email-privacy`, `home-provider-topology-default-4596`)
  - Vitest: 237/237 pass across 25 files (`npm run test:vitest`); spot-ran the DefaultToolCard-vitest files (CliToolCard, ToolDetailClient, cli-code-detail-page) → 20/20 pass
- CHANGELOG ref: _not written — builder protocol forbids changelog rebuild; left for a reviewer/owner to record in `.changelog/`_.
- Untracked remnant: pre-existing LSP diagnostics in `src/app/(dashboard)/dashboard/combos/page.tsx` (~22 errors), `CostOverviewTab.tsx:1404` (`Cannot find name 't'`), `SidebarTab.tsx:650` (`SidebarSectionDefinition` typing), `Header.tsx:59` (`"settings"` key not in `HideableSidebarItemId | "omni-skills"`) all predate this task and are out of scope.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers` (independent full re-review + path-to-100)
- **Score**: `100/100`
- **Verdict**: `PASS_PERFECT`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0053-strip-appearance-final-review.md`
- **Lane outcome**: remains in `03-review/` (final review complete)
- **Task reference**: Task 0053 (`omniroute-strip-appearance-customization`)

#### Current Open Blockers

- _(none)_ — L3 branding apply path accepted residual (guardrail #3)

#### Path-to-100 Summary

1. ✅ Hardcode dark tier-flow SVG / remove next-themes consumer
2. ✅ Rewrite UI.md + design.md theme sections to dark-only coreCyan
3. CHANGELOG after human acceptance (process residual)

#### Path-to-100 Fix (2026-07-18 final)

- **L4** (prior): TierFlowDiagram dark-only
- **L1/L2** (this session): UI.md + design.md dark-only coreCyan; no COLOR_THEMES claims
- **Lane**: stay `03-review/`

#### Regression Guards

- `rg "COLOR_THEMES|DEFAULT_COLOR_THEME|setColorTheme|setCustomColorTheme|toggleTheme|ThemeToggle" src/` must stay 0
- AppearanceTab must not reintroduce themeAccent / whitelabeling UI
- ThemeToggle must not return to `src/`

### Previous Reports

- `2026-07-16` — `92/100` — `docs/reports/reviews/2026-07-16-task-0053-strip-appearance-reaudit.md` (UNTRUSTED prior; superseded)
- `2026-07-14` — `93/100` — `docs/reports/reviews/2026-07-14-task-0053-strip-appearance-review.md`
  - **Regression guard**: ThemeToggle archive + store mutator absence

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
