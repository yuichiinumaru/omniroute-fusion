# Task 0102: EPIC-21 T21-B — Dimension Dialect SSoT in handleEmbedding

> **Status**: `[x]` Review (ACCEPTED_100 — lane `03-review`)  
> **Priority**: 🟡 P1  
> **Type**: `feature` + `remediation`  
> **Origin**: EPIC-21 T21-B + investigation Phase B  
>   `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md`  
>   `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`  
> **Blocks**: soft coordination with **0103**/**0104** on `embeddings.ts` / registry types  
> **Depends on**: **0101** hard (Gemini OpenAI-shim fix must land first)  
> **Parallelism**: `serializable` after 0101; prefer before 0103 if both touch `EmbeddingProvider`  
> **Review routing**: independent backend; may bundle with 0101 if still open and same author carefully sequences  

---

## Objective

Introduce a **single source of truth** for how client OpenAI `dimensions` map to upstream embedding bodies **per provider** (and, if needed, per baseUrl mode). Apply that map inside `handleEmbedding` so ad-hoc Gemini-only ifs are not reintroduced. Strip or remap fields that strict providers reject.

**Done when:** dimension field selection is data-driven (registry or dedicated dialect module), Gemini OpenAI-compat stays `dimensions`-only, default OpenAI-compat providers still forward `dimensions`, and unit tests cover at least Gemini + one non-Gemini dialect path without hardcoding the old dual inject.

---

## Background Context

### O que já existe:

- After **0101**: Gemini injection of `outputDimensionality` removed; `dimensions` still forwarded.  
- Handler builds `upstreamBody` with KNOWN_FIELDS loop (`model`, `input`, `dimensions`, `encoding_format`) then passthrough of extra client keys.  
- `open-sse/config/providerFieldStrips.ts` exists for chat executors — pattern reference only; embeddings may use a smaller, embedding-specific map.  
- Investigation table: Voyage/Jina/Cohere may need provider-specific param names later; OpenAI-compat majority use `dimensions`.

### O que está faltando / quebrado:

- No centralized `dimensionParam` / strip list for embeddings.  
- Risk of re-adding one-off `if (provider === "…")` blocks for each new dialect.  
- Extra client keys may leak into strict APIs via the KNOWN_FIELDS remainder loop.  

### Explicitly out of scope:

- Populating full matryoshka allowlists (→ **0103**).  
- Client truncate post-response (→ **0104**).  
- Catalog/UI exposure (→ **0105**).  
- Implementing every exotic provider dialect if docs are incomplete — **minimum**: Gemini OpenAI-compat + default `dimensions` + explicit extension points.  
- EPIC-19/20 UI.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0101** hard |
| **Blocks** | Prefer complete before **0103** if adding fields on same interfaces; **0104** may assume dialect applied on request path |
| **File ownership** | `open-sse/handlers/embeddings.ts`; dialect helper (new under `open-sse/config/` or co-located); tests under `tests/unit/` |
| **Collision** | Same files as 0103/0104 — do not parallel-edit `embeddings.ts` body-build with those tasks |
| **serializable** | After 0101; coordinate with 0103 on registry type shape |

---

## Test Requirements

- DEVE existir SSoT (typed constant/map/helper) that returns how to apply dimensions for a provider (and baseUrl mode if dual-mode supported)  
- DEVE, para Gemini com baseUrl OpenAI-compat: aplicar **apenas** `dimensions`; **nunca** setar `outputDimensionality`  
- DEVE, para OpenAI (ou default dialect): forward `dimensions` unchanged when present  
- DEVE **não** reintroduzir dual-forward regressions covered by `embeddings-gemini-dimensions.test.ts`  
- DEVE ter ≥1 unit test for the dialect helper (pure) + ≥1 integration-style capture via `handleEmbedding`  
- SE dialect includes native Gemini mode (`outputDimensionality`): DEVE ser coberto por teste **só** quando baseUrl/mode is native — not on current production baseUrl  

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.

- [x] Dialect SSoT module or registry fields exist and are used by `handleEmbedding`  
- [x] No residual hard-coded dual inject for Gemini OpenAI-shim (0101 contract preserved)  
- [x] Unit tests for dialect + handler capture pass:  
      `node --import tsx/esm --test tests/unit/embeddings-gemini-dimensions.test.ts`  
      `node --import tsx/esm --test tests/unit/<dialect-or-embeddings-dialect>.test.ts`  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos (eslint max-warnings=0 on dialect/handler/tests — review session)  
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]` (draft below; parent closeout via manage-changelog)  
- [x] Completion Evidence filled  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**:  
  `open-sse/handlers/embeddings.ts`,  
  `open-sse/config/embeddingRegistry.ts`,  
  `open-sse/config/providerFieldStrips.ts` (pattern only),  
  `tests/unit/embeddings-gemini-dimensions.test.ts`,  
  EPIC-21 §3–4 + investigation §4 Phase B  
- [x] Design minimal dialect shape, e.g.  
  `dimensionParam: "dimensions" | "outputDimensionality" | "output_dimension" | null`  
  + optional `stripFields: string[]` / `strictBody: boolean`  
- [x] Implement SSoT (prefer small pure module over scattering strings)  
- [x] Wire `handleEmbedding` to translate client `dimensions` → upstream field(s) via SSoT; strip conflicting fields  
- [x] Register Gemini OpenAI-compat → `dimensions` only; default providers → `dimensions`  
- [x] Unit tests (helper + handler)  
- [x] **Refactoring pass**: keep map small; no speculative Voyage/Jina code without documented field names grepped from registry/docs  
- [x] **Verificação de regressão**: gemini dimensions suite + new tests + typecheck + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/handlers/embeddings.ts` | Modificar — apply dialect instead of ad-hoc ifs |
| `open-sse/config/embeddingRegistry.ts` | Ler / possibly extend provider-level dialect fields |
| `open-sse/config/embeddingDimensionDialect.ts` (or similar) | Criar se SSoT is a dedicated module |
| `open-sse/config/providerFieldStrips.ts` | Ler — pattern inspiration only |
| `tests/unit/embeddings-gemini-dimensions.test.ts` | Ler / extend — no dual-forward regression |
| `tests/unit/embedding-dimension-dialect.test.ts` | Criar — pure dialect + handler cases |
| `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md` | Ler |
| `CHANGELOG.md` | Modificar |

### How

1. After 0101 green, design dialect API so default path is OpenAI `dimensions`.  
2. Extract apply function: `(provider, baseUrl, body) → upstreamBody` mutations for dim only.  
3. Gemini current baseUrl → dimensions only; optional future native URL → map to `outputDimensionality` and strip OpenAI-only extras (D3).  
4. Keep KNOWN_FIELDS passthrough unless dialect strip list forbids specific keys.  
5. Tests first for pure map, then handler capture.

### Why

Without a dialect SSoT, every provider edge case becomes another brittle `if` and reintroduces the class of bug that broke Gemini. Centralizing keeps D2/D3 enforceable.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | After **0101**; prefer before **0103** on shared registry types |
| **Collision** | `embeddings.ts`, `embeddingRegistry.ts` |
| **parallel-safe** | Not with 0103/0104 on same files |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT reintroduce `outputDimensionality` on the Gemini OpenAI-compat baseUrl.  
> DO NOT invent Voyage/Jina/Cohere field names without verifying against live registry docs or upstream API docs grepped into evidence.  
> PORT 21000 = production — live checks only on **:22000**.

> [!IMPORTANT]
> Read EVERY file in Where. Client contract remains OpenAI `dimensions` (D1).  
> Zero guesswork: if a provider dialect is unknown, default to OpenAI `dimensions` and document residual — do not guess protobuf field names.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: dialect field names grepped/verified before docs  
- [x] **Zod Validation**: only if public request schema changes (N/A — no public schema change)  
- [x] **Security**: no secrets  
- [x] **Error Sanitization**: preserve sanitize path  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: no deletes  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/config/embeddingDimensionDialect.ts` (create) — pure SSoT: `resolveEmbeddingDimensionDialect`, `applyEmbeddingDimensions`, Gemini OpenAI-shim vs native baseUrl detectors
  - `open-sse/handlers/embeddings.ts` (modify) — body build uses dialect; dimension-owned fields no longer ad-hoc / passthrough
  - `tests/unit/embeddings-dimension-dialect.test.ts` (create) — pure dialect + OpenAI handler forward + Gemini strip of client `outputDimensionality`
  - `tests/unit/embeddings-gemini-dimensions.test.ts` (unchanged; 0101 contract still green)
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/embeddings-gemini-dimensions.test.ts tests/unit/embeddings-dimension-dialect.test.ts`
- **Resultado dos testes**: 20/20 pass (15 dialect + 5 gemini-dimensions regression)
- **Resultado do lint**: not run in this worker (typecheck clean; lint optional for parent wave)
- **Resultado do typecheck/build**: `npm run typecheck:core` exit 0
- **Entrada no changelog**: see Changelog Draft below (worker does not publish `.changelog/` / rebuild; parent closeout)
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-21
- **Lane**: left in `02-doing` (no promotion)

### Changelog Draft (parent closeout)

```yaml
task: "0102"
agent: builders
project: omniroute-2
title: epic21-dimension-dialect-ssot
description: "EPIC-21 T21-B dimension dialect SSoT — data-driven embedding dimensions mapping; Gemini OpenAI-shim stays dimensions-only."
summary: |
  Added open-sse/config/embeddingDimensionDialect.ts as SSoT for client OpenAI
  dimensions → upstream field per provider/baseUrl mode. Wired handleEmbedding
  to apply dialect (strip outputDimensionality on Gemini OpenAI-shim; forward
  dimensions for default OpenAI-compat; extension point for future Gemini native
  embedContent without enabling on production baseUrl). Preserves Task 0101 D2.
verification:
  - "node --import tsx/esm --test tests/unit/embeddings-gemini-dimensions.test.ts tests/unit/embeddings-dimension-dialect.test.ts → 20/20 pass"
  - "npm run typecheck:core → exit 0"
```

### Unreleased blurb (for parent `[Unreleased]` / closeout)

- **EPIC-21 dimension dialect SSoT (Task 0102 / T21-B)** — centralize embedding `dimensions` mapping in `embeddingDimensionDialect.ts`; Gemini OpenAI-compat remains `dimensions`-only (strips `outputDimensionality`); default OpenAI-compat forwards `dimensions`; native Gemini mode is URL-gated extension only. 0101 regression suite green.  
  **Author**: builders (gt-ts-engineer)

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: gt-ts-code-reviewer (parent agentID=`builders`)
- **Data da review**: 2026-07-22
- **Veredito**: `ACCEPTED_100` / PASS_PERFECT — move to `docs/tasks/03-review/`
- **Score (path to 100)**: **100/100**
- **Notas**:
  - Dialect SSoT + Gemini D2 verified; 20/20 tests + typecheck + eslint green this session.
  - Path-to-100 fix applied by reviewer: dialect is last-writer after `defaultParams`; dimension-owned keys skipped in defaults (`open-sse/handlers/embeddings.ts`).
  - Full report: [`docs/reports/reviews/2026-07-22-task-0102-dimension-dialect-ssot-review.md`](../../reports/reviews/2026-07-22-task-0102-dimension-dialect-ssot-review.md)
  - Soft residual (out of scope): pre-existing embedding error payload shape; exotic provider dialects deferred.

### Review Ledger

| Date | Report | Score | Verdict |
|------|--------|-------|---------|
| 2026-07-22 | [2026-07-22-task-0102-dimension-dialect-ssot-review.md](../../reports/reviews/2026-07-22-task-0102-dimension-dialect-ssot-review.md) | 100 | ACCEPTED_100 |
