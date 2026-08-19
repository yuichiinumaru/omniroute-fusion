# STORY-36-S05: Outcome Learning & Memory Export

> **Parent Epic**: `EPIC-36-omniroute-cognitive-observability-and-evals.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — policy outcome tracking by problem class, user-assisted policy recommendations, and Khala/external memory export.

## Goal

Build policy outcome tracking by problem class, user-assisted policy recommendation generator (no unreviewed self-mutation), and Khala/external memory export interface.

## Background & Rationale

OmniRoute can learn which routing, compression, and reasoning policies work best for specific problem classes over time. To preserve human governance, outcome learning generates recommendations for operator approval rather than silently mutating production policies.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0245** | `0245-omniroute-policy-outcome-tracker-and-recommendation-generator.md` — Build policy outcome tracking engine by problem class and user-assisted policy recommendation generator. |
| **0246** | `0246-omniroute-khala-external-memory-export-interface.md` — Build Khala / external memory export interface for cognitive receipts, policy performance, and institutional learnings. |

## Acceptance Criteria

- [ ] Policy outcome tracker logs success, cost, latency, and quality by problem class.
- [ ] Recommendation generator proposes policy tuning to the operator (requires human approval, no silent self-mutation).
- [ ] External memory export interface emits structured receipts and learnings to Khala / external systems.

## Non-goals

- No automatic silent self-mutation of production policies without operator approval.
