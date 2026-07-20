# Task 0070: Fusion Parallel Panel Timeout Abort / Breaker Blast Mitigation

> **Status**: `[R]` Review accepted 100/100 — `03-review` (reviewers re-review 2026-07-19)  

> **Priority**: 🟢 P2  
> **Type**: `remediation` + `testing`  
> **Origin**: EPIC-11 — Wave 2 **H-FUSION-014** CONFIRMED (P2) + additional “withTimeout never aborts” finding. Evidence: `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` §2 H-014, §3.3 orphaned work, §4 withTimeout/quorum-grace, §6 T4 abort; architect H-FUSION-014; code `fusion.ts` `withTimeout` (~174–190) and `collectPanel` (~201–237) and fan-out (~724–738).  
> **Action type**: `HARDEN`  
> **Blocks**: none  
> **Depends on**: **0069** (serial — both own `open-sse/services/fusion.ts`; land 0069 first or single agent sequential ownership)  
> **Parallelism**: **serializable** after 0069. **parallel-safe** vs 0067/0068 if those avoid `fusion.ts`. Soft-conflicts with 0071 only on FUSION.md resilience notes.  
> **File ownership**: `open-sse/services/fusion.ts` (timeout/collect/fan-out abort plumbing), tests under `tests/unit/fusion-*.test.ts` (new or extend collect/timeout cases). May **thread** AbortSignal into `dispatchFusionUnit` / combo base — read `comboChatBase.signal` patterns before inventing parallel abort channels.  
> **Review routing**: **bundled** with 0069 when stacked; else fusion-suite independent review.

---

## Objective

Mitigate parallel panel **blast radius**: today, when fusion drops a panel (hard timeout, straggler grace finish, or collect resolution), the **underlying `dispatchFusionUnit` promise keeps running** (`withTimeout` comment: “the loser keeps running but is ignored”). Late 429/5xx still flow through normal account cooldown / provider breaker paths **after** fusion already advanced or 503’d — N panels on the same provider family amplify H-014.

**Target behavior:**

1. Each panel dispatch gets an **AbortController** (or child signal linked to client `comboChatBase.signal` + fusion timeout).  
2. When `collectPanel` finishes (hard timeout, grace, or all settled) **or** a per-call `withTimeout` fires, **abort** the corresponding panel work so losers stop billing and stop tripping breakers late.  
3. Client-visible fusion semantics stay the same: quorum-grace still prefers enough successes; total failure still 503; no silent change to minPanel math.  
4. If full abort plumbing is blocked by handler APIs that ignore signals, implement **maximum feasible mitigation** + unit proof of abort signaling, and leave a precise residual comment — do **not** fake abort.

Concrete success: unit test shows abort fired for timed-out/dropped panels; no regression on happy-path multi-panel fusion.

## Background Context

### O que já existe:
- `withTimeout(promise, ms)` races a timer; does not cancel the promise.  
- `collectPanel` finishes early on quorum+grace or hard timer; sparse array leaves slots undefined; late promises still resolve into ignored state while upstream continues.  
- Fan-out: `panel.map(unit => withTimeout(dispatchFusionUnit(...), panelHardTimeoutMs))`.  
- `comboChatBase.signal` exists for client abort into nested combo-ref — pattern to extend, not reinvent.  
- Resilience layers documented in RESILIENCE_GUIDE (breaker / cooldown / lockout) — fusion does not isolate providers today.

### O que está faltando / quebrado:
- No abort-on-drop for stragglers.  
- Orphaned upstream work burns quota and can poison accounts after fusion moved on.  
- Acting is **not** a total-failure degrade path (out of scope for this task — do not add “panels dead → acting” product option here).

---

## Test Requirements

TDD-first where abort is observable via mocks.

- **DEVE** adicionar ≥1 teste: panel promise still pending when hard timeout / collect finishes → associated AbortSignal becomes **aborted** (or mock `handleSingleModel` observes aborted signal / abort listener called).  
- **DEVE** adicionar ≥1 teste: successful panels before grace are **not** aborted spuriously before their Response is consumed for text extract.  
- **DEVE** preservar: multi-panel quorum still returns 200 with judge/synthesis when enough panels ok (existing fusion tests).  
- **DEVE** preservar: all panels fail/timeout → 503.  
- **DEVE** se client `signal` already aborted: panel work should not start or should abort promptly (best-effort).  
- **DEVE** rodar: `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts` plus any new `tests/unit/fusion-timeout-abort.test.ts` (name flexible).  
- **DEVE** não quebrar: `tests/unit/fusion-acting.test.ts`, `tests/unit/combo-fusion-strategy.test.ts`.

---

## Exit Conditions (GDD/TDD)

- [ ] Depends-on 0069 merged or completed in-branch before conflicting edits (serial ownership of `fusion.ts`)  
- [ ] TDD abort tests written and green  
- [ ] Timed-out / dropped panel dispatches receive abort (implementation or proven best-effort residual documented in code comment if API cannot cancel fetch mid-flight)  
- [ ] Quorum-grace and hard timeout semantics preserved (same defaults from `FUSION_DEFAULTS` / tuning fields)  
- [ ] No change to A6 miss path (0067) or tool-call window (0068)  
- [ ] Relevant fusion unit tests PASS  
- [ ] `npm run typecheck:core` passa sem erros  
- [ ] `npm run lint` passa sem erros novos nos arquivos tocados  
- [ ] Completion Evidence with real outputs  

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `fusion.ts` `withTimeout`, `collectPanel`, fan-out loop, `dispatchFusionUnit`, `FusionComboChatBase`; how `handleSingleModel` / combo chat honor `signal`; existing timeout tests in fusion-combo-ref-dispatch / combo-fusion-strategy; Wave 2 H-014/T4; RESILIENCE_GUIDE only as context  
- [ ] **Design abort graph**: per-panel AbortController linked to parent signal + timeout  
- [ ] **TDD**: mock handleSingleModel capturing signal; assert abort on timeout drop  
- [ ] **Implement** abort wiring; ensure text extract from successful Responses still works (clone/json before aborting siblings)  
- [ ] **Order of operations**: collect → extract successes → abort stragglers (or abort on finish after copying ok responses)  
- [ ] **Regression** fusion suite  
- [ ] **Refactoring pass**: do not rewrite entire fusion V2; keep patch localized  
- [ ] **Verificação**: typecheck + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/fusion.ts` | Modificar — withTimeout/collectPanel/fan-out abort plumbing |
| `tests/unit/fusion-timeout-abort.test.ts` | Criar (preferred) — abort contract tests |
| `tests/unit/fusion-combo-ref-dispatch.test.ts` | Estender se harness already there |
| `tests/unit/fusion-acting.test.ts` | Regressão |
| `tests/unit/combo-fusion-strategy.test.ts` | Regressão |
| `open-sse/services/combo.ts` | Ler — how `fusionComboChatBase.signal` is built (~899–907) |
| `docs/architecture/RESILIENCE_GUIDE.md` | Ler — breaker/cooldown interaction (no drive-by rewrite) |
| `docs/architecture/FUSION.md` | Ler — optional resilience note → prefer **0071** for operator prose |
| `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` | Ler — H-014 evidence |

### How

1. Introduce per-panel `AbortController`. If `comboChatBase?.signal` is set, abort panel controller when parent aborts (`signal.addEventListener("abort", ...)`).  
2. Pass panel signal into `dispatchFusionUnit` → model path and combo-ref `handleComboChat` options (`signal` field).  
3. On `withTimeout` timeout **and** on `collectPanel` finish, abort still-pending panel controllers.  
4. Guard double-abort.  
5. Confirm successful Response bodies are fully read/cloned **before** sibling abort if needed.  
6. If `handleSingleModel` ignores signal: still pass it + test listener; document residual “best-effort abort signal” in comment with file:line.

### Why

Parallel fusion without abort-on-drop turns a single slow/failing provider into N concurrent failure stamps on resilience state (Wave 2 residual risk #3). Mitigating orphaned work is required for EPIC-11 success metric #4 (straggler abort or documented mitigation).

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT start this task’s `fusion.ts` edits while 0069 is mid-flight without sequential ownership.  
> DO NOT implement “all panels failed → acting-only” (product option T5 / out of EPIC-11 locked scope for this ID).  
> DO NOT remove quorum-grace or change default timeouts without tests + product note.  
> DO NOT claim breaker isolation across providers — only abort orphaned panel work.  
> DO NOT touch :21000 or live provider credentials.  
> DO NOT weaken error sanitization on 503 paths.

> [!IMPORTANT]
> Verify with grep whether `handleSingleModel` / chat helpers already accept `AbortSignal` before inventing a parallel options bag.  
> Abort siblings only after successful panels’ bodies are safely captured.  
> Keep Decision D9 panel body policy intact.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Residual limitations stated only if proven by code  
- [ ] **Zod Validation**: No new unvalidated public config (tuning fields already exist)  
- [ ] **Security**: Abort only; no new network sinks  
- [ ] **Error Sanitization**: Preserve `sanitizeErrorMessage` on panel throw logs  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:  
  - `open-sse/services/fusion.ts` — per-panel `AbortController` linked to `comboChatBase.signal`; `withTimeout(onTimeout)` aborts; after extract, abort dropped/timeout/error slots; `dispatchFusionUnit` passes `modelAbortSignal` (model) / `signal` (combo-ref); residual note that chatCore may not cancel mid-flight fetch unless handler honors signal  
  - `tests/unit/fusion-timeout-abort.test.ts` — **created** (hard timeout abort, success not pre-aborted, parent signal abort, quorum regression, all-timeout 503, grace straggler abort)  
  - `tests/unit/fusion-combo-ref-dispatch.test.ts` — comboChatBase panel signal assertion updated (child controller, not parent reference)
- **Testes que verificam o trabalho**:  
  - `node --import tsx/esm --test tests/unit/fusion-timeout-abort.test.ts tests/unit/fusion-combo-ref-dispatch.test.ts tests/unit/fusion-acting.test.ts tests/unit/combo-fusion-strategy.test.ts`
- **Resultado dos testes**:  
  - PASS — 56 tests, 0 fail
- **Resultado do lint**:  
  - `npx eslint open-sse/services/fusion.ts tests/unit/fusion-timeout-abort.test.ts tests/unit/fusion-combo-ref-dispatch.test.ts` — exit 0
- **Resultado do typecheck**:  
  - `npm run typecheck:core` — exit 0
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-19  

Exit checklist:
- [x] Depends-on 0069 completed serially in same ownership of `fusion.ts`  
- [x] TDD abort tests written and green  
- [x] Timed-out / dropped panel dispatches receive abort  
- [x] Quorum-grace and hard timeout semantics preserved  
- [x] No change to A6 miss path or tool-call window  
- [x] Relevant fusion unit tests PASS  
- [x] typecheck + lint clean  


---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Builders review**: gt-ts-code-reviewer — H-FUSION-014 closed (per-panel AbortController + withTimeout onTimeout + post-extract straggler abort). Residual mid-flight fetch cancel documented (chat.ts does not forward modelAbortSignal). Bundled serial with 0069.
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
- **Full report**: `docs/reports/reviews/2026-07-19-task-0070-omniroute-fusion-panel-timeout-abort-rereview.md`
- **Lane outcome**: remains in `03-review`
- **Task reference**: Task 0070 (`omniroute-fusion-panel-timeout-abort`)

#### Current Open Blockers

- none

#### Path-to-100 Summary

- No code patches required; abort signal graph reconfirmed; chat residual remains task-allowed best-effort.
- Docs residual honesty for operators applied on sibling Task 0071 (FUSION.md).

### Previous Reports

- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0070.md`
  - **Carried forward**: mid-flight fetch cancel residual (chat.ts)
  - **Resolved since**: H-FUSION-014 abort graph; parent listener lifetime
  - **Regression guard**: fusion-timeout-abort suite (hard timeout, success not pre-aborted, parent abort, grace straggler, 503 total fail)
