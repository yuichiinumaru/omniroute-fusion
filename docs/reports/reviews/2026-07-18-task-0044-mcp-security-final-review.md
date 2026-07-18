# Final Review: Task 0044 — MCP Security (Scopes, IDOR, Singleton, Path Jail, Host Pin) — 2026-07-18

## Review Lineage

- **Task**: 0044 (`omniroute-mcp-security-scopes-idor-singleton`) — `docs/tasks/03-review/`
- **Prior reports (UNTRUSTED scores; evidence only)**:
  - `2026-07-11-task-0044-mcp-security-review.md` (91)
  - `2026-07-16-task-0044-mcp-security-reaudit.md` (90)
- **Mode**: Independent full re-review (adversarial security) — agentID=`reviewers`
- **Source findings**: F-04-002, F-04-003, F-04-W2-001, F-04-W2-002, F-04-W2-003

## Score And Verdict

| Field | Value |
| --- | --- |
| **Score** | **100/100** |
| **Verdict** | `PASS_PATH_TO_100` |
| **Lane** | remain `docs/tasks/03-review/` |
| **Patches this session** | none (prior fixer closed N1/N2/N6) |

### Rubric

| Dimension | Score | Live proof |
| --- | --- | --- |
| F-04-002 no `_meta` scope trust | 100 | `resolveCallerScopeContext` forged `_meta.scopes: ["admin","*"]` → scopes `[]`, source `none` |
| F-04-003 IDOR principal bind | 100 | `bindTenantPrincipalIds` / `bindApiKeyIdToPrincipal`; role=none HTTP refuses caller apiKeyId |
| F-04-W2-001 SSE isolation | 100 | per-session maps; hard assert concurrent session ids |
| F-04-W2-002 host pin | 100 | `assertCredentialSafeOmniRouteBaseUrl` on omniRouteFetch/apiFetch |
| F-04-W2-003 plugin path jail | 100 | `validatePluginInstallPath` rejects `/etc/passwd`, allows roots; plugins-tools suite loads |
| Open-install MCP auth (N6) | 100 | `/api/mcp/sse` + `/api/mcp/stream` `requireManagementAuth({ always: true })` |
| Tests | 100 | 75/75 node suite (t08 + session + plugins-tools + base-url) |

## Contract Compliance

| MUST | Status | Proof |
| --- | --- | --- |
| Forged `_meta.scopes` cannot escalate | ✅ | unit + live probe |
| Foreign `apiKeyId` remapped/rejected | ✅ | tenant remap + reject modes; HTTP none refuse |
| Concurrent SSE no shared mutating singleton | ✅ | session maps + hard id assert |
| Credentialed fetch refuses non-loopback | ✅ | assert helper + tests |
| plugin_install jail | ✅ | path jail pure tests + plugins-tools green |

## Fresh Verification (this session)

```text
node --import tsx/esm --test \
  tests/unit/t08-mcp-scope-enforcement.test.ts \
  tests/unit/mcp-session-sweep.test.ts \
  tests/unit/plugins-tools.test.ts \
  tests/unit/resolve-omniroute-base-url.test.ts
→ tests 75 · pass 75 · fail 0

Live: forged _meta scopes → { callerId: 'anonymous', scopes: [], source: 'none' }
plugins-tools.test.ts: import os from "node:os" present; suite loads
```

## Residual (accepted product / non-blocking)

| ID | Severity | Note |
| --- | --- | --- |
| N3 | Info | `OMNIROUTE_MCP_ENFORCE_SCOPES` still default-off — **not Critical**: `_meta` trust closed; IDOR pin always applies for tenants; HTTP always-auth closes open-install tool plane |
| N4 | Info | Full `callTool` e2e through wrapper still partial (bind + HTTP none units cover security invariant) |

## Path-to-100 Closure

| Prior open | Status |
| --- | --- |
| N1 plugins-tools `os` import | ✅ closed |
| N6 open-install unauth MCP + role none apiKeyId | ✅ closed |
| N2 soft session assert | ✅ closed (hard assert) |
| N3 scopes default-off | ➖ accepted product residual |

## Lane Action

- **Moved**: no — stays `03-review/`
- **Code patched this session**: no
- **Score**: 100
