# STORY-35-S02: Adaptive Cognitive Controller

> **Parent Epic**: `EPIC-35-omniroute-deliberation-control-and-verification.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — cognitive signal detectors (uncertainty, stall, loop, oscillation, tunnel-vision) and budget-aware escalation state machine.

## Goal

Implement adaptive cognitive controller signals (`uncertainty`, `stall`, `loop`, `oscillation`, `tunnel-vision`) and budget-aware escalation state machine (*Metacognition Must Change Control*).

## Background & Rationale

Reasoning is a feedback-controlled process. When a cognitive pathology is detected (e.g. `stall` = no new constraints generated after N turns, `loop` = repeated state, `oscillation` = flipping between A and B), the controller MUST execute a concrete control action (`branch`, `verify`, `change method`, `retrieve evidence`, `stop`).

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0229** | `0229-omniroute-cognitive-pathology-signal-detectors.md` — Implement signal detectors for cognitive pathologies (`uncertainty`, `stall`, `loop`, `oscillation`, `tunnel-vision`). |
| **0230** | `0230-omniroute-budget-aware-cognitive-escalation-state-machine.md` — Implement budget-aware cognitive escalation state machine mapping pathology signals to concrete control actions (`branch`, `verify`, `change operator`, `stop`). |

## Acceptance Criteria

- [ ] Signal detectors flag `stall`, `loop`, `oscillation`, and `tunnel-vision` accurately.
- [ ] Controller state machine triggers concrete actions (not just CoT text logging): `stall` -> stop deriving & seek empirics; `oscillation` -> find discriminating evidence; `tunnel-vision` -> branch/invert.
- [ ] Budget exhaustion forces clean termination with partial output receipt.

## Non-goals

- No un-budgeted infinite escalation loops.
