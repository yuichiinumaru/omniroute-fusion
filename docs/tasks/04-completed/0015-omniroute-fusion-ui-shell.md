# Task 0015: Fusion UI Shell — Sidebar Item and Fusions List Page

> **Status**: `[x]` Ready for review
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0003 — Fusion First-Class (S5)
> **Action type**: NEW / UX_VIS
> **Blocks**: Task 0016
> **Depends on**: Task 0010

---

## Objective

Create the Fusions UI surface shell:

1. **Sidebar item**: Add `"fusions"` to `HIDEABLE_SIDEBAR_ITEM_IDS` and `OMNI_PROXY_ITEMS` (placed immediately after `combos-live`), with `href: "/dashboard/fusions"`, icon: `"hub"` (or similar), and i18n keys (`fusions`, `fusionsSubtitle`).
2. **List page**: Create `/dashboard/fusions` page that lists all combos where `strategy ∈ {"fusion", "conditional-fusion"}`. Uses existing combo CRUD APIs — no new backend routes. Supports: display name, strategy badge, panel count, create button, delete action, click-to-edit navigation.
3. **Data fetching**: Reuse existing combo list API (`/api/combos`) and filter client-side by strategy. Phase 1 does not add server-side filtering (Decision D4 — no new routes unless needed).

Decision D5 is enforced: this is a dedicated `/dashboard/fusions` page, NOT a mode inside ComboEditor.

## Background Context

### What already exists:
- Sidebar system: `src/shared/constants/sidebarVisibility.ts` — `HIDEABLE_SIDEBAR_ITEM_IDS`, `OMNI_PROXY_ITEMS`, `SIDEBAR_SECTIONS`, `SIDEBAR_ICON_ACCENTS`
- Combos list page: `src/app/(dashboard)/dashboard/combos/page.tsx` (~4589 lines) — reference for list/card patterns, NOT to be cloned wholesale
- Combo CRUD API: existing routes in `src/app/api/combos/` or similar
- `src/lib/db/combos.ts` — `getCombo`, `getCombos`, `createCombo`, `deleteCombo`, etc.
- i18n keys for fusion already exist in `src/i18n/messages/en.json` (lines 2392-2401) — strategy labels

### What is missing:
- No `"fusions"` sidebar item
- No `/dashboard/fusions` page or directory
- No `fusionsSubtitle` i18n key

---

## Test Requirements

- MUST display `Fusions` sidebar item when not hidden
- MUST navigate to `/dashboard/fusions` on click
- MUST list only combos with `strategy === "fusion"` or `strategy === "conditional-fusion"`
- MUST show combo name, strategy type, and panel (model) count
- MUST provide a "Create Fusion" action that navigates to editor (Task 0016) or creates a stub combo
- MUST provide "Delete" action per fusion
- MUST show empty state when no fusion combos exist
- MUST handle loading state
- Page MUST NOT break `npm run typecheck:core`

---

## Exit Conditions (GDD/TDD)

- [x] `"fusions"` in `HIDEABLE_SIDEBAR_ITEM_IDS` array
- [x] `"fusions"` sidebar item in `OMNI_PROXY_ITEMS` after `combos-live`
- [x] `SIDEBAR_ICON_ACCENTS` has accent color for `"fusions"`
- [x] `/dashboard/fusions/page.tsx` exists and renders fusion combo list
- [x] Client-side filter shows only `strategy ∈ {fusion, conditional-fusion}`
- [x] Empty state, loading state, error state handled
- [x] i18n key `fusions` and `fusionsSubtitle` added to `src/i18n/messages/en.json`
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors
- [x] Entry in CHANGELOG.md added (at the TOP)

---

## Details

### What

Subtasks:
- [x] **Read existing code**: Read `src/shared/constants/sidebarVisibility.ts` (full file — sidebar structure, HIDEABLE array, OMNI_PROXY_ITEMS, icon accents), `src/app/(dashboard)/dashboard/combos/page.tsx` (first 100 lines — imports, data fetching pattern), `src/i18n/messages/en.json` (search for combos/fusion keys), `src/lib/db/combos.ts` (first 50 lines — understand API shape)
- [x] **Add sidebar item**: In `sidebarVisibility.ts`, add `"fusions"` to `HIDEABLE_SIDEBAR_ITEM_IDS` (after `"combos-live"`). Add `SidebarItemDefinition` to `OMNI_PROXY_ITEMS` with `id: "fusions"`, `href: "/dashboard/fusions"`, `i18nKey: "fusions"`, `subtitleKey: "fusionsSubtitle"`, `icon: "hub"`. Add accent color to `SIDEBAR_ICON_ACCENTS`.
- [x] **Add i18n keys**: In `src/i18n/messages/en.json`, add `"fusions": "Fusions"`, `"fusionsSubtitle": "Panel + judge model combos"`.
- [x] **Create list page**: Create `src/app/(dashboard)/dashboard/fusions/page.tsx` as a `"use client"` page. Fetch combos via existing API, filter to fusion strategies. Display list with cards showing name, strategy badge, model count. Add Create and Delete actions.
- [x] **Handle states**: Loading skeleton, empty state (encourage creating first fusion), error toast.
- [x] **Refactoring pass**: Keep page under 300 lines. Reuse shared components (`Card`, `Button`, `EmptyState`, `Modal`).
- [x] **Verification**: Run typecheck + lint.

### Where

| File | Purpose |
|------|---------|
| `src/shared/constants/sidebarVisibility.ts` | Modify — add `"fusions"` item to HIDEABLE array, OMNI_PROXY_ITEMS, and icon accents |
| `src/i18n/messages/en.json` | Modify — add `fusions`, `fusionsSubtitle` i18n keys |
| `src/app/(dashboard)/dashboard/fusions/page.tsx` | Create — fusions list page |
| `src/app/(dashboard)/dashboard/combos/page.tsx` | Read — reference for patterns (do NOT clone) |
| `src/lib/db/combos.ts` | Read — understand combo CRUD API shape |
| `src/shared/components/Card.tsx` | Read — reuse for list items |
| `src/shared/components/EmptyState.tsx` | Read — reuse for empty view |
| `src/shared/components/Button.tsx` | Read — reuse for actions |
| `src/shared/components/ModelSelectModal.tsx` | Read — reference (used in Task 0016, not this task) |
| `CHANGELOG.md` | Modify — add entry at top |

### How

1. Add `"fusions"` to the `HIDEABLE_SIDEBAR_ITEM_IDS` const array after `"combos-live"`.
2. Add a new `SidebarItemDefinition` object to `OMNI_PROXY_ITEMS` after the `combos-live` entry.
3. Add `fusions: "#E879F9"` (or similar purple accent) to `SIDEBAR_ICON_ACCENTS`.
4. Create a minimal `page.tsx` that:
   - Fetches `/api/combos` (or uses existing fetch helper)
   - Filters results: `combos.filter(c => c.strategy === "fusion" || c.strategy === "conditional-fusion")`
   - Renders each as a card with name, badge, panel count
   - Provides Create / Delete actions
5. Add i18n keys for the sidebar label and subtitle.

### Why

Decision D5 mandates a dedicated `/dashboard/fusions` page rather than overloading the existing ComboEditor. The sidebar item provides discoverability. This shell page is the container for the editor (Task 0016) and the primary configuration surface for operators.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT clone the entire combos page (4589 lines) — build a minimal focused page.
> DO NOT create new API routes for listing fusions — filter client-side (Decision D4).
> DO NOT embed the full ComboEditor — that is explicitly rejected (Decision D6).
> DO NOT add fusion-specific DB queries or migrations.

> [!IMPORTANT]
> Read EVERY file in "Where" before writing.
> The sidebar item MUST go after `combos-live` in the array (visual ordering).
> i18n: only add `en.json` keys — other locales can be done in Task 0017.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: All sidebar IDs and routes verified with `grep -rn`
- [x] **Zod Validation**: N/A (no new API inputs)
- [x] **Security**: No secrets committed
- [x] **Error Sanitization**: N/A (client-side page)
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Nothing deleted

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/constants/sidebarVisibility.ts` — `fusions` in HIDEABLE after `combos-live`, OMNI_PROXY_ITEMS entry (`hub`), accent `#E879F9`
  - `src/i18n/messages/en.json` — `sidebar.fusions`, `sidebar.fusionsSubtitle`
  - `src/app/(dashboard)/dashboard/fusions/page.tsx` — list shell (create/delete/navigate, client filter)
  - `src/app/(dashboard)/dashboard/fusions/[id]/page.tsx` — minimal editor placeholder (until Task 0016)
  - `CHANGELOG.md` — Unreleased entry at top
- **Testes que verificam o trabalho**: Manual exit-condition checks + typecheck/lint on touched files. No new automated unit tests required by task (UI shell, no new API).
- **Resultado dos testes**: N/A (no new unit suite). Grep-verified: `"fusions"` present in HIDEABLE + OMNI_PROXY_ITEMS + en.json; page filters `fusion` / `conditional-fusion` only.
- **Resultado do lint**: `npx eslint --max-warnings 0` on `sidebarVisibility.ts` + both fusions pages — exit 0, no output.
- **Resultado do typecheck/build**: `npm run typecheck:core` — pass (exit 0).
- **Entrada no changelog**: `[Unreleased] Added — Fusions UI shell (Task 0015)` (CHANGELOG was already dirty; entry drafted at top of Unreleased/Added).
- **Agente executor**: builder (omniroute/builder)
- **Data de conclusão**: 2026-07-09
- **Deviations**:
  - Added minimal `/dashboard/fusions/[id]` placeholder so Create/Edit links do not 404; full editor remains Task 0016.
  - Page uses English literals for list UI strings (sidebar i18n only, per task scope / Task 0017 for full editor i18n).
  - Did not use Modal for delete (`confirm()` matches combos page delete pattern); EmptyState/Card/Button reused.
- **Blockers**: None.

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [pending]
- **Data da review**: [pending]
- **Veredito**: [pending]
- **Score (path to 100)**: [pending]
- **Notas**: [pending]
