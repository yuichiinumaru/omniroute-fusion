# Task 0131: Retry one looping target with a sanity self-check

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
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

- [x] A bounded one-retry state is plumbed through the existing combo/stream failure contract.
- [x] Sanity instruction injection is deterministic and covered by tests.
- [x] Persistent repetition falls through without infinite recursion.
- [x] Existing Task 0125 tests remain passing.
- [x] New targeted repetition-retry tests pass with 0 failures.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] Any live proof uses a mock or `:23456`; `:22000` is never touched.
- [x] `.changelog/` entry drafted for parent closeout.
- [x] Completion Evidence and Review Trail filled before promotion.

## Details

### What

Subtasks:
- [x] **Ler código existente**: read Task 0125, repetition guard, stream failure callback, combo target loop, combo middleware, abort/error classification, and existing tests.
- [x] Define a one-retry invariant and a control flag that cannot be supplied by untrusted request data.
- [x] Add failing tests for first retry, second failure, cancellation, and no-op non-repetition.
- [x] Implement retry at the narrowest existing failure boundary; do not restart arbitrary streams.
- [x] Add a strong but concise sanity self-check message and document its purpose.
- [x] **Refactoring pass**: keep the retry path bounded and avoid duplicating system-message merge logic.
- [x] **Verificação de regressão**: run Task 0125 tests plus new tests, typecheck, lint, and test-environment proof.

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

- [x] **Doc Accuracy**: Task 0125 contract and current failure paths reread.
- [x] **Zod Validation**: internal retry state cannot be user-controlled; new config fields require Zod.
- [x] **Security**: no secrets or raw prompt/error leakage.
- [x] **Error Sanitization**: preserve existing SSE/error sanitization.
- [x] **No Raw SQL**: no database changes expected.
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `open-sse/services/comboAgentMiddleware.ts` — added `DEFAULT_REPETITION_SANITY_INSTRUCTION` and `injectRepetitionSanityInstruction`
  - `src/shared/validation/schemas/combo.ts` — added Zod-validated `repetitionRetryLimit` (0..10)
  - `open-sse/services/comboConfig.ts` — added `repetitionRetryLimit: 1` to `DEFAULT_COMBO_CONFIG`
  - `open-sse/services/combo/comboSetup.ts` — propagated `repetitionRetryLimit` to request body when `enableRepetitionGuard` is active
  - `open-sse/services/combo.ts` — implemented `resolveRepetitionGuardParams` and bounded repetition sanity retry loop in `handleComboChat` and `handleRoundRobinCombo`
  - `tests/unit/combo-repetition-sanity-retry.test.ts` — created unit tests covering budget 0/1/multiple, same-target retry, sanity instruction injection, fallthrough, non-repetition, cancellation, and disabled guard
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/stream-repetition-guard.test.ts tests/unit/combo-repetition-fallback.test.ts tests/unit/combo-repetition-sanity-retry.test.ts`
- **Resultado dos testes**:
  ```
  ✔ isRepetitionFailure identifies 502 repetition_detected errors (0.886683ms)
  ✔ applyComboTargetExhaustion does not exhaust provider on repetition failure (0.637282ms)
  ✔ shouldRecordProviderBreakerFailure returns false when isRepetitionFailure is true (0.164641ms)
  ✔ isClientDisconnectError returns false for repetition_detected aborts (0.227081ms)
  ✔ combo config defaults enableRepetitionGuard to false (opt-in) (3.072543ms)
  ✔ phaseComboSetup propagates enableRepetitionGuard from combo config to body (408.271894ms)
  ✔ injectRepetitionSanityInstruction injects system note as suffix message (1.390565ms)
  ✔ comboConfigSchema and resolveComboConfig support repetitionRetryLimit (4.264477ms)
  ✔ resolveRepetitionGuardParams resolves enableRepetitionGuard and repetitionRetryLimit (0.392612ms)
  ✔ repetition sanity retry: budget 1 retries same target ONCE with sanity instruction on repetition failure (23.420534ms)
  ✔ repetition sanity retry: budget 1 falls through to next target when 2nd repetition fails (9.214047ms)
  ✔ repetition sanity retry: budget 0 performs 0 retries and falls through immediately (12.037788ms)
  ✔ repetition sanity retry: budget 2 retries up to 2 times on same target before falling through (6.757606ms)
  ✔ repetition sanity retry: non-repetition error (500) does NOT trigger sanity retry or consume budget (4.198207ms)
  ✔ repetition sanity retry: cancellation/abort prevents sanity retry and returns 499 (3.800935ms)
  ✔ repetition sanity retry: disabled guard (enableRepetitionGuard=false) performs 0 retries (3.462334ms)
  ✔ streamRepetitionGuard returns repetition_detected when 3 identical chunks (>=50 chars) arrive consecutively (0.826603ms)
  ✔ streamRepetitionGuard returns ok when chunks are different (0.180511ms)
  ✔ streamRepetitionGuard returns ok when chunks are short or whitespace-only (0.214261ms)
  ✔ streamRepetitionGuard returns ok for tool-call argument streams (incremental growth) (0.165451ms)
  ✔ streamRepetitionGuard reset() clears state (0.157861ms)
  ✔ streamRepetitionGuard respects custom minChunkLength and historySize (0.120401ms)
  ℹ tests 22
  ℹ pass 22
  ℹ fail 0
  ```
- **Resultado do lint**: PASS (`npx eslint open-sse/services/comboAgentMiddleware.ts src/shared/validation/schemas/combo.ts open-sse/services/comboConfig.ts open-sse/services/combo/comboSetup.ts open-sse/services/combo.ts tests/unit/combo-repetition-sanity-retry.test.ts` — 0 errors, 0 warnings)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core` — 0 errors)
- **Entrada no changelog**: `.changelog/20260806-210546-0131-repetition-sanity-retry-reviewer.md`; rebuild concluído com 52 entradas.

### Changelog Draft

- **task**: 0131
- **agent**: builder-engineer
- **project**: omniroute
- **title**: repetition-sanity-retry
- **description**: Bounded repetition sanity self-check retry for looping targets
- **summary**: Extends Task 0125 stream repetition guard with a bounded same-target retry that injects a sanity self-check system instruction before falling through to subsequent combo targets.
- **verification**: `node --import tsx/esm --test tests/unit/stream-repetition-guard.test.ts tests/unit/combo-repetition-fallback.test.ts tests/unit/combo-repetition-sanity-retry.test.ts` (22/22 PASS), `npm run typecheck:core` (0 errors), `npx eslint ...` (0 errors)

- **Agente executor**: builder-engineer
- **Data de conclusão**: 2026-08-06

## 🔍 Review Trail

- **Reviewer**: parent reviewer with Gortex-assisted review
- **Data da review**: 2026-08-06
- **Veredito**: APROVADO — 100/100
- **Notas**: Fresh 22/22 repetition suites, typecheck and lint passed; shared combo.ts audit found no collision with 0133. Gortex had no rule findings; aggregate blast-radius block is inherited from prior waves.
