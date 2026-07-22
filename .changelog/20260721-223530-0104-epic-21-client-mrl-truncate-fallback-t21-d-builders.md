---
date: 20260721-223530
timestamp: 20260721-223530
project: "omniroute-2"
agent: "builders"
task: "0104"
description: "EPIC-21 T21-D client MRL prefix-truncate + L2 renorm fallback post-upstream; 400 for unsupported MRL dims and non-MRL mismatches; log embed.mrl_client_truncate."
is_rebuild_safe: true
---

# Task 0104: EPIC-21 client MRL truncate fallback (T21-D)

## Summary

When a client requests `dimensions: d` and an MRL-capable model returns a longer float vector (`N ≥ d`), OmniRoute prefix-truncates to `d` and applies L2 renorm by default (`EMBEDDING_MRL_CLIENT_RENORM_DEFAULT`). Non-MRL models are never silently truncated.

## Changes

- `open-sse/utils/embeddingMrl.ts` (new): pure helpers — `parseRequestedEmbeddingDim`, `validateRequestedMrlDim`, `l2Normalize`, `prefixTruncateAndMaybeRenorm`, `applyClientMrlToEmbeddingData`; event name `embed.mrl_client_truncate`
- `open-sse/handlers/embeddings.ts`: pre-upstream MRL allowlist/range validation → 400; post-upstream client truncate+renorm; structured log; usage fields unchanged
- `tests/unit/embedding-mrl-truncate.test.ts` (new): pure + handler integration (full-dim mock → shortened unit vector; non-MRL 400; batch; invalid dim skips upstream)

## Verification

- [x] `node --import tsx/esm --test tests/unit/embedding-mrl-truncate.test.ts tests/unit/embeddings-gemini-dimensions.test.ts tests/unit/embeddings-matryoshka.test.ts tests/unit/embeddings-dimension-dialect.test.ts tests/unit/embeddings-handler.test.ts` (62 pass)
- [x] `npm run typecheck:core`
