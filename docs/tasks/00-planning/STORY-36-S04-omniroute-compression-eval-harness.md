# STORY-36-S04: Compression Eval Harness

> **Parent Epic**: `EPIC-36-omniroute-cognitive-observability-and-evals.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — golden corpus testing framework for compression fidelity, structural/numeric/JSON integrity, and downstream task success.

## Goal

Build a golden corpus compression eval framework to measure structural, numeric, JSON, code-diff, and tool-call fidelity, validating downstream task success across compression profiles.

## Background & Rationale

Compression must not destroy information required for downstream task success. This story builds a golden corpus test suite evaluating operator profiles against real workloads to detect regressions before profile promotion.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0243** | `0243-omniroute-compression-golden-corpus-eval-harness.md` — Build golden corpus compression testing framework evaluating structural, numeric, JSON, and tool-call fidelity. |
| **0244** | `0244-omniroute-compression-downstream-task-success-and-regression-detector.md` — Build downstream task success measurement framework and automated profile regression detector. |

## Acceptance Criteria

- [ ] Golden corpus test suite evaluates compression profiles against code, JSON, tool call, and narrative prompts.
- [ ] Structural, numeric, JSON key, diff hunk, and protected token survival measured.
- [ ] Automated regression detector flags any profile causing downstream task failure.

## Non-goals

- No manual un-automated testing of golden corpus.
