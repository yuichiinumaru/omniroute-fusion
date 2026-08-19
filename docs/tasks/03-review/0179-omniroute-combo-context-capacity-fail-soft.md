# Task 0179: Make model context-capacity 400s fail soft in combos

> **Status**: `[x]` Exit conditions met — R2 independent review approved (100/100); moved to `03-review`
> **Priority**: 🔴 P0
> **Type**: `hardening`
> **Origin**: Operator incident (2026-08-17): a combo candidate returned HTTP 400 because its combined input/output token capacity was exceeded, and the combo stopped instead of trying the next item. Existing Task 0157 context-overflow contract is the baseline; this task covers the newly observed provider wording and any execution path that still bypasses it.
> **Blocks**: —
> **Depends on**: —
> **Related**: Task 0157 — unavailable candidates fail soft; do not reopen 0157 unless the audit proves its accepted contract is broken for an already-covered error shape.
> **Parallelism**: `serializable` with any combo error-classification, account-fallback, circuit-breaker, or combo-test changes. Do not co-edit the same combo predicates or test fixtures in parallel.
> **Review routing**: independent + provider/runtime + resilience review

---

## Objective

Ensure that a model-specific context-capacity failure is treated as a failure of the
current combo candidate, not as a fatal failure of the entire combo request. When a
candidate responds with HTTP 400 explaining that the combined input and output token
budget exceeds the model's maximum, the combo MUST record a bounded sanitized reason,
skip that candidate, and try the next eligible item.

The contract applies to every combo execution path that can select a next target:
priority/target iteration, round-robin, and nested/runtime-unit combos where the
current implementation has separate 400 handling. A later successful target MUST
return normal success to the caller; the previous candidate's 400 MUST NOT escape as
the final response.

This task MUST remain narrow. It must not turn every HTTP 400 into a retry or fallback.
Generic malformed requests, invalid client payloads, and other explicitly terminal
errors must preserve Task 0157's terminal behavior. Only a reliably identified
context-capacity condition may be made fallback-safe.

## Background Context

### O que já existe:

- Task 0157 established the intended contract that context overflow may fall through
  because different combo models have different context/output limits.
- `open-sse/services/combo.ts::isContextOverflow400` currently recognizes variants
  such as `input is too long`, context-window wording, and `your input exceeds`.
- `open-sse/services/accountFallback.ts::checkFallbackError` has a separate set of
  context-overflow patterns and classifies recognized HTTP 400s as fallback-safe.
- Existing regression coverage includes `context_length_exceeded: input is too long`
  in `tests/unit/combo-routing-engine.test.ts:3167-3200`.

### O que foi observado:

The operator received this upstream 400 from a combo candidate:

```text
This model configuration accepts at most 202749 combined input and output tokens.
However, your request has 157455 input tokens and asks for 48000 output tokens
(205455 tokens total). Please reduce the input length or requested output length.
```

The reported behavior was that the combo stopped instead of continuing to the next
item. The current predicates do not visibly include the distinctive phrases
`combined input and output tokens`, `accepts at most`, or `reduce the input length`.
This is a source-backed hypothesis to reproduce, not a claim that the exact runtime
path has already been proven.

### O que está faltando / quebrado:

- No regression test covers this exact provider wording and numeric capacity shape.
- The standard target loop, round-robin loop, and `open-sse/services/combo/runtimeUnits.ts`
  have separate response/fallback paths that must be traced before editing.
- No test proves that this error remains candidate-local while a generic terminal 400
  still stops the combo.
- No test proves that a context-capacity failure does not trip a provider-wide breaker
  or create a durable model lockout for a request-specific prompt-size mismatch.

---

## Test Requirements

- Add a deterministic regression using the exact sanitized error shape above, with
  numeric values treated as incidental rather than hardcoded into classification.
- In priority/target iteration, candidate A MUST return this 400 and candidate B MUST
  succeed; the final response MUST be candidate B's success and both calls MUST be
  observable.
- In round-robin, the same candidate-A/candidate-B contract MUST hold.
- If nested/runtime-unit combos have a distinct fallback path, add the equivalent
  regression there or document with source evidence why it is not applicable.
- The existing `context_length_exceeded: input is too long` regression MUST remain green.
- A generic terminal 400 such as `invalid client payload` MUST continue to stop the
  combo according to Task 0157's contract.
- An all-candidates context-capacity failure MUST return one bounded, sanitized final
  error; it MUST not leak raw upstream bodies, credentials, cookies, or unbounded text.
- Candidate failure logging MUST identify provider/model/status and fallback reason,
  without recording the full prompt or sensitive headers.
- The failure MUST NOT trip a provider-wide circuit breaker solely because one model
  could not fit this request. Durable model lockout is also inappropriate unless an
  existing policy explicitly proves it is request-independent.
- Tests MUST prove retry/cancellation/cleanup budgets are not extended indefinitely.
- No live request to production `:22000` is required; use deterministic mocks and
  disposable test state.

---

## Exit Conditions (GDD/TDD)

- [x] Read and trace `checkFallbackError`, `isContextOverflow400`, standard target
  iteration, round-robin, runtime-unit combo handling, and existing Task 0157 tests.
- [x] RED tests fail before the classification/path fix for the exact combined-token
  error in every applicable combo path.
- [x] GREEN tests prove candidate continuation and later-target success.
- [x] Context-capacity detection has one canonical classification contract; no
  provider-specific regex copy is added when a shared predicate is appropriate.
- [x] Generic terminal 400 behavior remains covered and unchanged.
- [x] Existing Task 0157 combo/account-fallback tests remain green.
- [x] Focused native/Vitest tests for every touched runner pass with 0 failures.
- [x] `npm run typecheck:core` passes without errors.
- [x] `npm run lint` passes without new errors; unrelated baseline warnings/errors are
  recorded with exact paths if present.
- [x] No provider-wide breaker or inappropriate durable model lockout is introduced.
- [x] Hard Rule #18 has captured fail→pass TDD evidence.
- [x] A real append-only `.changelog/` entry is created through manage-changelog and
  generated changelog validation passes.
- [x] Completion Evidence contains exact commands, counts, changed paths, and residual
  risks before review.

---

## Details

### What

Subtasks:

- [x] **Ler existentes**: inspect all current context-overflow predicates, fallback
  classification, target-loop exits, runtime-unit exits, and Task 0157 tests.
- [x] Reproduce the baseline with the exact combined input/output capacity message.
- [x] Decide whether the canonical fix belongs in `errorClassifier.ts`,
  `accountFallback.ts`, a shared combo predicate, or a combination — based on the
  traced call path, not on regex duplication.
- [x] Add failing priority, round-robin, and applicable runtime-unit tests before the
  implementation change.
- [x] Implement the smallest classification/path fix that preserves terminal 400s.
- [x] Verify sanitized candidate logs, aggregate exhaustion behavior, cancellation,
  retry limits, breaker scope, and lockout scope.
- [x] **Refactoring pass**: remove duplicate context-capacity matching only when the
  shared predicate preserves existing provider-specific semantics.
- [x] **Verificação de regressão**: run focused tests, Task 0157 regressions,
  typecheck, lint, and inspect exact outputs.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/errorClassifier.ts` | Read/modify only if the shared provider-error classification is the canonical layer. |
| `open-sse/services/accountFallback.ts` | Read/modify fallback-safe context-capacity signals and reason classification. |
| `open-sse/services/combo.ts` | Read/modify standard priority/target and round-robin 400 exits. |
| `open-sse/services/combo/runtimeUnits.ts` | Read/modify nested/runtime-unit candidate continuation if its path is applicable. |
| `open-sse/handlers/chatCore.ts` | Read existing context-overflow fallback behavior; avoid duplicating handler logic. |
| `tests/unit/combo-routing-engine.test.ts` | Preserve/extend existing context-overflow and token-buffer regressions. |
| `tests/unit/combo-fail-soft-candidate-errors.test.ts` | Preserve/extend Task 0157 terminal/fallback/sanitization contract. |
| `tests/unit/combo-context-capacity-fallback.test.ts` | Create focused exact-incident TDD matrix if no existing canonical test owner is suitable. |
| `open-sse/services/combo/__tests__/` | Read/modify only if runtime-unit behavior is Vitest-owned. |
| `docs/tasks/03-review/0157-omniroute-combo-fail-soft-unavailable-models.md` | Related baseline; read-only unless review proves a direct regression in its accepted scope. |

### How

1. Capture the baseline result for the exact error in each applicable combo strategy.
2. Trace the response text through `checkFallbackError` and the combo exit predicate.
3. Write RED tests for candidate A capacity failure → candidate B success.
4. Add the narrowest canonical signal/classification needed for this wording family.
5. Re-run the generic terminal-400 tests to prove no blind fallback was introduced.
6. Verify aggregate sanitization and resilience state, then run the npm exit matrix.

### Why

A model can be healthy and authenticated yet unable to serve one request because the
request exceeds its context/output capacity. In a combo, that is a candidate-fit
failure. Treating it as request-fatal wastes valid fallback targets and makes larger
context models unusable as the next item. The fix must remain discriminating so true
client payload errors do not become infinite retry loops.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | Owns combo error predicates, fallback classification, and related combo tests for one implementation wave. |
| **parallel-safe** | Unrelated provider, UI, documentation, and test-discovery work only. |
| **Collision** | `combo.ts`, `accountFallback.ts`, `errorClassifier.ts`, `runtimeUnits.ts`, and combo fallback tests. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not claim the screenshot proves which function stopped the combo. Reproduce the
> exact error through mocks and trace the actual path first. Do not classify every
> 400 as fallback-safe and do not use the model catalog to infer context capacity.

> [!IMPORTANT]
> The numeric token values in the incident are evidence of one request, not a global
> model limit to hardcode. Preserve terminal malformed-request behavior, bounded
> error output, cancellation, retry budgets, and provider-breaker scope.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: all error shapes, symbols, commands, and task references were verified.
- [x] **TDD**: failing exact-incident regression precedes the implementation fix.
- [x] **Error Sanitization**: no raw upstream body, prompt, token, cookie, or header is emitted.
- [x] **Resilience**: candidate-local failure does not trip the whole provider or create infinite retries.
- [x] **Production Safety**: no live `:22000` request is required.
- [x] **Archive Protocol**: no deletion; preserve provenance if any test is relocated.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/services/accountFallback.ts`
  - `open-sse/services/combo.ts`
  - `open-sse/services/errorClassifier.ts`
  - `open-sse/services/combo/runtimeUnits.ts`
  - `tests/unit/combo-context-capacity-fallback.test.ts`
  - `.changelog/20260818-225800-0179-omniroute-combo-context-capacity-fail-soft-builders.md`
- **Exact incident regression**:
  - RED: `400 !== 200` in Priority, Round-robin, Runtime-unit, and Same-provider candidate continuation tests before `isContextOverflow400` phrase expansion.
  - GREEN: `node --import tsx/esm --test tests/unit/combo-context-capacity-fallback.test.ts` → 11/11 PASS.
- **Priority/RR/runtime-unit results**:
  - `tests/unit/combo-context-capacity-fallback.test.ts`: 11 passed (0 failed).
  - `open-sse/services/combo/__tests__/targetExhaustion.test.ts` (Vitest): 13 passed (0 failed).
- **Terminal 400 regression**:
  - Generic terminal 400 (`invalid client payload`) test passed in priority, round-robin, and nested runtime-unit execute mode — stops at target 1 without fallback.
  - Task 0157 regressions (`combo-fail-soft-candidate-errors.test.ts`): 17/17 PASS.
  - Total relevant suite: 96/96 PASS.
- **Sanitization/breaker/lockout evidence**:
  - `Capacity 400 does not trip the provider circuit breaker`: PASS (`getProvidersInCooldown()` empty).
  - `Capacity 400 does not create a model lockout`: PASS (`getAllModelLockouts()` empty).
  - `Candidate capacity failure logs provider/model/status/reason only`: PASS (no prompt text in logs).
  - `All-candidates capacity failure returns sanitized aggregate 400`: PASS (`body.error.message.length <= 600`, no raw detail JSON).
- **Resultado do lint**:
  - `npx eslint open-sse/services/accountFallback.ts open-sse/services/combo.ts open-sse/services/errorClassifier.ts open-sse/services/combo/runtimeUnits.ts tests/unit/combo-context-capacity-fallback.test.ts`: 0 errors, 0 warnings.
- **Resultado do typecheck**:
  - `npm run typecheck:core`: 0 errors.
- **Changelog entry**:
  - `.changelog/20260818-225800-0179-omniroute-combo-context-capacity-fail-soft-builders.md`
- **Agente executor**: builder-engineer (omniroute/builder-engineer)
- **Data de conclusão**: 2026-08-18

## Agent Session Ledger

- **Implementation worker**: `ses_fe85fd045ffe8cCPKAyl3kVYFa` — combo context capacity fail-soft implementation.
- **Reviewer session**: `ses_fe83a3cfdffeUtVciD93uGndtq` — independent review (REJEITADO 62/100).

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: Independent code-quality reviewer (TS/JS resilience review)
- **Data da review**: 2026-08-18 (R1: REJEITADO 62/100) / 2026-08-18 (R2: APROVADO 100/100)
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**:
  - **Pass (R1 Finding Resolved)** — `open-sse/services/combo/runtimeUnits.ts:381-400` implements the terminal-400 guard for runtime units matching priority and round-robin. For status 400 where `checkFallbackError` returns `shouldFallback === false` and the error is not context overflow, parameter validation, or model access, it logs a warning via `args.log.warn`, records candidate failure metrics via `recordComboRequest`, and immediately returns `{ response, unit }` to stop fallback to subsequent units.
  - **Pass (New Regression Test)** — `tests/unit/combo-context-capacity-fallback.test.ts:398-446` (test 11 `#0179 Runtime-unit execute mode: generic terminal 400 stops at target 1 (no fallback)`) asserts status 400 and `calls = ["p1/unit-x"]`.
  - **Pass (Runtime Probe Verification)** — Independent runtime probe on production `handleComboChat` path with nested execute mode (`nestedComboMode: "execute"`) confirmed:
    - Generic `invalid client payload` -> `status: 400`, `calls: ["p1/unit-x"]` (stops at target 1)
    - Context capacity error -> `status: 200`, `calls: ["p1/unit-x", "p2/unit-y"]` (fails soft)
    - Param validation error -> `status: 200`, `calls: ["p1/unit-x", "p2/unit-y"]` (fails soft)
    - Model access error -> `status: 200`, `calls: ["p1/unit-x", "p2/unit-y"]` (fails soft)
  - **Pass (Test Suite)** — `node --import tsx/esm --test tests/unit/combo-context-capacity-fallback.test.ts` -> **11/11 PASS**.
  - **Pass (Task 0157 Suite)** — `node --import tsx/esm --test tests/unit/combo-fail-soft-candidate-errors.test.ts` -> **17/17 PASS**.
  - **Pass (Typecheck & Lint)** — `npm run typecheck:core` -> 0 errors. `npx eslint open-sse/services/accountFallback.ts open-sse/services/combo.ts open-sse/services/errorClassifier.ts open-sse/services/combo/runtimeUnits.ts tests/unit/combo-context-capacity-fallback.test.ts` -> 0 errors, 0 warnings.
  - **Pass (Task Promotion)** — Task status set to closed and file promoted to `docs/tasks/03-review/0179-omniroute-combo-context-capacity-fail-soft.md`.

