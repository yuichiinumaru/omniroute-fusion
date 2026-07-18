# Task 0050: Registered-Key Budget Window Reset + Usage History Rollup Idempotency

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
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

Stretch: F-05-W2-004 relay token budget enforcement. (**F-05-W2-003 persistSecret rotation is owned by Task 0041**, not here.) — **not in this PR**.

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

- [x] F-05-004 fixed with unit tests on temp SQLite
- [x] F-05-005 fixed with unit/integration tests on rollup
- [x] `node --import tsx/esm --test tests/unit/<registered-key|usage-*>.test.ts` pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` — no new errors (eslint on touched files clean)
- [x] CHANGELOG.md entry
- [x] DB ops remain in `src/lib/db/` / usage modules only

---

## Details

### What

Subtasks:

- [x] **Ler código existente** e o report em `docs/reports/05-lib-data-auth.md` listado em Source reports: `src/lib/db/registeredKeys.ts` validate/increment, `src/lib/usage/aggregateHistory.ts`, `src/lib/db/cleanup.ts`, related tests, schema for `daily_usage_summary` / `usage_history`
- [x] Fix validate to use post-reset counters (in-memory zero or re-SELECT inside transaction)
- [x] Mirror reset into increment (or shared transactional helper)
- [x] Make rollup idempotent + transactional with delete
- [x] Align dual-writer semantics (document + code)
- [x] Tests + CHANGELOG

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

- [x] **Doc Accuracy**
- [x] **No Raw SQL** outside db modules
- [x] **Tests** with cleanup hooks
- [x] **Migrations** only if schema markers needed (none required — replace semantics + transaction)
- [x] **Security**: N/A primary

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/lib/db/registeredKeys.ts` — `applyRegisteredKeyBudgetWindowReset`; validate uses post-reset counters; increment resets windows atomically
  - `src/lib/usage/aggregateHistory.ts` — replace ON CONFLICT; `rollupUsageHistoryBeforeDateSync`; `rollupAndDeleteUsageHistoryBeforeDate`; dual-writer authority docs
  - `src/lib/db/cleanup.ts` — cleanup uses transactional rollup+delete helper
  - `tests/unit/registered-key-budget-window-0050.test.ts` (new)
  - `tests/unit/usage-history-rollup-0050.test.ts` (new)
  - `CHANGELOG.md`
  - `docs/reports/05-lib-data-auth.md` — F-05-004 / F-05-005 marked FIXED
- **Finding IDs closed**: F-05-004, F-05-005 (stretch F-05-W2-004 not in scope)
- **Testes**:
  ```bash
  node --import tsx/esm --test \
    tests/unit/registered-key-budget-window-0050.test.ts \
    tests/unit/usage-history-rollup-0050.test.ts \
    tests/unit/db-registered-keys.test.ts \
    tests/unit/db-registeredKeys-crud.test.ts \
    tests/unit/database-settings-maintenance.test.ts
  # → 50 pass, 0 fail
  ```
- **typecheck / lint**: `npm run typecheck:core` clean; eslint on touched files clean
- **CHANGELOG**: Unreleased → Fixed → Task 0050 entry
- **Agente executor**: builder (Grok Build subagent)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: reviewers (Code Quality Reviewer / independent) — 2026-07-11
- **Veredito**: PASS WITH NOTES — hold in `03-review/` (S ≥ 90)
- **Score**: 94/100
- **Notas**: F-05-004 post-reset counters + increment window reset verified; F-05-005 replace ON CONFLICT + transactional rollup+delete verified; 50/50 tests + typecheck:core + eslint clean. Residual only: dead `rollup.errors` branch (N1), dual-writer casing (N2). Report: `docs/reports/reviews/2026-07-11-task-0050-budget-usage-rollup-review.md`. Not moved; not patched.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers` (independent full re-review + path-to-100)
- **Score**: `100/100`
- **Verdict**: `PASS_PERFECT`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0050-budget-usage-rollup-final-review.md`
- **Lane outcome**: remains in `03-review/` (final review complete)
- **Task reference**: Task 0050 (`omniroute-registered-key-budget-usage-rollup`)

#### Current Open Blockers

- _(none)_

#### Path-to-100 Summary

- ✅ Wire validate+increment into request pipeline
- ✅ Remove dead errors branch; LOWER() in daily + hourly quota_snapshots rollup
- ✅ Independent re-review live proof 2026-07-18 → 100

#### Path-to-100 Fix (2026-07-18 final)

- **R1 wired** (prior): `isValidApiKey` / `enforceApiKeyPolicy` for `ork_`
- **N1/N2** (prior + this session): cleanup dead branch; hourly LOWER() added this session
- **Tests**: registered-key + rollup + crud green; typecheck:core exit 0
- **Lane**: stay `03-review/`

### Previous Reports

- `2026-07-16` — `92/100` — `docs/reports/reviews/2026-07-16-task-0050-budget-usage-rollup-reaudit.md` (UNTRUSTED prior; superseded)
  - **Carried forward then**: R1/N1/N2 → resolved by path-to-100
  - **Regression guard**: day-boundary validate; increment reset; double rollup; transactional cleanup; production wire tests
- `2026-07-11` — `94/100` — `docs/reports/reviews/2026-07-11-task-0050-budget-usage-rollup-review.md`
  - **Carried forward**: N1 dead errors branch; N2 dual-writer casing; N3 no forced txn test
  - **Resolved since**: F-05-004/005 function-level contracts; production wiring

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
