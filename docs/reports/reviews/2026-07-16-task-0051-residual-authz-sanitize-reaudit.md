# Review Report: Task 0051 — Residual Authz + Error Sanitize Sweep — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0051 (`omniroute-residual-authz-error-sanitize-sweep`); live path `docs/tasks/03-review/0051-omniroute-residual-authz-error-sanitize-sweep.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0051-residual-authz-sanitize-review.md` — 92/100 PASS WITH NOTES
- **Related reports considered**:
  - `docs/reports/07-app-api.md` (F-07-014/009/010/011), `docs/reports/04-mcp-edge-runtime.md` (F-04-W2-004), `docs/reports/06-lib-features-tooling.md` (F-06-008)
- **Review mode**: `re-review` (adversarial; agentID=`reviewers`)
- **Reviewer profile**: `reviewers` (security + code-quality + tsjs; independent re-auditor)

## Score And Verdict

- **Score**: `90/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| F-07-014 helper default sanitize | 98 | `createErrorResponse*` always sanitize message+details |
| F-07-009 public health allowlist | 88 | unauth solid; **N1 PERSISTENT** any client API key unlocks full dump |
| F-07-010 ping public | 98 | PUBLIC_READONLY + minimal payload |
| F-04-W2-004 MCP wrapper | 94 | withScopeEnforcement sanitize paths hold |
| F-06-008 / F-07-011 A2A | 96 | fail-closed + sanitize on error paths |
| Residual inventory honesty | 86 | narrow 13 still accurate; broader unguarded `error.message` ≈116 (NEW inventory) |
| Fresh tests | 96 | 156/156 pass |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` (reconfirmed): helper default sanitize (F-07-014).
- `RESOLVED` (reconfirmed): unauth monitoring health allowlist only (no breakers/sessions/credentials).
- `RESOLVED` (reconfirmed): `/api/health/ping` PUBLIC_READONLY.
- `RESOLVED` (reconfirmed): MCP `withScopeEnforcement` + `errorSanitize` + A2A fail-closed/sanitize.

### Persistent Findings

- `PERSISTENT` N1 (Medium): full `/api/monitoring/health` dump via **any** valid Bearer client API key — path is PUBLIC_READONLY → `isManagementApiRequest` false → `verifyAuth` uses `validateBearerApiKey` not manage-scope. Route **comment still claims** “manage-scope API key”.
- `PERSISTENT` N2 (Low): 13 direct client-facing `error.message` JSON sites still present (exact prior pattern).
- `PERSISTENT` N3 (Low): sanitizer false-positive `at /v1/...` → `<path>`.

### Regressions

- none on claimed MUST exits (helper/public health/ping/MCP/A2A tests green).

### New Findings

- `NEW` R1 (Low / inventory): broader unguarded pattern `error instanceof Error ? error.message` (without sanitize/buildErrorBody) in `src/app/api` ≈ **116** sites (tunnels, quota, skills, require-login, compression, etc.). Prior “13” remains correct for the **narrow** `message|error|details: error.message` shape; a “sweep” residual backlog is larger if product treats all raw messages as Hard Rule #12 surface.
- `NEW` R2 (Info): health route comment overstates manage-scope (same root as N1) — documentation/security drift.
- `NEW` R3 (Info): A2A `jsonRpcError` passes optional `data` without sanitize; current call sites rarely supply attacker-controlled data — low residual.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: typecheck:core not re-run this session (tests + source review only).
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Medium | Open | Full health recon with any client API key | 2026-07-11 | `health/route.ts:17-22`; `apiAuth.ts:255-270` PUBLIC → non-management |
| N2 | PERSISTENT | Low | Accepted residual | 13 narrow raw `error.message` JSON sites | 2026-07-11 | live `rg` still 13 matches |
| N3 | PERSISTENT | Low | Accepted residual | `at /v1/...` false positive | 2026-07-11 | `looksLikeAbsolutePathLoose` |
| R1 | NEW | Low | Open (backlog honesty) | ~116 broader unguarded message interpolations | this re-audit | `rg` without sanitize filter |
| R2 | NEW | Info | Open | health comment vs code manage-scope claim | this re-audit | `health/route.ts:11-12` |
| R3 | NEW | Info | Accepted residual | A2A error `data` unsanitized | this re-audit | `jsonRpcError` optional data |
| G1–G5 | — | Guard | Pass | Core MUST contracts | prior + this | 156/156 tests |

## Adversarial Counterexamples (vs prior “covered” claims)

| Prior claim | Counterexample result |
| --- | --- |
| Unauth health no full dump | ✅ Public payload allowlist only; test PASS |
| Helper never returns stack path | ✅ `at /tmp/x\n…` → Internal error; test PASS |
| Ping public without auth | ✅ classification + route; tests PASS |
| MCP tool errors sanitized | ✅ wrapper catch + isError sanitize |
| A2A fail-closed | ✅ unauth rejected; env key accepted |
| Full health is manage-scope only | ❌ **N1**: any valid client API key works (PUBLIC path) |
| Residual client leaks ≈13 | ⚠️ 13 narrow true; **~116** broader unguarded (R1) |
| Sweep closed Hard Rule #12 residual | ⚠️ helper path closed; non-helper routes remain |

## Contract Compliance

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Shared helper sanitizes by default | ✅ | `errorResponse.ts:34-36,71-76` |
| Stack path not in error.message | ✅ | residual-authz-sanitize-0051 PASS |
| Unauth health no full dump | ✅ | allowlist + test |
| ping PUBLIC_READONLY | ✅ | publicApiRoutes + classify |
| MCP failure sanitized | ✅ | errorSanitize + tests |
| A2A error sanitized + fail-closed | ✅ | route/taskExecution + tests |
| Residual documented | ✅ / ⚠️ | 13 listed; R1 expands inventory |
| Fresh suite | ✅ | **156 pass / 0 fail** |

## Fresh Verification

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
→ tests 156 · pass 156 · fail 0

Narrow residual client JSON pattern: 13 sites (unchanged).
Broader unguarded error.message interpolations in src/app/api: ~116.
```

## Path To 100

1. **N1 / R2**: Gate full health on dashboard session **or** `validateBearerApiKeyForManagement`; keep anonymous allowlist. Fix comment. Test: non-manage client key → public shape only.
2. Optionally migrate high-risk subset of R1 (tunnels spawn surfaces, require-login, vacuum details, auth import/export) onto `createErrorResponseFromUnknown` / `sanitizeErrorMessage`.
3. Optional: tighten `looksLikeAbsolutePathLoose` (N3).

## Lane Action

- **Moved**: no — stays `docs/tasks/03-review/0051-omniroute-residual-authz-error-sanitize-sweep.md`
- **Patched**: no production code
- **Score**: 90 (prior 92; −2 for persistent N1 + broader residual inventory R1)
