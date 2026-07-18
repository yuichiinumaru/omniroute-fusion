# Review Report: Task 0037 — Provider Auth-Status Copy Helper — 2026-07-16 (final-gate)

## Review Lineage

- **Current task**: Task 0037 (`omniroute-provider-auth-status-copy-helper`); live path `docs/tasks/03-review/0037-omniroute-provider-auth-status-copy-helper.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0037-provider-auth-status-copy-helper-review.md` — 96/100 PASS WITH NOTES
  - `docs/reports/reviews/2026-07-16-task-0037-provider-auth-status-copy-helper-reaudit.md` — 96/100 HELD_IN_REVIEW_PATH_TO_100
- **Related reports considered**:
  - 0038 wire-card / 0039 limits-i18n (consumers of helper contract)
- **Review mode**: `final-gate` (independent re-review + path-to-100 application)
- **Reviewer profile**: `reviewers` (agentID=reviewers — Implacable TypeScript / Code Quality)
- **Parent agentID**: `reviewers`
- **Evidence date**: 2026-07-18 (live proof + path-to-100 patches)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` (S = 100 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; lane promotion to `04-completed/` is operator-owned)
- **Delta vs previous reaudit**: **+4** (N1/N3 fixed in prior path-to-100; N2 closed this gate)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Binary auth-mode CTA matrix | 100 | apikey never OAuth primary CTA; oauth keeps re-auth; cookie re-paste |
| Pure helper / keys handoff | 100 | No i18n runtime; stable `id` + `keys.*`; English defaults |
| `normalizeAuthType` reuse (0032) | 100 | Imports `connectionAuthMode` only |
| Unit matrix quality | 100 | 14/14 helper suite (incl. expired id + unknown auth path) |
| Residual polish | 100 | N1 expired id used; N2 unknown no longer invents OAuth CTA; N3 detail free of “OAuth” |

### Axiom compliance (ts-rules)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type safety (no `any` / unsafe `as`) | ✅ | Typed inputs/outputs; only `as const` on id map |
| Async / floating promises | ✅ | Pure sync formatter |
| Error handling | ✅ | Null/undefined input → safe empty object |
| Security (proto / eval) | ✅ | No merge of untrusted objects; no eval |
| Module exports | ✅ | Named exports only |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` **N1**: `CONNECTION_STATUS_COPY_IDS.expired` returned for apikey/oauth true expiry packs (prior 2026-07-18 builder path-to-100)
- `RESOLVED` **N3**: apikey `no_refresh_token` detail no longer contains “OAuth” substring
- `RESOLVED` **N2** (this gate): blank / `unknown` / null `authType` + `no_refresh_token` → neutral Retest path (`apikey_no_refresh_token`); only `refresh_failed` on unknown allows re-auth (token machinery)

### Persistent Findings

- none open

### Regressions

- none. Binary rule still holds under live probe:
  - apikey / `api_key` + `no_refresh_token` → CTA `Retest connection`
  - oauth + `no_refresh_token` → CTA `Re-authenticate`
  - blank/unknown + `no_refresh_token` → CTA `Retest connection` (new)
  - unknown + `refresh_failed` → CTA `Re-authenticate`
  - cookie → `Update cookie`

### New Findings

- none

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: none for pure-helper contract
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | RESOLVED | Low | Closed | expired copy id unused | 2026-07-11 | packs `id: "expired"` for expiry signal |
| N2 | RESOLVED | Info | Closed | unknown→oauth CTA | 2026-07-11 | unknown branch split; tests blank/null/unknown |
| N3 | RESOLVED | Info | Closed | detail OAuth substring | 2026-07-11 | detail EN free of /oauth/i |
| G1 | Guard | — | Pass | Binary apikey vs oauth CTA | this gate | matrix + live probe |
| G2 | Guard | — | Pass | Pure helper | this gate | no i18n/DOM imports |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Helper at `src/shared/utils/connectionStatusCopy.ts` | ✅ | Present; `formatConnectionStatusMessage` + `formatQuotaAuthErrorMessage` |
| Unit matrix `connection-status-copy*.test.ts` | ✅ | **14/14** helper; **35/35** with presentation + limits |
| apikey + `no_refresh_token` → no OAuth primary CTA | ✅ | id `apikey_no_refresh_token` |
| oauth + `no_refresh_token` → re-auth allowed | ✅ | id `oauth_no_refresh_token` |
| apikey + 401 → rotate key | ✅ | id `apikey_invalid_key` |
| oauth + `refresh_failed` → re-auth | ✅ | id `oauth_refresh_failed` |
| cookie + error → cookie language | ✅ | id `cookie_update` |
| Pure (no i18n hard dependency) | ✅ | English defaults + keys only |
| No sidebar leaf | ✅ | No edits to `sidebarVisibility.ts` |
| CHANGELOG entry | ✅ | Unreleased Added |

## Path-to-100 Applied (this gate)

1. Split `auth === "unknown"` from oauth branch in `connectionStatusCopy.ts`.
2. Unknown + `no_refresh_token` / invalid / expired / generic → non-OAuth CTAs.
3. Unknown + `refresh_failed` keeps re-auth (only signal that implies OAuth machinery without explicit authType).
4. Unit tests for blank/null/unknown + `refresh_failed` residual.

## Evidence Reviewed

- Source: `src/shared/utils/connectionStatusCopy.ts`, `connectionAuthMode.ts`
- Tests: `tests/unit/connection-status-copy.test.ts` (+ limits/presentation suites)
- Commands:
  ```bash
  node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts tests/unit/connection-status-presentation-0038.test.ts
  # → 35 pass / 0 fail
  ```
- Live adversarial import probe for blank/unknown/oauth matrix

## Path To 100

- **none remaining** — score 100

## Task Ledger Patch Suggestion

Score `100/100`, verdict `ACCEPTED_100`, remain `03-review/`. Link this report as Latest Review; list reaudit + 2026-07-11 under Previous Reports.
