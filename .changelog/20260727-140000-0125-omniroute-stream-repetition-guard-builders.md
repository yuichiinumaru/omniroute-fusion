---
date: 20260727-140000
timestamp: 20260727-140000
project: omniroute
agent: builder-engineer
task: "0125"
description: "Stream repetition guard — abort requests when model loops (Dahl kimi-k2.6 case)"
is_rebuild_safe: true
---

# Task 0125: Stream repetition guard — abort requests when model loops

## Summary

Implemented a per-request content-level streaming repetition guard that detects when an LLM enters an infinite content loop (emitting 3+ consecutive identical content blocks of length ≥50 characters) and aborts the stream with a `repetition_detected` 502 error. Wired this into combo target failure handling so the combo engine advances to the next target without marking the provider or connection as exhausted. The feature is opt-in via the combo config setting `enableRepetitionGuard` (default `false`).

## Changes

- Created `open-sse/services/streamRepetitionGuard.ts`:
  - Implements sliding window detection logic (`createRepetitionGuard`).
  - Ignores short deltas (<50 chars), whitespace-only chunks, and tool-call argument streams.
- Updated `open-sse/utils/stream.ts`:
  - Integrated `streamRepetitionGuard` into SSE content delta processing loops.
  - Emits `repetition_detected` 502 error and aborts stream upon repetition detection.
- Updated `open-sse/utils/streamHandler.ts`:
  - Ensures `repetition_detected` is recognized as an upstream 502 error and not misclassified as a client disconnect.
- Updated `open-sse/services/combo.ts`, `open-sse/services/combo/targetExhaustion.ts`, and `open-sse/services/combo/comboPredicates.ts`:
  - Classified `repetition_detected` failures so combo fallback advances to next target without exhausting the provider or connection.
- Updated `open-sse/services/comboConfig.ts` & `src/shared/validation/schemas/combo.ts`:
  - Added Zod-validated `enableRepetitionGuard` boolean setting to combo runtime config (default `false`).
- Created unit test suites:
  - `tests/unit/stream-repetition-guard.test.ts` (100% pass covering repetitions, non-repetitions, short whitespace chunks, tool-call streams, reset).
  - `tests/unit/combo-repetition-fallback.test.ts` (100% pass covering non-exhaustion, circuit breaker bypass, client disconnect handling, combo config default).

## Verification

- `node --import tsx/esm --test tests/unit/stream-repetition-guard.test.ts tests/unit/combo-repetition-fallback.test.ts`: 11 tests, 11 passed, 0 failed.
- `npm run typecheck:core`: PASSED with 0 type errors.
- `npx eslint open-sse/services/streamRepetitionGuard.ts open-sse/utils/stream.ts open-sse/utils/streamHandler.ts open-sse/services/combo.ts tests/unit/stream-repetition-guard.test.ts tests/unit/combo-repetition-fallback.test.ts`: 0 errors.

## Author

builder-engineer
