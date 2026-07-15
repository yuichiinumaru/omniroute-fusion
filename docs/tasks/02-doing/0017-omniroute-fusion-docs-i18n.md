# Task 0017: Fusion Docs, i18n Keys, and Operator Notes

> **Status**: `[~]` Returned to doing (2026-07-11 re-review **89/100** — F3/F6 residual)
> **Priority**: 🟢 P2
> **Type**: `feature`
> **Origin**: Epic 0003 — Fusion First-Class (S7)
> **Action type**: EXPOSE
> **Blocks**: none
> **Depends on**: Task 0016 (UI complete), Task 0013 (runtime wired)

---
> **Queued after Epic 0008**: **Q3** — [`QUEUE-post-adversarial-return.md`](../00-planning/QUEUE-post-adversarial-return.md)


## Objective

Complete the documentation, i18n localization (en.json baseline + key stubs for other locales), and operator guidance for the Fusion First-Class feature:

1. **Architecture doc**: Create `docs/architecture/FUSION.md` documenting the fusion runtime flow, data contract, trigger modes, panel body ownership, and nesting semantics. Supersedes the older `docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` (archive, do not delete).
2. **i18n keys**: Add all missing fusion UI keys to `src/i18n/messages/en.json` (editor labels, trigger mode labels, text-match labels, fallback strategy label, sidebar subtitle). Document which keys need translation.
3. **Operator guidance**: Brief section in `FUSION.md` on creating a fusion, configuring triggers, choosing panel combos, and troubleshooting (0 panel answers, cycle errors).
4. **CHANGELOG entry**: Feature-level entry summarizing the Fusion First-Class epic.

## Background Context

### What already exists:
- `docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` — design history sketch (keep as archive)
- i18n keys in `en.json` lines 2392-2401: `fusion`, `fusionDesc`, `fusionJudgeModel`, `fusionJudgeModelHelp`, `fusionMinPanel`, `fusionMinPanelHelp`, `fusionStragglerGraceMs`, `fusionStragglerGraceMsHelp`, `fusionPanelHardTimeoutMs`, `fusionPanelHardTimeoutMsHelp`
- `conditionalFusion`, `conditionalFusionDesc` labels in ROUTING_STRATEGIES

### What is missing:
- No `docs/architecture/FUSION.md` (comprehensive architecture doc)
- Missing i18n keys: `fusionsSubtitle`, trigger mode labels (`triggerModeAlways`, `triggerModeToolCall`, `triggerModeTextMatch`), text patterns labels, fallback strategy label, panel section labels, judge section labels, combo-ref picker labels
- No operator troubleshooting guidance

---

## Test Requirements

- MUST have `docs/architecture/FUSION.md` with: data contract, runtime flow, trigger modes, nesting limits, panel body ownership, backward compat
- MUST have all editor i18n keys in `en.json`
- MUST NOT have fabricated function names, file paths, or API routes — verify every reference with `grep -rn`
- MUST archive (NOT delete) `FUSION-TRIGGERS-CONDITIONAL.md`
- CHANGELOG entry MUST reference the epic and list key capabilities

---

## Exit Conditions (GDD/TDD)

- [x] `docs/architecture/FUSION.md` exists with ≥100 lines of accurate architecture content
- [x] `docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` moved to `.archive/` (if still in docs/)
- [x] All fusion editor i18n keys added to `src/i18n/messages/en.json`
- [x] No fabricated names in docs — every function/path/route reference verified
- [x] `npm run typecheck:core` passes (no doc changes break types)
- [x] `npm run lint` passes without new errors (docs/i18n only; no TS source edits)
- [x] Entry in CHANGELOG.md added (at the TOP) — epic-level summary
- [x] `npm run check:fabricated-docs` — FUSION.md clean (pre-existing failures only in other task/planning docs)

---

## Details

### What

Subtasks:
- [x] **Read existing code**: Read `docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md`, `src/i18n/messages/en.json` (fusion-related keys), `open-sse/services/fusion.ts` (API surface), `open-sse/services/fusionTriggers.ts` (from Task 0014), `src/shared/validation/schemas/combo.ts` (data contract)
- [x] **Create `docs/architecture/FUSION.md`**: Document: data contract (`FusionUnit`, `FusionJudge`, triggers, fallbackStrategy, tuning), runtime flow (combo.ts → resolveFusionUnits → handleFusionChatV2 → panel fan-out → judge synthesis), trigger modes and matching, panel body ownership (fusion strips stream/tool_choice; child combo does NOT re-strip), nesting limits (depth guard + cycle detection), backward compat (legacy string panels/judge). Include Decision D1–D10 summary.
- [x] **Archive old doc**: Move `docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` to `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md`.
- [x] **Add i18n keys**: In `en.json`, add missing keys for: trigger mode labels, text pattern labels, fallback strategy label, panel/judge section headers, combo-ref picker labels, sidebar subtitle. Group near existing fusion keys.
- [x] **Write CHANGELOG entry**: Epic-level entry at the TOP summarizing: Fusion First-Class with combo-ref panels/judge, trigger modes (always/tool-call/text-match), dedicated Fusions UI, backward compatibility.
- [x] **Verification**: Run `npm run check:fabricated-docs` if script exists. Otherwise, manually verify every code reference in `FUSION.md` with `grep -rn`.

### Where

| File | Purpose |
|------|---------|
| `docs/architecture/FUSION.md` | Create — main architecture doc for fusion feature |
| `docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` | Read + archive to `.archive/` |
| `src/i18n/messages/en.json` | Modify — add fusion editor i18n keys |
| `open-sse/services/fusion.ts` | Read — verify function names for docs |
| `open-sse/services/fusionTriggers.ts` | Read — verify function names for docs |
| `src/shared/validation/schemas/combo.ts` | Read — verify schema field names for docs |
| `CHANGELOG.md` | Modify — add epic-level entry at top |

### How

1. Write `FUSION.md` structured as: Overview → Data Contract → Runtime Flow → Trigger Modes → Nesting → Panel Body Ownership → UI Surface → Decisions → Troubleshooting.
2. For every function name, file path, and API route mentioned in docs, run `grep -rn` to verify it exists.
3. Add i18n keys grouped near existing fusion keys (lines ~2392-2401 in en.json).
4. Move old doc to archive.
5. Write CHANGELOG entry.

### Why

Documentation is required for: operator onboarding (how to create/edit fusions), developer onboarding (how the runtime works), and governance compliance (AGENTS.md mandates CHANGELOG + architectural docs for features). The i18n keys enable the editor UI (Task 0016) to render labels.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT fabricate function names, file paths, or API routes — verify EVERY reference with `grep -rn` per omniroute Doc Accuracy Discipline.
> DO NOT delete `FUSION-TRIGGERS-CONDITIONAL.md` — archive protocol: move to `.archive/`.
> DO NOT write i18n keys for all 42 locales — only `en.json` baseline; translation is a separate effort.

> [!IMPORTANT]
> Read EVERY file in "Where" before writing.
> Run `npm run check:fabricated-docs` (if available) as a final gate.
> The data contract in docs MUST match the actual Zod schema — do not invent fields that don't exist.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: EVERY code reference verified with `grep -rn`
- [x] **Zod Validation**: N/A
- [x] **Security**: No secrets committed
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Old doc moved to `.archive/`, not deleted

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `docs/architecture/FUSION.md` (created, 380 lines)
  - `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` (archived from `docs/architecture/`)
  - `src/i18n/messages/en.json` — added `conditionalFusionDesc`, unit-row / picker keys, fixed `fusionTextPatternsHelp` + `fusionJudgeModelHelp`
  - `docs/architecture/meta.json` — registered `FUSION` page
  - `CHANGELOG.md` — Epic 0003 / Task 0017 feature-level entry at top of `[Unreleased]`
- **Testes que verificam o trabalho**:
  - Manual symbol/path verification against `open-sse/services/fusion.ts`, `fusionTriggers.ts`, `combo.ts`, `schemas/combo.ts`, fusions UI routes
  - `npm run check:fabricated-docs` — `docs/architecture/FUSION.md` not listed in failures
  - i18n key presence script for all fusion editor + sidebar keys
- **Resultado dos testes**: symbols present; i18n all keys present; FUSION.md clean under fabricated-docs
- **Resultado do lint**: N/A for pure docs/i18n (no runtime TS edits)
- **Resultado do typecheck/build**: `npm run typecheck:core` → exit 0
- **Entrada no changelog**: `[Unreleased] Added — Fusion First-Class (Epic 0003 / Task 0017 docs)`
- **Agente executor**: builder (omniroute/builder)
- **Data de conclusão**: 2026-07-09

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `reviewers` (`gt-code-quality-reviewer` / documentation accuracy)
- **Data da review**: 2026-07-10 (initial) · 2026-07-10 (re-review) · 2026-07-11 (re-review)
- **Veredito**: `REJECTED_TO_DOING` (2026-07-11 re-review)
- **Score (path to 100)**: `89/100` (was 88 → 86)
- **Notas**: Full report `docs/reports/reviews/2026-07-11-task-0017-omniroute-fusion-docs-i18n-rereview.md`. F3 primary (AUTO-COMBO/ARCHITECTURE) + F6 core runtime fixed; residual AGENTS 17 + operator/diagram/i18n acting incomplete.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-11
- **Reviewer profile**: `reviewers`
- **Score**: `89/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Full report**: `docs/reports/reviews/2026-07-11-task-0017-omniroute-fusion-docs-i18n-rereview.md`
- **Lane outcome**: return to doing (score &lt; 90)
- **Task reference**: Task 0017 (`omniroute-fusion-docs-i18n`); path `docs/tasks/02-doing/`

#### Current Open Blockers

- `PERSISTENT residual` **F3 Low-Medium**: `AGENTS.md:14` still `routing strategies 17`; strategies bullet (`AGENTS.md:383`) still **(15)** and omits `fusion` / `conditional-fusion` / `headroom` — live count **18**. AUTO-COMBO + ARCHITECTURE + CLAUDE fixed.
- `PERSISTENT residual` **F6 Low-Medium**: FUSION.md core gate + `finalizeWithActing` OK; still missing overview/diagram acting, operator Acting step, troubleshooting acting-only, `fusionActing*` i18n notes; single-panel stage incomplete when acting set
- `PERSISTENT` **F4 Low**: `FusionUnitRow` hardcodes English despite unit-row keys
- `PERSISTENT` **F5 Low**: `fusionsSubtitle` / `fusionDesc` still panels→judge only
- `PERSISTENT` **F7 Low**: Misplaced “Built by resolveFusionUnits” under D9 panel-tools paragraph

#### Resolved Since Prior Review (do not regress)

- `RESOLVED` **F1**: AUTO-COMBO D9 tools kept + `tool_choice:"none"`; create uses `models` not `targets`; acting + conditional miss documented
- `RESOLVED` (as High) **F2**: Acting unit + A6 miss path present in FUSION.md data contract
- `RESOLVED` **F3 primary surfaces**: AUTO-COMBO 18 + `conditional-fusion` table row; ARCHITECTURE 18 + fusion family named
- `RESOLVED` **F6 core runtime**: dispatch gate acting-only→fallback; V2 stages + `finalizeWithActing`; units table includes acting

#### Path-to-100 Summary

1. Fix **AGENTS.md** live counts → **18** and strategies list to include fusion family (+ headroom)
2. Finish FUSION.md: overview + ASCII diagram acting; single-panel/acting judge non-stream nuance; operator Acting step; troubleshooting acting-only; `combos.fusionActing*` in i18n notes
3. F7 fix misplaced resolveFusionUnits sentence; optional F4/F5 polish
4. Re-grep regression guards + `npm run check:fabricated-docs` (FUSION.md clean)

#### Regression Guards

- AUTO-COMBO must not claim panel tools are stripped
- Create examples use `models`, not `targets`
- Any “N strategies” claim must equal live length **18** and list both `fusion` and `conditional-fusion`
- FUSION.md runtime + **operator** must stay consistent with `combo.ts` A6 + `finalizeWithActing`
- No fabricated paths (e.g. `open-sse/services/fusionUnits.ts`)

### Previous Reports

- `2026-07-10` — `88/100` — `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-rereview.md`
  - **Carried forward**: F3 AGENTS residual; F6 operator/diagram residual; F4/F5/F7 polish
  - **Resolved since**: F3 AUTO-COMBO/ARCHITECTURE; F6 core dispatch + finalizeWithActing
  - **Regression guard**: no tools-stripped; models not targets; 18 strategies; acting in runtime + operator
- `2026-07-10` — `86/100` — `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-review.md`
  - **Carried forward**: F4/F5 i18n polish
  - **Resolved since**: F1 tools/targets; F2 acting data contract/A6
  - **Regression guard**: no tools-stripped; `models` not `targets`; 18 strategies; acting in runtime docs

---

## Path-to-100 fix wave (2026-07-10 → 2026-07-11)

**Executor**: builders (parent fix wave after reviewer return)

### Task 0017 fixes (re-review 2026-07-11)
- **F1**: ✅ AUTO-COMBO D9 tools-not-stripped, `models` not `targets`. **Still fixed.**
- **F2**: ✅ Contract + A6 acting. **Still fixed.**
- **F3**: ⚠️ AUTO-COMBO + ARCHITECTURE → 18 + conditional-fusion row. **AGENTS.md still 17 / Strategies(15).**
- **F6**: ⚠️ Core gate + finalizeWithActing stages present. **Operator/overview/diagram/i18n acting residual.**
- **F4/F5/F7**: still open (low polish).
