# Task 0108: EPIC-22 T22-B — Schema + normalize + ResolvedFusionUnit plumb

> **Status**: `[x]` Implemented · **Review**: ACCEPTED_100 → `03-review/`

> **Priority**: 🟡 P1  
> **Type**: `feature`  
> **Origin**: EPIC-22 D2–D7 · Cognitive diversity as config  
> **Blocks**: 0109 (runtime needs fields on unit), 0110 (save payload must pass Zod)  
> **Depends on**: **0107** (lens id enum SSoT — import ids for Zod enum)  
> **Parallelism**: `serializable` after 0107; **do not** parallel-edit `combo.ts` schema with unrelated epics without coordination  
> **Review routing**: independent · ts + schema contracts  

---

## Objective

Make `thinkingMode` + `systemAddon` (model steps) and `judgeMode` (combo config) **survive** Zod parse → step normalize → fusion unit resolve. Today Zod strips unknown keys and `comboStepToFusionUnit` drops everything except kind/model/label — without this task, UI save is a no-op.

Concrete outcomes:

1. Optional fields on `comboModelStepInputSchema`  
2. `custom` requires non-empty `systemAddon`  
3. `judgeMode` optional on runtime config  
4. `normalizeComboStep` + `ResolvedFusionUnit` + `comboStepToFusionUnit` preserve fields  
5. Round-trip tests green (schema → resolve)

**No** fan-out inject yet (that is 0109).

---

## Background Context

### O que já existe:
- `src/shared/validation/schemas/combo.ts` — `comboModelStepInputSchema`, `comboRuntimeConfigSchema` (`.passthrough()` at config root; `fusionTuning` `.strict()`)  
- `src/lib/combos/steps.ts` — `normalizeComboStep`  
- `open-sse/services/fusion.ts` — `ResolvedFusionUnit`, `comboStepToFusionUnit`, `resolveFusionUnits`  
- `tests/unit/fusion-contracts.test.ts`, `combo-config.test.ts`  

### O que está faltando / quebrado:
- No cognitive fields on schema  
- Normalize + fusion unit mapping drop unknown step keys  
- UI cannot round-trip what runtime never sees  

---

## Test Requirements

- [x] `createComboSchema` accepts model step `{ model, thinkingMode: "adversarial" }` and **keeps** `thinkingMode` on parsed data  
- [x] Rejects `thinkingMode: "turbo"`  
- [x] Rejects `thinkingMode: "custom"` without non-empty `systemAddon`  
- [x] Accepts `custom` + `systemAddon: "…"`  
- [x] Accepts optional `systemAddon` with preset mode  
- [x] `systemAddon` over max length fails (max **4000** per EPIC-22)  
- [x] `config.judgeMode: "pick-best"` accepted; unknown judgeMode rejected  
- [x] `normalizeComboStep` preserves mode+addon  
- [x] `resolveFusionUnits` / `comboStepToFusionUnit` puts mode+addon on model units  
- [x] Omit fields ⇒ parse + resolve identical to pre-feature shape (no required fields)

---

## Exit Conditions (GDD/TDD)

- [x] All Test Requirements asserted in unit tests (extend `fusion-contracts` / `combo-config` / `fusion-cognitive-diversity`)  
- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts` (schema section) PASS  
- [x] `node --import tsx/esm --test tests/unit/fusion-contracts.test.ts` PASS  
- [x] `node --import tsx/esm --test tests/unit/combo-config.test.ts` PASS if touched  
- [x] `npm run typecheck:core` PASS  
- [x] `npm run lint` no new errors on touched files  
- [x] Changelog ledger entry when code lands  
- [x] No DB migration (JSON combo blob only)

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `combo.ts` schema, `steps.ts` normalize, `fusion.ts` types + `comboStepToFusionUnit` + `resolveFusionUnits`, 0107 catalog exports, `fusion-contracts.test.ts`  
- [x] **Zod**: import lens/judge ids from SSoT; add optional `thinkingMode`, `systemAddon`; superRefine custom+addon; `judgeMode` on config (sibling of `fusionTuning`, **not** inside strict fusionTuning unless tests prove better)  
- [x] **Types**: `ComboModelStep` + any TS interfaces in `steps.ts`  
- [x] **normalizeComboStep**: copy mode+addon when present  
- [x] **fusion.ts**: extend `ResolvedFusionUnit` model arm; `comboStepToFusionUnit`  
- [x] **Tests**: schema accept/reject + resolve round-trip  
- [x] **Refactoring pass**: no drive-by refactors outside plumb  
- [x] **Verificação de regressão**: fusion-contracts + cognitive-diversity + typecheck  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/constants/fusionCognitiveLenses.ts` | **Ler** — enum source |
| `src/shared/validation/schemas/combo.ts` | **Modificar** — fields + refine |
| `src/lib/combos/steps.ts` | **Modificar** — normalize + types |
| `open-sse/services/fusion.ts` | **Modificar** — unit type + map only (no inject yet) |
| `tests/unit/fusion-cognitive-diversity.test.ts` | **Modificar** — schema/resolve section |
| `tests/unit/fusion-contracts.test.ts` | **Modificar** se couber round-trip |
| `tests/unit/combo-config.test.ts` | **Modificar** se judgeMode no config |

### How

1. Reuse `z.enum` from catalog const array (`z.enum(FUSION_COGNITIVE_LENS_IDS)` pattern).  
2. Do not add `.passthrough()` to model step as shortcut — explicit fields only.  
3. Leave `applyFusionCognitiveLens` / fan-out body clone to **0109**.  
4. Public catalog projection (`projectCombo.ts`) may omit cognitive fields (operator-private) unless product wants them public — **default: omit from public v1 combos projection**.  

### Why

Without plumb, 0110 UI and 0109 runtime are theater. Schema+normalize is the contract that makes config real.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **Depends** | 0107 complete (or same PR stacked) |
| **Collision** | `combo.ts` schema, `steps.ts`, `fusion.ts` type section |
| **parallel-safe** | 0111 docs after; 0110 after schema freeze |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT implement panel body inject here (0109).  
> DO NOT put `judgeMode` inside `fusionTuning` strict object without updating every fusionTuning test. Prefer config sibling.  
> DO NOT claim complete without proving parse **keeps** fields (not only “does not throw”).  
> PORT 21000 = production — no deploy.

> [!IMPORTANT]
> Read normalize + fusion unit map before editing — three places drop fields today.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: N/A code-first  
- [x] **Zod Validation**: all new inputs via Zod  
- [x] **Security**: systemAddon max length  
- [x] **Error Sanitization**: N/A  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/validation/schemas/combo.ts` — `thinkingMode` / `systemAddon` / `judgeMode` + refine + max 4000
  - `src/lib/combos/steps.ts` — `ComboModelStep` fields + `normalizeComboStep` preserve
  - `open-sse/services/fusion.ts` — `ResolvedFusionUnit` model arm + `comboStepToFusionUnit`
  - `tests/unit/fusion-cognitive-diversity.test.ts` — 0108 contracts unskipped + round-trip
  - `tests/unit/combo-config.test.ts` — judgeMode accept/reject
  - `tests/unit/fusion-contracts.test.ts` — unit type smoke for cognitive fields
  - `.changelog/20260722-010100-0108-epic22-cognitive-schema-normalize-plumb-builders.md`
- **Testes que verificam o trabalho**:
  - `tests/unit/fusion-cognitive-diversity.test.ts` (schema/normalize/resolve section)
  - `tests/unit/fusion-contracts.test.ts`
  - `tests/unit/combo-config.test.ts`
- **Resultado dos testes**:
  - `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-contracts.test.ts tests/unit/combo-config.test.ts` → **81 pass, 6 skip (0109/0110), 0 fail**
- **Resultado do lint**: `npx eslint` on touched files → clean (exit 0)
- **Resultado do typecheck/build**: `npm run typecheck:core` → clean (exit 0)
- **Entrada no changelog**: `.changelog/20260722-010100-0108-epic22-cognitive-schema-normalize-plumb-builders.md`
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-22
- **Lane note**: Promoted `02-doing` → `03-review/` after formal review score 100.

---

## 🔍 Review Trail

- **Reviewer**: `gt-ts-code-reviewer` (parent agentID=`builders`)
- **Data da review**: 2026-07-22
- **Veredito**: `ACCEPTED_100` / PASS_PERFECT → moved to `docs/tasks/03-review/`
- **Score (path to 100)**: 100
- **Notas**: Schema keeps thinkingMode/systemAddon/judgeMode; normalize + comboStepToFusionUnit plumb proven; omit path pre-feature shape. Reviewer fixed `ResolvedFusionUnit.thinkingMode` → `FusionCognitiveLensId` + SAFETY on `as Body`. Report: [`docs/reports/reviews/2026-07-22-task-0108-epic22-cognitive-schema-normalize-plumb-review.md`](../../reports/reviews/2026-07-22-task-0108-epic22-cognitive-schema-normalize-plumb-review.md)

### Review Ledger

| Round | Score | Verdict | Report |
|-------|-------|---------|--------|
| initial 2026-07-22 | 100 | ACCEPTED_100 | [review](../../reports/reviews/2026-07-22-task-0108-epic22-cognitive-schema-normalize-plumb-review.md) |
