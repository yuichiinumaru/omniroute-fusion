# STORY-31-S03: Profiles Lifecycle

> **Parent Epic**: `EPIC-31-omniroute-scoped-policy-foundation.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — immutable built-in profiles, custom profile duplication, detach engine, and lifecycle integrity.

## Goal

Implement the lifecycle management engine for Policy Profiles, including immutable built-ins, profile duplication, local detaching, where-used integrity checks, deprecation, and safe deletion.

## Background & Rationale

Profiles act as reusable policy presets (e.g. `Coding Stable`, `Cheap Background`). To prevent accidental system-wide breakage, built-in profiles are immutable (clonable only), assignments link by reference (`profileRef`), and detaching allows materializing inherited profile settings locally into scope overrides.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0191** | `0191-omniroute-profile-lifecycle-builtins-dup-and-detach.md` — Implement immutable built-ins, custom profile duplication, and local profile detach engine. |
| **0192** | `0192-omniroute-profile-where-used-integrity-and-safe-deletion.md` — Implement where-used reference integrity checks, deprecation states, and safe deletion guards. |

## Acceptance Criteria

- [ ] Immutable system built-in profiles protected from direct modification or deletion.
- [ ] Profile duplication creates an unlinked custom profile copy.
- [ ] Detach engine materializes inherited profile settings into local scope overrides and clears `profileRef`.
- [ ] Where-used checker prevents deleting profiles actively referenced by combos, models, or providers.

## Non-goals

- No frontend components (handled in Story A4 and EPIC-32/33 UI tasks).
- No direct execution of routing decisions.
