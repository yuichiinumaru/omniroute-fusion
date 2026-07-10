# Task 0010: Fusion Contracts — Zod Schemas, Strategy Registry, and Types

> **Status**: `[x]` Ready for review
> **Priority**: 🔴 P0
> **Type**: `feature`
> **Origin**: Epic 0003 — Fusion First-Class (S0 blocker)
> **Action type**: EXTEND
> **Blocks**: Task 0011, Task 0012, Task 0013, Task 0014, Task 0015, Task 0016, Task 0017, Task 0018
> **Depends on**: none
> **Parent review**: 2026-07-09 PASS (OmniRoute Architect) — D1–D10 locked; CHANGELOG entry may be drafted in Completion Evidence and published by parent at wave closeout if concurrent builders collide on CHANGELOG.md

---

## Objective

Extend the Zod combo schemas, shared types, and strategy registry so that Fusion combos support:

1. **`FusionUnit`** — a panel entry that can be a plain string, a `comboModelEntry` model step, or a `combo-ref` step (reusing the existing `comboModelEntry` union — Decision D2).
2. **`FusionJudge`** — a separate `judge` field on combo data (NOT `role: "judge"` on a step — Decision D1). Resolution order: `data.judge` → `config.judgeModel` (legacy string) → first panel model.
3. **`FusionTriggers`** — first-class trigger schema with `mode: "always" | "tool-call" | "text-match"`, `toolPatterns`, `textPatterns`, and reserved `requireApproval`.
4. **`fallbackStrategy`** — reject any value that equals `"fusion"` or `"conditional-fusion"` (Decision D8 — prevent self-recursion).
5. **`ResolvedFusionUnit` type** — Runtime type (`kind: "model" | "combo-ref"`) for use by downstream dispatch tasks.
6. **`conditional-fusion`** strategy is already in `ROUTING_STRATEGY_VALUES`; confirm it stays and both `"fusion"` and `"conditional-fusion"` have UI labels (already confirmed in evidence).

No new database table is created (Decision D4). No UI code is touched.

## Background Context

### What already exists:
- `comboModelEntry` union (string | model-step | combo-ref) at `src/shared/validation/schemas/combo.ts:42-46`
- `comboRuntimeConfigSchema` with `judgeModel` (string), `fusionTuning` (object), `triggers` (object — currently only `mode: "tool-call"`), and `fallbackStrategy` (string, no self-recursion guard) at `src/shared/validation/schemas/combo.ts:125-211`
- `ROUTING_STRATEGY_VALUES` already includes `"fusion"` and `"conditional-fusion"` at `src/shared/constants/routingStrategies.ts:18-19`
- `FusionTuning` type in `open-sse/services/fusion.ts:32-36`
- `HandleFusionChatOptions` type in `open-sse/services/fusion.ts:203-211` — accepts `models: string[]` only
- `ResolvedComboUnit` type in `open-sse/services/combo/types.ts:166` — `ResolvedComboTarget | ResolvedComboRefTarget`
- Existing test coverage in `tests/unit/combo-config.test.ts:800-877` validates fusion tuning schema

### What is missing / needs extending:
- `triggers.mode` is limited to `z.literal("tool-call")` — needs `"always"` and `"text-match"`
- No `textPatterns` field on triggers
- No top-level `judge` field on the combo data schema (only `config.judgeModel`)
- No `fallbackStrategy` self-recursion rejection (`fusion`/`conditional-fusion`)
- No exported `ResolvedFusionUnit` or `HandleFusionChatOptionsV2` types

---

## Test Requirements

- MUST accept `triggers.mode = "always"` and `triggers.mode = "text-match"` through Zod validation
- MUST accept `triggers.textPatterns` as `string[]` when `mode = "text-match"`
- MUST reject `fallbackStrategy = "fusion"` with a Zod validation error
- MUST reject `fallbackStrategy = "conditional-fusion"` with a Zod validation error
- MUST accept `fallbackStrategy = "priority"` (or any other non-fusion strategy)
- MUST accept a top-level `judge` field using the same `comboModelEntry` union
- MUST preserve backward compatibility: existing `config.judgeModel: string` still validates
- MUST export `ResolvedFusionUnit` type from `open-sse/services/fusion.ts`
- MUST export `HandleFusionChatOptionsV2` type from `open-sse/services/fusion.ts`
- `npm run typecheck:core` MUST pass with zero errors

---

## Exit Conditions (GDD/TDD)

- [x] `triggers.mode` schema accepts `"always"`, `"tool-call"`, `"text-match"` (3 enum values)
- [x] `triggers.textPatterns` field exists and validates as `string[]`
- [x] `fallbackStrategy` rejects `"fusion"` and `"conditional-fusion"` via `.refine()` or `.superRefine()`
- [x] Top-level `judge` field on combo record schema accepts `comboModelEntry` union
- [x] `ResolvedFusionUnit` and `HandleFusionChatOptionsV2` types exported from `open-sse/services/fusion.ts`
- [x] Existing tests in `tests/unit/combo-config.test.ts` still pass
- [x] New unit tests in `tests/unit/fusion-contracts.test.ts` cover all acceptance criteria
- [x] `npm run typecheck:core` passes without errors
- [x] `npm run lint` passes without new errors
- [x] `node --import tsx/esm --test tests/unit/combo-config.test.ts tests/unit/fusion-contracts.test.ts` passes
- [x] Entry in CHANGELOG.md added (at the TOP) — **drafted in Completion Evidence** (CHANGELOG.md dirty from concurrent work; parent publishes at wave closeout)

---

## Details

### What

Subtasks:
- [x] **Read existing code**: Read `src/shared/validation/schemas/combo.ts`, `src/shared/constants/routingStrategies.ts`, `src/lib/combos/steps.ts`, `open-sse/services/fusion.ts`, `open-sse/services/combo/types.ts`, `tests/unit/combo-config.test.ts`
- [x] **Extend `triggers` schema**: Change `mode` from `z.literal("tool-call")` to `z.enum(["always", "tool-call", "text-match"])`. Add `textPatterns: z.array(z.string().trim().min(1)).optional()`. Keep `requireApproval: z.boolean().default(false)`. Remove `.strict()` or update to allow new fields.
- [x] **Add `fallbackStrategy` self-recursion guard**: Add `.refine()` on `comboRuntimeConfigSchema` to reject `fallbackStrategy ∈ {"fusion", "conditional-fusion"}`.
- [x] **Add `judge` field**: On the combo data record schema (at the `createComboSchema`/`updateComboSchema` level or as a new `comboDataSchema`), add `judge: comboModelEntry.optional()`.
- [x] **Export runtime types**: In `open-sse/services/fusion.ts`, export `ResolvedFusionUnit` type and `HandleFusionChatOptionsV2` type per epic §5.3.
- [x] **Write tests**: Create `tests/unit/fusion-contracts.test.ts` covering trigger mode enum, textPatterns, fallback rejection, judge field, and backward compat.
- [x] **Refactoring pass**: Review for simplicity. Ensure Zod schema changes are minimal and additive.
- [x] **Verification**: Run `npm run typecheck:core`, `npm run lint`, and targeted tests.

### Where

| File | Purpose |
|------|---------|
| `src/shared/validation/schemas/combo.ts` | Modify — extend `triggers`, add `judge`, add `fallbackStrategy` guard |
| `src/shared/constants/routingStrategies.ts` | Read — confirm `fusion` / `conditional-fusion` present (no change expected) |
| `src/lib/combos/steps.ts` | Read — understand `ComboModelStep`, `ComboRefStep`, `normalizeComboStep` |
| `open-sse/services/fusion.ts` | Modify — export `ResolvedFusionUnit`, `HandleFusionChatOptionsV2` types |
| `open-sse/services/combo/types.ts` | Read — understand `ResolvedComboUnit`, `HandleComboChatOptions`, `ComboNestingContext` |
| `tests/unit/combo-config.test.ts` | Read — verify existing fusion schema tests still pass |
| `tests/unit/fusion-contracts.test.ts` | Create — new tests for this task |
| `CHANGELOG.md` | Modify — add entry at top |

### How

1. In `combo.ts` schema, extend the `triggers` Zod object to accept `mode: z.enum(["always", "tool-call", "text-match"])` and add `textPatterns: z.array(z.string().trim().min(1)).optional()`.
2. Add a `.refine()` or `.superRefine()` on `comboRuntimeConfigSchema` that rejects `fallbackStrategy` values `"fusion"` and `"conditional-fusion"`.
3. Decide where `judge` lives: add it to `createComboSchema` / `updateComboSchema` as `judge: comboModelEntry.optional()` (top-level on the combo record, adjacent to `models`).
4. In `fusion.ts`, define and export `ResolvedFusionUnit` and `HandleFusionChatOptionsV2` types (the types are declarations only — no runtime logic change).
5. Write `tests/unit/fusion-contracts.test.ts` using Node.js native test runner to validate every acceptance criterion.

### Why

This task is the blocker for the entire Fusion First-Class epic. Without correct types and schemas, the runtime (S1–S4), UI (S5–S6), and hardening (S8) tasks cannot be implemented with type safety. The `fallbackStrategy` self-recursion guard (D8) prevents infinite dispatch loops at the validation boundary.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT create a new `fusions` table — Phase 1 reuses `combos` (Decision D4).
> DO NOT add `role: "judge"` to any step — judge is a SEPARATE field (Decision D1).
> DO NOT implement runtime dispatch logic — this task is contracts/types only.
> DO NOT change `ROUTING_STRATEGY_VALUES` unless a value is genuinely missing (both `fusion` and `conditional-fusion` already exist).

> [!IMPORTANT]
> Read EVERY file in the "Where" table before writing.
> The `judge` field reuses `comboModelEntry` (Decision D2) — no new type union.
> Keep `.passthrough()` on `comboRuntimeConfigSchema` to not break unknown-key forwarding.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: Every Zod field name validated with `grep -rn` before documenting
- [x] **Zod Validation**: All new inputs validated with Zod schemas
- [x] **Security**: No secrets committed
- [x] **Error Sanitization**: N/A (no HTTP handlers changed)
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Nothing deleted

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/validation/schemas/combo.ts` — triggers mode enum + textPatterns; fallbackStrategy superRefine (D8); top-level `judge` on create/update schemas (D1/D2)
  - `open-sse/services/fusion.ts` — export `ResolvedFusionUnit`, `HandleFusionChatOptionsV2` (types only; no dispatch)
  - `tests/unit/fusion-contracts.test.ts` — new (16 tests)
  - Read-only confirmed: `src/shared/constants/routingStrategies.ts` already has `fusion` + `conditional-fusion` (no change)
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/fusion-contracts.test.ts` → **16/16 pass**
  - `node --import tsx/esm --test tests/unit/combo-config.test.ts` → **42/42 pass**
- **Resultado dos testes**: PASS (fusion-contracts 16, combo-config 42)
- **Resultado do lint**: `npx eslint src/shared/validation/schemas/combo.ts open-sse/services/fusion.ts tests/unit/fusion-contracts.test.ts` → clean (no output)
- **Resultado do typecheck/build**: `npm run typecheck:core` → exit 0 (no errors)
- **Entrada no changelog**: **DRAFT for parent wave closeout** (CHANGELOG.md has concurrent Unreleased work; avoid merge collision per parent note):

  ```markdown
  ### Added
  - **Fusion contracts (Epic 0003 / Task 0010)**: Zod combo schemas now accept
    `triggers.mode` ∈ {always, tool-call, text-match}, optional `triggers.textPatterns`,
    top-level `judge` as `comboModelEntry`, and reject `fallbackStrategy` of
    `fusion` / `conditional-fusion` (self-recursion guard D8). Exported
    `ResolvedFusionUnit` + `HandleFusionChatOptionsV2` types from `open-sse/services/fusion.ts`
    for downstream S1–S3. Legacy `config.judgeModel: string` remains valid.
  ```

- **Agente executor**: omniroute/builder (Task 0010 only)
- **Data de conclusão**: 2026-07-09

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [pending]
- **Data da review**: [pending]
- **Veredito**: [pending]
- **Score (path to 100)**: [pending]
- **Notas**: [pending]
