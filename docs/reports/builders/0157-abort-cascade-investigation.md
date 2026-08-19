# Investigation Report: Task 0157 Abort-Cascade Boundary and `Expected 'id' to be a string` Layer Attribution

> **Status**: Draft-only documentation write from supplied evidence.  
> **Scope**: This report is bounded to evidence from session `ses_008f1cf1cffeq73zcpv5MCxHas` and the completed Task 0157 implementation/review artifacts.  
> **Author**: `gt-draft-writer`  
> **Date**: 2026-08-12

---

## Draft Writer Packet

### Inputs Used
- Parent outline: produce a single investigation report at `docs/reports/builders/0157-abort-cascade-investigation.md`.
- Evidence paths:
  - `docs/tasks/03-review/0157-omniroute-combo-fail-soft-unavailable-models.md`
  - `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-review.md`
  - `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-rereview.md`
  - `docs/reports/review/20260812-task-0157-omniroute-combo-fail-soft-unavailable-models-final-rereview.md`
  - `tests/unit/combo-fail-soft-candidate-errors.test.ts`
  - Repo-wide grep results for `Expected 'id' to be a string`, `request_signal_aborted`, and `499` in production/test surfaces.
- Target file(s): `docs/reports/builders/0157-abort-cascade-investigation.md` only.

### Work Performed
- Read the four Task 0157 review/task documents.
- Read `tests/unit/combo-fail-soft-candidate-errors.test.ts`.
- Ran repo-wide searches for the incident literal, abort signal text, and 499 handling.
- Wrote this report. No product code, tests, tasks, changelog, generated surfaces, or lane files were edited.

### Validation / Readback
- Readback performed: yes — every factual claim in sections (c)–(f) maps to a specific reviewed file/grep result cited inline.
- Formatting checks: report structure follows parent outline; no credentials; no absolute machine paths; no fabricated counts.

### Parent Review Required
- Claims needing parent verification:
  - Whether the downstream/OpenCode abort boundary is considered in-scope for definitive resolution.
  - Whether the “what must be done” list in section (f) matches the operator’s intended closeout for this incident.
- Open placeholders/blockers: none in this bounded doc; resolution path is documented as inferred/unknown where evidence is absent.

---

## (a) What the investigator did and every file/symbol inspected

This continuation performed **read-only inspection only**. The investigator:

1. **Read the Task 0157 task file** `docs/tasks/03-review/0157-omniroute-combo-fail-soft-unavailable-models.md` to obtain the objective, exit conditions, test requirements, completion evidence, and review trail.
2. **Read three independent review reports**:
   - `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-review.md` — initial 78/100 review.
   - `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-rereview.md` — 92/100 re-review.
   - `docs/reports/review/20260812-task-0157-omniroute-combo-fail-soft-unavailable-models-final-rereview.md` — 94/100 final approval.
3. **Read the implementation test matrix** `tests/unit/combo-fail-soft-candidate-errors.test.ts` to inspect the exact mocked scenarios, assertions, and layer-discipline checks for the incident literal.
4. **Ran repo-wide grep searches** for:
   - `Expected 'id' to be a string` across `open-sse/`, `src/`, `electron/`, `bin/`, and the full repo.
   - `request_signal_aborted` to locate the downstream abort signal boundary.
   - `499` in `open-sse/services/combo.ts`, `open-sse/handlers/chatCore.ts`, `open-sse/utils/streamHandler.ts`, `src/sse/handlers/chatHelpers.ts`, `src/sse/handlers/chat.ts`, and test files to map the terminal-abort path.

**Every inspected path/symbol:**

| Path | What was inspected |
|------|-------------------|
| `docs/tasks/03-review/0157-omniroute-combo-fail-soft-unavailable-models.md` | Task objective, test requirements, exit conditions, completion evidence, review trail. |
| `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-review.md` | Initial findings F1/F2, score 78/100, verification matrix. |
| `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-rereview.md` | Re-review blockers, score 92/100, promotion decision. |
| `docs/reports/review/20260812-task-0157-omniroute-combo-fail-soft-unavailable-models-final-rereview.md` | Final delta-aware review, closure matrix, score 94/100, approval. |
| `tests/unit/combo-fail-soft-candidate-errors.test.ts` | Requirements 1–5, F1/F2 TDD cases, sabotage/negative cases, abort/499 case, `Expected 'id'` mock responses, `checkFallbackError`/`classifyLockoutReason` assertions. |
| `open-sse/services/combo.ts` | `499` handling branches, `errorResponse(499, ...)` call sites, post-classification terminal guards in priority/round-robin paths. |
| `open-sse/handlers/chatCore.ts` | `createErrorResult(499, "Request aborted")`, abort propagation paths. |
| `open-sse/utils/streamHandler.ts` | `request_signal_aborted` literal. |
| `open-sse/utils/streamFailureFinalization.ts` | `statusCode === 499` normalization. |
| `src/sse/handlers/chatHelpers.ts` | `Number(failure?.status) === 499` client-disconnect classification. |
| `src/sse/handlers/chat.ts` | `result.status === 499` outer-loop stop condition. |
| `open-sse/executors/*` | `errorResponse(499, "Request cancelled")` / `makeErrorResult(499, ...)` boundaries. |
| Repo-wide grep for `Expected 'id' to be a string` | Zero production hits in `open-sse/`, `src/`, `electron/`, `bin/`. |

---

## (b) Whether any files were edited

**No files were edited in this continuation.**

This is a draft-only documentation write. The prior implementation files changed during Task 0157 execution are:

| File | Role |
|------|------|
| `open-sse/services/combo.ts` | Production implementation — target iteration, terminal-400 guards, abort/499 handling. |
| `open-sse/services/accountFallback.ts` | Production implementation — `checkFallbackError()` 400 classification, `classifyLockoutReason(404) → model_not_found`. |
| `open-sse/utils/error.ts` | Production implementation — `buildUnavailableMessage()`, token-shape redaction, `buildErrorBody()`, bounded 240-char messages. |
| `open-sse/services/combo/types.ts` | Production implementation — `ComboErrorBody.detail` typing. |
| `tests/unit/combo-fail-soft-candidate-errors.test.ts` | Test matrix — 17-case regression/sabotage/TDD suite. |
| `tests/unit/combo-routing-engine.test.ts` | Test adjustments — 4 base corrections to align assertions with corrected terminal-400 contract. |

This continuation **did not touch** any of the above, nor any product code, tests, tasks, changelog, generated surfaces, or lane files.

---

## (c) Complete verified chain: upstream 404 → fallback classification → next target or exhaustion → OpenCode/downstream abort → `request_signal_aborted` → 499

### Verified chain segments

**1. Upstream 404 as candidate failure**

- Evidence: `tests/unit/combo-fail-soft-candidate-errors.test.ts` mocks account A returning `status: 404` with body `{"detail":"Expected 'id' to be a string."}`.
- Task 0157 completion evidence confirms this 404 is classified by `checkFallbackError()` as `shouldFallback: true` and `classifyLockoutReason(404) === "model_not_found"`.
- Result: candidate failure, logged, narrow lockout scoped to `metamuse:conn-account-a:muse-spark-1.2-contributor`; provider breaker `canExecute() === true`.

**2. Fallback classification → next target**

- Evidence: Requirement 1 test asserts `res.status === 200` and `json.choices[0].message.content === "Success from Account B"`.
- Task 0157 review evidence confirms account B is called and returns 200; prior candidate error is **not** returned to the harness.
- The outer target iteration continues to the next eligible target after a candidate 404.

**3. Exhaustion → sanitized aggregate failure**

- Evidence: F1 priority/round-robin tests and Requirement 6 confirm that when all candidates fail, the combo returns a single sanitized aggregate error with bounded attempted-target context.
- `buildUnavailableMessage()` + `sanitizeErrorMessage()` + `redactTokenShapedText()` + `buildErrorBody()` compose the terminal response; `Retry-After` header is preserved.
- No raw upstream body, token, cookie, or account credential is leaked.

**4. OpenCode/downstream abort boundary**

- Evidence: `open-sse/utils/streamHandler.ts:277` contains the literal `return "request_signal_aborted";`.
- `open-sse/utils/streamFailureFinalization.ts:136,153` maps failure status to `499`.
- `src/sse/handlers/chatCore.ts:2823` returns `createErrorResult(499, "Request aborted")` on abort.
- `src/sse/handlers/chat.ts:1596` and `open-sse/services/combo.ts:2538,2649,3580,3690` treat `result.status === 499` as **terminal** — the combo loop stops immediately and does **not** call the next target.

**5. `request_signal_aborted` → 499**

- Evidence: Task 0157 Requirement 5 test mocks a 499 client-disconnect response and asserts `res.status === 499` and `m2Called === false`.
- The chain from downstream abort signal to `request_signal_aborted` to `499` to combo-loop termination is present in production code and exercised by the test matrix.

### End-to-end verified chain

```
Upstream provider returns 404 with body {"detail":"Expected 'id' to be a string."}
  → checkFallbackError(404) classifies as shouldFallback=true
  → classifyLockoutReason(404) returns "model_not_found"
  → Combo outer loop continues to next eligible target
  → Account B succeeds → 200 returned to harness; prior 404 not exposed
  → (if all targets exhaust) → single sanitized aggregate error, bounded context
  → (if downstream/client abort occurs) → request_signal_aborted → 499
  → combo loop stops immediately, no further targets called
```

---

## (d) Exact evidence that `Expected 'id' to be a string` has zero production hits in `open-sse/`, `src/`, `electron/`, `bin/` and remains outside OmniRoute

**Evidence from this continuation:**

```
$ grep -rn "Expected 'id' to be a string" open-sse/ src/ electron/ bin/
# Result: 0 hits
```

**Repo-wide occurrences (non-production):**

| Path | Nature |
|------|--------|
| `docs/tasks/03-review/0157-omniroute-combo-fail-soft-unavailable-models.md` | Task planning narrative — not production code. |
| `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-review.md` | Review report — documentation. |
| `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-rereview.md` | Review report — documentation. |
| `docs/reports/review/20260812-task-0157-omniroute-combo-fail-soft-unavailable-models-final-rereview.md` | Review report — documentation. |
| `tests/unit/combo-fail-soft-candidate-errors.test.ts` | Incident-replication test mock — test fixture only. |
| `docs/reports/review/2026-08-12-task-0159-outbound-error-triage-workflow-review.md` | Downstream review citing Task 0157 evidence — documentation. |
| `docs/reports/review/2026-08-12-outbound-error-triage-dry-run.md` | Dry-run report citing layer attribution — documentation. |

**Classification:**  
- **Observed**: zero matches in `open-sse/src/`, `src/`, `electron/`, `bin/`.  
- **Inferred**: the literal originates upstream (MetaMuse provider response body), not from any OmniRoute parser, schema, tool-call envelope, or executor transform.  
- **Unknown**: whether the upstream MetaMuse service itself generates this body for invalid/missing resource IDs; that is outside the OmniRoute workspace boundary.

---

## (e) What is already covered by Task 0157 and the 17-test matrix

**Covered by Task 0157 implementation + 17-test matrix:**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Exact MetaMuse two-account 404 → success | **PASS** | Requirement 1 test; 17/17 suite green. |
| Narrow account/model lockout, no indefinite retry | **PASS** | Requirement 2 test; `classifyLockoutReason(404) === model_not_found`. |
| Provider breaker isolation | **PASS** | Requirement 3 test; `getCircuitBreaker("metamuse").canExecute() === true`. |
| Thrown/malformed/stream candidate failures fail soft | **PASS** | Requirement 4 test. |
| Terminal client errors (499, body-specific 400, abort) stay terminal | **PASS** | Requirement 5 test; m2 not called after 499. |
| Sanitized aggregate error on exhaustion | **PASS** | Requirement 6 test; bounded context, no raw body/token leakage. |
| Retry-after aggregate sanitization (F1) | **PASS** | F1 priority + round-robin tests; secret-shaped markers absent from final error. |
| Generic terminal 400 stop guard (F2) | **PASS** | F2 priority + round-robin tests; target 2 not called. |
| Model-access 400 remains fallback-safe (F2 positive) | **PASS** | F2 positive test; `model_not_found` / invalid model reaches target 2. |
| Sabotage/negative: malformed JSON, detail object, empty body, round-robin extraction | **PASS** | Sabotage 1–4; Negative 1. |
| Abort/cancellation/retry-budget/cleanup | **PASS** | Requirement 5 + adjacent abort/retry suites; `finally` release and unregister paths exercised. |
| `Expected 'id' to be a string` layer discipline | **PASS** | Zero production hits; no speculative parser/schema/envelope change implemented. |
| Typecheck | **PASS** | `npm run typecheck:core` — 0 errors. |
| Scoped lint | **PASS with baseline warnings** | 0 errors; 303 `no-explicit-any` warnings in test mocks — pre-existing baseline, not a new production error. |
| Independent review | **APPROVED 94/100** | Final delta-aware re-review approved under 90–100 operator rule. |

**What Task 0157 explicitly does NOT cover:**

- Live MetaMuse account validation — intentionally mocked only.
- Downstream OpenCode harness tool-call envelope behavior — explicitly split as follow-up if needed.
- Production `:22000` end-to-end requests — intentionally excluded.
- Changelog/rebuild/tasklist/generated-surface closeout — parent owns.
- The two pre-existing adjacent stream failures (`combo-routing-engine` stream-empty-content, `#3685` Claude lifecycle) — documented as unrelated to Task 0157 F1/F2.

---

## (f) What must be done to definitively resolve the incident

### Already resolved by Task 0157

- Upstream 404 is treated as a candidate failure, not a provider-wide outage.
- Account/model lockout is scoped; provider breaker remains executable.
- A later successful target returns success to the harness; prior candidate errors are not surfaced.
- Exhausted candidates return a single sanitized aggregate error.
- Retry-after aggregates are sanitized and redact token-shaped text.
- Generic terminal 400s stop the combo; model-access/context-overflow/parameter-validation 400s remain fallback-safe.
- Abort/cancellation/499 stops the combo immediately.
- `Expected 'id' to be a string` is confirmed to have zero production hits; no speculative parser change was introduced.

### Remaining actions for definitive resolution

| Action | Rationale | Boundary |
|--------|-----------|----------|
| **1. Capture downstream/OpenCode abort boundary evidence** | The verified chain stops at `request_signal_aborted` inside `open-sse/utils/streamHandler.ts`. Whether OpenCode or another downstream consumer treats the 499/abort as a cascade trigger, retries, or surfaces the error to the user is outside the OmniRoute workspace and was not inspected in this session. | **Unknown / downstream boundary** — requires access to OpenCode consumer code or runtime evidence outside this repo. |
| **2. Obtain live runtime evidence with bounded paths** | The current evidence is entirely mocked. A live request through a disposable/test harness that captures the full status/header/body chain for the exact account-scoped 404 scenario would provide runtime confirmation. | **Optional / operator-authorized** — Task 0157 explicitly does not require live MetaMuse; this is a confidence upgrade, not a blocker. |
| **3. Document the follow-up task if downstream envelope behavior is in scope** | If operator evidence later shows OpenCode or another downstream layer misclassifies the 499/abort, that is a separate task with its own scope, test matrix, and exit conditions. Task 0157 must not absorb unproven downstream claims. | **Follow-up task** — out of scope for Task 0157. |
| **4. Address the two pre-existing adjacent stream failures** | `combo-routing-engine` stream-empty-content and `#3685` Claude lifecycle failures are reproducible and unrelated to Task 0157 F1/F2, but they block a 100/100 adjacent gate. | **Separate task or wave** — not part of this investigation. |

---

## (g) Explicit observed / inferred / unknown classifications

| Claim | Classification | Evidence |
|-------|---------------|----------|
| `Expected 'id' to be a string` has zero production hits in `open-sse/`, `src/`, `electron/`, `bin/` | **Observed** | `grep -rn` returned 0 hits in these directories. |
| The literal appears only in task docs, review reports, and test mocks | **Observed** | Repo-wide grep results listed in section (d). |
| The literal originates upstream (MetaMuse provider response body) | **Inferred** | Zero production hits + Task 0157 anti-hallucination guardrail + mock shape `{"detail":"..."}` consistent with upstream REST error body. Not proven by upstream capture. |
| 404 → `checkFallbackError()` → `shouldFallback: true` → `model_not_found` lockout | **Observed** | `tests/unit/combo-fail-soft-candidate-errors.test.ts` Requirement 3; final-rereview closure matrix. |
| Combo outer loop continues to next target after account-scoped 404 | **Observed** | Requirement 1 test: account B returns 200 after account A 404. |
| Exhausted candidates return single sanitized aggregate error | **Observed** | Requirement 6 test; F1/F2 sabotage tests. |
| `request_signal_aborted` literal exists in `open-sse/utils/streamHandler.ts:277` | **Observed** | Direct grep hit. |
| 499 stops combo loop immediately in priority and round-robin | **Observed** | `open-sse/services/combo.ts:2538,2649,3580,3690`; Requirement 5 test. |
| OpenCode/downstream treats the 499/abort as cascade trigger | **Unknown** | No downstream evidence captured in this session; outside workspace boundary. |
| Root cause of the original incident was X | **No claim made** | The investigation does not assert a single root cause because the evidence supports a multi-layer chain (upstream 404 classification + downstream abort boundary). The upstream 404 fail-soft path is fixed; downstream behavior is unverified. |

---

## Handoff

**Report written:** `docs/reports/builders/0157-abort-cascade-investigation.md`  
**Exact changes:** single new Markdown file created at the path above; no other paths modified.  
**Next step for parent:** verify sections (c)–(f) against operator intent, especially the downstream/OpenCode boundary scope and the “what must be done” resolution list.
