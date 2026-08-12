# Independent Review: Task 0157 — OmniRoute combo fail-soft unavailable models

## Review lineage and scope

- **Task**: `docs/tasks/02-doing/0157-omniroute-combo-fail-soft-unavailable-models.md`
- **Review type**: independent implementation/reviewer pass after builder and expert polish pass
- **Review date**: 2026-08-11
- **Reviewer**: independent primary agent
- **Threshold**: `90–100 = APPROVED`; below 90 remains in `02-doing`
- **Scope respected**: no live MetaMuse request, no `:22000`, no git mutation, no changelog/tasklist mutation

## Final score and verdict

### **Score: 78/100 — REJECTED / remain in `02-doing`**

The implementation successfully proves the central account-scoped 404 fail-soft path, but two terminal-boundary defects remain. First, the `retryAfter` aggregate branch calls `unavailableResponse()` with the last extracted upstream message without passing it through the normal error sanitizer. A direct mocked probe returned `SECRET_TOKEN_123` to the caller. Second, the combo loop explicitly treats every non-499 non-body-specific response as target-local and continues, even when `checkFallbackError()` classifies a generic 400 as non-fallback/terminal. A direct probe with `{"message":"invalid client payload"}` returned the second target's success. Both findings violate the task's sanitization and terminal-error requirements, so legal promotion is not allowed.

## Score breakdown

| Axis | Score | Basis |
|---|---:|---|
| Exact incident behavior | 25/25 | Focused 11-test suite proves MetaMuse/account A 404 → account B success, narrow lockout, no provider breaker trip, and no prior error returned after success. |
| Candidate classification and resilience scope | 18/20 | 404 maps to `model_not_found`; account/model state is scoped; provider breaker remains executable; retry and global-attempt bounds are present. |
| Terminal-error correctness | 10/20 | 499, abort, and body-specific 400 are terminal, but a generic 400 classified as non-fallback still advances to the next target. |
| Sanitization and aggregate output | 5/20 | Shared extraction bounds malformed/unknown bodies, but `unavailableResponse()` bypasses `buildErrorBody()`/`sanitizeErrorMessage()` on the `retryAfter` path; secret-shaped message leakage is reproduced. |
| Tests, typecheck, lint, and evidence | 20/15 | Focused 11/11, Vitest exhaustion 13/13, typecheck clean; scoped ESLint has 0 errors but 30 `no-explicit-any` warnings. Capped at 15 because neither remaining defect has a regression test and one adjacent suite was invoked with the wrong Node runner before the correct Vitest rerun. |
| **Overall** | **78/100** | High-value fail-soft behavior is present, but security and terminal-boundary gaps block approval. |

## Findings

### F1 — High: retry-after aggregate response leaks unsanitized upstream message

**Location**: `open-sse/services/combo.ts:3028-3035`; `open-sse/utils/error.ts:320-334`

When `earliestRetryAfter` is present, the priority and round-robin paths call:

```ts
return unavailableResponse(status, msg, earliestRetryAfter, retryHuman);
```

`unavailableResponse()` interpolates `message` directly into the JSON response and does not call `sanitizeErrorMessage()` or `buildErrorBody()`. The normal no-retry-after branch uses `errorResponse()` and therefore has a different safety property.

Fresh mocked probe:

```json
{"status":429,"body":"{\"error\":{\"message\":\"SECRET_TOKEN_123 (reset after 634577h 28m 14s)\"}}","leaks":{"secret":true,"date":false}}
```

The probe used only a mocked upstream response with `error.message = "SECRET_TOKEN_123"` and a future `retryAfter`; no provider or production endpoint was contacted. This directly contradicts the task's requirement that exhausted-candidate output not expose tokens or raw provider material. The existing focused sabotage tests cover malformed JSON, detail objects, empty bodies, and round-robin extraction, but do not exercise the retry-after aggregate branch.

**Required fix**:

- Sanitize the message inside `unavailableResponse()` (preferably route through `buildErrorBody()` while preserving the retry headers), or sanitize at every call site with a tested invariant.
- Add a regression test with a retry-after response containing a secret-shaped message and assert the response body contains neither the secret nor an unsanitized raw upstream fragment.
- Re-run both priority and round-robin exhausted paths.

### F2 — High: generic terminal 400 is incorrectly treated as fallback-safe

**Location**: `open-sse/services/combo.ts:2655-2660`, `2712-2755`, and the corresponding round-robin target-level continuation at `3682-3685`

The combo code states that classification is retained only for retry/cooldown pacing and “must not decide whether fallback happens, including for generic 400 responses.” The only 400 stop condition is a text heuristic for body-specific messages (`context`, `prompt`, `token`, `malformed`, `invalid`, `bad request`) after excluding model-access and parameter-validation cases.

A direct mocked probe returned:

```json
{"status":200,"calls":["p1/m1","p2/m2"],"body":"{\"choices\":[{\"message\":{\"content\":\"fallback\"}}]}"}
```

The first target returned status 400 with `{"error":{"message":"invalid client payload"}}`; the second target succeeded. `checkFallbackError()` separately classifies a generic client 400 as non-fallback/terminal, and the task explicitly requires legitimate terminal client errors to remain terminal. The current orchestration overrides that contract unless the body happens to match the heuristic.

This is distinct from the existing body-specific 400 regression: that test proves one narrow stop heuristic, not that all explicitly terminal 400s remain terminal.

**Required fix**:

- Preserve `fallbackResult.shouldFallback === false` as terminal unless a documented, explicit exception proves the 400 is model/account scoped or otherwise safe to retry.
- Keep model-access/context/parameter cases fallback-safe through a positive classification, not a broad “all target errors continue” default.
- Add a regression test for a generic terminal 400 that asserts target 2 is not called, alongside existing model-access 400 fallback coverage.
- Mirror the contract in both priority and round-robin paths.

## Verification matrix

| Obligation | Status | Evidence |
|---|---|---|
| Account A contributor 404 → account B success | PASS | `node --import tsx/esm --test tests/unit/combo-fail-soft-candidate-errors.test.ts`; 11 passed. |
| Narrow account/model lockout | PASS | Focused requirements 2–3; `classifyLockoutReason(404) === model_not_found`; provider breaker remains executable. |
| Thrown/malformed/stream candidate failures continue | PASS | Focused Requirement 4 passed. |
| 499 and abort terminal behavior | PASS | Focused Requirement 5 and `tests/unit/combo-499-abort.test.ts` passed. |
| Body-specific 400 terminal behavior | PASS | `tests/unit/combo-body-specific-400-stop-4279.test.ts` passed. |
| Generic explicitly terminal 400 remains terminal | **FAIL** | Direct mock probe reached target 2 after generic 400. No permanent regression test exists. |
| Aggregate malformed/detail/empty-body sanitization | PASS | Focused sabotage tests 1–4 passed. |
| Aggregate retry-after sanitization | **FAIL** | Direct mock probe exposed `SECRET_TOKEN_123` through `unavailableResponse()`. |
| Exhaustion classification regressions | PASS | `npx vitest run open-sse/services/combo/__tests__/targetExhaustion.test.ts`: 13 passed. |
| Core typecheck | PASS | `npm run typecheck:core` exit 0. |
| Scoped lint | PASS with warnings | 0 errors; 30 `no-explicit-any` warnings in the focused test mocks. |
| Full repository lint | NOT ACCEPTED AS FRESH EVIDENCE | The broad `npm run lint -- ...` invocation traversed `.build` and timed out; no new source error was established. |
| Changelog/rebuild | OUT OF REVIEWER SCOPE | Task says parent orchestrator owns this draft/closeout; no changelog mutation performed. |

## Path to 100

1. Make `unavailableResponse()` sanitize its message or use the shared sanitized error-body builder, preserving `Retry-After` behavior.
2. Add retry-after secret-redaction tests for priority and round-robin aggregate failures.
3. Restore terminal semantics from `checkFallbackError()` for generic non-fallback 400 responses; make model-access/context/parameter exceptions explicit and positive.
4. Add a generic terminal-400 regression proving later targets are not called, plus a model-access-400 regression proving eligible fallback still occurs.
5. Re-run the focused suite, adjacent Node suites, the Vitest-owned exhaustion suite, `npm run typecheck:core`, and scoped lint; remove or justify the 30 test-mock `any` warnings.
6. Refresh Task 0157 Completion Evidence and obtain a new independent review. Only a fresh score of at least 90 permits promotion under the stated review policy.

## Move result

- **Move result**: **Not moved**.
- **Task location**: remains `docs/tasks/02-doing/0157-omniroute-combo-fail-soft-unavailable-models.md`.
- **Reason**: score 78/100, below the 90-point approval threshold.
- **No production/live provider access**: confirmed; all new probes used mocked responses and local code.
