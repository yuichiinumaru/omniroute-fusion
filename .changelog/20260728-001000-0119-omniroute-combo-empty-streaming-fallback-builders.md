---
date: 20260728-001000
timestamp: 20260728-001000
project: omniroute
agent: builder-engineer
task: "0119"
description: "Fix NVIDIA NIM combo fallback when response has 0 output tokens (200 OK with empty content)"
is_rebuild_safe: true
---

# Task 0119: Fix NVIDIA NIM combo fallback when response has 0 output tokens

## Summary

Fixed the streaming response quality validator to detect empty content (0 output tokens) in OpenAI-compatible SSE streams (NVIDIA NIM, OpenAI, Groq, xAI, etc.). Previously, a 200 OK response with only `[DONE]` and no content deltas was treated as valid, silently terminating the combo chain. Now it correctly triggers combo fallback to the next target.

## Changes

- `open-sse/services/combo/validateQuality.ts`:
  - Lines 322-338: Added empty-streaming-content detection for OpenAI-compatible streams.
  - Lines 1-10: Removed unused import `isKnownNonClaudeStreamPayload`.
  - Lines 50-66: Updated TSDoc header to document bounded SSE peek + empty-streaming detection.
- `tests/unit/validate-quality-empty-streaming.test.ts`: Created test suite covering:
  - Streaming response with only `[DONE]` → invalid.
  - Streaming response with role delta but no content → invalid.
  - Streaming response with whitespace-only delta → invalid.
  - Streaming response with whitespace prefix + real content → valid.
  - Streaming response with reasoning_content but no content → valid.
  - Non-streaming empty content → invalid (regression).

## Verification

- `node --import tsx/esm --test tests/unit/validate-quality-empty-streaming.test.ts tests/unit/combo-quality-validator-reasoning.test.ts`: 18 tests, 18 passed, 0 failed.
- `npm run typecheck:core`: PASSED.
- `npx eslint open-sse/services/combo/validateQuality.ts tests/unit/validate-quality-empty-streaming.test.ts`: PASSED.

## Author

builder-engineer
