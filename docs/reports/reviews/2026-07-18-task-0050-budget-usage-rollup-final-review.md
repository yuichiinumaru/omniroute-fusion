# Review Report: Task 0050 — Registered-Key Budget Window + Usage Rollup — FINAL (2026-07-18)

## Review Lineage

- **Current task**: Task 0050 (`omniroute-registered-key-budget-usage-rollup`); live path `docs/tasks/03-review/0050-omniroute-registered-key-budget-usage-rollup.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0050-budget-usage-rollup-review.md` — 94/100 (UNTRUSTED)
  - `docs/reports/reviews/2026-07-16-task-0050-budget-usage-rollup-reaudit.md` — 92/100 (UNTRUSTED)
- **Review mode**: independent full re-review + path-to-100 apply (agentID=`reviewers`)
- **Skills**: security, tsjs, code-quality

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `PASS_PERFECT`
- **Lane recommendation**: remain `docs/tasks/03-review/` (final review complete; lane move to `04-completed/` is owner/workflow decision)

### Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | pass | Domain helpers typed; `rowToCamel` cast retained at boundary with proven SELECT shape |
| Boundary Integrity | pass | Budget gate on `ork_` via `isValidApiKey` + `enforceApiKeyPolicy` |
| Async Determinism | pass | Sync SQLite budget ops; no floating promises on increment |
| Immutability | pass | Window counters returned as new object from reset helper |
| State Exclusivity | pass | Single-writer SQLite; validate then increment TOCTOU soft-overshoot accepted residual |

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| F-05-004 post-reset counters | 100 | validate uses post-reset `window.*`; increment CASE reset-to-1 |
| F-05-005 idempotent rollup | 100 | replace ON CONFLICT + transactional rollup+delete |
| Production wiring | 100 | `isValidApiKey` + `enforceApiKeyPolicy` wired; R1 tests green |
| Dual-writer key parity | 100 | daily + hourly `rollupDailyUsage` LOWER() |
| Hygiene | 100 | dead `rollup.errors` branch removed from cleanup path |
| Fresh tests | 100 | registered-key + rollup + crud suites green this session |

## Delta Since 2026-07-16 Reaudit

| ID | Status | Evidence |
| --- | --- | --- |
| R1 production wiring | RESOLVED | `src/sse/services/auth.ts` ork_ → validate; `apiKeyPolicy.ts` validate+increment |
| N1 dead errors branch | RESOLVED | `cleanup.ts` throws/catch only |
| N2 dual-writer casing | RESOLVED | daily LOWER already; **this session** hourly LOWER added |
| N3 forced txn-fail test | Accepted residual (info) | replace+transaction structure + re-rollup test sufficient |
| R2 soft TOCTOU | Accepted residual (info) | SQLite single-writer; soft budget overshoot by 1 under concurrency |

### Path-to-100 applied this session

1. `src/lib/usage/aggregateHistory.ts` — hourly `rollupDailyUsage` SELECT/GROUP BY now `LOWER(provider/model)` (parity with daily).

## Contract Compliance

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Exhausted yesterday allowed new day | ✅ | registered-key-budget-window-0050 |
| Increment resets day/hour | ✅ | CASE set-to-1 + test |
| Double rollup no inflate | ✅ | usage-history-rollup-0050 |
| Crash-safe rollup+delete | ✅ | transaction + replace |
| Production wire | ✅ | R1 isValidApiKey + enforceApiKeyPolicy tests |
| typecheck:core | ✅ | exit 0 this session |

## Fresh Verification

```text
node --import tsx/esm --test \
  tests/unit/registered-key-budget-window-0050.test.ts \
  tests/unit/usage-history-rollup-0050.test.ts \
  tests/unit/db-registered-keys.test.ts \
  tests/unit/db-registeredKeys-crud.test.ts
→ pass (all green this session)

npm run typecheck:core → exit 0
```

## Findings

#### Critical / Serious
- none

#### Accepted residual (info)
- Soft validate→increment TOCTOU overshoot under concurrency (R2) — not exit criteria
- No forced mid-transaction failure injection test (N3)

## Path to 100

**Reached.** Optional future: single transactional validate+increment helper if product needs hard budget caps under load.
