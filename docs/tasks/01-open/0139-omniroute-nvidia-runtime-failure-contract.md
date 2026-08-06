# Task 0139: Harden NVIDIA NIM timeout and empty-response fallback evidence

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `remediation`
> **Origin**: EPIC-25; observed NVIDIA NIM 120-second timeouts, synthetic 524s, and empty assistant responses after tool-call completion.
> **Blocks**: —
> **Depends on**: Task 0119 review outcome or explicit verification of its empty-stream contract.
> **Parallelism**: `serializable` — shares combo failure classification and stream tests with Task 0119.
> **Review routing**: independent + streaming/runtime review

## Objective

Make NVIDIA NIM failures observable and correctly recoverable when the upstream
times out or ends after tool calls without assistant content. This task must
not duplicate the generic empty-stream detector from Task 0119. It adds the
NVIDIA-specific regression coverage and ensures synthetic 524 and post-tool
empty responses reach the intended combo fallback path.

## Background Context

### Evidence already established
- `open-sse/services/combo.ts:780-798` creates synthetic 524 responses after
  `comboTargetTimeoutMs` expires.
- `open-sse/services/combo/targetExhaustion.ts` treats 524 as connection-level.
- `open-sse/utils/stream.ts:2386-2391` logs empty assistant responses after
  tool-call completion but currently only warns.
- `open-sse/services/combo/validateQuality.ts` already detects generic empty
  streaming content through Task 0119.
- Historical logs show repeated `deepseek-ai/deepseek-v4-pro` 120-second
  timeouts and empty post-tool responses under NVIDIA.

### Scope boundary
Do not weaken provider-level outage protection merely to keep retrying NVIDIA.
The builder must determine whether post-tool emptiness is a model-level failure,
a connection-level failure, or a valid tool-only completion before changing
classification.

## Test Requirements

- A synthetic 524 from the combo timeout is classified and surfaced consistently.
- A post-tool stream with no assistant content follows the documented quality/fallback path.
- A valid tool-only completion is not falsely rejected.
- NVIDIA model/account identifiers remain present in structured diagnostics.
- Existing Task 0119 empty-stream tests remain passing.
- No test uses production `:22000`; use mocks or `:23456`.

## Exit Conditions (GDD/TDD)

- [ ] A written classification contract distinguishes timeout, empty stream,
  valid tool-only completion, and upstream error.
- [ ] NVIDIA-specific regression tests cover synthetic 524 and post-tool empty output.
- [ ] Combo fallback behavior is proven without duplicating Task 0119 logic.
- [ ] `node --import tsx/esm --test tests/unit/nvidia-runtime-failure-contract.test.ts` passes.
- [ ] Relevant existing combo/stream quality tests pass.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] Mock or `:23456` smoke proof is recorded.
- [ ] `.changelog/` entry is created through manage-changelog and rebuilt.
- [ ] Completion Evidence and Review Trail are filled.

## Details

### What

- [ ] **Ler código existente**: read `combo.ts`, `targetExhaustion.ts`,
  `validateQuality.ts`, `stream.ts`, NVIDIA registry, and Task 0119 evidence.
- [ ] Add failing tests for 524 and post-tool empty-response behavior.
- [ ] Trace the full stream-to-combo error path before changing classification.
- [ ] Implement the smallest NVIDIA-specific adapter or diagnostic hook.
- [ ] Verify valid tool-only responses remain valid.
- [ ] **Refactoring pass**: keep generic quality logic centralized.
- [ ] **Verificação de regressão**: targeted tests, typecheck, lint, smoke proof.

### Where

| File | Purpose |
|---|---|
| `open-sse/services/combo.ts` | Read/modify timeout/fallback wiring if evidence requires. |
| `open-sse/services/combo/targetExhaustion.ts` | Read/modify status classification if required. |
| `open-sse/services/combo/validateQuality.ts` | Read existing generic detector; avoid duplication. |
| `open-sse/utils/stream.ts` | Read post-tool empty-response path. |
| `open-sse/config/providers/registry/nvidia/index.ts` | Read model contract. |
| `tests/unit/nvidia-runtime-failure-contract.test.ts` | Create regression tests. |
| `.changelog/` | Create closeout entry. |

### How

1. Reproduce each failure with deterministic stream/timeout fixtures.
2. Compare the observed path with Task 0119's generic detector.
3. Change only the provider-specific classification or diagnostics proven necessary.
4. Run targeted tests and the authorized test-environment proof.

### Why

NVIDIA NIM currently has evidence of timeout and post-tool empty-response
failures, but the correct fallback scope must be proven before changing shared
stream/combo behavior.

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Safe beside provider-test identity and reasoning tasks. |
| **serializable** | Must follow/reconcile with Task 0119 and serialize with stream/combo failure-path edits. |
| **Collision** | `combo.ts`, `targetExhaustion.ts`, `validateQuality.ts`, `stream.ts`, and related tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not claim a current production log was reproduced; the available evidence
> is historical/stopped-container evidence. Do not mutate `:22000`. Do not
> classify every empty post-tool response as failure without testing tool-only completion.

## 🛡️ Compliance Checklist

- [ ] Runtime and log claims cite files/lines or captured output.
- [ ] No secrets or credentials in fixtures.
- [ ] Existing sanitization and fallback contracts preserved.
- [ ] No raw SQL or destructive changes.
- [ ] Archive protocol respected.

## 📋 Completion Evidence

- **Files/tests/output**: [fill]
- **Classification decision**: [fill with evidence]
- **Typecheck/lint/smoke**: [fill]
- **Changelog/executor/date**: [fill]

## 🔍 Review Trail

- **Reviewer/verdict/score**: [fill]
- **Notes**: [fill]
