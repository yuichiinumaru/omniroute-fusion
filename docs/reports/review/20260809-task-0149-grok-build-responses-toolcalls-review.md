# Review Report: Task 0149 — Grok Build Responses and tool-call compatibility — 2026-08-09

## Review Lineage

- **Current task**: Task 0149 (`0149-omniroute-grok-build-responses-toolcalls`); live path `docs/tasks/02-doing/0149-omniroute-grok-build-responses-toolcalls.md`.
- **Previous reports read**: None found for Task 0149 under `docs/reports/` or `docs/reports/review/`.
- **Related reports considered**: `docs/reports/audits/omniroute-upstream-releases.md` — upstream history for Grok Build endpoint/tool-output changes; `.changelog/20260808-013331-0148,0149,0151-cursor-grok-provider-compatibility-tasks-gt-task-architect.md` — task-origin entry only, not an implementation closeout.
- **Review mode**: `initial`, `BUILDER_CONTEXT`, independent reviewer under parent agentID `builders`.
- **Scope**: live task/evidence, all task Where-table files, expert-polish claims, upstream reference comparison, Responses translation, BaseExecutor and chatCore wiring, model metadata, sanitization, cancellation/error behavior, tests, sabotage evidence, and stale governance evidence. No live provider call, `:22000`, or `:23456` was used.

## Agent Onboarding / Governance Context

- Active subproject: `cybernetics-core/omniroute-2`.
- Loaded `code-quality`, `tsjs`, and the requested onboarding/review workflows.
- The task-specific OmniRoute DoD reference is stale/inconsistent: `docs/tasks/AGENTS.md` points at `.agents/rules/definition-of-done-omniroute.md`, while the live repository has no file at that path and the parent DoD points to a project-root overlay that is also absent. I therefore used the live task’s npm exit matrix and did not apply cargo exits.
- No git, tasklist-sync, changelog rebuild/manage-changelog, root CHANGELOG edit, reference edit, provider call, or profile-folder write was performed.

## Score And Verdict

- **Score**: **84/100**
- **Local implementation**: **95/100** — the implementation is substantially aligned with the upstream reference and focused behavior is green.
- **Runtime enforcement / production proof**: **78/100** — executor and registry wiring exist and a reviewer-owned mocked executor probe reached `/v1/responses`, but the repository lacks a production-path regression test proving the OpenAI Chat Completions input → model target-format resolution → canonical OpenAI→Responses translator → `GrokCliExecutor.execute()` chain as one provider-specific flow.
- **Verdict**: `REJECTED_TO_DOING`
- **Lane recommendation**: `remain-in-doing`
- **Move result**: **No move performed.** Score is below 90; Task 0149 remains in `docs/tasks/02-doing/` as required.

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED`: No prior Task 0149 review exists. The live implementation does contain the claimed expert-polish repairs: string-total output sanitization, pair-aware surrogate handling, bounded nested-array handling, guarded fallback serialization, and credential redaction.
- `RESOLVED`: Fork/reference SHA comparison is identical for `open-sse/config/grokBuild.ts` and `open-sse/config/providers/registry/grok-cli/index.ts`.

### Persistent Findings

- None; this is the first independent review.

### Regressions

- None identified relative to the task’s stated implementation baseline.

### New Findings

- `NEW` / `EVIDENCE_GAP`: completion evidence does not include a Task-0149 Changelog Draft or a valid `.changelog` implementation entry, and the relevant exit condition is still unchecked.
- `NEW` / `EVIDENCE_GAP`: no repository test covers Grok-specific end-to-end translation and dispatch wiring from a standard OpenAI tool request.
- `NEW` / `EVIDENCE_GAP`: claimed Grok-specific abort and upstream-error tests are absent; the focused test files contain refresh-error tests, but no `GrokCliExecutor.execute()` abort or HTTP-failure assertions.
- `NEW` / `EVIDENCE_GAP`: snake_case parameter stripping is implemented but not regression-tested; the test only exercises camelCase names.
- `NEW` / `EVIDENCE_GAP`: the claimed sabotage fail→pass evidence exists only as prose in the task file. No reproducible sabotage command/output artifact is linked or preserved, so the P1 sabotage gate cannot be independently replayed from live evidence.
- `NEW` / `EVIDENCE_GAP`: provider-compatibility evidence does not explicitly state the OpenAI Chat Completions and OpenAI Responses surfaces tested, nor document Anthropic as intentionally out of scope with rationale.
- `NEW` / `EVIDENCE_GAP`: the worker records a focused ESLint command as passing, but the task exit names `npm run lint`; the live full lint command fails on seven unrelated `visual-reference` errors and reports 4,099 warnings. This is likely repository debt rather than a Task-0149 code failure, but it prevents an unqualified full-lint pass claim.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: focused imports initialize SQLite against the default user data path in the live run (`/home/sephiroth/.omniroute/storage.sqlite`), so those runs are not `pure import-isolated` evidence. A later fixed disposable `DATA_DIR` run exited 0 but emitted a migration `UNIQUE constraint failed` diagnostic because the same scratch directory was reused; use a fresh disposable directory for final proof.
- `EXTERNAL_BLOCKER`: none. Live provider validation was intentionally excluded by the task guardrail, not treated as a blocker.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW / EVIDENCE_GAP | High | Open | Changelog closeout is explicitly deferred and the task’s changelog exit remains `[ ]`; no Task-0149 Changelog Draft is present. | 2026-08-09 | `docs/tasks/02-doing/0149-omniroute-grok-build-responses-toolcalls.md:96-98,213` |
| F2 | NEW / EVIDENCE_GAP | High | Open | Missing provider-specific production-path regression test for Chat input → Responses translation → Grok executor dispatch. | 2026-08-09 | `open-sse/handlers/chatCore.ts:642-650,2240-2269`; tests only instantiate `GrokCliExecutor` directly. |
| F3 | NEW / EVIDENCE_GAP | High | Open | Focused test suite does not cover `execute()` abort propagation or mocked upstream HTTP failure behavior despite the task requirement. | 2026-08-09 | `tests/unit/grok-cli-responses.test.ts:156-216`; no execute/abort/error test; BaseExecutor path `open-sse/executors/base.ts:885-1497`. |
| F4 | NEW / EVIDENCE_GAP | Medium | Open | Snake_case unsupported parameter names are in production stripping but absent from the regression assertions. | 2026-08-09 | `open-sse/executors/grok-cli.ts:43-52,218-221`; `tests/unit/grok-cli-strip-params.test.ts:9-39` only lists camelCase. |
| F5 | NEW / EVIDENCE_GAP | High | Open | P1 sabotage evidence is not independently reproducible from a command/log artifact; prose claims three mutations were run. | 2026-08-09 | `docs/tasks/02-doing/0149-omniroute-grok-build-responses-toolcalls.md:262-269` |
| F6 | NEW / EVIDENCE_GAP | Medium | Open | Compatibility matrix and Anthropic out-of-scope rationale are not recorded. | 2026-08-09 | Task completion evidence `:190-215`; no explicit Chat/Responses/Anthropic matrix. |
| F7 | NEW / EVIDENCE_GAP | Medium | Open | Full `npm run lint` is not green; focused lint is green, but evidence does not distinguish task-owned errors from unrelated visual-reference errors. | 2026-08-09 | `npm run lint` exit 1: seven errors in `visual-reference`, 4,099 warnings; focused ESLint exit 0. |

## Implementation Audit

### Responses endpoint and translation

- `GrokCliExecutor.buildUrl()` unconditionally returns `GROK_BUILD_RESPONSES_URL`, which is `https://cli-chat-proxy.grok.com/v1/responses` (`open-sse/executors/grok-cli.ts:285-292`, `open-sse/config/grokBuild.ts:3-5`).
- The standard OpenAI→Responses translator converts messages, tools, tool calls, tool outputs, tool choice, reasoning, token limits, and stream/store defaults (`open-sse/translator/request/openai-responses.ts:575-894`). A direct reviewer probe produced Responses-shaped `input` and function tool definitions without XML assumptions.
- The model registry marks both `grok-4.5` and `grok-composer-2.5-fast` as `targetFormat: "openai-responses"` (`open-sse/config/providers/registry/grok-cli/index.ts:22-40`). `resolveChatCoreTargetFormat()` gives model metadata priority (`open-sse/handlers/chatCore/targetFormat.ts:24-31`).
- The response translator handles Responses output items, reasoning summaries, function calls, usage, and streaming lifecycle events (`open-sse/handlers/responseTranslator.ts:144-299`; `open-sse/handlers/chatCore.ts:4171-4197`). Existing generic Responses suites passed, but no Grok-specific route regression joins these pieces.

### BaseExecutor wiring, abort, retries, and errors

- `getExecutor()` registers `grok-cli` and `gc` to `GrokCliExecutor` (`open-sse/executors/index.ts:151-153`), and `open-sse/config/providers/index.ts:346` registers the provider.
- `chatCore` forwards the resolved target, prepared body, request signal, headers, credentials, refresh callback, and timeout options into `executor.execute()` (`open-sse/handlers/chatCore.ts:2152-2269`).
- `BaseExecutor.execute()` owns start timeout, fetch, fallback/retry, and response return (`open-sse/executors/base.ts:885-1497`). A reviewer-owned mock showed an already-aborted signal reached the mocked fetch and rejected with `Error: review abort`, one call, without a provider call. This is supporting evidence only; it is not a committed regression test.
- A mocked HTTP 500 returned through BaseExecutor as a `500` response with a sanitized JSON-serializable body path; chatCore’s client-facing failure path uses `buildErrorBody()` (`open-sse/handlers/chatCore.ts:2767-2817,3267-3507`). The task-specific suite does not assert this behavior.
- `refreshGrokBuildCredentialsOnce()` uses its own 15-second timeout and the refresh method has no caller signal parameter (`open-sse/executors/grok-cli.ts:224-277`). This follows the existing BaseExecutor refresh interface, but cancellation during proactive token refresh is not directly proven by Task 0149 tests and remains a residual lifecycle risk.

### Model metadata and provider compatibility

- The fork and reference config/registry files have identical SHA-256 values. The current registry includes `grok-4.5`, `grok-composer-2.5-fast`, Responses target format, reasoning/tool capability flags, context lengths, current client version, model URL, and OAuth token URL.
- Public OAuth client ID resolution uses `resolvePublicCred("grok_id", "GROK_OAUTH_CLIENT_ID")` (`open-sse/config/providers/registry/grok-cli/index.ts:42-46`, `open-sse/executors/grok-cli.ts:303-309`).
- OpenAI Chat Completions compatibility is the public input contract and OpenAI Responses is the Grok upstream target. Existing generic translator/Responses suites cover those formats; Task 0149 does not record a provider matrix. Anthropic is intentionally out of scope for this provider task because the implementation targets xAI’s OpenAI Responses contract and adds no Anthropic transport/translation behavior; that rationale must be written into the task evidence rather than inferred by the reviewer.

### Parameter, tool, output, and input sanitization

- Unsupported camelCase and snake_case fields are removed at the executor boundary (`open-sse/executors/grok-cli.ts:43-52,218-221`). Supported body content is cloned by BaseExecutor and retained.
- Tools are capped to the first 200 entries (`open-sse/executors/grok-cli.ts:386-389`), and the focused cap test proves deterministic first-item retention.
- Reasoning is limited to `low|medium|high`; `grok-4.5` receives the default only when effort was not explicitly supplied, while Composer removes effort (`:201-216`). The focused tests cover explicit low/medium/high, unsupported xhigh, and model-specific behavior.
- `function_call_output.output` sanitization is robust against malformed JSON text, incomplete unicode escapes, lone surrogates, functions/symbols/undefined, circular/unserializable values, valid surrogate pairs, and very deep arrays (`:68-150`). The 10 sanitizer tests passed and the source/reference implementation difference is intentional polish.
- Inputs are bounded by a depth ceiling of 32 before fallback serialization (`:81-96`). The fallback is guarded against a second stack overflow (`:105-120`).

### Secret redaction

- Session headers intentionally carry the bearer token to the upstream request, but tests assert only that test credentials are not emitted as diagnostic header metadata. The OAuth refresh catch path replaces exact access/refresh token values before logging (`:169-176,267-275`), and the focused redaction test injects exact markers and passes.
- No literal client ID was introduced in the reviewed provider surfaces. The repository-wide public-creds checker still fails on pre-existing MCP principal literals unrelated to Task 0149; this is recorded as unrelated repo debt, not a Task-0149 implementation finding.

## Verification / Sabotage Proof Matrix

| Gate | Command / evidence | Exit | Classification | Result |
| --- | --- | ---: | --- | --- |
| Focused Grok tests | `node --import tsx/esm --test tests/unit/grok-cli-responses.test.ts tests/unit/grok-cli-tool-output-sanitization.test.ts tests/unit/grok-cli-strip-params.test.ts tests/unit/grok-cli-oauth.test.ts` | 0 | fixture/unit with import-time SQLite side effects | 33 passed, 0 failed |
| Responses regression | `node --import tsx/esm --test tests/unit/*responses*.test.ts` | 0 | mixed unit/temp-fixture integration | 230 passed, 0 failed |
| Base/Responses regression | `node --import tsx/esm --test tests/unit/executor-base-utils.test.ts tests/unit/base-executor-sanitize-effort.test.ts tests/unit/responses-input-sanitizer*.test.ts tests/unit/openai-responses*.test.ts` | 0 | mixed unit/temp-fixture integration | 76 passed, 0 failed |
| Focused ESLint | `npx eslint` over all Task-0149 changed/test files | 0 | static analysis | 0 errors |
| Prettier | `npx prettier --check` over all Task-0149 changed/test files | 0 | static analysis | all matched files formatted |
| Core typecheck | `npm run typecheck:core` | 0 | task-surface TypeScript check | no output/errors |
| Full lint | `npm run lint` | 1 | broad repository gate | 7 unrelated `visual-reference` errors; 4,099 warnings |
| Disposable-data rerun | same focused test command with `DATA_DIR=/tmp/omniroute-task0149-review` | 0 | temp-fixture integration, but scratch dir reused | 33 passed; emitted migration UNIQUE diagnostic before tests |
| Mocked endpoint probe | reviewer-owned `GrokCliExecutor.execute()` with mocked `fetch` | 0 | synthetic/factory-only | URL `/v1/responses`, Responses body, tool and reasoning fields observed |
| Mocked abort probe | reviewer-owned pre-aborted signal with mocked `fetch` | 0 | synthetic/factory-only | one fetch attempt, `Error: review abort` observed |
| Mocked HTTP failure probe | reviewer-owned 500 `fetch` response | 0 | synthetic/factory-only | 500 response returned through BaseExecutor |
| Public credentials check | `npm run check:public-creds` | 1 | broad repository gate | 8 pre-existing MCP principal literals; no Task-0149 literal identified |
| Sabotage | worker prose says three individual mutations failed tests and were restored | n/a | unlinked/self-reported | not independently reproducible from preserved command artifacts; gate remains open |

## Path To 100

Task remains in `02-doing`; do not promote until all items below are completed and independently re-reviewed:

1. Add a Task-0149-specific mocked production-path regression test that starts with a normal OpenAI Chat Completions body containing standard function tools, resolves the Grok model metadata to `openai-responses`, runs the canonical translator, invokes the registered `grok-cli` executor, and asserts the mocked transport receives `/v1/responses` plus the expected Responses `input`/`tools` shape. The test must fail if registry `targetFormat`, translator selection, or executor registration is removed.
2. Add committed mocked `GrokCliExecutor.execute()` tests for caller abort and upstream HTTP failure/malformed response handling. Assert no retry on caller abort, sanitized client-visible error semantics, and preserved cancellation. Keep all transport local/mocked.
3. Extend the parameter test to assert every snake_case field (`presence_penalty`, `frequency_penalty`, `top_logprobs`, and any task-contract alias) is removed while messages/tools and supported fields remain.
4. Add a reproducible P1 sabotage table to the task evidence or a linked artifact. For at least two critical paths, record exact mutation, exact command, expected failure observed, restoration, and post-restoration pass. Use fresh disposable data directories for each run.
5. Add a compact provider-compatibility matrix to Completion Evidence: OpenAI Chat Completions input tested; OpenAI Responses upstream target tested; Anthropic intentionally out of scope because this task does not change the Anthropic transport/translator, with no live-provider claim.
6. Add a Task-0149 `Changelog Draft` section with exact task/agent/project/title/description/summary/verification fields. The parent may publish the append-only `.changelog` entry after reviewer acceptance; until then the task’s current unchecked changelog condition must not be represented as complete.
7. Re-run the full `npm run lint` gate and classify the seven unrelated `visual-reference` errors explicitly in the task evidence. If the repository-wide command remains red, keep the task’s lint exit scoped and unchecked rather than claiming full lint passed; the parent must resolve or formally accept that broad debt before a 100 score.
8. Re-run all task exits after the final edits, including focused tests, fresh disposable-data proof, typecheck, focused lint, full lint classification, and sabotage restoration. Update the Completion Evidence counts/timestamps and replace this report with a delta-aware 100/100 re-review.

## Task Ledger Patch Suggestion

The compact ledger appended to the task records the current rejection, report lineage, open blockers, and the exact path-to-100. It intentionally does not change the task header or lane.

## Residual Risks

- No live xAI/Grok provider call was made by design; upstream quota, auth, endpoint drift, and real streaming behavior remain unverified.
- Proactive refresh cancellation is inherited from the BaseExecutor refresh interface and is not explicitly tested for Grok.
- Focused imports can initialize SQLite; final evidence should use fresh disposable data directories and classify tests as temp-fixture integration rather than pure isolation.
- The registry `baseUrl` remains a generic Chat Completions compatibility value while `GrokCliExecutor.buildUrl()` owns the actual Responses URL. This is intentional and documented in the registry, but the missing end-to-end regression test is the guard against future executor/metadata drift.

## Final Proof Matrix

| Dimension | Proof | Verdict |
| --- | --- | --- |
| Endpoint | Source, reference SHA parity, and mocked executor probe show `/v1/responses`. | Pass |
| Translation | Canonical generic Responses tests pass; provider-specific chain test missing. | Partial / path-to-100 |
| BaseExecutor wiring | `getExecutor`, registry, chatCore signal/body/headers forwarding inspected. | Pass source; partial test proof |
| Model metadata | `grok-4.5` and Composer Responses metadata, context lengths, version, URLs match reference. | Pass |
| Tool/output sanitization | 33 focused tests include deep recursion, unicode, malformed/circular values, cap, reasoning, redaction. | Pass |
| Parameters | CamelCase stripping passes; snake_case implementation present but untested. | Partial |
| Secrets | Exact token markers redacted from refresh logs; public ID resolver used. | Pass locally |
| Abort/errors | Base path inspected and mocked probes pass; Grok execute-specific committed tests absent. | Partial |
| Compatibility scope | OpenAI surfaces are evidenced indirectly; Anthropic rationale and matrix absent. | Partial |
| Sabotage | Worker narrative exists; no independently replayable artifact. | Fail gate |
| Fresh evidence | Current focused/typecheck/format results captured; full lint fails unrelated errors; temp rerun had migration diagnostic. | Partial |
| Governance | Review report/ledger will be linked; changelog exit remains unchecked. | Fail gate |
