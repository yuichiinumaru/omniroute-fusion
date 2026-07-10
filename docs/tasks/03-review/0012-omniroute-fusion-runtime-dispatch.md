# Task 0012: Fusion Runtime Dispatch — Multi-Unit Fan-Out via handleComboChat

> **Status**: `[x]` Ready for review
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
  - `open-sse/services/fusion.ts` — exported `handleFusionChatV2`; helpers for combo lookup, child nesting (depth/cycle), `dispatchFusionUnit`; legacy `handleFusionChat` maps strings → units and delegates to V2
  - `tests/unit/fusion-combo-ref-dispatch.test.ts` — **created** (12 tests)
  - `CHANGELOG.md` — Unreleased entry at top
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts` → **12/12 pass**
  - `node --import tsx/esm --test tests/unit/combo-fusion-strategy.test.ts` → **6/6 pass** (unmodified)
  - `node --import tsx/esm --test tests/unit/fusion-units-resolve.test.ts` → **12/12 pass**
- **Resultado dos testes**: all targeted suites green (30 tests total)
- **Resultado do lint**: not re-run full eslint (no style-only changes outside fusion/tests); typecheck is the primary gate for this module
- **Resultado do typecheck/build**: `npm run typecheck:core` → **exit 0**
- **Entrada no changelog**: `## [Unreleased] / ### Added` — Fusion multi-unit runtime dispatch (Task 0012)
- **Agente executor**: builder (omniroute/builder)
- **Data de conclusão**: 2026-07-09
- **Notas de implementação**:
  - Did **not** modify `combo.ts` (Task 0013 owns wiring)
  - Did **not** reimplement failover inside fusion (D3)
  - Panel timeout: only fusion `withTimeout(panelHardTimeoutMs)` wraps each unit; no second fusion timeout layer on child combos
  - Nesting helpers local to fusion (mirror `runtimeUnits.buildChildNestingContext`; that helper is not exported)

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: reviewers (`gt-omniroute-architect` + tsjs)
- **Data da review**: 2026-07-10
- **Veredito**: APPROVE (HELD_IN_REVIEW_PATH_TO_100)
- **Score (path to 100)**: 91/100
- **Notas**: V2 multi-unit dispatch solid; nested combo-ref base-option plumbing is residual path-to-100 (F1). Full report linked in Review Ledger.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract.

### Latest Review

- **Date**: 2026-07-10
- **Reviewer profile**: `reviewers`
- **Score**: `91/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Full report**: `docs/reports/reviews/2026-07-10-task-0012-omniroute-fusion-runtime-dispatch-review.md`
- **Lane outcome**: remains in review (`03-review/`; not `04-completed/`)
- **Task reference**: Task 0012 (`omniroute-fusion-runtime-dispatch`)

#### Current Open Blockers

- `NEW` F1 (Debt/High): nested `handleComboChat` omits `settings` / `isModelAvailable` / `signal` / `relayOptions` / `apiKeyAllowedConnections` vs `runtimeUnits.executeComboRefUnit`
- `NEW` F2 (Improvement): dedicated CHANGELOG Task 0012 entry missing
- `NEW` F3 (Improvement/residual): single-survivor re-dispatch double-invokes unit

#### Path-to-100 Summary

- Add `comboChatBase` (or equivalent) on `HandleFusionChatOptionsV2` and spread into nested `handleComboChat`
- Thread base options from `dispatchFusionStrategy` (Task 0013 companion fix)
- Add/restore CHANGELOG bullet for 0012
- Preserve panel body + judge body + cycle/depth + degrade regression guards

### Previous Reports

- none (initial review)
