# Task 0136: Add top-six provider quota summary to Home

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
> **Priority**: 🟢 P2
> **Type**: `feature`
> **Origin**: User request — show a provider-level summary of known quota for the six providers with the most accounts.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` — shares Home layout/data files with Task 0128; sequence or bundle review.
> **Review routing**: frontend-quality + database/integration review

## Objective

Add a Home card that aggregates known quota by provider, ranks providers by active account count, and displays at most six providers with known quota. The card MUST not expose per-account credentials or misrepresent unknown quota as available quota.

## Background Context

### O que já existe:
- Quota data is tracked in snapshots and/or provider-limit caches at connection granularity.
- Home already renders Provider Topology and provider-related cards.
- Existing DB modules and quota contracts should be reused.

### O que está faltando / quebrado:
- No provider-level Home aggregation was verified.
- Raw per-connection data is not sufficient for the requested provider summary.

### False-gap check:
- This task is separate from Task 0128: it owns quota aggregation/card rendering, not degraded-key warnings.

## Test Requirements

- Providers MUST be grouped by canonical provider ID, not connection ID.
- Only quota records with known, non-null semantics may contribute to the “known quota” result.
- The result MUST be capped at six providers and deterministically ordered.
- Inactive/unknown connections MUST follow the verified existing policy and be tested.
- Empty and stale-cache states MUST render safely without claiming 100% quota.
- Query/aggregation MUST use existing DB modules and bounded/cacheable reads.

## Exit Conditions (GDD/TDD)

- [x] A typed aggregation contract returns provider ID, account count, known-quota indicator, summary value, and freshness metadata as appropriate.
- [x] Home card renders up to six providers with an empty/unknown state.
- [x] Aggregation tests cover multiple connections per provider, unknown quota, inactive connections, ties, and six-item cap.
- [x] Home chrome test confirms the card does not add a second topbar.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] Targeted quota/Home tests pass; run Vitest if the changed quota surface requires it.
- [x] Completion Evidence filled before handoff.

## Details

### What

Subtasks:
- [x] **Ler código existente**: read quota snapshot/provider-limit DB modules, quota contracts, existing Home data endpoints/components, Provider Topology, and Task 0128 insertion plan.
- [x] Define “known quota” from existing source semantics before writing SQL or UI.
- [x] Add failing aggregation tests with fixture rows for repeated providers.
- [x] Implement aggregation in a DB/usage module or verified Home endpoint, not raw SQL in a route.
- [x] Add the card below/near topology without duplicate hub chrome.
- [x] **Refactoring pass**: bound reads, reuse cache, and avoid per-render N+1 queries.
- [x] **Verificação de regressão**: targeted tests, typecheck, lint, and `:23456` smoke proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/db/quotaSnapshots.ts` | Read/extend quota aggregation. |
| `src/lib/db/providerLimits.ts` | Read known-quota cache semantics. |
| `src/shared/contracts/quota.ts` | Read/extend typed result contract. |
| `src/lib/quota/providerQuotaSummary.ts` | Client-safe canonical provider quota summary aggregation module. |
| `src/lib/quota/providerQuotaSummaryServer.ts` | Server-only wrapper (`getProviderQuotaSummary`) accessing DB/limits with server runtime guard. |
| `src/app/api/providers/quota-summary/route.ts` | Dedicated GET endpoint for provider quota summary. |
| `src/app/(dashboard)/home/ProviderQuotaWidget.tsx` | Home card placement & data rendering. |
| `tests/unit/provider-quota-summary-0136.test.ts` | Backend aggregation, server-only guard, and dpdm bundle isolation tests. |
| `tests/unit/ui/home-provider-quota-summary-0136.test.tsx` | Vitest UI component & anti-phantom chrome tests. |

### How

1. Establish canonical provider normalization and known-quota policy.
2. Add pure aggregation tests before DB/UI changes.
3. Implement bounded aggregation using existing domain modules/cache.
4. Render deterministic top-six output and validate no chrome regression.

### Why

Operators need a quick provider-level capacity view, not a noisy list of individual accounts. Aggregation makes routing decisions faster while preserving uncertainty explicitly.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Safe beside backend-only tasks. |
| **serializable** | Sequence with Task 0128 due shared Home insertion/layout files. |
| **Collision** | Home client, quota contracts/modules, Home tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not sum percentages as absolute quota without verifying provider semantics. Do not label unknown quota as 100%. Do not write SQL in API routes. Do not test against `:22000`.

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: quota tables/fields verified.
- [x] **Zod Validation**: endpoint response/request contracts validated.
- [x] **Security**: no account secrets or raw credentials in response.
- [x] **Error Sanitization**: Home endpoint errors sanitized.
- [x] **No Raw SQL**: use DB domain modules.
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/contracts/quota.ts` (modificado)
  - `src/lib/quota/providerQuotaSummary.ts` (modificado — isolado como módulo de agregação puro client-safe)
  - `src/lib/quota/providerQuotaSummaryServer.ts` (criado — wrapper server-only para acesso a DB e cache com guard runtime)
  - `src/app/api/providers/quota-summary/route.ts` (modificado — importa do wrapper server-only)
  - `src/app/(dashboard)/home/ProviderQuotaWidget.tsx` (modificado)
  - `tests/unit/provider-quota-summary-0136.test.ts` (atualizado — testes de agregação, guard server-only e isolamento de bundle via dpdm)
  - `tests/unit/ui/home-provider-quota-summary-0136.test.tsx` (criado)
  - `docs/tasks/03-review/0136-omniroute-home-provider-quota-summary.md` (evidências atualizadas)
- **Testes que verificam o trabalho**:
  - `tests/unit/provider-quota-summary-0136.test.ts` (11 tests PASS — 9 agregação + 1 server-only guard + 1 dpdm bundle isolation)
  - `tests/unit/ui/home-provider-quota-summary-0136.test.tsx` (4 tests PASS)
  - `tests/unit/ui/home-degraded-warnings-0128.test.tsx` (9 tests PASS)
- **Resultado dos testes**:
  - Backend aggregation & boundary isolation suite:
    ```
    node --import tsx/esm --test tests/unit/error-message-sanitization.test.ts tests/unit/provider-quota-summary-0136.test.ts
    ℹ tests 44
    ℹ pass 44
    ℹ fail 0
    ```
  - Vitest UI suite:
    ```
    npx vitest run --config vitest.config.ts tests/unit/ui/home-provider-quota-summary-0136.test.tsx tests/unit/ui/home-degraded-warnings-0128.test.tsx
    Test Files  2 passed (2)
         Tests  13 passed (13)
    ```
  - Bundle-boundary isolation proof (`dpdm` tree analysis):
    `ProviderQuotaWidget.tsx` & `ApiKeyHealthWarnings.tsx` module graphs: 0 circular dependencies, 0 DB/ioredis/better-sqlite3/dns/net/tls leakage.
- **Resultado do lint**: PASS (`npx eslint` 0 errors em arquivos alterados)
- **Resultado do typecheck**: PASS (`npm run typecheck:core` exit 0, 0 errors)
- **Resultado de circular dependencies**: PASS (`npm run check:cycles` exit 0, 0 cycles)
- **Changelog**: N/A (tarefa mantida em 03-review, sem reconstrução de changelog/agentlog/VCS conforme instrução).
<!-- Changelog Draft retained below for parent agent. -->
<!--
  ```markdown
  ### Changelog Draft
  - **task**: 0136
  - **agent**: builder-engineer
  - **project**: omniroute-2
  - **title**: home-provider-quota-summary-server-client-boundary-fix
  - **description**: Isolate client-safe quota aggregation module and server-only DB wrapper to fix Next production client bundle leakage
  - **summary**: Split `providerQuotaSummary.ts` into a pure client-safe aggregation module (`providerQuotaSummary.ts`) and a server-only DB wrapper (`providerQuotaSummaryServer.ts`) with a runtime window guard, updated `route.ts` to consume the server wrapper, and added `dpdm` bundle-isolation unit tests ensuring `ProviderQuotaWidget` cannot pull `src/lib/db/*`, `ioredis`, or Node built-ins into client bundles.
  - **verification**: `node --import tsx/esm --test tests/unit/provider-quota-summary-0136.test.ts && npx vitest run --config vitest.config.ts tests/unit/ui/home-provider-quota-summary-0136.test.tsx tests/unit/ui/home-degraded-warnings-0128.test.tsx && npm run typecheck:core`
   ```
-->
- **Agente executor**: builder-engineer (parent agentID=builders)
- **Data de conclusão**: 2026-08-07

## 🔍 Review Trail

- **Reviewer**: parent reviewer with Gortex-assisted review
- **Data da review**: 2026-08-06
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: Fresh 9/9 aggregation, 17/17 UI, 29/29 observe-hub tests, lint/typecheck/cycles passed; Home 0128 regressions absent.
