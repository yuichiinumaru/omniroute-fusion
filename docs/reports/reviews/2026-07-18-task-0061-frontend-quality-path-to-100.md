# Review Report: Task 0061 — Observe + Settings Small IA Gaps — 2026-07-18

## Review Lineage

- **Current task**: Task 0061 (`omniroute-observe-settings-small-ia-gaps`); live path at review start: `docs/tasks/02-doing/0061-omniroute-observe-settings-small-ia-gaps.md`
- **Previous reports read**:
  - Task Review Ledger entries (2026-07-18 gt-ts-expert **97/100**, gt-ts-engineer phantom-completion fix, 2026-07-14 historical 100 on weaker evidence)
  - No prior `docs/reports/reviews/*0061*` file on disk — ledger-only prior waves
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-18-task-0053-strip-appearance-final-review.md` — theme strip contract (do not reintroduce branding UI)
  - Task 0054 settings hub surface (shared `settingsHub` / PageTabBar) — fix only 0061 residuals
- **Review mode**: `path-to-100` (frontend-quality-reviewer; builder-authorized fix loop for 90–99)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept-completed` → move `02-doing` → `03-review`
- **Level**: Perfect (frontend IA contracts + a11y residuals closed with unit proof)

## Delta Summary

### Resolved Since Previous Review (gt-ts-expert 97)

- `RESOLVED`: Decorative Material icons in `ObserveHubSubnav` / `RoutingHubSubnav` lacked `aria-hidden` (double announcement vs PageTabBar). Fixed + test-locked.
- `RESOLVED`: Health page stacked Observe subnav side-by-side with refresh on `sm+`, diverging from Observe hub full-width chrome. Now full-width subnav first + action row.
- `RESOLVED`: Icon-only Health refresh had `title` only; now `aria-label` + focus ring + `type="button"`.
- `RESOLVED`: en.json `settingsAppearance*` still said Appearance / Theme / branding. English SSoT now **Interface** with functional description aligned to Header chrome.
- `RESOLVED`: Tests only weakly covered a11y / layout / en copy; 0061 + 0054 static tests extended.

### Persistent Findings

- none open for task exit conditions

### Regressions

- none

### New Findings

- none remaining after path-to-100

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP` (accepted non-blocker for 100): no live browser screenshot on :21000/:22000 (forbidden prod port; RAM-safe policy; static + unit contracts prove wiring). Optional smoke on :22000 remains operator-owned.
- `PERSISTENT` (out of task scope): non-`en` locales still carry legacy Appearance/Theme strings for the same keys. Tabbar label is hardcoded **Interface**; Header hardcodes Interface title/description. Full 42-locale sweep is a follow-up i18n campaign, not a 0061 exit blocker.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Medium (a11y) | Closed | Hub subnav icons missing `aria-hidden` | this review | `ObserveHubSubnav.tsx`, `RoutingHubSubnav.tsx` |
| F2 | RESOLVED | Medium (UI layout) | Closed | Health Observe chrome side-by-side with actions | this review | `health/page.tsx` layout |
| F3 | RESOLVED | Low–Med (a11y) | Closed | Refresh control name/focus | this review | `health/page.tsx` button |
| F4 | RESOLVED | Medium (IA copy) | Closed | en.json theme/Appearance residual | gt-ts-expert residual | `en.json` settingsAppearance* |
| F5 | SUPERSEDED | Low | Closed as non-blocker | Live browser proof | prior ledger | EXTERNAL_BLOCKER policy |
| F6 | SUPERSEDED | Low | Closed as non-blocker | `asSidebarTranslator` cast | gt-ts-expert −1 | documented SAFETY in `sidebarI18n.ts`; not introduced by 0061 |

## Exit Conditions Re-Verified

| Condition | Status | Proof |
|-----------|--------|-------|
| `/dashboard/health` discoverable | ✅ | `ObserveHubSubnav` Health link + CommandPalette `observeHubExtras` + hideable `health` id |
| Health mounts Observe topbar | ✅ | `<ObserveHubSubnav active="health" />` full-width first |
| Observe active state = Routing model | ✅ | `HUB_SUBNAV_ACTIVE_CLASS === "border border-primary/20 bg-primary/10 text-primary"` |
| Health not a log-stream tab | ✅ | `OBSERVE_SOURCES` excludes `health`; hub panels exhaustive switch |
| `/dashboard/logs/proxy` redirect | ✅ | `buildObserveHubPath("proxy")` unchanged |
| Settings appearance in tabbar as Interface | ✅ | `SETTINGS_TABS` value `appearance` / label `Interface`; `pathToTabValue` |
| No theme/branding UI return | ✅ | AppearanceTab strip assertions |
| typecheck:core | ✅ | exit 0 |

## Frontend Quality Rubric

| Area | Assessment |
|------|------------|
| Visual hierarchy | Observe subnav shared shell/active; Health no longer competes with refresh in one row |
| Motion discipline | `transition-all` only; no decorative motion |
| Layout resilience | `flex-wrap` subnav shell; Health column stack |
| Responsive | Subnav wraps; actions right-aligned below chrome |
| Keyboard / a11y | `aria-label` nav, `aria-current`, focus-visible rings, icon-only refresh named, decorative icons hidden |
| Performance | No new client weight beyond shared component already on Observe |
| Type/data safety | Prior TS exhaustiveness retained; settings path parse-don't-validate |

## Evidence Reviewed

### Source / tests

- `src/shared/components/ObserveHubSubnav.tsx`
- `src/shared/components/RoutingHubSubnav.tsx`
- `src/shared/constants/hubSubnavStyles.ts`
- `src/shared/constants/settingsHub.ts`
- `src/shared/constants/observeHub.ts`
- `src/shared/constants/sidebarVisibility.ts` (`HEALTH_NAV_ITEM`, primary budget)
- `src/app/(dashboard)/dashboard/health/page.tsx`
- `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx`
- `src/app/(dashboard)/dashboard/settings/layout.tsx`
- `src/app/(dashboard)/dashboard/settings/components/AppearanceTab.tsx`
- `src/shared/components/Header.tsx` (Interface hardcode path)
- `src/shared/components/CommandPalette.tsx`
- `src/shared/components/PageTabBar.tsx`
- `src/i18n/messages/en.json`
- `tests/unit/ui/observe-settings-ia-gaps-0061.test.ts`
- `tests/unit/ui/settings-hub-tabnav-0054.test.ts`
- `tests/unit/ui/observe-hub-sidebar.test.ts`
- `tests/unit/settings-ui-layout-static.test.ts`
- `tests/unit/ui/page-tab-bar.test.tsx`

### Runtime wiring

```
/dashboard/activity → ObserveHubClient → <ObserveHubSubnav active={source}>
/dashboard/health   → HealthPage      → <ObserveHubSubnav active="health">  (full-width)
/dashboard/settings/* → settings/layout PageTabBar subnav ← SETTINGS_TABS (Interface)
/dashboard/logs/proxy → buildObserveHubPath("proxy")
CommandPalette → observeHubExtras → /dashboard/health
```

### Commands run

```text
node --import tsx/esm --test \
  tests/unit/ui/settings-hub-tabnav-0054.test.ts \
  tests/unit/ui/observe-settings-ia-gaps-0061.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/settings-ui-layout-static.test.ts
→ 54/54 pass

npx vitest run tests/unit/ui/page-tab-bar.test.tsx
→ 8/8 pass

npm run typecheck:core
→ exit 0
```

### Commands not run

- Live browser on :21000 (forbidden prod) / :22000 (optional; RAM policy)
- Full `npm run test:unit` (scoped surface proven; not required for this UI IA task)

## Path To 100

**Completed in this review (no remaining open path):**

1. `aria-hidden` on Observe + Routing hub decorative icons — done.
2. Health full-width Observe chrome + accessible refresh — done.
3. en.json Interface copy aligned with Header — done.
4. Unit tests for a11y, layout stacking, Header/en contracts — done.

Optional follow-up (non-blocking):

- Sync remaining locales’ `settingsAppearance*` strings to Interface meaning.
- Operator visual smoke on :22000 after next prod-safe rebuild.

## Task Ledger Patch Suggestion

```markdown
### 2026-07-18 — gt-frontend-quality-reviewer (path-to-100 → 100)

- **Score: 100/100 — Perfect**
- Full report: `docs/reports/reviews/2026-07-18-task-0061-frontend-quality-path-to-100.md`
- Closed residuals: hub icon a11y, Health chrome layout, refresh name, en Interface copy, stronger tests.
- Lane: moved to `03-review/`.
```

## Files Touched In Path-To-100

| File | Change |
|------|--------|
| `src/shared/components/ObserveHubSubnav.tsx` | `aria-hidden` on icons |
| `src/shared/components/RoutingHubSubnav.tsx` | `aria-hidden` on icons (shared visual system) |
| `src/app/(dashboard)/dashboard/health/page.tsx` | full-width Observe chrome; refresh a11y/focus |
| `src/i18n/messages/en.json` | Interface + functional description/subtitle |
| `tests/unit/ui/observe-settings-ia-gaps-0061.test.ts` | a11y/layout/Header/en contracts |
| `tests/unit/ui/settings-hub-tabnav-0054.test.ts` | shared hub icon a11y assertion |
