# Review Report: Task 0044 — MCP Security (Scopes, IDOR, Singleton, Plugin Path, Host Pin) — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0044 (`omniroute-mcp-security-scopes-idor-singleton`); live path `docs/tasks/03-review/0044-omniroute-mcp-security-scopes-idor-singleton.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0044-mcp-security-review.md` — score 91/100, PASS WITH NOTES
- **Related reports considered**:
  - `docs/reports/04-mcp-edge-runtime.md` (F-04-002/003/W2-001..003)
  - Task 0040 reaudit (LOCAL_ONLY / LAN + auth-disabled adjacency for `/api/mcp/`)
  - `docs/frameworks/MCP-SERVER.md`
- **Review mode**: `re-review` (adversarial security re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers / gt-security-reviewer rigor)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `90/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| F-04-002 `_meta` trust removed | 97 | No client scope grant path; unit forges `*` |
| F-04-003 IDOR pin | 95 | Central `bindTenantPrincipalIds` in `withScopeEnforcement` |
| F-04-W2-001 SSE isolation | 93 | Per-session maps; 52 node + 86 vitest green |
| F-04-W2-002 host pin | 96 | Loopback credential assert |
| F-04-W2-003 plugin jail | 94 | Pure jail tests green; handler suite still load-fails |
| Default-off scopes residual | 88 | **Not an open Critical** — see analysis |
| Test hygiene | 80 | `plugins-tools.test.ts` still missing `os` import |

## Delta Summary

### Resolved Since Previous Review

- none (builder did not land path-to-100 fixes)

### Persistent Findings

- `PERSISTENT` **N1**: `tests/unit/plugins-tools.test.ts` still `ReferenceError: os is not defined` — re-confirmed this reaudit. Path jail still covered by `t08-mcp-scope-enforcement` pure tests.
- `PERSISTENT` **N2**: Concurrent-session test still soft-asserts `if (id1 && id2)`.
- `PERSISTENT` **N3**: `OMNIROUTE_MCP_ENFORCE_SCOPES` default **false**.
- `PERSISTENT` **N4**: No e2e `callTool` through wrapper with tenant principal proving remap (pure bind tests exist).
- `PERSISTENT` **N5**: `toApiKeyId` intentionally unbound (transfer destination).

### Regressions

- **none** on the five primary P1 fixes.

### New Findings

- `NEW` **N6 (Medium adjacency / not Critical)**: With `requireLogin=false` + private LAN, `/api/mcp/*` is reachable anonymously at authz policy (LOCAL_ONLY allows LAN; not SPAWN/ALWAYS) and handlers call `requireManagementAuth` **without** `{ always: true }`. Then:
  - `resolveMcpPrincipalFromRequest` → null
  - scopes enforce off → all tools allowed
  - principal role `none` → `bindApiKeyIdToPrincipal` **honors caller-chosen** `apiKeyId`
  - This is an **open residual multi-tenant IDOR posture under open-install LAN**, not a tunnel-JWT critical (via-proxy/remote still LOCAL_ONLY 403 without manage bypass).
  - Ownership splits with Task 0040 (classification / always-auth) and this task (principal bind on unauthenticated path).
- `NOTE` **Default-off scopes criticality**: **No — residual is not an open Critical.** Rationale below.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Handler-level plugin_install reject suite still does not execute (N1).
- `EXTERNAL_BLOCKER`: none

## Default-off scopes: is residual still an open Critical?

**Answer: No.**

| Layer | Behavior when `OMNIROUTE_MCP_ENFORCE_SCOPES` is false |
| --- | --- |
| Client `_meta.scopes` | Still **never** trusted (F-04-002 critical half **closed**) |
| HTTP reachability | `/api/mcp/` is LOCAL_ONLY; public tunnel without manage bypass → 403 |
| Manage-scope remote MCP | Operator keys map to `*` scopes — enforce-on would still allow |
| Tenant API key + enforce off | Tool *category* scopes cosmetic; **IDOR pin still remaps** `apiKeyId` for `role=tenant` |
| Unauthenticated + enforce off | All tools callable **only if** transport already reachable (LAN/loopback open-install residual N6) |

Critical half of F-04-002 was forged scope escalation; that is closed. Default-off remains **product opt-in residual (Low–Medium)** for least-privilege tool categories, not Critical open RCE/authz collapse on the tunnel threat model.

## Findings

### Blocking

- none

### Non-blocking (path-to-100) — security-impact ranked

| ID | Class | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- | --- |
| N6 | NEW | Medium | Unauth LAN MCP + role none honors apiKeyId | `management.ts` LAN; MCP routes soft auth; `principalBinding.ts:99-102` | ALWAYS-auth MCP handlers; refuse tool calls when principal role `none` on HTTP transport (stdio may differ) |
| N1 | PERSISTENT | Medium (test) | plugins-tools suite load fail | `plugins-tools.test.ts:7` | `import os from "node:os"` |
| N4 | PERSISTENT | Low | Missing e2e IDOR through wrapper | t08 pure only | One callTool-style test |
| N3 | PERSISTENT | Low | Scopes default off | `server.ts:106` | Optional HTTP enforce-when-principal |
| N2 | PERSISTENT | Low | Soft session-id assert | mcp-session-sweep | `assert.ok(id1 && id2)` |
| N5 | PERSISTENT | Info | toApiKeyId unbound | intentional | Document |

### Explicit non-issues (re-verified)

| Guard | Status | Proof |
| --- | --- | --- |
| F-04-002 no `_meta` grant | ✅ | `scopeEnforcement.ts:62-92`; unit forges scopes |
| Principal → authInfo | ✅ | `mcpPrincipal.ts` + `httpTransport.resolveAuthInfo` |
| F-04-003 central bind | ✅ | `server.ts:499-505` |
| manage key tenant-pinned | ✅ | `mcpPrincipal.ts:82-85` admin only env-key/admin |
| F-04-W2-001 isolation | ✅ | separate session maps; node suite pass |
| F-04-W2-002 host pin | ✅ | `assertCredentialSafeOmniRouteBaseUrl` |
| F-04-W2-003 path jail | ✅ | pure tests reject `/etc/passwd`, `/tmp/evil`, `../` |
| vitest MCP | ✅ | **14 files / 86 tests PASS** |
| node security cores | ✅ | **52/52** (t08 + base-url + session-sweep) |

## Contract Compliance

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Forged `_meta` cannot escalate | ✅ | unit |
| Foreign apiKeyId remapped for tenant | ✅ | unit + wrapper |
| Concurrent SSE isolation | ✅ | maps + tests |
| Credential host pin | ✅ | unit |
| plugin_install path jail | ✅ | pure tests (handler suite N1) |
| CHANGELOG / MCP-SERVER.md | ✅ | prior |

## Re-run commands (this reaudit)

```bash
node --import tsx/esm --test \
  tests/unit/t08-mcp-scope-enforcement.test.ts \
  tests/unit/resolve-omniroute-base-url.test.ts \
  tests/unit/mcp-session-sweep.test.ts
# → 52 pass

node --import tsx/esm --test tests/unit/plugins-tools.test.ts
# → FAIL load: os is not defined (N1)

npx vitest run open-sse/mcp-server/__tests__/ --reporter=dot
# → 14 files, 86 tests pass
```

## Path To 100

1. **+4** — Fix plugins-tools `os` import; re-run (N1).
2. **+3** — HTTP refuse unauthenticated tool execution / always-auth MCP routes (N6) — coordinate 0040.
3. **+2** — e2e IDOR through `withScopeEnforcement` (N4).
4. **+1** — Harden session-id assert (N2); optional enforce-default product decision (N3).

## Verdict

**HELD_IN_REVIEW_PATH_TO_100** — Score **90/100**.  
Five primary P1 findings remain closed under adversarial re-proof. **Default-off scopes is not an open Critical.** Highest residual security impact is **N6** (open-install LAN unauthenticated MCP + caller-chosen apiKeyId when role=none), not tunnel JWT with manage-less credentials.

**Moved**: no  
**Patched**: no
