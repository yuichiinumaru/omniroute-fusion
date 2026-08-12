# Independent Delta Re-review Report: Task 0151 — Grok Build device-code and browser login flows

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0151-omniroute-grok-build-login-ux.md`
- **Review date**: 2026-08-11
- **Review mode**: independent live-filesystem delta re-review; no subagents, nested reviews, provider/network calls, git, `:22000`, tasklist-sync, changelog tooling, reference/profile writes, or Task 0153 edits.
- **Authority**: current source, current tests, current diagnostics, and commands run during this re-review outrank Completion Evidence and prior reports.
- **Acceptance threshold**: `90–100 = APPROVED`; `<90 = REJECTED`.

## Score and verdict

### **Score: 88/100 — REJECTED; remain in `docs/tasks/02-doing/`**

The two prior blockers are resolved in the current source and are covered by fresh focused tests. However, the delta review found a new high-severity token-redaction gap in the device-code polling error path. A synthetic JWT-shaped marker returned by the mocked device token endpoint is propagated unchanged through `pollToken()` and the `/api/oauth/{provider}/poll` response as `errorDescription`. This violates the task's explicit requirement that provider secrets/tokens never appear in UI-visible error responses.

The task therefore remains below the legal promotion threshold. No move to `03-review` was performed.

## Delta disposition of prior findings

### F1 — RESOLVED: polling cancellation and lifecycle cleanup

`src/shared/components/OAuthModal.tsx` now has per-flow `AbortController` ownership, a timeout registry, and a generation/stale-flow guard. Both device-code and callback-server polling delays are cancellable; polling fetches receive the signal; abort-shaped failures return silently; state setters and `onSuccess` are guarded. The `isOpen=false` effect and unmount cleanup call `abortActivePolling()`.

Fresh `OAuthModal.cancellation.test.tsx` coverage passed for:

1. Device-code polling stopping on unmount.
2. Device-code polling stopping when `isOpen` becomes false, including suppression of a later success.
3. Callback-server polling stopping on unmount.

F1 is closed.

### F2 — RESOLVED: strict PKCE callback state validation

The UI now requires a non-empty callback state equal to `authData.state` for postMessage and manual callback paths; manual parsing no longer defaults a missing state to the expected state. The route stores `expectedState` in the callback session, compares it with constant-time `safeEqual`, rejects missing/mismatched `/exchange` state before token exchange, and rejects missing/mismatched `/poll-callback` callback state. `grok-cli` correctly uses the shared `__codexCallbackState` session key.

Fresh route tests passed for missing, mismatched, and matching states, no-session behavior, Codex callback state, and non-PKCE device-code dispatch. Fresh UI tests passed for matching, missing, and mismatched postMessage/manual callbacks.

F2 is closed.

### F3 — RESOLVED: stale completion evidence

The task now contains current F1/F2 implementation notes, fresh test counts, a closure matrix, and sabotage claims. The evidence is materially stronger than the original 86/100 report. The new finding below means the evidence must be refreshed again after the redaction fix; the existing redaction claims do not cover the device polling error response path.

## New finding

### F4 — HIGH: device-code poll error responses leak token-shaped upstream text

**Location**:

- `src/lib/oauth/providers/grok-cli.ts:183-195` (`pollToken`)
- `src/lib/oauth/providers.ts:216-255` (`pollForToken`)
- `src/app/api/oauth/[provider]/[action]/route.ts:592-682` (`POST` `poll` action)

`requestDeviceCode()` redacts JWT-shaped text and `exchangeGrokBuildToken()` redacts non-2xx response text, but `pollToken()` returns the parsed upstream error object without redaction. `pollForToken()` copies `result.data.error_description` into `errorDescription`, and the route returns that value directly:

```ts
return NextResponse.json({
  success: false,
  error: result.error,
  errorDescription: result.errorDescription,
  pending: isPending,
});
```

A fresh local probe using a mocked token endpoint confirmed that a synthetic JWT-shaped marker in the device poll `error_description` appeared unchanged in the route response. The probe did not contact any provider or use a real credential.

**Impact**: the raw marker can reach the browser and `OAuthModal`'s visible error state. This is a direct violation of the task objective and Test Requirements: no provider token may appear in client UI, logs, task evidence, or error responses. The current `grok-cli-cancellation-redaction.test.ts` covers device-code request errors and PKCE exchange errors, but not device-code poll error redaction, and the current route-state redaction sanity test exercises the PKCE exchange helper rather than the `/poll` response.

**Required remediation**:

1. Apply the same narrow Grok JWT-shaped redaction to device-code poll error descriptions before they leave the provider boundary, or apply an equivalent route-boundary sanitizer to the poll response.
2. Add a failing-then-passing regression test through the `/api/oauth/{provider}/poll` route (or an equivalent provider-to-route integration boundary) proving the synthetic token is absent and a non-token diagnostic remains useful.
3. Re-run the focused Grok/OAuth suite, OAuthModal suite, typecheck, focused lint, route validation, and sabotage matrix; update Completion Evidence with the actual output.

## Fresh verification performed

### Focused Node OAuth/Grok/route matrix

```text
DATA_DIR=$(mktemp -d) node --import tsx/esm --test \
  tests/unit/grok-cli-device-code.test.ts \
  tests/unit/grok-cli-pkce.test.ts \
  tests/unit/grok-cli-oauth.test.ts \
  tests/unit/grok-cli-cancellation-redaction.test.ts \
  tests/unit/oauth-route-state.test.ts \
  tests/unit/oauth-providers-config.test.ts \
  tests/unit/settings-oauth-autoopen.test.ts
```

Result: **91 tests passed, 0 failed**.

### OAuthModal Vitest surface

```text
npx vitest run --config vitest.config.ts tests/unit/shared/components/
```

Result: **6 test files passed; 26 tests passed, 0 failed**.

### Typecheck

```text
npm run typecheck:core
```

Result: **exit 0; no TypeScript errors**.

### Focused lint

```text
npx eslint src/shared/components/OAuthModal.tsx \
  'src/app/api/oauth/[provider]/[action]/route.ts' \
  src/lib/oauth/providers/grok-cli-oauth.ts \
  tests/unit/shared/components/OAuthModal.cancellation.test.tsx \
  tests/unit/shared/components/OAuthModal.state.test.tsx \
  tests/unit/oauth-route-state.test.ts
```

Result: **exit 0; 0 errors, 0 warnings**.

### Route validation

```text
npm run check:route-validation:t06
```

Result: **PASS; 533 route files scanned**.

### Secret scan

```text
npm run check:secrets
```

Result: **graceful SKIP; `gitleaks` is absent from PATH**. No secret-scan pass is claimed.

### Repository-wide lint

```text
npm run lint
```

Result: **not a repository-wide pass**: the command completed with pre-existing unrelated errors in `visual-reference` and many warnings elsewhere. The changed OAuth files were clean under focused lint; no task-specific lint error was observed.

### Diagnostics and scratch-file audit

LSP diagnostics reported **0 diagnostics** for `OAuthModal.tsx` and the OAuth route. Glob checks found no `tmp/saved-grok-cli.ts` or `.gortex.tmp-*` files remaining in the repository. No real OAuth call, credential, production port, or provider network was used.

## Score breakdown

| Dimension | Points |
|---|---:|
| Protocol/config correctness | 20/20 |
| Device-code lifecycle and user UX | 20/20 |
| Browser PKCE verifier/challenge/state | 20/20 |
| Import/identity/expiry/refresh persistence | 18/18 |
| Security/redaction/validation | 2/12 |
| Regression/TDD/sabotage/fresh evidence | 8/10 |
| **Total** | **88/100** |

The implementation is strong on protocol behavior, cancellation, PKCE state, identity mapping, and focused regression coverage. The security dimension is intentionally scored down sharply because the remaining leak is on the primary device-code login's runtime poll error path, and the regression suite currently does not detect it.

## Required path to approval

1. Close F4 with provider- or route-boundary redaction for device-code polling errors.
2. Add a route-level regression test for a token-shaped poll error and a non-token diagnostic.
3. Capture fail→pass/sabotage evidence for the new guard and refresh the task Completion Evidence.
4. Re-run the focused matrix, OAuthModal Vitest, typecheck, focused lint, route validation, and available secret check.
5. Request the next independent review only after the new evidence is current; keep the task in `02-doing` until the score is at least 90.

## Conclusion

Task 0151's original F1 and F2 findings are resolved, but the current implementation still violates the no-token-leak contract through device-code polling error responses. **REJECTED at 88/100.** The task must remain in `docs/tasks/02-doing/`; no promotion was performed.
