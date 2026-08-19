# EPIC-32: OmniRoute Routing Strategy Reformation

> **Status**: Planning — evidence-backed architectural specification (2026-08-19)
> **Priority**: 🔴 Critical
> **Origin**: `.agents/user/omniroute2-reasoning.md` — deconstructing OmniRoute's 18+ combo strategy dropdown into 3 core Selection Engines, modularizing auxiliary policies, and separating Execution Topologies.

## Goal

Reform OmniRoute's combo strategy architecture by deconstructing the 18+ strategy dropdown into 3 core Selection Engines (`Priority`, `P2C`, `Auto`), modularizing auxiliary concerns (LKGP/cache affinity, quota policies, cost/latency biases, context relay) into orthogonal policies, and separating Execution Topologies (`Single`, `Fusion`, `Conditional Fusion`, `Pipeline`).

The reform removes false strategy choices while preserving 100% of underlying resilience features, mapping legacy strategies via transparent compatibility shims.

## Evidence basis

- `.agents/user/omniroute2-reasoning.md`: proves that OmniRoute's runtime (`open-sse/services/combo/targetResolution.ts`) already composes policies sequentially, despite the UI presenting 18+ strategies as mutually exclusive options.
- `open-sse/services/combo/applyStrategyOrdering.ts`: source code confirms that `fill-first` is functionally identical to `priority`, `least-used` is simple request-count ordering, and `cost-optimized` sorts by input-price only.
- `open-sse/services/combo/targetSorters.ts`: confirms P2C operates as a two-candidate health/latency tournament.
- `open-sse/services/fusion.ts`: proves `Fusion` is an ensemble execution topology (multi-model panel + judge), not a target selection engine.

## Stories & Executable Tasks

| Story | Task | Scope |
|---|---:|---|
| **STORY-32-S01: Selection engine simplification** | 0197 | `0197-omniroute-selection-engine-core-simplification.md` — Simplify core Selection Engines to Priority, P2C, and Auto; map legacy strategies. |
| | 0198 | `0198-omniroute-legacy-strategy-compatibility-adapter.md` — Build legacy strategy compatibility adapter for backwards-compatible combo dispatch. |
| **STORY-32-S02: Routing modules extraction** | 0199 | `0199-omniroute-affinity-modules-lkgp-and-prompt-cache.md` — Extract LKGP & prompt-cache affinity into orthogonal policy signal modules. |
| | 0200 | `0200-omniroute-quota-optimization-and-continuity-modules.md` — Extract quota headroom/reset-aware policies, cost/latency biases, and context relay. |
| **STORY-32-S03: Strategy profiles & scoped assignments** | 0201 | `0201-omniroute-routing-strategy-profile-schema-and-builtins.md` — Implement `RoutingStrategyProfile` schema, built-ins, and 4-scope assignments. |
| | 0202 | `0202-omniroute-per-combo-routing-overrides-and-detach-engine.md` — Build per-combo strategy overrides and UI strategy management controls. |
| **STORY-32-S04: Execution topology separation** | 0203 | `0203-omniroute-execution-topology-tier-decoupling.md` — Separate Execution Topologies (Single, Fusion, Conditional Fusion, Pipeline) from routing. |
| | 0204 | `0204-omniroute-topology-recursion-guards-and-fallback-wiring.md` — Implement topology recursion guards and update dispatch handlers. |

## Ordering

1. Requires EPIC-31 (Scoped Policy Foundation) for profile storage and scope resolution.
2. **Story B1** (Tasks 0197, 0198) simplifies the selection engine core and builds legacy compatibility mappings.
3. **Story B2** (Tasks 0199, 0200) extracts LKGP, cache affinity, quota policies, and biases into composable modules.
4. **Story B3** (Tasks 0201, 0202) connects strategy profiles and scoped overrides to combos, models, providers, and global settings.
5. **Story B4** (Tasks 0203, 0204) separates Execution Topology (Fusion, Conditional Fusion, Pipeline) into an independent tier.

## Non-goals

- No breaking changes to existing legacy combo configurations (transparent adapter mapping).
- No removal of underlying resilience features or circuit breaker guards.
- No forced migration of user combos without explicit legacy indicators.
