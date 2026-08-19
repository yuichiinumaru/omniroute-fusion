# Independent Review Report: Task 0160 — Grok CLI provider compatibility

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0160-omniroute-grok-cli-provider-compatibility.md`
- **Review date**: 2026-08-12
- **Mode**: `BUILDER_CONTEXT`; independent reviewer under the operator binary law.
- **Review rule**: `90–100 = APPROVED`; `<90 = REJECTED`.
- **Scope audited**: task and Completion Evidence, the full Where-table source, the current/reference provider registries, matrix definitions, Grok executor/base transport, model resolution, and the focused Grok/OAuth tests.
- **Explicit exclusions honored**: no sub-reviewer/investigator, no `:22000` execution, no git, no changelog tooling, no tasklist sync, no `04-completed/`, and no live provider/OAuth request.
- **Authority**: current source and focused verification outrank the builder's claims when they conflict.

## Score and verdict

### **Score: 78/100 — REJECTED; remains in `docs/tasks/02-doing/`**

The provider matrix and the normal known-model connector contract are substantially covered, but two required safety boundaries are not proven and one is explicitly accepted as failing by the new test: an explicit unknown `grok-cli/<model>` combination is still allowed through the passthrough path, and the mocked upstream-error test permits a credential-shaped token to remain in the response body. These are not cosmetic evidence gaps; they leave the required local-vs-remote classification and sanitized-error contract incomplete.

### Score breakdown

| Dimension | Points | Notes |
|---|---:|---|
| Provider separation and matrix accuracy | 18/20 | Current local registries keep OAuth `grok-cli` separate from API-key `xai`; model sets and endpoints match the reviewed local source. |
| Known-model endpoint/auth/header/target contract | 19/20 | Executor-level and production-path mock cover `/v1/responses`, OAuth/session headers, Responses body, and registered IDs. |
| Defaults, invalid fixture, and alias discipline | 15/15 | Composer fallback is covered; `grok-build` is a negative fixture; `grok-build-0.1` remains under `xai`; no `grok-4.6` alias was invented. |
| Local unknown-ID rejection vs remote rejection | 10/20 | Bare unknown inference rejects, but explicit `grok-cli/grok-build` resolves to an executable provider/model pair because `passthroughModels` is enabled; the focused test only checks unchanged forwarding, not pre-dispatch rejection. |
| Sanitized provider/model-aware errors | 6/15 | Higher-layer `createErrorResult` sanitizes parsed errors, but the focused executor test intentionally accepts a leaked token and does not prove the production 400 path preserves provider/model context while sanitizing the body. |
| Verification status and regression evidence | 10/10 | Fresh focused run passed; core typecheck and scoped ESLint passed. Live availability remains correctly unknown and was not probed. |
| **Total** | **78/100** | **REJECTED** |

## What passed

### Provider/auth/endpoint separation

- `open-sse/config/providers/registry/grok-cli/index.ts` defines provider `grok-cli`, alias `gc`, OAuth auth, specialized `grok-cli` executor, and the two registered IDs `grok-4.5` and `grok-composer-2.5-fast`.
- `open-sse/config/providers/registry/xai/index.ts` defines API-key `xai`, the generic executor, `/v1/chat/completions`, and the separate IDs `grok-4.3` and `grok-build-0.1` (plus its other xAI models).
- `getExecutor("grok-cli")`/`getExecutor("gc")` resolve to `GrokCliExecutor`; `getExecutor("xai")` resolves to `DefaultExecutor`.
- `GrokCliExecutor.buildUrl()` fixes the actual Grok CLI wire endpoint at `https://cli-chat-proxy.grok.com/v1/responses`; the production-path mock observes that URL after OpenAI Chat input is translated to Responses shape.
- `grok-4.5` and Composer are marked `targetFormat: "openai-responses"`. No `grok-4.6` source-backed registry entry or alias was found in the reviewed current/reference source.

### Model/default/fixture coverage

- `transformRequest()` preserves registered model IDs and applies the Composer default when the model is absent/empty.
- The `grok-cli` default fallback is consistently asserted as `grok-composer-2.5-fast`.
- `tests/unit/grok-cli-strip-params.test.ts` no longer treats `grok-build` as a valid registered model; it explicitly preserves the unregistered ID while testing parameter stripping.
- The new matrix asserts `grok-build-0.1` belongs to `xai`, not `grok-cli`, and the current registry satisfies it.

### Verification executed during this review

```text
DATA_DIR=$(mktemp -d) DISABLE_SQLITE_AUTO_BACKUP=true node --import tsx/esm --test \
  tests/unit/grok-cli-provider-compatibility.test.ts \
  tests/unit/grok-cli-strip-params.test.ts \
  tests/unit/grok-cli-responses.test.ts \
  tests/unit/grok-cli-tool-output-sanitization.test.ts \
  tests/unit/grok-cli-oauth.test.ts \
  tests/unit/grok-cli-device-code.test.ts \
  tests/unit/grok-cli-pkce.test.ts \
  tests/unit/grok-cli-cancellation-redaction.test.ts
```

Result: **99 passed, 0 failed**. The run emitted repository SQLite migration/locking diagnostics during module startup, but no focused test failed.

```text
npm run typecheck:core
```

Result: **exit 0**.

```text
npx eslint tests/unit/grok-cli-provider-compatibility.test.ts \
  tests/unit/grok-cli-strip-params.test.ts \
  open-sse/config/providers/registry/grok-cli/index.ts \
  open-sse/config/providers/registry/xai/index.ts \
  open-sse/executors/grok-cli.ts \
  open-sse/config/grokBuild.ts
```

Result: **exit 0; no output/errors**.

## Findings

### F1 — HIGH: explicit unknown `grok-cli/<model>` is not rejected before dispatch

**Evidence**:

- `open-sse/config/providers/registry/grok-cli/index.ts:21` sets `passthroughModels: true`.
- `open-sse/services/model.ts:229-246` only checks registration for provider-model alias decisions; it does not reject an unknown model for a passthrough provider.
- `src/sse/handlers/chatHelpers.ts:238-309` returns a normal executable `{ provider, model, targetFormat }` for an explicit `grok-cli/grok-build` pair.
- A direct local probe returned:

```json
{"provider":"grok-cli","model":"grok-build","sourceFormat":"openai","targetFormat":"openai","extendedContext":false}
```

The same resolver rejects a bare `grok-build`, but that does not satisfy the provider/model-combination requirement for an explicitly selected `grok-cli` provider.

The new compatibility test named `local unknown model ID is not silently remapped or swallowed` (`tests/unit/grok-cli-provider-compatibility.test.ts:226-237`) calls `GrokCliExecutor.transformRequest()` directly and asserts that the unknown ID is forwarded unchanged. That proves no remapping, not local rejection. The `grok-build` negative fixture test has the same limitation: it exercises executor transformation, not the pre-dispatch model resolver.

**Impact**: an operator can select `grok-cli/grok-build`, consume the OAuth/paid dispatch path, and receive a remote error instead of the required bounded local diagnostic identifying provider and model. This also makes the claimed local-vs-remote distinction incomplete.

### F2 — HIGH: the remote-400 sanitization assertion knowingly permits secret leakage

**Evidence**:

- `tests/unit/grok-cli-provider-compatibility.test.ts:274-308` is named as an upstream-error sanitization test but asserts:

```ts
assert.ok(
  text.includes(leakedToken) || text.includes("invalid_request_error"),
  "executor returns the upstream body verbatim; response-body sanitization is a higher-layer boundary..."
);
```

The mocked body explicitly contains `tok_must_not_leak_123`, and the passing assertion permits that token to remain in the returned response.
- `GrokCliExecutor.execute()` returns the upstream `Response` directly. The executor-level boundary therefore does not sanitize the body.
- Higher-layer `chatCore` parsing eventually calls `createErrorResult()`/`buildErrorBody()`, which is a useful defense, but no new production-path test combines: known model, mocked 400 model-not-found, provider/model context, and a secret-shaped body assertion. The only production-path test in the new/related surface is a successful 200 plus a separate 500 token-negative check.
- The task's own matrix line 317 records this as “out-of-scope,” which conflicts with Test Requirements 89–90, the Compliance Checklist's sanitized-error requirement, and Exit Condition 115 (“sanitized errors”).

**Impact**: the reviewed evidence cannot establish the required bounded/sanitized remote error contract. A future caller or route that exposes the executor result directly could leak upstream credential-shaped text, and the test suite would not detect it.

### F3 — MEDIUM: local-vs-remote distinction is asserted only at the wrong layer

The mocked 400 test (`tests/unit/grok-cli-provider-compatibility.test.ts:239-272`) does preserve HTTP 400, which is correct for a known-ID remote rejection. However, it never invokes `resolveModelOrError()`/`handleChatCore` for the local unknown path, and the “local” test does not produce an error at all. The two tests therefore do not form the required paired proof. The report must not claim that the local rejection distinction is complete until the local test returns a bounded 4xx diagnostic and the remote test proves the separate provider/model-aware sanitized result.

## Live availability and unsupported claims

- Read-only live provider/model availability remains **unknown**, as required by the task guardrails. No live request, production credential, or `:22000` execution was used.
- The static source/reference evidence supports the absence of a verified `grok-4.6` alias; no speculative alias was added. This is not live availability proof.
- The focused command, typecheck, and scoped lint are green. The task's choice not to rerun broad repository lint is acceptable only as scoped evidence; it must not be described as repository-wide lint green.

## Exact path to 100

1. **Implement or enforce local provider/model validation** for explicit `grok-cli/<model>` combinations before paid/live dispatch. Keep the two registered IDs source-verified, preserve the default fallback, and return a bounded error that includes both `grok-cli` and the requested model. If passthrough is intentionally retained for a provider capability, add an explicit allowlist/validation boundary for this OAuth Grok CLI provider rather than treating `transformRequest()` forwarding as rejection.
2. **Replace the permissive F2 assertion** with a production-path mock that sends a known registered model to a mocked upstream HTTP 400 `model not found` response containing a token-shaped secret. Assert: status 400, distinct remote/model-unavailable classification, provider/model context, sanitized message/details, and absence of the secret. Do not allow the raw token as an accepted branch.
3. **Add the paired local test** through `resolveModelOrError()` or the real pre-dispatch handler for `grok-cli/grok-build` (and retain the bare unknown case). Assert no `fetch` call occurs and the response is a bounded local diagnostic distinct from the mocked remote 400.
4. **Remove unused imports** (`sanitizeErrorMessage`, `createErrorResult`) from `tests/unit/grok-cli-provider-compatibility.test.ts`, or use them only in assertions that exercise the real response-building boundary; this prevents the test from advertising a sanitization check it does not perform.
5. Re-run the focused suite, `npm run typecheck:core`, and scoped ESLint after the above changes. Preserve the explicit live-availability-unknown statement and do not add `grok-4.6` or move `grok-build-0.1` without new source evidence.

## Reviewer conclusion

Task 0160 is **REJECTED at 78/100** under the operator binary law. The task remains in `docs/tasks/02-doing/`; it must not be promoted to `docs/tasks/03-review/` until F1–F3 are closed with production-path, secret-negative evidence.
