# Task 0173: Freebuff Provider Connector — Delta-Aware Independent Re-Review (Round 9)

## Verdict

**REJECTED — 92/100 — remain in `docs/tasks/02-doing/`**

Promotion status: **not promoted**. The claimed `accountFallback` correction is present and its new unit test passes, but the test does not model the production combo error-extraction path. In the actual combo path, Freebuff's reason is discarded before `checkFallbackError` is called, so the new provider-specific scope/cooldown propagation still does not take effect for real structured Freebuff 429 responses. No application source code was edited by this reviewer.

## Delta from Round 8

| Round 8 finding | Current status | Evidence |
|---|---|---|
| Focused test count | **RESOLVED** | Fresh `node --import tsx/esm --test tests/unit/freebuff-*.test.ts`: **63 tests, 63 passed, 0 failed, 0 skipped**. |
| `checkFallbackError` return shape | **APPLIED / PARTIAL** | `checkFallbackError` now declares optional `scope`; `buildRetryableFallback` accepts explicit cooldown/scope; the configured provider rule branch passes `providerMatch?.cooldownMs` and `providerMatch?.scope`. |
| Provider-specific shared fallback enforcement | **PERSISTENT / REGRESSION IN EVIDENCE QUALITY** | The new test passes a JSON-stringified full body as `errorText`, allowing the matcher to see `ip_capped`/`rate_limited`/`free_mode_capacity_deferred`. Production `extractComboErrorText` passes only the nested error message, while `structuredError` retains only `code` and `type`; the reason is not forwarded. Independent production-shaped probes still return generic 5s behavior and no scope. |
| Strict external schemas | **RESOLVED** | Previously verified strict top-level/nested schemas, alias normalization, and empty-payload rejection remain present and covered. |
| Direct Freebuff admission/chat cooldowns | **RESOLVED** | Previously verified direct 30s/15s/5s responses remain present. |
| Route-level OAuth persistence/runtime proof | **EVIDENCE_GAP / PERSISTENT** | No mocked HTTP-level Freebuff OAuth route test or safe local production runtime/audit packet was added. |
| Repository-wide lint | **PERSISTENT BASELINE** | Fresh aggregate remains **7 errors, 4,149 warnings** across 6,085 files; all seven scoped Freebuff/accountFallback files remain 0/0. |
| Changelog validation | **RESOLVED** | `rebuild.sh validate`: `issues=0 entries=83`. |

## Verification evidence

- `node --import tsx/esm --test tests/unit/freebuff-*.test.ts` — **PASS: 63 tests, 63 passed, 0 failed, 0 skipped**.
- `npm run typecheck:core` — **PASS: exit 0**.
- Scoped ESLint over `accountFallback.ts`, provider rules, Freebuff executor/session/OAuth, registry, and both Freebuff test files — **PASS: 0 errors, 0 warnings**.
- Repository-wide direct ESLint JSON aggregate — **7 errors, 4,149 warnings**, 5 files with errors and 458 with warnings.
- `bash .agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh validate` — **PASS: issues=0 entries=83**.
- LSP diagnostics — `accountFallback.ts`, `freebuff.ts`, `freebuffSession.ts`, and the Freebuff OAuth provider each report **0 diagnostics**.
- Source verification confirms the claimed implementation in `open-sse/services/accountFallback.ts`:
  - return type includes `scope?: "provider" | "connection" | "model"`;
  - `buildRetryableFallback` accepts `explicitCooldownMs` and `explicitScope`;
  - provider-rule branch returns `buildRetryableFallback(reason, providerMatch?.cooldownMs, providerMatch?.scope)`.
- The new unit test is present and passing: `checkFallbackError propagates Freebuff error rule scopes and cooldowns`.
- Independent direct probes using the test's full JSON-string `errorText` return the configured values:
  - `ip_capped` → 30,000ms/provider;
  - `rate_limited` → 15,000ms/connection;
  - `free_mode_capacity_deferred` → 5,000ms/provider.
- Independent production-shaped probes return the generic result:
  - `errorText = "Hourly IP quota reached"`, structured `{code:"rate_limit_exceeded", type:"rate_limit_error"}` → 5,000ms, no scope;
  - `errorText = "Too many concurrent requests"`, same structured metadata → 5,000ms, no scope;
  - `errorText = "Free capacity busy"`, same structured metadata → 5,000ms, no scope and generic `model_capacity` reason.
- No live Codebuff endpoint, credential, production port, or production Docker service was used.

## Findings

### High — provider rule propagation is not connected to the real combo error shape

The expert correctly modified `accountFallback.ts` to propagate `providerMatch?.cooldownMs` and `providerMatch?.scope`, but the new test is not an end-to-end test of the caller contract.

`open-sse/services/combo.ts::extractComboErrorText` parses a structured response and selects `error.message` as `errorText`. For a normal Freebuff structured 429 body such as:

```json
{"error":{"message":"Hourly IP quota reached","type":"rate_limit_error","code":"rate_limit_exceeded","reason":"ip_capped"}}
```

it produces `errorText = "Hourly IP quota reached"`. The subsequent `executeTarget` call builds `structuredError` with only `code` and `type`; it does not include `reason`, and `checkFallbackError` has no body parameter. Consequently `getProviderErrorRuleMatch` cannot match `ip_capped`, `rate_limited`, or `free_mode_capacity_deferred` unless the human-readable message happens to contain the exact rule token. The new unit test instead passes the entire JSON body as `errorText`, which is not what the production caller supplies.

Therefore the implementation is structurally present but runtime enforcement remains incomplete. The actual combo/fallback path still uses the generic 5-second fallback and does not return a scope for these Freebuff responses. This is a **PERSISTENT** Round 8 finding, with a new **evidence-quality regression** because the added test gives a green result without exercising the production-shaped input.

**Required:** preserve the provider reason from the parsed response into `structuredError` or another typed input to `checkFallbackError`, then add a test through the actual combo extraction/caller boundary. Assert all three reasons, exact cooldowns, and scopes using the same nested response shape emitted by `FreebuffExecutor`.

### Medium — route-level OAuth persistence and production-path evidence remain unproven

The generic route and `persistOAuthConnection` helper are present, but no focused HTTP-level Freebuff route test proves that device-code and poll actions persist the normalized token into `provider_connections`, preserve provider identity, and sanitize route-visible failures. No safe local runtime/audit packet proves the composed production entrypoint. This remains an evidence gap for a production-facing provider connector.

### Medium — repository-wide lint remains red outside the task scope

The repository-wide ESLint aggregate remains non-green at 7 errors and 4,149 warnings. The errors are outside the reviewed Freebuff/accountFallback files, so this is treated as a baseline/integration limitation rather than a Freebuff regression. It nevertheless prevents a claim of a fully green repository-level quality gate.

## Score matrix

| Area | Weight | Score | Delta rationale |
|---|---:|---:|---|
| Provider registration, OAuth wiring, and catalog | 20 | 20 | Registration, aliases, endpoints, generic route membership, and six-model catalog remain verified. |
| Device OAuth correctness and boundary safety | 20 | 19 | Strict schemas, aliases, malformed-response failure, and direct redaction pass; route-level persistence/error propagation proof remains absent. |
| Session lifecycle, recovery, and concurrency | 25 | 24 | Lifecycle, recovery, structured admission 429s, direct cooldowns, breaker entrypoint, coalescing, and strict admission shape pass; shared fallback enforcement remains incomplete. |
| Executor request, streaming, and anti-downgrade behavior | 25 | 23 | Headers, metadata, SSE, anti-downgrade signature parity, Composio parity, direct 429 handling, and local rule plumbing pass; actual combo-path reason propagation remains unproven and fails production-shaped probes. |
| Verification and evidence integrity | 10 | 6 | 63 focused tests, typecheck, scoped lint, changelog validation, schema probes, and LSP cleanliness pass; the new shared-fallback test is not production-shaped, repository lint is baseline-red, and route/runtime proof is incomplete. |
| **Total** | **100** | **92** | No score increase: the claimed fix is applied locally but does not close the actual runtime path. |

### Dual-score view

- **Local implementation:** 96/100 — the intended fields and plumbing exist, compile, lint, and pass isolated tests.
- **Runtime enforcement:** 88/100 — direct Freebuff paths work, but the combo caller drops the reason before the shared classifier, and route-level production evidence is absent.
- **Overall:** **92/100**, capped by effective runtime enforcement and evidence integrity.

## Path to 100

1. Carry `reason` from `extractComboErrorText` / the parsed Freebuff error body into the typed `structuredError` contract or pass a validated provider-error body to `checkFallbackError`.
2. Add an actual combo/fallback boundary test with nested Freebuff 429 bodies. Assert `ip_capped` → 30s/provider, `rate_limited` → 15s/connection, and `free_mode_capacity_deferred` → 5s/provider after the same extraction performed by production code.
3. Add mocked HTTP-level OAuth route tests for Freebuff `device-code` and `poll`, including persistence, canonical alias normalization, and sanitized route-visible failures; produce the required safe local runtime/audit evidence if the task gate requires it.
4. Keep the task-scoped gates green and record the unrelated repository-wide ESLint baseline honestly, or clear the repository-level errors if a global green gate is mandatory.

## Final recommendation

Keep Task 0173 in `docs/tasks/02-doing/`. Do not update the Review Trail, update the final review, or move the task to `docs/tasks/03-review/` because the independently verified score is **92/100**, not 100/100.
