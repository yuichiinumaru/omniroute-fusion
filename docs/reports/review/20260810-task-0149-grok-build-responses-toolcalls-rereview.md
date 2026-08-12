# Re-review Report: Task 0149 — Grok Build Responses and tool-call compatibility — 2026-08-10

## Review Lineage

- **Current task**: Task 0149 (`0149-omniroute-grok-build-responses-toolcalls`); live path `docs/tasks/02-doing/0149-omniroute-grok-build-responses-toolcalls.md`.
- **Previous report read**: `docs/reports/review/20260809-task-0149-grok-build-responses-toolcalls-review.md` — `84/100`, `REJECTED_TO_DOING`; seven evidence gaps were opened.
- **Review mode**: `re-review`, `BUILDER_CONTEXT`, fresh independent reviewer under parent agentID `builders`.
- **Required scope inspected**: task, closure matrix/fixer evidence, all current Where-table files, OpenAI Responses translator, chatCore target-format and executor wiring, BaseExecutor cancellation/error path, upstream reference files, and live tests. No live provider/OAuth call, `:22000`, `:23456`, git, tasklist-sync, changelog rebuild, references edits, Task 0151 files, or profile folders were used/changed.
- **Active subproject**: `cybernetics-core/omniroute-2`.

## Score And Verdict

- **Score**: **100/100**
- **Local implementation**: **100/100**
- **Runtime enforcement**: **100/100**
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `promote-to-03-review`
- **Move result**: `02-doing` → `03-review` performed after fresh evidence and ledger update.

The prior seven findings are resolved in the live filesystem, not merely claimed in prose. The implementation remains aligned with the upstream config/registry reference (both current files have identical SHA-256 values to their corresponding reference files), and the new production-path and executor-level tests are regression-sensitive.

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` F1 — Task 0149 now contains a complete unpublished Changelog Draft with task, agent, project/type, title, description, summary, and verification fields. The task's append-only `.changelog` condition correctly remains unchecked because publication/rebuild is parent-owned and explicitly excluded by this review instruction.
- `RESOLVED` F2 — `tests/unit/grok-cli-responses.test.ts` now exercises a normal OpenAI Chat request with tools through `handleChatCore`, registry target-format resolution, canonical OpenAI→Responses translation, `resolveExecutorWithProxy`/registered `getExecutor("grok-cli")`, `GrokCliExecutor.execute()`, and mocked `/v1/responses` dispatch. Assertions cover Responses `input`, tools, model, defaults, headers, and executor identity.
- `RESOLVED` F3 — committed tests now cover already-aborted caller signal propagation through `GrokCliExecutor.execute()` with one fetch and no retry, plus mocked upstream HTTP 500 status/error-body behavior without token leakage.
- `RESOLVED` F4 — `tests/unit/grok-cli-strip-params.test.ts` asserts all listed camelCase and snake_case unsupported fields (`presencePenalty`, `frequencyPenalty`, `logprobs`, `topLogprobs`, `presence_penalty`, `frequency_penalty`, `top_logprobs`, `reasoning_effort`) are stripped while messages, tools, and supported parameters survive.
- `RESOLVED` F5 — task evidence now contains a replayable P1 sabotage matrix. Fresh live sabotage runs were independently executed for registry target-format resolution and parameter stripping; each deliberately broke the path, produced a failing test, restored the exact implementation, and produced a passing restoration run.
- `RESOLVED` F6 — task evidence now explicitly records OpenAI Chat Completions input and OpenAI Responses target dispatch as tested, and Anthropic as intentionally out of scope because no Anthropic transport/translator was changed.
- `RESOLVED` F7 — focused lint, Prettier, typecheck, and fresh disposable-data test evidence is current. Broad `npm run lint` was rerun and remains exit 1 because seven errors are in unrelated `visual-reference` files; the task-owned focused ESLint remains exit 0. This is correctly classified as external pre-existing repository debt rather than a Task 0149 failure.

### Persistent Findings

- None.

### Regressions

- None identified. The target-format sabotage was restored and the final focused suite passed.

### New Findings

- None.

### Evidence Gaps / External Blockers

- `EXTERNAL_BLOCKER` — no live Grok/xAI provider or OAuth validation was performed by design; the task's anti-hallucination guardrail forbids it. Mocked runtime integration is the accepted evidence boundary for this task.
- `EVIDENCE_GAP` — none remaining for the scoped Task 0149 contract. The repository-wide public-credentials scanner remains red on eight pre-existing MCP principal literals outside the Task 0149 files; no Task 0149 credential literal was introduced.

## Findings

| ID | Lineage class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | `RESOLVED` | High | Closed | Changelog Draft and correct parent-owned publication boundary are documented. | Task Completion Evidence / Changelog Draft; changelog exit remains `[ ]` by design. |
| F2 | `RESOLVED` | High | Closed | Production-path Chat → Responses → registered Grok executor dispatch is tested. | `tests/unit/grok-cli-responses.test.ts` production-path regression; `open-sse/handlers/chatCore/targetFormat.ts`; `open-sse/translator/request/openai-responses.ts`; `open-sse/executors/index.ts`. |
| F3 | `RESOLVED` | High | Closed | Abort and HTTP 500 execute-level tests are committed and passing. | `tests/unit/grok-cli-responses.test.ts` execute tests; `open-sse/executors/base.ts` execute path. |
| F4 | `RESOLVED` | Medium | Closed | Snake_case stripping is asserted, including supported-content preservation. | `tests/unit/grok-cli-strip-params.test.ts`; `open-sse/executors/grok-cli.ts`. |
| F5 | `RESOLVED` | High | Closed | P1 sabotage proof is replayable and was independently rerun. | Sabotage matrix in task; live target-format mutation: 12 pass/2 fail, restoration 14/14; live stripping mutation: 1 pass/1 fail, restoration 2/2. |
| F6 | `RESOLVED` | Medium | Closed | Provider compatibility matrix and Anthropic rationale are present. | Task Provider Compatibility Matrix. |
| F7 | `RESOLVED` | Medium | Closed | Broad lint is accurately classified; focused task lint is green. | Fresh `npm run lint` exit 1: 7 unrelated errors/4099 warnings; focused ESLint exit 0. |

## Implementation And Runtime Audit

### Production chain

`/v1/chat/completions` request → `handleChatCore` → `resolveChatCoreTargetFormat` resolves registry `targetFormat: "openai-responses"` → `translateRequest` routes `openai` to `openai-responses` → `openaiToOpenAIResponsesRequest` builds `input`/function tools → `resolveExecutorWithProxy` in native mode → `getExecutor("grok-cli")` returns registered `GrokCliExecutor` → `GrokCliExecutor.execute()` inherits BaseExecutor signal/transport behavior, overrides `/v1/responses`, Grok headers, and sanitization → mocked fetch observes the Responses request.

The committed production-path test would fail if the registry target format, canonical translator registration, Grok executor registry mapping, or executor URL override were removed. Its negative assertions distinguish the generic registry Chat base URL from the specialized Grok Responses URL.

### Local implementation

- `open-sse/config/grokBuild.ts` centralizes endpoint, model, client-version, headers, OAuth, and Responses defaults.
- `open-sse/executors/grok-cli.ts` preserves BaseExecutor ownership of transport, abort, retry, and response handling while adding Grok-specific URL/header/body normalization, tool cap, reasoning normalization, snake/camel stripping, output sanitization, and token redaction.
- Function output sanitization is total (`string` output), preserves valid surrogate pairs, replaces lone surrogates, repairs incomplete unicode escapes, bounds nested arrays, and guards fallback serialization.
- Registry models `grok-4.5` and `grok-composer-2.5-fast` are Responses-targeted and match the current reference files byte-for-byte.

### Runtime enforcement / compatibility

- OpenAI Chat Completions input: tested through the production-path regression.
- OpenAI Responses target: tested through target-format resolution and mocked `/v1/responses` dispatch.
- Anthropic: intentionally excluded; no Anthropic path is touched by this provider-specific change.
- Abort/cancellation: BaseExecutor receives the caller signal; committed test observes one aborted dispatch and no retry.
- Upstream failure: committed mocked HTTP 500 test preserves status and checks error-body token absence.
- Live provider/OAuth: intentionally excluded, with no paid or credential-bearing call.

## Verification Matrix

| Gate | Command / evidence | Exit | Classification | Result |
| --- | --- | ---: | --- | --- |
| Fresh focused Grok suite | `d=$(mktemp -d); DATA_DIR="$d" DISABLE_SQLITE_AUTO_BACKUP=true node --import tsx/esm --test tests/unit/grok-cli-responses.test.ts tests/unit/grok-cli-tool-output-sanitization.test.ts tests/unit/grok-cli-strip-params.test.ts tests/unit/grok-cli-oauth.test.ts` | 0 | temp-fixture integration | 36 passed, 0 failed; fresh disposable directories used for separate runs. |
| Fresh responses production-path file | `DATA_DIR=$(mktemp -d) ... --test tests/unit/grok-cli-responses.test.ts` | 0 | runtime integration with mocked transport | 14 passed, 0 failed. |
| Fresh sanitizer file | `DATA_DIR=$(mktemp -d) ... --test tests/unit/grok-cli-tool-output-sanitization.test.ts` | 0 | temp-fixture integration | 10 passed, 0 failed. |
| Fresh parameter file | `DATA_DIR=$(mktemp -d) ... --test tests/unit/grok-cli-strip-params.test.ts` | 0 | temp-fixture integration | 2 passed, 0 failed. |
| Fresh OAuth regression | `DATA_DIR=$(mktemp -d) ... --test tests/unit/grok-cli-oauth.test.ts` | 0 | fixture/unit | 10 passed, 0 failed. |
| Responses regression | `node --import tsx/esm --test tests/unit/*responses*.test.ts` | 0 | mixed unit/temp-fixture integration | 233 passed, 0 failed. |
| Base/Responses regression | `node --import tsx/esm --test tests/unit/executor-base-utils.test.ts tests/unit/base-executor-sanitize-effort.test.ts 'tests/unit/responses-input-sanitizer*.test.ts' tests/unit/openai-responses*.test.ts` | 0 | mixed unit/temp-fixture integration | 76 passed, 0 failed. |
| Focused ESLint | `npx eslint` across all Task 0149 code/test files | 0 | static analysis | 0 errors. |
| Prettier | `npx prettier --check` across all Task 0149 code/test files | 0 | static analysis | all matched files formatted. |
| Core typecheck | `npm run typecheck:core` | 0 | TypeScript package gate | no errors. |
| Broad lint | `npm run lint` | 1 | unrelated repo debt | 7 errors and 4099 warnings; errors are in `visual-reference/`, not Task 0149. Command was rerun with 300s timeout. |
| Public credentials scan | `npm run check:public-creds` | 1 | unrelated repo debt | 8 pre-existing MCP principal literals; no Task 0149 literal identified. |
| Sabotage 1 | Mutated Grok `grok-4.5` registry target format to `openai`; ran `DATA_DIR=$(mktemp -d) ... --test tests/unit/grok-cli-responses.test.ts` | 1 | replayable P1 sabotage | 12 passed/2 failed: registry metadata and production-path `input` assertions failed. |
| Sabotage 1 restore | Restored `targetFormat: "openai-responses"`; same production-path command | 0 | restoration proof | 14 passed/0 failed. |
| Sabotage 2 | Replaced `stripUnsupportedGrokBuildParams` with a no-op; ran fresh parameter test | 1 | replayable P1 sabotage | 1 passed/1 failed: unsupported `presencePenalty` assertion failed. |
| Sabotage 2 restore | Restored deletion loop; same parameter command | 0 | restoration proof | 2 passed/0 failed. |
| Reference parity | `sha256sum` current/reference `grokBuild.ts` and registry | 0 | canonical-source parity | both pairs identical. |

## Verification Gate Classification

- **Task shape**: `runtime-behavior` / provider-routing compatibility, not helper-only.
- **Local validation**: focused Grok tests, sanitizer/parameter/OAuth regression tests, Responses/BaseExecutor suites, focused ESLint, Prettier, and core typecheck.
- **Runtime wiring validation**: mocked production-path regression from Chat input through target format, translator, registered executor, and `/v1/responses` transport; execute-level abort/500 tests.
- **Scoped exclusions**: live Grok/xAI/OAuth calls, `:22000`, `:23456`, tasklist/changelog rebuild, git, reference edits, Task 0151, and profile writes excluded by explicit instruction/guardrails.
- **Deferred/unwired claims**: none within Task 0149's mocked/local contract. Real-provider behavior remains unverified by design and is not represented as a product pass.

## Sabotage Gate

**PASS** — two critical P1 paths were deliberately broken, each required test failed, the exact implementation was restored, and restoration tests passed. The evidence is now independently replayable rather than prose-only.

## Path To 100

No remaining Task-0149 path-to-100 items. Parent-owned follow-up after promotion: publish the append-only changelog entry and rebuild generated changelog surfaces only in the appropriate parent closeout wave; do not treat that as an implementation/re-review blocker for this instruction-scoped review.

## Task Ledger Patch Applied

The task ledger was refreshed to this re-review, recorded all seven prior findings as `RESOLVED`, linked this report, retained the prior report in `Previous Reports`, and recorded the two fresh sabotage restoration proofs. The task was then moved from `docs/tasks/02-doing/` to `docs/tasks/03-review/` as required for an exact `100/100` BUILDER_CONTEXT result. No move to `04-completed/` was performed.

## Final Proof Matrix

| Dimension | Proof | Verdict |
| --- | --- | --- |
| Grok endpoint | Shared config, reference parity, executor override, fresh mocked dispatch | Pass |
| Chat → Responses translation | Fresh production-path test and 233-response regression suite | Pass |
| Registered executor dispatch | `getExecutor("grok-cli") instanceof GrokCliExecutor` plus fetch observation | Pass |
| Tool/output sanitization | 10 fresh sanitizer tests including Unicode, malformed/circular/deep values | Pass |
| Parameters | 2 fresh tests cover camelCase and snake_case stripping/preservation | Pass |
| Reasoning/tool cap/headers | Fresh Responses tests pass; reference config parity pass | Pass |
| Abort/errors | Fresh execute abort and HTTP 500 tests pass | Pass |
| Compatibility | OpenAI Chat/Responses tested; Anthropic explicitly scoped out | Pass |
| Sabotage | Two live mutations failed and exact restorations passed | Pass |
| Fresh disposable evidence | Four files each run in fresh `mktemp` DATA_DIRs | Pass |
| Broad lint classification | Fresh broad run correctly attributed to unrelated `visual-reference` debt | Pass with external debt |
| Governance | Changelog Draft, lineage report, compact ledger, correct 02→03 move | Pass |

## Residual Risk

- Real xAI/Grok endpoint/auth/streaming behavior was not exercised by design. This is an explicit evidence boundary, not a hidden acceptance claim.
- Repository-wide pre-existing lint/public-credentials debt remains outside Task 0149 ownership.
