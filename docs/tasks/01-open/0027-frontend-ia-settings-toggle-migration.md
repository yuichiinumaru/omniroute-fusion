# Task 0027: Frontend IA — SettingsToggleRow / Toggle Migration (S1 EXTEND)

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S1** remainder — EXTEND after Wave 1 primitives)
> **Action type**: EXTEND
> **Blocks**: none
> **Depends on**: Task 0021 (SettingsToggleRow + Toggle exist — Completed)
> **Parallel group**: A

---

## Objective

Migrate **hand-rolled `role="switch"` / ad-hoc toggle rows** on high-traffic settings surfaces to shared primitives:

1. **`SettingsToggleRow`** (`src/shared/components/SettingsToggleRow.tsx`) for labeled settings rows
2. Shared **`Toggle`** where a bare switch is correct

**Primary target:** `ApiManagerPageClient.tsx` (many `role="switch"` instances) + `UsageLimitSettings.tsx` + other settings offenders listed in inventory.

**Success metric (epic):** no **new** raw `role="switch"` in settings/API manager; worst offenders migrated; a11y (label association, keyboard) consistent.

## Background Context

### What already exists (Wave 1 / Task 0021):
- `SettingsToggleRow` with tests (`tests/unit/ui/settings-toggle-row.test.tsx`)
- Shared `Toggle` component
- Partial StatCard/EmptyState adoption

### Live offenders (inventory sample 2026-07-10 — re-grep at start):
- `src/app/(dashboard)/dashboard/api-manager/ApiManagerPageClient.tsx` — numerous `role="switch"`
- `…/api-manager/components/UsageLimitSettings.tsx`
- `…/costs/components/ApiKeyUsageLimitCard.tsx`
- `…/memory/page.tsx`
- `…/context/combos/CompressionHub.tsx` (may be intentional compact switch — evaluate)
- Playground switches may stay domain-specific if not settings-row pattern

### Out of scope:
- CLI ConfigurableToolCard (Task 0029)
- Full app-wide eradication of every switch in one PR (use ranked list; document residual allowlist)
- Visual-reference redesign of Toggle

---

## Test Requirements

- MUST reduce `role="switch"` count in `ApiManagerPageClient.tsx` by migrating the settings-row cluster to `SettingsToggleRow` (measure before/after with `rg -c 'role="switch"'`)
- MUST preserve behavior: checked state, disabled, handlers, existing testids where present
- MUST keep or add unit/UI tests for at least one migrated ApiManager toggle cluster
- MUST NOT break API manager save/load flows
- `npm run typecheck:core` MUST pass; targeted tests MUST pass

---

## Exit Conditions (GDD/TDD)

- [ ] Before/after count of `role="switch"` in ApiManager (+ listed offenders) recorded in Completion Evidence
- [ ] Majority of ApiManager settings rows use `SettingsToggleRow` or shared `Toggle` (no unlabeled hand-rolled switches in migrated clusters)
- [ ] Residual switches (if any) documented with justification (e.g. compact toolbar, non-settings)
- [ ] Existing ApiManager / usage-limit tests updated and green; new tests if coverage gap
- [ ] `tests/unit/ui/settings-toggle-row.test.tsx` still passes
- [ ] `npm run typecheck:core` passes
- [ ] Targeted unit/UI tests pass with 0 failures
- [ ] CHANGELOG.md entry
- [ ] No new raw `role="switch"` introduced in files touched without SettingsToggleRow/Toggle

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `SettingsToggleRow.tsx`, `Toggle.tsx`, `ApiManagerPageClient.tsx` switch clusters, `UsageLimitSettings.tsx`, Wave 1 tests
- [ ] **Inventory**: `rg 'role="switch"' src/app/(dashboard)/dashboard` — ranked list by count
- [ ] **Migrate ApiManager clusters**: replace markup with SettingsToggleRow; preserve handlers/state
- [ ] **Migrate UsageLimitSettings + ApiKeyUsageLimitCard** if pattern matches
- [ ] **Evaluate memory/compression hub** — migrate only if settings-row pattern
- [ ] **Tests**: update/add coverage for toggles that previously relied on role=switch selectors
- [ ] **Refactoring pass**: extract repeated row props if needed (do not over-abstract)
- [ ] **Verificação**: typecheck + tests + count delta

### Where

| File | Purpose |
|------|---------|
| `src/shared/components/SettingsToggleRow.tsx` | Read — API contract |
| `src/shared/components/Toggle.tsx` | Read |
| `src/app/(dashboard)/dashboard/api-manager/ApiManagerPageClient.tsx` | Modify — primary migration |
| `src/app/(dashboard)/dashboard/api-manager/components/UsageLimitSettings.tsx` | Modify |
| `src/app/(dashboard)/dashboard/costs/components/ApiKeyUsageLimitCard.tsx` | Modify if in scope |
| Other settings pages from inventory | Modify as ranked |
| `tests/unit/ui/settings-toggle-row.test.tsx` | Read — still green |
| ApiManager-related tests under `tests/unit/` | Update |
| `CHANGELOG.md` | Entry |

### How

1. Re-run inventory; pick top offenders.
2. For each settings row: map label, description, checked, onChange, disabled → SettingsToggleRow props.
3. Keep data-testid attributes for E2E/unit stability.
4. Record residual allowlist for non-row switches.
5. CHANGELOG + evidence with counts.

### Why

Wave 1 shipped the primitive; without migration, clone tax and a11y drift remain on the hottest settings surface (API Manager). This is High impact / Small–Medium effort per epic §5.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT rewrite ApiManager business logic — presentation migration only.
> DO NOT force playground/studio compact toggles into SettingsToggleRow if layout breaks.
> DO NOT claim “zero switches in monorepo” — scope is ranked settings offenders.

> [!IMPORTANT]
> Measure before/after `role="switch"` counts — binary proof of progress.
> Preserve existing testids and keyboard accessibility.

---

## 🛡️ Compliance Checklist

- [ ] **Tests** cover migrated clusters
- [ ] **a11y**: labels associated
- [ ] **No secrets**
- [ ] **CHANGELOG**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista]
- **role=switch before/after counts**: [table]
- **Residual allowlist**: [files + reason]
- **Testes**: [nomes + resultado]
- **typecheck**: [PASS/FAIL]
- **CHANGELOG**: [ref]
- **Agente executor**: [nome]
- **Data de conclusão**: [YYYY-MM-DD]
