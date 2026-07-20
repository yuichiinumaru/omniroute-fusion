# Task 0067: Fusion A6 Combo-Level Tests + dispatchActingOnly Honesty

> **Status**: `[R]` In review (gt-ts-code-reviewer 100/100 → 03-review 2026-07-19)  
> **Priority**: 🟡 P1  
> **Type**: `testing` + `remediation`  
> **Origin**: EPIC-11 Fusion Runtime Residuals — Wave 2 **H-FUSION-003** (CONFIRMED P1) + **H-FUSION-004** (CONFIRMED P2). Evidence: `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` §2, §6 T1/T2; `docs/reports/audits/2026-07-19-omniroute-architect-fusion-residual-audit.md` H-FUSION-003/004; product contract A6 in `docs/architecture/FUSION.md` (“Trigger miss path (A6)”).  
> **Action type**: `HARDEN` + `EXTEND` (tests)  
> **Blocks**: Honest Epic 0004 closeout; soft-blocks operator trust in conditional-fusion cost control  
> **Depends on**: Epic 0003/0004 runtime already in tree (`04-completed/0010–0018`); no open fusion child tasks  
> **Parallelism**: **parallel-safe** vs 0068 (different primary files: `combo.ts` vs `fusionTriggers.ts`). **serializable** vs 0069/0070 if this task exports or rewrites helpers inside `open-sse/services/fusion.ts` — default path must **not** edit `fusion.ts` (comment + tests only in `combo.ts`).  
> **File ownership**: `open-sse/services/combo.ts` (dispatchActingOnly + comments), `tests/unit/combo-fusion-strategy.test.ts` (primary). Read-only: `fusion.ts`, `fusion-acting.test.ts`.  
> **Review routing**: independent review OK if `fusion.ts` untouched; **bundle with 0069** if export/`dispatchFusionUnit` public surface changes.

---

## Objective

Close the highest Epic 0004 residual: **A6 (trigger miss → acting-only) is implemented in `combo.ts` but untested at the combo gate**, and `dispatchActingOnly` JSDoc actively contradicts the implementation (claims “V2 shortcut is NOT used” while calling `handleFusionChatV2({ panels: [acting], judge: acting })`).

**Concrete outcome:**

1. Combo-level regression tests prove A6 invariants through `handleComboChat` (not only pure `handleFusionChatV2` unit tests).  
2. Comments (and, only if strictly needed without expanding blast radius, a thin honest dispatch path) match runtime.  
3. Miss + no acting continues to fallback (existing coverage must remain green).

An agent reading only this objective can mark complete when: combo suite has A6 hit/miss+acting cases green, comments no longer lie, `combo.strategy` stays immutable, zero panel/judge on miss+acting.

## Background Context

### O que já existe:
- Gate at `open-sse/services/combo.ts` ~963–1008: conditional-fusion / gated fusion → `shouldTriggerFusion` → miss → `dispatchActingOnly()` then D8 fallback.  
- `dispatchActingOnly` ~939–960: resolves `acting` via `resolveFusionUnits`, then synthetic single-panel `handleFusionChatV2` (no `acting` field) so V2 single-panel branch (~638–650 in `fusion.ts`) returns one `dispatchFusionUnit` with client body.  
- Unit coverage: `tests/unit/fusion-acting.test.ts` (resolve + V2 handoff only).  
- Combo suite: `tests/unit/combo-fusion-strategy.test.ts` — miss → fallback, shared-object safety, tool/text modes — **grep `acting` / `dispatchActingOnly` / A6 = 0 hits** (Wave 2 CONFIRMED).  
- FUSION.md documents A6 operator path (acting-only vs fallback).

### O que está faltando / quebrado:
- **H-FUSION-003**: No combo-level A6 tests → regression can ship green under current combo suite.  
- **H-FUSION-004**: Block header comments claim “direct nested dispatch / V2 NOT used”; body uses V2 shortcut. Maintainability landmine if single-panel or judge-required logic changes.  
- Wave 2 residual risk #1: “Epic 0004 closeout blocked on proof, not skeleton.”

---

## Test Requirements

TDD-first: write failing combo-level tests **before** any comment/code honesty edit.

- **DEVE** adicionar ≥1 teste: `conditional-fusion` + trigger miss + top-level `acting` model → **exactly one** leaf `handleSingleModel` call to the acting model; **zero** panel models; **zero** judge model; response 200.  
- **DEVE** adicionar ≥1 teste: miss + acting **combo-ref** → exactly one nested `handleComboChat` to that combo name (when mocks track it); no panel fan-out / no judge.  
- **DEVE** adicionar ≥1 teste: miss + acting → `combo.strategy` permanece `"conditional-fusion"` (shared-object safety, mirror existing fallback immutability test).  
- **DEVE** adicionar ≥1 teste: miss + **no** acting → fallback strategy still hits a **panel** model (existing behavior; keep or strengthen — do not break H-FUSION-006 product truth).  
- **DEVE** adicionar ≥1 teste: trigger **hit** + acting configured → fusion path still runs panels/judge (and acting handoff if V2 is reached with full units) — at minimum assert judge or multi-panel activity so A6 miss is not “always acting”.  
- **DEVE** preservar client body surface on acting-only: original `stream` / `tools` / `tool_choice` not forced to panel policy (`stream:false` + `tool_choice:"none"`) on the sole acting dispatch (assert on mock-captured body).  
- **DEVE** manter verdes: `node --import tsx/esm --test tests/unit/combo-fusion-strategy.test.ts tests/unit/fusion-acting.test.ts`.

---

## Exit Conditions (GDD/TDD)

- [x] Failing A6 combo tests written first (TDD), then made green  
- [x] All Test Requirements above satisfied with named assertions  
- [x] `dispatchActingOnly` JSDoc / inline comments rewritten to match actual V2 single-panel shortcut **or** implementation changed to a true direct unit dispatch **without** silently changing A6 semantics  
- [x] If `fusion.ts` is modified: only minimal export/wrapper for honesty; call sites and single-panel short-circuit still pass `fusion-combo-ref-dispatch` / `fusion-acting` suites  
- [x] `node --import tsx/esm --test tests/unit/combo-fusion-strategy.test.ts` PASS  
- [x] `node --import tsx/esm --test tests/unit/fusion-acting.test.ts` PASS  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados  
- [x] Completion Evidence preenchida (comandos + output real)

---

## Details

### What

Subtasks:
- [x] **Ler código existente** (obrigatório primeiro):  
  - `open-sse/services/combo.ts` (`dispatchActingOnly`, fusion gate ~932–1008, `handleComboChat` entry)  
  - `open-sse/services/fusion.ts` (single-panel branch ~636–650, `resolveFusionUnits`, `handleFusionChatV2` signature)  
  - `tests/unit/combo-fusion-strategy.test.ts` (mock harness, miss/fallback patterns)  
  - `tests/unit/fusion-acting.test.ts` (what unit layer already proves)  
  - Evidence reports + FUSION.md A6 section  
- [x] **TDD — write A6 combo tests** that fail against current suite gaps (or fail-red if a bug is found)  
- [x] **Fix honesty**: rewrite comments; only if product requires, refactor to direct dispatch **without** double fan-out / judge  
- [x] **Green + regression**: full fusion-related unit subset listed in Exit Conditions  
- [x] **Refactoring pass**: keep diff minimal — no unrelated combo strategy cleanup  
- [x] **Verificação de regressão**: typecheck + lint + named tests

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/combo.ts` | Ler + modificar — `dispatchActingOnly` comments/path; gate A6 |
| `open-sse/services/fusion.ts` | Ler (default); modificar **somente** se export de unit-dispatch for necessário para honesty |
| `open-sse/services/fusionTriggers.ts` | Ler — trigger miss construction for tests only |
| `tests/unit/combo-fusion-strategy.test.ts` | Criar/estender — **primary** A6 combo-level cases |
| `tests/unit/fusion-acting.test.ts` | Ler + regressão (não duplicar V2-only coverage) |
| `tests/unit/fusion-combo-ref-dispatch.test.ts` | Ler + regressão se `fusion.ts` export change |
| `docs/architecture/FUSION.md` | Ler — A6 contract (docs edits belong to **0071**, not this task) |
| `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` | Ler — T1/T2 remediation themes |
| `docs/reports/audits/2026-07-19-omniroute-architect-fusion-residual-audit.md` | Ler — H-FUSION-003/004 |

### How

1. Copy existing `handleComboChat` mock patterns from `combo-fusion-strategy.test.ts` (fusionCalls / handleSingleModel stubs).  
2. Build a combo: `strategy: "conditional-fusion"`, panels `["p/a","p/b"]`, `judge`, top-level `acting: "p/acting"`, triggers mode `tool-call` with patterns that **miss** on a plain user message body.  
3. Assert call ledger: only `p/acting`.  
4. Second case: body with matching `tool_calls` → multi-panel/judge activity (hit path).  
5. Rewrite `dispatchActingOnly` comment block to state truthfully: “synthetic single-panel `handleFusionChatV2` short-circuit; `judge` unused when `panels.length === 1`; client body preserved.”  
6. **Do not** change D8 fallback model set (H-FUSION-006 is document-only / product residual — not this task).  
7. Prefer not exporting private `dispatchFusionUnit` unless comments alone leave a real landmine; if exporting, mark review as bundled with 0069.

### Why

Without combo-level A6 proof, conditional-fusion + acting can silently fall through to expensive panel fallback or double-dispatch on future refactors. Comment lies make the next “fix” more dangerous than the current shortcut. This is the minimum bar to close Epic 0004 acceptance honestly (EPIC-11 success metric #1).

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT mark complete without running the combo-fusion-strategy suite and pasting real PASS output in Completion Evidence.  
> DO NOT claim A6 is covered by `fusion-acting.test.ts` alone — Wave 2 proved that file never enters the `combo.ts` gate.  
> DO NOT mutate `combo.strategy` on the shared object.  
> DO NOT “fix” miss path by removing acting support or forcing always-fusion.  
> DO NOT expand scope into single-survivor re-dispatch (0069), timeout abort (0070), tool-call window (0068), or list UI (0071).  
> DO NOT touch production port **21000**; tests are unit-only.

> [!IMPORTANT]
> Read EVERY production file in Where before editing.  
> Grep `acting` in `combo-fusion-strategy.test.ts` after the work — must no longer be empty.  
> Prefer 2-space / double-quote / existing mock style in that test file.  
> Error responses remain via existing fusion/`errorResponse` paths — no raw `err.stack`.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: No new API/env names invented; only cite existing symbols verified by grep  
- [x] **Zod Validation**: No new unvalidated request inputs  
- [x] **Security**: No secrets; no SSRF surface changes  
- [x] **Error Sanitization**: No new unsanitized error bodies  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:  
  - `open-sse/services/combo.ts` — rewrote `dispatchActingOnly` JSDoc + inline comments to state the synthetic single-panel `handleFusionChatV2` short-circuit (judge unused when `panels.length === 1`; client body preserved; no `acting` handoff field). Runtime call unchanged. `fusion.ts` **not** modified.  
  - `tests/unit/combo-fusion-strategy.test.ts` — added 6 A6 combo-gate tests (miss+acting model, miss+acting combo-ref, body surface, strategy immutability, miss+no acting fallback, hit+acting full fusion).  
  - `docs/tasks/02-doing/0067-…` — completion evidence (task left in `02-doing` per parent instruction).  
- **Testes que verificam o trabalho**:  
  - `A6: trigger miss + acting model → acting-only (zero panels, zero judge)`  
  - `A6: trigger miss + acting combo-ref → only nested acting combo leaf (no panel/judge)`  
  - `A6: trigger miss + acting preserves client stream/tools/tool_choice (not panel policy)`  
  - `A6: trigger miss + acting must not mutate combo.strategy (shared-object safety)`  
  - `A6: trigger miss + no acting → fallback still hits a panel model`  
  - `A6: trigger hit + acting configured → fusion panels/judge still run (not always-acting)`  
  - Regression: full `combo-fusion-strategy.test.ts` + `fusion-acting.test.ts`  
- **Resultado dos testes**:  
  ```
  $ node --import tsx/esm --test tests/unit/combo-fusion-strategy.test.ts tests/unit/fusion-acting.test.ts
  ✔ … (16 pre-existing combo fusion tests)
  ✔ A6: trigger miss + acting model → acting-only (zero panels, zero judge)
  ✔ A6: trigger miss + acting combo-ref → only nested acting combo leaf (no panel/judge)
  ✔ A6: trigger miss + acting preserves client stream/tools/tool_choice (not panel policy)
  ✔ A6: trigger miss + acting must not mutate combo.strategy (shared-object safety)
  ✔ A6: trigger miss + no acting → fallback still hits a panel model
  ✔ A6: trigger hit + acting configured → fusion panels/judge still run (not always-acting)
  ✔ resolveFusionUnits — acting / buildActingHandoffPrompt / handleFusionChatV2 — acting handoff
  ℹ tests 30
  ℹ pass 30
  ℹ fail 0
  ℹ duration_ms 7591.391078
  ```  
- **Resultado do lint**:  
  ```
  $ npx eslint open-sse/services/combo.ts tests/unit/combo-fusion-strategy.test.ts
  (exit 0 — no errors/warnings on touched files)
  ```  
- **Resultado do typecheck**:  
  ```
  $ npm run typecheck:core
  > tsc --pretty false -p tsconfig.typecheck-core.json
  (exit 0 — clean)
  ```  
- **Agente executor**: gt-ts-engineer (parent builders)  
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Compact notes (builders wave)
1. **H-FUSION-003 CLOSED**: 6 named A6 combo-gate tests through real `handleComboChat`.
2. **H-FUSION-004 CLOSED**: `dispatchActingOnly` JSDoc matches synthetic single-panel V2 shortcut; `fusion.ts` untouched.
3. Path-to-100: combo-ref nested name via A6 info + fusion debug logs (`combo:acting-pool`); body surface includes `messages`; `panel.length` comment aligned.
4. OOS residual: H-FUSION-006 (D8 product) / 0068–0071.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports.

### Latest Review

- **Date**: 2026-07-19
- **Reviewer profile**: `reviewers` (independent FULL RE-REVIEW)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0067-omniroute-fusion-a6-combo-tests-acting-honesty-rereview.md`
- **Lane outcome**: remains in `03-review`
- **Task reference**: Task 0067 (`omniroute-fusion-a6-combo-tests-acting-honesty`)

#### Current Open Blockers

- none

#### Path-to-100 Summary

- No patches required this re-review; live 89 fusion residual tests + typecheck/eslint green.

### Previous Reports

- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0067-omniroute-fusion-a6-combo-tests-acting-honesty-ts-review.md`
  - **Carried forward**: none
  - **Resolved since**: H-FUSION-003/004, log/name proofs
  - **Regression guard**: 6 named A6 combo-gate tests through `handleComboChat`
- Task-embedded gt-ts-expert trail — Overall **97** (pre-formal 100)
