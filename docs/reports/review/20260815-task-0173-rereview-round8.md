# Task 0173: Freebuff Provider Connector — Delta-Aware Independent Re-Review (Round 8)

## Verdict

**REJECTED — 92/100 — remain in `docs/tasks/02-doing/`**

Promotion status: **not promoted**. This round independently rechecked the Round 7 correction claims against live source, focused tests, direct schema probes, provider-rule probes, generic fallback behavior, typecheck, lint, changelog validation, and LSP diagnostics. No application source code was edited by this reviewer.

The correction pass closed the Round 7 strict-schema and direct Freebuff cooldown gaps. The remaining non-100 items are production-enforcement and evidence gaps: the shared generic fallback classifier still collapses Freebuff-specific policy to the generic 5-second backoff and does not expose provider-rule scope, and no HTTP-level OAuth route persistence/runtime smoke proof was added. Repository-wide lint also remains baseline-red, although all Freebuff-scoped files are clean.

## Delta from Round 7

| Round 7 finding | Current status | Evidence |
|---|---|---|
| Focused test count | **RESOLVED** | Fresh `node --import tsx/esm --test tests/unit/freebuff-*.test.ts`: **62 tests, 62 passed, 0 failed, 0 skipped**. |
| Strict external schemas | **RESOLVED** | Direct probes show unknown top-level keys rejected, nested unknown keys rejected, empty admission-error payload rejected, empty nested error rejected, and empty poll payload rejected. |
| Compatibility aliases | **RESOLVED** | Device-code aliases `authUrl`/`url`/`hash` and admission aliases `id`/`session_id` parse and normalize to canonical fields. Focused tests pass. |
| Provider-specific cooldowns in Freebuff admission/chat paths | **RESOLVED for direct Freebuff paths** | Direct chat and admission probes return `ip_capped` 30s, `rate_limited` 15s, and `free_mode_capacity_deferred` 5s when no upstream `Retry-After` is present. |
| Provider-specific scope/cooldown through shared generic fallback | **PERSISTENT** | `checkFallbackError(..., "freebuff", ...)` returns the generic 5,000ms backoff for `ip_capped` and `rate_limited`, and also returns generic/model-capacity behavior for `free_mode_capacity_deferred`; it does not carry `ProviderErrorRuleMatch.scope` or explicit `cooldownMs`. |
| Token redaction | **RESOLVED for tested direct paths** | Existing focused redaction tests pass; no route-level propagation proof was added. |
| Concurrent admission coalescing | **RESOLVED** | Focused concurrency and rejection-cleanup tests pass. |
| Repository-wide lint | **PERSISTENT BASELINE** | Fresh direct ESLint aggregate: **7 errors, 4,149 warnings, 6,085 files**; 5 files contain errors and 458 contain warnings. Freebuff implementation, registry, rule, and test files: **0 errors, 0 warnings**. |
| Changelog validation | **RESOLVED** | `rebuild.sh validate`: `issues=0 entries=83`. |
| Route-level OAuth persistence/runtime proof | **EVIDENCE_GAP / PERSISTENT** | The generic persistence helper exists and the provider is wired into the generic route, but no new mocked HTTP-level Freebuff device-code/poll test or sanitized production runtime/audit packet was found in this round. |

## Verification evidence

- `node --import tsx/esm --test tests/unit/freebuff-*.test.ts` — **PASS: 62 tests, 62 passed, 0 failed, 0 skipped**.
- `npm run typecheck:core` — **PASS: exit 0**.
- Scoped/direct ESLint for Freebuff implementation, registry, rule, and tests — **PASS: 0 errors, 0 warnings**.
- Repository-wide direct ESLint JSON aggregate — **7 errors, 4,149 warnings**; no Freebuff-scoped errors/warnings.
- `bash .agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh validate` — **PASS: issues=0 entries=83**.
- LSP diagnostics — `freebuff.ts`, `freebuffSession.ts`, and `freebuff executor` each report **0 diagnostics**.
- Direct schema probes:
  - canonical device payload — accepted;
  - `authUrl`/`url`/`hash` aliases — accepted and normalized;
  - device unknown key — rejected;
  - poll nested unknown key — rejected;
  - poll `{}` — rejected;
  - `id`/`session_id` admission aliases — accepted and normalized;
  - admission unknown key — rejected;
  - admission error `{}` — rejected;
  - nested admission error `{}` and unknown key — rejected.
- Direct provider rule matcher:
  - `ip_capped` → `{scope: provider, cooldownMs: 30000}`;
  - `rate_limited` → `{scope: connection, cooldownMs: 15000}`;
  - `free_mode_capacity_deferred` → `{scope: provider, cooldownMs: 5000}`.
- Direct Freebuff runtime probes without explicit `Retry-After`:
  - chat 429: 30s / 15s / 5s respectively;
  - admission 429: 30s / 15s / 5s respectively.
- Shared `checkFallbackError` probes remain generic (5s for `ip_capped` and `rate_limited`; `model_capacity`/5s for `free_mode_capacity_deferred`), proving the shared combo fallback path is not equivalent to the direct Freebuff response policy.
- No live Codebuff endpoint, credential, production port, or production Docker service was used.

## Findings

### High — shared fallback policy does not enforce Freebuff rule scope/cooldown

`open-sse/config/providerErrorRules.ts` declares Freebuff-specific `scope` and `cooldownMs`, and the direct executor/session paths now consume `cooldownMs` for their structured responses. However, `open-sse/services/accountFallback.ts::checkFallbackError` only uses the provider rule for its `reason`; it then calls the generic `buildRetryableFallback`, which applies the normal 5-second base backoff. Its return type has no provider-rule scope field. The combo callers use this result to pace fallback/exhaustion decisions, so an error traversing the shared fallback path does not preserve the configured 30-second provider cooldown or 15-second connection cooldown.

This is a persistent runtime-enforcement gap, not a standalone registry defect. The Freebuff direct executor contract is now correct, but the shared fallback path remains semantically inconsistent with the provider-rule policy and the task's provider-specific error contract.

**Required:** thread explicit provider-rule policy through shared fallback handling, or document and prove that Freebuff never enters that path. Tests should assert the effective scope and cooldown for all three reasons through the actual combo/fallback entrypoint.

### Medium — route-level OAuth persistence and production-path evidence remain unproven

The generic OAuth route and `persistOAuthConnection` helper are present, but this review still found only provider-level unit tests. There is no focused mocked HTTP-level Freebuff route test proving the actual `device-code` and `poll` actions persist the normalized token into `provider_connections`, preserve the provider identity, and sanitize route-visible failures. No safe local runtime/audit packet proves the composed production entrypoint either. This is an evidence gap rather than a newly observed direct connector failure, but the task is production-facing and the code-quality gate does not award perfect runtime-enforcement credit on isolated provider tests alone.

### Medium — repository-wide lint remains red outside Freebuff scope

The required `npm run lint` command remains non-green at repository scale: 7 errors and 4,149 warnings. The errors are outside all Freebuff implementation/rule/test files, so this is treated as a baseline/integration evidence limitation rather than a Freebuff regression. It nevertheless prevents a claim of a fully green repository-wide quality gate.

## Score matrix

| Area | Weight | Score | Delta rationale |
|---|---:|---:|---|
| Provider registration, OAuth wiring, and catalog | 20 | 20 | Registration, aliases, endpoints, generic route membership, and six-model catalog remain verified. |
| Device OAuth correctness and boundary safety | 20 | 19 | Strict schemas, aliases, malformed-response failure, and direct redaction pass; route-level persistence/error propagation proof remains absent. |
| Session lifecycle, recovery, and concurrency | 25 | 24 | Lifecycle, 428/409/410 recovery, structured admission 429s, direct provider cooldowns, breaker entrypoint, coalescing, and strict admission shape pass; shared fallback scope remains unresolved. |
| Executor request, streaming, and anti-downgrade behavior | 25 | 23 | Headers, metadata, SSE, 429 mapping, complete signature set, Composio parity, direct rule cooldowns, and breaker integration pass; shared fallback policy and true upstream detector compatibility remain unproven. |
| Verification and evidence integrity | 10 | 6 | 62 focused tests, typecheck, scoped lint, changelog validation, schema/runtime probes, and LSP cleanliness pass; repository lint is baseline-red and route/runtime proof is incomplete. |
| **Total** | **100** | **92** | The score is improved from Round 7 but remains below the exact 100/100 promotion gate. |

## Path to 100

1. Integrate `ProviderErrorRuleMatch.scope` and explicit `cooldownMs` into `checkFallbackError` and the effective combo/fallback state updates, or provide a code-grounded proof that Freebuff responses cannot traverse that path. Add end-to-end mocked combo/fallback tests for all three 429 reasons.
2. Add mocked HTTP-level OAuth route tests for Freebuff `device-code` and `poll`, asserting token persistence, provider identity, canonical alias normalization, and sanitized route-visible errors.
3. Produce a safe local runtime/audit packet for the production Freebuff composition/entrypoint if the promotion gate requires runtime enforcement evidence.
4. Keep Freebuff-scoped lint/typecheck/test/changelog gates green; record the unrelated repository-wide ESLint baseline honestly or clear the repository-level errors if a global green gate is required.

## Final recommendation

Keep Task 0173 in `docs/tasks/02-doing/`. Do not update its Review Trail or move it to `docs/tasks/03-review/` until the shared fallback policy and route-level runtime evidence are closed and the score reaches exactly 100/100.
