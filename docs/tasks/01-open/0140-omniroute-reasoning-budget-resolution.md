# Task 0140: Implement model/provider/combo/global reasoning resolution

> **Status**: `[ ]` Open
> **Priority**: 🔴 P0
> **Type**: `feature`
> **Origin**: EPIC-26; operator request for dynamic effort/token control and forensic finding that only one global thinking-budget singleton exists.
> **Blocks**: Task 0141
> **Depends on**: —
> **Parallelism**: `serializable` — owns reasoning resolution contract and runtime plumbing; UI task 0141 depends on this contract.
> **Review routing**: independent + runtime/provider review

## Objective

Introduce a typed reasoning policy resolver with precedence:
**model > provider > combo > global**. The resolver MUST select an effort tier
(`none`, `low`, `medium`, `high`, `xhigh`, or provider-supported equivalent)
when the target supports effort controls, and MUST select a token budget only
when the target/provider explicitly supports token-budget reasoning.

The default behavior MUST remain passthrough, and adaptive global mode MUST NOT
force `high` onto every target.

## Background Context

- `open-sse/services/thinkingBudget.ts` stores a global singleton and currently
  applies it to every request.
- `open-sse/translator/index.ts:170` invokes `applyThinkingBudget` before format translation.
- `src/lib/modelCapabilities.ts` and `src/shared/constants/modelSpecs.ts` expose
  model defaults/caps but no policy override hierarchy.
- Codex has provider-specific suffix and request-default handling; Claude and
  other providers have distinct normalization paths.
- Combo schemas have no reasoning policy field.
- Settings schema accepts fields not represented consistently in the service type/UI.

## Test Requirements

- Model policy wins over provider, combo, and global policy.
- Provider policy wins over combo and global policy.
- Combo policy wins over global policy.
- No policy falls back to passthrough/global behavior.
- Effort-only providers never receive invented token budgets.
- Token-budget providers receive bounded budgets capped by model capability.
- Codex/Claude existing suffix and normalization behavior remains unchanged.
- Adaptive global mode does not force unsupported `high` requests.

## Exit Conditions (GDD/TDD)

- [ ] Typed policy and resolver exist with the four-level precedence documented.
- [ ] Runtime request pipeline consumes the resolver without bypassing provider adapters.
- [ ] Capability checks prevent unsupported effort/budget parameters.
- [ ] Tests cover precedence, provider capability, caps, passthrough, adaptive, Codex, and Claude.
- [ ] `node --import tsx/esm --test tests/unit/reasoning-budget-resolution.test.ts` passes.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] Mock or `:23456` request evidence confirms emitted parameters; `:22000` is untouched.
- [ ] `.changelog/` entry is created through manage-changelog and rebuilt.
- [ ] Completion Evidence and Review Trail are filled.

## Details

### What

- [ ] **Ler código existente**: read `thinkingBudget.ts`, translator call site,
  model capabilities/specs, provider adapters, combo schemas, settings schemas,
  Codex/Claude tests, and request normalization before changing anything.
- [ ] Write failing resolver tests first.
- [ ] Define a provider capability adapter rather than branching by guessed names.
- [ ] Add combo/provider/model policy fields only where the verified persistence
  contract supports them; document any intentionally deferred UI work for 0141.
- [ ] Wire the resolver at the narrowest request boundary.
- [ ] **Refactoring pass**: keep global singleton compatibility during migration.
- [ ] **Verificação de regressão**: targeted tests, typecheck, lint, mock proof.

### Where

| File | Purpose |
|---|---|
| `open-sse/services/thinkingBudget.ts` | Modify policy/resolution service. |
| `open-sse/translator/index.ts` | Wire request policy at verified boundary. |
| `src/lib/modelCapabilities.ts` | Read capability/cap rules. |
| `src/shared/constants/modelSpecs.ts` | Read/extend verified model metadata. |
| `src/shared/validation/schemas/combo.ts` | Add bounded combo policy only if required. |
| `open-sse/services/combo/types.ts` | Add runtime policy type if required. |
| `open-sse/executors/base.ts` | Preserve provider normalization/capability gate. |
| `open-sse/executors/codex.ts` | Regression coverage for Codex-specific behavior. |
| `tests/unit/reasoning-budget-resolution.test.ts` | Create contract tests. |
| `.changelog/` | Create closeout entry. |

### How

1. Freeze current passthrough behavior with regression tests.
2. Implement the pure precedence resolver and capability adapter.
3. Wire it into the request boundary without duplicating provider transforms.
4. Verify effort-only, token-budget, Codex, Claude, and adaptive cases.

### Why

The global singleton cannot express the operator's required dynamic hierarchy;
the resolver must exist before UI controls can safely expose narrower policies.

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Safe beside NVIDIA and quota UI tasks. |
| **serializable** | Must complete contract/runtime phase before Task 0141 UI/API work. Coordinate with Task 0132 if combo schema files overlap. |
| **Collision** | `thinkingBudget.ts`, translator, combo schema/types, model specs, provider adapters, reasoning tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not call all reasoning controls “token budget”. Verify whether each target
> accepts effort, token budget, adaptive thinking, or neither. Do not default to
> global `high`. Do not use production `:22000`.

## 🛡️ Compliance Checklist

- [ ] Capability and model claims are source-verified.
- [ ] New schemas are Zod-validated and bounded.
- [ ] No secrets in policy/test payloads.
- [ ] Existing error sanitization preserved.
- [ ] No raw SQL in routes.
- [ ] No deletion.

## 📋 Completion Evidence

- **Resolver contract/files**: [fill]
- **Tests/output**: [fill]
- **Typecheck/lint/mock**: [fill]
- **Changelog/executor/date**: [fill]

## 🔍 Review Trail

- **Reviewer/verdict/score**: [fill]
- **Notes**: [fill]
