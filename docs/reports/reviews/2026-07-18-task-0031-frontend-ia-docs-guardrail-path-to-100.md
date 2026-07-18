# Path-to-100 Review: Task 0031 — Docs Guide + No-New-Leaf Guardrail — 2026-07-18

## Review Lineage

- **Current task**: Task 0031 (`frontend-ia-docs-guardrail`); lane `docs/tasks/02-doing/` (not moved)
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-16-task-0031-frontend-ia-docs-guardrail-reaudit.md` (score **84**, SSoT_DRIFT)
  - `docs/reports/reviews/2026-07-11-task-0031-frontend-ia-docs-guardrail-review.md` (score **96**)
  - `docs/reports/reviews/2026-07-10-task-0031-frontend-ia-docs-guardrail-review.md` (score **93**)
- **Related later work**: Task **0052/0053** brand; Task **0059** Operations hub (9 leaves)
- **Review mode**: `path-to-100` (gt-ts-expert · parent `builders`) — Doc Accuracy Discipline
- **Skills**: code-quality-harness + documentation-audit posture + frontend-quality IA

## Score And Verdict

- **Score**: `96/100` (**up from 84**)
- **Level**: Elite
- **Verdict**: `READY_FOR_INDEPENDENT_RE_REVIEW`
- **Lane recommendation**: stay in `02-doing/` until independent reviewer promotes (do not self-promote)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Five invariants present | 100 | UI.md §1 complete |
| Conceptual 7 pillars vs code | 100 | Matches `OPERATIONAL_PILLAR_SECTION_IDS` |
| Live chrome table (§2.1) vs PRIMARY | **100** | 9 leaves incl. `operations`; deep-link table for api-manager/cli-code |
| observeHub SSoT | 100 | Correct; MONITORING historical |
| DESING / design dual SSoT | 100 | Stub + archive policy hold |
| Primitives table paths | 100 | All listed paths exist on disk |
| Brand / theme claims in UI.md | 99 | coreCyan dark-only; Interface-only |
| Sibling NAV-TREE SSoT | 98 | §2 live 9; §10 flat-10 residual fixed this wave |
| Code header mirror (F8) | 98 | `sidebarVisibility.ts` header now says live **9** |
| Doc accuracy gate | 100 | `npm run check:fabricated-docs` exit 0 |

## Live chrome dump (this session)

```
PRIMARY_SIDEBAR_ITEMS (9):
  home, providers, combos, activity, analytics,
  costs, operations, settings-general, docs

OPERATIONAL_PILLAR_SECTION_IDS (7):
  core-pulse, registry, routing, governance,
  operations, observability, system

HIDEABLE retains: api-manager, cli-code (deep links)
```

**UI.md §2.1** row-by-row matches the dump (ids + hub routes).  
**NAV-TREE-TARGET.md §2** matches the same 9-leaf table.

## Delta vs 2026-07-16 reaudit

| ID | Class | Prior | Now | Evidence |
| --- | --- | --- | --- | --- |
| R1 | REGRESSION High | Open (10-leaf table w/ api-manager/cli-code) | **RESOLVED** | UI.md §2.1 = 9 leaves + deep-link table |
| R2 | REGRESSION Medium | Open (coral + Appearance presets) | **RESOLVED** | UI.md §4 coreCyan dark-only; Interface only |
| R3 | REGRESSION Low | Open (anti-pattern coral identity) | **RESOLVED** | Anti-pattern rows cite coreCyan / no brand swatches |
| N1 | NEW Info | Open (NAV-TREE §2 stale) | **RESOLVED** | §2 + L0 ops hierarchy; §10 conclusion flat-**9** this wave |
| F8 | PERSISTENT Info | Open (header lag) | **RESOLVED** | `sidebarVisibility.ts` header: live **9** after 0059 |
| G1–G3 | Guard | Pass | **Pass** | pillars, observeHub, DESING stub |

### Fixes applied this path-to-100 wave (gt-ts-expert)

1. Verified builder 2026-07-18 UI.md / NAV §2 SSoT rewrite against live `PRIMARY_SIDEBAR_ITEMS` import.
2. Closed residual **flat-10** wording in NAV-TREE §10 shared conclusion + added 2026-07-18 changelog row.
3. Closed F8: code guardrail header now states live **9** leaves (budget ≤~10).
4. Re-ran `npm run check:fabricated-docs` → **exit 0**.
5. Re-ran `tests/unit/ui/operations-hub-discoverability-0059.test.ts` → **12/12 PASS**.

## What still holds

| Exit | Status |
| --- | --- |
| `docs/guides/UI.md` exists | ✅ ~170 lines, accurate |
| Five invariants | ✅ |
| Seven conceptual pillars | ✅ match code |
| Archive policy + DESING stub | ✅ |
| observeHub as Observe SSoT | ✅ |
| Primitives paths real | ✅ |
| Epic / CHANGELOG pointer | ✅ (CHANGELOG Fixed entry Task 0031) |
| No-new-leaf rule | ✅ policy + code header |

## Residuals (non-blocking)

1. **`design.md`** remains multi-phase design plan (may still mention historical coral phases) — intentional dual SSoT: tokens plan vs product IA/brand in UI.md.
2. **L0 budget language** still “≤~10” in NAV invariants (correct as ceiling; live is 9).
3. **Future chrome churn**: any new PRIMARY leaf must update UI.md §2.1 + NAV §2 in the same PR (guard is process + docs, not a CI assert yet).

## Path to 100 (remaining −4)

1. Optional CI micro-gate: assert UI.md §2.1 id list == `PRIMARY_SIDEBAR_ITEMS` (prevents 0059-class drift recurrence).
2. Independent reviewer spot-check Epic 0005 child link still resolves.
3. No further encyclopedia growth of UI.md (short accuracy is the contract).

## Regression guards (must not regress)

- Default chrome ids in UI.md **must match** live `PRIMARY_SIDEBAR_ITEMS` (currently 9: home…operations…docs)
- Conceptual pillar ids must stay aligned with `OPERATIONAL_PILLAR_SECTION_IDS`
- Do not re-cite `MONITORING_SECTIONS.md` as live Observe hub authority (`observeHub.ts`)
- Keep `design.md` (tokens) vs `docs/guides/UI.md` (IA) dual SSoT; keep `DESING.md` as stub only
- Brand claims must match live themeStore/globals (coreCyan dark-only post-0052/53)
- NAV-TREE §2 / §10 must not reintroduce “flat-10” as **live** chrome count
