# Review Report: Task 0011 — OmniRoute Fusion Resolve Units — 2026-07-16 (REAUDIT)

## Review Lineage

- **Current task**: Task 0011 (`omniroute-fusion-resolve-units`); live path `docs/tasks/03-review/0011-omniroute-fusion-resolve-units.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0011-omniroute-fusion-resolve-units-review.md` — score 94/100, HELD_IN_REVIEW_PATH_TO_100
- **Related reports considered**:
  - Task 0010 reaudit (contracts consumed here)
  - Task 0012/0013 prior reviews (production consumers of resolveFusionUnits)
- **Review mode**: `re-review` (adversarial)
- **Reviewer profile**: `reviewers` (parent agentID=reviewers)

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (remain `03-review/`)
- **Delta vs prior**: 94 → 93 (−1; empty-judge sentinel + CHANGELOG still open; no regression)

## Delta Summary

### Resolved Since Previous Review

- none required for pure resolve layer

### Persistent Findings

- `PERSISTENT` F1 (Improvement): CHANGELOG draft only (no dedicated Task 0011 Unreleased bullet).
- `PERSISTENT` F2 (Improvement): Empty panels + no judge → `{ kind: "model", model: "" }` placeholder (`fusion.ts:447-449`). Dispatch rejects empty panels with 400 before using judge — safe, mild footgun for raw callers.
- `PERSISTENT` F3 (Note / design OK): Cycle/depth remain at dispatch (`buildFusionChildNesting`), not resolve — correct pure-transform boundary.

### Regressions

- none. `resolveFusionUnits` still pure; still production-called from `dispatchFusionStrategy` / `dispatchActingOnly`.

### New Findings

- `NEW` (Note): Test count grew to **14/14** on live `tests/unit/fusion-units-resolve.test.ts` (builder claimed 12; prior review already saw 14 — still green).
- `NEW` (Note): `acting` return field is additive Epic 0004 extension; does not break Task 0011 contract `{ panels, judge }`.

### Evidence Gaps / External Blockers

- none for Task 0011 exits

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Improvement | Open | CHANGELOG draft unpublished | 2026-07-10 | Task Completion Evidence |
| F2 | PERSISTENT | Improvement | Open | Empty-string judge placeholder | 2026-07-10 | `fusion.ts:447-449` |
| F3 | PERSISTENT | Note | Accepted design | Cycle/depth at dispatch | 2026-07-10 | `buildFusionChildNesting` |
| F4 | NEW | Note | OK | Live-wired production consumer | this reaudit | `combo.ts:899-918` |

## Contract Compliance

| Exit condition | Status | Live proof |
| --- | --- | --- |
| `resolveFusionUnits` exported | ✅ | `fusion.ts:482-507` |
| Signature → `{ panels, judge }` (+ additive `acting`) | ✅ | same |
| Legacy strings / model steps / combo-refs / mixed | ✅ | unit tests 14/14 |
| Judge D1: data.judge → config.judgeModel → first panel | ✅ | `resolveJudgeUnit` + tests |
| Empty models → empty panels; skip invalid | ✅ | tests |
| Reuse normalizeComboModels / normalizeComboStep | ✅ | imports `src/lib/combos/steps.ts` |
| No dispatch in this layer | ✅ | pure map only |
| Production not dead | ✅ | `dispatchFusionStrategy` calls resolve |

### Judge / panel contracts (adversarial)

| Concern | Result |
| --- | --- |
| Judge never inferred from step `role` | ✅ separate field only |
| Combo-ref judge preserves comboName + label | ✅ tests |
| Invalid judge object falls through | ⚠️ not dedicated unit (optional path-to-100 still open) |
| ConnectionId on ResolvedFusionUnit | ✅ intentionally absent (epic §5.3) |

## Runtime Wiring Proof

```
combo.ts::handleComboChat
  → dispatchFusionStrategy() / dispatchActingOnly()
      → resolveFusionUnits(combo, allCombos)   // LIVE
      → handleFusionChatV2({ panels, judge, acting, … })
```

Not helper-only: production combo fusion branches depend on this function.

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | ComboStep → ResolvedFusionUnit total for known kinds |
| Boundary Integrity | ✅ | no I/O |
| Async Determinism | ✅ | sync pure |
| Immutability | ✅ | new arrays/objects |
| State Exclusivity | ✅ | D1 judge; A4 acting never from panels |

## Evidence Reviewed

- Task + prior report for 0011
- Source: `open-sse/services/fusion.ts` (`resolveFusionUnits`, `resolveJudgeUnit`, `comboStepToFusionUnit`, `resolveActingUnit`)
- Consumer: `open-sse/services/combo.ts:899-948`
- Commands:
  ```bash
  node --import tsx/esm --test tests/unit/fusion-units-resolve.test.ts  # 14/14
  # combined fusion suite 102/102 (see 0010 reaudit)
  npm run typecheck:core  # exit 0
  ```

## Path To 100

1. Publish CHANGELOG draft (F1).
2. Optional: export `EMPTY_FUSION_JUDGE` sentinel + comment (F2).
3. Optional unit: invalid `data.judge` falls through to `judgeModel` then first panel.
4. Do **not** move cycle checks into resolve (F3 regression guard).

## Regression Guards

- D1 precedence including blank judgeModel fallthrough.
- Combo-ref + labels preserved; invalid model entries skipped.
- Cycle/depth stay at dispatch.
- Do not expand ResolvedFusionUnit with connectionId without epic decision.

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-16
- Score: 93/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-16-task-0011-omniroute-fusion-resolve-units-reaudit.md
```
