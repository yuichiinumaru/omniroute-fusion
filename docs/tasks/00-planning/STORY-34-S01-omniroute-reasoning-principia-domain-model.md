# STORY-34-S01: Reasoning Principia & Domain Model

> **Parent Epic**: `EPIC-34-omniroute-reasoning-policy-and-cognitive-state.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — formalizing the 7 reasoning primitives, epistemic principles, non-monotonicity, and non-CoT narrative privacy constraints.

## Goal

Formalize the 7 reasoning primitives (`Frame`, `State`, `Operator`, `Topology`, `Policy`, `Guard`, `Receipt`), cognitive principles, non-monotonic belief revision rules, and privacy constraints for reasoning memory.

## Background & Rationale

Reasoning is not "generating more text monologue"; it is transforming an epistemic state into another better-justified state under constraints. This story formalizes the cognitive domain model: *Representation Precedes Inference*, *State Outranks Transcript* (store structured state, not private CoT monologue), and *Validity Is Inherited* (directed belief dependency graph).

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0217** | `0217-omniroute-reasoning-primitives-and-domain-model-contract.md` — Formalize 7 reasoning primitives (`Frame`, `State`, `Operator`, `Topology`, `Policy`, `Guard`, `Receipt`) and epistemic principles contract. |
| **0218** | `0218-omniroute-epistemic-closure-rules-and-privacy-constraints.md` — Define epistemic closure rules (`ontological`, `derivational`, `decisional`, `epistemic`) and non-CoT narrative privacy constraints for reasoning memory. |

## Acceptance Criteria

- [ ] 7 primitives formally defined with TypeScript interfaces and JSON schemas.
- [ ] Epistemic closure rules defined for formal vs empirical vs normative domains.
- [ ] Privacy constraint enforced: private Chain-of-Thought monologues MUST NOT be logged or persisted in long-term storage; only structured state transitions are recorded.
- [ ] Non-monotonic belief revision rules defined.

## Non-goals

- No implementation of DB tables or API endpoints (handled in Story D2-D4).
- No external code graph parser implementation.
