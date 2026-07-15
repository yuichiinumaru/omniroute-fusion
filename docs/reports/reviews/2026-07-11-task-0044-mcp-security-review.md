# Review Report: Task 0044 — MCP Security (Scopes, IDOR, Singleton, Plugin Path, Host Pin) — 2026-07-11

## Review Lineage

- **Current task**: Task 0044 (`omniroute-mcp-security-scopes-idor-singleton`); live path `docs/tasks/03-review/0044-omniroute-mcp-security-scopes-idor-singleton.md`
- **Previous reports read**:
  - `docs/reports/04-mcp-edge-runtime.md` (F-04-002, F-04-003, F-04-W2-001..003)
  - Task completion evidence in task file
- **Related / excluded**:
  - F-04-001 → Task 0043 (not reviewed here)
  - F-04-004/005 SPAWN → Task 0040
  - Stretch F-04-006–010, F-04-W2-004–008 deferred (error sanitize → 0051) — accepted
- **Review mode**: `initial-review`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `91/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 93 | Five P1 findings closed with code + docs; residual default-off scopes + test hygiene notes |
| F-04-002 scope SSoT | 96 | `_meta` grant path removed; principal → `authInfo` + ALS |
| F-04-003 IDOR pin | 94 | Central `bindTenantPrincipalIds` in `withScopeEnforcement`; grepped tool surfaces covered |
| F-04-W2-001 SSE isolation | 93 | Per-session maps; SSE ⟂ streamable; behavioral tests green in re-run |
| F-04-W2-002 host pin | 95 | Loopback pin before credentialed `omniRouteFetch` / `apiFetch` |
| F-04-W2-003 plugin jail | 94 | Root allowlist + traversal reject; pure unit tests green |
| Tests / evidence quality | 82 | Core suites green; `plugins-tools.test.ts` fails load (missing `os`); isolation soft-assert |
| Scope discipline | 98 | No 0040/0043 bleed; CHANGELOG + MCP-SERVER.md aligned |

## Findings

### Blocking

- none

### Non-blocking (path-to-100)

| ID | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- |
| N1 | Medium | `tests/unit/plugins-tools.test.ts` fails to load — missing `import os from "node:os"` while using `os.tmpdir()`. Task completion claimed this suite green; F-04-W2-003 *handler-level* rejects in that file never execute. Path jail still covered by pure tests in `t08-mcp-scope-enforcement.test.ts`. | `plugins-tools.test.ts:7` → `ReferenceError: os is not defined` on re-run this review. Blame shows pre-existing missing import; 0044 still edited the file and asserted green. | Add `import os from "node:os";` (or `path.join` of `fs.mkdtempSync` under `os.tmpdir` via `import { tmpdir } from "node:os"`). Re-run suite. |
| N2 | Low | F-04-W2-001 concurrent-session test soft-asserts: if `mcp-session-id` headers are absent, the body is skipped and the test still passes. | `mcp-session-sweep.test.ts:205-211` `if (id1 && id2) { assert... }`. Live re-run *does* emit distinct ids (and 406 body from transport Accept), so current behavior is real — assertion strength is weak. | `assert.ok(id1 && id2)` before equality check. |
| N3 | Low | `OMNIROUTE_MCP_ENFORCE_SCOPES` remains default-off. Critical half of F-04-002 (`_meta` trust) is closed; advisory scopes for HTTP multi-tenant remain unless operators opt in. Documented in MCP-SERVER.md + env table. | `server.ts:106`; docs env table default `false`. Task wording allowed “default-on **or** fail-safe when management expects scopes”. | Optional follow-up: enforce-on for HTTP when principal present / non-loopback manage bypass; leave stdio opt-in. Not required for 0044 PASS. |
| N4 | Low | No integration test that drives a real `callTool` through `withScopeEnforcement` with a tenant principal and proves foreign `apiKeyId` remaps before memory/skill handlers. Pure `bindTenantPrincipalIds` / `resolveCallerScopeContext` tests exist. | `t08-mcp-scope-enforcement.test.ts` only; `httpAuthContext` vitest covers credential forward, not IDOR. | Add one vitest/node test: ALS/authInfo tenant + `memory_search`-class args `{ apiKeyId: "victim" }` → bound self (mock store). |
| N5 | Info | `toApiKeyId` is intentionally not remapped (transfer destination). `fromApiKeyId` is pinned for tenants. Acceptable product semantics. | `principalBinding.ts:132-134`; gamification transfer schema. | Document in MCP-SERVER if operators misread “all tenant ids bound”. |

### Explicit non-issues (verified)

| Guard | Status | Proof |
| --- | --- | --- |
| F-04-002: client `_meta.scopes` never grant | ✅ | `scopeEnforcement.ts:62-92` ignores `_meta`; unit tests forge `*` → env/none only |
| F-04-002: principal scopes into transport | ✅ | `mcpPrincipal.ts` + `httpTransport.ts` `resolveAuthInfo` → `handleRequest(..., { authInfo })` + ALS |
| F-04-003: central bind before handlers | ✅ | `server.ts:499-505` `bindTenantPrincipalIds` inside `withScopeEnforcement` |
| F-04-003: memory/skill/gamification schemas still take ids | ✅ | Bound at wrapper; handlers unchanged (remap contract) |
| F-04-003: manage key ≠ cross-tenant admin | ✅ | `mcpPrincipal.ts:82-85` admin only `env-key` / `admin` scope; manage → `*` scopes + **tenant** role |
| F-04-W2-001: no process-global SSE singleton | ✅ | Separate `_sseSessions` / `_streamableSessions`; no cross-mode teardown |
| F-04-W2-001: concurrent SSE distinct sessions | ✅ | Re-run: two distinct `mcp-session-id`s; counts `sse: 2` |
| F-04-W2-002: credential host pin | ✅ | `assertCredentialSafeOmniRouteBaseUrl` in `server.ts` + `advancedTools.ts` |
| F-04-W2-003: path jail | ✅ | `pluginPathJail.ts` roots; rejects `/etc/passwd`, `/tmp/evil`, `../`; allows under roots |
| Stretch F-04-W2-004 | ⏭ | Deferred to 0051 per task; partial sanitize already present (`errorSanitize`, `sanitizeErrorMessage` in plugin/advanced) |
| Out of scope 0043/0040 | ✅ | No chat breaker / SPAWN_CAPABLE churn in 0044 commit |
| CHANGELOG | ✅ | Unreleased Security entry Task 0044 / five finding IDs |
| MCP-SERVER.md SSoT | ✅ | Scope source-of-truth + loopback pin + enforce flag docs |
| typecheck:core | ✅ | Re-run exit 0 this review |
| vitest MCP | ✅ | `open-sse/mcp-server/__tests__` **14 files / 86 tests PASS** |
| node unit (security cores) | ✅ | `t08-mcp-scope-enforcement` + `resolve-omniroute-base-url` + `mcp-session-sweep` PASS |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Forged `_meta.scopes` cannot escalate | ✅ | `resolveCallerScopeContext` unit tests; no grant path in source |
| Foreign `apiKeyId` rejected/remapped | ✅ | Tenant remap unit tests; wrapper always binds |
| Concurrent MCP SSE isolation | ✅ | Per-session maps + re-run distinct ids |
| Fetch refuses non-allowlisted base with credentials | ✅ | Loopback-only assert + unit tests |
| `plugin_install` rejects `/etc/passwd`, `/tmp/evil`, `../` | ✅ | `t08` path jail tests; handler calls `validatePluginInstallPath` |
| Vitest MCP-related pass | ✅ | 86/86 |
| Path jail + fetch pin unit tests | ✅ | t08 + resolve-omniroute-base-url (plugins-tools load fail = N1) |
| typecheck:core | ✅ | pass |
| CHANGELOG security entry | ✅ | present |
| MCP-SERVER.md if drift | ✅ | updated |

## Re-run commands (this review)

```bash
node --import tsx/esm --test \
  tests/unit/t08-mcp-scope-enforcement.test.ts \
  tests/unit/resolve-omniroute-base-url.test.ts \
  tests/unit/mcp-session-sweep.test.ts
# → 52 pass (plugins-tools excluded — load fail N1)

npx vitest run open-sse/mcp-server/__tests__/ --reporter=dot
# → 14 files, 86 tests pass

npm run typecheck:core
# → exit 0
```

## Path to 100

1. **+4** — Fix `plugins-tools.test.ts` `os` import; re-run full suite (closes N1).
2. **+2** — Harden F-04-W2-001 assertions with mandatory session-id presence (N2).
3. **+2** — One end-to-end IDOR test through `withScopeEnforcement` (N4).
4. **+1** — Optional product decision on HTTP enforce-default (N3).

## Lane action

- **Moved**: no (remains `docs/tasks/03-review/`)
- **Patched**: no (review-only)
