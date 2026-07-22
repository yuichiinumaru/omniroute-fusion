# Task 0105: EPIC-21 T21-E — Catalog / Docs Dim Capabilities (P2)

> **Status**: `[x]` Review **PASS 100** — in `03-review/` (formal tsjs + docs-accuracy; path-to-100 applied)  
> **Priority**: 🟢 P2  
> **Type**: `feature` + `governance` (docs)  
> **Origin**: EPIC-21 T21-E + investigation Phase D  
>   `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md`  
>   `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`  
> **Blocks**: EPIC-21 close for operator discoverability  
> **Depends on**: **0103** hard (fields exist); **0101** hard (P0 fixed before advertising); prefer **0104** for accurate “client truncate” docs  
> **Parallelism**: `serializable` **last** in EPIC-21 wave  
> **Review routing**: independent; docs-accuracy strict (`check:fabricated-docs` mindset)  
> **Review report**: `docs/reports/reviews/2026-07-22-task-0105-catalog-docs-dim-capabilities-review.md`  

---

## Objective

Expose embedding **dimension capabilities** from registry MRL metadata on the existing list/catalog surfaces operators already use, and document the client contract (OpenAI `dimensions`, Gemini OpenAI-shim behavior, optional client MRL truncate) in the correct docs paths — without inventing endpoints or UI epics.

**Done when:** GET embedding model list and/or models catalog includes MRL-related fields for seeded models; docs state D1–D5 accurately with grepped path references; unit/doc checks prevent silent field drift.

---

## Background Context

### O que já existe:

- `GET` handler in `src/app/api/v1/embeddings/route.ts` maps `getAllEmbeddingModels()` → `{ id, object, created, owned_by, type: "embedding", dimensions }`.  
- Models catalog `src/app/api/v1/models/catalog.ts` pushes embedding models with `dimensions: embModel.dimensions` only.  
- After **0103**: registry holds `isMatryoshka`, allowlists, etc.  
- After **0101/0102/0104**: runtime behavior exists to document.  
- Doc accuracy discipline: no fabricated API names (`AGENTS.md` Doc Accuracy).

### O que está faltando / quebrado:

- Catalog/list omit matryoshka capabilities → operators cannot discover allowed dims.  
- No operator-facing note on Gemini shim vs native field, or client truncate policy.  

### Explicitly out of scope:

- New dashboard UI pages / EPIC-19/20 chrome.  
- New public endpoints beyond extending existing list/catalog JSON.  
- Auto-HF ingest.  
- Re-implementing dialect/truncate (must only document + expose).  

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0103** hard; **0101** hard; **0104** preferred for truncate docs accuracy; **0102** preferred for dialect docs |
| **Blocks** | EPIC-21 discoverability success  
| **File ownership** | `src/app/api/v1/embeddings/route.ts` GET mapping; `src/app/api/v1/models/catalog.ts` embedding push; docs under `docs/` (frameworks/reference as justified); tests |
| **serializable** | Last EPIC-21 task |
| **Collision** | Low if 0103 fields stable; do not re-edit handler request path |

---

## Test Requirements

- DEVE expor campos MRL (nomes estáveis, camelCase alinhados ao registry) no GET `/v1/embeddings` model list **e/ou** models catalog embedding entries — pick both if cheap, at least one required  
- DEVE para um modelo seed MRL (ex. `openai/text-embedding-3-small` or gemini embed id): response JSON includes capability fields (e.g. `isMatryoshka`, `matryoshkaDimensions` / min-max) reflecting registry  
- DEVE para modelo non-MRL: fields absent or false — no false positives  
- DEVE ter unit test cobrindo o mapper (mock registry or import live seed)  
- DEVE documentar em `docs/` (choose real existing guides — e.g. API reference section or embeddings-related architecture note) com paths grepped reais:  
  - Client `dimensions` (D1)  
  - Gemini OpenAI-shim: no `outputDimensionality` (D2)  
  - Client truncate + renorm policy (D4) when 0104 landed  
  - Unsupported dim → 400 (D5)  
- DEVE **não** inventar endpoints/env vars; run mental/doc-accuracy: every path exists via `grep`  

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.

- [x] List and/or catalog JSON includes MRL capability fields from registry  
- [x] Unit test(s) for exposure mapper pass:  
      `node --import tsx/esm --test tests/unit/embedding-dim-capabilities-catalog.test.ts`  
- [x] Docs updated with verified paths only  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos  
- [x] Doc accuracy: no fabricated names (`grep` evidence in Completion Evidence)  
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`  
- [x] Completion Evidence filled  
- [x] EPIC-21 success metrics section can be checked for catalog/docs items  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**:  
  `src/app/api/v1/embeddings/route.ts` (GET),  
  `src/app/api/v1/models/catalog.ts` (embedding loop),  
  `open-sse/config/embeddingRegistry.ts` (0103 fields + `getAllEmbeddingModels`),  
  existing docs mentioning embeddings (`docs/reference/API_REFERENCE.md`, openapi if present — only if real),  
  EPIC-21 §5 success metrics  
- [x] Define stable public JSON field names (document in task evidence)  
- [x] Extend GET embeddings list mapper  
- [x] Extend catalog embedding push  
- [x] Unit tests  
- [x] Docs: short “Embeddings dimensions / MRL” section or subsection with D1–D5; link investigation report  
- [x] **Refactoring pass**: thin mappers only  
- [x] **Verificação de regressão**: unit + typecheck + lint; optional `npm run check:docs-all` if docs touched heavily  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/api/v1/embeddings/route.ts` | Modificar — GET list capability fields |
| `src/app/api/v1/models/catalog.ts` | Modificar — embedding entries capability fields |
| `open-sse/config/embeddingRegistry.ts` | Ler — source fields (0103) |
| `tests/unit/embedding-dim-capabilities-catalog.test.ts` | Criar |
| `docs/reference/API_REFERENCE.md` and/or `docs/architecture/` note | Modificar — only if file exists and section fits; verify with list/grep first |
| `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md` | Ler — link from docs |
| `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md` | Atualizar success metrics checkboxes if closing epic |
| `CHANGELOG.md` | Modificar |

### How

1. Confirm 0103 field names on live types.  
2. Add pure `toEmbeddingModelPublic(m)` mapper shared by GET list + catalog if duplication appears.  
3. Tests assert shape for one MRL + one non-MRL seed.  
4. Docs: short operator contract; no UI work.  
5. Mark EPIC-21 success metrics related to catalog when done.

### Why

Runtime fixes without discoverability leave operators guessing allowed dims and whether OmniRoute will truncate. P2 closes the loop after P0/P1 correctness.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | **Last** after 0101–0104 |
| **Collision** | catalog/list only — avoid reopening handler request path |
| **parallel-safe** | Not with 0103 while types still moving |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT document APIs that `grep` cannot find. DO NOT invent new dashboard routes.  
> DO NOT claim client truncate works until 0104 is complete — if 0104 residual, document “planned/landed” honestly.  
> PORT 21000 off-limits.

> [!IMPORTANT]
> Prefer extending existing list/catalog over new endpoints.  
> Keep OpenAPI/docs in sync only when those files already describe embeddings and the change is mechanical.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: every path/field grepped  
- [x] **Zod Validation**: only if response schemas exist and must be extended — N/A (list/catalog JSON is free-form OpenAI-style; no response Zod schema for model list)  
- [x] **Security**: no secrets in docs  
- [x] **Error Sanitization**: N/A unless error examples  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: no deletes  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/config/embeddingRegistry.ts` — `toEmbeddingModelPublicMrlFields`, types, extended `getAllEmbeddingModels`
  - `src/app/api/v1/embeddings/route.ts` — GET list spreads MRL fields
  - `src/app/api/v1/models/catalog.ts` — embedding entries spread MRL fields
  - `open-sse/index.ts` — re-export mapper
  - `tests/unit/embedding-dim-capabilities-catalog.test.ts` — **new**
  - `docs/reference/API_REFERENCE.md` — Embeddings Dimensions / Matryoshka section
  - `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md` — §5 catalog/docs metrics
  - `.changelog/20260721-223940-0105-epic-21-t21-e-catalog-docs-dim-capabilities-builders.md`
- **Public JSON field names** (camelCase, registry-aligned; emitted only when `isMatryoshka === true`):
  - `dimensions` (always when known; preferred/native default)
  - `isMatryoshka` (`true` only)
  - `matryoshkaMode` (`provider` | `client_truncate` | `none`)
  - `minDimensions` / `maxDimensions`
  - `matryoshkaDimensions` (copied allowlist array)
- **Testes**:
  - `node --import tsx/esm --test tests/unit/embedding-dim-capabilities-catalog.test.ts` → **8 pass**
  - Related regression suite (63 pass): catalog + mrl-truncate + matryoshka + dimension-dialect + gemini-dimensions
- **Doc paths + grep proof** (all exist on disk; symbols found via `rg`):
  - `open-sse/config/embeddingRegistry.ts` (`toEmbeddingModelPublicMrlFields`, `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT`)
  - `open-sse/config/embeddingDimensionDialect.ts` (`gemini-openai-shim`, `applyEmbeddingDimensions`)
  - `open-sse/utils/embeddingMrl.ts` (`validateRequestedMrlDim`, `embed.mrl_client_truncate`)
  - `open-sse/handlers/embeddings.ts` (applies dialect + MRL gate)
  - `src/app/api/v1/embeddings/route.ts`, `src/app/api/v1/models/catalog.ts`
  - `src/shared/validation/schemas/apiV1.ts` (`v1EmbeddingsSchema`)
  - `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`
- **lint/typecheck**:
  - `npm run typecheck:core` → clean
  - `npx eslint --max-warnings=0` on touched TS files → clean
- **CHANGELOG**: `.changelog/20260721-223940-0105-…-builders.md` + `rebuild.sh build` → entry in `CHANGELOG.md` (Task 0105)
- **Agente executor**: `gt-ts-engineer` (parent lane `builders`)
- **Data de conclusão**: 2026-07-21
- **Lane note**: promoted to `docs/tasks/03-review/` after independent review score 100 (2026-07-22)

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-ts-code-reviewer` (parent agentID=`builders`)
- **Data da review**: 2026-07-22
- **Veredito**: `ACCEPTED_100` / `PASS_PERFECT` — moved to `docs/tasks/03-review/`
- **Score (path to 100)**: **100/100** (initial ~96 → path-to-100 applied in-session)
- **Report**: [`docs/reports/reviews/2026-07-22-task-0105-catalog-docs-dim-capabilities-review.md`](../../reports/reviews/2026-07-22-task-0105-catalog-docs-dim-capabilities-review.md)
- **Notas**:
  - Contract complete: dual-surface MRL exposure + D1–D5 docs with grepped paths; 10 unit tests green; typecheck + eslint green.
  - Path-to-100: composition-shape tests (list + catalog), `readonly` public allowlist type, docs note that `matryoshkaMode: "provider"` does not disable D4 truncate+renorm.
  - Optional residual (not blocking): OpenAPI list MRL fields; pre-existing empty catch / `any` on custom models in GET route.
  - Constraints: no git; no `:21000`; no `Sidebar.tsx`.
