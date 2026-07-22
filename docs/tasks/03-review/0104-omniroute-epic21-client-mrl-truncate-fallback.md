# Task 0104: EPIC-21 T21-D — Client MRL Truncate Fallback + Renorm

> **Status**: `[x]` Implementation complete + formal review **100/100** → `03-review/`  

> **Priority**: 🟡 P1  
> **Type**: `feature` + `testing`  
> **Origin**: EPIC-21 T21-D + investigation §3 / Phase C  
>   `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md`  
>   `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`  
> **Blocks**: EPIC-21 success metric “MRL client truncate”  
> **Depends on**: **0101** hard; **0103** hard (MRL flags + allowlist + renorm policy); **0102** soft (request dialect already correct)  
> **Parallelism**: `serializable` after 0103; owns post-upstream response path in `handleEmbedding` / helper  
> **Review routing**: independent; TDD required  

---

## Objective

When a client requests `dimensions: d` and the upstream returns a longer MRL-safe vector (`N ≥ d`), OmniRoute may **prefix-truncate** to `d` and apply the **L2 renorm policy** locked in 0103 (default **on**). When the requested dim is unsupported, return **400** with a clear sanitized message (D5) — never silently corrupt geometry on non-MRL models.

**Done when:** unit tests prove truncate+renorm on MRL models, no-op when lengths already match, no truncate on non-MRL, 400 on unsupported dim, and a log/metric signal exists for `embed.mrl_client_truncate` (or equivalent structured log).

---

## Background Context

### O que já existe:

- After **0101**: Gemini request path no longer 400s from dual fields.  
- After **0103**: registry marks MRL models + allowed dims + renorm default.  
- Handler returns upstream JSON embedding arrays as-is today.  
- OpenAI documents MRL prefix truncation + optional renormalization for embedding-3-class models.

### O que está faltando / quebrado:

- No post-upstream truncate path.  
- Providers/TEI that ignore `dimensions` leave clients with wrong vector length.  
- No fail-closed check for unsupported requested dims on known MRL models.  

### Explicitly out of scope:

- Cross-family embedding mixing, vec2vec, re-rank.  
- Combo multi-model dim coercion.  
- Catalog exposure (→ **0105**).  
- Changing provider request dialect (0102).  
- UI.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0101** hard, **0103** hard, **0102** soft |
| **Blocks** | EPIC-21 success metrics for client MRL |
| **File ownership** | `open-sse/handlers/embeddings.ts` response path; new pure helper under `open-sse/` (e.g. `services/` or `utils/`); unit tests |
| **Collision** | Do not parallel-edit body-build section with 0102 — coordinate ownership (request vs response halves OK if serialized merges) |
| **serializable** | After 0103 |

---

## Test Requirements

> TDD preferred (Hard Rule #18).

- DEVE, para modelo MRL-safe + `requestedDim=d` + mock vector length `N > d`: response embedding length === `d`  
- DEVE aplicar L2 renorm when policy on: `sqrt(sum(x_i^2)) ≈ 1` within float tolerance after truncate  
- DEVE, quando policy off (if toggleable): truncate without renorm — only if 0103 allowed a switch; otherwise fixed on  
- DEVE no-op when `vector.length === d`  
- DEVE **não** truncar non-MRL models even if `N > d` (either pass-through or 400 per product rule — **prefer**: if client requested dims and model non-MRL and provider returned wrong length, do **not** silent truncate; document behavior in tests)  
- DEVE retornar **400** when `d` not in allowlist / outside min–max for MRL model (D5) **before or after** upstream as designed — prefer validate **before** upstream when allowlist known to save quota  
- DEVE logar/metricar client truncate events without leaking secrets  
- DEVE cobrir batch inputs (all embeddings truncated consistently)  

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.

- [x] Pure truncate+renorm helper implemented and unit-tested  
- [x] Wired into `handleEmbedding` (or response assembly) post-upstream success  
- [x] Unsupported dim → clear 400 via existing error sanitization helpers  
- [x] TDD evidence in Completion Evidence  
- [x] Unit tests pass:  
      `node --import tsx/esm --test tests/unit/embedding-mrl-truncate.test.ts`  
      `node --import tsx/esm --test tests/unit/embeddings-gemini-dimensions.test.ts` (no regression)  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` / eslint touched surface passa sem erros novos (`--max-warnings=0` this review)  
- [x] Hard Rule #18 via failing-then-passing tests  
- [x] Entrada no TOPO de `CHANGELOG.md` / `.changelog/` entry for 0104  
- [x] Completion Evidence filled  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**:  
  `open-sse/handlers/embeddings.ts` (full success path + response parse),  
  `open-sse/config/embeddingRegistry.ts` (0103 fields/helpers),  
  `open-sse/utils/error.ts` / `sanitizeErrorMessage` usage in handler,  
  EPIC-21 D4/D5 + investigation §3  
- [x] **Red**: write pure unit tests for truncate/renorm/reject cases  
- [x] Implement pure helper (no I/O)  
- [x] Wire after successful upstream parse; validate requested dim against registry when present  
- [x] Add structured log line for client truncate (provider, model, from→to dims)  
- [x] Ensure usage fields unchanged; only `data[].embedding` length adjusts  
- [x] **Refactoring pass**: keep math in pure function; handler stays thin  
- [x] **Verificação de regressão**: truncate suite + gemini dimensions + typecheck  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/handlers/embeddings.ts` | Modificar — post-upstream apply MRL fallback |
| `open-sse/utils/embeddingMrl.ts` | Criar — pure truncate/renorm/validate |
| `open-sse/config/embeddingRegistry.ts` | Ler — consume 0103 helpers (minimal touch) |
| `tests/unit/embedding-mrl-truncate.test.ts` | Criar — TDD suite |
| `tests/unit/embeddings-gemini-dimensions.test.ts` | Ler — regression |
| `open-sse/utils/error.ts` | Ler — sanitize 400 messages |
| `CHANGELOG.md` / `.changelog/` | Modificar |

### How

1. Confirm 0103 helpers for `isAllowedDim` / `isMatryoshka`.  
2. If `dimensions` requested and model known MRL and dim invalid → 400 early.  
3. Call upstream as today (with 0101/0102 dialect).  
4. If success and length mismatch and MRL-safe and `N ≥ d` → truncate (+ renorm).  
5. If length mismatch and not MRL-safe → do not truncate; clear 400 when known non-MRL.  
6. Tests for each branch.

### Why

Provider-side MRL is not universal. OmniRoute must offer a safe client fallback for known MRL models so operators can pin index dims without depending on every upstream honoring `dimensions`.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | After **0103** (and 0101) |
| **Collision** | Response half of `embeddings.ts` |
| **parallel-safe** | Pure helper tests can be drafted after 0103 types exist |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> NEVER truncate non-MRL models. NEVER silent-wrong-length on unsupported dims (D5).  
> DO NOT skip 0103 — no hard-coded allowlists only in the handler.  
> PORT 21000 off-limits; live only :22000.

> [!IMPORTANT]
> TDD first. Use `sanitizeErrorMessage` / existing error helpers for 400 bodies.  
> Renorm default = 0103 lock (D4). Document both modes only if a switch exists.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: metric/log names real (`embed.mrl_client_truncate`)  
- [x] **Zod Validation**: requested dims already via existing schemas if present  
- [x] **Security**: no secret leakage in logs  
- [x] **Error Sanitization**: 400 messages via `sanitizeErrorMessage`  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: no deletes  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:  
  - `open-sse/utils/embeddingMrl.ts` (new)  
  - `open-sse/handlers/embeddings.ts` (wire pre-validate + post-truncate)  
  - `tests/unit/embedding-mrl-truncate.test.ts` (new)  
  - `.changelog/20260721-223530-0104-epic-21-client-mrl-truncate-fallback-t21-d-builders.md` + rebuild  
- **Testes (red→green)**: pure helper suite first (truncate/renorm/reject/batch), then handler integration with full-dim mock → shortened L2 unit vector; invalid MRL dim skips fetch; non-MRL mismatch 400  
- **Resultado dos testes**:  
  - `node --import tsx/esm --test tests/unit/embeddings-*.test.ts tests/unit/embedding-mrl-truncate.test.ts` → **86 pass / 0 fail**  
  - Includes gemini dimensions + dialect + matryoshka + handler + nvidia + mrl-truncate  
- **lint/typecheck**: `npm run typecheck:core` clean  
- **CHANGELOG**: `.changelog/…0104…` entry; `rebuild.sh build` projected into root `CHANGELOG.md`  
- **Agente executor**: builders / gt-ts-engineer  
- **Data de conclusão**: 2026-07-21  

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-ts-code-reviewer` (parent agentID=`builders`)
- **Data da review**: 2026-07-22
- **Veredito**: `ACCEPTED_100` / PASS_PERFECT → move `03-review/`
- **Score (path to 100)**: **100/100** (path-to-100 applied in review session: apply re-validates MRL dims; no `as Record`; base64 + invalid-dim pure tests)
- **Notas**: Report `docs/reports/reviews/2026-07-22-task-0104-client-mrl-truncate-fallback-review.md`. Evidence: 64 pass embeddings suites; typecheck:core exit 0; eslint max-warnings=0 on touched files. Dual score local=100 / runtime=100.

### Review Ledger

| Date | Report | Score | Verdict |
|------|--------|-------|---------|
| 2026-07-22 | [2026-07-22-task-0104-client-mrl-truncate-fallback-review.md](../../reports/reviews/2026-07-22-task-0104-client-mrl-truncate-fallback-review.md) | 100 | ACCEPTED_100 |
