# STORY-35-S03: Observation Assimilation

> **Parent Epic**: `EPIC-35-omniroute-deliberation-control-and-verification.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — tool/external observation schema and mandatory assimilation transition (tool result -> analyze what changed -> update belief state).

## Goal

Implement tool/external observation schema and mandatory assimilation stage (*Observation Must Change State*).

## Background & Rationale

Tool execution outputs are not knowledge until explicitly assimilated into the cognitive state. This story enforces a mandatory `Observation Assimilation` transition after tool calls, forcing the agent to analyze what changed before proceeding to the next step.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0231** | `0231-omniroute-tool-external-observation-schema.md` — Implement observation schema for tool execution results, API responses, and external environment probes. |
| **0232** | `0232-omniroute-mandatory-observation-assimilation-engine.md` — Implement mandatory assimilation transition engine mapping observations to belief state updates (`supports`, `contradicts`, `invalidates`). |

## Acceptance Criteria

- [ ] Tool/external execution outputs captured into structured `Observation` objects.
- [ ] Mandatory `Observation Assimilation` stage executed before next action.
- [ ] Belief state updated with supporting/contradicting evidence from observation.

## Non-goals

- No raw un-assimilated tool output flooding directly into reasoning state without analysis.
