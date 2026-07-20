# Task 0073: Targeted Residual `err.message` / Sanitize Sweep (F-SEC-W2-002–004)

> **Status**: `[R]` In review (security reviewer ACCEPT 100 → 03-review 2026-07-19)  

> **Priority**: 🟡 P2  
> **Type**: `remediation`  
> **Action type**: HARDEN  
> **Origin**: EPIC-12 — OmniRoute Security Residual Harden · Wave 2 security residual investigation  
> **Finding IDs**: **F-SEC-W2-002**, **F-SEC-W2-003**, **F-SEC-W2-004** (H-PRODUCT-004 / H-PRODUCT-014)  
> **Blocks**: none  
> **Depends on**: none strictly; prefer after **0072** if this PR would also edit `enable/route.ts` / `login/route.ts` (0072 may sanitize those as stretch)  
> **Parallelism**: `parallel-safe` vs 0072 **if** this task avoids `routeGuard.ts` / `spawnCapablePrefixes.ts` / tailscale enable|login routes already claimed by 0072  
> **Review routing**: **independent** if file set disjoint; **bundled** if same PR as 0072 or overlapping tunnel routes  

---

## Source reports (builder reference)

Primary:
- [`docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md`](../../reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md) — § H-PRODUCT-004, H-PRODUCT-014, F-SEC-W2-002…004  
- [`docs/tasks/00-planning/EPIC-12-omniroute-security-residual-harden.md`](../00-planning/EPIC-12-omniroute-security-residual-harden.md) — T12-B  
- [`docs/security/ERROR_SANITIZATION.md`](../../security/ERROR_SANITIZATION.md) — Hard Rule #12 patterns  

Closed helpers (do **not** re-implement; **reuse**):
- Task **0051** — `createErrorResponse` / `createErrorResponseFromUnknown` default sanitize (`src/lib/api/errorResponse.ts`)
- Task **0042** — pipeline `buildErrorBody` / `sanitizeErrorMessage` (`open-sse/utils/error.ts`)

Hard Rule: **#12**.

---

## Objective

Convert **confirmed** client-facing residual sites that still return raw `err.message` / tool `stderr` in HTTP JSON or SSE **without** going through shared sanitizers — **without** claiming repo-wide zero-grep and **without** re-opening Task 0051.

Concrete outcomes:

1. Every **must-fix cluster** below either uses `createErrorResponseFromUnknown` / `createErrorResponse` / `buildErrorBody` / `sanitizeErrorMessage` on the wire, **or** is listed in Completion Evidence as **explicitly deferred** with justification + residual ID.
2. Regression tests prove sanitizers strip stack frames and absolute paths on at least **one representative catch per cluster** (or a shared route-level helper test).
3. Auto-update SSE error events (`system/version`) no longer stream raw stderr/message (F-SEC-W2-002).
4. Honest residual grep count recorded after the sweep (same honesty standard as 0051 closeout).

**Not a goal**: ban every `err.message` in logs, internal control flow, or already-sanitized paths.

## Background Context

### What already exists (0051 still true)

| Control | Location |
|---------|----------|
| API helpers sanitize by default | `src/lib/api/errorResponse.ts` |
| OpenAI/SSE pipeline body | `open-sse/utils/error.ts` — `buildErrorBody`, `errorResponse` |
| Public health split | `src/app/api/monitoring/health/route.ts` |
| MCP sanitize module | `open-sse/mcp-server/errorSanitize.ts` |
| Docs | `docs/security/ERROR_SANITIZATION.md` |

0051 **explicitly** left residual client-facing sites; Wave 2 **confirmed** they remain / may have grown.

### Must-fix clusters (code proof from Wave 2)

#### A. F-SEC-W2-002 — Auto-update SSE raw stderr

| Path | Issue |
|------|--------|
| `src/app/api/system/version/route.ts` ~L260, ~L345 | SSE `message: errMsg` from `err?.stderr \|\| err?.message` |

LOCAL_ONLY mitigates remote abuse but still violates Hard Rule #12 for any caller.

#### B. F-SEC-W2-004 — `details: error.message` high-sensitivity ops

| Path | Issue |
|------|--------|
| `src/app/api/db-backups/exportAll/route.ts` ~L107 | `details: error.message` |
| `src/app/api/settings/database/vacuum/route.ts` ~L45 | `details: error.message` |

#### C. F-SEC-W2-003 — Representative management JSON leaks (targeted, not infinite)

Minimum conversion set (Wave 2 named; expand only if cheap):

| Area | Paths |
|------|--------|
| DB health | `src/app/api/db/health/route.ts` ~L13–16, ~L27–29 |
| Assess | `src/app/api/assess/route.ts` ~L97–100 |
| Skills | `src/app/api/skills/**` list/install/marketplace/executions/`[id]` raw error strings |
| A2A | `src/app/api/a2a/tasks/**`, `src/app/api/a2a/status` raw `error.message` |
| Combos test | `src/app/api/combos/test/route.ts` ~L155 |
| Agents health | `src/app/api/v1/agents/health/route.ts` ~L59 provider `error: error.message` |
| Images generations catch | `src/app/api/v1/images/generations/route.ts` ~L267 (only if it reaches client body) |
| Tunnels (non-0072-owned) | `src/app/api/tunnels/{ngrok,cloudflared}/route.ts` and tailscale **status/check/disable** if raw; **skip enable/login if 0072 already sanitized** |
| MITM / AGY | `src/app/api/settings/mitm/route.ts`; `src/app/api/providers/agy-auth/import/route.ts`, `apply-local/route.ts` |
| CLI tools settings (sample, not all 12 if timeboxed) | Prefer a **shared helper** or convert the worst offenders first; list remaining filenames in residual evidence |

### Out of scope

- Re-opening 0051 / changing helper defaults that already sanitize  
- open-sse **log-only** `err.message` (tokenRefresh, chatCore logs)  
- Full ESLint ban on `error.message` repo-wide in one PR (optional follow-up ratchet)  
- F-SEC-W2-006 assess in-handler auth (P3 — optional note only)  
- RouteGuard LOCAL_ONLY work (Task **0072**)  
- Secrets dual-read (Task **0074**)  

### Severity model

- **P2** authenticated management message leak / path recon — **not** P0 unauthenticated RCE  
- Aligns with 0051 “honest residual” — **new IDs only**

---

## Test Requirements

> TDD preferred: failing test that returns a body containing a fake path/stack **before** sanitize fix; pass after.

- [x] **DEVE** unit test(s) assert that a thrown `Error("ENOENT: /tmp/secret-path\\n    at foo (/app/x.ts:1:1)")` does **not** appear verbatim in JSON `error` / `details` / SSE `message` for each converted representative route (or for a thin wrapper used by those routes)
- [x] **DEVE** `system/version` SSE failure path use `sanitizeErrorMessage` (or equivalent) on stream error events
- [x] **DEVE** `exportAll` and vacuum responses not include raw absolute paths in `details` when error contains one
- [x] **DEVE** existing 0051 residual sanitize tests still pass (`tests/unit/residual-authz-sanitize-0051.test.ts` if present)
- [x] **DEVE NOT** claim `grep -rn "err.message" src/app/api` is empty — only that **must-fix** sites are converted or allowlisted

Suggested test file: `tests/unit/security/residual-sanitize-0073.test.ts` (or extend 0051 suite with clearly named 0073 cases).

---

## Exit Conditions (GDD/TDD)

- [x] F-SEC-W2-002 closed (version SSE sanitized)
- [x] F-SEC-W2-004 closed (exportAll + vacuum)
- [x] F-SEC-W2-003: **≥** the minimum named routes in cluster C converted **or** each deferred row listed with reason in Completion Evidence
- [x] New/updated unit tests green:
  - `node --import tsx/esm --test tests/unit/security/residual-sanitize-0073.test.ts` (or actual path chosen)
  - plus any route-specific tests touched
- [x] Spot-check: no new raw `NextResponse.json({ error: err.message })` introduced on files this task edits
- [x] `npm run typecheck:core` passes (document pre-existing unrelated only)
- [x] `npm run lint` — no new errors on touched files
- [x] Completion Evidence includes **residual grep summary** (count or sample list remaining)
- [x] CHANGELOG Unreleased Security entry (executor)

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: ERROR_SANITIZATION.md; `errorResponse.ts`; `open-sse/utils/error.ts`; every must-fix path; Wave 2 § H-PRODUCT-004/014
- [x] **TDD red**: add failing sanitize regression tests for version SSE + exportAll/vacuum + one skills/a2a/db-health sample
- [x] **Convert** F-SEC-W2-002 version SSE first (highest wire visibility)
- [x] **Convert** F-SEC-W2-004 exportAll + vacuum
- [x] **Convert** cluster C minimum set using preferred helpers:
  - Prefer `createErrorResponseFromUnknown(error)` / `createErrorResponse({ message })` for App Router
  - Prefer `buildErrorBody(status, message)` when OpenAI-shaped body required
  - For non-standard shapes: `sanitizeErrorMessage(raw)` on the string leaf only
- [x] **CLI-tools matrix**: timebox — convert via shared catch helper if duplication is high; otherwise convert ≥3 tools + list rest residual
- [x] **Grep residual** into Completion Evidence
- [x] **Refactoring pass**: no drive-by feature changes
- [x] **Verificação de regressão**: unit commands above

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/security/ERROR_SANITIZATION.md` | Ler — mandatory patterns |
| `src/lib/api/errorResponse.ts` | Ler — reuse; modify only if helper gap proven |
| `open-sse/utils/error.ts` | Ler — `sanitizeErrorMessage` / `buildErrorBody` |
| `src/app/api/system/version/route.ts` | Modificar — SSE error sanitize (F-SEC-W2-002) |
| `src/app/api/db-backups/exportAll/route.ts` | Modificar — details sanitize (F-SEC-W2-004) |
| `src/app/api/settings/database/vacuum/route.ts` | Modificar — details sanitize (F-SEC-W2-004) |
| `src/app/api/db/health/route.ts` | Modificar — raw message |
| `src/app/api/assess/route.ts` | Modificar — raw message |
| `src/app/api/skills/**` (list/install/marketplace/executions) | Modificar — raw error strings |
| `src/app/api/a2a/tasks/**`, `src/app/api/a2a/status/**` or status route | Modificar — raw message |
| `src/app/api/combos/test/route.ts` | Modificar — test result error field |
| `src/app/api/v1/agents/health/route.ts` | Modificar — provider error field |
| `src/app/api/v1/images/generations/route.ts` | Ler/Modificar se client-facing |
| `src/app/api/settings/mitm/route.ts` | Modificar |
| `src/app/api/providers/agy-auth/import/route.ts`, `apply-local/route.ts` | Modificar |
| `src/app/api/tunnels/**` (except enable/login if owned by 0072) | Modificar residual raw catches |
| `src/app/api/cli-tools/*-settings/route.ts` (sampled) | Modificar or residual-list |
| `tests/unit/security/residual-sanitize-0073.test.ts` | Criar (or extend 0051 suite) |
| `tests/unit/residual-authz-sanitize-0051.test.ts` | Ler/run — no regression |
| `CHANGELOG.md` | Executor entry |

### How

1. Inventory current catch shapes on must-fix files (confirm Wave 2 line anchors still valid; update lines if drifted).
2. Add failing tests that inject path/stack-bearing Errors through the smallest testable surface (mock handler catch or pure helper).
3. Convert version SSE → exportAll/vacuum → db/health → assess → skills/a2a → remaining.
4. Prefer mechanical replacement patterns:

```ts
// before
return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
// after
return createErrorResponseFromUnknown(err); // or createErrorResponse({ status: 500, message: ... })
```

5. For SSE: sanitize `errMsg` before `send({ ..., message: errMsg })`.
6. Record residual greps; do not expand into log-only open-sse noise.
7. Fill Completion Evidence with finding ID disposition table.

### Why

Helpers already exist and the chat core is covered; management and ops routes still bypass them, enabling path/stack recon and stderr leakage under authenticated sessions. Closing the **named** Wave 2 residuals keeps Hard Rule #12 honest without a false zero-grep claim.

### Dependency & collision notes

| Item | Value |
|------|--------|
| Depends on | none (soft: after 0072 if sharing tailscale enable/login) |
| Blocks | none |
| File ownership | `src/app/api/**` listed above + new unit test; **not** routeGuard constants |
| Collision vs 0072 | avoid concurrent edits to enable/login route.ts |
| parallel-safe | **Yes** vs 0072/0074 when file sets disjoint |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT re-open Task 0051 or claim “all err.message gone”.  
> DO NOT sanitize only logs and call Hard Rule #12 done — **wire bodies only**.  
> DO NOT introduce `eval` / leak secrets while “improving” errors.  
> DO NOT touch `:21000` production.

> [!IMPORTANT]
> Prefer existing helpers over new ad-hoc redactors.  
> Every deferred residual needs a one-line justification in Completion Evidence.  
> Keep internal pino logs verbose; sanitize only network boundaries (ERROR_SANITIZATION.md).

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: paths grepped before docs claims  
- [x] **Error Sanitization**: Hard Rule #12 on all converted sites  
- [x] **Security**: no credential echo in new messages  
- [x] **Zod**: no new unvalidated inputs  
- [x] **Archive Protocol**: n/a  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/app/api/system/version/route.ts` (SSE errMsg sanitize)
  - `src/app/api/db-backups/exportAll/route.ts`, `src/app/api/settings/database/vacuum/route.ts`
  - `src/app/api/db/health/route.ts`, `src/app/api/assess/route.ts`
  - `src/app/api/skills/**` (route, install, marketplace, marketplace/install, executions, [id], skillssh, skillssh/install)
  - `src/app/api/a2a/tasks/route.ts`, `status/route.ts`, `tasks/[id]/route.ts`, `tasks/[id]/cancel/route.ts`
  - `src/app/api/combos/test/route.ts`, `src/app/api/v1/agents/health/route.ts`, `src/app/api/v1/images/generations/route.ts`
  - `src/app/api/settings/mitm/route.ts`
  - `src/app/api/providers/agy-auth/import/route.ts`, `apply-local/route.ts`, `import-bulk/route.ts`
  - `src/app/api/tunnels/ngrok|cloudflared|tailscale (status/check/install/start-daemon)` — skipped enable/login (0072 ownership)
  - CLI sample: `cli-tools/droid-settings`, `smelt-settings`, `cline-settings`
  - `tests/unit/security/residual-sanitize-0073.test.ts` (new)
  - `CHANGELOG.md` Security entry
- **Finding disposition**:

| ID | Status | Notes |
|----|--------|-------|
| F-SEC-W2-002 | **closed** | version SSE both catch paths: `sanitizeErrorMessage(err?.stderr \|\| err?.message \|\| …)` before `send` |
| F-SEC-W2-004 | **closed** | exportAll + vacuum `details` leaf sanitized |
| F-SEC-W2-003 | **closed (minimum set)** | Cluster C named routes converted; CLI-tools remainder deferred (see residual) |

- **Residual grep summary** (honest — not zero):
  - `rg error.message|err.message src/app/api` ≈ **208 files / ~321 matching lines** (includes logs, already-sanitized paths, Zod validation, intentional product copy)
  - Must-fix A/B/C named sites converted to `sanitizeErrorMessage` / helpers
  - **Deferred CLI-tools** (raw `error: error.message` 400 paths still present): deepseek-tui, kilo, codex, jcode, qwen, pi, claude, antigravity-mitm, openclaw, guide-settings, forge (+ similar matrix). Converted sample: droid, smelt, cline
  - Other residual samples: `settings/require-login`, `settings/proxies/bulk-import` (not in Wave-2 minimum; deferred)
  - open-sse log-only `err.message` out of scope per task
- **Testes + resultado**:
  - `node --import tsx/esm --test tests/unit/security/residual-sanitize-0073.test.ts` → **8/8 pass**
  - `node --import tsx/esm --test tests/unit/residual-authz-sanitize-0051.test.ts` → **pass** (no regression)
- **typecheck / lint**:
  - `npm run typecheck:core` — pre-existing unrelated errors in `open-sse/services/fusion.ts` only (`isTimeoutSentinel` / `answers`); none on 0073 files
  - `npx eslint` on sample touched routes + test → **clean**
- **CHANGELOG**: Unreleased **Security** bullet for 0073
- **Agente executor / data**: builders / gt-ts-engineer + security · 2026-07-19
- **Path-to-100 (security reviewer 2026-07-19)**:
  - Exit/Test/What/Compliance checkboxes marked complete (were still open despite evidence)
  - MUST_FIX static guard extended: tailscale install/start-daemon + agy import-bulk (claimed converted)
  - Re-ran `residual-sanitize-0073` + `residual-authz-sanitize-0051` → green

---

## 🔍 Review Ledger

- **Latest report**: [`docs/reports/reviews/2026-07-19-task-0073-residual-err-message-sanitize-sweep-independent-rereview.md`](../../reports/reviews/2026-07-19-task-0073-residual-err-message-sanitize-sweep-independent-rereview.md)
- **Reviewer**: Independent FULL SECURITY RE-REVIEWER (agentID=`reviewers`)
- **Data**: 2026-07-19
- **Veredito**: **ACCEPT** / `ACCEPTED_100`
- **Score**: **100/100** (`local_implementation` 100 · `runtime_enforcement` 100)
- **Patches this re-review**: **none**
- **Lane**: **stay `03-review`** (S=100; builder claims re-proved untrusted)
- **Notas**: F-SEC-W2-002/003/004 closed; residual grep ~208 files / ~321 lines honest; CLI matrix deferred; sanitizer source-ext policy EXTERNAL
- **Previous reports**:
  - [`…-security-review.md`](../../reports/reviews/2026-07-19-task-0073-residual-err-message-sanitize-sweep-security-review.md) — gt-security-reviewer (builders) ACCEPT 100 after path-to-100
