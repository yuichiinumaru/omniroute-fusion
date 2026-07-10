# Review Report: Task 0017 — OmniRoute Fusion Docs + i18n — 2026-07-10 (re-review)

## Review Lineage

- **Current task**: Task 0017 (`omniroute-fusion-docs-i18n`); live path
  `docs/tasks/03-review/0017-omniroute-fusion-docs-i18n.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-review.md` —
    **86/100** `REJECTED_TO_DOING` (F1 tools strip / `targets` / 17 strategies; F2 acting
    omission; F3 count drift; F4/F5 i18n polish)
- **Related reports considered**:
  - sibling fusion reviews 0010–0016, 0018 under `docs/reports/reviews/` (context only)
- **Review mode**: `re-review`
- **Reviewer profile**: `reviewers` (lane: `gt-documentation-accuracy-reviewer` + fabricated-docs discipline)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `88/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Lane recommendation**: `return-to-doing` (score &lt; 90)
- **Delta vs previous**: +2 (F1 fully fixed; F2 partially fixed; F3 regression-guard still fails)

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` **F1 High**: `docs/routing/AUTO-COMBO.md` fusion section now states tools are
  **kept** with `tool_choice: "none"` (D9), create example uses `"models"` (not `targets`),
  documents optional `acting`, conditional miss path, and links
  `docs/architecture/FUSION.md`. Matches `open-sse/services/fusion.ts:671-673`.
- `RESOLVED` (partial core) **F2 High → residual Medium**: `FUSION.md` data contract now
  has **Acting** unit, trigger-miss **A6** steps, strategy table includes
  `conditional-fusion`, and D9 tools policy is correct.

### Persistent Findings

- `PERSISTENT` **F3 Medium**: Strategy **count / table** still wrong in primary fusion-facing
  surfaces. Live `ROUTING_STRATEGY_VALUES` length = **18** (includes `conditional-fusion`).
  - `docs/routing/AUTO-COMBO.md:153` still claims **17 routing strategies**
  - Strategy table (`AUTO-COMBO.md:157-173`) has **17 rows** and **omits** `conditional-fusion`
  - Footer/refs in same file claim **18** (`:594`, `:628`) — internal contradiction
  - `docs/architecture/ARCHITECTURE.md:368-372` still **17** and lists fusion without
    `conditional-fusion` (plus vague “fallback path”)
  - `AGENTS.md:14` live counts still `routing strategies 17`; combo strategies bullet
    (`AGENTS.md` services section) still omits fusion family
  - CLAUDE.md combo pipeline line is correctly **18** (fixed)

- `PERSISTENT` **F4 Low**: `FusionUnitRow.tsx` still hardcodes English (`Model`, `Combo ref`,
  `Pick model`, `Not set`) despite `en.json` keys `fusionUnitModel`, `fusionUnitComboRef`,
  `fusionPickModel`, etc. Builder left as residual polish.

- `PERSISTENT` **F5 Low**: `sidebar.fusionsSubtitle` = “Panel + judge model combos”;
  `combos.fusionDesc` still panels→judge only (no acting / conditional nuance).

### Regressions

- none (prior F1 fix did not reintroduce tools-stripped language; no new fabricated fusion
  symbols found in FUSION.md primary surface)

### New Findings

- `NEW` **F6 Medium** (residual of F2 path-to-100 incomplete): `FUSION.md` **runtime**
  sections still contradict / omit live acting behavior documented in the A6 contract block:
  - Overview (L9–10) still “panel + judge” only
  - Runtime flow diagram (L175–186) has no `acting` / `finalizeWithActing`
  - **Dispatch gate** (L188–196) says on miss → only `fallbackStrategy` — **omits**
    `dispatchActingOnly()` first (`combo.ts:974-976`)
  - `handleFusionChatV2` stages (L201–211) omit: single-panel with acting → handoff;
    single-survivor with acting; judge non-stream when acting; `finalizeWithActing`
  - Operator guide + troubleshooting omit acting configuration / acting-only miss
  - i18n notes omit `combos.fusionActing*` keys (path-to-100 item was explicit)

- `NEW` **F7 Low**: Misplaced sentence under Panel tools (D9) —
  “Built by `resolveFusionUnits`…” (`FUSION.md` ~L103). Unit resolution builds
  `{panels,judge,acting}`; panelBody is built inside `handleFusionChatV2`, not
  `resolveFusionUnits`.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP` (Low): Did not re-run full `typecheck:core` / `lint` (docs-only re-review;
  no production TS claimed).
- `EXTERNAL_BLOCKER`: none
- `npm run check:fabricated-docs --strict`: **FUSION.md not listed** among failures.
  Pre-existing failures remain in task/planning/review docs (94 claim drifts). Verdict
  classes like `REJECTED_TO_DOING` are false-positive “env vars” in the scanner.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | High | Closed | AUTO-COMBO tools strip / `targets` / incomplete fusion prose | initial 2026-07-10 | Was L186–231; now L187–241 D9 + `models` + acting |
| F2 | SUPERSEDED→F6 | High | Closed as High | Full acting omission in FUSION.md | initial | Contract + A6 present; runtime gaps → F6 |
| F3 | PERSISTENT | Medium | Open | 17 vs 18 strategy drift; table missing `conditional-fusion` | initial | `AUTO-COMBO.md:153,157-173`; `ARCHITECTURE.md:368`; `AGENTS.md:14`; live count 18 |
| F4 | PERSISTENT | Low | Open | Unit-row keys unwired | initial | `FusionUnitRow.tsx:74,124,136,167` vs `en.json` keys |
| F5 | PERSISTENT | Low | Open | Sidebar/desc panels→judge only | initial | `en.json` `fusionsSubtitle`, `fusionDesc` |
| F6 | NEW | Medium | Open | FUSION.md runtime/operator incomplete vs `finalizeWithActing` / A6 dispatch | this re-review | `FUSION.md:175-211,337-369` vs `combo.ts:922-987`, `fusion.ts:528-559,591+` |
| F7 | NEW | Low | Open | “Built by resolveFusionUnits” under D9 is wrong | this re-review | `FUSION.md` ~99–103 vs `fusion.ts` resolve vs panelBody |

## Contract Compliance (Task MUST / Exit)

| Requirement | Status | Live proof |
| --- | --- | --- |
| `docs/architecture/FUSION.md` ≥100 lines accurate architecture | ⚠️ Partial | 403 lines; contract improved; runtime acting incomplete (F6) |
| Data contract matches Zod | ⚠️ Partial | panels/judge/acting/triggers/tuning/D8 present; acting runtime not fully described |
| Runtime flow combo → resolve → V2 → panel → judge | ⚠️ Partial | Legacy path OK; acting final voice + miss path incomplete in runtime section |
| Trigger modes always / tool-call / text-match | ✅ | Matches `fusionTriggers.ts` |
| Nesting MAX_COMBO_DEPTH 3 / hard cap 10 | ✅ | `comboPredicates.ts` |
| Panel body ownership D9 | ✅ | FUSION.md + AUTO-COMBO both correct now |
| Archive old doc | ✅ | `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` |
| Editor i18n keys in `en.json` | ✅ (presence) | Keys exist; unit-row unused (F4) |
| No fabricated names in FUSION.md | ✅ | Primary symbols grep-ok; fabricated-docs does not flag FUSION.md |
| CHANGELOG epic entry | ✅ | `[Unreleased]` Fusion First-Class Task 0017 |
| meta.json registers FUSION | ✅ | present |
| Related routing docs match live fusion | ⚠️ Partial | Fusion section OK; strategy inventory still lies (F3) |

## Production / Source Wiring Proof

| Claim | Live |
| --- | --- |
| `ROUTING_STRATEGY_VALUES` length | **18** — includes `fusion`, `conditional-fusion` |
| Panel body D9 | `fusion.ts:671-673` — keep tools, `stream:false`, `tool_choice:"none"` |
| `resolveFusionUnits` → `{ panels, judge, acting }` | `fusion.ts:506` |
| `finalizeWithActing` | `fusion.ts:528-559` |
| Trigger miss A6 | `combo.ts:974-976` `dispatchActingOnly` before fallback |
| Create schema field | `models` + top-level `judge` / `acting` — not `targets` |

## Evidence Reviewed

- Task: `docs/tasks/03-review/0017-omniroute-fusion-docs-i18n.md` (ledger + path-to-100 wave notes)
- Prior report: `…-review.md` (86/100)
- Docs: `docs/architecture/FUSION.md`, `docs/routing/AUTO-COMBO.md`,
  `docs/architecture/ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`
- Source: `open-sse/services/fusion.ts`, `combo.ts` (dispatch), `routingStrategies.ts`,
  `schemas/combo.ts`, `FusionUnitRow.tsx`, `en.json`
- Commands: strategy count script; residual greps; `npm run check:fabricated-docs`

## Commands Run

```bash
# ROUTING_STRATEGY_VALUES → 18 including fusion + conditional-fusion
python3 - <<'PY'
# extract ROUTING_STRATEGY_VALUES → count 18
PY

rg -n "17 strateg|18 strateg|conditional-fusion|tools stay|targets" \
  docs/routing/AUTO-COMBO.md docs/architecture/FUSION.md \
  docs/architecture/ARCHITECTURE.md CLAUDE.md AGENTS.md

rg -n "acting|dispatchActingOnly|finalizeWithActing|tool_choice" \
  docs/architecture/FUSION.md open-sse/services/fusion.ts open-sse/services/combo.ts

npm run check:fabricated-docs
# → FUSION.md clean; pre-existing failures elsewhere (94 strict drifts)
```

## Path To 100

1. **F3 (blocking for ≥90)** — Align strategy inventory everywhere fusion operators look:
   - `docs/routing/AUTO-COMBO.md:153` → **18** strategies
   - Add table row for `conditional-fusion` (gated panel+judge; miss → acting-only / fallback)
   - `docs/architecture/ARCHITECTURE.md` strategy bullet → 18 + name `conditional-fusion`
   - `AGENTS.md` live counts + strategies list → 18 including fusion family
   - Remove internal 17/18 contradiction in AUTO-COMBO
2. **F6 (blocking for ≥90)** — Finish FUSION.md runtime accuracy:
   - Overview: optional **acting** final voice (Epic 0004)
   - Flow diagram: pass `acting` into V2; miss → `dispatchActingOnly` else fallback
   - Fix Dispatch gate steps to match `combo.ts:953-987` (immutable local strategy)
   - V2 stages: `finalizeWithActing` on single-panel / single-survivor / after judge;
     judge non-stream when acting set
   - Operator: set optional Acting unit; miss path uses acting-only before fallback
   - Troubleshooting row for acting-only behavior
   - i18n notes: `combos.fusionActing*`
3. **F7 Low** — Delete or relocate “Built by `resolveFusionUnits`” from D9 paragraph;
   say units resolved by `resolveFusionUnits`, panelBody built in `handleFusionChatV2`.
4. **F4/F5 Low** — Wire unit-row keys **or** stop listing them as “editor keys” if intentional
   English chrome; polish `fusionsSubtitle` / `fusionDesc` for acting + conditional.
5. Re-grep regression guards; re-run `npm run check:fabricated-docs` (FUSION.md clean).

## Regression Guards (carry forward)

- AUTO-COMBO must **not** claim panel tools are stripped.
- Create/curl examples use `models`, not `targets`.
- Any “N strategies” claim must equal `ROUTING_STRATEGY_VALUES.length` (**18**) and list
  both `fusion` and `conditional-fusion`.
- FUSION.md runtime + operator sections must mention `acting` + miss path consistent with
  `combo.ts` / `finalizeWithActing`.
- No reintroduction of fabricated paths (e.g. `open-sse/services/fusionUnits.ts`).

## Task Ledger Patch Suggestion

```markdown
### Latest Review

- **Date**: 2026-07-10
- **Reviewer profile**: `reviewers`
- **Score**: `88/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Full report**: `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-rereview.md`
- **Lane outcome**: return to doing
- **Task reference**: Task 0017 (`omniroute-fusion-docs-i18n`)

#### Current Open Blockers

- `PERSISTENT` F3 Medium: strategy 17 vs live 18; AUTO-COMBO table missing conditional-fusion
- `NEW` F6 Medium: FUSION.md runtime/operator incomplete vs acting + A6 dispatch
- `PERSISTENT` F4/F5 Low: unit-row i18n + subtitle/desc polish
- `NEW` F7 Low: misplaced resolveFusionUnits under D9

#### Path-to-100 Summary

- Fix AUTO-COMBO/ARCHITECTURE/AGENTS strategy counts + conditional-fusion row
- Complete FUSION.md runtime stages + dispatch gate + operator/acting i18n notes
- Optional F4/F5 polish

### Previous Reports

- `2026-07-10` — `86/100` — `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-review.md`
  - **Carried forward**: F3 strategy count; F4/F5 i18n polish
  - **Resolved since**: F1 tools/targets; F2 acting contract/A6 (partial)
  - **Regression guard**: no tools-stripped; models not targets; 18 strategies; acting in runtime
```
