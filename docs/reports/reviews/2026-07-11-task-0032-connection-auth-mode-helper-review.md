# Review Report: Task 0032 — Connection Auth-Mode Helper — 2026-07-11

## Review Lineage

- **Current task**: Task 0032 (`omniroute-connection-auth-mode-helper`); live path `docs/tasks/03-review/0032-omniroute-connection-auth-mode-helper.md`
- **Previous reports read**: none under `docs/reports/reviews/` for 0032 / connection-auth-mode
- **Related reports considered**: Task 0028 review format (`2026-07-11-task-0028-frontend-ia-theme-micro-adoption-review.md`); Epic 0006 sibling tasks 0033–0035/0037 already consume this module
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `96/100`
- **Verdict**: `PASS WITH NOTES` / `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 99 | Module path, exports, re-export, tests, CHANGELOG all met |
| Behavior preservation (#5326 + matrix) | 98 | apikey/cookie/none/blank+apiKey false; oauth true; #5326 still expires |
| SSoT / condensation quality | 97 | Single module; no duplicate helper in `tokenHealthCheck` |
| Tests | 97 | Pure matrix + re-export regression + #5326 integration all green |
| Scope discipline | 95 | Core 0032 delivered; module also hosts 0034/0035 pure helpers (additive, useful) |
| Hygiene / evidence | 90 | Details subtasks still unchecked; completion evidence test count stale |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none

### Regressions

- none on Task 0032 surfaces

### New Findings

- `NEW` N1 (Low / hygiene): Details section subtasks remain `[ ]` while Exit Conditions are `[x]` and status is Complete — doc drift only.
- `NEW` N2 (Info / hygiene): Completion Evidence claims “10 pure helper + 6 #5326”; live combined run is **13 pure + 7 #5326 = 20** (suite grew with 0034/0035 helpers).
- `NOTE` N3 (Info / accepted): Module includes post-0032 pure helpers (`isLongLivedImportCredential`, `hasStaticCredential`, `isFalsePositiveNoRefreshToken`) used by later epic steps — out of original S1 bullet list but correct condensation home; does not break 0032 contract.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full `npm run typecheck:core` not re-run this session (sibling reviews previously noted unrelated combo WIP). Touched files are pure TS with clean eslint; not treated as S9 failure for 0032.
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | NEW | Low | Open (path-to-100) | Details subtasks unchecked vs exit `[x]` | this report | Task file §Details lines 91–97 still `[ ]` |
| N2 | NEW | Info | Open (path-to-100) | Stale completion evidence test counts | this report | Evidence says 16 total; live 20 |
| N3 | NEW | Info | Accepted residual | Extra epic helpers co-located in SSoT module | this report | `connectionAuthMode.ts:108-208` |
| G1 | — | Guard | Pass | No local duplicate of helper outside SSoT | this report | `rg function connectionUsesOAuthRefresh` → only shared module |
| G2 | — | Guard | Pass | #5326 oauth still marks expired | this report | `shouldMarkNoRefreshExpired` + #5326 suite PASS |
| G3 | — | Guard | Pass | Re-export path for regression imports | this report | `tokenHealthCheck.ts:36-40`; #5326 test uses `tokenHealthCheck.connectionUsesOAuthRefresh` |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Shared module at `src/shared/utils/connectionAuthMode.ts` | ✅ | File present; JSDoc + pure exports |
| `normalizeAuthType` + `connectionUsesOAuthRefresh` exported | ✅ | `connectionAuthMode.ts:39`, `:74` |
| Optional `shouldMarkNoRefreshExpired` | ✅ | `connectionAuthMode.ts:138-153`; used by health #5326 branch |
| `tokenHealthCheck` uses shared helper (no duplicated branch) | ✅ | import + `shouldMarkNoRefreshExpired(conn, supportsTokenRefresh(...))` at L371–374 |
| Public symbol still reachable from health module | ✅ | re-export L36–40; #5326 unit asserts re-export |
| New pure unit tests pass | ✅ | `connection-auth-mode.test.ts` 13/13 PASS (fresh) |
| #5326 regression still green | ✅ | `token-health-no-refresh-token-expired-5326.test.ts` 7/7 PASS (fresh) |
| Preserve boolean matrix | ✅ | apikey/api_key/api-key/cookie/none false; oauth true; blank+apiKey false; blank w/o apiKey true |
| Map `api_key` / `api-key` via normalize | ✅ | `normalizeAuthType` + matrix tests |
| MUST NOT change #5326 true OAuth semantics | ✅ | oauth + supportsRefresh + no RT + active → expired |
| CHANGELOG Unreleased | ✅ | Fixed block Tasks 0032–0034 |
| lint on touched files | ✅ | eslint exit 0 on module + health + pure tests |

## Production Wiring Proof

```
src/shared/utils/connectionAuthMode.ts
  normalizeAuthType
  connectionUsesOAuthRefresh
  shouldMarkNoRefreshExpired
    ↑ import + re-export
src/lib/tokenHealthCheck.ts  (#5326 no-RT branch uses shouldMarkNoRefreshExpired)
    ↑ also re-export for back-compat tests

Downstream consumers (out of 0032 mandatory scope, already live):
  src/app/api/providers/[id]/refresh/route.ts  → connectionUsesOAuthRefresh
  src/app/api/providers/[id]/test/route.ts     → normalizeAuthType + connectionUsesOAuthRefresh
  src/app/api/token-health/route.ts             → connectionUsesOAuthRefresh
  src/shared/utils/connectionStatusCopy.ts      → normalizeAuthType (0037)
```

### Boolean matrix sample (verified by tests)

| Input | `normalizeAuthType` | `connectionUsesOAuthRefresh` |
| --- | --- | --- |
| `authType: "oauth"` | oauth | true |
| `authType: "apikey"` | apikey | false |
| `authType: "api_key"` / `"api-key"` | apikey | false |
| `authType: "cookie"` / `"none"` | cookie / none | false |
| blank + non-empty `apiKey` | unknown | false |
| blank + no `apiKey` | unknown | true |
| null conn | — | false |

### #5326 gate sample (verified)

| Conn | supportsRefresh | `shouldMarkNoRefreshExpired` |
| --- | --- | --- |
| oauth, no RT, active | true | true |
| apikey gemini, no RT | true | false |
| oauth, has RT | true | false |
| oauth, no RT | false | false |
| windsurf long-lived import, no RT | true | false |

## Evidence Reviewed

### Commands run (fresh this review)

```bash
node --import tsx/esm --test \
  tests/unit/connection-auth-mode.test.ts \
  tests/unit/token-health-no-refresh-token-expired-5326.test.ts
# → 20 pass, 0 fail

npx eslint \
  src/shared/utils/connectionAuthMode.ts \
  src/lib/tokenHealthCheck.ts \
  tests/unit/connection-auth-mode.test.ts
# → exit 0
```

### Files inspected

- `src/shared/utils/connectionAuthMode.ts` (full)
- `src/lib/tokenHealthCheck.ts` (imports/re-exports + #5326 branch L350–390)
- `tests/unit/connection-auth-mode.test.ts` (full)
- `tests/unit/token-health-no-refresh-token-expired-5326.test.ts` (re-export + matrix cases)
- `CHANGELOG.md` Unreleased Fixed 0032–0034
- Task file exit conditions + completion evidence

## Path to 100

| # | Action | Effort | Residual after |
| --- | --- | --- | --- |
| 1 | Tick Details subtasks `[x]` (or collapse into Exit Conditions only) | trivial | closes N1 |
| 2 | Refresh Completion Evidence test counts to live 13+7=20 | trivial | closes N2 |
| 3 | Optional: use `hasNonEmptyString` for refreshToken in `shouldMarkNoRefreshExpired` (trim parity with apiKey checks) | tiny | edge polish only |

No functional rework required for S≥90 hold.

## Axiom / Anti-Hallucination Check

| Guardrail | Status |
| --- | --- |
| Do not change true OAuth #5326 expiry | ✅ preserved |
| Do not implement heal SQL / UI badge / gemini ya29 here | ✅ pure helpers only (heal impl is 0034) |
| Path pinned to `src/shared/utils/connectionAuthMode.ts` | ✅ |
| Prefer re-export from `tokenHealthCheck` | ✅ |

## Lane Decision

- **Score 96 ≥ 90** → remain in `docs/tasks/03-review/`
- **Not moved** to `02-doing/`
- **Not moved** to `04-completed/` (human-only)
