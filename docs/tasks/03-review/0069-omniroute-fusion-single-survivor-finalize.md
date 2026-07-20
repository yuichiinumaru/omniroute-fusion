# Task 0069: Fusion Single-Survivor Finalize Without Double Upstream Failure

> **Status**: `[R]` Review accepted 100/100 — `03-review` (reviewers re-review 2026-07-19)  

> **Priority**: 🟢 P2  
> **Type**: `remediation` + `testing`  
> **Origin**: EPIC-11 — Wave 2 **H-FUSION-005** CONFIRMED (P2). Evidence: `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` §2 H-005, §4 “second call can fail after successful collect”, §6 T4; architect H-FUSION-005; FUSION.md / `fusion.ts` comments on intentional F3 re-dispatch (~566–568, single-survivor ~789–815). EPIC-11 locked default: **prefer return collected text** when body already in hand.  
> **Action type**: `HARDEN`  
> **Blocks**: Soft-blocks 0070 only if both land conflicting `finalizeWithActing` / collect plumbing — **0070 depends on 0069** when sharing `fusion.ts`  
> **Depends on**: none hard; recommend after 0067 if 0067 exported fusion helpers (otherwise independent)  
> **Parallelism**: **serializable** with **0070** (same file `open-sse/services/fusion.ts`). **parallel-safe** vs 0068. Coordinate with 0067 if 0067 touches `fusion.ts` exports.  
> **File ownership**: `open-sse/services/fusion.ts` (single-survivor / `finalWithoutActing` path), `tests/unit/fusion-combo-ref-dispatch.test.ts` (and/or sibling fusion unit tests).  
> **Review routing**: **bundled** review with 0070 when both land close together; else independent with fusion suite.

---

## Objective

Stop the single-survivor degrade path from **re-dispatching the surviving panel unit** when usable panel text was already collected during fan-out — a second upstream call that:

1. Doubles cost/latency/tokens (documented F3 residual).  
2. Can fail (429/5xx/breaker/cooldown) **after** the first success → client-visible error despite usable prose already in hand (Wave 2: worse than pure 2× cost).

**Target behavior (EPIC-11 default):**

- When `answers.length === 1` and **no acting**: build the final client Response from **already-collected text** (non-stream JSON chat completion shape consistent with existing helpers), **without** a second `dispatchFusionUnit` for that panel.  
- When client `stream: true` and product still requires a live stream from the survivor: either (a) synthesize SSE from collected text, or (b) re-dispatch **only** if synthesis is impossible — prefer (a) if the codebase already has JSON→SSE helpers; do not invent a new streaming stack.  
- When **acting** is set: keep current single-pass handoff (`reviewText` → `finalizeWithActing`); **no** third panel re-dispatch (already true — preserve with test).

Concrete success: existing test that asserts `seen.filter(m === "p/ok").length >= 2` for single-survivor is **rewritten** to assert **exactly one** upstream panel call (or one collect + zero re-dispatch), and a new test proves second-call failure cannot wipe a successful collect.

## Background Context

### O que já existe:
- Fan-out forces `panelBody` with `stream: false` + `tool_choice: "none"`; successful texts extracted into `answers[]`.  
- `answers.length === 1` → `finalizeWithActing` with `finalWithoutActing: () => dispatchFusionUnit({ body: client body, unit: survivor })` (~798–808).  
- Comment admits intentional re-dispatch so stream/tools match client (F3).  
- Test `fusion-combo-ref-dispatch.test.ts` ~479–501 asserts double call (`>= 2`).  
- With acting: survivor text handed once; no third re-dispatch.

### O que está faltando / quebrado:
- No “return collected text as JSON/SSE” fallback when re-dispatch would only re-fetch the same prose.  
- TOCTOU: collect success then second call failure → bad client outcome.  
- Cooldown/breaker can punish an account that just succeeded.

---

## Test Requirements

TDD-first: flip/extend single-survivor tests **before** changing `finalWithoutActing`.

- **DEVE** atualizar teste de single-survivor sem acting: survivor panel `handleSingleModel` count === **1** (collect only), response 200, body text equals collected panel text (or equivalent extract).  
- **DEVE** adicionar teste: mock first collect success; if any re-dispatch would return 5xx, client still receives 200 with collected text (proves no fail-after-success). Prefer implementation that never calls re-dispatch.  
- **DEVE** preservar: single-survivor **with acting** → panel once (non-stream collect) + acting once; no extra panel re-dispatch.  
- **DEVE** preservar: multi-panel success still runs judge (not survivor short-circuit).  
- **DEVE** preservar: `answers.length === 0` still 503 (total panel failure — acting-on-total-fail is **out of scope** unless already trivial; do not expand to H-014 product option).  
- **DEVE** rodar: `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts tests/unit/fusion-acting.test.ts`.

---

## Exit Conditions (GDD/TDD)

- [ ] TDD: single-survivor double-call golden flipped/replaced first  
- [ ] No re-dispatch of survivor when collected text exists (default path)  
- [ ] Client does not observe error solely because a second upstream call failed after collect success  
- [ ] Acting single-survivor path still green  
- [ ] Multi-panel + judge path unchanged  
- [ ] `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts` PASS  
- [ ] `node --import tsx/esm --test tests/unit/fusion-acting.test.ts` PASS  
- [ ] `npm run typecheck:core` passa sem erros  
- [ ] `npm run lint` passa sem erros novos nos arquivos tocados  
- [ ] Brief code comment updates F3 residual note to match new behavior (in `fusion.ts` only; FUSION.md operator notes can wait for **0071** if prose needs sync)  
- [ ] Completion Evidence preenchida  

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `fusion.ts` `withTimeout`/`collectPanel`, single-survivor block ~784–815, `finalizeWithActing` ~570–603, `extractPanelText`, any existing JSON response builders in fusion or open-sse utils used by fusion tests; `fusion-combo-ref-dispatch.test.ts` single-survivor test; Wave 2 H-005/T4; FUSION.md panel body / single-survivor notes  
- [ ] **TDD**: change double-call assertion; add fail-after-success guard test  
- [ ] **Implement** `finalWithoutActing` using collected `answers[0].text` (and model label) to synthesize Response  
- [ ] **Stream case**: choose synthesize-from-text vs limited re-dispatch; document choice in comment + test at least one stream or non-stream matrix row  
- [ ] **Regression** fusion-acting + combo-ref-dispatch  
- [ ] **Refactoring pass**: avoid duplicating large OpenAI response builders — reuse existing helpers if present (`grep` first)  
- [ ] **Verificação**: typecheck + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/fusion.ts` | Modificar — single-survivor finalize path / comments |
| `tests/unit/fusion-combo-ref-dispatch.test.ts` | Modificar — drop `>= 2` re-dispatch assert; add synthesis / fail-after-success |
| `tests/unit/fusion-acting.test.ts` | Ler + regressão acting survivor handoff |
| `open-sse/utils/error.ts` (or existing fusion `errorResponse` import path) | Ler — keep error construction consistent if needed |
| `docs/architecture/FUSION.md` | Ler — optional one-line residual note deferred to 0071 if large |
| `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` | Ler — H-005 evidence |

### How

1. Grep for helpers that build chat completion JSON Responses from text (tests often inline `jsonResponse(chatText(...))` — production may have similar).  
2. Replace `finalWithoutActing` re-`dispatchFusionUnit` with synthesis when `answers[0].text` non-empty.  
3. If text empty but resp was ok, keep conservative re-dispatch **or** 503 — pick one and test; prefer not silent empty 200.  
4. Leave judge path and multi-answer path untouched.  
5. Do **not** implement panel-timeout abort here (0070) — only touch collect/finalize as required for single-survivor.

### Why

Paying twice for the same survivor answer is already wasteful; failing the client after success is a correctness bug relative to operator expectation of “degrade gracefully.” EPIC-11 success metric #3 requires single-survivor not fail after successful text collection.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT keep double upstream as default and only document cost.  
> DO NOT break acting handoff (panel collect + acting once).  
> DO NOT change total-failure 503 into acting-only without a dedicated product decision task (Wave 2 T5 / H-014 extras).  
> DO NOT implement straggler AbortController here unless required for compile — that is **0070**.  
> DO NOT mark complete while `>= 2` re-dispatch assert still exists as the desired contract.  
> DO NOT touch :21000.

> [!IMPORTANT]
> Read single-survivor and `finalizeWithActing` fully before editing.  
> Search for existing response synthesis helpers before inventing new formats.  
> Keep panel D9 policy (`stream:false` / `tool_choice:none` on panel fan-out) intact.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Comments match new finalize behavior  
- [ ] **Zod Validation**: N/A  
- [ ] **Security**: No secret leakage in synthesized bodies  
- [ ] **Error Sanitization**: 503/400 still via existing helpers  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:  
  - `open-sse/services/fusion.ts` — `buildCollectedChatCompletionBody` / `responseFromCollectedPanelText`; single-survivor `finalWithoutActing` synthesizes JSON/SSE from collected text (no re-`dispatchFusionUnit`); F3 comment updated to H-FUSION-005 behavior  
  - `tests/unit/fusion-combo-ref-dispatch.test.ts` — flipped `>= 2` re-dispatch golden; added fail-after-success + stream SSE synthesis tests  
  - `tests/unit/fusion-acting.test.ts` — single-survivor + acting regression (panel once + acting once)
- **Testes que verificam o trabalho**:  
  - `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts tests/unit/fusion-acting.test.ts`
- **Resultado dos testes**:  
  - PASS — 28 tests, 0 fail (includes 3 new/rewritten single-survivor cases + acting survivor)
- **Resultado do lint**:  
  - `npx eslint open-sse/services/fusion.ts tests/unit/fusion-combo-ref-dispatch.test.ts tests/unit/fusion-acting.test.ts` — exit 0, no errors
- **Resultado do typecheck**:  
  - `npm run typecheck:core` — exit 0
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-19  

Exit checklist:
- [x] TDD: single-survivor double-call golden flipped/replaced first  
- [x] No re-dispatch of survivor when collected text exists (default path)  
- [x] Client does not observe error solely because a second upstream call failed after collect success  
- [x] Acting single-survivor path still green  
- [x] Multi-panel + judge path unchanged  
- [x] fusion-combo-ref-dispatch + fusion-acting PASS  
- [x] typecheck:core + eslint clean on touched files  
- [x] F3 residual comment updated in fusion.ts only  


---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Builders review**: gt-ts-code-reviewer — H-FUSION-005 closed (collect-once synthesis). Path-to-100 polish (JSDoc restore, cycle-test comment). Bundled serial with 0070.
- **Lane**: promoted `02-doing` → `03-review`

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
- **Full report**: `docs/reports/reviews/2026-07-19-task-0069-omniroute-fusion-single-survivor-finalize-rereview.md`
- **Lane outcome**: remains in `03-review`
- **Task reference**: Task 0069 (`omniroute-fusion-single-survivor-finalize`)

#### Current Open Blockers

- none

#### Path-to-100 Summary

- No patches required; single-survivor collect-once synthesis reconfirmed; fail-after-success impossible.

### Previous Reports

- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0069.md`
  - **Carried forward**: none
  - **Resolved since**: H-FUSION-005 F3 re-dispatch; stream SSE synthesis
  - **Regression guard**: panel call count === 1; hypothetical 2nd call 5xx still 200
