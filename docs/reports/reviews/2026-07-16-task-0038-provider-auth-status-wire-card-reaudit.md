# Review Report: Task 0038 — Wire Auth-Status into ProviderCard — 2026-07-16 (reaudit)

## Review Lineage

- **Current task**: Task 0038 (`omniroute-provider-auth-status-wire-card`); live path `docs/tasks/03-review/0038-omniroute-provider-auth-status-wire-card.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0038-provider-auth-status-wire-card-review.md` — **94/100** `PASS WITH NOTES` / hold-in-review
- **Related reports considered**:
  - Task 0037 helper review + this wave reaudit
  - Task 0039 limits/i18n (keys landed; card still uses English badge strings)
- **Review mode**: `re-review` (adversarial — prove ProviderCard/detail actually call helper; IA redesign did not leave stale OAuth-only paths)
- **Reviewer profile**: `reviewers` (Frontend Quality reauditor)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `95/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100` / `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; not `02-doing/`; not `04-completed/`)
- **Delta vs previous**: **+1** (ProviderListRow post-IA surface verified wired to same helper — no stale OAuth-only list path; residual N1–N4 still open)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Helper not dead module | 100 | ProviderCard + ProviderListRow + ConnectionRow + presentation adapters all call formatter |
| Dual-mode CTA on card chrome | 97 | apikey/compatible/web-cookie never primary OAuth; oauth keeps Re-auth |
| Page stats taxonomy | 98 | `rawErrorCode` / `lastErrorType` / `lastError` / `latestTestStatus` still passed |
| Tests / source guards | 94 | 29/29; ListRow wired live but not in source-guard test |
| Residual aggregation / i18n | 90 | provider-scoped expiry; EN badge until card uses `keys.*` |

## Delta Summary

### Resolved Since Previous Review

- none formally closed by builder since 2026-07-11

### Persistent Findings

- `PERSISTENT` **N1** (Low): `getProviderStats` still derives `expiryStatus` from expiration list filtered by **provider id only**, not the same authType-scoped connection set used for errors
- `PERSISTENT` **N2** (Info): `resolveConnectionErrorDisplay` does not run `mapProviderCardAuthTypeToCredentialMode` (card path does). Safe while DB `connection.authType` stays oauth|apikey|cookie
- `PERSISTENT` **N3** (Info): Card/list badge + tooltip still render helper **English** defaults (`authStatusCopy.badge` / title / detail), not `t(copy.keys.*)` — keys exist under `providers.connectionStatus` (0039) but unused by card chrome
- `PERSISTENT` **N4** (Info): Defensive `{!authStatusCopy && stats.expiryStatus === "expired"}` fallback still effectively dead

### Regressions

- **none** on contract surfaces
- Presentation adapters still pure; CTA matrix re-probed:
  - card apikey + nrt → Retest / Retest connection
  - card oauth + nrt → Re-auth / Re-authenticate
  - card compatible + nrt → apikey path
  - card web-cookie + nrt → Session / Update cookie
  - ConnectionRow apikey rewrites OAuth lastError; oauth keeps raw

### New Findings

- `NEW` **N5** (Info / positive + residual test gap): Later list IA surface `ProviderListRow.tsx` **does** call `resolveProviderCardAuthStatusCopy` with the same stats shape as ProviderCard (not a stale OAuth-only path). Source-guard tests still only assert `ProviderCard.tsx` / `ConnectionRow.tsx` — extend guard to ListRow for regression durability
- `NOTE` **N6** (Info): `page.tsx` uses both `ProviderListRow` (~compact) and `ProviderCard` (~grid); both receive `authType` + stats with taxonomy fields

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: No browser visual smoke of live Providers cards (task allows pure/shape tests)
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Low | Open residual | Expiry chip provider-scoped not authType-scoped | 2026-07-11 | `page.tsx` expiration filter by `providerId` only |
| N2 | PERSISTENT | Info | Open residual | ConnectionRow lacks category→mode map | 2026-07-11 | `resolveConnectionErrorDisplay` vs `toCopyInput` |
| N3 | PERSISTENT | Info | Open residual | EN badge/tooltip; keys unused on card | 2026-07-11 | `ProviderCard.tsx` ~L364–375; `ProviderListRow.tsx` ~L277–283 |
| N4 | PERSISTENT | Info | Accepted | Dead expiredBadge fallback | 2026-07-11 | card + list row |
| N5 | NEW | Info | Open residual | ListRow wired but not source-guarded | this reaudit | `ProviderListRow.tsx:108`; tests only card/row |
| G1 | — | Guard | Pass | Helper not dead | this reaudit | 3 UI call sites + adapters |
| G2 | — | Guard | Pass | No OAuth CTA swap | this reaudit | presentation suite + live probe |
| G3 | — | Guard | Pass | TokenHealthBadge still oauth aggregate | this reaudit | `totalOAuth` label; untouched |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| ProviderCard uses helper | ✅ | `resolveProviderCardAuthStatusCopy` L186–193; badge L364–375 |
| Connection error presentation auth-mode aware | ✅ | `ConnectionRow` L447–455; render ~L582–587 |
| Apikey + nrt no OAuth primary on card | ✅ | presentation tests + live probe |
| OAuth expired still re-auth capable | ✅ | tests + probe |
| 0037 suite green | ✅ | 29/29 combined |
| Wire tests | ✅ | `connection-status-presentation-0038.test.ts` |
| No new PRIMARY sidebar leaf | ✅ | no sidebar imports in wire surfaces |
| CHANGELOG | ✅ | 0038 Unreleased entry present |

## Runtime wiring (verified 2026-07-16)

```
providers/page.tsx getProviderStats
  → stats.{expiryStatus, rawErrorCode, lastErrorType, lastError, latestTestStatus}
  → ProviderCard | ProviderListRow (authType + stats)
       → resolveProviderCardAuthStatusCopy → formatConnectionStatusMessage
       → Badge(English badge) + title tooltip

providers/[id]/ConnectionRow
  → resolveConnectionErrorDisplay → rewrite apikey/cookie false OAuth lastError
```

## Evidence Reviewed

- Source: `connectionStatusPresentation.ts`, `ProviderCard.tsx`, `ProviderListRow.tsx`, `ConnectionRow.tsx`, `providers/page.tsx`
- Tests: presentation-0038 + copy matrix
- Commands: full 29-test suite PASS; live presentation matrix probe PASS

## Path To 100

1. **+2** — Wire card/list badge+title via `useTranslations("providers")` + `copy.keys.*` with English fallback (closes N3; uses 0039 catalog)
2. **+1** — Scope `expiryStatus` to authType-filtered connections / expiration rows (N1)
3. **+1** — Source-guard `ProviderListRow.tsx` in presentation tests (N5); optional ConnectionRow category map (N2)
4. **+1** — Drop dead expiredBadge branch or document as last-resort (N4)

## Task Ledger Patch Suggestion

Score 95, hold-in-review; previous 94 report under Previous Reports.
