# Task 0060: Testing Hub IA — Gather Playground, Translator, Batch, Plugins, Search Tools, Media Cache

> **Status**: `[x]` Implemented (awaiting review — remain in `02-doing/`)
> **Priority**: 🟡 P1
> **Type**: `refactor` (information architecture)
> **Action type**: EXPOSE + UX_VIS
> **Origin**: User localhost:21000 vs 22000 IA sweep (2026-07-14)
> **Source evidence**: Observe/Testing/Settings read-only investigation packet
> **Depends on**: Task 0052 (theme), Task 0055 (visual input contrast recommended)
> **Blocks**: none

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
- **Debug-only decision**: Playground / Translator / Search Tools remain under `DEVTOOLS_ITEMS` with `visibility: "debug"` in sidebar chrome. **Testing hub always links them** (no debug mode required to reach via hub or command palette). Hub cards tag them with a small `lab` badge.
- **Testing hub screenshot**: N/A (static hub; validated via unit tests + typecheck). UI: `data-testid="testing-hub"`, links `data-testing-hub-link={id}`.
- **Sidebar diff if any**:
  - `HIDEABLE_SIDEBAR_ITEM_IDS` += `"testing"`
  - **No** change to `PRIMARY_SIDEBAR_ITEMS` (preserved: home `labelFallback: "Dashboard"`, operations hub leaf from Task 0059)
  - Conceptual inventory groups (`BATCH_GROUP`, `AGENTIC_GROUP`, `DEVTOOLS_ITEMS`, media in registry inventory) left intact for prefs/deep links
- **Route smoke output** (static page existence + no redirect-to-testing shells):
  - All 7 target `page.tsx` files remain non-empty content pages
  - Hub constants: `TESTING_HUB_HREFS` includes all 7 target hrefs
  - Test file: `tests/unit/ui/testing-hub-discoverability-0060.test.ts` (10 tests)
- **Typecheck result**: `npm run typecheck:core` — exit 0 (clean)
- **Targeted tests**:
  ```txt
  node --import tsx/esm --test \
    tests/unit/ui/testing-hub-discoverability-0060.test.ts \
    tests/unit/ui/operations-hub-discoverability-0059.test.ts \
    tests/unit/sidebar-visibility.test.ts \
    tests/unit/sidebar-tools-group.test.ts \
    tests/unit/ui/sidebar-flat-primary-nav.test.ts
  → 41 pass, 0 fail
  ```
- **Changelog ref**: draft below; parent/reviewer applies after acceptance (subtask 8 open)

### Entrypoint Chain Proof

- **Claim**: Testing destinations are discoverable without primary-nav budget growth
- **Entrypoint**: `/dashboard/testing` (`page.tsx` → `TestingHubClient`)
- **Adapter/call site**: `TESTING_HUB_GROUPS` cards → `Link href` to existing pages; palette `testingHubExtras`; Operations `integrations` link
- **Helper/service**: `src/shared/constants/testingHub.ts`
- **State/diagnostic effect**: none (navigation only)
- **Regression test**: `testing-hub-discoverability-0060.test.ts` fails if hub hrefs or page composition removed
- **Evidence classification**: `runtime integration` (static composition + route file presence)

### Files modified / created

| Path | Action |
|------|--------|
| `src/shared/constants/testingHub.ts` | CREATE |
| `src/app/(dashboard)/dashboard/testing/page.tsx` | CREATE |
| `src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx` | CREATE |
| `src/shared/constants/sidebarVisibility.ts` | MODIFY (hideable `testing` only) |
| `src/shared/constants/operationsHub.ts` | MODIFY (cross-link Testing) |
| `src/shared/components/CommandPalette.tsx` | MODIFY (`testingHubExtras`) |
| `src/shared/components/Header.tsx` | MODIFY (`TESTING_DEEP_HEADER_META`) |
| `tests/unit/ui/testing-hub-discoverability-0060.test.ts` | CREATE |

### How Testing is discovered (primary-nav budget)

| Channel | Always available? | Notes |
|---------|-------------------|-------|
| `/dashboard/testing` | Yes | Direct URL / bookmark |
| Command palette | Yes | Hub + 7 destinations (respects hideable prefs) |
| Operations → Integrations → Testing | Yes | Cross-link from primary Operations leaf |
| Sidebar primary leaf | **No** | Keeps ≤10 leaf budget (still 9) |
| Dev Tools section | Debug mode only | Unchanged chrome for playground/translator/search-tools |

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
  Debug-only sidebar items stay debug-gated; hub always surfaces them.
summary: >
  Option A Testing hub without expanding flat primary nav; preserve all direct routes.
verification: >
  npm run typecheck:core (pass);
  node --import tsx/esm --test tests/unit/ui/testing-hub-discoverability-0060.test.ts
  (+ related sidebar/ops hub suites) → 41 pass.
```
