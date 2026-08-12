# Independent Re-review: Task 0157 — OmniRoute combo fail-soft unavailable models

## Verdict

**Score: 92/100 — REJECTED for the requested 100/100 gate.**
Task 0157 remains in `docs/tasks/02-doing/`. No other task was promoted.

## Scope

Reviewed the task and prior review report/Review Trail, current combo/accountFallback/error changes, focused regression tests, adjacent combo/account/cooldown/stream tests, and the Vitest target-exhaustion suite. No live MetaMuse or `:22000` request was made. No changelog or generated surface was changed.

## Resolved prior findings

- Retry-after aggregate errors now pass through bounded sanitization/redaction and preserve `Retry-After` plus the OpenAI-compatible error shape.
- Generic terminal 400 handling is mirrored in priority and round-robin: terminal generic 400 stops before the next target; structured model-access 400 remains fallback-safe.
- Focused F1/F2 regressions pass.

## Evidence

- `node --import tsx/esm --test tests/unit/combo-fail-soft-candidate-errors.test.ts`: **17/17 PASS**.
- Exact mocked MetaMuse account A contributor 404 (`Expected 'id'...`) → account B normal-model success: PASS.
- Account/model lockout and connection cooldown narrow to account A; provider breaker remains executable: PASS.
- Thrown, malformed, stream-related candidate, abort/499, retry-budget/cleanup, aggregate sanitization: PASS in focused matrix.
- `npx vitest run --config vitest.mcp.config.ts open-sse/services/combo/__tests__/targetExhaustion.test.ts`: **13/13 PASS**.
- Additional provider/account/cooldown suites: **43/43 PASS**.
- `npm run typecheck:core`: PASS, 0 TypeScript errors.
- Production source search found no speculative `Expected 'id' to be a string` parser/schema/envelope change; the literal remains only in incident test/task evidence.

## Blockers to 100/100

1. Adjacent requested combo/account run: **238/239**. Existing `tests/unit/combo-routing-engine.test.ts` test `handleComboChat context cache protection flushes cleanly when a stream ends without content` fails at line 2649 (`result.ok` false, expected true). Isolated rerun reproduces it.
2. Additional adjacent streaming matrix: **16/17**. Existing `tests/unit/combo-streaming-empty-content-failover.test.ts` test `#3685 empty Claude stream without message_start lifecycle → valid` fails at line 184 (`valid` false, expected true).
3. Scoped ESLint: 0 errors but **303 warnings**, all `@typescript-eslint/no-explicit-any` in the two test files. Strict `--max-warnings=0` fails.

The two stream failures appear unrelated to Task 0157's candidate-error changes, but the user requested independent review with focused adjacent stream evidence and a 100/100 decision. Therefore promotion is not permitted.

## Promotion decision

**Not promoted.** Leave Task 0157 in `02-doing/` with the exact blockers above.
