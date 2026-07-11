# Slice 04: MCP + Edge Runtime — Adversarial Review (Wave 1)

**Date**: 2026-07-11  
**Reviewer**: adversarial (parent agentID=reviewers)  
**Mode**: Wave 1 primary hunt

## Scope

| Path | Included |
|------|----------|
| `open-sse/mcp-server/` | yes |
| `src/sse/` | yes |
| `src/domain/` | yes |
| `src/server/` | yes |
| `src/mitm/` | yes |
| `electron/` | yes |
| `src/instrumentation.ts`, `src/instrumentation-node.ts`, `src/server-init.ts` | yes |

## Exclusions honored

- Task **0036** (deploy dual-mode auth) — not re-investigated
- Task **0017** (fusion docs/i18n) — not re-investigated
- Fusion 0010–0016, 0018 and dual-mode 0032–0035, 0037–0039 — not re-filed
- Frontend IA 0023–0031 — out of scope

## Method

1. MCP: registration, `withScopeEnforcement`, `_meta` trust, audit coverage, memory/skill/plugin/obsidian handlers, HTTP auth context
2. Authz: `routeGuard` LOCAL_ONLY, `SPAWN_CAPABLE_PREFIXES` vs bypass, management policy order (LAN + `requireLogin=false`)
3. MITM: `cert/install.ts` shell usage (Hard Rule 13), `systemCommands.ts` argv model
4. Domain: `policyEngine` call-site wiring, lockout/budget coupling
5. SSE: `chatHelpers` + `chat.ts` circuit-breaker success/failure accounting
6. Electron: preload whitelist, `open-external`, process tree, webPreferences
7. Evidence restricted to path:line in-scope files (plus minimal out-of-scope leaf helpers only when proving a wiring contract)

## Findings (severity-ordered)

### F-04-001 — Circuit breaker treats non-throwing upstream failures as probe success

- Severity: **P1**
- Category: bug / resilience
- Evidence:
  - `src/sse/handlers/chatHelpers.ts:502-518` — non-bypass path wraps `chatFn` in `breaker.execute()`
  - `src/shared/utils/circuitBreaker.ts:257-260` — any non-throwing return calls `_onSuccess()`
  - `src/shared/utils/circuitBreaker.ts:329-335` — HALF_OPEN success immediately closes the breaker
  - `src/sse/handlers/chat.ts:1289-1299` — real outcome inspected *after* execute; success double-counts `_onSuccess`
  - `src/sse/handlers/chat.ts:1609-1628` — failure `_onFailure` only when `!isCombo` and account fallback exhausted; combo / mid-fallback paths never record failure after the false success
- Why it matters: `handleChatCore` returns `{ success: false, status: 5xx }` without throwing. A HALF_OPEN probe that gets 502 closes the provider breaker as “probe-success”, then may continue account fallback without `_onFailure`. Combo traffic actively *heals* failure counts via execute’s success path while never calling `_onFailure` (`!isCombo`). Provider OPEN protection is weaker than the 3-layer resilience model claims.
- Suggested fix direction: Do not wrap soft-failure results in `breaker.execute` success semantics. Either (a) throw typed upstream failures from `chatFn` for breaker statuses, or (b) use gate-only `canExecute()` and drive `_onSuccess`/`_onFailure` solely from the post-result branch in `chat.ts` (and include combo provider-level failures for true provider outages).

### F-04-002 — MCP scope enforcement trusts client-controlled `_meta.scopes` and is off by default

- Severity: **P1**
- Category: security
- Evidence:
  - `open-sse/mcp-server/server.ts:96` — `MCP_ENFORCE_SCOPES = process.env.OMNIROUTE_MCP_ENFORCE_SCOPES === "true"` (default **false**)
  - `open-sse/mcp-server/scopeEnforcement.ts:39-58` — extracts scopes from `_meta.scopes` / `_meta.auth.scopes` / `_meta.omniroute.scopes`
  - `open-sse/mcp-server/scopeEnforcement.ts:86-88` — if `authInfo` empty, client `_meta` wins over env
  - `open-sse/mcp-server/httpTransport.ts` + `src/app/api/mcp/*/route.ts` — HTTP auth is `requireManagementAuth` only; nothing injects MCP SDK `authInfo` into tool extras
  - `tests/unit/t08-mcp-scope-enforcement.test.ts:27-40` — documents `_meta` fallback as intended
- Why it matters: When an operator turns enforcement on (documented secure mode), any client that can call tools can claim `scopes: ["*"]` via tool-call `_meta` because OmniRoute never populates transport `authInfo`. Default-off means tool scope declarations on 90+ tools are advisory theater for the common install.
- Suggested fix direction: Remove client `_meta` as a grant source (or treat it only as request hints that must be ⊆ authenticated scopes). Bind scopes from management API key / session into `extra.authInfo` in the HTTP transport. Consider secure-default enforce when HTTP transport is exposed beyond loopback/manage-bypass.

### F-04-003 — Memory / skill MCP tools accept caller-chosen `apiKeyId` (IDOR across tenants)

- Severity: **P1**
- Category: security
- Evidence:
  - `open-sse/mcp-server/tools/memoryTools.ts:11-16,40-57` — `apiKeyId` in input schema; search uses it directly
  - `open-sse/mcp-server/tools/memoryTools.ts:74-88,100-109` — add/clear for arbitrary `apiKeyId`
  - `open-sse/mcp-server/tools/skillTools.ts:11-15,61-63,77-80` — enable/execute use client `apiKeyId`
  - `open-sse/mcp-server/server.ts:1214-1228,1241-1255` — handlers receive parsed args only; no binding to authenticated subject
  - `src/app/api/mcp/sse/route.ts:32-46` / `stream/route.ts:35-57` — one management principal for whole MCP surface
- Why it matters: A manage-scoped MCP client (or any MCP client when scopes off) can read/write/clear memories or enable/execute skills for **any** API key id, not only the caller’s. Multi-key / multi-user deployments treat `apiKeyId` as a tenant boundary elsewhere; MCP ignores that boundary.
- Suggested fix direction: Drop client `apiKeyId` or pin it to `authInfo.clientId` / management subject. For admin cross-tenant ops require an explicit elevated scope (e.g. `admin:memory`) and audit the target id.

### F-04-004 — Incomplete `SPAWN_CAPABLE_PREFIXES` vs LOCAL_ONLY spawn surfaces (bypass allowlist hole)

- Severity: **P1**
- Category: security / wiring
- Evidence:
  - LOCAL_ONLY spawn surfaces in `src/server/authz/routeGuard.ts:29-45` include `/api/system/version`, `/api/db-backups/exportAll`, `/api/oauth/cursor/auto-import`, provider-login pattern, etc.
  - Deny-list `src/shared/constants/spawnCapablePrefixes.ts:26-35` omits those (only a subset of spawn prefixes)
  - Zod reject only checks SPAWN list: `src/shared/validation/settingsSchemas.ts:128-140`
  - Runtime bypass: `src/server/authz/routeGuard.ts:210-228` only blocks SPAWN-capable prefixes
  - Default bypass DB seed still only `/api/mcp/` (`src/lib/db/settings.ts:149-150`) but operator PATCH can add missing prefixes
- Why it matters: An admin (or compromised manage key) can put e.g. `/api/system/version` or `/api/db-backups/exportAll` on the manage-scope bypass list; schema + runtime both allow it. That re-opens remote spawn/tar/git-update surfaces Hard Rules #15/#17 intended to keep loopback-only.
- Suggested fix direction: Derive SPAWN_CAPABLE from the full LOCAL_ONLY spawn inventory (or invert: only allow explicit non-spawn bypass candidates like `/api/mcp/`). Add regression tests for each LOCAL_ONLY spawn path.

### F-04-005 — Private LAN + `requireLogin=false` grants anonymous access to spawn-capable LOCAL_ONLY routes

- Severity: **P1**
- Category: security
- Evidence:
  - `src/server/authz/policies/management.ts:147` — LOCAL_ONLY rejection only when `!loopback && !privateLan`
  - `src/server/authz/policies/management.ts:223-226` — if not always-protected and auth not required → `allow(anonymous)`
  - Spawn prefixes remain LOCAL_ONLY but reachable from RFC1918 peers once locality passes
  - Owner comment at `routeGuard.ts:133-136` documents intentional LAN widen (2026-05-30)
- Why it matters: Home-lab / office LAN hosts that disable dashboard login expose `/api/cli-tools/runtime/*`, `/api/plugins/*`, agent-bridge, services lifecycle, etc. to any device on the LAN without credentials — the same CVE class as tunnel exposure, one hop closer.
- Suggested fix direction: Keep LOCAL_ONLY spawn routes loopback-strict (or require auth even when `requireLogin=false`). If LAN widen must remain, gate it to read-only LOCAL_ONLY paths, never SPAWN_CAPABLE.

### F-04-006 — Large MCP tool families never audit successful invocations

- Severity: **P2**
- Category: security / observability / test-gap
- Evidence:
  - Core/advanced tools call `logToolCall` (e.g. `open-sse/mcp-server/server.ts:521`, `tools/advancedTools.ts` throughout)
  - Registration wrappers for memory/skills/plugins/gamification/notion/obsidian/pool only return content — no `logToolCall` on success/error (`server.ts:1206-1452`)
  - `grep logToolCall` empty in `tools/memoryTools.ts`, `pluginTools.ts`, `obsidianTools.ts`
  - Scope denials still log (`server.ts:452-468`) — asymmetric
- Why it matters: Docs claim every MCP tool hits `mcp_audit`. Write tools (`obsidian_delete_note`, `plugin_install`, `memory_clear`, `notion_append_blocks`) can mutate external/local state with no durable audit row when scopes are off (default).
- Suggested fix direction: Centralize audit inside `withScopeEnforcement` around the handler (duration, success, callerId, hashed args) so new tool families cannot skip it.

### F-04-007 — `agentSkillTools` registered without scopes → always denied when enforcement is on

- Severity: **P2**
- Category: wiring / bug
- Evidence:
  - `open-sse/mcp-server/tools/agentSkillTools.ts:20-80` — tool defs have **no** `scopes` field
  - `open-sse/mcp-server/server.ts:1269-1278` — `withScopeEnforcement(toolDef.name, handler)` with **no** inline scopes
  - `open-sse/mcp-server/scopeEnforcement.ts:111-121` — missing tool in `MCP_TOOL_MAP` → `tool_definition_missing` → denied
  - `MCP_TOOL_MAP` built only from core `MCP_TOOLS` (`schemas/tools.ts:1475`)
- Why it matters: Enabling the documented secure flag permanently breaks `omniroute_agent_skills_*` tools. Opposite of F-04-002’s “scopes off” failure mode.
- Suggested fix direction: Add `scopes: ["read:skills"]` (or similar) and pass `toolDef.scopes` like other families; or register in `MCP_TOOL_MAP`.

### F-04-008 — Dynamic skill MCP tools use unbounded passthrough input schema

- Severity: **P2**
- Category: security / maintainability
- Evidence:
  - `open-sse/mcp-server/server.ts:1464-1480` — `inputSchema: z.object({}).passthrough()` then `skillExecutor.execute(skill.name, (args ?? {}) as Record<string, unknown>, …)`
- Why it matters: No size/shape limits on skill arguments at the MCP boundary. Malicious or runaway agents can dump large payloads into skill execution (DoS / unexpected skill behavior). Static skill tools at least use Zod records with structure (`skillTools.ts:17-21`).
- Suggested fix direction: Cap keys/depth/byte size; prefer per-skill schemas when available; reject unknown keys by default.

### F-04-009 — Domain `evaluateRequest` policy engine not on the live request path

- Severity: **P2**
- Category: dead-code / wiring
- Evidence:
  - `src/domain/policyEngine.ts:47-88` — lockout + budget + fallback chain “verdict”
  - `grep evaluateRequest` under `src/app` — **0** hits; only `src/lib/container.ts` re-exports
  - Live budget enforcement exists elsewhere (`src/shared/utils/apiKeyPolicy.ts` imports `checkBudget` directly)
  - Login lockout uses `lockoutPolicy` independently of `evaluateRequest`
- Why it matters: Operators/docs that assume a centralized pre-forward policy gate are wrong. Fallback chains registered via domain fallback policy are not applied by this engine on chat traffic. Dual policy surfaces risk drift (budget rules updated in one place, not the other).
- Suggested fix direction: Wire `evaluateRequest` into chat/management path **or** delete/mark experimental and document that `apiKeyPolicy` + combo services are authoritative.

### F-04-010 — Obsidian vault paths not constrained against `..` / absolute segments

- Severity: **P2**
- Category: security
- Evidence:
  - `open-sse/mcp-server/tools/obsidianTools.ts:80-87,172-181,226-235` — free-form `path` strings to client
  - `src/lib/obsidian/api.ts:147-148` — `encodePath` only URI-encodes segments; does **not** reject `..` or empty/absolute roots
- Why it matters: Depending on Obsidian Local REST API path resolution, vault-relative APIs may still resolve traversal. MCP write/delete tools amplify impact. No local allowlist/normalization before network call.
- Suggested fix direction: Reject segments `''`, `'.'`, `'..'`; forbid leading `/`; normalize and ensure final path stays under vault root semantic.

### F-04-011 — Electron `webPreferences.sandbox` not enabled; `open-external` validates scheme only

- Severity: **P3**
- Category: security / hardening
- Evidence:
  - `electron/main.js:359-364` — `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, but **no** `sandbox: true`
  - `electron/main.js:788-797` — `http:`/`https:` allowed for any host (including `file`-like edge cases blocked, but not SSRF-to-local browser traps / phishing)
  - Preload channel allowlist is solid (`electron/preload.js:93-112`)
- Why it matters: Renderer compromise (XSS in dashboard) is constrained by isolation but lacks Chromium sandbox defense-in-depth. `openExternal` to attacker-controlled https is intentional product behavior but worth documenting.
- Suggested fix direction: Enable `sandbox: true` if preload/native deps allow; optionally restrict external opens to known hosts in production.

### F-04-012 — MITM cert install: Hard Rule 13 largely followed; residual shell script still uses `exec`

- Severity: **P3**
- Category: maintainability / residual risk
- Evidence:
  - `src/mitm/cert/install.ts:46-101` — `updateNssDatabases` passes `CERT_PATH`/`ACTION` via env into fixed bash script (documented anti-injection)
  - `src/mitm/cert/install.ts:285-317` — install path uses `execFileWithPassword` argv arrays
  - `src/mitm/systemCommands.ts:89-98` — spawn without shell
- Why it matters: Primary shell-injection class appears fixed. Residual: any future edit that interpolates into the `script` string reintroduces risk; `exec` + bash is still a larger blast radius than pure `execFile("certutil", args)`.
- Suggested fix direction: Replace NSS loop with `execFile("certutil", …)` per directory; keep env-only if shell must remain.

## Dead code / orphans

| Item | Evidence | Notes |
|------|----------|-------|
| `PolicyEngine` class + `evaluateRequest` unused on API path | `policyEngine.ts`, no `src/app` callers | See F-04-009 |
| MCP tool `scopes` fields when enforce off | `server.ts:96` | Dead authorization surface until flag on |
| `agentSkillTools` scopes | missing entirely | See F-04-007 |

## Wiring smells

1. **Dual circuit-breaker accounting**: `breaker.execute` success + post-hoc `_onSuccess`/`_onFailure` in `chat.ts` — easy to desync (F-04-001).
2. **MCP HTTP auth context vs scopes**: cookies/bearer forwarded to internal fetch (`httpAuthContext.ts`) but never mapped to tool `authInfo` scopes (F-04-002).
3. **Obsidian `extra.authInfo.clientId`**: tools expect per-key config (`obsidianTools.ts:15-19`) but HTTP transport never sets `authInfo` → always falls back to global Obsidian token.
4. **SPAWN_CAPABLE subset of LOCAL_ONLY**: two lists that must stay in sync manually (F-04-004).
5. **Combo vs single-model breaker policy**: combo never records provider breaker failure; intentional soft-fail or gap? Needs explicit product decision (ties F-04-001).

## Improvement opportunities

1. Integration test: HALF_OPEN + soft 502 result must leave breaker OPEN (or re-open), not CLOSED.
2. Property test: every registered MCP tool name either has inline scopes or `MCP_TOOL_MAP` entry; audit wrapper always invoked.
3. Collapse LOCAL_ONLY / SPAWN_CAPABLE into one typed registry with `{ path, spawn: boolean, getExempt?: boolean }`.
4. MCP memory/skill: remove tenant id from tool args; take from auth context only.
5. Electron: add unit test that `open-external` rejects `javascript:`, `file:`, `smb:`.

## Summary counts

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 5 |
| P2 | 5 |
| P3 | 2 |
| **Total findings** | **12** |

| Category | Count |
|----------|------:|
| security | 7 |
| bug / resilience | 1 |
| wiring | 2 |
| dead-code | 1 |
| hardening / residual | 1 |

**Highest priority remediation order**: F-04-001 (breaker false success) → F-04-002/003 (MCP authz) → F-04-004/005 (LOCAL_ONLY spawn surface) → F-04-006/007 (audit + agent skill scopes).

**Residual / unrun checks**: full MCP vitest suite, live MITM install on each distro, Electron packaged sandbox smoke, adversarial LAN `requireLogin=false` matrix — recommended for Wave 2 validation of F-04-001/004/005.

---

# Wave 2 — Adversarial second pass

**Date**: 2026-07-11  
**Reviewer**: independent adversarial (Wave 2 / Slice 04)  
**Mode**: hunt NEW findings only (does not re-file F-04-001…012; exclusions 0036/0017/fusion/dual-mode honored)

## Findings (Wave 2)

### F-04-W2-001 — MCP SSE HTTP transport is a process-global singleton (cross-client interference + transport thrash)

- Severity: **P1**
- Category: bug / concurrency / isolation
- Evidence:
  - `open-sse/mcp-server/httpTransport.ts:18-20,81-100` — single `_sseServer` / `_sseTransport`; `ensureSseServer()` reuses one `WebStandardStreamableHTTPServerTransport` for all `/api/mcp/sse` callers
  - `open-sse/mcp-server/httpTransport.ts:89,104` — starting SSE closes **all** streamable sessions; starting a streamable session closes SSE
  - `open-sse/mcp-server/httpTransport.ts:234-238` — every SSE GET/POST funnels into the shared `transport.handleRequest`
- Why it matters: Concurrent MCP clients (or SSE + streamable-http mode switches) share / destroy each other's transport state. JSON-RPC messages, session IDs, and in-flight tool calls can cross or be dropped when a second client initializes. This is not multi-tenant-safe even when each HTTP request passes `requireManagementAuth`.
- Suggested fix direction: One transport (and server) instance per authenticated session; never close unrelated sessions on mode bootstrap; document exclusive-mode if product insists on singleton (still race-prone).

### F-04-W2-002 — MCP internal `omniRouteFetch` / `apiFetch` forward management credentials to env-controlled base URL (no host pin)

- Severity: **P1**
- Category: security
- Evidence:
  - `src/shared/utils/resolveOmniRouteBaseUrl.ts:15-21` — `OMNIROUTE_BASE_URL` / `BASE_URL` / `NEXT_PUBLIC_BASE_URL` accepted with no loopback/allowlist check
  - `open-sse/mcp-server/server.ts:95,213-224` — `url = OMNIROUTE_BASE_URL + path`; headers merge `getMcpHttpAuthHeadersForInternalFetch()` (Authorization, Cookie, x-api-key) plus optional `OMNIROUTE_API_KEY`
  - `open-sse/mcp-server/httpAuthContext.ts:17-26,33-40` — ALS copies caller Authorization/Cookie/x-api-key into every internal fetch
  - `open-sse/mcp-server/tools/advancedTools.ts:34-48` — same pattern in advanced tools (`apiFetch`)
- Why it matters: Mis-set or attacker-influenced env (deploy template, compromised host env, wrong public URL) causes MCP tools to POST management cookies / bearer keys to an external host. Even with correct intent, dual-identity merge (caller Cookie + service `OMNIROUTE_API_KEY` Authorization) is hard to reason about for authz.
- Suggested fix direction: Pin internal base URL to loopback / process-local origin (or Unix socket / direct function call). Never forward browser Cookie to non-loopback. Prefer in-process handler invocation over HTTP self-fetch for MCP tools.

### F-04-W2-003 — `plugin_install` accepts any absolute filesystem path → load/activate runs untrusted code in a child process

- Severity: **P1**
- Category: security
- Evidence:
  - `open-sse/mcp-server/tools/pluginTools.ts:17-33,65-73` — `validatePluginPath` requires absolute path and rejects `..` after normalize, but allows **any** absolute directory (`/tmp/...`, `/home/...`, world-writable paths)
  - `open-sse/mcp-server/tools/pluginTools.ts:85-99` — `plugin_activate` loads hooks into the request pipeline
  - `src/lib/plugins/loader.ts:46-50` — plugin host does `await import(pluginPath)` in a child process
  - Scopes default-off (Wave 1 F-04-002) and missing family audit (F-04-006) amplify impact
- Why it matters: A manage-authenticated MCP client (or any client when scopes are off / LAN+`requireLogin=false`) can install a plugin from an attacker-writable path and activate it to run arbitrary JS with OmniRoute privileges and hook chat traffic. Path “validation” is not a sandbox root allowlist.
- Suggested fix direction: Restrict install sources to a configured plugins root (and/or signed marketplace packages). Require `write:plugins` with enforce-on by default for HTTP. Refuse world-writable / non-owned paths; audit every install/activate.

### F-04-W2-004 — MCP tool error paths return raw `err.message` (and full upstream HTTP bodies) — Hard Rule #12

- Severity: **P2**
- Category: security / error-sanitization
- Evidence:
  - `open-sse/mcp-server/server.ts:226-228` — `throw new Error(\`OmniRoute API error [${status}]: ${errorText}\`)` embeds full response text
  - `open-sse/mcp-server/server.ts:523-526,1222-1224,1249-1251,...` — catch blocks return `` `Error: ${msg}` `` to the MCP client
  - `open-sse/mcp-server/tools/advancedTools.ts:46-48,321-324` — same for `apiFetch` and tool handlers
  - `open-sse/mcp-server/tools/pluginTools.ts:96-98` — handler returns `{ error: msg }` with raw message
- Why it matters: Internal API failures, filesystem paths, stack-ish messages, and DB diagnostics can be reflected to any MCP client. Violates project Hard Rule #12 (`buildErrorBody` / `sanitizeErrorMessage`).
- Suggested fix direction: Centralize MCP error mapping through `sanitizeErrorMessage()`; log full detail server-side; return stable codes + short messages to clients.

### F-04-W2-005 — `omniroute_set_budget_guard` is in-memory theater; never enforced on the request path

- Severity: **P2**
- Category: dead-code / contract mismatch
- Evidence:
  - `open-sse/mcp-server/tools/advancedTools.ts:119,344-361` — sets module-local `activeBudgetGuard` and reports `status: "active"`
  - `open-sse/mcp-server/tools/advancedTools.ts:866-872` — only other reader is `get_session_snapshot`
  - Repo-wide: no imports of `activeBudgetGuard` outside `advancedTools.ts`; no chat/policy wiring
- Why it matters: Operators/agents believe `degrade`/`block` will cap spend. The tool succeeds and returns “active” while chat/completions continue unconstrained (real budget path is `apiKeyPolicy` / domain elsewhere). False sense of control; same class as F-04-009 policyEngine dead gate.
- Suggested fix direction: Wire into live spend/guardrail path **or** remove/relabel tool as “snapshot preference only” and stop claiming active enforcement.

### F-04-W2-006 — Dynamic `skill_*` MCP tools never load the DB skill registry at registration time

- Severity: **P2**
- Category: wiring / bug
- Evidence:
  - `open-sse/mcp-server/server.ts:1455-1499` — `skillRegistry.list().filter(s => s.enabled)` with **no** `await skillRegistry.loadFromDatabase()`
  - `src/lib/skills/registry.ts:181-187` — `list()` only returns the in-memory `registeredSkills` map
  - `open-sse/mcp-server/tools/skillTools.ts:31-32,62` — static skill tools correctly call `loadFromDatabase` first
  - Catch at `server.ts:1498-1499` swallows all errors (“Skills not loaded yet”)
- Why it matters: DB-enabled custom skills are typically never exposed as MCP tools until some other code path happened to warm the cache. `skills_enable` updates DB but does not re-register tools on the long-lived HTTP MCP server instance (`httpTransport` keeps one `createMcpServer()` until restart). Product contract of “dynamic skill tools from skills table” is broken.
- Suggested fix direction: `await loadFromDatabase()` before register; re-register / tool-list refresh on enable/disable; fail loud instead of empty catch.

### F-04-W2-007 — Streamable MCP sessions: fire-and-forget `connect`, no principal binding, no session cap

- Severity: **P2**
- Category: security / reliability
- Evidence:
  - `open-sse/mcp-server/httpTransport.ts:97,119` — `void server.connect(transport)` (not awaited); first requests can race connect
  - `open-sse/mcp-server/httpTransport.ts:30,105-120,169-187` — sessions keyed only by UUID in `_streamableSessions`; no binding to API key id / dashboard subject
  - No max-sessions constant; only idle sweep at `httpTransport.ts:34-43` (5 min idle)
- Why it matters: (1) Race → intermittent 5xx on initialize. (2) Any second management principal who obtains `mcp-session-id` can drive that session if they pass route auth (session fixation / lateral use). (3) Unbounded map under initialize flood → memory DoS on LOCAL_ONLY/LAN surfaces.
- Suggested fix direction: `await connect` before accept; bind session to auth subject hash and reject mismatch; cap concurrent sessions per principal and globally.

### F-04-W2-008 — Live dashboard WebSocket accepts any valid inference API key (no `manage` scope)

- Severity: **P2**
- Category: security
- Evidence:
  - `src/server/ws/liveServer.ts:144-155` — `isValidApiKey(apiKey)` only; no `getApiKeyMetadata` / `hasManageScope`
  - `src/sse/services/auth.ts:2392-2399` — `isValidApiKey` true for any DB key or env router key
  - Event bus includes operational telemetry (`src/lib/events/types.ts:10-20,85-90` — request model/provider, credential health with `connectionId`)
- Why it matters: A least-privilege client API key issued for `/v1` inference can open Live WS (if origin/host allow-list permits) and observe fleet routing/health events. Dashboard cookie path is admin-equivalent; API-key path is not scoped the same way as managementPolicy.
- Suggested fix direction: Require `manage` (or a dedicated `read:live` scope) for API-key Live WS; keep cookie dashboard path; reject bare inference keys.

### F-04-W2-009 — `src/sse/services/streamState.ts` registry is dead on the live chat path

- Severity: **P3**
- Category: dead-code / wiring
- Evidence:
  - `src/sse/services/streamState.ts:179-210` — `activeStreams` map + `createStreamTracker` / `archiveStream`
  - Grep of production imports: only `tests/unit/advanced-fase07-09.test.ts` imports this module; no `chat.ts` / `chatHelpers.ts` usage
- Why it matters: FASE-09 “stream state machine” docs/tests imply production tracking; nothing records live SSE lifecycle. Operators relying on `getActiveStreams()` for incident response get an always-empty view. Orphan class like F-04-009 policyEngine.
- Suggested fix direction: Wire into chat SSE lifecycle with guaranteed `archiveStream` on abort/finally, **or** delete/mark experimental.

### F-04-W2-010 — MCP audit rows attribute `api_key_id` only from env, never the HTTP caller

- Severity: **P3**
- Category: security / observability
- Evidence:
  - `open-sse/mcp-server/audit.ts:350` — `const apiKeyId = process.env.OMNIROUTE_API_KEY_ID || null`
  - HTTP auth subject available in management pipeline headers / ALS but never passed into `logToolCall`
  - Distinct from F-04-006 (missing audit for tool families): this is wrong identity when audit *does* fire
- Why it matters: Forensics cannot distinguish which manage key or dashboard session invoked a mutating tool when multiple operators share one process. Env-only attribution is nearly always `null` for HTTP MCP.
- Suggested fix direction: Pass `callerId` from `resolveCallerScopeContext` / management auth into `logToolCall`; never invent identity from static env alone for multi-user HTTP.

## Wave 2 summary counts (new only)

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 3 |
| P2 | 5 |
| P3 | 2 |
| **Total new** | **10** |

| Category | Count |
|----------|------:|
| security | 6 |
| bug / concurrency | 1 |
| wiring / dead-code | 3 |

**Wave 2 remediation priority**: F-04-W2-001 (SSE singleton) → F-04-W2-002 (credential forward) → F-04-W2-003 (plugin path RCE) → F-04-W2-004/007/008 → F-04-W2-005/006 → P3 cleanup.

**Combined Wave 1+2 totals** (informational): P0=0, P1=8, P2=10, P3=4, **22 findings**.

**Residual / unrun**: concurrent multi-client MCP SSE soak, malicious plugin install under scopes-off, Live WS with scoped inference key against exposed `LIVE_WS_HOST`, OMNIROUTE_BASE_URL redirect-to-attacker lab.
