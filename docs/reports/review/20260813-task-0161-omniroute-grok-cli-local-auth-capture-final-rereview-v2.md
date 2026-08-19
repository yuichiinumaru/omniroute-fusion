# Delta-Aware Independent Re-Review: Task 0161 — Grok CLI local auth capture

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0161-omniroute-grok-cli-local-auth-capture.md`
- **Review date**: 2026-08-13
- **Mode**: independent filesystem re-review under the operator binary law.
- **Rule**: `90–100 = APPROVED`; `<90 = REJECTED`.
- **Previous reports read**:
  - `docs/reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-review.md` — prior `38/100` rejection.
  - `docs/reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-final-rereview.md` — prior `48/100` rejection.
- **Audited**: current Closure Matrix and Review Ledger, `routeGuard.ts`, `grokCliLocalCapture.ts`, OAuth route, OAuthModal boundary test, capture tests, authz tests, all three relevant Compose files, Dockerfile, typecheck, lint, and Compose rendering.
- **Restrictions honored**: no subagent, no sub-reviewer, no correction reversion, no live credentials, no forbidden production-port activity, no changelog execution, and no `04-completed` action.

## Score and verdict

### **62/100 — REJECTED; keep in `docs/tasks/02-doing/`**

The expert did apply substantial corrections from the previous reports. The route-guard regex is present and segment-safe; `startLocalGrokLogin()` now uses `spawn` without awaiting child exit; opaque sessions, digest snapshots, cancellation signals, timeout state, bounded parsing, strict Zod fields, and Docker Compose bind declarations are present.

The score remains below approval because filesystem verification found two production blockers and one verification blocker:

1. The configured Docker path `/host-home/.grok/auth.json` is rejected by the module's default allowlist in the actual non-root Docker runtime, because `allowedBaseDir` defaults to `path.join(deps.homedir(), ".grok")` (normally `/home/node/.grok`) rather than the configured `/host-home/.grok` mount. A direct sanitized reproduction returned `failed: Auth path is outside the allowed mount` before spawning.
2. `cancelCapture()` calls `cleanupCapture()` before attempting to kill `activeChildProcess`; `cleanupCapture()` clears `activeChildProcess` when the active session matches, so the cancel endpoint does not actually terminate the owned child. A direct sanitized reproduction returned cancellation success with no `kill()` call.
3. The additional parser/persistence suite currently fails 2/4 tests because its child fixtures implement `.on()` but not `.once()`, while the implementation now calls `child.once(...)`. The claimed 17-test focused result omits this existing additional suite; the full capture family is not green.

### Dual score

| Dimension | Score | Rationale |
|---|---:|---|
| Local implementation | 76/100 | Major secret/session/parser/async lifecycle improvements are present, but cancellation ordering is incorrect and a test family is stale/failing. |
| Runtime enforcement | 62/100 | Route locality and Compose binds exist, but the configured bind is incompatible with the default allowlist, and cancel does not kill the owned subprocess. |
| **Headline score** | **62/100** | Capped by runtime enforcement for this production-facing auth/subprocess feature. |

## Delta classification

| Prior finding | Current classification | Evidence |
|---|---|---|
| F1/F6 raw key/token exposure | **RESOLVED** | Start response contains only the opaque session ID, command, status, and safe message. `SafeAuthRecord` contains digest/identity metadata only. Route/UI source assertions pass. |
| F2 path traversal / runtime path | **PARTIALLY RESOLVED; NEW PERSISTENT BLOCKER** | `resolveAndValidateAuthPath()` invokes `ensureUnderAllowed()`, but the Compose path `/host-home/.grok/auth.json` is rejected when the default base is `/home/node/.grok`. `ALLOWED_MOUNT_BASES` is declared but unused. |
| F3 subprocess/session lifecycle | **PARTIALLY RESOLVED; NEW CANCEL BUG** | Async `spawn`, session retention, AbortSignal, timeout, and active-session mutex are implemented. `cancelCapture()` clears the active child reference before killing it, so API cancellation does not terminate the child. |
| F4 forged/stale snapshot | **RESOLVED in code** | Server-held digest snapshot, opaque ID, TTL, single-use handling, stale and ambiguous outcomes are present. |
| F5 parser ambiguity/bounds | **MOSTLY RESOLVED** | Strict Zod object, required issuer/expiry, stable-identity refinement, 1 MiB file cap, 50-record cap, and ambiguous-record rejection are present. Token checking remains length-based rather than format-aware. |
| F7 route integration | **PARTIALLY RESOLVED** | Narrow route-guard regex and segment-boundary test are present; direct management-policy remote rejection was manually exercised successfully. The route test remains mostly source/static boundary coverage rather than full Next route behavior. |
| F8 frontend behavior | **PARTIALLY RESOLVED** | The async start contract now supports immediate UI session receipt and route/modal cancellation wiring exists. No mounted UI interaction test proves cancel/close behavior, and the cancel implementation is currently broken server-side. |
| F9/F10/F11/F12 from prior re-review | **RESOLVED in part, but F10/F12 regress through path/cancel findings** | Local-only regex, immediate spawn return, timeout state, and Compose declarations are present; actual configured path compatibility and cancellation ownership are not closed. |
| F14 behavioral evidence | **EVIDENCE_GAP / REGRESSION** | Route boundary tests pass, but `grok-cli-local-auth-capture-extra.test.ts` fails 2/4 due to mocks not matching the new `.once()` contract. Full focused capture verification is therefore not green. |

## Confirmed corrections

### 1. Route guard and leak prevention

`src/server/authz/routeGuard.ts` now defines:

```ts
const GROK_CLI_LOCAL_CAPTURE_PATTERN =
  /^\/api\/oauth\/grok-cli\/(?:start-cli-login|capture-cli-auth|cancel-cli-auth)\/?$/;
```

It is included in both `LOCAL_ONLY_API_PATTERNS` and `SPAWN_CAPABLE_PATTERNS`. The route test confirms all three exact actions classify as local-only and `/extra` does not match. A direct `managementPolicy.evaluate()` call for a remote peer returned:

```text
{ allow: false, status: 403, code: "LOCAL_ONLY" }
```

This closes the previous route-reachability blocker for the central policy path. The route action itself still relies on the central authz pipeline being active; no full Next request invocation was added.

### 2. Asynchronous `startLocalGrokLogin()`

The implementation now calls `deps.spawn(grokBin, loginArgs, ...)`, stores the child in `activeChildProcess`, installs terminal listeners, and returns immediately at lines 465–473 with an opaque `captureSessionId`. It no longer waits for child `close`, so the confirmation UI can receive the ID while the login process remains open. This correction is real and is covered by the immediate-start test.

### 3. Abort, timeout, and mutex

The current code stores `abortHandler`, `timeoutTimer`, and `forceKillTimer` on the server session. Abort invokes `terminateChild(session, "cancelled")`; timeout invokes `terminateChild(session, "timeout")`; the close handler treats a terminal timeout/cancel as failure even when the child reports a null exit code. `activeCaptureSessionId` rejects a second in-process session.

However, `cancelCapture()` is not safe:

```ts
cleanupCapture(sessionId);
if (activeChildProcess) {
  activeChildProcess.kill("SIGTERM");
}
```

`cleanupCapture()` clears `activeChildProcess` when the active ID matches. The result is a successful cancellation response with no process termination. This is a direct violation of the required cancellation/process-ownership contract.

### 4. Docker binds and parser limits

The following Compose declarations are present and render successfully:

- `docker-compose.yml` CLI profile: `${GROK_AUTH_HOST_DIR:-~/.grok}:/host-home/.grok:rw` and `GROK_AUTH_PATH=${GROK_AUTH_PATH:-/host-home/.grok/auth.json}`.
- `docker-compose.local-instances.yml`: equivalent bind and `GROK_AUTH_PATH` for both local services.
- `docker-compose.prod.yml`: equivalent bind and `GROK_AUTH_PATH`.

All three `docker compose ... config --quiet` checks passed. The image intentionally remains binary-neutral; the deployment must inject a compatible `grok` executable. That prerequisite is documented and missing-binary handling is sanitized.

The parser has the requested `MAX_AUTH_FILE_BYTES = 1_048_576` and `MAX_RECORDS_PER_FILE = 50` limits, strict Zod fields, and stable identity refinement. Those protections are present in both public-safe and internal parsing paths.

The path contract is not actually compatible, however. With the configured `/host-home/.grok/auth.json` and normal Docker `node` home `/home/node`, the default base becomes `/home/node/.grok`; `ensureUnderAllowed()` rejects the configured mounted path. A sanitized direct reproduction confirmed no subprocess was spawned and returned the path-outside-allowed-mount failure.

## Verification performed

### PASS — updated capture and route suite

```text
node --import tsx/esm --test \
  tests/unit/grok-cli-local-auth-capture.test.ts \
  tests/unit/grok-cli-local-auth-capture-route.test.ts

17 pass / 0 fail
```

This covers route pattern membership, immediate return, opaque ID, abort cleanup, timeout cleanup, mutex rejection, traversal, bounded file, and source-level response boundaries.

### FAIL — additional parser/persistence suite

```text
node --import tsx/esm --test tests/unit/grok-cli-local-auth-capture-extra.test.ts

2 pass / 2 fail
```

Both failures occur because `startLocalGrokLogin()` calls `child.once(...)` while the additional test child doubles expose `.on(...)` only. The failing assertions are at `tests/unit/grok-cli-local-auth-capture-extra.test.ts:126` and `:178`. This is either stale test infrastructure or an implementation/mock contract mismatch, but it means the current focused capture test family is not green.

### PASS — route guard regression

```text
node --import tsx/esm --test tests/unit/authz/routeGuard.test.ts

42 pass / 0 fail
```

### PASS — Docker Compose validation

```text
docker compose -f docker-compose.yml config --quiet
 docker compose -f docker-compose.local-instances.yml config --quiet
 docker compose -f docker-compose.prod.yml config --quiet

all passed
```

### PASS — typecheck and scoped lint

```text
npm run typecheck:core
exit 0

scoped eslint
0 errors, 9 warnings
```

The nine warnings are test-fixture `no-explicit-any` warnings.

### NOT RUN — live Docker credential smoke

No live credential smoke was run. This remains acceptable as an operator restriction, but the direct path-compatibility reproduction is sufficient to show that the configured Compose mount currently conflicts with the module's default allowlist.

## Exact blockers preventing approval

1. **Configured mount is rejected by the allowlist**: make `/host-home/.grok` the validated base when `GROK_AUTH_PATH` points there, or derive the base from a fixed allowed mount table without allowing arbitrary paths. Add a regression test using `/host-home/.grok/auth.json` and a Docker-like `/home/node` home.
2. **Cancel does not kill the child**: terminate the child before clearing the active references, or route cancellation through `terminateChild()` and make cleanup ordering explicit. Add a test that calls `cancelCapture(sessionId)` and asserts `SIGTERM`/eventual `SIGKILL`.
3. **Focused test family is failing**: update the additional child doubles to implement the actual `once` interface or provide a compatible abstraction, then rerun all capture suites. Do not claim 17/17 as the complete capture evidence while the additional suite remains 2/4.
4. **Residual verification gap**: add a behavioral management-policy test specifically for the three Grok capture actions and, if approval requires full UI proof, a mounted modal interaction test.

## Reviewer conclusion

Task 0161 remains **REJECTED at 62/100**. The expert corrections are materially present, including route locality, asynchronous spawn/session return, timeout handling, Compose binds, and parser limits. The task cannot legally move to `docs/tasks/03-review/` until the configured Docker path is accepted, cancellation actually terminates the owned child, and the complete focused capture test family passes.
