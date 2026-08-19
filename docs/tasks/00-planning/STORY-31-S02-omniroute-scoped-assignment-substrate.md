# STORY-31-S02: Scoped Assignment Substrate

> **Parent Epic**: `EPIC-31-omniroute-scoped-policy-foundation.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — DB persistence, 4-scope resolver engine, tri-state merge, and field-level provenance tracing.

## Goal

Build the DB persistence layer, 4-scope policy resolver engine, tri-state merge logic, and field-level provenance tracer for the Scoped Policy Substrate.

## Background & Rationale

Building on established precedents in `src/lib/db/proxies.ts` and `src/lib/db/compressionCombos.ts`, this story implements a generic, high-performance assignment storage and resolution mechanism. The resolver evaluates `Global -> Provider -> Model -> Combo`, applies tri-state merging, and attaches field-level provenance metadata (`why was this field value selected?`).

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0189** | `0189-omniroute-scoped-policy-assignment-db-schema.md` — Build DB migration schema and CRUD module for `scoped_policy_assignments` and profile references. |
| **0190** | `0190-omniroute-4scope-policy-resolver-and-provenance-engine.md` — Implement deterministic 4-scope policy resolver engine with tri-state merging and field-level provenance tracing. |

## Acceptance Criteria

- [ ] SQLite tables and domain module created in `src/lib/db/` for scoped assignments.
- [ ] Resolver correctly evaluates `Global -> Provider -> Model -> Combo` hierarchy.
- [ ] Tri-state merging handles `undefined` (inherit), `false`, `0`, and string/number overrides cleanly.
- [ ] Provenance tracer returns source layer for every resolved field (`global`, `provider`, `model`, `combo`).
- [ ] In-memory caching and invalidation ensures zero SQLite query overhead on hot request paths.

## Non-goals

- No UI components (handled in Story A4).
- No direct routing execution (handled in EPIC-32).
