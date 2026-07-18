# Task 0061: Observe + Settings Small IA Gaps — Health Link and Appearance Tab Decision

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🟢 P2
> **Type**: `fix` (small information architecture gaps)
> **Action type**: EXPOSE + UX_VIS
> **Origin**: User localhost:21000 vs 22000 IA sweep (2026-07-14)
> **Source evidence**: Observe/Testing/Settings read-only investigation packet
> **Depends on**: Task 0053 (appearance stripped), Task 0054 (settings tabs)
> **Blocks**: none

---

## Reopen Addendum — Phantom Completion Fix Loop (2026-07-15)

User runtime review found Observe stream tabs are fine, but Health loses the Observe topbar when opened. The earlier decision kept Health as a separate dashboard page rather than a log-stream tab; that is acceptable, but the route still needs the same Observe navigation/topbar for structural unity.

**Reference visual contract**: `src/shared/components/RoutingHubSubnav.tsx`

Required active-state pattern for any Observe/Health subnav work:

```tsx
"border border-primary/20 bg-primary/10 text-primary"
```

### Additional subtasks

- [x] 7. Keep Health as a separate page if desired, but mount the Observe topbar/navigation on `/dashboard/health` so users can move back to Activity/Logs/Audit/Health without sidebar.
- [x] 8. Prefer a shared Observe topbar component over one-off link markup; include Activity, Logs, Outbound Logs, Console Logs, Audit, MCP Audit, A2A Audit, Health.
- [x] 9. Restyle Observe topbar/navigation to match the RoutingHubSubnav visual system if touching it; avoid a standalone Health button that visually diverges.
- [x] 10. Preserve `/dashboard/logs/proxy` redirect and existing `?source=` Observe behavior.
- [x] 11. Add/update tests asserting `/dashboard/health` includes Observe navigation/topbar contract.
- [x] 12. Do not modify Dashboard, Analytics, or Operations in this fix loop.

### Additional exit conditions

- [x] Health page shows the same Observe topbar/navigation as Activity/Logs/Audit pages.
- [x] Observe navigation visually follows the approved Routing topbar selected-state model.

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

### Phantom-completion fix loop evidence (2026-07-18) — gt-ts-engineer

**What was weak before:** tests only `includes("ObserveHubSubnav")` / string presence; no assertion that Health mounts `active="health"`; active/shell class strings were copy-pasted (could drift from RoutingHubSubnav); Settings Interface tab lived only as layout literals without pure `pathToTabValue` proof.

**What landed (this loop + retained prior work):**

| Area | Implementation | Proof |
|------|----------------|-------|
| Shared Observe topbar | `src/shared/components/ObserveHubSubnav.tsx` — Activity, Request Logs, Outbound Logs, Console, Audit, MCP Audit, A2A Audit, **Health** | 8 `id:` links + `data-observe-health-link` |
| Routing visual SSoT | `hubSubnavStyles.ts` → Observe + Routing + PageTabBar subnav | `HUB_SUBNAV_ACTIVE_CLASS === "border border-primary/20 bg-primary/10 text-primary"` |
| Health page chrome | `health/page.tsx` mounts `<ObserveHubSubnav active="health" />` | regex unit test |
| Activity hub | `ObserveHubClient` mounts `<ObserveHubSubnav active={activeSource} />` — Health is **not** a stream source | `OBSERVE_SOURCES` excludes health |
| Interface tab (Option B) | `settingsHub.ts` value `appearance` / label `Interface` / icon `display_settings` | `pathToTabValue("/dashboard/settings/appearance") === "appearance"` |
| Proxy redirect | unchanged `buildObserveHubPath("proxy")` | still green |
| Command palette Health | `observeHubExtras` | still green |
| Primary nav budget | Health **not** in `PRIMARY_SIDEBAR_ITEMS` (9 leaves) | unit test |

**Commands run (fresh):**
```text
node --import tsx/esm --test \
  tests/unit/ui/settings-hub-tabnav-0054.test.ts \
  tests/unit/ui/observe-settings-ia-gaps-0061.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/settings-ui-layout-static.test.ts
→ 53/53 pass

npx vitest run tests/unit/ui/page-tab-bar.test.tsx
→ 8/8 pass

npm run typecheck:core
→ exit 0
```

**Sabotage table:**
| Break | Expected fail | Result |
|-------|---------------|--------|
| Replace Health page `ObserveHubSubnav` with a stub div | `Health page mounts ObserveHubSubnav with active=health` | SABOTAGE_OK then restored |
| Force `pathToTabValue` → always general | 0054 path mapping suite fails (Interface highlight) | SABOTAGE_OK then restored |

**Scope discipline:** no Dashboard / Analytics / Operations edits; no PRIMARY_SIDEBAR_ITEMS structure change beyond prior subtitle copy (`Logs · audit · health` / `System · interface · network`); theme/color/branding UI not reintroduced.

**Not claimed:** live browser screenshot on :21000/:22000.

## Changelog Draft (append after review)

```markdown
## [Unreleased] - Observe Health chrome + Settings Interface tab (Task 0061)
### Changed
- `/dashboard/health` mounts shared ObserveHubSubnav (Routing-style active state) for Activity/Logs/Audit/Health movement without sidebar.
- Settings appearance route labeled **Interface**; pure `settingsHub` SSoT highlights it correctly.
### Fixed
- Phantom completion: Health Observe chrome + Interface tab contracts unit-proven with sabotage gate.
**Author**: builders (Task 0061)
```

## Files modified (this fix loop)

| File | Change |
|------|--------|
| `src/shared/constants/hubSubnavStyles.ts` | **CREATE** shared active/shell classes |
| `src/shared/constants/settingsHub.ts` | **CREATE** Interface tab SSoT |
| `src/shared/components/ObserveHubSubnav.tsx` | consume hubSubnavStyles |
| `src/shared/components/RoutingHubSubnav.tsx` | consume hubSubnavStyles |
| `src/shared/components/PageTabBar.tsx` | subnav uses hubSubnavStyles |
| `src/app/(dashboard)/dashboard/settings/layout.tsx` | settingsHub SSoT |
| `tests/unit/ui/observe-settings-ia-gaps-0061.test.ts` | strengthened Health chrome + style contracts |
| `tests/unit/ui/settings-hub-tabnav-0054.test.ts` | Interface + subnav shared with 0054 |
| `tests/unit/settings-ui-layout-static.test.ts` | SSoT import assertions |

*(Prior loop files retained: HEALTH_NAV_ITEM, ObserveHubClient, CommandPalette observeHubExtras, health page mount — verified still present.)*

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `gt-frontend-quality-reviewer` (agentID=`reviewers` return)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0061-observe-settings-ia-return-review.md`
- **Lane outcome**: stay `03-review/`
- **Task reference**: Task 0061 (`omniroute-observe-settings-small-ia-gaps`)
- **Prior**: `docs/reports/reviews/2026-07-18-task-0061-frontend-quality-path-to-100.md`

#### Return-review live proof

- Settings **Interface** tab + no theme UI: live OK on `:22000`
- Proxy → activity?source=proxy: live OK
- Health Observe topbar: **missing on Docker image** (present in workspace + unit); redeploy residual

#### Current Open Blockers

- none for workspace exit conditions
- **EXTERNAL**: redeploy to `:22000` for Health Observe chrome live parity

#### Previous Reports

- Return: `2026-07-18-task-0061-observe-settings-ia-return-review.md` (S=100)
- Path-to-100: `2026-07-18-task-0061-frontend-quality-path-to-100.md` (S=100)
- Task ledger: 2026-07-18 gt-ts-expert **97/100** (Elite; residuals en/a11y/screenshot)
- Task ledger: 2026-07-18 gt-ts-engineer phantom-completion fix (sabotage OK)
- Task ledger: 2026-07-14 historical 100 on weaker string-include evidence (reopened)

### 2026-07-18 — gt-ts-expert (path-to-100)

- **Score: 97/100 — Elite** (Health Observe chrome + Interface tab + type exhaustiveness).
- Hardened: `ObserveHubActive = ObserveSource | "health"`; LINKS `as const satisfies` + bidirectional exhaustiveness type; `renderObserveSourcePanel` `never` default; `isObserveSource` + Set for normalize; Interface tab via settingsHub literal SSoT.
- Evidence: 54/54 unit, 8/8 vitest, `typecheck:core` exit 0.
- Residuals (−3): no live browser screenshot; en.json Appearance/Theme strings optional; `asSidebarTranslator` cast remains (documented SAFETY in `sidebarI18n.ts`, shared helper).
- Status remained in `02-doing/` at that time.

### 2026-07-18 — gt-ts-engineer (phantom-completion fix)

- Status remained in `02-doing/` (did not self-promote).
- Health Observe topbar contract + Interface settings tab unit-proven; sabotage gate exercised.
- Appearance decision remains Option B with 0053 theme strip.

### 2026-07-14 — prior TS reviewer acceptance (historical)

- Earlier 100/100 was based on weaker string-include evidence; reopened as phantom-completion after runtime review (Health lost Observe topbar concern / incomplete contracts). This loop hardens the chrome + tests.

## Remaining risks

- Non-`en` locales may still show legacy Appearance/Theme for `settingsAppearance*` keys; tabbar + Header English chrome are correct. Optional follow-up: i18n campaign for remaining locales.
- Pre-existing ElectronAPI autostart typing noise on AppearanceTab is unchanged (not introduced by this task).
- Live browser smoke on :22000 remains optional operator verification (not claimed).

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
