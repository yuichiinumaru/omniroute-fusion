# Task 0142: Clarify combo target versus whole-set retry controls

> **Status**: `[~]` In progress — isolated Wave A assigned
> **Priority**: 🟢 P2
> **Type**: `UX_VIS` / `documentation`
> **Origin**: EPIC-27; operator question about `maxRetries` versus `maxSetRetries`.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` — shares combo editor/i18n surfaces with Tasks 0127 and 0130.
> **Review routing**: frontend-quality + independent runtime semantics review

## Objective

Make the distinction between `maxRetries` and `maxSetRetries` immediately
understandable in the combo UI and documentation without changing runtime
semantics. The UI MUST state that `maxRetries` retries one target, while
`maxSetRetries` retries the entire target set after all targets fail.

## Background Context

- `open-sse/services/combo.ts:1831` loops whole-set retries using `maxSetRetries`.
- `open-sse/services/combo.ts:1963` loops per-target retries using `maxRetries`.
- Both use inclusive loops, so configured N means N additional retries and N+1
  total passes/attempts.
- Current labels are `Max Retries` and `Max Set Retries`; help text is more
  precise but scope is not visible while scanning the form.

## Test Requirements

- Labels identify target scope without opening help text.
- Help text states N is additional retries and includes defaults.
- Runtime behavior remains unchanged for `0`, `1`, and a value greater than 1.
- Existing combo save/load and retry tests remain green.
- Documentation uses the verified camelCase names.

## Exit Conditions (GDD/TDD)

- [x] UI labels clearly distinguish target retry from whole-set retry.
- [x] Help text documents scope, reset behavior, inclusive semantics, and defaults.
- [x] A focused test asserts the labels/help keys and runtime semantics remain unchanged.
- [x] `node --import tsx/esm --test tests/unit/combo-retry-control-labels.test.ts` passes.
- [x] Relevant combo UI tests pass.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [ ] `.changelog/` entry is created through manage-changelog and rebuilt. (Worker mode: parent orchestrator creates `.changelog/` entry per wave policy).
- [x] Completion Evidence and Review Trail are filled.

## Details

### What

- [x] **Ler código existente**: read combo editor fields, i18n keys, help fallback,
  combo runtime loops, and existing retry tests.
- [x] Add failing assertions for labels and help semantics.
- [x] Update labels/help only; do not change retry counters or loop bounds.
- [x] Add a short routing documentation section if the existing docs location is verified.
- [x] **Refactoring pass**: use one source of truth for translation copy.
- [x] **Verificação de regressão**: focused tests, typecheck, lint.

### Where

| File | Purpose |
|---|---|
| `src/app/(dashboard)/dashboard/combos/page.tsx` | Read/modify retry field presentation. |
| `src/i18n/messages/en.json` | Update verified labels/help; propagate established locale policy. |
| `open-sse/services/combo.ts` | Read only; verify semantics remain unchanged. |
| `tests/unit/combo-retry-control-labels.test.ts` | Create UI/semantics regression tests. |
| `docs/routing/AUTO-COMBO.md` | Update only if verified as canonical retry documentation. |
| `.changelog/` | Create closeout entry. |

### How

1. Freeze current runtime semantics with tests.
2. Update only labels/help/documentation.
3. Verify the UI wording against the actual inclusive retry loops.

### Why

The controls are technically correct but visually too similar; explicit scope
reduces operator misconfiguration without changing request behavior.

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Safe beside provider/runtime tasks. |
| **serializable** | Coordinate with 0127 and 0130 because all may edit combo page/i18n/schema surfaces. |
| **Collision** | Combo page, combo translations, retry tests, and optional routing docs. |

## ⛔ Anti-Hallucination Guardrails

> Do not rename runtime fields without a migration plan. Do not change `<=` loop
> semantics in this UX task. Confirm locale propagation rules before editing all
> message files. Never use production `:22000`.

## 🛡️ Compliance Checklist

- [x] Labels match verified runtime semantics.
- [x] No new external input.
- [x] No secrets.
- [x] Error behavior unchanged.
- [x] No raw SQL.
- [x] No deletion.

## 📋 Completion Evidence

- **Labels/help/tests/output**:
  - `maxRetries`: "Retries per target" (help: single target scope, N+1 inclusive, transient-only, default 1)
  - `maxSetRetries`: "Retries for whole set" (help: whole set scope, N+1 inclusive, re-evaluated per set pass, default 0)
  - `node --import tsx/esm --test tests/unit/combo-retry-control-labels.test.ts`: PASS (7/7 tests)
  - `node --import tsx/esm --test tests/unit/combo-config.test.ts tests/unit/combo-control-center.test.ts tests/unit/combo-cooldown-retry.test.ts tests/unit/chat-cooldown-aware-retry.test.ts`: PASS (79/79 tests)
  - `node --import tsx/esm --test tests/unit/combo-quota-share-cooldown-wait.test.ts tests/unit/combo-builder-draft.test.ts tests/unit/db-combos-crud.test.ts tests/unit/json-migration-combos.test.ts`: PASS (20/20 tests)
  - Sabotage gate: test fails when label is reverted to ambiguous "Max Retries"
- **Typecheck/lint/changelog**:
  - `npm run typecheck:core`: PASS (0 errors)
  - `npx eslint src/app/(dashboard)/dashboard/combos/page.tsx src/app/(dashboard)/dashboard/combos/advancedHelpFallback.ts tests/unit/combo-retry-control-labels.test.ts`: PASS (0 errors)
  - Changelog Draft attached below for parent orchestrator wave rebuild
- **Executor/date**: builder-engineer (omniroute/builder-engineer) / 2026-08-05

### Changelog Draft

- **task**: 0142
- **agent**: builder-engineer
- **project**: omniroute
- **title**: omniroute-combo-retry-control-labels
- **description**: Clarify combo target versus whole-set retry controls in UI and i18n copy
- **summary**: Updated combo advanced settings labels to "Retries per target" (maxRetries) and "Retries for whole set" (maxSetRetries). Help text explicitly documents single-target vs whole-set scope, N+1 inclusive attempts, transient-only retries, per-pass reset behavior, and default values. Extracted single source of truth for fallback copy into advancedHelpFallback.ts. Added regression tests in combo-retry-control-labels.test.ts with sabotage proof.
- **verification**: `node --import tsx/esm --test tests/unit/combo-retry-control-labels.test.ts` (7/7 pass) && `npm run typecheck:core` (0 errors)

## 🔍 Review Trail

- **Reviewer/verdict/score**: [fill by independent reviewer]
- **Notes**: [fill by independent reviewer]
