# STORY-31-S01: Policy Ontology & Contracts

> **Parent Epic**: `EPIC-31-omniroute-scoped-policy-foundation.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — establishing the formal ontology, bounds, and precedence rules for 4-scope policy inheritance.

## Goal

Formalize the policy ontology, precedence laws, scope definitions, tri-state inheritance model, hard capability bounds, and request-level ephemeral overrides for the Scoped Policy Substrate.

## Background & Rationale

OmniRoute needs a unified substrate to manage policies across Routing, Compression, and Reasoning. Currently, each domain manages scopes differently. This story establishes the normative contract and data schemas for 4-scope inheritance:
$$\text{Global} \longrightarrow \text{Provider} \longrightarrow \text{Model} \longrightarrow \text{Combo}$$

where *Combo* represents workload intent (most specific) and wins over resource defaults, bounded strictly by *Hard Capability/Constraint* rules at Model/Provider level (e.g. tool support, max context).

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0187** | `0187-omniroute-scoped-policy-ontology-and-precedence-contract.md` — Formalize 4-scope hierarchy, tri-state inheritance (`undefined` = inherit, explicit `false`/`0`/`off` = override), and precedence precedence rules. |
| **0188** | `0188-omniroute-hard-capabilities-and-ephemeral-override-bounds.md` — Specify Hard Capability vs Soft Policy bounds, ephemeral request-header override rules (`x-omniroute-*`), and profile vs assignment vs override contracts. |

## Acceptance Criteria

- [ ] Formal specification of 4-scope precedence ($\text{Combo} > \text{Model} > \text{Provider} > \text{Global}$).
- [ ] Tri-state inheritance rule documented: `undefined` = inherit, explicit `false`/`0`/`off` = override.
- [ ] Hard Capabilities (tool support, max token limits, provider health) defined as non-overridable by soft policies.
- [ ] Ephemeral request header override contract defined with Master Kill Switch supremacy.

## Non-goals

- No implementation of DB tables or API endpoints (handled in Story A2).
- No domain-specific routing or compression logic in this contract.
