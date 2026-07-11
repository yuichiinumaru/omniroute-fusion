# Task 0050: Registered-Key Budget Window Reset + Usage History Rollup Idempotency

> **Status**: `[ ]` Open
> **Priority**: 🟠 P1
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S11)
> **Action type**: FIX
> **Blocks**: none
> **Depends on**: none
> **Architect-2**: Upgraded 2026-07-11 — confirmed stale-counter + increment-without-reset; F-05-W2-003 owned by 0041

---

## Source reports (builder reference)

Primary:
- `docs/reports/05-lib-data-auth.md` — F-05-004, F-05-005 (stretch: F-05-W2-004)

Also relevant:
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context
- **F-05-W2-003** (`persistSecret` rotate) is Task **0041**, same report slice

---

## Objective

Fix **correctness bugs** in billing/quota data paths that produce false denies and permanently inflated analytics:

1. **F-05-004**: `validateRegisteredKey` must apply day/hour window resets **before** budget comparison (or re-read counters after reset UPDATE). Align `incrementRegisteredKeyUsage` window reset (today increment never resets).
2. **F-05-005**: Usage history rollup into `daily_usage_summary` must be **crash-safe and idempotent** (transaction rollup+delete; replace-not-add semantics or rolled_up markers). Resolve dual-writer conflict with `rollupDailyUsage` from quota_snapshots.

Stretch: F-05-W2-004 relay token budget enforcement. (**F-05-W2-003 persistSecret rotation is owned by Task 0041**, not here.)

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-05-004** | P1 | Registered-key budget check uses stale counters after window reset |
| **F-05-005** | P1 | Usage history rollup additive + non-transactional (double-count) |
| Stretch | P2 | F-05-W2-004 relay token budget |

See **Source reports** above for full relative paths.

### Evidence anchors (verified 2026-07-11)

- `src/lib/db/registeredKeys.ts:383-400` — reset UPDATE then still compares pre-reset `row.daily_used` / `row.hourly_used`
- `src/lib/db/registeredKeys.ts:408-417` — `incrementRegisteredKeyUsage` increments without day/hour window reset
- `src/lib/usage/aggregateHistory.ts` additive ON CONFLICT
- `src/lib/db/cleanup.ts` rollup then DELETE as separate steps
- Contrast: `rollupDailyUsage` uses replace semantics

### Out of scope

- Secrets encryption / rotation (0041)
- Dual-mode auth
- Full multi-currency billing redesign

---

## Test Requirements

- MUST: registered key exhausted yesterday is allowed on first request of new day (counters effectively 0 after reset)
- MUST: increment path also resets windows at day/hour boundary (or validate+increment share one transactional helper)
- MUST: running usage_history rollup twice for same range does not double totals (or second run is no-op)
- MUST: crash between rollup and delete does not permanently double-count (transaction or markers)
- MUST: document authority for `daily_usage_summary` if both quota_snapshots and usage_history remain
- MUST: use `resetDbInstance()` cleanup in DB tests (project hang rule)

---

## Exit Conditions (GDD/TDD)

- [ ] F-05-004 fixed with unit tests on temp SQLite
- [ ] F-05-005 fixed with unit/integration tests on rollup
- [ ] `node --import tsx/esm --test tests/unit/<registered-key|usage-*>.test.ts` pass
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` — no new errors
- [ ] CHANGELOG.md entry
- [ ] DB ops remain in `src/lib/db/` / usage modules only

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** e o report em `docs/reports/05-lib-data-auth.md` listado em Source reports: `src/lib/db/registeredKeys.ts` validate/increment, `src/lib/usage/aggregateHistory.ts`, `src/lib/db/cleanup.ts`, related tests, schema for `daily_usage_summary` / `usage_history`
- [ ] Fix validate to use post-reset counters (in-memory zero or re-SELECT inside transaction)
- [ ] Mirror reset into increment (or shared transactional helper)
- [ ] Make rollup idempotent + transactional with delete
- [ ] Align dual-writer semantics (document + code)
- [ ] Tests + CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/db/registeredKeys.ts` | Modificar — budget window |
| `src/lib/usage/aggregateHistory.ts` | Modificar — rollup semantics |
| `src/lib/db/cleanup.ts` | Modificar — transaction boundary |
| `tests/unit/` | Expandir |
| `CHANGELOG.md` | Entry |

### How

1. Write failing tests reproducing day-boundary false deny.
2. Write failing tests for double rollup inflation.
3. Implement minimal transactional fix; avoid large schema rewrite unless required.

### Why

False budget denies break paying/registered clients after midnight. Non-idempotent rollups corrupt cost dashboards and any policy that reads summary tables.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT write raw SQL from routes.
> DO NOT “fix” by disabling registered-key budgets.
> DO NOT leave additive ON CONFLICT without markers if delete can be skipped.
> DO NOT claim F-05-W2-003 fixed here — that is Task 0041.

> [!IMPORTANT]
> First subtask: read existing code. Use `resetDbInstance()` in tests with DB handles.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**
- [ ] **No Raw SQL** outside db modules
- [ ] **Tests** with cleanup hooks
- [ ] **Migrations** only if schema markers needed
- [ ] **Security**: N/A primary

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
- **Finding IDs closed**:
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
