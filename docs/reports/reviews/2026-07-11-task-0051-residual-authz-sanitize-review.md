# Review Report: Task 0051 — Residual Authz + Error Sanitize Sweep — 2026-07-11

## Review Lineage

- **Current task**: Task 0051 (`omniroute-residual-authz-error-sanitize-sweep`); live path `docs/tasks/03-review/0051-omniroute-residual-authz-error-sanitize-sweep.md`
- **Commit**: `546546f` — `fix(authz): residual sanitize + public health/ping + A2A fail-closed (0051)`
- **Previous reports read**: none under `docs/reports/reviews/` for 0051
- **Source findings**: `docs/reports/07-app-api.md` (F-07-014/009/010/011), `docs/reports/04-mcp-edge-runtime.md` (F-04-W2-004), `docs/reports/06-lib-features-tooling.md` (F-06-008)
- **Review mode**: `initial` (independent)
- **Reviewer profile**: `reviewers` (Code Quality Reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 97 | Helper sanitize, health split, ping public, MCP+A2A, tests, CHANGELOG, residual backlog all present |
| F-07-014 helper default | 98 | `createErrorResponse` / `FromUnknown` always sanitize message+details |
| F-07-009 public health | 90 | Unauth allowlist solid; full dump gated on `verifyAuth` (not open-install bypass). Any valid client API key can still unlock full dump because path is PUBLIC → non-management auth path |
| F-07-010 ping public | 98 | PUBLIC_READONLY + classify + route already unauthed and minimal |
| F-04-W2-004 MCP | 94 | `withScopeEnforcement` + `errorSanitize` + fetch body caps; residual `plugin_scan.errors` / non-`isError` JSON shapes low risk |
| F-06-008 / F-07-011 A2A | 96 | Fail-closed auth + sanitize on task/SSE/JSON-RPC error paths; env-key exclusive when set is intentional |
| Tests / evidence honesty | 96 | 0051 suite + siblings 156/156 PASS; residual 13 client-facing + stretch backlog documented accurately |
| Scope discipline | 94 | Core closed; stretch leftovers listed honestly (Trae/CD/ngrok/dedup) |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none

### Regressions

- none functional against task MUST criteria
- intentional UX hardening: unauthenticated `/status` / open-install dashboard polls of `/api/monitoring/health` no longer receive breaker/session recon (public allowlist only)

### New Findings

- `NEW` N1 (Medium / residual-authz): full health snapshot accepts **any** valid Bearer API key, not manage-scope only
- `NEW` N2 (Low / residual): 13 direct client-facing `err.message` sites remain outside helper (honest backlog)
- `NEW` N3 (Low / sanitizer): loose `at /…` redaction can mask product paths like `/v1/models` after the word `at`
- `NOTE` N4 (Info): open-install dashboard components (`SystemMonitor`, `useProviderBreakerHealth`) lose rich health without session/API credentials — by design of F-07-009

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | NEW | Medium | Open (path-to-100 / follow-up) | Full `/api/monitoring/health` dump via any valid client API key | this report | Path is PUBLIC_READONLY → `isManagementApiRequest` false → `verifyAuth` uses `validateBearerApiKey` not `validateBearerApiKeyForManagement` (`apiAuth.ts:201-205`, `255-270`; `health/route.ts:19-22`). Comment/CHANGELOG claim “manage-scope” overstates code. Unauthenticated still correct. |
| N2 | NEW | Low | Accepted residual | 13 raw `error.message` client JSON sites in `src/app/api` | this report | Live `rg` matches vacuum, images, auth import/export, sync-models, webhooks test, headroom — matches Completion Evidence |
| N3 | NEW | Low | Accepted residual | Sanitizer false-positive on `at /v1/...` tokens | this report | `sanitizeErrorMessage("Error at /v1/models endpoint")` → `Error at <path> endpoint` via `looksLikeAbsolutePathLoose` |
| N4 | NEW | Info | Accepted residual | Public status page provider stats empty when unauthenticated | this report | `src/app/status/page.tsx:39` + public payload has no `providerHealth` |
| G1 | — | Guard | Pass | Unauth health has no breakers/sessions/credentials | this report | `buildPublicHealthPayload` keys allowlisted; 0051 test asserts undefined sensitive fields |
| G2 | — | Guard | Pass | `createErrorResponseFromUnknown` strips stack first-line paths | this report | `at /tmp/x\n…` → `Internal error`; test PASS |
| G3 | — | Guard | Pass | Ping is PUBLIC + handler has no auth / no secrets | this report | `publicApiRoutes.ts:26`; `health/ping/route.ts` returns `{status,timestamp,latencyMs}` only |
| G4 | — | Guard | Pass | A2A fail-closed without env key | this report | `authenticate` requires Bearer; tests reject unauth / accept env key |
| G5 | — | Guard | Pass | MCP tool errors sanitized at wrapper | this report | `withScopeEnforcement` catch → `mcpToolErrorResult`; `isError` → `sanitizeMcpToolResult` |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Shared API error helper sanitizes by default | ✅ | `src/lib/api/errorResponse.ts:34-36,71-76` → `sanitizeErrorMessage` / `sanitizeUpstreamDetails` |
| MUST: stack path never in `error.message` for stack-like Error | ✅ | `residual-authz-sanitize-0051.test.ts` + `display-and-error-utils.test.ts` PASS |
| Health public split / field gate | ✅ | `buildPublicHealthPayload` + `health/route.ts` unauth branch; unauth test PASS |
| MUST: unauth monitoring health no full dump | ✅ | Asserts no `providerBreakers` / `sessions` / `credentialHealth` / `lockouts` |
| ping PUBLIC_READONLY | ✅ | `publicApiRoutes.ts`; classify reason `public_readonly_prefix`; tests PASS |
| MUST: GET ping succeeds without auth when requireLogin | ✅ (unit) | Route has no auth; classification public; handler returns 200 (`health-ping-route.test.ts`). Full pipeline integration not re-run; classification is the gate that previously returned 401. |
| MCP tool failure sanitized | ✅ | `errorSanitize.ts` + wrapper + unit tests PASS |
| A2A error artifact/message sanitized | ✅ | `taskExecution.ts`, `streaming.ts`, `route.ts` + executeA2ATaskWithState test PASS |
| Stretch F-07-011 A2A fail-closed | ✅ | Auth before disabled gate; unauth → Unauthorized |
| Residual grep documented | ✅ | 13 client-facing sites + stretch IDs listed in task evidence |
| Targeted tests pass | ✅ | Fresh: 156 pass / 0 fail across listed suites |
| typecheck:core / lint no new errors | ✅ (lint) | eslint on touched prod files: 0 errors (3 pre-existing `any` warnings in mcp `server.ts`). typecheck:core not re-run this session (see Evidence Gaps). |
| CHANGELOG Unreleased Security | ✅ | Task 0051 entry present |

## Code Review Notes (by surface)

### F-07-014 — `createErrorResponse*`

- Correct central fix: every call site of `createErrorResponse` / `createErrorResponseFromUnknown` (59 sites) inherits sanitization.
- Stack-frame first line collapse in `open-sse/utils/error.ts` is precise enough to preserve “at least one model required”.
- Residual 13 non-helper routes are correctly **not** claimed closed.

### F-07-009 — monitoring health

- Allowlist (`status`, `timestamp`, `version`, `uptime`, `system`) is tight.
- Using `verifyAuth` (not `isAuthenticated`) correctly blocks `requireLogin=false` open-install recon — this was the core risk.
- **N1**: because the route remains PUBLIC_READONLY for anonymous GET, management-scope enforcement does not apply to Bearer keys. Prefer an explicit full-access predicate, e.g. dashboard session **or** `validateBearerApiKeyForManagement`, if product intent is operator-only recon.

### F-07-010 — ping

- Minimal payload already safe; classification fix unblocks k8s/UI probes under `requireLogin=true`. No issue.

### F-04-W2-004 — MCP

- Centralizing sanitize in `withScopeEnforcement` is the right leverage point for all registered tools.
- `omniRouteFetch` / advanced `apiFetch` cap+sanitize upstream bodies before throw — good.
- `plugin_activate|deactivate|uninstall` use `safePluginError`; install throws into wrapper — OK.
- Residual: `plugin_scan` returns `errors: result.errors` as success JSON (not `isError`); messages are mostly local labels; low risk.

### F-06-008 / F-07-011 — A2A

- Fail-closed is correct and tested.
- When `OMNIROUTE_API_KEY` is set, only that env key is accepted (not also DB API keys). Intentional exclusive legacy mode; document for operators who expected dual acceptance.
- Error paths sanitize; success skill artifacts are not re-sanitized (out of finding scope).

## Tests (fresh this review)

```text
node --import tsx/esm --test \
  tests/unit/residual-authz-sanitize-0051.test.ts \
  tests/unit/public-api-routes.test.ts \
  tests/unit/a2a-enabled-route.test.ts \
  tests/unit/display-and-error-utils.test.ts \
  tests/unit/authz/classify.test.ts \
  tests/unit/health-ping-route.test.ts \
  tests/unit/error-message-sanitization.test.ts \
  tests/unit/observability-payloads.test.ts \
  tests/unit/api-auth.test.ts
→ 156 pass, 0 fail
```

## Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: `npm run typecheck:core` not re-run in this review session (dirty tree has unrelated WIP). Touched files are type-consistent with existing patterns; not treated as exit failure given prior builder claim + clean eslint.
- `EXTERNAL_BLOCKER`: none

## Path-to-100 (optional; not required for S≥90 stay)

1. **N1**: Gate full health payload on dashboard session **or** management-scoped API key; keep anonymous public allowlist. Add unit test: non-manage client key → public shape only.
2. Optionally migrate the 13 residual routes onto `createErrorResponseFromUnknown` in a follow-up (N2).
3. Optional: tighten `looksLikeAbsolutePathLoose` to require path separators / source-like segments to reduce `/v1/...` false positives (N3).

## Lane Action

- **Moved**: no — stays `docs/tasks/03-review/0051-omniroute-residual-authz-error-sanitize-sweep.md`
- **Patched**: no production code changes in this review
- **Report path**: `docs/reports/reviews/2026-07-11-task-0051-residual-authz-sanitize-review.md`
