# Slice 01: open-sse pipeline — Adversarial Review (Wave 1)

## Scope

| Path | Role |
|------|------|
| `open-sse/handlers/` | Chat/media/search entry handlers + chatCore decomposition |
| `open-sse/translator/` | Format conversion request/response registry |
| `open-sse/transformer/` | Responses API SSE transform |
| `open-sse/utils/` | Error/stream/proxy/sanitize helpers |

~51k LOC surface; sampled entry points, error paths, SSE lifecycle, sanitization, header forwarding, and translator wiring.

## Exclusions honored

- Task **0036** (dual-mode auth deploy verify on :21000) — not investigated.
- Task **0017** (Fusion docs/i18n) — not investigated.
- Fusion epic **0010–0016, 0018** — residual pipeline bugs only if unrelated to fusion contracts.
- Dual-mode auth **0032–0035, 0037–0039** — not re-audited.
- Frontend IA **0023–0031** — out of scope.

## Method

1. Inventory of handlers/translator/transformer/utils; focused reads of `chatCore.ts`, streaming/SSE helpers, media handlers, error utils.
2. Grep for TODO/FIXME, empty catches, raw `err.message` in client bodies, `eval`/`new Function`, abort/cancel, sanitization usage, publicCreds, header denylists.
3. Contract check: `handleChatCore` return shape vs callers in `src/sse/handlers/chat.ts` / `chatHelpers.ts` / `responsesHandler.ts`.
4. Cross-check Hard Rules #12 (error sanitization), #11 (publicCreds — no literal credentials in this slice), upstream header denylist alignment.

## Findings (severity-ordered)

### F-01-001 — Quota-share block returns raw `Response` (breaks `handleChatCore` contract)

- Severity: **P0**
- Category: bug / wiring
- Evidence:
  - `open-sse/handlers/chatCore.ts:2060-2073` — on `decision.kind === "block"` returns `new Response(...)` directly.
  - Every other early exit in the same function returns `{ success, status, error?, response }` (e.g. plugin block `443-448`, heap guard via `checkHeapPressureGuard`, `createErrorResult` at many sites).
  - Callers require the envelope: `src/sse/handlers/chat.ts:1289-1299` (`if (result.success) return result.response`), failure path `1631` `return withSelectedConnectionHeader(result.response, ...)`.
  - `withSelectedConnectionHeader` (`src/sse/handlers/chatHelpers.ts:823-827`) returns the first argument unchanged when falsy → **`undefined`** is returned to the route.
  - `open-sse/handlers/responsesHandler.ts:59-60` treats missing `result.success` / `result.response` as failure and returns the raw `Response` as the whole result (wrong envelope for its callers).
- Why it matters: When quota-share enforcement blocks a request, clients can receive no body / Next.js errors instead of a structured 429. Quota enforcement is the path that *should* fail closed; instead it fails the response pipeline.
- Suggested fix direction: Return `{ success: false, status: 429, error: body.error.message, response: new Response(...) }` (or `createErrorResult(429, decision.reason)` + Retry-After headers). Add a unit test that mocks `enforceQuotaShare` → `block` and asserts envelope + 429 body.

### F-01-002 — Unsanitized upstream error bodies returned to clients (Hard Rule #12 gaps)

- Severity: **P1**
- Category: security
- Evidence:
  - `open-sse/handlers/moderations.ts:58-66` — on `!res.ok`, returns `new Response(errText, ...)` (raw upstream body, no `sanitizeErrorMessage` / `buildErrorBody`).
  - `open-sse/handlers/audioTranscription.ts:35-59` (`upstreamErrorResponse`) and `open-sse/handlers/audioSpeech.ts:51-68` — put extracted/raw upstream text into `{ error: { message: errorMessage } }` without sanitization.
  - `open-sse/handlers/audioTranscription.ts:345-360` — Kie createTask catch returns `err.message` raw in `Response.json`.
  - Contrast: chat path and many media catch blocks correctly use `sanitizeErrorMessage` / `errorResponse` (which sanitizes).
- Why it matters: Upstream errors can embed absolute paths, stack fragments, internal hostnames, or credential-adjacent diagnostics. Hard Rule #12 requires `buildErrorBody` / `sanitizeErrorMessage` on client-facing errors.
- Suggested fix direction: Route all of the above through `errorResponse` / `buildErrorBody` / `sanitizeErrorMessage`. Add regression tests asserting `!body.error.message.includes("at /")` for moderation + audio handlers.

### F-01-003 — Translation failure with `errorType` bypasses sanitizer

- Severity: **P1**
- Category: security / bug
- Evidence: `open-sse/handlers/chatCore.ts:1820-1846` — builds client JSON with raw `message` from thrown translator error (`error?.message`) when `errorType` is set. Does **not** call `buildErrorBody` / `sanitizeErrorMessage`. The non-`errorType` branch correctly uses `createErrorResult` (`1850`).
- Why it matters: Translator throws can include schema dumps, paths, or large internal diagnostics; this branch ships them verbatim.
- Suggested fix direction: Always `createErrorResult(statusCode, message, null, errorType, errorType)` or wrap `message` with `sanitizeErrorMessage`. Unify both branches.

### F-01-004 — Streaming response header denylist is dangerously incomplete

- Severity: **P1**
- Category: security / wiring
- Evidence: `open-sse/handlers/chatCore/responseHeaders.ts:7-23` — denylist is only `content-type`, `content-encoding`, `content-length`, `transfer-encoding`. **All other upstream headers are forwarded** into the client SSE response (including potential `set-cookie`, hop-by-hop `connection`/`keep-alive`, `www-authenticate`, echoed auth headers if present).
  - Request-side denylist in `src/shared/constants/upstreamHeaders.ts` is richer but applies to operator custom headers, not response forwarding.
- Why it matters: Proxying upstream cookies/auth challenges into browser or multi-tenant API clients is a session-leak / confused-deputy risk. Hop-by-hop headers also break intermediaries.
- Suggested fix direction: Expand streaming (and any other) response denylist to hop-by-hop + sensitive headers (`set-cookie`, `authorization`, `www-authenticate`, `proxy-*`, `connection`, `keep-alive`, …). Prefer allowlist for SSE: Content-Type, Cache-Control, Connection, OmniRoute meta, selected rate-limit headers only.

### F-01-005 — `createSSEStream` cancel path does not finalize pending request / usage

- Severity: **P1**
- Category: bug / resource leak
- Evidence:
  - `open-sse/utils/stream.ts:2621-2623` — `cancel(reason)` only calls `clearIdleTimer()`.
  - Compare successful flush / failure paths which call `clearPendingRequestFromStream()` / `onComplete` / `onFailure` (e.g. `843-847`, `1083-1095`, `2615`).
  - Outer `pipeWithDisconnect` cancel (`streamHandler.ts:537-543`) does disconnect handling, but the transform’s own cancel still leaves stream-local idle state incomplete and does not guarantee stream-side pending-counter clear if disconnect races with mid-transform state.
- Why it matters: Client disconnect mid-stream can leave pending-request counters and incomplete usage/finalize callbacks; dashboard “in-flight” and account concurrency signals drift.
- Suggested fix direction: In `cancel`, clear idle timer, call `clearPendingRequestFromStream` / `onFailure`/`onComplete` with client-disconnect semantics (align with `createStreamFailureFinalizers` 499 path). Add integration test for cancel → pending counter returns to baseline.

### F-01-006 — Path-segment validation allows URL path injection (`/` not rejected)

- Severity: **P1**
- Category: security
- Evidence:
  - `open-sse/handlers/audioSpeech.ts:173-175` and `audioTranscription.ts:65-66`:  
    `return !segment.includes("..") && !segment.includes("//");`
  - Used for ElevenLabs voice path and HuggingFace model path:  
    `audioSpeech.ts:356-359` → `` `${providerConfig.baseUrl}/${voiceId}` ``;  
    `audioSpeech.ts:410-413` → `` `${providerConfig.baseUrl}/${modelId}` ``.
- Why it matters: Values like `evil/path`, `%2e%2e` (if decoded upstream), or extra segments rewrite the upstream path while still “passing” validation. Operator base URLs plus client-controlled segments become open path traversal on the provider host (API method smuggling / wrong resource).
- Suggested fix direction: Reject any of `/`, `\`, `?`, `#`, encoded dots, and non `[A-Za-z0-9._-]` (or encodeURIComponent and forbid separators). Unit-test rejection of `a/b`, `..`, `//`, empty.

### F-01-007 — `unavailableResponse` skips Hard Rule #12 sanitization helpers

- Severity: **P2**
- Category: security / maintainability
- Evidence: `open-sse/utils/error.ts:357-371` — builds `{ error: { message: msg } }` without `sanitizeErrorMessage` / `buildErrorBody`. Callers in combo (`open-sse/services/combo.ts`) pass constructed strings; safer today, but any future unsanitized detail flows straight to clients.
- Why it matters: Divergent error builders are how sanitization regressions reappear.
- Suggested fix direction: Implement via `buildErrorBody` + Retry-After header; keep OpenAI-compatible shape.

### F-01-008 — Manual `Transfer-Encoding: chunked` on audio streams

- Severity: **P2**
- Category: bug / interoperability
- Evidence: `open-sse/handlers/audioSpeech.ts:74-83` (`audioStreamResponse`) sets `"Transfer-Encoding": "chunked"` while returning `res.body` to Next/Node, which already manages framing. `responseHeaders.ts:64-84` documents that forwarding/setting TE across a buffering proxy is undefined and was the source of real client parse bugs for chat.
- Why it matters: Double-chunking or invalid framing → client audio decode failures / TransferEncodingError (same class of bug already fixed for chat).
- Suggested fix direction: Drop `Transfer-Encoding` from handler-set headers; set only Content-Type + CORS. Let runtime frame the stream.

### F-01-009 — `handleResponsesCore` drops headers and stacks a second heartbeat

- Severity: **P2**
- Category: wiring / bug
- Evidence:
  - `open-sse/handlers/responsesHandler.ts:72-90` — rebuilds `Response` with only `Content-Type` / `Cache-Control` / `Connection`, discarding OmniRoute meta, request-id, cache, selected-connection, compression headers from `handleChatCore`.
  - Same block pipes through `createSseHeartbeatTransform` **after** `createResponsesApiTransformStream`, while chat streaming already attaches heartbeat in `assembleStreamingPipeline` (`streamingPipeline.ts:87-93`). Clients may see duplicate keepalives / mismatched shapes (OpenAI chat comments vs Responses in-progress).
- Why it matters: Observability headers disappear on `/v1/responses`; dual heartbeats can confuse strict clients or inflate traffic.
- Suggested fix direction: Forward allowlisted headers from upstream chat result; either disable chat-level heartbeat for responses path or skip the second transform; test header preservation + single keepalive policy.

### F-01-010 — `createResponsesLogger` embeds unsanitized `model` in filesystem path

- Severity: **P2**
- Category: security / bug
- Evidence: `open-sse/transformer/responsesTransformer.ts:42-49` —  
  `path.join(baseDir, "logs", \`responses_${model}_${timestamp}_${uniqueId}\`)` with no sanitization of `model`. Also uses top-level `fs`/`path` imports while dead `getFs`/`getPath` async loaders exist (lines 12-33 never called).
- Why it matters: If logging is ever enabled with a client-controlled model string containing path separators, mkdir/write can escape the intended logs directory (CWD-relative by default — also leaves sensitive stream dumps outside `DATA_DIR`).
- Suggested fix direction: Sanitize model to `[A-Za-z0-9._-]+`; prefer `resolveDataDir()`; remove dead `getFs`/`getPath` or use them consistently; never default to `process.cwd()` for production logs.

### F-01-011 — Early-stream keepalive re-emits non-SSE error bodies as raw SSE `data:` lines

- Severity: **P2**
- Category: bug / security-adjacent
- Evidence: `open-sse/utils/earlyStreamKeepalive.ts:162-171` — for non-SSE late failures:  
  `controller.enqueue(ENCODER.encode(\`event: error\ndata: ${dataLine}\n\n\`))` where `dataLine = text.trim()` is the full response body. Multi-line JSON breaks SSE framing; body is not re-sanitized at this boundary (relies on upstream handlers having already sanitized — which F-01-001/002 show is incomplete).
- Why it matters: After threshold commit to HTTP 200, error semantics are already degraded; malformed SSE or residual unsanitized payload worsens client recovery.
- Suggested fix direction: Always JSON.stringify a small `{error:{message,type,code,status}}` from `buildErrorBody`; never splice raw body into `data:`.

### F-01-012 — Thinking-model injector over-matches model IDs

- Severity: **P2**
- Category: bug / maintainability
- Evidence: `open-sse/utils/reasoningContentInjector.ts:24-33` — patterns `/deepseek/i`, `/\bkimi\b/i`, `/\bk2\b/i`, `/\bminimax\b/i`. `\bk2\b` matches unrelated model ids containing “k2”; broad `/deepseek/i` injects placeholder `reasoning_content: " "` into multi-turn history for any deepseek-named model (used from `open-sse/executors/opencode.ts`).
- Why it matters: Spurious `reasoning_content` can change provider behavior, inflate tokens, or break non-thinking variants.
- Suggested fix direction: Align with `requiresReasoningReplay` / capability registry rather than loose regex; unit-test false positives (e.g. `foo-k2-bar` non-moonshot).

### F-01-013 — Copy-paste drift: media handlers inconsistently shape client errors

- Severity: **P2**
- Category: maintainability / test-gap
- Evidence:
  - Image/video/music catch blocks often: client `error: sanitizeErrorMessage(...)` but `saveCallLog({ error: err.message })` (e.g. `imageGeneration.ts:873-880`, `videoGeneration.ts:489-495`).
  - Audio/moderations/rerank/speech use `errorResponse` (sanitizes) **or** raw paths (F-01-002).
  - No unit tests under `tests/unit` for `isValidPathSegment` / audio `upstreamErrorResponse` sanitization (grep empty).
- Why it matters: Inconsistent contracts for routes/UI; regressions only in some media paths.
- Suggested fix direction: Shared `providerErrorResult(status, err)` helper; matrix tests across embeddings/image/video/music/audio/moderation/rerank/search.

### F-01-014 — Dead code in Responses transformer

- Severity: **P3**
- Category: dead-code
- Evidence: `open-sse/transformer/responsesTransformer.ts:12-33` — `getFs` / `getPath` never referenced; module uses static `import * as fs from "fs"` / `path` instead. Comment claims Workers-dynamic import but code path is dead.
- Why it matters: Misleading maintenance surface; Workers “compat” claims are false for the logger.
- Suggested fix direction: Delete dead helpers or implement logger exclusively through them.

### F-01-015 — Empty catches hide stream finalization failures

- Severity: **P3**
- Category: maintainability
- Evidence: Multiple intentional silent catches, e.g. `chatCore.ts:2126-2141` (disconnect finalize), `stream.ts:868`, `2434`, `2458`, `2613`, `jsonBodyToSse.ts:56`, `responseTranslator.ts:76`. Some are intentional fail-open; others swallow real finalize bugs.
- Why it matters: Debugging production stream accounting becomes impossible; partial state can persist without logs.
- Suggested fix direction: At minimum `log?.debug` / metric counter on finalize catch; never silent on pending-request clear failures.

### F-01-016 — `sanitizeErrorMessage` only strips *source-extension* absolute paths

- Severity: **P3**
- Category: security residual
- Evidence: `open-sse/utils/error.ts:24-57` — `looksLikeAbsolutePath` only flags paths ending in `.ts/.tsx/.js/...`. Paths like `/etc/passwd`, `/home/user/.omniroute/secrets.db`, or non-source files pass through on the first line.
- Why it matters: Defense-in-depth gap if messages include non-source absolute paths (DB paths, cert paths).
- Suggested fix direction: Strip any token matching POSIX/Windows absolute path shapes, not only source extensions; keep linear-time tokenization.

### F-01-017 — Translator bootstrap omits `openai-to-gemini-sse` registration

- Severity: **P3**
- Category: wiring / dead-code risk
- Evidence: `open-sse/translator/bootstrap.ts` imports many request/response modules but **not** `response/openai-to-gemini-sse.ts`. That module documents Gemini SDK bridge use and is imported from app routes separately (by design), but is not part of the registry used by `translateRequest`/`getResponseTranslator`. Easy to assume it’s registered when it is not.
- Why it matters: Future callers using registry-only translation miss Gemini SSE reverse mapping; dual entry paths drift.
- Suggested fix direction: Document as intentional out-of-registry adapter **or** register under an explicit format pair; add a bootstrap inventory test.

### F-01-018 — Proxy config / combos process-local cache staleness (10s)

- Severity: **P3**
- Category: maintainability / ops
- Evidence: `open-sse/handlers/chatCore/comboContextCache.ts:7-8, 18, 54-62` — 10s TTL; failed proxy config reads cache `{ mode: "native", enabled: false }` for 10s, masking a transient DB error and also delaying intentional proxy enablement.
- Why it matters: Operators enabling CLIProxy/upstream proxy can see 10s of native routing; error-negative cache is aggressive.
- Suggested fix direction: Do not cache hard-failure fallbacks as long as successes; document TTL in ops guide.

## Dead code / orphans

| Item | Location | Notes |
|------|----------|-------|
| `getFs` / `getPath` | `transformer/responsesTransformer.ts:12-33` | Never called (F-01-014) |
| Dual `fs` import styles | same file static + dynamic | Logger always uses static import |
| Empty-catch defensive blocks | stream/chatCore | Many intentional; still noise (F-01-015) |

No evidence of completely unused exported handlers in the sampled set; media handlers are route-wired. `openai-to-gemini-sse` is live but out-of-registry (F-01-017).

## Wiring smells

1. **Return-type polymorphism on `handleChatCore`** — overwhelmingly envelope objects, one raw `Response` (F-01-001). Type is effectively untyped (`any` cast at chatHelpers).
2. **Dual error-construction APIs** — `errorResponse` / `createErrorResult` / `unavailableResponse` / hand-built `Response.json` / raw `errText` (F-01-002, F-01-007).
3. **Streaming vs non-streaming header policy** — non-stream builds clean OmniRoute headers (`nonStreamingResponseHeaders.ts`); streaming forwards almost everything from upstream (F-01-004).
4. **Responses path double-transform** — chatCore stream pipeline + `handleResponsesCore` re-pipe (F-01-009).
5. **Hard Rule #12 compliance is best-effort per-handler** — chat core mostly good; moderation/audio/translate branches lag.

## Improvement opportunities

1. **Single `HandlerResult` type** for all open-sse handlers (`success`, `status`, `error`, `response`, `errorCode`, `errorType`, `retryAfterMs`) + runtime assert in tests.
2. **Central `toClientError(status, message, opts)`** used by audio/moderation/rerank/speech/embeddings — kill copy-paste.
3. **SSE cancel/finalization checklist** — pending counter, usage finalize, idle timer, keepalive, abort upstream — unit harness already exists for responses transformer cancel; extend to `createSSEStream`.
4. **Allowlist streaming response headers** rather than expanding denylist forever.
5. **Capability-driven reasoning injection** instead of regex lists.
6. **Test matrix** for Hard Rule #12 across every `open-sse/handlers/*` export (static analysis script similar to `check-error-helper`).

## Residual risk / unrun checks

- Did not run full `npm run test:unit` / vitest in this review pass (static/adversarial read only).
- Did not deep-audit every translator request/response pair for semantic correctness (tool-call edge cases are large and partially covered by existing unit tests).
- Executor-layer SSRF / credential handling is slice 02 territory; only `cursorImages` / proxy helpers sampled here.
- Fusion runtime dispatch and dual-mode auth deliberately not re-investigated (exclusions).

## Summary counts

| Severity | Count |
|----------|------:|
| **P0** | 1 |
| **P1** | 5 |
| **P2** | 7 |
| **P3** | 5 |
| **Total** | **18** (`F-01-001` … `F-01-018`) |

**Highest-signal fix first:** F-01-001 (quota-share return contract), then F-01-002/003 (error sanitization gaps), then F-01-004 (streaming header denylist), then F-01-005/006 (stream cancel + path segments).

---

# Wave 2 — Second-pass adversarial delta

**Reviewer**: wave-2 independent
**Date**: 2026-07-11

## Method

Re-read Wave 1 report end-to-end; deliberately avoided re-litigating F-01-001…018. New passes over under-sampled paths:

- Grep `err.message` / raw `Response` / `fetch(` / `provider_options` / `baseUrl` / `generateSignature` / mid-stream error builders across `open-sse/handlers/`, `translator/`, `transformer/`, `utils/`.
- Read `search.ts` request builders + `tryProvider` fetch path; cross-check route `provider_options` plumbing (`src/app/api/v1/search/route.ts`) and `computeCacheKey`.
- Read semantic cache read/write pipeline (`chatCore/semanticCache.ts`, `semanticCacheStore.ts`, `streamingSemanticCacheStore.ts`, `src/lib/semanticCache.ts` signature).
- Read mid-stream error path (`utils/streamHandler.ts` `getErrorMessage` / `buildStreamErrorChunks`) vs Hard Rule #12 helpers.
- Spot-check `jsonBodyToSse`, non-streaming body reader, plugin onRequest gate, responsesHandler production callers.

## New findings (not in Wave 1)

### F-01-W2-001 — Client-controlled search `baseUrl` + bare `fetch` = SSRF / API-key exfiltration

- Severity: **P1**
- Category: security
- Evidence:
  - `open-sse/handlers/search.ts:258-260` — `resolveSearchBaseUrl` prefers `providerOptions.baseUrl` / `providerSpecificData.baseUrl` over registry defaults.
  - `src/app/api/v1/search/route.ts:282` — passes client body `provider_options` straight into the handler (schema allows arbitrary record: `src/shared/validation/schemas/apiV1.ts:190`).
  - `open-sse/handlers/search.ts:492-509` (`buildSearchApiRequest`) puts `api_key` in the query string on that URL; `391-429` (`buildGooglePseRequest`) puts `key` + `cx` in the query string.
  - Generic path `open-sse/handlers/search.ts:1445` uses plain `fetch(url, …)` — **not** `safeOutboundFetch` (only Z.AI MCP uses the guarded fetch at `:999-1000`).
  - Tests explicitly accept client `provider_options.baseUrl` for localhost (e.g. `tests/unit/search-route.test.ts:200-231`) — intentional for SearXNG, but the same override applies to commercial providers that embed secrets in URL/headers.
- Why it matters: Any API-key principal can set `provider_options.baseUrl` to an attacker host (or cloud metadata / LAN). For SearchAPI/Google PSE the request **sends the operator's search credentials in the URL** to that host. Even for header-auth providers, Authorization/X-API-Key headers are forwarded. This is classic proxy SSRF + credential theft; multi-tenant / tunnel-exposed deployments are fully exposed.
- Why Wave 1 missed it: Wave 1 sampled media path segments and chat headers, not the search handler's baseUrl override + fetch choice.
- Suggested fix direction: Ignore client `baseUrl` except for explicitly self-hosted providers (`searxng-search`, `ollama-search`); validate those with `parseAndValidatePublicUrl` / operator allowlist (or explicit opt-in private-host mode). Route all search HTTP through `safeOutboundFetch`. Never put secrets on a client-influenced origin. Unit-test rejection of `http://169.254.169.254/` and of `baseUrl` overrides on Serper/SearchAPI/Google PSE.

### F-01-W2-002 — Semantic cache signature omits tools/format; hits always emit OpenAI-shaped bodies

- Severity: **P1**
- Category: bug / correctness / isolation
- Evidence:
  - `src/lib/semanticCache.ts:119-131` — signature = `model + messages/input + temperature + top_p` only (plus optional apiKeyId prefix). **No** `tools`, `tool_choice`, `response_format`, `sourceFormat`/`clientResponseFormat`, `stream`, `seed`, `stop`, `max_tokens`.
  - Store paths write **client-translated** non-stream bodies (`chatCore.ts:3832-3836` → `translatedResponse`) and **OpenAI-assembled** stream bodies (`streamingSemanticCacheStore.ts:64-75` stripping `_streamed` from stream collector shape).
  - Hit path `open-sse/handlers/chatCore/semanticCache.ts:72-93` always returns either `synthesizeOpenAiSseFromJson(JSON.stringify(cached))` (stream) or raw `JSON.stringify(cached)` — **no** re-translation to Claude/Gemini/Responses.
  - Cacheability gate (`isCacheableForRead`, `semanticCache.ts:357-362`) only checks `temperature === 0` + no-cache header.
- Why it matters:
  1. Same prompt with **different tools** → wrong cached answer/tool_calls (silent functional corruption).
  2. Claude/Gemini client after an OpenAI-format stream store (or vice versa) receives the wrong wire shape → client SDK parse failures or wrong fields.
  3. `response_format: json_schema` vs free text can collide.
- Why Wave 1 missed it: Wave 1 residual risk noted translator depth but did not audit Phase 9.1 semantic-cache key composition / serve path.
- Suggested fix direction: Include at least `tools` fingerprint, `tool_choice`, `response_format`, and `clientResponseFormat` (or store only OpenAI canonical + re-translate on hit). Refuse cache hits when format mismatch. Add regression tests: tools differ → miss; Claude stream request → Claude-shaped hit (or hard-disable stream hits for non-OpenAI).

### F-01-W2-003 — Mid-stream disconnect/error SSE embeds raw `Error.message` (Hard Rule #12)

- Severity: **P1**
- Category: security
- Evidence:
  - `open-sse/utils/streamHandler.ts:163-167` — `getErrorMessage` returns `error.message` / raw string with **no** `sanitizeErrorMessage`.
  - `open-sse/utils/streamHandler.ts:515-524` — mid-stream catch feeds that string into `buildStreamErrorChunks`.
  - `open-sse/utils/streamHandler.ts:379-431` — builds OpenAI/Claude/Responses error events with `message: errorMsg` verbatim (no `buildErrorBody`).
  - Contrast: pre-stream failures use `createStreamingErrorResult` / `createErrorResult` → `buildErrorBody` (sanitized body). Wave 1 F-01-002/003/011 cover other boundaries, not this in-band stream path.
- Why it matters: Upstream/transform failures can put paths, hostnames, or stack fragments into **already-committed 200 SSE** frames that clients parse as fatal errors — Hard Rule #12 gap on the hottest streaming path.
- Why Wave 1 missed it: Focused on handler-level JSON errors and early-stream keepalive, not `pipeWithDisconnect` mid-stream encoding.
- Suggested fix direction: `sanitizeErrorMessage` inside `getErrorMessage` (or always `buildErrorBody(status, msg).error.message` before chunking). Unit-test: throw `Error("ENOENT /home/svc/secrets.db")` through the disconnect-aware pipe → client frame has no absolute path.

### F-01-W2-004 — Search result cache key ignores `provider_options` (incl. `baseUrl`)

- Severity: **P2**
- Category: bug / cache correctness
- Evidence:
  - `open-sse/services/searchCache.ts:36-55` — key fields: query, provider, type, maxResults, country, language, filters blob (filters/offset/time_range only from route).
  - `src/app/api/v1/search/route.ts:254-263` — comment claims "includes all fields that affect results" but **omits** `body.provider_options` / content options that change upstream request.
  - Combined with F-01-W2-001: different base URLs or depth options share one cache entry → cross-request result mix-up and harder SSRF forensics.
- Why it matters: Operators/clients changing SearXNG base URL or Linkup depth can receive stale results from another origin; also enables cache-poisoning of subsequent same-query callers.
- Why Wave 1 missed it: No search-cache audit in Wave 1.
- Suggested fix direction: Hash stable subset of `provider_options` + `content` into `computeCacheKey`; document intentional exclusions. Tests for baseUrl / depth divergence → different keys.

### F-01-W2-005 — `createStreamingErrorResult` envelope keeps unsanitized `error` string

- Severity: **P2**
- Category: security / contract
- Evidence:
  - `open-sse/handlers/chatCore/streamErrorResult.ts:28-41` — body via `buildErrorBody` (sanitized), but result envelope sets `error: message` (raw argument).
  - Call sites in `chatCore.ts:2766-2768`, `2825-2830` pass `failureMessage` / `error.message` into this helper.
  - Contrast: `createErrorResult` (`utils/error.ts:330-332`) sets `error: body.error.message` (post-sanitize).
- Why it matters: Combo/failover and logging paths that read `result.error` (not the Response body) re-expose unsanitized diagnostics; diverges from the non-stream helper contract and invites copy-paste regressions.
- Why Wave 1 missed it: Wave 1 noted media/handler copy-paste drift; this specific envelope asymmetry was not called out.
- Suggested fix direction: `error: errorBody.error.message` (same as `createErrorResult`). Assert envelope === body message in unit tests.

### F-01-W2-006 — Non-streaming upstream body accumulation has no size ceiling

- Severity: **P2**
- Category: performance / DoS resilience
- Evidence:
  - `open-sse/handlers/chatCore/nonStreamingResponseBody.ts:19-67` — drains SSE/NDJSON into `rawBody += decodedChunk` until terminal marker or timeout; **no** max-byte abort.
  - `jsonBodyToSse.ts:138` — on application/json stream masquerade, `jsonBody.text()` loads the **entire** upstream body into memory before synthesize/rebuild.
  - Timeout (`FETCH_BODY_TIMEOUT_MS`) bounds wall clock, not memory; a fast multi-GB (or multi-100MB) upstream still OOMs the process.
- Why it matters: One malicious or misbehaving provider connection can heap-exhaust OmniRoute under non-stream client requests or JSON→SSE conversion, taking down co-hosted tenants.
- Why Wave 1 missed it: Wave 1 covered stream cancel/pending counters, not body size bounds.
- Suggested fix direction: Enforce a hard max (e.g. 16–32 MiB) on accumulated bytes; abort reader + 502 on overflow. Apply same cap in JSON→SSE full-body path. Metric + unit test with oversized fake upstream.

### F-01-W2-007 — Plugin `onRequest` block response bypasses error sanitization helpers

- Severity: **P3**
- Category: security residual
- Evidence: `open-sse/handlers/chatCore/pluginOnRequest.ts:44-45` — if plugin returns `pluginResult.response`, it is `JSON.stringify`'d into a 403 Response with no `buildErrorBody` / `sanitizeErrorMessage`. Default path uses a static safe message (`:47-50`).
- Why it matters: A buggy or compromised plugin can put stacks/paths into client-visible 403 bodies; Hard Rule #12 is bypassed at the plugin boundary.
- Why Wave 1 missed it: Plugin hooks were not in the Wave 1 sample set.
- Suggested fix direction: Wrap plugin-provided messages through `buildErrorBody(403, …)` or deep-sanitize known fields; never pass opaque plugin objects through untouched.

## Wave 1 items confirmed / strengthened (optional)

- **F-01-001** still present at `chatCore.ts:2060-2073` (raw `Response` on quota block).
- **F-01-005** still present: `stream.ts:2621-2623` cancel only clears idle timer (no finalize).
- **F-01-004** still present: streaming header denylist only strips encoding headers (`responseHeaders.ts:7-12`).
- **F-01-W2-003** strengthens the Hard Rule #12 theme of F-01-002/003/011 with a **new** client-visible stream path (not a restatement).

## Residual risk

- Did not re-run unit/vitest suites (static adversarial pass only).
- Translator semantic correctness (tool-call id pairing, Gemini thought signatures) only spot-checked; no new translator P0/P1 proven beyond cache format interaction.
- `handleResponsesCore` remains test-only (no production importer besides unit tests); Wave 1 F-01-009 still applies if Workers/legacy re-enable it — not double-counted as a new finding.
- Executor-layer credential handling remains slice 02.
- Fusion / dual-mode auth / frontend IA exclusions honored (not re-audited).

## Wave 2 summary counts

| Severity | Count |
|----------|------:|
| **P0** | 0 |
| **P1** | 3 |
| **P2** | 3 |
| **P3** | 1 |
| **Total new** | **7** (`F-01-W2-001` … `F-01-W2-007`) |

**Highest-signal Wave 2 fixes:** F-01-W2-001 (search baseUrl SSRF/credential leak), F-01-W2-002 (semantic cache key/format), F-01-W2-003 (mid-stream sanitize).
