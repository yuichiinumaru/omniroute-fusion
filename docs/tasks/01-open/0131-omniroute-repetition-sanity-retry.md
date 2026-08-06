# Task 0131: Retry one looping target with a sanity self-check

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: User request — extend the existing repetition guard for the Dahl/kimi-k2.6 case with an aggressive sanity self-check retry.
> **Blocks**: —
> **Depends on**: Task 0125 (stream repetition guard must be reviewed/accepted or its current contract explicitly verified)
> **Parallelism**: `serializable` — owns the repetition failure path and combo retry behavior already touched by Task 0125.
> **Review routing**: independent + streaming/runtime review

## Objective

When the opt-in repetition guard detects a loop, abort the current stream, retry the same target at most once with a clearly marked sanity self-check system instruction, and then fall through to normal combo behavior if repetition persists. The implementation MUST be bounded and MUST NOT create an infinite retry loop.

## Background Context

### O que já existe:
- Task 0125 introduced `streamRepetitionGuard.ts`, `repetition_detected`, combo classification, and an opt-in `enableRepetitionGuard` toggle.
- The combo middleware can inject system messages before dispatch.
- The target may be a custom SQLite provider; no static `dahl` registry entry should be assumed.

### O que está faltando / quebrado:
- Repetition currently aborts/falls back without a corrective retry.
- No retry budget or provenance flag prevents recursive sanity retries.

### False-gap check:
- This task explicitly extends Task 0125; it does not recreate the guard or change its default opt-in policy.

## Test Requirements

- The first `repetition_detected` for an eligible target MUST produce one retry with the sanity instruction.
- A second repetition MUST not retry again and MUST follow existing fallback classification.
- The sanity instruction MUST be added without leaking internal control text to an unintended client-facing error.
- Non-repetition streams MUST not receive the instruction or consume retry budget.
- Breaker/provider exhaustion accounting MUST preserve Task 0125 semantics.
- Abort, client disconnect, and parent cancellation MUST prevent a retry.

## Exit Conditions (GDD/TDD)

- [ ] A bounded one-retry state is plumbed through the existing combo/stream failure contract.
- [ ] Sanity instruction injection is deterministic and covered by tests.
- [ ] Persistent repetition falls through without infinite recursion.
- [ ] Existing Task 0125 tests remain passing.
- [ ] New targeted repetition-retry tests pass with 0 failures.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] Any live proof uses a mock or `:23456`; `:22000` is never touched.
- [ ] `.changelog/` entry is created and rebuilt.
- [ ] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [ ] **Ler código existente**: read Task 0125, repetition guard, stream failure callback, combo target loop, combo middleware, abort/error classification, and existing tests.
- [ ] Define a one-retry invariant and a control flag that cannot be supplied by untrusted request data.
- [ ] Add failing tests for first retry, second failure, cancellation, and no-op non-repetition.
- [ ] Implement retry at the narrowest existing failure boundary; do not restart arbitrary streams.
- [ ] Add a strong but concise sanity self-check message and document its purpose.
- [ ] **Refactoring pass**: keep the retry path bounded and avoid duplicating system-message merge logic.
- [ ] **Verificação de regressão**: run Task 0125 tests plus new tests, typecheck, lint, and test-environment proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/streamRepetitionGuard.ts` | Ler existing detector; modify only if contract needs extension. |
| `open-sse/utils/stream.ts` | Ler abort/failure callback. |
| `open-sse/services/combo.ts` | Implement bounded retry/fallback branch. |
| `open-sse/services/comboAgentMiddleware.ts` | Reuse or add controlled sanity injection helper. |
| `open-sse/services/combo/types.ts` | Add internal typed retry state if required. |
| `open-sse/services/combo/targetExhaustion.ts` | Preserve repetition classification. |
| `tests/unit/stream-repetition-guard.test.ts` | Regression suite from Task 0125. |
| `tests/unit/combo-repetition-fallback.test.ts` | Existing fallback suite. |
| `tests/unit/combo-repetition-sanity-retry.test.ts` | Criar bounded retry suite. |
| `.changelog/` | Criar entry. |

### How

1. Prove the current Task 0125 behavior before extending it.
2. Introduce a single internal retry budget, default zero except on the first repetition.
3. Rebuild the request through the existing middleware path with the sanity instruction.
4. Assert cancellation and second-repetition fallback behavior.

### Why

A loop is often recoverable with a corrective instruction, but an unbounded retry would amplify cost and instability. One bounded retry gives the operator a chance at recovery without sacrificing safety.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Safe beside provider registry/UI tasks. |
| **serializable** | Must follow Task 0125 and serialize with any stream/combo error-path changes. |
| **Collision** | `stream.ts`, `combo.ts`, `comboAgentMiddleware.ts`, repetition tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not assume `dahl` exists in the static registry. Do not retry more than once. Do not enable the guard globally. Do not use production `:22000` for proof.

## 🛡️ Compliance Checklist

- [ ] **Doc Accuracy**: Task 0125 contract and current failure paths reread.
- [ ] **Zod Validation**: internal retry state cannot be user-controlled; new config fields require Zod.
- [ ] **Security**: no secrets or raw prompt/error leakage.
- [ ] **Error Sanitization**: preserve existing SSE/error sanitization.
- [ ] **No Raw SQL**: no database changes expected.
- [ ] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**: [preencher]
- **Testes que verificam o trabalho**: [preencher]
- **Resultado dos testes**: [PASS/FAIL + output real]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck/build**: [PASS/FAIL]
- **Entrada no changelog**: [preencher]
- **Agente executor**: [preencher]
- **Data de conclusão**: [YYYY-MM-DD]

## 🔍 Review Trail

- **Reviewer**: [preencher]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [preencher]
