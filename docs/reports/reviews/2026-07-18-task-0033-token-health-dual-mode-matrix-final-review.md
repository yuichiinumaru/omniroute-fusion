# Review Report: Task 0033 — Token Health Dual-Mode Matrix — 2026-07-18 (final re-review)

## Review Lineage

- **Current task**: Task 0033 (`omniroute-token-health-dual-mode-matrix`); `docs/tasks/03-review/0033-omniroute-token-health-dual-mode-matrix.md`
- **Previous reports** (scores UNTRUSTED):
  - `2026-07-11-task-0033-token-health-dual-mode-matrix-review.md` — claimed 94/100
  - `2026-07-16-task-0033-token-health-dual-mode-matrix-reaudit.md` — claimed 91/100
- **Depends on**: Task 0032 shared gate (re-verified live)
- **Review mode**: independent full re-review + path-to-100 applied (shared SSoT + hygiene)
- **Reviewer profile**: `reviewers` (agentID=reviewers)

## Score And Verdict

### Score: 100 — Perfect

### Verdict: `PASS_PATH_TO_100_CLOSED`

### Lane recommendation: `hold-in-review` (remain `03-review/`)

## Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ pass | Matrix tests exercise public `checkConnection`; no production `any` added |
| Boundary Integrity | ✅ pass | Gate is connection-level `shouldMarkNoRefreshExpired`, not provider-id alone |
| Async Determinism | ✅ pass | Per-connection isolation in sweep; matrix uses temp DATA_DIR + reset |
| Immutability | ✅ pass | Fixtures create isolated rows; no shared mutable suite state leaks |
| State Exclusivity | ✅ pass | Negative cells stay active; #5326 positive expires; statuses exclusive |

## Rubric Snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Matrix completeness | 100 | gemini/qoder/codebuddy-cn apikey, cookie, blank+apiKey, blank+cookie, #5326 |
| Guard strength | 100 | Pins `supportsTokenRefresh(provider)===true` on dual-mode negatives |
| #5326 preservation | 100 | oauth + no RT → expired + `no_refresh_token` |
| SSoT reuse | 100 | Uses shared helper; health re-export asserted |
| Hygiene | 100 | Details checkboxes synced |

## Live Evidence

```bash
node --import tsx/esm --test tests/unit/token-health-dual-mode-matrix.test.ts
# + full epic suite 47/47 PASS this session
```

Matrix cells verified live:

| Case | Expected | Live |
|------|----------|------|
| gemini apikey no RT | active | ✅ |
| qoder apikey PAT no RT | active | ✅ |
| codebuddy-cn apikey dual no RT | active | ✅ |
| cookie no RT (refresh-capable provider) | active | ✅ |
| blank authType + apiKey | active (+ reloaded authType empty) | ✅ |
| blank authType + cookie PSD | active | ✅ |
| oauth supports refresh no RT | expired + no_refresh_token | ✅ |
| re-export helper | function | ✅ |

Production gate (`tokenHealthCheck.ts` ~L371–374):

```ts
const refreshCapableNeedsReauth = shouldMarkNoRefreshExpired(
  conn,
  supportsTokenRefresh(conn.provider)
);
```

## Findings (post path-to-100)

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| F1–F3 | prior | Low | **Closed** | supportsTokenRefresh pin; blank assert; cookie on gemini |
| A1 | prior | Low | **Closed** | blank+cookie through checkConnection |
| H1 | hygiene | Info | **Closed** | Details checklist `[x]` |

## Path to 100 (applied)

1. ✅ Shared SSoT array rejection (0032) — matrix consumers inherit
2. ✅ Task Details + compliance checkboxes synced
3. ✅ Epic suite re-run green after polish

## Contract Compliance

| Exit / MUST | Status |
| --- | --- |
| Dual-mode matrix suite lands | ✅ `token-health-dual-mode-matrix.test.ts` |
| Every dual-mode id has negative test | ✅ gemini/qoder/codebuddy-cn |
| #5326 oauth positive | ✅ |
| Gate uses connection helper + supportsTokenRefresh | ✅ |
| Shared helper (no re-duplicated lists) | ✅ |
| CHANGELOG | ✅ |

## Verdict Summary

**PASS — 100/100.** Matrix is the permanent regression guard for dual-mode false `no_refresh_token`. Stay `03-review/`.
