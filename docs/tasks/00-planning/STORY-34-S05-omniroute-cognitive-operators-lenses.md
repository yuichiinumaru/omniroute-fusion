# STORY-34-S05: Cognitive Operators & Lenses

> **Parent Epic**: `EPIC-34-omniroute-reasoning-policy-and-cognitive-state.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — Operator registry, cognitive lenses (`re-encode`, `decompose`, `first-principles`, `adversarial/inversion`, `counterfactual`, `second-order/systems`).

## Goal

Implement Cognitive Operator registry and core cognitive lenses (`re-encode`, `decompose`, `first-principles`, `adversarial/inversion`, `counterfactual`, `second-order/systems`).

## Background & Rationale

Operators are perspective perturbators applied to a problem frame or state. Rather than 50 monolithic "reasoning modes", operators are modular cognitive lenses that perturb the reasoning focus (e.g. `inversion` asks "what would guarantee failure?").

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0225** | `0225-omniroute-cognitive-operator-registry-and-core-lenses.md` — Implement Operator registry and core lenses (`re-encode`, `decompose`, `first-principles`). |
| **0226** | `0226-omniroute-advanced-cognitive-lenses-inversion-counterfactual-systems.md` — Implement advanced cognitive lenses (`adversarial/inversion`, `counterfactual`, `second-order/systems`) and custom lens profile routing. |

## Acceptance Criteria

- [ ] Operator registry supports registration, parameter validation, and prompt transformation for cognitive lenses.
- [ ] Core lenses (`re-encode`, `decompose`, `first-principles`) implemented as clean prompt/state transformers.
- [ ] Advanced lenses (`inversion`, `counterfactual`, `second-order`) supported with explicit output structure requirements.

## Non-goals

- No automatic unconstrained application of lenses without policy authorization.
