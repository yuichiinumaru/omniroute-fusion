# Review Report: Task 0035 — Dual-Mode Refresh Policy Audit — 2026-07-16 (reaudit)

## Review Lineage

- **Current task**: Task 0035 (`omniroute-dual-mode-refresh-policy-audit`); live path `docs/tasks/03-review/0035-omniroute-dual-mode-refresh-policy-audit.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0035-dual-mode-refresh-policy-audit-review.md` — 93/100, PASS WITH NOTES
- **Related reports considered**: 0032–0034 reaudits (same epic surfaces)
- **Review mode**: `re-review` (adversarial independent re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers)

## Score And Verdict

- **Score**: `90/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — borderline hold; not return-to-doing)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Call-site inventory completeness | 96 | Prod `supportsTokenRefresh(` only def + health (2) |
| Connection-scoped expiry gates | 97 | #5326 uses full `shouldMarkNoRefreshExpired` |
| Manual refresh / test / badge routes | 95 | helpers wired; long-lived skip present |
| Windsurf policy alignment | 88 | health SSoT accepts `imported`; refreshWindsurfToken only `"import"` |
| Hard Rule #12 on touched refresh route | 82 | raw `(error as Error).message` in details still present |
| Test strategy | 86 | Source-regex audit tests; behavioral coverage rides sibling suites |
| Docs accuracy | 96 | RESILIENCE_GUIDE dual-mode section grepped |

## Delta Summary

### Resolved Since Previous Review

- none of F1/F3 path-to-100 items fixed

### Persistent Findings

- `PERSISTENT` F1 (Low → security hygiene): `src/app/api/providers/[id]/refresh/route.ts:158–163` still returns `details: (error as Error).message` — Hard Rule #12 / ERROR_SANITIZATION. Pre-existing; file was in 0035 touch set.
- `PERSISTENT` F3 (Info): `isLongLivedImportCredential` accepts `authMethod: "imported"`; `refreshWindsurfToken` no-ops only on `"import"` (default missing → import). Divergent rare path if PSD stores `"imported"`.
- `PERSISTENT` F2/F4 (Info / OOS accepted): UI + credentialHealth exact `authType === "oauth"|"apikey"` strings — not expiry writers.

### Regressions

- none — inventory re-grep matches prior; 39 epic tests PASS (includes 0035 source suite 6/6).

### New Findings

- `NEW` A1 (Info): Audit suite is almost entirely source-regex (`dual-mode-refresh-policy-audit-0035.test.ts`) — does not exercise refresh/test/token-health HTTP handlers. Acceptable with sibling behavioral suites, but a future “delete import but keep comment” could still pass regex if carefully broken. Prefer one behavioral smoke for refresh 400 on apikey.

- `NEW` A2 (Info): Residual dual-mode-blind **non-expiry** sites still exist (providerLimits, ConnectionsListPanel, credentialHealth scheduler). Correctly OOS for expire path; inventory in task Completion Evidence should keep them listed as accepted residual so they are not “forgotten dual-mode”.

## Call-Site Audit (fresh re-grep)

```bash
rg -n "supportsTokenRefresh\\(" src open-sse
```

| Site | Classification | Verdict |
| --- | --- | --- |
| `tokenRefresh.ts:1665` definition | provider-only OK | PASS + policy JSDoc |
| `tokenHealthCheck.ts:373` #5326 | must use helper | PASS `shouldMarkNoRefreshExpired` |
| `tokenHealthCheck.ts:407` post-RT skip | provider-only OK | PASS |
| refresh route | must use helper | PASS gate + long-lived; **F1 sanitize residual** |
| test route | must use helper | PASS normalize + connection + long-lived |
| token-health route | must use helper | PASS RT + connectionUsesOAuthRefresh |
| create default oauth | foot-gun documented | PASS comment only |

**Policy reconfirmed:** `supportsTokenRefresh(provider)` necessary ≠ sufficient.

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Low | Open | Raw error.message in refresh catch details | refresh/route.ts:158–163 |
| F3 | PERSISTENT | Info | Open | import vs imported long-lived mismatch | connectionAuthMode vs refreshWindsurfToken |
| A1 | NEW | Info | Open | Audit tests source-regex only | dual-mode-refresh-policy-audit-0035.test.ts |
| A2 | NEW | Info | Accepted residual | Non-expiry exact-string authType sites | UI / credentialHealth / providerLimits |
| G1 | Guard | — | Pass | Prod supportsTokenRefresh call sites gated | fresh rg |
| G2 | Guard | — | Pass | Windsurf import no RT stays active | 5326 suite PASS |
| G3 | Guard | — | Pass | Apikey dual-mode not expired by health | matrix PASS |

## Contract Compliance

| Exit | Status | Proof |
| --- | --- | --- |
| Grep inventory in task | ✅ | Completion Evidence + re-grep |
| Dual-mode-blind connection decisions fixed or accepted | ✅ | fixed health/refresh/test/badge; accepted create default + UI OOS |
| Windsurf notes accurate | ✅ | tokenRefresh JSDoc + RESILIENCE_GUIDE L219–251 |
| Tests pass | ✅ | 0035 suite + epic 39/39 |
| CHANGELOG | ✅ | Unreleased dual-mode entries present historically |

## Evidence Reviewed

```bash
rg -n "supportsTokenRefresh\\(" src open-sse
node --import tsx/esm --test \
  tests/unit/connection-auth-mode.test.ts \
  tests/unit/token-health-no-refresh-token-expired-5326.test.ts \
  tests/unit/dual-mode-refresh-policy-audit-0035.test.ts \
  tests/unit/heal-no-refresh-token.test.ts \
  tests/unit/token-health-dual-mode-matrix.test.ts
# 39 pass / 0 fail
```

## Path To 100

1. **F1 (+3)**: `sanitizeErrorMessage` / `buildErrorBody` on refresh catch; drop raw `details`.
2. **F3 (+2)**: Align `refreshWindsurfToken` with `import` **and** `imported` (or drop `"imported"` from helper if unused in product).
3. **A1 (+2)**: One behavioral test: POST refresh on apikey connection → 400 “Only OAuth…”.
4. **A2 (+1)**: Explicit accepted-residual list in docs or task for non-expiry exact-string sites.

## Verdict Summary

**HELD IN REVIEW — 90/100.** Connection-scoped expiry/refresh policy is correct at production call sites; Windsurf long-lived documented and health-gated. Ruthless residuals: error sanitization on touched refresh route, import/imported drift, regex-only audit tests. Score stays ≥90 → remain `03-review/` (not `02-doing/`).
