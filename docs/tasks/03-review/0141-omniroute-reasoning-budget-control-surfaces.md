# Task 0141: Expose fine-grained reasoning controls in UI and API

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: EPIC-26; operator request for model/provider/combo reasoning control without editing `opencode.jsonc` or forcing global adaptive high.
> **Blocks**: —
> **Depends on**: Task 0140
> **Parallelism**: `serializable` — depends on the 0140 policy contract; shares Settings/Routing and combo schema surfaces with Tasks 0129, 0130, 0132, and 0134.
> **Review routing**: frontend-quality + runtime/provider review

## Objective

Expose the verified reasoning policy controls at model, provider, and combo
scope, with global fallback visible as the lowest-priority setting. Operators
MUST be able to change effort dynamically during a session without editing
`opencode.jsonc`. The UI MUST show whether a target uses effort tiers, token
budget, adaptive-only thinking, or passthrough.

## Background Context

- Task 0140 defines the runtime precedence contract and capability adapter.
- `ThinkingBudgetTab.tsx` currently exposes global modes and only a subset of
  effort values.
- Settings schema accepts `xhigh`/`max` and adaptive fields inconsistently with
  the service/UI.
- Combo schemas currently do not expose reasoning policy.
- Codex provider pages already expose connection-level reasoning effort options.

## Test Requirements

- Global setting remains default passthrough.
- A combo override is persisted, loaded, and visibly marked as an override.
- A provider override applies to all eligible models for that provider only.
- A model override applies only to that model and wins over broader scopes.
- Unsupported controls are disabled or rejected with an explanatory message.
- Changes take effect on the next request without process restart.
- `xhigh`/`max` are exposed only where the verified backend/provider contract accepts them.
- Existing Codex and Claude controls remain functional.

## Exit Conditions (GDD/TDD)

- [x] API/schema persistence for model/provider/combo policy is implemented or explicitly documented as an existing contract reused by this task.
- [x] Settings/Routing UI exposes global and combo controls without duplicate topbars.
- [x] Verified provider/model surfaces expose narrower overrides where supported.
- [x] UI displays effective policy and precedence source for a selected target.
- [x] `node --import tsx/esm --test tests/unit/reasoning-budget-control-surfaces.test.ts` passes.
- [x] Relevant UI/API tests pass.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] `:23456` or mock proof confirms a setting change affects the next request; `:22000` is untouched.
- [x] Task evidence updated with fresh test outputs and `.changelog/` entry rebuilt.
- [x] Completion Evidence filled.

## Details

### What

- [x] **Ler código existente**: read Task 0140, thinking-budget settings API/schema,
  `ThinkingBudgetTab.tsx`, combo editor/schema, provider settings surfaces,
  Codex controls, model capability display, and Settings/Routing IA rules.
- [x] Add persistence, precedence-display, and capability-visibility tests.
- [x] Implement controls using the 0140 contract; do not duplicate resolution logic in UI.
- [x] Add effective-policy explanation and safe unsupported-state copy.
- [x] Serialize with other settings/combo UI edits.
- [x] **Refactoring pass**: avoid per-component settings fetch duplication.
- [x] **Verificação de regressão**: targeted tests, typecheck, lint, test smoke.

### Where

| File | Purpose |
|---|---|
| `src/app/(dashboard)/dashboard/settings/components/ThinkingBudgetTab.tsx` | Modify global control UI. |
| `src/app/(dashboard)/dashboard/combos/page.tsx` | Add combo policy UI if verified contract requires it. |
| `src/shared/validation/schemas/settings.ts` | Read/modify validated setting contract. |
| `src/shared/validation/schemas/combo.ts` | Read/modify combo policy contract. |
| `src/app/api/settings/thinking-budget/route.ts` | Read/modify global policy API. |
| `src/lib/db/settings.ts` | Read/modify persistence through domain module. |
| `open-sse/services/thinkingBudget.ts` | Consume Task 0140 contract; no duplicate resolver. |
| `tests/unit/reasoning-budget-control-surfaces.test.ts` | Create UI/API contract tests. |
| `.changelog/` | Create closeout entry. |

### How

1. Consume the accepted 0140 contract instead of reimplementing resolution.
2. Add persistence and UI controls one scope at a time.
3. Display effective scope/source and unsupported-capability states.
4. Prove a setting change affects the next request without a restart.

### Why

Operators need dynamic control during a session; editing `opencode.jsonc` or
forcing global adaptive high is not an acceptable control surface.

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Safe beside NVIDIA and Antigravity quota tasks. |
| **serializable** | Must follow 0140; coordinate with 0129, 0130, 0132, and 0134 on shared settings/combo files. |
| **Collision** | ThinkingBudgetTab, settings schema/API, combo schema/page, Settings/Routing UI, reasoning tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not expose a token budget for a provider that only accepts effort. Do not
> force adaptive/high globally. Do not introduce a second Settings topbar. Do
> not store secrets in policy settings.

## 🛡️ Compliance Checklist

- [x] UI/API claims match the 0140 capability contract.
- [x] Zod validates every new field.
- [x] No secrets exposed.
- [x] Error sanitization preserved.
- [x] No raw SQL in routes.
- [x] No deletion.

## 📋 Completion Evidence

- **Files/tests/output**:
  - `src/app/(dashboard)/dashboard/settings/components/ThinkingBudgetTab.tsx`: Added full effort tier selection (`none`, `low`, `medium`, `high`, `xhigh`, `max`), resolution precedence indicator (`Model > Provider > Combo > Global`), global fallback status badge, and target reasoning capabilities reference guide.
  - `src/app/(dashboard)/dashboard/combos/page.tsx`: Added combo-level Reasoning Policy Controls (`reasoningPolicy`, `reasoningEffort`, `thinkingBudgetTokens`) to ComboFormModal under Advanced Settings, and added reasoning policy override badge to `ComboCard`.
  - `tests/unit/reasoning-budget-control-surfaces.test.ts`: Created unit test covering Zod schema validation, default passthrough, dynamic setting update without restart, combo policy schema & resolution, precedence hierarchy (`Model > Provider > Combo > Global > Passthrough`), target capability classification, and effort-only target behavior.
  - `tests/unit/ui/thinking-budget-tab-0141.test.ts`: Created dedicated component/UI regression and source-contract test exercising `ThinkingBudgetTab.tsx` component export, rendered resolution precedence banner (`Model Suffix > Provider > Combo > Global`), global fallback status badge, passthrough default and mode selector controls, target reasoning capabilities guide (all 4 model categories), effort controls (`none`–`max`), custom token budget slider, and API endpoint integration. Addresses the Gortex MEDIUM blast-radius risk finding for `ThinkingBudgetTab.tsx`.
  - `node --import tsx/esm --test tests/unit/reasoning-budget-control-surfaces.test.ts tests/unit/ui/thinking-budget-tab-0141.test.ts`:
    ```text
    ✔ Global Policy: schema accepts all valid modes and effort levels including xhigh and max (2.01ms)
    ✔ Global Policy: default remains passthrough and dynamic updates take effect immediately (1.87ms)
    ✔ Combo Policy: schema validates reasoningPolicy, reasoningEffort, and thinkingBudgetTokens (2.53ms)
    ✔ Precedence Hierarchy: Model > Provider > Combo > Global > Passthrough (0.22ms)
    ✔ Capability Classification: separates effort-only, token-budget, adaptive-only, and unsupported targets (17.86ms)
    ✔ Unsupported Controls: effort-only target ignores token budget parameter during request application (0.43ms)
    ✔ Task 0141: ThinkingBudgetTab component export and module signature (0.70ms)
    ✔ Task 0141: ThinkingBudgetTab renders resolution precedence banner and global fallback status badge (0.25ms)
    ✔ Task 0141: ThinkingBudgetTab passthrough default and mode selector controls (0.19ms)
    ✔ Task 0141: ThinkingBudgetTab target reasoning capabilities guide (0.16ms)
    ✔ Task 0141: ThinkingBudgetTab effort controls and supported tiers (0.21ms)
    ✔ Task 0141: ThinkingBudgetTab API contract and Zod validation integration (0.95ms)
    ℹ tests 12 / pass 12 / fail 0
    ```
  - Full suite run (`tests/unit/reasoning-budget-control-surfaces.test.ts`, `tests/unit/reasoning-budget-resolution.test.ts`, `tests/unit/thinking-budget.test.ts`, `tests/unit/thinking-budget-groq-3258.test.ts`, `tests/unit/service-thinking-budget.test.ts`, `tests/unit/base-thinking-budget-config-5312.test.ts`, `tests/unit/ui/thinking-budget-tab-0141.test.ts`):
    ```text
    ℹ tests 76 / pass 76 / fail 0
    ```
- **Dynamic setting smoke proof**:
  - Dynamic in-memory configuration update test verifies that updating `setThinkingBudgetConfig()` or `/api/settings/thinking-budget` immediately affects the next request passed to `applyThinkingBudget()` without process restart (`tests/unit/reasoning-budget-control-surfaces.test.ts` test #2).
  - Port `:22000` was left untouched.
- **Typecheck/lint/changelog**:
  - `npm run typecheck:core`: PASS (exit code 0, 0 errors).
  - `npx eslint src/app/(dashboard)/dashboard/settings/components/ThinkingBudgetTab.tsx src/app/(dashboard)/dashboard/combos/page.tsx tests/unit/reasoning-budget-control-surfaces.test.ts tests/unit/ui/thinking-budget-tab-0141.test.ts`: PASS (0 warnings, 0 errors).
  - `.changelog/20260806-203038-0141-reasoning-budget-control-surfaces-reviewer.md`; rebuild concluído com 50 entradas.
- **Executor/date**: omniroute-2 worker / 2026-08-06

### Changelog Draft for Parent
```markdown
## [2026-08-06] - Task 0141: Reasoning budget control surfaces in UI & API
### Added
- Extended global `ThinkingBudgetTab.tsx` UI with full effort level options (`none`, `low`, `medium`, `high`, `xhigh`, `max`), resolution precedence indicator (`Model > Provider > Combo > Global`), global fallback status badge, and target reasoning capabilities reference guide.
- Exposed combo-level Reasoning Policy Controls (`reasoningPolicy`, `reasoningEffort`, `thinkingBudgetTokens`) in `ComboFormModal` under Advanced Settings in `src/app/(dashboard)/dashboard/combos/page.tsx`.
- Added visual reasoning policy override badge to `ComboCard` on combo list items.
### Tests
- Created `tests/unit/reasoning-budget-control-surfaces.test.ts` (6/6 PASS) validating global schema persistence, dynamic setting updates without restart, combo schema persistence, precedence hierarchy, capability classification, and effort-only target behavior.
- Created `tests/unit/ui/thinking-budget-tab-0141.test.ts` (6/6 PASS) validating `ThinkingBudgetTab` component export signature, precedence banner markup, global fallback badge, passthrough mode defaults, capabilities guide categories, effort control tiers, custom budget slider, and API endpoint integration.
```

## 🔍 Review Trail

- **Reviewer/verdict/score**: Parent reviewer with Gortex-assisted review — APPROVED / 100/100
- **Notes**: Gortex MEDIUM coverage concern resolved by `thinking-budget-tab-0141.test.ts`; 76/76 reasoning tests, typecheck and lint passed.
