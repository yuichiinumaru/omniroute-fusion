# Epic 0008 — OmniRoute Adversarial Remediation (Wave 1 + Wave 2)

> **Status**: **Closed (remediation wave complete, 2026-07-19)** — children **0040–0051** all under `docs/tasks/04-completed/`  
> **Priority**: Critical (P0 security + correctness — historical wave)  
> **Author**: gt-task-architect · 2026-07-11  
> **Reviewer (A2)**: gt-task-architect (independent) · 2026-07-11 — see §9  
> **Hygiene**: 2026-07-19 (EPIC-10 / Task 0062)  
> **Project**: omniroute-2  
> **Type**: remediation / security / correctness  
> **Action types**: `HARDEN` (authz, secrets, sanitization) + `FIX` (pipeline contracts, resilience wiring) + `EXTEND` (SSoT, tests)  
> **Depends on**: none (orthogonal to dual-mode 0006/0007 and fusion 0003/0004)  
> **Related**:  
> - Source reports: full inventory in **§ Source reports** below (`docs/reports/00`–`08`)  
> - Hard Rules #3, #12, #15, #17 (RCE / error sanitize / LOCAL_ONLY spawn)  
> - Stretch / deferred residuals in epic body remain **non-actionable history** unless re-homed under a later epic (e.g. **EPIC-12** security residual)  
>
> **Do not re-open as greenfield.** Primary P0/P1 package **0040–0051** drained. New security residual work → **EPIC-12** (or explicit new tasks), not re-promotion of 0040–0051.

---

## Source reports (builder reference)

All adversarial inputs for this epic live under `docs/reports/`. Builders open these relative paths from repo root — no hunting under absolute home paths.

| Slice | Relative path | Primary consumers (tasks) |
|-------|---------------|---------------------------|
| plan / exclusions | [`docs/reports/00-wave-plan-exclusions.md`](../../reports/00-wave-plan-exclusions.md) | Epic stop-criteria; 0051 residual context |
| 01 pipeline | [`docs/reports/01-open-sse-pipeline.md`](../../reports/01-open-sse-pipeline.md) | **0042**, **0048** |
| 02 executors | [`docs/reports/02-open-sse-executors-config.md`](../../reports/02-open-sse-executors-config.md) | **0045** |
| 03 services | [`docs/reports/03-open-sse-services.md`](../../reports/03-open-sse-services.md) | **0043** |
| 04 mcp-edge | [`docs/reports/04-mcp-edge-runtime.md`](../../reports/04-mcp-edge-runtime.md) | **0044**; also 0040 (SPAWN), 0043 (F-04-001) |
| 05 lib-data-auth | [`docs/reports/05-lib-data-auth.md`](../../reports/05-lib-data-auth.md) | **0041**, **0050** |
| 06 lib-features | [`docs/reports/06-lib-features-tooling.md`](../../reports/06-lib-features-tooling.md) | **0046**; also 0051 (F-06-008) |
| 07 app-api | [`docs/reports/07-app-api.md`](../../reports/07-app-api.md) | **0040**, **0049**; also 0051 (authz/sanitize) |
| 08 app-ui | [`docs/reports/08-app-ui-shared.md`](../../reports/08-app-ui-shared.md) | **0047** |

**Exclusions context** (do not re-open competing work): `docs/reports/00-wave-plan-exclusions.md`.

---

## 1. Goal (RF8 · Goals)

### Problem

Wave 1 + Wave 2 adversarial reviews across the full OmniRoute tree (~8 slices) produced **~180+ findings** with multiple **P0** and a large **P1** security/correctness surface:

| Severity (approx combined) | Themes |
|----------------------------|--------|
| **P0** | RouteGuard bypass / process RCE (`openapi/try`, middleware hooks `new Function`); secrets at rest (JWT/API signing secrets plaintext); chat quota-share return-shape break |
| **P1** | LOCAL_ONLY / ALWAYS_PROTECTED holes; MCP scopes/IDOR/plugin path; combo breaker wiring; executor SSRF/secret logs; cloud sync credential exfil; UI error-object / MCP count drift; search SSRF; budget/usage bugs |
| **P2–P3** | Sanitization residuals, timeout semantics, href schemes, doc drift, fusion residuals |

Operators running with `requireLogin=false`, tunnel exposure, or SQLite backups are at concrete risk of **remote spawn**, **in-process RCE**, **credential dump**, and **routing correctness failures**.

### Value

1. **Close the LOCAL_ONLY / ALWAYS_PROTECTED / SPAWN_CAPABLE matrix** so tunnel + leaked JWT cannot re-open GHSA-class spawn/RCE surfaces.  
2. **Encrypt root secrets and stop plaintext API-key storage** so DB compromise is not game-over for sessions/keys.  
3. **Restore pipeline contracts** (chat result envelope, Hard Rule #12) so enforcement paths fail closed with safe bodies.  
4. **Re-wire combo/auto-combo resilience** so OPEN breakers and HALF_OPEN probes are not ignored.  
5. **Harden MCP + executors + skills/plugins** against IDOR, SSRF, untrusted code, and secret exfil.  
6. **Stop dashboard/MCP SSoT drift** so operators see real tool/scope counts and readable errors.

### Success metrics

| Metric | Target |
|--------|--------|
| **All 4 P0s closed** | **F-07-001**, **F-07-W2-001**, **F-05-001**, **F-01-001** — fixed with failing-then-passing tests (Hard Rule #18) |
| P1 findings mapped as primary on 0040–0050 | 0 unmapped primary P1s; residual P1s only if explicitly deferred with owner + reason |
| `isLocalOnlyPath` / ALWAYS_PROTECTED / SPAWN_CAPABLE | Spawn/RCE/export inventory in matrix + unit tests; SPAWN_CAPABLE always requires auth even when `requireLogin=false` (F-04-005) |
| JWT/API secrets in SQLite | No plaintext **writes** when encryption key present; secrets **rotatable** (upsert, not INSERT OR IGNORE) |
| Inference API keys | Hash-only validation; no bulk plaintext reveal remotely |
| `handleChatCore` quota-share block | Envelope `{ success, status, response }` only — never bare `Response` (`chatCore.ts:2070-2074`) |
| Chat breaker soft-failures | Non-throwing `{ success:false }` must not count as HALF_OPEN probe success (F-04-001) |
| Combo RR / runtime-unit / auto-combo | Breaker failures recorded; OPEN not re-admitted via empty-pool; gates use `canExecute`/`getStatus` not raw OPEN-only |
| MCP scopes + `apiKeyId` | Scopes from principal only; caller-bound tenant id on memory/skill/gamification tools |
| Regression tests | Each child task ships ≥1 focused automated test (Hard Rule #18); both `test:unit` and `test:vitest` green for touched surfaces |

### Stop criteria (out of scope)

- **Historical exclusions at wave start (lane truth 2026-07-19)**:
  - Dual-mode ops: **0036** still `01-open/` (HOLD :21000)
  - Fusion **0010–0018**, dual-mode **0032–0035**, UX **0037–0039**, IA **0020–0031** → all `04-completed/`
  - Fusion runtime residuals → **EPIC-11**; security residuals → **EPIC-12**
- Fusion residuals labeled **may overlap** in original reports (e.g. F-03-012, F-03-W2-006) → tracked under fusion/EPIC-11, not re-opened as 0008 children
- Full multi-tenant product redesign; Electron product overhaul (P3 only as stretch)
- Live tunnel RCE pentest on production (static + unit proof is the gate; VPS only if unit impossible)

---

## 2. Domain (RF8 · Domain)

### Bounded context

| Area | Owner modules | Report path(s) |
|------|---------------|----------------|
| Route classification | `src/server/authz/routeGuard.ts`, `spawnCapablePrefixes.ts`, `publicApiRoutes.ts` | `docs/reports/07-app-api.md`, `docs/reports/04-mcp-edge-runtime.md` |
| Secrets / encryption | `src/lib/db/secrets.ts`, `encryption.ts`, `apiKeys.ts`, providers PSD | `docs/reports/05-lib-data-auth.md` |
| Chat / SSE pipeline | `open-sse/handlers/`, `utils/error.ts`, `utils/stream.ts` | `docs/reports/01-open-sse-pipeline.md` |
| Combo / auto-combo | `open-sse/services/combo.ts`, `autoCombo/`, circuit breaker | `docs/reports/03-open-sse-services.md` (+ F-04-001 in `04-mcp-edge-runtime.md`) |
| MCP server | `open-sse/mcp-server/` | `docs/reports/04-mcp-edge-runtime.md` |
| Executors | `open-sse/executors/`, `config/` | `docs/reports/02-open-sse-executors-config.md` |
| Skills / plugins / cloud | `src/lib/skills/`, `plugins/`, cloud sync, idempotency | `docs/reports/06-lib-features-tooling.md` |
| Dashboard / shared UI | `src/app/(dashboard)/`, `src/shared/`, MCP hub | `docs/reports/08-app-ui-shared.md` |
| Search / cache SSRF | search handlers, semantic cache, path segment helpers | `docs/reports/01-open-sse-pipeline.md` (+ stretch `05-lib-data-auth.md` headroom) |
| Exclusions / already tracked | dual-mode, fusion, frontend IA | `docs/reports/00-wave-plan-exclusions.md` |

### Deferred / already tracked (do not re-task)

| Finding / theme | Why deferred |
|-----------------|--------------|
| Dual-mode auth / `no_refresh_token` / connection auth mode | Epic **0006** tasks 0032–0036, 0035; sister UX **0007** 0037–0039 |
| Fusion contracts / runtime / UI / docs | Epic fusion tasks **0010–0018** (0017 doing) |
| Frontend IA sidebar / theme / field kit | Tasks **0023–0031** in 03-review |
| F-03-012 fusion nested combo-ref options | **may overlap 03-review** 0012 |
| F-03-W2-006 fusion panel abort/cancel | **may overlap 03-review** fusion runtime |
| F-05-006 OAuth `tokenExpiresAt` lockstep | Adjacent dual-mode/oauth health; track only if residual after 0006/0007 |

### Current-state evidence (reports)

| Report path | P0 | P1 | Notes |
|-------------|----|----|-------|
| `docs/reports/01-open-sse-pipeline.md` | 1 | 8 | F-01-001 envelope; sanitization + SSRF/cache W2 |
| `docs/reports/02-open-sse-executors-config.md` | 0 | 8 | path sanitize, Vertex logs, Qwen resourceUrl, timeouts |
| `docs/reports/03-open-sse-services.md` | 0 | 6 | RR breaker, runtime-unit strip, HALF_OPEN, auto-combo |
| `docs/reports/04-mcp-edge-runtime.md` | 0 | 8 | scopes, IDOR, singleton, plugin path, SPAWN parity |
| `docs/reports/05-lib-data-auth.md` | 1 | 5 | JWT secrets P0; api_keys; PSD; budget; usage |
| `docs/reports/06-lib-features-tooling.md` | 0 | 6 | sandbox env, plugins, cloud sync, idempotency |
| `docs/reports/07-app-api.md` | 2 | 10 | openapi try P0; hooks RCE P0; LOCAL_ONLY holes |
| `docs/reports/08-app-ui-shared.md` | 0 | 3 | error object; MCP counts/scopes SSoT |
| `docs/reports/00-wave-plan-exclusions.md` | — | — | Already-tracked exclusions (no competing tasks) |

---

## 3. Stories / slices (story map → tasks)

| Story | Intent | Task(s) | Primary report path(s) | Priority |
|-------|--------|---------|------------------------|----------|
| **S1 RouteGuard & RCE surfaces** | Expand LOCAL_ONLY / ALWAYS_PROTECTED / SPAWN_CAPABLE; kill openapi/try bypass + hooks `new Function` remote install; version-manager, tunnels, MITM, restart, db export/import | **0040** | `docs/reports/07-app-api.md` (+ `04-mcp-edge-runtime.md` for F-04-004/005) | 🔴 P0 |
| **S2 Secrets at rest** | Encrypt JWT/API signing secrets; **upsert/rotate** secrets; hash-only API keys; encrypt PSD web-session cookies; fix PSD response redaction | **0041** | `docs/reports/05-lib-data-auth.md` | 🔴 P0 |
| **S3 Chat pipeline contract** | Fix quota-share bare `Response`; Hard Rule #12 on handlers/streamHandler; response header denylist; stream cancel finalize | **0042** | `docs/reports/01-open-sse-pipeline.md` | 🔴 P0 |
| **S4 Combo + breaker resilience** | Soft-failure breaker classification (F-04-001); RR breaker record + pre-skips; runtime-unit resilience wire; HALF_OPEN gate; auto-combo empty-pool / re-evaluate | **0043** | `docs/reports/03-open-sse-services.md` (+ `04-mcp-edge-runtime.md` for F-04-001) | 🟠 P1 |
| **S5 MCP security** | Scope enforcement SSoT; apiKeyId principal bind (all multi-tenant tools); SSE singleton; plugin path jail; credential host pin | **0044** | `docs/reports/04-mcp-edge-runtime.md` | 🟠 P1 |
| **S6 Executor harden** | chatPath sanitize on production path; Vertex key log redaction; Qwen resourceUrl allowlist; error sanitize; timeout semantics; Opencode race | **0045** | `docs/reports/02-open-sse-executors-config.md` | 🟠 P1 |
| **S7 Skills / plugins / cloud** | Sandbox env scrub; plugin permissions; cloud sync sign + outbound scrub; CLIProxy hash; idempotency key scope | **0046** | `docs/reports/06-lib-features-tooling.md` | 🟠 P1 |
| **S8 UI + MCP SSoT** | Structured error presentation; MCP hub counts from live constants; shared scope/tool maps | **0047** | `docs/reports/08-app-ui-shared.md` | 🟠 P1 |
| **S9 SSRF & cache correctness** | Search `baseUrl` SSRF; semantic cache signature; path-segment injection; search cache key | **0048** | `docs/reports/01-open-sse-pipeline.md` (+ stretch `05` headroom) | 🟠 P1 |
| **S10 Privileged API handlers** | Cloud credentials scope; relay/translator/sessions/keys auth; cli-tools key dump LOCAL_ONLY | **0049** | `docs/reports/07-app-api.md` | 🟠 P1 |
| **S11 Data-layer correctness** | Registered-key budget window reset; usage history rollup idempotency | **0050** | `docs/reports/05-lib-data-auth.md` | 🟠 P1 |
| **S12 Residual authz & sanitize sweep** | API error helper default sanitize; health public split; A2A fail-closed; high-value P2 stretch | **0051** | `docs/reports/07-app-api.md` + `04` + `06` (+ `00` exclusions) | 🟡 P2 |

### Suggested dependency order

```
Wave A (security foundations — land first, can parallelize A1/A2/A3):
  0040 RouteGuard/RCE     ─┬─► 0049 handler auth (matrix + classification)
  0041 secrets at rest    ─┼─► 0049 keys reveal policy (hash-only + no bulk dump)
  0042 chat envelope/#12  ─┘

Wave B (parallel after or with A once 0040 classification is stable):
  0043 combo + breaker soft-failure
  0044 MCP scopes/IDOR/plugin/transport
  0045 executor SSRF/path/timeouts
  0046 skills/plugins/cloud/idempotency
  0048 search SSRF + semantic cache + path segments
  0050 registered-key budget + usage rollup

Wave C (consumes Wave A/B helpers/SSoT):
  0047 UI error + MCP counts/scopes (prefer after 0044 scope SSoT)
  0051 residual authz + sanitize sweep (prefer after 0040 + 0042)
```

**Hard preference**: do not ship 0049 key-material fixes before 0041 hash-only direction is decided (same product surface).  
**Soft preference**: 0045 and 0048 share one `assertSafePathSegment` helper — first lander owns export.

---

## 4. Condensation opportunity (maintainability)

1. **Route security matrix SSoT** — generate/test LOCAL_ONLY ∪ ALWAYS_PROTECTED ∪ SPAWN_CAPABLE ∪ PUBLIC from one inventory (extend existing route-guard tests / check scripts).  
2. **Error builders** — one path: `buildErrorBody` / `sanitizeErrorMessage` / `createErrorResponseFromUnknown` (fix fail-open raw message).  
3. **MCP tool/scope counts** — one export used by server + dashboard + i18n intro.  
4. **Path segment validators** — shared `assertSafePathSegment` for audio + executor URL builders.  
5. **Idempotency / cache keys** — always include tenant/API-key principal + full request materiality fields.

---

## 5. Validation commands (epic-level)

```bash
# Route guard membership
node --import tsx/esm --test tests/unit/authz/routeGuard.test.ts
# Secrets / api keys / encryption (after 0041)
node --import tsx/esm --test tests/unit/**/*secret* tests/unit/**/*apiKey* 2>/dev/null || true
# Pipeline + combo + MCP + executor focused suites per task
npm run typecheck:core
npm run lint
# Prefer targeted unit tests over full suite during implementation
```

Each child task lists exact `node --import tsx/esm --test …` patterns.

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| LOCAL_ONLY breaks legitimate remote ops | Document remote-safe vs loopback-only ops; keep status/read endpoints remote where product requires |
| Encrypting secrets bricks old DBs | Migration + dual-read ciphertext/plaintext during transition; refuse plaintext **write** when key set |
| `persistSecret` INSERT OR IGNORE blocks rotation after encrypt | Fix upsert (F-05-W2-003) **inside 0041** — not a stretch after encrypt lands |
| Hash-only API keys break “reveal key” UI | One-time show on create/regenerate only; match accessTokens pattern; align 0049 cli-tools/keys |
| openapi/try cookie re-entry | Deny LOCAL_ONLY+SPAWN destinations **and** stop cookie forward to those paths |
| Soft-failure breaker heal (F-04-001) missed if treated as MCP-only | Owned by **0043** (chatHelpers/chat path), not 0044 |
| Combo pre-skip changes routing order | TDD with recorded fixture orders; document behavior in resilience guide |
| Fusion double-fix | Leave F-03-012 / W2-006 deferred; link 03-review only |
| Scope creep into frontend IA | UI task limited to error presentation + MCP SSoT; no sidebar/theme work |
| Dual test runners | Unit (node) + vitest (MCP/autoCombo) both required when those surfaces change |

---

## 7. Promotion note for gt-task-architect

**Historical (2026-07-11):** child tasks promoted to `01-open/` as **0040–0051**.  
**Current (2026-07-19):** all **0040–0051** are in `docs/tasks/04-completed/`. Do not re-promote. Stretch residuals stay deferred text or re-home under **EPIC-12**.  
**Post-Gortex analysis (2026-07-24):** S1 hook `new Function` residual relocated to **Task 0116** (`docs/tasks/01-open/0116-omniroute-epic08-hook-sandbox-newfunction-residual.md`) — S1 remote RCE surface remains closed; 0116 removes the underlying local-only residual via a sandbox rewrite.

---

## 8. Child tasks (lane truth 2026-07-19 — all completed)

| Task | File (under `docs/tasks/04-completed/`) | Story |
|------|------------------------------------------|-------|
| 0040 | `0040-omniroute-routeguard-local-only-always-protected-expansion.md` | S1 |
| 0041 | `0041-omniroute-secrets-at-rest-encryption.md` | S2 |
| 0042 | `0042-omniroute-chat-pipeline-envelope-and-sanitize.md` | S3 |
| 0043 | `0043-omniroute-combo-resilience-wiring.md` | S4 |
| 0044 | `0044-omniroute-mcp-security-scopes-idor-singleton.md` | S5 |
| 0045 | `0045-omniroute-executor-ssrf-path-timeout-sanitize.md` | S6 |
| 0046 | `0046-omniroute-skills-plugins-cloud-sync-hygiene.md` | S7 |
| 0047 | `0047-omniroute-ui-error-object-mcp-ssot.md` | S8 |
| 0048 | `0048-omniroute-search-ssrf-semantic-cache-path.md` | S9 |
| 0049 | `0049-omniroute-api-privileged-handler-auth.md` | S10 |
| 0050 | `0050-omniroute-registered-key-budget-usage-rollup.md` | S11 |
| 0051 | `0051-omniroute-residual-authz-error-sanitize-sweep.md` | S12 |

### Finding ID coverage (primary task ownership)

| Task | Primary finding IDs (acceptance) | Source report path(s) | Notes |
|------|----------------------------------|-----------------------|-------|
| 0040 | F-07-001, F-07-W2-001, F-07-002, F-07-003, F-07-004, F-07-005, F-07-W2-002, F-07-W2-003, F-04-004, F-04-005 | `docs/reports/07-app-api.md`, `docs/reports/04-mcp-edge-runtime.md` | stretch: F-07-008, F-07-W2-008 (ngrok same tunnel class) |
| 0041 | F-05-001, F-05-002, F-05-003, F-05-W2-001, **F-05-W2-003** | `docs/reports/05-lib-data-auth.md` | stretch: F-05-007, F-05-008–010 |
| 0042 | F-01-001, F-01-002, F-01-003, F-01-004, F-01-005, F-01-W2-003 | `docs/reports/01-open-sse-pipeline.md` | stretch: F-01-W2-005, F-01-007, F-01-011, F-01-W2-007 |
| 0043 | F-03-001, F-03-002, F-03-003, F-03-004, F-03-W2-001, F-03-W2-002, **F-04-001** | `docs/reports/03-open-sse-services.md`, `docs/reports/04-mcp-edge-runtime.md` | stretch: F-03-W2-003, F-03-006, F-03-008 |
| 0044 | F-04-002, F-04-003 (+ gamification/obsidian IDOR class), F-04-W2-001, F-04-W2-002, F-04-W2-003 | `docs/reports/04-mcp-edge-runtime.md` | stretch: F-04-006–010, F-04-W2-004–008; F-04-001 owned by 0043 |
| 0045 | F-02-001, F-02-002, F-02-003, F-02-004, F-02-005, F-02-W2-001, F-02-W2-002, F-02-W2-003 | `docs/reports/02-open-sse-executors-config.md` | stretch: F-02-W2-004, F-02-009–010 |
| 0046 | F-06-001, F-06-002, F-06-003, F-06-004, F-06-W2-001, F-06-W2-002 | `docs/reports/06-lib-features-tooling.md` | stretch: F-06-006, F-06-010, F-06-W2-004–006 |
| 0047 | F-08-001, F-08-002, F-08-003 | `docs/reports/08-app-ui-shared.md` | stretch: F-08-004–008, F-08-W2-001–005 |
| 0048 | F-01-W2-001, F-01-W2-002, F-01-006 | `docs/reports/01-open-sse-pipeline.md` (+ stretch `05-lib-data-auth.md`) | F-01-W2-004 P2 co-primary (same search cache surface); stretch: F-05-W2-005 |
| 0049 | F-07-006, F-07-007, F-07-W2-004, F-07-W2-005 | `docs/reports/07-app-api.md` | stretch: F-07-W2-006 (P2 sessions), F-07-011–015, F-07-W2-007–010 |
| 0050 | F-05-004, F-05-005 | `docs/reports/05-lib-data-auth.md` | stretch: F-05-W2-004 (relay budget); **F-05-W2-003 moved to 0041** |
| 0051 | F-07-014, F-07-009, F-07-010, F-04-W2-004, F-06-008 | `docs/reports/07-app-api.md`, `04-mcp-edge-runtime.md`, `06-lib-features-tooling.md` (+ `00-wave-plan-exclusions.md`) | stretch remaining high-ROI P2/P3 |

### P0 inventory (must all be green to call epic done)

| ID | Title | Task | Source report |
|----|-------|------|---------------|
| F-07-001 | openapi/try LOCAL_ONLY bypass | 0040 | `docs/reports/07-app-api.md` |
| F-07-W2-001 | middleware hooks `new Function` RCE | 0040 | `docs/reports/07-app-api.md` |
| F-05-001 | JWT/API signing secrets plaintext | 0041 | `docs/reports/05-lib-data-auth.md` |
| F-01-001 | quota-share bare Response envelope | 0042 | `docs/reports/01-open-sse-pipeline.md` |

**Deferred (not assigned as new work):** F-03-012, F-03-W2-006 (fusion 03-review); dual-mode/IA/fusion task scopes per §2; F-05-006 OAuth lockstep adjacent to 0006/0007.

---

## 9. Architect-2 review notes (2026-07-11)

> Independent review by second gt-task-architect. Not rubber-stamped.

### Verdict on Architect-1 package

- **Coverage**: All report **P0** and **primary P1** IDs were mapped to 0040–0051; exclusions (0036, 0017, 03-review fusion/dual-mode/IA) honored; no competing tasks opened.
- **Gaps fixed in this pass**:
  1. **F-04-001 re-homed** from MCP task 0044 → resilience task **0043** (evidence is `chatHelpers`/`chat.ts`/`circuitBreaker`, not MCP).
  2. **F-05-W2-003** (write-once `persistSecret`) promoted into **0041** primary — encrypt without rotate is incomplete.
  3. **F-01-W2-005** demoted to stretch on 0042 (P2); mid-stream path corrected to `streamHandler.ts`.
  4. **F-07-W2-006** sessions demoted to stretch on 0049 (P2); primary handler-auth = 006/007/W2-004/W2-005 only.
  5. **IDOR scope** on 0044 expanded beyond memory/skill to other tools accepting client `apiKeyId`.
  6. **Concrete paths** strengthened (quota-share lines, semanticCache modules, existing `extractApiErrorMessage`, qwen `resourceUrl` in `default.ts`, etc.).
  7. **Dependency waves** A/B/C added; 0049↔0041 key-material coordination.
- **No new task 0052+**: upgrades fit existing stories; splitting further would fragment ownership without new finding IDs.
- **Intentionally deferred (still OK)**: fusion residuals; dual-mode F-05-006; bulk P2/P3 inventory as stretch on 0051; Electron sandbox P3; full multi-tenant redesign.
- **Quality score after upgrades**: READY for promotion execution (tasks already in `01-open/` at review time).  
- **Post-wave (2026-07-19)**: package executed and drained → `04-completed/0040`–`0051`; epic closed.
