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

## Non-goals

- No production container restart or mutation.
- No blind provider-specific bypass of circuit breakers.
- No duplicate implementation of the generic empty-stream detector from Task
  0119.
- No claim that an upstream NVIDIA outage is fixed locally without live proof.
