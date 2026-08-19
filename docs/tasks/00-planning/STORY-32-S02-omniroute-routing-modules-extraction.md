# STORY-32-S02: Routing Modules Extraction

> **Parent Epic**: `EPIC-32-omniroute-routing-strategy-reformation.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — extracting LKGP, cache affinity, quota policies, cost/latency biases, and context relay into orthogonal policy modules.

## Goal

Extract auxiliary routing concerns—LKGP session stickiness, prompt-cache affinity, quota headroom/reset policies, cost/latency optimization biases, and context relay—out of mutually exclusive strategy dropdowns and into orthogonal, composable policy signal modules.

## Background & Rationale

Instead of forcing users to choose between `LKGP` OR `Cache-Optimized` OR `Reset-Aware`, this story transforms these features into modular policy signals that compose naturally on top of any core Selection Engine (`Priority`, `P2C`, or `Auto`).

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0199** | `0199-omniroute-affinity-modules-lkgp-and-prompt-cache.md` — Extract LKGP session stickiness and prompt-cache locality into composable affinity signal modules with configurable weights/sliders. |
| **0200** | `0200-omniroute-quota-optimization-and-continuity-modules.md` — Extract quota behavior (`preserve-headroom`, `reset-pressure`, `exhaustion-guard`), optimization biases (cost, latency, reliability), and context relay into modular policy handlers. |

## Acceptance Criteria

- [ ] LKGP converted from a standalone strategy into a weighted affinity signal module (`lastKnownGoodStrength`).
- [ ] Prompt-cache locality converted into a composable affinity module (`promptCacheStrength`).
- [ ] Quota headroom, reset window, and reset awareness unified into a single `quota` policy module.
- [ ] Cost, latency, and reliability biases extracted into composable optimization signals.
- [ ] Context relay converted into an orthogonal continuity capability toggle.

## Non-goals

- No removal of LKGP or context relay functionality (they become modular policies).
- No changes to hardware or provider network layer.
