# EPIC-31: OmniRoute Scoped Policy & Profile Foundation

> **Status**: Planning — evidence-backed architectural specification (2026-08-19)
> **Priority**: 🔴 Critical
> **Origin**: `.agents/user/omniroute2-reasoning.md` — unifying Routing, Compression, and Reasoning under a single 4-scope policy inheritance framework.

## Goal

Build the unified Scoped Policy & Profile substrate shared by Routing, Compression, and Reasoning without coupling their domain-specific semantics.

The substrate establishes a canonical 4-scope hierarchy:
$$\text{Global} \longrightarrow \text{Provider} \longrightarrow \text{Model} \longrightarrow \text{Combo}$$

with strict *most specific wins* precedence ($\text{Combo} > \text{Model} > \text{Provider} > \text{Global}$ for policy preferences, bounded by Hard Capability/Constraint rules at Model/Provider level). It introduces a clean tri-state inheritance model (`undefined` = inherit, explicit `false`/`0`/`off` = override), `profileRef + overrides` pattern, and field-level provenance tracing (`why was this field value selected?`).

## Evidence basis

- `.agents/user/omniroute2-reasoning.md`: deconstructs OmniRoute configuration sprawl and proves that Routing, Compression, and Reasoning share the same scope inheritance requirements.
- `src/lib/db/proxies.ts`: established precedent for scoped assignments (`global | provider | model | combo`) with "most specific wins" resolution.
- `src/app/api/settings/combos/route.ts`: current endpoint exposes `comboDefaults` and `providerOverrides` but lacks a `modelOverrides` tier.
- `src/lib/db/compressionCombos.ts`: established precedent for named reusable profiles (`compression_combos`) assigned to combos.

## Stories & Executable Tasks

| Story | Task | Scope |
|---|---:|---|
| **STORY-31-S01: Policy ontology & contracts** | 0187 | `0187-omniroute-scoped-policy-ontology-and-precedence-contract.md` — Formalize 4-scope hierarchy, tri-state inheritance, and precedence rules. |
| | 0188 | `0188-omniroute-hard-capabilities-and-ephemeral-override-bounds.md` — Specify Hard Capability vs Soft Policy bounds and Ephemeral Request Overrides. |
| **STORY-31-S02: Scoped assignment substrate** | 0189 | `0189-omniroute-scoped-policy-assignment-db-schema.md` — Build DB migration schema and CRUD module for `scoped_policy_assignments`. |
| | 0190 | `0190-omniroute-4scope-policy-resolver-and-provenance-engine.md` — Implement deterministic 4-scope policy resolver with field-level provenance tracing. |
| **STORY-31-S03: Profiles lifecycle** | 0191 | `0191-omniroute-profile-lifecycle-builtins-dup-and-detach.md` — Implement immutable built-ins, custom profile duplication, and local profile detach engine. |
| | 0192 | `0192-omniroute-profile-where-used-integrity-and-safe-deletion.md` — Implement where-used reference integrity checks, deprecation, and safe deletion guards. |
| **STORY-31-S04: Effective policy inspection** | 0193 | `0193-omniroute-effective-policy-resolution-and-inspection-api.md` — Build pre-execution inspection API for effective policy resolution and diffs. |
| | 0194 | `0194-omniroute-redundant-override-detection-and-orphan-linters.md` — Implement pre-save redundant override detection and orphan reference linters. |

## Ordering

1. **Story A1** (Tasks 0187, 0188) freezes the contract, types, and precedence laws.
2. **Story A2** (Tasks 0189, 0190) builds the DB persistence, resolver engine, and tri-state merge logic.
3. **Story A3** (Tasks 0191, 0192) builds profile CRUD, built-ins, detach, and lifecycle management.
4. **Story A4** (Tasks 0193, 0194) builds the inspection API, provenance tracer, and pre-save preview.

## Non-goals

- No domain-specific routing, compression, or reasoning logic inside the substrate (domain resolvers consume the substrate).
- No hardcoded model IDs inside the core substrate engine.
- No automatic silent mutation of user profiles or assignments.
