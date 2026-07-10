# Task 0029: Frontend IA — CLI ConfigurableToolCard Extraction (S8)

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S8**)
> **Action type**: EXTEND
> **Blocks**: none
> **Depends on**: none hard (pilots first inside this task); Wave 1 primitives optional
> **Parallel group**: A (large effort — can run late in parallel with IA work)

---

## Objective

Extract a shared **`ConfigurableToolCard` shell** for CLI / agent tool configuration UIs after **two successful pilot migrations**, collapsing thousands of lines of near-duplicate card chrome.

Epic §9 estimates **~3.5–5.5k LOC** recoverable from CLI card clones — largest single componentization win.

**Process (mandatory):**
1. Inventory CLI tool card implementations under `src/shared/components/cli/` and dashboard CLI tool pages.
2. Choose **2 pilot tools** with representative complexity (OAuth + manual config + model aliases preferred).
3. Extract shell API (props for title, status, actions, sections, risk notice hooks).
4. Migrate the 2 pilots onto the shell; leave remaining cards on a tracked follow-up list (do not boil the ocean in one PR unless LOC delta is already proven).

## Background Context

### What already exists:
- `src/shared/components/cli/CliToolCard.tsx`, `CliComparisonCard.tsx`, `CliConceptCard.tsx`, `index.ts`
- Per-tool cards/pages (Claude, Antigravity, OpenClaw, Hermes, etc.) with repeated layout, status, manual config modals
- Tests: `tests/unit/ui/CliToolCard.test.tsx`, tool-specific `*ToolCard*.test.tsx`

### What is missing:
- Shared configurable shell that absorbs repeated sections (header, badges, actions, collapsible config, risk modal slot)
- Documented migration path for remaining tools

### Out of scope:
- Changing upstream OAuth/protocol behavior
- MITM tab reintroduction
- Full rewrite of every tool in one task if pilots incomplete

---

## Test Requirements

- MUST migrate **≥ 2** pilot tool UIs to the new shell with behavior parity (existing pilot tests green)
- MUST export shell from `src/shared/components/cli/` (or documented path) with typed props
- MUST add unit tests for the shell (render sections, action callbacks, disabled states)
- MUST document remaining tools still on legacy cards
- MUST NOT regress tool-specific tests for pilots
- `npm run typecheck:core` + targeted tests MUST pass

---

## Exit Conditions (GDD/TDD)

- [ ] Inventory table of CLI cards + LOC approx in Completion Evidence
- [ ] `ConfigurableToolCard` (name flexible) implemented and exported
- [ ] ≥ 2 pilots migrated with tests green
- [ ] Shell unit tests cover core props/slots
- [ ] Follow-up list of remaining tools (ids/paths) documented
- [ ] Before/after LOC estimate for pilots recorded (epic savings tracking)
- [ ] `npm run typecheck:core` passes
- [ ] Targeted unit tests pass with 0 failures
- [ ] CHANGELOG.md entry

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `CliToolCard.tsx`, 3–5 heaviest tool cards, shared modals (`ManualConfigModal`, risk modals), pilot tests
- [ ] **Inventory + pick pilots**: document why those two (coverage of OAuth + manual + aliases)
- [ ] **Design shell API**: slots/props — avoid god-object; prefer composition
- [ ] **Implement shell** + Storybook/docs comment optional
- [ ] **Migrate pilot A** + tests
- [ ] **Migrate pilot B** + tests
- [ ] **Refactoring pass**: delete dead duplicate chrome only for pilots
- [ ] **Document residuals** for future tasks
- [ ] **Verificação**: typecheck + tests

### Where

| File | Purpose |
|------|---------|
| `src/shared/components/cli/CliToolCard.tsx` | Read/Refactor — baseline |
| `src/shared/components/cli/ConfigurableToolCard.tsx` | Create — shell (name may vary) |
| `src/shared/components/cli/index.ts` | Modify — export |
| Pilot tool components under `src/app/(dashboard)/dashboard/**` or `src/shared/components/**` | Modify |
| `tests/unit/ui/CliToolCard.test.tsx` | Read |
| `tests/unit/ui/*ToolCard*.test.tsx` | Update pilots |
| `tests/unit/ui/ConfigurableToolCard.test.tsx` | Create |
| `CHANGELOG.md` | Entry |

### How

1. Diff two complex cards; extract common structure only when shared ≥2 times (rule of three softened to pilots).
2. Keep tool-specific logic in children/render props.
3. Migrate pilots behind feature-stable UI (no user-visible regression).
4. Measure LOC removed in pilots; stop if shell API is wrong — fix before third migration.

### Why

Highest LOC recovery in epic §5 componentization rank. Independent of sidebar IA; can ship in parallel once Wave 1 primitives exist.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT migrate all CLI tools before 2 pilots prove the API.
> DO NOT mix OAuth protocol changes into this UI shell task.
> DO NOT delete tool-specific tests “to make green”.

> [!IMPORTANT]
> Pilots first. Residual list required.
> Prefer composition slots over a 40-prop god component.
> Archive-not-delete only if removing whole files — prefer refactor in place.

---

## 🛡️ Compliance Checklist

- [ ] **Tests** for shell + pilots
- [ ] **No protocol regressions**
- [ ] **LOC evidence**
- [ ] **CHANGELOG**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista]
- **Pilots**: [tool names]
- **LOC before/after (pilots)**: [numbers]
- **Residual tools**: [list]
- **Testes**: [nomes + resultado]
- **typecheck**: [PASS/FAIL]
- **CHANGELOG**: [ref]
- **Agente executor**: [nome]
- **Data de conclusão**: [YYYY-MM-DD]
