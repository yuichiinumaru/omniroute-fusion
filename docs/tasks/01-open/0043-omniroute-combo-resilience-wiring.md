# Task 0043: Combo / Auto-Combo Resilience Wiring (Breaker, RR, HALF_OPEN, Soft-Failure)

> **Status**: `[ ]` Open
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

- [ ] Primary seven findings closed with tests (including F-04-001)
- [ ] Deferred fusion findings listed as deferred in Completion Evidence (not silently “fixed”)
- [ ] `node --import tsx/esm --test` and/or `npm run test:vitest` patterns for combo/autoCombo pass
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` — no new errors
- [ ] CHANGELOG.md entry (routing/resilience)
- [ ] If behavior changes operator-visible routing, note in docs or CHANGELOG / RESILIENCE_GUIDE

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** e o(s) report(s) em `docs/reports/03-open-sse-services.md` + `docs/reports/04-mcp-edge-runtime.md` (F-04-001) listados em Source reports: `src/sse/handlers/chatHelpers.ts`, `src/sse/handlers/chat.ts`, `src/shared/utils/circuitBreaker.ts`, `open-sse/services/combo.ts` (priority vs RR), `open-sse/services/combo/runtimeUnits.ts`, `open-sse/services/autoCombo/**`, `open-sse/services/accountFallback.ts`, existing combo/autoCombo tests, RESILIENCE_GUIDE
- [ ] Fix soft-failure / HALF_OPEN classification (gate-only `canExecute` + explicit success/failure from post-result, or throw typed failures for breaker statuses)
- [ ] Extract shared “should skip target” + “record outcome” helpers if duplication is the root smell
- [ ] Wire RR recordFailure + pre-skips
- [ ] Restore options on executeRuntimeUnitCombo / combo-ref
- [ ] Fix HALF_OPEN gating to use `canExecute` / probe budget APIs not raw OPEN-only
- [ ] Fix auto-combo empty-pool + re-evaluate breaker state
- [ ] Stretch RR credential gate parity
- [ ] Tests + CHANGELOG

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

- [ ] **Doc Accuracy**
- [ ] **Zod Validation**: N/A unless config schema
- [ ] **Security**: N/A primary
- [ ] **Error Sanitization**: keep unavailable bodies safe
- [ ] **No Raw SQL**: N/A
- [ ] **Tests**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
- **Finding IDs closed / deferred**:
- **Testes**:
- **typecheck / lint**:
- **CHANGELOG**:
- **Agente executor**:
- **Data de conclusão**:

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**:
- **Veredito**:
- **Score**:
- **Notas**:
