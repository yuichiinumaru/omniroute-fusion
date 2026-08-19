# EPIC-35: OmniRoute Deliberation, Control & Verification

> **Status**: Planning — evidence-backed architectural specification (2026-08-19)
> **Priority**: 🟡 High
> **Origin**: `.agents/user/omniroute2-reasoning.md` — implementing advanced deliberation topologies, adaptive metacognitive control, observation assimilation, reality anchors, and independence-weighted ensemble reasoning.

## Goal

Implement advanced deliberation topologies, an adaptive metacognitive controller, observation assimilation for tool outputs, verification reality anchors, and independence-weighted ensemble reasoning.

The epic converts reasoning from an unconstrained flow of tokens into a feedback-controlled, reality-anchored process where *Metacognition Must Change Control* (stall/loop/oscillation/tunnel vision trigger concrete actions) and *Reality Outranks Internal Coherence* (external test/compiler/oracle overrides internal consensus).

## Evidence basis

- `.agents/user/omniroute2-reasoning.md`: synthesizes OptiLLM topologies (PlanSearch, CePO, MARS, Prover-Verifier), J-Space metacognitive control (`self-monitoring`, stall handling), and `mcp-think-hardest` mechanics (`cpi_monitor`, `independence_validator`, `dialectical_verifier`).
- `open-sse/services/fusion.ts`: establishes multi-model panel + judge execution foundation in OmniRoute.
- OptiLLM MARS & DeepConf evidence: proves ensemble diversity requires independent error sources and adaptive confidence thresholds.

## Stories & Executable Tasks

| Story | Task | Scope |
|---|---:|---|
| **STORY-35-S01: Deliberation topology runtime** | 0227 | `0227-omniroute-deliberation-topology-core-runtime.md` — Implement core deliberation topologies (`single`, `branch`, `self-consistency`, `prover-verifier`). |
| | 0228 | `0228-omniroute-advanced-topologies-actor-critic-plan-solve-verify-and-cancellation.md` — Implement advanced topologies (`actor-critic`, `panel-judge`, `plan->solve->verify`) and cancellation contracts. |
| **STORY-35-S02: Adaptive cognitive controller** | 0229 | `0229-omniroute-cognitive-pathology-signal-detectors.md` — Implement cognitive signal detectors (uncertainty, stall, loop, oscillation, tunnel-vision). |
| | 0230 | `0230-omniroute-budget-aware-cognitive-escalation-state-machine.md` — Implement budget-aware cognitive escalation state machine. |
| **STORY-35-S03: Observation assimilation** | 0231 | `0231-omniroute-tool-external-observation-schema.md` — Implement tool/external observation schema and mandatory assimilation stage. |
| | 0232 | `0232-omniroute-mandatory-observation-assimilation-engine.md` — Build observation-to-belief update mechanics and contradiction handlers. |
| **STORY-35-S04: Verification & reality anchors** | 0233 | `0233-omniroute-generic-verifier-contract-and-reality-anchors.md` — Implement generic Verifier contract (compiler, test, tool, calculator, schema). |
| | 0234 | `0234-omniroute-claim-discriminating-verification-and-completion-audit.md` — Implement claim-discriminating verification and pre-completion audit. |
| **STORY-35-S05: Diversity & independence-weighted ensembles** | 0235 | `0235-omniroute-candidate-provenance-and-correlation-signal-calculator.md` — Implement candidate provenance tracking and correlation signal calculation. |
| | 0236 | `0236-omniroute-independence-weighted-ensemble-aggregation.md` — Implement independence-weighted ensemble weighting and lens-driven diversity. |

## Ordering

1. Requires EPIC-34 (Reasoning Policy & Cognitive State Foundation).
2. **Story E1** (Tasks 0227, 0228) implements deliberation topology runtimes.
3. **Story E2** (Tasks 0229, 0230) implements the adaptive cognitive controller.
4. **Story E3** (Tasks 0231, 0232) implements mandatory observation assimilation for tool/external inputs.
5. **Story E4** (Tasks 0233, 0234) implements verification contracts and reality anchors.
6. **Story E5** (Tasks 0235, 0236) implements candidate correlation tracking and independence-weighted ensembles.

## Non-goals

- No un-anchored self-reflection loops without empirical/reality checks.
- No unconstrained multi-agent token burning without budget bounds.
- No automatic overrides of user-configured model preferences.
