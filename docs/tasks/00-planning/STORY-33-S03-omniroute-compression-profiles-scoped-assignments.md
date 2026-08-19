# STORY-33-S03: Compression Profiles & Scoped Assignments

> **Parent Epic**: `EPIC-33-omniroute-compression-principia-and-rebuild.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — Compression Profile schema, 4-scope inheritance, Master Kill Switch supremacy, and legacy migration shims.

## Goal

Rename Compression Combos to Profiles, apply the Scoped Policy Substrate (EPIC-31) to compression policies across Global, Provider, Model, and Combo scopes, enforce Master Kill Switch supremacy, and build legacy migration shims.

## Background & Rationale

Renaming "Compression Combo" to "Compression Profile" resolves semantic ambiguity with Routing Combos. Compression policies inherit via $\text{Global} \rightarrow \text{Provider} \rightarrow \text{Model} \rightarrow \text{Combo}$ ($\text{Combo}$ most specific), while Master Kill Switch (`masterEnabled = false`) overrides all lower scopes instantly.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0211** | `0211-omniroute-compression-profile-schema-and-4scope-resolution.md` — Implement `CompressionProfile` schema, built-ins (`Safe`, `Tool Heavy`, `Aggressive`), and 4-scope assignment resolution engine. |
| **0212** | `0212-omniroute-compression-master-kill-switch-and-legacy-adapters.md` — Enforce Master Kill Switch supremacy (`masterEnabled=false` blocks all compression) and build legacy migration shims for `comboOverrides` and `activeComboId`. |

## Acceptance Criteria

- [ ] `CompressionCombo` renamed conceptually to `CompressionProfile`.
- [ ] 4-scope inheritance ($\text{Global} \rightarrow \text{Provider} \rightarrow \text{Model} \rightarrow \text{Combo}$) implemented using EPIC-31 substrate.
- [ ] Master Kill Switch (`masterEnabled = false`) strictly prevents any compression regardless of scope overrides or request headers.
- [ ] Legacy fields (`comboOverrides`, `activeComboId`, `compressionMode`) handled via compatibility shims.

## Non-goals

- No breaking change to legacy DB tables (`compression_combos` table retained with migration alias).
- No removal of request-level `x-omniroute-compression` header override capability.
