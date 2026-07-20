# Task 0068: Fusion tool-call Trigger Window (Sticky → Last Assistant Message)

> **Status**: `[R]` Review accepted 100/100 — `03-review` (gt-ts-code-reviewer 2026-07-19)  

> **Priority**: 🟢 P2  
> **Type**: `feature` residual / `remediation` + `testing`  
> **Origin**: EPIC-11 — Wave 2 **H-FUSION-008** CONFIRMED + sticky extension (P2). Evidence: `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` §2 H-008, §3.2 sticky table, §6 T3; architect audit H-FUSION-008; EPIC-11 locked decision default: **last assistant message only** (or last N turns) for conditional cost control.  
> **Action type**: `HARDEN` + product-semantic encode  
> **Blocks**: Accurate FUSION.md operator notes in **0071** (soft — 0071 should land after or with this semantics fix)  
> **Depends on**: none (runtime trigger module already shipped in 0014)  
> **Parallelism**: **parallel-safe** vs 0067 (owns `fusionTriggers.ts`; 0067 owns `combo.ts`). **parallel-safe** vs 0069/0070 (`fusion.ts`). **serializable** vs 0071 on `docs/architecture/FUSION.md` if both edit the Trigger modes section — prefer **0068 code+tests only**, leave prose polish to 0071 *after* this lands.  
> **File ownership**: `open-sse/services/fusionTriggers.ts`, `tests/unit/fusion-triggers.test.ts`. Do **not** edit `combo.ts` / `fusion.ts` unless a pure re-export is required (should not be).  
> **Review routing**: independent (triggers pure module).

---

## Objective

Encode the EPIC-11 product decision: **`tool-call` trigger must not remain sticky across the rest of conversation history**.

**Today (Wave 2):** `hasMatchingToolCall` walks **backwards** to the most recent assistant message that **has** `tool_calls`, then glob-matches names. If later assistant turns are plain text (no `tool_calls`), that **prior** write-shaped tool_calls message still wins → **subsequent user turns keep firing fusion** until a newer tool_calls-bearing assistant appears. Effect: conditional-fusion can become **de facto always-on** in multi-turn agent loops after one write tool turn.

**Target semantics (locked default):** match only when the **latest assistant message** (most recent `role === "assistant"` in `messages`) **itself** carries `tool_calls` whose names match patterns. If the latest assistant has no `tool_calls`, return false (do not search older history).

**Optional allowed refinement (only if documented in tests):** “last N assistant turns” with N=1 is the default; if implementing N>1, require an explicit constant and tests — do **not** invent schema fields without product approval.

Concrete success: unit matrix proves write → tool result → plain assistant → user follow-up does **not** re-fire; hit still works when the latest assistant proposes matching tools.

## Background Context

### O que já existe:
- `open-sse/services/fusionTriggers.ts`: `hasMatchingToolCall` (~56–84), `shouldTriggerFusion`, defaults `DEFAULT_FUSION_TOOL_PATTERNS` (`write*`, `edit*`, `create*`).  
- `tests/unit/fusion-triggers.test.ts`: codifies “last tool_calls-bearing assistant wins” (sticky).  
- Combo gate consumes `shouldTriggerFusion` only — changing the pure matcher updates all gated fusion paths.  
- FUSION.md Trigger modes table currently says: “Last assistant message with `tool_calls`…” — **ambiguous** vs sticky walk (reads like last-with-tools, which is sticky).

### O que está faltando / quebrado:
- Sticky residual confirmed stronger than “fires after write once”.  
- Operator mental model (“cost only on write turns”) fails for follow-up chat.  
- Tests currently **protect the bug/product-surprise** — they must be rewritten as the contract, not preserved as sacred golden behavior.

---

## Test Requirements

TDD-first: update/add tests **before** changing matcher implementation; expect red on sticky cases after flipping expected assertions, then implement.

- **DEVE** falhar (antes do fix) / passar (depois): history  
  `user` → `assistant(tool_calls: write_file)` → `tool` → `assistant(text only)` → `user("ok continue")`  
  with patterns `write*` → `hasMatchingToolCall` / `shouldTriggerFusion` = **false**.  
- **DEVE** passar: latest message is assistant with matching `tool_calls` → **true**.  
- **DEVE** passar: latest assistant has non-matching tool names only → **false**.  
- **DEVE** passar: latest assistant has bare `name` shape (non-`function.name`) matching pattern → **true** (preserve Wave 2 note on bare name matching).  
- **DEVE** passar: empty patterns → false; empty messages → false.  
- **DEVE** não regredir: `text-match` still uses **latest user** only (not sticky across roles).  
- **DEVE** não regredir: `always` mode still always true; unknown mode still false.  
- **DEVE** incluir ≥1 multi-turn matrix test documenting agent-loop cost control.  
- **DEVE** rodar: `node --import tsx/esm --test tests/unit/fusion-triggers.test.ts`.

---

## Exit Conditions (GDD/TDD)

- [x] Product decision encoded: **latest assistant message only** for `tool-call` (sticky history walk removed)  
- [x] TDD sequence followed (tests first, then implementation)  
- [x] All Test Requirements checkboxes effectively satisfied  
- [x] Existing sticky-favoring assertions in `fusion-triggers.test.ts` updated (no silent keep of wrong goldens)  
- [x] `node --import tsx/esm --test tests/unit/fusion-triggers.test.ts` PASS  
- [x] Spot-check: `node --import tsx/esm --test tests/unit/combo-fusion-strategy.test.ts` still PASS (bodies with tool_calls on latest assistant still hit)  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados  
- [x] No schema/UI `requireApproval` work (H-FUSION-009 out of scope)  
- [x] Completion Evidence with real command output  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `fusionTriggers.ts` full module; `fusion-triggers.test.ts`; combo-fusion-strategy trigger hit fixtures; FUSION.md Trigger modes (read-only); Wave 2 §2/§3.2/§6 T3  
- [x] **Rewrite test contract** for last-assistant-window semantics (TDD red)  
- [x] **Implement** `hasMatchingToolCall` to inspect only the latest assistant message (scan from end for first assistant, then require its `tool_calls`) — **do not** continue walking past that assistant for older tool_calls  
- [x] **Update comments** on `hasMatchingToolCall` (remove “pending tool-use turn” ambiguity if outdated)  
- [x] **Regression**: triggers + combo-fusion-strategy suites  
- [x] **Refactoring pass**: keep pure module dependency-light (no translator imports)  
- [x] **Verificação**: typecheck + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/fusionTriggers.ts` | Modificar — `hasMatchingToolCall` window semantics + comments |
| `tests/unit/fusion-triggers.test.ts` | Modificar — multi-turn matrix; flip sticky goldens |
| `tests/unit/combo-fusion-strategy.test.ts` | Ler + regressão (hit bodies must still place tool_calls on latest assistant) |
| `open-sse/services/combo.ts` | Ler only — gate call site `shouldTriggerFusion` |
| `docs/architecture/FUSION.md` | Ler only — **0071** owns operator prose update for this decision |
| `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` | Ler — sticky residual evidence |
| `docs/tasks/00-planning/EPIC-11-omniroute-fusion-runtime-residuals.md` | Ler — locked decision table |

### How

1. Identify current loop: for `i = len-1 … 0`, skip non-assistant, skip assistants without tool_calls, **return on first tool_calls-bearing assistant**.  
2. Replace with: find latest assistant (`role === "assistant"`), if none or no `tool_calls` array → false; else match names with existing `matchGlob` / bare-name fallback.  
3. Do **not** add new trigger modes or schema fields in this task.  
4. Keep `text-match` / D8 helpers untouched except shared comment cleanup if needed.  
5. If any combo-level test embeds multi-turn history that relied on sticky match, update the fixture so the matching assistant is last (or accept intentional miss).

### Why

Conditional-fusion exists to **avoid** paying N-panel cost on every turn. Sticky tool-call matching undermines that product reason after the first write tool in history (Wave 2 residual risk #2). Encoding last-assistant-only is the EPIC-11 grill default and is the smallest change with the largest cost-control payoff.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT keep sticky behavior and only “document it” — EPIC-11 default is **last assistant only**.  
> DO NOT invent pending-tool-use / unmatched-tool-result matching unless product re-opens the grill (Wave 2 listed it as an alternate option, not the locked default).  
> DO NOT change `text-match` to scan full history.  
> DO NOT edit `fusion.ts` fan-out or `dispatchActingOnly`.  
> DO NOT update FUSION.md list UI (0071).  
> DO NOT touch :21000.

> [!IMPORTANT]
> Read the full `fusionTriggers.ts` module before editing.  
> After the change, grep tests for phrases like “last tool_calls-bearing” and update them so they do not re-encode sticky.  
> Preserve fail-closed empty pattern behavior.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Semantics claims match code after change  
- [x] **Zod Validation**: No new config fields without schema (out of scope)  
- [x] **Security**: Pure matcher only; no eval on patterns  
- [x] **Error Sanitization**: N/A  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:  
  - `open-sse/services/fusionTriggers.ts` — `hasMatchingToolCall` now matches only the latest assistant message (N=1 window); sticky history walk removed; comments updated for EPIC-11/0068  
  - `tests/unit/fusion-triggers.test.ts` — flipped sticky goldens; bare-name, multi-turn agent-loop matrix, text-match latest-user regression  
  - Task left in `docs/tasks/02-doing/` (not moved)  
- **Testes que verificam o trabalho**:  
  - `tests/unit/fusion-triggers.test.ts` (contract + matrix)  
  - `tests/unit/combo-fusion-strategy.test.ts` (regression; tool_calls on latest assistant still hit)  
- **Resultado dos testes**:  
  ```
  $ node --import tsx/esm --test tests/unit/fusion-triggers.test.ts
  ℹ tests 32
  ℹ pass 32
  ℹ fail 0
  ℹ duration_ms 186.597929

  $ node --import tsx/esm --test tests/unit/combo-fusion-strategy.test.ts
  ℹ tests 22
  ℹ pass 22
  ℹ fail 0
  ℹ duration_ms 6171.193908
  ```  
- **Resultado do lint**:  
  ```
  $ npx eslint open-sse/services/fusionTriggers.ts tests/unit/fusion-triggers.test.ts
  exit 0 (no findings)
  ```  
- **Resultado do typecheck**:  
  ```
  $ npm run typecheck:core
  > tsc --pretty false -p tsconfig.typecheck-core.json
  exit 0
  ```  
- **Agente executor**: gt-ts-engineer (builders)  
- **Data de conclusão**: 2026-07-19  

### Entrypoint Chain Proof

- **Claim**: conditional-fusion `tool-call` gate uses last-assistant-only window  
- **Entrypoint**: combo gate → `shouldTriggerFusion` (consumes pure matcher)  
- **Helper**: `open-sse/services/fusionTriggers.ts::hasMatchingToolCall`  
- **Regression test**: sticky residual + agent-loop matrix in `fusion-triggers.test.ts` fail if sticky walk is restored  
- **Evidence classification**: pure unit (helper/library-only per task ownership)  

### Changelog Draft

- **task**: 0068  
- **agent**: gt-ts-engineer  
- **project**: omniroute  
- **title**: fusion-tool-call-last-assistant-window  
- **description**: tool-call trigger matches only the latest assistant message; no sticky history walk after plain assistant turns  
- **summary**: Restores conditional-fusion cost control in multi-turn agent loops. Bare `name` shape preserved. text-match remains latest-user-only. FUSION.md operator prose deferred to 0071.  
- **verification**: `node --import tsx/esm --test tests/unit/fusion-triggers.test.ts` (32 pass); combo-fusion-strategy (22 pass); typecheck:core; eslint on touched files  

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: gt-ts-expert (builders path-to-100)  
- **Data da review**: 2026-07-19  
- **Veredito**: ACCEPT (minor residual fixed in-session)  
- **Score (path to 100)**:  
  - `local_implementation`: **99**  
  - `runtime_enforcement`: **98** (pure matcher; combo gate consumes `shouldTriggerFusion` only — single composition edge)  
  - **Overall: 98**  
- **Notas**:  
  1. **H-FUSION-008 CLOSED**: sticky history walk removed; N=1 latest-assistant window encoded in `hasMatchingToolCall` + comments.  
  2. Sticky goldens flipped; agent-loop matrix documents write → tool → plain assistant → user follow-up = false; re-arm on new matching tool_calls = true.  
  3. Bare `name` shape preserved; text-match latest-user only; always/unknown modes unchanged.  
  4. **Residual fixed**: empty `tool_calls: []` on latest assistant must not sticky-walk older write tools (explicit regression).  
  5. Verified green: `fusion-triggers` + `combo-fusion-strategy` spot-check (A6 hit fixtures place tool_calls on latest assistant — compatible with 0068).  
- **Remaining residuals (non-blocking / deferred)**:  
  - FUSION.md operator prose still ambiguous vs sticky wording — **Task 0071** owns docs.  
  - Mid-tool-turn (write → tool → user, no plain assistant) still fires — intentional per product (“latest assistant has tool_calls”).  
- **Se REJEITADO**: n/a — left in `02-doing` per parent.

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
- **Full report**: `docs/reports/reviews/2026-07-19-task-0068-omniroute-fusion-tool-call-trigger-window-rereview.md`
- **Lane outcome**: remains in `03-review`
- **Task reference**: Task 0068 (`omniroute-fusion-tool-call-trigger-window`)

#### Current Open Blockers

- none

#### Path-to-100 Summary

- No patches required; sticky walk still absent; 32-trigger suite within residual 89/89 pass.

### Previous Reports

- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0068-omniroute-fusion-tool-call-trigger-window-review.md`
  - **Carried forward**: none
  - **Resolved since**: H-FUSION-008 sticky; empty `tool_calls: []`
  - **Regression guard**: no sticky history walk; empty `tool_calls: []` stays false; bare `name`; text-match latest-user only
- Task-file Review Trail (gt-ts-expert 98/100, empty-`tool_calls` residual closed in-session)

**Deferred**: FUSION.md operator prose → Task 0071 (verified in 0071 re-review)

