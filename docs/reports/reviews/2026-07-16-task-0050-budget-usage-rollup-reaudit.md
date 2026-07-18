# Review Report: Task 0050 — Registered-Key Budget Window + Usage Rollup — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0050 (`omniroute-registered-key-budget-usage-rollup`); live path `docs/tasks/03-review/0050-omniroute-registered-key-budget-usage-rollup.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0050-budget-usage-rollup-review.md` — 94/100 PASS WITH NOTES
- **Related reports considered**:
  - `docs/reports/05-lib-data-auth.md` (F-05-004, F-05-005)
- **Review mode**: `re-review` (adversarial; agentID=`reviewers`)
- **Reviewer profile**: `reviewers` (security + code-quality + tsjs; independent re-auditor)

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| F-05-004 post-reset counters | 97 | validate uses `window.*`; increment CASE reset-to-1; day/hour tests green |
| F-05-005 idempotent rollup | 95 | replace ON CONFLICT + UNIQUE idx; transactional rollup+delete |
| Production wiring / attribution | 88 | NEW: validate/increment have **zero** production callers outside exports/tests |
| Dual-writer residual | 90 | N2 casing still open |
| Hygiene | 90 | N1 dead `rollup.errors` branch still present |
| Fresh tests | 96 | 50/50 pass |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` (reconfirmed): F-05-004 — `applyRegisteredKeyBudgetWindowReset` returns post-reset counters; validate budgets against them; increment resets windows before bump.
- `RESOLVED` (reconfirmed): F-05-005 — usage_history rollup uses replace ON CONFLICT; `rollupAndDeleteUsageHistoryBeforeDate` is transactional; cleanup uses it; authority docs present.
- `RESOLVED` (reconfirmed): UNIQUE index `idx_daily_usage_unique` on `(provider, model, date)` exists (migration 048) — ON CONFLICT is valid (live schema probe OK).

### Persistent Findings

- `PERSISTENT` N1 (Low): `cleanupUsageHistory` still branches on `rollup.errors > 0` while sync rollup **throws** (dead branch).
- `PERSISTENT` N2 (Low): `rollupDailyUsage` (quota_snapshots) does not `LOWER(provider/model)`; dual-writer can split keys by casing.
- `PERSISTENT` N3 (Info): no forced mid-transaction failure test.

### Regressions

- none on F-05-004 / F-05-005 unit contracts.

### New Findings

- `NEW` R1 (Medium residual / evidence): **`validateRegisteredKey` and `incrementRegisteredKeyUsage` have no production call sites** outside `src/lib/db/registeredKeys.ts` + `localDb` re-exports + unit tests. Grep of `src/` + `open-sse/` shows only issue/list/revoke/checkQuota APIs — no request-pipeline budget gate. Comment on increment claims “called by request pipeline” but nothing calls it. Function-level fix is correct; **end-to-end false-deny prevention is not exercised in production**.
- `NEW` R2 (Info / pre-existing TOCTOU): validate then later increment remain non-atomic — concurrent requests can overshoot soft budget by 1. Prior review accepted; reconfirmed not exit-criteria.
- `NEW` R3 (Info): day/hour windows use UTC via `toISOString()` — operators in non-UTC locales see midnight flip at UTC day boundary (consistent, but document if product expects local day).

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: no integration test proving registered-key budget is enforced on `/v1/chat/completions` (because no wiring).
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Low | Open | Dead `rollup.errors` branch | 2026-07-11 | `cleanup.ts:100-107` vs throw path |
| N2 | PERSISTENT | Low | Open | Dual-writer casing split | 2026-07-11 | `aggregateHistory.ts:55-69` vs `167-169` |
| N3 | PERSISTENT | Info | Open | No forced txn rollback test | 2026-07-11 | rollup tests re-run only |
| R1 | NEW | Medium residual | Open | Budget validate/increment unwired in pipeline | this re-audit | `rg validateRegisteredKey` → only db + tests + localDb |
| R2 | NEW | Info | Accepted residual | validate/increment TOCTOU soft overshoot | this re-audit | separate calls; SQLite single-writer mitigates partially |
| R3 | NEW | Info | Accepted residual | UTC day boundary | this re-audit | `nowDay`/`nowHour` ISO slice |
| G1–G5 | — | Guard | Pass | Function-level + rollup contracts hold | prior + this | code + 50/50 tests |

## Adversarial Counterexamples (vs prior “covered” claims)

| Prior claim | Counterexample result |
| --- | --- |
| Day-boundary false deny fixed | ✅ Unit: stale yesterday counters → validate allows with dailyUsed=0 |
| Increment resets windows | ✅ Unit: stale 2 → increment → dailyUsed=1 |
| Double rollup does not inflate | ✅ Unit: twice → total_requests=2 |
| Crash between rollup and delete not permanently double-count | ✅ Structure: replace + transaction; re-rollup keeps totals |
| Budget path protects registered keys in product | ⚠️ **No production consumer** of validate/increment (R1) |
| Wrong key attribution | ✅ No cross-key increment path found (id-scoped); moot without callers |
| Dual-writer authority | ⚠️ Documented; casing residual N2 still real |

## Contract Compliance

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Exhausted yesterday allowed new day | ✅ | `registered-key-budget-window-0050` PASS |
| Increment resets day/hour | ✅ | CASE set-to-1 + test PASS |
| Same-day still denied | ✅ | two increments → null |
| Double rollup no inflate | ✅ | usage-history-rollup-0050 PASS |
| Crash-safe rollup+delete | ✅ | transaction + replace; UNIQUE index live |
| Authority documented | ✅ | module table top of `aggregateHistory.ts` |
| resetDbInstance cleanup | ✅ | both test files |
| Combined suite | ✅ | **50 pass / 0 fail** (fresh) |

## Fresh Verification

```text
node --import tsx/esm --test \
  tests/unit/registered-key-budget-window-0050.test.ts \
  tests/unit/usage-history-rollup-0050.test.ts \
  tests/unit/db-registered-keys.test.ts \
  tests/unit/db-registeredKeys-crud.test.ts \
  tests/unit/database-settings-maintenance.test.ts
→ tests 50 · pass 50 · fail 0

Schema probe: idx_daily_usage_unique UNIQUE(provider,model,date) present;
ON CONFLICT replace → total_requests=2 OK.
```

## Path To 100

1. **R1**: Wire `validateRegisteredKey` + `incrementRegisteredKeyUsage` into the auth/request pipeline (or document as library-only API and remove “request pipeline” comment). Add one integration/unit that proves a chat path hits them if wired.
2. **N1**: Delete dead `rollup.errors` branch; rely on throw/catch.
3. **N2**: `LOWER()` in `rollupDailyUsage` SELECT for key parity.
4. Optional: transactional validate+increment helper to close soft TOCTOU.

## Lane Action

- **Moved**: no — stays `docs/tasks/03-review/0050-omniroute-registered-key-budget-usage-rollup.md`
- **Patched**: no production code
- **Score**: 92 (prior 94; −2 for R1 unwired production path honesty)
