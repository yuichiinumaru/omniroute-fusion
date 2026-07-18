# Task 0014: Fusion Triggers and Fallback Strategy Runtime

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)

> > **Status**: `[x]` Held in review (APPROVE 98/100 — path-to-100; 2026-07-16 re-audit)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0003 — Fusion First-Class (S4)
> **Action type**: EXTEND
> **Blocks**: Task 0018
> **Depends on**: Task 0010 (schema for triggers), Task 0013 (wired branches)

---

## Objective

Extend the `conditional-fusion` dispatch branch in `combo.ts` to support all three trigger modes:

1. **`always`** — fusion always fires (equivalent to `strategy: "fusion"`)
2. **`tool-call`** — fusion fires only when a tool call matches `toolPatterns` (existing behavior)
3. **`text-match`** — fusion fires only when the latest user message matches any `textPatterns`

When the trigger does NOT match, the request falls through to `fallbackStrategy` (any non-fusion strategy — Decision D8, validated in Task 0010).

Also: extract `hasMatchingToolCall` and the new `hasMatchingText` into a shared `fusionTriggers.ts` module for testability.

## Background Context

### What already exists:
- `conditional-fusion` branch at `combo.ts:870-911` — only supports `tool-call` mode
- `hasMatchingToolCall()` at `combo.ts:3439-3456` — walks backward through messages for assistant tool_calls
- `matchGlob()` at `combo.ts:3462-3474` — minimal glob match (`*` and `?`)
- `triggers` schema (after Task 0010) will accept `mode: "always" | "tool-call" | "text-match"` + `textPatterns`
- `fallbackStrategy` schema (after Task 0010) will reject `"fusion"` and `"conditional-fusion"`

### What is missing:
- No `text-match` trigger implementation
- No `always` mode handling (must treat as unconditional fusion)
- `hasMatchingToolCall` is a private function inside `combo.ts` (3475-line file) — not testable in isolation

---

## Test Requirements

- MUST fire fusion when `triggers.mode === "always"`, regardless of request content
- MUST fire fusion when `triggers.mode === "tool-call"` and a tool call matches `toolPatterns`
- MUST NOT fire fusion when `triggers.mode === "tool-call"` and no tool call matches
- MUST fire fusion when `triggers.mode === "text-match"` and latest user message matches any `textPatterns`
- MUST NOT fire fusion when `triggers.mode === "text-match"` and no pattern matches
- MUST fall through to `fallbackStrategy` when trigger does NOT match
- MUST default `fallbackStrategy` to `"priority"` when absent
- MUST handle missing `triggers` config (treat as `mode: "always"` for `strategy: "fusion"`)
- `matchGlob` MUST correctly match `write*` to `write_file`, `writeLine`, etc.
- `matchGlob` MUST correctly match `*security*` to `check_security`, `security_scan`, etc.
- Text patterns MUST use case-insensitive substring matching (not glob)

---

## Exit Conditions (GDD/TDD)

- [x] New `open-sse/services/fusionTriggers.ts` module exporting `shouldTriggerFusion(body, triggers)` and `hasMatchingToolCall(body, patterns)` and `hasMatchingText(body, patterns)`
- [x] `conditional-fusion` branch in `combo.ts` uses `shouldTriggerFusion()` instead of inline logic
- [x] `always` mode dispatches fusion unconditionally
- [x] `text-match` mode matches against latest user message text
- [x] Fallback strategy applied when trigger misses
- [x] `tests/unit/fusion-triggers.test.ts` covers all trigger modes + edge cases
- [x] Existing `tests/unit/combo-fusion-strategy.test.ts` still pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors
- [x] `node --import tsx/esm --test tests/unit/fusion-triggers.test.ts` passes
- [x] Entry in CHANGELOG.md added (at the TOP)

---

## Details

### What

Subtasks:
- [x] **Read existing code**: Read `open-sse/services/combo.ts` (lines 866-911 for conditional-fusion branch, lines 3432-3475 for `hasMatchingToolCall` and `matchGlob`), `src/shared/validation/schemas/combo.ts` (triggers schema from Task 0010)
- [x] **Create `open-sse/services/fusionTriggers.ts`**: Extract `hasMatchingToolCall`, `matchGlob` from `combo.ts`. Add `hasMatchingText(body, patterns)` — extracts latest user message text and checks for case-insensitive substring matches. Export `shouldTriggerFusion(body, triggers)` that dispatches on `mode`.
- [x] **Update `combo.ts` conditional-fusion branch**: Import `shouldTriggerFusion` from `fusionTriggers.ts`. Replace inline `hasMatchingToolCall` call with `shouldTriggerFusion(body, triggers)`. For `mode: "always"`, always dispatch fusion. Keep the fallback-strategy override behavior.
- [x] **Handle `strategy: "fusion"` with triggers**: When `strategy === "fusion"` AND triggers exist AND `mode !== "always"`, treat as conditional (i.e., the trigger gate applies). Document this in comments.
- [x] **Write tests**: `tests/unit/fusion-triggers.test.ts` — test each mode, glob matching, text matching, fallback rejection, edge cases.
- [x] **Remove duplicated code**: Remove `hasMatchingToolCall` and `matchGlob` from `combo.ts` (move to `fusionTriggers.ts`).
- [x] **Refactoring pass**: Ensure `fusionTriggers.ts` is a pure function module (no side effects, no imports beyond types).
- [x] **Verification**: Run typecheck + lint + tests.

### Where

| File | Purpose |
|------|---------|
| `open-sse/services/combo.ts` | Modify — replace inline trigger logic, remove extracted functions |
| `open-sse/services/fusionTriggers.ts` | Create — extracted trigger matching module |
| `src/shared/validation/schemas/combo.ts` | Read — triggers schema shape (from Task 0010) |
| `tests/unit/fusion-triggers.test.ts` | Create — new tests |
| `tests/unit/combo-fusion-strategy.test.ts` | Read — regression safety |
| `CHANGELOG.md` | Modify — add entry at top |

### How

1. Create `fusionTriggers.ts` with:
   - `matchGlob(input, pattern)` — moved from `combo.ts`
   - `hasMatchingToolCall(body, patterns)` — moved from `combo.ts`
   - `hasMatchingText(body, patterns)` — new: extracts latest user-role message text, checks each pattern as case-insensitive substring
   - `shouldTriggerFusion(body, triggers)` — if `mode === "always"` return `true`; if `mode === "tool-call"` delegate to `hasMatchingToolCall`; if `mode === "text-match"` delegate to `hasMatchingText`
2. In `combo.ts`, import and use `shouldTriggerFusion`. Remove old `hasMatchingToolCall` and `matchGlob` private functions.
3. Handle edge cases: missing triggers, undefined mode, empty patterns.

### Why

Triggers are a core part of the Fusion First-Class epic (Decision D7). Without text-match and always modes, conditional fusion can only gate on tool calls, limiting its usefulness. Extracting trigger logic to a testable module prevents the `combo.ts` god-file from growing further.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT allow `fallbackStrategy` to be `"fusion"` or `"conditional-fusion"` at runtime — this is validated at schema level (Task 0010) but add a runtime guard as defense-in-depth.
> DO NOT modify the fusion dispatch path itself — only the trigger gate that decides WHETHER to dispatch.
> DO NOT change `handleFusionChat` / `handleFusionChatV2` — that was Task 0012.

> [!IMPORTANT]
> Read EVERY file in "Where" before writing.
> `text-match` uses substring matching, NOT glob. The user sees `textPatterns: ["security", "review"]` and expects that any message containing "security" or "review" triggers fusion.
> Keep `matchGlob` for tool patterns only — it's the established behavior.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: All function names verified with `grep -rn`
- [x] **Zod Validation**: Triggers validated at schema level (Task 0010)
- [x] **Security**: No secrets committed
- [x] **Error Sanitization**: N/A (trigger logic returns boolean, no HTTP responses)
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Moved functions from `combo.ts` to `fusionTriggers.ts`, not deleted

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/services/fusionTriggers.ts` (created) — pure trigger helpers
  - `open-sse/services/combo.ts` (modified) — wired `shouldTriggerFusion` + D8 fallback guard; removed private helpers
  - `tests/unit/fusion-triggers.test.ts` (created) — 23 unit tests
  - `tests/unit/combo-fusion-strategy.test.ts` (modified) — always / text-match / gated-fusion regressions
  - `CHANGELOG.md` (modified) — Unreleased entry at top
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/fusion-triggers.test.ts`
  - `node --import tsx/esm --test tests/unit/combo-fusion-strategy.test.ts`
- **Resultado dos testes**: 23/23 pass (fusion-triggers); 11/11 pass (combo-fusion-strategy)
- **Resultado do lint**: `npx eslint` on changed files — clean (no output)
- **Resultado do typecheck/build**: `npm run typecheck:core` — exit 0
- **Entrada no changelog**: `## [Unreleased]` → **Fusion triggers + fallback runtime (Task 0014)**
- **Agente executor**: builder (omniroute/builder)
- **Data de conclusão**: 2026-07-09

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: reviewers (OmniRoute Architect independent FULL re-review)
- **Data da review**: 2026-07-18
- **Veredito**: APPROVE
- **Score (path to 100)**: 100/100
- **Notas**: Final re-review closed residuals. Report: `docs/reports/reviews/2026-07-18-task-0014-omniroute-fusion-triggers-fallback-final-review.md`. Stay in `03-review/`.

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers`
- **Score**: `100/100`
- **Verdict**: `APPROVE`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0014-omniroute-fusion-triggers-fallback-final-review.md`
- **Lane outcome**: remains in review (protocol: not moved to `04-completed/`)
- **Task reference**: Task 0014

#### Current Open Blockers

- none

#### Path-to-100 Summary

- I1 hygiene + I2 extra D8 wire shapes closed

#### Patches Applied This Final Review

Verified D8 extra wire tests green; evidence counts 16+26

#### Regression Guards

(see full report — prior guards retained)

### Previous Reports

- `docs/reports/reviews/2026-07-18-task-0014-omniroute-fusion-triggers-fallback-final-review.md` — 100/100 APPROVE (**latest**)
- `docs/reports/reviews/2026-07-16-task-0014-omniroute-fusion-triggers-fallback-reaudit.md` — prior reaudit


---

## Path-to-100 fix wave (2026-07-10)

**Executor**: builders (parent fix wave after reviewer return)

### Task 0014 fixes
- **F1**: Removed `(combo as Record).strategy = fallback` in `combo.ts` — only local `strategy` override remains.
- **F2**: Wire test `conditional-fusion: forbidden fallbackStrategy fusion collapses to priority (D8 wire)`.
- **F1 test**: `trigger miss must not mutate combo.strategy` (miss then hit on same object).
- **F3**: SAFETY comments on casts in `fusionTriggers.ts`.
- **F4**: Strengthened miss-path judge assertions.
- **Tests (corrected)**: historical claim of 48/48 was multi-file composition; named pair at reaudit was **39/39** (13+26).

---

## Path-to-100 applied 2026-07-16 (fixer wave)

**Executor**: path-to-100 FIXER (parent reviewers)

### Residuals closed
- **I1**: Corrected evidence — named pair live counts after this wave: `combo-fusion-strategy` **16** + `fusion-triggers` **26** = **42/42** (was 39; + gated D8 wire + combo-ref non-drop shared with 0013).
- **I2**: Extra D8 wire shapes:
  - `fallbackStrategy: "conditional-fusion"` (conditional-fusion strategy miss)
  - gated `strategy: "fusion"` + `fallbackStrategy: "fusion"` collapses to priority

### Files changed
- `tests/unit/combo-fusion-strategy.test.ts` (extra D8 wire + related)
- task ledger hygiene only for pure trigger module (no runtime change this wave)

### Commands
```bash
node --import tsx/esm --test \
  tests/unit/combo-fusion-strategy.test.ts \
  tests/unit/fusion-triggers.test.ts
# → 42/42 pass (16 + 26)
```

### Claim readiness
- Ready for re-review at **100/100**.

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
