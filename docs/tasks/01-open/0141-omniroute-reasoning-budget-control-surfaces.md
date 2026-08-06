# Task 0141: Expose fine-grained reasoning controls in UI and API

> **Status**: `[ ]` Open
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

- [ ] API/schema persistence for model/provider/combo policy is implemented or
  explicitly documented as an existing contract reused by this task.
- [ ] Settings/Routing UI exposes global and combo controls without duplicate topbars.
- [ ] Verified provider/model surfaces expose narrower overrides where supported.
- [ ] UI displays effective policy and precedence source for a selected target.
- [ ] `node --import tsx/esm --test tests/unit/reasoning-budget-control-surfaces.test.ts` passes.
- [ ] Relevant UI/API tests pass.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] `:23456` or mock proof confirms a setting change affects the next request; `:22000` is untouched.
- [ ] `.changelog/` entry is created through manage-changelog and rebuilt.
- [ ] Completion Evidence and Review Trail are filled.

## Details

### What

- [ ] **Ler código existente**: read Task 0140, thinking-budget settings API/schema,
  `ThinkingBudgetTab.tsx`, combo editor/schema, provider settings surfaces,
  Codex controls, model capability display, and Settings/Routing IA rules.
- [ ] Add failing persistence, precedence-display, and capability-visibility tests.
- [ ] Implement controls using the 0140 contract; do not duplicate resolution logic in UI.
- [ ] Add effective-policy explanation and safe unsupported-state copy.
- [ ] Serialize with other settings/combo UI edits.
- [ ] **Refactoring pass**: avoid per-component settings fetch duplication.
- [ ] **Verificação de regressão**: targeted tests, typecheck, lint, test smoke.

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

- [ ] UI/API claims match the 0140 capability contract.
- [ ] Zod validates every new field.
- [ ] No secrets exposed.
- [ ] Error sanitization preserved.
- [ ] No raw SQL in routes.
- [ ] No deletion.

## 📋 Completion Evidence

- **Files/tests/output**: [fill]
- **Dynamic setting smoke proof**: [fill]
- **Typecheck/lint/changelog**: [fill]
- **Executor/date**: [fill]

## 🔍 Review Trail

- **Reviewer/verdict/score**: [fill]
- **Notes**: [fill]
