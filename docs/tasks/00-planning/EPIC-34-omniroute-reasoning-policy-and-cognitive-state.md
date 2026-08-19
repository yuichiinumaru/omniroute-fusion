# EPIC-34: OmniRoute Reasoning Policy & Cognitive State Foundation

> **Status**: Planning — evidence-backed architectural specification (2026-08-19)
> **Priority**: 🟡 High
> **Origin**: `.agents/user/omniroute2-reasoning.md` — establishing the 7 primitives of Cognitive Reasoning, 4-scope reasoning policies, and structured working memory with versioned belief state and cascade invalidation.

## Goal

Establish the 7 primitives of Cognitive Reasoning (`Frame`, `State`, `Operator`, `Topology`, `Policy`, `Guard`, `Receipt`) in OmniRoute, apply 4-scope reasoning policies (budget, effort, passthrough, framing), and formalize structured working memory with versioned belief state and cascade invalidation.

The foundation ensures *Representation Precedes Inference* (never reason over raw uncompiled chaos), *State Outranks Transcript* (preserve structured state over raw text monologue), and *Validity Is Inherited* (directed belief dependency graph).

## Evidence basis

- `.agents/user/omniroute2-reasoning.md`: synthesizes cognitive principles from J-Space, CodeSight, Gortex, OptiLLM, and `mcp-think-hardest` into a 7-primitive architecture.
- `open-sse/services/thinkingBudget.ts`: current implementation maps reasoning effort/budget to provider parameters, but lacks structured cognitive policy resolution.
- `EPIC-26` & `EPIC-27`: established preliminary reasoning budget controls and operator clarity requirements.
- CodeSight (`wiki index`, `blast_radius`) and Gortex (`context_closure`, `subscribe_stale_refs`) evidence: proves context must be causally closed and version-invalidated.

## Stories & Executable Tasks

| Story | Task | Scope |
|---|---:|---|
| **STORY-34-S01: Reasoning Principia & domain model** | 0217 | `0217-omniroute-reasoning-primitives-and-domain-model-contract.md` — Formalize 7 reasoning primitives, epistemic principles, and non-monotonicity. |
| | 0218 | `0218-omniroute-epistemic-closure-rules-and-privacy-constraints.md` — Define epistemic closure rules and non-CoT narrative privacy constraints. |
| **STORY-34-S02: Reasoning Profiles & policy resolution** | 0219 | `0219-omniroute-reasoning-profile-schema-and-builtins.md` — Implement `ReasoningProfile` schema, built-ins, and native effort/budget mapping. |
| | 0220 | `0220-omniroute-4scope-reasoning-policy-resolver-and-fallback.md` — Implement 4-scope reasoning policy resolution engine and fallback rules. |
| **STORY-34-S03: Frame & problem representation** | 0221 | `0221-omniroute-frame-schema-and-reencode-canonicalization-operator.md` — Implement `Frame` schema, re-encode operator, constraint extraction, and goal checks. |
| | 0222 | `0222-omniroute-external-context-provider-contract-codesight-gortex.md` — Build external context-provider contract for code graph tools (CodeSight/Gortex). |
| **STORY-34-S04: Cognitive state & cascade invalidation** | 0223 | `0223-omniroute-structured-cognitive-state-schema-and-belief-graph.md` — Implement `State` schema for facts, hypotheses, evidence, and dependency edges. |
| | 0224 | `0224-omniroute-semantic-diff-and-cascade-stale-invalidation-engine.md` — Implement semantic diff and directed cascade stale invalidation engine. |
| **STORY-34-S05: Cognitive operators & lenses** | 0225 | `0225-omniroute-cognitive-operator-registry-and-core-lenses.md` — Implement Operator registry, `re-encode`, `decompose`, and `first-principles`. |
| | 0226 | `0226-omniroute-advanced-cognitive-lenses-inversion-counterfactual-systems.md` — Implement `adversarial/inversion`, `counterfactual`, and `second-order` lenses. |

## Ordering

1. Requires EPIC-31 (Scoped Policy Foundation) for 4-scope reasoning policy resolution.
2. **Story D1** (Tasks 0217, 0218) formalizes the cognitive domain model and principles.
3. **Story D2** (Tasks 0219, 0220) builds Reasoning Profiles, built-ins, and capability mapping.
4. **Story D3** (Tasks 0221, 0222) implements Frame & problem representation schemas.
5. **Story D4** (Tasks 0223, 0224) implements Structured Cognitive State & cascade invalidation.
6. **Story D5** (Tasks 0225, 0226) implements Cognitive Operators and lens registry.

## Non-goals

- No internal AST parser in OmniRoute (consume external providers like CodeSight/Gortex via clean contract).
- No private CoT narrative logging in persistent storage.
- No unconstrained token burning without budget bounds.
