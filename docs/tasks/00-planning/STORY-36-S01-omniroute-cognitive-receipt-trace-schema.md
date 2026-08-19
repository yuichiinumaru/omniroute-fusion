# STORY-36-S01: Cognitive Receipt & Trace Schema

> **Parent Epic**: `EPIC-36-omniroute-cognitive-observability-and-evals.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — unified receipt format for routing, compression, and reasoning, and execution accounting tracer.

## Goal

Design and implement the unified Cognitive Receipt schema and accounting tracer for Routing, Compression, and Reasoning executions.

## Background & Rationale

Every decision, policy resolution, context reduction, and reasoning step must emit a structured, audit-ready receipt (`why was this target/profile/operator selected?`). Receipts provide transparent observability into policy resolution without persisting private CoT monologue text.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0237** | `0237-omniroute-cognitive-receipt-unified-schema.md` — Design unified Cognitive Receipt schema for Routing, Compression, and Reasoning domains with field-level provenance. |
| **0238** | `0238-omniroute-execution-accounting-tracer.md` — Build execution accounting tracer logging token savings, inference cost, operator events, and verification outcomes. |

## Acceptance Criteria

- [ ] Unified receipt schema registered for Routing, Compression, and Reasoning.
- [ ] Field-level provenance logged for policy resolution choices.
- [ ] Token savings, inference cost, operator sequence, and verifier outcomes recorded per request.

## Non-goals

- No persistence of private CoT text monologues.
