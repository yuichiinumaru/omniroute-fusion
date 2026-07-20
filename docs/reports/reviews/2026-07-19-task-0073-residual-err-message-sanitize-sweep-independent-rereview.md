# Independent Security Re-Review: Task 0073 — Residual `err.message` Sanitize Sweep (F-SEC-W2-002…004)

## Review Lineage

- **Current task**: `docs/tasks/03-review/0073-omniroute-residual-err-message-sanitize-sweep.md`
- **Reviewer**: Independent FULL SECURITY RE-REVIEWER (agentID=`reviewers`)
- **Builder claims**: **UNTRUSTED** — re-proved from live source + tests
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0073-residual-err-message-sanitize-sweep-security-review.md` (builders ACCEPT 100)
  - Task Completion Evidence
  - `docs/security/ERROR_SANITIZATION.md` (Hard Rule #12)
- **Skills**: security-harness · code-quality-harness · tsjs-harness
- **Constraints**: no git · no `:21000`

## Score And Verdict

| Field | Value |
|-------|-------|
| **Score** | **100/100** |
| **Verdict** | **ACCEPT** / `ACCEPTED_100` |
| **Lane** | **stay `03-review`** |
| **Patches applied this re-review** | **none** |

### Dual Score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Shared helpers; helper unit tests strip path+stack; MUST_FIX source guards |
| `runtime_enforcement` | 100 | Live wire leaves on A/B/C call sites use sanitize before JSON/SSE body |

Overall → **100**.

## Threat Model Re-Check

| Element | Assessment |
|---------|------------|
| **Asset** | Error JSON/SSE bodies (path/stack/stderr recon under authenticated manage sessions) |
| **Threat** | Hard Rule #12 bypass on residual management/ops routes |
| **Severity class** | P2 authenticated recon — not unauth RCE |
| **Status** | **Named Wave-2 clusters closed**; honest residual list retained |

## Live Verification (this re-review)

### F-SEC-W2-002 — version SSE

`src/app/api/system/version/route.ts` L261–264 and L348–351:

```ts
const errMsg =
  sanitizeErrorMessage(err?.stderr || err?.message || String(err)) || "Update failed";
send({ step: "error", status: "failed", message: errMsg });
```

Both catch sites sanitize before `send`. **CLOSED**.

### F-SEC-W2-004 — exportAll / vacuum

- `exportAll/route.ts`: `details: sanitizeErrorMessage(...)`
- `vacuum/route.ts`: `const details = sanitizeErrorMessage(...)`

**CLOSED**.

### F-SEC-W2-003 — cluster C (spot + source guard)

Verified representative call sites wrap wire leaves:

| Route | Pattern |
|-------|---------|
| `db/health` | log raw; respond `sanitizeErrorMessage(raw)` |
| `assess` | `sanitizeErrorMessage(...)` |
| skills/* | `sanitizeErrorMessage` |
| a2a tasks/status | `sanitizeErrorMessage` |
| `combos/test` | rawMessage → `sanitizeErrorMessage(rawMessage)` before result |
| `v1/agents/health` | provider error field sanitized |
| `v1/images/generations` | catch → `sanitizeErrorMessage`; `errorResponse` also sanitizes Zod messages |
| mitm / agy-auth | `sanitizeErrorMessage` on catch bodies |
| tunnels ngrok/cloudflared/tailscale status|check|install|start-daemon | sanitize helpers |
| cli sample droid/smelt/cline | sanitize |

`tests/unit/security/residual-sanitize-0073.test.ts` MUST_FIX list includes install/start-daemon + import-bulk + CLI sample.

### Residual honesty (reproduced)

```text
rg error.message|err.message src/app/api → ~208 files / ~321 matching lines
```

Matches Completion Evidence. Deferred raw CLI 400 samples still present e.g.:

- `cli-tools/kilo-settings` — `{ error: error.message }`
- `cli-tools/codex-settings`, `qwen-settings`, `claude-settings` — same pattern

**Not claimed closed.** Task contract allows timeboxed CLI remainder.

### Helper behavior

```text
sanitizeErrorMessage(LEAKY) — strips multi-line stack + source-ext absolute paths
createErrorResponseFromUnknown(new Error(LEAKY)) — body.error.message cleaned
errorResponse(400, LEAKY) → {"error":{"message":"ENOENT: <path>",…}}
```

### Commands run

```bash
node --import tsx/esm --test \
  tests/unit/security/residual-sanitize-0073.test.ts \
  tests/unit/residual-authz-sanitize-0051.test.ts
# → 22 pass, 0 fail (8×0073 + 14×0051)
```

## Findings

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| — | — | — | No open findings in task scope |

### Accepted EXTERNAL residuals (do not reopen 0073)

1. **CLI-tools matrix** remaining raw `error: error.message` 400 paths (honest deferred list).
2. **Sanitizer policy**: `sanitizeErrorMessage` primarily redacts **source-extension** absolute paths; extension-less paths on first line may remain — pre-existing 0042/0051 helper policy; task forbade re-opening helpers.
3. Non-minimum routes (`settings/require-login`, `proxies/bulk-import`, etc.) not in Wave-2 must-fix.

## Contract Compliance

| Exit MUST | Status |
|-----------|--------|
| F-SEC-W2-002 closed | ✅ |
| F-SEC-W2-004 closed | ✅ |
| F-SEC-W2-003 minimum set | ✅ |
| Unit tests green | ✅ 22/22 with 0051 |
| No zero-grep claim | ✅ residual count honest |
| CHANGELOG Security | ✅ |
| Spot-check no reintro raw anti-patterns on must-fix | ✅ |

## Path To 100

**Already closed.** No in-scope patches this re-review.

## Return Table Row

| task | score | verdict | patches | report | lane |
|------|------:|---------|---------|--------|------|
| 0073 | 100 | ACCEPT | none | this file | stay 03-review |
