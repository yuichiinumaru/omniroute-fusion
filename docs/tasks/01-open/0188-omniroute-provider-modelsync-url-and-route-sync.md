# Task 0188: Provider model discovery modelsUrl declarations and route sync

> **Status**: `[ ]` Open
> **Priority**: 🟡 P2
> **Type**: `housekeeping`
> **Origin**: Operator inquiry / model sync audit across all providers (2026-08-18): triggering `GET /api/providers/[id]/models` returns 404 or falls back to static catalog for several providers because `modelsUrl` is omitted from registry entries or because `src/app/api/providers/[id]/models/route.ts` lacks dispatch routing. Comparison against reference codebase at `references/diegosouzapw-omniroute/` identified specific registry and route additions.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` with provider registry and models route changes.
> **Review routing**: independent + provider/runtime review

---

## Objective

Ensure `GET /api/providers/[id]/models` and `POST /api/providers/[id]/models` work for all OpenAI-compatible and custom providers by declaring `modelsUrl` where missing and updating discovery route dispatch:

1. Pin explicit `modelsUrl` in registry entries where missing for OpenAI-compatible providers:
   - `perplexity` (`open-sse/config/providers/registry/perplexity/index.ts` -> `modelsUrl: "https://api.perplexity.ai/v1/models"`)
   - `ovhcloud` (`open-sse/config/providers/registry/ovhcloud/index.ts` -> `modelsUrl: "https://api.ovhcloud.com/v1/models"`)
   - `liquid` (`open-sse/config/providers/registry/liquid/index.ts` -> `modelsUrl: "https://api.liquid.ai/v1/models"`)
2. Update `src/app/api/providers/[id]/models/route.ts` to dispatch model discovery for providers present in reference code at `references/diegosouzapw-omniroute/src/app/api/providers/[id]/models/route.ts`:
   - `agy` (Antigravity alias -> Antigravity model discovery)
   - `codex` (Codex models discovery)
   - `lmarena` (LM Arena live discovery)
   - `qwen-cloud` (Qwen Cloud discovery)
3. Bring missing discovery services from reference repo `references/diegosouzapw-omniroute/open-sse/services/`:
   - `notionWebModels.ts` (Notion AI discovery)
   - `promptqlModels.ts` (PromptQL discovery)
   - `clinepassModels.ts` (ClinePass discovery)

## Background Context

### O que já existe:

- `src/app/api/providers/[id]/models/route.ts` is the central API endpoint for model discovery/sync.
- Currently, OpenAI-compatible providers without `modelsUrl` fall back or fail when `models/route.ts` tries to construct a default URL.
- Perplexity, OVHcloud, and Liquid in reference repo `references/diegosouzapw-omniroute/` have explicit `modelsUrl` properties.
- Reference codebase at `references/diegosouzapw-omniroute/` has additional provider dispatch logic in `route.ts` and additional model discovery services.

### O que está faltando / quebrado:
- `perplexity` model sync can fail with 404 if `modelsUrl` is omitted.
- `ovhcloud` and `liquid` model sync fall back to static list instead of querying live endpoints.
- `agy`, `codex`, `lmarena`, `qwen-cloud`, `notion-web`, `promptql` discovery calls are unhandled in local `route.ts`.

---

## Test Requirements

- Unit test in `tests/unit/provider-modelsync-declarations.test.ts` MUST verify:
  1. `perplexity` registry entry contains `modelsUrl: "https://api.perplexity.ai/v1/models"`.
  2. `ovhcloud` registry entry contains `modelsUrl: "https://api.ovhcloud.com/v1/models"`.
  3. `liquid` registry entry contains `modelsUrl: "https://api.liquid.ai/v1/models"`.
  4. `GET /api/providers/[id]/models` for `perplexity`, `ovhcloud`, `liquid` uses the correct `modelsUrl`.
  5. `src/app/api/providers/[id]/models/route.ts` handles discovery dispatch for `agy`, `codex`, `lmarena`, `qwen-cloud`.
- `npm run typecheck:core` MUST pass without errors.
- `npm run lint` MUST pass without new errors.

---

## Exit Conditions (GDD/TDD)

- [ ] Read `src/app/api/providers/[id]/models/route.ts`, registry files for `perplexity`, `ovhcloud`, `liquid`, and reference code at `references/diegosouzapw-omniroute/`.
- [ ] RED tests fail before implementation.
- [ ] Explicit `modelsUrl` added to `perplexity`, `ovhcloud`, and `liquid` registries.
- [ ] `src/app/api/providers/[id]/models/route.ts` updated to route discovery for missing providers.
- [ ] Missing discovery services (`notionWebModels.ts`, `promptqlModels.ts`, `clinepassModels.ts`) brought over from reference code if needed.
- [ ] GREEN unit tests pass with 0 failures.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without new errors.
- [ ] Hard Rule #18 satisfied by TDD fail→pass evidence.
- [ ] A real append-only `.changelog/` entry created via manage-changelog and validated.

---

## Details

### What

Subtasks:

- [ ] **Ler existentes**: read `src/app/api/providers/[id]/models/route.ts`, `open-sse/config/providers/registry/perplexity/index.ts`, `ovhcloud/index.ts`, `liquid/index.ts`, and reference code in `references/diegosouzapw-omniroute/`.
- [ ] Add failing unit tests for `modelsUrl` presence and discovery route dispatch.
- [ ] Update `perplexity`, `ovhcloud`, `liquid` registry entries with `modelsUrl`.
- [ ] Update `src/app/api/providers/[id]/models/route.ts` with missing provider cases.
- [ ] **Verificação de regressão**: run focused unit tests, `npm run typecheck:core`, and `npm run lint`.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/config/providers/registry/perplexity/index.ts` | Modify — add `modelsUrl`. |
| `open-sse/config/providers/registry/ovhcloud/index.ts` | Modify — add `modelsUrl`. |
| `open-sse/config/providers/registry/liquid/index.ts` | Modify — add `modelsUrl`. |
| `src/app/api/providers/[id]/models/route.ts` | Modify — add missing provider discovery cases (`agy`, `codex`, `lmarena`, etc.). |
| `tests/unit/provider-modelsync-declarations.test.ts` | Create — TDD tests for modelsUrl and route dispatch. |
| `references/diegosouzapw-omniroute/src/app/api/providers/[id]/models/route.ts` | Read-only — reference code. |

### How

1. Write RED unit test asserting `modelsUrl` on perplexity/ovhcloud/liquid and route dispatch for agy/codex/lmarena.
2. Add `modelsUrl` to registry entries.
3. Update `src/app/api/providers/[id]/models/route.ts` with missing provider branches.
4. Run tests and typecheck.

### Why

Without explicit `modelsUrl` in registry files, OpenAI-compatible providers fail model sync or fall back to static lists. Adding `modelsUrl` and expanding `route.ts` provider coverage ensures model sync works reliably across all supported providers.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | Owns provider registry files for perplexity/ovhcloud/liquid and models route.ts. |
| **parallel-safe** | Unrelated provider tasks. |
| **Collision** | `src/app/api/providers/[id]/models/route.ts`, `open-sse/config/providers/registry/perplexity/index.ts`. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do NOT call `references/diegosouzapw-omniroute/` "upstream". It is the reference repository.
> Do NOT alter existing provider endpoints without checking reference code.

> [!IMPORTANT]
> Mocks must be used for all unit tests. No live network calls.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: all paths and symbols cited were verified against local and reference code.
- [ ] **TDD**: failing unit tests precede implementation.
- [ ] **Error Sanitization**: no raw credentials in logs or test output.
- [ ] **Production Safety**: no live `:22000` requests.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista com paths]
- **RED/GREEN test results**: [real output]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck:core**: [PASS/FAIL]
- **Changelog entry**: [path sob `.changelog/` + rebuild/validate]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, citar arquivos/linhas]
