# Slice 02: open-sse executors + config — Adversarial Review (Wave 1)

**Date**: 2026-07-11  
**Reviewer**: adversarial code-quality reviewer (`agentID=reviewers` Wave 1)  
**Scope paths**: `open-sse/executors/`, `open-sse/config/`  
**Mode**: residual bug/security/wiring hunt (not task-lane drain)

## Scope

- `open-sse/executors/` — BaseExecutor/DefaultExecutor, specialized provider executors, factory (`index.ts`), helper fetch modules
- `open-sse/config/` — `providerRegistry`, modular `providers/registry/*`, constants, credentialLoader, header/model registries, error/cooldown config

## Exclusions honored

| Item | Status |
|------|--------|
| Task **0036** dual-mode deploy / :21000 | Not investigated |
| Task **0017** fusion docs/i18n | Not investigated |
| Dual-mode auth 0032–35, 37–39 acceptance criteria | Not re-opened |
| Fusion epic 0010–18 acceptance criteria | Not re-opened |

Incidental residual bugs in adjacent files are OK only when clearly outside those contracts; none of the findings below depend on dual-mode auth or fusion contracts.

## Method

1. Read `BaseExecutor` / `DefaultExecutor` execute path: timeout, retry, headers, body transform, abort merge.
2. Sample specialized executors (vertex, qwen path via default, github, kiro, web executors, ninerouter, pollinations, puter, cloudflare, azure).
3. Check `resolvePublicCred` / literal secret patterns under `open-sse/config/`.
4. Compare registry SoT (`providers/registry`, `executor` field, `urlBuilder`) vs runtime `getExecutor` / `DefaultExecutor.buildUrl`.
5. Error sanitization (hard rule #12) on executor failure and mid-stream paths.
6. Dead code / unused defensive paths / test gaps (evidence path:line only).

## Findings (severity-ordered)

### F-02-001 — DefaultExecutor ignores chatPath sanitization (production path)

- Severity: **P1**
- Category: security / bug
- Evidence:
  - `open-sse/executors/base.ts:74-80` — `sanitizePath()` rejects `..`, null bytes, non-`/` starts
  - `open-sse/executors/base.ts:518-519` — BaseExecutor applies `sanitizePath` for `openai-compatible-*`
  - `open-sse/executors/default.ts:184-206` — DefaultExecutor concatenates raw `psd.chatPath` with **no** sanitization for both `openai-compatible-*` and `anthropic-compatible-*`
  - `open-sse/executors/index.ts:161-164` — unknown / compatible providers use `new DefaultExecutor(provider)`, not bare `BaseExecutor`
  - `tests/unit/executor-default-base.test.ts:39-63` — only **BaseExecutor** is tested for path rejection; DefaultExecutor tests (`:145-205`) only cover happy-path custom paths
- Why it matters: The live factory always returns `DefaultExecutor` for `openai-compatible-*` / most registry defaults. Defense-in-depth in BaseExecutor is **dead on the hot path**. A connection with `chatPath` containing `..`, null bytes, or non-rooted values can reshape the upstream URL (path traversal relative to base URL, weird fetch targets). Operator-configured, but multi-tenant/admin import and defense-in-depth policy both expect the BaseExecutor rules to hold.
- Suggested fix direction: Extract shared `resolveCompatibleChatPath(psd)` used by both Base and Default; reject invalid paths the same way. Add DefaultExecutor regression tests mirroring `BaseExecutor: openai-compatible buildUrl sanitizes custom chat paths`.

### F-02-002 — Vertex Express API keys embedded in URL are logged in full

- Severity: **P1**
- Category: security
- Evidence:
  - `open-sse/executors/vertex.ts:169-176` — Express mode builds `...?key=${expressKey}` (also partner OpenAPI path)
  - `open-sse/executors/vertexMedia.ts:96` — same `?key=` pattern
  - `open-sse/executors/base.ts:919-920`, `1461`, `1470`, `1474` — timeout/retry/auth logs interpolate full `url` / `requestUrl`
  - `open-sse/handlers/chatCore.ts:2708` + `2721` — `providerUrl = result.url` then `reqLogger.logTargetRequest(providerUrl, ...)`
  - `open-sse/utils/requestLogger.ts:345-350` — logs `url` as-is; headers are masked, **query is not**
- Why it matters: Express API keys are long-lived secrets. They appear in executor debug/warn logs, TIMEOUT messages, and the detailed request pipeline logger whenever Vertex Express is used. Log aggregation / support dumps become credential leaks.
- Suggested fix direction: Prefer header auth where Google accepts it; if query `key` is mandatory, return a redacted URL for logging (`?key=***`) and keep the real URL only for `fetch`. Centralize `redactUrlSecrets(url)` used by BaseExecutor + requestLogger.

### F-02-003 — Qwen `resourceUrl` interpolated into URL without host allowlist

- Severity: **P1**
- Category: security / bug
- Evidence:
  - `open-sse/executors/default.ts:308-310` — `` `https://${resourceUrl || "portal.qwen.ai"}/v1/chat/completions` ``
  - `open-sse/services/tokenRefresh.ts:1054-1056` — OAuth refresh stores `tokens.resource_url` into `providerSpecificData.resourceUrl` with **no** validation (adjacent service write; executor is the fetch consumer)
  - `open-sse/config/providers/registry/qwen/index.ts:9` — registry `baseUrl` is `https://chat.qwen.ai/api/v1/services/aigc/text-generation/generation` (completely different host/path than executor)
  - `tests/unit/executor-default-base.test.ts:92-97` — happy-path accepts arbitrary `custom.qwen.ai`
- Why it matters: Any string in `resourceUrl` becomes the fetch host while the Qwen OAuth **Bearer** is attached (`DefaultExecutor` default/auth paths). Unvalidated values enable:
  - credential exfiltration to attacker-controlled hosts
  - SSRF to link-local/metadata (`169.254.169.254`) or internal networks
  - host/path smuggling via unparsed authority (`evil.com@…` style values)
  Token-refresh-supplied `resource_url` is not operator-intent; it is upstream-controlled data.
- Suggested fix direction: Parse with `new URL()`, require `https:`, allowlist host suffixes (`qwen.ai`, `aliyuncs.com`, documented regional hosts), reject IP literals / private ranges. Align registry `baseUrl` with the executor’s real chat endpoint or drive URL from one SoT.

### F-02-004 — Mid-stream client content embeds raw `err.message` (hard rule #12)

- Severity: **P1**
- Category: security / bug
- Evidence:
  - `open-sse/executors/chatgpt-web.ts:2051` — delta content `` `[Stream error: ${err.message}]` ``
  - `open-sse/executors/perplexity-web.ts:715` — same pattern
  - `open-sse/executors/grok-web.ts:1505` — same pattern
  - Contrast: `open-sse/executors/firecrawl-fetch.ts:140`, `tavily-fetch.ts:97`, `trae.ts:225-230` correctly route through `sanitizeErrorMessage` / `buildErrorBody`
  - `open-sse/executors/devin-cli.ts:168-173` — spawn failures emit raw `err.message` into SSE JSON error
- Why it matters: Hard rule #12 / `docs/security/ERROR_SANITIZATION.md` require `buildErrorBody` / `sanitizeErrorMessage`. Stream-content embedding bypasses the error-body path and can leak host paths, stack fragments, or internal proxy details to API clients mid-generation.
- Suggested fix direction: Always `sanitizeErrorMessage(...)` before enqueueing stream error text; prefer structured SSE error events (`writeStreamError`) over free-text content deltas for failures.

### F-02-005 — Fetch start-timeout rarely classified as `TimeoutError`

- Severity: **P1**
- Category: bug
- Evidence:
  - `open-sse/executors/base.ts:918-923` — sets `timeoutError.name = "TimeoutError"` then `timeoutController.abort(timeoutError)`
  - `open-sse/executors/base.ts:1481-1485` — only logs TIMEOUT when `err.name === "TimeoutError"`
  - Node/undici `fetch` rejects aborted requests as `AbortError` (`DOMException`); the abort *reason* is not reliably the thrown error’s `name`
  - Antigravity uses an explicit custom error class (`open-sse/executors/antigravity.ts:232-239`) and separate classification — BaseExecutor does not
  - Tests mock `signal.reason` rejection (`tests/unit/executor-antigravity.test.ts:787-808`) rather than proving native fetch classification
- Why it matters: Upstream start timeouts look like generic aborts. Downstream chatCore/resilience may mis-classify as client cancel vs 504 gateway timeout, skewing fallback/cooldown metrics and operator debug.
- Suggested fix direction: After catch, also inspect `error.cause`, `signal.reason`, and message prefix `Fetch timeout after`; set a stable `code` (like Antigravity’s `ANTIGRAVITY_PRE_RESPONSE_TIMEOUT_CODE`). Add a unit test that stubs global `fetch` to hang until abort and asserts TIMEOUT classification.

### F-02-006 — `credentialLoader` uses bare `require` in an ESM package

- Severity: **P2**
- Category: bug / wiring
- Evidence:
  - `open-sse/config/credentialLoader.ts:47-54` — `require("@/lib/dataPaths")` inside try/catch
  - Package is ESM (`"type": "module"`); bare `require` is typically `ReferenceError` → always fallback to `process.env.DATA_DIR || join(process.cwd(), "data")`
  - Comment at lines 5–7 claims merge over defaults from data dir; fallback may miss the real `resolveDataDir()` location (`~/.omniroute/` etc.)
- Why it matters: Operator `provider-credentials.json` overrides can silently fail to load from the canonical data directory; production may run with embedded defaults only.
- Suggested fix direction: Use `createRequire(import.meta.url)` or static ESM import of `resolveDataDir`; add a unit test that mocks the file under the resolved data dir.

### F-02-007 — Dual source of truth: registry `executor` / `urlBuilder` vs hard-coded factory + DefaultExecutor

- Severity: **P2**
- Category: wiring / maintainability
- Evidence:
  - `open-sse/config/providers/shared.ts:96` / registry entries set `executor: "…"` (e.g. `command-code`, `cursor`, `bedrock`)
  - `open-sse/executors/index.ts:58-157` — hard-coded map; **ignores** `RegistryEntry.executor`
  - `open-sse/config/providers/registry/gemini/index.ts:10-13` — `urlBuilder` encodes Gemini paths
  - `open-sse/executors/default.ts:306-307` — reimplements Gemini URL inline; **never** calls `entry.urlBuilder` (grep: no `urlBuilder` under `executors/`)
  - `open-sse/services/provider.ts:279-293` — *does* honor `urlBuilder` for a parallel URL helper used outside DefaultExecutor
  - Qwen registry vs executor mismatch: `registry/qwen/index.ts:9` vs `default.ts:308-310`
- Why it matters: Editing registry `urlBuilder` / `executor` can create a false sense of shipping behavior. Chat path and helper path can diverge; dead metadata drifts without CI enforcement.
- Suggested fix direction: Either (a) drive `getExecutor` + URL construction from registry fields with a CI drift check, or (b) delete unused `urlBuilder`/`executor` fields and document that `index.ts` + `DefaultExecutor` are the SoT. Add `npm run check:…` comparing specialized executor keys to registry.

### F-02-008 — `isLocalProvider` incomplete and comment contradicts code

- Severity: **P2**
- Category: bug / maintainability
- Evidence:
  - `open-sse/config/providerRegistry.ts:109-135` — local set is `localhost`, `127.0.0.1`, optional `LOCAL_HOSTNAMES`, plus `172.16–31.*` only
  - Comment `:131` claims “explicitly blocking ::1 per SSRF hardening” but the function is **positive detection** for local backends; `::1`, `10.0.0.0/8`, `192.168.0.0/16`, and other `127.*` addresses are **not** treated as local
- Why it matters: Self-hosted models on `10.x` / `192.168.x` / IPv6 loopback get long “remote” 404 cooldowns (`errorConfig` / lockout paths that key off this helper), degrading local UX. Misleading SSRF comment risks future “hardening” that breaks operators or invents false safety.
- Suggested fix direction: Expand private-range detection for cooldown classification (or rename helper to `isLikelyLocalInferenceHost`); fix comment. Keep true SSRF policy (if any) separate and explicit.

### F-02-009 — BaseExecutor multi-URL fallback only retries HTTP 429 (not 5xx)

- Severity: **P2**
- Category: bug / resilience
- Evidence:
  - `open-sse/executors/base.ts:641-642` — `shouldRetry` is **only** `status === RATE_LIMITED`
  - `open-sse/executors/base.ts:1473-1477` — non-429 errors return immediately even when `baseUrls` has more entries
  - Catch path (`1487-1489`) does fall through to next URL on **network** errors
  - Multi-URL configs: antigravity/agy, chipotle, pollinations, theoldllm (`config/providers/registry/**`)
  - Antigravity overrides execute heavily; other multi-URL Default/Base users inherit this behavior
- Why it matters: A 502/503 on the primary base URL does not rotate to the secondary URL; only 429 and throw-path network failures do. Documented multi-URL resilience is weaker than operators expect for outage failover.
- Suggested fix direction: Expand `shouldRetry` to include 408/500/502/503/504 (aligned with provider breaker codes in CLAUDE.md), or document intentional 429-only fallback. Cover with unit tests on a 2-URL TestExecutor.

### F-02-010 — Pollinations `transformRequest` mutates the caller body in place

- Severity: **P2**
- Category: bug
- Evidence:
  - `open-sse/executors/pollinations.ts:37-49` — assigns `body.model`, `body.stream`, `body.jsonMode` on the incoming object
  - Contrast: `BaseExecutor.transformRequest` (`base.ts:601-635`) shallow-clones before mutation
- Why it matters: Shared request objects used for logging, cache keys, retries, or client echo can observe executor-side mutations (`jsonMode`, forced model), causing log pollution or subtle double-transform bugs on fallback.
- Suggested fix direction: Clone before mutate: `const next = { ...body }; …; return next`.

### F-02-011 — Silent `PROVIDERS.openai` config fallback for unknown provider IDs

- Severity: **P2**
- Category: wiring / bug
- Evidence:
  - `open-sse/executors/default.ts:172` — `super(provider, PROVIDERS[provider] || PROVIDERS.openai)`
  - `open-sse/executors/default.ts:284-292` — local providers needed an explicit guard after this fallback silently pointed llama-cpp etc. at OpenAI (`#3197` comment)
  - `open-sse/executors/index.ts:161-164` — any string creates a cached DefaultExecutor
- Why it matters: Typos / desynced dashboard IDs not in `PROVIDERS` still construct an executor that inherits OpenAI base URL/headers until other branches compensate. Residual risk for new providers that forget registry entries.
- Suggested fix direction: Fail closed when `!PROVIDERS[provider] && !isCompatiblePrefix(provider) && !LOCAL_PROVIDERS[provider]`; log a hard error. Keep openai fallback only for true compatible prefixes if needed.

### F-02-012 — Test gap: path sanitization and timeout classification not covered on production types

- Severity: **P2**
- Category: test-gap
- Evidence:
  - Path sanitize tests target BaseExecutor only (`tests/unit/executor-default-base.test.ts:39-63`)
  - No DefaultExecutor negative tests for `chatPath: "../evil"` or null bytes
  - Timeout classification tests rely on mocked reason propagation, not BaseExecutor + real abort semantics
  - No test that Vertex Express URLs are redacted in `logTargetRequest`
- Why it matters: The gaps allowed F-02-001 and F-02-005 to survive. Tests currently green do not prove the contracts operators believe exist.
- Suggested fix direction: Add the three regression tests above to the existing executor unit files; wire into `npm run test:unit`.

### F-02-013 — `RegistryEntry.urlBuilder` for Gemini unused by chat executors (stale config)

- Severity: **P3**
- Category: dead-code / wiring
- Evidence:
  - `open-sse/config/providers/registry/gemini/index.ts:10-13` defines `urlBuilder`
  - Executors never reference `urlBuilder` (repo grep under `open-sse/executors` = 0)
  - Runtime Gemini URL is hard-coded in `default.ts:306-307` without `encodeURIComponent(model)` (Azure does encode: `azure-openai.ts:35`)
- Why it matters: Dead config invites drift; unencoded model segments can break on unusual model IDs.
- Suggested fix direction: Call registry `urlBuilder` from DefaultExecutor or remove field; encode model path segments.

### F-02-014 — Specialized executor map vs thin wrappers / export surface clutter

- Severity: **P3**
- Category: dead-code / maintainability
- Evidence:
  - `open-sse/executors/index.ts:97-98` — map uses `ClaudeWebWithAutoRefresh`, not bare `ClaudeWebExecutor`
  - `index.ts:113-114` — map uses `DeepSeekWebWithAutoRefreshExecutor`
  - Bare classes still re-exported (`index.ts:206-208`) for tests/wrappers — fine, but easy to wire the wrong class elsewhere
  - Helper modules `firecrawl-fetch.ts`, `jina-reader-fetch.ts`, `tavily-fetch.ts`, `kie.ts` are intentionally not in the chat map (used by handlers) — not dead
- Why it matters: Future wiring mistakes (import bare executor without auto-refresh) silently lose CF / refresh behavior.
- Suggested fix direction: Prefer factory helpers only; mark base classes as `@internal` or stop re-exporting bare classes from the public index.

### F-02-015 — Bedrock executor `@ts-nocheck`

- Severity: **P3**
- Category: maintainability
- Evidence: `open-sse/executors/bedrock.ts:1` — `// @ts-nocheck`
- Why it matters: Type holes hide credential/shape bugs in a high-sensitivity AWS path.
- Suggested fix direction: Gradually type Converse payloads and remove nocheck.

## Dead code / orphans

| Item | Notes |
|------|--------|
| `BaseExecutor` openai-compatible `sanitizePath` path | Live only if something constructs BaseExecutor directly; production `getExecutor` uses DefaultExecutor (**F-02-001**) |
| Registry `urlBuilder` on Gemini/Vertex/Antigravity (for executor path) | Used by `services/provider.ts`, not by executors (**F-02-007 / F-02-013**) |
| Registry `executor` string | Documentation-only relative to `getExecutor` map |
| Chat helper executors (`kie`, firecrawl/jina/tavily fetch) | Not orphans — wired from media/web-fetch handlers |

No unused top-level chat executor files found that are completely unreferenced; specialized helpers are imported outside `index.ts` map intentionally.

## Wiring smells

1. **Factory hard-codes instances** at module load (`index.ts:58-157`) — no registry-driven construction; aliases duplicated (`cu`/`cursor`, `pol`/`pollinations`, …).
2. **DefaultExecutor vs BaseExecutor** duplicate header/URL logic (rotation, UA env, openai-compatible) — drift already observed on `sanitizePath`.
3. **Qwen** OAuth headers/baseUrl in registry vs portal.qwen.ai chat completions in DefaultExecutor.
4. **credentialLoader** + `loadProviderCredentials(PROVIDERS)` at constants import time — fails open to defaults (**F-02-006**).
5. **publicCreds**: config registry OAuth defaults correctly use `resolvePublicCred(...)` (e.g. antigravity/agy/claude/gemini/qwen); no raw `AIza`/`GOCSPX` literals found under `open-sse/config/` in this pass.

## Improvement opportunities

1. Single `buildCompatibleProviderUrl(credentials, defaults)` shared by Base/Default.
2. URL redaction utility for all `?key=` / token query patterns before any log.
3. CI drift gate: specialized executor keys ⊆ registry ids + aliases; every `executor: "X"` either exists in map or is `"default"`.
4. Expand `shouldRetry` policy documentation + tests for multi-`baseUrls` providers.
5. Prefer `makeExecutorErrorResult` / `buildErrorBody` as the **only** executor error return path (ban raw `new Response(JSON.stringify({ error: { message: err.message }}})` via lint).
6. Remove `@ts-nocheck` from bedrock; type AWS command inputs.

## Residual risks / unrun checks

- Did not exhaust every web-cookie executor (50+ files); sampled highest-risk URL/auth/stream paths.
- Did not run full `npm run test:unit` suite in this review pass (evidence is static + targeted test file inspection).
- Provider catalog count drift vs `src/shared/constants/providers/**` not fully enumerated line-by-line; dual-SoT issue is established via structural evidence (**F-02-007**).
- MITM/SSRF policy for operator-chosen `baseUrl` on openai-compatible nodes is product-intent for self-hosted; not filed as a defect beyond unvalidated Qwen `resourceUrl` (**F-02-003**).

## Summary counts

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 5 |
| P2 | 7 |
| P3 | 3 |
| **Total findings** | **15** |

| Category | Count |
|----------|------:|
| security | 4 |
| bug | 6 |
| wiring | 2 |
| test-gap | 1 |
| dead-code / maintainability | 2 |

**Top remediation order**: F-02-001 → F-02-002 → F-02-003 → F-02-004 → F-02-005, then P2 wiring/resilience.

**Verdict for orchestrator**: **NEEDS FIX** (multiple P1 security/correctness issues with path:line evidence; not blocked on excluded fusion/dual-mode work).

---
# Wave 2 — Second-pass adversarial delta

**Date**: 2026-07-11  
**Reviewer**: independent adversarial second-pass (`agentID=reviewers` Wave 2)  
**Scope paths**: `open-sse/executors/`, `open-sse/config/`  
**Exclusions**: Task 0036 dual-mode deploy; Task 0017 fusion docs/i18n; dual-mode auth 0032–39 and fusion epic acceptance criteria not re-opened.

## Method

1. Read Wave 1 report end-to-end; treat F-02-001…015 as already tracked (do not re-file).
2. Adversarial pass on singleton executor state, specialized timeout wiring, client error response paths beyond Wave 1 mid-stream list, `errorConfig` classification, Vertex credential mutation, mimocode/opencode rotation, and config helpers (`getModelTargetFormat`).
3. Evidence is path:line only; no full test suite re-run in this pass.

## New findings (not in Wave 1)

### F-02-W2-001 — OpencodeExecutor singleton races on `_requestFormat` under concurrency

- Severity: **P1**
- Category: bug
- Evidence:
  - `open-sse/executors/index.ts:83-85` — `opencode-zen` / `opencode-go` / `opencode` map to **module-singleton** `OpencodeExecutor` instances
  - `open-sse/executors/opencode.ts:46` — instance field `_requestFormat: string | null = null`
  - `open-sse/executors/opencode.ts:139` — `execute()` sets `this._requestFormat = getModelTargetFormat(this.provider, input.model) || "openai"`
  - `open-sse/executors/opencode.ts:189-191` — `finally { this._requestFormat = null }`
  - `open-sse/executors/opencode.ts:204-212` — `buildUrl()` switches `/messages` vs `/chat/completions` vs Gemini paths off `this._requestFormat`
  - `open-sse/executors/opencode.ts:226-234` — `buildHeaders()` chooses `x-api-key` vs Bearer from the same field
  - Registry models with `targetFormat: "claude"` (e.g. `open-sse/config/providers/registry/opencode/zen/index.ts:84-85`, `opencode/go/index.ts:34-49`)
- Why it matters: Concurrent requests on the same process share one executor. Request A (claude-format model) and request B (openai-format model) interleave: B overwrites `_requestFormat`, A’s nested `super.execute` → `buildUrl`/`buildHeaders` can hit the wrong endpoint/auth shape; `finally` on the first finisher can null the field while the other is still fetching. Manifests as intermittent 401/404/wrong-body failures under load — not covered by Wave 1 dual-SoT findings.
- Suggested fix direction: Compute format as a **local** in `execute` and pass through `buildUrl`/`buildHeaders` (AsyncLocalStorage or explicit args). Never store per-request format on the singleton. Add a concurrency unit test that overlaps claude-target + openai-target models.

### F-02-W2-002 — Specialized executors treat `FETCH_TIMEOUT_MS` as full-request abort (not start-only)

- Severity: **P1**
- Category: bug
- Evidence:
  - `open-sse/config/constants.ts:9-11` — documents FETCH timeout as **initial upstream response** only; stream idle handled separately
  - `open-sse/executors/base.ts:912-939` — start-timeout cleared in `finally` after `fetch` **returns headers**; body/stream not aborted by that timer
  - Contrast (signal lives for body lifetime):
    - `open-sse/executors/ninerouter.ts:171-186` — `AbortSignal.timeout(FETCH_TIMEOUT_MS)` merged into fetch signal; response returned with that signal still active on the body
    - `open-sse/executors/cliproxyapi.ts:402-423` — same pattern
    - `open-sse/executors/blackbox-web.ts:500-509` — same
    - `open-sse/executors/huggingchat.ts:405` (and similar gitlab/muse-spark paths)
- Why it matters: Operators who lower `REQUEST_TIMEOUT_MS` / fetch timeout to get faster **start** failover (matching BaseExecutor semantics) silently cap **total stream duration** on specialized paths. Long Claude/tool streams via 9router, CLIProxyAPI, blackbox-web, etc. abort mid-generation. Wave 1 F-02-005 covered TimeoutError *classification* on BaseExecutor, not this semantic mismatch.
- Suggested fix direction: Share BaseExecutor’s start-only timeout helper; leave stream life to `STREAM_IDLE_TIMEOUT_MS` / readiness. Regression: mock slow-first-byte vs long stream; assert only the former aborts specialized executors.

### F-02-W2-003 — Client JSON error bodies still embed raw `err.message` (HTTP path; beyond Wave 1 stream list)

- Severity: **P1**
- Category: security
- Evidence (client-facing `Response` JSON — not mid-stream content deltas already filed as F-02-004):
  - `open-sse/executors/bedrock.ts:468-484` — `errorBody()` uses raw `error.message` with **no** `sanitizeErrorMessage`
  - `open-sse/executors/bedrock.ts:702` — catch returns `JSON.stringify(errorBody(error))` to clients
  - `open-sse/executors/bedrock.ts:523-524` — stream exception path also emits raw `exception.message`
  - `open-sse/executors/copilot-web.ts:674-677`, `710-713` — `new Response(JSON.stringify({ error: { message: msg } }))` with unsanitized `err.message`
  - `open-sse/executors/blackbox-web.ts:512-518` — `` `Blackbox Web connection failed: ${message}` `` unsanitized
  - `open-sse/executors/huggingchat.ts:463-469`, `500-506` — same pattern
  - `open-sse/executors/mimocode.ts:521-528` — executor error JSON embeds raw `msg`
  - Contrast: `open-sse/utils/error.ts:451-461` `makeExecutorErrorResult` always sanitizes; `trae.ts:225-230` / `cursor.ts:1187-1191` sanitize correctly
- Why it matters: Hard rule #12 / `docs/security/ERROR_SANITIZATION.md`. Wave 1 F-02-004 focused on mid-stream content and called out chatgpt/perplexity/grok/devin; the non-stream HTTP error path on Bedrock and several web executors was missed and still leaks SDK/AWS/path noise to API clients.
- Suggested fix direction: Route every executor error Response through `buildErrorBody` / `sanitizeErrorMessage` (or `makeExecutorErrorResult`). Lint/ban raw `error: { message: err.message }`.

### F-02-W2-004 — Vertex `execute` mutates shared `credentials` in place

- Severity: **P2**
- Category: bug
- Evidence:
  - `open-sse/executors/vertex.ts:148-156` — `credentials.apiKey = credentials.apiKey.trim()` and `credentials.accessToken = await getAccessToken(sa)` mutate the input object
  - `open-sse/executors/index.ts:88-89` — Vertex executor is a process singleton; concurrent calls may share credential object graphs from the auth layer
  - `open-sse/executors/default.ts:365-368` — similar mutation of `credentials.providerSpecificData.selectedKeyId` during key rotation (same class of shared-state hazard)
- Why it matters: In-place `accessToken` injection on a shared credentials object races with concurrent requests / persistence callbacks; trimming/overwriting can surprise refresh/persist paths. Prefer immutable clone: `const active = { ...credentials, accessToken }`.
- Suggested fix direction: Never write through `input.credentials`; clone before token mint / key selection; cover with concurrent Vertex SA execute test if practical.

### F-02-W2-005 — `ERROR_RULES` bare HTTP 403 labeled `quota_exhausted` with `cooldownMs: 0`

- Severity: **P2**
- Category: bug / resilience
- Evidence:
  - `open-sse/config/errorConfig.ts:153-155` — `status_401` auth_error cooldown 0; `status_402` quota_exhausted; **`status_403` → reason `"quota_exhausted"`, `cooldownMs: 0`**
  - Consumer: `open-sse/services/accountFallback.ts:1535-1563` — `findMatchingErrorRule` / `matchErrorRuleByStatus` drives fallback reason when text does not match first
  - Contradictory path: `open-sse/services/accountFallback.ts:1191-1192` — `classifyError` maps bare 403 → `AUTH_ERROR`
  - Also: `open-sse/services/accountFallback.ts:682-685` — `classifyLockoutReason(403) === "quota_exhausted"`
  - Product guidance (CLAUDE.md resilience): generic API-key 403 should not be treated as terminal whole-provider quota without body classification
- Why it matters: Dual classifiers disagree on the same status. Bare 403 can be tagged as **quota** with **zero** connection cooldown (rapid fallback thrash + wrong operator metrics) while another path treats it as auth. Wave 1 did not audit `errorConfig` status rules.
- Suggested fix direction: Align 403 default with auth/permission unless body/provider rules say quota; give non-zero cooldown or explicit terminal detection; single SoT for status→reason.

### F-02-W2-006 — Opencode / Mimocode singleton account-rotation state is process-global and racy

- Severity: **P2**
- Category: bug
- Evidence:
  - `open-sse/executors/opencode.ts:54-57`, `105-116`, `152-180` — `accounts`, `nextAccountIdx`, `markCooldown` on instance used as singleton (`index.ts:83-85`)
  - `open-sse/executors/opencode.ts:69-97` — `syncAccountsFromCredentials` rebuilds `this.accounts` per request (can clobber sibling request’s cooldown bookkeeping mid-flight)
  - `open-sse/executors/mimocode.ts:207-208`, `326-347`, `456-504` — same singleton rotation + cooldown pattern (`index.ts:149-150`)
- Why it matters: Concurrent requests interleave RR index and cooldowns: double-pick same proxy account, skip healthy accounts, or lose cooldown after another request’s sync. Not dual-mode/fusion scope.
- Suggested fix direction: Key rotation state by `connectionId` in a module-level map with atomic pick; or AsyncLocalStorage per request for index while persisting cooldowns under connection id.

### F-02-W2-007 — Mimocode `isAccountReady` conflates cooldown with JWT validity (re-bootstrap + soft cooldown bypass)

- Severity: **P2**
- Category: bug
- Evidence:
  - `open-sse/executors/mimocode.ts:108-112` — `isAccountReady` returns false if **either** cooling down **or** JWT missing/expiring
  - `open-sse/executors/mimocode.ts:318-323` — `getJwtForAccount`: if `!isAccountReady` → always `bootstrapJwt` (even when JWT is still valid and only cooldown failed)
  - `open-sse/executors/mimocode.ts:326-337` — if all accounts fail `isAccountReady`, fallback still returns a cooling account
  - `open-sse/executors/mimocode.ts:456-504` — execute loop uses that path after 429 cooldown
- Why it matters: After 429, next attempt on a still-cooling account re-hits bootstrap (extra upstream auth traffic) and still serves traffic despite cooldown intent. Distinct from F-02-W2-006 race (logic bug even single-threaded).
- Suggested fix direction: Split predicates: `hasValidJwt` vs `isNotCoolingDown`. `getJwtForAccount` only bootstraps when JWT missing/expiring. `pickAccount` should skip cooling accounts and only fall back with an explicit “all cooling” policy.

### F-02-W2-008 — `getModelTargetFormat` does not resolve provider id → alias

- Severity: **P2**
- Category: wiring / bug
- Evidence:
  - `open-sse/config/providerModels.ts:10-18` — `getProviderModels` resolves via `PROVIDER_ID_TO_ALIAS`
  - `open-sse/config/providerModels.ts:50-55` — `getModelTargetFormat(aliasOrId, modelId)` indexes `PROVIDER_MODELS[aliasOrId]` **directly** (no alias map)
  - `open-sse/config/providerModels.ts:57-61` — `getModelStripTypes` same gap
  - `open-sse/config/providerRegistry.ts:82-94` — models keyed by `entry.alias || entry.id` (e.g. github → `"gh"`)
  - Call sites that pass raw provider id: `open-sse/executors/opencode.ts:139` (ok while alias===id); `open-sse/translator/helpers/claudeHelper.ts:252-253` (`getModelTargetFormat(provider, model)`); GitHub executor hardcodes `"gh"` (`github.ts:43`) proving callers must know the quirk
  - Safe path: `open-sse/handlers/chatCore/targetFormat.ts:25-26` resolves alias first
- Why it matters: Any caller that passes `provider` id when `alias !== id` silently gets `null` targetFormat (wrong transport/thinking path). Wave 1 dual-SoT covered registry `executor`/`urlBuilder`; this is a separate config helper footgun.
- Suggested fix direction: Make `getModelTargetFormat` / `getModelStripTypes` use the same alias resolution as `getProviderModels`; add unit test `getModelTargetFormat("github", "gpt-5.3-codex") === "openai-responses"`.

### F-02-W2-009 — Cloudflare `accountId` interpolated into URL path without encoding/validation

- Severity: **P3**
- Category: security / maintainability
- Evidence:
  - `open-sse/executors/cloudflare-ai.ts:37-50` — `` `.../accounts/${accountId}/ai/v1/chat/completions` `` with raw `accountId` from PSD / env
  - Contrast: `open-sse/executors/azure-openai.ts:35` encodes deployment/model segments
- Why it matters: Operator/import-controlled values with `/`, `?`, or spaces reshape the Cloudflare path (failed calls or unexpected endpoints). Lower severity than Qwen `resourceUrl` (F-02-003) because no Bearer exfil to arbitrary hosts, but same class of URL construction hygiene.
- Suggested fix direction: Restrict to `[A-Za-z0-9_-]+` (Cloudflare account id shape) or `encodeURIComponent`; reject otherwise.

### F-02-W2-010 — `mergeAbortSignals` accumulates listeners on long-lived client signals

- Severity: **P3**
- Category: perf / maintainability
- Evidence:
  - `open-sse/executors/base.ts:243-263` — each call `primary.addEventListener("abort", …)` without removal or `AbortSignal.any`
  - Callers in multi-attempt loops: BaseExecutor fallback/retry path (per URL attempt), plus specialized executors that merge client signal with timeout repeatedly
- Why it matters: Client `AbortSignal` spanning multi-URL fallback / intra-429 retries gains one listener per attempt; usually small (fallbackCount small) but leaks on pathological retries and complicates abort-reason propagation (ties into F-02-005 timeout classification).
- Suggested fix direction: Prefer `AbortSignal.any([primary, secondary])` (Node 22+) or remove listeners when fetch settles.

## Wave 1 items confirmed / strengthened (optional)

- **F-02-004** still valid; Wave 2 adds the **HTTP JSON** surface (F-02-W2-003) as a sibling gap, not a duplicate of mid-stream content.
- **F-02-005** still valid; Wave 2 F-02-W2-002 is the orthogonal “timeout applies to whole stream” footgun on non-Base paths.
- **F-02-007 / F-02-013** dual-SoT still valid; F-02-W2-008 is a related but distinct helper-level alias bug.
- No challenge to Wave 1 P1 ranking for path sanitize / Vertex key logging / Qwen `resourceUrl`.

## Residual risk

- Web-cookie executors still not exhaustively line-audited (50+); sampling focused on concurrency, timeouts, error bodies, and config classification.
- Did not re-run `npm run test:unit` in Wave 2.
- Excluded dual-mode / fusion task contracts not re-investigated.

## Wave 2 summary counts (new findings only)

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 3 |
| P2 | 5 |
| P3 | 2 |
| **Total new** | **10** |

| Category | Count |
|----------|------:|
| bug | 6 |
| security | 2 |
| wiring | 1 |
| perf / maintainability | 1 |

**Wave 2 top remediation order**: F-02-W2-001 → F-02-W2-002 → F-02-W2-003, then P2 rotation/`errorConfig`/alias helper fixes.

**Combined with Wave 1 (orchestrator view)**: P0=0, P1=8, P2=12, P3=5, **total 25** (Wave 1 15 + Wave 2 10).

**Verdict**: **NEEDS FIX** — new P1 concurrency and timeout-semantics bugs plus additional hard-rule #12 response paths; exclusions honored.
