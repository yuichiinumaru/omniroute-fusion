# Final Delta-Aware Filesystem Re-Review: Task 0161 — Grok CLI local auth capture

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0161-omniroute-grok-cli-local-auth-capture.md` at review start.
- **Review date**: 2026-08-13.
- **Mode**: independent final filesystem re-review under the operator rule.
- **Operator rule**: `90–100 = APROVADO`; `<90 = REJECTED`.
- **Previous evidence read**:
  - Original independent review: `docs/reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-review.md` — `38/100`.
  - Prior delta re-review: `docs/reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-final-rereview.md` — `48/100`.
  - Prior filesystem re-review: `docs/reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-final-rereview-v2.md` — `62/100`.
  - Current task Closure Matrix, Completion Evidence, and Review Ledger.
- **Files inspected**: current capture module, route guard and route boundary tests, OAuth route boundary, OAuthModal boundary, extra capture tests, core capture tests, Compose files, and relevant Docker contract.
- **Restrictions honored**: no subagent/sub-reviewer, no correction reversion, no git, no forbidden production port, no live credential access, no changelog execution, and no `04-completed` action.

## Final score and verdict

### **94/100 — APROVADO**

The expert's three requested corrections are present in the current filesystem and are independently verified by source inspection, sanitized runtime probes, and fresh tests. The task is legally promoted from `docs/tasks/02-doing/` to `docs/tasks/03-review/` after this Ledger update. Per the operator instruction, no additional path-to-100 review is performed after approval.

### Dual production-facing score

| Dimension | Score | Rationale |
|---|---:|---|
| Local implementation | 96/100 | The prior path, cancellation-ordering, and fixture defects are corrected; the session, parser, redaction, identity, timeout, and persistence boundaries are covered by focused tests. |
| Runtime enforcement | 92/100 | Both custom Docker mount bases are accepted, route locality is enforced, Compose wiring is present, and cancellation owns the child. A live credential smoke was intentionally not run, and the `grok` binary remains an explicit deployment injection prerequisite. |
| **Headline score** | **94/100** | Above the 90-point approval threshold. |

## Requested correction verification

### 1. Custom Docker mount allowlist — **RESOLVED**

Current `src/lib/oauth/grokCliLocalCapture.ts` contains the fixed allowlist:

```ts
const ALLOWED_MOUNT_BASES = [
  "/root/.grok",
  "/home",
  "/host-home/.grok",
  "/host-local/.grok",
];
```

`resolveAndValidateAuthPath()` evaluates the default container-home base plus these fixed mount bases and returns the matched validated base. The current `readGrokAuthStore()` path is therefore validated before file access.

Independent sanitized probe with `homedir() === "/home/node"`, an in-memory auth file, and no real credentials returned:

```text
/host-home/.grok { ok: true, status: 'ok', records: 1 }
/host-local/.grok { ok: true, status: 'ok', records: 1 }
```

The focused regression test `read accepts configured host mounts with a Docker-like home` exercises both paths. The Compose files also declare the supported `/host-home/.grok` bind and `GROK_AUTH_PATH`:

- `docker-compose.yml` CLI profile: `${GROK_AUTH_HOST_DIR:-~/.grok}:/host-home/.grok:rw`, `GROK_AUTH_PATH=/host-home/.grok/auth.json`.
- `docker-compose.local-instances.yml`: same bind and environment contract for the local services.
- `docker-compose.prod.yml`: same bind and environment contract for production configuration.

The runtime image intentionally does not bundle the host-managed/proprietary `grok` binary; missing binary remains a sanitized fail-closed outcome and binary injection is explicitly documented. This is a deployment prerequisite, not an unresolved filesystem correction.

### 2. `cancelCapture()` kill-before-cleanup — **RESOLVED**

Current implementation at `src/lib/oauth/grokCliLocalCapture.ts:895–910`:

```ts
session.terminalStatus = "cancelled";
const child = activeCaptureSessionId === sessionId ? activeChildProcess : null;
if (child) {
  try {
    child.kill("SIGTERM");
  } catch { /* already dead */ }
}
cleanupCapture(sessionId);
```

The child reference is captured before `cleanupCapture()` can clear `activeChildProcess`, and `kill("SIGTERM")` is executed before cleanup. Independent sanitized probe output:

```text
{ start: 'started', cancel: { ok: true, safeMessage: 'Capture session cancelled.' }, killCalls: [ 'SIGTERM' ] }
```

The focused test `cancelCapture kills the owned child before clearing its reference` also asserts the child was killed. AbortSignal and timeout paths continue to use the owned-child termination helper and retain SIGTERM/SIGKILL cleanup behavior.

### 3. Extra test fixture `.once()` correction — **RESOLVED**

Both child doubles in `tests/unit/grok-cli-local-auth-capture-extra.test.ts` now implement `.once()` with callback chaining behavior matching the production `startLocalGrokLogin()` contract. The repaired suite passes:

```text
node --import tsx/esm --test tests/unit/grok-cli-local-auth-capture-extra.test.ts

4 pass / 0 fail
```

The prior failures at the ambiguity and encrypted-persistence assertions are gone. The extra tests now prove ambiguous fresh-record rejection, encrypted persistence boundary use, declaration-order parsing, and exact identity preservation.

## Delta classification against the prior 62/100 review

| Prior finding | Current classification | Current evidence |
|---|---|---|
| Custom `/host-home/.grok` path rejected | **RESOLVED** | Fixed allowlist includes `/host-home/.grok` and `/host-local/.grok`; both paths pass a Docker-like sanitized read probe and focused regression test. |
| `cancelCapture()` skipped child kill | **RESOLVED** | Child is captured and killed with SIGTERM before cleanup; direct probe records `SIGTERM`; focused test passes. |
| Extra tests failed due to missing `.once()` | **RESOLVED** | Both fixtures implement `.once()`; extra suite is 4/4 green. |
| Route locality | **RESOLVED** | Exact segment-safe route pattern remains active; route suite confirms all three actions and rejects `/extra`; authz suite is green. |
| Opaque session / raw secret boundary | **RESOLVED** | Start response carries only command, status, safe message, and opaque session ID; source and route tests reject raw token fields. |
| Async start protocol | **RESOLVED** | `startLocalGrokLogin()` returns immediately after `spawn`; the child remains owned by the server session and terminal events update state. |
| Timeout/abort/session cleanup | **RESOLVED for scoped single-process contract** | Abort, timeout, null close-code, active-session rejection, and cleanup tests pass. Multi-worker distributed locking remains outside this scoped implementation. |
| Parser bounds and identity | **RESOLVED for scoped contract** | 1 MiB/50-record bounds, strict schema, issuer/expiry, stable identity, stale/ambiguous outcomes, and encrypted persistence tests pass. |
| Mounted UI interaction coverage | **MINOR EVIDENCE GAP, non-blocking** | Route/UI boundary tests verify source-level session, cancellation, and identity-only contracts; no browser-mounted interaction test was required by this final correction scope. |

## Fresh verification evidence

### PASS — complete focused capture family

```text
node --import tsx/esm --test \
  tests/unit/grok-cli-local-auth-capture.test.ts \
  tests/unit/grok-cli-local-auth-capture-extra.test.ts \
  tests/unit/grok-cli-local-auth-capture-route.test.ts

23 pass / 0 fail
```

Coverage includes Docker gating, missing mount/binary, opaque-session response, traversal-before-read, both mapped mount bases, direct cancellation kill ordering, AbortSignal cancellation, timeout cleanup, concurrent-session rejection, forged session rejection, file bounds, parser/persistence behavior, route locality, response redaction, and modal cancellation boundaries.

### PASS — expanded capture/authz run

```text
node --import tsx/esm --test \
  tests/unit/grok-cli-local-auth-capture.test.ts \
  tests/unit/grok-cli-local-auth-capture-extra.test.ts \
  tests/unit/grok-cli-local-auth-capture-route.test.ts \
  tests/unit/authz/routeGuard.test.ts

65 pass / 0 fail
```

### PASS — Grok OAuth/redaction regressions

```text
node --import tsx/esm --test \
  tests/unit/grok-cli-oauth.test.ts \
  tests/unit/grok-cli-cancellation-redaction.test.ts \
  tests/unit/oauth-poll-redaction.test.ts

24 pass / 0 fail
```

### PASS — typecheck

```text
npm run typecheck:core

exit 0
```

### PASS — scoped lint

```text
npx eslint \
  src/lib/oauth/grokCliLocalCapture.ts \
  tests/unit/grok-cli-local-auth-capture.test.ts \
  tests/unit/grok-cli-local-auth-capture-extra.test.ts \
  tests/unit/grok-cli-local-auth-capture-route.test.ts

0 errors, 13 warnings
```

All warnings are existing test-fixture `@typescript-eslint/no-explicit-any` warnings; no lint errors were introduced.

### PASS — rendered Compose validation

```text
docker compose -f docker-compose.yml --profile cli config --quiet
docker compose -f docker-compose.local-instances.yml config --quiet
docker compose -f docker-compose.prod.yml config --quiet

all passed
```

### NOT RUN — live credential/Docker binary smoke

No real auth file, credential, production port, or live Docker login was used. The image's missing `grok` binary remains an explicit deployment injection prerequisite, and the implementation returns a sanitized `missing-binary` result when it is absent. This restriction was honored and does not reopen any of the three corrected blockers.

## Residual notes (non-blocking)

- The allowlist intentionally includes `/home` to support container-home layouts; callers still pass through path-segment-safe `ensureUnderAllowed()`.
- The module-level capture lock is process-local. Cross-worker/distributed serialization is not claimed by this task's scoped tests.
- UI verification is source/boundary based rather than a mounted browser interaction test.

## Final conclusion

**APROVADO — 94/100.** The current filesystem contains all three requested corrections, and the fresh verification evidence is green. The task is promoted legally to `docs/tasks/03-review/0161-omniroute-grok-cli-local-auth-capture.md`. No further path-to-100 review is performed after this approval.
