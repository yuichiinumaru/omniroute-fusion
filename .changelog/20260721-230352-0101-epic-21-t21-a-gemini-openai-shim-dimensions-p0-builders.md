---
date: 20260721-230352
timestamp: 20260721-230352
project: "omniroute-2"
agent: "builders"
task: "0101"
description: "Fixed: stop injecting Gemini-native outputDimensionality into OpenAI-compat embeddings shim; forward dimensions only (D2). Invert dual-forward unit tests; combo schema comment D2."
is_rebuild_safe: true
---

# Task 0101: EPIC-21 T21-A Gemini OpenAI-shim dimensions (P0)

## Summary

**Fixed (P0):** Gemini embeddings via Google’s OpenAI-compat shim (`/v1beta/openai/embeddings`) returned `400 Unknown name "outputDimensionality": Cannot find field.` because OmniRoute dual-forwarded the native Gemini field alongside OpenAI `dimensions`. OpenAI-shim path now forwards **`dimensions` only** (product lock D2); unit tests inverted from dual-forward to dimensions-only; combo schema comment no longer claims Gemini translation to `outputDimensionality`.

## Changes

### Fixed
- `open-sse/handlers/embeddings.ts` — removed Gemini dual inject of `outputDimensionality` on the production OpenAI-compat baseUrl; dimension fields applied via dialect SSoT (`applyEmbeddingDimensions`) with D2 preserved
- `tests/unit/embeddings-gemini-dimensions.test.ts` — inverted dual-forward assertions; assert `dimensions` present and `outputDimensionality` absent (single, batch, omit, non-Gemini, invalid dim); optional registry-seed case `gemini/gemini-embedding-2` + `dimensions: 768`
- `src/shared/validation/schemas/combo.ts` — embedding combo `dimensions` comment corrected to D2 (OpenAI-shim uses `dimensions` only; no dual-forward)

## Verification

- [x] `node --import tsx/esm --test tests/unit/embeddings-gemini-dimensions.test.ts tests/unit/embeddings-dimension-dialect.test.ts`
- [x] `npm run typecheck:core`
- [x] combo.ts comment: OpenAI-shim uses dimensions only (D2)
