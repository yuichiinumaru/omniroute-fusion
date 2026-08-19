# STORY-34-S02: Reasoning Profiles & Policy Resolution

> **Parent Epic**: `EPIC-34-omniroute-reasoning-policy-and-cognitive-state.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — ReasoningProfile schema, built-in profiles, native effort/budget mapping, and 4-scope inheritance.

## Goal

Implement `ReasoningProfile` schema, built-in presets (`Passthrough`, `Fast`, `Deep`, `Verify`, `Explore`), native `effort`/`budget` capability mapping to provider parameters, and 4-scope policy resolution.

## Background & Rationale

Reasoning Policy expands OmniRoute's current `thinkingBudget` service beyond simple provider parameters into full cognitive policy resolution across Global, Provider, Model, and Combo scopes.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0219** | `0219-omniroute-reasoning-profile-schema-and-builtins.md` — Implement `ReasoningProfile` schema, built-in profiles (`Passthrough`, `Fast`, `Deep`, `Verify`, `Explore`), and native effort/budget mapping. |
| **0220** | `0220-omniroute-4scope-reasoning-policy-resolver-and-fallback.md` — Implement 4-scope reasoning policy resolution engine ($\text{Global} \rightarrow \text{Provider} \rightarrow \text{Model} \rightarrow \text{Combo}$) with safe target fallback logic. |

## Acceptance Criteria

- [ ] `ReasoningProfile` schema registered and validated.
- [ ] Built-in profiles (`Passthrough`, `Fast`, `Deep`, `Verify`, `Explore`) registered as immutable presets.
- [ ] Native provider reasoning parameters (`thinking_budget`, `reasoning_effort`) mapped dynamically according to target capabilities.
- [ ] 4-scope resolution evaluates `Global -> Provider -> Model -> Combo` precedence cleanly.

## Non-goals

- No forced native effort parameters on targets that do not support reasoning parameters.
