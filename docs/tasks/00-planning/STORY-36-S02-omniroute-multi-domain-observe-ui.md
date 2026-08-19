# STORY-36-S02: Multi-Domain Observe UI

> **Parent Epic**: `EPIC-36-omniroute-cognitive-observability-and-evals.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — extending `Observe > Route Trace` to display multi-domain policy resolution, compression savings/guards, and reasoning step traces.

## Goal

Extend OmniRoute's `Observe > Route Trace` UI tab to display multi-domain policy resolution, field-level provenance, compression savings/guards, and reasoning step traces.

## Background & Rationale

Building on existing `Observe` dashboard surfaces, this story updates the trace drawer to display unified receipts: why a target was selected, which scope supplied each policy value, how much context was compressed by which engine, and what reality anchors verified the reasoning.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0239** | `0239-omniroute-observe-route-trace-multidomain-expansion.md` — Extend `Observe > Route Trace` tab to render multi-domain policy resolution, candidate rejection reasons, and scope provenance. |
| **0240** | `0240-omniroute-compression-and-reasoning-trace-detail-views.md` — Build detail components for compression savings/guards, reasoning step traces, and verifier outcome badges. |

## Acceptance Criteria

- [ ] `Observe > Route Trace` tab extended without creating new topbar/sidebar tabs.
- [ ] Field-level provenance badges displayed (`Global`, `Provider`, `Model`, `Combo`).
- [ ] Compression breakdown displayed (savings %, engines applied, fidelity guard status).
- [ ] Reasoning step traces and reality anchor verification outcomes displayed.

## Non-goals

- No new top-level sidebar leaves (must extend `Observe` tab).
