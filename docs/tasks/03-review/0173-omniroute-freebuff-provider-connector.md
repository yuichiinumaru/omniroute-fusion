# Task 0173: Add Freebuff Provider Connector (OAuth Device Flow + Session Management)

> **Status**: `[>]` Approved — independently reviewed at 100/100; promoted from `docs/tasks/02-doing/`
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Architecture analysis of `references/freebuff/` (Codebuff platform) discovering free model access for DeepSeek V4 Pro, DeepSeek V4 Flash, GPT-5.6 Luna, MiniMax M3, MiMo 2.5, and GLM 5.2 via OpenAI-compatible API.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — Touches `freebuff` provider surfaces and constants.
> **Review routing**: independent + provider/runtime + security/auth review

---

## Objective

Implement a full-featured `freebuff` provider connector in OmniRoute. The connector must support:
1. **Device Code Flow Authentication**: Initiating login via `https://codebuff.com/api/auth/cli/code` with a locally generated `fingerprintId`, presenting the `loginUrl` to the user, and polling `https://codebuff.com/api/auth/cli/status` until the `authToken` is returned and stored securely in `provider_connections`.
2. **Session Lifecycle Management**: Automatically admitting 1-hour active sessions on demand via `POST https://codebuff.com/api/v1/freebuff/session` (with `x-freebuff-model`), tracking the returned `instanceId`, `expiresAt`, and quota snapshots, and managing session rollover/renewal.
3. **Execution Pipeline**: `FreebuffExecutor` extending `BaseExecutor`, transforming and dispatching requests to `https://codebuff.com/api/v1/chat/completions` with streaming SSE support, required headers (`Authorization`, `x-freebuff-instance-id`, `x-freebuff-model`, `User-Agent: ai-sdk/openai-compatible/0.1.0/codebuff`), and `codebuff_metadata`.
4. **Anti-Downgrade Safeguard**: Protecting tool-calling requests from triggering Freebuff's `foreign_toolset` detection (which silently downgrades requests lacking Freebuff signature tools to `inclusionai/ling-3.0-tiny:free`).
5. **Model Registry**: Exposing Freebuff's catalog:
   - `deepseek-v4-pro` (DeepSeek V4 Pro 08/13 — premium session)
   - `deepseek-v4-flash` (DeepSeek V4 Flash 07/31 — unlimited / standard)
   - `gpt-5.6-luna` (GPT-5.6 Luna — premium session)
   - `minimax-m3` (MiniMax M3 — premium session)
   - `mimo-v2.5` (MiMo 2.5 — standard)
   - `glm-5.2` (GLM 5.2 — referral/earned session)

---

## Background Context

### O que já existe:
- Reference implementation in `references/freebuff/` (Codebuff TypeScript monorepo).
- Device flow patterns in `src/lib/oauth/constants/oauth.ts` and `src/app/api/oauth/[provider]/[action]/route.ts` (e.g. Qwen, Grok, Codex).
- Base executor architecture in `open-sse/executors/base.ts` with streaming SSE translation and circuit breaker integration.
- Provider registration in `src/shared/constants/providers.ts` and model registry under `open-sse/config/providers/registry/`.

### O que está faltando / a implementar:
- Provider ID `"freebuff"` in `src/shared/constants/providers.ts`.
- OAuth / Device flow constants in `src/lib/oauth/constants/oauth.ts` (`FREEBUFF_CONFIG`).
- Session manager in `open-sse/services/freebuffSession.ts` to manage admission, instance IDs, and expiration.
- Executor in `open-sse/executors/freebuff.ts` to handle chat completions.
- Model registry in `open-sse/config/providers/registry/freebuff/index.ts`.
- Unit tests in `tests/unit/freebuff-*.test.ts`.

---

## Test Requirements

- Unit tests MUST mock the CLI device code flow (`loginCode` -> URL generation -> status polling -> `authToken` capture).
- Unit tests MUST verify session admission: `POST /api/v1/freebuff/session` sets `instanceId` and `expiresAt`, reuse during the active 1h window, and renewal when expired.
- Unit tests MUST verify request formatting: outgoing headers (`Authorization: Bearer <token>`, `x-freebuff-instance-id`, `x-freebuff-model`, `User-Agent`), payload wrapper (`codebuff_metadata.freebuff_instance_id`).
- Unit tests MUST verify streaming SSE response translation from Freebuff chunks to OpenAI-compatible chunks.
- Unit tests MUST verify error handling:
  - `428` (`waiting_room_required`) -> re-triggers session admission.
  - `409` (`model_locked` / `session_superseded`) -> releases stale session and re-admits.
  - `429` (`rate_limited` / `ip_capped` / `free_mode_capacity_deferred`) -> propagates structured provider error / triggers circuit breaker.
  - `410` (`session_expired`) -> triggers session renewal.
- Tests MUST NOT contact live `codebuff.com` endpoints.
- `npm run typecheck:core` MUST pass with 0 errors.

---

## Exit Conditions (GDD/TDD)

- [x] `src/shared/constants/providers.ts` includes `"freebuff"` in OAuth and Free provider lists.
- [x] `src/lib/oauth/constants/oauth.ts` exports `FREEBUFF_CONFIG` with endpoints `https://codebuff.com/api/auth/cli/code` and `https://codebuff.com/api/auth/cli/status`.
- [x] `open-sse/services/freebuffSession.ts` implements session admission, active instance cache, and expiration tracking.
- [x] `open-sse/executors/freebuff.ts` implements `FreebuffExecutor` with streaming, headers, and metadata injection.
- [x] `open-sse/config/providers/registry/freebuff/index.ts` registers Freebuff models.
- [x] `node --import tsx/esm --test tests/unit/freebuff-*.test.ts` passes all tests.
- [x] `npm run typecheck:core` passes without diagnostics.
- [x] `npm run lint` passes without new errors.
- [x] Canonical changelog entry created under `.changelog/` and rebuilt via `rebuild.sh build`.

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `references/freebuff/cli/src/utils/codebuff-api.ts`, `references/freebuff/cli/src/utils/freebuff-session-api.ts`, `references/freebuff/sdk/src/impl/model-provider.ts`, `open-sse/executors/base.ts`, `src/lib/oauth/constants/oauth.ts`.
- [x] **Registrar constantes e provider**: Adicionar `freebuff` em `src/shared/constants/providers.ts` e `FREEBUFF_CONFIG` em `src/lib/oauth/constants/oauth.ts`.
- [x] **Implementar Gerenciador de Sessão**: Criar `open-sse/services/freebuffSession.ts` com métodos `ensureFreebuffSession(credentials, model)` e `releaseFreebuffSession(credentials)` com coalescing de concorrência (`inFlightSessions`).
- [x] **Implementar Executor**: Criar `open-sse/executors/freebuff.ts` estendendo `BaseExecutor`, despachando para `https://codebuff.com/api/v1/chat/completions` com salvaguarda anti-downgrade (`foreign_toolset: false`), mapeamento estruturado de 429 (`RATE_LIMIT_EXCEEDED`) e sanitização de erros.
- [x] **Registrar Catálogo de Modelos**: Criar `open-sse/config/providers/registry/freebuff/index.ts` com os modelos mapeados.
- [x] **Escrever Testes Unitários**: Criar e expandir `tests/unit/freebuff-connector.test.ts` e `tests/unit/freebuff-session.test.ts` cobrindo fluxos normais, anti-downgrade, 429, concorrência e sanitização de erro.
- [x] **Verificação de Regressão**: Rodar `npm run typecheck:core`, `npm run lint` e suíte de testes unitários.
- [x] **Changelog**: Gerar entrada no `.changelog/` e rodar `rebuild.sh build`.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/constants/providers/oauth.ts` | Modificar — registrar provider ID `freebuff`. |
| `src/lib/oauth/constants/oauth.ts` | Modificar — exportar `FREEBUFF_CONFIG` para device auth. |
| `src/lib/oauth/providers/freebuff.ts` | Criar — implementação do fluxo device code. |
| `src/lib/oauth/providers/index.ts` | Modificar — registrar provider `freebuff`. |
| `src/app/api/oauth/[provider]/[action]/route.ts` | Modificar — plugar ação de polling/iniciação para `freebuff`. |
| `open-sse/services/freebuffSession.ts` | Criar — lifecycle de sessão e cache de `instanceId`. |
| `open-sse/executors/freebuff.ts` | Criar — executor para chat completions e SSE. |
| `open-sse/executors/index.ts` | Modificar — factory `getExecutor("freebuff")`. |
| `open-sse/config/providers/registry/freebuff/index.ts` | Criar — catálogo de modelos do Freebuff. |
| `open-sse/config/providers/index.ts` | Modificar — registro e exportação do catálogo `freebuff`. |
| `tests/unit/freebuff-connector.test.ts` | Criar — testes unitários do executor e rotas. |
| `tests/unit/freebuff-session.test.ts` | Criar — testes unitários do gerenciador de sessão. |
| `references/freebuff/` | Ler — repositório de referência. |

### How

1. **OAuth Device Flow**:
   - `initiate`: `POST https://codebuff.com/api/auth/cli/code` com `{ fingerprintId: randomUUID() }`. Retorna `loginUrl` e `fingerprintHash`.
   - `poll`: `POST https://codebuff.com/api/auth/cli/status` com `{ fingerprintId, fingerprintHash, expiresAt }`. Salva `user.authToken` como `apiKey`/`accessToken` na conexão.
2. **Session Management**:
   - Guardar em memória/cache: `{ instanceId, model, expiresAt }` indexado por `accountId`.
   - Antes de cada requisição: Se não houver sessão ativa ou se o modelo for diferente, chamar `POST /api/v1/freebuff/session` com header `x-freebuff-model: <model>`.
   - Se retornar `model_locked` (409), chamar `DELETE /api/v1/freebuff/session` e repetir o POST.
3. **Execution**:
   - Endpoint: `https://codebuff.com/api/v1/chat/completions`.
   - Headers: `Authorization: Bearer <authToken>`, `x-freebuff-instance-id: <instanceId>`, `x-freebuff-model: <model>`, `User-Agent: ai-sdk/openai-compatible/0.1.0/codebuff`.
   - Body: OpenAI standard + `codebuff_metadata: { freebuff_instance_id: instanceId }`.

### Why

Disponibiliza modelos de alta capacidade (DeepSeek V4 Pro, GPT-5.6 Luna, MiniMax M3) gratuitamente através de um provedor estruturado sem custo de API key para o operador, aproveitando a infraestrutura do Codebuff.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Pode rodar em paralelo com tasks que não tocam o registry `freebuff`. |
| **serializable** | Possui ownership exclusivo dos novos arquivos `freebuff.ts` e `freebuffSession.ts`. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> - NUNCA use portas de produção (`:21000`/`:22000`) nem dispare chamadas para endpoints reais do `codebuff.com` durante os testes unitários.
> - NUNCA commit credenciais ou tokens em testes ou código.
> - Certifique-se de que erros retornados pela API do Freebuff sejam sanitizados via `sanitizeErrorMessage()` / `buildErrorBody()`.

> [!IMPORTANT]
> - Leia os arquivos de referência em `references/freebuff/` antes de implementar.
> - O endpoint `POST /api/v1/chat/completions` do Freebuff aceita payload padrão OpenAI; não crie wrappers complexos desnecessários.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Endpoints e nomes verificados contra `references/freebuff/`.
- [x] **Zod Validation**: Inputs de OAuth and credentials validated with Zod schemas.
- [x] **Security**: Nenhum secret commitado; tokens salvos em armazenamento encriptado.
- [x] **Error Sanitization**: `sanitizeErrorMessage()` em todas as respostas de erro.
- [x] **No Raw SQL**: Acesso ao DB via módulos `src/lib/db/`.

---

## 📋 Completion Evidence

- **Focused tests**: `node --import tsx/esm --test tests/unit/freebuff-*.test.ts` — **64/64 passed** (connector 40, session 24; 0 failed, 0 skipped).
- **Typecheck**: `npm run typecheck:core` — **PASS, exit 0**.
- **Scoped lint**: reviewed/changed Freebuff and fallback files — **0 errors, 0 warnings**.
- **Changelog**: `.changelog/20260814-235246-0173-add-freebuff-provider-connector-builders.md`; validation `issues=0 entries=83`.
- **Route proof**: mocked device-code/poll HTTP route test verifies SQLite persistence, canonical `provider: "freebuff"`, and JWT/token redaction.
- **Fallback proof**: hourly IP quota → 30s/provider; admission rate limit → 15s/connection; free capacity busy → 5s/provider; generic Freebuff 429 → 5s/provider.
- **Repository lint policy**: `npm run lint` baseline remains 7 unrelated `visual-reference/` errors and 4,149 warnings; waived under root `AGENTS.md` and `docs/tasks/AGENTS.md` §5 because no new errors exist on changed/created files.
- **Review reports**:
  - `docs/reports/review/20260814-task-0173-final-review.md` — **APPROVED, 100/100**.
  - `docs/reports/review/20260815-task-0173-rereview-round12.md` — **APPROVED, 100/100**.
- **Independent reviewer**: Round 12 reviewer; review date 2026-08-15.

## 🔍 Review Trail

- **Reviewer**: Independent reviewer (Round 12)
- **Data da review**: 2026-08-15
- **Veredito**: **APROVADO**
- **Score (path to 100)**: **100/100**
- **Notas**: All task-scoped exits pass. The 64-test Freebuff suite, core typecheck, scoped ESLint, changelog validation, route-level mocked HTTP/SQLite proof, canonical provider identity, redaction, and production-shaped fallback mappings are independently verified. The unrelated repository-wide `visual-reference/` lint baseline is explicitly waived as out-of-scope under root `AGENTS.md` and `docs/tasks/AGENTS.md` §5, which requires no **new** errors on changed/created files. Final report: `docs/reports/review/20260814-task-0173-final-review.md`; Round 12 report: `docs/reports/review/20260815-task-0173-rereview-round12.md`.
