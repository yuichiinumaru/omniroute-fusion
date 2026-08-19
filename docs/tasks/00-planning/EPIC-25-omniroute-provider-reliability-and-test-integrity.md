# EPIC-25: Provider Reliability and Test Integrity

> **Status**: Planning — evidence-backed decomposition (2026-08-04)
> **Priority**: High
> **Origin**: Operator reports + read-only forensic wave

## Goal

Make provider testing and runtime fallback tell the truth about the provider,
model, account, and failure class involved. The epic covers NVIDIA NIM test
misattribution, NVIDIA runtime failure observability/fallback residuals, and
provider circuit-breaker behavior that can suppress healthy accounts.

## Evidence basis

- `src/app/api/providers/[id]/test/route.ts` passes the stored provider string
  into validation without alias normalization.
- `open-sse/services/model.ts` resolves model strings independently of the
  `providerId` parameter used by the model-test UI.
- NVIDIA validation uses a fixed probe model unless
  `providerSpecificData.validationModelId` is set.
- NVIDIA runtime logs show synthetic 524 timeouts and repeated empty assistant
  responses after tool-call completion.
- `src/shared/utils/circuitBreaker.ts` is provider-scoped and gates before
  quota-aware account selection.

## Stories / executable tasks

| Story | Task | Scope |
|---|---|---|
| Provider test identity | 0138 | Normalize provider identity and make expected/actual test target visible. |
| NVIDIA runtime failure contract | 0139 | Add NVIDIA-specific timeout/empty-response evidence and fallback coverage without duplicating Task 0119. |
| Healthy-account resilience | 0143 | Prevent coarse provider breaker state from hiding healthy accounts, while preserving provider-outage protection. |
| Kimi-web core coverage | 0145 | Cover Connect-RPC response/stream/error branches before final 0122 approval. |
| Qwen TLS-client coverage | 0146 | Cover WAF/stream/timeout internals outside 0123's executor scope. |
| LM Arena error-path coverage | 0147 | Cover native TLS-unavailable and Cloudflare challenge branches outside 0121's happy-path scope. |
| Cursor native tool bridge | 0148 | Port upstream Cursor native shell/read/TodoWrite bridge and CLI compatibility. |
| Grok Build protocol/tool calls | 0149 | Port upstream Responses API, tool-output sanitization, headers, and model metadata. |
| Grok Build login UX | 0151 | Add verified device-code/browser PKCE flows while retaining auth.json import. |
| Combo fail-soft unavailable models | 0157 | Prove account/model-scoped 404s skip candidates, preserve fallback, and never leak a candidate error to a successful harness call. |
| Grok CLI provider compatibility | 0160 | Investigate the connector first; treat model identity/4.6 as a secondary hypothesis. **RE-EVALUATION REQUIRED 2026-08-16** — gate introduced by this task contradicts `passthroughModels: true`; awaits 0176 helper publication before next review round. Policy adopted: passthrough pleno + denylist explícita. |
| Grok CLI local auth capture | 0161 | Docker-only `grok login`/auth-store capture with identity mapping and secret-safe persistence. |
| Antigravity provider compatibility | 0162 | Restore signature emulation, model catalog, UA, safety, URLs, and version resolution while preserving OpenCode tool-call compatibility. |
| OpenCode Free model catalog refresh | 0164 | Replace 6 stale Free models with 4 current upstream entries. |
| OpenCode executor upstream sync | 0165 | Port `client_metadata` strip, `parseEffortLevel()` expansion, CLI header synthesis, and Go effort-tier aliases. |
| OpenCode Zen 429 diagnosis | 0166 | Diagnose quota vs IP/identity vs shadowban after CLI header synthesis lands. |
| OpenCode Free account identity UX | 0167 | Make proxy-gated rotation transparent to operators. |
| Proxy redaction gate | 0168 | Gate proxy enable behind effective PII redaction with high-friction confirm. |
| BYO proxy validation and free-pool non-goal | 0169 | Harden BYO validation, extend SSRF deny, document free-pool as staging-only non-goal. |
| Qoder OAuth DB Setting | 0170 | Move Qoder OAuth eligibility from environment variables to a UI Feature Flag / Database setting. |
| Trae Connector Fixes | 0171 | Remove double `tr/` prefix and restore dynamic credential retrieval (`resolvePublicCred`). |
| Cursor Experimental Auto Login | 0172 | Implement Docker-only CLI execution `cursor-agent login` to capture auth JSON dynamically. |
| Freebuff Provider Connector | 0173 | Add Freebuff provider connector with device OAuth, session lifecycle manager, and OpenAI-compatible executor. |
| AIHubMix Provider Connector | 0174 | Add AIHubMix provider connector with API key gateway, dynamic models discovery, and free tier catalog. |
| Enter MaaS Provider Connector | 0175 | Add Enter MaaS (enter.converge.ai) provider connector with API key gateway, DefaultExecutor, dynamic models discovery. **Evidence-gated by `RD-omniroute-enter-maas-evidence`** — endpoint/catalog/billing confirmed before implementation. |
| OpenCode reasoning-summary combo audit | RD-omniroute-opencode-reasoning-summary-combo-audit | Read-only research: locate "(prior reasoning summary unavailable)" source in the OpenCode version in use, reproduce across combos/targets/streaming/compaction, classify cause (harness-only / payload lost / no-reasoning model / target mix), and emit safe improvement ordering. |
| Canonical alias normalization | 0176 | Operationalize AGENTS.md rule 7 / `docs/sourceoftruth.md` rule 1: publish **contextual** `normalizeModelForSelectedProvider(selectedProviderId, rawModelId, { allowOpaqueSlashModelId })` (discriminated return; no global `null`), migrate `modelTestRunner` re-prefix and `TraeExecutor` alias strip, add a table-driven boundary contract test (`tests/unit/provider-alias-normalization.boundary.test.ts`) that asserts the upstream-observable dispatch payload for the user-observed inputs (`gc/grok-4.6`, etc.), and add a CI grep guard scoped to **input boundaries** (`src/lib/api/`, `open-sse/handlers/`, `open-sse/executors/`, `open-sse/services/`) so blind `${providerId}/${...}` concatenation outside the helper fails the build. |
| Test discovery and runner integrity | 0177 | Repair or explicitly disposition the four orphaned tests and reconcile unit-runner ownership without silent suppression; make `check:test-discovery` truthful. |
| Structured fetch capture and test isolation | 0178 | Introduce one exception-safe fetch-capture helper and migrate a bounded representative slice without claiming a corpus-wide refactor or measured race. |
| Combo context-capacity fail-soft | 0179 | Classify the observed combined input/output token-capacity 400 as candidate-local across priority, round-robin, and applicable runtime-unit paths, while preserving terminal generic 400 behavior. |
| Shared TLS client core | 0180 | Extract the duplicated native TLS-client lifecycle/timeout/abort/proxy/streaming scaffolding shared by chatgpt/claude/grok/lmarena/perplexity/qwen TLS clients into one shared core with thin provider adapters, preserving provider-specific profiles and fail-closed proxy behavior. |
| MITM forwarding/SSE shared helper | 0181 | Move the repeated MITM intercept forwarding/SSE-piping orchestration onto a protected `MitmHandlerBase` helper (~210 duplicated lines across 7 simple handlers), keeping Antigravity protocol conversion provider-local. |
| CLI setup context helper | 0182 | Extract the six-time-duplicated CLI setup target resolution (remote/context/port/apiKey precedence + `/v1` normalization) into one shared resolver with per-command compatibility adapters. |
| CLI settings route helpers | 0183 | Add typed shared helpers (auth passthrough, JSON body parsing with compatible envelopes, sanitized error builder, mutation preflight) for the ~14 `src/app/api/cli-tools/*/route.ts` settings routes without absorbing per-tool persistence/TOML/secret policies. |
| Media example card shared hook | 0184 | Extract the JSON example-card request lifecycle (running/error/result state, fetch, latency, error extraction, curl snippet) into a typed hook used by the five JSON media cards; keep STT multipart and Music/TTS binary lifecycles separate. |
| Model discovery fallback consolidation | 0185 | Consolidate the repeated no-token and non-OK fallback/error control-flow blocks inside `src/app/api/providers/[id]/models/route.ts` into route-local helpers without merging provider discovery branches or altering terminal status semantics. |
| Grok CLI reasoning high default | 0186 | Generalize `normalizeGrokBuildReasoning` so every non-composer grok-cli model without an explicit effort is dispatched with `reasoning: { effort: "high" }` (today only `grok-4.5` gets the default; `grok-4.6` falls back to the upstream's non-max default), while explicit `low/medium/high` is preserved, explicit `max/xhigh` stays dropped, and `grok-composer-2.5-fast` remains effort-free. |
| Test Suite Mega-Audit | RD-omniroute-test-suite-mega-audit | Read-only research: inventory all test surfaces; classify useless (per eval/EDD + testing-anti-patterns.md criteria), redundant/duplicated, improvement opportunities; **specify** provider + boundary test templates (design docs, NOT code) that share common handlers and account for unification. Produces 6 audit reports under `docs/reports/audits/`. |

## Ordering

1. Task 0138: test identity and attribution.
2. Task 0139: runtime failure classification; depends on Task 0119 review outcome.
3. Task 0143: account-aware breaker eligibility; independent implementation but
   requires runtime regression tests.
4. Tasks 0145–0147 are review hardening follow-ups; they do not reopen the
   completed implementation scope of 0121–0123, except that 0145 blocks final
   approval of 0122 because its core executor coverage is insufficient.
5. Task 0148 is a Cursor follow-up to Task 0120's alias work and must coordinate
   ownership of shared Cursor protobuf/executor files.
6. Task 0149 establishes the shared Grok Build protocol/config contract; Task
   0151 follows it for OAuth/device-code/PKCE integration.
7. Task 0157 is incident-driven resilience hardening. Initial source evidence
   shows 404s are intended to fall through `executeTarget()`; the task adds
   exact account/model regression coverage and traces the reported `Expected
   'id' to be a string` error before changing parser behavior.
8. Task 0160 supersedes the earlier model-identity framing: the reported failure
   affects every Grok CLI model, so connector compatibility is primary and model
   identity is evaluated only after the provider boundary is proven.
9. Task 0161 is a separate follow-up because approved Task 0151 covers
   OmniRoute-managed OAuth/import, not local Grok CLI subprocess/auth-store
   capture.
10. Task 0162 covers all 6 Antigravity divergences; serialized with Antigravity
    executor/signature surfaces.
11. Tasks 0164–0167 cover OpenCode Free/Zen/Go regression and UX gaps; 0164 is
    standalone P0, 0165 blocks 0166 (CLI headers needed for Zen diagnosis).
12. Tasks 0168–0169 cover proxy security UX: 0168 gates proxy behind redaction;
    0169 hardens BYO validation and documents free-pool as non-goal.
13. Tasks 0170-0172 cover Qoder, Trae, and Cursor workflow UX and provider consistency remediation.
14. Task 0173 adds the Freebuff provider connector supporting Device OAuth, 1-hour session admission, and free model access.
15. Task 0174 adds the AIHubMix provider connector as an API key aggregator gateway with free tier model catalog.
16. Task 0175 adds the Enter MaaS provider connector (enter.converge.ai) as an API key aggregator gateway. **It is evidence-gated**: `RD-omniroute-enter-maas-evidence` must be approved (confirmed base URL, contract format, observed catalog, billing note) before the connector seeds any model or fixes any endpoint. The Enter Code CLI browser OAuth flow is explicitly out of scope.
17. `RD-omniroute-enter-maas-evidence` is a read-only evidence/report task (no production code) that produces `docs/reports/enter-maas-evidence.md` and blocks Task 0175.
18. `RD-omniroute-opencode-reasoning-summary-combo-audit` is a read-only research task (no production code) that reproduces and classifies the OpenCode "(prior reasoning summary unavailable)" warning per combo before any reasoning-related implementation change; it also gates speculative changes (no task may extend `requiresReasoningReplay()` or synthesize reasoning summaries until this RD concludes).
19. **Task 0160 re-evaluation (2026-08-16)**: the gate introduced by the approved `grok-cli` provider-compatibility work (local unknown-ID rejection in `src/sse/handlers/chatHelpers.ts:239-247` and `open-sse/executors/grok-cli.ts:295-304`) contradicts the registry's own `passthroughModels: true`. The re-evaluation restores the passthrough contract under the policy **"passthrough pleno + denylist explícita"** and remains **serialized with Task 0176**, which publishes the contextual normalizer that makes the gate removal safe by construction.
20. **Task 0176 (remediation)**: publishes the **contextual** `normalizeModelForSelectedProvider` (single helper that uses `parseModel` + `resolveProviderAlias`, returns a discriminated union, requires caller to declare `allowOpaqueSlashModelId`). Migrates the two known broken call sites (`modelTestRunner.ts:185-193`, `TraeExecutor` regex). Adds a **table-driven boundary contract test** (`tests/unit/provider-alias-normalization.boundary.test.ts`) that asserts the **upstream-observable dispatch payload** for the user-observed inputs (`gc/grok-4.6` etc.) — preventing the "tests passed but provider broken" failure mode. Adds a CI grep guard scoped to input-boundary surfaces (NOT whole codebase, to avoid false positives). This task is the systemic fix for the `prefixA/prefixB/model` shape observed in `grok-cli` (`gc/`), `trae` (`tr/`), and `opencode-zen/free` (`oc/`); future provider connectors inherit the safety by default.
21. **`RD-omniroute-test-suite-mega-audit`**: read-only audit of the whole test suite using the `eval`/EDD + `testing-anti-patterns.md` framework. It inventories every test surface, classifies useless/redundant/duplicated tests (the "tests passed but provider broken" failure mode from Tasks 0160/0176), proposes improvement opportunities, and **specifies** (as design docs, not code) provider + boundary test templates that share common handlers and account for unification FIRST. Output: 6 audit reports under `docs/reports/audits/`. Produces the evidence layer for a future suite-hardening wave; does not implement.
 22. **Task 0177**: follows the mega-audit's P0 discovery finding. It owns the four orphaned component tests, the two unit-glob mismatches, and the canonical runner-discovery contract. It must make `npm run check:test-discovery` pass without deleting or silently suppressing tests.
23. **Task 0178**: follows the mega-audit's bounded P1 isolation finding. It introduces one exception-safe fetch-capture helper and migrates only a representative slice. It must preserve observable payload/response assertions and must not claim that all 2,372 fetch assignments or all DB/temp setup markers were migrated.
 24. **Task 0179**: follows a new operator incident where a model-specific combined input/output token-capacity 400 stopped a combo. It extends the existing Task 0157 context-overflow contract only for a proven capacity signal, covers priority/round-robin/runtime-unit paths, and preserves terminal generic 400 behavior.
25. **Task 0180 (2026-08-18, gitingest dedup family)**: extract the shared TLS-client scaffolding (lazy native client lifecycle, exit hooks, `raceWithTimeout`/hang recovery, abort helpers, proxy resolution, temp-file streaming cleanup, test override) duplicated across the six `*TlsClient.ts` services (~3.6k lines total) into one shared core; per-provider profiles (ChatGPT first-byte timeout, Qwen WAF/`BX_UMIDTOKEN_FALLBACK`, Cloudflare detectors, NDJSON-vs-SSE streaming) remain in thin adapters. Must not regress `tlsClientProxy.ts` fail-closed behavior and must coordinate with Task 0146's Qwen coverage scope.
26. **Task 0181 (gitingest dedup family)**: add a protected `forwardAndPipeSSE()`-style orchestration helper on `MitmHandlerBase` (`base.ts`) used by the seven simple MITM handlers; Antigravity keeps its Gemini conversion and only reuses the generic forwarding tail; completion-hook timing, sanitized error consumption, and header forwarding must stay byte-compatible.
27. **Task 0182 (gitingest dedup family)**: one shared CLI setup target resolver replaces six duplicated blocks in `setup-{continue,crush,cursor,kilo,qwen,roo}.mjs`; exported property names (`apiBase` vs `baseUrl`) stay stable through adapters; root-URL clients (aider/cline/goose) are explicitly out of scope.
28. **Task 0183 (gitingest dedup family)**: shared route helpers for the CLI settings API family only for auth passthrough, JSON parsing (both existing invalid-JSON envelopes preserved), sanitized error building, and preflight orchestration; persistence differences (TOML renderers, secrets, VS Code updates, profile path traversal) remain per-route; Task 0073 sanitization ownership is a coordination dependency.
29. **Task 0184 (gitingest dedup family)**: one typed hook for the JSON example-card request lifecycle across Embedding/Image/Video/WebFetch/WebSearch cards; STT multipart and Music/TTS object-URL/binary lifecycles are NOT folded in; `PlaygroundCard`, `useApiKey`, `useProviderModels`, and `buildCurl` are reused, not duplicated.
30. **Task 0185 (gitingest dedup family)**: consolidate only the proven-repeated no-token/non-OK fallback control-flow blocks in `src/app/api/providers/[id]/models/route.ts` (CSV groups 0906/1239); provider branches and terminal 400/503/504 semantics stay intact; group 1104 stays inline unless a behavior matrix proves equivalence.
31. **Task 0186 (2026-08-18, grok-cli reasoning default)**: operator request — Grok 4.6 without explicit effort behaves sub-par because only `grok-4.5` receives the `high` default in `normalizeGrokBuildReasoning`. The task generalizes the guard to every non-composer grok-cli model (`supportsReasoning: true`), preserves explicit efforts, keeps dropping explicit unsupported efforts (`max`/`xhigh`), and asserts the upstream-observable body in the executor boundary via TDD. **Does NOT fit inside Task 0160** (different scope, review-pending); it is serialized on the same `grok-cli.ts` ownership and reuses 0160/0176 contract tests.

## Non-goals

- No production container restart or mutation.
- No blind provider-specific bypass of circuit breakers.
- No duplicate implementation of the generic empty-stream detector from Task
  0119.
- No claim that an upstream NVIDIA outage is fixed locally without live proof.
