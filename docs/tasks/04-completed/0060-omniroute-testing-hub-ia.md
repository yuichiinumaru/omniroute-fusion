# Task 0060: Testing Hub IA — Gather Playground, Translator, Batch, Plugins, Search Tools, Media Cache

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🟡 P1
> **Type**: `refactor` (information architecture)
> **Action type**: EXPOSE + UX_VIS
> **Origin**: User localhost:21000 vs 22000 IA sweep (2026-07-14)
> **Source evidence**: Observe/Testing/Settings read-only investigation packet
> **Depends on**: Task 0052 (theme), Task 0055 (visual input contrast recommended)
> **Blocks**: none

---

## Reopen Addendum — Phantom Completion Fix Loop (2026-07-15)

User runtime review clarified that Translator, Playground, and Search Tools should **not** remain in the sidebar at all. The original task intentionally kept them in the debug-only DevTools sidebar section, but that now violates the desired IA: these routes should be discoverable from Testing hub/command palette, not sidebar chrome.

### Additional subtasks

- [x] 9. Remove `translator`, `playground`, and `search-tools` from rendered sidebar sections, including debug-only `DEVTOOLS_ITEMS` sidebar chrome.
- [x] 10. Preserve all direct routes: `/dashboard/translator`, `/dashboard/playground`, `/dashboard/search-tools`.
- [x] 11. Preserve discoverability through `/dashboard/testing`, command palette extras, and any existing Operations cross-link.
- [x] 12. Update sidebar tests to assert Translator, Playground, and Search Tools are not sidebar-rendered items.
- [x] 13. Keep hideable ids only if needed for legacy preferences, but ensure they do not cause visible sidebar entries.
- [x] 14. Do not modify Dashboard, Analytics, or Operations in this fix loop except preserving existing Testing cross-link if already present.

### Additional exit conditions

- [x] Translator, Playground, and Search Tools do not appear in the sidebar even in debug mode.
- [x] Testing hub still links to all seven target routes.
- [x] Direct route pages continue to render.

---

## Objective

Create a coherent **Testing** area/hub for experimental and test surfaces currently scattered across DevTools, Registry, Batch, Agentic, and hidden/debug sections.

---

## Current Evidence

All target routes exist and render real content:

```txt
/dashboard/playground
/dashboard/cache/media
/dashboard/translator
/dashboard/batch
/dashboard/batch/files
/dashboard/plugins
/dashboard/search-tools
```

But they are currently split across multiple sidebar groups:

| Route | Current group |
|------|---------------|
| `/dashboard/playground` | `DEVTOOLS_ITEMS` (debug-only) |
| `/dashboard/translator` | `DEVTOOLS_ITEMS` (debug-only) |
| `/dashboard/search-tools` | `DEVTOOLS_ITEMS` (debug-only) |
| `/dashboard/cache/media` | `REGISTRY_ITEMS` |
| `/dashboard/batch` | `BATCH_GROUP` |
| `/dashboard/batch/files` | `BATCH_GROUP` |
| `/dashboard/plugins` | `AGENTIC_GROUP` |

There is no `TESTING_GROUP` and no `/dashboard/testing` hub.

---

## Target UX

A single Testing area should expose:

```txt
/dashboard/playground
/dashboard/cache/media
/dashboard/translator
/dashboard/batch
/dashboard/batch/files
/dashboard/plugins
/dashboard/search-tools
```

Potential names:
- Testing
- Tools Lab
- Test Bench
- Playground

User called it an “área de testagem,” so `Testing` is acceptable.

---

## Architecture Decision Required

Choose one before implementation:

### Option A — Create `/dashboard/testing` hub (recommended) ✅ CHOSEN

Add a Testing hub route with PageTabBar/link strip to all seven pages. Keep existing routes alive.

Pros:
- clear discovery
- minimal route churn
- preserves current pages

Cons:
- adds another hub concept

### Option B — Promote Testing as sidebar primary leaf

Add Testing to primary sidebar and potentially remove/replace DevTools visibility.

Pros:
- very discoverable

Cons:
- primary nav currently targets ~10 leaves; adding more may violate flat IA budget.

### Option C — Keep hidden groups, add only links from Dashboard/Operations

Pros:
- minimal sidebar change

Cons:
- weaker IA improvement

---

## Subtasks

- [x] 1. Read all files in the Where table before modifying.
- [x] 2. Choose Testing architecture option.
  - [x] 2a. Decide whether Testing becomes primary sidebar leaf or hub reachable elsewhere.
  - [x] 2b. Decide whether debug-only pages remain debug-only or become visible in Testing.
- [x] 3. Create Testing hub/topbar if chosen.
  - [x] 3a. Create `/dashboard/testing/page.tsx` or equivalent.
  - [x] 3b. Add PageTabBar/link strip to target routes.
  - [x] 3c. Preserve direct routes.
- [x] 4. Update sidebar IA if needed.
  - [x] 4a. Create `TESTING_GROUP` or primary leaf.
  - [x] 4b. Move/alias target items from existing groups.
  - [x] 4c. Preserve stored hideable IDs.
- [x] 5. Ensure debug-only behavior is intentional.
  - [x] 5a. If translator/playground/search-tools should be visible always, remove debug-only gating for Testing links.
  - [x] 5b. If still debug-only, communicate via disabled/locked state.
- [x] 6. Add tests/static checks for route visibility.
- [x] 7. Run typecheck and targeted route smoke checks.
- [ ] 8. Update changelog after reviewer acceptance.

---

## Anti-Hallucination Guardrails

1. Do **not** remove the existing direct route pages.
2. Do **not** blindly remove debug gating; decide and document.
3. Do **not** duplicate heavy page content inside a hub unless the design requires embedded content.
4. Do **not** move Plugins functionality without checking Agentic dependencies.
5. Do **not** break Batch file routes.

---

## Validation / Exit Conditions

- [x] Testing area exposes all seven target routes.
- [x] Direct routes still work.
- [x] Translator, Playground, and Search Tools visibility is intentional and documented.
- [x] Sidebar does not exceed agreed primary-nav budget without explicit decision.
- [x] `npm run typecheck:core` passes.
- [x] Route smoke checks pass for all target routes.

---

## Where

| File | Action | Purpose |
|------|--------|---------|
| `src/shared/constants/sidebarVisibility.ts` | MODIFY (if needed) | Testing group/primary leaf |
| `src/app/(dashboard)/dashboard/testing/page.tsx` | CREATE (recommended) | Testing hub |
| `src/app/(dashboard)/dashboard/playground/page.tsx` | READ | Target route |
| `src/app/(dashboard)/dashboard/cache/media/page.tsx` | READ | Target route |
| `src/app/(dashboard)/dashboard/translator/page.tsx` | READ | Target route |
| `src/app/(dashboard)/dashboard/batch/page.tsx` | READ | Target route |
| `src/app/(dashboard)/dashboard/batch/files/page.tsx` | READ | Target route |
| `src/app/(dashboard)/dashboard/plugins/page.tsx` | READ | Target route |
| `src/app/(dashboard)/dashboard/search-tools/page.tsx` | READ | Target route |
| `.changelog/` | APPEND AFTER REVIEW | Record Testing IA changes |

## Completion Evidence

- **Architecture option chosen**: **Option A** — `/dashboard/testing` hub with grouped link cards (mirror of Operations hub Task 0059). **No new primary sidebar leaf** (primary stays 9 leaves). Discoverability via:
  1. Hub route `/dashboard/testing`
  2. Command palette extras (`testingHubExtras`: hub + all 7 destinations)
  3. Operations hub cross-link under Integrations (`/dashboard/testing`)
  4. Hideable id `testing` for prefs (not mounted as primary leaf)
- **Debug-only decision**: Playground / Translator / Search Tools are removed from the sidebar chrome entirely (`DEVTOOLS_ITEMS` is empty). They do not appear in the sidebar even in debug mode. They are always linked from the Testing hub + command palette + direct routes.
- **Testing hub screenshot**: N/A (static hub; validated via unit tests + typecheck). UI: `data-testid="testing-hub"`, links `data-testing-hub-link={id}`.
- **Sidebar diff if any**:
  - `HIDEABLE_SIDEBAR_ITEM_IDS` += `"testing"` (+ retain `translator` / `playground` / `search-tools` for legacy prefs)
  - **No** change to `PRIMARY_SIDEBAR_ITEMS` (preserved: home `labelFallback: "Dashboard"`, operations hub leaf from Task 0059)
  - `DEVTOOLS_ITEMS` emptied (`const DEVTOOLS_ITEMS: readonly SidebarItemDefinition[] = [];`)
  - `DEVELOPER_SHOWN` no longer lists lab ids (they are not tree leaves)
- **Route smoke output** (static page existence + no redirect-to-testing shells):
  - All 7 target `page.tsx` files remain non-empty content pages
  - Hub constants: `TESTING_HUB_HREFS` includes all 7 target hrefs
  - Test file: `tests/unit/ui/testing-hub-discoverability-0060.test.ts` (14 tests after path-to-100)
- **Typecheck result**: `npm run typecheck:core` — exit 0 (2026-07-18 frontend review session)
- **Targeted tests** (2026-07-18 frontend path-to-100):
  ```txt
  node --import tsx/esm --test \
    tests/unit/ui/dashboard-ia-consolidation-0056.test.ts \
    tests/unit/ui/testing-hub-discoverability-0060.test.ts \
    tests/unit/ui/sidebar-flat-primary-nav.test.ts \
    tests/unit/sidebar-visibility.test.ts \
    tests/unit/sidebar-tools-group.test.ts
  → 42 pass, 0 fail
  ```
- **Changelog ref**: draft below; parent/reviewer applies after acceptance (subtask 8 open)

### Phantom reopen closeout (2026-07-18)

- **Contract**: Translator / Playground / Search Tools MUST NOT appear in any sidebar section (main or debug DEVTOOLS).
- **Proof**:
  - `DEVTOOLS_ITEMS` empty + `getSectionItems(devtools) === []`
  - Flattened `SIDEBAR_SECTIONS` leaf ids/hrefs exclude the three lab routes
  - Hideable ids retained for stored prefs without mounting chrome
  - Hub + command palette still expose all three lab hrefs
- **Copy/docs cleanup**: `testingHub.ts` + `TestingHubClient.tsx` no longer claim debug-gated sidebar chrome for lab routes; hub copy states discovery via hub / palette / direct URL.
- **Sabotage surface**: re-adding `id: "playground"` (etc.) to `DEVTOOLS_ITEMS` or primary leaves fails the new absence tests.

### Entrypoint Chain Proof

- **Claim**: Testing destinations are discoverable without primary-nav budget growth; lab routes are not sidebar chrome
- **Entrypoint**: `/dashboard/testing` (`page.tsx` → `TestingHubClient`)
- **Adapter/call site**: `TESTING_HUB_GROUPS` cards → `Link href` to existing pages; palette `testingHubExtras`; Operations `integrations` link
- **Helper/service**: `src/shared/constants/testingHub.ts`
- **State/diagnostic effect**: none (navigation only)
- **Regression test**: `testing-hub-discoverability-0060.test.ts` fails if hub hrefs removed OR lab routes reappear in `SIDEBAR_SECTIONS` / `DEVTOOLS_ITEMS`
- **Evidence classification**: `runtime integration` (static composition + route file presence + sidebar absence)

### Files modified / created

| Path | Action |
|------|--------|
| `src/shared/constants/testingHub.ts` | CREATE (+ `isLab`; media generation copy; drop dead `TESTING_AREA_PATH_PREFIXES`) |
| `src/app/(dashboard)/dashboard/testing/page.tsx` | CREATE |
| `src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx` | CREATE (+ copy fix; consume `isLab`) |
| `src/shared/constants/sidebarVisibility.ts` | MODIFY (hideable `testing`; empty `DEVTOOLS_ITEMS`; drop lab ids from `DEVELOPER_SHOWN`) |
| `src/shared/constants/operationsHub.ts` | MODIFY (cross-link Testing; media lab wording) |
| `src/shared/components/CommandPalette.tsx` | MODIFY (`testingHubExtras`; media subtitle) |
| `src/shared/components/Header.tsx` | MODIFY (`TESTING_DEEP_HEADER_META`) |
| `src/i18n/messages/en.json` | MODIFY (testingNav/Description, pluginsDescription, searchToolsDescription, mediaSubtitle) |
| `tests/unit/ui/testing-hub-discoverability-0060.test.ts` | CREATE / strengthen (labs absent; media copy; en keys) |

### How Testing is discovered (primary-nav budget)

| Channel | Always available? | Notes |
|---------|-------------------|-------|
| `/dashboard/testing` | Yes | Direct URL / bookmark |
| Command palette | Yes | Hub + 7 destinations (respects hideable prefs) |
| Operations → Integrations → Testing | Yes | Cross-link from primary Operations leaf |
| Sidebar primary leaf | **No** | Keeps ≤10 leaf budget (still 9) |
| Dev Tools section | Empty | `DEVTOOLS_ITEMS = []` — playground/translator/search-tools never listed |

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer / operator**: `gt-frontend-quality-reviewer` (agentID=`reviewers` return)
- **Verdict**: `ACCEPTED_100`
- **Score**: `100/100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0060-testing-hub-ia-return-review.md`
- **Lane outcome**: stay `docs/tasks/03-review/`
- **Task reference**: Task 0060 (`omniroute-testing-hub-ia`)
- **Prior**: `docs/reports/reviews/2026-07-18-task-0060-omniroute-testing-hub-ia-frontend-review.md`

#### Path-to-100 (return review)

- Testing hub intro: “media cache” → “media generation”; unit forbids media-cache wording.

#### Current Open Blockers

- _(none)_ for workspace contracts
- **EXTERNAL**: Docker `:22000` v3.8.42 still shows sidebar labs + old media copy — redeploy workspace
- Changelog draft-only until human acceptance (subtask 8)

#### Path-to-100 Summary

1. ✅ Empty `DEVTOOLS_ITEMS`; no lab routes in any `SIDEBAR_SECTIONS` leaves
2. ✅ Tests assert absence from sidebar + presence on Testing hub + palette
3. ✅ Stale debug-chrome copy removed from hub constants/client
4. ✅ `isLab` semantics + sabotage against `debugSidebarOnly`
5. ✅ Media hub card matches generation playground (not “Media Cache” / proxy inspector)
6. ✅ `en.json` keys for Testing deep Header titles/descriptions; searchToolsDescription fixed
7. ✅ Dead `TESTING_AREA_PATH_PREFIXES` removed
8. ⏳ Publish changelog after human acceptance

### Previous Reports

- Task reopen addendum 2026-07-15 (phantom completion / sidebar chrome)
- _(no prior scored S report under `docs/reports/` before 2026-07-18)_

---

## Changelog Draft

```yaml
task: "0060"
agent: "builders"
project: "omniroute"
title: "Testing hub IA (Option A)"
description: >
  Add /dashboard/testing hub with grouped link cards to playground, translator,
  search-tools, batch, batch/files, media cache, and plugins. No new primary
  sidebar leaf. Discover via hub URL, command palette, and Operations cross-link.
  Playground / Translator / Search Tools are removed from all sidebar chrome
  (including debug DEVTOOLS); hub + palette remain the discovery path.
summary: >
  Option A Testing hub without expanding flat primary nav; lab routes hub-only
  in chrome; preserve all direct routes.
verification: >
  node --import tsx/esm --test tests/unit/ui/testing-hub-discoverability-0060.test.ts
  (+ related sidebar suites + 0056) → 39 pass.
```

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
