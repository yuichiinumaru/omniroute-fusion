# Return Review: Task 0017 — Fusion Docs + i18n — 2026-07-18

## Review Lineage

- **Current task**: Task 0017 (`omniroute-fusion-docs-i18n`); live path
  `docs/tasks/03-review/0017-omniroute-fusion-docs-i18n.md`
- **Previous reports read** (scores treated as **UNTRUSTED** until re-verified):
  - `2026-07-18-task-0017-omniroute-fusion-docs-i18n-review.md` — claimed 100/100
  - `2026-07-11-task-0017-omniroute-fusion-docs-i18n-rereview.md` — 89/100 REJECTED
    (F3 AGENTS residual; F6 operator/diagram; F4/F5/F7 Low)
  - `2026-07-10` rereview 88 + initial 86
- **Review mode**: independent **full re-review** / adversarial return (parent `reviewers`)
- **Reviewer profile**: documentation-accuracy + omniroute domain (parent agentID=`reviewers`)
- **Focus**: strategy count **18**, acting docs, AUTO-COMBO accuracy, en.json + FusionUnitRow wire

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` — leave in `docs/tasks/03-review/`
  (do **not** move to `04-completed/` from this return wave)
- **Delta vs 2026-07-11 (89)**: **+11** — F3–F7 closed on live FS; acting + comboChatBase + D9
  multi-column ownership present.
- **Delta vs claimed 2026-07-18 100**: **0** — prior 100 claim **confirmed**; not phantom.

## Live strategy inventory (adversarial)

```text
ROUTING_STRATEGY_VALUES.length === 18
priority, weighted, round-robin, context-relay, fill-first, p2c, random, least-used,
cost-optimized, reset-aware, reset-window, headroom, strict-random, auto, lkgp,
context-optimized, fusion, conditional-fusion
```

| Surface | Claim | Live |
| --- | --- | --- |
| `src/shared/constants/routingStrategies.ts` | source of truth | **18** incl. fusion family + headroom |
| `AGENTS.md` live counts | `routing strategies 18` | ✅ |
| `AGENTS.md` Strategies bullet | (18) full list incl. headroom/fusion/conditional-fusion | ✅ (3-line wrap, all 18 named) |
| `CLAUDE.md` combo routing | 18 strategies + fusion family named | ✅ |
| `docs/architecture/ARCHITECTURE.md` | **18 routing strategies** + fusion family | ✅ |
| `docs/routing/AUTO-COMBO.md` | table + “All 18” + `conditional-fusion` row | ✅ |
| `docs/architecture/FUSION.md` | “**18** strategies live” | ✅ |

Secondary docs/diagrams with stale counts (if any) remain **out of scope** per prior ledger
non-blocking follow-ups — not rescored as 0017 blockers.

## AUTO-COMBO accuracy (prior F1 guard)

| Claim | Live |
| --- | --- |
| Panel tools **kept** + `tool_choice:"none"` (not stripped) | ✅ AUTO-COMBO fusion section |
| Create field is **`models`** not `targets` | ✅ |
| Acting + A6 miss path | ✅ |
| 18 strategies including fusion + conditional-fusion | ✅ |

## FUSION.md accuracy audit

- **473 lines** (≥100 exit condition).
- Paths cited under primary sources all exist:
  `fusion.ts`, `fusionTriggers.ts`, `combo.ts`, `combo.ts` schema path via
  `src/shared/validation/schemas/combo.ts`, `comboPredicates.ts`, UI routes, `steps.ts`.
- Symbols verified present: `handleFusionChatV2`, `resolveFusionUnits`, `finalizeWithActing`,
  `dispatchFusionUnit`, `buildJudgePrompt`, `collectPanel`, `shouldTriggerFusion`,
  `resolveFusionFallbackStrategy`, `FUSION_DEFAULTS`, `buildActingHandoffPrompt`,
  `MAX_COMBO_DEPTH` (3) / hard cap (10).
- **No** fabricated `open-sse/services/fusionUnits.ts` inside `FUSION.md`
  (`check:fabricated-docs` only flags that string in **review/task regression-guard text**).
- Acting covered: overview, data contract, A6 miss, ASCII HIT/MISS, stages 2/6/7/8,
  operator Acting step, troubleshooting acting-only / judge non-stream / judge-empty handoff.
- Nesting **`comboChatBase`** five-field table matches live `FusionComboChatBase` Pick +
  `combo.ts` thread.
- D9 ownership table: panel / judge-no-acting / judge+acting / acting voice columns accurate
  vs `fusion.ts` panelBody + judge-for-acting branch.
- Units table judge source order: `judge` → `judgeModel` → first panel (D1) ✅.
- Archive: `.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` present; not under
  `docs/architecture/`.
- `docs/architecture/meta.json` registers `"FUSION"`.

## i18n + UI wire

| Requirement | Live |
| --- | --- |
| Editor keys in `en.json` | ✅ 64 fusion-ish keys incl. triggers, acting, panels, judge, tuning, unit-row |
| `sidebar.fusionsSubtitle` mentions optional acting | ✅ “Panel + judge (+ optional acting) combos” |
| `combos.fusionDesc` mentions optional acting | ✅ |
| `FusionUnitRow` uses i18n via `tx(t, …)` | ✅ model/combo-ref, pick, a11y move/remove, clear, placeholder, combo-ref title/depth |
| Hardcoded English only as `tx` fallbacks | ✅ (acceptable pattern) |
| Trigger labels used by editor | ✅ `fusionTriggerAlways` / `ToolCall` / `TextMatch` in `FusionTriggersSection.tsx` |

Task brief named aspirational keys (`triggerModeAlways`, …); implementation uses consistent
`fusionTrigger*` / `fusion*` prefix — **correct** and wired end-to-end.

## Contract / exit-condition audit

| Requirement | Status |
| --- | --- |
| `docs/architecture/FUSION.md` ≥100 accurate lines | ✅ 473 |
| Data contract matches Zod/runtime | ✅ panels/`models`, judge, acting, triggers, fallback D8, fusionTuning |
| Runtime flow combo → resolve → V2 → panel → judge → acting | ✅ |
| Trigger modes always / tool-call / text-match | ✅ |
| Nesting MAX_COMBO_DEPTH 3 / hard cap 10 | ✅ |
| Panel body ownership D9 + comboChatBase docs | ✅ |
| Archive old doc (not delete) | ✅ |
| Editor i18n keys en.json | ✅ |
| No fabricated names in FUSION.md | ✅ |
| CHANGELOG epic + residual Fixed | ✅ Unreleased Features + Fixed |
| Strategy inventory 18 on primary surfaces | ✅ |

## Commands run

```bash
node -e "import { ROUTING_STRATEGY_VALUES } from './src/shared/constants/routingStrategies.ts';
  console.log(ROUTING_STRATEGY_VALUES.length, ROUTING_STRATEGY_VALUES.join(','))"
# → 18 including fusion, conditional-fusion, headroom

# Symbol/path existence for FUSION.md primary helpers → all OK
# en.json JSON.parse OK; FusionUnitRow i18n keys present
# archive present; FUSION.md 473 lines
npm run check:fabricated-docs
# FUSION.md content not listed among fabricated claims
# (pre-existing: fusionUnits.ts mentioned only in review/task regression-guard text)

npm run typecheck:core  # exit 0 (docs/i18n wave; no TS break)
node --import tsx/esm --test tests/unit/fusion-editor-types.test.ts  # green (payload/i18n-adjacent)
```

## Findings

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| F1 | RESOLVED | High | Closed | AUTO-COMBO tools kept + `models` not `targets` |
| F2 | RESOLVED | High | Closed | Acting contract + A6 in FUSION.md |
| F3 | RESOLVED | Low-Medium | Closed | AGENTS/primary surfaces → 18 full list |
| F4 | RESOLVED | Low | Closed | FusionUnitRow full i18n wire |
| F5 | RESOLVED | Low | Closed | fusionsSubtitle + fusionDesc acting |
| F6 | RESOLVED | Low-Medium | Closed | Operator/runtime/diagram/acting/comboChatBase |
| F7 | RESOLVED | Low | Closed | D9 not misattributed to resolveFusionUnits |
| N1–N3 | RESOLVED | Low | Closed | D9 columns, D1 judge order, judge-fail handoff |

### New findings this return

- **none blocking**.
- Non-blocking follow-ups (unchanged, out of acceptance score):
  1. Translate new fusion keys beyond `en.json` (task scope = en baseline only).
  2. Fusions list `page.tsx` hardcodes → Task 0015 residual.
  3. Secondary docs/diagrams strategy-count drift when those surfaces are next touched.

## Path To 100

**None remaining.** Score **100**.

## Regression Guards (carry forward)

- AUTO-COMBO must **not** claim panel tools are stripped.
- Create/curl examples use `models`, not `targets`.
- Any “N strategies” claim on primary surfaces must equal live length **18** and list both
  `fusion` and `conditional-fusion`.
- FUSION.md runtime + operator must stay consistent with `combo.ts` A6 + `finalizeWithActing`
  + judge non-stream when acting.
- FUSION.md nesting must document `comboChatBase` five-field inheritance.
- D9 ownership table must distinguish panel / judge-no-acting / judge+acting / acting voice.
- No reintroduction of fabricated paths (e.g. `open-sse/services/fusionUnits.ts`) in FUSION.md.

## Task Ledger Patch

```markdown
### Latest Review
- Date: 2026-07-18
- Reviewer: independent full re-reviewer (parent reviewers)
- Score: 100/100
- Verdict: ACCEPTED_100
- Full report: docs/reports/reviews/2026-07-18-task-0017-omniroute-fusion-docs-i18n-return-review.md
- Lane: remain docs/tasks/03-review/
- Open blockers: none
```

---

*Independent full re-review — Task 0017 · 2026-07-18 · parent agentID=`reviewers`*
