---
date: 20260722-000100
timestamp: 20260722-000100
project: "omniroute-2"
agent: "reviewers"
task: "0103"
description: "Task 0103 path-to-100: fail-closed dim bounds, Gemini MRL factory, readonly allowlist type."
is_rebuild_safe: true
---

# Task 0103: epic21-registry-matryoshka-metadata (review path-to-100)

## Summary

Reviewer hardening for MRL helper fail-closed semantics and seed immutability.

## Changes

- `open-sse/config/embeddingRegistry.ts`: `geminiEmbeddingMrl()` factory; `isAllowedEmbeddingDim` incomplete-range fail-closed; `readonly number[]` allowlist
- `tests/unit/embeddings-matryoshka.test.ts`: incomplete metadata + array identity tests
- Root `CHANGELOG.md` Unreleased Fixed bullet

## Verification

- [x] `node --import tsx/esm --test tests/unit/embeddings-matryoshka.test.ts`
- [x] `npx eslint --max-warnings=0 open-sse/config/embeddingRegistry.ts tests/unit/embeddings-matryoshka.test.ts`
