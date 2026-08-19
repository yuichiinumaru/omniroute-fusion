# STORY-33-S05: Compression UI Reform

> **Parent Epic**: `EPIC-33-omniroute-compression-principia-and-rebuild.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — UI components for 4-scope compression management, profile editor, provider/model options, and audit analytics.

## Goal

Update OmniRoute's dashboard UI to support 4-scope compression management (Global settings, Profile manager, Combo overrides, Provider Options, Model selector) and display Audit mode analytics.

## Background & Rationale

Building on the UI design system principles established in EPIC-19/20, this story updates the compression UI surfaces to present clear inheritance states, field-level provenance badges, profile presets, and shadow audit analytics.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0215** | `0215-omniroute-compression-global-settings-and-profile-manager-ui.md` — Build Global Compression Settings (Master Switch, Global Profile selector) and Compression Profile Manager UI components. |
| **0216** | `0216-omniroute-scoped-compression-ui-and-audit-analytics-views.md` — Build scoped compression controls for Combo Editor, Provider Options, Model Overrides, and Audit Mode Analytics views. |

## Acceptance Criteria

- [ ] Global Compression Settings UI includes Master Kill Switch and Global Profile selector.
- [ ] Compression Profile Manager supports CRUD, built-ins, and duplication.
- [ ] Combo Editor, Provider Options, and Model Overrides display inherited values vs local overrides with clear badges.
- [ ] Audit Analytics view displays fidelity pass rates and token savings per scope/profile.

## Non-goals

- No new top-level sidebar leaves (extend existing `/dashboard/routing` or `/dashboard/providers` tabs).
- No dual topbars.
