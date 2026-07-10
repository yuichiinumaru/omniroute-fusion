# Review Report: Task 0017 — OmniRoute Fusion Docs + i18n — 2026-07-10

## Review Lineage

- **Current task**: Task 0017 (`omniroute-fusion-docs-i18n`); live path at review start
  `docs/tasks/03-review/0017-omniroute-fusion-docs-i18n.md`
- **Previous reports read**: none found (`docs/reports/**/*0017*` empty)
- **Related reports considered**:
  - none under `docs/reports/reviews/` for sibling fusion tasks (0010–0016, 0018) at review time
  - Live architecture: `docs/architecture/FUSION.md`, archived
    `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md`
  - Related routing guide: `docs/routing/AUTO-COMBO.md` (fusion section)
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (lane: `gt-documentation-accuracy-reviewer` + light i18n)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `86/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Lane recommendation**: `return-to-doing` (score &lt; 90)

## Delta Summary

### Resolved Since Previous Review
- `RESOLVED`: N/A — first independent review for this task ID.

### Persistent Findings
- none

### Regressions
- none

### New Findings
- `NEW` (High): `docs/routing/AUTO-COMBO.md` fusion section contradicts live code and the new
  `FUSION.md` (claims panel tools are **stripped**; create example uses non-schema field
  `targets`; strategy table/count omit `conditional-fusion` / claim 17 strategies).
- `NEW` (High): Canonical `docs/architecture/FUSION.md` omits live **acting unit**
  (`combo.acting` / Epic 0004) present in schema, `resolveFusionUnits`, `handleFusionChatV2`,
  `combo.ts` trigger-miss path, and Fusion UI — so data contract + runtime flow + operator
  guide are incomplete vs LIVE APIs.
- `NEW` (Medium): Strategy count drift (17 vs live **18** `ROUTING_STRATEGY_VALUES`) in
  `AUTO-COMBO.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `AGENTS.md`.
- `NEW` (Low): Fusion editor unit-row UI hardcodes English strings despite matching
  `en.json` keys (`fusionUnitModel`, `fusionPickModel`, `fusionSelectComboRef`, …).
- `NEW` (Low): `sidebar.fusionsSubtitle` / `combos.fusionDesc` still describe panels→judge only
  (no acting / conditional nuance).

### Evidence Gaps / External Blockers
- `EVIDENCE_GAP` (Low): Did not re-run full `npm run typecheck:core` / `lint` in this review
  (docs/i18n-only task; no TS production edits claimed). `check:fabricated-docs --strict`
  re-run; **FUSION.md not listed** among failures.
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | High | Open | AUTO-COMBO fusion section fabricates tools strip + wrong create body field | this report | `docs/routing/AUTO-COMBO.md:186-231` vs `open-sse/services/fusion.ts:671-673` (tools kept + `tool_choice:"none"`) and `createComboSchema.models` (not `targets`) |
| F2 | NEW | High | Open | FUSION.md omits live `acting` unit / A6 trigger-miss path | this report | Schema `acting` in `combo.ts:268-270,326-327`; runtime `resolveFusionUnits` returns `acting`; `combo.ts:915-976` `dispatchActingOnly`; UI `fusionActing*` |
| F3 | NEW | Medium | Open | Strategy count/table drift (17 vs 18; missing `conditional-fusion`) | this report | `ROUTING_STRATEGY_VALUES` length 18 includes `fusion` + `conditional-fusion`; AUTO-COMBO L153/584/618; ARCHITECTURE L369; CLAUDE L75 |
| F4 | NEW | Low | Open | Unit-row i18n keys unused (hardcoded English) | this report | Keys in `en.json`; `FusionUnitRow.tsx` literals "Model", "Combo ref", "Pick model", "Select a combo to reference", "Not set" |
| F5 | NEW | Low | Open | Sidebar/strategy copy still panels→judge only | this report | `sidebar.fusionsSubtitle` = "Panel + judge model combos"; `fusionDesc` omits acting |

## Contract Compliance (Task MUST / Exit)

| Requirement | Status | Live proof |
| --- | --- | --- |
| `docs/architecture/FUSION.md` ≥100 lines accurate architecture | ⚠️ Partial | 382 lines; symbols/paths verified; **acting gap** (F2) |
| Data contract matches Zod | ⚠️ Partial | triggers / fusionTuning / judge / fallback D8 match; **`acting` missing from doc** |
| Runtime flow combo → resolve → V2 → panel → judge | ⚠️ Partial | Correct for legacy no-acting; incomplete with acting / A6 |
| Trigger modes always / tool-call / text-match | ✅ | Matches `fusionTriggers.ts` + defaults |
| Nesting limits MAX_COMBO_DEPTH 3 / hard cap 10 | ✅ | `comboPredicates.ts` |
| Panel body ownership D9 (keep tools, `tool_choice:"none"`) | ✅ | `FUSION.md` correct; **AUTO-COMBO wrong** (F1) |
| Archive old doc (not delete) | ✅ | `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md`; not under `docs/architecture/` |
| Editor i18n keys in `en.json` | ✅ (wired keys) | 49 fusion-related keys; all FusionEditorClient `tx(t,"…")` keys resolve; unit-row keys present but unwired (F4) |
| No fabricated names in FUSION.md | ✅ | All listed functions/paths grep-ok; `check:fabricated-docs` does not flag FUSION.md |
| CHANGELOG epic entry | ✅ | `[Unreleased]` Fusion First-Class Task 0017 entry present |
| meta.json registers FUSION | ✅ | `pages` includes `FUSION` |
| Related routing docs match live fusion | ❌ | AUTO-COMBO F1/F3 |

## Production / Source Wiring Proof (docs claims)

Verified present:

| Claimed symbol / path | Location |
| --- | --- |
| `resolveFusionUnits`, `handleFusionChatV2`, `handleFusionChat`, `buildJudgePrompt`, `collectPanel`, `FUSION_DEFAULTS`, `ResolvedFusionUnit` | `open-sse/services/fusion.ts` |
| `shouldTriggerFusion`, `matchGlob`, `hasMatchingToolCall`, `hasMatchingText`, `extractLatestUserText`, `resolveFusionFallbackStrategy`, `fusionStrategyHasConditionalTriggers`, `DEFAULT_FUSION_TOOL_PATTERNS` | `open-sse/services/fusionTriggers.ts` |
| `dispatchFusionStrategy`, fusion / conditional-fusion branch | `open-sse/services/combo.ts` ~893–986 |
| `MAX_COMBO_DEPTH=3`, `MAX_COMBO_DEPTH_HARD_CAP=10` | `open-sse/services/combo/comboPredicates.ts` |
| Strategies `fusion`, `conditional-fusion` | `src/shared/constants/routingStrategies.ts` |
| Schema judge / acting / triggers / fusionTuning / fallback superRefine | `src/shared/validation/schemas/combo.ts` |
| UI routes | `src/app/(dashboard)/dashboard/fusions/{page,new,\[id\]}` |
| `buildSavePayload`, `FusionEditorClient`, `FusionUnitRow` | fusions UI modules |
| Combo CRUD | `src/app/api/combos/route.ts`, `[id]/route.ts` |
| Error strings | `All fusion panel models failed`, `Circular combo reference detected:`, `Max combo nesting depth (`…`) exceeded` |

**Live vs doc mismatch (acting):**

```
resolveFusionUnits → { panels, judge, acting }
dispatchFusionStrategy → handleFusionChatV2({ panels, judge, acting, … })
trigger miss → dispatchActingOnly() if acting set, else resolveFusionFallbackStrategy
handleFusionChatV2 → finalizeWithActing when acting set (judge may be non-stream handoff)
```

FUSION.md still documents only panels → judge final voice.

## i18n Check

- **Baseline**: `src/i18n/messages/en.json` has full fusion editor + sidebar key set (including Epic 0004 `fusionActing*`).
- **Resolution**: Every key referenced via `tx(t, "…")` in `FusionEditorClient.tsx` resolves under `combos.*`.
- **Gaps**:
  - `FusionUnitRow.tsx` does not call `useTranslations`; literals bypass keys documented in FUSION.md i18n notes.
  - Subtitle/desc strings do not mention acting (product copy drift).
  - Other locales contain English stubs for many fusion keys (acceptable per task: en baseline only).

## Evidence Reviewed

- Task file: `docs/tasks/03-review/0017-omniroute-fusion-docs-i18n.md`
- Docs: `docs/architecture/FUSION.md`, `docs/routing/AUTO-COMBO.md` (fusion section),
  `docs/architecture/ARCHITECTURE.md` (strategy count), archive path, `CHANGELOG.md`,
  `docs/architecture/meta.json`
- Source: `open-sse/services/fusion.ts`, `fusionTriggers.ts`, `combo.ts` (dispatch),
  `combo/comboPredicates.ts`, `src/shared/validation/schemas/combo.ts`,
  `src/shared/constants/routingStrategies.ts`, fusions UI + `en.json`
- Runtime wiring proof: non-test call chain `combo.ts` → `resolveFusionUnits` →
  `handleFusionChatV2` (and acting-only miss path)
- Commands run (see below)
- Commands not run: full `typecheck:core` / `lint` (no production TS claimed for this task)

## Commands Run

```bash
# Symbol presence (all FUSION.md primary symbols OK)
# resolveFusionUnits handleFusionChatV2 … MAX_COMBO_DEPTH buildSavePayload …

python3 - <<'PY'
# ROUTING_STRATEGY_VALUES length
# → 18 including fusion + conditional-fusion
PY

python3 - <<'PY'
# en.json fusion keys + Fusion UI tx() key resolution
# → Missing: [] for used editor keys
PY

npm run check:fabricated-docs
# → FUSION.md not in failure list; other task/planning docs fail (pre-existing)
# → includes phantom open-sse/services/fusionUnits.ts in task 0011 planning doc
```

## Path To 100

1. **F1 — Fix AUTO-COMBO fusion accuracy** (`docs/routing/AUTO-COMBO.md`):
   - Panel step: tools **kept**, `tool_choice: "none"`, `stream: false` (cite `fusion.ts`).
   - Create example: use `"models": [...]` (and optional top-level `"judge"`), not `"targets"`.
   - Strategy table: add `conditional-fusion`; counts **18** (or regenerate from
     `ROUTING_STRATEGY_VALUES`).
   - Point operators at `docs/architecture/FUSION.md` for full contract (triggers, acting,
     combo-ref).
2. **F2 — Extend FUSION.md for live acting unit**:
   - Data contract: top-level `acting` (same `comboModelEntry` shapes; never inferred).
   - Runtime: `resolveFusionUnits` → `{ panels, judge, acting }`;
     `finalizeWithActing` / judge handoff when acting set; single-survivor + single-panel
     with acting; trigger miss → acting-only (`combo.ts` A6) before `fallbackStrategy`.
   - Operator guide + troubleshooting rows for acting miss path.
   - i18n notes: `combos.fusionActing*`.
   - Optionally note Epic 0003 (legacy judge final) vs Epic 0004 (acting final).
3. **F3 — Align strategy counts** in fusion-facing guides at least:
   `AUTO-COMBO.md`, and either update or footnote `ARCHITECTURE.md` / agent entry docs
   that still say “17 strategies” without `conditional-fusion`.
4. **F4 — Light i18n wire-up** (optional for pure-docs task, preferred for i18n completeness):
   use existing keys in `FusionUnitRow` **or** drop unused keys from “editor keys” claims
   if intentionally English-only controls.
5. **F5 — Copy polish**: update `sidebar.fusionsSubtitle` / `fusionDesc` to mention optional
   acting and conditional triggers.
6. Re-verify: grep every new claim; `npm run check:fabricated-docs` (FUSION.md clean);
   re-list fusion keys used by UI vs `en.json`.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review

- **Date**: 2026-07-10
- **Reviewer profile**: `reviewers`
- **Score**: `86/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Full report**: `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-review.md`
- **Lane outcome**: returned to doing
- **Task reference**: Task 0017 (`omniroute-fusion-docs-i18n`)

#### Current Open Blockers

- `NEW` F1 High: AUTO-COMBO fusion section wrong (tools stripped; `targets`; 17 strategies)
- `NEW` F2 High: FUSION.md omits live acting unit / A6 miss path
- `NEW` F3 Medium: strategy count/table drift (18 live)
- `NEW` F4/F5 Low: unit-row keys unwired; sidebar/desc copy incomplete

#### Path-to-100 Summary

- Fix AUTO-COMBO fusion accuracy to match fusion.ts + schema
- Document acting in FUSION.md data contract + runtime + operator guide
- Align strategy counts; polish i18n/copy as above

### Previous Reports

- none (initial review)
```

## Regression Guards (for re-review)

- Grep `FUSION.md` for `acting` + `dispatchActingOnly` / A6 semantics matching `combo.ts`.
- AUTO-COMBO must **not** say tools are stripped for fusion panels.
- `ROUTING_STRATEGY_VALUES` length asserted (currently 18) vs any doc claiming 17.
- `createCombo` examples must use `models`, not `targets`.
- `en.json` keys used by Fusion UI still resolve (script from this review).
