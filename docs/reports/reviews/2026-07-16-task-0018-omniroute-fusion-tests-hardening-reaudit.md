# Review Report: Task 0018 — Fusion Tests and Regression Hardening — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0018 (`omniroute-fusion-tests-hardening`); live path `docs/tasks/03-review/0018-omniroute-fusion-tests-hardening.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0018-omniroute-fusion-tests-hardening-review.md` — **92/100** `HELD_IN_REVIEW_PATH_TO_100`
- **Related reports considered**:
  - Task 0014 rereview/reaudit — production immutability + D8 wire tests now live in shared suite
- **Review mode**: `re-review` (adversarial re-audit)
- **Reviewer profile**: `reviewers` (gt-ts-code-reviewer + code-quality-harness)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `97/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 → stay `03-review/`; not `04-completed`)
- **Level**: Elite

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` **F1**: Wire-level D8 through `handleComboChat` now exists in `combo-fusion-strategy.test.ts` (`forbidden fallbackStrategy fusion collapses to priority (D8 wire)`). Live run green.
- `RESOLVED` **F2**: Miss-path asserts strengthened — judge absence + non-judge target presence (no longer only weak `fallbackCalls + fusionCalls >= 1` as sole gate).
- `RESOLVED` **F3**: Immutability regression present — `trigger miss must not mutate combo.strategy (shared-object safety)` miss→hit same object; green with production F1 fix.

### Persistent Findings

- none blocking

### Regressions

- none

### New Findings

- `NEW` **I1 Improvement**: Formal sabotage-gate (deliberate breakage PR) still not run; conceptual counterfactuals remain strong (panel tools, always mode, D8 pure, cycle, missing handleComboChat).
- `NEW` **I2 Improvement**: Optional D8 wire for `fallbackStrategy: "conditional-fusion"` and gated `strategy: "fusion"` + forbidden fallback (pure helper already covers; single wire shape for `fusion` string on conditional strategy only).
- Note: floor counts still met with headroom; suite is **not** mostly tautologies — high `assert.equal` / `deepEqual` density across files.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: No deliberate mutation-sabotage run this wave (optional for S≥90).

## Axiom Compliance (tests + harnessed production paths)

| Axiom | Status | Notes |
|-------|--------|-------|
| 1 Type Purity | ✅ | Explicit Body types in tests |
| 2 Boundary Integrity | ✅ | Contracts Zod D8 + runtime pure D8 + wire D8 |
| 3 Async Determinism | ✅ | Await handlers |
| 4 Immutability | ✅ | Shared combo miss→hit regression present |
| 5 State Exclusivity | ✅ | always / tool-call / text-match / edge matrices |

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Low–Med | Closed | Wire D8 via handleComboChat | 2026-07-10 | combo-fusion-strategy L403–434 |
| F2 | RESOLVED | Low | Closed | Stronger miss-path asserts | 2026-07-10 | L329–341, text-match miss, gated miss |
| F3 | RESOLVED | Medium | Closed | Immutability miss→hit regression | 2026-07-10 | L344–401 |
| I1 | NEW | Improvement | Open | Formal sabotage-gate optional | 2026-07-16 | conceptual only |
| I2 | NEW | Improvement | Open | Extra D8 wire shapes optional | 2026-07-16 | pure already green |

### Contract / exit-condition audit (live counts)

| Requirement | Required | Observed | Status |
|-------------|----------|----------|--------|
| resolveFusionUnits | ≥5 | **14** `fusion-units-resolve.test.ts` | ✅ |
| dispatch | ≥4 | **15** `fusion-combo-ref-dispatch.test.ts` | ✅ |
| triggers | ≥5 | **26** `fusion-triggers.test.ts` | ✅ |
| panel body | ≥2 | **5** `fusion-panel-tools-none.test.ts` | ✅ |
| edge cases | ≥3 | cycle, all-cycle 503, depth, empty 400, 0 answers 503, single-panel, missing handleComboChat | ✅ |
| total / regression suite | ≥19 | **100 pass / 0 fail** full fusion matrix this wave | ✅ |
| no production logic (0018 scope) | claim | tests + changelog ownership; runtime fixes attributed to 0014 | ✅ |

### Assertion density (not tautologies)

| File | tests | strong assert.* | assert.ok |
|------|-------|-----------------|-----------|
| fusion-triggers.test.ts | 26 | 59 | 0 |
| fusion-panel-tools-none.test.ts | 5 | 21 | 1 |
| fusion-units-resolve.test.ts | 14 | 32 | 0 |
| fusion-combo-ref-dispatch.test.ts | 15 | 50 | 8 |
| fusion-contracts.test.ts | 16 | 38 | 2 |
| combo-fusion-strategy.test.ts | 13 | 32 | 20 |
| fusion-editor-types.test.ts* | 9 | 23 | 1 |
| integration fusion.test.ts | 2 | 4 | 1 |

\* editor types file is Task 0016; included in this wave’s combined green run.

Counterfactuals that still fail:

- Panels keep client `tool_choice: "required"` → panel-tools fail.
- `shouldTriggerFusion` ignores `always` → pure + wire always fail.
- `resolveFusionFallbackStrategy("fusion")` returns fusion → pure D8 fail.
- Combo-ref skips `handleComboChat` → dispatch fail.
- Cycle still invokes nested combo → cycle fail.
- `combo.strategy` mutated on miss → immutability fail.
- Forbidden fallback still runs judge → D8 wire fail.

## Evidence Reviewed

- Task + prior 0018 review
- All `tests/unit/fusion-*.test.ts`, `combo-fusion-strategy.test.ts`, integration fusion
- Production under test (read-only): `fusionTriggers.ts`, `combo.ts` gate, `fusion.ts` panel body
- Commands:
  ```bash
  node --import tsx/esm --test \
    tests/unit/fusion-triggers.test.ts \
    tests/unit/fusion-panel-tools-none.test.ts \
    tests/unit/fusion-units-resolve.test.ts \
    tests/unit/fusion-combo-ref-dispatch.test.ts \
    tests/unit/fusion-contracts.test.ts \
    tests/unit/combo-fusion-strategy.test.ts \
    tests/unit/fusion-editor-types.test.ts \
    tests/integration/combo-matrix/fusion.test.ts
  # → tests 100 · pass 100 · fail 0
  ```

## Scoring Rationale

Prior 92 primarily deducted for missing wire D8 / weak miss asserts / immutability test. All three now live and green → recover to **97**. Residual −3 for optional sabotage formality + extra D8 wire shapes.

## Path To 100

1. Optional: add D8 wire variants (`conditional-fusion` fallback string; gated `strategy: "fusion"` + forbidden fallback).
2. Optional: run sabotage-gate once (break panel `tool_choice` / immutability guard and prove fail).
3. Optional: reduce remaining weak `assert.ok` in combo-fusion wire fixtures where exact call sets are knowable.

## Patches Applied On Re-Audit

- none (read-only)

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-16
- Score: 97/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-16-task-0018-omniroute-fusion-tests-hardening-reaudit.md
- Lane outcome: remains in review

#### Current Open Blockers
- none functional
- NEW I1 optional sabotage formality
- NEW I2 optional extra D8 wire shapes

#### Regression Guards
- Keep immutability + D8 wire + panel body + trigger modes green
```
