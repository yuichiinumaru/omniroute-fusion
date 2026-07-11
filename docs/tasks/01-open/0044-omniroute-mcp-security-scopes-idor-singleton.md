# Task 0044: MCP Security — Scopes, IDOR, Singleton, Plugin Path, Credential Pin

> **Status**: `[ ]` Open
> **Priority**: 🟠 P1
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S5)
> **Action type**: HARDEN
> **Blocks**: Task 0047 preferred (live scope/tool SSoT consumers)
> **Depends on**: Task 0040 partial (SPAWN_CAPABLE already owned there; do not re-list version-manager)
> **Architect-2**: Upgraded 2026-07-11 — F-04-001 moved to 0043; IDOR expanded beyond memory/skill

---

## Source reports (builder reference)

Primary:
- `docs/reports/04-mcp-edge-runtime.md` — F-04-002, F-04-003, F-04-W2-001, F-04-W2-002, F-04-W2-003 (stretch: F-04-006–010, F-04-W2-004–008)

Also relevant:
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context
- F-04-001 is **not** this task → see Task **0043** + same report slice
- F-04-004 / F-04-005 SPAWN → Task **0040**

Docs: `docs/frameworks/MCP-SERVER.md`.

---

## Objective

Harden the MCP server and edge transport against **authorization bypass, cross-tenant IDOR, transport races, untrusted plugin load, and credential SSRF**:

1. **F-04-002**: Scope enforcement must not trust client `_meta.scopes`; enforce from authenticated principal; default-on or fail-safe when management expects scopes.
2. **F-04-003**: Tools must **not** accept arbitrary caller-chosen `apiKeyId` — bind to caller principal (memory, skill, **and** gamification/obsidian-class tools that take `apiKeyId`).
3. **F-04-W2-001**: MCP SSE HTTP transport must not be a process-global singleton that cross-talks clients.
4. **F-04-W2-002**: `omniRouteFetch` / `apiFetch` must pin destination host (no env-controlled open redirect of management cookies).
5. **F-04-W2-003**: `plugin_install` must jail paths (no arbitrary absolute FS load).

Stretch: audit coverage (F-04-006), agentSkill scopes (F-04-007), dynamic skill schema (F-04-008), Obsidian path jail (F-04-010), error sanitize (F-04-W2-004 → also 0051), session binding (F-04-W2-007).

**Not in this task**: F-04-001 (chat soft-failure breaker) → **Task 0043**. F-04-004/005 SPAWN → **Task 0040**.

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-04-002** | P1 | Scope enforcement trusts `_meta.scopes`; off by default |
| **F-04-003** | P1 | Caller-chosen `apiKeyId` IDOR (memory/skill + same class) |
| **F-04-W2-001** | P1 | MCP SSE HTTP process-global singleton |
| **F-04-W2-002** | P1 | omniRouteFetch/apiFetch credential forward without host pin |
| **F-04-W2-003** | P1 | plugin_install any absolute path → child process code |
| Stretch | P2 | F-04-006–010, F-04-W2-004–008 |

See **Source reports** above for full relative paths.

### Evidence anchors (verified 2026-07-11)

- `open-sse/mcp-server/server.ts` — `MCP_ENFORCE_SCOPES` default false; `TOTAL_MCP_TOOL_COUNT`
- `open-sse/mcp-server/scopeEnforcement.ts` — `_meta.scopes` / `_meta.auth.scopes` grant path
- `open-sse/mcp-server/tools/memoryTools.ts`, `skillTools.ts` — required/optional `apiKeyId` from caller
- `open-sse/mcp-server/tools/gamificationTools.ts` — also takes `apiKeyId` (same IDOR class)
- Plugin install tool path handling (absolute FS)
- Internal fetch helpers used by MCP tools

### Out of scope

- Dashboard MCP count copy (Task **0047** consumes fixed SSoT)
- Skills Docker host env (Task **0046**)
- Chat breaker soft-failure (Task **0043** / F-04-001)
- Fusion / dual-mode

---

## Test Requirements

- MUST: tool call with forged `_meta.scopes` cannot escalate beyond principal scopes
- MUST: memory/skill (and any other multi-tenant tool with `apiKeyId` in schema) with foreign `apiKeyId` rejected or remapped to caller
- MUST: two concurrent MCP SSE clients do not share mutating singleton state (or documented session isolation)
- MUST: fetch helper refuses non-allowlisted base URL when credentials attached
- MUST: plugin_install rejects path outside allowed plugin roots (`/etc/passwd`, `/tmp/evil`, `../`)
- Prefer vitest MCP suite + unit tests for pure helpers

---

## Exit Conditions (GDD/TDD)

- [ ] Primary five findings closed with tests
- [ ] Scope source-of-truth documented (server assigns scopes from API key / session)
- [ ] IDOR fix applied to **all** MCP tools that accept tenant/apiKey principal ids (grep `apiKeyId` under mcp-server)
- [ ] `npm run test:vitest` MCP-related tests pass (or targeted vitest files)
- [ ] Unit tests for path jail + fetch pin pass
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` — no new errors
- [ ] CHANGELOG.md security entry
- [ ] Update MCP-SERVER.md only if behavior/docs drift would fail fabricated-docs checks

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** e o report em `docs/reports/04-mcp-edge-runtime.md` listado em Source reports: MCP scope middleware (`scopeEnforcement.ts`, `server.ts`), tool modules with `apiKeyId` (memory, skill, gamification, obsidian config), SSE/streamable HTTP transport setup, `omniRouteFetch`/`apiFetch`, plugin install tool handler, `tests` MCP suites
- [ ] Remove client-controlled scope trust; bind principal scopes into transport `authInfo`
- [ ] Strip/override `apiKeyId` input on multi-tenant tools (grep all, not only memory/skill)
- [ ] Per-connection transport (or mutex + isolation) for SSE
- [ ] Host pin allowlist for internal fetches (loopback / configured APP_URL only)
- [ ] Plugin path jail relative to plugins dir
- [ ] Stretch audit + error sanitize (or leave F-04-W2-004 to 0051 if not done)
- [ ] Tests + CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/mcp-server/scopeEnforcement.ts` | Modificar — no client scope grant |
| `open-sse/mcp-server/server.ts` | Modificar — enforce defaults / wiring |
| `open-sse/mcp-server/tools/memoryTools.ts` | Modificar — apiKeyId bind |
| `open-sse/mcp-server/tools/skillTools.ts` | Modificar — apiKeyId bind |
| `open-sse/mcp-server/tools/gamificationTools.ts` | Modificar — apiKeyId bind (same class) |
| Other tools with `apiKeyId` (grep) | Modificar |
| Plugin install tool / loader | Modificar — path jail |
| Internal fetch helper used by MCP tools | Modificar — host pin |
| MCP HTTP/SSE transport modules | Modificar — singleton isolation |
| `tests/` vitest MCP | Expandir |
| `docs/frameworks/MCP-SERVER.md` | Update if required |
| `CHANGELOG.md` | Entry |

### How

1. Trace auth context from HTTP/stdio into tool handler args.
2. Grep `apiKeyId` and `_meta` in mcp-server.
3. Grep `plugin_install` path handling.
4. TDD each P1 before wiring.

### Why

MCP is a privileged control plane (94 tools). Client-supplied scopes/IDs and arbitrary plugin paths convert a management API into multi-tenant data breach + RCE.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT trust client-provided scopes or tenant IDs.
> DO NOT load plugins from absolute paths outside the configured plugins root.
> DO NOT forward management cookies to arbitrary `OMNIROUTE_*_URL` without host allowlist.
> DO NOT implement F-04-001 here — that is chat path ownership in 0043.

> [!IMPORTANT]
> First subtask: read existing code. Coordinate SPAWN_CAPABLE with 0040 — do not duplicate version-manager work.
> Prefer exporting stable scope/tool counts for 0047 rather than inventing second constants.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**
- [ ] **Zod Validation**: tighten tool input schemas
- [ ] **Security**: scopes + IDOR + path
- [ ] **Error Sanitization**: stretch F-04-W2-004
- [ ] **No Raw SQL** outside db modules
- [ ] **Tests**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
- **Finding IDs closed**:
- **Testes**:
- **typecheck / lint**:
- **CHANGELOG**:
- **Agente executor**:
- **Data de conclusão**:

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**:
- **Veredito**:
- **Score**:
- **Notas**:
