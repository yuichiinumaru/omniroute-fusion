# Slice 06: lib features + tooling — Adversarial Review (Wave 1)

**Date**: 2026-07-11  
**Reviewer**: code-quality-reviewer (Wave 1, agent slice 06)  
**Workspace**: `/home/sephiroth/working/ganthritor/omniroute-2`

## Scope

- Remaining `src/lib/**` **not** in slice 05 (excluded: `db/`, `oauth/`, `providers/`, `credentialHealth/`, `resilience/`, `quota/`, `usage/`, `auth/`, `accessTokens/`, `security/`, `config/`, `env/`, `freeProxyProviders/`, `headroom/`)
- `bin/`
- `scripts/`

Priority hunt areas: memory, skills, plugins, guardrails (PII opt-in), webhooks HMAC, cloud agents, a2a, evals, services installers, CLI injection, quality-gate false greens, dead modules / wiring gaps.

## Exclusions honored

| Item | Handling |
|------|----------|
| Task **0036** open (dual-mode auth / deploy) | Not investigated |
| Task **0017** doing (fusion docs/i18n) | Not investigated |
| Fusion 0010–0016, 0018; dual-mode 0032–0035, 0037–0039; Frontend IA 0023–0031 | Not opened competing work; no findings on those contracts |

## Method

1. Mapped high-risk feature libraries under `src/lib/` and traced call sites for permission/enforcement mismatches.
2. Read installers, sandbox, plugin loaders/workers, webhook dispatcher, PII paths, cloud sync, A2A task execution, skills executor/builtins, evals, versionManager binary download.
3. Sampled `bin/cli` for shell/`exec` injection patterns and `scripts/check` for allowlist / false-green behavior.
4. Cross-checked greps for wiring (who actually calls what) to separate latent vs production-path bugs.
5. Findings require path:line evidence; style-only and pre-existing slice-05 surfaces omitted.

## Findings (severity-ordered)

### F-06-001 — Skill Docker sandbox inherits full host `process.env`

- Severity: **P1**
- Category: security
- Evidence: `src/lib/skills/sandbox.ts:95-98` (`env: { ...process.env, ...env }`); callers `src/lib/skills/builtins.ts:420-426`, `463-468` pass `{}` as `env` overlay.
- Why it matters: Built-in `execute_code` / `execute_command` skills run user-influenced code/commands inside Docker. Container process still receives host secrets (`JWT_SECRET`, `API_KEY_SECRET`, provider tokens, `STORAGE_ENCRYPTION_KEY`, etc.). A sandboxed payload that can read env (e.g. Node `process.env` in `node:22-alpine`, or any image that exposes env) exfiltrates the host operator secrets despite `--network none` by default.
- Suggested fix direction: Pass a minimal allowlisted env (e.g. `PATH`, `LANG`, `HOME=/workspace`) into `docker run -e`, never spread full `process.env`. Prefer `--env-file` of empty/minimal map; document that host env is intentionally not inherited.

### F-06-002 — Production plugin loader does not enforce manifest permissions

- Severity: **P1**
- Category: security | wiring
- Evidence:
  - Production path: `src/lib/plugins/manager.ts:397` → `loadPlugin` from `loader.ts`.
  - Host script: `src/lib/plugins/loader.ts:45-71` does `await import(pluginPath)` in a child Node process with only env filtering (`getFilteredEnv` at `315-326`).
  - Capability-gated `vm` sandbox lives only in unused `src/lib/plugins/pluginWorker.ts` (no `new Worker` / import from manager; only source-scan tests).
- Why it matters: Manifest `requires.permissions` (`network` / `file-read` / `file-write` / `exec`) are **not** enforced on the live load path. Any installed plugin can `import("fs")`, `import("child_process")`, open sockets, etc., regardless of declared permissions. Operators and docs that treat permissions as a security boundary are wrong; only LOCAL_ONLY route classification + operator trust remain.
- Suggested fix direction: Either (a) wire the worker sandbox and enforce permissions there for all activate/load paths, or (b) remove/relabel permissions as “declared metadata only” and require integrity + explicit operator ack. Do not leave dual models where tests claim sandbox hardening that production never runs.

### F-06-003 — Cloud sync accepts unsigned responses when `OMNIROUTE_CLOUD_SYNC_SECRET` is unset

- Severity: **P1**
- Category: security
- Evidence: `src/lib/cloudSync.ts:46-57` (`verifyCloudSignature` returns `true` with warning when secret unset); called before parse at `124-128`. Credential overwrite still gated by `OMNIROUTE_CLOUD_SYNC_SECRETS` (`198-203`), but metadata (`expiresAt`, `testStatus`, `lastError`, `rateLimitedUntil`, …) still applies from unauthenticated cloud payload (`183-193`).
- Why it matters: With `CLOUD_URL` set and no shared secret (documented “legacy” mode until v3.9), a MITM or attacker-controlled `CLOUD_URL` can force connection cooldown/error state via spoofed metadata, degrading routing without ever stealing tokens. Comment admits enforce-by-default is deferred.
- Suggested fix direction: Fail closed when secret missing if `CLOUD_URL` is set; or require explicit `OMNIROUTE_CLOUD_SYNC_INSECURE=1` opt-in. Ship v3.9 flip sooner. Never treat missing HMAC as success.

### F-06-004 — CLIProxy install can skip SHA-256 verification

- Severity: **P1**
- Category: security
- Evidence: `src/lib/versionManager/binaryManager.ts:99-109` — verification runs only when `checksums.size > 0` **and** `checksums.get(assetName)` is present; otherwise download proceeds. `getChecksums` returns empty map on HTTP failure (`src/lib/versionManager/releaseChecker.ts:76-93`).
- Why it matters: Supply-chain / MITM on GitHub download path can install a replaced binary when `checksums.txt` is missing, unreadable, or omits the asset name. Embedded service binaries then run under ServiceSupervisor with host privileges.
- Suggested fix direction: Fail install if expected checksum is unavailable for the resolved asset. Optionally pin release digests in-repo as a secondary pin.

### F-06-005 — Request-side PII gating bypasses feature-flag resolver (DB overrides ignored)

- Severity: **P2**
- Category: bug | maintainability | Hard Rule 20 adjacent
- Evidence:
  - Request guardrail: `src/lib/guardrails/piiMasker.ts:12-15` uses `process.env.PII_REDACTION_ENABLED === "true"` only.
  - Shared sanitizer: `src/shared/utils/inputSanitizer.ts:112-117` same env-only read.
  - Response path correctly uses `isFeatureFlagEnabled("PII_RESPONSE_SANITIZATION")` in `src/lib/piiSanitizer.ts:18`.
  - Flag definitions default `"false"`: `src/shared/constants/featureFlagDefinitions.ts` (`PII_REDACTION_ENABLED`, `PII_RESPONSE_SANITIZATION`).
- Why it matters: Defaults remain off (Hard Rule 20 OK). But dashboard/DB feature-flag overrides for **request** redaction do nothing; only raw env works. Operators can believe redaction is on (DB UI) while payloads pass through. Asymmetric vs response path.
- Suggested fix direction: Route request checks through `isFeatureFlagEnabled("PII_REDACTION_ENABLED")` (+ mode via `resolveFeatureFlag`). Keep default false. Extend `tests/unit/pii-opt-in-default.test.ts` for DB override precedence.

### F-06-006 — Latent `pluginWorker` sandbox bugs (path escape + undefined `name`)

- Severity: **P2**
- Category: security | bug | dead-code
- Evidence:
  - Path join: `src/lib/plugins/pluginWorker.ts:109-120` — `resolve(pluginDir, p)` allows absolute `p` to escape `pluginDir` (Node `path.resolve` discards prior segments when given absolute path).
  - ReferenceError: `createSandbox(permissions, pluginDir)` at `55` references free identifier `name` at `135` (never a parameter); `loadPlugin` has `name` but does not pass it into `createSandbox`.
  - Module is not on production load path (see F-06-002) but is treated as security surface by `tests/unit/plugin-sandbox-permissions.test.ts`.
- Why it matters: If this worker is wired later (or used via ad-hoc tooling), file permissions are escapable and `exec` enablement throws `ReferenceError` instead of a clean deny/allow. Tests that only source-scan give false confidence.
- Suggested fix direction: Contain paths with `path.relative` + `..` rejection (same pattern as `skills/builtins.ts:66-80`). Pass `name` into `createSandbox`. Prefer deleting or marking worker experimental until production-wired.

### F-06-007 — Skill execution timeout does not cancel work; retries never run

- Severity: **P2**
- Category: bug | resource-leak
- Evidence: `src/lib/skills/executor.ts:14` `maxRetries` field; `34-35` setter; **never read** in `execute`. Timeout: `131-137` `Promise.race` rejects but does not abort the underlying handler promise (sandbox docker / network skills keep running).
- Why it matters: Timed-out skills continue consuming Docker/CPU/network; concurrent skill storms accumulate orphans. Config/schema advertise retries (`schemas.ts` maxRetries) that do not exist.
- Suggested fix direction: AbortController / `sandboxRunner.kill` on timeout; implement or remove `maxRetries`. Clear timeout timer on success to avoid handle leaks.

### F-06-008 — A2A surfaces raw `err.message` to clients and task artifacts

- Severity: **P2**
- Category: security | Hard Rule 12 gap
- Evidence: `src/lib/a2a/taskExecution.ts:56-58`; `src/lib/a2a/streaming.ts:140` (failure path). `scripts/check/check-error-helper.mjs` SCAN_DIRS are only `open-sse/executors`, `open-sse/handlers`, `open-sse/mcp-server` (+ API routes pattern) — **not** `src/lib/a2a`.
- Why it matters: Stack/path/internal DB errors can leak into A2A task artifacts and SSE failure metadata. Quality gate reports green while lib protocol surfaces violate error sanitization norms.
- Suggested fix direction: `sanitizeErrorMessage()` before `updateTask` / `createFailureEvent`. Expand check-error-helper to A2A (and other lib response builders) or add a sibling gate.

### F-06-009 — Memory “hit rate” UI metric is wired to an unused cache singleton

- Severity: **P2**
- Category: wiring | bug
- Evidence: API `src/app/api/memory/route.ts:4,55-68` reads `memoryCache.stats()` from `src/lib/memory/cache.ts`. Production store uses private `_memoryCache` in `src/lib/memory/store.ts:40,197-322` and never imports `memory/cache.ts`. Only unit tests call `memoryCache.get/set`.
- Why it matters: Dashboard hit rate / `cacheStats` always zero (or only unit-test noise), misrepresenting cache effectiveness and hiding real store-cache behavior.
- Suggested fix direction: Export stats from store’s real cache, or route store through `memoryCache`. Delete dead layer if unused.

### F-06-010 — Plugin signing helpers never invoked on install/activate

- Severity: **P2**
- Category: wiring | dead-code
- Evidence: `src/lib/plugins/signing.ts` exports `verifySha256` / `verifyEd25519`; grep shows **no** production callers under `src/lib/plugins` except the module itself. Manager integrity is optional SRI string in loader only (`loader.ts:82-99`).
- Why it matters: Marketplace/`verified` flags (`marketplace.ts` seed `verified: true`) and signing API suggest signed plugins; runtime does not verify Ed25519 packages. False sense of supply-chain control for third-party plugins.
- Suggested fix direction: Call signing verification on install when signature present; reject `verified` marketplace entries without valid signature; or stop advertising verification.

### F-06-011 — Eval regex strategy accepts untrusted patterns with only a length cap

- Severity: **P2**
- Category: security | perf
- Evidence: `src/lib/evals/evalRunner.ts:138-154` — `new RegExp(expectedValue)` for string patterns; only rejects `source.length > 512`. No `safe-regex` / linear-time guard. Custom suites come from DB (`getCustomEvalSuite`).
- Why it matters: Management-auth eval runs can still DoS the Node process via pathological regex against large LLM outputs (ReDoS). Hard rule docs prefer safe-regex for user-influenced patterns.
- Suggested fix direction: Validate with safe-regex (or RE2); cap input length under test; fail closed on unsafe patterns.

### F-06-012 — Installer `install(version)` lacks internal version validation (route-only guard)

- Severity: **P3**
- Category: security | maintainability
- Evidence: Pattern + comments in `src/lib/services/installers/utils.ts:77-107`; validation only in `src/app/api/services/_shared/installRoute.ts:16-21`. `ninerouter.ts:61-84` interpolates `` `${NINEROUTER_PACKAGE}@${version}` `` into npm argv; on win32 `runNpm` uses `shell: true` (`utils.ts:123-125`).
- Why it matters: Current HTTP path is protected. Any future CLI/MCP/internal caller of `install(userVersion)` reopens Windows shell metacharacter risk. Defense-in-depth comment claims version constrained “at the route boundary” only.
- Suggested fix direction: Assert `SERVICE_VERSION_PATTERN` at the start of `install()` / `runNpm` package-spec builders.

### F-06-013 — Cursor cloud agent `baseUrl` is fully attacker/operator-controlled without public-only guard

- Severity: **P3**
- Category: security
- Evidence: `src/lib/cloudAgent/agents/cursor.ts:49-50,80` — `credentials.baseUrl || default` used in `fetch`. Credentials stored via `saveCloudAgentCredential` (`credentials.ts:66-82`) without URL validation. Contrast marketplace SSRF guard in `plugins/marketplace.ts:30-58`.
- Why it matters: Management-authenticated operators can point API key traffic at internal IPs (SSRF from the OmniRoute host). Lower severity if strictly operator-local trust; still inconsistent with other outbound guards.
- Suggested fix direction: Reuse `parseAndValidateWebhookUrl` / `safeOutboundFetch({ guard: "public-only" })` for credential base URLs.

### F-06-014 — Hybrid skill executor is a non-functional stub still exported as runtime

- Severity: **P3**
- Category: dead-code | wiring
- Evidence: `src/lib/skills/hybrid.ts:52-57` returns placeholder `{ mode, result: {} }`; no imports outside docs (`docs/frameworks/SKILLS.md:191`). Real path is `skillExecutor` + builtins sandbox.
- Why it matters: Future wiring could ship empty skill results without failing closed. Dead surface area in “features” layer.
- Suggested fix direction: Delete, or mark `@internal experimental` and stop exporting a singleton until implemented.

### F-06-015 — `check-error-helper` / PR test-policy false-green edges for this slice

- Severity: **P3**
- Category: test-gap | false-green
- Evidence:
  - `scripts/check/check-error-helper.mjs:28-32` omits `src/lib/**` (see F-06-008).
  - `scripts/check/check-pr-test-policy.mjs:64-77` exits 0 with “Skipped” when `GITHUB_BASE_REF` unset — correct for local, but means local `npm run` cannot stand in for the CI gate (document residual risk).
  - `scripts/check/check-test-discovery.mjs` is strong; residual risk is baseline orphans, not a new hole found in this pass.
- Why it matters: Gate suite can be green while lib feature modules still leak errors or ship untested production paths.
- Suggested fix direction: Expand error-helper scan roots; optional local mode for pr-test-policy with `git merge-base`.

## Dead code / orphans

| Item | Evidence | Note |
|------|----------|------|
| `src/lib/plugins/pluginWorker.ts` | Not imported by manager; only source-scan tests | Capability sandbox not live (F-06-002/006) |
| `src/lib/plugins/signing.ts` | No callers | Signing never applied (F-06-010) |
| `src/lib/skills/hybrid.ts` | Stub methods | Documented incomplete (F-06-014) |
| `src/lib/memory/cache.ts` | Stats-only API use; store has separate map | Metric wiring bug (F-06-009) |
| `SkillExecutor.maxRetries` | Set, never used | F-06-007 |
| `cloudSync.stub.ts` | Present alongside `cloudSync.ts` | Confirm build profile only pulls real module (not fully re-audited) |

## Wiring smells

1. **Dual plugin isolation stories**: docs/tests describe `pluginWorker` permissions; production uses unrestricted child `import`.
2. **Dual memory caches**: API hit-rate vs store `_memoryCache`.
3. **PII flag resolution split**: request env-only vs response feature-flag helper.
4. **Integrity optional**: plugin SRI optional; CLIProxy checksum optional; plugin Ed25519 unused.
5. **Service version validation only at HTTP route** while shell:true install path is lower in the stack.

## Improvement opportunities

- Unify all outbound URL construction (webhooks, marketplace, cloud agents, cloud sync) on one public-only guard.
- Expand Hard Rule 12 static gate to `src/lib/a2a`, `src/lib/cloudAgent`, `src/lib/evals` response/error construction.
- Make sandbox env allowlist a shared helper used by skills sandbox + ACP spawn (`acp/manager.ts:59` also spreads `process.env` into CLI children — adjacent residual risk).
- Wire or delete hybrid executor and pluginWorker to end dual-codepath drift.
- Enforce checksum + signature as hard requirements for binary/plugin install.

## Residual risks / unrun checks

- Full `scripts/check` suite not executed in this pass (static adversarial read only).
- `bin/cli` surface is large; injection patterns sampled (plugin.mjs uses `spawnSync` shell:false; update.mjs uses fixed `execSync` string — acceptable). Deep every-command auth audit not complete.
- Electron tray / Windows-specific paths not runtime-tested.
- Fusion / dual-mode / frontend IA excluded by plan.
- Slice 05 data/auth surfaces deliberately not re-filed.

## Summary counts

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 4 |
| P2 | 7 |
| P3 | 4 |
| **Total findings** | **15** |

| Bucket | Count |
|--------|------:|
| security | 9 |
| wiring / dead-code | 6 |
| bug / resource | 3 |
| test-gap / false-green | 2 |

*(Findings may tag multiple categories; severity table is authoritative.)*

**Report path**: `docs/reports/06-lib-features-tooling.md`

---

# Wave 2 — Second-pass adversarial delta

**Date**: 2026-07-11  
**Reviewer**: code-quality-reviewer (Wave 2, agent slice 06)  
**Parent**: `agentID=reviewers`

## Method

1. Re-read full Wave 1 report; excluded slice-05 paths, task 0036/0017, fusion/dual-mode/frontend-IA contracts.
2. Adversarial pass over remaining high-risk surfaces not fully closed in Wave 1: `sync/bundle` + cloud outbound, idempotency, toolPolicy wiring, skill sandbox↔workspace, A2A task limits, ACP env inheritance, autoUpdate shell construction, webhooks HMAC optional, plugins sandbox labels, memory/qdrant, services/tunnels, bin CLI, scripts gates.
3. Confirmed production call sites with grep (not docs-only claims). New findings only — Wave 1 items not re-numbered.

## New findings (not in Wave 1)

### F-06-W2-001 — Cloud sync **outbound** POSTs OAuth tokens and plaintext API keys to `CLOUD_URL`

- Severity: **P1**
- Category: security
- Evidence:
  - `src/lib/sync/bundle.ts:65-89` — `sanitizeProviderConnectionForSync` **keeps** `accessToken`, `refreshToken`, `apiKey`, `idToken`, `providerSpecificData`.
  - `src/lib/sync/bundle.ts:112-130` — `sanitizeApiKeyForSync` **keeps** full `key`.
  - `src/lib/cloudSync.ts:95-108` — `syncToCloud` builds envelope via `buildConfigSyncEnvelope()` / `toLegacyCloudSyncPayload` and POSTs that body to `${CLOUD_URL}/sync/${machineId}` with **no** client-side HMAC on the request and no secret redaction gate analogous to inbound `OMNIROUTE_CLOUD_SYNC_SECRETS`.
- Why it matters: Wave 1 F-06-003 covered **unsigned inbound** metadata. Outbound still **exfiltrates live credentials** whenever cloud sync runs. Mis-set/`CLOUD_URL` MITM, or any cloud endpoint that logs bodies, captures OAuth refresh tokens and OmniRoute API keys. Inbound opt-out of secret overwrite does not stop the upload.
- Suggested fix direction: Default outbound payload to metadata-only (mirror inbound); require explicit `OMNIROUTE_CLOUD_SYNC_SECRETS=true` (or a dedicated upload flag) before including tokens/keys. Prefer signing requests with the shared secret. Never put raw `key`/`refreshToken` in legacy payload without operator opt-in.

### F-06-W2-002 — Idempotency cache is process-global and not scoped by API key; `X-Request-Id` is treated as an idempotency key

- Severity: **P1**
- Category: security | privacy | bug
- Evidence:
  - `src/lib/idempotencyLayer.ts:17-18,42-46,53-61,71-78` — single module-level `Map`; `getIdempotencyKey` returns `idempotency-key` **or** `x-request-id`; `checkIdempotency`/`saveIdempotency` key solely by that string.
  - Production use: `open-sse/handlers/chatCore/idempotency.ts:26-27` + `open-sse/handlers/chatCore.ts:3846` save translated completion bodies under that key with **no** `apiKeyId`/tenant prefix.
  - Tests encode the unscoped contract: `tests/unit/idempotency.test.ts:26-28` asserts `X-Request-Id` alone is a cache key.
- Why it matters: Within the ~5s window, Client B can receive Client A’s full chat completion if they share or guess the same `Idempotency-Key` / `X-Request-Id`. Using generic request-id headers (proxies, SDKs, load balancers) makes accidental collisions realistic on multi-tenant proxies — not only adversarial key reuse.
- Suggested fix direction: Namespace keys as `${apiKeyId}|${rawKey}` (or hash). Stop treating `X-Request-Id` as idempotent unless explicitly opted in. Prefer requiring dedicated `Idempotency-Key`. Add a cross-tenant collision regression test.

### F-06-W2-003 — Tool-calling policy is documented and flagged but never enforced on the request path

- Severity: **P2**
- Category: wiring | security | dead-code
- Evidence:
  - Implementation only: `src/lib/toolPolicy.ts` (`evaluateToolPolicy`, env `TOOL_POLICY_MODE` / `TOOL_ALLOWLIST` / `TOOL_DENYLIST`). **Zero** production imports outside that file (grep across `src/` + `open-sse/`).
  - Feature flag: `src/shared/constants/featureFlagDefinitions.ts:203-212` — `TOOL_POLICY_MODE` enum `disabled|warn|block` (different model than the module’s `allowlist|denylist|disabled`).
  - Docs claim enforcement: `docs/reference/ENVIRONMENT.md` (`TOOL_POLICY_MODE` → `src/lib/toolPolicy.ts`); `docs/reference/FEATURE_FLAGS.md` (`warn`/`block`).
- Why it matters: Operators enabling allowlist/block modes (env or dashboard flag) get **no** tool filtering. Prompt-injection / model-chosen dangerous tools proceed unchecked. Dual docs (env allowlist vs flag warn/block) show unfinished wiring.
- Suggested fix direction: Call `evaluateToolPolicy` (or a single canonical mode set) from chat/tool pipeline before upstream dispatch; align flag enum with implementation; add an integration test that block/allowlist denies a tool name.

### F-06-W2-004 — Skill Docker sandbox never mounts the host skill workspace (`file_*` vs `execute_*` disconnected)

- Severity: **P2**
- Category: bug | wiring
- Evidence:
  - Host workspace: `src/lib/skills/builtins.ts:62-83` — `file_read`/`file_write` under `DATA_DIR/skills/workspaces/<hash>/`.
  - Sandbox: `src/lib/skills/sandbox.ts:80-92` — only empty tmpfs `/workspace` + `/tmp`; **no** `-v` / `--mount` of the skill workspace; command is `image` + argv only.
  - Builtins invoke sandbox with no workspace path: `src/lib/skills/builtins.ts:420-468`.
- Why it matters: Agent workflows “write script → execute_command/execute_code” cannot see written files. Skills appear to share a workspace but code and files live on different filesystems. Silent functional failure, not a security isolation win that docs explain.
- Suggested fix direction: Bind-mount the resolved workspace read-only (or rw under policy) into `/workspace`, or document and fail closed when execute_* is used after file_* without mount support. Keep path-escape checks.

### F-06-W2-005 — A2A task manager claims a concurrent task limit but `createTask` is unbounded

- Severity: **P2**
- Category: bug | resource-leak | maintainability
- Evidence:
  - Docstring: `src/lib/a2a/taskManager.ts:11` — “Concurrent task limit”.
  - Implementation: `createTask` at `94-109` always inserts into `this.tasks` with **no** max active check; only TTL cleanup (`204-224`) and stream counters exist.
  - Call sites create without gating: `src/app/a2a/route.ts:151`, `208`.
- Why it matters: Authenticated (or open, depending on A2A auth config) clients can flood in-memory tasks until OOM; docs/operators may assume a limit exists. Complements Wave 1 F-06-008 (error leakage) with a DoS surface on the same stack.
- Suggested fix direction: Enforce `maxActiveTasks` (config/env) in `createTask`; reject with a structured JSON-RPC error; metrics for active count.

### F-06-W2-006 — ACP process spawner inherits full host `process.env` into CLI agent children

- Severity: **P2**
- Category: security
- Evidence: `src/lib/acp/manager.ts:57-60` — `spawn(binary, args, { env: { ...process.env, ...env }, shell: false })`. Wave 1 listed this only as residual under “Improvement opportunities”; not a numbered finding.
- Why it matters: ACP sessions run operator-selected binaries (`claude`/`codex`/…) with **JWT_SECRET**, DB paths, provider tokens, etc. in the child environment. A compromised or over-permissive CLI can read host secrets even without skill Docker. Distinct from F-06-001 (skill docker client env / container narrative).
- Suggested fix direction: Allowlist env for ACP children (PATH, HOME, TERM, optional API URL/key explicitly passed). Never spread full `process.env`.

### F-06-W2-007 — `buildNpmUpdateScript` interpolates `latest` unquoted into `sh -lc`

- Severity: **P3**
- Category: security | maintainability
- Evidence:
  - `src/lib/system/autoUpdate.ts:232-243` — `` npm install -g omniroute@${latest} `` (no `shellQuote`).
  - Same file quotes/shellQuotes git remote and compose paths (`252`, `291-295`) inconsistently.
  - `launchAutoUpdate` at `357` runs `spawn("sh", ["-lc", script], ...)`.
  - Call path: `src/app/api/system/version/route.ts:78-113` after `resolveLatestVersion()` (registry/GitHub/npm).
- Why it matters: Production POST path is admin-auth + `isNewer` (numeric segments). Residual risk is defense-in-depth if `launchAutoUpdate` is called with untrusted `latest`, or registry response shape changes. Sibling builders already know to `shellQuote`.
- Suggested fix direction: Assert strict semver/`SERVICE_VERSION`-style pattern inside `launchAutoUpdate`; always `shellQuote(latest)` / pin package argv without shell.

### F-06-W2-008 — Custom webhooks may deliver with no HMAC when `secret` is null/empty

- Severity: **P3**
- Category: security
- Evidence: `src/lib/webhookDispatcher.ts:90-92` — signature header only `if (secret)`; `193` passes `wh.secret` through. No require-secret on custom kind.
- Why it matters: Receivers cannot authenticate OmniRoute as the sender; any client that can reach the webhook URL can forge events. Lower severity if operators always set secrets; still a footgun vs Slack/Discord (URL-as-secret) and Telegram (bot token).
- Suggested fix direction: Reject enable of `kind=custom` without secret, or require `OMNIROUTE_WEBHOOK_REQUIRE_SECRET=1` default-on for new installs.

### F-06-W2-009 — `plugins/sandbox.ts` is labels-only (third isolation story)

- Severity: **P3**
- Category: dead-code | wiring
- Evidence: `src/lib/plugins/sandbox.ts:7-28` — `SandboxLevel` enum + labels only; no loader/manager import. Production remains child `import` (F-06-002) + unused `pluginWorker` (F-06-006).
- Why it matters: Expands dual-isolation confusion: docs/UI could grow another “sandbox level” control that does nothing.
- Suggested fix direction: Delete or wire into loader; single isolation model.

## Wave 1 items confirmed / strengthened (optional)

- **F-06-003** strengthened by **F-06-W2-001**: missing HMAC is worse because outbound already shipped secrets.
- **F-06-002** reinforced by **F-06-W2-009**: another unused isolation abstraction.
- **F-06-001** note: `docker run` does **not** pass spawn `env` into the container unless `-e` is used; host secrets still reach the **docker CLI process** via `sandbox.ts:95-97`. ACP (**W2-006**) is the clearer full-env child inheritance bug. Prefer fixing both with one allowlist helper.
- **F-06-008** still open; A2A route also logs `console.error("A2A ERROR TRACE:", err)` (`src/app/a2a/route.ts:184`) — ops log noise / potential secret in message, secondary.

## Residual risk

- Full `scripts/check` suite and runtime tunnel/binary install paths not executed this pass.
- `bin/cli` surface sampled (plugin install uses `spawnSync` shell:false; update uses `execFile`) — not every setup-* command re-audited.
- Idempotency lives under slice-06 `src/lib` but is exercised from open-sse chatCore (cross-slice); fix needs coordinated handler change.
- Fusion / dual-mode / frontend-IA / slice-05 exclusions honored.

## Wave 2 summary counts (new only)

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 2 |
| P2 | 4 |
| P3 | 3 |
| **New findings** | **9** |

| Bucket (new) | Count |
|--------------|------:|
| security | 6 |
| wiring / dead-code | 3 |
| bug / resource | 2 |

*(Multi-tag findings counted once in severity total.)*
