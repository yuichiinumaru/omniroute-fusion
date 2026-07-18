# Task 0029: Frontend IA — CLI ConfigurableToolCard Extraction (S8)

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
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

- [x] Inventory table of CLI cards + LOC approx in Completion Evidence
- [x] `ConfigurableToolCard` (name flexible) implemented and exported
- [x] ≥ 2 pilots migrated with tests green
- [x] Shell unit tests cover core props/slots
- [x] Follow-up list of remaining tools (ids/paths) documented
- [x] Before/after LOC estimate for pilots recorded (epic savings tracking)
- [x] `npm run typecheck:core` passes
- [x] Targeted unit tests pass with 0 failures
- [x] CHANGELOG.md entry _(published Unreleased Features — path-to-100 2026-07-18)_

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `CliToolCard.tsx`, 3–5 heaviest tool cards, shared modals (`ManualConfigModal`, risk modals), pilot tests
- [x] **Inventory + pick pilots**: document why those two (coverage of OAuth + manual + aliases)
- [x] **Design shell API**: slots/props — avoid god-object; prefer composition
- [x] **Implement shell** + Storybook/docs comment optional
- [x] **Migrate pilot A** + tests
- [x] **Migrate pilot B** + tests
- [x] **Refactoring pass**: delete dead duplicate chrome only for pilots
- [x] **Document residuals** for future tasks
- [x] **Verificação**: typecheck + tests

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

- [x] **Tests** for shell + pilots
- [x] **No protocol regressions**
- [x] **LOC evidence**
- [x] **CHANGELOG** _(published Unreleased Features — path-to-100 2026-07-18)_

---

## Inventory (CLI detail cards)

| Card | Path | LOC (pre) | Migrated? |
|------|------|-----------|-----------|
| KiloToolCard | `cli-code/components/KiloToolCard.tsx` | 494 | ✅ pilot |
| ClineToolCard | `cli-code/components/ClineToolCard.tsx` | 492 | ✅ pilot |
| ClaudeToolCard | `cli-code/components/ClaudeToolCard.tsx` | 607 | residual |
| AntigravityToolCard | `cli-code/components/AntigravityToolCard.tsx` | 490 | residual |
| CodexToolCard | `cli-code/components/CodexToolCard.tsx` | 897 | residual |
| CopilotToolCard | `cli-code/components/CopilotToolCard.tsx` | 444 | residual |
| DroidToolCard | `cli-code/components/DroidToolCard.tsx` | 609 | residual |
| HermesAgentToolCard | `cli-code/components/HermesAgentToolCard.tsx` | 528 | residual |
| OpenClawToolCard | `cli-code/components/OpenClawToolCard.tsx` | 575 | residual |
| CliproxyapiToolCard | `cli-code/components/CliproxyapiToolCard.tsx` | 261 | residual |
| DefaultToolCard | `cli-code/components/DefaultToolCard.tsx` | 746 | residual |
| CustomCliCard | `cli-code/components/CustomCliCard.tsx` | 373 | residual |
| CliToolCard (catalog link) | `src/shared/components/cli/CliToolCard.tsx` | ~152 | N/A (list card, not detail) |

**Pilot choice (Kilo + Cline):** near-identical VS Code extension config flow (manual config modal, model select, API key id, apply/reset/backups, runtime detection). Representative of the largest clone family without OAuth protocol risk.

---

## Shell API (composition)

`ConfigurableToolCard` root + slots:

| Slot | Role |
|------|------|
| root | Card chrome, header (icon/name/badge/description), expand chevron, `riskNotice`, expanded region |
| `.Checking` | Spinner + label |
| `.Body` | `flex-col gap-4` content wrapper |
| `.RuntimeStatus` | ready/not-ready panel + path rows |
| `.ConfiguredBanner` | green configured strip (children for tool-specific details) |
| `.Field` | labeled form row |
| `.Actions` | apply/reset buttons via **callbacks** (tool-specific strategies stay outside) |
| `.Message` | success/error toast strip |
| `.Backups` | collapsible backup list + restore callback |

Exported from `src/shared/components/cli/index.ts`.

---

## Residual tools (follow-up)

Do **not** migrate in this task without a new slice:

1. `ClaudeToolCard` — OAuth + manual config fallback
2. `AntigravityToolCard` — model aliases
3. `CodexToolCard` — heaviest (~897 LOC)
4. `CopilotToolCard`
5. `DroidToolCard`
6. `HermesAgentToolCard` — multi-role model dropdowns
7. `OpenClawToolCard`
8. `CliproxyapiToolCard`
9. `DefaultToolCard` — generic/custom tools
10. `CustomCliCard`

Suggested next pilots after API stabilizes: `CopilotToolCard` + `OpenClawToolCard` (medium complexity, similar apply/reset shape).

---

## Changelog Draft

```md
### Features
- **CLI ConfigurableToolCard shell (Frontend IA S8)**: extract composition-first
  `ConfigurableToolCard` under `src/shared/components/cli/` (header, checking,
  runtime status, configured banner, field, apply/reset actions, message, backups)
  and migrate pilot tools **Kilo** + **Cline** onto the shell. Apply/reset remain
  tool-specific callbacks. Residual detail cards listed for follow-up migration.
```

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Created**: `src/shared/components/cli/ConfigurableToolCard.tsx` (521 LOC)
  - **Created**: `tests/unit/ui/ConfigurableToolCard.test.tsx` (15 tests)
  - **Created**: `tests/unit/ui/KiloToolCard-shell.test.tsx` (3 tests)
  - **Created**: `tests/unit/ui/ClineToolCard-shell.test.tsx` (3 tests)
  - **Modified**: `src/shared/components/cli/index.ts` (exports)
  - **Modified**: `src/app/(dashboard)/dashboard/cli-code/components/KiloToolCard.tsx` (pilot)
  - **Modified**: `src/app/(dashboard)/dashboard/cli-code/components/ClineToolCard.tsx` (pilot)
  - **Modified**: this task file (evidence + residuals)
- **Pilots**: Kilo Code (`kilo`), Cline (`cline`)
- **LOC before/after (pilots)**:
  - Before: Kilo 494 + Cline 492 = **986**
  - After: Kilo 447 + Cline 448 = **895** (−91 in pilots; + typed props)
  - Shared shell investment: **521** LOC (amortized across residual migrations)
  - Note: first-pilot delta is modest by design — chrome is shared; business/fetch logic stays per tool. Epic 3.5–5.5k target is across remaining cards.
- **Residual tools**: Claude, Antigravity, Codex, Copilot, Droid, Hermes, OpenClaw, Cliproxyapi, Default, CustomCli (see table above)
- **Testes**:
  - `npx vitest run --config vitest.config.ts tests/unit/ui/ConfigurableToolCard.test.tsx tests/unit/ui/KiloToolCard-shell.test.tsx tests/unit/ui/ClineToolCard-shell.test.tsx`
  - **21/21 passed** (15 shell + 3 Kilo + 3 Cline)
- **typecheck**: `npm run typecheck:core` → **PASS**
- **CHANGELOG**: draft above (not written to CHANGELOG.md — builder discipline)
- **Agente executor**: gt-ts-engineer (builders worker, parent agentID=builders)
- **Data de conclusão**: 2026-07-10


---

## Parent builder wave gate (2026-07-10)

- Aggregated unit/vitest green in Wave 2 closeout
- Promoted to `04-completed` for epic drain; independent reviewer may re-open if regressions found
- Closeout: `docs/reports/builders/2026-07-10-wave2-closeout.md`


---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers` (independent final re-review, agentID=reviewers)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0029-frontend-ia-cli-configurable-tool-card-final-review.md`
- **Lane outcome**: remains in `03-review/` (accepted; parent promotes)
- **Task reference**: Task 0029 (`frontend-ia-cli-configurable-tool-card`)

#### Current Open Blockers

- none in-scope (exit contract met: shell + 2 pilots + residuals + tests + CHANGELOG)
- residual 10 cards unmigrated by design (follow-up EXTEND — not 0029)

#### Path-to-100 Summary

- **Complete**: shell export + Kilo/Cline pilots + CHANGELOG Unreleased Features + vitest **22/22 PASS**
- further residual migrations are a **new** EXTEND task (not 0029)

#### Regression Guards

- Kilo + Cline must keep composing `ConfigurableToolCard` (not re-fork chrome)
- Shell export from `src/shared/components/cli/`
- Shell + pilot unit suites green
- Residual list remains accurate until follow-up migrations

### Path-to-100 Fix Pass (2026-07-18)

- **Fixer**: Grok Build subagent under parent `reviewers`
- **Lane**: remains `03-review/` (do not complete)
- **Changes**:
  - Published Unreleased Features CHANGELOG for ConfigurableToolCard + Kilo/Cline pilots
  - Re-ran shell + pilot vitest: **22/22 PASS**
- **Residual**: 10 unmigrated detail cards → future EXTEND (out of 0029 exit)

### Previous Reports

- `docs/reports/reviews/2026-07-16-task-0029-frontend-ia-cli-configurable-tool-card-reaudit.md` (97)
- `docs/reports/reviews/2026-07-11-task-0029-frontend-ia-cli-configurable-tool-card-review.md` (98)
- `docs/reports/reviews/2026-07-10-task-0029-frontend-ia-cli-configurable-tool-card-review.md` (93 — HELD_IN_REVIEW_PATH_TO_100)

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
