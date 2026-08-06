# Review: Task 0125 — Stream Repetition Guard

## Summary
Independent code-quality review of the newly implemented stream repetition guard. The review covers the task as executed in `docs/tasks/02-doing/0125-omniroute-stream-repetition-guard.md`, focusing on the implemented diff rather than the original plan.  
Scope reviewed: `open-sse/services/streamRepetitionGuard.ts`, `open-sse/utils/stream.ts`, `open-sse/utils/streamHandler.ts`, `open-sse/services/combo.ts`, `open-sse/services/combo/targetExhaustion.ts`, `open-sse/services/combo/comboPredicates.ts`, `open-sse/services/comboConfig.ts`, `src/shared/validation/schemas/combo.ts`, and the two new unit test files.

---

## Score: 92 — Elite

---

## Axiom Compliance (tsjs review phases)

| Axiom | Status | Notes |
|-------|--------|-------|
| **Type Purity** | ✅ pass | No new `any` types were introduced. The only `any` casts remain in pre-existing test scaffolding; the reviewed task added typed `ResolvedComboTarget` and `ComboLogger` imports and removed unnecessary casts in the new test file. |
| **Boundary Integrity** | ✅ pass | The repetition guard sits on internal streaming deltas; no new external input surface was created without schema validation. The combo toggle flows through the existing Zod runtime schema. |
| **Async Determinism** | ✅ pass | No floating promises were introduced. The repetition path reuses the upstream `AbortController`; cleanup is handled by the existing stream controller wrapper. |
| **Immutability** | ✅ pass | The guard holds only request-local mutable counters and does not mutate upstream request bodies or combo config structures. |
| **State Exclusivity** | ✅ pass | Repetition detection state is isolated per request via `createRepetitionGuard()` and reset is available. No cross-request shared mutable state was added. |

---

## Findings

### Improvements (Score 80-99)
- **`open-sse/utils/stream.ts` — repetition hook coverage completeness**  
  The guard is wired at five SSE content sites, but the exhaustive delta surface depends on how the translator/executor emits content. Add a short code comment near `checkRepetition()` call sites clarifying that future content paths must also connect through it, otherwise the guard silently does not see some formats.
- **`tests/unit/combo-repetition-fallback.test.ts` — integration depth**  
  Unit coverage is correct, but pure `applyComboTargetExhaustion` calls do not prove the runtime combo loop advances and emits a client-visible 502 rather than returning a successful stub response. A shallow integration-style assertion over the wrapped target-execution path would improve confidence without expanding scope.

### Debt / Watch Items (Score 51-79)
- **False-positive surface remains operator-controlled only**  
  The default-off toggle is correct, but there is no per-model or per-provider opt-out exclusions list. If a looping model is used across many combos, operators must enable the guard globally. This is acceptable for v1, but should be tracked as a known limitation.
- **Docs accuracy caveat**  
  One anti-hallucination rule in the task states a “Dahl provider” uses `kimi-k2.6`. The implementation does not rely on Dahl-specific code, so this does not affect correctness; reviewers following the doc-accuracy discipline should not infer repo coupling from that narrative.

---

## Path to 100
1. Increase combo fallback test coverage with a wrapped execution-path assertion proving the client receives the 502 sequence and the combo advances.  
2. Add a code comment in `stream.ts` enumerating required future `checkRepetition()` connections when new SSE deltas are added.  
3. Optional follow-up: add a per-model exclusion list if operators request finer control than the current global toggle.

---

## Verification Evidence
- `node --import tsx/esm --test tests/unit/stream-repetition-guard.test.ts tests/unit/combo-repetition-fallback.test.ts` — 11 passed, 0 failed.
- `npm run typecheck:core` — passed.
- `npx eslint ...` on reviewed files — 0 errors.
- Changelog entry exists: `.changelog/20260727-140000-0125-omniroute-stream-repetition-guard-builders.md`.

---

## Reviewer Notes
The deviation noted in the execution report concerns unrelated provider/model surfaces and does not affect this task’s implementation or review verdict.  
The task remains in `docs/tasks/02-doing/` after review per user instruction.
