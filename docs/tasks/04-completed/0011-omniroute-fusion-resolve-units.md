# Task 0011: Fusion Resolve Units — Resolve Panels and Judge from Combo Data

> **Status**: `[x]` Ready for review
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0003 — Fusion First-Class (S1)
> **Action type**: EXTEND
> **Blocks**: Task 0012
> **Depends on**: Task 0010

---

## Objective

Create a `resolveFusionUnits` function that converts raw combo data (`models` array + `judge`/`judgeModel` fields) into typed `ResolvedFusionUnit[]` panels and a single `ResolvedFusionUnit` judge, ready for dispatch. This function is the bridge between stored combo data and the runtime dispatch layer.

The function MUST:
- Accept legacy string-only panels (backward compat)
- Accept `comboModelEntry` model steps
- Accept `combo-ref` steps (reusing `comboModelEntry` union — Decision D2)
- Resolve the judge using the precedence chain: `data.judge` → `config.judgeModel` → first panel (Decision D1)
- Return typed `ResolvedFusionUnit[]` and `ResolvedFusionUnit` (no Response dispatch — that is Task 0012)

## Background Context

### What already exists:
- `normalizeComboStep()` in `src/lib/combos/steps.ts:205-297` — normalizes raw step values to `ComboStep`
- `normalizeComboModels()` in `src/lib/combos/steps.ts:299-307` — normalizes full model arrays
- `resolveComboRuntimeUnits()` in `open-sse/services/combo/comboStructure.ts:616-625` — resolves units for combo dispatch
- `getOrderedTopLevelRuntimeSteps()` in `open-sse/services/combo/comboStructure.ts` — produces `ResolvedComboUnit[]`
- `ResolvedComboUnit` type at `open-sse/services/combo/types.ts:166`
- `HandleFusionChatOptions` at `open-sse/services/fusion.ts:203-211` — currently takes `models: string[]`

### What is missing:
- No function exists to specifically resolve fusion panels+judge from combo data into `ResolvedFusionUnit` typed arrays
- Current fusion dispatch in `combo.ts:881-890` and `combo.ts:917-926` manually flattens `combo.models` to strings, dropping combo-ref entries silently

---

## Test Requirements

- MUST resolve `["a", "b", "c"]` (legacy strings) to 3 `ResolvedFusionUnit` of `kind: "model"`
- MUST resolve `[{kind: "model", model: "x"}]` to 1 `ResolvedFusionUnit` of `kind: "model"`
- MUST resolve `[{kind: "combo-ref", comboName: "pool-1"}]` to 1 `ResolvedFusionUnit` of `kind: "combo-ref"`
- MUST resolve mixed arrays (strings + model steps + combo-refs)
- MUST resolve `data.judge` as a `combo-ref` when `{kind: "combo-ref", comboName: "judge-pool"}`
- MUST fall back to `config.judgeModel` string when `data.judge` is absent
- MUST fall back to first panel model when both `judge` and `judgeModel` are absent
- MUST return empty panels array for empty `models`
- MUST skip null/undefined/invalid entries in `models`

---

## Exit Conditions (GDD/TDD)

- [x] `resolveFusionUnits()` function exported from `open-sse/services/fusion.ts` (or a new `fusionUnits.ts` sibling)
- [x] Function signature: `(combo: ComboLike, allCombos?: ComboCollectionLike) => { panels: ResolvedFusionUnit[], judge: ResolvedFusionUnit }`
- [x] Handles legacy string panels, model-step panels, and combo-ref panels
- [x] Judge resolution follows D1 precedence: `data.judge` → `config.judgeModel` → first panel
- [x] Existing tests in `tests/unit/combo-fusion-strategy.test.ts` still pass
- [x] New tests in `tests/unit/fusion-units-resolve.test.ts` pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors
- [x] `node --import tsx/esm --test tests/unit/fusion-units-resolve.test.ts` passes
- [x] Entry in CHANGELOG.md added (at the TOP) — **draft in Completion Evidence** (CHANGELOG.md dirty/concurrent)

---

## Details

### What

Subtasks:
- [x] **Read existing code**: Read `open-sse/services/fusion.ts`, `open-sse/services/combo/comboStructure.ts` (especially `resolveComboRuntimeUnits` and `getOrderedTopLevelRuntimeSteps`), `src/lib/combos/steps.ts` (`normalizeComboStep`, `normalizeComboModels`), `open-sse/services/combo/types.ts`, `src/shared/validation/schemas/combo.ts`
- [x] **Create `resolveFusionUnits` function**: Either in `open-sse/services/fusion.ts` or a new `open-sse/services/fusionUnits.ts`. Reuse `normalizeComboStep` to parse each panel entry. Map normalized steps to `ResolvedFusionUnit`.
- [x] **Implement judge resolution**: Follow the 3-tier precedence. When `data.judge` is a `combo-ref`, return `kind: "combo-ref"`. When legacy string, return `kind: "model"`.
- [x] **Write tests (`tests/unit/fusion-units-resolve.test.ts`)**: Cover all resolution scenarios per Test Requirements.
- [x] **Refactoring pass**: Ensure function reuses existing normalization helpers; avoid reimplementing step parsing.
- [x] **Verification**: Run typecheck + lint + tests.

### Where

| File | Purpose |
|------|---------|
| `open-sse/services/fusion.ts` | Modify — add `resolveFusionUnits` (or create sibling `fusionUnits.ts`) |
| `open-sse/services/combo/comboStructure.ts` | Read — understand `resolveComboRuntimeUnits`, `getOrderedTopLevelRuntimeSteps` |
| `open-sse/services/combo/types.ts` | Read — `ResolvedComboUnit`, `ComboLike`, `ComboCollectionLike` |
| `src/lib/combos/steps.ts` | Read — `normalizeComboStep`, `normalizeComboModels`, `ComboStep` |
| `src/shared/validation/schemas/combo.ts` | Read — `comboModelEntry` union shape |
| `tests/unit/combo-fusion-strategy.test.ts` | Read — ensure regression safety |
| `tests/unit/fusion-units-resolve.test.ts` | Create — new tests |
| `CHANGELOG.md` | Modify — add entry at top |

### How

1. Define `resolveFusionUnits(combo, allCombos?)` that:
   a. Calls `normalizeComboModels(combo.models, { comboName: combo.name, allCombos })` to get typed `ComboStep[]`.
   b. Maps each `ComboStep` to a `ResolvedFusionUnit` (model → `{kind: "model", model: step.model, label: step.label}`, combo-ref → `{kind: "combo-ref", comboName: step.comboName, label: step.label}`).
   c. For the judge: checks `combo.judge` (top-level, from Task 0010 schema), then `combo.config?.judgeModel`, then falls back to `panels[0]`.
2. Export the function and types.
3. Test with legacy combos (string arrays), modern combos (typed steps), and combo-ref combos.

### Why

Without this resolution layer, the downstream dispatch (Task 0012) cannot know which panels are models vs. combo-refs, and cannot properly delegate combo-ref panels to `handleComboChat`. This is the data transformation step that enables Decision D3 (nesting via `handleComboChat`).

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT implement dispatch logic (calling `handleSingleModel` or `handleComboChat`) — that is Task 0012.
> DO NOT modify `combo.ts` dispatch branches — that is Task 0013.
> DO NOT create new database tables or migrations (Decision D4).

> [!IMPORTANT]
> Read EVERY file in "Where" before writing.
> The `judge` field is SEPARATE from panel models (Decision D1). Never treat a panel as judge based on step role.
> Reuse `normalizeComboStep` / `normalizeComboModels` — do not reimplement step parsing.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: All function names verified with `grep -rn`
- [x] **Zod Validation**: N/A (validation is in Task 0010; this task consumes validated data)
- [x] **Security**: No secrets committed
- [x] **Error Sanitization**: N/A (no HTTP handlers)
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Nothing deleted

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/services/fusion.ts` — export `resolveFusionUnits` (+ private `comboStepToFusionUnit`, `resolveJudgeUnit`); reuses `normalizeComboModels` / `normalizeComboStep` from `src/lib/combos/steps.ts`
  - `tests/unit/fusion-units-resolve.test.ts` — new (12 tests)
  - `tests/unit/combo-fusion-strategy.test.ts` — assertion fix only: panel calls keep `tools` and set `tool_choice: "none"` (matches live `handleFusionChat` behavior; was stale vs prior tools-strip change)
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/fusion-units-resolve.test.ts` → **12/12 pass**
  - `node --import tsx/esm --test tests/unit/combo-fusion-strategy.test.ts` → **6/6 pass** (after assertion alignment)
- **Resultado dos testes**: PASS (fusion-units-resolve 12 + combo-fusion-strategy 6 = 18/18 combined)
- **Resultado do lint**: `npx eslint open-sse/services/fusion.ts tests/unit/fusion-units-resolve.test.ts` → clean (no output)
- **Resultado do typecheck/build**: `npm run typecheck:core` → exit 0
- **Entrada no changelog**: **DRAFT for parent/reviewer closeout** (CHANGELOG.md already dirty with concurrent Unreleased work; avoid merge collision):

  ```markdown
  ### Added
  - **Fusion resolve units (Epic 0003 / Task 0011)**: `resolveFusionUnits(combo, allCombos?)`
    in `open-sse/services/fusion.ts` maps combo `models` + top-level `judge` /
    `config.judgeModel` into typed `{ panels: ResolvedFusionUnit[]; judge: ResolvedFusionUnit }`.
    Supports legacy strings, model steps, and combo-refs (D2); judge precedence
    `data.judge` → `config.judgeModel` → first panel (D1). No dispatch (Task 0012).
  ```

- **Changelog Draft** (builder protocol):
  - task: `0011-omniroute-fusion-resolve-units`
  - agent: `builder` (omniroute/builder)
  - project: `omniroute`
  - title: Fusion resolve units
  - description: Export `resolveFusionUnits` bridge from combo data to `ResolvedFusionUnit` panels/judge
  - summary: Reuse normalizeComboModels/normalizeComboStep; D1 judge precedence; unit tests 12/12
  - verification: `node --import tsx/esm --test tests/unit/fusion-units-resolve.test.ts`; `npm run typecheck:core`
- **Agente executor**: builder (omniroute/builder)
- **Data de conclusão**: 2026-07-09
- **Deviations**:
  - Did not edit CHANGELOG.md (dirty / concurrent Unreleased); draft above.
  - Minor regression-test assertion update in `combo-fusion-strategy.test.ts` so it matches intentional keep-tools + `tool_choice: "none"` panel body (pre-existing mismatch vs production code; not introduced by resolveFusionUnits).
  - No dispatch / no `combo.ts` changes / no migrations (D4).
- **Blockers**: none

### Entrypoint Chain Proof

- **Claim**: helper/library-only — pure data transform for Task 0012 to wire later
- **Entrypoint**: N/A this task (no production call site yet by design)
- **Helper/service**: `open-sse/services/fusion.ts::resolveFusionUnits`
- **Regression test**: `tests/unit/fusion-units-resolve.test.ts`
- **Evidence classification**: synthetic/factory-only (scoped as reusable resolve API; runtime wiring is Task 0012–0013)

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [pending]
- **Data da review**: [pending]
- **Veredito**: [pending]
- **Score (path to 100)**: [pending]
- **Notas**: [pending]
