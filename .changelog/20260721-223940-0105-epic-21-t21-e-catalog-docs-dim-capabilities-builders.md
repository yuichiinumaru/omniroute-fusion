---
date: 20260721-223940
timestamp: 20260721-223940
project: "omniroute-2"
agent: "builders"
task: "0105"
description: "Added toEmbeddingModelPublicMrlFields + extended getAllEmbeddingModels; wired embeddings GET and models catalog; unit tests; API_REFERENCE Embeddings dimensions/MRL section."
is_rebuild_safe: true
---

# Task 0105: EPIC-21 T21-E catalog/docs dim capabilities

## Summary

Expose registry MRL fields on GET /v1/embeddings list and /v1/models catalog embedding entries; document D1–D5 with grepped real paths.

## Changes

- `open-sse/config/embeddingRegistry.ts`: `toEmbeddingModelPublicMrlFields`, `EmbeddingModelPublicMrlFields`, `FlatEmbeddingModelListEntry`; `getAllEmbeddingModels` now spreads MRL capability fields
- `src/app/api/v1/embeddings/route.ts` GET: list entries include MRL fields for built-in models
- `src/app/api/v1/models/catalog.ts`: embedding catalog entries include MRL fields
- `open-sse/index.ts`: re-export `toEmbeddingModelPublicMrlFields`
- `tests/unit/embedding-dim-capabilities-catalog.test.ts` (new): mapper + flat-list coverage (MRL + non-MRL + allowlist copy)
- `docs/reference/API_REFERENCE.md`: Embeddings **Dimensions / Matryoshka (MRL)** section (D1–D5 with grepped paths)
- `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md`: §5 catalog/docs success metrics checked

## Verification

- [x] node --import tsx/esm --test tests/unit/embedding-dim-capabilities-catalog.test.ts (8 pass)
- [x] node --import tsx/esm --test tests/unit/embedding-dim-capabilities-catalog.test.ts tests/unit/embedding-mrl-truncate.test.ts tests/unit/embeddings-matryoshka.test.ts tests/unit/embeddings-dimension-dialect.test.ts tests/unit/embeddings-gemini-dimensions.test.ts (63 pass)
- [x] npm run typecheck:core
- [x] npx eslint --max-warnings=0 open-sse/config/embeddingRegistry.ts open-sse/index.ts src/app/api/v1/embeddings/route.ts src/app/api/v1/models/catalog.ts tests/unit/embedding-dim-capabilities-catalog.test.ts
