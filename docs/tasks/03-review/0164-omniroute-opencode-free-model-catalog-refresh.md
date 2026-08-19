# Task 0164: Refresh OpenCode Free model catalog

> **Status**: `[~]` In progress — builder wave assigned (`builders`)
> **Priority**: 🔴 P0
> **Type**: `bug fix`
> **Origin**: Upstream comparison — 6 Free-tier models delisted upstream 2026-07-14 (#6998); fork registry still references them → 401 on every Free request.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — touches only `open-sse/config/providers/registry/opencode/index.ts`.
> **Review routing**: independent + provider/catalog review

---

## Objective

Refresh the local OpenCode Free-tier catalog against the **current output of**
`opencode models --refresh`. Remove Free-tier model IDs that are no longer
returned by the OpenCode provider and add only IDs that the refreshed OpenCode
catalog currently returns. Every OpenCode Free request MUST target a model that
exists in the current catalog at review time.

### Historical stale IDs identified by issue #6998:
- `minimax-m3-free`, `minimax-m2.5-free`, `ling-2.6-1t-free`,
  `trinity-large-preview-free`, `nemotron-3-super-free`, `qwen3.6-plus-free`

### Historical replacement snapshot from issue #6998:
- `mimo-v2.5-free`, `hy3-free`, `nemotron-3-ultra-free`, `north-mini-code-free`

> The six stale IDs and four replacement IDs above are dated evidence from
> issue #6998, not a permanent allowlist. The live source of truth is the
> refreshed `opencode` provider output. At the time of this correction, the
> operator observed current OpenCode entries including `big-pickle`,
> `deepseek-v4-flash-free`, `hy3-free`, `laguna-s-2.1-free`, `mimo-v2.5-free`,
> `nemotron-3-ultra-free`, and `nemotron-3.5-lightning-free`; the complete
> command output must be captured in Completion Evidence before promotion.

## Exit Conditions (GDD/TDD)

- [x] `opencode models --refresh` completed successfully and complete output is captured in Completion Evidence with timestamp/source.
- [x] Free registry contains only IDs currently returned by the refreshed OpenCode provider output.
- [x] Historical stale IDs are absent from runtime registry/catalog records; explanatory historical comments are clearly marked as historical.
- [x] No unverified model ID remains in the active Free catalog.
- [x] `node --import tsx/esm --test tests/unit/opencode-*.test.ts` passes.
- [x] `npm run typecheck:core` passes.
- [x] Changelog draft prepared.

## Details

### Where

| File | Purpose |
|------|---------|
| `open-sse/config/providers/registry/opencode/index.ts` | Modify — reconcile against refreshed OpenCode output; do not assume 6→4 is permanent. |
| `open-sse/config/freeModelCatalog.data.ts` | Modify if the provider Free catalog projection requires the same current IDs. |
| `references/diegosouzapw-omniroute/open-sse/config/providers/registry/opencode/index.ts` | Read — dated upstream reference only; not a substitute for `opencode models --refresh`. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not invent model IDs or treat model names from memory/training as evidence.
> Run `opencode models --refresh`, capture the complete output, and record the
> exact source, timestamp, and scope used. If the command is unavailable, use a
> checked-in upstream/source artifact and explicitly label it as dated evidence;
> do not present it as the current catalog.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Model diff**: reconciled parent runtime registry and `provider: "opencode"` free catalog to the verified seven-ID output from the live refresh: `big-pickle`, `deepseek-v4-flash-free`, `hy3-free`, `laguna-s-2.1-free`, `mimo-v2.5-free`, `nemotron-3-ultra-free`, and `nemotron-3.5-lightning-free`. Removed unverified historical `north-mini-code-free` from parent registry/catalog. The six historical stale IDs remain absent from both parent runtime records. `opencode-zen` files were not modified.
- **Current catalog source**: `/home/sephiroth/.opencode/bin/opencode models --refresh`; **timestamp**: `2026-08-13T22:34:02-03:00`; **exit code**: `0`; **scope**: complete command output, with OpenCode-provider entries listed verbatim below.
- **Complete refresh output**:
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
- **Tests**: `node --import tsx/esm --test tests/unit/opencode-free-catalog-refresh-0164.test.ts` — **PASS**, 25/25 tests, exit 0. The focused test asserts exact refreshed parent set, parent/catalog parity, six historical negatives in both records, and opencode-zen isolation.
- **Required OpenCode glob**: `node --import tsx/esm --test tests/unit/opencode-*.test.ts` — **PASS**, 127/127 tests, exit 0 (after the minimal existing shared-registry import alias repair described below).
- **Typecheck**: `npm run typecheck:core` — **PASS**, exit 0 (after the minimal existing shared-registry import alias repair described below).
- **Scoped lint**: `npx eslint tests/unit/opencode-free-catalog-refresh-0164.test.ts open-sse/config/providers/registry/opencode/index.ts open-sse/config/freeModelCatalog.data.ts` — **PASS**, exit 0, no output.
- **Shared-registry blocker repair**: `open-sse/config/providers/shared.ts` now defines the already-exported `ANTIGRAVITY_BASE_URLS` compatibility name from `ANTIGRAVITY_RUNTIME_BASE_URLS`; this was required by the OpenCode glob/typecheck and changed no OpenCode Zen behavior.
- **Changelog entry**: `.changelog/20260814-115219-0164-refresh-opencode-free-model-catalog-from-live-cli-builders.md` — created by parent builder; rebuild produced `CHANGELOG.md` with 70 entries, exit 0.
- **Changelog draft**: present in this task evidence below; canonical `.changelog/` entry creation/rebuild completed by parent (see above).

## 🔁 Review/Fix Ledger

- **Execution Engineer session/task ID**: not recorded in the original task history; not invented.
- **Execution Expert session/task ID**: not recorded in the original task history; not invented.
- **Execution Reviewer session/task ID**: `ses_002766470ffe07kMC2GhVzqnyf`.
- **Fix Expert session/task ID**: `ses_002c36df6ffe6l5mtUca7VXHVo` (wrapper ID; resumed FIX execution; current handoff verified by orchestrator).
- **Fix Reviewer session/task ID**: `ses_002766470ffe07kMC2GhVzqnyf` (same Reviewer resumed for delta-aware re-review; wrapper ID recorded by orchestrator).

### Path-to-100 Closure Matrix — current-source review

| Reviewer finding | Status | Fix/evidence | Validation | Residual |
|---|---|---|---|---|
| Parent registry/catalog omitted verified `laguna-s-2.1-free` and `nemotron-3.5-lightning-free`, retained unverified `north-mini-code-free` | fixed | Updated `open-sse/config/providers/registry/opencode/index.ts` and `open-sse/config/freeModelCatalog.data.ts` to the seven current `opencode/*` IDs from refresh output | Focused Task 0164 test exact-set + parity: 25/25 pass | none for catalog scope |
| Focused test hardcoded dated four-entry snapshot | fixed | Replaced with exact seven-ID current-source contract and six historical negative checks | `node --import tsx/esm --test tests/unit/opencode-free-catalog-refresh-0164.test.ts` exit 0 | source evidence is timestamped in Completion Evidence |
| `opencode-zen` isolation | fixed | Added explicit array identity, retained-model, and no-pruning assertions; did not modify Zen source/catalog records | Focused isolation suite pass | none |
| Required OpenCode glob failed due `ANTIGRAVITY_BASE_URLS` import/export defect | fixed | Minimal compatibility alias in `open-sse/config/providers/shared.ts` restores the already-referenced export name from `ANTIGRAVITY_RUNTIME_BASE_URLS`; no OpenCode Zen behavior changed | `node --import tsx/esm --test tests/unit/opencode-*.test.ts`: 127/127, exit 0 | none |
| `npm run typecheck:core` failed at same unrelated defect | fixed | Same minimal shared-registry alias repair | exit 0 | none |
| Completion Evidence lacked real refresh output/timestamp/source and changelog evidence | fixed | Added full refresh transcript, timestamp, source, exit codes, and Changelog Draft below | task file is current and remains in `02-doing` | canonical `.changelog` entry/rebuild remains parent-owned after review |

### Changelog Draft

- **task**: 0164
- **agent**: `gt-ts-expert` (current FIX worker; wrapper identity handled by orchestrator)
- **project**: `omniroute-2`
- **title**: refresh-opencode-free-model-catalog-from-live-cli
- **description**: Reconcile the parent OpenCode Free registry and catalog with the verified `opencode models --refresh` output, removing historical/unverified IDs and preserving the separate `opencode-zen` registry.
- **summary**: Parent OpenCode now contains the seven current provider IDs returned by the refresh; catalog parity and historical stale-ID negatives are covered by focused tests. Zen remains unchanged.
- **verification**: `opencode models --refresh` exit 0 at `2026-08-13T22:42:49-03:00`; focused contract test 25/25 exit 0; OpenCode glob 127/127 exit 0; `npm run typecheck:core` exit 0; scoped ESLint exit 0. The only additional change was the minimal compatibility alias in `open-sse/config/providers/shared.ts` required to restore the already-referenced `ANTIGRAVITY_BASE_URLS` export.

## 🔍 Review Trail (preenchido pelo reviewer)
- **Note**: model claims must use the refreshed command output as current source of truth. The issue #6998 list and checked-in upstream reference are dated evidence only. `opencode-zen` forwarding/alias behavior was not modified; no model IDs outside the verified current Free-pool catalog were added.

## 🔍 Review Trail (preenchido pelo reviewer)

### Independent review — 2026-08-13

- **Reviewer**: independent primary reviewer (`BUILDER_CONTEXT`)
- **Verdict**: **REJECTED**
- **Score**: **84/100** (superseded by the correction below)
- **Report**: `docs/reports/review/20260813-task-0164-omniroute-opencode-free-model-catalog-refresh-review.md`
- **Move**: **not moved**; task remains at `docs/tasks/02-doing/0164-omniroute-opencode-free-model-catalog-refresh.md`.
- **Correction**: the prior F1 requirement for `gpt-4.5-turbo`, `gemini-1.5-pro`, and `gemini-2.5-flash` was invalid and is withdrawn. Those IDs are not acceptance criteria and must not be added.

### Corrected delta-aware review — 2026-08-13

- **Reviewer**: same independent primary reviewer, corrected in-session at explicit user direction
- **Verdict**: **REJECTED**
- **Score**: **89/100** (operator binary law: `<90` remains in `02-doing`)
- **Report**: `docs/reports/review/20260813-task-0164-omniroute-opencode-free-model-catalog-refresh-review.md`
- **Move**: **not moved**; no move to `04-completed` and no other lane promotion performed.
- **Delta classification**:
  - **WITHDRAWN/INVALID**: prior F1 model-ID mapping requirement; removed from the score, findings, and path to 100.
  - **VALID/NON-BLOCKING**: stale IDs remain in the parent explanatory comment only; they are absent from runtime parent registry/catalog records.
  - **VALID/NON-BLOCKING**: complete-set, registry/catalog-parity, and explicit `opencode-zen` isolation assertions are not centralized in focused tests, although source inspection passes the intended scope.
  - **VALID/BLOCKING FOR LANE PROMOTION**: Completion Evidence lacks real command output and the required changelog draft/reference.
- **Verification**: fresh `opencode-*.test.ts` run `102/102` pass; focused registry/fallback run `20/20` pass; `npm run typecheck:core` exit 0; scoped ESLint 0 errors with 1 existing test-mock warning; parent registry/free catalog and upstream parent registry align for the four #6998 entries.
- **Corrected path to 100**: complete executor-owned test/typecheck/lint evidence and changelog-draft/reference evidence; add a focused positive/negative four-entry, stale-removal, parity, and Zen-isolation regression test; optionally rewrite the stale explanatory comment. Do not add the withdrawn IDs.

### New independent current-source review — 2026-08-13

- **Reviewer**: Independent Reviewer — Task 0164 (`agent::ses_002766470ffe07kMC2GhVzqnyf`); session ID `ses_002766470ffe07kMC2GhVzqnyf`; task ID `0164`.
- **Engineer/Expert IDs**: no explicit Engineer or Expert IDs are recorded in the task history; none invented.
- **Authority**: current task, root `AGENTS.md`, `docs/tasks/AGENTS.md`, Where files, repository source/tests, and fresh `opencode models --refresh`; prior reports were not used as authority.
- **Fresh source**: `/home/sephiroth/.opencode/bin/opencode`; `opencode models --refresh`; timestamp `2026-08-13T20:54:19-03:00`; complete output captured in `docs/reports/review/20260813-task-0164-independent-reviewer-sess-f2d7d4717bfab0ef.md`.
- **Current OpenCode IDs observed**: `big-pickle`, `deepseek-v4-flash-free`, `hy3-free`, `laguna-s-2.1-free`, `mimo-v2.5-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free`.
- **Verdict**: **REJECTED**.
- **Score**: **58/100** (`<90` remains in `02-doing`).
- **Report**: `docs/reports/review/20260813-task-0164-independent-reviewer-sess-f2d7d4717bfab0ef.md`.
- **Move**: **not moved**; task remains at `docs/tasks/02-doing/0164-omniroute-opencode-free-model-catalog-refresh.md`.
- **Blocking findings**: active parent registry and `provider: "opencode"` Free catalog omit verified current `laguna-s-2.1-free` and `nemotron-3.5-lightning-free` and retain `north-mini-code-free`, which the fresh refresh does not return; focused test hardcodes the dated four-entry issue snapshot; required `node --import tsx/esm --test tests/unit/opencode-*.test.ts` fails `48/54` due to unresolved `ANTIGRAVITY_BASE_URLS`; `npm run typecheck:core` fails at `open-sse/config/providers/shared.ts(718,3)`; Completion Evidence still has TODO refresh output/timestamp and lacks task-specific changelog reference.
- **Scope note**: `opencode-zen` was evaluated only for explicit isolation scope. No Zen pruning or alias changes are requested.
- **Path to 100**: reconcile parent registry and parent Free catalog to the fresh seven-ID set; update focused tests to exact current-set/parity plus six historical negative checks; make the required OpenCode glob and typecheck pass; capture real executor-owned outputs/timestamp/source and changelog reference; clearly mark the #6998 comment as historical; re-run gates and request a new independent review. Do not add unrelated model IDs or treat the dated four-entry snapshot as a permanent allowlist.

### Delta re-review — 2026-08-13

- **Reviewer**: same independent reviewer, delta-aware re-review of the current post-fix state.
- **Authority**: updated task, root `AGENTS.md`, `docs/tasks/AGENTS.md`, current Where files, source/tests, and a fresh `opencode models --refresh`; prior report used only for delta classification, not as catalog authority.
- **Fresh source**: `/home/sephiroth/.opencode/bin/opencode models --refresh`; timestamp `2026-08-13T23:44:52-03:00`; exit 0. Current parent IDs: `big-pickle`, `deepseek-v4-flash-free`, `hy3-free`, `laguna-s-2.1-free`, `mimo-v2.5-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free`.
- **Resolved**: parent registry/catalog now match the seven-ID refresh set; `north-mini-code-free` is absent; all six historical stale IDs are absent from active parent records; historical comment is clearly marked; focused contract covers exact set, parity, stale negatives, and Zen isolation; required OpenCode glob passes `127/127`; `npm run typecheck:core` exits 0; scoped ESLint exits 0.
- **Verdict**: **REJECTED**.
- **Score**: **89/100** (`<90` remains in `02-doing`).
- **Report**: `docs/reports/review/20260813-task-0164-independent-rereview.md`.
- **Move**: **not moved**; task remains in `docs/tasks/02-doing/`.
- **Remaining blocker**: Completion Evidence has a Changelog Draft and the technical command evidence, but does not contain the constitution-required canonical `.changelog/<entry>.md` reference plus real rebuild evidence. The draft explicitly defers canonical entry creation/rebuild, so the changelog Exit Condition is not fully proved for promotion.
- **Path to 100**: create the canonical task changelog entry through the parent-owned process, perform the required rebuild, record the entry path and real rebuild result in Completion Evidence, then rerun the required gates and request promotion. No catalog, stale-ID, Zen, or unrelated-provider change is required.

### Final independent review — 2026-08-14

- **Reviewer**: `BUILDER_CONTEXT`, agent ID `builders` (parent lane)
- **Authority**: live `/home/sephiroth/.opencode/bin/opencode models --refresh`, current source/tests, canonical `.changelog` entry, generated changelog index, and fresh required gates.
- **Verdict**: **APPROVED**
- **Score**: **100/100**
- **Report**: `docs/reports/review/20260814-task-0164-final-review.md`
- **Promotion**: task moved from `docs/tasks/02-doing/` to `docs/tasks/03-review/`.
- **Fresh verification**: live refresh exit 0 with the exact seven current OpenCode IDs; focused contract 25/25; OpenCode glob 127/127; `npm run typecheck:core` exit 0; scoped ESLint exit 0 with no output.
- **Changelog closure**: `.changelog/20260814-115219-0164-refresh-opencode-free-model-catalog-from-live-cli-builders.md` exists with valid frontmatter and required sections, is indexed, and is present in generated `CHANGELOG.md` after the parent-recorded rebuild (70 entries, exit 0).
- **Findings**: no remaining blocking, non-blocking, regression, or evidence-gap findings within Task 0164 scope.
