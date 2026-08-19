# STORY-34-S04: Cognitive State & Cascade Invalidation

> **Parent Epic**: `EPIC-34-omniroute-reasoning-policy-and-cognitive-state.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — structured working memory (State), belief dependency edges, semantic diff, and directed cascade stale invalidation.

## Goal

Implement `State` schema for structured working memory (facts, hypotheses, evidence, dependency edges), semantic diff engine, and directed cascade stale invalidation.

## Background & Rationale

*Validity Is Inherited*: reasoning conclusions depend on supporting premises. When an underlying premise or observation changes, all dependent beliefs must be marked `stale` automatically. Semantic diff prevents invalidating beliefs on cosmetic text changes while ensuring material changes propagate correctly.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0223** | `0223-omniroute-structured-cognitive-state-schema-and-belief-graph.md` — Implement `State` schema for facts, hypotheses, evidence, and directed belief dependency edges (`supports`, `contradicts`, `derives`). |
| **0224** | `0224-omniroute-semantic-diff-and-cascade-stale-invalidation-engine.md` — Implement semantic diff engine and directed cascade stale invalidation engine to mark dependent conclusions stale on premise mutation. |

## Acceptance Criteria

- [ ] `State` schema represents explicit working memory (facts, hypotheses, evidence, dependency edges).
- [ ] Semantic diff classifies changes into syntax vs material logic/fact changes.
- [ ] Cascade invalidator traverses directed dependency edges to invalidate downstream conclusions when a supporting premise mutates.
- [ ] Seam/checkpoint serialization supports session persistence across compactions.

## Non-goals

- No storage of raw monologue text in belief graph edges.
