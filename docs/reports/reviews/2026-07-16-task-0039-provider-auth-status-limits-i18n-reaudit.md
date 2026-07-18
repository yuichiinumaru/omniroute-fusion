# Review Report: Task 0039 — ProviderLimits / Widgets + i18n — 2026-07-16 (reaudit)

## Review Lineage

- **Current task**: Task 0039 (`omniroute-provider-auth-status-limits-i18n`); live path `docs/tasks/03-review/0039-omniroute-provider-auth-status-limits-i18n.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0039-provider-auth-status-limits-i18n-review.md` — **94/100** `PASS WITH NOTES` / hold-in-review
- **Related reports considered**:
  - Task 0037 helper + Task 0038 card wire (siblings)
- **Review mode**: `re-review` (adversarial — limits/widgets + i18n keys resolve; no `[object Object]` / missing keys; no stale OAuth suffix)
- **Reviewer profile**: `reviewers` (Frontend Quality reauditor)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `94/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100` / `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; not demote; not complete)
- **Delta vs previous**: **0** (limits 401 still helper-backed; EN+locale matrix intact; residual polish open)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| ProviderLimits 401 auth-mode copy | 97 | `formatQuotaAuthErrorMessage` + `connectionsRef.authType` + `tr(keys.detail)` |
| i18n EN + locales | 96 | 10 ids × 4 fields under usage + providers; 42 locales; no missing ids |
| No OAuth suffix on apikey | 100 | source assert + runtime matrix |
| `[object Object]` / key resolve safety | 98 | string-only catalog; `__MISSING__` strip in `translateUsageOrFallback` |
| Residual polish | 88 | CTA/tone unused on limits row; no unit test for strip; card ignores providers keys |

## Delta Summary

### Resolved Since Previous Review

- none formally closed

### Persistent Findings

- `PERSISTENT` **N1** (Low): 401 UI uses only translated `detail`; helper `cta` / `badge` / `tone` not rendered on limits cards
- `PERSISTENT` **N2** (Low): No dedicated unit test for `translateUsageOrFallback` `__MISSING__:` strip (behavior verified manually this reaudit)
- `PERSISTENT` **N3** (Info): `expired` catalog id never returned by formatter (catalog + EN keys still present)
- `PERSISTENT` **N4** (Info): missing/`unknown` authType → OAuth language (limits visible set filters oauth|apikey only ~L557–560)

### Regressions

- **none**
- Hard-coded `` `${errorMsg} — re-authenticate this account.` `` still absent from ProviderLimits
- EN matrix still covers every `CONNECTION_STATUS_COPY_IDS` value including unused `expired`
- All 42 locales have full `usage.connectionStatus` + `providers.connectionStatus` trees (0 missing ids/fields this reaudit)
- pt-BR sample: `"__MISSING__:Upstream rejected…"` — strip yields clean English, never sentinel / `[object Object]`

### New Findings

- `NEW` **N5** (Info): `providers.connectionStatus.*` keys remain **unconsumed** by ProviderCard/ProviderListRow (still English helper defaults). 0039 exit required landing keys under providers/usage — met. End-to-end card i18n is epic path-to-100 (ties 0038 N3), not a 0039 contract fail
- `NOTE` **N6** (Info): Residual “re-authenticate this account” only in oauth EN defaults + API test/refresh routes + educational comments — usage dashboard clean

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: No live quota-401 browser smoke against apikey vs oauth connections
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Low | Open | detail-only 401 UI; cta/tone unused | 2026-07-11 | `ProviderLimits/index.tsx:420-433` |
| N2 | PERSISTENT | Low | Open | no unit test for `__MISSING__` strip | 2026-07-11 | `i18nFallback.ts:24-29` |
| N3 | PERSISTENT | Info | Open | expired id unused by formatter | 2026-07-11 | copy helper + en.json |
| N4 | PERSISTENT | Info | Accepted residual | unknown auth → oauth | 2026-07-11 | helper + limits filter |
| N5 | NEW | Info | Open residual | providers keys unused by card chrome | this reaudit | keys in en.json; card uses English |
| G1 | — | Guard | Pass | No hard-coded OAuth suffix in limits | this reaudit | source assert + rg |
| G2 | — | Guard | Pass | EN keys resolve to strings | this reaudit | python + limits test |
| G3 | — | Guard | Pass | Locale strip path safe | this reaudit | pt-BR probe |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| ProviderLimits auth-mode-aware 401 | ✅ | `formatQuotaAuthErrorMessage` + `tr(copy.keys.detail, fallbackMsg)` |
| Related widgets grepped / deferred | ✅ | usage clean; ProviderQuotaWidget no-op justified; API oauth deferred |
| EN keys under providers/usage | ✅ | full matrix unit-tested |
| Additional locales convention | ✅ | 42 files; `__MISSING__:<en>` + strip |
| copy matrix + limits tests | ✅ | 18 helper+limits tests within 29 combined PASS |
| typecheck/lint (builder claim) | ✅* | not re-run full typecheck this reaudit; pure wiring unchanged |
| No sidebar leaf | ✅ | no PRIMARY churn on task surfaces |
| CHANGELOG | ✅ | 0039 Unreleased entry |

\* Full `typecheck:core` claimed green at completion and prior review; reaudit focused on wiring/i18n/tests.

## i18n resolve proof

| Check | Result |
| --- | --- |
| `usage.connectionStatus.<id>.{badge,title,detail,cta}` for all helper ids | present EN |
| `providers.connectionStatus.*` same matrix | present EN |
| 42 locales nested structure | 0 missing |
| Values are strings (not objects) | verified |
| Non-EN `__MISSING__:` strip | `translateUsageOrFallback` → EN body |
| Helper keys path `connectionStatus.<id>.detail` under `useTranslations("usage")` | matches nest |

## Evidence Reviewed

- `ProviderLimits/index.tsx` 401 branch
- `i18nFallback.ts`
- `connectionStatusCopy.ts` `formatQuotaAuthErrorMessage`
- `src/i18n/messages/en.json` + locale sample pt-BR
- `tests/unit/connection-status-copy-limits.test.ts`
- Commands: 29-test suite PASS; locale structure scan; strip simulation

## Path To 100

1. **+3** — Surface translated CTA (and optional tone) on 401 error row (N1 / a11y next-action)
2. **+2** — Unit-test `translateUsageOrFallback` for miss / `__MISSING__` / hit (N2)
3. **+1** — Align `expired` id or document reserved (N3)
4. **Epic optional** — ProviderCard/ListRow consume `providers.connectionStatus` via keys (N5 / 0038 N3)

## Task Ledger Patch Suggestion

Score 94, hold-in-review; previous 94 report under Previous Reports.
