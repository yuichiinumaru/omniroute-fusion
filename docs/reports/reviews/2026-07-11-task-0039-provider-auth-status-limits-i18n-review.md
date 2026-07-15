# Review Report: Task 0039 — ProviderLimits / Widgets + i18n Auth-Status — 2026-07-11

## Review Lineage

- **Current task**: Task 0039 (`omniroute-provider-auth-status-limits-i18n`); live path `docs/tasks/03-review/0039-omniroute-provider-auth-status-limits-i18n.md`
- **Previous reports read**: none (first formal review for 0039)
- **Related reports / deps considered**:
  - Epic 0007 S1 helper: `src/shared/utils/connectionStatusCopy.ts` (Task 0037)
  - Task 0038 ProviderCard wire (parallel; intentionally left to that task)
- **Review mode**: `initial-review`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `94/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 96 | All MUST exits met; residual greps deferred with reason |
| Auth-mode copy correctness | 97 | apikey/cookie never get OAuth re-auth suffix; oauth keeps re-auth |
| i18n (EN + locale sync) | 95 | Full id×field matrix under `usage` + `providers`; locales via sync + `__MISSING__` strip |
| ProviderLimits wiring | 94 | 401 path uses helper + `connectionsRef.authType` + `tr(keys.detail)` |
| Tests / verification | 96 | 18/18 copy matrix+limits; typecheck:core; eslint touched files |
| Scope discipline | 98 | No sidebar leaf; ProviderCard left to 0038; API oauth messages deferred |
| a11y / tone polish | 88 | Error is textual; CTA/badge/tone not separately surfaced on limits cards |

## Findings

### Blocking

- none

### Non-blocking (path-to-100)

| ID | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- |
| N1 | Low | 401 UI uses only `detail` text; helper `cta` / `badge` / `tone` not rendered on ProviderLimits cards | `ProviderLimits/index.tsx:420-433`; cards render `{error}` string only (`ProviderLimitCard.tsx:124-128`) | Optional: append/translate `copy.keys.cta` or map `copy.tone` → statusVocabulary surface classes for clearer next-action + tone alignment |
| N2 | Low | No dedicated unit test for `translateUsageOrFallback` `__MISSING__:` strip | `i18nFallback.ts:24-29`; only limits copy + EN key tests cover i18n | Add 2–3 pure tests: missing key → fallback; `__MISSING__:EN` → stripped EN; normal hit → translated |
| N3 | Info | `CONNECTION_STATUS_COPY_IDS.expired` catalog + EN keys exist but formatter never returns `id: "expired"` (maps to apikey/oauth scenario packs) | `connectionStatusCopy.ts:29` vs packs at 227–272 | Either emit `expired` id where semantically correct, or document catalog as reserved; not a 401-suffix regression |
| N4 | Info | `unknown` / missing `authType` falls through to OAuth re-auth language (conservative) | `normalizeAuthType` → `unknown` → oauth branch | Acceptable given limits filter only lists `oauth`/`apikey` rows (`index.tsx:560`); optional: pass full conn into `connectionUsesOAuthRefresh` when wiring more widgets |

### Explicit non-issues (verified)

| Guard | Status | Proof |
| --- | --- | --- |
| Hard-coded OAuth suffix removed from ProviderLimits | ✅ | Source assert in `connection-status-copy-limits.test.ts`; rg no `re-authenticate this account` under usage dashboard |
| Residual re-auth greps | ✅ | Usage widgets clean; API `test`/`refresh` oauth expiry messages deferred with reason (backend oauth-correct); ProviderCard = 0038 |
| ProviderQuotaWidget | ✅ | Cached quotas only; no hard-coded re-auth suffix |
| EN i18n keys (10 ids × badge/title/detail/cta × usage+providers) | ✅ | `en.json` `usage.connectionStatus` + `providers.connectionStatus`; unit test asserts presence |
| Locale sync | ✅ | 42 locale files; non-EN keys present as `__MISSING__:<en>` per project `i18n:sync-ui` |
| `__MISSING__` operator UX | ✅ | `translateUsageOrFallback` strips sentinel → EN text |
| No new sidebar leaf | ✅ | No `PRIMARY_SIDEBAR_ITEMS` touch in task surfaces |
| CHANGELOG | ✅ | `[Unreleased]` → **Added** top entry for Task 0039 |
| Tests | ✅ | `node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts` → **18/18 PASS** (re-run this review) |
| typecheck:core | ✅ | `npm run typecheck:core` exit 0 (re-run this review) |
| lint touched files | ✅ | eslint on 4 touched paths exit 0 |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| ProviderLimits auth-mode-aware 401 copy | ✅ | `formatQuotaAuthErrorMessage` + `tr(copy.keys.detail, fallbackMsg)` |
| Related usage widgets grepped / fixed / deferred | ✅ | Usage clean; Widget no-op justified; API deferred in evidence |
| EN keys under providers/usage | ✅ | Full matrix; unit test locks it |
| Additional locales follow convention | ✅ | sync-ui + `__MISSING__` + strip |
| `connection-status-copy*.test.ts` pass | ✅ | 18/18 |
| New limits-focused tests pass | ✅ | 8 limits tests in `connection-status-copy-limits.test.ts` |
| typecheck:core | ✅ | pass |
| lint no new errors on touched files | ✅ | pass |
| No default-visible sidebar leaf | ✅ | no sidebar churn |
| CHANGELOG at TOP | ✅ | Unreleased Added |

## Path to 100

1. **+3** — Surface translated `cta` (and optionally tone-aligned classes) on the 401 error row so apikey vs oauth next actions are button/label explicit, not only prose in `detail` (closes N1; strengthens a11y objective).
2. **+2** — Unit-test `translateUsageOrFallback` for `__MISSING__` strip + key-miss fallback (closes N2).
3. **+1** — Resolve or document unused `expired` copy id vs formatter mapping (closes N3 catalog drift).

None of the above are required for merge of the contract; residual risk is polish only.

## Open Questions

- none blocking approval

## Verdict

**PASS WITH NOTES** — Score **94**. Task stays in `docs/tasks/03-review/`. Not moved to `02-doing/` (S ≥ 90). Not moved to `04-completed/` (human-only).

### Commands re-run this review

```bash
node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts   # 18/18 PASS
npm run typecheck:core                                                   # PASS
npx eslint --max-warnings=999 \
  src/shared/utils/connectionStatusCopy.ts \
  src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.tsx \
  src/app/(dashboard)/dashboard/usage/components/ProviderLimits/i18nFallback.ts \
  tests/unit/connection-status-copy-limits.test.ts                       # exit 0
```
