# STORY-35-S05: Diversity & Independence-Weighted Ensembles

> **Parent Epic**: `EPIC-35-omniroute-deliberation-control-and-verification.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — candidate provenance tracking, correlation signals, independence-aware weighting, and lens-driven deliberate diversity.

## Goal

Implement candidate provenance tracking, correlation signal calculation, independence-aware ensemble weighting (*Diversity Only Counts When It Buys Independence*), and lens-driven deliberate diversity.

## Background & Rationale

Multiple model calls with the same system prompt, provider, and context are correlated—they do not provide independent evidence. This story measures candidate independence (shared model, shared provider, shared prompt/lens, shared context) and discounts correlated agreement when aggregating ensemble decisions.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0235** | `0235-omniroute-candidate-provenance-and-correlation-signal-calculator.md` — Implement candidate provenance tracking and correlation signal calculator (shared model, provider, lens, context). |
| **0236** | `0236-omniroute-independence-weighted-ensemble-aggregation.md` — Implement independence-weighted ensemble decision aggregator and lens-driven deliberate diversity controller. |

## Acceptance Criteria

- [ ] Candidate provenance records provider, model, temperature, system prompt, lens, and context version.
- [ ] Correlation signal calculator identifies shared error sources across ensemble candidates.
- [ ] Ensemble decision aggregator discounts correlated votes and weights independent candidate trajectories.

## Non-goals

- No treating simple temperature variations as independent evidence sources.
