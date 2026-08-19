# STORY-36-S03: Reasoning Eval Harness

> **Parent Epic**: `EPIC-36-omniroute-cognitive-observability-and-evals.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — building an empirical eval framework to measure quality gain per marginal inference cost for reasoning policies.

## Goal

Build an empirical reasoning eval framework to benchmark baseline models vs frame-enhanced vs controlled vs verifier-anchored reasoning policies, measuring quality gain per marginal inference cost.

## Background & Rationale

Reasoning mechanisms must demonstrate positive delta against baselines. This story builds an automated eval harness measuring pass@k, pass^k, solution quality, token cost, and latency across reasoning policies.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0241** | `0241-omniroute-reasoning-eval-harness-core.md` — Build core reasoning eval harness supporting baseline vs frame vs control vs verifier comparisons and pass@k / pass^k metrics. |
| **0242** | `0242-omniroute-reasoning-eval-benchmark-suite-and-cost-gain-analyzer.md` — Build benchmark suite for cognitive control policies and marginal quality gain per marginal inference cost analyzer. |

## Acceptance Criteria

- [ ] Eval harness runs automated benchmark suites comparing reasoning policies.
- [ ] Pass@k, pass^k, token cost, latency, and quality metrics calculated.
- [ ] Marginal quality gain per marginal inference cost report generated.

## Non-goals

- No manual un-audited eval scoring.
