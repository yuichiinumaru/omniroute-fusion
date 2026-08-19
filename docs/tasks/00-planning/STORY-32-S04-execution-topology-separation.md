# STORY-32-S04: Execution Topology Separation

> **Parent Epic**: `EPIC-32-omniroute-routing-strategy-reformation.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — separating multi-model execution topologies (Fusion, Conditional Fusion, Pipeline) from single-target selection engines into an independent tier.

## Goal

Separate multi-model execution topologies (`Single`, `Fusion`, `Conditional Fusion`, `Pipeline`) from single-target routing selection engines into a distinct Execution Topology tier, enforcing strict cycle and recursion guards.

## Background & Rationale

`Fusion`, `Conditional Fusion`, and `Pipeline` alter the execution structure of a request (calling multiple models in parallel or sequence) rather than picking a single model target. This story cleanly decouples execution topology from target selection, preventing circular fallback bugs or strategy misclassifications.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0203** | `0203-omniroute-execution-topology-tier-decoupling.md` — Decouple Execution Topologies (`Single`, `Fusion`, `Conditional Fusion`, `Pipeline`) from target selection engines into an independent execution tier. |
| **0204** | `0204-omniroute-topology-recursion-guards-and-fallback-wiring.md` — Implement topology recursion guards, cycle detection, and adapt Fusion/Pipeline fallback handlers to consume resolved target policies. |

## Acceptance Criteria

- [ ] Execution Topologies explicitly typed: `single | fusion | conditional-fusion | pipeline`.
- [ ] Selection engines (`Priority`, `P2C`, `Auto`) operate within single-target branches of execution topologies.
- [ ] Recursion guards prevent circular fallback loops between Fusion and combo selection engines.
- [ ] Conditional Fusion operates as an escalation policy triggered on uncertainty/complexity rather than a static routing strategy.

## Non-goals

- No rewrite of Fusion panel judge execution logic (handled in EPIC-35).
- No removal of Pipeline execution capabilities.
