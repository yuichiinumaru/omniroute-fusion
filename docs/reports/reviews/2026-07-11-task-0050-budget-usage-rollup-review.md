# Review Report: Task 0050 — Registered-Key Budget Window Reset + Usage History Rollup Idempotency — 2026-07-11

## Review Lineage

- **Current task**: Task 0050 (`omniroute-registered-key-budget-usage-rollup`); live path `docs/tasks/03-review/0050-omniroute-registered-key-budget-usage-rollup.md`
- **Previous reports read**: none under `docs/reports/reviews/` for 0050
- **Related reports considered**: `docs/reports/05-lib-data-auth.md` (F-05-004, F-05-005); review format from `2026-07-11-task-0032-connection-auth-mode-helper-review.md`
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `94/100`
- **Verdict**: `PASS WITH NOTES` / `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 98 | F-05-004 + F-05-005, tests, CHANGELOG, typecheck, lint, authority docs all met |
| F-05-004 budget window correctness | 97 | Post-reset counters on validate; atomic reset+bump on increment; same-day deny preserved |
| F-05-005 rollup idempotency / crash-safety | 95 | Replace ON CONFLICT + transactional rollup+delete; dual-writer authority documented |
| Tests | 94 | Boundary/idempotency/authority cases green; no forced mid-txn failure simulation |
| Scope discipline | 96 | Stretch F-05-W2-004 correctly out of scope; no secrets/0041 bleed |
| Hygiene / residual dual-writer | 88 | Vestigial `rollup.errors` branch; quota_snapshots writer still case-sensitive |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none

### Regressions

- none on Task 0050 surfaces (related registered-keys + maintenance suites still green)

### New Findings

- `NEW` N1 (Low / hygiene): `cleanupUsageHistory` still branches on `rollup.errors > 0`, but `rollupAndDeleteUsageHistoryBeforeDate` uses `rollupUsageHistoryBeforeDateSync` which **throws** (never returns `errors > 0`). On failure the transaction aborts via throw → outer `catch` — behavior is correct; the errors branch is dead.
- `NEW` N2 (Low / residual accepted): Dual-writer casing: usage_history rollup lowercases `provider`/`model`; `rollupDailyUsage` (quota_snapshots) does not. Overlapping keys with different casing can still produce two summary rows. Module authority docs cover last-writer-wins for matching keys; casing split is residual, not F-05-005 double-count.
- `NOTE` N3 (Info): Crash-safety is proven by replace semantics + `db.transaction` structure and re-rollup-without-delete tests; there is no test that forces a mid-transaction throw to assert full rollback. Acceptable for SQLite better-sqlite3 transactions.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: none material — unit suite + typecheck + eslint re-run this session
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | NEW | Low | Open (path-to-100) | Dead `rollup.errors` abort branch after sync throw path | this report | `cleanup.ts:100-107` vs `aggregateHistory.ts:154-195` (throws, `errors` stays 0) |
| N2 | NEW | Low | Accepted residual | quota_snapshots rollup does not lowercase provider/model | this report | `aggregateHistory.ts:55-69` vs `167-169` |
| N3 | NEW | Info | Accepted residual | No forced txn-failure rollback test | this report | `usage-history-rollup-0050.test.ts` crash sim is re-rollup only |
| G1 | — | Guard | Pass | Validate uses post-reset counters (not SELECT snapshot) | this report | `registeredKeys.ts:421-425` |
| G2 | — | Guard | Pass | Increment resets windows before bump | this report | `registeredKeys.ts:447-455` |
| G3 | — | Guard | Pass | Rollup replace + transactional delete | this report | `aggregateHistory.ts:180-184`, `224-234`; `cleanup.ts:100` |
| G4 | — | Guard | Pass | Authority documented for dual writers | this report | `aggregateHistory.ts:5-14` |
| G5 | — | Guard | Pass | Tests use `resetDbInstance()` cleanup | this report | both `*-0050.test.ts` `test.after` |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Exhausted yesterday allowed on first request of new day | ✅ | `registered-key-budget-window-0050.test.ts` day-boundary test PASS; validate returns `dailyUsed=0` |
| Increment path resets day/hour windows | ✅ | SQL CASE set-to-1 on window flip; test expects `dailyUsed=1` after stale 2 |
| Same-day still exhausted remains denied | ✅ | two increments + validate → null |
| Double rollup does not inflate totals | ✅ | twice rollup → `total_requests=2` not 4 |
| Crash between rollup and delete not permanently double-count | ✅ | replace ON CONFLICT + `db.transaction(rollup+delete)`; re-rollup with rows present keeps totals |
| Document authority for `daily_usage_summary` | ✅ | module table: usage_history authoritative; quota_snapshots secondary |
| `resetDbInstance()` in DB tests | ✅ | beforeEach + after hooks |
| F-05-004 unit tests on temp SQLite | ✅ | 4/4 PASS |
| F-05-005 unit/integration tests | ✅ | 4/4 PASS |
| Related regression suites | ✅ | `db-registered-keys`, `db-registeredKeys-crud`, `database-settings-maintenance` green |
| Combined test run | ✅ | **50 pass, 0 fail** (fresh this session) |
| `npm run typecheck:core` | ✅ | exit 0 (fresh) |
| eslint on touched files | ✅ | exit 0 |
| CHANGELOG Unreleased Fixed entry | ✅ | Task 0050 / F-05-004 / F-05-005 |
| DB ops in db/usage modules only | ✅ | no route SQL |
| Stretch F-05-W2-004 **not** claimed | ✅ | task + CHANGELOG correctly exclude |

## Code Review Detail

### F-05-004 — Registered-key budget window

**Pre-fix class**: SQL reset then compare stale in-memory `row.daily_used` / `row.hourly_used`; increment never reset windows.

**Fix**:

1. `applyRegisteredKeyBudgetWindowReset` persists CASE resets and returns **effective** counters (`dailyUsed`/`hourlyUsed` zeroed in memory when windows flip).
2. `validateRegisteredKey` budgets against `window.dailyUsed` / `window.hourlyUsed` and returns camelCase metadata patched with post-reset values.
3. `incrementRegisteredKeyUsage` single UPDATE: on day/hour flip set counter to `1`, else `+ 1`, always stamp `last_reset_*`.

**Contrast note**: provider/account **issue** quotas already used reset-then-re-SELECT (`maybeResetWindow` + SELECT) — usage budgets were the broken path; now aligned in spirit.

**Residual races**: validate then later increment remain non-atomic TOCTOU (pre-existing, acceptable for this soft budget). Not in exit criteria.

### F-05-005 — Usage history rollup

**Pre-fix class**: additive `ON CONFLICT … total = total + excluded`; rollup then DELETE as separate steps.

**Fix**:

1. `rollupUsageHistoryBeforeDateSync` — replace semantics on conflict.
2. `rollupAndDeleteUsageHistoryBeforeDate` — both steps inside `db.transaction`.
3. `cleanupUsageHistory` calls the transactional helper only.
4. Authority docs + test that usage_history replace overwrites a pre-seeded quota-style summary row.

**Idempotency model**: re-aggregation with same source rows recomputes identical totals (replace). After delete, re-run inserts zero groups → existing summary untouched. Correct for retention.

## Fresh Verification (this session)

```bash
node --import tsx/esm --test \
  tests/unit/registered-key-budget-window-0050.test.ts \
  tests/unit/usage-history-rollup-0050.test.ts \
  tests/unit/db-registered-keys.test.ts \
  tests/unit/db-registeredKeys-crud.test.ts \
  tests/unit/database-settings-maintenance.test.ts
# → 50 pass, 0 fail

npm run typecheck:core   # exit 0
npx eslint src/lib/db/registeredKeys.ts src/lib/usage/aggregateHistory.ts \
  src/lib/db/cleanup.ts tests/unit/registered-key-budget-window-0050.test.ts \
  tests/unit/usage-history-rollup-0050.test.ts   # exit 0
```

## Path To 100 (optional, non-blocking)

1. Remove or rewrite dead `rollup.errors` branch in `cleanupUsageHistory` (rely on throw/rollback only).
2. Optionally lowercase in `rollupDailyUsage` SELECT for key parity with usage_history writer.
3. Optional: unit test that injects a failing delete stub / SQL error inside the transaction and asserts summary + source unchanged after catch.

## Lane Action

- **Moved**: no
- **Patched**: no (review-only)
- **Stay**: `docs/tasks/03-review/0050-omniroute-registered-key-budget-usage-rollup.md`
