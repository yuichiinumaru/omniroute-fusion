> **✅ FINAL VERIFY PASS (2026-07-22)** — Score **100/100** ACCEPTED → `04-completed`.
> Report: `docs/reports/reviews/2026-07-22-task-0101-gemini-openai-shim-dimensions-final-review.md`
> Prior: path-to-100 **100** re-proved; independent **88** CONDITIONAL residual items RESOLVED; first 100 INVALIDATED.
>
# Task 0101: EPIC-21 T21-A — Gemini OpenAI-Shim Dimensions (P0)

> **Status**: `[x]` Final independent verify **100/100** — completed (`04-completed`)
> **Priority**: 🔴 P0  
> **Type**: `remediation` + `testing`  
> **Origin**: EPIC-21 T21-A + investigation  
>   `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md`  
>   `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`  
> **Blocks**: **0102**, **0103**, **0104**, **0105** (hard gate for EPIC-21 wave)  
> **Depends on**: none  
> **Parallelism**: `serializable` — first EPIC-21 task; sole owner of Gemini injection block in `open-sse/handlers/embeddings.ts` until closed  
> **Review routing**: independent (bugfix); may bundle with 0102 only if same PR and both green  

---

## Objective

Stop OmniRoute from injecting Gemini-native `outputDimensionality` into requests aimed at Google’s **OpenAI-compat** embeddings shim (`/v1beta/openai/embeddings`). Keep forwarding OpenAI `dimensions`. Invert unit tests that currently encode the broken dual-field contract. Prove non-Gemini providers still get `dimensions` only.

**Done when:** a Gemini embed request with `dimensions: 768` builds an upstream body that has `dimensions` and **does not** have `outputDimensionality`; tests fail under the old dual-forward, then pass after the fix (TDD).

---

## Background Context

### O que já existe:

- Client contract: OpenAI-compatible `POST /v1/embeddings` with optional `dimensions` (D1).  
- Handler: `open-sse/handlers/embeddings.ts` copies `body.dimensions` → `upstreamBody.dimensions` (~L138).  
- **Bug block** (~L147–159): for `provider === "gemini"`, also sets `upstreamBody.outputDimensionality` from `body.dimensions`.  
- Gemini registry baseUrl is OpenAI shim:  
  `https://generativelanguage.googleapis.com/v1beta/openai/embeddings`  
  (`open-sse/config/embeddingRegistry.ts` gemini entry).  
- Unit suite: `tests/unit/embeddings-gemini-dimensions.test.ts` **requires** dual-forward (wrong for live shim).  
- Operator 400: `Unknown name "outputDimensionality": Cannot find field.`

### O que está faltando / quebrado:

- Injection of native field against OpenAI-compat URL → production 400 (P0).  
- Tests encode the wrong behavior (P0 test debt).  
- Comment block still claims dual-forward is required (decolua/9router#1366 assumption disproven by live Google shim).  

### Explicitly out of scope:

- Full dimension dialect SSoT map (→ **0102**).  
- Registry `is_matryoshka` / allowlists (→ **0103**).  
- Client-side truncate fallback (→ **0104**).  
- Catalog/docs exposure (→ **0105**).  
- Native Gemini `embedContent` URL switch (D3 optional later; only document a hook if trivial — do not implement dual-mode unless already present).  
- UI / EPIC-19/20 surfaces.  
- Memory embed path (`src/lib/memory/embedding`).  
- Live :21000 production traffic.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | none |
| **Blocks** | 0102–0105 hard |
| **File ownership** | `open-sse/handlers/embeddings.ts` Gemini block; `tests/unit/embeddings-gemini-dimensions.test.ts` |
| **Do not touch** | full dialect refactor, matryoshka types, catalog fields |
| **serializable** | Must finish before other EPIC-21 slices edit the same Gemini injection path |

---

## Test Requirements

> TDD preferred (Hard Rule #18).

- DEVE haver teste(s) que falhem **antes** do fix se o body Gemini ainda contiver `outputDimensionality` quando `dimensions` está setado  
- DEVE, após o fix, para Gemini + `dimensions: N` (single e batch): `captured.body.dimensions === N` e `"outputDimensionality" in captured.body === false`  
- DEVE manter: Gemini sem `dimensions` → sem `outputDimensionality`  
- DEVE manter: non-Gemini (ex. `openai/text-embedding-3-small`) + `dimensions` → só `dimensions`, nunca `outputDimensionality`  
- DEVE tratar dimensions inválidos (0 / non-finite): não injetar `outputDimensionality` (comportamento atual preservado sob o novo contrato)  
- DEVE atualizar comentários de arquivo/teste para citar o OpenAI-shim contract (D2), não dual-forward  

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.

- [x] Dual-field Gemini injection removed for OpenAI-compat path (no `outputDimensionality` set from handler for current Gemini baseUrl)  
- [x] Unit tests inverted to assert **dimensions only** on Gemini OpenAI-shim  
- [x] Non-Gemini regression still green in the same suite (or adjacent unit)  
- [x] TDD evidence: failing assertion under old code → green after fix (Completion Evidence)  
- [x] Relevant unit tests pass:  
      `node --import tsx/esm --test tests/unit/embeddings-gemini-dimensions.test.ts tests/unit/embeddings-dimension-dialect.test.ts` → **21/21 pass** (path-to-100 re-run 2026-07-22)  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos (`npx eslint --max-warnings=0` on touched files)  
- [x] Hard Rule #18 satisfied via failing-then-passing unit tests  
- [x] Entrada product Fixed no ledger `.changelog/*-0101-*` + `CHANGELOG.md` rebuild (not only task-promotion “no product code”)  
- [x] Completion Evidence filled with real command output  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**:  
  `open-sse/handlers/embeddings.ts` (esp. L129–172 Gemini block),  
  `tests/unit/embeddings-gemini-dimensions.test.ts`,  
  `open-sse/config/embeddingRegistry.ts` (gemini baseUrl + models),  
  EPIC-21 + investigation report (D1–D3)  
- [x] **Red**: rewrite/invert tests so dual-forward **fails** under current production code  
- [x] **Green**: delete/disable the Gemini `outputDimensionality` injection; keep `dimensions` forward  
- [x] Update misleading comments (handler + test header) to state D2 (OpenAI-shim = `dimensions` only)  
- [x] Confirm non-Gemini case still in suite and green  
- [x] **Refactoring pass**: no drive-by dialect framework — surgical only  
- [x] **Verificação de regressão**: unit file + typecheck:core + lint  
- [x] CHANGELOG Fixed ledger entry + Completion Evidence; **leave in `02-doing`** for parent re-review (do not self-promote)  
- [x] Path-to-100 (2026-07-22): product Fixed changelog; combo.ts D2 comment; registry-seed test `gemini/gemini-embedding-2` + `dimensions: 768`; honest Review Trail  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/handlers/embeddings.ts` | Modificar — remove Gemini dual inject (~L147–159); keep `dimensions` |
| `tests/unit/embeddings-gemini-dimensions.test.ts` | Modificar — invert dual-field assertions to dimensions-only; seed model case |
| `src/shared/validation/schemas/combo.ts` | Modificar — D2 comment (dimensions only; no dual-forward claim) |
| `open-sse/config/embeddingRegistry.ts` | Ler — confirm OpenAI-shim baseUrl for gemini |
| `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md` | Ler — root cause + verification curls |
| `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md` | Ler — D1–D3 product locks |
| `.changelog/*-0101-*` + `CHANGELOG.md` | Product Fixed entry + rebuild |

### How

1. Read handler + tests; reproduce dual-forward in test harness (already does).  
2. Change tests first: expect **no** `outputDimensionality` when `dimensions` set on Gemini.  
3. Run tests → expect RED.  
4. Remove the `if (provider === "gemini" … outputDimensionality)` block (or gate so OpenAI-compat never injects).  
5. Run tests → GREEN.  
6. Keep non-Gemini assertion.  
7. Optional live proof on **:22000 only** (operator):  
   `curl …/v1/embeddings` with `gemini/gemini-embedding-2` + `dimensions:768` → not 400.  
   Do **not** hit :21000.

### Why

Production Gemini embeddings with `dimensions` are broken today because OmniRoute sends a field Google’s OpenAI shim does not accept. Shipping dialect/MRL features on top of a known 400 is wasted work. Fix + invert tests first.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | First in EPIC-21; blocks 0102–0105 |
| **Collision** | `open-sse/handlers/embeddings.ts` Gemini body build |
| **parallel-safe** | Only vs unrelated non-embeddings tasks (e.g. 0106 housekeeping) |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT mark complete while any test still asserts dual-forward of `outputDimensionality` on the OpenAI-shim path.  
> DO NOT implement full dialect SSoT here (0102). DO NOT add client truncate (0104).  
> PORT 21000 = production — never mutate/stop; live checks only on **:22000** with operator consent.

> [!IMPORTANT]
> Read EVERY file in Where before writing. Client contract stays OpenAI `dimensions` (D1).  
> Native `embedContent` mapping (D3) is **not** required unless baseUrl is already native — do not invent a second production path.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: comments/CHANGELOG match live baseUrl and field names (`grep` before claims)  
- [x] **Zod Validation**: N/A unless request schema changes (prefer no schema change)  
- [x] **Security**: no secrets; no raw error stack in responses  
- [x] **Error Sanitization**: leave existing `sanitizeErrorMessage` path intact  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: nothing deleted; only code/test edits  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

### Initial fix (2026-07-21)

- **Arquivos criados/modificados**:
  - `open-sse/handlers/embeddings.ts` — removido o bloco `if (provider === "gemini")` que injetava `outputDimensionality`; D2 documentado; depois 0102 re-home via `applyEmbeddingDimensions`
  - `tests/unit/embeddings-gemini-dimensions.test.ts` — invertidos testes dual-forward → dimensions-only (single + batch + omit + non-Gemini + invalid)
- **TDD red→green** (initial): RED 2 fail / 3 pass under dual-inject → GREEN after removal

### Path-to-100 after independent re-review REJECT 88 (2026-07-22)

- **Arquivos criados/modificados (esta sessão)**:
  - `.changelog/20260721-230352-0101-epic-21-t21-a-gemini-openai-shim-dimensions-p0-builders.md` — product **Fixed** entry (P0 dual-forward / OpenAI-shim dimensions only) + `rebuild.sh build`
  - `src/shared/validation/schemas/combo.ts` — stale dual-forward comment → D2 (`dimensions` only; no `outputDimensionality` claim)
  - `tests/unit/embeddings-gemini-dimensions.test.ts` — optional harden: registry seed `gemini/gemini-embedding-2` + `dimensions: 768`
  - Task form: exits/subtasks marked; Review Trail rewritten (prior 100 invalidated)
- **Testes re-run (path-to-100)**:
  ```text
  node --import tsx/esm --test \
    tests/unit/embeddings-gemini-dimensions.test.ts \
    tests/unit/embeddings-dimension-dialect.test.ts
  → 21/21 pass (6 gemini suite incl. seed model + 15 dialect suite)
  ```
- **typecheck**: `npm run typecheck:core` → clean (0 errors)
- **lint**: `npx eslint --max-warnings=0 src/shared/validation/schemas/combo.ts tests/unit/embeddings-gemini-dimensions.test.ts` → PASS
- **Entrada no changelog**: `.changelog/…-0101-…-builders.md` Fixed P0; projected into root `CHANGELOG.md` via rebuild (ledger row also in `.changelog/index.md`)
- **Lane**: **remains `docs/tasks/02-doing/`** — builder does not move task; parent re-reviews
- **Agente executor (path-to-100)**: `builders (gt-ts-engineer)`
- **Data path-to-100**: `2026-07-22`

---

## 🔍 Review Trail

### Prior review (2026-07-21) — **INVALIDATED / OVERCLAIM**

- **Reviewer**: `reviewers (gt-ts-code-reviewer)`  
- **Data**: `2026-07-21`  
- **Veredito claimed**: `APROVADO` with **100/100**  
- **Why invalid**: independent re-audit found **missing product CHANGELOG Fixed** for 0101 (only task-promotion “no product code” narrative existed), open exit checkboxes, and residual dual-forward comment in `combo.ts`. Score/claim of CHANGELOG-at-top + full DoD was **false**. Trail kept only as historical record of overclaim — **do not treat as approval**.

### Independent re-review (2026-07-22) — authoritative reject

- **Reviewer**: independent orchestrator + gt-ts-code-reviewer  
- **Data**: 2026-07-22  
- **Veredito**: `CONDITIONAL` / path-to-100  
- **Score**: **88/100**  
- **Report**: `docs/reports/reviews/2026-07-22-task-0101-gemini-openai-shim-dimensions-independent-rereview.md`  
- **What passed**: product D2 runtime (no `outputDimensionality` on OpenAI-shim); inverted unit suite green  
- **What blocked**: product CHANGELOG Fixed; honest trail; combo.ts comment; optional seed-model test  

### Path-to-100 builder pass (2026-07-22)

- **Executor**: `builders (gt-ts-engineer)`  
- **Actions**: Fixed changelog entry; combo.ts D2 comment; registry-seed test; exits re-marked after 21/21 + typecheck; trail rewritten  
- **Self-score**: **not claimed**

### Path-to-100 re-review (2026-07-22) — ACCEPTED 100

- **Reviewer**: independent re-reviewer (ts-code-reviewer / parent builders dual-hat)  
- **Score**: **100/100**  
- **Verdict**: `ACCEPTED_100`  
- **Report**: `docs/reports/reviews/2026-07-22-task-0101-path-to-100-rereview.md`  
- **Live proof**: gemini + dialect suites **21/21**; `typecheck:core` clean; eslint max-warnings=0 on touched files; product Fixed `.changelog/*-0101-*`; combo.ts D2  
- **Lane**: → `docs/tasks/03-review/`

### Final independent verification (2026-07-22) — ACCEPTED 100 → completed

- **Reviewer**: independent final (`reviewers` / gt-code-quality-reviewer)  
- **Score**: **100/100**  
- **Verdict**: `ACCEPTED_100` / PASS  
- **Report**: `docs/reports/reviews/2026-07-22-task-0101-gemini-openai-shim-dimensions-final-review.md`  
- **Live proof (this session)**: gemini + dialect **21/21**; `typecheck:core` exit 0; eslint max-warnings=0 on handler/dialect/combo/tests; no dual-inject assignment; registry OpenAI-shim baseUrl; product Fixed `.changelog/*-0101-*`; combo D2 comment  
- **Lane**: → `docs/tasks/04-completed/`  
- **Patches**: none

## Review Ledger

| Date | Mode | Score | Verdict | Report |
|------|------|-------|---------|--------|
| 2026-07-21 | initial (invalidated) | 100 claimed | OVERCLAIM | (no standalone report) |
| 2026-07-22 | independent re-review | 88 | CONDITIONAL | `docs/reports/reviews/2026-07-22-task-0101-gemini-openai-shim-dimensions-independent-rereview.md` |
| 2026-07-22 | path-to-100 re-review | 100 | ACCEPTED | `docs/reports/reviews/2026-07-22-task-0101-path-to-100-rereview.md` |
| 2026-07-22 | **final independent verify** | **100** | **ACCEPTED_100** | `docs/reports/reviews/2026-07-22-task-0101-gemini-openai-shim-dimensions-final-review.md` |

### Previous Reports

- `docs/reports/reviews/2026-07-22-task-0101-gemini-openai-shim-dimensions-final-review.md`
- `docs/reports/reviews/2026-07-22-task-0101-path-to-100-rereview.md`
- `docs/reports/reviews/2026-07-22-task-0101-gemini-openai-shim-dimensions-independent-rereview.md`
