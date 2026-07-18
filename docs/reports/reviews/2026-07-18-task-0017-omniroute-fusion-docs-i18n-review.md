# Review Report: Task 0017 — OmniRoute Fusion Docs + i18n — 2026-07-18 (re-review)

## Review Lineage

- **Current task**: Task 0017 (`omniroute-fusion-docs-i18n`); was
  `docs/tasks/02-doing/0017-omniroute-fusion-docs-i18n.md` (promoted to `03-review/` this review)
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0017-omniroute-fusion-docs-i18n-rereview.md` —
    **89/100** `REJECTED_TO_DOING` (F3 AGENTS residual; F6 operator/diagram acting residual;
    F4/F5/F7 Low)
  - `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-rereview.md` —
    **88/100**
  - `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-review.md` —
    **86/100** initial
- **Related**: sibling fusion tasks 0010–0016, 0018 (context only; not re-scored)
- **Review mode**: `re-review` (path-to-100 verification after 2026-07-18 residual fix +
  gt-ts-expert polish + this reviewer micro-fix pass)
- **Reviewer profile**: `reviewers` (`gt-documentation-accuracy-reviewer`)
- **Parent agentID**: `builders` (formal parallel-review wave)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept-completed` → move to `docs/tasks/03-review/`
- **Delta vs previous (89)**: **+11** — all open blockers F3–F7 closed on live FS; residual
  D9 / judge-source / judge-fail-handoff doc precision fixed in this review wave

## Delta Summary

### Resolved Since Previous Review (2026-07-11)

- `RESOLVED` **F3 residual**: `AGENTS.md` live counts `routing strategies 18`; Strategies
  bullet lists all 18 including `headroom`, `fusion`, `conditional-fusion` (matches
  `ROUTING_STRATEGY_VALUES.length === 18`)
- `RESOLVED` **F6 residual**: FUSION.md overview, ASCII diagram (HIT/MISS + acting),
  single-panel+acting, judge non-stream when acting, operator Acting step, troubleshooting
  acting-only, i18n notes `combos.fusionActing*`, `comboChatBase` nesting section
- `RESOLVED` **F4**: `FusionUnitRow.tsx` wires unit-row / a11y / clear / placeholder /
  combo-ref title / depth-guarded keys via `tx(t, …)`
- `RESOLVED` **F5**: `sidebar.fusionsSubtitle` and `combos.fusionDesc` mention optional acting
- `RESOLVED` **F7**: D9 no longer misattributes `panelBody` to `resolveFusionUnits`
- `RESOLVED` **this-wave polish (doc accuracy)**:
  - Units table judge source order aligned with D1 (`judge` → `judgeModel` → first panel)
  - Panel-body ownership table expanded for acting vs no-acting judge / final voice
  - Stage 7 + troubleshooting document judge-empty → panel-concat → acting handoff

### Persistent Findings

- none for Task 0017 acceptance scope

### Regressions

- none observed
- F1 tools-kept / `models` not `targets` still correct in AUTO-COMBO + FUSION
- No reintroduction of fabricated `open-sse/services/fusionUnits.ts` in `FUSION.md`
  (only appears as a regression-guard example in task/review text — expected)

### New Findings

- none blocking
- **Out of scope / non-blocking**: other locales still ship English stubs for new fusion
  keys; `page.tsx` list shell retains some hardcoded English (Task 0015 surface; en.json
  baseline + editor wire were Task 0017 scope)
- **Out of scope**: secondary strategy-count drift in non-primary docs (e.g.
  `OPEN_SSE_ARCHITECTURE`, diagrams) — not scored as 0017 blockers

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | High | Closed | AUTO-COMBO tools strip / targets | tools kept + `models` create field |
| F2 | RESOLVED | High | Closed | Acting data contract | FUSION.md units + A6 + AUTO-COMBO |
| F3 | RESOLVED | Low-Medium | Closed | AGENTS 17/15 → 18 full list | `AGENTS.md:26,422-425` vs live 18 |
| F4 | RESOLVED | Low | Closed | FusionUnitRow hardcodes | all labels via i18n keys + fallbacks |
| F5 | RESOLVED | Low | Closed | Subtitle/desc omit acting | en.json acting wording present |
| F6 | RESOLVED | Low-Medium | Closed | Operator/runtime acting incomplete | overview/diagram/stages/operator/troubleshooting/`comboChatBase` |
| F7 | RESOLVED | Low | Closed | D9 resolveFusionUnits misplace | FUSION.md D9 ownership wording |
| N1 | RESOLVED (this wave) | Low | Closed | D9 table omitted acting judge non-stream | multi-column ownership table |
| N2 | RESOLVED (this wave) | Low | Closed | Units table judge source order | D1 order in units table |
| N3 | RESOLVED (this wave) | Low | Closed | Judge-fail acting handoff undocumented | stage 7 + troubleshooting row |

## Contract Compliance (Task MUST / Exit)

| Requirement | Status | Live proof |
| --- | --- | --- |
| `docs/architecture/FUSION.md` ≥100 lines accurate architecture | ✅ | **473** lines; data contract, runtime, triggers, nesting, D9, UI, decisions, operator, troubleshooting |
| Data contract matches Zod / runtime | ✅ | panels/`models`, judge, acting, triggers, fallbackStrategy D8, fusionTuning, defaults |
| Runtime flow combo → resolve → V2 → panel → judge → acting | ✅ | Matches `combo.ts` gate + `fusion.ts` V2 stages |
| Trigger modes always / tool-call / text-match | ✅ | `fusionTriggers.ts` + schema enum |
| Nesting MAX_COMBO_DEPTH 3 / hard cap 10 | ✅ | `comboPredicates.ts` |
| Panel body ownership D9 | ✅ | tools kept + `tool_choice:"none"`; acting columns accurate |
| `comboChatBase` five-field inheritance | ✅ | Matches `FusionComboChatBase` Pick + `combo.ts` spread |
| Archive old doc | ✅ | `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` present; not under `docs/architecture/` |
| Editor i18n keys in `en.json` | ✅ | full fusion editor + unit-row + acting + trigger keys |
| FusionUnitRow uses i18n | ✅ | no remaining hardcoded English string attrs as sole labels |
| No fabricated names in FUSION.md | ✅ | all primary symbols/path full refs exist; fabricated-docs does not flag FUSION.md content claims |
| CHANGELOG epic entry | ✅ | Features + Fixed residuals under `[Unreleased]` |
| meta.json registers FUSION | ✅ | `"FUSION"` in pages list |
| Related routing docs match live fusion | ✅ | AUTO-COMBO 18 + conditional-fusion + acting; ARCHITECTURE 18; AGENTS 18; CLAUDE 18 |

## Production / Source Wiring Proof

| Claim | Live |
| --- | --- |
| `ROUTING_STRATEGY_VALUES` length | **18** — includes `fusion`, `conditional-fusion`, `headroom` |
| Panel body D9 | `fusion.ts` — keep tools, `stream:false`, `tool_choice:"none"` once before fan-out |
| `resolveFusionUnits` → `{ panels, judge, acting }` | `fusion.ts` export |
| `finalizeWithActing` | single-panel+acting, 1-survivor, judge-for-acting paths |
| Trigger miss A6 | `combo.ts` `dispatchActingOnly` before fallback; local strategy override only |
| Create schema field | `models` + top-level `judge` / `acting` — not `targets` |
| `FUSION_DEFAULTS` | minPanel 2, stragglerGraceMs 8000, panelHardTimeoutMs 90000 |
| `buildSavePayload` | always → `fusion`; tool-call/text-match → `conditional-fusion` |

## Evidence Reviewed

- Task: `docs/tasks/02-doing/0017-omniroute-fusion-docs-i18n.md` (ledger + Wave 2 claims)
- Prior reports: 86 / 88 / 89 lineage above
- Docs: `docs/architecture/FUSION.md`, `docs/routing/AUTO-COMBO.md`,
  `docs/architecture/ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`,
  `docs/architecture/meta.json`
- Source: `open-sse/services/fusion.ts`, `open-sse/services/combo.ts` (dispatch gate),
  `open-sse/services/fusionTriggers.ts`, `src/shared/constants/routingStrategies.ts`,
  `src/shared/validation/schemas/combo.ts`, `open-sse/services/combo/comboPredicates.ts`,
  `src/app/(dashboard)/dashboard/fusions/FusionUnitRow.tsx`,
  `fusionEditorTypes.ts` (`buildSavePayload`), `src/i18n/messages/en.json`
- Archive: `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md`

## Commands Run

```bash
node -e "import { ROUTING_STRATEGY_VALUES } from './src/shared/constants/routingStrategies.ts';
  console.log(ROUTING_STRATEGY_VALUES.length, ROUTING_STRATEGY_VALUES.join(','))"
# → 18 including fusion, conditional-fusion, headroom

# Symbol existence for every FUSION.md primary helper → all OK
# Residual greps: AGENTS no 17/Strategies(15); F7 resolveFusionUnits misplace gone
# en.json JSON.parse OK; acting in fusionDesc + fusionsSubtitle
# FusionUnitRow i18n wire keys present
# archive present; FUSION.md 473 lines
npm run check:fabricated-docs
# FUSION.md not listed among fabricated content failures
# (pre-existing drifts elsewhere + regression-guard mentions of fusionUnits.ts in reports/task)
```

## Path To 100

_None remaining._ Acceptance score **100**.

### Optional follow-ups (not blockers)

1. Translate new fusion keys beyond `en.json` (task explicitly scoped en baseline only).
2. Wire remaining Fusions **list** `page.tsx` hardcodes to i18n (Task 0015 residual / separate).
3. Align secondary docs/diagrams strategy counts to 18 when those surfaces are next touched.

## Regression Guards (carry forward)

- AUTO-COMBO must **not** claim panel tools are stripped
- Create/curl examples use `models`, not `targets`
- Any “N strategies” claim must equal `ROUTING_STRATEGY_VALUES.length` (**18**) and list
  both `fusion` and `conditional-fusion`
- FUSION.md runtime + **operator** must stay consistent with `combo.ts` A6 +
  `finalizeWithActing` + judge non-stream when acting
- FUSION.md nesting must document `comboChatBase` five-field inheritance
- D9 ownership table must distinguish panel / judge-no-acting / judge+acting / acting voice
- No reintroduction of fabricated paths (e.g. `open-sse/services/fusionUnits.ts`) in FUSION.md

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-18
- Reviewer: gt-documentation-accuracy-reviewer (parent builders)
- Score: 100/100
- Verdict: ACCEPTED_100
- Full report: docs/reports/reviews/2026-07-18-task-0017-omniroute-fusion-docs-i18n-review.md
- Open blockers: _(none)_
- Lane: docs/tasks/03-review/
```

## Documentation Accuracy Comparison (summary)

**Summary**: FUSION.md, en.json fusion keys, AGENTS strategy inventory, CHANGELOG, and archive
protocol match live fusion runtime/schema/UI. Prior 89 blockers closed; three residual
accuracy nits in FUSION.md were corrected during this review.

**Issues** (closed this wave):
- `FUSION.md` units table — Current: judge source ordered `judgeModel` first — Fix: D1 order
  `judge` → `judgeModel` → first panel
- `FUSION.md` D9 table — Current: judge path always “original client value” — Fix: split
  columns for no-acting judge vs acting-set judge vs acting final voice
- `FUSION.md` stages/troubleshooting — Current: silent on judge-empty handoff — Fix:
  document panel-concat review for acting

**Priorities**: all residual were **minor**; no critical doc falsehoods remained after the
2026-07-18 builder wave.
