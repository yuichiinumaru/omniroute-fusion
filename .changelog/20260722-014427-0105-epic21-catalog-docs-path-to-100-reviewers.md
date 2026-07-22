---
date: 20260722-014427
timestamp: 20260722-014427
project: "omniroute-2"
agent: "reviewers"
task: "0105"
description: "Task 0105 path-to-100: composition-shape tests for list/catalog; readonly public allowlist type; matryoshkaMode vs D4 docs note."
is_rebuild_safe: true
---

# Task 0105: EPIC-21 T21-E catalog/docs dim capabilities (review path-to-100)

## Summary

Reviewer hardening for surface composition coverage, public MRL type immutability, and operator docs clarity on mode vs D4 truncate.

## Changes

- `open-sse/config/embeddingRegistry.ts`: `EmbeddingModelPublicMrlFields.matryoshkaDimensions` typed `readonly number[]`
- `tests/unit/embedding-dim-capabilities-catalog.test.ts`: list/catalog composition guards; no bare `as EmbeddingModel` fixtures; allowlist identity copy assert
- `docs/reference/API_REFERENCE.md`: `matryoshkaMode: "provider"` does not disable D4 client truncate+renorm

## Verification

- [x] `node --import tsx/esm --test tests/unit/embedding-dim-capabilities-catalog.test.ts` (10 pass)
- [x] `npx eslint --max-warnings=0 open-sse/config/embeddingRegistry.ts tests/unit/embedding-dim-capabilities-catalog.test.ts`
- [x] `npm run typecheck:core`
