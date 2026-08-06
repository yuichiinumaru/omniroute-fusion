# Task 0143: Preserve healthy accounts when provider breaker is open

> **Status**: `[ ]` Open
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: EPIC-25; operator report that circuit breakers block accounts with clearly available quota.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` — owns breaker/account eligibility behavior; coordinate with all resilience edits.
> **Review routing**: independent + resilience/security review

## Objective

Preserve provider-level protection from genuine upstream outages while allowing
healthy accounts to be evaluated when one account or model has failed. The task
must prove the intended policy before changing behavior: a provider-wide outage
may block the provider, but an account-scoped quota/cooldown failure MUST NOT
open a gate that hides unrelated accounts with available quota.

## Background Context

- `src/shared/utils/circuitBreaker.ts` keys the breaker by provider and
  `canExecute()` does not inspect quota/headroom.
- `src/sse/handlers/chat.ts` checks the breaker before
  `getProviderCredentialsWithQuotaPreflight` selects accounts.
- `open-sse/services/combo/runtimeUnits.ts` and
  `open-sse/services/combo/comboPredicates.ts` can skip the provider before
  account selection.
- `open-sse/services/accountFallback.ts` already tracks connection-level
  `rateLimitedUntil` and model lockout.
- The documented resilience model distinguishes provider breaker, connection
  cooldown, and model lockout; current ordering can collapse those scopes.

## Test Requirements

- A genuine provider-wide outage still blocks the provider.
- A single account quota/cooldown failure does not block another healthy account.
- An open provider breaker is observable with the existing response/header semantics.
- Account selection consults current cooldown/quota state before declaring no target.
- Model lockout remains narrower than connection cooldown.
- Forced/operator test bypass behavior remains unchanged and auditable.

## Exit Conditions (GDD/TDD)

- [ ] Failure classification distinguishes provider-wide outage from account/model failure.
- [ ] Healthy-account fallback is implemented at the narrowest eligibility boundary.
- [ ] Integration tests cover two accounts: one failed/quota-limited, one healthy.
- [ ] Tests cover genuine provider outage and preserve `provider_circuit_open` behavior.
- [ ] `node --import tsx/esm --test tests/integration/account-aware-breaker.test.ts` passes.
- [ ] Relevant circuit-breaker/account-fallback tests pass.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] Mock or `:23456` evidence is recorded; `:22000` is untouched.
- [ ] `.changelog/` entry is created through manage-changelog and rebuilt.
- [ ] Completion Evidence and Review Trail are filled.

## Details

### What

- [ ] **Ler código existente**: read circuit breaker state machine, pipeline gates,
  account fallback/quota preflight, runtime-unit skips, combo predicates, and
  existing resilience tests.
- [ ] Build a failure-scope matrix before implementation.
- [ ] Add failing two-account tests.
- [ ] Implement the smallest scope-preserving eligibility change.
- [ ] Verify provider-wide outage behavior remains fail-safe.
- [ ] **Refactoring pass**: avoid adding quota fields to the breaker DB unless evidence requires persistence.
- [ ] **Verificação de regressão**: integration/unit tests, typecheck, lint, mock proof.

### Where

| File | Purpose |
|---|---|
| `src/shared/utils/circuitBreaker.ts` | Read/modify only if failure scope requires. |
| `src/sse/handlers/chat.ts` | Read/modify pipeline gate ordering if required. |
| `src/sse/handlers/chatHelpers.ts` | Read provider-circuit response contract. |
| `open-sse/services/accountFallback.ts` | Read/modify account/model eligibility. |
| `open-sse/services/combo/runtimeUnits.ts` | Read/modify pre-skip behavior. |
| `open-sse/services/combo/comboPredicates.ts` | Read/modify provider-block predicate if required. |
| `open-sse/services/combo/quotaStrategies.ts` | Read repeated provider pre-screen path. |
| `tests/integration/account-aware-breaker.test.ts` | Create two-account regression tests. |
| `.changelog/` | Create closeout entry. |

### How

1. Build a matrix separating provider outage, account quota, cooldown, and model lockout.
2. Write the two-account failing integration test.
3. Adjust the narrowest eligibility boundary and preserve provider-outage gating.
4. Run regression tests and test-environment proof.

### Why

The documented three-layer resilience model is undermined if provider-wide
state hides healthy accounts after an account-scoped failure.

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Safe beside reasoning/UI tasks. |
| **serializable** | Coordinate with NVIDIA runtime failure and any resilience/circuit-breaker work. |
| **Collision** | Breaker, chat pipeline gates, account fallback, runtime units, quota strategies, resilience tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not bypass a genuinely open provider breaker merely because one quota
> snapshot is non-empty. Prove failure scope and quota semantics with fixtures.
> Never mutate `:22000`; use mocks or `:23456`.

## 🛡️ Compliance Checklist

- [ ] Failure scope is documented against the resilience guide.
- [ ] No secrets in fixtures/logs.
- [ ] Existing sanitized breaker response preserved.
- [ ] No raw SQL in routes.
- [ ] No deletion.

## 📋 Completion Evidence

- **Failure matrix/files/tests/output**: [fill]
- **Two-account proof**: [fill]
- **Typecheck/lint/smoke/changelog**: [fill]
- **Executor/date**: [fill]

## 🔍 Review Trail

- **Reviewer/verdict/score**: [fill]
- **Notes**: [fill]
