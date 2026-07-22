# EPIC-21 — Embeddings: Provider Dimension Dialect + MRL

> **Status**: **Children open** — `01-open/` **0101–0105** (promoted 2026-07-21) · investigation LOCKED 2026-07-19  
> **Priority**: **P0** (Gemini dimensions broken in production path)  
> **Type**: feature + remediation  
> **Project**: omniroute-2  
> **Author**: architect-orchestrator  
> **Depends on**: none (orthogonal to EPIC-19/20 UI)  
> **Children** (execution order):  
> | ID | Slice | Path |  
> |----|-------|------|  
> | **0101** | T21-A P0 Gemini OpenAI-shim | `docs/tasks/01-open/0101-omniroute-epic21-gemini-openai-shim-dimensions.md` |  
> | **0102** | T21-B dimension dialect SSoT | `docs/tasks/01-open/0102-omniroute-epic21-dimension-dialect-ssot.md` |  
> | **0103** | T21-C registry matryoshka metadata | `docs/tasks/01-open/0103-omniroute-epic21-registry-matryoshka-metadata.md` |  
> | **0104** | T21-D client MRL truncate + renorm | `docs/tasks/01-open/0104-omniroute-epic21-client-mrl-truncate-fallback.md` |  
> | **0105** | T21-E catalog/docs dim capabilities | `docs/tasks/01-open/0105-omniroute-epic21-catalog-docs-dim-capabilities.md` |  
> **Gate**: **0101 first**; **0102–0104 after 0101**; **0105 last**.  
> **Evidence**:  
> - Operator 400: `Unknown name "outputDimensionality"`  
> - `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`  
> - `open-sse/handlers/embeddings.ts` L147–159  
> - `tests/unit/embeddings-gemini-dimensions.test.ts` (encodes dual-field — **wrong for OpenAI shim**)  
> **Out of scope**: multi-embedding-model indices, vec2vec, cross-encoder re-rank (client responsibility)

---

## 1. Goals

1. **Provider-side dimensions work** for MRL-capable models: client always speaks OpenAI `dimensions`; OmniRoute maps to the correct upstream field / API surface.  
2. **OmniRoute native MRL fallback**: when model is MRL-capable and upstream returns a longer vector (or only full dim), truncate (+ optional L2-normalize) to requested dim.  
3. Registry metadata for default dim + allowed MRL dims (manual + optional HF later).

---

## 2. Problem summary

| Issue | Severity |
|-------|----------|
| Gemini via `/v1beta/openai/embeddings` gets **both** `dimensions` and injected **`outputDimensionality`** → Google 400 | **P0 bug** |
| Unit tests assert the broken dual-forward | P0 test debt |
| Registry has only single `dimensions?`, no matryoshka set | P1 |
| No client-side truncate path for TEI/local/providers that ignore dim | P1 |
| Per-provider dialect (Voyage/Jina/Cohere) not centralized | P2 |

---

## 3. Locked product decisions

| # | Decision |
|---|----------|
| D1 | Client contract remains **OpenAI-compatible** (`dimensions` optional on `/v1/embeddings`). |
| D2 | Gemini **OpenAI-compat** base URL: forward **`dimensions` only**; **never** send `outputDimensionality` on that path. |
| D3 | If a future native Gemini embed URL is used: map `dimensions` → `outputDimensionality` and strip OpenAI-only extras. |
| D4 | Native MRL fallback = **prefix truncate** to `d` when `is_matryoshka` / allowlist and `len(vector) ≥ d`; optional L2 renorm (default **on** for parity with OpenAI guidance — confirm in T21-C). |
| D5 | Unsupported requested dim → **400** with clear message (not silent wrong length). |
| D6 | No auto-mixing of different embedding model spaces. |

---

## 4. Child task slices

| ID | Task | Theme | Priority | Lane |
|----|------|-------|----------|------|
| **T21-A** | **0101** | Fix Gemini OpenAI-shim body (remove native field injection); rewrite unit tests; regression for non-Gemini | P0 | `01-open/` |
| **T21-B** | **0102** | Dimension dialect SSoT (`dimensionParam` / strip list per provider); apply in `handleEmbedding` | P1 | `01-open/` |
| **T21-C** | **0103** | Registry: matryoshka dims / `isMatryoshka` / min-max for Gemini + Qwen3-Embedding family + known OpenAI-3 | P1 | `01-open/` |
| **T21-D** | **0104** | Client MRL truncate (+ renorm policy) post-upstream; metrics/log; unit tests | P1 | `01-open/` |
| **T21-E** | **0105** | Catalog/list API exposes dim capabilities; optional combo default dimensions already exist — wire docs | P2 | `01-open/` |

Promoted numeric IDs: **0101–0105** (after EPIC-20 0100). Housekeeping collision former `0101` renumbered to **0106**.

---

## 5. Success metrics

- [ ] `dimensions: 768` on `gemini/gemini-embedding-2` returns **200** and `embedding.length === 768` (live or mocked to real schema)  
- [ ] No `outputDimensionality` on OpenAI-compat Gemini requests  
- [ ] OpenAI `text-embedding-3-*` still accepts `dimensions` unchanged  
- [ ] MRL client truncate: full-dim mock → shortened vector when flagged  
- [ ] Non-MRL model + dimensions request: provider-native behavior or clear 400 — no silent corrupt truncate  
- [x] Catalog/list expose MRL capability fields (`isMatryoshka`, allowlist/range, mode) for seeded models *(0105)*  
- [x] Operator docs (D1–D5) with grepped real paths in `docs/reference/API_REFERENCE.md` *(0105)*  

---

## 6. Relation to other work

| Area | Relation |
|------|----------|
| EPIC-19/20 UI | None |
| Memory embedding path (`src/lib/memory/embedding`) | May reuse dialect later — not required for chat `/v1/embeddings` P0 |
| Combo embedding family guard | Keep; MRL does not allow cross-family dim coercion |

---

## 7. Operator note

Qwen3-Embedding, text-embedding-v4, e5-mistral, gte-Qwen, arctic-embed-m3: treat as **provider-side MRL** when hosted behind OpenAI-compat that honors `dimensions`; else **client truncate** only if registry marks MRL-safe. HF `is_matryoshka` / `matryoshka_dimensions` inform registry curation (manual in T21-C; automated HF ingest optional later).
