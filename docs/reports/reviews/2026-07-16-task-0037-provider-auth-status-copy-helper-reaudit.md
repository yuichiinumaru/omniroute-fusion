# Review Report: Task 0037 — Provider Auth-Status Copy Helper — 2026-07-16 (reaudit)

## Review Lineage

- **Current task**: Task 0037 (`omniroute-provider-auth-status-copy-helper`); live path `docs/tasks/03-review/0037-omniroute-provider-auth-status-copy-helper.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0037-provider-auth-status-copy-helper-review.md` — **96/100** `PASS WITH NOTES` / hold-in-review
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-11-task-0038-provider-auth-status-wire-card-review.md` — consumer of helper contract
  - `docs/reports/reviews/2026-07-11-task-0039-provider-auth-status-limits-i18n-review.md` — `formatQuotaAuthErrorMessage` + i18n keys
- **Review mode**: `re-review` (adversarial reaudit — pure helper scenarios; OAuth vs API-key CTAs not swapped)
- **Reviewer profile**: `reviewers` (Frontend Quality / Code Quality reauditor)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `96/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100` / `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)
- **Delta vs previous**: **0** (contract still green; no regression; residuals unchanged)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Binary auth-mode CTA matrix | 100 | Live probe + 10/10 unit: apikey never primary OAuth re-auth; oauth keeps Re-authenticate |
| Pure helper / keys handoff | 99 | No i18n runtime; stable `id` + `keys.*`; English defaults only |
| normalizeAuthType reuse (0032) | 100 | Still imports `connectionAuthMode` |
| Unit matrix quality | 98 | All MUST cases still green in full 29-suite with 0038/0039 |
| Residual API polish | 90 | Unused `expired` id; blank/`unknown` → oauth branch |

## Delta Summary

### Resolved Since Previous Review

- none required (initial residuals were path-to-100 polish only)

### Persistent Findings

- `PERSISTENT` **N1** (Low): `CONNECTION_STATUS_COPY_IDS.expired` exported and present in EN/i18n catalogs but formatter never returns `id: "expired"` — packs under `apikey_invalid_key` / `oauth_generic_error`
- `PERSISTENT` **N2** (Info): blank / `unknown` `authType` + error signal routes to OAuth re-auth (documented conservative path). Presentation adapters (0038) map card category labels; ConnectionRow still relies on DB `authType`
- `PERSISTENT` **N3** (Info): apikey `no_refresh_token` **detail** still contains educational negation “no OAuth refresh token is required”; primary badge/title/cta remain non-OAuth

### Regressions

- **none**. Binary rule still holds under adversarial probe:
  - apikey / `api_key` / compatible-mapped + `no_refresh_token` → CTA `Retest connection`, badge `Retest`
  - oauth + `no_refresh_token` → CTA `Re-authenticate`, badge `Re-auth`
  - cookie + error / false `no_refresh_token` → `Update cookie`
  - apikey + 401 → `Rotate API key`
  - oauth + `refresh_failed` → `Re-authenticate`
- No `[object Object]` on any of `badge|title|detail|cta|id|tone|keys.*` across null/undefined/`{}` inputs

### New Findings

- none beyond re-confirmation of N1–N3

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: none for pure-helper contract (fresh unit + live import probe)
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Low | Open (path-to-100) | Unused `expired` copy id | 2026-07-11 | `connectionStatusCopy.ts:29` vs pack paths L227–234 / L265–272 |
| N2 | PERSISTENT | Info | Accepted residual | unknown auth → oauth CTA | 2026-07-11 | `normalizeAuthType` → `unknown` → oauth branch L246+ |
| N3 | PERSISTENT | Info | Accepted residual | detail negation mentions refresh token | 2026-07-11 | apikey nrt detail L212–213 |
| G1 | — | Guard | Pass | Binary apikey vs oauth CTA not swapped | this reaudit | matrix + live probe |
| G2 | — | Guard | Pass | Pure (no i18n/DOM/side effects) | this reaudit | imports type + `normalizeAuthType` only |
| G3 | — | Guard | Pass | Downstream consumers still call helper | this reaudit | presentation + ProviderLimits (0038/0039) |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Helper at `src/shared/utils/connectionStatusCopy.ts` | ✅ | Present; exports `formatConnectionStatusMessage` + `formatQuotaAuthErrorMessage` |
| Unit matrix `connection-status-copy*.test.ts` | ✅ | Fresh: **10/10** helper suite; **29/29** with presentation + limits |
| (1) apikey + `no_refresh_token` → no OAuth primary CTA | ✅ | id `apikey_no_refresh_token`; CTA Retest |
| (2) oauth + `no_refresh_token` → re-auth allowed | ✅ | id `oauth_no_refresh_token`; CTA Re-authenticate |
| (3) apikey + 401 / invalid key → rotate | ✅ | id `apikey_invalid_key` |
| (4) oauth + `refresh_failed` → re-auth | ✅ | id `oauth_refresh_failed` |
| (5) cookie + error → cookie re-paste | ✅ | id `cookie_update` |
| Pure helper | ✅ | deepEqual purity test still green |
| Reuse `normalizeAuthType` | ✅ | import from `connectionAuthMode` |
| No sidebar / PRIMARY leaf | ✅ | module has no sidebar imports |
| CHANGELOG | ✅ | Unreleased entry for 0037 still present |

## Evidence Reviewed

- Task file: `docs/tasks/03-review/0037-…`
- Source: `src/shared/utils/connectionStatusCopy.ts`, `connectionAuthMode.ts`
- Tests: `tests/unit/connection-status-copy.test.ts` (+ sibling suites)
- Commands run:
  ```bash
  node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts \
    tests/unit/connection-status-presentation-0038.test.ts
  # → 29 pass / 0 fail
  node --import tsx/esm -e '/* live CTA matrix probe */'
  ```
- Commands not run: full-repo lint / typecheck (helper pure; prior green; no source drift suspected)

## Path To 100

1. **+2** — Either pack true expiry under `CONNECTION_STATUS_COPY_IDS.expired` or drop/document the id + i18n `expired` rows as reserved (closes N1 catalog drift).
2. **+1** — Optional: when `authType` unknown but static key presence is available at call sites, prefer apikey (requires input shape extension; not pure-helper-only).
3. **+1** — Optional: rephrase apikey nrt detail to avoid “OAuth” substring entirely for greppers that ban the word even in negation (N3).

## Task Ledger Patch Suggestion

See task file `Review Ledger` update for 2026-07-16 reaudit score 96, hold-in-review.
