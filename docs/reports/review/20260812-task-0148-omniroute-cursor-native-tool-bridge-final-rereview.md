# Review Report: Task 0148 — Cursor native tool bridge and CLI compatibility — 2026-08-12

## Review Lineage

- **Current task**: Task 0148 (`0148-omniroute-cursor-native-tool-bridge.md`), promoted to `docs/tasks/03-review/0148-omniroute-cursor-native-tool-bridge.md`.
- **Previous reports read**: The task's embedded 2026-08-11 independent hand review, score 62/100, rejected for runtime tool-choice wiring, missing native lifecycle integration coverage, decoder throws, error sanitization bypass, and incomplete evidence. No standalone prior report file for Task 0148 was found under `docs/reports/`.
- **Related reports considered**: Task 0120's approved ownership/alias context and the local upstream reference under `references/diegosouzapw-omniroute`; no sibling implementation report was required.
- **Review mode**: `path-to-100` / final-gate.
- **Reviewer**: independent primary agent; no subagents or nested reviewers launched.

## Score And Verdict

- **Score**: **94/100**
- **Verdict**: **ACCEPTED_100** under the operator rule that 90–100 is approved.
- **Lane recommendation**: `accepted`; task promoted to `docs/tasks/03-review/`.

### Dual score dimensions

- **local_implementation: 97/100** — narrow native shell/read/TodoWrite bridge, bounded protobuf decoding, CLI-version fallback, stable OpenAI tool-call IDs, Composer separation, and response sanitization are implemented and covered.
- **runtime_enforcement: 92/100** — both production `driveH2` paths receive `bridgeTools`; `processFrame` dispatches native events, marks cold-resume, and lifecycle closes native-bridge sessions. No live Cursor account or `:22000` smoke was run by policy, so runtime evidence is mocked protocol integration rather than live provider proof.

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED`: `open-sse/executors/cursor.ts` now passes the tool-choice-filtered `bridgeTools` set into both stream and non-stream `driveH2` calls. The integration test asserts production source wiring and failed when one call was sabotaged back to `mcpTools`.
- `RESOLVED`: Native shell/read/TodoWrite `processFrame` integration coverage now verifies structured OpenAI-facing calls, stable `call_` IDs, serialized arguments, `requiresColdResume`, tool-choice exclusion, unsupported events, malformed TodoWrite behavior, Composer separation, and cold-resume-oriented lifecycle markers.
- `RESOLVED`: `decodeNativeTodoWriteCompletion` catches malformed top-level and nested `decodeFields` failures and returns `null`; overrun and unsupported-wire-type tests failed when the guard was removed.
- `RESOLVED`: Cursor upstream errors are sanitized at capture and emission, including `buildErrorResponse`, mid-stream SSE, non-stream JSON, and debug detail paths. Credential-redaction tests failed when the token-shape redaction layer was removed.
- `RESOLVED`: Completion Evidence is populated with current command results, TDD red→green narrative, three sabotage runs, agent/date, and a Changelog Draft.

### Persistent Findings

- None from the 62/100 review remain open.

### Regressions

- None observed during this final gate.

### New Findings

- `NEW` / low severity: the full repository lint command completes with 7 pre-existing errors and 4,141 warnings, all in unrelated `visual-reference/` or broad repository surfaces; the task-owned scoped ESLint command is clean. This prevents claiming a globally clean lint baseline but does not block the task under its documented “no new errors / scoped changed files” exit wording.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: No live Cursor provider smoke was run; this is intentionally excluded because the task forbids production accounts, credentials, `:22000`, and live upstream traffic. Mocked Connect-RPC integration is the safe accepted proof for this task.
- `EXTERNAL_BLOCKER`: None; all safe local gates were executable.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
|---|---|---|---|---|---|---|
| F1 | RESOLVED | High | Closed | Runtime tool-choice filtering was previously computed but not passed to `driveH2`; both production paths now use `bridgeTools`. | 2026-08-11 | `open-sse/executors/cursor.ts:1485-1532`; integration test source-wiring assertion |
| F2 | RESOLVED | High | Closed | Native bridge/cold-resume lifecycle lacked integration coverage; process-frame tests now cover shell/read/TodoWrite dispatch, IDs, arguments, rejection behavior, and cold-resume markers. | 2026-08-11 | `tests/unit/cursor-native-tool-bridge-integration.test.ts` |
| F3 | RESOLVED | High | Closed | Malformed TodoWrite wire payloads could escape the decoder as exceptions; decoder now fails closed. | 2026-08-11 | `open-sse/utils/cursorAgentProtobuf/nativeTodoWrite.ts:70-146` |
| F4 | RESOLVED | High | Closed | Raw upstream credential-shaped text could bypass Cursor response sanitization; capture, SSE, JSON, and early-response paths now use `sanitizeErrorMessageForResponse`. | 2026-08-11 | `open-sse/executors/cursor.ts:305-327,1312-1315,1559-1643`; `open-sse/utils/error.ts:319-363` |
| F5 | EVIDENCE_GAP | Medium | Accepted with scope | Full lint has unrelated repository errors; task-owned scoped lint is clean and typecheck passes. | 2026-08-12 | `npm run lint`; scoped `npx eslint ...`; `npm run typecheck:core` |

## Evidence Reviewed

### Source and wiring

- `open-sse/executors/cursor.ts`: native event dispatch, tool-choice selection, both `driveH2` paths, session lifecycle, abort/timeout teardown, frame-size limit, error sanitization, and CLI header selection.
- `open-sse/executors/cursor/builtinToolBridge.ts`: schema-constrained shell/read/TodoWrite adapters with fail-closed unsupported-schema behavior.
- `open-sse/utils/cursorAgentProtobuf/nativeTodoWrite.ts` and `wire.ts`: nested TodoWrite decoding and checked length bounds.
- `open-sse/utils/cursorAgentCliVersion.ts`: environment → filesystem → deterministic pin fallback.
- `open-sse/services/cursorSessionManager.ts`: acquire/release/close, TTL, max-session, pending-call cleanup, and h2 close handlers.
- `open-sse/utils/error.ts`: response-safe token and path redaction.
- Existing Composer parser and Task 0120 alias surfaces were preserved rather than duplicated.
- Local upstream reference files were compared for the bridge/version/decoder shape.

### Fresh commands and classifications

| Command | Result | Classification |
|---|---|---|
| `node --import tsx/esm --test tests/unit/cursor-native-tool-bridge-integration.test.ts tests/unit/cursor-builtin-tool-bridge.test.ts tests/unit/cursor-native-todo-write.test.ts tests/unit/cursor-agent-cli-version.test.ts` | **72/72 passed** | synthetic/factory-only plus mocked protocol integration |
| `node --import tsx/esm --test tests/unit/cursor*.test.ts tests/unit/executor-cursor*.test.ts` | **241/241 passed** | mocked production executor integration / regression |
| `node --import tsx/esm --test tests/unit/error-message-sanitization.test.ts` | **33/33 passed** | temp-fixture integration |
| `node --import tsx/esm --test tests/unit/cursor-composer-thinking.test.ts tests/unit/composer-tool-calls.test.ts` | **29/29 passed** | synthetic/factory-only parser regression |
| `npm run typecheck:core` | **PASS, zero errors** | task-surface typecheck |
| `npx eslint` over changed production/test files | **PASS, zero errors** | task-surface lint |
| `npm run lint` | **7 unrelated errors, 4,141 warnings** in broad repo; no task-owned error identified | blocked for global-clean claim; unrelated repository debt |

### Sabotage Gate Evidence

| Reviewer finding / path | Breakage applied | Expected failure observed | Restored pass |
|---|---|---|---|
| F3 malformed decoder boundary | Removed top-level `try/catch` around `decodeFields(payload)` | **2 focused tests failed**: overrun and unsupported wire type threw | `35/35` decoder + integration tests passed after restore |
| F4 credential redaction | Changed `sanitizeErrorMessageForResponse` to only call stack/path sanitizer | **2 integration tests failed**: Bearer credential assertions | `68/68` integration + sanitizer tests passed after restore |
| F1 runtime tool-choice wiring | Replaced the stream `driveH2` argument `bridgeTools` with `mcpTools` | **1 integration test failed**: source wiring assertion | `18/18` integration tests passed after restore |

The sabotage changes were temporary, restored, and followed by passing reruns. No secrets, live Cursor service, `:22000`, or production account were touched.

## Path To 100

1. Add a safe mocked `CursorExecutor.execute()` test that exercises both stream and non-stream `driveH2` calls through a stubbed h2 transport rather than relying partly on source-text wiring assertions.
2. Add explicit assertions for session closure and next role:`tool` cold-resume invocation at the executor boundary, not only `processFrame` state markers.
3. Resolve or separately baseline the seven unrelated `visual-reference/` lint errors so the repository-wide lint command can be clean.
4. Publish the Changelog Draft through the parent-owned `.changelog/` + rebuild workflow when the parent wave promotes the task; no root changelog was hand-edited here.

## Task Ledger Patch Suggestion

Append the compact Review Ledger from the next section to Task 0148 without copying this full report.
