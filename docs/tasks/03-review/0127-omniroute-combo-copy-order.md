# Task 0127: Insert duplicated combo below source

> **Status**: `[x]` Exit conditions met — awaiting review promote (Wave A)
> **Priority**: 🟢 P2
> **Type**: `feature`
> **Origin**: User request — copying a combo currently appends it to the end of the UI list.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — owns combo duplication ordering and its focused tests; avoid concurrent edits to the same `page.tsx` handler.
> **Review routing**: frontend-quality + independent

## Objective

When an operator duplicates a combo, the new combo MUST render immediately below the source combo in the current sort order, instead of receiving the next global `sort_order` and appearing at the end.

## Background Context

### O que já existe:
- `src/app/(dashboard)/dashboard/combos/page.tsx` contains `handleDuplicate` and the POST flow.
- `src/lib/db/combos.ts` accepts an explicit `sortOrder` and otherwise computes the next order.
- `sort_order` is persisted by the combo migration and list queries order by it.

### O que está faltando / quebrado:
- `handleDuplicate` does not pass the source-relative sort order, so `createCombo` falls back to the end.
- The behavior lacks a regression test for relative placement.

### False-gap check:
- No open task currently owns combo duplication ordering; existing topology tasks own visualization, not list insertion.

## Test Requirements

- A duplicated combo MUST have a persisted sort value between the source combo and its former next neighbor, or the equivalent normalized immediate successor.
- Existing combo names, IDs, and source configuration MUST remain unchanged.
- Reordering MUST still normalize the list without losing the duplicate.
- Duplicate creation failures MUST preserve the existing error handling and must not leave a partial record.

## Exit Conditions (GDD/TDD)

- [x] `handleDuplicate` passes a source-relative ordering value to the existing create path.
- [x] A unit/integration test proves the duplicate appears directly after its source.
- [x] Existing combo list and reorder tests pass.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] Targeted combo tests pass with 0 failures.
- [x] UI smoke proof runs only against `:23456` or a fixture; `:22000` is untouched.
- [x] `.changelog/` entry is created and rebuilt through the changelog engine.
- [x] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [x] **Ler código existente**: read `page.tsx` duplication/create handlers, `src/lib/db/combos.ts`, combo POST route, sort-order migration, and reorder route.
- [x] Write a failing test that creates ordered source/neighbor combos and duplicates the source.
- [x] Pass the smallest source-relative `sortOrder` value through the existing API.
- [x] Confirm the existing reorder operation still resequences integer positions.
- [x] **Refactoring pass**: avoid adding a second duplication endpoint or a new ordering abstraction.
- [x] **Verificação de regressão**: run focused tests, typecheck, lint, and test-environment smoke proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/(dashboard)/dashboard/combos/page.tsx` | Ler/modificar duplicate handler. |
| `src/lib/db/combos.ts` | Ler existing explicit sort-order behavior. |
| `src/app/api/combos/route.ts` | Ler POST contract and validation. |
| `src/app/api/combos/reorder/route.ts` | Ler normalization behavior. |
| `src/lib/db/migrations/020_combo_sort_order.sql` | Ler persistence contract. |
| `tests/unit/` combo ordering test | Criar/modificar regression test. |
| `.changelog/` | Criar append-only entry. |

### How

1. Reproduce the append-to-end behavior with a fixture.
2. Add a failing assertion for source-relative placement.
3. Thread the explicit order through the existing create payload.
4. Verify sorting, filtering, and reorder behavior.

### Why

Operators use combo order as a routing and maintenance aid. Appending copies to the end makes iterative editing unnecessarily expensive and obscures the relationship between source and duplicate.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Independent of Codex, OAuth, timeout, and provider settings tasks. |
| **serializable** | Serialize with any other combo-list handler edit. |
| **Collision** | `src/app/(dashboard)/dashboard/combos/page.tsx` and combo ordering tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not invent a copy route or DB field. Confirm the existing `sort_order` type and API payload before changing it. Do not test or restart `:22000`.

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: ordering claims validated against live source.
- [x] **Zod Validation**: existing combo POST validation remains authoritative.
- [x] **Security**: no secrets involved.
- [x] **Error Sanitization**: existing route error path preserved.
- [x] **No Raw SQL**: use `src/lib/db/combos.ts` only.
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/validation/schemas/combo.ts` (added `sortOrder` to `createComboSchema`)
  - `src/app/(dashboard)/dashboard/combos/page.tsx` (computed relative float ordering on duplication)
  - `tests/unit/combo-duplicate-order.test.ts` (new regression/TDD test suite)
- **Testes que verificam o trabalho**:
  - `tests/unit/combo-duplicate-order.test.ts`
  - `tests/unit/db-combos-crud.test.ts`
- **Resultado dos testes**: PASS
  - `combo-duplicate-order.test.ts`: "pass 6", "fail 0"
  - `db-combos-crud.test.ts`: "pass 6", "fail 0"
- **Resultado do lint**: PASS (run on changed files: 0 errors, 0 warnings)
- **Resultado do typecheck/build**: PASS (no Emit core success)
- **Entrada no changelog**: `.changelog/20260805-174204-0127-combo-duplicate-order.md`; `rebuild.sh build` PASS — generated `CHANGELOG.md`, 34 entries.
- **Agente executor**: Antigravity (Task 0127 Worker)
- **Data de conclusão**: 2026-08-04

## 🔍 Review Trail

- **Reviewer**: gt-ts-architecture-evaluator (BUILDER_CONTEXT)
- **Data da review**: 2026-08-05
- **Veredito**: APROVADO
- **Score (path to 100)**: 100
- **Notas**: Review completo em `docs/reports/review/20260805-task-0127-combo-copy-order-review.md`; path-to-100 resolveu changelog/index e confirmou 12/12 testes e typecheck verde.
