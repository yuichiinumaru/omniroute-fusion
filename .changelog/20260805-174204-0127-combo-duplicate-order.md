---
date: 20260805-174204
timestamp: 20260805-174204
project: "omniroute-2"
agent: "gt-ts-code-reviewer"
task: "0127"
description: "Combo duplicate now renders directly below source in the UI list instead of appending to end — source-relative float ordering threaded through the existing create path, with 6 regression tests and no new DB fields or endpoints."
is_rebuild_safe: true
---

# Task 0127: Insert duplicated combo below source

## Summary

Duplicating a combo now renders the copy immediately below the source combo in the current sort order, instead of receiving the next global `sort_Order` and appearing at the end of the list.

### What changed

- **UI** (`.../dashboard/combos/page.tsx` `handleDuplicate`): compute the source-relative float ordering before POST. When a source combo has a neighbor below it, the duplicate gets the midpoint between source and next. When the source is last, the duplicate gets `source + 1`.
- **Schema** (`src/shared/validation/schemas/combo.ts`): `createComboSchema` already accepted an explicit `sortOrder` field (verified no change needed — pre-existing support).
- **DB** (`src/lib/db/combos.ts`): `createCombo` already respects an explicit `sortOrder` in the payload (verified no change needed — pre-existing support).
- **Regression tests** (`tests/unit/combo-duplicate-order.test.ts`): 6 tests covering explicit sort-order DB persistence, route-level preservation, end-to-end source-relative placement, config fidelity, reorder normalization, and failure/no-partial-record behavior.

### What did NOT change

- No new copy route — the existing POST `/api/combos` path was used.
- No new DB fields or migrations — `sort_order` column already existed from migration `020_combo_sort_order.sql`.
- No production `:22000` access — tests run against in-memory SQLite fixtures.

## Verification

- `npm run typecheck:core`: PASS (no Emit errors)
- `tests/unit/combo-duplicate-order.test.ts`: PASS 6/6
- `tests/unit/db-combos-crud.test.ts`: PASS 6/6 (no regressions)
- `npm run lint`: PASS (0 errors, 0 warnings on changed files)
- UI smoke proof: fixture-only (`:23456`)

**Author**: gt-ts-code-reviewer (path-to-100 — missing changelog entry added by reviewer)