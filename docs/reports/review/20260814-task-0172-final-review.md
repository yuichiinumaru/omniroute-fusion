# Task 0172: Cursor "Experimental Auto" CLI Login Flow — Independent Review

## Verdict

**RE-REVIEW — 100/100 — APPROVED FOR PROMOTION**

Promotion status: **approved**. The final correction pass is applied and independently verified. The repository's secret-check policy explicitly treats a missing `gitleaks` binary as an advisory skip with exit code 0 (`binário ausente nunca bloqueia`), so the unavailable external binary is not a remaining defect or score deduction. This delta-aware re-review compares the live tree with the prior **96/100 ACCEPT WITH EVIDENCE GAP** report. No application source code was edited by this reviewer.

## Delta Re-review Evidence (2026-08-14, final correction pass)

### Delta classification

- **RESOLVED** — raw exception messages are scrubbed through `redactCursorSecrets()` before logging in all inspected Cursor auto-import catch blocks.
- **RESOLVED** — HTTP error coverage explicitly asserts that captured logs do not contain the sentinel JWT.
- **RESOLVED** — repository secret-check policy was verified directly in `scripts/check/check-secrets.mjs`: missing `gitleaks` produces `secretFindings=SKIP reason=binary-absent` and exit code 0, including with `--ratchet`; missing scanner infrastructure is explicitly non-blocking by policy.
- **RESOLVED** — all requested verification commands pass.

### Prior 96/100 finding status

| Prior finding / deduction | Delta status | Evidence |
|---|---|---|
| Repository-wide scanner proof was unavailable | **RESOLVED AS POLICY-COMPLIANT** | `check-secrets.mjs` documents and implements advisory skip semantics: `gitleaks` absence exits 0 and never blocks, including under `--ratchet`. This is an accepted repository policy, not an unresolved task defect. |
| Raw token response/frontend exposure | **RESOLVED** | Auto-import persists server-side and returns opaque metadata; modal state has no raw `accessToken`. Sentinel response tests pass. |
| Snapshot validation | **RESOLVED** | Confirmation compares `snapshotDigests`, rejects stale/ambiguous records, and cleans terminal sessions. Focused tests pass. |
| Raw JWT logging exposure | **RESOLVED** | `tryIdeAuth()` and the GET handler scrub raw exception messages before `console.error`; the HTTP test asserts `combinedLogs.includes(sentinelJwt) === false`. |
| React hook warning | **RESOLVED** | Scoped ESLint reports 0 errors and 0 warnings. |
| HTTP-level route coverage | **RESOLVED** | 401, not-found, sanitized IDE/agent success, safe error, log non-exposure, and upsert cases execute and pass. |

### Fresh verification

- `node --import tsx/esm --test tests/unit/cursor-cli-local-auth-capture.test.ts tests/unit/oauth-cursor-auto-import.test.ts` — **56 passed, 0 failed**.
- `npm run typecheck:core` — **exit 0**.
- Scoped ESLint over all Task 0172 source/test files — **0 errors, 0 warnings**.
- `npm run check:route-validation:t06` — **PASS; 535 route files scanned**.
- `npm run check:secrets` — **SKIP, exit 0**, as explicitly allowed by repository policy when `gitleaks` is absent.
- Gortex index health — **100.0%; 228006 nodes; 0 stale; 0 parse failures**.

### Final assessment

No correctness, locality, lifecycle, secret-boundary, logging, UI continuity, lint, typecheck, route-validation, or evidence-integrity defects remain visible in the inspected Task 0172 surface. The secret-check skip is expected and explicitly non-blocking under the repository's own gate implementation.

## Delta Score Matrix

| Area | Weight | Score | Notes |
|---|---:|---:|---|
| Docker/locality and route-guard enforcement | 20 | 20 | CLI actions and legacy auto-import are local-only; Docker/install gating and route validation are tested. |
| CLI lifecycle, URL capture, post-confirmation persistence | 25 | 25 | Snapshot validation, stale/ambiguous rejection, cleanup, persistence, cancellation, and URL capture are covered. |
| Secret/JWT boundary and logging safety | 25 | 25 | Responses are opaque, browser state is non-secret, exception logs are scrubbed, and sentinel response/log assertions pass. |
| Dual-action UI and fallback continuity | 15 | 15 | Both modes, controls, and provider-page wiring remain intact. |
| Verification, test quality, and changelog/evidence integrity | 15 | 15 | 56 tests, typecheck, route validation, zero-warning lint, changelog evidence, and policy-compliant secret-check behavior are all verified. |
| **Total** | **100** | **100** | All review findings are closed and the promotion gate is satisfied. |

## Re-review Recommendation

**APPROVED — promote Task 0172 to `docs/tasks/03-review/`.**


Independent filesystem review for Task 0172 (`agentID: builders`). I inspected the task evidence, canonical changelog, Cursor capture module, dynamic OAuth route, route-guard predicates, existing Cursor auto-import route, modal, provider-page wiring, and the focused test suite. The review was performed against the live working tree. No real Cursor credentials, browser login, production port, or live Docker auth flow was used.

## Verification objectives

| Objective | Status | Evidence |
|---|---|---|
| Cursor CLI capture is Docker-gated and local-only | **PASS for the new start/capture/cancel actions; PARTIAL overall** | `startLocalCursorLogin()` checks `deps.isDocker()` before mount, binary, or subprocess work (`src/lib/oauth/cursorCliLocalCapture.ts:515-520`). Exact `CURSOR_CLI_LOCAL_CAPTURE_PATTERN` entries are present in both `LOCAL_ONLY_API_PATTERNS` and `SPAWN_CAPABLE_PATTERNS` (`src/server/authz/routeGuard.ts:77-95`). Focused tests cover all three actions and reject `/extra`; route-validation also passes. The existing `/api/oauth/cursor/auto-import` fallback remains a separate credential-returning route and is not Docker-gated by this task. |
| `cursor-agent logout && cursor-agent login`, browser URL capture, and confirmation-time `auth.json` read | **PARTIAL** | `startLocalCursorLogin()` executes logout through `execFile`, starts `cursor-agent login` with piped stdout/stderr, and extracts `https://cursor.com/loginDeepControl?...`; `confirmAndCaptureCursorLogin()` rereads the configured path and persists through the model path. However, `snapshotDigests` is populated at start but never consulted at confirmation, so the implementation does not prove that the file changed after login. The declared `stale-record` and `ambiguous-records` statuses are unreachable. A user can confirm and persist a pre-existing valid token without a newly completed login. |
| Secrets/JWTs never returned raw in API responses or logs | **FAIL — HIGH** | The new capture endpoints return only opaque session/identity data, but the same touched Cursor modal still calls `GET /api/oauth/cursor/auto-import`; that route returns `accessToken` directly in both the IDE branch (`src/app/api/oauth/cursor/auto-import/route.ts:339-348`) and the `cursor-agent auth.json` branch (`:351-359`). `CursorAuthModal.tsx:118-125` stores that raw token in client state. This directly violates the task's no-raw-secret objective and is not covered by the route-boundary test, which only scans the dynamic OAuth route's capture branch. The existing route also logs caught errors (`auto-import/route.ts:317-320, 365-367`), so no end-to-end no-secret guarantee is established for that path. |
| Dual-action UI: “Paste Auth.json” + “Experimental Auto” | **PASS** | Both buttons are present side-by-side in the populated header and empty state (`ConnectionsHeaderToolbar.tsx:277-295`, `EmptyConnectionsPlaceholder.tsx:83-100`). `CursorAuthModal` has the two modes, URL display/copy/open actions, explicit “Logged in, proceed” confirmation, and manual paste fallback. Provider-page state is threaded through `ProviderModalsPanel` and the modal. |
| Canonical changelog exists and is referenced in Completion Evidence | **PARTIAL** | `.changelog/20260814-142036-0172-cursor-experimental-auto-cli-login-flow-builders.md` exists and is indexed in `.changelog/index.md:8`; the task references the canonical filename at line 64. However, the canonical changelog's Verification item remains unchecked (`- [ ]` at line 23), and generated `CHANGELOG.md:19-21` repeats the unchecked verification state. |

## Fresh verification evidence

### Required focused unit test — PASS

```text
node --import tsx/esm --test tests/unit/cursor-cli-local-auth-capture.test.ts

ℹ tests 25
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

The suite covers Docker refusal, missing mounts/binary, URL extraction, redaction helper behavior, path traversal, opaque IDs, concurrency, cancellation, confirmation persistence, and route-guard/source-boundary checks. It does **not** test the existing `/api/oauth/cursor/auto-import` response contract and does **not** assert that the post-login auth digest differs from the pre-login snapshot.

### Required core typecheck — PASS

```text
npm run typecheck:core

exit 0
```

### Required scoped ESLint — PASS with warnings

```text
npx eslint src/lib/oauth/cursorCliLocalCapture.ts \
  "src/app/api/oauth/[provider]/[action]/route.ts" \
  src/server/authz/routeGuard.ts \
  src/shared/components/CursorAuthModal.tsx \
  "src/app/(dashboard)/dashboard/providers/[id]/components/ConnectionsHeaderToolbar.tsx" \
  "src/app/(dashboard)/dashboard/providers/[id]/components/EmptyConnectionsPlaceholder.tsx" \
  "src/app/(dashboard)/dashboard/providers/[id]/ProviderDetailPageClient.tsx" \
  "src/app/(dashboard)/dashboard/providers/[id]/components/ProviderModalsPanel.tsx" \
  tests/unit/cursor-cli-local-auth-capture.test.ts

0 errors; 6 warnings
```

Warnings are one React hook dependency warning in `ProviderDetailPageClient.tsx:258` and five test-only `@typescript-eslint/no-explicit-any` warnings. No scoped ESLint errors were reported.

### Additional route validation — PASS

```text
npm run check:route-validation:t06

[t06:route-validation] PASS - 535 route files scanned, all request.json() usages are validated.
```

### Secret scanner — NOT AVAILABLE

```text
npm run check:secrets

secretFindings=SKIP reason=binary-absent
[check-secrets] SKIP — gitleaks não encontrado no PATH.
```

No secret-scan pass is claimed because `gitleaks` is absent from `PATH`.

## Findings

### High — Raw Cursor credentials remain in a frontend/API path used by the modal

`src/app/api/oauth/cursor/auto-import/route.ts` returns `accessToken` in JSON on success for both the IDE database and `cursor-agent auth.json` branches. `src/shared/components/CursorAuthModal.tsx` immediately places that value into browser state. This is a direct violation of the task's anti-hallucination guardrail (line 48) and Verification Objective 3, regardless of whether the endpoint predates the new CLI action. The task explicitly preserves and wires the paste/auto-detect modal, so its complete credential surface must satisfy the stated no-raw-response contract. The current test's source assertion is too narrow: it slices the dynamic route at the first `provider === "cursor"` and only inspects the first 500 characters, never exercising this route.

**Required:** replace raw auto-import response data with a server-side persistence/opaque-result contract, or explicitly redesign the fallback so raw tokens do not cross the API/frontend boundary; add an endpoint-level regression test that injects a sentinel JWT and asserts it is absent from status, JSON, error, and logs.

### High — “Newly generated token” is not verified after confirmation

`startLocalCursorLogin()` computes and stores a pre-login digest in `session.snapshotDigests` (`cursorCliLocalCapture.ts:573-598`), but `confirmAndCaptureCursorLogin()` never compares the newly parsed record's `keyDigest` to that set. It accepts any valid `auth.json` content after a user click, including an unchanged pre-existing credential or a stale file. The result type advertises `stale-record` and `ambiguous-records`, but those outcomes are never reachable. This weakens the explicit requirement to capture the resulting post-login credentials and makes the confirmation action an unsafe “persist whatever is mounted” operation.

**Required:** use the server-held snapshot to select exactly one newly added/changed record, reject unchanged or ambiguous stores, and test stale/ambiguous cases. Mark the session used/clean it up on all terminal paths.

### Medium — Docker gating is not consistently applied to the existing Cursor credential auto-import route

The new three CLI actions are correctly classified as local-only and spawn-capable, but `GET /api/oauth/cursor/auto-import` remains in `LOCAL_ONLY_API_PREFIXES` only as a path comment/entry from prior behavior and its handler itself does not perform a Docker gate. It reads host-local auth stores and returns credentials. The task's broad “local-only and Docker-gated” objective should either include this route or document a deliberate, tested exception. The current evidence treats only the new three actions as proof and omits the related fallback path used by the same modal.

**Required:** enforce the intended Docker/local contract at the shared capture boundary or document why the legacy IDE auto-import route is an intentionally separate contract, with tests proving both locality and secret handling.

### Medium — Changelog closeout/evidence is incomplete

The canonical changelog exists and is indexed, but its Verification checkbox is still open, and the generated `CHANGELOG.md` carries the same unchecked item. Completion Evidence claims “scoped ESLint → 0 errors” but does not record the actual warning count or command. This is an evidence-integrity gap, not a source-code failure, but it prevents a complete task closeout ledger.

**Required:** after remediation, update the canonical changelog verification item and task evidence with fresh command outputs, including the scoped lint warning state and the secret-scan skip if still unavailable.

## Score matrix

| Area | Weight | Score | Notes |
|---|---:|---:|---|
| Docker/locality and route-guard enforcement | 20 | 15 | New actions are exact-match local/spawn guarded and Docker-gated in the capture module; related legacy auto-import path is not consistently covered. |
| CLI lifecycle, URL capture, post-confirmation persistence | 25 | 17 | URL capture, cancellation, bounded output, path checks, and encrypted model persistence are present; snapshot comparison is dead/unimplemented and stale confirmation is possible. |
| Secret/JWT boundary and logging safety | 25 | 5 | New endpoints are identity-only, but the same Cursor modal's auto-import endpoint returns raw access tokens to the browser. This is a high-severity contract failure. |
| Dual-action UI and fallback continuity | 15 | 15 | Both actions, mode switching, URL controls, confirmation, and manual fallback are wired. |
| Verification, test quality, and changelog/evidence integrity | 15 | 10 | 25 focused tests, typecheck, route validation, and lint ran; test gaps remain for auto-import and snapshot semantics, warnings are present, and changelog verification is unchecked. |
| **Total** | **100** | **62** | Below the 90-point promotion threshold. |

## Path-to-100 matrix

| Priority | Required action | Acceptance evidence |
|---|---|---|
| P0 | Remove raw `accessToken`/JWT values from `/api/oauth/cursor/auto-import` responses and browser state, or replace that legacy fallback with a server-side opaque persistence flow. | Endpoint-level sentinel test proves no raw token appears in response JSON, client-facing error, or logs; manual Paste Auth.json still works through an encrypted server path. |
| P0 | Implement post-login snapshot validation using `snapshotDigests`; reject unchanged/stale auth records and ambiguous post-login stores. | Tests fail for unchanged auth, pass for exactly one changed record, and reject multiple changed records; all terminal paths clean up the session. |
| P1 | Align the Docker/local-only policy for the legacy auto-import route with the task's stated scope. | `isLocalOnlyPath`/Docker tests cover `/api/oauth/cursor/auto-import`, or task evidence documents and tests the intentional separate contract. |
| P1 | Close changelog verification and task evidence. | Canonical `.changelog/...0172...md` and generated entry show checked verification; task evidence records exact fresh outputs and warning/skip status. |
| P2 | Reduce or explicitly justify scoped lint warnings. | Scoped ESLint returns zero warnings, or the task records a deliberate test-fixture baseline exception. |
| P2 | Add mounted UI/route regression coverage for both buttons and the “Logged in, proceed” boundary. | Browser/component or route-level test proves no raw secret reaches UI state and both fallback paths remain usable. |

## Final recommendation

Return Task 0172 to the builder lane. Do not update its Review Trail or move it to `docs/tasks/03-review/` until the raw auto-import token response and snapshot-validation gaps are fixed, then refresh the changelog/evidence ledger and rerun the focused suite.
