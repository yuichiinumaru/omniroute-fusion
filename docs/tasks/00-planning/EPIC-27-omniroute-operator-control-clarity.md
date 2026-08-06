# EPIC-27: Operator Control and Quota Clarity

> **Status**: Planning — evidence-backed decomposition (2026-08-04)
> **Priority**: Medium
> **Origin**: Operator reports + UI/runtime investigation

## Goal

Make high-impact routing controls and quota displays self-explanatory without
changing their underlying semantics or exposing misleading quota information.

## Evidence basis

- Combo runtime uses `maxRetries` for per-target retries and
  `maxSetRetries` for whole-set retries; both values are additional retries and
  use inclusive loops.
- UI labels are currently only `Max Retries` and `Max Set Retries`.
- Antigravity quota data is rendered per model bucket, while the backend already
  has family classification infrastructure that is not consumed by the UI.

## Stories / executable tasks

| Story | Task | Scope |
|---|---|---|
| Retry control clarity | 0142 | Clarify labels/help/docs while preserving runtime semantics. |
| Antigravity quota families | 0144 | Verify accepted model buckets, then render three meaningful family bars. |

## Ordering

Tasks 0142 and 0144 are independent. Task 0144 must validate model acceptance
before changing grouping or aggregation.

## Non-goals

- Do not silently change retry counts while changing labels.
- Do not sum incompatible quota percentages as if they were one absolute pool.
- Do not remove the credits row without evidence that it is redundant.
