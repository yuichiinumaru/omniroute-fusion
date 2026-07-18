# Review Report: Task 0034 — Heal False-Positive Apikey `no_refresh_token` — 2026-07-16 (reaudit)

## Review Lineage

- **Current task**: Task 0034 (`omniroute-heal-false-positive-no-refresh-token`); live path `docs/tasks/03-review/0034-omniroute-heal-false-positive-no-refresh-token.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0034-heal-false-positive-no-refresh-token-review.md` — 95/100, PASS WITH NOTES
- **Related reports considered**:
  - Task 0032 SSoT / `isFalsePositiveNoRefreshToken`
  - Task 0035 Windsurf long-lived heal eligibility extension
- **Review mode**: `re-review` (adversarial independent re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers)

## Score And Verdict

- **Score**: `91/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract (domain heal + boot + tests) | 97 | TS domain + instrumentation hook + 6/6 PASS |
| OAuth #5326 non-heal | 98 | github + antigravity fixtures keep expired |
| Error-code filter (not mass active) | 96 | banned / refresh_failed untouched |
| Status / over-broad surface | 86 | Heals any `testStatus` when code matches; no status guard |
| Integration matrix completeness | 88 | cookie / blank / `api_key` alias still pure-helper only |
| Encryption / no raw SQL | 99 | domain get/update only |

## Delta Summary

### Resolved Since Previous Review

- none of prior path-to-100 items fixed

### Persistent Findings

- `PERSISTENT` L1 (Low): JSDoc on `isFalsePositiveNoRefreshToken` still claims Windsurf long-lived rows are “intentionally excluded from the apikey heal path” while implementation **heals** them (`connectionAuthMode.ts:181–197` vs L189–197).
- `PERSISTENT` L2 (Low): Integration suite omits cookie / blank+apiKey / `api_key` alias DB-level heal fixtures.
- `PERSISTENT` INFO: Boot hook has no persistent “already healed” marker — full connection scan each startup (functional idempotency only).

### Regressions

- none — 6/6 heal suite PASS.

### New Findings

- `NEW` A1 (Low): Heal eligibility is **status-agnostic**. Adversarial probe: `{ authType: "apikey", apiKey: "k", errorCode: "no_refresh_token", testStatus: "banned" }` → `isFalsePositiveNoRefreshToken === true` → heal would set `testStatus: "active"` and clear error fields. Product writers do not normally combine `banned` + `no_refresh_token`, but the heal UPDATE is not status-constrained (`healFalsePositiveNoRefresh.ts:51–58` always writes `active`). Prefer require `testStatus ∈ {expired, error, active, null}` or only clear when current code is exclusively `no_refresh_token` **and** status is non-terminal-other-than-expired.

- `NEW` A2 (Info): Boot log / instrumentation comment says “static credentials” / “non-OAuth only”, but long-lived Windsurf **oauth-shaped** rows can heal — comment drift (same family as L1).

### Evidence Gaps

- `EXTERNAL_BLOCKER` / Task 0036: live 21000 before/after counts not re-run (correctly OOS for 0034).

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | PERSISTENT | Low | Open | JSDoc contradicts Windsurf heal | 2026-07-11 | `connectionAuthMode.ts:181–185` vs `:189–197` |
| L2 | PERSISTENT | Low | Open | Missing cookie/blank integration fixtures | 2026-07-11 | `heal-no-refresh-token.test.ts` |
| A1 | NEW | Low | Open | Heal ignores testStatus (banned+no_rt hybrid) | 2026-07-16 | pure probe + update payload |
| A2 | NEW | Info | Open | Boot comment understates oauth long-lived heal | 2026-07-16 | `instrumentation-node.ts:105–116` |
| G1 | Guard | — | Pass | Legitimate oauth #5326 not healed | reaudit | github + mixed tests PASS |
| G2 | Guard | — | Pass | Unrelated error codes not cleared | reaudit | banned / refresh_failed PASS |
| G3 | Guard | — | Pass | No raw SQL on ciphertext | reaudit | domain module only |
| G4 | Guard | — | Pass | Idempotent second run | reaudit | healed === 0 |
| G5 | Guard | — | Pass | Uses SSoT `isFalsePositiveNoRefreshToken` | reaudit | heal L22, L44 |

## Over-broad analysis (adversarial focus)

| Risk | Result |
| --- | --- |
| Heal sets `active` without error_code filter | **No** — predicate requires `no_refresh_token` code **or** type |
| Heal oauth missing RT (github/antigravity) | **No** — tested |
| Heal mass all expired | **No** — only `no_refresh_token` FP class |
| Heal Windsurf long-lived oauth | **Yes intentional** (product FP after 0035) |
| Heal empty credential shells | **No** — `hasStaticCredential` required |
| Heal any status with matching code | **Yes residual** (A1) |

## Contract Compliance

| Exit | Status | Proof |
| --- | --- | --- |
| TS domain `healFalsePositiveNoRefreshConnections` | ✅ | `src/lib/db/healFalsePositiveNoRefresh.ts` |
| get/update domain path | ✅ | no SQL on api_key |
| Shared helper 0032 | ✅ | `isFalsePositiveNoRefreshToken` |
| Boot hook or migration | ✅ | `instrumentation-node.ts` |
| gemini/qoder heal | ✅ | tests PASS |
| MUST NOT heal oauth #5326 | ✅ | tests PASS |
| MUST NOT clear unrelated codes | ✅ | tests PASS |
| Idempotent | ✅ | tests PASS |
| Operator SQL documented | ✅ | task + test header |

## Evidence Reviewed

```bash
node --import tsx/esm --test tests/unit/heal-no-refresh-token.test.ts
# 6/6 PASS
# pure probe: banned+no_rt hybrid → isFalsePositive true
```

Files: heal domain, `connectionAuthMode` eligibility, instrumentation hook, providers update path (null clear).

## Path To 100

1. **L1/A2**: Rewrite JSDoc + boot comments to state long-lived Windsurf/Devin **are** heal-eligible product FPs; legitimate non-import oauth remains excluded.
2. **A1**: Gate heal on `testStatus` not in `{banned, credits_exhausted}` (or only allow `expired` / empty / `active` with stale code).
3. **L2**: Add 1–2 DB integration cases: cookie + blank authType+apiKey heal.
4. Optional: prefilter candidates by error fields before full map (perf).

## Verdict Summary

**HELD IN REVIEW — 91/100.** Heal is not over-broad for the live dual-mode bug class (apikey gemini/qoder); oauth #5326 preserved; no ciphertext SQL. Residual: JSDoc drift, status-agnostic heal edge, incomplete integration matrix. Stay `03-review/`.
