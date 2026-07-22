---
date: 20260722-013900
timestamp: 20260722-013900
project: "omniroute-2"
agent: "reviewers"
task: "0104"
description: "Task 0104 path-to-100: applyClientMrl re-validates MRL dims; remove Record cast; base64 + invalid-dim pure tests."
is_rebuild_safe: true
---

# Task 0104: EPIC-21 client MRL truncate fallback (review path-to-100)

## Summary

Reviewer hardening for fail-closed pure-helper semantics and type purity.

## Changes

- `open-sse/utils/embeddingMrl.ts`: `applyClientMrlToEmbeddingData` re-runs `validateRequestedMrlDim` (defense-in-depth); `Reflect.get`/`Object.assign` instead of `as Record`; batch `fromDim` uses max observed source dim
- `tests/unit/embedding-mrl-truncate.test.ts`: invalid MRL dim without pre-gate + base64 non-float skip cases

## Verification

- [x] `node --import tsx/esm --test tests/unit/embedding-mrl-truncate.test.ts tests/unit/embeddings-gemini-dimensions.test.ts tests/unit/embeddings-matryoshka.test.ts tests/unit/embeddings-dimension-dialect.test.ts tests/unit/embeddings-handler.test.ts` (64 pass)
- [x] `npx eslint --max-warnings=0 open-sse/utils/embeddingMrl.ts open-sse/handlers/embeddings.ts tests/unit/embedding-mrl-truncate.test.ts`
- [x] `npm run typecheck:core`
