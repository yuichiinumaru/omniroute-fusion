# Review Report: Task 0011 — OmniRoute Fusion Resolve Units — 2026-07-10

## Review Lineage

- **Current task**: Task 0011 (`omniroute-fusion-resolve-units`); live path `docs/tasks/03-review/0011-omniroute-fusion-resolve-units.md`
- **Previous reports read**: none found under `docs/reports/reviews/` for 0011 / fusion-resolve-units
- **Related reports considered**: Task 0010 review (`docs/reports/reviews/2026-07-10-task-0010-omniroute-fusion-contracts-review.md`) — contracts consumed by this resolve layer
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (parent agentID=reviewers; OmniRoute Architect + tsjs rigor)

## Score And Verdict

- **Score**: `94/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (do **not** move to `04-completed`; do **not** return to `02-doing`)

## Delta Summary

### Resolved Since Previous Review

- N/A — initial review.

### Persistent Findings

- none

### Regressions

- none (note: builder updated `combo-fusion-strategy.test.ts` assertions to match keep-tools + `tool_choice: "none"` — intentional alignment with production `handleFusionChat`, not a product regression)

### New Findings

- `NEW` (Improvement): CHANGELOG drafted only (same parent-closeout pattern as 0010).
- `NEW` (Improvement): Empty panels + no judge → `judge: { kind: "model", model: "" }` placeholder. Dispatch rejects empty panels with 400, so runtime is safe; typed placeholder is a mild footgun for callers that inspect `judge` without checking `panels.length`.
- `NEW` (Note / design OK): Cycle/depth are **not** enforced inside `resolveFusionUnits` (pure transform). Enforced at dispatch via `buildFusionChildNesting` — proven by `tests/unit/fusion-combo-ref-dispatch.test.ts` (cycle + max depth → 503). Matches task anti-hallucination (“no dispatch”).

### Evidence Gaps / External Blockers

- none for Task 0011 exit conditions

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Improvement | Open | CHANGELOG draft not published | this report | Task Completion Evidence |
| F2 | NEW | Improvement | Open | Empty-string judge placeholder when panels empty | this report | `fusion.ts:447-449`; test at `fusion-units-resolve.test.ts:138-147` |
| F3 | NEW | Note | Accepted design | Cycle/depth at dispatch, not resolve | this report | `buildFusionChildNesting` `fusion.ts:327-341`; dispatch tests |

## Contract Compliance (vs task exit conditions)

| Exit condition | Status | Evidence |
| --- | --- | --- |
| `resolveFusionUnits` exported | ✅ | `fusion.ts:482-507` |
| Signature `(combo, allCombos?) → { panels, judge }` | ✅ | Also returns `acting` (Epic 0004 extension; additive) |
| Legacy strings → kind model | ✅ | tests |
| Model-step → kind model | ✅ | tests |
| Combo-ref → kind combo-ref | ✅ | tests |
| Mixed arrays | ✅ | tests |
| Judge combo-ref | ✅ | tests |
| Precedence data.judge → config.judgeModel → first panel | ✅ | tests + `resolveJudgeUnit` |
| Empty models → empty panels | ✅ | tests |
| Skip null/invalid models | ✅ | tests |
| Reuse normalizeComboModels / normalizeComboStep | ✅ | imports from `src/lib/combos/steps.ts` |
| No dispatch / no combo.ts branch rewrites for this task alone | ✅ | resolve is pure; combo wiring is live via later tasks and is correct |
| typecheck / lint / unit tests | ✅ | fresh run pass |

## Runtime Wiring Proof

Builder Completion Evidence classified this as helper-only (wiring later). **Live tree has already advanced**:

```
combo.ts::handleComboChat
  → dispatchFusionStrategy()
      → resolveFusionUnits(combo, allCombos)   // panels, judge, acting
      → handleFusionChatV2({ panels, judge, acting, handleComboChat, nesting, … })
          → dispatchFusionUnit / buildFusionChildNesting (cycle + depth)
```

Also used on conditional-fusion miss path (`dispatchActingOnly` reuses `resolveFusionUnits` for `acting`).

So Task 0011 is not dead code: production combo branch depends on it.

### Cycle / depth (review focus)

| Concern | Where | Proof |
| --- | --- | --- |
| Resolve does not expand combo-refs into nested graphs | `resolveFusionUnits` | unit tests; pure map |
| Nested combo-ref cycle | `buildFusionChildNesting` | `fusion-combo-ref-dispatch` cycle tests pass |
| Max nesting depth | same | max-depth test → 503, handleComboChat not called |
| API create DAG for panel models | `validateComboDAG` | models only (judge residual — see 0010 F2) |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | Discriminated units; ComboStep → ResolvedFusionUnit mapping is total for known kinds |
| Boundary Integrity | ✅ | Consumes normalized steps; no new I/O boundary |
| Async Determinism | ✅ | Sync pure function |
| Immutability | ✅ | Returns new arrays/objects; no mutation of combo input |
| State Exclusivity | ✅ | model vs combo-ref exclusive kinds; judge separate (D1); acting never inferred from panels (A4) |

## Evidence Reviewed

- Task file: `docs/tasks/03-review/0011-omniroute-fusion-resolve-units.md`
- Source: `open-sse/services/fusion.ts` (`resolveFusionUnits`, `resolveJudgeUnit`, `comboStepToFusionUnit`, `buildFusionChildNesting`), `open-sse/services/combo.ts` (dispatchFusionStrategy ~893–942), `src/lib/combos/steps.ts` (normalize helpers)
- Tests: `tests/unit/fusion-units-resolve.test.ts` (14), `tests/unit/combo-fusion-strategy.test.ts`, `tests/unit/fusion-combo-ref-dispatch.test.ts`, `tests/unit/fusion-acting.test.ts`
- Commands run (fresh this review):
  ```bash
  node --import tsx/esm --test \
    tests/unit/fusion-contracts.test.ts \
    tests/unit/fusion-units-resolve.test.ts \
    tests/unit/combo-config.test.ts \
    tests/unit/combo-fusion-strategy.test.ts
  # → 83/83 pass

  node --import tsx/esm --test \
    tests/unit/fusion-combo-ref-dispatch.test.ts \
    tests/unit/fusion-acting.test.ts
  # → 23/23 pass

  npm run typecheck:core  # exit 0
  npx eslint open-sse/services/fusion.ts tests/unit/fusion-units-resolve.test.ts  # clean
  ```

## Path To 100

1. Publish CHANGELOG draft at parent closeout (F1).
2. Optional: change empty-judge sentinel to a documented constant, e.g. `EMPTY_FUSION_JUDGE`, or return `judge` only when panels non-empty and keep placeholder behind an explicit type comment (F2). Prefer **not** changing the public return shape mid-wave without tests.
3. Optional hardening test: invalid `data.judge` object (`{}`) falls through to `config.judgeModel` then first panel.
4. Do **not** move cycle checks into resolve — keep pure transform; dispatch owns nesting (F3 regression guard).

## Narrow Patches (path-to-100)

```ts
// Patch A (optional, F2) — document empty judge sentinel
/** Placeholder when panels are empty and no judge is configured. Dispatch rejects empty panels before using judge. */
export const EMPTY_FUSION_JUDGE: ResolvedFusionUnit = { kind: "model", model: "" };

// in resolveJudgeUnit:
if (panels.length > 0) return panels[0];
return EMPTY_FUSION_JUDGE;
```

```ts
// Patch B (optional test) — invalid judge falls through
test("resolveFusionUnits: invalid data.judge falls through to judgeModel", () => {
  const { judge } = resolveFusionUnits({
    name: "bad-judge",
    models: ["a/m1"],
    judge: { kind: "combo-ref" }, // missing comboName → null step
    config: { judgeModel: "cfg/judge" },
  });
  assert.deepEqual(judge, { kind: "model", model: "cfg/judge" });
});
```

## Regression Guards (must preserve)

1. D1 precedence: `data.judge` > `config.judgeModel` > first panel (including blank judgeModel fallthrough).
2. Combo-ref panels/judge preserve `comboName` + optional `label`.
3. `normalizeComboModels` skip semantics for null/invalid entries.
4. Cycle/depth remain at **dispatch**, not resolve.
5. ConnectionId is intentionally **not** on `ResolvedFusionUnit` (epic §5.3) — do not “fix” by expanding the type without an epic decision.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
### Latest Review
- Date: 2026-07-10
- Score: 94/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-10-task-0011-omniroute-fusion-resolve-units-review.md
- Lane outcome: remains in review
```
