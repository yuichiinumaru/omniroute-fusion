# Review Report: Task 0017 — OmniRoute Fusion Docs + i18n — 2026-07-11 (re-review)

## Review Lineage

- **Current task**: Task 0017 (`omniroute-fusion-docs-i18n`); was
  `docs/tasks/03-review/0017-omniroute-fusion-docs-i18n.md` (moved to `02-doing/` this review)
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-rereview.md` —
    **88/100** `REJECTED_TO_DOING` (F3 strategy 17 vs 18; F6 runtime acting incomplete;
    F4/F5/F7 polish)
  - `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-review.md` —
    **86/100** initial
- **Related**: sibling fusion reviews 0010–0016, 0018 (context only)
- **Review mode**: `re-review` (path-to-100 verification for F3/F6 closure claim)
- **Reviewer profile**: `reviewers` (general code quality + documentation accuracy)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `89/100`
- **Verdict**: `REJECTED_TO_DOING` / `NEEDS FIX`
- **Lane recommendation**: `return-to-doing` (score &lt; 90)
- **Delta vs previous**: **+1** (F3 primary surfaces fixed; F6 core runtime largely fixed;
  AGENTS + operator/acting residual still block ≥90)
- **F3 closed?** **No** (residual)
- **F6 closed?** **No** (residual)

## Delta Summary

### Resolved Since Previous Review (2026-07-10 re-review)

- `RESOLVED` **F3 primary surfaces**:
  - `docs/routing/AUTO-COMBO.md:153` → **18** strategies
  - Strategy table includes `conditional-fusion` row (`AUTO-COMBO.md:174`)
  - Footer/refs consistent at 18 (`:595`, `:629`)
  - `docs/architecture/ARCHITECTURE.md:368-372` → **18** + names `fusion` +
    `conditional-fusion`
  - `docs/architecture/FUSION.md:62` → **18**
  - `CLAUDE.md` already 18 (unchanged, still correct)
- `RESOLVED` **F6 core runtime** (partial close of prior Medium):
  - Dispatch gate documents trigger miss → acting-only then fallback
    (`FUSION.md:188-199`) matching `combo.ts:960-997`
  - `dispatchFusionStrategy` text includes optional `acting` (`FUSION.md:201-203`)
  - Units table includes `acting` (`FUSION.md:205-211`)
  - V2 stages include `finalizeWithActing` (`FUSION.md:213-227`) matching
    `fusion.ts:528-559` call sites
  - A6 contract block remains correct (`FUSION.md:90-97`)

### Persistent / Residual Findings

- `PERSISTENT residual` **F3 Low-Medium**: `AGENTS.md` still wrong on live inventory
  - `AGENTS.md:14` — `routing strategies 17` (live `ROUTING_STRATEGY_VALUES.length` = **18**)
  - `AGENTS.md:383-384` — **Strategies (15)** list omits `headroom`, `fusion`,
    `conditional-fusion` (path-to-100 explicitly required AGENTS live counts)
  - Out-of-scope-but-related drift remains in `docs/frameworks/OPEN_SSE_ARCHITECTURE.md`,
    `docs/diagrams/request-pipeline.mmd`, RELEASE_CHECKLIST, i18n READMEs — not scored as
    task blockers beyond AGENTS (agent-facing primary surface)

- `PERSISTENT residual` **F6 Low-Medium**: FUSION.md acting coverage incomplete vs
  path-to-100 checklist + live code nuances:
  - Overview (`FUSION.md:9-10`) still “panel + judge” only — no optional acting final voice
  - ASCII runtime diagram (`FUSION.md:175-186`) omits `acting` arg and miss →
    `dispatchActingOnly` branch
  - Stage 2 single-panel (`FUSION.md:216`) says dispatch with original body only — live
    code (`fusion.ts:591-625`) collects panel then `finalizeWithActing` when acting set
  - Stage 6/judge path omits: when acting is set, judge runs **non-stream** +
    `tool_choice:"none"` (`fusion.ts:767-773`) before handoff
  - Operator guide create steps (`FUSION.md:354-366`) never mention optional **Acting** unit
  - Troubleshooting (`FUSION.md:378`) “Trigger miss → fallback” omits acting-only path
  - i18n notes (`FUSION.md:405-416`) omit `combos.fusionActing*` (keys exist in `en.json`)

- `PERSISTENT` **F4 Low**: `FusionUnitRow.tsx:74,124,136,167` hardcodes English
  (`Not set` / `Model` / `Combo ref` / `Pick model`) despite `en.json` keys
  `fusionUnitNotSet`, `fusionUnitModel`, `fusionUnitComboRef`, `fusionPickModel`

- `PERSISTENT` **F5 Low**: `sidebar.fusionsSubtitle` = “Panel + judge model combos”;
  `combos.fusionDesc` still panels→judge only (no acting / conditional nuance)

- `PERSISTENT` **F7 Low**: Misplaced “Built by `resolveFusionUnits`…” under Panel tools
  (D9) (`FUSION.md:103`). Units come from `resolveFusionUnits`; `panelBody` is built
  inside `handleFusionChatV2` (`fusion.ts:671-673`)

### Regressions

- none observed
- F1 tools-kept / `models` not `targets` still correct in AUTO-COMBO + FUSION
- No reintroduction of fabricated `open-sse/services/fusionUnits.ts` in FUSION.md
  (only mentioned as a regression-guard example in review/task docs)

### New Findings

- none beyond residual refinement of F3/F6 incompleteness after the 2026-07-11 fix wave claim

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | High | Closed | AUTO-COMBO tools strip / targets | Prior re-review; still green |
| F2 | SUPERSEDED→F6 | High | Closed as High | Acting data-contract omission | Contract + A6 present |
| F3 | PERSISTENT residual | Low-Medium | Open | AGENTS still 17 / Strategies(15); primary docs fixed to 18 | `AGENTS.md:14,383-384` vs live count 18; AUTO-COMBO/ARCHITECTURE fixed |
| F4 | PERSISTENT | Low | Open | Unit-row keys unwired | `FusionUnitRow.tsx` hardcodes |
| F5 | PERSISTENT | Low | Open | Subtitle/desc panels→judge only | `en.json` `fusionsSubtitle`, `fusionDesc` |
| F6 | PERSISTENT residual | Low-Medium | Open | Operator/overview/diagram/i18n acting incomplete; single-panel stage imprecise | `FUSION.md:9-10,175-186,216,354-366,378,405-416` vs `combo.ts`/`fusion.ts` |
| F7 | PERSISTENT | Low | Open | Misplaced resolveFusionUnits under D9 | `FUSION.md:103` |

## Contract Compliance (Task MUST / Exit)

| Requirement | Status | Live proof |
| --- | --- | --- |
| `docs/architecture/FUSION.md` ≥100 lines accurate architecture | ⚠️ Partial | 419 lines; core accurate; acting residual (F6) |
| Data contract matches Zod / runtime | ✅ | panels/judge/acting/triggers/tuning/D8/D9 present |
| Runtime flow combo → resolve → V2 → panel → judge | ⚠️ Partial | Gate + finalizeWithActing OK; diagram/operator incomplete |
| Trigger modes always / tool-call / text-match | ✅ | Matches `fusionTriggers.ts` |
| Nesting MAX_COMBO_DEPTH 3 / hard cap 10 | ✅ | `comboPredicates.ts` |
| Panel body ownership D9 | ✅ | Keep tools + `tool_choice:"none"`; F7 wording only |
| Archive old doc | ✅ | `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` |
| Editor i18n keys in `en.json` | ✅ (presence) | fusionActing* present; unit-row unused (F4) |
| No fabricated names in FUSION.md | ✅ | All primary symbols grep-ok; fabricated-docs does not flag FUSION.md |
| CHANGELOG epic entry | ✅ | Task 0017 + path-to-100 line under `[Unreleased]` |
| meta.json registers FUSION | ✅ | present |
| Related routing docs match live fusion | ⚠️ Partial | AUTO-COMBO/ARCHITECTURE/CLAUDE fixed; AGENTS residual (F3) |

## Production / Source Wiring Proof

| Claim | Live |
| --- | --- |
| `ROUTING_STRATEGY_VALUES` length | **18** — includes `fusion`, `conditional-fusion` |
| Panel body D9 | `fusion.ts:671-673` — keep tools, `stream:false`, `tool_choice:"none"` |
| `resolveFusionUnits` → `{ panels, judge, acting }` | `fusion.ts:482+` / `combo.ts:900` |
| `finalizeWithActing` | `fusion.ts:528-559` |
| Trigger miss A6 | `combo.ts:982-986` `dispatchActingOnly` before fallback |
| Create schema field | `models` + top-level `judge` / `acting` — not `targets` |

## Evidence Reviewed

- Task: `docs/tasks/03-review/0017-omniroute-fusion-docs-i18n.md` (ledger + F3/F6 closure claim)
- Prior reports: `…-review.md` (86), `…-rereview.md` (88)
- Docs: `docs/architecture/FUSION.md`, `docs/routing/AUTO-COMBO.md`,
  `docs/architecture/ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`
- Source: `open-sse/services/fusion.ts`, `combo.ts` (dispatch), `fusionTriggers.ts`,
  `routingStrategies.ts`, `FusionUnitRow.tsx`, `en.json`
- Commands: live strategy count (18); residual greps; symbol existence; fabricated-docs

## Commands Run

```bash
# Live ROUTING_STRATEGY_VALUES → 18 including fusion + conditional-fusion
node -e "import { ROUTING_STRATEGY_VALUES } from './src/shared/constants/routingStrategies.ts';
  console.log(ROUTING_STRATEGY_VALUES.length, ROUTING_STRATEGY_VALUES.join(','))"

rg -n "17 strateg|18 strateg|conditional-fusion|routing strategies" \
  docs/routing/AUTO-COMBO.md docs/architecture/FUSION.md \
  docs/architecture/ARCHITECTURE.md CLAUDE.md AGENTS.md

rg -n "acting|dispatchActingOnly|finalizeWithActing|tool_choice" \
  docs/architecture/FUSION.md open-sse/services/fusion.ts open-sse/services/combo.ts

# Symbol existence for every FUSION.md primary helper → all OK
# fabricated-docs: FUSION.md not listed among failures (143 pre-existing drifts elsewhere)
npm run check:fabricated-docs
```

## Path To 100 (remaining)

1. **F3 residual (required for ≥90)** — `AGENTS.md`:
   - Live counts line: `routing strategies 18`
   - Combo strategies bullet: count **18** and list `headroom`, `fusion`,
     `conditional-fusion` (or “see ROUTING_STRATEGY_VALUES” with correct count)
2. **F6 residual (required for ≥90)** — finish FUSION.md:
   - Overview: optional **acting** final voice (Epic 0004)
   - Flow diagram: pass `acting`; miss → acting-only / fallback
   - Fix single-panel stage for acting + note judge non-stream when acting set
   - Operator: optional Acting unit step; troubleshooting acting-only row
   - i18n notes: `combos.fusionActing*`
3. **F7 Low** — remove/relocate “Built by resolveFusionUnits” under D9
4. **F4/F5 Low** (optional polish) — wire unit-row keys; subtitle/desc mention acting/conditional
5. Re-grep regression guards; `npm run check:fabricated-docs` (FUSION.md clean)

## Regression Guards (carry forward)

- AUTO-COMBO must **not** claim panel tools are stripped
- Create/curl examples use `models`, not `targets`
- Any “N strategies” claim must equal `ROUTING_STRATEGY_VALUES.length` (**18**) and list
  both `fusion` and `conditional-fusion`
- FUSION.md runtime + **operator** sections must mention `acting` + miss path consistent
  with `combo.ts` / `finalizeWithActing`
- No reintroduction of fabricated paths (e.g. `open-sse/services/fusionUnits.ts`)

## Task Ledger Patch Applied

- Score **89/100**, verdict **REJECTED_TO_DOING**
- Lane: moved `03-review` → `02-doing`
- Open blockers: F3 residual (AGENTS), F6 residual (operator/diagram/i18n acting), F4/F5/F7 Low
