# Delta Re-review Report — Task 0164: OpenCode Free model catalog refresh

## Review scope and lineage

- **Task**: `docs/tasks/02-doing/0164-omniroute-opencode-free-model-catalog-refresh.md`
- **Review type**: independent delta-aware re-review after the prior rejection.
- **Prior report**: `docs/reports/review/20260813-task-0164-independent-reviewer-sess-f2d7d4717bfab0ef.md`
- **Authority**: the updated task, root `AGENTS.md`, `docs/tasks/AGENTS.md`, current `Where` files, source/tests, and a fresh `opencode models --refresh` run. Prior reports were used only to classify deltas, not as catalog authority.
- **Scope restrictions honored**: no delegated reviewer/investigator, no `:22000`, no live credentials, no git, no changelog tooling, and no lateral review of unrelated tasks or provider work.

## Verdict

### **89/100 — REJECTED**

The catalog implementation and all technical verification gates now pass. The task remains in `docs/tasks/02-doing/` because the Completion Evidence does not yet contain the canonical `.changelog/<entry>.md` reference plus rebuild evidence required by `docs/tasks/AGENTS.md` before promotion to `03-review`. The task currently contains a Changelog Draft and explicitly defers canonical entry creation/rebuild as parent-owned; that is useful draft evidence but does not prove the constitution's required changelog exit.

No model IDs outside the current refresh were requested or used as acceptance criteria. `opencode-zen` was evaluated only for the declared isolation scope; no Zen pruning or alias changes are required.

## Delta summary against prior findings

| Prior finding | Delta status | Evidence |
|---|---|---|
| Parent registry omitted two current IDs and retained `north-mini-code-free` | **RESOLVED** | Parent registry now matches the seven current `opencode/*` IDs exactly. |
| Parent Free catalog had the same mismatch | **RESOLVED** | `provider: "opencode"` catalog now contains the same seven IDs, in the same order. |
| Focused test encoded the dated four-entry snapshot | **RESOLVED** | Focused test now asserts exact current set, parity, six historical negatives, and Zen isolation. |
| Required OpenCode glob failed at shared registry import | **RESOLVED** | Required glob passes 127/127 after the documented minimal compatibility alias repair. |
| Core typecheck failed at the same import/export defect | **RESOLVED** | `npm run typecheck:core` exits 0. |
| Completion Evidence lacked timestamp/output/changelog draft | **PARTIALLY RESOLVED** | Refresh transcript, timestamp, source, test/typecheck/lint output, and a task Changelog Draft are present. Canonical `.changelog` entry/rebuild evidence is still absent. |
| Parent historical comment was ambiguous | **RESOLVED** | Comment explicitly calls the old issue entries historical and points to the refreshed output as the active source. |

## Score breakdown

| Dimension | Score | Rationale |
|---|---:|---|
| Current source-of-truth/catalog compliance | 35/35 | Fresh refresh and active parent registry/catalog agree on the seven verified IDs. |
| Regression tests and scope isolation | 25/25 | Focused contract is 25/25; required OpenCode glob is 127/127; parity, stale negatives, and Zen isolation are explicit. |
| Typecheck and lint | 20/20 | Core typecheck and scoped ESLint both exit 0. |
| Completion Evidence | 4/10 | Complete refresh transcript and command evidence are present, but the constitution-required canonical changelog reference/rebuild is not. |
| Scope discipline | 5/5 | Zen remains independent; no out-of-scope pruning or alias changes are required. |
| **Total** | **89/100** | Below the mandatory 90-point approval threshold. |

## Fresh source-of-truth verification

- **Command**: `opencode models --refresh`
- **Source executable**: `/home/sephiroth/.opencode/bin/opencode`
- **Fresh timestamp**: `2026-08-13T23:44:52-03:00`
- **Exit**: 0
- **Observed OpenCode provider IDs**:

```text
big-pickle
deepseek-v4-flash-free
hy3-free
laguna-s-2.1-free
mimo-v2.5-free
nemotron-3-ultra-free
nemotron-3.5-lightning-free
```

The complete command output was also captured in the updated task Completion Evidence with source, timestamp, scope, and exit code. The fresh run agrees with that captured seven-ID set.

## Current implementation audit

### Parent registry

`open-sse/config/providers/registry/opencode/index.ts` now contains exactly:

```text
big-pickle
deepseek-v4-flash-free
hy3-free
laguna-s-2.1-free
mimo-v2.5-free
nemotron-3-ultra-free
nemotron-3.5-lightning-free
```

The former unverified `north-mini-code-free` entry is absent. The parent comment now states that the old issue entries are historical and identifies the latest refresh output as the active source.

### Parent Free catalog

`open-sse/config/freeModelCatalog.data.ts` now contains exactly the same seven `provider: "opencode"` model IDs. The focused test verifies both exact catalog equality and registry-to-catalog Free-ID parity.

### Historical stale IDs

The six historical stale IDs are absent from the active parent registry and active `provider: "opencode"` catalog records. Search of the active parent configuration found no stale parent records. Historical entries that remain in the separately maintained `opencode-zen` surface were not treated as a defect because the task explicitly scopes the refresh to the parent Free catalog and requires Zen isolation.

### `opencode-zen` scope

The focused tests now verify:

- the Zen model array is not the parent array;
- independently maintained Zen models remain present;
- Zen retains its own existing Free aliases and is not pruned/replaced by the parent refresh.

No Zen source or alias change is required for this task.

## Fresh verification evidence

### Focused Task 0164 contract

Command:

```text
node --import tsx/esm --test tests/unit/opencode-free-catalog-refresh-0164.test.ts
```

Result:

```text
ℹ tests 25
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
```

The test covers exact current parent set, all seven current entries, six historical stale negatives in both active parent surfaces, exact registry/catalog parity, and Zen isolation.

### Required OpenCode test glob

Command:

```text
node --import tsx/esm --test tests/unit/opencode-*.test.ts
```

Result:

```text
ℹ tests 127
ℹ pass 127
ℹ fail 0
ℹ cancelled 0
```

### Core typecheck

Command:

```text
npm run typecheck:core
```

Result: exit code `0`.

The prior module-load/typecheck blocker is documented in the task as a minimal compatibility alias restoring the already-referenced registry export. This re-review verifies only that the required OpenCode tests and typecheck now pass; it does not review unrelated provider behavior.

### Scoped lint

Command:

```text
npx eslint tests/unit/opencode-free-catalog-refresh-0164.test.ts open-sse/config/providers/registry/opencode/index.ts open-sse/config/freeModelCatalog.data.ts open-sse/config/providers/shared.ts
```

Result: exit code `0`, no output.

## Completion Evidence and changelog audit

The updated task now includes:

- complete refresh output;
- source executable and timestamp;
- exit code and scope;
- derived seven-ID active set;
- focused test result;
- required OpenCode glob result;
- typecheck result;
- scoped lint result;
- model diff and Zen-scope statement;
- a Changelog Draft.

However, `docs/tasks/AGENTS.md` §7 requires the Completion Evidence before promotion to include a changelog entry reference under `.changelog/` and rebuild evidence. The task's own Changelog Draft says canonical `.changelog` entry creation/rebuild is deferred to the parent after review. No task-specific canonical entry/rebuild evidence is present in the reviewed state; the existing multi-task `.changelog` file is a task-creation artifact, not proof of this task's completed changelog closeout.

This is the only remaining promotion blocker found in this delta review.

## Path to 100

1. Have the parent-owned changelog process create the canonical `.changelog/<entry>.md` entry for Task 0164 and perform the required rebuild, without hand-editing generated changelog surfaces.
2. Add the canonical entry path and real rebuild result to the task's Completion Evidence.
3. Re-run the task's required gates after the evidence update and request promotion to `03-review`.

No catalog code change, stale-ID change, Zen pruning, or unrelated provider change is requested by this path-to-100.

## Final conclusion

**REJECTED — 89/100.** The implementation fixes the prior catalog, test, comment, and typecheck findings, and all fresh technical gates pass. Promotion is withheld solely because the constitution-required canonical changelog entry/rebuild evidence is not present in Completion Evidence. The task remains in `docs/tasks/02-doing/` until that evidence is added.
