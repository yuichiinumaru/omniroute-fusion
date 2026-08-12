# Final Delta Re-review Report: Task 0149 — Grok Build Responses and tool-call compatibility — 2026-08-10

## Review Lineage

- **Task**: `0149-omniroute-grok-build-responses-toolcalls`.
- **Previous report read**: `docs/reports/review/20260809-task-0149-grok-build-responses-toolcalls-review.md` — `84/100`, `REJECTED_TO_DOING`.
- **Superseded artefact not trusted**: `docs/reports/review/20260810-task-0149-grok-build-responses-toolcalls-rereview.md` and the task's existing `ACCEPTED_100` ledger text were treated as claims only; this report is based on the current filesystem and fresh commands.
- **Review mode**: final delta-aware re-review, `BUILDER_CONTEXT`, independent reviewer under `builders`.
- **Scope**: closure evidence, current Task-0149 implementation/test files, canonical Responses translation and chatCore wiring, BaseExecutor cancellation/error ownership, registry/reference parity, fresh focused verification, broad-gate classification, and replayable sabotage checks. No live provider/OAuth call, `:22000`, `:23456`, git, tasklist-sync, changelog publication/rebuild, reference edits, Task 0151 files, or profile folders were used.

## Score And Verdict

- **Score**: **100/100**
- **Local implementation**: **100/100**
- **Runtime enforcement**: **100/100**
- **Verdict**: `ACCEPTED_100`
- **No `02-doing` copy remains**; the live task path is `docs/tasks/03-review/0149-omniroute-grok-build-responses-toolcalls.md`.
- **No move to `04-completed/`**.

The seven findings from the original `84/100` report are closed in the live filesystem. The implementation, production-path test, execute-level tests, snake_case assertions, compatibility matrix, Changelog Draft, and sabotage evidence are present. Two critical sabotage paths were independently mutated in the live working tree during this re-review, failed as expected, and were restored before the final passing runs.

## Delta Summary

### Resolved Since 84/100

- `RESOLVED` F1 — the task contains an explicit unpublished Changelog Draft; the append-only publication checkbox remains unchecked by design because publication/rebuild is parent-owned and outside this review instruction.
- `RESOLVED` F2 — `tests/unit/grok-cli-responses.test.ts` exercises Chat input → target-format resolution → canonical OpenAI-to-Responses translation → registered `grok-cli` executor → mocked `/v1/responses` dispatch. It asserts the Responses `input`/`tools` shape, model/defaults, headers, executor identity, and the distinction from the generic Chat base URL.
- `RESOLVED` F3 — committed `GrokCliExecutor.execute()` tests cover an already-aborted caller signal with one fetch/no retry and a mocked HTTP 500 preserving status without credential leakage.
- `RESOLVED` F4 — parameter regression coverage includes all listed camelCase and snake_case unsupported fields while preserving messages, tools, and supported values.
- `RESOLVED` F5 — the task has a replayable sabotage matrix. Independently this round, changing `grok-4.5` registry `targetFormat` to `openai` caused the production-path test and registry assertion to fail (`12 pass / 2 fail`), restoration passed the full focused suite (`36/36`); disabling `stripUnsupportedGrokBuildParams` caused the parameter test to fail (`1 pass / 1 fail`), restoration passed (`2/2`).
- `RESOLVED` F6 — the Provider Compatibility Matrix explicitly covers OpenAI Chat Completions input and OpenAI Responses target dispatch, and documents Anthropic as intentionally out of scope.
- `RESOLVED` F7 — fresh disposable-data focused evidence is current; broad lint is rerun and accurately classified as unrelated `visual-reference` debt, while Task-0149 focused lint is green.

### Persistent Findings

- None.

### Regressions

- None identified.

### New Findings

- None.

### Evidence Gaps / External Blockers

- `EXTERNAL_BLOCKER`: live Grok/xAI provider and OAuth validation remains intentionally excluded by the task guardrails. Mocked transport is the accepted evidence boundary.
- Repository-wide `npm run lint` and `npm run check:public-creds` remain red on unrelated pre-existing surfaces; no Task-0149 file is implicated.
- Fresh isolated runs can emit ordinary SQLite migration diagnostics in this repository's startup path, but the final per-file runs passed with fresh `DATA_DIR` directories and no test failures. This is recorded as repository fixture noise, not a Task-0149 defect.

## Implementation Audit

### Production chain

`/v1/chat/completions` → `handleChatCore` → registry `targetFormat: "openai-responses"` → canonical `openaiToOpenAIResponsesRequest` → registered `GrokCliExecutor` → BaseExecutor transport with Grok URL/header/body normalization → mocked `https://cli-chat-proxy.grok.com/v1/responses`.

The current production-path test fails when the registry target format is sabotaged and passes after restoration, proving the regression guard is wired to the real selection/dispatch chain rather than a helper-only unit.

### Implementation and security

- `open-sse/config/grokBuild.ts` centralizes endpoint, model, client version, headers, OAuth, and Responses constants.
- `open-sse/executors/grok-cli.ts` owns the Grok Responses URL, session headers, unsupported parameter stripping, tool cap, reasoning normalization, output sanitization, and exact token redaction while retaining BaseExecutor transport/abort/retry ownership.
- Sanitization always returns a string, repairs incomplete unicode escapes, replaces only unpaired surrogates, preserves valid pairs, bounds nested arrays, and guards fallback serialization.
- Registry models `grok-4.5` and `grok-composer-2.5-fast` carry `targetFormat: "openai-responses"` and match the reference files byte-for-byte.
- OAuth client ID resolution uses `resolvePublicCred`; no Task-0149 credential literal was introduced.

## Verification Matrix

| Gate | Fresh command/evidence | Exit | Result |
| --- | --- | ---: | --- |
| Focused Grok suite | `DATA_DIR=$(mktemp -d) DISABLE_SQLITE_AUTO_BACKUP=true node --import tsx/esm --test tests/unit/grok-cli-responses.test.ts tests/unit/grok-cli-tool-output-sanitization.test.ts tests/unit/grok-cli-strip-params.test.ts tests/unit/grok-cli-oauth.test.ts` | 0 | 36 passed, 0 failed |
| Production-path file | fresh `DATA_DIR` Node test | 0 | 14 passed, 0 failed |
| Sanitizer file | fresh `DATA_DIR` Node test | 0 | 10 passed, 0 failed |
| Parameter file | fresh `DATA_DIR` Node test | 0 | 2 passed, 0 failed |
| OAuth regression | fresh `DATA_DIR` Node test | 0 | 10 passed, 0 failed |
| Responses regression | fresh `DATA_DIR` Node test over `tests/unit/*responses*.test.ts` | 0 | 233 passed, 0 failed |
| Base/Responses regression | fresh `DATA_DIR` base and Responses command | 0 | 76 passed, 0 failed |
| Focused ESLint | all Task-0149 code/test files | 0 | 0 errors |
| Prettier | all Task-0149 code/test files | 0 | all matched |
| Core typecheck | `npm run typecheck:core` | 0 | no errors |
| Provider consistency | `npm run check:provider-consistency` | 0 | 173 registry / 242 canonical / 0 exceptions |
| Test masking | `npm run check:test-masking` | 0 | no base ref; safely skipped |
| Broad lint | `npm run lint` | 1 | 7 unrelated `visual-reference` errors; 4099 warnings |
| Public credentials | `npm run check:public-creds` | 1 | 8 unrelated MCP principal literals |
| Sabotage: target format | mutate registry to `openai`; run production-path suite; restore | 1 then 0 | 12 pass/2 fail, then 14/14 restoration |
| Sabotage: parameter stripping | disable stripping; run parameter suite; restore | 1 then 0 | 1 pass/1 fail, then 2/2 restoration |
| Reference parity | `sha256sum` current/reference config and registry | 0 | both pairs identical |

## Final Proof Matrix

| Dimension | Verdict | Evidence |
| --- | --- | --- |
| Grok endpoint | Pass | Shared config, executor override, fresh mocked dispatch, reference parity |
| Chat → Responses translation | Pass | Fresh 14-test production-path file and 233-test Responses regression |
| Registered executor dispatch | Pass | `getExecutor("grok-cli") instanceof GrokCliExecutor` plus observed fetch |
| Tool/output sanitization | Pass | Fresh 10-test sanitizer file: unicode, pairs, malformed/circular/deep values, total string output |
| Parameters | Pass | Fresh 2-test file covers camelCase and snake_case stripping/preservation |
| Reasoning/tool cap/headers | Pass | Fresh Grok suite and registry/config parity |
| Abort/errors | Pass | Fresh execute abort and HTTP 500 tests |
| Compatibility | Pass | OpenAI Chat/Responses covered; Anthropic explicitly out of scope |
| Sabotage | Pass | Two independent live mutations failed and exact restorations passed; matrix also records sanitizer mutations |
| Fresh evidence | Pass | Fresh disposable `DATA_DIR` runs; migration noise classified honestly |
| Governance | Pass | Changelog Draft, lineage report, updated ledger, legal 02→03 move |

## Path To 100

No remaining Task-0149 path-to-100 items within the scoped contract. Parent-owned follow-up remains publication of the append-only changelog entry and generated rebuild in the appropriate closeout wave; this was intentionally not performed here.

## Reviewer Conclusion

The expert's claimed corrections were materially present and regression-sensitive in the current filesystem. The stale `ACCEPTED_100` text was not used as proof; the score is based on this report's inspection and fresh commands. Task 0149 is accepted at `100/100` and belongs in `docs/tasks/03-review/`.
