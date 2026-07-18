# Review Report: Task 0033 — Token Health Dual-Mode Matrix — 2026-07-16 (reaudit)

## Review Lineage

- **Current task**: Task 0033 (`omniroute-token-health-dual-mode-matrix`); live path `docs/tasks/03-review/0033-omniroute-token-health-dual-mode-matrix.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0033-token-health-dual-mode-matrix-review.md` — 94/100, PASS WITH NOTES
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-11-task-0032-connection-auth-mode-helper-review.md` — shared gate
  - `docs/reports/reviews/2026-07-16-task-0032-connection-auth-mode-helper-reaudit.md` — A1 blank+cookie residual
- **Review mode**: `re-review` (adversarial independent re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers)

## Score And Verdict

- **Score**: `91/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit MUST matrix | 97 | gemini/qoder/codebuddy-cn/cookie/blank/#5326 all present |
| Connection-level gate (not provider-only) | 98 | `shouldMarkNoRefreshExpired` + `supportsTokenRefresh` |
| Counterexample strength | 84 | F1 supportsTokenRefresh pin still missing; cookie cell non-refresh provider |
| Production path correctness | 97 | Only writer of `no_refresh_token` is health #5326 branch |
| Test isolation | 96 | temp DATA_DIR, resetDbInstance, after cleanup |
| Evidence freshness | 96 | Fresh matrix 7/7 + 5326 7/7 + helper 13/13 |

## Delta Summary

### Resolved Since Previous Review

- none of prior path-to-100 items were implemented (expected — hold path)

### Persistent Findings

- `PERSISTENT` F1 (Low): Dual-mode negative cells do **not** assert `supportsTokenRefresh(provider) === true` for gemini/qoder/codebuddy-cn — removal from refresh catalog would leave tests green while the dual-mode bug class becomes untestable.
- `PERSISTENT` F2 (Info): Blank-authType fixture does not assert reloaded `authType` is blank/empty after force-update.
- `PERSISTENT` F3 (Info): Cookie cell uses `chatgpt-web` (`supportsTokenRefresh` false) — weak counterfactual for cookie + refresh-capable family.
- `PERSISTENT` F4 (Info): Details checklist hygiene.

### Regressions

- none — all matrix cells still pass.

### New Findings

- `NEW` A1 (Info / linked to 0032): Matrix does **not** cover blank authType + cookie PSD (only blank + apiKey). Prior claim of “cookie path covered” is only `authType: "cookie"`, not the blank+cookie classification residual. Not a contract miss for 0033’s written MUST table, but a missing counterexample for the shared gate.

### Evidence Gaps

- `EVIDENCE_GAP`: 21000 still lacks gate until Task 0036 deploy — unit matrix is source of truth for workspace.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Low | Open | No pin `supportsTokenRefresh===true` on dual-mode negatives | 2026-07-11 | `token-health-dual-mode-matrix.test.ts` L66–106 |
| F2 | PERSISTENT | Info | Open | Blank fixture weak authType assert | 2026-07-11 | L122–146 |
| F3 | PERSISTENT | Info | Open | Cookie on non-refresh provider | 2026-07-11 | chatgpt-web L108–119 |
| A1 | NEW | Info | Open | No blank+cookie matrix cell | 2026-07-16 | matrix file; 0032 reaudit A1 |
| G1 | Guard | — | Pass | Gate is connection-scoped | reaudit | `tokenHealthCheck.ts:371–374` |
| G2 | Guard | — | Pass | SQL oauth filter still enforced | reaudit | sweep L312 + filter unit test PASS |
| G3 | Guard | — | Pass | #5326 oauth still expires | reaudit | matrix L150–170 + 5326 suite |
| G4 | Guard | — | Pass | Single production writer of `no_refresh_token` | reaudit | `rg errorCode: "no_refresh_token"` → only `tokenHealthCheck.ts` |

## Contract Compliance

| MUST | Status | Proof |
| --- | --- | --- |
| qoder apikey stays active | ✅ | matrix PASS |
| codebuddy-cn apikey dual-mode stays active | ✅ | matrix PASS |
| cookie + blank+apiKey no OAuth expiry | ✅ | matrix PASS (cookie via authType) |
| oauth #5326 expires | ✅ | matrix + 5326 PASS |
| gemini apikey regression | ✅ | matrix + 5326 PASS |
| Shared helper (no local authType lists in health) | ✅ | import `shouldMarkNoRefreshExpired` |
| Gate uses helper **and** `supportsTokenRefresh` | ✅ | L371–374 |

## Evidence Reviewed

```bash
node --import tsx/esm --test \
  tests/unit/token-health-dual-mode-matrix.test.ts \
  tests/unit/token-health-no-refresh-token-expired-5326.test.ts \
  tests/unit/connection-auth-mode.test.ts
# combined epic suite: 39 pass / 0 fail
rg -n 'errorCode:\s*"no_refresh_token"' src open-sse
# production write only tokenHealthCheck.ts
```

## Path To 100

1. **F1**: In each dual-mode negative test, `assert.equal(supportsTokenRefresh("gemini"|"qoder"|"codebuddy-cn"), true)` before `checkConnection`.
2. **F2**: After blank force-update, assert `!reloaded.authType` or empty string.
3. **F3 / A1 (pick one)**: Cookie on a refresh-capable id **or** blank+cookie PSD through `checkConnection` as explicit counterexample.
4. Hygiene F4: check Details subtasks.

## Verdict Summary

**HELD IN REVIEW — 91/100.** Required dual-mode matrix cells exist and pass; production #5326 writer is correctly connection-gated. Prior residual test-strength gaps remain unfixed. Stay `03-review/`.
