# Task 0021: Frontend IA — Shared UI Primitives (EmptyState, SettingsToggleRow, StatCard)

> **Status**: `[x]` Completed
> **Priority**: 🔴 P0
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S1** — primitive discipline, partial)
> **Action type**: EXTEND
> **Blocks**: Task 0027 (remaining toggle migration), Task 0028 (theme micro on shared tiles)
> **Depends on**: Task 0020 (governance baseline — logical)
> **Parent review**: Wave 1 shipped 2026-07-10 — commit `d96e677` (+ epic §11a)

---

## Objective

Ship the first wave of **shared mid-layer UI primitives** so IA reorg and settings screens touch fewer ad-hoc clones:

1. **`EmptyState`** — token-aware Tailwind empty placeholder (kill hard-coded / dual empty patterns for new call sites).
2. **`SettingsToggleRow`** — labeled settings row wrapping shared `Toggle` semantics for consistent a11y/layout.
3. **Canonical `StatCard`** — export from `src/shared/components/analytics/charts.tsx`; adopt on MCP / A2A / Search / Compression analytics surfaces (no new local StatCard copies on those hubs).

This task is **S1 partial**: ApiManager hand-rolled `role="switch"` migration is **out of scope** → Task 0027.

## Background Context

### What already exists (pre-Wave 1):
- Design tokens in `src/app/globals.css` (`@theme inline`)
- Shared `Toggle`, `Badge`, `Card`, `Button` primitives under `src/shared/components/`
- Multiple local `function StatCard` / empty placeholders across dashboard pages
- Epic 0005 §5 quickwin ranks: SettingsToggleRow, MetricStatCard, EmptyState tokens = High impact / Small effort

### What was missing:
- Token-consistent EmptyState for dashboard empties
- Reusable settings toggle row (label + description + switch)
- Single StatCard export used by MCP/A2A/Search/Compression instead of per-page clones

---

## Test Requirements

- MUST render `EmptyState` with token-based classes (no orphan hard-coded palette that fights `globals.css`)
- MUST export `SettingsToggleRow` with controlled checked/onChange and accessible label association
- MUST export shared `StatCard` from analytics charts module
- MUST cover EmptyState + SettingsToggleRow with unit/vitest UI tests
- MUST NOT introduce a second design system (no Prism fork / Orbitron)

---

## Exit Conditions (GDD/TDD)

- [x] `src/shared/components/EmptyState.tsx` uses Tailwind design tokens
- [x] `src/shared/components/SettingsToggleRow.tsx` exists and is re-exported from `src/shared/components/index.tsx`
- [x] Shared `StatCard` in `src/shared/components/analytics/charts.tsx` is the preferred metric tile
- [x] MCP / A2A / Search / Compression analytics surfaces use shared StatCard (Wave 1 adoption)
- [x] `tests/unit/ui/empty-state-tokens.test.tsx` passes
- [x] `tests/unit/ui/settings-toggle-row.test.tsx` passes
- [x] Epic 0005 §11a marks S1 EmptyState / SettingsToggleRow / StatCard done
- [x] Shipped with Wave 1 commit `d96e677` (2026-07-10)

---

## Details

### What

Subtasks:
- [x] **Read existing code**: `EmptyState` predecessors, `Toggle.tsx`, analytics chart helpers, MCP/A2A metric cards
- [x] **Implement token EmptyState**: Tailwind classes bound to theme tokens; props for icon/title/description/action
- [x] **Implement SettingsToggleRow**: label, optional description, disabled, test ids; wrap shared Toggle
- [x] **Promote StatCard**: document as canonical; migrate MCP/A2A/Search/Compression call sites
- [x] **Tests**: empty-state-tokens + settings-toggle-row
- [x] **Barrel export**: `src/shared/components/index.tsx`
- [x] **Verification**: targeted unit/vitest green

### Where

| File | Purpose |
|------|---------|
| `src/shared/components/EmptyState.tsx` | Create/extend — token EmptyState |
| `src/shared/components/SettingsToggleRow.tsx` | Create — settings toggle row |
| `src/shared/components/analytics/charts.tsx` | Extend — export canonical `StatCard` |
| `src/shared/components/index.tsx` | Modify — re-exports |
| MCP / A2A / Search / Compression analytics pages | Modify — import shared StatCard |
| `tests/unit/ui/empty-state-tokens.test.tsx` | Create — token assertions |
| `tests/unit/ui/settings-toggle-row.test.tsx` | Create — row behavior |
| `docs/tasks/00-planning/0005-…-epic.md` | Read — S1 outcomes |

### How

1. Rewrite EmptyState to pure Tailwind token classes (surface/text/border).
2. Add SettingsToggleRow composition over existing Toggle primitive.
3. Export StatCard from charts with a “prefer this over local copies” docstring.
4. Point high-traffic analytics hubs at the shared StatCard.
5. Add focused UI unit tests.

### Why

IA reorg (S2–S6) multiplies pain if every screen still owns its own empty/toggle/stat chrome. S1 partial lands the cheap, high-leverage primitives before larger sidebar rebuilds.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT port visual-reference Prism components or Orbitron chrome.
> DO NOT claim full ApiManager switch migration — that is Task 0027.
> DO NOT invent Atomic Design folder renames.

> [!IMPORTANT]
> Prefer adoption on the worst clone clusters first; leave deep CLI cards to Task 0029.
> Keep light + dark token pairs if any new class references CSS variables.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: Component paths verified live
- [x] **Zod Validation**: N/A (UI primitives)
- [x] **Security**: No secrets
- [x] **Archive Protocol**: N/A (additive primitives)

---

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/components/EmptyState.tsx` — token-aware Tailwind EmptyState
  - `src/shared/components/SettingsToggleRow.tsx` — shared settings toggle row
  - `src/shared/components/analytics/charts.tsx` — canonical `export function StatCard`
  - `src/shared/components/index.tsx` — re-exports EmptyState + SettingsToggleRow
  - MCP / A2A / Search / Compression analytics surfaces — shared StatCard adoption
  - `tests/unit/ui/empty-state-tokens.test.tsx`
  - `tests/unit/ui/settings-toggle-row.test.tsx`
- **Testes que verificam o trabalho**:
  - `tests/unit/ui/empty-state-tokens.test.tsx`
  - `tests/unit/ui/settings-toggle-row.test.tsx`
- **Resultado dos testes**: PASS (Wave 1)
- **Entrada no changelog**: Wave 1 Frontend IA / design-system notes
- **Agente executor**: Wave 1 session (omniroute-fusion) — 2026-07-10
- **Data de conclusão**: 2026-07-10
- **Commit**: `d96e677`

---

## 🔍 Review Trail

- **Reviewer**: Task Architect (post-hoc Wave 1 capture)
- **Data da review**: 2026-07-10
- **Veredito**: PASS
- **Score (path to 100)**: 95
- **Notas**: Remaining hand-rolled switches deferred to Task 0027; residual local StatCards (e.g. cache page) may migrate opportunistically.
