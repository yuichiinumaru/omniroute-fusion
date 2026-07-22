# Task 0109: EPIC-22 T22-C — Runtime per-panel cognitive inject + judgeMode

> **Status**: `[x]` Implemented · formal review **100/100** → `03-review`  

> **Priority**: 🟡 P1  
> **Type**: `feature` + `testing`  
> **Origin**: EPIC-22 D8–D9 · anti-bullshit core  
> **Blocks**: practical value of EPIC-22; unblocks 0111 recipe truth  
> **Depends on**: **0107** (lens text), **0108** (fields on `ResolvedFusionUnit`)  
> **Parallelism**: `serializable` after 0108; **collision** on `fusion.ts` fan-out — do not parallel with other fusion runtime tasks  
> **Review routing**: independent · must score body-capture tests  

---

## Objective

When a fusion panel unit has `thinkingMode` and/or `systemAddon`, the body dispatched to that unit must include the composed system text via `injectCustomSystemPrompt`. Different modes on different panels ⇒ **different** captured system blobs. Optional `judgeMode` changes judge directive only.

**This is the anti-bullshit task.** UI without this is config theater.

---

## Background Context

### O que já existe:
- Shared `panelBody` built once (`fusion.ts` ~845–847) then fan-out map (~866)  
- `appendUserTurn` / `buildJudgePrompt` / `buildActingHandoffPrompt`  
- `injectCustomSystemPrompt` multi-format system merge  
- Body capture tests: `fusion-panel-tools-none`, `fusion-combo-ref-dispatch`, `combo-fusion-strategy`  
- Catalog + plumb from 0107/0108  

### O que está faltando:
- Per-unit body clone + lens apply  
- Judge mode variants  
- Diversity assertions  

---

## Test Requirements

- [x] **Baseline**: two panels, no modes → no `[omniroute-lens:` in system; D9 still holds (`stream:false`, `tool_choice:"none"`, tools kept)  
- [x] **Diversity**: panel A `first-principles`, panel B `adversarial` → system blobs differ; each matches own fingerprint  
- [x] **Composition**: mode + `systemAddon` ⇒ both preset fingerprint and addon substring present  
- [x] **Custom**: `custom` + addon injects addon; no other lens fingerprint required  
- [x] **Judge isolation**: panel lens fingerprints **absent** from judge body  
- [x] **Judge mode**: `pick-best` (or `dialectical`) judge prompt ≠ default synthesize prompt (substring assert)  
- [x] **Single-panel early path**: if unit has mode, inject still applies  
- [x] **Existing** `fusion-panel-tools-none` + `fusion-acting` + `fusion-timeout-abort` still PASS  
- [x] Combo-ref panel with no mode does not throw; body still D9  

---

## Exit Conditions (GDD/TDD)

- [x] All Test Requirements green  
- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts` PASS  
- [x] `node --import tsx/esm --test tests/unit/fusion-panel-tools-none.test.ts` PASS  
- [x] `node --import tsx/esm --test tests/unit/fusion-acting.test.ts` PASS  
- [x] `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts` PASS  
- [x] `npm run typecheck:core` PASS  
- [x] `npm run lint` no new errors on touched files  
- [x] Changelog ledger entry  
- [x] No MCP tools; no default-on global inject  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `fusion.ts` (`handleFusionChatV2`, `dispatchFusionUnit`, single-panel branch, `buildJudgePrompt`), `systemPrompt.ts`, catalog helpers, 0108 unit shape, fail-first contract doc  
- [x] **Implement** `applyFusionCognitiveLens(body, unit): Body` pure wrapper: resolve text → if empty return body; else `injectCustomSystemPrompt(clone, text)`  
- [x] **Fan-out**: clone per unit — never mutate shared `panelBodyBase`  
- [x] **Single-panel** paths apply same helper  
- [x] **Judge**: read `judgeMode` from options/config; branch `buildJudgePrompt` (or pure directive from catalog)  
- [x] **Wire** combo.ts only if judgeMode not already on options  
- [x] **Tests**: unskip/implement diversity section; keep D9  
- [x] **Refactoring pass**: helper small; no unrelated fusion refactors  
- [x] **Verificação de regressão**: full fusion unit set listed above  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/fusion.ts` | **Modificar** — inject hook + judgeMode |
| `open-sse/services/systemPrompt.ts` | **Ler** / only modify if Gemini system_instruction gap proven by test |
| `open-sse/services/combo.ts` | **Modificar** se preciso passar judgeMode |
| `src/shared/constants/fusionCognitiveLenses.ts` | **Ler** / minor if judge directives incomplete |
| `tests/unit/fusion-cognitive-diversity.test.ts` | **Modificar** — runtime anti-bullshit |
| `tests/unit/fusion-panel-tools-none.test.ts` | **Rodar** regression |

### How

1. Build `panelBodyBase` once (D9 flags).  
2. In `panel.map`: `const unitBody = applyFusionCognitiveLens(panelBodyBase, unit)`.  
3. Compose text: `resolvePanelLensText(unit.thinkingMode, unit.systemAddon)`.  
4. Judge: do not pass panel lenses into judge body; only change directive string by `judgeMode`.  
5. Prefer not logging full systemAddon (PII/noise); optional debug flag later (EPIC-23).  

### Why

Operator config only matters if the proxy **forces** diverse framing. This task is the product.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **Depends** | 0107, 0108 |
| **Collision** | `open-sse/services/fusion.ts` entire fan-out/judge section |
| **May parallel** | 0110 after 0108 if UI does not need runtime (editor-only) — but E2E truth needs 0109 |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT claim complete if all panel bodies still share identical system content under different modes.  
> DO NOT inject on acting handoff user turn.  
> DO NOT strip tools from panel body (D9).  
> DO NOT enable inject for non-fusion strategies in this task.  
> PORT 21000 = production.

> [!IMPORTANT]
> Capture bodies in tests with the same mock style as `fusion-panel-tools-none`.  
> Fingerprints from 0107 are the oracle.

---

## 🛡️ Compliance Checklist

- [ ] **Doc Accuracy**: N/A until 0111  
- [ ] **Zod Validation**: fields from 0108  
- [ ] **Security**: operator-trusted addon only; no client header override  
- [ ] **Error Sanitization**: N/A  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `open-sse/services/fusion.ts` — `applyFusionCognitiveLens`, per-panel inject, `buildJudgePrompt(..., judgeMode?)`, `HandleFusionChatOptionsV2.judgeMode`
  - `open-sse/services/combo.ts` — pass `config.judgeMode` into V2
  - `tests/unit/fusion-cognitive-diversity.test.ts` — 0109 runtime suite unskipped + implemented
  - `.changelog/20260722-040445-0109-epic22-cognitive-runtime-inject-builders.md`
- **Testes que verificam o trabalho**:
  - `tests/unit/fusion-cognitive-diversity.test.ts` (runtime anti-bullshit)
  - regression: `fusion-panel-tools-none`, `fusion-acting`, `fusion-timeout-abort`, `fusion-combo-ref-dispatch`
- **Resultado dos testes**:
  - cognitive + panel-tools-none + acting + timeout-abort: **49 pass**, 1 skip (0110 editor), 0 fail
  - fusion-combo-ref-dispatch: **19 pass**
- **Resultado do lint**: `npx eslint --max-warnings=0 open-sse/services/fusion.ts open-sse/services/combo.ts tests/unit/fusion-cognitive-diversity.test.ts` — clean
- **Resultado do typecheck/build**: `npm run typecheck:core` — clean
- **Entrada no changelog**: `.changelog/20260722-040445-0109-epic22-cognitive-runtime-inject-builders.md`
- **Agente executor**: gt-ts-engineer (builders lane)
- **Data de conclusão**: 2026-07-22
- **Lane note**: formal review accepted; moved to `docs/tasks/03-review/`

---

## 🔍 Review Ledger

| Field | Value |
|-------|-------|
| **Reviewer** | `gt-ts-code-reviewer` (parent agentID=`builders`) |
| **Data da review** | 2026-07-22 |
| **Veredito** | `ACCEPTED_100` / `PASS_PERFECT` |
| **Score** | `100/100` |
| **Latest report** | [`docs/reports/reviews/2026-07-22-task-0109-epic22-cognitive-runtime-inject-review.md`](../../reports/reviews/2026-07-22-task-0109-epic22-cognitive-runtime-inject-review.md) |
| **Previous reports** | none (initial review) |
| **Lane** | `02-doing` → `03-review` (S=100) |
| **Notas** | Anti-bullshit body-capture green; panel lens isolated from judge; acting handoff uninjected; D9 preserved under inject; combo.ts judgeMode wired |
