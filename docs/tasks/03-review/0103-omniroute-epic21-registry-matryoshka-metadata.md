# Task 0103: EPIC-21 T21-C — Registry Matryoshka Metadata

> **Status**: `[x]` Implemented + formal review ACCEPTED_100 (moved to 03-review)  
> **Priority**: 🟡 P1  
> **Type**: `feature`  
> **Origin**: EPIC-21 T21-C + investigation §2  
>   `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md`  
>   `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`  
> **Blocks**: **0104** (client truncate needs MRL-safe flags); **0105** (catalog exposure of fields)  
> **Depends on**: **0101** hard; prefer **0102** done if dialect fields share `EmbeddingProvider`/`EmbeddingModel` types  
> **Parallelism**: `serializable` vs 0102 on `embeddingRegistry.ts`; not parallel with 0104 consumers mid-edit  
> **Review routing**: independent; bundle with 0104 only if truncate lands same PR  

---

## Objective

Extend embedding registry types and curated model rows so OmniRoute knows which models are **MRL-capable**, which dimensions are allowed, and what the default/native size is — without inventing auto-HF ingest. Seed known families: **Gemini embedding models**, **Qwen3-Embedding** family, **OpenAI text-embedding-3-***, plus a short documented known list from the investigation/operator note.

**Done when:** `EmbeddingModel` (or equivalent) carries MRL metadata; seeded models have correct flags/allowlists; unit tests assert presence and shape for the seed set; renorm policy default for client truncate is **locked in writing** for 0104 (D4: default **on** unless this task records an explicit operator override).

---

## Background Context

### O que já existe:

```ts
// open-sse/config/embeddingRegistry.ts
export interface EmbeddingModel {
  id: string;
  name: string;
  dimensions?: number; // single default only
  defaultParams?: Record<string, unknown>;
}
```

- Gemini models registered with `dimensions: 768` (preference, not full capability; Google default often 3072 with flexible range).  
- OpenAI 3-small/large single default dims (1536 / 3072) without MRL allowlist.  
- Nebius/OpenRouter Qwen3-Embedding rows with single max dims (e.g. 4096 / 2560 / 1024).  
- `getAllEmbeddingModels()` feeds GET `/v1/embeddings` and models catalog.

### O que está faltando / quebrado:

- No `is_matryoshka` / `matryoshka_dimensions` / min-max / mode.  
- Client truncate (0104) cannot fail-closed without allowlists.  
- Catalog cannot advertise variable dims (0105).  

### Explicitly out of scope:

- Automated HuggingFace ingest of `is_matryoshka` (optional later; manual curation only here).  
- Client truncate implementation (→ **0104**).  
- Full catalog JSON field exposure wiring (→ **0105** may read these fields).  
- Cross-family space mixing / vec2vec.  
- UI dashboards.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0101** hard; **0102** preferred first if type surgery overlaps |
| **Blocks** | **0104** hard (MRL flags); **0105** hard (fields to expose) |
| **File ownership** | `open-sse/config/embeddingRegistry.ts` (+ helpers/tests) |
| **Collision** | 0102 may add provider-level dialect fields — merge carefully |
| **serializable** | After 0101; coordinate 0102 |

---

## Test Requirements

- DEVE estender tipo `EmbeddingModel` (ou sub-type exportado) com campos MRL estáveis, por exemplo:  
  - `isMatryoshka?: boolean` (or `is_matryoshka` if project prefers snake — **match existing camelCase style** in registry: prefer camelCase `isMatryoshka`, `matryoshkaDimensions`, `minDimensions`, `maxDimensions`)  
  - `matryoshkaDimensions?: number[]` and/or min/max  
  - optional `matryoshkaMode?: "provider" | "client_truncate" | "none"`  
- DEVE marcar seed set:  
  - Gemini: `gemini-embedding-2`, `gemini-embedding-001` (and any other gemini embed rows present)  
  - OpenAI: `text-embedding-3-small`, `text-embedding-3-large` (not ada-002 as MRL unless documented)  
  - Qwen3-Embedding family rows present in registry (Nebius / OpenRouter / etc.)  
- DEVE documentar no task evidence / code comment the **renorm default for 0104**: L2 renorm **on** after truncate (D4) unless explicitly flipped with rationale in Completion Evidence  
- DEVE ter unit tests asserting seed models expose `isMatryoshka === true` and non-empty allowlist or valid min/max where applicable  
- DEVE **não** marcar non-MRL models (e.g. ada-002, models without evidence) as matryoshka  

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.

- [x] `EmbeddingModel` type extended; registry compiles  
- [x] Seed rows for Gemini + Qwen3-Embedding family + OpenAI-3 populated with MRL metadata  
- [x] Unit tests pass for registry metadata shape/seed:  
      `node --import tsx/esm --test tests/unit/embeddings-matryoshka.test.ts`  
- [x] Existing embedding registry tests still green (`tests/unit/embedding-rerank-provider-registry.test.ts` + dialect suite)  
- [x] Renorm policy for 0104 recorded (default **on**) — `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT = true`  
- [x] `npm run typecheck:core` passa sem erros  
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`  
- [x] Completion Evidence filled  
- [x] lint (touched surface): `npx eslint --max-warnings=0 open-sse/config/embeddingRegistry.ts tests/unit/embeddings-matryoshka.test.ts` exit 0 (review session 2026-07-22)  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**:  
  `open-sse/config/embeddingRegistry.ts` (full file — types + all provider model rows),  
  `tests/unit/embedding-rerank-provider-registry.test.ts`,  
  EPIC-21 D4 + investigation §2  
- [x] Choose final field names matching codebase camelCase; export types  
- [x] Populate seed models with documented dims (cite Google/OpenAI/Qwen public ranges in comments; do not invent without source)  
- [x] Add helper(s) if useful: `isMatryoshkaModel(provider, modelId)`, `isAllowedEmbeddingDim(...)`  
- [x] Unit tests for seed set + negative case (non-MRL)  
- [x] Export renorm policy constant for 0104 (`EMBEDDING_MRL_CLIENT_RENORM_DEFAULT = true`)  
- [x] **Refactoring pass**: no mass rewrite of every provider row — seed known list only  
- [x] **Verificação de regressão**: registry tests + typecheck  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/config/embeddingRegistry.ts` | Modificar — types + seed metadata |
| `tests/unit/embedding-matryoshka-registry.test.ts` | Criar — seed/shape assertions |
| `tests/unit/embedding-rerank-provider-registry.test.ts` | Ler / fix if types break |
| `src/app/api/v1/embeddings/route.ts` | Ler — GET still works with extra fields (no require expose yet) |
| `src/app/api/v1/models/catalog.ts` | Ler — 0105 will expose; do not full wire here unless trivial pass-through is needed for typecheck |
| `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md` | Ler — D4/D5 |
| `CHANGELOG.md` | Modificar |

### How

1. After 0101 (and preferably 0102), extend types backward-compatibly (all new fields optional).  
2. Seed only models with documented MRL support.  
3. Gemini: treat registry `dimensions: 768` as **preferred default**; set max toward Google’s flexible range (document 128–3072 or current public docs — verify before writing).  
4. OpenAI-3: allow dims per OpenAI public docs (common subsets).  
5. Qwen3-Embedding: mark MRL with max = registered native dim; allowlist or min–max as documented.  
6. Export helpers for 0104 without implementing truncate.

### Why

Client truncate and catalog exposure are unsafe without an allowlist. This task is the data contract those features depend on.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | After 0101; after/with 0102 on registry |
| **Collision** | `embeddingRegistry.ts` vs 0102 |
| **Blocks** | 0104, 0105 |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT mark models MRL-safe without a cited public source or operator-confirmed list.  
> DO NOT implement truncate here. DO NOT change Gemini request dialect (0101/0102).  
> DO NOT fabricate dim arrays — shorter accurate allowlist beats invented full ranges.

> [!IMPORTANT]
> Prefer camelCase fields consistent with `EmbeddingModel`.  
> `dimensions` remains the default/native preference field; matryoshka fields are additive.  
> PORT 21000 off-limits.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: dim ranges verified before comments  
- [ ] **Zod Validation**: N/A unless API schema for models list changes (defer to 0105)  
- [ ] **Security**: N/A  
- [ ] **Error Sanitization**: N/A  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: no deletes  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:  
  - `open-sse/config/embeddingRegistry.ts` — `MatryoshkaMode`, MRL fields on `EmbeddingModel`, seed helpers (`GEMINI_MRL`, `openaiEmbedding3Mrl`, `qwen3EmbeddingMrl`), `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT`, helpers `getEmbeddingModel` / `getEmbeddingModelEntry` / `isMatryoshkaModel` / `isAllowedEmbeddingDim`; seeded Gemini + OpenAI-3 + Qwen3 rows  
  - `tests/unit/embeddings-matryoshka.test.ts` — **created**  
  - `CHANGELOG.md` Unreleased + `.changelog/20260721-223149-0103-epic21-registry-matryoshka-metadata-builders.md`  
  - Dialect file **not** rewritten (0102 SSoT left intact)  
- **Seed list + sources**:  
  | Family | Rows | Mode | Range / notes | Source |
  |--------|------|------|---------------|--------|
  | Gemini | `gemini-embedding-2`, `gemini-embedding-001` | provider | min 128 max 3072; preferred `dimensions: 768`; recommended list 768/1536/3072 | ai.google.dev embeddings; DeepMind Gemini Embedding 2 |
  | OpenAI-3 | `text-embedding-3-small/large` (+ OpenRouter `openai/…`, GitHub mirrors) | provider | min 1 max = native (1536/3072); common cut points in allowlist | openai.com embedding-3 blog |
  | OpenAI ada | `text-embedding-ada-002` (+ OpenRouter) | **not** MRL | fixed 1536 | OpenAI (no MRL) |
  | Qwen3 | Nebius 8B; DeepInfra 8B/4B/0.6B; Fireworks qwen3-embedding-8b | provider | min 32 max = native 4096/2560/1024 | HF Qwen3-Embedding tables (MRL Support = Yes) |
- **Renorm policy locked**: `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT = true` (D4 — L2 renorm **on** after client truncate for 0104)  
- **Testes**:  
  ```
  node --import tsx/esm --test tests/unit/embeddings-matryoshka.test.ts \
    tests/unit/embeddings-dimension-dialect.test.ts \
    tests/unit/embedding-rerank-provider-registry.test.ts
  → 28 pass, 0 fail
  ```  
- **typecheck/lint**: `npm run typecheck:core` exit 0  
- **CHANGELOG**: Unreleased **Added** entry for Task 0103  
- **Agente executor**: gt-ts-engineer (builders)  
- **Data de conclusão**: 2026-07-21  

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-ts-code-reviewer` (reviewers; parent agentID=`builders`)
- **Data da review**: 2026-07-22
- **Veredito**: `ACCEPTED_100` / `PASS_PERFECT` — moved to `docs/tasks/03-review/`
- **Score (path to 100)**: **100/100** (pre-fix ~94; path-to-100 applied in-session)
- **Notas**:
  - Report: `docs/reports/reviews/2026-07-22-task-0103-registry-matryoshka-metadata-review.md`
  - Path-to-100: fail-closed incomplete min/max in `isAllowedEmbeddingDim`; `geminiEmbeddingMrl()` factory (no shared allowlist array); `readonly number[]` allowlist; +2 unit tests
  - Evidence this session: **30 pass / 0 fail** (matryoshka + dialect + registry); typecheck:core exit 0; eslint max-warnings=0 on touched files
  - Scope clean: no truncate, no catalog full wire, dialect SSoT untouched, no Sidebar, no :21000
  - Residual optional (not scored): full discriminated MRL union deferred for BC; `getAllEmbeddingModels` MRL fields → 0105
