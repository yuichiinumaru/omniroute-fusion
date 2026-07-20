# Review Report: Task 0073 — Residual `err.message` Sanitize Sweep (F-SEC-W2-002…004) — 2026-07-19

## Review Lineage

- **Current task**: Task 0073 (`omniroute-residual-err-message-sanitize-sweep`); live path was `docs/tasks/02-doing/0073-…` at review start
- **Previous reports read**:
  - Task Completion Evidence (builders / gt-ts-engineer + security)
  - `docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md` — F-SEC-W2-002…004 / H-PRODUCT-004 / H-PRODUCT-014
  - `docs/security/ERROR_SANITIZATION.md` — Hard Rule #12 patterns
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-19-task-0072-tailscale-enable-login-local-only-spawn-security-review.md` — Hard Rule #12 stretch on enable/login/disable (disjoint ownership)
- **Review mode**: `builder-parallel-security-review` (gt-security-reviewer / parent agentID=`builders`)
- **Skills**: code-quality-harness · security-harness · tsjs-harness
- **Constraints honored**: no git · no `:21000`

## Score And Verdict

- **Score**: `100/100` (after path-to-100 in this review)
- **Verdict**: `ACCEPT` / `ACCEPTED_100`
- **Lane recommendation**: → `docs/tasks/03-review/`

### Dual Score (production-facing security task)

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Shared helpers reused; must-fix catch leaves sanitized; unit suite 8/8 + 0051 14/14 |
| `runtime_enforcement` | 100 | Wire paths call `sanitizeErrorMessage` / `createErrorResponse*` before JSON/SSE body; source guards lock call sites |

Overall capped by weaker dimension → **100**.

### Rubric snapshot

| Area | Score | Notes |
|------|------:|-------|
| Contract / exit conditions | 100 | A/B/C closed or deferred with residual list |
| F-SEC-W2-002 version SSE | 100 | both catch sites sanitize before `send` |
| F-SEC-W2-004 exportAll/vacuum | 100 | `details` leaf sanitized |
| F-SEC-W2-003 cluster C | 100 | named minimum set converted |
| Tests | 100 | helper behavior + source guards + agents health field |
| Residual honesty | 100 | 208 files / ~321 lines residual; CLI matrix deferred |
| Docs / CHANGELOG | 100 | Unreleased Security bullet |

## Delta Summary

### Resolved Since Previous Review (first formal security review)

- `RESOLVED` (in-review path-to-100): Exit/Test/What/Compliance checkboxes were still open despite filled evidence → marked complete
- `RESOLVED` (in-review path-to-100): MUST_FIX static guard extended to include tailscale `install`/`start-daemon` + agy `import-bulk` (claimed converted in evidence)
- `VERIFIED`: F-SEC-W2-002/003/004 wire conversion
- `VERIFIED`: residual grep honesty (reproduced ~208 / ~321)
- `VERIFIED`: deferred CLI-tools still raw (intentional timebox)

### Persistent Findings

- none blocking in task scope

### Regressions

- none

### New Findings

- none blocking

### Evidence Gaps / External Blockers

- **EXTERNAL / accepted residual**: `sanitizeErrorMessage` redacts absolute paths with **source extensions** only (`.ts`/`.js`/…); extension-less paths (e.g. `/tmp/foo`, `.sqlite`) can remain on first line — pre-existing helper policy, not 0073 scope (task: reuse helpers; do not re-open 0051/0042)
- **EXTERNAL / deferred**: remaining CLI-tools settings routes with raw `error: error.message` 400 paths (listed in Completion Evidence)
- **EXTERNAL**: deferred samples `settings/require-login`, `settings/proxies/bulk-import` (not Wave-2 minimum)

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | No open findings in task scope after path-to-100 | — |

### Explicit non-issues (verified this review)

| Guard | Status | Proof |
| --- | --- | --- |
| version SSE both error sites | ✅ | `sanitizeErrorMessage(err?.stderr \|\| err?.message…)` then `send({ step:"error", message: errMsg })` |
| exportAll details | ✅ | `details: sanitizeErrorMessage(...)` |
| vacuum details | ✅ | `const details = sanitizeErrorMessage(...)` |
| db/health, assess | ✅ | sanitize on catch message leaf |
| skills/* cluster | ✅ | list/install/marketplace/executions/[id]/skillssh |
| a2a tasks/status/cancel | ✅ | sanitize on error leaves |
| combos/test | ✅ | `error: sanitizeErrorMessage(rawMessage)` |
| agents health provider field | ✅ | `error: sanitizeErrorMessage(` |
| images generations catch | ✅ | sanitize before client payload |
| mitm + agy-auth import/apply/bulk | ✅ | sanitize on catch |
| tunnels ngrok/cloudflared/tailscale status|check|install|start-daemon | ✅ | sanitize (enable/login/disable owned by 0072 via createErrorResponseFromUnknown) |
| CLI sample droid/smelt/cline | ✅ | sanitized |
| No 0051 helper default reopen | ✅ | routes call leaf helpers; `errorResponse.ts` untouched |
| Honest residual not zero-grep | ✅ | evidence + live rg count match |

### Threat model re-check (security-harness)

| Element | Assessment |
| --- | --- |
| **Asset** | Internal paths / stack frames / process stderr in client JSON/SSE |
| **Threat** | Authenticated management session recon via error bodies (P2, not unauth RCE) |
| **Attack path closed** | Named must-fix clusters no longer place raw `err.message` / stderr on the wire without `sanitizeErrorMessage` (or helper that calls it) |
| **Residual accepted** | Deferred CLI matrix + extension-less path policy + log-only open-sse `err.message` (out of scope) |
| **Hard Rules** | #12 satisfied for converted sites; #3 no eval; no secret echo introduced |

## Evidence Reviewed

### Source / test files (sample of converted set)

- `src/app/api/system/version/route.ts` — F-SEC-W2-002
- `src/app/api/db-backups/exportAll/route.ts`, `src/app/api/settings/database/vacuum/route.ts` — F-SEC-W2-004
- Cluster C routes under skills/, a2a/, combos/test, agents/health, images/generations, mitm, agy-auth, tunnels/*
- `open-sse/utils/error.ts` — `sanitizeErrorMessage` behavior
- `src/lib/api/errorResponse.ts` — default sanitize (0051; not reopened)
- `tests/unit/security/residual-sanitize-0073.test.ts`
- `tests/unit/residual-authz-sanitize-0051.test.ts`
- `CHANGELOG.md` Unreleased Security

### Commands run (this review)

```bash
node --import tsx/esm --test tests/unit/security/residual-sanitize-0073.test.ts
# → 8 pass (after MUST_FIX list stretch)

node --import tsx/esm --test tests/unit/residual-authz-sanitize-0051.test.ts
# → 14 pass

# residual honesty
rg -l 'error\.message|err\.message' src/app/api | wc -l   # 208
# matching line sum ≈ 321

# helper path policy probe (extension-less residual noted as external)
node --import tsx/esm -e '…sanitizeErrorMessage samples…'
```

### Commands not run and why

- Full `npm run typecheck:core` / full `lint` — builder noted pre-existing `fusion.ts` only; this review focused sanitize surfaces; touched files are import + string leaf rewrites
- Live `:21000` — **forbidden**
- Repo-wide ESLint ban on `error.message` — out of scope per task

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-SEC-W2-002 closed | ✅ | version SSE both catches |
| F-SEC-W2-004 closed | ✅ | exportAll + vacuum |
| F-SEC-W2-003 min set | ✅ | cluster C named routes |
| Unit tests green | ✅ | 8/8 + 0051 14/14 this review |
| No false zero-grep claim | ✅ | residual summary present |
| CHANGELOG Security | ✅ | Unreleased |
| 0051 not reopened | ✅ | helpers reused only |

## Path To 100

**Closed** in this review:

1. Checkbox hygiene for promote eligibility
2. MUST_FIX regression guard includes install/start-daemon + import-bulk

Out-of-scope follow-ups (do **not** reopen 0073):

1. CLI-tools residual matrix (deferred list in evidence)
2. Optional sanitizer policy expand for extension-less absolute paths (0042/helper evolution)
3. Optional ESLint ratchet on raw `error.message` in `src/app/api`

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
- Latest: docs/reports/reviews/2026-07-19-task-0073-residual-err-message-sanitize-sweep-security-review.md
- Score: 100 · Verdict: ACCEPTED_100 · Reviewer: gt-security-reviewer (builders)
- Path-to-100: checkboxes + MUST_FIX stretch (install/start-daemon/import-bulk)
```

## Return To Parent

| Field | Value |
|-------|-------|
| Report | `docs/reports/reviews/2026-07-19-task-0073-residual-err-message-sanitize-sweep-security-review.md` |
| Score | **100** |
| Verdict | **ACCEPT** |
| Top blockers | none |
| Path-to-100 | closed (in-review) |
| Lane move | **→ `docs/tasks/03-review/`** (S=100) |
