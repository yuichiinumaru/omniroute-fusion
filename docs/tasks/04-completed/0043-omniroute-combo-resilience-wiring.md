# Task 0043: Combo / Auto-Combo Resilience Wiring (Breaker, RR, HALF_OPEN, Soft-Failure)

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🟠 P1
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S4)
> **Action type**: FIX + HARDEN
> **Blocks**: none
> **Depends on**: none
> **Architect-2**: Upgraded 2026-07-11 — F-04-001 re-homed here from 0044 (chat soft-failure breaker)

---

## Source reports (builder reference)

Primary:
- `docs/reports/03-open-sse-services.md` — F-03-001, F-03-002, F-03-003, F-03-004, F-03-W2-001, F-03-W2-002 (stretch: F-03-W2-003, F-03-006, F-03-008)

Also relevant:
- `docs/reports/04-mcp-edge-runtime.md` — **F-04-001** only (soft-failure HALF_OPEN probe success; re-homed from MCP task 0044)
- `docs/reports/00-wave-plan-exclusions.md` — fusion residuals (F-03-012, F-03-W2-006) already tracked

Guide: `docs/architecture/RESILIENCE_GUIDE.md`.

---

## Objective

Make combo/auto-combo routing and the **chat-path circuit breaker** honor the three-layer resilience model (provider breaker, connection cooldown, model lockout):

1. **F-04-001**: Non-throwing `{ success:false }` from `handleChatCore` must **not** count as HALF_OPEN probe success; combo paths must record true provider failures.
2. Round-robin records circuit-breaker failures and pre-skips OPEN / model-lock targets (F-03-001, F-03-004).
3. Combo-ref / `executeRuntimeUnitCombo` restores resilience options wiring (F-03-002).
4. HALF_OPEN probe budget respected — do not treat only `state === "OPEN"` as skip when probe slots exhausted (F-03-003).
5. Auto-combo empty-pool fallback must **not** re-admit all OPEN/excluded providers (F-03-W2-001).
6. Auto-combo re-evaluate must not hardcode breaker state `"CLOSED"` / ignore incident mode (F-03-W2-002).

Stretch: RR credential gate parity (F-03-W2-003), backoffLevel=0 (F-03-006), HALF_OPEN race (F-03-008).

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-04-001** | P1 | Circuit breaker treats non-throwing upstream failures as probe success |
| **F-03-001** | P1 | RR path never records provider circuit-breaker failures |
| **F-03-002** | P1 | Combo-ref / `executeRuntimeUnitCombo` strips resilience wiring |
| **F-03-003** | P1 | HALF_OPEN probe budget ignored by combo pre-gates |
| **F-03-004** | P1 | RR main loop omits circuit-open + model-lock pre-skips |
| **F-03-W2-001** | P1 | Auto-combo empty-pool re-admits OPEN/excluded providers |
| **F-03-W2-002** | P1 | Auto-combo re-evaluate hardcodes breaker `"CLOSED"` |
| Stretch | P2 | F-03-W2-003, F-03-006, F-03-008, F-03-005 naming |

### Deferred / already tracked

| ID | Note |
|----|------|
| **F-03-012** | Fusion nested combo-ref options — **may overlap 03-review** (0012); do not compete |
| **F-03-W2-006** | Fusion panel cancel — **may overlap 03-review**; defer |

See **Source reports** above for full relative paths.

### Evidence anchors (verified 2026-07-11)

- F-04-001: `src/sse/handlers/chatHelpers.ts` wraps `chatFn` in `breaker.execute()`; `src/shared/utils/circuitBreaker.ts` treats any non-throw as success; `src/sse/handlers/chat.ts` inspects outcome after execute; combo paths may skip `_onFailure`
- F-03-*: `open-sse/services/combo.ts` RR vs priority gates; `open-sse/services/combo/runtimeUnits.ts` `executeRuntimeUnitCombo`; `open-sse/services/autoCombo/**` empty-pool / re-evaluate
- Grep smell: `getStatus().state === "OPEN"` without `canExecute()` in combo paths

### Out of scope

- Fusion first-class contracts (0010–0018)
- Dual-mode token health (0006)
- Changing breaker trip codes policy (F-03-W2-008) beyond documenting conflict if touched
- MCP scopes/IDOR (0044)

---

## Test Requirements

- MUST: soft-failure result `{ success:false, status:502 }` from chatFn does **not** close HALF_OPEN as success (F-04-001)
- MUST: combo path records provider-level failure when appropriate (not only non-combo)
- MUST: RR failure path calls breaker `recordFailure` / equivalent (spy)
- MUST: RR skips target when breaker OPEN or model locked **before** semaphore acquire
- MUST: runtime-unit / combo-ref path passes the same resilience hooks as priority path (or shared helper)
- MUST: when HALF_OPEN and probe budget exhausted, combo does not treat as fully open (assert skip or limited probe)
- MUST: auto-combo empty-pool does not select providers still OPEN/excluded
- MUST: re-evaluate reads live breaker status (not hardcoded CLOSED)
- Prefer unit tests with mocked breaker + synthetic combo configs (no live providers); vitest for autoCombo suites

---

## Exit Conditions (GDD/TDD)

- [x] Primary seven findings closed with tests (including F-04-001)
- [x] Deferred fusion findings listed as deferred in Completion Evidence (not silently “fixed”)
- [x] `node --import tsx/esm --test` and/or `npm run test:vitest` patterns for combo/autoCombo pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` — no new errors
- [x] CHANGELOG.md entry (routing/resilience)
- [x] If behavior changes operator-visible routing, note in docs or CHANGELOG / RESILIENCE_GUIDE

---

## Details

### What

Subtasks:

- [x] **Ler código existente** + reports + RESILIENCE_GUIDE
- [x] Fix soft-failure / HALF_OPEN classification (gate-only tryReserve + post-result)
- [x] Extract `isProviderCircuitBlocking` + shared runtime pre-skip helper
- [x] Wire RR recordFailure + pre-skips (OPEN/canExecute + model lock + credential gate)
- [x] Restore resilience on executeRuntimeUnitCombo (breaker/lockout/cooldown/exhaustion)
- [x] Fix HALF_OPEN gating to use canExecute / isProviderCircuitBlocking
- [x] Fix auto-combo empty-pool + re-evaluate + incident mode
- [x] Stretch RR credential gate parity
- [x] Tests + CHANGELOG + RESILIENCE_GUIDE

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/sse/handlers/chatHelpers.ts` | Modificar — F-04-001 breaker wrap semantics |
| `src/sse/handlers/chat.ts` | Modificar — success/failure recording for combo + non-combo |
| `src/shared/utils/circuitBreaker.ts` | Ler (+ API if needed) |
| `open-sse/services/combo.ts` | Modificar — RR + shared gates |
| `open-sse/services/combo/runtimeUnits.ts` | Modificar — resilience options wire |
| `open-sse/services/autoCombo/**` | Modificar — empty-pool + re-evaluate |
| `open-sse/services/accountFallback.ts` | Ler — model lockout |
| `tests/` + vitest autoCombo suites | Expandir |
| `docs/architecture/RESILIENCE_GUIDE.md` | Update if semantics change |
| `CHANGELOG.md` | Entry |

### How

1. Diff priority path vs RR path line-by-line for gate/record calls.
2. Grep `state === "OPEN"` vs `canExecute` / `getStatus` in combo services and chat helpers.
3. TDD: synthetic OPEN provider must not be chosen after failure or in empty-pool fallback; HALF_OPEN soft-failure must not close breaker as healthy.

### Why

Without correct failure recording and OPEN exclusion, a dying provider keeps receiving traffic on RR/auto-combo even after the resilience layer claims protection — silent reliability regression. Soft-failure “probe success” actively heals broken providers.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT open competing fusion tasks for F-03-012 / F-03-W2-006.
> DO NOT “fix” by disabling auto-combo or RR.
> DO NOT trip provider breaker on pure account 401/403 unless product policy already does (see RESILIENCE_GUIDE).
> DO NOT leave F-04-001 to MCP task 0044 — evidence is chat path, not MCP.

> [!IMPORTANT]
> Prefer `getStatus()` / `canExecute()` lazy recovery over raw state reads.
> First subtask: read existing code.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**
- [ ] **Zod Validation**: N/A unless config schema
- [ ] **Security**: N/A primary
- [ ] **Error Sanitization**: keep unavailable bodies safe
- [ ] **No Raw SQL**: N/A
- [x] **Tests**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados** (initial 2026-07-11 + path-to-100 re-fix 2026-07-18 + ts-expert):
  - `src/shared/utils/circuitBreaker.ts` — `tryReserveExecution()`
  - `src/shared/utils/softChatBreakerOutcome.ts` — **NEW** `classifySoftChatBreakerOutcome` + `PROVIDER_BREAKER_FAILURE_STATUSES` SSoT (F-04-001)
  - `src/sse/handlers/chatHelpers.ts` — gate-only (no soft-fail probe success)
  - `src/sse/handlers/chat.ts` — soft success/fail/terminal via classifier (not ad-hoc HALF_OPEN checks)
  - `open-sse/services/accountFallback.ts` — `recordProviderFailure` allows HALF_OPEN
  - `open-sse/services/combo/comboPredicates.ts` — `isProviderCircuitBlocking` + `getExhaustedTargetSkipReason` + `ExhaustionSkipTarget` Pick type
  - `open-sse/services/combo.ts` — RR recordFailure + pre-skips; canExecute gates; auto fail-closed catch
  - `open-sse/services/combo/quotaStrategies.ts` — preScreen `canExecute`
  - `open-sse/services/combo/runtimeUnits.ts` — full resilience wire (F-03-002); exhaustion via `getExhaustedTargetSkipReason` (`provider:connectionId`)
  - `open-sse/services/autoCombo/engine.ts` — empty-pool + incident mode + live CB re-eval
  - `open-sse/services/autoCombo/routerStrategy.ts` — no OPEN re-admission fallback
  - `tests/unit/combo-resilience-wiring-0043.test.ts` — path-to-100 suite (21 tests)
  - `docs/architecture/RESILIENCE_GUIDE.md` — semantics note + SSoT helper
  - `CHANGELOG.md` — Fixed entry + path-to-100 re-fix bullet
- **Finding IDs closed / deferred**:
  - Closed: F-04-001, F-03-001, F-03-002 (**key bug fixed 2026-07-18**), F-03-003, F-03-004, F-03-W2-001, F-03-W2-002
  - Stretch done: F-03-W2-003 (RR credential gate), F-03-008 partial (`tryReserveExecution`)
  - Deferred: F-03-012 (fusion nested options), F-03-W2-006 (fusion panel cancel), F-03-006 (backoffLevel=0) left as stretch residual
  - Review residual F4 (multi-account HALF_OPEN heal on later success): product note only, not blocking
- **Testes (2026-07-18 ts-expert + reviewer path-to-100)**:
  - `node --import tsx/esm --test tests/unit/combo-resilience-wiring-0043.test.ts` — **22 pass / 0 fail**
    - Real `executeChatWithBreaker` soft-502 + `classifySoftChatBreakerOutcome` matrix + chat.ts structural wire
    - HALF_OPEN soft 429 re-opens after tryReserve (no stuck probe budget)
    - F-03-002: `getExhaustedTargetSkipReason` key + `executeRuntimeUnitCombo` same-connection pre-skip after 502
    - F-03-001 RR: failureCount increases after 502 (recordProviderFailure)
    - F-03-004 RR: OPEN provider + model-lock pre-skip (handleSingleModel not called)
  - `npm run test:vitest -- open-sse/services/autoCombo/__tests__/autoCombo.test.ts` — **56 pass**
  - `npm run typecheck:core` — clean
- **CHANGELOG**: Fixed — Combo resilience path-to-100 (Task 0043) re-fix + SSoT soft outcome + HALF_OPEN 429 re-open
- **Agente executor**: gt-ts-engineer (builders) + **gt-ts-expert** path-to-100 2026-07-18 + **gt-ts-code-reviewer** path-to-100
- **Data de conclusão**: 2026-07-11 (initial); **2026-07-18 (blocking F1 + MUST tests + soft-fail SSoT + stuck-probe fix)**

---
## 🔍 Review Trail (preenchido pelo reviewer)

- **Latest reviewer**: gt-ts-code-reviewer (2026-07-18 re-review + path-to-100)
- **Veredito**: `ACCEPTED_100`
- **Score**: `100/100`
- **Latest report**: `docs/reports/reviews/2026-07-18-task-0043-combo-resilience-rereview.md`
- **Previous Reports**:
  - `docs/reports/reviews/2026-07-11-task-0043-combo-resilience-review.md` — 84, NEEDS FIX

### First review (2026-07-11) — historical

- **Reviewer**: reviewers (Code Quality Reviewer)
- **Veredito**: `NEEDS FIX`
- **Score**: `84/100`
- **Notas**:
  - Report: `docs/reports/reviews/2026-07-11-task-0043-combo-resilience-review.md`
  - Lane: returned to `02-doing/` (S < 90)
  - Blocking F1: `runtimeUnits.ts` exhaustedConnections pre-skip uses bare `connectionId` vs writers' `provider:connectionId` (F-03-002 incomplete)
  - MUST test gaps: F-04-001 chatFn soft-fail simulated only; no RR recordFailure spy; no runtime-unit tests
  - Path-to-100: fix connection key; add F-03-002 + real chat soft-502 + RR spy tests

### Builder path-to-100 note (2026-07-18)

- **F1 fixed**: `getRuntimeModelSkipReason` delegates exhaustion to `getExhaustedTargetSkipReason` (provider-scoped keys)
- **MUST tests added**: real executeChatWithBreaker soft-502; F-03-002 runtime-unit; RR failureCount + OPEN/model-lock pre-skip
- Leave in `02-doing/` (do not move); ready for re-review ≥90

### gt-ts-expert path-to-100 (2026-07-18, second pass)

- **Verified F1**: no bare `exhaustedConnections.has(connectionId)` remains; writers/readers share `provider:connectionId`
- **F-04-001 SSoT**: extracted `classifySoftChatBreakerOutcome` + `PROVIDER_BREAKER_FAILURE_STATUSES` → `src/shared/utils/softChatBreakerOutcome.ts`; wired `chat.ts` success / account-fallback / terminal soft paths
- **Type tightening**: `getExhaustedTargetSkipReason` accepts `ExhaustionSkipTarget` structural Pick
- **Tests**: **21 pass / 0 fail** at expert pass; typecheck:core clean; autoCombo vitest 56/56
- **Docs**: RESILIENCE_GUIDE + CHANGELOG note the SSoT helper
- **Residuals noted then**: F4 multi-account later-success heal; F-03-006; fusion deferred; stuck HALF_OPEN on soft 429 after tryReserve

### Independent security return-review (2026-07-18, agentID=`reviewers`)

- **Veredito**: `ACCEPTED_100`
- **Score**: `100/100`
- **Report**: `docs/reports/reviews/2026-07-18-task-0043-combo-resilience-return-review.md`
- **Previous Reports**:
  - `docs/reports/reviews/2026-07-18-task-0043-combo-resilience-rereview.md` (claimed 100 — re-proved)
  - `docs/reports/reviews/2026-07-11-task-0043-combo-resilience-review.md` (84, NEEDS FIX)
- **Fresh proof**: **22/22** unit + **56/56** vitest autoCombo; classifier matrix + exhaustion key format
- **Patches**: none
- **Lane**: stay `docs/tasks/03-review/`

### gt-ts-code-reviewer re-review + path-to-100 (2026-07-18)

- **Veredito**: `ACCEPTED_100`
- **Score**: `100/100` (pre-fix re-review 94 → path-to-100)
- **Report**: `docs/reports/reviews/2026-07-18-task-0043-combo-resilience-rereview.md`
- **Previous Reports**:
  - `docs/reports/reviews/2026-07-11-task-0043-combo-resilience-review.md` (84, NEEDS FIX)
- **Resolved prior blockers**: F1 key, F2 real soft-502 helper, F3 RR/runtime tests (builder)
- **Reviewer path-to-100**: HALF_OPEN soft non-success (incl. 429) → `failure` before status filter — prevents stuck `halfOpenAllowed=0`; +1 unit test → **22/22**
- **Lane**: moved to `docs/tasks/03-review/`

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
