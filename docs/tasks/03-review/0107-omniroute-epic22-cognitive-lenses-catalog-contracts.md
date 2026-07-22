# Task 0107: EPIC-22 T22-A — Cognitive lens catalog SSoT + fail-first contracts

> **Status**: `[x]` Review PASS 100 — moved to `03-review`  
> **Priority**: 🟡 P1  
> **Type**: `feature` + `testing`  
> **Origin**: EPIC-22 Cognitive diversity as config (`docs/tasks/00-planning/EPIC-22-omniroute-cognitive-diversity-fusion.md`)  
> **Blocks**: 0108 (schema), 0109 (runtime must match fingerprints), 0110 (UI labels may import ids)  
> **Depends on**: none (first gate of EPIC-22)  
> **Parallelism**: `serializable` as epic gate — land before 0108–0111  
> **Review routing**: independent · code-quality + unit contracts  

---

## Objective

Create the **single source of truth** for fusion **cognitive lenses** (operator-configured system text) and land **anti-bullshit unit contracts** so later schema/runtime/UI tasks cannot ship empty or correlating panel prompts.

Concrete outcomes:

1. Module exporting closed lens ids, resolve helpers, and stable test fingerprints (`[omniroute-lens:…]`).  
2. Pure unit tests green for catalog behavior.  
3. Skeleton/runtime diversity tests either green-stubbed with clear TODOs **or** co-located contracts that 0109 must satisfy (see Test Requirements).  
4. No MCP tools. No provider `reasoning_effort` naming.

---

## Background Context

### O que já existe:
- Fusion fan-out: `open-sse/services/fusion.ts` (`handleFusionChatV2`, shared `panelBody`)  
- System inject: `open-sse/services/systemPrompt.ts` → `injectCustomSystemPrompt`  
- Body-capture tests: `tests/unit/fusion-panel-tools-none.test.ts`  
- Epic + contract sketch: `docs/tasks/00-planning/EPIC-22-*.md`  

### O que está faltando:
- No `thinkingMode` / lens catalog  
- No shared fingerprints for regression  
- Panels always get identical body → no cognitive diversity config  

---

## Test Requirements

- [x] Every non-`custom` lens id resolves to **non-empty** text length ≥ 20  
- [x] Each preset inject string **includes** fingerprint `[omniroute-lens:<id>]`  
- [x] `custom` without addon → empty / null (no inject)  
- [x] `custom` + addon → returns addon (fingerprint optional on custom)  
- [x] `resolvePanelLensText(mode, addon)` composes preset + `\n\n` + addon when both set  
- [x] Exported id list is **exact** closed set from EPIC-22 D catalog (no `low`/`medium`/`high`)  
- [x] Unknown mode → throws or returns empty per chosen API — **documented in test**  
- [x] File `tests/unit/fusion-cognitive-diversity.test.ts` exists and is runnable via Node native runner  

---

## Exit Conditions (GDD/TDD)

- [x] Catalog module created and imported only from pure/tests (runtime wire is 0109)  
- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts` — catalog section **PASS**  
- [x] No Vitest required  
- [x] `npm run typecheck:core` clean for touched paths  
- [x] `npm run lint` no new errors on touched files  
- [x] Changelog ledger entry under `.changelog/` + rebuild process if project requires for this change  
- [ ] EPIC-22 child row for 0107 marked done only after review  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `open-sse/services/systemPrompt.ts`, `open-sse/services/fusion.ts` (header + `buildJudgePrompt`), `tests/unit/fusion-panel-tools-none.test.ts`, EPIC-22 §2–§6, `EPIC-22-fail-first-test-contract.md`  
- [x] **Criar** `src/shared/constants/fusionCognitiveLenses.ts` (prefer shared so UI can import without open-sse):  
  - `FUSION_COGNITIVE_LENS_IDS` as const  
  - `FusionCognitiveLensId` type  
  - `resolvePanelLensText(mode: string | undefined, systemAddon?: string | null): string`  
  - `isFusionCognitiveLensId(x: string): x is FusionCognitiveLensId`  
  - Optional: `FUSION_JUDGE_MODE_IDS` + `resolveJudgeModeDirective(mode)` stub texts for 0109 (allowed in this task if pure)  
- [x] **Lens copy**: short English operator/model-facing instructions; each preset ends with or contains `[omniroute-lens:<id>]`  
- [x] **Testes**: `tests/unit/fusion-cognitive-diversity.test.ts` — pure catalog section green; document runtime asserts as `test` that 0109 will implement **or** `test.skip` with message `EPIC-22/0109` (prefer skip only if cannot land red on main)  
- [x] **Refactoring pass**: catalog ≤ ~150 lines; no framework deps  
- [x] **Verificação de regressão**: run fusion-cognitive-diversity + typecheck  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/constants/fusionCognitiveLenses.ts` | **Criar** — SSoT lenses + resolve |
| `tests/unit/fusion-cognitive-diversity.test.ts` | **Criar** — pure + contract skeleton |
| `docs/tasks/00-planning/EPIC-22-fail-first-test-contract.md` | **Ler** — fingerprint convention |
| `docs/architecture/FUSION.md` | **Ler** only (docs update = 0111) |
| `open-sse/services/systemPrompt.ts` | **Ler** — inject contract awareness |

### How

1. Prefer `src/shared/constants/` so dashboard can import lens ids without pulling open-sse.  
2. Keep inject text model-facing English; UI i18n is 0110.  
3. Do **not** wire `fusion.ts` in this task unless trivial re-export (avoid collision with 0109).  
4. Judge mode directive strings may live here pure; `buildJudgePrompt` switch is 0109.  

### Why

Without a frozen catalog + fingerprints, runtime “inject” can ship as no-op or identical prompts and pass UI-only review. This task makes bullshit **test-detectable**.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | First EPIC-22 task |
| **Collision** | `fusionCognitiveLenses.ts`, `fusion-cognitive-diversity.test.ts` |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT name modes `low`/`medium`/`high`/`adaptive` (provider thinking collision).  
> DO NOT add MCP tools.  
> DO NOT mark complete without running the Node test command and pasting output in Completion Evidence.  
> PORT 21000 = production — do not deploy/mutate.

> [!IMPORTANT]
> Fingerprints are part of the public test contract — changing them requires updating tests in the same PR.  
> Default lens is **omit** — never invent a global default mode.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: ids grepped / match epic  
- [x] **Zod Validation**: N/A this task (0108)  
- [x] **Security**: no secrets; systemAddon max length enforced in 0108  
- [x] **Error Sanitization**: N/A  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/constants/fusionCognitiveLenses.ts` (NEW — SSoT lenses + judge pure helpers)
  - `tests/unit/fusion-cognitive-diversity.test.ts` (NEW — pure green + skip skeletons)
  - `.changelog/20260722-005719-0107-epic-22-t22-a-cognitive-lens-catalog-ssot-fail-first-contracts-builders.md`
- **Testes que verificam o trabalho**: `tests/unit/fusion-cognitive-diversity.test.ts`
- **Resultado dos testes**:
  ```
  node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts
  # Builder: 8 pass (catalog), 9 skip (0108/0109/0110), 0 fail, exit 0
  # Reviewer path-to-100 re-run: 10 pass, 9 skip, 0 fail, exit 0
  ```
- **Resultado do lint**: `npx eslint … --max-warnings=0` — clean (exit 0) this session
- **Resultado do typecheck/build**: `npm run typecheck:core` — clean (exit 0)
- **Entrada no changelog**: `.changelog/20260722-005719-0107-epic-22-t22-a-cognitive-lens-catalog-ssot-fail-first-contracts-builders.md`
- **API notes (unknown mode)**: `resolvePanelLensText` returns `""` for unknown non-empty mode ids (addon ignored) — documented in test `catalog: unknown non-empty mode returns empty`
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-22  
- **Lane**: promoted to `docs/tasks/03-review/` after review S=100

---

## 🔍 Review Ledger

- **Latest report**: [`docs/reports/reviews/2026-07-22-task-0107-epic22-cognitive-lenses-catalog-contracts-review.md`](../../reports/reviews/2026-07-22-task-0107-epic22-cognitive-lenses-catalog-contracts-review.md)
- **Previous reports**: none
- **Reviewer**: gt-ts-code-reviewer (parent agentID=`builders`)
- **Data da review**: 2026-07-22
- **Veredito**: `ACCEPTED_100` / `PASS_PERFECT`
- **Score**: 100/100 (local_implementation 100; runtime_enforcement N/A-by-contract → 100)
- **Path-to-100 applied by reviewer**: Set membership (no `as readonly string[]`); pairwise anti-correlation + whitespace-mode tests
- **Regression guards**: fingerprints immutable without co-test update; do not unskip 0108–0110 skeletons without green impl; unknown panel mode stays empty
- **Lane**: → `03-review/`
