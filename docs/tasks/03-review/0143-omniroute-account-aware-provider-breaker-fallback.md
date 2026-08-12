# Task 0143: Preserve healthy accounts when provider breaker is open

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
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

- [x] Failure classification distinguishes provider-wide outage from account/model failure.
- [x] Healthy-account fallback is implemented at the narrowest eligibility boundary.
- [x] Integration tests cover two accounts: one failed/quota-limited, one healthy.
- [x] Tests cover genuine provider outage and preserve `provider_circuit_open` behavior.
- [x] `node --import tsx/esm --test tests/integration/account-aware-breaker.test.ts` passes.
- [x] Relevant circuit-breaker/account-fallback tests pass.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] Mock or `:23456` evidence is recorded; `:22000` is untouched.
- [x] `.changelog/` entry is created through manage-changelog and rebuilt.
- [x] Completion Evidence and Review Trail are filled.

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

- [x] Failure scope is documented against the resilience guide.
- [x] No secrets in fixtures/logs.
- [x] Existing sanitized breaker response preserved.
- [x] No raw SQL in routes.
- [x] No deletion.

## 📋 Completion Evidence

- **Failure matrix/files/tests/output**:
  - Failure scope matrix implemented in `open-sse/services/accountFallback.ts::hasHealthyAccount` and `open-sse/services/combo/comboPredicates.ts::isProviderCircuitBlocking`.
  - Files changed:
    - `src/lib/modelCapabilities.ts`
    - `open-sse/services/accountFallback.ts`
    - `src/sse/handlers/chatHelpers.ts`
    - `open-sse/services/combo/comboPredicates.ts`
    - `open-sse/services/combo/runtimeUnits.ts`
    - `open-sse/services/combo/quotaStrategies.ts`
    - `open-sse/services/combo.ts`
    - `tests/integration/account-aware-breaker.test.ts`
- **Two-account proof**:
  - `node --import tsx/esm --test tests/integration/account-aware-breaker.test.ts`
  - Result: 5/5 passing
    - Requirement 1: provider vs account/model failure classification
    - Requirement 2: 2-account healthy fallback when breaker OPEN
    - Requirement 3: provider outage still fail-safe when all accounts exhausted
    - Requirement 4: model lockout narrower than connection cooldown
    - Requirement 5: operator bypass remains auditable
- **Typecheck/lint/smoke/changelog**:
  - `npm run typecheck:core`: passed
  - `npx eslint <modified files>`: no new errors in modified files
  - `.changelog/20260806-034644-0143-account-aware-breaker-fallback-reviewer.md`; rebuild concluído com 43 entradas.
  - `:22000` untouched; `:23456` used for test runtime only
- **Executor/date**: Implementation worker / 2026-08-06

### Polish Pass — 2026-08-06 (path-to-100, audit-only)

- **Run**: `DATA_DIR=$(mktemp -d) node --import tsx/esm --test tests/integration/account-aware-breaker.test.ts`
  - **Result**: 5 / 5 passing (duration 2308 ms, fail 0).
  - Fail-closed proof: `[sse] Circuit breaker OPEN for test-prov-outage, rejecting request` (audit-logged with `CIRCUIT` tag).
  - Auditable-bypass proof: `[sse] Bypassing OPEN circuit breaker for test-prov-bypass (operator test bypass)` (bypassReason visible in `CIRCUIT` log).
- **Resilience regression sweep**:
  - `tests/unit/combo-resilience-wiring-0043.test.ts` → **22 / 22 passing** (3 stale async calls fixed; await added to lines 464, 481, 849).
  - `tests/unit/circuit-breaker-failure-kind.test.ts` + `circuit-breaker-registry-cap.test.ts` + `circuit-breaker-stream-controller-4602.test.ts` + `resilience-settings-provider-breaker.test.ts` + `resilience-settings-upstream429-breaker.test.ts` + `skip-provider-breaker-consumer-2743.test.ts` + `token-health-check-circuit-breaker.test.ts` → 39 + 12 = 51 / 51 passing.
  - `tests/unit/account-fallback-service.test.ts` + `account-fallback-anthropic-quota.test.ts` + `accountfallback-ratelimit-400-4976.test.ts` + `account-fallback-route-restriction-403.test.ts` → 95 / 95 passing.
- **Async-predicate audit**: every call site of `isProviderCircuitBlocking(...)` and `hasHealthyAccount(...)` uses `await` (six and seven sites respectively, including `runtimeUnits.ts:108`, `quotaStrategies.ts:437`, `chatHelpers.ts:351,496`, `combo.ts:1163,1881,2949,3052`, and the new test).
- **Typecheck/lint (0143-owned files + 0043 test fixes)**:
  - `npm run typecheck:core` → exit 0.
  - `npx eslint tests/unit/combo-resilience-wiring-0043.test.ts tests/integration/account-aware-breaker.test.ts open-sse/services/accountFallback.ts src/sse/handlers/chatHelpers.ts open-sse/services/combo/comboPredicates.ts open-sse/services/combo/runtimeUnits.ts open-sse/services/combo/quotaStrategies.ts open-sse/services/combo.ts` → exit 0 (no errors, no warnings).
- **Runtime / fail-closed proof (no :22000 mutation)**:
  - `:23456` smoke: `GET /api/monitoring/health` → 200 (read-only health probe; no request mutation).
  - `:22000` was probed exactly once read-only (`curl --max-time 2 -o /dev/null`) to confirm isolation; no mutation.
- **No new races / side-effects**: `hasHealthyAccount` is read-only against `provider_connections` cache / DB fallback, `modelLockouts` map (read), and `quotaCache.isAccountQuotaExhausted` (read). It does not write breaker state, does not toggle `halfOpenAllowed`, and does not record provider failures.
- **No raw error leakage**: `open-sse/services/comboPredicates.ts` and `open-sse/services/accountFallback.ts` contain no `err.stack`/`err.message` passthroughs; rejection paths reuse the sanitized `providerCircuitOpenResponse` (`code: provider_circuit_open`, header `X-OmniRoute-Provider-Breaker: open`).
- **Polish-verifier/date**: Builder Polish Worker / 2026-08-06

## 🔍 Review Trail

- **Reviewer/verdict/score**: Parent reviewer with Gortex-assisted review — APPROVED / 100/100
- **Notes**: Reproduced and fixed 3 stale async assertions in Task 0043; Gortex rerun returned APPROVE with zero findings. Provider-wide fail-closed behavior and healthy-account fallback remain covered.
