# Final Delta-Aware Re-Review: Task 0157 — OmniRoute combo fail-soft unavailable models

## Review lineage and scope

- **Task**: `docs/tasks/03-review/0157-omniroute-combo-fail-soft-unavailable-models.md`
- **Prior implementation review**: `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-review.md` — 78/100, rejected for retry-after redaction and generic-terminal-400 handling.
- **Prior remediation re-review**: `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-rereview.md` — 92/100, rejected only because that pass used a 100/100 gate and recorded unrelated adjacent stream failures/warnings.
- **Closure evidence**: Task 0157 `Path-to-100 Closure Matrix — builder refresh 2026-08-12`, especially F1/F2 rows and the TDD red→green summary.
- **Review type**: final delta-aware filesystem review after expert remediation.
- **Review date**: 2026-08-12.
- **Reviewer**: independent primary agent; no subagents or nested reviewers launched.
- **Safety scope**: no live MetaMuse request, no `:22000`, no credentials, no Task 0159, no source rollback, no changelog/tasklist mutation.

## Final score and verdict

### **Score: 94/100 — APPROVED**

The expert remediation is present on disk and closes both findings from the 78/100 review. The Retry-After aggregate response now uses the shared sanitized error-body path with bounded token-shaped redaction in both priority and round-robin flows. Generic terminal 400s now stop at the first target in both strategies, while positive model-access, context-overflow, and parameter-validation 400s remain fallback-safe. The original account-scoped 404 behavior, provider-breaker isolation, cancellation/retry bounds, cleanup, and raw-body redaction remain intact.

Under the operator rule, scores from 90 through 100 are approved. The task is therefore legally promoted to `docs/tasks/03-review/`; no new Path-to-100 review is required after this approval.

## Delta closure matrix

| Prior finding / evidence | Current filesystem result | Classification |
|---|---|---|
| F1: `unavailableResponse()` leaked `SECRET_TOKEN_123` on the Retry-After branch | `open-sse/utils/error.ts:312-395` now applies `sanitizeErrorMessage()`, token-shape redaction, a 240-character bound, and `buildErrorBody()` while retaining the `Retry-After` header. Fresh priority and round-robin all-fail probes returned `429`, `Retry-After: 60`, `rate_limit_error`, and no secret marker. | **RESOLVED** |
| F2: generic `invalid client payload` 400 fell through to target 2 | `open-sse/services/combo.ts:2712-2745` and `3785-3818` now stop when status is 400, `shouldFallback === false`, and no explicit fallback-safe positive predicate matches. Fresh priority and round-robin probes called only target 1 and returned 400. | **RESOLVED** |
| F2 positive fallback behavior | Model-access (`model_not_found` / invalid model), context-overflow, and parameter-validation 400s reached target 2 and returned 200 in the fresh matrix. Existing malformed/body-specific behavior remains terminal as intended by the legacy `#2101` contract. | **RESOLVED** |
| Prior adjacent stream failures | The same two unrelated failures remain reproducible in adjacent legacy stream tests. They are outside the Task 0157 F1/F2 source surface and do not fail the task-specific matrix. | **EVIDENCE GAP / OUT-OF-SCOPE** |
| Prior lint warning count | Scoped lint remains error-free but reports 303 `no-explicit-any` warnings in test mocks. No production lint errors were observed. | **BASELINE QUALITY NOTE** |

## Verification evidence

### Focused Task 0157 behavior

- `node --import tsx/esm --test tests/unit/combo-fail-soft-candidate-errors.test.ts`: **17/17 passed, 0 failed**.
  - Exact MetaMuse account A contributor 404 → account B normal-model success.
  - Account/model lockout and connection cooldown stay scoped to account A.
  - Provider breaker remains executable.
  - Thrown executor, malformed body, stream-related candidate failure, 499, abort, retry budget, and cleanup behavior.
  - Existing raw-body/detail/empty-body sabotage checks.
  - New F1 priority and round-robin Retry-After redaction tests.
  - New F2 priority and round-robin generic-terminal-400 tests.
  - New model-access positive fallback test and transient/generic negative test.
- Filtered F1/F2/sabotage run: **11/11 passed**.

### Fresh direct probes

- **Retry-After redaction, priority**: all candidates returned a mocked 429 containing `SECRET_TOKEN_123`; final response was status 429, `Retry-After: 60`, `type: rate_limit_error`, message `<token> ...`; secret absent.
- **Retry-After redaction, round-robin**: all candidates returned a mocked 429 containing `AKIA-DEMO-SECRET`; final response was status 429, `Retry-After: 60`, `type: rate_limit_error`, message `<token> ...`; secret absent.
- **Generic terminal 400, priority**: first target returned `invalid client payload`; final response was status 400 and `calls=[target-1]`.
- **Generic terminal 400, round-robin**: first target returned `invalid client payload`; final response was status 400 and target 2 was not called.
- **Fallback-safe 400 classes**: model-access, context-overflow, and parameter-validation cases continued to the next target and returned 200 in both strategy paths. A malformed-request 400 remained terminal under the existing body-specific contract.

### Adjacent and resilience evidence

- `npx vitest run --config vitest.mcp.config.ts open-sse/services/combo/__tests__/targetExhaustion.test.ts`: **13/13 passed**.
- Context/parameter regression subset: **28/28 passed**.
- Lockout, breaker, account-fallback, 400-rate-limit, and 402 fallback subset: **36/36 passed**.
- Abort/cleanup/retry/fallback subset: **14/14 passed**.
- Broader combo/account run: **212/213 passed**; one pre-existing `combo-routing-engine` stream-empty-content test failed (`context cache protection flushes cleanly when a stream ends without content`).
- Adjacent streaming matrix: **7/8 passed**; one pre-existing `#3685 empty Claude stream without message_start lifecycle` test failed. These failures were already recorded by the prior 92/100 re-review and are unrelated to the Task 0157 F1/F2 edits.
- `npm run typecheck:core`: **passed**, zero TypeScript errors.
- Scoped ESLint over task source and tests: **0 errors**, 303 `no-explicit-any` warnings in test mocks; no production errors.

## Required contract confirmation

| Contract | Result |
|---|---|
| Retry-After aggregate sanitization in priority | **PASS** |
| Retry-After aggregate sanitization in round-robin | **PASS** |
| Secret/token-shaped upstream text absent from final error | **PASS** |
| Generic terminal 400 stops first target | **PASS** in priority and round-robin |
| Model-access 400 remains fallback-safe | **PASS** |
| Context-overflow 400 remains fallback-safe | **PASS** |
| Parameter-validation 400 remains fallback-safe | **PASS** |
| Account/model 404 narrow lockout | **PASS** |
| Provider-breaker isolation for model-specific 404 | **PASS** |
| Abort/499 terminal behavior | **PASS** |
| Retry/global-attempt bounds | **PASS** |
| Semaphore/candidate registry cleanup | **PASS**; `finally` release and unregister paths remain present and exercised |
| Raw upstream body/detail/empty-body redaction | **PASS** |
| `Expected 'id' to be a string` layer discipline | **PASS**; no speculative production parser/schema change |

## Promotion result

- **Verdict**: **APPROVED**
- **Score**: **94/100**
- **Move**: completed legally from `docs/tasks/02-doing/0157-omniroute-combo-fail-soft-unavailable-models.md` to `docs/tasks/03-review/0157-omniroute-combo-fail-soft-unavailable-models.md`.
- **No further Path-to-100 pass requested** under the operator's 90–100 approval rule.
