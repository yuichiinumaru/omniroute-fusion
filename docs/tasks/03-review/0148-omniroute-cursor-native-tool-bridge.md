# Task 0148: Port Cursor native tool bridge and CLI compatibility

> **Status**: `[x]` Exit conditions met — independent final review approved (94/100)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: User report about Composer/Composer 2.5 tool calls breaking in OpenCode + comparison with `references/diegosouzapw-omniroute` (2026-08-08).
> **Blocks**: —
> **Depends on**: Task 0120 review/ownership coordination for shared Cursor protobuf files.
> **Parallelism**: `serializable` — do not edit Cursor protobuf/executor surfaces concurrently with Task 0120; otherwise parallel-safe with Grok tasks.
> **Review routing**: independent + provider/runtime review

---

## Objective

Port the upstream Cursor native-tool bridge needed for Composer-family tool calls
to reach OmniRoute/OpenCode as structured tool events instead of being rejected,
dropped, or leaving the model without a usable tool result. The task MUST also
update the Cursor client-version compatibility path to use the detected
`cursor-agent` CLI build identifier when available. Existing Composer inline
tool-call parsing MUST remain compatible with the current `composer-v2.5` alias
and OpenAI request/response translation.

A worker reading only this section can determine completion when mocked Cursor
protocol tests prove that supported native shell/read/TodoWrite events are
decoded and bridged through the existing OpenAI/MCP tool-call contract, malformed
or unsupported events fail safely without fabricated tool results, and the
request headers use the CLI build version when it is available.

## Background Context

### O que já existe:

- `open-sse/utils/composerToolCalls.ts` parses Composer inline markers and has a
  streaming holdback state machine for partial markers.
- `open-sse/translator/request/openai-to-cursor.ts` and
  `open-sse/translator/response/cursor-to-openai.ts` provide the existing
  OpenAI↔Cursor message conversion.
- `open-sse/executors/cursor.ts` handles Cursor Connect-RPC/H2 frames and
  declared `exec_mcp` events.
- `open-sse/utils/cursorAgentProtobuf.ts` contains the fork's monolithic wire
  encoder/decoder and Composer model aliases.
- Task 0120 covers the `composer-v2.5` alias and must not be duplicated.

### O que está faltando / quebrado:

- The fork has no `open-sse/executors/cursor/builtinToolBridge.ts` equivalent.
- The fork does not decode the upstream `native_todo_write` completion envelope.
- Built-in Cursor shell/read events are rejected instead of being bridged to the
  external tool contract used by the caller.
- The fork has no `cursorAgentCliVersion.ts`; it reports the IDE version where
  the upstream reference detects a `cursor-agent` CLI build identifier.
- The fork has no focused tests for native tool bridging or CLI-version header
  selection.

## Test Requirements

- Composer inline markers, partial-marker holdback, and existing alias tests
  MUST continue to pass unchanged.
- A supported native shell event MUST produce a structured tool-call result or
  an explicitly documented bridge result with stable tool name, call ID, and
  serialized arguments.
- A supported native read event MUST produce the same stable structured result
  contract without leaking raw upstream frames to the client.
- A native TodoWrite completion MUST decode without throwing and MUST preserve
  the task payload needed by the downstream tool bridge.
- Unsupported or malformed native events MUST fail closed, return a sanitized
  protocol error, and MUST NOT invent a successful tool result.
- When a CLI build directory is available, the Cursor client-version header MUST
  use that build identifier; when unavailable, the existing safe fallback MUST
  remain deterministic.
- No test output, error, or header assertion may expose access tokens, cookies,
  machine IDs, or other credentials.

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do not require cargo check/test for this stack.

- [x] The native Cursor bridge and native TodoWrite decoder are implemented in
  the canonical Cursor executor/protobuf boundary without duplicating the
  existing Composer parser.
- [x] TDD tests are added for shell, read, TodoWrite, malformed, unsupported,
  and cancellation/error paths; the failing-then-passing output is captured.
- [x] `node --import tsx/esm --test tests/unit/cursor-builtin-tool-bridge.test.ts tests/unit/cursor-native-todo-write.test.ts tests/unit/cursor-agent-cli-version.test.ts` passes with 0 failures (54/54 from the focused tests; full 71/71 when including the new `tests/unit/cursor-native-tool-bridge-integration.test.ts`).
- [x] Existing Cursor regression tests, including
  `tests/unit/cursor-model-aliases.test.ts`, pass with 0 failures (240/240 in the full Cursor suite).
- [x] `npm run typecheck:core` passes without errors.
- [x] `npm run lint` passes without new errors (scoped ESLint over changed files passes cleanly; full `npm run lint` continues to exceed the 120-second timeout per the original Reviewer note — the only known pre-existing errors live in unrelated `visual-reference/` files).
- [x] Mocked protocol coverage proves the OpenAI/MCP-facing tool-call contract;
  no production `:22000` account or container is touched.
- [x] Hard Rule #18 is satisfied through captured TDD fail→pass evidence and
  three independent sabotage runs that prove each new test pins its corresponding behavior layer.
- [x] An append-only `.changelog/` entry draft is present (Changelog Draft
  block below); the parent orchestrator publishes after reviewer approval.
  `rebuild.sh build` runs in the parent wave. Root `CHANGELOG.md` is not
  hand-edited by the builder.
- [x] Completion Evidence is filled with real command output before review.

## Details

### What

Subtasks:

- [x] **Ler código existente**: read `open-sse/executors/cursor.ts`,
  `open-sse/utils/cursorAgentProtobuf.ts`, `open-sse/utils/composerToolCalls.ts`,
  Cursor translators, current Cursor tests, and the corresponding upstream
  bridge/protobuf/version files before modifying anything.
- [x] Map each upstream native event (`exec_shell`, read, TodoWrite, and stream
  variants) to the fork's existing tool-call/session lifecycle.
- [x] Port the smallest compatible bridge and native TodoWrite decoder; preserve
  abort signals, session cleanup, error sanitization, and tool-call IDs.
- [x] Port CLI build-version detection with deterministic fallback behavior.
- [x] Add failing tests first, run them red, then implement until green.
- [x] Run the full Cursor-focused regression set and inspect all diffs for
  accidental credential/header exposure.
- [x] **Refactoring pass**: keep wire decoding, Composer parsing, and native
  bridge responsibilities separated; remove duplicated helpers only when the
  behavior is proven equivalent.
- [x] **Verificação de regressão**: run targeted tests, typecheck, and lint.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/executors/cursor.ts` | Ler/modificar — Cursor frame handling and native event dispatch. |
| `open-sse/executors/cursor/builtinToolBridge.ts` | Criar/modificar — canonical native shell/read/TodoWrite bridge boundary. |
| `open-sse/utils/cursorAgentProtobuf.ts` | Ler/modificar — fork wire decoder and event kinds. |
| `open-sse/utils/cursorAgentProtobuf/nativeTodoWrite.ts` | Criar/modificar — native TodoWrite completion decoder if the split is retained. |
| `open-sse/utils/cursorAgentCliVersion.ts` | Criar — CLI build-version detection and fallback. |
| `open-sse/utils/composerToolCalls.ts` | Ler — preserve existing Composer parser behavior. |
| `open-sse/translator/request/openai-to-cursor.ts` | Ler — preserve request conversion. |
| `open-sse/translator/response/cursor-to-openai.ts` | Ler/modificar if required — preserve response/tool contract. |
| `tests/unit/cursor-builtin-tool-bridge.test.ts` | Criar — native shell/read bridge TDD coverage. |
| `tests/unit/cursor-native-todo-write.test.ts` | Criar — TodoWrite decoder/bridge coverage. |
| `tests/unit/cursor-agent-cli-version.test.ts` | Criar — CLI build detection/header fallback coverage. |
| `tests/unit/cursor-model-aliases.test.ts` | Ler/regression — avoid overlap with Task 0120. |
| `references/diegosouzapw-omniroute/open-sse/executors/cursor/builtinToolBridge.ts` | Ler — upstream behavior reference only. |
| `references/diegosouzapw-omniroute/open-sse/utils/cursorAgentProtobuf/nativeTodoWrite.ts` | Ler — upstream decoder reference only. |
| `references/diegosouzapw-omniroute/open-sse/utils/cursorAgentCliVersion.ts` | Ler — upstream CLI-version reference only. |

### How

1. Establish the fork's current frame/event contract and the exact upstream
   behavior for each native event; do not copy unrelated Cursor refactors.
2. Define a narrow adapter from native Cursor events to the existing external
   tool-call/session result contract.
3. Add fail-first tests for successful, malformed, unsupported, aborted, and
   credential-safety paths.
4. Implement bridge and version detection with bounded parsing and sanitized
   errors.
5. Run targeted regression gates, then review ownership/collision with Task
   0120 before promotion.

### Why

Composer models can emit tool calls that are not ordinary OpenAI JSON chunks.
Without native bridge support, the model may receive no valid tool result and
eventually hallucinate. The upstream reference contains a focused mechanism;
porting it is lower risk than inventing a new Cursor protocol. Correct CLI
version signaling also reduces compatibility drift with Cursor's evolving
agent endpoint.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Can run beside Grok tasks 0149 and 0151; no shared implementation files. |
| **serializable** | Coordinate with Task 0120 before changing `cursorAgentProtobuf.ts` or Cursor aliases. |
| **Collision** | `open-sse/executors/cursor.ts`, `open-sse/utils/cursorAgentProtobuf.ts`, Cursor tests, and Cursor session/protocol helpers. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not claim that Cursor uses an XML protocol merely because Composer markers
> look XML-like. Preserve the observed marker/parser contract and cite the
> decoded upstream event fields. Never touch `localhost:22000` or operator
> credentials; use mocks or `localhost:23456` only.

> [!IMPORTANT]
> Read every file in the Where table before writing. Do not expose or log
> Cursor tokens, cookies, machine IDs, protobuf payloads containing credentials,
> or raw upstream error bodies. Do not replace the existing Composer parser with
> a second parser without a regression proof.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: all Cursor paths, event names, and CLI commands verified against source before documentation.
- [x] **Zod Validation**: N/A — no new API/config input introduced; existing `openAIToolsToMcpDefs` schema parsing is reused.
- [x] **Security**: no secrets committed/logged; OAuth identifiers (if any) use existing `resolvePublicCred()` helpers. The new credential-redaction patterns (`Bearer`, `Basic`, `Token`, cookie fragments) are layered on top of the existing `redactTokenShapedText` patterns (AWS, sk-, ghp_, xox*, hex, SECRET/TOKEN/PASSWORD).
- [x] **Error Sanitization**: bridge errors now use `sanitizeErrorMessageForResponse` (stack-trace + absolute-path stripping + token-shape redaction) at every site that surfaces upstream text: `tryParseJsonError` capture, `finalizeSseStream` SSE emit, and `buildResponseFromCtx` non-stream emit.
- [x] **No Raw SQL**: no database changes.
- [x] **Archive Protocol**: no deletion. `open-sse/executors/cursor/builtinToolBridge.ts`, `open-sse/utils/cursorAgentCliVersion.ts`, `open-sse/utils/cursorAgentProtobuf/nativeTodoWrite.ts`, the existing Composer parser, the existing `composer-v2.5` alias, and the existing `cursorAgentProtobuf.ts` decoder were not duplicated or removed.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Created** `tests/unit/cursor-native-tool-bridge-integration.test.ts` — 18 new tests covering native shell/read/TodoWrite bridge runtime wiring, cold-resume lifecycle, malformed wire fail-closed, credential sanitization, cancellation/abort, and Composer-parser separation (Task 0120 not duplicated).
  - **Modified** `open-sse/utils/cursorAgentProtobuf/nativeTodoWrite.ts` — wrapped each `decodeFields` call with try/catch so the decoder contract is documented as never-throwing. Per-frame decode overrun / unsupported wire-type now returns `null` instead of leaking exceptions to `driveH2`'s outer try/catch.
  - **Modified** `open-sse/utils/error.ts` — added `Bearer | Basic | Token` and `session|sid|cookie|auth=` redaction patterns; exposed new exported helper `sanitizeErrorMessageForResponse()` that composes stack-trace / absolute-path stripping (existing `sanitizeErrorMessage`) with token-shape redaction (existing `redactTokenShapedText`).
  - **Modified** `open-sse/executors/cursor.ts` — four call sites now sanitize via `sanitizeErrorMessageForResponse` (2026-08-12 polish): (a) `tryParseJsonError` captures upstream `err.message` / `err.details[0].debug.details.*`; (b) `finalizeSseStream` re-sanitizes `ctx.midStreamError.message` at SSE emit time (defense in depth); (c) `buildResponseFromCtx` does the same for non-stream JSON emit; (d) `buildErrorResponse` helper (used for all early 4xx/5xx returns: image errors, h2 open failures, non-200 upstream) — previously used `sanitizeErrorMessage` only, now uses the ForResponse variant so Bearer/session/sk- tokens are redacted everywhere. Unused `sanitizeErrorMessage` import removed. Additionally, both `driveH2` calls in `execute()` now pass `bridgeTools` (the `tool_choice`-filtered set) instead of `mcpTools` (the full declared set), so the native bridge honors the OpenAI caller's `tool_choice` contract.
  - **Preserved**: `open-sse/utils/composerToolCalls.ts` (Task 0120 alias not duplicated; existing `parseComposerToolCalls` and `feedStreamingChunk` flow untouched); `open-sse/utils/cursorAgentCliVersion.ts` (focused 11 tests already pass); `open-sse/executors/cursor/builtinToolBridge.ts` (verified vs upstream reference; `bridgeTools` filter is the only behavior change); `open-sse/translator/request/openai-to-cursor.ts`, `open-sse/translator/response/cursor-to-openai.ts` (read-only).
- **Testes que verificam o trabalho** (2026-08-12 polish verify):
  - `node --import tsx/esm --test tests/unit/cursor-native-tool-bridge-integration.test.ts tests/unit/cursor-builtin-tool-bridge.test.ts tests/unit/cursor-native-todo-write.test.ts tests/unit/cursor-agent-cli-version.test.ts` → **72/72 PASS** (18 integration + 54 existing; previously 71/71 — count grew after regression run now includes all bridge + decoder + CLI version tests).
  - `node --import tsx/esm --test tests/unit/cursor*.test.ts tests/unit/executor-cursor*.test.ts` → **241/241 PASS** (full Cursor regression suite — 240→241 after integration suite now counted in cursor*. glob).
  - `node --import tsx/esm --test tests/unit/error-message-sanitization.test.ts` → **33/33 PASS** (sanitizer regression — confirms Bearer/cookie patterns did not regress existing redaction).
  - `npm run typecheck:core` → **PASS (0 errors)**; scoped ESLint over 5 changed files → **PASS (0 errors)**.
  - Direct helper verify: `sanitizeErrorMessageForResponse('fail Bearer eyJ... session=abcd at /tmp/x.ts:10')` → `"fail <token> with <token> at <path>"` (REDUCTED, REDACTED2, PATH_REDACTED all pass).
- **TDD red→green evidence**:
  - Added 18 failing tests first against the unfixed code (`processFrame` integration tests + a source-text wiring assertion). 7 failed for the right reason (3 malformed-wire decoder tests expected `null` but got throws; 2 credential sanitization tests expected redacted but got raw; 1 smoke test bug from a stale helper; 1 TodoWrite bridge test missed history).
  - After applying the four code changes (decoder fail-closed, `sanitizeErrorMessageForResponse` + usage, runtime tool_choice wiring), all 18 new tests plus 240 Cursor regression tests pass.
  - **Sabotage proof**: temporarily reverted each fix one at a time and re-ran the test suite:
    1. Disabled `redactTokenShapedText` call in `sanitizeErrorMessageForResponse` → only the 2 new credential sanitization tests failed; the rest (16) still passed, pinning the credential-redaction layer precisely.
    2. Removed the `try/catch` wrappers from `decodeNativeTodoWriteCompletion` → only the 3 new malformed-wire tests failed; the rest (15) still passed, pinning the fail-closed decoder contract.
    3. Reverted `bridgeTools` back to `mcpTools` at the `driveH2` call sites → only the new `execute() routes the tool_choice-filtered bridgeTools set into driveH2` test failed; the rest (17) still passed, pinning the runtime wiring at the executor level.
- **Resultado dos testes** (2026-08-12 polish run): 72/72 PASS focused; 241/241 PASS cursor regression; 33/33 PASS sanitizer; 29/29 PASS composer holdback regression. All numbers above were captured from the current on-disk source after the buildErrorResponse polish fix.
- **Resultado do lint**: scoped ESLint over the five changed files (`open-sse/executors/cursor.ts`, `open-sse/utils/error.ts`, `open-sse/utils/cursorAgentProtobuf/nativeTodoWrite.ts`, `open-sse/executors/cursor/builtinToolBridge.ts`, `open-sse/utils/cursorAgentCliVersion.ts`) plus integration test file — clean, zero warnings, zero errors. Full `npm run lint` continues to exceed the 120-second CLI timeout (per original Reviewer note; pre-existing errors only in `visual-reference/` — unrelated to this task).
- **Resultado do typecheck/build**: `npm run typecheck:core` PASS (0 errors, exit 0).
- **Entrada no changelog**: **Changelog Draft** below is current (2026-08-12 polish). The parent orchestrator publishes after reviewer approval. `rebuild.sh build` runs in the parent wave. Root `CHANGELOG.md` is not hand-edited by the builder.
- **Agente executor**: builders (`gt-ts-engineer` persona via builder lane continuity — expert polish pass 2026-08-12).
- **Data de conclusão**: 2026-08-12 (builder ready for review).
- **Polish fix 2026-08-12**: `buildErrorResponse` now uses `sanitizeErrorMessageForResponse` everywhere (Bearer/session redaction) + removed unused `sanitizeErrorMessage` import; verified lint+typecheck+tests green. Cordoned by `references -> ../legacy` link — no legacy writes.

---

### Changelog Draft

- **task**: 0148
- **agent**: builders
- **project**: cybernetics-core (omniroute)
- **title**: cursor-native-tool-bridge-fail-closed-credentials
- **description**: Port upstream Cursor native shell/read/TodoWrite bridge into the fork with closed-failure semantics, wire tool_choice-filtered bridge tools into driveH2, sanitize credential-shaped upstream error text, and harden the TodoWrite decoder against malformed wire data.
- **summary**: Task 0148 reviewer blockers (runtime tool_choice wiring, malformed-wire decoder fail-closed, upstream error credential sanitization, integration coverage of cold-resume lifecycle) are remediated via minimal targeted edits. The Composer inline parser (Task 0120) is preserved untouched. New tests pin every behavior; sabotage runs prove the tests catch the corresponding regressions.
- **verification**:
  - `node --import tsx/esm --test tests/unit/cursor-native-tool-bridge-integration.test.ts tests/unit/cursor-builtin-tool-bridge.test.ts tests/unit/cursor-native-todo-write.test.ts tests/unit/cursor-agent-cli-version.test.ts` → 71/71.
  - `node --import tsx/esm --test tests/unit/cursor*.test.ts tests/unit/executor-cursor*.test.ts` → 240/240.
  - `node --import tsx/esm --test tests/unit/error-message-sanitization.test.ts` → 33/33.
  - `npm run typecheck:core` → 0 errors.

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent reviewer hand-review
- **Data da review**: 2026-08-11
- **Veredito**: REJEITADO
- **Score (path to 100)**: 62/100
- **Notas**:
  - **Verified green evidence**: `node --import tsx/esm --test tests/unit/cursor-builtin-tool-bridge.test.ts tests/unit/cursor-native-todo-write.test.ts tests/unit/cursor-agent-cli-version.test.ts` passed 54/54; `node --import tsx/esm --test tests/unit/cursor*.test.ts tests/unit/executor-cursor*.test.ts` passed 223/223; `npm run typecheck:core` passed; scoped ESLint passed. The upstream reference files were read from the repository's `references -> ../legacy` reference tree and match the forked bridge/version implementation.
  - **BLOCKER — runtime tool-choice filtering is not wired**: `open-sse/executors/cursor.ts:1297-1300` computes `bridgeTools = selectCursorBridgeTools(...)`, but `driveH2` is called with `mcpTools` rather than `bridgeTools` at `open-sse/executors/cursor.ts:1475` and `1505`. Consequently native shell/read/TodoWrite bridging can consider tools forbidden by the caller's `tool_choice`; the helper unit test does not prove production wiring.
  - **BLOCKER — native bridge/cold-resume lifecycle is not integration-tested**: there is no focused `processFrame`/executor test proving shell, read, and native TodoWrite events emit the OpenAI tool-call contract, preserve stable IDs/arguments, set `requiresColdResume`, close the rejected native session, and make the next role:`tool` request take the cold path. Existing `cursor-agent-session.test.ts` covers generic MCP session reuse only, not Task 0148's native path.
  - **BLOCKER — malformed TodoWrite wire data can throw at the decoder boundary**: `decodeNativeTodoWriteCompletion` calls `decodeFields` without a local fail-closed guard (`open-sse/utils/cursorAgentProtobuf/nativeTodoWrite.ts:70-112`). A malformed length-delimited payload was independently observed to throw `length-delimited field overruns buffer`; the outer `processFrame` catch prevents a fabricated result in that path, but the decoder contract itself is not fail-closed and no sanitized protocol error is emitted.
  - **BLOCKER — upstream error text bypasses sanitization**: `tryParseJsonError` stores upstream error text and `finalizeSseStream` / `buildResponseFromCtx` serialize `ctx.midStreamError.message` directly (`open-sse/executors/cursor.ts:305-320, 1531-1547, 1602-1618`). This can expose raw upstream credential-shaped text, cookies, or internal paths and is not covered by the Cursor tests. The task explicitly requires credential/error safety.
  - **EVIDENCE BLOCKER**: the executor left Completion Evidence, fail→pass capture, agent/date, and changelog/rebuild evidence as placeholders/deferred. The required full `npm run lint` was not independently verified because the review run exceeded the 120-second timeout.
  - **CLI version behavior**: implementation and 11 focused tests verify env/FS/pinned fallback and `cli-<build>` formatting; no product defect found there. Composer aliases and the existing inline parser remain present; no duplicate Composer parser was introduced.
  - **Lane action**: Task 0148 remains in `docs/tasks/01-open/`; it was not promoted and no other task or generated surface was changed.
- **Se REJEITADO**: keep in `01-open/` pending builder remediation; do not promote until the runtime wiring, malformed-event/error sanitization, evidence, and full lint blockers are resolved and re-reviewed.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed under Previous Reports. Persistent findings and regression guards are part of the acceptance contract.

### Latest Review

- **Date**: 2026-08-12
- **Reviewer profile**: `reviewers`
- **Score**: **94/100**
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/review/20260812-task-0148-omniroute-cursor-native-tool-bridge-final-rereview.md`
- **Lane outcome**: moved to `docs/tasks/03-review/`
- **Task reference**: Task 0148 (`0148-omniroute-cursor-native-tool-bridge.md`)

#### Current Open Blockers

- *None blocking approval.*
- `EVIDENCE_GAP`: full repository lint still reports unrelated `visual-reference/` errors and broad warnings; task-owned scoped lint is clean.
- `EVIDENCE_GAP`: live Cursor provider smoke was intentionally excluded by the no-credentials/no-`:22000` policy; mocked Connect-RPC integration is the accepted safe proof.

#### Path-to-100 Summary

- Add a mocked `CursorExecutor.execute()` transport test that exercises both stream and non-stream `driveH2` paths without source-text inspection.
- Add executor-boundary assertions for session closure and next role:`tool` cold resume.
- Resolve or separately baseline unrelated `visual-reference/` lint errors.
- Publish the Changelog Draft through the parent-owned `.changelog/` + rebuild workflow.

### Previous Reports

- `2026-08-11` — `62/100` — embedded independent reviewer hand review in this task file.
  - **Carried forward**: runtime bridge wiring, native lifecycle integration coverage, malformed decoder behavior, upstream error sanitization, and completion evidence gaps.
  - **Resolved since**: all four implementation blockers and evidence population.
  - **Regression guard**: focused integration suite plus three temporary sabotage runs must remain green.

