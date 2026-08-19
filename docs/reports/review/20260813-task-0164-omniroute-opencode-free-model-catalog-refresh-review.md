# Corrected Review Report: Task 0164 — OpenCode Free model catalog refresh

## Review identity and correction lineage

- **Task**: `docs/tasks/02-doing/0164-omniroute-opencode-free-model-catalog-refresh.md`.
- **Review mode**: independent filesystem review under `BUILDER_CONTEXT`, corrected in the same review session at the user's explicit direction.
- **Operator rule**: `90–100 = APPROVED`; `<90 = REJECTED`.
- **Prior report**: `docs/reports/review/20260813-task-0164-omniroute-opencode-free-model-catalog-refresh-review.md` — 84/100, rejected.
- **Delta correction**: the prior report's F1 model-ID requirement was invalid and is withdrawn. Those unrelated/deprecated/nonexistent IDs are not acceptance criteria for this task, must not be added, and do not affect the score or verdict.
- **Restrictions honored**: no sub-reviewer/investigator/expert/fixer, no `:22000` execution, no git, no changelog tooling, and no `04-completed` action.
- **Sources rechecked**: the task and Completion Evidence, parent OpenCode registry, free model catalog data, upstream parent registry reference, `opencode-zen` registry, `minimax-m3-model-registry.test.ts`, `provider-registry-qwen-vision.test.ts`, `opencode-executor.test.ts`, and `auth-noauth-fallback-loop-3061.test.ts`.

## Corrected score and verdict

### **89/100 — REJECTED**

The implementation itself satisfies the real catalog-refresh objective: the six stale IDs are absent from the parent `opencode` model array and parent free-pool catalog records, all four #6998/current upstream entries are present in both surfaces, and the upstream parent registry reference matches. The `opencode-zen` static registry remains separately populated, including its intentionally out-of-scope aliases, so no accidental Zen pruning is evidenced.

The score remains below 90 only because the task's explicit lane/exit contract is not fully evidenced: Completion Evidence does not contain the required real command output or a changelog draft/reference, and the task's focused tests do not yet assert the complete four-entry/stale-removal/parity/isolation contract. These are valid evidence and regression-hardening findings; the withdrawn model-ID finding is not carried forward.

| Dimension | Score | Rationale |
|---|---:|---|
| Catalog implementation | 97/100 | Parent registry and parent free catalog contain the four current upstream entries and no stale parent free-pool records; the read-only upstream parent registry matches. `opencode-zen` static entries remain isolated. |
| Regression/test enforcement | 88/100 | Fresh suites pass, but the focused tests do not assert the complete current set, all six negative stale cases, registry/catalog parity, or explicit Zen isolation. |
| Completion evidence / lane readiness | 78/100 | Fresh reviewer runs are green, but the executor's Completion Evidence omits real output and the explicit changelog draft/reference exit. |
| **Headline** | **89/100** | Below the binary approval threshold because of the lane-readiness evidence gap, not because of any false model-ID requirement. |

## Findings retained after correction

### F1 — WITHDRAWN / INVALID — prior model-ID requirement

The previous report incorrectly treated unrelated/deprecated/nonexistent model IDs as required parent `opencode` mappings. That finding is removed in full. No such mappings should be added, and their absence is not a defect or blocker for Task 0164.

### F2 — NON-BLOCKING: stale IDs remain in an explanatory comment

`open-sse/config/providers/registry/opencode/index.ts:27-28` still spells out the six retired IDs in the #6998 explanatory comment. Source inspection confirms they are absent from the actual parent model array and absent from `provider: "opencode"` free catalog records. This does not reintroduce stale runtime models and does not block the catalog refresh. It is a documentation/source-hygiene cleanup for a path to 100, or the task may explicitly define stale checks as registration/catalog-record checks only.

### F3 — NON-BLOCKING: complete-set and isolation assertions are incomplete

The updated tests prove the presence of `mimo-v2.5-free` and preserve existing OpenCode executor/Zen behavior, but they do not centrally assert:

- all four current #6998 parent entries;
- absence of all six stale IDs from the parent registry model array and parent free catalog;
- exact parent registry/free-catalog parity; and
- preservation of the out-of-scope `opencode-zen` static aliases.

The source currently passes those checks by inspection: the parent surfaces contain the current set, and `opencode-zen` retains its separate free-tier aliases. Adding explicit assertions would make the refresh regression-resistant but is not an implementation blocker for this review.

### F4 — BLOCKING FOR LANE PROMOTION: Completion Evidence and changelog exit are incomplete

The task explicitly lists a changelog draft as an exit condition, and the task-system contract requires real command output before promotion to `03-review`. The current Completion Evidence records command names and claims, but does not include the actual `102/102` output, `npm run typecheck:core` output, scoped lint output, or a changelog draft/reference. Fresh reviewer execution confirms the tests/typecheck/lint are green, but that does not replace the executor-owned evidence required by the task contract.

This is the sole reason the corrected score remains below 90. It is a lane-readiness blocker, not a catalog correctness failure.

## Fresh verification evidence

### PASS — focused OpenCode suite

```text
node --import tsx/esm --test tests/unit/opencode-*.test.ts
ℹ tests 102
ℹ pass 102
ℹ fail 0
```

### PASS — focused registry/fallback regressions

```text
node --import tsx/esm --test \
  tests/unit/minimax-m3-model-registry.test.ts \
  tests/unit/provider-registry-qwen-vision.test.ts \
  tests/unit/auth-noauth-fallback-loop-3061.test.ts
ℹ tests 20
ℹ pass 20
ℹ fail 0
```

### PASS — core typecheck

```text
npm run typecheck:core
exit 0
```

### PASS — scoped ESLint

```text
npx eslint \
  open-sse/config/providers/registry/opencode/index.ts \
  open-sse/config/freeModelCatalog.data.ts \
  tests/unit/minimax-m3-model-registry.test.ts \
  tests/unit/provider-registry-qwen-vision.test.ts \
  tests/unit/opencode-executor.test.ts \
  tests/unit/auth-noauth-fallback-loop-3061.test.ts
0 errors, 1 existing test-mock warning (`no-explicit-any`)
```

### PASS — parent registry/catalog and upstream alignment

Read-only inspection found the parent `opencode` registry and upstream reference aligned. The parent free catalog has these six records:

```text
big-pickle
deepseek-v4-flash-free
mimo-v2.5-free
hy3-free
nemotron-3-ultra-free
north-mini-code-free
```

The six stale IDs do not occur as parent `opencode` model records or parent `provider: "opencode"` catalog records. The separate `opencode-zen` static registry still contains its existing aliases, including `minimax-m2.5-free`, `nemotron-3-super-free`, and `qwen3.6-plus-free`; no Zen alias-pruning change is evidenced.

## Corrected path to 100

1. Complete the executor-owned Completion Evidence with the real `102/102`, `20/20`, typecheck, and scoped lint output.
2. Add the required changelog draft/reference or record the approved parent-owned changelog-closeout exception explicitly in the task evidence.
3. Add one focused catalog contract test covering the four current entries, all six stale negatives, parent registry/catalog parity, and `opencode-zen` isolation.
4. Optionally rewrite the stale-ID explanatory comment so literal source scans are clean; this is non-blocking because the IDs are not registered.
5. Do **not** add the withdrawn unrelated/deprecated/nonexistent model mappings.

## Final conclusion

**REJECTED — 89/100.** The previous false model-ID finding is retracted and has no bearing on this verdict. The real OpenCode Free catalog refresh is correct and the fresh verification runs are green. The task remains in `docs/tasks/02-doing/` because its explicit Completion Evidence/changelog lane contract is incomplete; no move to `04-completed` was made.
