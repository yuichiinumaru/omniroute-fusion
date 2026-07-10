# Review Report: Task 0018 — Fusion Tests and Regression Hardening — 2026-07-10

## Review Lineage

- **Current task**: Task 0018 (`omniroute-fusion-tests-hardening`); live path `docs/tasks/03-review/0018-omniroute-fusion-tests-hardening.md`
- **Previous reports read**: none found for 0018 specifically
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-10-task-0014-omniroute-fusion-triggers-fallback-review.md` — production immutability finding (F1) not yet covered by 0018 tests; path-to-100 item for this suite once 0014 is fixed
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (lane: `gt-ts-code-reviewer`, omniroute fusion awareness)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (stay `03-review/`; **not** `04-completed/`)
- **Score routing applied**: S ≥ 90 → APPROVE with path-to-100; do not promote to completed

## Delta Summary

### Resolved Since Previous Review
- N/A (initial review)

### Persistent Findings
- none

### Regressions
- none

### New Findings
- `NEW` F1: No wire-level test for runtime D8 (`fallbackStrategy: "fusion"` through `handleComboChat`) — pure helper covered in 0014 suite, but 0018 “comprehensive” claim leaves a gap.
- `NEW` F2: Trigger-miss wire assertion partially weak (`fallbackCalls.length + fusionCalls.length >= 1` in combo-fusion-strategy).
- `NEW` F3: No regression test for combo object immutability across miss→hit (depends on Task 0014 production fix F1).
- `NEW` F4 (info): “≥19 new tests” is met with headroom; production-change claim verified for this task’s evidence list.

### Evidence Gaps / External Blockers
- `EVIDENCE_GAP`: Sabotage gate not run as full deliberate-breakage PR (conceptual + pure counterfactual only). Sufficient for approve given strong assertion density.

## Axiom Compliance (tests + harnessed production paths)

| Axiom | Status | Notes |
|-------|--------|-------|
| 1 Type Purity | ✅ | Tests use explicit Body types; production under test already typed |
| 2 Boundary Integrity | ✅ | Contracts tests cover Zod triggers/fallback rejection |
| 3 Async Determinism | ✅ | Async tests await handlers; no floating promises observed |
| 4 Immutability | ⚠️ | Tests do not yet assert combo object stability (F3) |
| 5 State Exclusivity | ✅ | Mode/edge matrices exercise always / tool-call / text-match / empty / cycle / depth |

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Low–Med | Open | Missing wire D8 through handleComboChat | 2026-07-10 | Covered only in pure `resolveFusionFallbackStrategy` + schema |
| F2 | NEW | Low | Open | Weak miss-path assert | 2026-07-10 | `combo-fusion-strategy.test.ts` |
| F3 | NEW | Medium (depends on 0014) | Open | No immutability regression for shared combo after miss | 2026-07-10 | Related 0014 F1 |
| F4 | NEW | Info | Accepted | Count + no-prod-change claim hold | 2026-07-10 | Completion evidence + file inventory |

### Contract / exit-condition audit

| Requirement | Required | Observed | Status |
|-------------|----------|----------|--------|
| resolveFusionUnits tests | ≥5 | 14 in `fusion-units-resolve.test.ts` | ✅ |
| dispatch tests | ≥4 | 15 in `fusion-combo-ref-dispatch.test.ts` | ✅ |
| trigger tests | ≥5 | 26 in `fusion-triggers.test.ts` | ✅ |
| panel body tests | ≥2 | 5 in `fusion-panel-tools-none.test.ts` | ✅ |
| edge cases | ≥3 | cycle, all-cycle 503, depth, empty 400, 0 answers 503, single-panel, missing handleComboChat | ✅ |
| total new / fusion suite | ≥19 | Far above; full re-run **89 pass / 0 fail** | ✅ |
| regression existing fusion | pass | `combo-fusion-strategy` 11 + integration 2 + contracts 16 | ✅ |
| no production logic (tests only) | claim | Evidence lists only test files + CHANGELOG; no production edits attributed to 0018 | ✅ |
| panel body invariants | stream:false, tool_choice none, tools kept | Dedicated file + dispatch overlap + legacy path | ✅ |

### Regression sensitivity (not tautologies)

Assertion density (reviewer analysis):

| File | tests | strong assert.* | weak assert.ok |
|------|-------|-----------------|----------------|
| fusion-triggers.test.ts | 26 | 59 | 0 |
| fusion-panel-tools-none.test.ts | 5 | 21 | 1 |
| fusion-units-resolve.test.ts | 14 | 32 | 0 |
| fusion-combo-ref-dispatch.test.ts | 15 | 50 | 8 |
| combo-fusion-strategy.test.ts | 11 | 29 | 15 |

Counterfactuals that would fail:

- If panels kept client `tool_choice: "required"` → panel-tools tests fail.
- If `shouldTriggerFusion` ignored `always` → pure + wire always tests fail.
- If `resolveFusionFallbackStrategy("fusion")` returned `"fusion"` → pure D8 tests fail.
- If combo-ref skipped `handleComboChat` → dispatch tests fail.
- If cycle still invoked nested combo → cycle tests fail.

## Evidence Reviewed

- Task: `docs/tasks/03-review/0018-omniroute-fusion-tests-hardening.md`
- Tests: all `tests/unit/fusion-*.test.ts`, `combo-fusion-strategy.test.ts`, `tests/integration/combo-matrix/fusion.test.ts`
- Production under test (read-only): `fusion.ts` panelBody construction (`stream:false`, `tool_choice:"none"`), `fusionTriggers.ts`, combo fusion gate
- Commands run:
  ```bash
  node --import tsx/esm --test \
    tests/unit/fusion-triggers.test.ts \
    tests/unit/fusion-panel-tools-none.test.ts \
    tests/unit/fusion-units-resolve.test.ts \
    tests/unit/fusion-combo-ref-dispatch.test.ts \
    tests/unit/fusion-contracts.test.ts \
    tests/unit/combo-fusion-strategy.test.ts \
    tests/integration/combo-matrix/fusion.test.ts
  # → tests 89 · pass 89 · fail 0
  ```
- Commands not run: full monorepo lint/typecheck (task evidence claimed clean; suite under review green).

## Path To 100

1. Add wire-level D8 test via `handleComboChat` with `fallbackStrategy: "fusion"` + trigger miss → no fusion judge; no recursion.
2. Strengthen miss-path asserts (priority first-model / no full panel+judge shape).
3. After Task 0014 removes `combo.strategy` mutation, add immutability regression (same object, miss then hit).
4. Optional: parameterized matrix for glob/text edge cases already partially covered.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-10
- **Reviewer profile**: `reviewers`
- **Score**: `92/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Full report**: `docs/reports/reviews/2026-07-10-task-0018-omniroute-fusion-tests-hardening-review.md`
- **Lane outcome**: remains in review
```
