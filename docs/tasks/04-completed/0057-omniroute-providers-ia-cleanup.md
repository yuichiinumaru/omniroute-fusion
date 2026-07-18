# Task 0057: Providers IA Cleanup — Remove Redundancy, Sort, Grid/List, Topbar

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🔴 P0
> **Type**: `refactor` (information architecture + UX)
> **Action type**: UX_VIS + EXPOSE
> **Origin**: User localhost:21000 vs 22000 IA sweep (2026-07-14)
> **Source evidence**: Providers read-only investigation packet
> **Depends on**: Task 0052 (theme), Task 0055 (visual contrast fixes recommended first or parallel)
> **Blocks**: none

---

## Reopen Addendum — Phantom Completion Fix Loop (2026-07-15)

User runtime review found the Providers topbar exists only on `/dashboard/providers`; peer provider routes lose it. This is phantom completion because the task promised a Providers topbar exposing adjacent provider/service/quota/runtime surfaces, but did not require persistent mounting across those surfaces. The topbar also uses a different active visual system than the approved Routing topbar.

**Reference visual contract**: `src/shared/components/RoutingHubSubnav.tsx`

Required active-state pattern:

```tsx
"border border-primary/20 bg-primary/10 text-primary"
```

Required persistent route set:

```txt
/dashboard/providers
/dashboard/provider-stats
/dashboard/providers/services
/dashboard/quota
/dashboard/free-provider-rankings
/dashboard/free-tiers
/dashboard/runtime
```

### Additional subtasks

- [x] 10. Make the Providers topbar persistent across all peer routes listed above (layout wrapper preferred if practical; otherwise mount explicitly on each page).
- [x] 11. Restyle `ProvidersTopBar` to match `RoutingHubSubnav` shell/active state; no `bg-primary text-white` active item.
- [x] 12. Ensure active state works on every peer route, including `/dashboard/providers/services` nested path.
- [x] 13. Add/update static route tests asserting all peer provider pages mount or import/use the Providers topbar contract.
- [x] 14. Keep existing deep links and page content intact; this fix is navigation/visual unity only.
- [x] 15. Do not modify Dashboard, Analytics, or Operations in this fix loop.

### Additional exit conditions

- [x] Providers, Stats, Services, Quota, Rankings, Free Tiers, and Runtime all show the same Providers topbar.
- [x] Providers topbar visually matches the approved Routing topbar selected-state model.

---

## Objective

Clean up the Providers page IA. Remove redundant onboarding/free-tier sections, separate **view modes** from **filters**, add useful sorting, implement a real one-row-per-provider List view, and add a Providers topbar exposing adjacent provider/service/quota/runtime surfaces.

---

## Current Evidence

Main implementation is monolithic:

```txt
src/app/(dashboard)/dashboard/providers/page.tsx (~1925 lines)
```

### Redundant sections

- Marketing onboarding block exists around lines 827–856:
  - "Add your first provider"
  - "Connect an AI provider..."
  - Provider Onboarding Wizard
  - Learn more
- Free Tier Providers section exists around lines 1206–1253.
- Free is already a filter chip in `ProviderSummaryCard.tsx`, so the Free Tier section duplicates the same discovery path.

### Current mixed controls

`ProviderDisplayModeControl.tsx` currently exposes:

```ts
ProviderDisplayMode = "all" | "configured" | "compact"
```

Problems:
- `All` is really Grid view.
- `Compact` is really a compact grid, not a true list.
- `Configured` is a filter, not a view mode.

### Existing helper logic

- `providerPageUtils.ts` already has name sorting (`sortProviderEntriesByName`).
- Provider entries include stats (`ProviderEntry.stats.total`) that can support sort-by-accounts/keys.
- No sort-by-accounts UI exists.
- No `ProviderListRow` or one-provider-per-row component exists.

### Topbar target routes exist

All target topbar routes exist:

```txt
/dashboard/provider-stats
/dashboard/providers/services
/dashboard/quota
/dashboard/free-provider-rankings
/dashboard/free-tiers
/dashboard/runtime
```

---

## Target UX

### Remove redundant sections

Remove:
1. Top marketing onboarding block.
2. Dedicated "Free Tier Providers" section.

Keep:
- Provider Onboarding Wizard button if useful, but place it compactly near controls (already appears next to Compact in current UI).
- Free filter chip.

### Controls should become coherent

Top controls should separate these concepts:

#### Search
- Search Providers
- Search by Model

#### View mode
- **Grid** — current card grid default
- **List** — true compact list, one provider per row

#### Filters
- All / Configured / Free / category filters / service-kind filters

#### Sort
- A-Z
- Accounts/Keys count descending (providers with most configured accounts first)

### Providers topbar

Add topbar/subnav links:

```txt
/dashboard/provider-stats
/dashboard/providers/services
/dashboard/quota
/dashboard/free-provider-rankings
/dashboard/free-tiers
/dashboard/runtime
```

---

## Subtasks

- [x] 1. Read all files in the Where table before modifying.
- [x] 2. Remove top marketing onboarding block.
  - [x] 2a. Delete or disable `showFirstProviderHint` rendering.
  - [x] 2b. Keep Onboarding Wizard affordance in compact control area if still useful.
- [x] 3. Remove Free Tier Providers section.
  - [x] 3a. Remove section rendering.
  - [x] 3b. Keep Free as filter chip.
  - [x] 3c. Rework `showSection("free")` logic so Free works as filter, not standalone section.
- [x] 4. Redesign view mode controls.
  - [x] 4a. Change `ProviderDisplayMode` from `all/configured/compact` to `grid/list` or compatible transitional form.
  - [x] 4b. Rename UI labels: All → Grid, Compact → List.
  - [x] 4c. Move Configured out of display mode control into filter row.
- [x] 5. Implement real List view.
  - [x] 5a. Create `ProviderListRow.tsx` or equivalent row layout.
  - [x] 5b. One provider per row.
  - [x] 5c. Show provider name, configured account count, service badges, enabled status, and primary action.
  - [x] 5d. Ensure list view works well on vertical monitors.
- [x] 6. Add sorting.
  - [x] 6a. Add sort state (`az` / `accounts`).
  - [x] 6b. Add sort UI near search/filter controls.
  - [x] 6c. Use existing `sortProviderEntriesByName` for A-Z.
  - [x] 6d. Add comparator by `stats.total` descending for accounts/keys.
  - [x] 6e. Ensure sort applies after search/filter.
- [x] 7. Add Providers topbar.
  - [x] 7a. Create `ProvidersTopBar.tsx` or inline PageTabBar/link strip.
  - [x] 7b. Include all target routes.
  - [x] 7c. Do not hide existing routes or break deep links.
- [x] 8. Update tests or add static tests for IA controls.
- [x] 9. Run typecheck and relevant provider tests.
- [ ] 10. Update changelog after reviewer acceptance.

---

## Anti-Hallucination Guardrails

1. Do **not** delete provider onboarding functionality entirely unless confirmed unused; remove the large empty marketing section, not necessarily the wizard entry point.
2. Do **not** remove the Free filter chip — only remove the redundant Free Tier section.
3. Do **not** conflate List view with existing compact grid; user specifically wants one provider per row.
4. Do **not** break saved provider display mode localStorage; add migration/default fallback for old `all/configured/compact` values.
5. Do **not** change provider connection/auth logic.
6. Read `providerPageStorage.ts` before changing display mode strings.

---

## Validation / Exit Conditions

- [x] Top marketing onboarding block no longer appears.
- [x] Dedicated Free Tier Providers section no longer appears.
- [x] Free filter still works.
- [x] View mode UI has Grid and List, not All/Configured/Compact.
- [x] Configured appears as a filter, not a view mode.
- [x] List view renders one provider per row.
- [x] A-Z sort works.
- [x] Accounts/keys sort puts providers with more configured accounts first.
- [x] Providers topbar exposes provider stats, services, quota, rankings, free tiers, runtime.
- [x] `npm run typecheck:core` passes.

---

## Where

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(dashboard)/dashboard/providers/page.tsx` | MODIFY | Remove redundant sections, wire view/sort/list/topbar |
| `src/app/(dashboard)/dashboard/providers/ProviderSummaryCard.tsx` | MODIFY | Search/filter/sort/control toolbar |
| `src/app/(dashboard)/dashboard/providers/ProviderDisplayModeControl.tsx` | MODIFY | Grid/List mode only |
| `src/app/(dashboard)/dashboard/providers/providerPageStorage.ts` | MODIFY | Persist/migrate display mode |
| `src/app/(dashboard)/dashboard/providers/providerPageUtils.ts` | MODIFY | Sorting/filter helpers |
| `src/app/(dashboard)/dashboard/providers/ProviderCard.tsx` | READ/MODIFY | Reuse data/rendering for row layout |
| `src/app/(dashboard)/dashboard/providers/ProviderListRow.tsx` | CREATE (if needed) | True list view |
| `src/app/(dashboard)/dashboard/providers/ProvidersTopBar.tsx` | CREATE (if needed) | Providers topbar |
| `.changelog/` | APPEND AFTER REVIEW | Record Providers IA cleanup |

## Completion Evidence


### Frontend Quality Path-to-100 (2026-07-18)

- `ProviderListRow`: enable `Toggle` is a **sibling** of the detail `Link` (no nested interactive).
- Removed non-functional LLM `play_arrow` hover icon; chevron is the nav affordance.
- Sort / category / Configured chips: `aria-pressed` + `type="button"`.
- Accounts cell: `aria-label` via `accountsCount`.
- Regression: `ProviderListRow keeps enable Toggle outside the primary Link (Task 0057 a11y)` — pass.
- Report: `docs/reports/reviews/2026-07-18-task-0057-providers-ia-cleanup-frontend-review.md`
- Score: **100** → lane `03-review/`.

### Reopen Addendum Completion Evidence (2026-07-16 → strengthened 2026-07-18 → path-to-100 2026-07-18)

- Completed subtasks 10-15:
  - Mounted/integrated `ProvidersTopBar` on all 7 peer provider routes: `/dashboard/providers`, `/dashboard/provider-stats`, `/dashboard/providers/services`, `/dashboard/quota`, `/dashboard/free-provider-rankings`, `/dashboard/free-tiers`, `/dashboard/runtime`.
  - Restyled `ProvidersTopBar` to match Routing hub selected-state model.
  - Ensured active state tracking works on each nested/peer path via matching `currentPath` values.
  - **2026-07-18 test hardening (phantom-proof):**
    - Asserts each of the 7 peer pages mounts `ProvidersTopBar` with the **exact** `currentPath="…"` for that route.
    - Asserts topbar href set covers all peer destinations; services page must not set providers-home as active.
  - **Path-to-100 (gt-ts-expert, 2026-07-18):**
    - `ProvidersTopBar` now imports `HUB_SUBNAV_{SHELL,ACTIVE,INACTIVE,ITEM_BASE}_CLASS` from `hubSubnavStyles.ts` (same SSOT as `RoutingHubSubnav` / `ObserveHubSubnav`) — no divergent class-string copies.
    - Branded `PROVIDERS_TOPBAR_PATHS` + `ProvidersTopBarPath` union on `currentPath` (compile-time path contract).
    - Tests assert **constant import** (not fragile literal presence in RoutingHub source — that failed after Routing moved to SSOT constants).
- Verified all exit conditions:
  - Providers, Stats, Services, Quota, Rankings, Free Tiers, and Runtime all display the same styled `ProvidersTopBar`.
  - `ProvidersTopBar` visually matches the approved selected-state model via shared constants.
- Test command (2026-07-18 path-to-100 + frontend a11y):
  - `node --import tsx/esm --test tests/unit/provider-connections-ui-regression.test.ts` → 7/7 pass
  - `npm run typecheck:core` → exit 0

## Review Ledger

| Date | Reviewer | Score | Verdict | Findings closed | Residual |
|------|----------|-------|---------|-----------------|----------|
| 2026-07-15 | user/runtime | — | REOPEN (phantom) | — | Topbar only on `/providers`; active visual mismatch |
| 2026-07-16 | builders | — | mounts + restyle claimed | multi-route mount, active visual | Weak tests (string presence only) |
| 2026-07-18 | gt-ts-engineer (builders) | — | phantom closed | multi-route `currentPath` contract + Routing visual parity tests | re-review needed |
| 2026-07-18 | gt-ts-expert (builders) | **97** | path-to-100 applied | HUB_SUBNAV SSOT wire; branded paths; fixed broken visual-parity test vs constants | changelog (subtask 10) deferred; static tests only |
| 2026-07-18 | gt-frontend-quality-reviewer | **100** | ACCEPTED_100 | multi-route topbar + SSOT confirmed; List a11y path-to-100 | changelog (subtask 10) after accept |
| 2026-07-18 | gt-frontend-quality-reviewer (reviewers return) | **100** | ACCEPTED_100 | live Docker lag noted; topbar icons aria-hidden path-to-100 | redeploy `:22000`; changelog |

**Lane:** stay `docs/tasks/03-review/` (return-review 100).

**Latest report:** `docs/reports/reviews/2026-07-18-task-0057-providers-ia-cleanup-return-review.md`

- Removed section diffs:
  - Removed `showFirstProviderHint` marketing block from `page.tsx` (wizard button remains in `ProviderSummaryCard`).
  - Removed dedicated Free Tier Providers section render block; Free remains a filter chip.
  - `showSection()` no longer special-cases free as a standalone section.
- Toolbar / controls:
  - `ProviderDisplayModeControl` now exposes Grid/List only.
  - Configured moved to filter chip row in `ProviderSummaryCard`.
  - Sort row added: A-Z / Accounts.
  - `ProvidersTopBar` links: provider-stats, services, quota, free-provider-rankings, free-tiers, runtime.
- List view:
  - Created `components/ProviderListRow.tsx` — one provider per row with name, account count, service badges, status, toggle.
  - List mode uses flat `compactProviderEntries` re-sorted by active sort mode.
- Storage migration (`providerPageStorage.ts`):
  - Canonical modes: `grid` | `list` (legacy `all`/`configured` → `grid`, `compact` → `list`).
  - Default preference is `grid`.
- Sort evidence:
  - `sortProviderEntriesByAccounts` + `filterConfiguredProviderEntries(..., sortMode)` unit tests pass.
- Typecheck result:
  - `npm run typecheck:core` → PASS (exit 0)
  - `node --import tsx/esm --test tests/unit/dashboard/providerPageStorage.test.ts tests/unit/providers-page-utils.test.ts tests/unit/providers-free-tier-filter.test.ts` → 65/65 pass
- Changelog ref: deferred to after reviewer acceptance (task rule #10; builder instruction: no changelog rebuild)
- Task remains in: `docs/tasks/02-doing/`

## Changelog Draft (for reviewer / post-acceptance)

```markdown
## [2026-07-14] - Providers IA cleanup (Grid/List, sort, topbar)
### Changed
- Providers page: removed top marketing onboarding block and redundant Free Tier section
- View modes: All/Configured/Compact → Grid/List; Configured is now a filter chip
- Added A-Z and Accounts/keys sort controls
- Added Providers topbar (stats, services, quota, rankings, free tiers, runtime)
- Added true one-row-per-provider List view (`ProviderListRow`)
- Migrated localStorage display mode: all/configured→grid, compact→list
**Author**: builders (Task 0057)
```

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
