# Independent Review — Task 0174: AIHubMix Provider Connector

**Reviewer:** `builders` (independent review, parent lane)
**Date:** 2026-08-15
**Verdict:** REJECTED / remains in `02-doing` (initial review; superseded by delta re-review)
**Score:** **86/100**

> **Lineage update (2026-08-15):** This initial report is superseded by the delta-aware re-review at `docs/reports/review/20260815-task-0174-rereview.md`, which independently verified all three prior findings resolved and awarded **100/100 APPROVED**. The task was promoted to `docs/tasks/03-review/0174-omniroute-aihubmix-provider-connector.md`. The initial 86/100 result remains the historical pre-fix score.

## Scope and evidence

Reviewed the Task 0174 specification and completion evidence, then independently inspected the provider constants, Open-SSE registry, model catalog, dynamic models route, unit tests, and canonical changelog. The review was performed without editing application source code.

## Verification objectives

| Objective | Result | Evidence |
|---|---:|---|
| `aihubmix` gateway registration | PASS | `src/shared/constants/providers/apikey/gateways.ts` contains the required id, alias, metadata, `passthroughModels: true`, and `hasFree: true`. |
| Aggregator classification | PASS | `src/shared/constants/providers.ts` includes `"aihubmix"` in `AGGREGATOR_PROVIDER_IDS`. |
| Provider endpoint | PASS | `src/shared/constants/config.ts` maps `aihubmix` to `https://aihubmix.com/v1/chat/completions`. |
| Open-SSE registry | PASS | `open-sse/config/providers/registry/aihubmix/index.ts` uses `DefaultExecutor` (`executor: "default"`), `format: "openai"`, `authType: "apikey"`, bearer auth, and `https://aihubmix.com/v1`. It is imported and registered in `open-sse/config/providers/index.ts`. |
| Four initial free models | PASS | Registry contains exactly `coding-kimi-k3-free`, `coding-glm-5.2-free`, `gemini-3.7-flash-free`, and `gemini-3.5-flash-lite-free` with the expected tool-calling/reasoning/vision flags. The free model catalog also contains all four. |
| Named OpenAI-style provider | PASS | `NAMED_OPENAI_STYLE_PROVIDERS` includes `"aihubmix"`; live `/v1/models` discovery and local fallback are covered. |
| Required unit tests | PASS | `node --import tsx/esm --test tests/unit/aihubmix-provider.test.ts tests/unit/providers-constants-split.test.ts`: **12 passed, 0 failed**. No live network request was made; fetch was mocked. |
| Core typecheck | PASS | `npm run typecheck:core` exited successfully. |
| Scoped lint | PASS | Direct scoped `npx eslint --no-warn-ignored` over all Task 0174 files exited successfully with no diagnostics. The task's broader `npm run lint -- ...` invocation exceeded 120 seconds, but the direct scoped command completed successfully. |
| Canonical changelog | PARTIAL | `.changelog/20260814-235246-0174-add-aihubmix-provider-connector-builders.md` exists and the task Completion Evidence names that exact path. However, the changelog itself still contains `- [ ] Relevant tests/build/lint commands executed and captured in task evidence.` |

## Findings

### 1. Completion evidence is contradicted by the provider consistency check (MEDIUM)

The task Completion Evidence claims `scripts/check/check-provider-consistency.ts` passed with zero orphans. Independent execution of the listed checker (`npx tsx scripts/check/check-provider-consistency.ts`) failed:

```text
[provider-consistency] 1 entrada(s) no REGISTRY sem provider canônico em providers.ts:
  ✗ fb
```

This is not an AIHubMix registration failure—the checker identifies the separate `fb` registry alias—but it means the recorded evidence is not reproducible as written. The failure must either be fixed/justified in the consistency checker or explicitly classified as a pre-existing unrelated blocker, with fresh output captured in the task evidence.

### 2. Canonical changelog verification checkbox remains open (MEDIUM)

The canonical changelog draft exists and is referenced by the task, but its own verification section still says the relevant commands have not been executed/captured. This is inconsistent with the task's claimed PASS evidence and prevents a 100/100 promotion until the changelog is refreshed with the actual verification state.

### 3. Review Trail is still a placeholder (MEDIUM)

The task file's Review Trail remains `[nome/role]`, `[YYYY-MM-DD]`, `[APROVADO / REJEITADO]`, and `[0-100]`. This review must be recorded there before the task can leave the builder lane. Per the promotion rules, the task remains in `02-doing` because the score is below 90.

## Quality assessment

The implementation itself is structurally sound for the stated connector scope: provider metadata is schema-valid, the registry is wired through the canonical provider registry, the default executor receives the expected URL and bearer header, and discovery/fallback behavior is tested without external network calls. The score reduction is evidence/governance-based, not a finding that the AIHubMix code path is functionally broken.

## Path-to-100 matrix

| Priority | Required action | Acceptance evidence |
|---|---|---|
| P0 | Reconcile the provider consistency-check result. Fix the unrelated `fb` orphan or document an approved `KNOWN_REGISTRY_ONLY` exception and rerun the checker. | Fresh command output showing zero unexplained orphans, or an explicit approved exception with rationale. |
| P0 | Update the canonical changelog verification section. | Changelog checkbox is checked only after the command outputs are captured or linked from task evidence. |
| P0 | Replace the task Review Trail placeholders with this reviewer identity, date, rejected verdict, score, and evidence summary. | Task file contains a complete review ledger entry. |
| P1 | If the broad `npm run lint -- ...` command is required by project policy, rerun it with an adequate timeout and capture the result; retain the direct scoped ESLint output as supplemental evidence. | Fresh exit-0 output or a documented reason why scoped lint is authoritative. |

## Final decision

**86/100 — REJECTED for promotion.** The AIHubMix connector objectives and targeted tests pass, but the contradictory consistency-check evidence, unchecked canonical changelog verification, and placeholder Review Trail prevent promotion. The task must remain at:

`docs/tasks/02-doing/0174-omniroute-aihubmix-provider-connector.md`
