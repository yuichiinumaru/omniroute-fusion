# STORY-32-S01: Selection Engine Simplification

> **Parent Epic**: `EPIC-32-omniroute-routing-strategy-reformation.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — simplifying selection engines to Priority, P2C, and Auto, and building legacy strategy compatibility shims.

## Goal

Simplify OmniRoute's core Selection Engine choices down to 3 canonical algorithms (`Priority`, `P2C`, `Auto`), deprecating false/redundant strategy choices from the main selection dropdown while preserving 100% backwards compatibility for existing combos via a legacy strategy adapter layer.

## Background & Rationale

Source code analysis in `open-sse/services/combo/` proves that many of OmniRoute's 18+ strategy choices are either redundant (`fill-first` == `priority`), simplified historical counters (`least-used`), or misclassified execution topologies (`fusion`). This story simplifies the core target selection engine choices to `Priority` (manual), `P2C` (adaptive simple tournament), and `Auto` (multifactorial scoring), wrapping legacy strategies in a transparent compatibility layer.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0197** | `0197-omniroute-selection-engine-core-simplification.md` — Refactor target selection engine core to standard `Priority`, `P2C`, and `Auto` contracts with clear algorithm boundaries. |
| **0198** | `0198-omniroute-legacy-strategy-compatibility-adapter.md` — Build transparent legacy strategy compatibility adapter to map legacy strategy keys seamlessly to new selection engines and policy signals. |

## Acceptance Criteria

- [ ] Core selection engines standardized on `Priority`, `P2C`, and `Auto`.
- [ ] Legacy strategies (`fill-first`, `least-used`, `random`, `strict-random`, `round-robin`, `weighted`) handled by compatibility adapter without breaking existing combos.
- [ ] No regression in target sorting performance or candidate resolution.

## Non-goals

- No deletion of legacy combo fields or database breaking changes.
- No changes to Execution Topologies (Fusion, Pipeline handled in Story B4).
