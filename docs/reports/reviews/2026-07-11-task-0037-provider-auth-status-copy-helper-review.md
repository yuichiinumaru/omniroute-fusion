# Review Report: Task 0037 — Provider Auth-Status Copy Helper — 2026-07-11

## Review Lineage

- **Current task**: Task 0037 (`omniroute-provider-auth-status-copy-helper`); live path `docs/tasks/03-review/0037-omniroute-provider-auth-status-copy-helper.md`
- **Previous reports read**: none for 0037 (first independent review)
- **Related context**:
  - Epic 0007 planning (`docs/tasks/00-planning/0007-omniroute-provider-connection-auth-status-ux-epic.md`)
  - Downstream already landed: 0038 (ProviderCard wire), 0039 (`formatQuotaAuthErrorMessage` + i18n) — reviewed only as consumers/evidence of helper contract stability, not as 0037 scope
- **Review mode**: `initial-review`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `96/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 100 | Helper path, matrix tests, CHANGELOG, no sidebar, typecheck:core, lint on touched files |
| Binary auth-mode rule | 100 | apikey/`api_key`/`api-key` + `no_refresh_token` never primary OAuth CTA; oauth keeps re-auth; cookie re-paste |
| normalizeAuthType reuse (0032) | 100 | Imports `@/shared/utils/connectionAuthMode` — no duplicated alias table |
| Pure helper / i18n handoff | 99 | No i18n runtime; English defaults + stable `id` + `keys.*` (`connectionStatus.<id>.*`) |
| Unit matrix quality | 98 | All 5 MUST cases + purity + healthy + legacy pre-heal + cookie false-positive |
| Scope discipline | 100 | Commit `8eb791d` only helper + test + CHANGELOG + task; wiring deferred |
| Residual API polish | 90 | Dead `CONNECTION_STATUS_COPY_IDS.expired`; blank/`unknown` auth → OAuth branch (0038 mitigates) |

## Delta Summary

### Resolved Since Previous Review

- n/a (first review)

### Persistent Findings

- none

### Regressions

- none on Task 0037 surfaces

### New Findings

- `NEW` N1 (Low / polish): `CONNECTION_STATUS_COPY_IDS.expired` is exported but never returned; apikey/oauth expiry packs under `apikey_invalid_key` / `oauth_generic_error`
- `NEW` N2 (Info / residual): blank or `unknown` `authType` + error signal routes to OAuth re-auth (documented conservative path). Aligns poorly with `connectionUsesOAuthRefresh` when a static `apiKey` is present but not passed into the helper — 0038 presentation adapters mitigate at wire layer
- `NOTE` N3 (Info): apikey `no_refresh_token` **detail** still contains the words “OAuth refresh token” as a negation (“no … is required”); primary CTA/title/badge stay non-OAuth. Acceptable for operator education; not a contract violation of “primary CTA language”

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: none for 0037 contract (fresh unit + typecheck:core + eslint)
- `EXTERNAL_BLOCKER`: none
- Workspace note: full-repo `tsc` may fail on unrelated `visual-reference/`; `npm run typecheck:core` is green and is the task exit condition

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | NEW | Low | Open (path-to-100) | Unused `expired` copy id | this report | `connectionStatusCopy.ts:29` vs pack paths L227–234 / L265–272 |
| N2 | NEW | Info | Accepted residual | unknown auth → oauth CTA | this report | probe: missing auth + `no_refresh_token` → `oauth_no_refresh_token` / “Re-authenticate” |
| N3 | NEW | Info | Accepted residual | detail negation mentions “refresh token” | this report | apikey nrt detail string L212–213 |
| G1 | — | Guard | Pass | Binary apikey vs oauth CTA | this report | matrix tests 1–4 PASS |
| G2 | — | Guard | Pass | No sidebar / PRIMARY leaf | this report | `8eb791d` file list; no `sidebarVisibility` in commit |
| G3 | — | Guard | Pass | Pure (no i18n/DOM) | this report | imports only `StatusTone` type + `normalizeAuthType` |
| G4 | — | Guard | Pass | 0032 reuse | this report | L16–17, L181 |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Helper at `src/shared/utils/connectionStatusCopy.ts` | ✅ | Present; exports `formatConnectionStatusMessage` → `{ badge, title, detail, cta, tone, id, keys }` |
| Unit matrix via `connection-status-copy*.test.ts` | ✅ | Fresh: **10/10 PASS** (`tests/unit/connection-status-copy.test.ts`) |
| (1) apikey + `no_refresh_token` → no OAuth primary CTA | ✅ | id `apikey_no_refresh_token`; CTA “Retest connection”; legacy lastError ignored for CTA |
| (2) oauth + `no_refresh_token` → re-auth allowed | ✅ | id `oauth_no_refresh_token`; CTA “Re-authenticate”; tone `danger` |
| (3) apikey + 401 / invalid key → rotate key | ✅ | id `apikey_invalid_key`; code/type/msg classifiers covered |
| (4) oauth + `refresh_failed` → refresh/re-auth | ✅ | id `oauth_refresh_failed`; code + `token_refresh_failed` type |
| (5) cookie + error → cookie re-paste | ✅ | id `cookie_update`; also cookie + false `no_refresh_token` |
| Pure helper (no i18n hard dep) | ✅ | English defaults + `keys.*`; purity deepEqual test |
| Reuse `normalizeAuthType` (0032) | ✅ | import from `connectionAuthMode` |
| No `sidebarVisibility` / new PRIMARY items | ✅ | Not in 0037 commit; unrelated dirty working tree on analytics subtitle is **not** this task |
| `typecheck:core` | ✅ | `npm run typecheck:core` exit 0 (fresh) |
| lint on touched files | ✅ | `eslint` on helper + test exit 0 |
| CHANGELOG top Unreleased | ✅ | Added → Provider connection auth-status copy helper (0037) |
| No ProviderCard/Limits wiring in 0037 | ✅ | Wiring in later commits 0038/0039 only |

## Matrix Proof (fresh run)

```text
✔ apikey + no_refresh_token: no refresh-token / OAuth re-auth primary CTA
✔ api_key alias + no_refresh_token: same non-OAuth copy (dual-mode gemini/qoder)
✔ oauth + no_refresh_token: re-auth messaging allowed
✔ apikey + 401 / invalid key: key rotation language
✔ oauth + refresh_failed: refresh / re-auth language
✔ cookie + error: cookie re-paste language
✔ cookie + no_refresh_token false-positive: still cookie language, not OAuth
✔ helper is pure: same input → same output; no thrown i18n dependency
✔ healthy / active connection without error returns healthy copy
✔ legacy apikey false no_refresh_token (pre-heal) uses neutral retest, not OAuth
tests 10 · pass 10 · fail 0
```

### Edge probes (reviewer, not required by task)

| Input | Result id | CTA |
| --- | --- | --- |
| `null` / `{}` | `healthy` | Retest connection |
| missing auth + `no_refresh_token` | `oauth_no_refresh_token` | Re-authenticate |
| `authType: "none"` + `no_refresh_token` | `apikey_no_refresh_token` | Retest connection |
| apikey + `refresh_failed` | `apikey_generic_error` | Retest connection (no OAuth CTA) |

## Implementation Notes (correctness)

- Error signal prefers structured `errorCode` / `lastErrorType` before free-text `lastError` — matches task “How”.
- Apikey branch runs before oauth; cookie short-circuits to re-paste for any non-healthy state — correct for session credentials.
- `auth === "none"` treated as static-credential family (with apikey) — correct vs OAuth re-auth.
- Tones reuse `StatusTone` from `statusVocabulary` (`success` / `warning` / `danger`) — contract alignment for 0038 Badge mapping.
- Downstream `formatQuotaAuthErrorMessage` (0039) is a thin wrapper defaulting missing `errorCode` to `"401"`; does not break 0037 purity/matrix.

## Path to 100

1. **N1** — Either emit `CONNECTION_STATUS_COPY_IDS.expired` for pure-expiry scenarios (apikey/oauth) or drop the dead id + document that expiry collapses into invalid-key / oauth-generic keys for 0039 i18n.
2. **N2 (optional stretch)** — Extend input with optional `apiKey` / `hasStaticCredential` and route `unknown` like `connectionUsesOAuthRefresh` so blank authType + static key never primary-CTAs OAuth *inside* the pure helper (today deferred to 0038 presentation). Add one unit row if implemented.
3. **N3 (optional)** — Soften apikey nrt detail to avoid the substring “refresh token” entirely (e.g. “This API-key connection does not use OAuth re-auth — retest or rotate the key.”) if product wants stricter word ban beyond primary CTA.

None of the above is blocking for S ≥ 90; helper + matrix already satisfy Epic 0007 S1+S5.

## Evidence Reviewed

### Commands run (fresh this review)

```bash
node --import tsx/esm --test tests/unit/connection-status-copy.test.ts
# → 10/10 pass

npx eslint src/shared/utils/connectionStatusCopy.ts tests/unit/connection-status-copy.test.ts
# → exit 0

npm run typecheck:core
# → exit 0

git show --stat 8eb791d
# → CHANGELOG.md, task md, connectionStatusCopy.ts, connection-status-copy.test.ts only
```

### Files inspected

- `src/shared/utils/connectionStatusCopy.ts`
- `tests/unit/connection-status-copy.test.ts`
- `src/shared/utils/connectionAuthMode.ts` (normalizeAuthType)
- `src/shared/constants/statusVocabulary.ts` (StatusTone)
- `CHANGELOG.md` (Unreleased 0037 entry)
- `docs/tasks/03-review/0037-omniroute-provider-auth-status-copy-helper.md`
- Spot: `connectionStatusPresentation.ts` / 0039 limits tests (consumer only)

## Moved / Patched

- **Moved**: no (remain `docs/tasks/03-review/`)
- **Patched**: no (no blocking defects; path-to-100 left as optional polish)

## Verdict Line

**PASS WITH NOTES — 96/100 — stay in `03-review/`**
