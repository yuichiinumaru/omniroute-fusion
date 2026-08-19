# STORY-32-S03: Strategy Profiles & Scoped Assignments

> **Parent Epic**: `EPIC-32-omniroute-routing-strategy-reformation.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — RoutingStrategyProfile schema, built-ins, custom profile editor, per-combo overrides, and scoped policy integration.

## Goal

Integrate the Scoped Policy Substrate (EPIC-31) into Routing by implementing `RoutingStrategyProfile` schemas, built-in strategy presets (`Priority`, `P2C`, `Auto`), custom strategy profile CRUD, and per-combo policy overrides.

## Background & Rationale

Strategy Profiles represent named, reusable routing policy configurations (e.g. `Coding Stable`, `Burn Free Quota`). Combos reference a profile and apply local overrides (`profileRef + overrides`), eliminating the clutter of 18+ individual strategy choices per combo.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0201** | `0201-omniroute-routing-strategy-profile-schema-and-builtins.md` — Implement `RoutingStrategyProfile` schema, immutable built-ins (`Priority`, `P2C`, `Auto`), and profile management API. |
| **0202** | `0202-omniroute-per-combo-routing-overrides-and-detach-engine.md` — Implement combo-level policy assignment, per-combo local field overrides, and detach strategy materialization engine. |

## Acceptance Criteria

- [ ] `RoutingStrategyProfile` schema registered in DB and validated by Zod.
- [ ] Built-in strategy profiles (`Priority`, `P2C`, `Auto`) registered as immutable presets.
- [ ] Custom strategy creation, duplication, detaching, and assignment supported.
- [ ] Combos can reference a strategy profile and apply local overrides (`profileRef + overrides`).

## Non-goals

- No breaking changes to existing combo endpoints (backward compatible adapter).
- No hardcoded provider/model biases inside built-in profiles.
