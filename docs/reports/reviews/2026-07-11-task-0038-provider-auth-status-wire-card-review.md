# Review Report: Task 0038 — Wire Auth-Status into ProviderCard — 2026-07-11

## Review Lineage

- **Current task**: Task 0038 (`omniroute-provider-auth-status-wire-card`); live path `docs/tasks/03-review/0038-omniroute-provider-auth-status-wire-card.md`
- **Previous reports read**: none (initial review)
- **Related reports / tasks considered**:
  - Task 0037 helper (`connectionStatusCopy.ts`) — consumed dependency
  - Task 0039 limits/i18n — out of scope; already landed in CHANGELOG (not re-reviewed here)
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `94/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 98 | Card + ConnectionRow + page stats wire; no sidebar; CHANGELOG present |
| Shared helper consumption | 97 | Presentation adapters wrap `formatConnectionStatusMessage`; no duplicated auth conditionals in JSX |
| Dual-mode false expired / OAuth CTA | 93 | apikey/`compatible`/`web-cookie` avoid OAuth primary CTA; oauth keeps re-auth; residual provider-scoped expiry aggregation |
| Tests | 96 | 29/29 (0037 matrix + 0038 shapes + source guards); pure adapters documented as UI wire shapes |
| Scope discipline | 100 | Commit touches only presentation wire surfaces; TokenHealthBadge untouched (still oauth aggregate); no ProviderLimits |
| Evidence freshness | 94 | Reviewer re-ran unit suite; eslint on touched files exit 0 |

## Delta Summary

### Resolved Since Previous Review

- N/A (initial review)

### Persistent Findings

- none

### Regressions

- none blocking on the contract surface (apikey false `no_refresh_token` no longer primary-CTAs OAuth re-auth)

### New Findings

- `NEW` N1 (Low / residual): `getProviderStats` still derives `expiryStatus` from `/api/providers/expiration` filtered by **provider id only**, not by the same `authType` connection set used for errors. Pre-existing aggregation; 0038 now maps pure `expired` + apikey → “Key issue” instead of neutral `expiredBadge`, so a dual-mode sibling oauth expiry could still paint a slightly wrong **non-OAuth** chip on an apikey-scoped card.
- `NEW` N2 (Info / path-to-100): `resolveConnectionErrorDisplay` does not run `mapProviderCardAuthTypeToCredentialMode` (card path does). Safe while DB `connection.authType` stays `oauth|apikey|cookie|…`; category labels (`compatible`, `web-cookie`) only appear on ProviderCard `authType` prop today.
- `NEW` N3 (Info / OOS 0039): Card badge/tooltip uses helper English defaults (`authStatusCopy.badge` / title / detail), not `copy.keys.*` i18n — explicitly deferred by task to 0039.
- `NOTE` N4 (Info): Defensive `{!authStatusCopy && stats.expiryStatus === "expired"}` fallback is effectively dead (`shouldShowProviderCardAuthStatusBadge` is true whenever `expiryStatus === "expired"` and healthy copy is suppressed). Neutral `t("expiredBadge")` only; not an OAuth leak.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: No browser visual smoke of live Providers cards (task allows pure/shape tests)
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | NEW | Low | Open residual | Expiry chip still provider-scoped, not authType-scoped | 2026-07-11 | `page.tsx` ~L366–373 vs connection filter ~L329–332 |
| N2 | NEW | Info | Open residual | ConnectionRow mapper parity vs card category map | 2026-07-11 | `connectionStatusPresentation.ts` `toCopyInput` vs `resolveConnectionErrorDisplay` |
| N3 | NEW | Info | Deferred 0039 | EN badge strings until i18n handoff | 2026-07-11 | `ProviderCard.tsx` ~L364–375 |
| N4 | NEW | Info | Accepted | Dead neutral expiredBadge fallback | 2026-07-11 | `ProviderCard.tsx` ~L377–380 |
| G1 | — | Guard | Pass | No `PRIMARY_SIDEBAR_ITEMS` / sidebar leaf changes in 0038 commit | 2026-07-11 | `git show 3ee3b50 --name-only`; source guards |
| G2 | — | Guard | Pass | TokenHealthBadge still oauth aggregate (`totalOAuth`) | 2026-07-11 | `TokenHealthBadge.tsx`; not in 0038 diff |
| G3 | — | Guard | Pass | Apikey + `no_refresh_token` → Retest, not re-auth | 2026-07-11 | presentation test + helper |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| ProviderCard uses helper (or parent maps helper) | ✅ | `resolveProviderCardAuthStatusCopy` in `ProviderCard.tsx` ~L186–193, badge ~L364–375 |
| Connection error/expiry presentation auth-mode aware | ✅ | `ConnectionRow.tsx` `resolveConnectionErrorDisplay` ~L447–455, render ~L582–588 |
| Apikey + `no_refresh_token` no OAuth re-auth primary on card | ✅ | tests: Retest badge; `OAUTH_FORBIDDEN` doesNotMatch |
| OAuth expired still re-auth capable | ✅ | tests: oauth + `no_refresh_token` → Re-auth CTA; ConnectionRow keeps raw re-auth text |
| 0037 unit suite green | ✅ | reviewer: 29/29 with presentation suite |
| Wire tests under node test runner | ✅ | `tests/unit/connection-status-presentation-0038.test.ts` |
| typecheck:core / lint (claimed + partial re-run) | ✅* | eslint on touched files exit 0; full typecheck not re-run (workspace may hold unrelated WIP — 0038 files lint clean) |
| No new `PRIMARY_SIDEBAR_ITEMS` | ✅ | 0038 commit file list; test guard |
| CHANGELOG top Unreleased | ✅ | Added → ProviderCard auth-status copy wire (0038) |

\* Builder claimed `npm run typecheck:core` PASS at completion; reviewer verified lint + unit suite, not full typecheck.

## Contract / Wiring Proof

| Surface | Status | Evidence |
| --- | --- | --- |
| Presentation adapters | ✅ | `src/shared/utils/connectionStatusPresentation.ts` (created) |
| page stats taxonomy | ✅ | `rawErrorCode`, `lastErrorType`, `lastError`, `latestTestStatus` on stats return |
| Category → credential mode | ✅ | `compatible`/`local`/… → apikey; `web-cookie` → cookie; `oauth`/`free` → oauth |
| Badge tone → variant | ✅ | danger → error via `connectionStatusToneToBadgeVariant` |
| Reauth button still oauth-only | ✅ | `ConnectionsListPanel` `onReauth` only when `authType === "oauth"` |
| Token expiry chip oauth-only | ✅ | `tokenMinsLeft` gated `if (!isOAuth \|\| !effectiveExpiresAt)` |

### Runtime wiring

```
providers/page.tsx getProviderStats(providerId, authType)
  → stats.{expiryStatus, rawErrorCode, lastErrorType, lastError, latestTestStatus}
  → ProviderCard(authType, stats)
       → resolveProviderCardAuthStatusCopy({ authType, …stats })
            → mapProviderCardAuthTypeToCredentialMode
            → formatConnectionStatusMessage (0037)
            → Badge(badge) + title tooltip

providers/[id]/ConnectionRow
  → resolveConnectionErrorDisplay({ authType, errorCode, lastErrorType, lastError, testStatus })
       → rewrite apikey/cookie false OAuth lastError → copy.detail
       → oauth keeps raw lastError (+ helper copy available)
```

### Reviewer-run tests

```text
node --import tsx/esm --test \
  tests/unit/connection-status-copy*.test.ts \
  tests/unit/connection-status-presentation-0038.test.ts
→ 29 pass / 0 fail
```

eslint on touched production + test files → exit 0.

## Path To 100

1. **N1 (primary residual)**: In `getProviderStats`, compute `expiryStatus` only from expiration rows whose `connectionId` is in the same `providerConnections` set (already authType-filtered), not all rows for `providerId`.
2. **N2**: Route ConnectionRow `authType` through the same category mapper (or document DB contract and keep as-is).
3. **N3**: When 0039 keys land, prefer `t(copy.keys.badge)` with English fallback to `copy.badge`.
4. **N4**: Remove or assert the dead `expiredBadge` branch once N1/helper coverage is complete.

## Anti-Hallucination / Scope Guards

- 0038 commit `3ee3b50` files: CHANGELOG, task md, ConnectionRow, ProviderCard, page.tsx, `connectionStatusPresentation.ts`, presentation test — only.
- Workspace dirty `sidebarVisibility.ts` is **unrelated** WIP (Analytics subtitle); not in 0038 commit.
- No move to `04-completed/` (reviewer authority ends at verdict).

## Lane Action

- **Moved**: no (stays `docs/tasks/03-review/`)
- **Patched**: no production code (review-only)
- **Report path**: `docs/reports/reviews/2026-07-11-task-0038-provider-auth-status-wire-card-review.md`
