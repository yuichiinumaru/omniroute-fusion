# Task 0012: Fusion Runtime Dispatch — Multi-Unit Fan-Out via handleComboChat

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0003 — Fusion First-Class (S2)
> **Action type**: EXTEND
> **Blocks**: Task 0013
> **Depends on**: Task 0011

---

## Objective

Extend `handleFusionChat` (or create a V2 wrapper) in `open-sse/services/fusion.ts` to dispatch each panel and judge as a `ResolvedFusionUnit` — calling `handleSingleModel` for `kind: "model"` units and `handleComboChat` for `kind: "combo-ref"` units.

The upgraded function:
- Accepts `HandleFusionChatOptionsV2` (panels + judge as `ResolvedFusionUnit[]`, plus `handleComboChat`, `allCombos`, and `nesting` for combo-ref dispatch — Decision D3).
- Constructs panel body with `stream: false`, `tool_choice: "none"`, and tools KEPT in body (Decision D9).
- Fans out panels in parallel using existing `collectPanel` / `withTimeout`.
- Dispatches judge as model OR combo-ref.
- Returns 400 when a combo-ref panel is present but `handleComboChat` is not provided.
- Preserves backward compatibility via the existing `handleFusionChat` entry point for legacy string-only calls.

## Background Context

### What already exists:
- `handleFusionChat()` at `open-sse/services/fusion.ts:226-331` — string-only panels, string-only judge
- `collectPanel()` at `open-sse/services/fusion.ts:164-201` — quorum-grace collection
- `withTimeout()` at `open-sse/services/fusion.ts:138-154`
- `appendUserTurn()` at `open-sse/services/fusion.ts:96-111`
- `buildJudgePrompt()` at `open-sse/services/fusion.ts:117-133`
- `executeComboRefUnit()` at `open-sse/services/combo/runtimeUnits.ts:100-121` — combo-ref nesting with depth+cycle guards
- `buildChildNestingContext()` at `open-sse/services/combo/runtimeUnits.ts:83-98` — cycle detection

### What needs extending:
- `handleFusionChat` currently only calls `handleSingleModel(panelBody, modelStr)` — must also call `handleComboChat` for combo-ref panels
- Judge call currently only calls `handleSingleModel(judgeBody, judge)` — must handle combo-ref judge
- No `handleComboChat` / `allCombos` / `nesting` parameters on current signature

---

## Test Requirements

- MUST call `handleSingleModel` for `kind: "model"` panel units
- MUST call `handleComboChat` for `kind: "combo-ref"` panel units
- MUST call `handleSingleModel` for `kind: "model"` judge
- MUST call `handleComboChat` for `kind: "combo-ref"` judge
- MUST return 400 when combo-ref panel present but `handleComboChat` not provided
- MUST set `stream: false` and `tool_choice: "none"` on panel body (tools array kept)
- MUST NOT set `tool_choice: "none"` or `stream: false` on judge body (judge uses client's original flags)
- MUST pass incremented nesting context to `handleComboChat` calls
- MUST return 503 on cycle detection (via nesting guards)
- MUST preserve existing degrade behavior: 0 answers → 503, 1 answer → direct response
- Legacy `handleFusionChat` (string models) MUST still work unchanged

---

## Exit Conditions (GDD/TDD)

- [x] New `handleFusionChatV2` function (or extended `handleFusionChat` with overloaded signature) exported
- [x] Combo-ref panels dispatch via `handleComboChat` with correct nesting context
- [x] Combo-ref judge dispatches via `handleComboChat`
- [x] Panel body has `stream: false`, `tool_choice: "none"`, tools array intact
- [x] 400 returned when combo-ref present but `handleComboChat` missing
- [x] Existing `tests/unit/combo-fusion-strategy.test.ts` pass unmodified
- [x] New `tests/unit/fusion-combo-ref-dispatch.test.ts` pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors
- [x] `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts` passes
- [x] Entry in CHANGELOG.md added (at the TOP)

---

## Details

### What

Subtasks:
- [x] **Read existing code**: Read `open-sse/services/fusion.ts` (full file), `open-sse/services/combo/runtimeUnits.ts` (especially `executeComboRefUnit`, `buildChildNestingContext`), `open-sse/services/combo/types.ts` (all types), `tests/unit/combo-fusion-strategy.test.ts`
- [x] **Implement V2 dispatch function**: Create `handleFusionChatV2` (or extend with optional V2 params). For each panel `ResolvedFusionUnit`: if `kind === "model"` → `handleSingleModel(panelBody, unit.model)`; if `kind === "combo-ref"` → `handleComboChat({body: panelBody, combo: findCombo(unit.comboName), nesting: childNesting, ...})`.
- [x] **Implement judge combo-ref dispatch**: After collecting panel answers, build judge body via `appendUserTurn` + `buildJudgePrompt`. If judge is `kind === "combo-ref"` → `handleComboChat({body: judgeBody, ...})`. If `kind === "model"` → `handleSingleModel(judgeBody, judge.model)`.
- [x] **Panel body ownership**: Fusion constructs `panelBody` once (with `stream: false`, `tool_choice: "none"`, tools kept). Child combo receives this already-transformed body — child combo MUST NOT re-strip tools. Document this in code comments.
- [x] **Error handling**: Return `errorResponse(400, ...)` when combo-ref present but `handleComboChat` not provided.
- [x] **Preserve legacy compat**: Keep existing `handleFusionChat` entry point functional for string-only callers.
- [x] **Write tests**: `tests/unit/fusion-combo-ref-dispatch.test.ts` — mock `handleSingleModel` and `handleComboChat`, verify correct dispatch per unit kind.
- [x] **Refactoring pass**: Ensure double-timeout is not applied (fusion owns panelHardTimeout; child combo should not add its own top-level timeout on top).
- [x] **Verification**: Run typecheck + lint + targeted tests.

### Where

| File | Purpose |
|------|---------|
| `open-sse/services/fusion.ts` | Modify — add V2 dispatch, combo-ref panel/judge handling |
| `open-sse/services/combo/runtimeUnits.ts` | Read — reuse `buildChildNestingContext` pattern or equivalent |
| `open-sse/services/combo/types.ts` | Read — `HandleComboChatOptions`, `ComboNestingContext`, `ComboLike` |
| `open-sse/services/combo/comboStructure.ts` | Read — understand combo resolution for nested dispatch |
| `tests/unit/combo-fusion-strategy.test.ts` | Read — regression safety |
| `tests/unit/fusion-combo-ref-dispatch.test.ts` | Create — new tests |
| `CHANGELOG.md` | Modify — add entry at top |

### How

1. Add optional `handleComboChat`, `allCombos`, `nesting` params to a new V2 options type.
2. In panel fan-out loop, switch on `unit.kind`:
   - `"model"` → existing `handleSingleModel(panelBody, unit.model)` path
   - `"combo-ref"` → validate `handleComboChat` present, build child nesting, call `handleComboChat({body: panelBody, combo: lookupCombo(unit.comboName, allCombos), nesting: childNesting, handleSingleModel, allCombos, ...})`
3. Same pattern for judge dispatch after panel collection.
4. Wrap each dispatch call in existing `withTimeout` for `panelHardTimeoutMs`.

### Why

This is the core runtime change that makes fusion panels work as "combos within combos." Without it, combo-ref panels are silently dropped (the current bug). Decision D3 mandates reusing `handleComboChat` for nesting — not reimplementing failover inside fusion.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT strip tools from panel body — keep tools, set `tool_choice: "none"` (Decision D9).
> DO NOT reimplement failover/retry inside fusion — combo-ref child combos handle their own failover (Decision D3).
> DO NOT modify `combo.ts` dispatch branches — that is Task 0013.
> DO NOT add a second timeout layer on top of child combo — fusion owns the panel timeout.

> [!IMPORTANT]
> Read EVERY file in "Where" before writing.
> Panel body is owned by fusion; child combo receives it as-is.
> Test that both model-unit and combo-ref-unit panels can coexist in the same fusion.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: All function names verified with `grep -rn`
- [x] **Zod Validation**: N/A (schema is Task 0010)
- [x] **Security**: No secrets committed
- [x] **Error Sanitization**: Use `errorResponse` / `sanitizeErrorMessage` for all error returns
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Nothing deleted

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/services/fusion.ts` — exported `handleFusionChatV2`; helpers for combo lookup, child nesting (depth/cycle), `dispatchFusionUnit`; legacy `handleFusionChat` maps strings → units and delegates to V2; **`FusionComboChatBase` + `comboChatBase` spread confirmed on live FS**; F3 re-dispatch JSDoc
  - `tests/unit/fusion-combo-ref-dispatch.test.ts` — combo-ref dispatch suite + **comboChatBase** panel **and judge** nested option forwarding units
  - `docs/architecture/FUSION.md` — Nested combo base options (`comboChatBase`) + single-survivor re-dispatch semantics
  - `CHANGELOG.md` — Unreleased Fixed bullet explicitly names **Task 0012 runtime dispatch** + comboChatBase parity + expert residual close
- **Testes que verificam o trabalho** (gt-ts-expert path-to-100 2026-07-18):
  - `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts tests/unit/combo-fusion-strategy.test.ts tests/unit/fusion-units-resolve.test.ts tests/unit/fusion-editor-types.test.ts` → **60/60 pass**
  - Includes `V2: comboChatBase settings/signal/acl forward into nested handleComboChat`
  - Includes `V2: comboChatBase also forwards into combo-ref judge handleComboChat`
- **Resultado do typecheck/build**: `npm run typecheck:core` → **exit 0** (2026-07-18)
- **Entrada no changelog**: Unreleased Fixed — **0012 runtime dispatch** + expert residual close
- **Agente executor**: gt-ts-engineer → **gt-ts-expert** path-to-100 (builders) — 2026-07-18
- **Data de conclusão (re-verify)**: 2026-07-18
- **Notas de implementação**:
  - Live FS: F1/F4/F5/F6 production code present (`comboChatBase` type, dispatch spread, combo.ts thread)
  - F2 closed: dedicated Task 0012 CHANGELOG mention
  - F3 residual **documented intentional** (single-survivor re-dispatch — JSDoc + FUSION.md; not a silent drop)

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent full re-reviewer (parent `reviewers`) — prior builders claim re-verified
- **Data da review**: 2026-07-18 (builders accept) · **2026-07-18 (return re-review)**
- **Veredito**: ACCEPTED_100
- **Score (path to 100)**: 100/100
- **Notas**: Adversarial re-verify of comboChatBase / nested handleComboChat option parity.
  All 2026-07-16 blockers (F1/F2/F4/F5/F6) still RESOLVED on live FS; F3 SUPERSEDED.
  60/60 fusion suite + typecheck:core exit 0. Remain `03-review/`.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: independent full re-reviewer (parent agentID=`reviewers`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0012-omniroute-fusion-runtime-dispatch-return-review.md`
- **Lane outcome**: remain `docs/tasks/03-review/` (not moved to `04-completed/`)
- **Task reference**: Task 0012 (`omniroute-fusion-runtime-dispatch`)

#### Delta vs 2026-07-16 reaudit (88) — reconfirmed 2026-07-18 return

- `RESOLVED` F1 nested `comboChatBase` / `dispatchFusionUnit` spread + `combo.ts` thread (all 8 call sites)
- `RESOLVED` F2 CHANGELOG Task 0012
- `RESOLVED` F4 panel + judge comboChatBase regression units
- `RESOLVED` F5/F6 settings/signal impact
- `SUPERSEDED` F3 single-survivor re-dispatch — intentional, JSDoc + FUSION.md

#### Current Open Blockers

- none

#### Path-to-100 Summary

- Complete at 100; no residual patches required. Optional polish only
  (`satisfies FusionComboChatBase`, acting spy unit) — out of score.

### Previous Reports

- `docs/reports/reviews/2026-07-18-task-0012-omniroute-fusion-runtime-dispatch-return-review.md` — 100/100 ACCEPTED_100 (independent return)
- `docs/reports/reviews/2026-07-18-task-0012-omniroute-fusion-runtime-dispatch-review.md` — 100/100 ACCEPTED_100 (builders; confirmed)
- `docs/reports/reviews/2026-07-16-task-0012-omniroute-fusion-runtime-dispatch-reaudit.md` — 88/100 REJECTED_TO_DOING
- `docs/reports/reviews/2026-07-10-task-0012-omniroute-fusion-runtime-dispatch-review.md` — 91/100 HELD_IN_REVIEW_PATH_TO_100

---

## Cross-task fix note 2026-07-16 (path-to-100 FIXER for 0013)

While closing Task 0013 F1, production F1 for this task was implemented:

- `HandleFusionChatOptionsV2.comboChatBase?: FusionComboChatBase`
- `dispatchFusionUnit` spreads `...(comboChatBase ?? {})` into nested `handleComboChat`
- `combo.ts` threads parent `settings` / `isModelAvailable` / `relayOptions` / `signal` / `apiKeyAllowedConnections`
- Regression: `tests/unit/fusion-combo-ref-dispatch.test.ts` comboChatBase unit

**2026-07-18 re-verify (gt-ts-engineer)**: confirmed live; F2 CHANGELOG closed; F3 residual documented.

**2026-07-18 gt-ts-expert path-to-100**: judge comboChatBase unit; FUSION.md base-options section; F3 JSDoc (was still in `02-doing/`).

**2026-07-18 formal re-review (gt-ts-code-reviewer)**: **100/100** ACCEPTED_100 — moved to `03-review/`.

**2026-07-18 independent return re-review (parent reviewers)**: **100/100** ACCEPTED_100 — prior claim confirmed on live FS; remain `03-review/`.

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
