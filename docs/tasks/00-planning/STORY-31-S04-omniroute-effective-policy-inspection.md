# STORY-31-S04: Effective Policy Inspection

> **Parent Epic**: `EPIC-31-omniroute-scoped-policy-foundation.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — inspection API, provenance visualization, pre-save preview, and redundant override detection.

## Goal

Build the inspection API and analytical tools to resolve effective policies, visualize field-level provenance, preview pre-save overrides, and detect redundant or orphan assignments.

## Background & Rationale

Operators need complete visibility into why a particular policy value was selected for a request. This story provides backend APIs to inspect effective policy resolution across Global/Provider/Model/Combo without executing a request, calculate diffs between inherited and overridden fields, and detect redundant overrides.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0193** | `0193-omniroute-effective-policy-resolution-and-inspection-api.md` — Build pre-execution inspection API for effective policy resolution, field provenance, and inherited vs local diffs. |
| **0194** | `0194-omniroute-redundant-override-detection-and-orphan-linters.md` — Implement pre-save redundant override detection, orphan reference linters, and policy health diagnostics. |

## Acceptance Criteria

- [ ] `GET /api/settings/policies/inspect` returns effective policy + field-level provenance map for any (provider, model, combo) tuple.
- [ ] Diff engine highlights fields overridden locally vs inherited from higher scopes.
- [ ] Pre-save preview endpoint validates policy changes before applying.
- [ ] Linter flags redundant overrides (where local value matches inherited value).

## Non-goals

- No dashboard UI rendering (UI components consume this API).
- No modification of routing runtime execution.
