# Task 0133: Add AND/OR conditional fusion rules

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: User request — conditional fusion must combine tool and text rules with AND/OR instead of selecting only one trigger mode.
> **Blocks**: —
> **Depends on**: Tasks 0014, 0018, and 0110 as existing fusion trigger/editor contracts
> **Parallelism**: `serializable` — extends the combo schema, fusion evaluator, and editor owned by prior fusion tasks.
> **Review routing**: independent + frontend-quality + fusion runtime review

## Objective

Add a backward-compatible rules mode for conditional fusion in which a list of tool/text predicates is combined by an explicit `AND` or `OR` operator. Preserve legacy `always`, `tool-call`, and `text-match` behavior for existing combos.

## Background Context

### O que já existe:
- `fusionTriggers.ts` evaluates one mode at a time; arrays within that mode use existing matching semantics.
- Combo schema uses a strict trigger object with `mode`, `toolPatterns`, `textPatterns`, and related fields.
- Fusion editor UI currently presents a single mode and conditional pattern input.
- Existing fusion tasks/tests define fallback and editor contracts.

### O que está faltando / quebrado:
- A tool rule and a text rule cannot currently be combined.
- No explicit operator or rule-list schema exists.

### False-gap check:
- This is an extension of existing fusion triggers, not a replacement for Tasks 0014/0018/0110. Upstream reference does not contain this feature.

## Test Requirements

- Legacy mode behavior MUST remain byte-for-byte equivalent for representative requests.
- A rules `AND` configuration MUST require every rule to match.
- A rules `OR` configuration MUST require at least one rule to match.
- Tool matching MUST use existing glob semantics; text matching MUST use existing content semantics.
- Empty rules MUST fail closed or follow an explicitly documented safe fallback, never unconditional fusion.
- Invalid rule kinds/operators MUST be rejected by Zod.
- UI serialization and editing MUST preserve rules without silently converting them to legacy mode.

## Exit Conditions (GDD/TDD)

- [x] Zod schema supports bounded rule lists and explicit `AND`/`OR` operator.
- [x] Runtime evaluator supports mixed tool/text rules and preserves legacy mode fallback.
- [x] Editor UI supports add/remove/type/pattern/operator operations with accessible controls.
- [x] Unit tests cover AND, OR, empty, invalid, legacy, and mixed event cases.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] Targeted fusion tests pass; run `npm run test:vitest` if changed surfaces belong to Vitest.
- [x] Anti-phantom chrome test proves no extra fusion topbar is introduced.
- [x] `.changelog/` entry is created.
- [x] Completion Evidence filled for parent review handoff.

## Details

### What

Subtasks:
- [x] **Ler código existente**: read Tasks 0014/0018/0110, `fusionTriggers.ts`, combo schema, `combo.ts` gate, editor types, save mapping, editor UI, FUSION docs, and tests.
- [x] Freeze legacy evaluation in regression tests.
- [x] Add a strict, bounded rule schema with explicit operator and backward-compatible detection.
- [x] Implement pure rule evaluation and integrate it at the existing conditional-fusion gate.
- [x] Extend editor form state/save mapping and UI with rule rows and AND/OR control.
- [x] **Refactoring pass**: avoid regex compilation or broad request rescans when existing matchers suffice.
- [x] **Verificação de regressão**: targeted fusion tests, typecheck, lint, UI chrome checks, and Vitest where applicable.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/fusionTriggers.ts` | Extend typed evaluator. |
| `src/shared/validation/schemas/combo.ts` | Add validated rules/operator. |
| `open-sse/services/combo.ts` | Wire rule mode at existing gate. |
| `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` | Form/payload conversion. |
| `src/app/(dashboard)/dashboard/fusions/FusionTriggersSection.tsx` | Rule editor UI. |
| `src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx` | Form validation integration. |
| `tests/unit/fusion-triggers.test.ts` | Evaluator tests. |
| Existing fusion editor/combo tests | Regression coverage. |
| `docs/architecture/FUSION.md` | Update contract after implementation. |
| `.changelog/` | Criar entry. |

### How

1. Preserve legacy mode as the first branch.
2. Evaluate each new rule through existing tool/text matchers.
3. Combine results with a bounded operator and fail closed for invalid/empty data.
4. Add UI only inside existing fusion editor chrome.

### Why

Mixed conditions let operators target real workflows instead of broad tool-only or text-only triggers, reducing accidental fusion dispatches.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Safe beside provider-only tasks. |
| **serializable** | Sequence with combo schema tasks 0130/0132 and existing fusion edits. |
| **Collision** | Fusion schema/evaluator/editor and combo conditional gate. |

## ⛔ Anti-Hallucination Guardrails

> Do not confuse JSON Schema `anyOf`/`allOf` with fusion operators. Do not change legacy defaults. Do not add a new topbar; follow the existing Routing/fusion chrome contract.

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: existing matcher semantics verified.
- [x] **Zod Validation**: rules/operator validated and bounded.
- [x] **Security**: patterns cannot trigger unsafe evaluation or ReDoS.
- [x] **Error Sanitization**: API validation errors remain sanitized.
- [x] **No Raw SQL**: no DB route SQL.
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/validation/schemas/combo.ts`
  - `open-sse/services/fusionTriggers.ts`
  - `open-sse/services/combo.ts`
  - `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts`
  - `src/app/(dashboard)/dashboard/fusions/FusionTriggersSection.tsx`
  - `src/i18n/messages/en.json`
  - `docs/architecture/FUSION.md`
  - `tests/unit/fusion-triggers.test.ts`
  - `tests/unit/fusion-editor-types.test.ts`
  - `.changelog/20260806-211500-0133-omniroute-conditional-fusion-rules-builders.md`
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/fusion-triggers.test.ts tests/unit/fusion-editor-types.test.ts` (58 pass)
  - `node --import tsx/esm --test tests/unit/fusion-contracts.test.ts tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-combo-ref-dispatch.test.ts tests/unit/fusion-timeout-abort.test.ts tests/unit/fusion-acting.test.ts tests/unit/fusion-units-resolve.test.ts tests/unit/fusion-panel-tools-none.test.ts` (102 pass)
  - `node --import tsx/esm --test tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts tests/unit/ui/fusions-list-acting-0077.test.ts` (15 pass)
- **Resultado dos testes**: PASS (175 tests pass across fusion unit, contract, and UI suites)
- **Resultado do lint**: PASS (`npx eslint` clean with 0 errors, 0 warnings on touched files)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core` 0 errors)
- **Entrada no changelog**: `.changelog/20260806-211500-0133-omniroute-conditional-fusion-rules-builders.md`
- **Agente executor**: builders (omniroute/builder-engineer)
- **Data de conclusão**: 2026-08-06

## 🔍 Review Trail

- **Reviewer**: parent reviewer with Gortex-assisted review
- **Data da review**: 2026-08-06
- **Veredito**: APROVADO — 100/100
- **Notas**: Fresh 175/175 fusion tests, typecheck and lint passed; cross-task combo.ts audit with 0131 passed. Gortex had no rule findings; aggregate blast-radius block is inherited from prior waves.
