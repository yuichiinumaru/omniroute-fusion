# Task 0056: Dashboard IA Consolidation — Home Rename, Topbar, Cache Flatten

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🟡 P1
> **Type**: `refactor` (information architecture)
> **Action type**: UX_VIS + EXPOSE
> **Origin**: User localhost:21000 vs 22000 IA sweep (2026-07-14)
> **Source evidence**: Sidebar inventory and targeted read-only investigation
> **Depends on**: Task 0052 (theme), Task 0054 (settings tabs)
> **Blocks**: none

---

## Objective

Turn `/home` into a clearer **Dashboard** hub. Rename the sidebar leaf from **Home** to **Dashboard**, add a dashboard-level topbar/subnav that exposes high-level dashboard surfaces, and flatten `/dashboard/cache` so Prompt Cache, Semantic Cache, and Reasoning Replay render on one page instead of behind an internal mini-topbar.

---

## Current Evidence

### Sidebar label

`src/shared/constants/sidebarVisibility.ts` currently defines the primary leaf as:

```ts
id: "home"
href: "/home"
labelFallback: "Home"
```

Evidence: `PRIMARY_SIDEBAR_ITEMS` around lines 789–797.

### Home page

`src/app/(dashboard)/home/page.tsx` is a server component that:
- redirects to onboarding if setup is incomplete
- renders `BootstrapBanner`, `AutoRoutingBanner`, and `HomePageClient`

No dashboard-level topbar exists there.

### Analytics / Costs / Cache

- Analytics already has a `PageTabBar` inside `src/app/(dashboard)/dashboard/analytics/page.tsx` with Overview, Evals, Search, Utilization, Combo Health, Compression, Route Trace.
- Costs does **not** have a PageTabBar: `src/app/(dashboard)/dashboard/costs/page.tsx` just renders `<CostOverviewTab />`.
- Cache page has internal state:
  ```ts
  type CacheView = "prompt" | "semantic" | "reasoning";
  const [activeView, setActiveView] = useState<CacheView>("prompt");
  ```
  and conditionally renders Prompt, Semantic, Reasoning sections. User wants all three visible on one page.

### Routes verified to exist

- `/home`
- `/dashboard/analytics`
- `/dashboard/analytics/combo-health`
- `/dashboard/analytics/compression`
- `/dashboard/analytics/evals`
- `/dashboard/analytics/search`
- `/dashboard/analytics/utilization`
- `/dashboard/costs`
- `/dashboard/costs/budget`
- `/dashboard/costs/pricing`
- `/dashboard/costs/quota-share`
- `/dashboard/tokens`
- `/dashboard/leaderboard`
- `/dashboard/profile`
- `/dashboard/cache`

---

## Target UX

Dashboard topbar should expose:

```txt
/home
/dashboard/analytics
/dashboard/analytics/combo-health
/dashboard/analytics/compression
/dashboard/analytics/evals
/dashboard/analytics/search
/dashboard/analytics/utilization
/dashboard/costs
/dashboard/costs/budget
/dashboard/costs/pricing
/dashboard/costs/quota-share
/dashboard/tokens
/dashboard/leaderboard
/dashboard/profile
/dashboard/cache
```

`/dashboard/cache` should show these sections on one page:

1. Prompt Cache (Provider-Side)
2. Semantic Cache
3. Reasoning Replay

No internal cache topbar/segmented switcher should be needed after flattening.

---

## Subtasks

- [x] 1. Read all files in the Where table before modifying.
- [x] 2. Rename sidebar `home` label from `Home` to `Dashboard`.
  - [x] 2a. Check i18n key `home` before changing fallback only.
  - [x] 2b. Decide whether to add/update i18n label or only `labelFallback`.
    - Decision: switch `PRIMARY_SIDEBAR_ITEMS` home entry to `i18nKey: "dashboard"` + `labelFallback: "Dashboard"`. The `sidebar.dashboard` key already exists in all 42 locales (en: "Dashboard"). No locale file edits required. `id` stays `"home"` for hideable-prefs stability.
- [x] 3. Design Dashboard topbar/subnav.
  - [x] 3a. Prefer `PageTabBar` if tabs fit; otherwise use link strip / grouped subnav.
    - Decision: cross-route link strip (`DashboardTopbar`) — PageTabBar is for in-page `?tab=` switching; dashboard surfaces are separate routes.
  - [x] 3b. Do not duplicate Analytics internal tabs unnecessarily if topbar becomes too dense.
    - Top-level only: Dashboard, Analytics, Costs, Cache, Tokens, Leaderboard, Profile. Analytics sub-tabs remain on the Analytics page.
  - [x] 3c. Ensure route links are direct and bookmarkable.
- [x] 4. Add Dashboard topbar to `/home` / Dashboard hub.
  - [x] 4a. Read `HomePageClient` and layout context.
  - [x] 4b. Insert topbar without breaking onboarding redirect.
    - Topbar rendered in `home/page.tsx` after the setupComplete redirect check.
- [x] 5. Decide whether Costs should get its own `PageTabBar` or be handled only from Dashboard topbar.
  - [x] 5a. If adding Costs tabs, include Overview, Budget, Pricing, Quota Share.
    - Decision: add `CostsSubnav` link strip (not PageTabBar) on all four costs routes so sub-pages remain direct URLs.
  - [x] 5b. Preserve existing routes and redirects.
- [x] 6. Flatten `/dashboard/cache`.
  - [x] 6a. Remove activeView/conditional topbar behavior.
  - [x] 6b. Render Prompt Cache section first.
  - [x] 6c. Render Semantic Cache section below Prompt.
  - [x] 6d. Render Reasoning Replay section below Semantic.
  - [x] 6e. Preserve loading/empty/error states.
- [x] 7. Run typecheck and relevant tests.
  - `npm run typecheck:core` — exit 0.
- [ ] 8. Rebuild production once after the full IA wave, not after every task.
- [ ] 9. Update changelog after reviewer acceptance.

---

## Anti-Hallucination Guardrails

1. Do **not** remove `/home` route; it is the dashboard entry and onboarding redirect point.
2. Do **not** delete Analytics chart colors; charts are exempt from monochrome cyan rule.
3. Do **not** make the topbar so dense it becomes unusable on narrow layouts; use responsive wrapping or grouped links.
4. Do **not** break the existing `/dashboard/analytics/*` redirect pages.
5. Do **not** remove cache functionality while flattening.

---

## Validation / Exit Conditions

- [x] Sidebar shows **Dashboard**, not Home.
- [x] `/home` still redirects to onboarding when setup incomplete.
- [x] Dashboard topbar/subnav exposes the target routes or an intentionally grouped equivalent.
- [x] `/dashboard/cache` displays Prompt Cache, Semantic Cache, and Reasoning Replay together.
- [x] No internal cache view switcher remains unless kept as optional anchor navigation.
- [x] `npm run typecheck:core` passes.
- [ ] Relevant route smoke checks return 200/307 as expected. (deferred — prod rebuild is wave-level; no local server required for this task)

---

## Where

| File | Action | Purpose |
|------|--------|---------|
| `src/shared/constants/sidebarVisibility.ts` | MODIFY | Rename Home label: i18nKey `dashboard` + labelFallback `Dashboard` |
| `src/app/(dashboard)/home/page.tsx` | MODIFY | Insert `DashboardTopbar` after onboarding redirect |
| `src/app/(dashboard)/home/DashboardTopbar.tsx` | CREATE | Link-strip subnav for high-level dashboard surfaces |
| `src/app/(dashboard)/dashboard/HomePageClient.tsx` | READ | Confirmed insertion point; topbar lives in page.tsx instead |
| `src/app/(dashboard)/dashboard/analytics/page.tsx` | READ | PageTabBar reference pattern |
| `src/app/(dashboard)/dashboard/costs/page.tsx` | MODIFY | Wrap with CostsSubnav |
| `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` | CREATE | Costs Overview/Budget/Pricing/Quota Share link strip |
| `src/app/(dashboard)/dashboard/costs/budget/page.tsx` | MODIFY | Wrap with CostsSubnav |
| `src/app/(dashboard)/dashboard/costs/pricing/page.tsx` | MODIFY | Wrap with CostsSubnav |
| `src/app/(dashboard)/dashboard/costs/quota-share/page.tsx` | MODIFY | Wrap with CostsSubnav |
| `src/app/(dashboard)/dashboard/cache/page.tsx` | MODIFY | Flatten cache sections; remove activeView switcher |
| `.changelog/` | APPEND AFTER REVIEW | Record Dashboard IA consolidation |

## Completion Evidence

- Sidebar label diff:
  - `PRIMARY_SIDEBAR_ITEMS[0]`: `i18nKey: "home"` → `"dashboard"`, `labelFallback: "Home"` → `"Dashboard"`.
  - `id` remains `"home"`; href remains `/home`. Uses existing `sidebar.dashboard` i18n key (all 42 locales).
- Dashboard topbar:
  - New `src/app/(dashboard)/home/DashboardTopbar.tsx` link strip on `/home`.
  - Links: `/home`, `/dashboard/analytics`, `/dashboard/costs`, `/dashboard/cache`, `/dashboard/tokens`, `/dashboard/leaderboard`, `/dashboard/profile`.
  - Does not nest Analytics internal tabs (Overview/Evals/… stay on Analytics page).
- Costs subnav:
  - New `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` on overview/budget/pricing/quota-share.
  - Existing routes preserved as direct navigable URLs.
- Cache flattened:
  - Removed `CacheView` type, `activeView` state, and segmented switcher buttons.
  - Prompt Cache → Semantic Cache → Reasoning Replay render stacked on one page.
  - Loading skeleton + empty/unavailable states preserved.
- Typecheck result:
  - `npm run typecheck:core` → exit 0 (pass).
- Route smoke output:
  - Not run (no local server; wave-level rebuild deferred per subtask 8).
- Changelog ref:
  - Draft only (do not write `.changelog/` until reviewer acceptance).

### Path-to-100 residual (2026-07-18) — review F1 regression suite

- **Finding closed**: F1 MEDIUM — missing regression tests for DashboardTopbar / CostsSubnav / cache flatten / sidebar `i18nKey`.
- **Test file**: `tests/unit/ui/dashboard-ia-consolidation-0056.test.ts` (CREATE)
- **Assertions**:
  1. `PRIMARY_SIDEBAR_ITEMS` home: `id === "home"`, `href === "/home"`, `i18nKey === "dashboard"`, `labelFallback === "Dashboard"`
  2. `DashboardTopbar.tsx` includes the seven hub hrefs; no Analytics deep tabs
  3. `home/page.tsx` imports/renders `DashboardTopbar` after `setupComplete` onboarding redirect
  4. All four costs pages render `CostsSubnav`; subnav lists Overview/Budget/Pricing/Quota Share
  5. `cache/page.tsx` has no `activeView`/`CacheView`/`setActiveView`; Prompt → Semantic → Reasoning stack order
- **Command** (scoped 0056+0060+i18n, 2026-07-18 TS expert pass):
  ```txt
  node --import tsx/esm --test \
    tests/unit/ui/dashboard-ia-consolidation-0056.test.ts \
    tests/unit/ui/testing-hub-discoverability-0060.test.ts \
    tests/unit/ui/sidebar-i18n-helper.test.ts
  → 21 pass, 0 fail
  npm run typecheck:core → exit 0
  ```
- **TS expert path-to-100 (2026-07-18, gt-ts-expert)**:
  - Shared `src/shared/utils/sidebarI18n.ts` (`SidebarTranslator`, `sidebarText`, SAFETY-documented `asSidebarTranslator`)
  - `DashboardTopbar` / `CostsSubnav` aligned to `hubSubnavStyles` + `as const satisfies`
  - Exact-match active-state assertions for `/home` and costs overview
  - Self-score after F1 + purity: **97/100** (residuals: F2 smoke deferred, F3 hub-only by design, F4 dead `CORE_PULSE_ITEMS`)

### Files modified / created (path-to-100 session)

| Path | Action |
|------|--------|
| `tests/unit/ui/dashboard-ia-consolidation-0056.test.ts` | CREATE / strengthen |
| `src/shared/utils/sidebarI18n.ts` | CREATE |
| `src/app/(dashboard)/home/DashboardTopbar.tsx` | MODIFY (hub styles + shared i18n) |
| `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` | MODIFY (hub styles + shared i18n) |
| `src/shared/components/ObserveHubSubnav.tsx` | MODIFY (consume shared i18n) |
| `tests/unit/ui/sidebar-i18n-helper.test.ts` | CREATE |

## Review Ledger

### 2026-07-18 — independent return review (agentID=reviewers)

- **Score: 100/100 — ACCEPTED_100** (supersedes historical 88 F1 gap)
- **Report**: [`docs/reports/reviews/2026-07-18-task-0056-dashboard-ia-consolidation-return-review.md`](../../reports/reviews/2026-07-18-task-0056-dashboard-ia-consolidation-return-review.md)
- **F1 closed**: `tests/unit/ui/dashboard-ia-consolidation-0056.test.ts` 6/6; cache `activeView` sabotage OK; sidebar/topbar/costs/cache contracts live in source.
- Live route smoke still EXTERNAL/deferred (task F2). **Lane**: stay `03-review` — do not demote to `02-doing`.


> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0056-dashboard-ia-consolidation-frontend-review.md`
- **Lane outcome**: moved to `03-review/` (S=100)
- **Task reference**: Task 0056 (`omniroute-dashboard-ia-consolidation`)

#### Current Open Blockers

- _(none)_ for task scope
- F2 route smoke still deferred (task-allowed residual; wave-level **22000** only)
- Changelog draft-only until human acceptance

#### Path-to-100 Summary

1. ✅ F1: `dashboard-ia-consolidation-0056.test.ts` covering sidebar i18nKey, topbar, costs subnav wire, cache flatten
2. ✅ TS purity: shared `sidebarI18n` + hub subnav style contract on Dashboard/Costs strips
3. ✅ Re-review 2026-07-18: **100/100** — F1/F4 closed; F2/F3 accepted residual
4. Optional: wave-level smoke on port **22000** after rebuild
5. Publish changelog after human acceptance

### Previous Reports

- `docs/reports/reviews/2026-07-18-task-0056-dashboard-ia-consolidation-frontend-review.md` (S=100)
- `docs/reports/reviews/2026-07-14-task-0056-dashboard-ia-review.md` (S=88)

## Changelog Draft (for reviewer; do not apply yet)

```markdown
## [2026-07-14] - Dashboard IA consolidation (Home → Dashboard, topbar, cache flatten)
### Changed
- Sidebar primary leaf label: Home → Dashboard (`i18nKey: "dashboard"`, fallback "Dashboard"); route `/home` unchanged
- `/home` gains a high-level Dashboard link-strip subnav (Analytics, Costs, Cache, Tokens, Leaderboard, Profile)
- Costs pages gain Overview / Budget / Pricing / Quota Share link-strip subnav (routes preserved)
- `/dashboard/cache` flattens Prompt Cache + Semantic Cache + Reasoning Replay into one stacked page (internal view switcher removed)
- Regression suite: tests/unit/ui/dashboard-ia-consolidation-0056.test.ts (F1 path-to-100, 2026-07-18)
**Author**: builder (Task 0056)
```

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
