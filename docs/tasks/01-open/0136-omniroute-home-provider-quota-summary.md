# Task 0136: Add top-six provider quota summary to Home

> **Status**: `[ ]` Open
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

- [ ] A typed aggregation contract returns provider ID, account count, known-quota indicator, summary value, and freshness metadata as appropriate.
- [ ] Home card renders up to six providers with an empty/unknown state.
- [ ] Aggregation tests cover multiple connections per provider, unknown quota, inactive connections, ties, and six-item cap.
- [ ] Home chrome test confirms the card does not add a second topbar.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] Targeted quota/Home tests pass; run Vitest if the changed quota surface requires it.
- [ ] `.changelog/` entry is created and rebuilt.
- [ ] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [ ] **Ler código existente**: read quota snapshot/provider-limit DB modules, quota contracts, existing Home data endpoints/components, Provider Topology, and Task 0128 insertion plan.
- [ ] Define “known quota” from existing source semantics before writing SQL or UI.
- [ ] Add failing aggregation tests with fixture rows for repeated providers.
- [ ] Implement aggregation in a DB/usage module or verified Home endpoint, not raw SQL in a route.
- [ ] Add the card below/near topology without duplicate hub chrome.
- [ ] **Refactoring pass**: bound reads, reuse cache, and avoid per-render N+1 queries.
- [ ] **Verificação de regressão**: targeted tests, typecheck, lint, and `:23456` smoke proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/db/quotaSnapshots.ts` | Read/extend quota aggregation. |
| `src/lib/db/providerLimits.ts` | Read known-quota cache semantics. |
| `src/shared/contracts/quota.ts` | Read/extend typed result contract. |
| Existing quota usage route/module | Reuse data access. |
| Verified `HomePageClient.tsx` | Add card placement/data wiring. |
| Existing Home quota/topology components | Read visual and chrome patterns. |
| `tests/unit/` quota/Home tests | Create/modify aggregation coverage. |
| `.changelog/` | Criar entry. |

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

- [ ] **Doc Accuracy**: quota tables/fields verified.
- [ ] **Zod Validation**: endpoint response/request contracts validated.
- [ ] **Security**: no account secrets or raw credentials in response.
- [ ] **Error Sanitization**: Home endpoint errors sanitized.
- [ ] **No Raw SQL**: use DB domain modules.
- [ ] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**: [preencher]
- **Testes que verificam o trabalho**: [preencher]
- **Resultado dos testes**: [PASS/FAIL + output real]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck/build**: [PASS/FAIL]
- **Entrada no changelog**: [preencher]
- **Agente executor**: [preencher]
- **Data de conclusão**: [YYYY-MM-DD]

## 🔍 Review Trail

- **Reviewer**: [preencher]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [preencher]
