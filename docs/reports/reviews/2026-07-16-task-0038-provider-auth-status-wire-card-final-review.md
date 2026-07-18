# Review Report: Task 0038 — Wire Auth-Status Copy into ProviderCard — 2026-07-16 (final-gate)

## Review Lineage

- **Current task**: Task 0038 (`omniroute-provider-auth-status-wire-card`); live path `docs/tasks/03-review/0038-omniroute-provider-auth-status-wire-card.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0038-provider-auth-status-wire-card-review.md` — 94/100
  - `docs/reports/reviews/2026-07-16-task-0038-provider-auth-status-wire-card-reaudit.md` — 95/100 HELD_IN_REVIEW_PATH_TO_100
- **Related reports considered**:
  - 0037 helper final-gate (this wave)
  - 0039 limits/i18n catalog consumed by `translateConnectionStatusCopy`
- **Review mode**: `final-gate`
- **Reviewer profile**: `reviewers` (agentID=reviewers)
- **Parent agentID**: `reviewers`
- **Evidence date**: 2026-07-18

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` (remain `03-review/`; no demotion; no auto-promotion)
- **Delta vs previous reaudit**: **+5** (N1–N5 closed by 2026-07-18 path-to-100; re-verified live)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Helper wire (card + list + row) | 100 | `resolveProviderCardAuthStatusCopy` / `resolveConnectionErrorDisplay` |
| Auth-mode CTA on card chrome | 100 | apikey/compatible → Retest; oauth → Re-auth |
| expiryStatus scoping (N1) | 100 | `connectionIds` set per authType-filtered connections |
| i18n badge labels (N3) | 100 | `translateConnectionStatusCopy` + `providers.connectionStatus` keys |
| Source guards (N5) | 100 | ProviderCard + ProviderListRow + ConnectionRow + page.tsx |
| IA / no sidebar leaf | 100 | No `PRIMARY_SIDEBAR_ITEMS` edits |

### Axiom compliance

| Axiom | Status | Notes |
| --- | --- | --- |
| Type safety | ✅ | Presentation adapters typed; no `as T` cast foot-guns |
| Async | ✅ | Pure adapters; React click handlers not part of helper |
| Security | ✅ | No credential dump; rewrites OAuth false lastError only |
| Module design | ✅ | Presentation leaf over pure formatter; named exports |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` **N1**: expiry scoped to authType connection set (`page.tsx` `connectionIds`)
- `RESOLVED` **N2**: ConnectionRow uses `mapProviderCardAuthTypeToCredentialMode`
- `RESOLVED` **N3**: badge/tooltip via `translateConnectionStatusCopy`
- `RESOLVED` **N4**: dead neutral `expiredBadge` fallback removed (auth-status chip only)
- `RESOLVED` **N5**: ProviderListRow source-guarded in presentation tests

### Persistent Findings

- none open for 0038 contract

### Regressions

- none. Presentation suite **12/12** + copy matrix green. Live:
  - compatible + `no_refresh_token` → apikey path
  - ConnectionRow apikey rewrites OAuth lastError sentence
  - ConnectionRow oauth keeps raw re-auth text

### New Findings

- none

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: no React shallow-render of ProviderCard (project pattern documents pure adapters — accepted by task)
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| N1–N5 | RESOLVED | Low–Med | Closed | path-to-100 residuals | page.tsx / ProviderCard / ListRow / ConnectionRow / tests |
| G1 | Guard | — | Pass | no sidebar leaf | source-guard test |
| G2 | Guard | — | Pass | stats taxonomy fields | `rawErrorCode` / `lastErrorType` / `lastError` / `latestTestStatus` |

## Contract Compliance

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| ProviderCard uses helper | ✅ | `resolveProviderCardAuthStatusCopy` + badge render |
| Connection detail auth-mode aware | ✅ | ConnectionRow `resolveConnectionErrorDisplay` |
| Apikey false expiry no OAuth primary | ✅ | presentation tests |
| OAuth expired re-auth capable | ✅ | presentation tests |
| Unit suites green | ✅ | 35/35 combined |
| No PRIMARY_SIDEBAR_ITEMS | ✅ | source guard |
| CHANGELOG | ✅ | Unreleased Added |

## Path-to-100 Applied (this gate)

- No additional production patches required beyond re-verification of 2026-07-18 builder fixes.
- Inherited 0037 unknown-auth fix strengthens ConnectionRow paths that omit authType before DB map.

## Evidence Reviewed

- `connectionStatusPresentation.ts`, `ProviderCard.tsx`, `ProviderListRow.tsx`, `ConnectionRow.tsx`, `providers/page.tsx`
- `tests/unit/connection-status-presentation-0038.test.ts`
- Commands: combined copy/presentation/limits suite → **35 pass**

## Path To 100

- **none remaining** — score 100

## Task Ledger Patch Suggestion

Score `100/100`, `ACCEPTED_100`, remain `03-review/`.
