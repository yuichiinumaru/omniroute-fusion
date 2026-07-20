# Wave 2 — Security Reviewer Residual Investigation

**Date**: 2026-07-19  
**Agent**: `gt-security-reviewer`  
**Mode**: Adversarial verify (code proof only; no fixes, no tasks, no live ports)  
**Scope**: Residual security / authz / sanitize hypotheses after Epic 0008 children **0040–0051** (all `04-completed/`)  
**Source context**: `docs/reports/audits/2026-07-19-architect-product-epics-status-audit.md` (H-PRODUCT-004/005/006/014), Task 0051 completion evidence, `src/server/authz/routeGuard.ts`, `src/shared/constants/spawnCapablePrefixes.ts`, `src/lib/db/{secrets,encryption,apiKeys,providers,proxies}.ts`, `src/app/api/**`, `open-sse/**` (excl. tests)

---

## Method

1. Adversarial greps for `err.message` / `error.stack` / `String(err)` in `src/app/api/**` and `open-sse/**`.
2. Inventory of `LOCAL_ONLY_API_PREFIXES`, `SPAWN_CAPABLE_PREFIXES`, `SPAWN_CAPABLE_PATTERNS`, `ALWAYS_PROTECTED_API_PATHS` vs known spawn call sites (`child_process` imports under `src/`).
3. Read secrets-at-rest dual-read / encrypt fail-closed paths (code only; no prod DB).
4. Sample `buildErrorBody` / `sanitizeErrorMessage` / `createErrorResponse*` usage vs raw Response bodies.
5. Sample privileged / spawn-adjacent routes for authz classification gaps (Hard Rules **#12**, **#15**, **#17**).

**Exclusions honored**: no re-open of closed task IDs 0040–0051 without new finding IDs; no fusion / dual-mode re-litigation; no :21000/:22000 / docker.

---

## Executive verdict

| Hypothesis | Verdict | Severity | One-line |
|------------|---------|----------|----------|
| **H-PRODUCT-004** residual raw `err.message` / stack outside 0051 | **CONFIRMED** | **P2** (accepted backlog class; not P0 re-open) | Shared sanitizers work; many routes still bypass them in client JSON/SSE |
| **H-PRODUCT-005** RouteGuard LOCAL_ONLY / SPAWN incomplete for newer spawn routes | **PARTIAL → specific CONFIRM** | **P1** (tailscale enable/login spawn) / **P3** elsewhere | 0040 matrix largely intact; **tailscale enable/login spawn while classified non-LOCAL_ONLY** is a real gap |
| **H-PRODUCT-006** secrets dual-read leftovers | **PARTIAL (by design)** | **P2 residual / P3 if key always set** | Dual-read + lazy migrate intentionally leave plaintext until rewrite; encrypt fail-closed when key set |
| **H-PRODUCT-014** new routes fail-open unsanitized errors | **CONFIRMED** | **P2** | Pattern still spreads on management routes; helpers not enforced by lint |

Epic 0008 **P0/P1 package remains closed** for original acceptance. Residuals below are **honest post-close stretch**, not evidence to re-promote 0040–0051 without new IDs.

---

## H-PRODUCT-004 — Residual raw `err.message` / stack outside 0051

### Verdict: **CONFIRMED**

### What 0051 closed (still true)

| Control | Evidence |
|---------|----------|
| Shared API helper sanitizes by default | `src/lib/api/errorResponse.ts` — `createErrorResponse` / `createErrorResponseFromUnknown` always run `sanitizeErrorMessage` |
| Pipeline OpenAI error body sanitizes | `open-sse/utils/error.ts` — `buildErrorBody` / `errorResponse` / stack-frame first-line collapse |
| Public health split | `src/app/api/monitoring/health/route.ts` — unauth → `buildPublicHealthPayload`; full dump needs management credential |
| MCP / A2A sanitize paths | Task 0051 evidence + `open-sse/mcp-server/errorSanitize.ts` (not re-audited line-by-line this pass) |

0051 Completion Evidence **explicitly documented** residual client-facing sites (~13 at time of close) and refused a zero-grep claim. This hypothesis is that **residuals remain and may have grown** — verified.

### Client-facing residuals (code proof)

#### A. Direct `NextResponse.json({ error: err.message })` family (no sanitize)

Representative clusters (non-exhaustive; grep-complete for this exact pattern):

| Area | Paths (examples) | Auth surface |
|------|------------------|--------------|
| CLI tool settings | `src/app/api/cli-tools/{smelt,pi,jcode,forge,deepseek-tui,kilo,openclaw,cline,droid,claude,codex,qwen}-settings/route.ts`, `guide-settings/[toolId]`, `antigravity-mitm` | Management; antigravity-mitm is LOCAL_ONLY |
| MITM settings | `src/app/api/settings/mitm/route.ts` | Management |
| AGY auth | `src/app/api/providers/agy-auth/import/route.ts`, `apply-local/route.ts` | Management |
| Tunnels | `src/app/api/tunnels/{tailscale/**,ngrok,cloudflared}/route.ts` | Management; some LOCAL_ONLY |

These are typically **validation / operational 400–500** messages. Risk is path/stack leakage when underlying errors include FS paths, `ENOENT`, npm stderr, or nested exceptions — not automatic full stack dumps (JS `Error.message` alone rarely includes stack unless constructed that way).

#### B. Catch blocks with `err.message` / `String(err)` in JSON (sanitize optional)

| Path | Pattern | Notes |
|------|---------|-------|
| `src/app/api/db/health/route.ts:13–16,27–29` | `{ error: { message } }` raw | Auth required via `isAuthenticated` |
| `src/app/api/assess/route.ts:97–100` | raw `error.message` | **No in-route auth**; relies on MANAGEMENT pipeline |
| `src/app/api/skills/**` (list/install/marketplace/executions/`[id]`) | raw `error` string | Auth required; executions can run skill handlers |
| `src/app/api/a2a/tasks/**`, `a2a/status` | raw `error.message` | Management |
| `src/app/api/db-backups/exportAll/route.ts:107` | `details: error.message` | LOCAL_ONLY mitigates remote; still violates #12 for any caller |
| `src/app/api/settings/database/vacuum/route.ts:45` | `details: error.message` | Management + ALWAYS_PROTECTED sibling surfaces nearby |
| `src/app/api/combos/test/route.ts:155` | `error.message` in test result | Management |
| `src/app/api/system/version/route.ts:260,345` | SSE `message: errMsg` from `stderr \|\| message` | LOCAL_ONLY for POST; **raw tool stderr to client stream** |
| `src/app/api/v1/agents/health/route.ts:59` | provider `error: error.message` field | Management cloud-agent auth |
| `src/app/api/v1/images/generations/route.ts:267` | `error: err.message` in internal catch object | May propagate into client error path depending on handler |

#### C. Routes that *look* raw but are actually sanitized

| Path | Why OK |
|------|--------|
| Quota / pools / plans many catches | Pass `message` into **`buildErrorBody`** → auto-sanitize |
| Headroom start 500 path | `createErrorResponse({ message: sanitizeErrorMessage(error) })` |
| Version-manager routes | `sanitizeErrorMessage(...)` |
| Compression preview/compare/retrieve | extract msg then `sanitizeErrorMessage(msg)` |
| Relay chat completions catch | `buildErrorBody(500, message)` |
| Webhooks outer catches | import + use `sanitizeErrorMessage` |
| Trae executor `errResponse` | wraps `sanitizeErrorMessage(message)` (`open-sse/executors/trae.ts:225–230`) |
| Stream upstream errors | `buildErrorBody(err.status, err.message)` (`open-sse/utils/stream.ts:2437`) |

### open-sse residual noise vs real exposure

Greps hit many **log-only** and **internal control** uses (`tokenRefresh` logs, `chatCore` fail-open quota logs, `proxyFetch` internal messages). Those are **not** Hard Rule #12 violations unless they reach HTTP/SSE bodies.

Real body risks remaining in open-sse are lower for core chat path (buildErrorBody) but still present where executors craft ad-hoc Response JSON without the helper (sample: historical web executors largely fixed in 0045; Trae is sanitized).

### Severity

- **P2** for authenticated management UI/API (path recon, install/tool stderr).
- **Not P0**: no systematic stack dump of production secrets observed; helpers exist and highest-risk chat path is covered.
- Aligns with 0051 “honest residual” — **do not re-open 0051**; any fix needs a **new finding ID**.

---

## H-PRODUCT-005 — RouteGuard LOCAL_ONLY / SPAWN_CAPABLE incomplete

### Verdict: **PARTIAL**, with one **CONFIRMED** spawn-classification gap

### What 0040 / 0049 locked (still true)

`src/server/authz/routeGuard.ts` + `src/shared/constants/spawnCapablePrefixes.ts` cover the Task 0040 spawn inventory, including:

| Prefix / pattern | LOCAL_ONLY | SPAWN_CAPABLE |
|------------------|------------|---------------|
| `/api/mcp/` | yes | **no** (intentional manage-scope bypass list) |
| `/api/cli-tools/runtime/` | yes | yes |
| `/api/services/` | yes | yes |
| `/dashboard/providers/services/` | yes | n/a (UI reverse proxy) |
| `/api/plugins/`, `/api/plugins` | yes | yes (`/api/plugins/`) |
| `/api/system/version` | yes (GET exempt) | yes |
| `/api/db-backups/exportAll` | yes | yes |
| `/api/local/` | yes | yes |
| `/api/headroom/start|stop` | yes | yes |
| `/api/oauth/cursor/auto-import` | yes | yes |
| `/api/version-manager/` | yes | yes |
| `/api/cli-tools/antigravity-mitm` | yes | yes |
| `/api/tunnels/tailscale/install` | yes | yes |
| `/api/tunnels/tailscale/start-daemon` | yes | yes |
| `/api/tunnels/cloudflared`, `/api/tunnels/ngrok` | yes (GET exempt) | yes |
| `/api/middleware/hooks` | yes + ALWAYS_PROTECTED | yes |
| `/api/cli-tools/keys` | yes + ALWAYS_PROTECTED | no (secret recon, not spawn) |
| `POST /api/providers/{id}/login` | pattern LOCAL_ONLY | SPAWN_CAPABLE_PATTERNS |

Regression tests in `tests/unit/authz/routeGuard.test.ts` encode this matrix.

Hard Rule **#17** services surfaces: **present** in LOCAL_ONLY.

Hard Rule **#15** core process-spawn list from 0040: **largely complete**.

### CONFIRMED residual — Tailscale enable / login spawn without LOCAL_ONLY

**Evidence**:

1. Classification test **asserts enable is not local-only**:

```52:58:tests/unit/authz/routeGuard.test.ts
test("isLocalOnlyPath: tailscale install/start-daemon are local-only (F-07-003)", () => {
  assert.equal(isLocalOnlyPath("/api/tunnels/tailscale/install"), true);
  assert.equal(isLocalOnlyPath("/api/tunnels/tailscale/start-daemon"), true);
  // Non-spawn tailscale status/enable remain remote-reachable classification-wise.
  assert.equal(isLocalOnlyPath("/api/tunnels/tailscale"), false);
  assert.equal(isLocalOnlyPath("/api/tunnels/tailscale/enable"), false);
});
```

2. Runtime **does spawn** on enable/login:

- `startTailscaleLogin` → `spawn(binaryPath, spawnArgs, …)` at `src/lib/tailscaleTunnel.ts:642`
- `startTailscaleFunnel` (used by enable path) → `spawn(... funnelArgs ...)` at `:726`

3. Routes only require management auth (`requireTailscaleAuth`), **not** loopback:

- `src/app/api/tunnels/tailscale/enable/route.ts`
- `src/app/api/tunnels/tailscale/login/route.ts`

4. Neither path appears in `LOCAL_ONLY_API_PREFIXES` nor `SPAWN_CAPABLE_PREFIXES`.

**Impact (Hard Rules #15 / #17 class)**: A leaked dashboard JWT / manage session **via tunnel** can still trigger `tailscale up` / funnel child processes. Install/start-daemon were closed for this class; enable/login were mis-labeled “non-spawn” in the 0040 test comment.

**Severity**: **P1** residual (process control via tunnel with stolen management auth — not unauthenticated RCE).

### Other spawn-adjacent notes (lower)

| Surface | Classification | Notes |
|---------|----------------|-------|
| Skills sandbox (`src/lib/skills/sandbox.ts` docker spawn) | Not LOCAL_ONLY | `/api/skills/executions` is management-auth only; executor may not always hit docker for built-ins — **watch residual**, not proven unauthenticated RCE |
| ACP agents detect (`execFileSync` which/version) | Management auth | Probe-level, not package install |
| MITM / cert install / systemCommands | Behind tools routes that are LOCAL_ONLY | Covered if only reached via `/api/tools/agent-bridge` / traffic-inspector |
| `/api/mcp/` manage-scope bypass | LOCAL_ONLY but **not** SPAWN_CAPABLE | **By design** for remote MCP with manage key; spawn deny-list correctly excludes it |

### Verdict nuance

- **FALSE** as “0040 matrix never landed” or “all spawn routes open”.
- **CONFIRMED** as “inventory incomplete for **tailscale enable/login** (and possibly skill docker spawn) after 0040 freeze”.

---

## H-PRODUCT-006 — Secrets-at-rest dual-read leftovers

### Verdict: **PARTIAL (intentional transition residual)**

### Code path (not prod DB)

#### 1. Process secrets (`src/lib/db/secrets.ts`) — Task 0041

| Behavior | Evidence |
|----------|----------|
| Write with key → `enc:v1:` only | `encodeSecretForStorage` refuses non-`enc:v1:` when `isEncryptionEnabled()` |
| Upsert/replace | `INSERT OR REPLACE` (rotation + migrate) |
| Read dual-decode | JSON string + `decrypt()`; raw `enc:v1:` defensive branch |
| Lazy migrate | `ensureSecretsEncryptedMigration` → `migratePlaintextSecretsToEncrypted` |
| Migrate failure | Non-fatal — “dual-read still serves legacy plaintext until next write” |

#### 2. API keys (`src/lib/db/apiKeys.ts`) — hash-only + legacy dual-read

| Behavior | Evidence |
|----------|----------|
| Primary validate | `key_hash = ?` only |
| Legacy dual-read | If hash miss, `WHERE key = ?` for non-placeholder plaintext, then opportunistic rewrite to hash-only placeholder |
| List/get | Strip stored key material — no bulk plaintext reveal |

#### 3. Provider PSD (`src/lib/db/providers.ts` + `encryption.ts`)

| Behavior | Evidence |
|----------|----------|
| Lazy PSD encrypt migration | `migratePlaintextPsdSecretsToEncrypted` |
| Dual-read decrypt | `decrypt()` returns non-prefix strings as plaintext; `decryptProviderSpecificData` documents legacy pass-through |
| Encrypt fail-closed | `encrypt()` throws when `STORAGE_ENCRYPTION_KEY` configured but derivation/cipher fails |

#### 4. Proxies relay auth (`src/lib/db/proxies.ts`)

- Prefers `relayAuthEnc` + `decrypt`; falls back to plaintext `relayAuth` for legacy rows (`extractRelayAuth`).

### Residual risk model

| Condition | Residual |
|-----------|----------|
| `STORAGE_ENCRYPTION_KEY` set, old DB rows never rewritten | Dual-read still **serves** plaintext rows until migrate/write succeeds; migrate is best-effort per-row |
| Key **not** set (dev passthrough) | Plaintext at rest **by design** — documented in `encryption.ts` |
| Migration flag `_secretsEncryptMigrated` stuck after failed first attempt | Flag set even if migrate threw empty catch → **migration may not retry in-process** until restart (subtle residual) |

### Severity

- **Not a regression of 0041 acceptance** if encrypt-on-write + fail-closed + hash-only primary are intact (they are).
- **P2 residual**: long-lived DBs with encryption later enabled may retain plaintext rows until successful migrate/write; dual-read is the compatibility mechanism that **creates** that window.
- **No prod DB inspection** performed (per charter).

---

## H-PRODUCT-014 — New API routes fail-open with unsanitized errors

### Verdict: **CONFIRMED** (message-leak fail-open, not auth fail-open)

### Interpretation

“Fail-open” here means: **catch paths prefer returning raw exception text over a generic sanitized body**, reintroducing Hard Rule **#12** debt even after helpers exist.

### Evidence pattern

```text
try { ... }
catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: message }, { status: 500 });
}
```

Observed widely in:

- Skills / marketplace / install / executions
- A2A task routes
- Tunnel routes
- Assess
- DB health
- Large cli-tools settings matrix
- Selective v1 agent health fields

Counter-pattern (correct):

```text
return NextResponse.json(buildErrorBody(500, message), { status: 500 });
// or createErrorResponseFromUnknown(error)
```

Quota modules largely follow the counter-pattern (post-0051 / B25 comments).

### Auth fail-open?

- Management pipeline still gates `/api/*` MANAGEMENT class when `requireLogin=true`.
- Open-install `requireLogin=false` is a **separate** product mode; spawn-capable paths use LOCAL_ONLY + SPAWN always-auth rules (F-04-005). Residual risk is mostly **message leak under existing auth**, not anonymous RCE via these error paths.
- `assess` lacks in-route auth but is MANAGEMENT-classified via `/api/` default — still subject to pipeline policy.

### Severity: **P2** (systemic hygiene), not P0 privilege bypass.

---

## Hard Rules sampling (#12 / #15 / #17)

| Rule | Sample result |
|------|----------------|
| **#12** Error sanitize | **PARTIAL**. Helpers (`buildErrorBody`, `createErrorResponse*`, stream SSE error path) are solid. Large management-route surface still bypasses helpers. SSE auto-update stderr is a notable LOCAL_ONLY-but-raw stream. |
| **#15** Spawn routes loopback | **PARTIAL**. 0040 inventory good. **Tailscale enable/login spawn without LOCAL_ONLY** is the clearest residual. Skills docker sandbox is a secondary watch item. |
| **#17** `/api/services/` + embed | **SATISFIED** in constants (`/api/services/`, `/dashboard/providers/services/` in LOCAL_ONLY; services in SPAWN_CAPABLE). |

---

## Additional findings (new IDs suggested if triaged later)

Do **not** map these to re-opened 0040–0051 without new task IDs.

| ID (suggested) | Severity | Title | Evidence |
|----------------|----------|-------|----------|
| **F-SEC-W2-001** | P1 | Tailscale enable/login spawn not LOCAL_ONLY / not SPAWN_CAPABLE | `tailscaleTunnel.ts` spawn + `routeGuard` lists + `routeGuard.test.ts` asserts enable false |
| **F-SEC-W2-002** | P2 | Auto-update SSE returns raw `stderr`/`err.message` | `system/version/route.ts:260,345` |
| **F-SEC-W2-003** | P2 | Widespread management routes still emit unsanitized `err.message` | Grep clusters in cli-tools, tunnels, skills, a2a, db/health, assess |
| **F-SEC-W2-004** | P2 | `exportAll` / VACUUM return raw `details: error.message` | `db-backups/exportAll/route.ts:107`, `settings/database/vacuum/route.ts:45` |
| **F-SEC-W2-005** | P3 | Secrets migrate one-shot flag may skip retry after failed migrate | `secrets.ts` `_secretsEncryptMigrated = true` before/around try |
| **F-SEC-W2-006** | P3 | Assess route no in-handler auth (pipeline-only) | `assess/route.ts` — no `isAuthenticated` |
| **F-SEC-W2-007** | P3 | Cloud-agent health embeds raw provider errors in JSON | `v1/agents/health/route.ts:59` |

---

## What is **FALSE** / overstated if treated as open P0

| Claim | Reality |
|-------|---------|
| “0051 did not land; all errors leak stacks” | **FALSE** — helpers sanitize; chat/stream core + createErrorResponse* covered |
| “RouteGuard still missing mcp/services/version-manager” | **FALSE** — present + tested |
| “Secrets always stored plaintext after 0041” | **FALSE** — with key set, writes fail closed to ciphertext; dual-read is transition |
| “Any residual err.message is Critical RCE” | **FALSE** — most residuals are authenticated management message leak |

---

## Residual risk summary

```text
Epic 0008 P0/P1 child package: CLOSED (0040–0051)
│
├─ Hard Rule #12 residuals: P2 hygiene debt (helpers exist; call sites lag)
├─ Hard Rule #15 residual:  P1 tailscale enable/login spawn classification
├─ Hard Rule #17:           OK for services/embed prefixes
├─ Secrets dual-read:       P2 transition risk on long-lived DBs
└─ Re-open closed tasks?    NO — open new IDs only (F-SEC-W2-*)
```

---

## Disposition recommendation (for architects; no tasks created here)

1. Treat **F-SEC-W2-001** (tailscale enable/login LOCAL_ONLY + SPAWN_CAPABLE) as the only **P1** security residual from this probe.
2. Roll **F-SEC-W2-002–004** into a future “Hard Rule #12 call-site conversion” stretch (lint ratchets optional), not a re-open of 0051.
3. Keep **H-PRODUCT-006** as documented dual-read residual; optional ops checklist: ensure `STORAGE_ENCRYPTION_KEY` set and restart once to force migrate — no code change required for 0041 acceptance.
4. Do **not** re-promote tasks 0040, 0041, 0045, 0049, or 0051 without a new failing test ID.

---

## Evidence index (files touched by investigation)

- `src/server/authz/routeGuard.ts`
- `src/shared/constants/spawnCapablePrefixes.ts`
- `src/server/authz/policies/management.ts`
- `src/lib/api/errorResponse.ts`
- `open-sse/utils/error.ts`
- `open-sse/utils/stream.ts` (buildErrorBody on upstream error)
- `open-sse/executors/trae.ts` (sanitized errResponse)
- `src/lib/db/secrets.ts`, `encryption.ts`, `apiKeys.ts`, `providers.ts`, `proxies.ts`
- `src/lib/tailscaleTunnel.ts`
- `src/app/api/tunnels/tailscale/{enable,login}/route.ts`
- `src/app/api/system/version/route.ts`
- `src/app/api/db/health/route.ts`, `assess/route.ts`, `skills/**`, `db-backups/exportAll/route.ts`
- `src/app/api/monitoring/health/route.ts`
- `tests/unit/authz/routeGuard.test.ts`
- `docs/tasks/04-completed/0051-…md`, `0041-…md`
- `docs/reports/audits/2026-07-19-architect-product-epics-status-audit.md`

---

## Approval checklist (security review form)

### Threat model (residual)

- **Assets**: process spawn capability, management secrets at rest, error/debug recon via API
- **Threats**: stolen JWT via tunnel → spawn; SQLite offline steal of dual-read plaintext; error-based path recon
- **Attack vectors**: tunnel + management session; disk access to DATA_DIR; authenticated API grepping of error messages

### Findings table

| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| P1 | Tailscale enable/login spawn not LOCAL_ONLY/SPAWN | `routeGuard.ts` + `tailscaleTunnel.ts` + tests | Add prefixes; update tests; always-auth spawn path |
| P2 | Raw err.message in many API JSON bodies | `src/app/api/**` clusters | Convert to `createErrorResponseFromUnknown` / `buildErrorBody` |
| P2 | Auto-update SSE stderr to client | `system/version/route.ts` | Sanitize stream error messages |
| P2 | Dual-read plaintext until migrate | `secrets.ts` / `apiKeys.ts` / PSD | Ops ensure key + migrate; optional force-migrate CLI |
| P3 | Assess auth only via pipeline | `assess/route.ts` | Optional in-route `requireManagementAuth` |

### Compliance notes

- [x] Hard Rule #12 residual documented (not claimed zero)
- [x] Hard Rule #15 residual documented (tailscale enable/login)
- [x] Hard Rule #17 services LOCAL_ONLY verified
- [x] No secrets committed; no live DB/production ports touched
- [x] No re-open of 0040–0051 without new finding IDs

### Approval (for residual state, not production ship gate)

- [x] No **new Critical / unauthenticated RCE** proven in this pass
- [ ] P1 tailscale classification gap **not** accepted as closed
- [x] Medium P2 sanitize debt accepted as stretch backlog (matches 0051 honesty)
- [ ] Security team sign-off — **N/A** (audit report only)

---

*End of Wave 2 security residual investigation.*
