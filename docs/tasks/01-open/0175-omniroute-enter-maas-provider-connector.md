# Task 0175: Add Enter MaaS Provider Connector (API Key Gateway — Evidence-Gated)

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2
> **Type**: `feature`
> **Origin**: Operator request to integrate `enter.converge.ai` (Enter Pro / Converge AI) MaaS model gateway. Operator research (2026-08-16) identified a browser-OAuth CLI (Enter Code) and an API-key gateway (Enter MaaS) sharing one account/saldo.
> **Blocks**: —
> **Depends on**: `RD-omniroute-enter-maas-evidence` (evidence gate — endpoint, contract, catalog, billing MUST be confirmed by the RD before implementation starts)
> **Parallelism**: `parallel-safe` — Touches `enter-maas` provider constants, catalog registry, and endpoint routes only, and only after the RD evidence gate resolves.
> **Review routing**: independent + provider/catalog review

---

## Objective

Integrate the **Enter MaaS** provider (`enter-maas`) into OmniRoute as a standard API Key aggregator/gateway, **using only values established by the evidence task `RD-omniroute-enter-maas-evidence`**.

The integration must support:
1. **Provider Registration**: Add `enter-maas` to `src/shared/constants/providers/apikey/gateways.ts` and `src/shared/constants/providers.ts` with `passthroughModels: true`, and metadata (`name: "Enter MaaS"`, `alias: "ent"`, `color: "#0052FF"`, `textIcon: "ENT"`, `website: "https://enter.converge.ai"`).
2. **OpenAI-Compatible Execution**: Map `enter-maas` in `open-sse/config/providers/registry/enter-maas/index.ts` using `DefaultExecutor` (`format: "openai"`, `executor: "default"`, `authType: "apikey"`, `authHeader: "bearer"`). The `baseUrl`/`modelsUrl` values come from the RD evidence — no value is fixed in this task.
3. **Endpoint Mapping & Dynamic Discovery**:
   - Register endpoint in `src/shared/constants/config.ts` (`PROVIDER_ENDPOINTS.enter-maas`) using the RD-confirmed URL.
   - Register `"enter-maas"` in `NAMED_OPENAI_STYLE_PROVIDERS` in `src/app/api/providers/[id]/models/route.ts` to enable live `<baseUrl>/v1/models` discovery.
4. **Catalog**: `models: []` by default (empty seed). The live RD-confirmed `/v1/models` response is the single source of truth. Concrete model IDs (`gpt-5.6-sol`, `gpt-5.6-terra`, `kimi-k3`, …) MUST NOT be seeded unless the RD provides a **verified, non-fabricated** model list (observed `/v1/models` response or official catalog page). Capability flags (`toolCalling`, `supportsReasoning`, `supportsVision`, `contextLength`, `maxOutputTokens`) MUST NOT be guessed for unverified models.
5. **UI & Catalog Integration**:
   - `apiHint` only instructs where to create a MaaS API key — it MUST NOT claim shared credits/billing or free tiers unless the RD confirms them.
   - The Enter Code CLI browser-OAuth flow (`enter --login` / `--logout`) is explicitly out of scope.
   - Do NOT add free-tier entries to `freeModelCatalog.data.ts` — no verified free-tier evidence exists.

---

## Background Context

### O que já existe:
- `DefaultExecutor` in `open-sse/executors/default.ts` seamlessly handles any standard OpenAI-compatible API key endpoint.
- Aggregator gateway pattern exists for providers like `openrouter`, `orcarouter`, `dgrid`, `agentrouter`, `zenmux`, `crof`, and `aihubmix` (Task 0174 shipped the template this task mirrors).
- Dynamic model listing via `NAMED_OPENAI_STYLE_PROVIDERS` in `src/app/api/providers/[id]/models/route.ts` already queries `/v1/models` live.
- `RegistryEntry.models` is a REQUIRED `RegistryModel[]` field (`open-sse/config/providers/shared.ts`) — an empty `[]` seed is valid; `passthroughModels` and `modelsUrl` are supported fields.

### O que está faltando / a implementar:
- Provider definition in `src/shared/constants/providers/apikey/gateways.ts`.
- Provider ID in `AGGREGATOR_PROVIDER_IDS` in `src/shared/constants/providers.ts`.
- Endpoint in `src/shared/constants/config.ts`.
- Provider registry entry in `open-sse/config/providers/registry/enter-maas/index.ts`.
- Re-export in `open-sse/config/providers/index.ts`.
- Dynamic models route classification in `src/app/api/providers/[id]/models/route.ts`.
- Unit tests verifying provider validation, registry loading, and default executor routing.

### Estado do conhecimento (evidência disponível até a criação desta task):
- **Confirmado pelo operador (pesquisa 2026-08-16)**: Enter MaaS usa `Authorization: Bearer <ENTER_MAAS_API_KEY>`; chave criada em `Settings → API Keys`; produto descrito como gateway unificado de modelos.
- **NÃO confirmado (bloqueios de evidência — pertencem à RD)**: base URL exata (`https://api.enter.converge.ai/v1` é HIPÓTESE não publicada), formato exato (OpenAI vs Anthropic-compatible, sem garantia de streaming/tool calls), IDs reais de modelos, billing/créditos compartilhados, existência de free tier.
- **Fora de escopo**: Enter Code CLI browser OAuth (credencial local não replicável, humana browser-only).

---

## Test Requirements

- Unit tests MUST verify that `enter-maas` satisfies `ProviderSchema` validation at module load time.
- Unit tests MUST verify that `getExecutor("enter-maas")` returns an executor configured with the **RD-confirmed** `baseUrl` and Bearer auth header.
- Unit tests MUST verify that the executor sends `Authorization: Bearer <key>` on the mocked request (harness-usable auth proof).
- Unit tests MUST verify that a mocked upstream **SSE streaming** response is forwarded correctly (harness-usable streaming proof).
- Unit tests MUST verify that a mocked **tool-call** response (response with `tool_calls` in delta) is forwarded correctly (harness-usable tool-calling proof).
- Unit tests MUST verify that a mocked upstream **401 error** is propagated as sanitized output — no `err.stack` / raw `err.message` leak (Hard Rule #12).
- Unit tests MUST verify that `open-sse/config/providers/` exports `enter-maas` with an empty (or RD-verified) seed catalog, not fabricated capabilities.
- Unit tests MUST verify that `src/app/api/providers/[id]/models/route.ts` recognizes `enter-maas` as an OpenAI-style provider and handles live `/v1/models` fallback to the empty local registry.
- Tests MUST NOT make live network requests to `enter.converge.ai` (use mocked `fetch`).
- `npm run typecheck:core` MUST pass with 0 errors.
- `tests/unit/providers-constants-split.test.ts` APIKEY family count MUST be recalculated at implementation time (the catalog may shift between tasks; do NOT hardcode a stale delta).

---

## Exit Conditions (GDD/TDD)

- [ ] `RD-omniroute-enter-maas-evidence` is APPROVED (evidence report exists with confirmed base URL, contract format, streaming/tool-call evidence, and billing note).
- [ ] `src/shared/constants/providers/apikey/gateways.ts` exports valid `enter-maas` provider constant.
- [ ] `src/shared/constants/providers.ts` includes `"enter-maas"` in `AGGREGATOR_PROVIDER_IDS`.
- [ ] `src/shared/constants/config.ts` includes `enter-maas` in `PROVIDER_ENDPOINTS` (RD-confirmed URL).
- [ ] `open-sse/config/providers/registry/enter-maas/index.ts` created with empty seed (`models: []`) + RD-confirmed baseUrl/modelsUrl and default executor config.
- [ ] `open-sse/config/providers/index.ts` registers `enter-maas`.
- [ ] `src/app/api/providers/[id]/models/route.ts` adds `"enter-maas"` to `NAMED_OPENAI_STYLE_PROVIDERS`.
- [ ] `node --import tsx/esm --test tests/unit/enter-maas-provider.test.ts` passes (incl. Bearer header, SSE streaming, tool-call forward, sanitized 401).
- [ ] `node --import tsx/esm --test tests/unit/providers-constants-split.test.ts` passes with freshly recalculated count.
- [ ] `npm run typecheck:core` passes (0 errors).
- [ ] `npm run lint` passes without new errors.
- [ ] **Changelog**: real entry committed via `.changelog/` + `manage-changelog` + `rebuild.sh build && rebuild.sh validate` (root `CHANGELOG.md` regenerated — NEVER hand-edited).

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `src/shared/constants/providers/apikey/gateways.ts`, `src/shared/constants/providers.ts` (`AGGREGATOR_PROVIDER_IDS`), `src/shared/constants/config.ts` (`PROVIDER_ENDPOINTS`), `open-sse/config/providers/registry/aihubmix/index.ts` (reference), `open-sse/config/providers/index.ts`, `src/app/api/providers/[id]/models/route.ts`, `tests/unit/aihubmix-provider.test.ts` (reference), `tests/unit/providers-constants-split.test.ts`.
- [ ] **Confirmar conclusão da RD gate**: Ler `docs/reports/enter-maas-evidence.md` (ou artefato indicado pela RD) e extrair base URL confirmada, formato, streaming/tool-call evidência e nota de billing. NÃO iniciar sem isso.
- [ ] **Adicionar constante do provider**: Em `src/shared/constants/providers/apikey/gateways.ts`, adicionar a entrada `enter-maas` com metadados completos (`passthroughModels: true`; `apiHint` sem claim de credits).
- [ ] **Adicionar ID nas listas de agregadores e endpoints**: Em `src/shared/constants/providers.ts` (`AGGREGATOR_PROVIDER_IDS`) e `src/shared/constants/config.ts` (`PROVIDER_ENDPOINTS`).
- [ ] **Criar Registro do Provider**: Criar `open-sse/config/providers/registry/enter-maas/index.ts` (models: `[]`; baseUrl/modelsUrl da RD) e exportar em `open-sse/config/providers/index.ts`.
- [ ] **Habilitar Descoberta Dinâmica de Modelos**: Em `src/app/api/providers/[id]/models/route.ts`, adicionar `"enter-maas"` ao `NAMED_OPENAI_STYLE_PROVIDERS`.
- [ ] **Escrever Testes Unitários**: Criar `tests/unit/enter-maas-provider.test.ts` (schema, executor default, Bearer header, SSE streaming, tool call, 401 sanitizado, fallback); recalcular contagem em `providers-constants-split.test.ts`.
- [ ] **Refactoring pass**: Review implementation for simplicity. No invented capability flags; empty seed stays empty.
- [ ] **Verificação de Regressão**: Rodar `npm run typecheck:core` e `npm run lint`.
- [ ] **Changelog**: Entrada real via `.changelog/` + `rebuild.sh build && rebuild.sh validate`.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/constants/providers/apikey/gateways.ts` | Modificar — adicionar metadados `enter-maas`. |
| `src/shared/constants/providers.ts` | Modificar — adicionar `"enter-maas"` a `AGGREGATOR_PROVIDER_IDS`. |
| `src/shared/constants/config.ts` | Modificar — adicionar endpoint RD-confirmado em `PROVIDER_ENDPOINTS`. |
| `open-sse/config/providers/registry/enter-maas/index.ts` | Criar — definição do registry com models vazio. |
| `open-sse/config/providers/index.ts` | Modificar — importar e registrar `enterMaasProvider`. |
| `src/app/api/providers/[id]/models/route.ts` | Modificar — incluir em `NAMED_OPENAI_STYLE_PROVIDERS`. |
| `tests/unit/enter-maas-provider.test.ts` | Criar — testes unitários de schema, registry, auth, streaming e tool calling. |
| `tests/unit/providers-constants-split.test.ts` | Modificar — recalcular contagem de providers API Key no momento da implementação. |
| `docs/reports/enter-maas-evidence.md` | Ler — artefato de evidência produzido pela RD (gate). |

### How

1. **Definição da Constante** (sem claim de credits/billing):
   ```typescript
   "enter-maas": {
     id: "enter-maas",
     alias: "ent",
     name: "Enter MaaS",
     icon: "router",
     color: "#0052FF",
     textIcon: "ENT",
     passthroughModels: true,
     website: "https://enter.converge.ai",
     apiHint:
       "Create an Enter MaaS API key at enter.converge.ai (Settings → API Keys), then paste it here.",
   }
   ```
2. **Registry Entry** (`baseUrl`/`modelsUrl` substituídos pelos valores da RD; `models` vazio até catálogo verificado):
   ```typescript
   export const enterMaasProvider: RegistryEntry = {
     id: "enter-maas",
     alias: "ent",
     format: "openai",
     executor: "default",
     baseUrl: "<RD_CONFIRMED_BASE_URL>",    // ex.: https://api.enter.converge.ai/v1 — SOMENTE se confirmado pela RD
     modelsUrl: "<RD_CONFIRMED_MODELS_URL>", // ex.: <baseUrl>/v1/models — SOMENTE se confirmado
     authType: "apikey",
     authHeader: "bearer",
     defaultContextLength: 128000,           // default genérico — NÃO representa capacidade observada
     passthroughModels: true,
     models: [],
   };
   ```

### Why

Permite aos usuários do OmniRoute rotear tráfego para a API do Enter MaaS reaproveitando `DefaultExecutor` + dynamic discovery — mas SOMENTE depois que a evidência da RD confirmar endpoint, contrato e billing. Evita: fixar uma base URL fictícia, propagar capacidades inventadas, prometer créditos compartilhados não verificados, e implementar o fluxo garden do CLI.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Pode rodar em paralelo com outras tasks de provider APÓS o gate `RD-omniroute-enter-maas-evidence`. |
| **serializable** | DEVE esperar `RD-omniroute-enter-maas-evidence` (evidence gate). |
| **Collision** | `open-sse/config/providers/index.ts` e `tests/unit/providers-constants-split.test.ts` — não co-editar em paralelo com outras tasks de provider da mesma wave. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> - **NÃO fixe `https://api.enter.converge.ai/v1`** sem a confirmação da RD. É hipótese de pesquisa, não fato publicado.
> - **NÃO propague IDs de modelos** (`gpt-5.6-sol`, `gpt-5.6-terra`, `kimi-k3`, …) sem resposta verificada de `/v1/models` ou catálogo oficial salvo como evidência.
> - **NÃO invente capabilities** (`toolCalling`, `supportsReasoning`, `contextLength`, `maxOutputTokens`) para modelos não observados.
> - Não dispare chamadas para endpoints reais durante testes automatizados (use mocked `fetch`).
> - NUNCA comite chaves de API nos testes.
> - **Não implemente o fluxo browser OAuth do Enter Code CLI** — scope creep.

> [!IMPORTANT]
> - A RD (`RD-omniroute-enter-maas-evidence`) é o únco source of truth para endpoint/contrato/billing. Se a RD ainda não estiver APROVADA, a task fica em espera — não implementar com suposições.
> - Zero Trust: o `baseUrl` confirmado é input externo — o SSRF guard existente na route deve permanecer ativo.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Endpoint somente após evidência da RD; nenhum nome de modelo sem fato observado.
- [ ] **Zod Validation**: Constante validada pelo `ProviderSchema`.
- [ ] **Security**: Nenhum secret commitado; sem chamadas de rede reais em testes; 401 sanitizado.
- [ ] **Error Sanitization**: `buildErrorBody()` / `sanitizeErrorMessage()` em error responses.
- [ ] **No Raw SQL**: N/A (sem alterações no banco de dados).
- [ ] **Archive Protocol**: N/A (nenhum artefato deletado; RD seu próprio arquivo de evidência).

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/constants/providers/apikey/gateways.ts` (modificado)
  - `src/shared/constants/providers.ts` (modificado)
  - `src/shared/constants/config.ts` (modificado)
  - `open-sse/config/providers/registry/enter-maas/index.ts` (criado)
  - `open-sse/config/providers/index.ts` (modificado)
  - `src/app/api/providers/[id]/models/route.ts` (modificado)
  - `tests/unit/enter-maas-provider.test.ts` (criado)
  - `tests/unit/providers-constants-split.test.ts` (modificado — contagem recalculada)
- **Testes que verificam o trabalho**: [preencher com nomes + PASS real]
- **Resultado dos testes**: [PASS/FAIL + contagem]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck/build**: [PASS/FAIL]
- **Entrada no changelog**: `.changelog/<entry>.md` via manage-changelog + `rebuild.sh build && rebuild.sh validate` (nunca hand-edit de root `CHANGELOG.md`)
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, citar arquivos/linhas]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
