# Delta-Aware Independent Re-Review: Task 0161 — Grok CLI local auth capture

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0161-omniroute-grok-cli-local-auth-capture.md`
- **Review date**: 2026-08-13
- **Mode**: independent delta-aware security/auth/Docker review under the operator binary law.
- **Rule**: `90–100 = APPROVED`; `<90 = REJECTED`.
- **Compared against**: [`20260813-task-0161-omniroute-grok-cli-local-auth-capture-review.md`](20260813-task-0161-omniroute-grok-cli-local-auth-capture-review.md), previously rejected at 38/100.
- **Audited**: current task Closure Matrix and Completion Evidence, current capture module, OAuth route, OAuthModal, route-guard policy, Docker Compose/Dockerfile runtime wiring, focused tests, OAuth regressions, typecheck, and scoped lint.
- **Exclusions honored**: no subagent, no git, no forbidden production ports, no live credentials, no changelog execution, and no `04-completed` action.

## Score and verdict

### **48/100 — REJECTED; keep in `docs/tasks/02-doing/`**

The remediation materially closes most of the original in-module secret-boundary and session-state defects. The current code now uses an opaque server-side session, digest-only snapshots, bounded parsing, a secret-free public DTO, abort-aware `spawn`, cancellation, single-use/TTL sessions, stale/ambiguous-record rejection, and focused regression tests.

The score remains below the approval threshold because the production security and runtime path is not closed. The new OAuth actions are not classified as local-only by the route-guard policy, the supported Docker profiles still do not mount the Grok auth directory or install/provide the `grok` executable, and the start action waits for the login subprocess to exit before returning the capture session that the UI needs in order to show confirmation. Consequently, the implementation can be green in injected unit tests while the deployed flow is either remotely triggerable by an authenticated caller, unavailable due to missing runtime assets, or unable to reach the “Logged in, proceed” state during a real login.

### Dual production-facing score

| Dimension | Score | Rationale |
|---|---:|---|
| Local implementation | 82/100 | Strong secret/session/parser/lifecycle hardening and focused tests; residual schema strictness, identity matching, timeout semantics, and test gaps remain. |
| Runtime enforcement | 48/100 | Route locality is not enforced for the new subprocess endpoints; Docker mount/binary configuration is absent; the start/confirm protocol is blocked by the awaited child exit. |
| **Headline score** | **48/100** | Capped by the weaker runtime-enforcement dimension for this production-facing auth/subprocess task. |

## Delta classification

| Prior finding | Current classification | Evidence |
|---|---|---|
| F1/F6 raw key/token exposure | **RESOLVED in module/API/UI boundary** | Start returns only a 64-hex session ID and safe text; snapshots hold SHA-256 digests; `SafeAuthRecord` has no access/refresh token fields; route/UI negative assertions pass. |
| F2 path traversal | **RESOLVED in code; runtime evidence gap remains** | `resolveAndValidateAuthPath()` invokes `ensureUnderAllowed()` and confirmation re-validates the stored path. However, the Docker profiles still do not provide the configured mount or CLI asset. |
| F3 cancellation/concurrency | **PARTIALLY RESOLVED** | `spawn`, bounded output, request `AbortSignal`, SIGTERM/SIGKILL handling, cancel action, and in-process concurrent-session rejection are present and tested. The real start protocol remains functionally blocked by waiting for process exit; multi-worker serialization and timeout behavior are not proven. |
| F4 forged/stale snapshot | **RESOLVED in code** | Server-held, opaque, single-use, expiring sessions; digest comparison; forged/missing, stale, and ambiguous outcomes are covered. |
| F5 parser ambiguity/bounds | **MOSTLY RESOLVED** | Zod-bounded records, 1 MiB file cap, 50-record cap, issuer filtering, expiry filtering, and ambiguous-record rejection are present. Issuer/expiry are still optional in the schema, token validation is length-based rather than shape-based, and required identity semantics are not fully strict. |
| F7 route integration | **EVIDENCE GAP plus NEW BLOCKER** | Static route tests prove schema/session/identity-only source shape, but no behavioral route test proves locality. `/api/oauth/.../start-cli-login`, `capture-cli-auth`, and `cancel-cli-auth` are absent from `LOCAL_ONLY_API_PREFIXES`/patterns. |
| F8 frontend behavior | **PARTIALLY RESOLVED; NEW FUNCTIONAL BLOCKER** | UI state and cancel wiring are present and source-boundary assertions pass, but `startLocalGrokLogin()` does not return until the child closes, so the UI cannot receive `captureSessionId` while the browser/device login is waiting. No interaction test catches this. |

## Findings

### F9 — BLOCKER / NEW: OAuth capture actions are not local-only at the route-guard layer

`POST /api/oauth/[provider]/[action]` calls `requireOAuthRouteAuth(request)` and then dispatches `start-cli-login`, `capture-cli-auth`, or `cancel-cli-auth`. The route itself does not call a locality predicate. The central route guard's `LOCAL_ONLY_API_PREFIXES` and `LOCAL_ONLY_API_PATTERNS` contain no `/api/oauth/grok-cli/...` entry, and `managementPolicy` applies its non-loopback rejection only when `isLocalOnlyPath()` matches.

Therefore an authenticated non-loopback caller can reach the new action through a normal OAuth route and cause the server to access the mounted auth store or spawn `grok login`. This violates the task requirement that non-local/unsupported requests be rejected **before** subprocess or file access. The Docker check is not a substitute for request locality: a Dockerized service can still be remotely reachable.

**Required correction:** add exact segment-safe local-only coverage for the three capture actions (or a dedicated route-level local-only gate) and add a behavioral test with a remote peer proving rejection before `spawn`, `existsSync`, or `readFile` is invoked. Do not broaden all OAuth browser redirect/callback routes; only the subprocess/file-capture actions should be local-only.

### F10 — BLOCKER / PERSISTENT: supported Docker runtime does not provide the declared Grok CLI contract

Current `docker-compose.yml` has `base`, `web`, `cli`, and `host` profiles, but no `.grok` auth-store mount or `GROK_AUTH_PATH` configuration for the capture flow. The `host` profile mounts several other CLI configuration directories but not `.grok`. The `cli` profile mounts workspace/Docker assets but does not mount a Grok auth directory. `docker-compose.prod.yml` uses the `runner-cli` target but mounts only application data. The `runner-cli` stage in `Dockerfile` installs Codex, Claude Code, droid, and openclaw; it does not install or copy a `grok` binary.

The implementation correctly returns sanitized `missing-mount`/`missing-binary` outcomes, but that is fail-closed absence, not production wiring. The task objective requires a supported Docker deployment where the flow can actually launch the installed CLI and read the configured store. No fixture or local-only runtime smoke was run to establish that contract.

**Required correction:** either provide a verified Docker profile with an explicit read/write `.grok` mount, `GROK_AUTH_PATH`, and an installed/located `grok` binary, or change the feature contract to explicitly disable this action in every current profile and provide a separately documented supported image/profile. Add a sanitized fixture smoke that proves the mount, executable lookup, and route gate without using real credentials.

### F11 — BLOCKER / NEW: start/confirm protocol cannot expose the confirmation UI during a real login

`startLocalGrokLogin()` creates the session and then awaits a Promise that resolves only on the child `error` or `close` event. The route returns the `captureSessionId` only after that await completes. `OAuthModal` stores the session and renders “Logged in, proceed” only after the start response returns.

A real `grok login` process that remains open while the user completes browser/device approval therefore leaves the HTTP request pending and never gives the browser the session ID or confirmation button. The UI copy says the process started “in the background,” but the server route is synchronously waiting for process termination. The current fake-child tests emit `close` immediately and cannot detect this production lifecycle mismatch.

**Required correction:** separate session creation/process launch from confirmation. Return the opaque session immediately after launch, keep the owned child in the server session, and let cancel/timeout/exit update session state. Add a deterministic test with a child that remains open until explicitly closed, asserting that start resolves with a session before close and confirm can then read the changed fixture.

### F12 — HIGH: timeout and multi-worker lifecycle semantics remain unproven

The child is created with a `timeout` option, but the close handler treats `code === null` as successful (`if (code === 0 || code === null)`). Node child termination by timeout commonly arrives with a null exit code, so the current branch can report `started` after timeout unless the platform emits the expected error event first. There is no timeout test. The cancellation force-kill timer is not retained for cleanup, and the concurrency lock is module-local; it does not serialize captures across multiple Node workers/containers.

**Required correction:** track timeout explicitly, distinguish timeout/cancel from normal exit, clear all timers/listeners on every terminal path, and document or implement a shared lock if more than one runtime worker can serve the route. Add deterministic timeout and cleanup tests.

### F13 — MEDIUM: parser and identity requirements are less strict than the task contract

`boundedAuthRecordSchema` marks `issuer` and `expires_at` optional, and `isPlausibleToken()` checks only length rather than validating the documented JWT/opaque-token shape. Records require an email, but principal/team/organization identity is optional. Existing-connection matching compares email and rejects a principal mismatch only when both sides expose a principal; team and organization identity are not part of the match. This leaves room for malformed or under-verified records to be accepted and for a same-email account to be updated when the stronger identity fields disagree or are absent.

**Required correction:** make the required issuer/expiry/identity semantics explicit for the actual Grok record contract, validate token shape according to the verified format, and use all available stable identity dimensions when deciding update versus create. Preserve safe outcomes for absent optional fields only where the provider contract proves they are optional.

### F14 — EVIDENCE_GAP: route/UI tests are static boundary checks, not behavioral integration coverage

`grok-cli-local-auth-capture-route.test.ts` reads source text and asserts regular expressions. It proves that selected strings exist and that obvious secret field names are absent from one source branch, but it does not execute the Next route, auth gate, remote locality gate, provider mismatch, abort propagation, status mapping, cancellation, or identity-only JSON response. OAuthModal coverage remains the existing 10-test regression subset plus static source assertions; it does not mount the new Docker Capture interaction and hold the child process open.

**Required correction:** add focused behavioral route tests with injected capture dependencies and a mounted UI interaction test (or equivalent deterministic component harness) for start, confirm, error, cancel, and close/unmount.

## Verification performed

### PASS — focused local capture tests

```text
node --import tsx/esm --test \
  tests/unit/grok-cli-local-auth-capture.test.ts \
  tests/unit/grok-cli-local-auth-capture-extra.test.ts \
  tests/unit/grok-cli-local-auth-capture-route.test.ts

19 pass / 0 fail
```

The tests now cover opaque session/no-secret response, traversal-before-read, missing binary, abort kill, in-process concurrency rejection, forged session, bounded file, stale/ambiguous selection, persistence boundary, route source boundary, and modal source boundary.

### PASS — OAuth regressions

```text
node --import tsx/esm --test tests/unit/grok-cli-oauth.test.ts
13 pass / 0 fail

npx vitest run \
  tests/unit/shared/components/OAuthModal.state.test.tsx \
  tests/unit/shared/components/OAuthModal.cancellation.test.tsx
10 pass / 0 fail
```

### PASS — typecheck and scoped lint

```text
npm run typecheck:core
exit 0

npx eslint ...
0 errors, 9 warnings
```

The warnings are `@typescript-eslint/no-explicit-any` in focused test fixtures; no scoped lint errors were reported.

### NOT RUN — Docker/local-only smoke

No real credential or forbidden-port smoke was run. Current Compose/Dockerfile inspection also did not establish a supported Grok binary/auth mount, so the Completion Evidence cannot be promoted to production-wiring proof from the current files.

## Required path to approval

1. Add a narrow local-only route-guard entry for `start-cli-login`, `capture-cli-auth`, and `cancel-cli-auth`; prove remote rejection before any file/subprocess access.
2. Establish the actual supported Docker profile: explicit `.grok` mount, `GROK_AUTH_PATH`, executable `grok` binary, correct non-root permissions, and sanitized fixture smoke.
3. Refactor start into a non-blocking session launch that returns the opaque ID immediately; retain child ownership and implement terminal status, cancel, timeout, and cleanup.
4. Add deterministic open-child tests for immediate start response, confirmation after file mutation, timeout classification, signal cleanup, and close/unmount cancellation.
5. Tighten provider-record schema and full identity matching according to verified Grok auth-store evidence.
6. Replace static-only route/UI assertions with behavioral route tests and a focused mounted UI interaction suite.
7. Refresh Completion Evidence and perform another independent score; do not move the task until the runtime-enforcement score is at least 90.

## Reviewer conclusion

Task 0161 remains **REJECTED at 48/100**. The remediation is substantial and the original raw-secret/session/parser defects are largely closed, but production locality, Docker asset wiring, and the start/confirm lifecycle are still blockers. The task remains in `docs/tasks/02-doing/`; no lane move was performed.
