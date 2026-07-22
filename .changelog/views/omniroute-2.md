# Changelog: omniroute-2

> **Note**: Auto-generated view for project `omniroute-2` from `.changelog/` entries.
> **Do NOT edit manually** - use the changelog skill/subcommands.
> **Last rebuilt**: 2026-07-22 02:06:05 UTC

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

---

# Task 0106: 0106 path-to-100: ledger policy flip + honest residuals

## Summary

Independent review path-to-100 for Task 0106: policy docs require manage-changelog writes; PROVENANCE residual for parent-linked memories; profiles N/A by design.

## Changes

- Documented task completion details.

## Verification

- [x] docs/tasks/AGENTS.md + DoD overlay + template + create-tasks exits flipped to ledger mode
- [x] tmp/0106-symlinks.txt prove .memories and docs/changelog symlinks
- [x] repair --dry-run files needing repair: 0; validate issues=0 entries>=10; rebuild green
- [x] .archive/memories/omniroute-2-local-20260721/PROVENANCE.md honest residual

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

---

# Task 0106: changelog-migrate-and-memories-parent-link

## Summary

migrate root CHANGELOG to .changelog; parent-linked .memories (archived local shell).

## Changes

- Documented task completion details.

## Verification

- [x] validate entries=2; .memories -> ../.memories/omniroute-2
- [x] docs/changelog is symlink to ../.changelog (or migrate-created ledger)
- [x] validate/build green after migration wave 20260721

---
