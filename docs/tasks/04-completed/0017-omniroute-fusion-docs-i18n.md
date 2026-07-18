# Task 0017: Fusion Docs, i18n Keys, and Operator Notes

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
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

### Wave 1 (2026-07-09)
- **Arquivos criados/modificados**:
  - `docs/architecture/FUSION.md` (created)
  - `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` (archived from `docs/architecture/`)
  - `src/i18n/messages/en.json` — fusion editor keys baseline
  - `docs/architecture/meta.json` — registered `FUSION` page
  - `CHANGELOG.md` — Epic 0003 / Task 0017 feature-level entry
- **Agente executor**: builder (omniroute/builder)

### Wave 2 path-to-100 residuals (2026-07-18) — closes F3/F4/F5/F6/F7

- **Arquivos modificados**:
  - `AGENTS.md` — live counts `routing strategies 18`; Strategies bullet lists all 18 incl. `headroom`, `fusion`, `conditional-fusion`
  - `docs/architecture/FUSION.md` — acting in overview; ASCII diagram HIT/MISS + `dispatchActingOnly` / `finalizeWithActing`; single-panel+acting + judge non-stream when acting; operator Acting step; troubleshooting acting-only; D9 panelBody ownership wording (F7); i18n notes `combos.fusionActing*`; **`comboChatBase` nesting section** + F3 re-dispatch semantics
  - `src/app/(dashboard)/dashboard/fusions/FusionUnitRow.tsx` — wire unit-row keys + **a11y move/remove, clear, placeholder, combo-ref title/depth label**
  - `src/i18n/messages/en.json` — `sidebar.fusionsSubtitle`, `combos.fusionDesc` + `fusionModelPlaceholder` / `fusionClearUnit` / `fusionComboRefTitle` / `fusionFusionDepthGuarded`
  - `CHANGELOG.md` — Fixed entry for Task 0017 residual close + expert polish
- **Verification** (gt-ts-expert 2026-07-18):
  - `ROUTING_STRATEGY_VALUES.length === 18` (+ fusion, conditional-fusion, headroom)
  - `rg` residual guards: AGENTS no longer `17` / Strategies(15); FUSION no “Built by resolveFusionUnits” under D9
  - FusionUnitRow: no remaining hardcoded English string attrs
  - fusion suite **60/60** + `en.json` JSON.parse OK
  - `npm run typecheck:core` exit 0
- **Agente executor**: builders / gt-ts-engineer → **gt-ts-expert** polish
- **Data**: 2026-07-18
- **Lane**: promoted to `docs/tasks/03-review/` after formal **100/100** re-review

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent full re-reviewer (parent `reviewers`) — prior builders claim re-verified
- **Data da review**: 2026-07-10 · 2026-07-11 · 2026-07-18 (builders accept) · **2026-07-18 (return re-review)**
- **Veredito**: **`ACCEPTED_100`**
- **Score (path to 100)**: **`100/100`** (prior 89 → residual close → builders 100 → independent return confirms 100)
- **Notas**: Live `ROUTING_STRATEGY_VALUES.length === 18`; AGENTS/CLAUDE/ARCHITECTURE/AUTO-COMBO/FUSION all 18; acting + comboChatBase + D9 columns accurate; FusionUnitRow i18n wire complete. Report: `2026-07-18-task-0017-omniroute-fusion-docs-i18n-return-review.md`. Remain `03-review/`.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review (accepted)

- **Date**: 2026-07-18
- **Reviewer**: independent full re-reviewer (parent agentID=`reviewers`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0017-omniroute-fusion-docs-i18n-return-review.md`
- **Lane**: remain `docs/tasks/03-review/` (not moved to `04-completed/`)

#### Current Open Blockers

- _(none)_

#### Non-blocking follow-ups

- Other locales still need translation of new fusion keys (task scope = en.json baseline only)
- Fusions list `page.tsx` hardcodes (Task 0015 shell residual) not required for 0017
- Out-of-scope strategy-count drift in secondary docs (`OPEN_SSE_ARCHITECTURE`, diagrams)

#### Resolved Since Prior Review (do not regress)

- `RESOLVED` **F1**: AUTO-COMBO D9 tools kept + `tool_choice:"none"`; create uses `models` not `targets`; acting + conditional miss documented
- `RESOLVED` (as High) **F2**: Acting unit + A6 miss path present in FUSION.md data contract
- `RESOLVED` **F3 primary surfaces**: AUTO-COMBO 18 + `conditional-fusion` table row; ARCHITECTURE 18 + fusion family named
- `RESOLVED` **F3 residual (AGENTS)**: live counts + Strategies (18) list includes headroom/fusion/conditional-fusion
- `RESOLVED` **F6 residual**: overview/diagram/operator/troubleshooting/i18n acting; single-panel+acting; judge non-stream when acting
- `RESOLVED` **F4**: FusionUnitRow uses unit-row i18n keys (**full a11y/placeholder/title wire**)
- `RESOLVED` **F5**: fusionsSubtitle + fusionDesc mention optional acting
- `RESOLVED` **F7**: D9 no longer misattributes panelBody to resolveFusionUnits
- `RESOLVED` **F6 core runtime**: dispatch gate acting-only→fallback; V2 stages + `finalizeWithActing`; units table includes acting
- `RESOLVED` (expert) **comboChatBase docs**: FUSION.md nesting section matches live `FusionComboChatBase`
- `RESOLVED` (2026-07-18 re-review polish) D9 ownership table acting columns; units judge D1 order; judge-empty→panel-concat handoff

#### Regression Guards

- AUTO-COMBO must not claim panel tools are stripped
- Create examples use `models`, not `targets`
- Any “N strategies” claim must equal live length **18** and list both `fusion` and `conditional-fusion`
- FUSION.md runtime + **operator** must stay consistent with `combo.ts` A6 + `finalizeWithActing`
- FUSION.md nesting must document `comboChatBase` five-field inheritance
- D9 ownership table must distinguish panel / judge-no-acting / judge+acting / acting voice
- No fabricated paths (e.g. `open-sse/services/fusionUnits.ts`)

### Previous Reports

- `2026-07-18` — `100/100` — `docs/reports/reviews/2026-07-18-task-0017-omniroute-fusion-docs-i18n-return-review.md` (independent return)
- `2026-07-18` — `100/100` — `docs/reports/reviews/2026-07-18-task-0017-omniroute-fusion-docs-i18n-review.md` (builders; confirmed)
- `2026-07-11` — `89/100` — `docs/reports/reviews/2026-07-11-task-0017-omniroute-fusion-docs-i18n-rereview.md`
  - **Carried forward then fixed 2026-07-18**: F3 AGENTS; F6 operator/diagram; F4/F5/F7 polish
- `2026-07-10` — `88/100` — `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-rereview.md`
- `2026-07-10` — `86/100` — `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-review.md`

---

## Path-to-100 fix wave (2026-07-18)

**Executor**: builders / gt-ts-engineer → gt-ts-expert → documentation-accuracy re-review polish → independent return re-review (parent `reviewers`)

### Task 0017 fixes (post 2026-07-11 re-review)
- **F1**: ✅ still fixed (no tools-stripped / models not targets)
- **F2**: ✅ still fixed (acting contract + A6)
- **F3**: ✅ AGENTS.md → 18 + full strategy list
- **F6**: ✅ overview/diagram/operator/troubleshooting/i18n acting + single-panel/judge nuances
- **F4**: ✅ FusionUnitRow i18n wire (incl. a11y/clear/placeholder/title)
- **F5**: ✅ fusionsSubtitle + fusionDesc
- **F7**: ✅ D9 panelBody ownership wording
- **Expert**: ✅ FUSION.md `comboChatBase` section + i18n notes keys
- **Re-review polish**: ✅ D9 multi-column ownership; judge D1 source order; judge-fail handoff docs
- **Return re-review (2026-07-18)**: ✅ independent confirm 100; remain `03-review/`

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
