# Task 0180: Extract a shared TLS client core without erasing provider behavior

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `remediation`
> **Origin**: Duplicate-block investigation from `.agents/user/gitingest/omniroute2/detect-sameblocks.mjs` and `sameblocs.csv`; live-source architecture review.
> **Blocks**: —
> **Depends on**: No blocking task dependency. Preserve the reviewed Qwen coverage work in `docs/tasks/03-review/0146-omniroute-qwen-tls-client-coverage.md`.
> **Parallelism**: `serializable` — coordinate all six provider wrappers and their tests as one refactor; do not co-edit these wrappers independently in parallel.
> **Review routing**: independent runtime/web-provider review; include security review of proxy fail-closed behavior.

---

## Objective

Extract the provider-neutral TLS-client lifecycle, request, timeout, abort, proxy,
header, and temp-file streaming machinery currently repeated across six provider
modules into a shared `open-sse/services/` core/factory. Keep thin provider-owned
wrappers for browser profile, target-specific timeout policy, stream format,
anti-bot/WAF detection, exported compatibility symbols, and other provider-specific
behavior. The completed refactor MUST reduce duplicated implementation while
preserving each current public import and observable request contract.

This task is justified now because the detector identifies repeated exact blocks in
all six clients, while the live modules are each approximately 577–628 lines:
3,633 lines total across the six clients, with the same lifecycle and streaming
algorithm copied repeatedly. A shared core should make fixes to timeout, abort,
proxy, and temp-file cleanup coherent without making Cloudflare, Qwen, SSE, or
NDJSON behavior indistinguishable.

## Background Context

### O que já existe:

- `open-sse/services/chatgptTlsClient.ts` (628 lines): ChatGPT Firefox profile,
  first-byte timeout, byte responses, SSE detection, and test streaming hook.
- `open-sse/services/claudeTlsClient.ts` (590 lines): Claude Chrome profile and
  shared-style streaming/non-streaming request path.
- `open-sse/services/grokTlsClient.ts` (607 lines): Grok Chrome profile,
  Cloudflare challenge detector, NDJSON-oriented stream behavior, and issue #3180
  compatibility comments.
- `open-sse/services/lmarenaTlsClient.ts` (608 lines): Arena Chrome profile,
  `buildTlsRequestOptions`, `hardTimeoutMs`, `tlsFetchNonStreaming`, and
  additional stream-buffer helpers already partially separated from the common
  path.
- `open-sse/services/perplexityTlsClient.ts` (593 lines): Perplexity Firefox
  profile, 30-second default timeout, Cloudflare detector, and SSE path.
- `open-sse/services/qwenTlsClient.ts` (577 lines): Qwen Chrome profile, WAF
  detector, `BX_UMIDTOKEN_FALLBACK`, and Qwen-specific response handling.
- `open-sse/services/tlsClientProxy.ts:1-30`: existing shared fail-closed proxy
  resolver; per-call proxy wins, resolver errors rethrow, and direct fallback is
  only allowed when resolution returns no proxy.
- Every client defines compatible `TlsClientHangError`,
  `TlsClientUnavailableError`, `TlsFetchOptions`, `TlsFetchResult`, lazy client
  startup, abort checks, timeout racing, proxy plumbing, response-header
  conversion, temp-file stream tailing, and cleanup.
- Runtime callers are provider-specific: ChatGPT in
  `open-sse/executors/chatgpt-web.ts:25,330,441,616,663,691,755,1619,2334,2383,2493,3066`
  plus `src/lib/providers/validation/webProvidersA.ts:410-415`; Claude in
  `open-sse/executors/claude-web.ts:24,463,490,1252-1319`; Grok in
  `open-sse/executors/grok-web.ts:23,1765-1774` plus
  `src/lib/providers/validation/webProvidersA.ts:227-242`; LMArena in
  `open-sse/executors/lmarena.ts:13,180`; Perplexity in
  `open-sse/executors/perplexity-web.ts:11,904` plus
  `src/lib/providers/validation/webProvidersA.ts:541-546`; Qwen in
  `open-sse/executors/qwen-web.ts:33,145,204` plus
  `src/lib/providers/validation/webProvidersA.ts:110-115`.
- Existing targeted tests include
  `open-sse/services/__tests__/chatgptTlsClient.test.ts`,
  `open-sse/services/__tests__/claudeTlsClient.test.ts`,
  `open-sse/services/__tests__/grokTlsClient.test.ts`,
  `tests/unit/perplexity-tls-client.test.ts`,
  `tests/unit/qwen-tls-client-coverage.test.ts`,
  `tests/unit/tls-client-proxy-fail-closed.test.ts`,
  `tests/unit/tproxy-tls-capture.test.ts`,
  `tests/unit/tlsClient-circuit-breaker.test.ts`, and
  `tests/unit/tls-options.test.ts`.

### O que está faltando / quebrado:

- The duplicate-block detector reports representative repeated groups 1053,
  1091, 1276, 0348, 0441, 0743, 0845, 1003, 1047, and 1229 across the six
  modules named above. Live source confirms the same implementation families,
  not merely similar imports or comments.
- Fixes to common timeout, abort, proxy, lifecycle, response-header, or
  temp-file-stream behavior currently require synchronized edits in six files.
- The modules are not fully identical: a mechanical copy/paste replacement would
  risk losing provider-specific contracts and should not be attempted.

## Test Requirements

- The shared core MUST have unit coverage for lazy client creation/reuse, client
  reset after `TlsClientHangError`, native-unavailable error propagation, timeout
  racing, pre-flight and post-flight abort behavior, and fail-closed proxy errors.
- The shared core MUST preserve `TlsFetchResult`: non-streaming calls return
  `text` and no `body`; streaming calls return a `ReadableStream<Uint8Array>` and
  no full `text` body.
- Stream tests MUST cover EOF-marker stripping, partial/chunked writes, request
  completion before bytes arrive, first-byte timeout where configured, abort
  cancellation, temp-file cleanup, and late request settlement.
- Provider-wrapper tests MUST prove the exact TLS profile, timeout default/env
  variable, target-specific stream EOF/format policy, and provider-specific
  challenge detector remain unchanged for each provider.
- Existing public exports MUST remain importable by current executors and
  validators, including `tlsFetchChatGpt`, `tlsFetchClaude`, `tlsFetchGrok`,
  `tlsFetchLMArena`, `tlsFetchPerplexity`, `tlsFetchQwen`, error classes, test
  overrides, `BX_UMIDTOKEN_FALLBACK`, and exported detector helpers.
- Proxy tests MUST prove per-call override precedence and MUST prove that a
  configured-but-invalid proxy cannot silently fall back to a direct connection.
- Tests MUST distinguish SSE providers from NDJSON providers and MUST cover
  Qwen WAF detection plus ChatGPT byte-response behavior without real credentials
  or production network calls.

---

## Exit Conditions (GDD/TDD)

- [ ] A shared TLS core/factory is added under `open-sse/services/` and owns only
      provider-neutral lifecycle, request, timeout, abort, proxy, header, and
      stream mechanics.
- [ ] All six provider modules delegate common mechanics to the core and retain
      provider-specific configuration/behavior through explicit adapters or
      callbacks; no provider-specific detector or profile is hidden in the core.
- [ ] Existing executor and validator imports require no public API migration, or
      any unavoidable migration is documented with a compatibility shim and tests.
- [ ] Targeted shared-core and provider-wrapper tests pass with real output using
      `node --import tsx/esm --test …`.
- [ ] `npm run typecheck:core` passes without new errors.
- [ ] `npm run lint` passes without new errors.
- [ ] Relevant Vitest tests pass if the changed files are owned by a Vitest suite;
      do not run the broad suite solely for this task.
- [ ] No test requires provider secrets, live cookies, real upstream calls, or
      production port `21000`.
- [ ] A changelog ledger entry is added under `.changelog/` through the repository
      workflow and rebuilt; generated changelog/tasklist/EPIC/dependency-tree
      surfaces are not hand-edited.

---

## Details

### What

Subtasks:

- [ ] **Ler código existente**: Read all six TLS clients, `tlsClientProxy.ts`,
      their existing tests, all listed executor/validator callers, and task 0146
      before modifying any product code.
- [ ] Define a typed core configuration that makes profile, timeout policy,
      target URL, stream format/EOF behavior, challenge hooks, byte-response
      support, and optional first-byte timeout explicit.
- [ ] Extract lifecycle, request-option construction, timeout/abort handling,
      fail-closed proxy resolution, header conversion, and temp-file streaming
      into the core while preserving error names and current behavior.
- [ ] Convert each provider module into a compatibility-preserving adapter;
      keep ChatGPT, Claude, Grok, LMArena, Perplexity, and Qwen divergences
      visible in their own files.
- [ ] Add or update focused unit tests for the core and each adapter, including
      regression tests for current provider-specific branches.
- [ ] **Refactoring pass**: verify the shared abstraction is smaller and clearer
      than six copies; reject a generic callback surface that obscures semantics.
- [ ] **Verificação de regressão**: run only targeted tests, typecheck, and lint;
      inspect the final diff for accidental secret or production-port changes.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/chatgptTlsClient.ts` | Read and refactor; retain ChatGPT profile, byte mode, first-byte timeout, SSE/test exports |
| `open-sse/services/claudeTlsClient.ts` | Read and refactor; retain Claude profile and contract |
| `open-sse/services/grokTlsClient.ts` | Read and refactor; retain Grok NDJSON and Cloudflare detector |
| `open-sse/services/lmarenaTlsClient.ts` | Read and refactor; reconcile existing helper extraction without duplicating a second core |
| `open-sse/services/perplexityTlsClient.ts` | Read and refactor; retain 30-second default, Firefox profile, SSE and detector |
| `open-sse/services/qwenTlsClient.ts` | Read and refactor; retain WAF behavior and `BX_UMIDTOKEN_FALLBACK` |
| `open-sse/services/tlsClientProxy.ts` | Reuse; do not weaken fail-closed semantics |
| `open-sse/services/__tests__/*TlsClient.test.ts` | Read/update existing provider regression coverage |
| `tests/unit/*tls*.test.ts` | Read/update targeted proxy, options, circuit-breaker, and Qwen/Perplexity coverage |
| `open-sse/services/tlsClientCore.ts` | Create shared provider-neutral core/factory if that name remains appropriate |
| `open-sse/executors/*.ts` | Read callers; modify only if a compatibility shim cannot preserve imports |
| `src/lib/providers/validation/webProvidersA.ts` | Read validators; preserve dynamic imports and error/detector contracts |

### How

1. Characterize the six current contracts before editing: profiles, timeout
   defaults/env knobs, request options, stream format, EOF symbols, detectors,
   exported helpers, and test injection points.
2. Define the smallest typed core API around a provider configuration object and
   explicit strategy hooks. The core MUST NOT know provider names, domains,
   Cloudflare expressions, Qwen WAF markers, or provider credentials.
3. Move shared mechanics incrementally, starting with proxy/error/header/abort
   behavior, then non-streaming requests, then temp-file streaming. Keep each
   provider wrapper buildable and testable after every step.
4. Preserve singleton scope and exit-hook behavior deliberately. If the core
   changes singleton ownership, prove that concurrent requests do not spawn
   multiple native clients or leak sidecars.
5. Add contract tests that run the same core cases through representative Firefox,
   Chrome, SSE, NDJSON, byte-response, and WAF configurations.
6. Run targeted tests and static checks only. Compare exports and request option
   snapshots before/after to detect silent provider drift.

### Why

The repeated implementation increases maintenance cost and creates inconsistent
fix risk in security-sensitive network code. A shared core can make proxy fail-
closed behavior, timeout recovery, and stream cleanup consistent. The abstraction
is worthwhile only if provider differences remain explicit: hiding them would make
anti-bot diagnosis and compatibility regressions harder, not easier.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Test-only additions in disjoint test files may be prepared separately after the core API is agreed. Documentation-only review is parallel-safe. |
| **serializable** | Core API design precedes wrapper migration; wrapper migration precedes final caller/export verification. Serialize with any other TLS-client or provider-web refactor. |
| **Collision** | `open-sse/services/tlsClientCore.ts`, all six `*TlsClient.ts` files, `tlsClientProxy.ts`, and their direct tests are one collision set. Do not run another task that edits these paths concurrently. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not claim deduplication from the CSV alone: compare live source and tests
> before extracting. Do not merge provider profiles, timeout policies, stream
> formats, anti-bot detectors, or exported compatibility symbols merely because
> their surrounding code is repeated. Do not use secrets, real cookies, live
> upstream calls, production port `21000`, or destructive sidecar operations.
>
> [!IMPORTANT]
> Read every file in the `Where` table that is marked Read before modifying any
> wrapper. Validate every documented export, path, line reference, and env var
> against the live repository. If a proposed abstraction requires provider-name
> conditionals inside the core, stop and redesign it as explicit configuration or
> keep that behavior in the provider adapter.

## Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: All API, path, export, and env-var references validated
      against live source before implementation.
- [ ] **Zod Validation**: N/A — no new external request/config schema is allowed
      by this task unless separately justified and tested.
- [ ] **Security**: No secrets or credentials committed; proxy resolution remains
      fail-closed and direct fallback is never introduced accidentally.
- [ ] **Error Sanitization**: Existing error contracts and upstream-safe messages
      remain intact; no new raw credential-bearing error output.
- [ ] **No Raw SQL**: N/A — no database changes are in scope.
- [ ] **Archive Protocol**: No files are deleted; obsolete code is removed only
      as part of the reviewed refactor, with compatibility preserved.

## Completion Evidence

- **Arquivos criados/modificados**: [executor fills with real paths]
- **Testes que verificam o trabalho**: [executor fills with test names and paths]
- **Resultado dos testes**: [executor fills with real PASS/FAIL output]
- **Resultado do lint**: [executor fills with real PASS/FAIL output]
- **Resultado do typecheck/build**: [executor fills with real PASS/FAIL output]
- **Entrada no changelog**: [executor fills with `.changelog/<entry>.md` and rebuild output]
- **Agente executor**: [executor fills]
- **Data de conclusão**: [YYYY-MM-DD]

## Review Trail

- **Reviewer**: [reviewer fills]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [reviewer fills with evidence-based notes and file/line references]
- **Se REJEITADO**: move to `02-doing/` with the reason documented at the top.
