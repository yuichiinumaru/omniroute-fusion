# Task 0170: Enable Qoder OAuth via Database/UI Setting

> **Status**: `[~]` In progress — builder wave assigned (`builders`)
> **Priority**: 🟢 P2
> **Type**: `feature`
> **Origin**: Operator request to move Qoder OAuth eligibility from environment variables to a UI feature flag or Database setting.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` with UI Feature Flag / Settings DB changes.
> **Review routing**: independent + frontend-quality + auth review

---

## Objective

Move the `QODER_CONFIG.enabled` eligibility check from strict `process.env` dependencies
to a UI-configurable Feature Flag or Database setting. This allows users to enable
Qoder browser OAuth dynamically without editing `.env` files and restarting the OmniRoute server.

## Background Context

Currently, the `QODER_OAUTH_ENABLED` logic in `src/lib/oauth/constants/oauth.ts` checks
5 environment variables (`QODER_OAUTH_AUTHORIZE_URL`, `TOKEN_URL`, `USERINFO_URL`,
`CLIENT_ID`, `CLIENT_SECRET`). Both the fork and upstream (`references/diegosouzapw-omniroute/`)
share this hardcoded implementation.

## Test Requirements

- Verify the UI setting dynamically enables/disables Qoder OAuth paths.
- Ensure existing environment variables still apply as base configurations if set.
- Ensure the API gate returns standard disabled messaging when turned off.

## Exit Conditions (GDD/TDD)

- [x] New Database setting/Feature flag controls Qoder OAuth availability.
- [x] UI reflects this choice (e.g. in Settings -> Security or Providers -> Qoder).
- [x] Fallback to environment variables works if no DB setting is set.
- [x] `npm run typecheck:core` passes.

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do NOT expose `QODER_OAUTH_CLIENT_SECRET` to the frontend when implementing the configuration modal.

## 📋 Completion Evidence

- **Files modified**:
  - `src/shared/constants/featureFlagDefinitions.ts` (added `QODER_OAUTH_ENABLED` feature flag definition under security category)
  - `src/shared/utils/featureFlags.ts` (added `isQoderOAuthFeatureFlagEnabled` helper)
  - `src/lib/db/settings.ts` (added Qoder OAuth defaults: `qoderOAuthEnabled`, `qoderOAuthAuthorizeUrl`, `qoderOAuthTokenUrl`, `qoderOAuthUserInfoUrl`, `qoderOAuthClientId`, `qoderOAuthClientSecret`)
  - `src/shared/validation/settingsSchemas.ts` (added Qoder OAuth properties to `updateSettingsSchema`)
  - `src/app/api/settings/route.ts` (redacted `qoderOAuthClientSecret` in both `GET` and `PATCH`/`PUT` responses to prevent secret exposure to frontend, returning `hasQoderOAuthClientSecret`)
  - `src/lib/oauth/constants/oauth.ts` (implemented dynamic resolution for Qoder OAuth configuration, getters/setters on `QODER_CONFIG`, and fallback to env variables)
  - `open-sse/services/tokenRefresh.ts` (updated `refreshQoderToken` to check `resolveQoderOAuthEnabled()` at the top, immediately returning `null` with 0 network fetch calls when disabled, and using dynamic resolvers `resolveQoderOAuthTokenUrl`, `resolveQoderOAuthClientId`, `resolveQoderOAuthClientSecret` from `src/lib/oauth/constants/oauth.ts`)
  - `src/app/(dashboard)/dashboard/settings/components/SecurityTab.tsx` (added Qoder Browser OAuth configuration card with toggle, custom URLs, client ID, and secure secret input)
  - `src/app/(dashboard)/dashboard/providers/[id]/components/QoderOAuthSettingsModal.tsx` (created dedicated Qoder OAuth configuration modal for provider detail view)
  - `src/app/(dashboard)/dashboard/providers/[id]/components/ProviderModalsPanel.tsx` (wired and imported `QoderOAuthSettingsModal` for `providerId === 'qoder'`)
  - `src/i18n/messages/en.json` (added feature flag description translation)
  - `docs/reference/FEATURE_FLAGS.md` (documented `QODER_OAUTH_ENABLED` flag)
  - `tests/unit/feature-flags-settings.test.ts` (updated flag count to 39 and added test coverage for `QODER_OAUTH_ENABLED`)
  - `tests/unit/qoder-oauth-db-setting.test.ts` (added 19 comprehensive unit tests covering DB settings, feature flag overrides, env fallback, API routes, GET/PATCH/PUT secret redaction, dynamic token refresh resolution, unconfigured skip, explicit DB disable + env fallback short-circuit with 0 fetch calls, feature flag disable short-circuit with 0 fetch calls, and UI modal wiring)

- **Tests**:
  - `npm run typecheck:core`: PASS (0 errors)
  - `node --import tsx/esm --test tests/unit/qoder-oauth-db-setting.test.ts tests/unit/qoder-oauth-config.test.ts tests/unit/feature-flags-settings.test.ts`: PASS (69/69 tests passing, 0 failed, 0 skipped)
  - `npx eslint src/app/api/settings/route.ts src/app/(dashboard)/dashboard/providers/[id]/components/ProviderModalsPanel.tsx open-sse/services/tokenRefresh.ts tests/unit/qoder-oauth-db-setting.test.ts src/shared/constants/featureFlagDefinitions.ts src/shared/utils/featureFlags.ts src/lib/db/settings.ts src/shared/validation/settingsSchemas.ts src/lib/oauth/constants/oauth.ts src/app/(dashboard)/dashboard/settings/components/SecurityTab.tsx src/app/(dashboard)/dashboard/providers/[id]/components/QoderOAuthSettingsModal.tsx tests/unit/feature-flags-settings.test.ts tests/unit/qoder-oauth-config.test.ts`: PASS (0 errors, 0 warnings)

- **Changelog**: Canonical entry `.changelog/20260814-142036-0170-enable-qoder-oauth-via-db-setting-builders.md` updated with verification check; `CHANGELOG.md` rebuilt (78 entries).
- **Agent/date**: `builders` / 2026-08-14

## 🎯 Path-to-100 Closure Matrix

| Issue / Finding | Priority | Fix Implemented | Acceptance Evidence | Status |
|---|---|---|---|---|
| Blocker 1: PATCH/PUT `/api/settings` returns secret | P0 | Redacted `qoderOAuthClientSecret` from `PATCH`/`PUT` response payloads in `src/app/api/settings/route.ts`, returning `hasQoderOAuthClientSecret: boolean`. | Dedicated unit tests assert `body.qoderOAuthClientSecret === undefined` and `body.hasQoderOAuthClientSecret === true` for both PATCH and PUT. | **CLOSED** |
| Blocker 2: Unwired `QoderOAuthSettingsModal` | P0 | Imported and wired `QoderOAuthSettingsModal` in `src/app/(dashboard)/dashboard/providers/[id]/components/ProviderModalsPanel.tsx` for `providerId === 'qoder'`. | Static composition and graph usage verified with non-zero incoming references and dedicated unit test. | **CLOSED** |
| High: DB/feature-flag settings do not reach token refresh | P1 | Updated `refreshQoderToken` in `open-sse/services/tokenRefresh.ts` to consume dynamic resolvers (`resolveQoderOAuthTokenUrl`, `resolveQoderOAuthClientId`, `resolveQoderOAuthClientSecret`). | Unit test verifies mock fetch call targets DB-configured tokenUrl with Basic auth containing DB clientId:clientSecret. | **CLOSED** |
| Medium: Changelog verification checkbox open | P1 | Checked `- [x]` in `.changelog/20260814-142036-0170-enable-qoder-oauth-via-db-setting-builders.md` and ran `rebuild.sh build`. | Rebuilt `CHANGELOG.md` reflects updated entry. | **CLOSED** |
| High: Disabled DB setting / feature flag does not gate token refresh | P1 | Added `if (!resolveQoderOAuthEnabled()) { log?.warn?.(...); return null; }` at the top of `refreshQoderToken` in `open-sse/services/tokenRefresh.ts` to fail closed before resolving endpoint/credentials or issuing fetch requests. | Unit tests assert that when `qoderOAuthEnabled: false` (or feature flag disabled) with environment credentials set, `refreshQoderToken` returns `null` with 0 fetch calls made. Independent runtime probe also returned `resultIsNull: true, fetchCalls: 0`. | **CLOSED** |

## 🔁 Review/Fix Ledger

- **Execution Engineer session/task ID**: `ses_ffed9a3f3ffeBbpRxzZgowFsdl`
- **Execution Reviewer session/task ID**: `ses_ffeb4daceffelhiWqGxZt3dNry`
- **Initial report / score**: `docs/reports/review/20260814-task-0170-final-review.md` — `78/100`, `REJECTED`
- **Re-review report / score**: `docs/reports/review/20260814-task-0170-rereview.md` — `94/100`, `REJECTED`
- **Final re-review report / score**: `docs/reports/review/20260814-task-0170-final-review.md` — `100/100`, **APPROVED**
- **Fix routing:** Fixed by `builders` — all findings addressed, including the enabled-state guard in `refreshQoderToken`, verified with 69 passing unit tests (including DB-disabled and FF-disabled env-var regression tests), clean typecheck, clean scoped eslint, zero LSP diagnostics, and an independent runtime probe showing zero fetches when disabled. Approved for promotion to `03-review/`.

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer:** `builders` (independent reviewer)
- **Verdict:** **APPROVED** — all prior findings resolved; Qoder OAuth enablement now controls browser authorization and token refresh, with fail-closed disabled behavior.
- **Score:** **100/100**
- **Previous report:** [`docs/reports/review/20260814-task-0170-rereview.md`](../../reports/review/20260814-task-0170-rereview.md)
- **Final report:** [`docs/reports/review/20260814-task-0170-final-review.md`](../../reports/review/20260814-task-0170-final-review.md)
- **Promotion:** **Promoted** to `docs/tasks/03-review/0170-omniroute-qoder-oauth-db-flag.md`.
- **Evidence:** 69/69 focused tests passed; `npm run typecheck:core` passed with 0 errors; scoped ESLint passed with 0 errors/0 warnings; corrected files had zero LSP diagnostics; index health was 100%; independent DB-disabled + env-configured probe returned `resultIsNull: true` and `fetchCalls: 0`.
