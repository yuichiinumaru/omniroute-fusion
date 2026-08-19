# Task 0171: Trae Provider Connector Fixes

> **Status**: `[~]` In progress — builder wave assigned (`builders`)
> **Priority**: 🟢 P2
> **Type**: `bug fix`
> **Origin**: Investigation findings: Double prefixing (`tr/minimax-m3`) causes 502/4001, missing `trae_id` in `publicCreds.ts` violates Hard Rule #11.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — Only touches `TraeExecutor` and `publicCreds`.
> **Review routing**: independent + provider/catalog review

---

## Objective

1. Add prefix stripping (`replace(/^tr\//, "")`) in `TraeExecutor.resolveMode` to
   prevent 502/4001 empty config errors from Trae's upstream API.
2. Restore the `resolvePublicCred("trae_id")` usage in `TraeExecutor.refreshCredentials`
   for Hard Rule #11 compliance, removing the `"en1oxy7wnw8j9n"` inline literal.

## Background Context

When a client sends `tr/minimax-m3`, `TraeExecutor.resolveMode()` passes it raw.
Trae upstream expects `minimax-m3`. This results in `trae 4001: config item is empty`.

In token refresh logic, the fork diverged from upstream reference (`diegosouzapw-omniroute`)
by hardcoding the client ID literal.

## Test Requirements

- Before making changes, inject a failing test proving `tr/minimax-m3` fails and `resolvesMode` correctly strips the prefix.
- Ensure `trae_id` is re-added safely to `open-sse/utils/publicCreds.ts`.

## Exit Conditions (GDD/TDD)

- [x] Double `tr/` prefix is stripped before upstream dispatch.
- [x] Literal client ID string removed, using `resolvePublicCred`.
- [x] `node --import tsx/esm --test tests/unit/trae-*.test.ts` passes.
- [x] `npm run typecheck:core` passes.

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do NOT create a dummy test endpoint for Trae in `src/app/api/providers/[id]/test/route.ts`
> as upstream has not implemented supported Trae tests.

## 📋 Completion Evidence

- **Files modified / created**:
  - `open-sse/utils/publicCreds.ts` (added `trae_id` XOR-masked embedded default)
  - `open-sse/executors/trae.ts` (added prefix stripping in `resolveMode`, used `resolvePublicCred("trae_id", "TRAE_OAUTH_CLIENT_ID")` in `refreshCredentials`)
  - `src/app/authorize/parseCallback.ts` (used `resolvePublicCred("trae_id")` for default `clientId`)
  - `src/shared/components/TraeAuthModal.tsx` (used `resolvePublicCred("trae_id")` for `TRAE_CLIENT_ID` constant)
  - `tests/unit/trae-executor.test.ts` (added tests for `tr/` prefix stripping and default `clientId` resolution; cleaned up test typings to zero warnings)
  - `tests/unit/trae-publiccred.test.ts` (suite validating `trae_id` decoding, env override, and source literal absence in both `trae.ts` and `TraeAuthModal.tsx`)
  - `tests/unit/publicCreds.test.ts` (added shape check for `trae_id`)
  - `.changelog/20260814-142036-0171-trae-provider-connector-fixes-builders.md` (updated changes and checked verification box)

- **Tests output**:
  ```bash
  $ node --import tsx/esm --test tests/unit/trae-*.test.ts tests/unit/publicCreds.test.ts
  ✔ resolvePublicCred('gemini_id') returns a Google OAuth client ID format (1.005643ms)
  ✔ resolvePublicCred('gemini_alt') returns a GOCSPX-style client secret (0.13591ms)
  ✔ resolvePublicCred('antigravity_id') returns a Google OAuth client ID format (0.151ms)
  ✔ resolvePublicCred('antigravity_alt') returns a GOCSPX-style client secret (0.10381ms)
  ✔ resolvePublicCred('windsurf_fb') returns an AIza-style Google API key (0.15645ms)
  ✔ resolvePublicCred('trae_id') returns Trae OAuth client ID format (0.179991ms)
  ✔ encode/decode roundtrip is stable across arbitrary plaintexts (0.478861ms)
  ✔ decodePublicCred passes raw Google-style values through unchanged (retrocompat) (0.115771ms)
  ✔ decodePublicCred returns empty string for nullish/empty inputs (0.1265ms)
  ✔ resolvePublicCred prefers env override over embedded default (0.295601ms)
  ✔ resolvePublicCredMulti picks the first non-empty env name (0.278141ms)
  ✔ decoded values are stable across calls (0.13413ms)
  ✔ buildHeaders uses Cloud-IDE-JWT auth scheme + web client headers (0.993103ms)
  ✔ non-stream: accumulates plan_item.thought and maps usage (5.93311ms)
  ✔ manual model → manual strategy + model_name passed through (0.791782ms)
  ✔ model with tr/ prefix strips prefix for upstream dispatch (0.764002ms)
  ✔ model "tr/work" strips tr/ prefix (0.767242ms)
  ✔ model "work" → work session mode (0.694182ms)
  ✔ model "auto" stays in code mode (0.633082ms)
  ✔ stream emits OpenAI chunks with [DONE] (1.114273ms)
  ✔ upstream error event surfaces as 502 (0.919262ms)
  ✔ session create failure returns 502 (0.518212ms)
  ✔ refreshCredentials posts ExchangeToken (0.772372ms)
  ✔ refreshCredentials defaults ClientID using resolvePublicCred (0.304191ms)
  ✔ refreshCredentials returns null when no refresh token is stored (0.114081ms)
  ✔ refreshCredentials throws on RefreshTokenInvalid (0.617981ms)
  ✔ refreshCredentials keeps the old refresh token when upstream omits a new one (0.25471ms)
  ✔ parseTraeCallbackQuery extracts the full credential bundle (0.332561ms)
  ✔ parseTraeCallbackQuery returns an error when userJwt is missing (0.133691ms)
  ✔ parseTraeCallbackQuery returns an error when userJwt is invalid (0.1346ms)
  ✔ parseTraeCallbackQuery falls back to flat refresh fields (0.147411ms)
  ✔ trae_id embedded default decodes to the public Trae OAuth client_id (1.008702ms)
  ✔ TRAE_OAUTH_CLIENT_ID env override wins (0.313441ms)
  ✔ trae.ts no longer embeds the raw client_id literal (0.311751ms)
  ✔ TraeAuthModal.tsx no longer embeds the raw client_id literal (0.189701ms)
  ℹ tests 35 | pass 35 | fail 0 | duration_ms 921.075035

  $ npm run typecheck:core
  > omniroute@3.8.42 typecheck:core
  > tsc --pretty false -p tsconfig.typecheck-core.json
  # Clean (0 errors)

  $ npx eslint open-sse/executors/trae.ts open-sse/utils/publicCreds.ts src/app/authorize/parseCallback.ts src/shared/components/TraeAuthModal.tsx tests/unit/trae-executor.test.ts tests/unit/trae-publiccred.test.ts tests/unit/publicCreds.test.ts
  # Clean (0 errors, 0 warnings)
  ```

- **Changelog Draft**:
  - `fix(trae)`: strip `tr/` provider prefix in `TraeExecutor.resolveMode` to prevent upstream 502/4001 empty config errors on `tr/minimax-m3`
  - `security(trae)`: resolve Trae OAuth client ID via `resolvePublicCred("trae_id")` across `trae.ts`, `parseCallback.ts`, and `TraeAuthModal.tsx` instead of inline string literals (Hard Rule #11 compliance)

- **Changelog**: Canonical entry `.changelog/20260814-142036-0171-trae-provider-connector-fixes-builders.md` verified and updated; `CHANGELOG.md` rebuilt (78 entries).
- **Agent/date**: `builders` / 2026-08-14

## 🎯 Path-to-100 Closure Matrix

| Priority | Item | Required Action | Status | Resolution Evidence |
|---|---|---|---|---|
| P0 | Hard Rule #11 in Browser Auth | Remove raw Trae client ID literal from `src/shared/components/TraeAuthModal.tsx` and resolve via `resolvePublicCred("trae_id")`. | ✅ CLOSED | `TraeAuthModal.tsx:8` now imports and calls `resolvePublicCred("trae_id")`. Grep confirms zero occurrences of raw literal `en1oxy7wnw8j9n` across `src/` and `open-sse/`. |
| P0 | Regression Assertion Expansion | Add assertion verifying `TraeAuthModal.tsx` does not embed the raw client ID string literal. | ✅ CLOSED | `tests/unit/trae-publiccred.test.ts` contains dedicated test verifying `TraeAuthModal.tsx` contains no raw literal and uses `resolvePublicCred("trae_id")`. Passes cleanly. |
| P1 | Changelog Verification Checkbox | Check verification item in `.changelog/20260814-142036-0171-trae-provider-connector-fixes-builders.md` after running verification commands. | ✅ CLOSED | Box marked `[x]` with updated change summary. |
| P2 | Test-only ESLint Warnings | Clean up `@typescript-eslint/no-explicit-any` warnings in test helpers. | ✅ CLOSED | `tests/unit/trae-executor.test.ts` typed with `RequestInfo | URL | string`, `RequestInit`, `HeadersInit`, and `unknown`. ESLint returns 0 errors and 0 warnings across all touched files. |

## 🔁 Review/Fix Ledger

- **Execution Engineer session/task ID**: `ses_ffed99e44ffeePMvvkAv3mcWl2`
- **Execution Reviewer session/task ID**: `ses_ffeb4d98fffeNO95Af21qhAB23`
- **Initial report / score**: `docs/reports/review/20260814-task-0171-final-review.md` — `84/100`, `REJECTED`
- **Fix routing**: Fixed in builder lane (`builders`). Replaced raw literal in `TraeAuthModal.tsx`, added regression test, updated changelog verification, resolved all ESLint test warnings. Task remains in `02-doing/` awaiting independent re-review.

## 🔍 Review Trail (initial)

- **Reviewer**: `builders` (independent reviewer)
- **Verdict**: **REJECTED**
- **Score**: **84/100**
- **Report**: [`docs/reports/review/20260814-task-0171-final-review.md`](../../reports/review/20260814-task-0171-final-review.md)
- **Promotion**: **Not promoted** — task remains in `02-doing/` because score is below 90.
- **Path to 100**: migrate the remaining raw Trae client ID in `src/shared/components/TraeAuthModal.tsx` to the shared public-credential resolution path, add a regression assertion covering that browser call site, and close the changelog verification checkbox/evidence.

## 🔁 Delta-Aware Re-Review Trail

- **Reviewer**: `builders` (independent re-review)
- **Verdict**: **APPROVED**
- **Score**: **100/100**
- **Report**: [`docs/reports/review/20260814-task-0171-final-review.md`](../../reports/review/20260814-task-0171-final-review.md)
- **Prior report**: `docs/reports/review/20260814-task-0171-final-review.md` — `84/100`, `REJECTED`
- **Delta classification**: `RESOLVED` — browser client-ID literal, regression-assertion gap, changelog checkbox, and test lint warnings all resolved; no regressions or new findings.
- **Promotion**: **Promoted from `02-doing/` to `03-review/` after fresh verification.**
