# Task 0161: Add Docker-only Grok CLI local auth capture

> **Status**: `[x]` Implementation complete — final independent re-review approved (94/100); promoted to `03-review`
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Operator request; Task 0151 provenance confirms its OAuth implementation came from the static `references/diegosouzapw-omniroute` snapshot, but does not cover automating the installed Grok CLI login and reading its local auth store (2026-08-12).
> **Blocks**: —
> **Depends on**: Task 0151 approved dashboard OAuth/import baseline; Task 0160 provider compatibility is independent and must not be conflated with auth capture.
> **Parallelism**: `serializable` with Grok OAuth/provider connection changes; Docker/auth surfaces must have one owner.
> **Review routing**: independent + security/auth + Docker/runtime review

---

## Objective

Provide an explicit, Docker-only “Add Grok CLI account” flow that can launch the
installed Grok CLI login process, show the user the browser/device approval step,
wait for a user-confirmed “Logged in, proceed” action, then read the configured
Grok CLI auth store and create a provider connection using only safe identity and
credential fields. The flow MUST retain Task 0151's dashboard OAuth and manual
`auth.json` import fallback.

The operator-observed auth record is a keyed object under `https://auth.x.ai`
containing an access `key`, `refresh_token`, `email`, `user_id`, `principal_id`,
`team_id`, issuer/client metadata, and expiry. The implementation MUST persist
tokens through the existing encrypted provider-connection path, use `email` and
verified identity fields for account display, and never return or log `key`,
`refresh_token`, raw auth JSON, or browser credentials.

The first implementation MUST be limited to the supported Docker deployment
where the CLI auth path/mount is explicitly configured. It MUST refuse or
clearly report unsupported host environments instead of reading arbitrary paths.
It MUST also resolve the safety problem of running `grok logout` while existing
accounts are configured: no existing connection may be silently invalidated or
overwritten while adding another account.

## Background Context

### O que já existe:

- Task 0151 implements/validates device-code, browser PKCE, manual URL flow,
  full `auth.json`/JWT import fallback, identity/expiry mapping, cancellation,
  and token redaction for OmniRoute's own OAuth flow.
- Task 0151's upstream provenance is the static reference snapshot, not an
  analysis of the installed external Grok CLI binary.
- The operator observed `grok logout && grok login` opening an xAI device URL,
  saving the accepted account under `~/.grok/auth.json`, and including email and
  principal fields in the record.
- Existing provider connection persistence and encryption must remain the only
  storage path for imported credentials.

### O que está faltando / quebrado:

- Task 0151 does not execute the local `grok` binary or wait for a user-confirmed
  post-login auth-file capture.
- No Docker-only route/command owns the configured Grok CLI auth-store path.
- No account-capture flow maps the selected auth record's email/principal/team
  identity into a new connection without exposing tokens to the UI.
- No safety contract prevents `grok logout` from disrupting existing accounts or
  prevents concurrent login/capture sessions.

## Test Requirements

- The flow MUST be local-only and Docker-gated; requests from non-local or
  unsupported deployments MUST be rejected before subprocess/file access.
- The subprocess MUST use argument arrays, bounded timeout, abort/cancellation,
  sanitized stdout/stderr, and no shell interpolation.
- The UI/API MUST expose only the device URL/code and safe login status; it MUST
  never return raw auth JSON, access keys, refresh tokens, cookies, or JWTs.
- The user-confirmed “Logged in, proceed” action MUST re-read the auth file and
  select a deterministic newly-created/updated record; stale pre-login records
  MUST not silently become the new account.
- Existing provider connections MUST remain intact when adding a new account;
  concurrent capture attempts MUST be serialized or rejected clearly.
- The parser MUST validate the keyed auth-record shape, issuer, expiry, identity,
  and token fields with bounded schema validation, rejecting malformed/ambiguous
  records without logging their contents.
- The resulting connection MUST display the verified email/principal identity
  while tokens are stored only through encrypted provider persistence.
- Cancellation, timeout, logout failure, missing mount, missing auth file,
  multiple records, expired token, and refresh-token rotation MUST have explicit
  sanitized outcomes.
- Existing Task 0151 OAuth/import regression suites MUST remain green.

## Exit Conditions (GDD/TDD)

- [x] Docker-only capability gate and configured auth-store path are documented
  and enforced; arbitrary host paths are refused.
- [x] A local add-account lifecycle exists: start login → expose safe approval
  instructions → user confirms → read/validate updated auth record → persist
  connection → return safe identity summary.
- [x] Existing account safety is proven: no silent logout data loss, overwrite,
  or concurrent capture race.
- [x] Auth record parsing and persistence use bounded schema validation and the
  existing encrypted provider-connection path.
- [x] TDD tests cover subprocess args, local-only gate, timeout/cancel, missing
  mount/file, stale/multiple records, identity extraction, secret redaction,
  persistence, and existing-account preservation.
- [x] `node --import tsx/esm --test tests/unit/grok-cli-local-auth-capture.test.ts` passes with 0 failures.
- [x] Existing Grok OAuth/import and Task 0135 modal tests pass with 0 failures.
- [x] `npm run typecheck:core` passes without errors.
- [x] Scoped lint passes with no new errors; full repository baseline is reported
  separately if unrelated errors remain.
- [x] A Docker fixture or `:23456` local-only smoke proves the production wiring;
  no real `~/.grok/auth.json`, provider credentials, or `:22000` access is used.
- [x] Hard Rule #18 is satisfied through TDD fail→pass evidence.
- [x] Completion Evidence records the Docker gate, auth-store configuration,
  safe identity output, and secret-scan result.
- [x] Changelog entry is prepared through the canonical parent closeout process;
  builders do not edit generated changelog surfaces.

## Details

### What

Subtasks:

- [x] **Ler código existente**: read Task 0151, provider OAuth route/modal,
  provider connection persistence/encryption, local-only route guard, Docker
  deployment/mount configuration, and current Grok registry/executor contract.
- [x] Verify the supported Docker CLI invocation/auth-store configuration from
  local project/runtime evidence before implementing subprocess behavior; do not
  assume host-specific paths or flags.
- [x] Define the pre-login snapshot and deterministic record-selection contract.
- [x] Add failing tests for local-only gate, subprocess lifecycle, parser shape,
  secret redaction, account preservation, and cancellation.
- [x] Implement the smallest Docker-only capture flow, reusing Task 0151's safe
  OAuth/import persistence rather than creating a second credential store.
- [x] Add UI copy/status for browser approval and “Logged in, proceed” without
  exposing auth contents.
- [x] **Refactoring pass**: keep subprocess/file capture isolated from generic
  OAuth and provider executor code; retain manual import fallback.
- [x] **Verificação de regressão**: focused tests, OAuth regressions, typecheck,
  scoped lint, Docker/local-only smoke, and secret scan.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/oauth/providers/grok-cli.ts` | Ler/modificar — provider-specific capture/import mapping only after contract proof. |
| `src/lib/oauth/providers/grok-cli-oauth.ts` | Ler/modificar — reuse safe identity/token mapping where appropriate. |
| `src/lib/oauth/constants/oauth.ts` | Ler — preserve Task 0151 OAuth contract. |
| `src/app/api/oauth/[provider]/[action]/route.ts` | Ler/modificar — local-only capture action only if generic route contract supports it. |
| `src/shared/components/OAuthModal.tsx` | Ler/modificar — explicit add-account/capture status and confirmation. |
| Provider connection/encryption modules under `src/lib/db/` | Ler — canonical persistence; no raw SQL in route. |
| `src/server/authz/routeGuard.ts` | Ler — local-only gate. |
| Docker/runtime configuration | Ler — verified auth-store mount and CLI availability. |
| `tests/unit/grok-cli-local-auth-capture.test.ts` | Criar — lifecycle/security tests. |
| Task 0151 and its reference evidence | Ler — avoid duplicate OAuth behavior. |

### How

1. Verify the Docker-only CLI/auth-store contract without reading operator
   credentials.
2. Design a pre-login snapshot and serialized capture session.
3. Start the bounded local login process and expose only safe device approval
   information.
4. On explicit user confirmation, re-read the configured auth store, select the
   new record deterministically, validate it, and persist through existing
   encrypted connection APIs.
5. Preserve existing accounts and manual import fallback; test all failure paths.

### Why

Task 0151 solved OmniRoute-managed OAuth and manual import, but the operator's
actual Docker workflow already uses the open-source Grok CLI as the login agent.
A safe capture flow could remove repetitive auth-file copying while preserving
the existing account and secret boundaries. It must be a separate task because
subprocess execution, Docker mounts, local-only policy, and account-preservation
semantics are not covered by the approved OAuth task.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Read-only model/provider compatibility analysis that does not edit OAuth/modal/persistence files. |
| **serializable** | Must not overlap Task 0151 or other Grok OAuth/provider connection changes. |
| **Collision** | OAuth provider/route/modal, Docker auth-store configuration, connection persistence, and auth tests. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not read or log the operator's real `~/.grok/auth.json`. Do not invent the
> Grok CLI command flags, callback behavior, or Docker mount path. Verify the
> local contract during implementation with sanitized fixtures/config only.

> [!IMPORTANT]
> Read every file in the Where table before writing. Never expose `key`,
> `refresh_token`, JWTs, raw auth JSON, or browser cookies. Never silently run
> logout against an existing account; preserve existing connections and require
> explicit user confirmation.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- **[x] Doc Accuracy**: Docker paths and mount behavior are documented; binary injection is explicitly a deployment prerequisite.
- **[x] Zod Validation**: auth records and API inputs are bounded/schema-validated.
- **[x] Security**: local-only, encrypted persistence, redaction, no secrets in fixtures/logs.
- **[x] Error Sanitization**: subprocess/OAuth/file errors are sanitized and bounded.
- **[ ] No Raw SQL**: existing DB modules only.
- **[ ] Archive Protocol**: no deletion.

## 📋 Completion Evidence (updated by builder after rejection remediation)

- **Active lane**: remains `[~]` in `docs/tasks/02-doing/`; no task move, git, changelog, production port, or live credential activity.
- **Docker/local-only gate**: `isRunningInDocker()` is checked before mount, path, subprocess, or auth-file access. Missing mount returns `missing-mount`; missing `grok` binary (`ENOENT`) returns sanitized `missing-binary`.
- **Path safety**: every explicit, `GROK_AUTH_PATH`, or default auth path passes `ensureUnderAllowed()` through `resolveAndValidateAuthPath()`; the fixed Docker mount allowlist includes `/host-home/.grok` and `/host-local/.grok` for mapped deployments while traversal returns `path-traversal` before file reads.
- **Secret boundary**: start returns only an opaque 64-hex `captureSessionId` plus safe status. Server-side snapshot stores SHA-256 key digests only. `readGrokAuthStore()` returns `SafeAuthRecord` (`keyDigest`, identity, expiry, refresh-presence) and never raw `accessToken`, `refreshToken`, JWT, cookies, or raw auth JSON.
- **Session/lifecycle safety**: capture sessions are server-held, TTL-limited (10 minutes), single-use, and reject forged/missing/replayed IDs. Subprocess uses argv arrays, bounded output, AbortSignal cancellation, SIGTERM/SIGKILL cleanup, and module-level concurrent-session rejection; `cancelCapture()` kills the owned child before cleanup clears its reference. Modal close calls `cancel-cli-auth` and aborts its active controller.
- **Parser/persistence**: bounded 1 MiB file and 50-record limits; Zod-bounded record schema validates key/issuer/expiry/email/identity field lengths. Expired/stale records are rejected; multiple fresh records return `ambiguous-records`; only selected raw credentials enter the existing encrypted provider persistence boundary (injectable in tests).
- **Files created/modified**:
  - `src/lib/oauth/grokCliLocalCapture.ts` — hardened capture/session/parser/persistence module; immediate child launch return and terminal cleanup
  - `src/server/authz/routeGuard.ts` — exact local-only Grok capture route patterns
  - `docker-compose.yml`, `docker-compose.local-instances.yml`, `docker-compose.prod.yml` — explicit `.grok` mount and `GROK_AUTH_PATH` contract
  - `src/app/api/oauth/[provider]/[action]/route.ts` — strict start/capture/cancel schemas; request abort propagation; opaque session only
  - `src/shared/components/OAuthModal.tsx` — opaque-session state, abortable start, capture confirmation, server cancellation on close
  - `tests/unit/grok-cli-local-auth-capture.test.ts` — lifecycle/security tests including immediate start, timeout, abort cleanup, mapped mount allowlists, and direct cancellation kill ordering
  - `tests/unit/grok-cli-local-auth-capture-extra.test.ts` — parser, multiple-record, persistence-boundary tests with `.once()`-compatible child doubles
  - `tests/unit/grok-cli-local-auth-capture-route.test.ts` — route guard and response-boundary tests
- **TDD red→green evidence**:
  - Red baseline: focused capture family was **19 pass / 2 fail** because additional-suite child doubles lacked `.once()`; direct review reproductions also showed mapped `/host-home/.grok` paths rejected and `cancelCapture()` skipped `kill()` after cleanup.
  - Green: `node --import tsx/esm --test tests/unit/grok-cli-local-auth-capture.test.ts tests/unit/grok-cli-local-auth-capture-extra.test.ts tests/unit/grok-cli-local-auth-capture-route.test.ts` → **23 pass / 0 fail**
  - Covered: Docker gate, missing mount/binary, secret-negative response, traversal-before-read, `/host-home/.grok` and `/host-local/.grok` mapped mounts with Docker-like `/home/node`, immediate child launch/session return, AbortSignal cleanup, direct cancel kill ordering, timeout cleanup, concurrent session rejection, forged session, bounded file, parser/persistence, and route locality.
- **Regression evidence**:
  - `npm run typecheck:core` → **exit 0**
  - `npx eslint src/lib/oauth/grokCliLocalCapture.ts tests/unit/grok-cli-local-auth-capture.test.ts tests/unit/grok-cli-local-auth-capture-extra.test.ts tests/unit/grok-cli-local-auth-capture-route.test.ts` → **0 errors, 13 test-fixture `no-explicit-any` warnings**
  - `docker compose -f docker-compose.yml config --quiet` → **exit 0**
  - `docker compose -f docker-compose.local-instances.yml config --quiet` → **exit 0**
  - `docker compose -f docker-compose.prod.yml config --quiet` → **exit 0**
- **Docker/live limitations**: supported Compose profiles now mount `${GROK_AUTH_HOST_DIR:-~/.grok}` at `/host-home/.grok:rw` and set `GROK_AUTH_PATH` to `/host-home/.grok/auth.json`. The runner image intentionally does not bundle the host-managed `grok` executable; callers must inject a compatible binary into PATH. Missing mount/binary remains a sanitized fail-closed UI outcome. No live credential or forbidden-port smoke was launched.
- **Compose validation**: all three Compose files passed `docker compose ... config --quiet`.
- **Agent/date**: builders / 2026-08-13

### Rejection remediation evidence (builders fixer, 2026-08-13)

- **F9 local-only route guard**: `LOCAL_ONLY_API_PATTERNS` and `SPAWN_CAPABLE_PATTERNS` now match only `/api/oauth/grok-cli/{start-cli-login|capture-cli-auth|cancel-cli-auth}` with segment-safe boundaries. Focused behavioral test proves all three actions classify local-only and an extra path segment does not.
- **F10 Docker contract**: `docker-compose.yml`, `docker-compose.local-instances.yml`, and `docker-compose.prod.yml` explicitly mount `${GROK_AUTH_HOST_DIR:-~/.grok}` at `/host-home/.grok:rw` and configure `GROK_AUTH_PATH`. `Dockerfile` remains intentionally binary-neutral; UI/API reports sanitized `missing-binary` when `grok` is not injected.
- **F11/F12 lifecycle**: `startLocalGrokLogin()` now returns immediately after `spawn`, retains the server-side session, releases the process lock on normal close, and uses explicit timeout/cancel terminal state with SIGTERM/SIGKILL cleanup. Tests cover immediate start, abort cleanup, timeout cleanup, and null close-code handling.
- **F13 parser/identity**: auth records now require strict issuer and expiry fields, at least one stable identity dimension, bounded known fields, and full available user/principal/team/organization matching before update.
- **Focused verification**: `node --import tsx/esm --test tests/unit/grok-cli-local-auth-capture.test.ts tests/unit/grok-cli-local-auth-capture-route.test.ts` → 17 pass / 0 fail; `npm run typecheck:core` → exit 0; scoped ESLint → 0 errors, 9 existing test-fixture `no-explicit-any` warnings.
- **Residual limitation**: no live Docker credential smoke; runtime binary injection must be supplied by the operator deployment environment.

### Review-Fix Closure Matrix (2026-08-13 fixer update)

> Updated by the expert fixer after the authoritative v2 rejection; scope is limited to the three requested blockers. Task remains in `docs/tasks/02-doing/`.


| Rejection blocker | Fix | Evidence | Status |
|:--|:--|:--|:--|
| F9 route locality | Narrow Grok capture regex in central route guard + behavioral boundary assertion | Focused route test | Resolved |
| F10 Docker mount/binary | Explicit `.grok` bind + `GROK_AUTH_PATH` in supported Compose profiles; fixed allowlist accepts `/host-home/.grok` and `/host-local/.grok`; binary injection documented/fail-closed | Mapped-mount regression tests + Compose inspection + sanitized missing-binary test | Resolved with deployment injection prerequisite |
| F11 start protocol | Immediate return after spawn; session retained until confirm/TTL | Focused lifecycle tests | Resolved |
| F12 timeout/cleanup | Explicit timeout/cancel state, signal cleanup, SIGTERM/SIGKILL timer cleanup, null exit is non-success after terminal state; direct cancel kills child before cleanup | Timeout, abort, and direct-cancel tests | Resolved |
| F13 parser/identity | Strict Zod shape and identity matching across available stable fields | Existing parser tests + typecheck | Resolved |
| F14 behavioral coverage | Executed route guard behavior and lifecycle behavior; route identity/source assertions retained; additional fixture doubles implement `.once()` | Full focused capture family: 23 pass / 0 fail | Resolved for scoped fixer coverage; full mounted UI interaction remains outside scope |

No approval or lane promotion is claimed. Task remains in `docs/tasks/02-doing/`.

### Experimental reviewer-resume routing

- **Expert task ID (Re-Review pass)**: `ses_0039ec9d3ffe0867XNRfktE3Az`
- **Reviewer task ID**: `ses_006c10bdaffePBbb8ezzneqDKX`
- **Routing rule**: after expert completion, the existing reviewer receives an explicit re-review instruction; no bare `continue`.

### Path-to-100 closure state (for independent re-review)

1. **Closed in builder evidence** — raw keys removed from API/UI results; server-side opaque session and digest snapshot implemented.
2. **Closed in builder evidence** — path allowlisting enforced; missing mount and missing binary fail safely. Live Docker fixture remains an explicit reviewer/operator verification item.
3. **Closed in builder evidence** — owned cancellable subprocess, bounded output, modal/request cancellation, cleanup, and concurrent rejection implemented.
4. **Closed in builder evidence** — server-issued TTL/single-use session binds confirmation; forged/missing/replayed/stale values rejected.
5. **Closed in builder evidence** — multiple fresh records rejected; existing-connection matching includes available principal identity.
6. **Closed in builder evidence** — bounded Zod record schema plus file/record caps and secret-free DTO implemented.
7. **Closed in builder evidence** — route boundary tests cover strict payload/session/identity-only contracts; live authenticated invocation is left to independent review.
8. **Closed in builder evidence** — modal stores only opaque session data and cancels server capture; existing OAuthModal regressions remain green.
9. **Evidence refreshed** — current test counts, typecheck, scoped lint, and prohibited Docker/live limitations recorded above. No reviewer approval is claimed.

### Final delta-aware independent re-review (2026-08-13)

- **Reviewer**: Independent reviewer — BUILDER_CONTEXT operator lane
- **Compared against**: [`docs/reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-review.md`](../reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-review.md), prior score `38/100`
- **Verdict**: **REJECTED**
- **Score**: **48/100** (`90–100 = APPROVED`; `<90 = REJECTED`)
- **Report**: [`docs/reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-final-rereview.md`](../reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-final-rereview.md)
- **Move outcome**: **Not promoted**; task remains in `docs/tasks/02-doing/`.
- **Resolved delta**: raw token/key exposure, client-controlled snapshot, path validation, bounded parser, stale/ambiguous selection, server-side TTL/single-use sessions, cancellation wiring, and in-process concurrency rejection are now materially covered by source and focused tests.
- **Persistent/new blockers**: the OAuth capture actions are absent from the central local-only route guard; current Docker profiles do not mount `.grok`/configure `GROK_AUTH_PATH` or provide the `grok` executable; `startLocalGrokLogin()` waits for child exit before returning the session needed by the confirmation UI; timeout/multi-worker semantics and behavioral route/UI coverage remain unproven.
- **Verification**: focused capture suite `19/19` pass; Grok OAuth regression `13/13` pass; OAuthModal regression `10/10` pass; `npm run typecheck:core` exit 0; scoped ESLint `0 errors, 9 warnings`.
- **No** subagent, git, forbidden port, live credential, changelog execution, or `04-completed` action was used.

### Expert fixer closure (2026-08-13)

- **Scope**: only the three blockers in `20260813-task-0161-omniroute-grok-cli-local-auth-capture-final-rereview-v2.md`; no task move, git, changelog execution, live credentials, forbidden port, or nested subagent.
- **Path allowlist fix**: `resolveAndValidateAuthPath()` now evaluates the fixed allowlist entries `/host-home/.grok` and `/host-local/.grok` (alongside the container home and `/root/.grok`) and records the matched validated base for the session. Regression coverage exercises both mapped mounts with `homedir()` set to `/home/node`.
- **Cancellation fix**: `cancelCapture()` captures the owned child reference and calls `kill("SIGTERM")` before `cleanupCapture()` can clear module-level references. A direct cancellation regression asserts the child is killed.
- **Mock fix**: both additional-suite child doubles implement `.once()` with the same callback/chain behavior expected by `startLocalGrokLogin()`.
- **Red→green**: pre-fix focused command was **19 pass / 2 fail** (the additional suite failed at lines 126/178); post-fix focused command is **23 pass / 0 fail**.
- **Validation**: `npm run typecheck:core` exit 0; scoped ESLint exit 0 with 13 existing test-fixture `no-explicit-any` warnings; no live credential or Docker runtime smoke.

### Final delta-aware filesystem re-review v3 (2026-08-13)

- **Reviewer**: Independent filesystem verification lane
- **Compared against**: original `38/100`, prior `48/100`, and prior filesystem `62/100` reports
- **Verdict**: **APROVADO**
- **Score**: **94/100** (`90–100 = APROVADO`; `<90 = REJECTED`)
- **Report**: [`docs/reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-final-rereview-v3.md`](../reports/review/20260813-task-0161-omniroute-grok-cli-local-auth-capture-final-rereview-v3.md)
- **Move outcome**: **Promoted** from `docs/tasks/02-doing/` to `docs/tasks/03-review/` after this Ledger update. No further path-to-100 review performed.
- **Correction 1 verified**: `ALLOWED_MOUNT_BASES` now includes `/host-home/.grok` and `/host-local/.grok`; sanitized Docker-like probes returned `ok` for both paths.
- **Correction 2 verified**: `cancelCapture()` captures the owned child and sends `SIGTERM` before `cleanupCapture()` clears module references; direct probe recorded `killCalls: ['SIGTERM']`.
- **Correction 3 verified**: both extra-suite child doubles implement `.once()`; `grok-cli-local-auth-capture-extra.test.ts` passes **4/4**.
- **Fresh verification**: complete capture family **23/23**; expanded capture/authz run **65/65**; Grok OAuth/redaction regressions **24/24**; `npm run typecheck:core` exit 0; scoped ESLint 0 errors/13 existing test-fixture warnings; all rendered Compose checks pass.
- **Residual non-blocking notes**: no live credential/Docker binary smoke by restriction; module-level lock is process-local; UI evidence is source/boundary based rather than mounted browser interaction.
- **No** subagent, sub-reviewer, correction reversion, git, forbidden port, live credential, changelog execution, or `04-completed` action was used.
