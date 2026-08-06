# EPIC-26: Fine-Grained Reasoning Budget Control

> **Status**: Planning — evidence-backed decomposition (2026-08-04)
> **Priority**: High
> **Origin**: Operator request + reasoning pipeline investigation

## Goal

Give operators dynamic control over reasoning effort with precedence
**model > provider > combo > global**, while preserving provider-specific
translation rules. Prefer `reasoning_effort` tiers where supported; use token
budgets only for models that genuinely expose token-budget controls.

## Evidence basis

- `open-sse/services/thinkingBudget.ts` currently stores one global singleton
  configuration.
- `open-sse/translator/index.ts:170` applies that configuration before format
  translation for every request.
- No combo-level reasoning budget field exists in the combo schemas.
- Codex has connection-level effort defaults and suffix handling; other
  providers do not have a uniform equivalent.
- Settings schema accepts `baseBudget`, `complexityMultiplier`, `xhigh`, and
  `max` values that are not consistently represented in the service/UI.

## Stories / executable tasks

| Story | Task | Scope |
|---|---|---|
| Runtime resolution contract | 0140 | Add typed precedence resolution and provider/model capability adaptation. |
| Operator control surfaces | 0141 | Add model/provider/combo controls and UI/API persistence without forcing global high effort. |

## Ordering

1. Task 0140 defines the contract and runtime behavior.
2. Task 0141 depends on 0140 and exposes the verified fields in UI/API.

## Non-goals

- Do not force `effort=high` globally by default.
- Do not invent token budgets for providers that only accept effort tiers.
- Do not treat cognitive-lens `thinkingMode` as provider reasoning effort.
- Do not remove Codex/Claude provider-specific normalization.
