# EPIC-36: OmniRoute Cognitive Observability & Evals

> **Status**: Planning — evidence-backed architectural specification (2026-08-19)
> **Priority**: 🟡 High
> **Origin**: `.agents/user/omniroute2-reasoning.md` — building multi-domain cognitive receipts, multi-domain Route/Reasoning/Compression Trace in Observe, execution quality & compression eval harnesses, and outcome-based policy learning.

## Goal

Build multi-domain cognitive receipts, multi-domain Route/Reasoning/Compression Trace in `Observe`, execution quality & compression eval harnesses, and outcome-based policy learning.

The epic ensures every policy resolution and cognitive transformation produces a structured, human-auditable receipt (`why was this target/profile/operator selected?`), provides a unified trace UI in `Observe`, and establishes rigorous eval harnesses to prove marginal quality gain per marginal inference cost.

## Evidence basis

- `.agents/user/omniroute2-reasoning.md`: establishes that cognitive systems require external observability and empirical eval harnesses to prevent "formality theater" and unverified claims.
- `src/app/api/usage/call-logs/route.ts`: established call logging infrastructure in OmniRoute.
- `open-sse/services/compressionAnalytics.ts`: existing compression breakdown tracking.
- `src/app/(dashboard)/dashboard/activity/`: established activity feed / monitoring UI in OmniRoute (`Observe`).

## Stories & Executable Tasks

| Story | Task | Scope |
|---|---:|---|
| **STORY-36-S01: Cognitive receipt & trace schema** | 0237 | `0237-omniroute-cognitive-receipt-unified-schema.md` — Design unified Cognitive Receipt schema for Routing, Compression, and Reasoning. |
| | 0238 | `0238-omniroute-execution-accounting-tracer.md` — Build execution accounting tracer logging token savings, cost, and verifier outcomes. |
| **STORY-36-S02: Multi-domain Observe UI** | 0239 | `0239-omniroute-observe-route-trace-multidomain-expansion.md` — Extend `Observe > Route Trace` tab to render multi-domain policy resolution and provenance. |
| | 0240 | `0240-omniroute-compression-and-reasoning-trace-detail-views.md` — Build detail views for compression savings/guards and reasoning step traces. |
| **STORY-36-S03: Reasoning eval harness** | 0241 | `0241-omniroute-reasoning-eval-harness-core.md` — Build core reasoning eval harness (pass@k, pass^k, quality gain per marginal inference cost). |
| | 0242 | `0242-omniroute-reasoning-eval-benchmark-suite-and-cost-gain-analyzer.md` — Build benchmark suite for cognitive control policies and cost/gain analyzer. |
| **STORY-36-S04: Compression eval harness** | 0243 | `0243-omniroute-compression-golden-corpus-eval-harness.md` — Build golden corpus compression eval harness (structural/numeric/JSON fidelity). |
| | 0244 | `0244-omniroute-compression-downstream-task-success-and-regression-detector.md` — Build downstream task success measurement and regression detector. |
| **STORY-36-S05: Outcome learning & memory export** | 0245 | `0245-omniroute-policy-outcome-tracker-and-recommendation-generator.md` — Build policy outcome tracking and user-assisted policy recommendation generator. |
| | 0246 | `0246-omniroute-khala-external-memory-export-interface.md` — Build Khala / external memory export interface for cognitive receipts and learnings. |

## Ordering

1. **Story F1** (Tasks 0237, 0238) defines the unified cognitive receipt and trace schema.
2. **Story F2** (Tasks 0239, 0240) builds the multi-domain Route/Reasoning/Compression Trace UI in `Observe`.
3. **Story F3** (Tasks 0241, 0242) builds the reasoning eval harness.
4. **Story F4** (Tasks 0243, 0244) builds the compression eval harness.
5. **Story F5** (Tasks 0245, 0246) builds policy outcome tracking, user-assisted policy recommendations, and external memory export.

## Non-goals

- No automatic unreviewed mutation of user policies by the eval harness.
- No logging of private Chain-of-Thought text into persistent storage.
- No duplicate monitoring pages (extend `Observe` topbar tab, no new sidebar leaves).
