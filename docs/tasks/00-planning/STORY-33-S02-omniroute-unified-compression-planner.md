# STORY-33-S02: Unified Compression Planner

> **Parent Epic**: `EPIC-33-omniroute-compression-principia-and-rebuild.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — unifying the dual compression pipelines into a single `CompressionPlanner` with explicit `Emergency Context Fit`.

## Goal

Unify OmniRoute's two competing compression pipelines (`Modular Compression Pipeline` and `compressContext()` overflow recovery) into a single `CompressionPlanner`, transforming `compressContext()` into an explicit `Emergency Context Fit / Overflow Recovery` stage.

## Background & Rationale

Currently, `chatCore.ts` runs the Modular Compression Pipeline first and then independently evaluates `compressContext()` if context remains $>70\%$. This story establishes a single `CompressionPlanner` that evaluates policies, executes normal operators, applies safety guards, and escalates to `Emergency Context Fit` only when normal reduction fails to meet the model's token budget.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0209** | `0209-omniroute-unified-compression-planner-pipeline.md` — Implement single `CompressionPlanner` execution pipeline, replacing uncoordinated dual-pipeline calls in `chatCore.ts`. |
| **0210** | `0210-omniroute-emergency-context-fit-overflow-recovery-stage.md` — Refactor `compressContext()` into an explicit `Emergency Context Fit / Overflow Recovery` stage with anti-inflation fallback and audit receipts. |

## Acceptance Criteria

- [ ] Single `CompressionPlanner` manages all prompt context reduction in `chatCore.ts`.
- [ ] `compressContext()` refactored into `Emergency Context Fit` stage, executed only on hard token budget pressure.
- [ ] Anti-inflation guard discards any compression pass that results in larger or equal token count.
- [ ] Detailed receipt emitted recording every operator executed and whether emergency recovery fired.

## Non-goals

- No removal of emergency history truncation (it remains as last-resort recovery).
- No changes to native provider context editing (e.g. Anthropic context editing).
