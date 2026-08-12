# Independent Review Report: Task 0151 — Grok Build device-code and browser login flows

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0151-omniroute-grok-build-login-ux.md`
- **Review date**: 2026-08-11
- **Review mode**: independent live-filesystem review; no subagents, nested reviews, provider/network calls, git, `:22000`, tasklist-sync, changelog tooling, reference/profile writes, or Task 0153 edits.
- **Authority**: current source, current tests, current diagnostics, and fresh commands outrank the task's Completion Evidence and prior claims.
- **Acceptance threshold**: `90–100 = APPROVED`; `<90 = REJECTED`.

## Score and verdict

### **Score: 86/100 — REJECTED; remain in `docs/tasks/02-doing/`**

The implementation is substantially present and the focused mocked OAuth suites are green, but two material contract gaps prevent promotion:

1. **Cancellation is not implemented as cancellation.** Device polling is a bounded loop, but it has no `AbortController`, cancellation flag, or cleanup tied to modal close/unmount. Closing the modal only invokes the parent `onClose`; the polling promise can continue issuing `/poll` requests for up to two minutes and can later call state setters/onSuccess after the modal is gone.
2. **PKCE state validation is permissive and is not enforced end-to-end.** `OAuthModal::handleCallback` rejects only when a returned state is present and different; a missing callback state is accepted when `authData.state` exists. The API `/exchange` route validates the shape of `state` and forwards it, but does not compare it to a server-held authorization-session state. The focused tests prove forwarding, not rejection of missing/mismatched state.

These are security/lifecycle obligations explicitly required by the task, not cosmetic follow-up items. The score is below the legal promotion threshold, so no move was made.

## Evidence reviewed

### Implementation

- `src/lib/oauth/providers/grok-cli.ts`: verified device-code request/poll, verification URI validation, JWT/auth.json/raw-token mapping, identity claims, expiry calculation, and public credential resolution.
- `src/lib/oauth/providers/grok-cli-oauth.ts`: verified browser PKCE URL construction, token exchange, state forwarding, OIDC identity mapping, device-code JWT claim extraction, positive expiry clamping, and upstream error redaction.
- `src/lib/oauth/constants/oauth.ts`: verified separate device-code and browser PKCE configurations, HTTPS endpoints, scope, loopback port `56122`, callback path/host, and `resolvePublicCred("grok_id", "GROK_OAUTH_CLIENT_ID")`.
- `src/lib/oauth/utils/pkce.ts`: verified fresh random verifier, S256 challenge, and random state generation.
- `src/lib/oauth/providers.ts`: verified `supportsBrowserPkce` dispatch, state argument propagation into `exchangeToken`, device polling result mapping, and provider registry compatibility.
- `src/app/api/oauth/[provider]/[action]/route.ts`: verified Zod validation for exchange/poll/import, route dispatch sets, authenticated route handling, connection upsert, token expiry persistence, and sanitised import/exchange errors.
- `src/lib/oauth/connectionPersistence.ts`: verified `buildOAuthConnectionCreatePayload` writes both `expiresAt` and `tokenExpiresAt`; refresh/update DB paths preserve those fields.
- `src/shared/components/OAuthModal.tsx`: verified device/browser/import tabs, manual fallback, popup toggle branches, callback listeners, and polling lifecycle.
- `src/shared/validation/schemas/auth.ts`: verified bounded `oauthExchangeSchema`, `oauthPollSchema`, `oauthImportTokenSchema`, and device completion schemas.

### Tests and fresh verification

Fresh focused Node suite:

```text
DATA_DIR=$(mktemp -d) node --import tsx/esm --test \
  tests/unit/grok-cli-device-code.test.ts \
  tests/unit/grok-cli-pkce.test.ts \
  tests/unit/grok-cli-oauth.test.ts \
  tests/unit/grok-cli-cancellation-redaction.test.ts \
  tests/unit/oauth-providers-config.test.ts \
  tests/unit/settings-oauth-autoopen.test.ts
```

Result: **81 tests passed, 0 failed**.

Fresh popup matrix:

```text
npx vitest run --config vitest.config.ts tests/unit/shared/components/OAuthModal.oautopopup.test.tsx
```

Result: **1 test file passed; 7 tests passed**.

Fresh typecheck:

```text
npm run typecheck:core
```

Result: **exit 0; no TypeScript errors**.

Focused ESLint:

```text
npx eslint <Task-0151 OAuth source and test files>
```

Result: **exit 0; 0 errors; 2 pre-existing `no-explicit-any` warnings** in `tests/unit/oauth-providers-config.test.ts:535` and `:550`.

Additional gates:

- `npm run check:route-validation:t06`: **PASS**, 533 route files scanned.
- `npm run check:secrets`: **SKIP**, `gitleaks` absent; script exits 0 by documented graceful-skip behavior.
- Repository-wide `npm run lint`: **timed out after 120 seconds**; no repository-wide pass is claimed. Focused lint remains the relevant clean signal for this task surface.
- LSP diagnostics for `src/shared/components/OAuthModal.tsx`: **0 diagnostics**.

## Findings

### F1 — HIGH: device-code polling survives modal close/unmount

**Evidence**: `src/shared/components/OAuthModal.tsx:238-284` (`startPolling`) and `:388-420` (browser callback-server polling) run asynchronous loops with `setTimeout` delays and repeated `fetch` calls. They set `polling`/`step` and invoke `onSuccess` after completion. There is no abort signal, cancellation ref, mounted guard, or cleanup that stops the device polling when `onClose` closes/unmounts the modal. The only lifecycle reset is `flowStartedRef.current = false` when `isOpen` becomes false; it does not cancel an already-running loop.

**Impact**: unnecessary continued auth polling after cancellation, possible state updates on an unmounted component, stale success callbacks after the operator abandoned the flow, and inability to meet the task's explicit cancellation requirement.

**Required remediation**:

1. Introduce a per-flow cancellation controller/ref (for device polling and callback-server polling).
2. Pass `signal` into poll `fetch` calls and check cancellation before/after each delay and before every state update/onSuccess.
3. Abort/clear the active flow in `onClose` cleanup and in an effect cleanup when `isOpen`, `provider`, or the flow session changes.
4. Treat `AbortError` as a silent cancellation, not a user-facing OAuth failure.
5. Add a focused test that starts polling, closes/unmounts the modal, advances time, and asserts no further `/poll` calls and no success/error transition.

### F2 — HIGH: callback state validation accepts missing state

**Evidence**: `src/shared/components/OAuthModal.tsx:586-594` checks:

```ts
if (authData?.state && state && state !== authData.state) {
  // reject
}
```

When `authData.state` exists and callback `state` is absent, this condition is false and the code proceeds to `exchangeTokens(code, state)`. `handleManualSubmit` also defaults a missing callback state to `authData.state` (`:732-733`), which converts a callback with no state into an apparently valid request. The API route at `src/app/api/oauth/[provider]/[action]/route.ts:449-459` only validates the type/shape and at `:686` forwards `params.state`; it does not enforce equality against a server-side stored state.

**Impact**: the task's CSRF/state-protection contract is not demonstrated or enforced for missing-state callbacks. A stolen/unsolicited authorization code can reach token exchange when the callback omits state, and the server has no independent authorization-session state to reject a forged value.

**Required remediation**:

1. Require `authData.state` and a returned state for browser PKCE callbacks; reject absent or mismatched values before exchange.
2. For manual paste, do not default a missing callback state to `authData.state`; require an explicit matching state for PKCE providers. Keep any provider-specific non-PKCE/manual exception narrowly scoped and documented.
3. Store the generated state server-side with the short-lived callback session (alongside `codeVerifier`/redirect URI) and compare it server-side during `/exchange` or `/poll-callback`; reject mismatch/missing state with a safe 400 response.
4. Add tests for matching, mismatched, and missing state through both popup/manual callback paths and the route boundary.

### F3 — MEDIUM: task evidence overstates cancellation/state proof

The task's Completion Evidence says cancellation and PKCE state are covered, but the current test evidence shows only bounded timeout/terminal handling and state forwarding. `tests/unit/grok-cli-cancellation-redaction.test.ts` explicitly describes cancellation as “the modal's polling loop is already bounded” and contains no cancellation test. The tests also assert that state is forwarded or omitted, not that missing/mismatched state is rejected. Update evidence only after the lifecycle and route-boundary tests exist.

## Verified strengths / no finding

- Device-code endpoint and token response handling are mocked; no production OAuth/network call was made.
- Device-code user-facing shape is bounded to verification URI/code, interval, and expiry; raw token fields are not rendered by the device UI.
- Verification URI scheme/host and user-code format are validated.
- Browser PKCE uses fresh verifier/challenge/state and the expected S256 parameters.
- Browser token mapping preserves refresh token, OIDC identity, Grok principal/team/org claims where present, and positive expiry.
- Import fallback accepts full auth.json and raw JWT forms and preserves refresh/identity metadata.
- Creation now mirrors expiry into `tokenExpiresAt`; DB create/update and refresh paths support the field.
- `oauthAutoOpen=false` leaves manual URL/copy-paste usable for browser/PKCE flows; the 7-case popup matrix passes.
- Provider dispatch sets include `grok-cli` in both browser callback and non-PKCE device-code sets without changing other provider flows in the verified registry tests.
- Provider-level and route-level error paths redact/sanitize token-shaped upstream errors.
- No OAuth client secret or real token was introduced in the reviewed implementation/tests.

## Score breakdown

| Dimension | Points |
|---|---:|
| Protocol/config correctness | 20/20 |
| Device-code lifecycle and user UX | 14/20 |
| Browser PKCE verifier/challenge/state | 15/20 |
| Import/identity/expiry/refresh persistence | 18/18 |
| Security/redaction/validation | 10/12 |
| Regression/TDD/sabotage/fresh evidence | 9/10 |
| **Total** | **86/100** |

The deductions are concentrated in lifecycle cancellation and state enforcement, not in the already-verified endpoint/config/token mapping work.

## Path to 100

1. Fix F1 with abortable, cleanup-owned polling and a close/unmount cancellation test.
2. Fix F2 with strict state-required comparison in UI and server-side callback-session state enforcement, plus matching/mismatch/missing route tests.
3. Refresh Completion Evidence with exact fresh counts and rerun focused tests, typecheck, and focused lint.
4. Append this report and the remediation state to the task's Review Trail; keep the task in `02-doing` until a new independent review reaches at least 90.

## Conclusion

Task 0151 is **REJECTED at 86/100**. The code is close, but the two missing security/lifecycle proofs are material. The task must remain in `docs/tasks/02-doing/`; no promotion was performed.
