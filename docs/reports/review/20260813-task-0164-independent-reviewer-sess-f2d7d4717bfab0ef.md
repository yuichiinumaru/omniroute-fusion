# Independent Review Report — Task 0164: OpenCode Free model catalog refresh

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0164-omniroute-opencode-free-model-catalog-refresh.md`
- **Reviewer**: independent reviewer (new session; no sub-reviewer, investigator, expert, or fixer launched)
- **Reviewer session ID**: `ses_002766470ffe07kMC2GhVzqnyf`
- **Task ID**: `0164`
- **Engineer/Expert IDs**: no explicit Engineer or Expert IDs are recorded in the task history; none invented.
- **Review date**: 2026-08-13
- **Authority used**: the current task, root `AGENTS.md`, `docs/tasks/AGENTS.md`, the files in the task's `Where` table, repository source/tests, and a fresh `opencode models --refresh` execution. Earlier review reports were not treated as authority.
- **Restrictions honored**: no `:22000`, credentials, git, changelog tooling, `04-completed`, or delegated reviewer/investigator/agent.

## Verdict

### **58/100 — REJECTED**

The task remains in `docs/tasks/02-doing/`. No lane move was performed.

The parent Free catalog is not reconciled to the current source of truth. The live refresh currently returns `laguna-s-2.1-free` and `nemotron-3.5-lightning-free`, which are absent from both the active parent registry and the `provider: "opencode"` Free catalog. The active parent surfaces still contain `north-mini-code-free`, which the current refresh does not return. The focused contract test passes only because it hardcodes the dated four-entry issue snapshot rather than the current refresh result.

No requirement for unrelated model IDs was introduced. Model availability was evaluated only against the current `opencode models --refresh` contract. `opencode-zen` was reviewed only for scope isolation and was not treated as a target for pruning or alias changes outside the parent Free catalog.

## Score breakdown

| Dimension | Score | Rationale |
|---|---:|---|
| Current source-of-truth/catalog compliance | 27/40 | Six historical parent stale IDs are absent, but two current IDs are missing and one no-longer-returned ID remains active. |
| Regression tests | 15/25 | Focused Task 0164 test is green (28/28), but asserts the dated four-ID snapshot rather than the current seven-ID refresh set; the required `opencode-*.test.ts` glob is red (48/54). |
| Typecheck | 5/15 | `npm run typecheck:core` fails on an unresolved `ANTIGRAVITY_BASE_URLS` symbol. Attribution is not assumed, but the required gate is not green. |
| Completion Evidence/changelog | 6/15 | The task still has TODO refresh evidence and no task-specific changelog draft/reference; fresh reviewer evidence cannot replace executor-owned completion evidence. |
| Scope discipline / `opencode-zen` | 5/5 | Zen remains independently populated and was not required to be pruned or changed outside the parent Free catalog. |
| **Total** | **58/100** | Below the mandatory 90-point approval threshold. |

## Fresh source-of-truth capture

- **Command**: `opencode models --refresh`
- **Executable**: `/home/sephiroth/.opencode/bin/opencode`
- **Timestamp**: `2026-08-13T20:54:19-03:00`
- **Source/scope**: complete command output captured below; the `opencode/*` rows are the provider catalog used for this review. No credentials were supplied.

```text
Models cache refreshed
opencode/big-pickle
opencode/deepseek-v4-flash-free
opencode/hy3-free
opencode/laguna-s-2.1-free
opencode/mimo-v2.5-free
opencode/nemotron-3-ultra-free
opencode/nemotron-3.5-lightning-free
omniroute/architect
omniroute/builder-engineer
omniroute/builder-expert
omniroute/claude-opus-4.6
omniroute/deepseek-v4-flash
omniroute/gemini-flash
omniroute/gemini-pro
omniroute/glm-5
omniroute/glm-5.2
omniroute/gpt-5.6-luna-high
omniroute/gpt-5.6-terra-high
omniroute/grok-4.5
omniroute/investigator
omniroute/kimi-k2.6
omniroute/kimi-k3
omniroute/mini
omniroute/minimax-m3
omniroute/muse-spark-1.2
omniroute/qwen3.8-max
omniroute/researcher
omniroute/reviewer
omniroute/ultron
openai/gpt-5.2
openai/gpt-5.3-codex
openai/gpt-5.3-codex-spark
openai/gpt-5.4
openai/gpt-5.4-fast
openai/gpt-5.4-mini
openai/gpt-5.4-mini-fast
openai/gpt-5.5
openai/gpt-5.5-fast
openai/gpt-5.5-pro
openai/gpt-5.6
openai/gpt-5.6-fast
openai/gpt-5.6-luna
openai/gpt-5.6-luna-fast
openai/gpt-5.6-luna-pro
openai/gpt-5.6-pro
openai/gpt-5.6-sol
openai/gpt-5.6-sol-fast
openai/gpt-5.6-sol-pro
openai/gpt-5.6-terra
openai/gpt-5.6-terra-fast
openai/gpt-5.6-terra-pro
```

### Derived current OpenCode set

```text
big-pickle
deepseek-v4-flash-free
hy3-free
laguna-s-2.1-free
mimo-v2.5-free
nemotron-3-ultra-free
nemotron-3.5-lightning-free
```

## Findings

### F1 — BLOCKING: active parent registry is not current

`open-sse/config/providers/registry/opencode/index.ts:15-33` currently registers:

```text
big-pickle
deepseek-v4-flash-free
mimo-v2.5-free
hy3-free
nemotron-3-ultra-free
north-mini-code-free
```

Against the fresh refresh, this means:

- **Missing current IDs**: `laguna-s-2.1-free`, `nemotron-3.5-lightning-free`
- **Active extra not returned by current refresh**: `north-mini-code-free`

This directly violates the task objective and Exit Conditions 2/4. The dated issue #6998 four-entry snapshot cannot remain the active allowlist.

### F2 — BLOCKING: active parent Free catalog has the same mismatch

`open-sse/config/freeModelCatalog.data.ts:288-293` has the same six parent `provider: "opencode"` records, including `north-mini-code-free` and excluding the two current refresh IDs. Therefore the registry and Free catalog are internally aligned with each other, but neither is aligned with the current OpenCode provider output.

The six historical stale IDs named by the task are absent from the parent registry and parent `provider: "opencode"` records. That negative result is valid, but it is insufficient while the active set is stale in the opposite direction.

### F3 — BLOCKING: historical snapshot is encoded as the test contract

`tests/unit/opencode-free-catalog-refresh-0164.test.ts:31-47` defines `CURRENT_FREE_IDS` as the four IDs from issue #6998 and then asserts that set. The test passes (`28/28`), but it does not prove the current refresh contract. It would continue to pass while `laguna-s-2.1-free` and `nemotron-3.5-lightning-free` are omitted and `north-mini-code-free` remains registered.

The negative stale-ID assertions are useful and should be retained as historical-removal guards. The positive set must be updated from the captured current refresh evidence, and a set-equality/parity assertion must reject both missing and extra parent IDs.

### F4 — BLOCKING: required OpenCode test glob is not green

Command executed:

```text
node --import tsx/esm --test tests/unit/opencode-*.test.ts
```

Observed result:

```text
ℹ tests 54
ℹ pass 48
ℹ fail 6
✖ tests/unit/opencode-deepseek-reasoning-injected.test.ts
✖ tests/unit/opencode-executor.test.ts
✖ tests/unit/opencode-go-usage.test.ts
✖ tests/unit/opencode-noauth-models-route.test.ts
✖ tests/unit/opencode-proxy-rotation-4954.test.ts
✖ tests/unit/opencode-zen-alias-combo-e2e.test.ts
```

The failing files all report the same module-load error:

```text
SyntaxError: The requested module '../../shared.ts' does not provide an export named 'ANTIGRAVITY_BASE_URLS'
```

The focused Task 0164 test passes separately:

```text
node --import tsx/esm --test tests/unit/opencode-free-catalog-refresh-0164.test.ts
ℹ tests 28
ℹ pass 28
ℹ fail 0
```

This focused green result cannot promote the task while the explicitly required `opencode-*.test.ts` glob fails, and the focused assertions are based on the stale historical four-ID snapshot.

### F5 — BLOCKING: typecheck gate fails

Command executed:

```text
npm run typecheck:core
```

Observed output:

```text
> omniroute@3.8.42 typecheck:core
> tsc --pretty false -p tsconfig.typecheck-core.json

open-sse/config/providers/shared.ts(718,3): error TS2304: Cannot find name 'ANTIGRAVITY_BASE_URLS'.
```

No claim is made here that Task 0164 introduced this symbol error. The task's required typecheck exit is nevertheless not passing and cannot be recorded as a successful completion gate.

### F6 — BLOCKING: Completion Evidence is not current or complete

The task's Completion Evidence at lines 68-72 still says:

- refresh timestamp: `TODO`;
- complete refresh output: `TODO`;
- active replacement set must be listed later;
- test/typecheck evidence is a claim rather than captured output;
- no task-specific changelog draft/reference is listed.

The fresh refresh capture in this report does not substitute for executor-owned Completion Evidence. Before promotion, the task itself must contain the complete timestamped/source-scoped refresh output, the exact active IDs derived from it, real command output for the required tests and typecheck, and a changelog draft/reference consistent with the task-system contract.

### F7 — NON-BLOCKING scope note: Zen remains out of scope

`open-sse/config/providers/registry/opencode/zen/index.ts:87-96` retains its own Free entries, including historical aliases. The parent refresh must not prune or rewrite those entries unless the task explicitly expands scope. The current review found no reason to alter `opencode-zen` or aliases outside the parent Free catalog. This is not a rejection finding.

### F8 — NON-BLOCKING documentation hygiene: parent comment is now stale

`open-sse/config/providers/registry/opencode/index.ts:26-32` describes the four issue #6998 entries as the entries replacing the six delisted models and says they were confirmed live. The comment is dated, but its wording now reads as an active current explanation despite the current refresh returning seven OpenCode entries and not returning `north-mini-code-free`.

After the registry is corrected, rewrite this as a clearly historical note or update it to describe only the current source-of-truth workflow. Do not remove the required historical negative-test context merely to hide the old IDs.

## Files/source audited

- `AGENTS.md`
- `docs/tasks/AGENTS.md`
- `docs/tasks/02-doing/0164-omniroute-opencode-free-model-catalog-refresh.md`
- `open-sse/config/providers/registry/opencode/index.ts`
- `open-sse/config/freeModelCatalog.data.ts` (parent records at lines 288-293)
- `open-sse/config/providers/registry/opencode/zen/index.ts`
- `references/diegosouzapw-omniroute/open-sse/config/providers/registry/opencode/index.ts` (dated evidence only)
- all top-level `tests/unit/opencode-*.test.ts` files matched by the required command
- `tests/unit/opencode-free-catalog-refresh-0164.test.ts`
- related OpenCode registry/fallback tests listed in the task's Completion Evidence
- existing `.changelog/20260812-191417-0162,0164,0165,0166,0167,0168,0169-provider-compatibility-proxy-security-tasks-gt-task-architect.md` (task-creation artifact, not a completion draft)

## Path to 100

1. Reconcile the active parent registry to the fresh `opencode models --refresh` output: add only the verified current IDs `laguna-s-2.1-free` and `nemotron-3.5-lightning-free`, and remove `north-mini-code-free`; keep `big-pickle`, `deepseek-v4-flash-free`, `hy3-free`, `mimo-v2.5-free`, and `nemotron-3-ultra-free`.
2. Apply the identical current parent ID set to `provider: "opencode"` records in `open-sse/config/freeModelCatalog.data.ts`. Do not alter `opencode-zen` records or aliases outside the parent Free catalog.
3. Update `tests/unit/opencode-free-catalog-refresh-0164.test.ts` to assert the current captured set and exact parent registry/catalog parity, while retaining negative assertions for all six historical stale IDs. Do not turn the dated issue snapshot into a permanent allowlist.
4. Make the required `node --import tsx/esm --test tests/unit/opencode-*.test.ts` command pass; resolve or explicitly document the `ANTIGRAVITY_BASE_URLS` module-export failure before claiming the gate.
5. Make `npm run typecheck:core` pass and record its real output in the task Completion Evidence.
6. Replace the task's TODO refresh evidence with the complete timestamped/source-scoped capture and the derived active set. Add real test/typecheck output and the executor agent/date.
7. Add the required changelog draft/reference through the repository's normal process; do not hand-edit generated changelog surfaces.
8. Rewrite the parent registry comment so historical issue #6998 context is clearly historical and does not claim the dated four-entry snapshot is the current catalog.
9. Re-run all required gates after the changes, then request a new independent review. Keep the task in `02-doing` until all exit conditions are actually evidenced.

## Final conclusion

**REJECTED — 58/100.** The current source-of-truth check disproves the active four-entry snapshot: two live OpenCode Free IDs are missing and one active ID is no longer returned. The required OpenCode test glob and core typecheck also fail, and the task Completion Evidence remains incomplete. The rejection is based only on the current refresh contract and explicit task exits; no unrelated model-ID requirement or out-of-scope `opencode-zen` pruning is requested.
