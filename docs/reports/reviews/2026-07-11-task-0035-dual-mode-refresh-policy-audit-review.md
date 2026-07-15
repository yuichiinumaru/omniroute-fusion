# Review Report: Task 0035 — Dual-Mode Refresh Policy / supportsTokenRefresh Call-Site Audit — 2026-07-11

## Review Lineage

- **Current task**: Task 0035 (`omniroute-dual-mode-refresh-policy-audit`); live path `docs/tasks/03-review/0035-omniroute-dual-mode-refresh-policy-audit.md`
- **Epic**: 0006 S4 — Dual-Mode Auth / API-Key Refresh Correctness
- **Previous reports read**: none (first independent review of 0035)
- **Related context**: Tasks 0032–0034 (shared helper, dual-mode matrix, heal path) already in `03-review/`
- **Review mode**: `independent-first-review`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 96 | Inventory, gates, Windsurf notes, tests, typecheck, lint, CHANGELOG all met |
| Call-site completeness | 95 | All prod `supportsTokenRefresh(` sites gated correctly; related expiry/refresh/test/badge routes fixed |
| Connection-scoped correctness | 97 | `shouldMarkNoRefreshExpired` + long-lived import; dual-mode apikey matrix green |
| Windsurf long-lived policy | 96 | Code + docs + health regression; minor authMethod `"imported"` vs refresh path |
| Tests / evidence freshness | 95 | 56/56 re-run this session; source-level audit + behavioral matrix |
| Docs accuracy | 96 | RESILIENCE_GUIDE dual-mode section grepped; no fabricated APIs |
| Scope discipline | 94 | Default oauth foot-gun documented not flipped; residual UI/scheduler exact-string OOS |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | RESIDUAL | Low | Open (path-to-100) | Manual refresh catch still returns raw `(error as Error).message` in `details` | `src/app/api/providers/[id]/refresh/route.ts:158-163` — **pre-existing** (blame initial import); file touched by 0035; Hard Rule #12 |
| F2 | RESIDUAL | Info | Accepted OOS | Dashboard still shows Refresh via `conn.authType === "oauth"` exact string | `ConnectionsListPanel.tsx:350-355` — API long-lived skip is correct; UI chrome is Epic 0007 adjacent |
| F3 | RESIDUAL | Info | Open (path-to-100 optional) | `isLongLivedImportCredential` accepts `authMethod: "imported"`; `refreshWindsurfToken` only no-ops on `"import"` | `connectionAuthMode.ts:126` vs `tokenRefresh.ts:469-476` — rare; health still safe (no RT) |
| F4 | RESIDUAL | Info | Accepted OOS | `credentialHealth/scheduler.ts` uses exact `authType === "oauth"\|"apikey"` (no `normalizeAuthType`) | Not an expiry path; may skip `api_key` alias rows from that scheduler only |
| G1 | Guard | — | Pass | Prod `supportsTokenRefresh(` only at definition + tokenHealthCheck #5326 + post-RT catalog skip | Fresh `rg` this session |
| G2 | Guard | — | Pass | #5326 uses `shouldMarkNoRefreshExpired(conn, supportsTokenRefresh(...))` | `tokenHealthCheck.ts:371-374` |
| G3 | Guard | — | Pass | Refresh / test / token-health use connection helpers + long-lived | route files reviewed |
| G4 | Guard | — | Pass | Windsurf health regression: import without RT stays active | test name + 56/56 suite |

## Contract Compliance (Exit Conditions)

| Exit | Status | Live proof |
| --- | --- | --- |
| Grep inventory in Completion Evidence | ✅ | Task table + re-ran `rg -n "supportsTokenRefresh\\(" src open-sse` — only def + `tokenHealthCheck` (2) + tests |
| Dual-mode-blind connection decisions fixed or accepted | ✅ | Fixed: health #5326, refresh, test, token-health. Accepted: create default oauth (comment FOOT-GUN), UI exact-string (OOS) |
| Health + refresh + test + token-health vs 0032 helper | ✅ | All four import/use `connectionAuthMode` helpers |
| Windsurf long-lived notes (accurate, grepped) | ✅ | `tokenRefresh.ts` JSDoc ~L438–476; `RESILIENCE_GUIDE.md` L219–251; windsurf `mapTokens` → `refreshToken: null` |
| Relevant unit tests pass | ✅ | **Fresh** 56 pass / 0 fail (listed suite) |
| `npm run typecheck:core` | ✅ | **Fresh** PASS |
| lint touched files no new errors | ✅ | **Fresh** 0 errors; 8 pre-existing `any` warnings in 5326 test only |
| CHANGELOG at TOP (Unreleased) | ✅ | `CHANGELOG.md` Unreleased → Fixed → Dual-mode refresh policy audit (0035); later 0043 sits above — normal concurrent landing |

## Call-Site Audit (re-verified)

| File:line | Kind | Classification | Reviewer action |
|-----------|------|----------------|-----------------|
| `open-sse/services/tokenRefresh.ts:1665` | definition | provider-only OK | Policy JSDoc present |
| `open-sse/services/tokenRefresh.ts` `refreshWindsurfToken` | long-lived no-op | product path | Comments + import default |
| `src/lib/tokenHealthCheck.ts:371-373` | #5326 expiry | must use helper | **PASS** `shouldMarkNoRefreshExpired` |
| `src/lib/tokenHealthCheck.ts:407` | skip if family unsupported | provider-only OK | After RT present |
| `src/app/api/providers/[id]/refresh/route.ts` | manual refresh | must use helper | **PASS** + long-lived skip |
| `src/app/api/providers/[id]/test/route.ts` | dispatch / reauth copy | must use helper | **PASS** normalize + connection + long-lived |
| `src/app/api/token-health/route.ts` | badge aggregate | must use helper | **PASS** RT + `connectionUsesOAuthRefresh` |
| `src/lib/db/providers.ts:368-378` | create default oauth | foot-gun documented | **PASS** comment only; default unchanged |
| Tests membership asserts | catalog | provider-only OK | Unchanged |

**Policy reconfirmed:** `supportsTokenRefresh(provider)` is necessary but **not sufficient** for connection expiry.

## Fresh Verification Commands

```bash
# Call-site inventory
rg -n "supportsTokenRefresh\\(" src open-sse

# Unit suite claimed by task
node --import tsx/esm --test \
  tests/unit/connection-auth-mode.test.ts \
  tests/unit/token-health-no-refresh-token-expired-5326.test.ts \
  tests/unit/dual-mode-refresh-policy-audit-0035.test.ts \
  tests/unit/heal-no-refresh-token.test.ts \
  tests/unit/token-health-dual-mode-matrix.test.ts \
  tests/unit/service-token-refresh.test.ts \
  tests/unit/codex-manual-refresh-rotating-guard.test.ts
# → 56 pass, 0 fail

npm run typecheck:core
# → PASS

npx eslint <touched files>
# → 0 errors
```

## Path To 100

| Gap | Action | Est. score gain |
| --- | --- | --- |
| F1 | Route refresh catch through `sanitizeErrorMessage` / drop raw `details` | +3 |
| F3 | Align `refreshWindsurfToken` long-lived check with `import` **and** `imported` (or drop `"imported"` from helper if unused) | +2 |
| Optional | One inventory line in task/docs listing UI + credentialHealth exact-string sites as **accepted residual / OOS** | +1 |
| Hygiene | Prefer behavioral assertions over pure source-regex for any future dual-mode gates (audit-0035 already backed by matrix/heal tests) | +1 |

## Open Questions

- None blocking approval.

## Verdict Summary

**PASS WITH NOTES — 93/100.** Exit conditions are met with fresh evidence. Production refresh/expiry/messaging gates for dual-mode and Windsurf long-lived import are connection-scoped. Residual F1 is pre-existing error-sanitization debt on a touched file; F2/F4 are accepted out-of-scope exact-string auth checks outside the expire path. Stay in `03-review/`.
