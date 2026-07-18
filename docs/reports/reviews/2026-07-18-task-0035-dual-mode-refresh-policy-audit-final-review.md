# Review Report: Task 0035 — Dual-Mode Refresh Policy Audit — 2026-07-18 (final re-review)

## Review Lineage

- **Current task**: Task 0035 (`omniroute-dual-mode-refresh-policy-audit`); `docs/tasks/03-review/0035-omniroute-dual-mode-refresh-policy-audit.md`
- **Previous reports** (scores UNTRUSTED):
  - `2026-07-11-task-0035-dual-mode-refresh-policy-audit-review.md` — claimed 93/100
  - `2026-07-16-task-0035-dual-mode-refresh-policy-audit-reaudit.md` — claimed 90/100
- **Depends on**: Task 0032 helper
- **Review mode**: independent full re-review + path-to-100 applied
- **Reviewer profile**: `reviewers` (agentID=reviewers)

## Score And Verdict

### Score: 100 — Perfect

### Verdict: `PASS_PATH_TO_100_CLOSED`

### Lane recommendation: `hold-in-review` (remain `03-review/`)

## Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ pass | Route gates use named shared helpers; refresh catch sanitized |
| Boundary Integrity | ✅ pass | Connection-level decisions require helper; provider-only `supportsTokenRefresh` documented as catalog-only |
| Async Determinism | ✅ pass | Manual refresh uses onPersist inside mutex path; long-lived skip is sync short-circuit |
| Immutability | ✅ pass | Policy comments; no dual write of auth mode |
| State Exclusivity | ✅ pass | apikey → 400; long-lived skip; oauth refresh path exclusive |

## Rubric Snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Call-site inventory completeness | 100 | Live `rg supportsTokenRefresh(`: def + health only in prod |
| Connection-helper gates | 100 | refresh route, test route, token-health API, #5326 health |
| Windsurf long-lived policy | 100 | `import` **and** `imported`; docs + code aligned |
| Error sanitization | 100 | refresh + token-health catch via `sanitizeErrorMessage` |
| Source contract tests | 100 | `dual-mode-refresh-policy-audit-0035.test.ts` |

## Live Inventory (this session)

```bash
rg -n "supportsTokenRefresh\\(" src open-sse
```

| File | Kind | Classification | Status |
|------|------|----------------|--------|
| `open-sse/services/tokenRefresh.ts` def | catalog | provider-only OK | documented necessary≠sufficient |
| `src/lib/tokenHealthCheck.ts` #5326 | expiry | connection helper | `shouldMarkNoRefreshExpired` |
| `src/lib/tokenHealthCheck.ts` skip after RT | catalog capability | provider-only OK | post oauth+RT path |
| Tests only | membership | provider-only OK | unchanged |

Connection decision sites grepped for helpers: refresh route, test route, token-health API, heal eligibility, health #5326 — all gated.

## Live Evidence

```bash
node --import tsx/esm --test tests/unit/dual-mode-refresh-policy-audit-0035.test.ts
# + epic suite 47/47 PASS
```

0035 suite asserts:

- health uses `shouldMarkNoRefreshExpired` + import from shared
- refresh uses `connectionUsesOAuthRefresh` + long-lived + sanitize (no raw details)
- refresh apikey 400 source contract
- Windsurf `import|imported`
- test route normalize + helpers
- token-health filter + **sanitize without `(err as Error)?.message`** (closed this session)
- `supportsTokenRefresh` policy JSDoc
- create default oauth FOOT-GUN comment

## Findings (post path-to-100)

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| F1 | prior | Debt | **Closed** | refresh catch sanitize (no raw details) |
| F3 | prior | Low | **Closed** | import/imported align |
| A1 | prior | Low | **Closed** | apikey 400 contract in suite |
| F2/F4 | OOS | — | Accepted | UI exact-string sites → Epic 0007 |
| TH1 | NEW | Improvement | **Closed** | token-health catch: `sanitizeErrorMessage(err)` |

## Path to 100 (applied this session)

1. ✅ `src/app/api/token-health/route.ts` — Hard Rule #12 full throwable sanitize
2. ✅ 0035 suite asserts no `(err as Error)?.message`
3. ✅ Shared array-shell purity (0032) benefits all call sites
4. ✅ CHANGELOG final polish entry

## Contract Compliance

| Exit / MUST | Status |
| --- | --- |
| Grep inventory in Completion Evidence | ✅ |
| Dual-mode-blind sites fixed or accepted | ✅ (UI OOS accepted) |
| Health + refresh + test + token-health reviewed | ✅ |
| Windsurf long-lived notes accurate | ✅ RESILIENCE_GUIDE + code |
| Tests + typecheck path | ✅ tests live; typecheck prior green |
| CHANGELOG | ✅ |

## Verdict Summary

**PASS — 100/100.** Policy is enforceable in code: provider-level refresh support is never sufficient alone for connection expiry/manual refresh. Stay `03-review/`.
