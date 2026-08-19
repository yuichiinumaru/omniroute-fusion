# Independent Review Report: Task 0161 — Grok CLI local auth capture

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0161-omniroute-grok-cli-local-auth-capture.md`
- **Review date**: 2026-08-13
- **Mode**: `BUILDER_CONTEXT`, independent reviewer under the operator binary law.
- **Rule**: `90–100 = APPROVED`; `<90 = REJECTED`.
- **Scope audited**: task Completion Evidence and Review Trail placeholders, every source named by the Where table, Docker configuration, the new capture module, route integration, OAuthModal integration, focused local-capture tests, OAuth regression tests, typecheck, and scoped lint.
- **Exclusions honored**: no sub-reviewer/investigator, no git, no `:22000` execution, no production credentials, no `:21000`, no changelog execution, and no move to `04-completed`.

## Score and verdict

### **Score: 38/100 — REJECTED; keep in `docs/tasks/02-doing/`**

The implementation has a useful initial shape—`execFile` receives an argument array, a timeout is supplied, and both capture operations check `isRunningInDocker()` before their normal file/subprocess path. However, the production security and lifecycle contract is not closed. The implementation returns access keys in the start response, accepts arbitrary auth paths because its allowlist helper is never called, has no cancellation or concurrency/session ownership, does not validate issuer/expiry/identity/token schema, and does not prove route/UI/persistence behavior with focused tests. These are task-level blockers, not polish items.

## Score breakdown

| Dimension | Points | Notes |
|---|---:|---|
| Docker-only enforcement and configured mount | 8/15 | `startLocalGrokLogin`, `readGrokAuthStore`, and `confirmAndCaptureGrokLogin` call the injected Docker predicate before their normal access. But `ensureUnderAllowed()` is dead code; `authPath`/`GROK_AUTH_PATH` are not constrained, and the reviewed Docker Compose/Dockerfile files neither mount `.grok` nor install/provide a `grok` binary for this flow. |
| Subprocess safety and lifecycle | 7/15 | `execFile(grokBin, ["login", ...args], { timeout })` avoids shell interpolation and bounds execution. There is no abort/cancellation signal, no child-process ownership/cleanup, and the injected `spawn` dependency is unused. The route waits for `execFile` rather than owning a cancellable login session. |
| Snapshot/account preservation | 4/20 | Snapshotting keys can reject an unchanged unexpired file when the snapshot is intact, but the snapshot is returned to and accepted from the browser, can be omitted/forged, is not server-session-bound, and there is no serialized capture lock. A cancelled login with `preLoginSnapshot: []` can select the first old unexpired record and update/overwrite the matching email connection. Multiple fresh records are silently resolved by first array order rather than rejected or explicitly disambiguated. |
| Identity mapping and secret boundary | 5/15 | The safe identity field names broadly match Task 0151, and persistence is routed through model functions that encrypt connection fields. The parser accepts any non-array object with a `key`, does not require/validate issuer, expiry, identity, JWT/token shape, or bounded field lengths, falls back from missing email to `user_id`, and `readGrokAuthStore()` publicly returns `accessToken` and `refreshToken`. `redactAuthRecord()` is opt-in and does not protect the raw return. |
| API route integration | 5/10 | The requested `action === "start-cli-login"` and `action === "capture-cli-auth"` branches exist behind `requireOAuthRouteAuth`, and provider matching is present. The capture body is assigned through `any` with no schema/bounds validation; the route trusts a client-controlled snapshot and returns the start result—including the raw snapshot keys—as JSON. No route test proves either action’s Docker, payload, and redaction contract. |
| Frontend behavior and leakage | 4/10 | OAuthModal has a Docker Capture button, approval copy, a “Logged in, proceed” button, and a Cancel button. It spreads the start response into client state, so the returned `preLoginSnapshot` keys reach the browser; it also presents the flow as background while the API awaits `execFile`. There is no focused Task 0161 UI test proving the messages, endpoint calls, snapshot handling, or absence of credentials. |
| Focused verification and evidence quality | 5/15 | The two new suites pass 7/7, Grok OAuth regression passes 13/13, OAuthModal state/cancellation tests pass 10/10, `npm run typecheck:core` passes, and scoped ESLint passes. The required capture lifecycle, timeout/cancellation, stale snapshot, account preservation, persistence, route, concurrent-session, malformed-record, and secret-negative tests are absent; the task’s evidence overstates coverage and records no real Docker fixture/smoke. |
| **Total** | **38/100** | **REJECTED** |

## Findings

### F1 — BLOCKER: access keys are returned to the API/UI through `preLoginSnapshot`

`src/lib/oauth/grokCliLocalCapture.ts:161-170` collects each existing record’s raw `key`, and `:181` returns `preLoginSnapshot` in the public start result. `src/app/api/oauth/[provider]/[action]/route.ts:455-456` serializes that result directly, and `src/shared/components/OAuthModal.tsx:948` stores it in browser state before sending it back at `:969`. This directly violates the task requirement that API/UI responses never return access keys, refresh tokens, raw auth JSON, JWTs, or cookies. A snapshot must be an opaque server-side capture-session identifier or a server-held digest/set, never the raw key.

### F2 — BLOCKER: configured auth path is not restricted to the supported Docker mount

`ensureUnderAllowed()` exists at `src/lib/oauth/grokCliLocalCapture.ts:114-119` but is never invoked. `resolveAuthPath()` at `:107-112` accepts `options.authPath` or the `GROK_AUTH_PATH` environment value without checking the allowed base, and `readGrokAuthStore()` receives `allowedBaseDir` but does not apply it (`:192-206`). The start path also resolves the environment path without an allowlist check (`:160`). This allows arbitrary readable paths inside the container and does not implement the documented “configured auth-store path only” contract. In addition, the reviewed `docker-compose.yml` host profile has no `.grok` mount, the CLI profile does not install `grok`, and `Dockerfile` only installs unrelated CLIs.

### F3 — BLOCKER: no cancellation, process ownership, or serialized capture session

The task requires abort/cancellation and serialized or clearly rejected concurrent attempts. `startLocalGrokLogin()` (`:140-189`) only calls promisified `execFile`; `StartLoginOptions` has no `AbortSignal`, the `spawn` dependency is unused, and no process is retained for cancellation/cleanup. There is no module/session lock around start or confirm. Closing the modal does not cancel the server-side process, and a second capture can race the first. The focused tests contain no timeout, abort, cleanup, or concurrency scenario.

### F4 — BLOCKER: snapshot protection is client-controlled and unsafe when missing

`confirmAndCaptureGrokLogin()` trusts `options.preLoginSnapshot` (`:305-315`). The route passes `body.preLoginSnapshot || []` at `src/app/api/oauth/[provider]/[action]/route.ts:464`, with no schema or session binding. If the browser omits the value, an authenticated caller supplies an empty array, or stale UI state is reused, the code treats all currently unexpired records as candidates and selects `newRecords[0]` (`:317-325`). It can then match by email and update an existing connection (`:328-363`). This is precisely the cancelled-login/old-account overwrite hazard the task calls out. The “sabotage evidence” claim that an omitted snapshot is protected is contradicted by the current implementation.

### F5 — HIGH: parser is not bounded schema validation and silently accepts ambiguous records

`readGrokAuthStore()` (`:228-269`) only requires a top-level object and a truthy string `key`. It does not require the `https://auth.x.ai` issuer, validate expiry syntax/semantics, validate a JWT/access-token shape, require verified identity fields, bound string sizes, or reject malformed/ambiguous records. It skips invalid entries and returns `ok: true` even when no usable record remains (`:271-276`). It also falls back from missing email to `user_id` (`:253`), which can display an identifier as an email. Multiple valid records are returned, but confirmation silently chooses the first rather than returning a safe ambiguity outcome.

### F6 — HIGH: raw token fields remain in a public module result

`ParsedAuthRecord` exposes `accessToken` and `refreshToken` (`:68-74`), and `readGrokAuthStore()` returns them at `:262-267`. `redactAuthRecord()` (`:375-380`) is a separate caller-selected transformation, not a boundary guarantee. Although the current route does not call the read function directly, the module API itself violates the requirement that raw keys/refresh tokens never be returned. The test at `tests/unit/grok-cli-local-auth-capture.test.ts:84-107` proves only that an explicit redaction helper works; it does not assert that the original result is secret-free.

### F7 — MEDIUM: route input and action behavior lack focused integration tests

The route accepts `rawBody` and bypasses schema validation for both new actions (`src/app/api/oauth/[provider]/[action]/route.ts:445-448`). `capture-cli-auth` assumes `body.preLoginSnapshot` is an array but does not validate type, length, item format, or a server-issued session. No focused test invokes the route and proves unauthenticated rejection, non-Docker rejection before file/subprocess access, provider mismatch, safe start response, malformed body rejection, or capture response redaction.

### F8 — MEDIUM: frontend tests do not cover the new flow and copy is misleading

The reviewed OAuthModal tests cover Task 0151 PKCE state and polling cancellation, not Task 0161. There is no test for `handleLocalCliCapture`/`confirmCliCapture`, the two new endpoints, “Docker Capture”, “Logged in, proceed”, or the no-secret response contract. The UI says the process “started in the background” (`OAuthModal.tsx:1221`) although the route awaits `execFile` to completion before returning (`grokCliLocalCapture.ts:179-181`), so the displayed lifecycle is not supported by the implementation.

## Verification performed

### PASS — focused local capture tests

```text
node --import tsx/esm --test tests/unit/grok-cli-local-auth-capture.test.ts tests/unit/grok-cli-local-auth-capture-extra.test.ts
ℹ tests 7 · ℹ pass 7 · ℹ fail 0
```

The passing tests cover non-Docker start, missing mount, missing file, a valid fixture, unsupported top-level shape, declaration order, and identity mapping. They do not cover the blockers above.

### PASS — Grok OAuth regression

```text
node --import tsx/esm --test tests/unit/grok-cli-oauth.test.ts
ℹ tests 13 · ℹ pass 13 · ℹ fail 0
```

### PASS — existing OAuthModal regression subset

```text
npx vitest run tests/unit/shared/components/OAuthModal.state.test.tsx tests/unit/shared/components/OAuthModal.cancellation.test.tsx
Test Files 2 passed (2)
Tests 10 passed (10)
```

### PASS — typecheck and scoped lint

```text
npm run typecheck:core
exit 0

npx eslint src/lib/oauth/grokCliLocalCapture.ts \
  "src/app/api/oauth/[provider]/[action]/route.ts" \
  src/shared/components/OAuthModal.tsx \
  tests/unit/grok-cli-local-auth-capture.test.ts \
  tests/unit/grok-cli-local-auth-capture-extra.test.ts
exit 0
```

No Docker fixture/smoke was run because the source/configuration does not establish a verified Grok CLI binary and `.grok` auth mount, and the operator explicitly prohibited `:22000` execution.

## Exact path to 100

1. Remove raw `key` values from all API/UI results. Keep the pre-login state server-side, or return only a cryptographically safe opaque capture-session ID plus bounded metadata; never send access keys or refresh tokens to `OAuthModal`.
2. Enforce the supported Docker auth mount before any file access: invoke the allowlist check for every explicit/env/default path, canonicalize it safely, reject traversal and arbitrary paths, and add the verified `.grok` mount plus `grok` binary/configuration to the supported Docker profile (or fail clearly when unavailable).
3. Replace the blocking `execFile` call with an owned cancellable subprocess/session. Propagate an abort signal, bound stdout/stderr, sanitize all subprocess diagnostics, kill/cleanup on timeout, modal cancellation, request disconnect, and process exit, and serialize or reject concurrent capture sessions.
4. Bind confirmation to a server-issued capture session and server-held snapshot digest/record identifiers. Reject missing, expired, replayed, malformed, or client-forged snapshot/session values. On unchanged/stale files return `stale-record` without persistence; do not fall back to the first old record.
5. Define deterministic selection that rejects ambiguity (multiple fresh records or conflicting identity) instead of silently choosing declaration order. Match existing connections using the full verified identity required by Task 0151 (email plus principal/team/organization where applicable), not email alone.
6. Add bounded Zod/schema validation for the keyed auth store: allowed issuer/key shape, required identity, expiry and refresh semantics, maximum record/file sizes, and explicit malformed/expired/ambiguous outcomes. Return a secret-free parsed DTO; keep credentials internal to encrypted persistence only.
7. Add route integration tests for both exact action names, auth gate, provider gate, Docker gate before file/subprocess access, request schema rejection, safe response shape, stale/cancelled capture, replay/concurrency rejection, and persistence through mocked encrypted model functions.
8. Add OAuthModal tests proving the Docker Capture button, safe approval/status copy, “Logged in, proceed” and Cancel actions, endpoint payloads, cancellation behavior, and that no `key`, `refresh_token`, JWT, cookie, or raw auth JSON reaches rendered text or client state.
9. Refresh Completion Evidence from one fresh run with the actual Docker fixture/mount contract, focused lifecycle test counts, secret-negative assertions, route/UI coverage, typecheck, scoped lint, and any explicit repository baseline limitations.

## Reviewer conclusion

Task 0161 is **REJECTED at 38/100**. The task must remain in `docs/tasks/02-doing/` until the exact path-to-100 items above are implemented and independently re-reviewed. No lane move was performed.
