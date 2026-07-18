# Review Report: Task 0039 — ProviderLimits / i18n Auth-Status Copy — 2026-07-16 (final-gate)

## Review Lineage

- **Current task**: Task 0039 (`omniroute-provider-auth-status-limits-i18n`); live path `docs/tasks/03-review/0039-omniroute-provider-auth-status-limits-i18n.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0039-provider-auth-status-limits-i18n-review.md` — 94/100
  - `docs/reports/reviews/2026-07-16-task-0039-provider-auth-status-limits-i18n-reaudit.md` — 94/100 HELD_IN_REVIEW_PATH_TO_100
- **Related reports considered**:
  - 0037 final-gate (unknown auth residual closed — was N4 accepted residual)
  - 0038 final-gate (providers.connectionStatus consumers)
- **Review mode**: `final-gate`
- **Reviewer profile**: `reviewers` (agentID=reviewers)
- **Parent agentID**: `reviewers`
- **Evidence date**: 2026-07-18

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` (remain `03-review/`)
- **Delta vs previous reaudit**: **+6** (N1–N3/N5 prior path-to-100; N4 closed via 0037 unknown-auth fix)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| ProviderLimits 401 auth-mode copy | 100 | `formatQuotaAuthErrorMessage` + conn authType |
| No hard-coded OAuth suffix | 100 | source-guard test |
| CTA + detail on error row (N1) | 100 | `detail — cta` a11y string |
| i18n EN + locale sync | 100 | full id×field under usage + providers |
| `__MISSING__` strip (N2) | 100 | unit-tested `translateUsageOrFallback` |
| expired id (N3) | 100 | shared with 0037 |

### Axiom compliance

| Axiom | Status | Notes |
| --- | --- | --- |
| Type safety | ✅ | Helper pure; UI uses typed tr callback |
| Async / races | ✅ | fetchQuota 401 path sets state then returns; no TOCTOU on copy |
| Security | ✅ | No stack/credential leak in 401 message path |
| i18n integrity | ✅ | Sentinel strip prevents `__MISSING__:` operator chrome |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` **N1**: 401 row surfaces translated detail + CTA
- `RESOLVED` **N2**: `translateUsageOrFallback` hit/miss/`__MISSING__` unit-tested
- `RESOLVED` **N3**: formatter packs true expiry under `expired` id
- `RESOLVED` **N5**: ProviderCard/ListRow consume `providers.connectionStatus` (0038)
- `RESOLVED` **N4**: blank/unknown auth no longer invents OAuth re-auth (0037 final path-to-100)

### Persistent Findings

- none open

### Regressions

- none. Limits suite green; EN matrix complete; residual re-auth grep only oauth EN defaults + backend oauth routes (deferred by task design).

### New Findings

- none

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: none for 401 path contract
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| N1–N5 | RESOLVED | Low–Med | Closed | path-to-100 residuals | ProviderLimits + limits tests + EN keys |
| G1 | Guard | — | Pass | no OAuth hard-code suffix | source-guard |
| G2 | Guard | — | Pass | EN key matrix full | limits test EN i18n |

## Contract Compliance

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| ProviderLimits uses helper for 401 | ✅ | `formatQuotaAuthErrorMessage` L420+ |
| Residual re-auth grepped | ✅ | usage widget clean; oauth EN defaults only |
| EN keys under usage/providers | ✅ | all 10 ids × 4 fields |
| Locale sync | ✅ | `i18n:sync-ui` evidence in task |
| Unit suites green | ✅ | 9 limits + 14 helper |
| No sidebar leaf | ✅ | by design |
| CHANGELOG | ✅ | Unreleased Added |

## Path-to-100 Applied (this gate)

- No additional ProviderLimits production patches required.
- 0037 unknown-auth fix closes remaining N4 accepted residual at shared helper boundary.

## Evidence Reviewed

- `ProviderLimits/index.tsx`, `i18nFallback.ts`, `connectionStatusCopy.ts` (`formatQuotaAuthErrorMessage`)
- `tests/unit/connection-status-copy-limits.test.ts`
- EN `usage.connectionStatus` + `providers.connectionStatus` key probe
- Commands: combined suite **35 pass**

## Path To 100

- **none remaining** — score 100

## Task Ledger Patch Suggestion

Score `100/100`, `ACCEPTED_100`, remain `03-review/`.
