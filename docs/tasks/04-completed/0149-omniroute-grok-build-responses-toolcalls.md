# Task 0149: Port Grok Build Responses and tool-call compatibility

> **Status**: `[x]` Completed — independent provider/runtime review accepted (`04-completed`)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: User report about Grok Build tool-call instability + upstream comparison (2026-08-08).
> **Blocks**: Task 0151's shared Grok Build OAuth/config integration.
> **Depends on**: —
> **Parallelism**: `serializable` — owns the shared `open-sse/config/grokBuild.ts` contract and Grok executor/registry surfaces.
> **Review routing**: independent + provider/runtime review

---

## Objective

Bring the fork's Grok Build provider to the upstream-compatible request and
response contract required for stable tool calls. The executor MUST use the
Grok Build Responses API path and normalize/sanitize tool-call payloads without
assuming an XML protocol. It MUST preserve the public OpenAI-facing contract,
including valid tool definitions, function-call outputs, reasoning controls,
streaming behavior, bounded retries, and sanitized errors.

A worker reading only this section can determine completion when mocked tests
prove that OpenAI-compatible tool calls are translated to the provider's
Responses API shape, malformed `function_call_output` payloads are repaired or
rejected safely, provider headers/model metadata are current, and the existing
Grok Build request path no longer silently relies on the stale Chat Completions
implementation.

## Background Context

### O que já existe:

- `open-sse/executors/grok-cli.ts` sends Grok Build traffic through the fork's
  Chat Completions URL and uses raw `node:https` transport.
- `open-sse/config/providers/registry/grok-cli/index.ts` registers
  `grok-build` and `grok-composer-2.5-fast` with OpenAI format metadata.
- The fork has basic parameter stripping tests and import-token tests.
- The public client contract enters through the existing OpenAI-compatible chat
  pipeline and translator.

### O que está faltando / quebrado:

- The fork lacks upstream `open-sse/config/grokBuild.ts` constants and session
  header helpers.
- The executor does not override the URL to `/v1/responses` or mark current
  models with `targetFormat: "openai-responses"`.
- The fork does not sanitize malformed `function_call_output.output` values,
  cap tools, or normalize model-specific reasoning effort.
- Current parameter stripping is incomplete compared with the upstream
  provider contract.
- The fork registry is missing the upstream `grok-4.5` metadata/model entry and
  current client version/config values.

## Test Requirements

- A request with standard OpenAI tool definitions MUST be translated to the
  expected Grok Build Responses API body without XML-specific assumptions.
- The executor MUST target `/v1/responses` for the affected Grok Build models.
- `function_call_output.output` with incomplete Unicode escapes, lone surrogates,
  invalid JSON, and valid JSON MUST be handled deterministically according to a
  documented sanitization contract.
- Unsupported camelCase/snake_case parameters MUST be removed before dispatch,
  while supported tools and messages remain intact.
- Tool definitions MUST be bounded at the provider's supported maximum.
- Reasoning effort MUST be normalized per model and explicit client values MUST
  not be silently replaced by a default.
- Session headers and model override headers MUST be generated without logging
  access or refresh tokens.
- Upstream HTTP failures, aborts, and malformed responses MUST use existing
  sanitized error handling and preserve cancellation semantics.

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do not require cargo check/test for this stack.

- [x] `open-sse/config/grokBuild.ts` (or an explicitly justified equivalent)
      centralizes verified Grok Build endpoint, client-version, header, model, and
      Responses API constants.
- [x] `open-sse/executors/grok-cli.ts` dispatches affected models to the
      Responses API and applies the documented request/tool-call normalization.
- [x] Registry metadata identifies the current Grok Build models and target
      format without inventing unsupported capabilities.
- [x] TDD tests cover endpoint selection, headers, parameter stripping,
      reasoning normalization, tool cap, function-call output sanitization, abort,
      and upstream error paths; failing-then-passing output is captured.
- [x] `node --import tsx/esm --test tests/unit/grok-cli-responses.test.ts tests/unit/grok-cli-tool-output-sanitization.test.ts tests/unit/grok-cli-strip-params.test.ts` passes with 0 failures.
- [x] Existing Grok CLI OAuth/import and executor regression tests pass.
- [x] `npm run typecheck:core` passes without errors.
- [x] `npm run lint` passes without new errors.
- [x] Mocked transport tests prove behavior without contacting production or
      requiring a live provider account.
- [x] Hard Rule #18 is satisfied through captured TDD fail→pass evidence, or a
      documented `:23456`/mock runtime proof where unit isolation is impossible.
- [ ] An append-only `.changelog/` entry is created through manage-changelog and
      `rebuild.sh build` is run; root `CHANGELOG.md` is not hand-edited.
- [x] Completion Evidence is filled with real command output before review.

## Details

### What

Subtasks:

- [x] **Ler código existente**: read `open-sse/executors/grok-cli.ts`, the Grok
      registry, BaseExecutor/translator Responses paths, current Grok tests, and
      upstream `grokBuild.ts`/executor before editing.
- [x] Establish the exact fork-to-upstream delta and confirm endpoint/header
      values from source; do not copy stale constants from prose.
- [x] Add failing tests for Responses URL, tool output repair, model-specific
      reasoning, headers, and error/cancellation behavior.
- [x] Port the shared config and executor behavior in the smallest compatible
      slice, preserving proxy/abort/error contracts.
- [x] Update registry metadata only for models and capabilities verified in the
      upstream source or current provider contract.
- [x] Run targeted tests and current Grok regression tests.
- [x] **Refactoring pass**: remove stale inline constants and avoid a second
      incompatible Grok translator; keep provider-specific behavior at the executor
      boundary.
- [x] **Verificação de regressão**: run typecheck and lint.

### Where

| Arquivo                                                                                  | Propósito                                                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `open-sse/executors/grok-cli.ts`                                                         | Modificar — Responses endpoint, headers, normalization, retry/error behavior. |
| `open-sse/config/grokBuild.ts`                                                           | Criar — verified shared provider constants/helpers.                           |
| `open-sse/config/providers/registry/grok-cli/index.ts`                                   | Modificar — current model metadata and target format.                         |
| `open-sse/executors/base.ts`                                                             | Ler — preserve transport, abort, and retry contracts.                         |
| `open-sse/translator/index.ts`                                                           | Ler — confirm existing Responses translation boundary.                        |
| `open-sse/translator/request/openai-responses.ts`                                        | Ler/modificar only if required — reuse canonical request conversion.          |
| `tests/unit/grok-cli-responses.test.ts`                                                  | Criar — endpoint/body/header contract.                                        |
| `tests/unit/grok-cli-tool-output-sanitization.test.ts`                                   | Criar — malformed function output cases.                                      |
| `tests/unit/grok-cli-strip-params.test.ts`                                               | Ler/modificar — preserve existing regressions.                                |
| `tests/unit/grok-cli-oauth.test.ts`                                                      | Ler/regression — auth token shape remains compatible.                         |
| `references/diegosouzapw-omniroute/open-sse/config/grokBuild.ts`                         | Ler — upstream constants/header reference only.                               |
| `references/diegosouzapw-omniroute/open-sse/executors/grok-cli.ts`                       | Ler — upstream executor reference only.                                       |
| `references/diegosouzapw-omniroute/open-sse/config/providers/registry/grok-cli/index.ts` | Ler — upstream model metadata reference only.                                 |

### How

1. Freeze the current fork behavior with tests and verify the upstream endpoint,
   request, and response contracts from source.
2. Add a shared config module and route only affected Grok Build models to the
   Responses API.
3. Reuse existing OpenAI→Responses translation rather than adding XML parsing.
4. Add bounded sanitization for tool outputs and explicit tests for invalid
   payloads, Unicode edge cases, aborts, and upstream errors.
5. Validate registry metadata, typecheck, lint, and regression suites.

### Why

The fork's Grok Build implementation predates the upstream Responses API and
tool-output fixes. This is a likely source of intermittent tool-call failures,
especially after client/provider protocol changes. The upstream implementation
provides an evidence-backed compatibility path and avoids speculative XML
translation.

## Parallelism / file ownership

| Class             | Detail                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------- |
| **parallel-safe** | Can run beside Cursor Task 0148.                                                            |
| **serializable**  | Task 0151 depends on the shared config/header contract established here.                    |
| **Collision**     | Owns `grok-cli.ts`, `open-sse/config/grokBuild.ts`, Grok registry, and Grok executor tests. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not introduce XML parsing without source evidence. Current upstream evidence
> uses OpenAI-compatible JSON/Responses semantics. Do not contact `localhost:22000`,
> use production credentials, or log bearer/refresh tokens. Use mocks or `:23456`.

> [!IMPORTANT]
> Read every file in the Where table before writing. Verify every endpoint,
> header, model ID, and parameter against current source. Preserve raw error
> sanitization and do not treat a successful mocked response as live provider
> validation.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: all endpoint/model/header claims verified against source.
- [x] **Zod Validation**: N/A for internal executor fields; any new API/user input requires Zod.
- [x] **Security**: no secrets committed/logged; public identifiers use `resolvePublicCred()`.
- [x] **Error Sanitization**: all provider failures use existing sanitized error helpers.
- [x] **No Raw SQL**: no database changes expected.
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/config/grokBuild.ts` (created)
  - `open-sse/config/providers/registry/grok-cli/index.ts` (modified)
  - `open-sse/executors/grok-cli.ts` (modified)
  - `tests/unit/grok-cli-responses.test.ts` (created/updated — 14 tests including production-path, abort, and HTTP 500 error tests)
  - `tests/unit/grok-cli-tool-output-sanitization.test.ts` (created — 10 sanitizer tests)
  - `tests/unit/grok-cli-strip-params.test.ts` (modified — 2 parameter stripping tests including snake_case assertions)
  - `tests/unit/grok-cli-oauth.test.ts` (read/regression — 10 OAuth tests)
  - `docs/tasks/02-doing/0149-omniroute-grok-build-responses-toolcalls.md` (modified)
- **Testes que verificam o trabalho**:
  - `tests/unit/grok-cli-responses.test.ts`
  - `tests/unit/grok-cli-tool-output-sanitization.test.ts`
  - `tests/unit/grok-cli-strip-params.test.ts`
  - `tests/unit/grok-cli-oauth.test.ts`
- **Resultado dos testes**:
  - `DATA_DIR=$(mktemp -d) node --import tsx/esm --test tests/unit/grok-cli-responses.test.ts tests/unit/grok-cli-tool-output-sanitization.test.ts tests/unit/grok-cli-strip-params.test.ts tests/unit/grok-cli-oauth.test.ts`
  - PASS: 36 tests passed, 0 failed.
- **Resultado do lint**:
  - Focused task ESLint: `npx eslint open-sse/config/grokBuild.ts open-sse/executors/grok-cli.ts open-sse/config/providers/registry/grok-cli/index.ts tests/unit/grok-cli-responses.test.ts tests/unit/grok-cli-tool-output-sanitization.test.ts tests/unit/grok-cli-strip-params.test.ts tests/unit/grok-cli-oauth.test.ts`
  - PASS: 0 lint errors across all Task 0149 files.
  - Broad repository `npm run lint`: fails on 7 pre-existing errors in `visual-reference/` (unrelated to Task 0149). Classified as external pre-existing debt.
- **Resultado do typecheck/build**:
  - `npm run typecheck:core`
  - PASS: 0 type errors.
- **Entrada no changelog**: Draft included below; published entry deferred per instruction (no publish/manage-changelog/CHANGELOG edits performed).
- **Agente executor**: builder worker (`builders`)
- **Data de conclusão**: 2026-08-09

### Path-to-100 Fix Pass (builder worker, 2026-08-09)

Remediated all 7 findings from Reviewer Report `20260809-task-0149-grok-build-responses-toolcalls-review.md`.

- **Finding F1**: Changelog Draft added in task file; published entry deferred per instruction.
- **Finding F2**: Added `production-path end-to-end regression` test in `grok-cli-responses.test.ts` joining OpenAI Chat input through `handleChatCore` → targetFormat resolution (`openai-responses`) → OpenAI-to-Responses translator → `GrokCliExecutor.execute()` dispatch to `/v1/responses`.
- **Finding F3**: Added `GrokCliExecutor.execute() abort signal propagation` and `GrokCliExecutor.execute() upstream HTTP 500 failure` tests in `grok-cli-responses.test.ts`.
- **Finding F4**: Extended `tests/unit/grok-cli-strip-params.test.ts` to explicitly assert `presence_penalty`, `frequency_penalty`, `top_logprobs`, `reasoning_effort` are stripped while tools and messages remain intact.
- **Finding F5**: Documented replayable Sabotage Matrix with exact commands and test pass/fail outputs.
- **Finding F6**: Added Provider Compatibility Matrix (OpenAI Chat input tested, OpenAI Responses target tested, Anthropic out of scope with rationale).
- **Finding F7**: Classified focused imports as temp-fixture integration tests with SQLite initialization side effects (using fresh `DATA_DIR` per run) and documented broad lint failure as external `visual-reference` debt.

### Provider Compatibility Matrix

| Surface                              | Status          | Coverage & Rationale                                                                                                                                                                   |
| ------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI Chat Completions Input**    | ✅ Tested       | Public client request interface (`/v1/chat/completions`); tested via `handleChatCore` production-path regression test converting Chat input (`messages`, `tools`) to Responses format. |
| **OpenAI Responses Target Dispatch** | ✅ Tested       | Upstream target endpoint (`/v1/responses`); tested via `GrokCliExecutor.buildUrl()`, `transformRequest()`, and target format resolution (`targetFormat: "openai-responses"`).          |
| **Anthropic Transport / Format**     | ⏹️ Out of Scope | Intentionally out of scope. Grok Build is an xAI OpenAI-Responses-compatible endpoint. No Anthropic translator or transport changes are required or performed for this provider.       |

### Sabotage Verification Matrix

| Sabotage Target                          | Code Mutation                                                                                | Command / Test Executed                                                             | Expected & Observed Result                                                                                       | Restoration Pass                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **1. Surrogate Pair Repair**             | Replaced `GROK_BUILD_LONE_SURROGATE_PATTERN` in `grok-cli.ts` with blanket `[\uD800-\uDFFF]` | `node --import tsx/esm --test tests/unit/grok-cli-tool-output-sanitization.test.ts` | ✖ Fails: `preserves valid surrogate pairs (emoji)` (mangles `🚀` into `\uFFFD\uFFFD`)                            | Restored pattern; 10/10 tests pass         |
| **2. Function Output String Totality**   | Removed `typeof serialized === "string"` re-check in `sanitizeGrokBuildFunctionCallOutput`   | `node --import tsx/esm --test tests/unit/grok-cli-tool-output-sanitization.test.ts` | ✖ Fails: `never emits a non-string output` (emits `undefined` for functions/symbols)                             | Restored string re-check; 10/10 tests pass |
| **3. Parameter Stripping**               | Commented out `stripUnsupportedGrokBuildParams` in `grok-cli.ts`                             | `node --import tsx/esm --test tests/unit/grok-cli-strip-params.test.ts`             | ✖ Fails: `#5273 grok-cli transformRequest strips unsupported camelCase and snake_case sampling params`           | Restored param stripping; 2/2 tests pass   |
| **4. Responses TargetFormat Resolution** | Changed `targetFormat: "openai-responses"` to `"openai"` in `grok-cli/index.ts`              | `node --import tsx/esm --test tests/unit/grok-cli-responses.test.ts`                | ✖ Fails: `production-path end-to-end regression` (dispatches `messages` body instead of Responses `input` array) | Restored targetFormat; 14/14 tests pass    |

### Changelog Draft (unpublished)

- **Task**: 0149
- **Type**: feature
- **Title**: Grok Build Responses API and tool-call compatibility
- **Description**: Ported Grok Build provider to upstream Responses API contract (/v1/responses), added tool-call output sanitization (repairing broken JSON/unicode/surrogates and bounding depth), normalized reasoning effort, stripped unsupported sampling parameters, and established production-path and execute-level abort/error regression tests.

### Expert polish pass (builder expert, 2026-08-08)

Adversarial polish over the worker slice. Scope limited to Task 0149's Where
table; `open-sse/config/grokBuild.ts` and the Grok registry were re-read and
left byte-identical to the upstream reference (no edit needed).

- **Arquivos modificados nesta passagem**:
  - `open-sse/executors/grok-cli.ts` (modified — 5 defect fixes)
  - `tests/unit/grok-cli-tool-output-sanitization.test.ts` (modified — 7 negative/sabotage tests added)
  - `tests/unit/grok-cli-responses.test.ts` (modified — 6 negative/sabotage tests added)

- **Defeitos corrigidos** (todos comprovados por reprodução antes do fix):
  1. **Unsound `string` return type** — `sanitizeGrokBuildFunctionCallOutput`
     declared `: string` but returned `undefined` for functions/symbols, because
     `JSON.stringify` _returns_ `undefined` (does not throw) for those. The item
     would ship upstream with a missing `output` field — the exact malformed body
     the task exists to prevent. Repro: `typeof mk(() => {}) === "undefined"`.
  2. **Valid surrogate pairs corrupted** — the blanket
     `/[\uD800-\uDFFF]/g → \uFFFD` replacement mangled well-formed emoji
     (`🚀` → `\uFFFD\uFFFD`), silently destroying legitimate tool output. Replaced
     with a pair-aware `GROK_BUILD_LONE_SURROGATE_PATTERN` that only replaces
     _unpaired_ surrogates. Repro: `mk("x 🚀 y") === "x \uFFFD\uFFFD y"`.
  3. **Stack overflow on deeply nested arrays** — recursive array flattening threw
     an uncaught `RangeError` out of `transformRequest`, killing the request
     instead of degrading. Bounded with `GROK_BUILD_MAX_OUTPUT_DEPTH = 32`.
     Repro: 5 000-level nested array → `RangeError: Maximum call stack size exceeded`.
  4. **Unguarded `String()` fallback** — after `JSON.stringify` overflowed on a
     deep structure, `String(deepArray)` recursed through `Array.prototype.join`
     and overflowed again _outside_ the `try`. Now guarded.
  5. **Refresh/access token leaked into logs** — the `catch` in
     `refreshGrokBuildCredentialsOnce` logged raw `error.message`. Transport
     errors (proxy/TLS/URL, upstream `error_description` echoes) routinely embed
     the token verbatim. Now passes through `sanitizeErrorMessage()` plus a new
     `redactGrokBuildSecrets()`. Violated AGENTS.md Hard Rule #12 and this task's
     "never log bearer/refresh tokens". Repro: refresh token appeared verbatim in
     3 captured log lines.

- **Resultado dos testes (polish pass, exato)**:
  - `node --import tsx/esm --test tests/unit/grok-cli-responses.test.ts tests/unit/grok-cli-tool-output-sanitization.test.ts tests/unit/grok-cli-strip-params.test.ts tests/unit/grok-cli-oauth.test.ts`
  - `ℹ tests 33` · `ℹ pass 33` · `ℹ fail 0` (was 20 before this pass)
- **Regressão mais ampla (sem regressão semântica)**:
  - `node --import tsx/esm --test $(ls tests/unit/*responses*.test.ts)`
  - `ℹ tests 230` · `ℹ pass 230` · `ℹ fail 0`
  - `node --import tsx/esm --test tests/unit/executor-base-utils.test.ts tests/unit/base-executor-sanitize-effort.test.ts tests/unit/responses-input-sanitizer*.test.ts tests/unit/openai-responses*.test.ts`
  - `ℹ tests 76` · `ℹ pass 76` · `ℹ fail 0`
- **Hard Rule #18 (fail→pass provado por sabotagem controlada)**: cada fix foi
  revertido individualmente no arquivo e o teste correspondente falhou, depois o
  fix foi restaurado e o teste passou. Arquivo restaurado a partir de cópia local
  em `tmp/` (removida no fim; `tmp/` é gitignored).
  - Sabotagem 1 (blanket surrogate replace) → `✖ preserves valid surrogate pairs (emoji)` — 9 pass / 1 fail
  - Sabotagem 2 (unsound stringify + unguarded String) → `✖ never emits a non-string output`, `✖ bounded against deeply nested arrays`, `✖ every sanitized output is JSON-encodable` — 7 pass / 3 fail
  - Sabotagem 3 (raw `error.message`) → `✖ refreshCredentials never logs access or refresh tokens` — 10 pass / 1 fail
  - Restaurado: 33 pass / 0 fail
- **Resultado do lint (polish pass)**:
  - `npx eslint open-sse/config/grokBuild.ts open-sse/executors/grok-cli.ts open-sse/config/providers/registry/grok-cli/index.ts tests/unit/grok-cli-responses.test.ts tests/unit/grok-cli-tool-output-sanitization.test.ts tests/unit/grok-cli-strip-params.test.ts tests/unit/grok-cli-oauth.test.ts`
  - PASS: exit 0, 0 errors, 0 warnings.
  - `npx prettier --check open-sse/executors/grok-cli.ts tests/unit/grok-cli-responses.test.ts tests/unit/grok-cli-tool-output-sanitization.test.ts`
  - PASS: "All matched files use Prettier code style!"
- **Resultado do typecheck (polish pass)**:
  - `npm run typecheck:core` → `tsc --pretty false -p tsconfig.typecheck-core.json`
  - PASS: 0 type errors (no output).
- **Superfícies inspecionadas sem alteração necessária** (evidência negativa):
  - `open-sse/config/grokBuild.ts` — endpoint/header/version constants are
    byte-identical to `references/diegosouzapw-omniroute/open-sse/config/grokBuild.ts`.
  - `open-sse/config/providers/registry/grok-cli/index.ts` — byte-identical to the
    upstream registry; `grok-4.5` + `grok-composer-2.5-fast` both carry
    `targetFormat: "openai-responses"`.
  - Abort/cancellation: `GrokCliExecutor` overrides only `buildUrl` /
    `buildHeaders` / `transformRequest` / `refreshCredentials` and never touches
    `execute()`, so `BaseExecutor.mergeAbortSignals` (base.ts:236) and the
    fetch-start-timeout path remain the sole owners of cancellation. No change made.
  - Public credentials: the only client_id use is
    `resolvePublicCred("grok_id", "GROK_OAUTH_CLIENT_ID")` — no literal. Compliant
    with Hard Rule #11.
  - Incomplete-`\u`-escape regex `/\\u([0-9A-Fa-f]{0,3})(?![0-9A-Fa-f])/g` was
    checked for ReDoS: bounded quantifier `{0,3}`, no nested repetition — linear,
    safe; and it correctly leaves complete 4-hex-digit escapes intact.
- **Agente executor (polish)**: builder expert (`builders`)
- **Data**: 2026-08-08

---

## Review Ledger

> [!IMPORTANT]
> This final delta-aware re-review supersedes the prior `ACCEPTED_100` artefact. Its verdict is based on the live filesystem and fresh verification/sabotage runs.

### Latest Review

- **Date**: 2026-08-10
- **Reviewer profile**: `reviewers`
- **Score**: `100/100`
- **Local implementation**: `100/100`
- **Runtime enforcement**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/review/20260810-task-0149-grok-build-responses-toolcalls-final-rereview.md`
- **Lane outcome**: moved from `02-doing` to `03-review`; never moved to `04-completed`
- **Task reference**: Task 0149 (`0149-omniroute-grok-build-responses-toolcalls`)

#### Delta Classification

- `RESOLVED`: F1 Changelog Draft and parent-owned publication boundary.
- `RESOLVED`: F2 Chat Completions → target-format resolution → canonical Responses translation → registered Grok executor production-path regression.
- `RESOLVED`: F3 execute abort propagation and mocked HTTP 500 tests.
- `RESOLVED`: F4 camelCase and snake_case stripping assertions with preservation checks.
- `RESOLVED`: F5 replayable sabotage evidence; this review independently mutated target-format and parameter stripping paths, observed failures, and restored both.
- `RESOLVED`: F6 OpenAI Chat/Responses compatibility matrix and Anthropic out-of-scope rationale.
- `RESOLVED`: F7 fresh disposable-data evidence and broad-lint external-debt classification.
- `PERSISTENT`: none.
- `REGRESSION`: none.
- `NEW`: none.
- `EVIDENCE_GAP`: none within the scoped contract.
- `EXTERNAL_BLOCKER`: live Grok/xAI/OAuth validation intentionally excluded by task guardrails; broad repo lint/public-creds debt remains outside Task 0149 ownership.

#### Fresh Proof Summary

- Focused Grok suite: `36/36` passed in a fresh disposable DATA_DIR run.
- Production-path file: `14/14` passed.
- Sanitization file: `10/10` passed.
- Parameter file: `2/2` passed.
- OAuth regression: `10/10` passed.
- Responses regression: `233/233` passed.
- Base/Responses regression: `76/76` passed.
- Focused ESLint: exit `0`; Prettier: exit `0`; `npm run typecheck:core`: exit `0`.
- Provider consistency: exit `0`; test-masking: exit `0` with safe no-base-ref skip.
- Broad `npm run lint`: exit `1`, exactly 7 unrelated `visual-reference` errors and 4099 warnings; correctly classified, not task-owned.
- Public credentials scan: exit `1` on 8 unrelated MCP principal literals; no Task-0149 literal identified.
- Independent sabotage: target-format mutation `12 pass/2 fail`, restoration `14/14`; stripping mutation `1 pass/1 fail`, restoration `2/2`.
- Reference parity: current `grokBuild.ts` and Grok registry each match their reference SHA-256.

### Previous Reports

- `2026-08-10` — prior claimed `100/100` — `docs/reports/review/20260810-task-0149-grok-build-responses-toolcalls-rereview.md`
  - **Disposition**: superseded as acceptance authority by this final re-review because the user explicitly required ignoring its existing `ACCEPTED_100` claim.
- `2026-08-09` — `84/100` — `docs/reports/review/20260809-task-0149-grok-build-responses-toolcalls-review.md`
  - **Carried forward**: seven evidence gaps, all now resolved.
  - **Regression guard**: preserve sanitizer totality/surrogate/depth/redaction tests, production-path target-format/registered-executor test, execute abort/HTTP 500 tests, parameter stripping test, and replayable sabotage evidence.

### Review Trail

- **Reviewer**: independent reviewer (`reviewers`, BUILDER_CONTEXT under parent `builders`)
- **Date**: 2026-08-10
- **Verdict**: `ACCEPTED_100` — `100/100`
- **Report**: `docs/reports/review/20260810-task-0149-grok-build-responses-toolcalls-final-rereview.md`
- **Notes**: Expert corrections were verified in the live filesystem. Fresh focused/regression/type/lint/consistency checks passed; broad failures were classified as unrelated. Two critical sabotage mutations failed as expected and were restored before final passing runs. Task legally moved only to `03-review`.

### Independent provider/runtime review (2026-08-11)

- **Reviewer**: independent provider/runtime reviewer (`reviewers`)
- **Scope**: Task 0149 only; no Task 0151 implementation, task moves, changelog/generated surfaces, live provider/OAuth calls, or production ports used.
- **Verdict**: `ACCEPTED_100` — `100/100` within the scoped Task 0149 contract.
- **Endpoint/translation**: Verified `GrokCliExecutor.buildUrl()` and the registered production path dispatch to `https://cli-chat-proxy.grok.com/v1/responses`; the mocked Chat → target-format resolution → canonical OpenAI Responses translation → registered executor path produces `input`/function `tools`, not Chat `messages` and not XML.
- **Tool-output contract**: Verified valid JSON, invalid/plain text, incomplete Unicode escapes, lone-surrogate repair, valid surrogate preservation, arrays/objects/null, circular/unserializable values, deep nesting bounds, and JSON-encodable final bodies. No XML assumptions were found in the scoped implementation/tests (`XML|xml|<tool|function_call_output` search: 0 matches; `function_call_output` is handled as JSON Responses items).
- **Headers/metadata**: Verified bearer/session headers, xAI token-auth, model override, stream Accept, identity suppression for team/organization principals, client version `0.2.106`, current Grok models, and `targetFormat: "openai-responses"`; fork config/registry SHA-256 match the upstream reference.
- **Reasoning/parameters**: Verified Grok 4.5 default reasoning, explicit effort preservation, Composer effort removal, include/store defaults, 200-tool cap, and camelCase/snake_case unsupported-parameter stripping with supported content preserved.
- **Abort/errors**: Verified BaseExecutor-owned caller abort propagation/no retry and mocked HTTP 500 status/error-body behavior without credential leakage; refresh logging redacts access/refresh tokens. No transport ownership was duplicated in the Grok executor.
- **Fresh verification**: Each focused Grok file run in a separate disposable `DATA_DIR`: responses `14/14`, sanitization `10/10`, parameter stripping `2/2`, OAuth regression `13/13`; combined focused run `39/39`; Responses regression `233/233`; Base/Responses regression `76/76`; `npm run typecheck:core` exit `0`; scoped ESLint exit `0`; provider consistency exit `0`; test-masking safely skipped with no base ref.
- **Gate classification**: Repository `npm run lint` remains red only on seven unrelated `visual-reference` errors (warnings are repository-wide debt). Prettier passes all Task-0149-owned code/config/response/sanitization/parameter files; `grok-cli-oauth.test.ts` has existing formatting drift and was not changed because it belongs to the Task 0151 OAuth surface. This is explicitly out of scope, not a Task 0149 implementation defect.
- **External boundary**: Live Grok/xAI/OAuth behavior remains unverified by design under the task guardrails; mocked transport is the accepted evidence boundary.
- **Lane outcome**: path-to-100 met; Task 0149 alone is promoted from `03-review` to `04-completed`. No other task was moved or modified.

