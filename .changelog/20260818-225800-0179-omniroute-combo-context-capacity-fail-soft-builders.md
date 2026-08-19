---
date: 20260818-225800
timestamp: 20260818-225800
project: "omniroute-2"
agent: "builder-engineer"
task: "0179"
description: "Made combined input/output token capacity 400 errors fail soft in combo routing (priority, round-robin, and runtime-unit paths) while preserving terminal generic 400s."
is_rebuild_safe: true
---

# Task 0179: Make model context-capacity 400s fail soft in combos

## Summary

Unified model context-capacity 400 detection across `accountFallback.ts`, `combo.ts`, `errorClassifier.ts`, and `runtimeUnits.ts`. Added recognition for combined input/output token capacity error shapes ("accepts at most", "combined input and output tokens", "reduce the input length") as zero-cooldown MODEL_CAPACITY fallback errors. Ensured priority, round-robin, and runtime-unit combo strategies fall through to the next candidate when encountering context-capacity 400s, while preserving Task 0157's terminal behavior for generic malformed 400s ("invalid client payload") across both model units and nested combo-ref units.

## Changes

- `open-sse/services/accountFallback.ts`: Canonicalized `isContextOverflow400`, `isParamValidation400`, and `isModelAccess400` predicates.
- `open-sse/services/combo.ts`: Re-exported canonical predicates from `accountFallback.ts`.
- `open-sse/services/errorClassifier.ts`: Delegated `isContextOverflow` to canonical `isContextOverflow400`.
- `open-sse/services/combo/runtimeUnits.ts`: Added the terminal 400 guard for generic malformed 400s across model and combo-ref units.
- `tests/unit/combo-context-capacity-fallback.test.ts`: Added 11 deterministic unit tests covering priority, round-robin, runtime-unit, terminal-400 preservation (flat & runtime-unit execute mode), aggregate sanitization, circuit-breaker isolation, lockout isolation, same-provider fallback, and sanitized failure logging.

## Verification

- `node --import tsx/esm --test tests/unit/combo-context-capacity-fallback.test.ts`: 11/11 PASS
- `node --import tsx/esm --test tests/unit/combo-fail-soft-candidate-errors.test.ts tests/unit/combo-context-length.test.ts tests/unit/combo-body-specific-400-stop-4279.test.ts tests/unit/combo-param-validation-fallback-4519.test.ts tests/unit/combo-strategy-fallbacks.test.ts tests/unit/error-classifier.test.ts`: 96/96 PASS
- `npm run test:vitest -- open-sse/services/combo/__tests__/targetExhaustion.test.ts`: 13/13 PASS
- `npm run typecheck:core`: 0 errors
- `npx eslint open-sse/services/accountFallback.ts open-sse/services/combo.ts open-sse/services/errorClassifier.ts open-sse/services/combo/runtimeUnits.ts tests/unit/combo-context-capacity-fallback.test.ts`: 0 errors, 0 warnings
