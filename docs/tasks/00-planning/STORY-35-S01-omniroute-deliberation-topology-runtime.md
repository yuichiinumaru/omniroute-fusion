# STORY-35-S01: Deliberation Topology Runtime

> **Parent Epic**: `EPIC-35-omniroute-deliberation-control-and-verification.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — deliberation topologies (`single`, `branch`, `self-consistency`, `prover-verifier`, `actor-critic`, `panel-judge`, `plan->solve->verify`).

## Goal

Implement deliberation topology runtimes (`single`, `branch/Best-of-N`, `self-consistency`, `prover-verifier`, `actor-critic`, `panel-judge`, `plan->solve->verify`), enforcing strict budget and cancellation contracts.

## Background & Rationale

Deliberation Topologies define how multiple inference calls are connected into an execution graph. OptiLLM and Fusion demonstrate that inference-time search over candidate trajectories dramatically outperforms single-pass generation on complex tasks.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0227** | `0227-omniroute-deliberation-topology-core-runtime.md` — Implement core deliberation topologies (`single`, `branch/Best-of-N`, `self-consistency`, `prover-verifier`). |
| **0228** | `0228-omniroute-advanced-topologies-actor-critic-plan-solve-verify-and-cancellation.md` — Implement advanced topologies (`actor-critic`, `panel-judge`, `plan->solve->verify`) with strict token budget and cancellation bounds. |

## Acceptance Criteria

- [ ] Topology engine supports `single`, `branch`, `self-consistency`, `prover-verifier`, `actor-critic`, `panel-judge`, and `plan->solve->verify`.
- [ ] Parallel branch execution respects concurrency ceilings and cancellation signals.
- [ ] Token budget ceiling strictly enforced across multi-call topologies.

## Non-goals

- No unconstrained MCTS or infinite tree search without hard depth caps.
