---
date: 20260721-223149
timestamp: 20260721-223149
project: "omniroute-2"
agent: "builders"
task: "0103"
description: "EPIC-21 T21-C registry Matryoshka/MRL metadata seed + helpers; D4 renorm default on."
is_rebuild_safe: true
---

# Task 0103: epic21-registry-matryoshka-metadata

## Summary

Extend embedding registry types and curated model rows with Matryoshka/MRL metadata for Gemini, OpenAI text-embedding-3-*, and Qwen3-Embedding family. Lock L2 renorm default on for 0104.

## Changes

- `open-sse/config/embeddingRegistry.ts`: `MatryoshkaMode`, MRL fields on `EmbeddingModel`, seed helpers, `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT`, `getEmbeddingModel` / `isMatryoshkaModel` / `isAllowedEmbeddingDim`
- `tests/unit/embeddings-matryoshka.test.ts`: seed shape + negative (ada-002 / non-MRL) + renorm lock
- Root `CHANGELOG.md` Unreleased entry

## Verification

- [x] `node --import tsx/esm --test tests/unit/embeddings-matryoshka.test.ts tests/unit/embeddings-dimension-dialect.test.ts`
- [x] `npm run typecheck:core`
