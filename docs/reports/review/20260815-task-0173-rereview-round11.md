# Task 0173: Freebuff Provider Connector — Delta-Aware Independent Re-Review (Round 11)

## Verdict

**REJECTED — 97/100 — remain in `docs/tasks/02-doing/`**

Promotion status: **not promoted**. The Round 10 shared-fallback blocker is resolved: the provider rules now match the production-shaped Freebuff messages and provide a provider-scoped default for generic 429s, and fresh probes confirm the required cooldown/scope mappings. The remaining score deductions are the persistent route-level OAuth persistence/runtime evidence gap and the repository-wide lint baseline. No application source code was edited by this reviewer.

## Delta from Round 10

| Round 10 finding | Round 11 status | Evidence |
|---|---|---|
| Provider-specific shared fallback enforcement | **RESOLVED** | `buildFreebuffRules()` now matches `Hourly IP quota reached`, `ip quota`, `Free capacity busy`, and `capacity busy`, and adds `freebuff-429-default` with 5,000ms/provider. `checkFallbackError()` passes the human-readable `errorText` together with structured `code`/`type` context to `getProviderErrorRuleMatch()`, then propagates matched cooldown and scope. |
| Production-shaped extracted-message mappings | **RESOLVED / CONFIRMED** | Fresh probes using the combo-shaped inputs return `Hourly IP quota reached` → 30,000ms/provider; `Admission rate limit reached` → 15,000ms/connection; `Free capacity busy` → 5,000ms/provider; generic 429 → 5,000ms/provider. |
| Added fallback assertions | **RESOLVED / CONFIRMED** | The focused test now asserts the exact hourly-IP, free-capacity, and generic-429 phrases and scopes in addition to the prior full-body and extracted-message cases. |
| Focused test count | **RESOLVED / CONFIRMED** | Fresh `node --import tsx/esm --test tests/unit/freebuff-*.test.ts`: **63 tests, 63 passed, 0 failed, 0 skipped**. |
| Core typecheck | **RESOLVED / CONFIRMED** | Fresh `npm run typecheck:core`: exit 0. |
| Scoped lint and LSP diagnostics | **RESOLVED / CONFIRMED** | Scoped ESLint over the seven reviewed Freebuff/accountFallback files: **0 errors, 0 warnings**. All reviewed files report 0 LSP diagnostics. |
| Changelog validation | **RESOLVED / CONFIRMED** | `rebuild.sh validate`: `issues=0 entries=83`. |
| Route-level OAuth persistence/runtime proof | **EVIDENCE_GAP / PERSISTENT** | The generic route still supports Freebuff in `NO_PKCE_DEVICE_CODE_PROVIDERS` and performs the generic poll upsert, but no Freebuff-specific HTTP-level test was found proving device-code/poll persistence, canonical provider identity, and sanitized route-visible failures. No safe local runtime/audit packet was produced. |
| Repository-wide lint | **PERSISTENT BASELINE** | Fresh `npm run lint`: **7 errors, 4,149 warnings** across the repository; errors are in unrelated `visual-reference` files. |

## Verification evidence

- `node --import tsx/esm --test tests/unit/freebuff-*.test.ts` — **PASS: 63 tests, 63 passed, 0 failed, 0 skipped**.
- `npm run typecheck:core` — **PASS: exit 0**.
- Scoped ESLint over:
  - `open-sse/services/accountFallback.ts`
  - `open-sse/config/providerErrorRules.ts`
  - `open-sse/executors/freebuff.ts`
  - `open-sse/services/freebuffSession.ts`
  - `src/lib/oauth/providers/freebuff.ts`
  - `tests/unit/freebuff-connector.test.ts`
  - `tests/unit/freebuff-session.test.ts`
  — **PASS: 0 errors, 0 warnings**.
- `bash .agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh validate` — **PASS: issues=0 entries=83**.
- LSP diagnostics for the provider rules, fallback classifier, Freebuff executor/session/OAuth provider, and both focused test files — **0 diagnostics**.
- Repository-wide `npm run lint` — **FAIL baseline: 7 errors, 4,149 warnings**. The errors are in unrelated `visual-reference` files (`App.tsx`, `PrismTree.tsx`, `execution-stream.tsx`, and `usage-analytics.tsx`), not the reviewed task files.

### Source verification

`open-sse/config/providerErrorRules.ts::buildFreebuffRules` now contains the following effective ordered rules:

- `free_mode_capacity_deferred`, `capacity deferred`, `capacity_deferred`, `capacity busy`, or generic `capacity` → 5,000ms/provider;
- `ip_capped`, `ip admission cap`, `ip cap`, `ip quota`, or `hourly ip quota` → 30,000ms/provider;
- `rate_limited`, `rate limit`, or `admission rate limit` → 15,000ms/connection;
- `freebuff-429-default` for any remaining HTTP 429 → 5,000ms/provider.

`open-sse/services/accountFallback.ts::checkFallbackError` constructs `bodyContext` from the structured `code`/`type` fields plus the extracted human-readable message, calls `getProviderErrorRuleMatch()`, selects its reason when present, and passes `providerMatch?.cooldownMs` and `providerMatch?.scope` into `buildRetryableFallback()`.

`open-sse/services/combo.ts` still extracts the nested human-readable `error.message` and still supplies only `code`/`type` as structured fields. That is now sufficient for the claimed behavior because the provider rules match the real extracted messages and the default rule covers otherwise unknown Freebuff 429 messages. The provider reason does not need to be retained for these configured phrase/default mappings.

The focused test now includes assertions for:

- `Hourly IP quota reached` → 30,000ms/provider;
- `Free capacity busy` → 5,000ms/provider;
- `Too Many Requests` → 5,000ms/provider;
- prior `IP admission cap reached` → 30,000ms/provider;
- prior `Admission rate limit reached` → 15,000ms/connection;
- full JSON-string inputs for all three named reasons.

### Independent production-shaped probes

Using the same effective `checkFallbackError(429, errorText, ..., "freebuff", ..., structuredError)` shape used by the combo callers:

| Extracted `errorText` | Structured fields | Observed result | Expected | Status |
|---|---|---|---|---|
| `Hourly IP quota reached` | `{code:"rate_limit_exceeded", type:"rate_limit_error"}` | 30,000ms/provider | 30,000ms/provider | **PASS** |
| `Admission rate limit reached` | `{code:"rate_limit_exceeded", type:"rate_limit_error"}` | 15,000ms/connection | 15,000ms/connection | **PASS** |
| `Free capacity busy` | `{code:"rate_limit_exceeded", type:"rate_limit_error"}` | 5,000ms/provider | 5,000ms/provider | **PASS** |
| `Too Many Requests` | `{code:"rate_limit_exceeded", type:"rate_limit_error"}` | 5,000ms/provider | 5,000ms/provider | **PASS** |

`classifyError()` probes with the same provider/body context also return `rate_limit_exceeded` for all four inputs.

No live Codebuff endpoint, credential, production port, or production Docker service was used.

## Findings

### Medium — route-level OAuth persistence and runtime evidence remain unproven

The generic route includes `freebuff` in `NO_PKCE_DEVICE_CODE_PROVIDERS`, calls the provider layer for `device-code` and `poll`, and uses the generic connection upsert path. Direct Freebuff provider tests and generic OAuth route tests exist, but an independent Freebuff-specific HTTP-level route test was not found that proves the complete device-code/poll path persists the normalized token into `provider_connections`, preserves `provider: "freebuff"`, and sanitizes route-visible failures. A safe local runtime/audit packet for the composed production entrypoint is also absent.

This is an **EVIDENCE_GAP**, not a newly observed functional failure. It prevents a perfect production-facing connector score under the review gate's route/runtime proof requirement.

### Medium — repository-wide lint remains red outside task scope

The repository-wide lint command remains non-green at 7 errors and 4,149 warnings. The errors are unrelated to the reviewed Freebuff/accountFallback files, so this is treated as a baseline/integration limitation rather than a Freebuff regression. It nevertheless prevents a claim of a completely green repository-level quality gate.

## Resolved Round 10 finding

The prior high-severity shared-fallback finding is **RESOLVED**. The corrected rule ordering and default rule close the exact production-shaped cases that previously failed:

- the former `Hourly IP quota reached` generic 5-second/no-scope result now matches the IP-quota rule and returns 30 seconds/provider;
- the former `Free capacity busy` generic model-capacity/no-scope result now matches the capacity rule and returns 5 seconds/provider;
- unknown Freebuff 429 text now receives the explicit provider-scoped 5-second default.

The direct combo boundary was not rewritten, but the common classifier now receives enough information from that boundary to make the required decisions, and independent probes reproduce the caller's effective inputs.

## Score matrix

| Area | Weight | Score | Delta rationale |
|---|---:|---:|---|
| Provider registration, OAuth wiring, and catalog | 20 | 20 | Registration, aliases, endpoints, generic route membership, and six-model catalog remain verified. |
| Device OAuth correctness and boundary safety | 20 | 19 | Strict schemas, aliases, malformed-response failure, direct redaction, typecheck, scoped lint, and LSP cleanliness pass; Freebuff-specific route persistence/error proof remains absent. |
| Session lifecycle, recovery, and concurrency | 25 | 25 | Lifecycle, recovery, structured admission 429s, direct and shared cooldowns, breaker entrypoint, coalescing, strict admission shape, and corrected provider fallback scope pass. |
| Executor request, streaming, and anti-downgrade behavior | 25 | 25 | Headers, metadata, SSE, anti-downgrade signature parity, Composio parity, direct 429 handling, and corrected combo-shaped provider rule mappings pass. |
| Verification and evidence integrity | 10 | 8 | Focused tests, production-shaped probes, typecheck, scoped lint, changelog validation, and LSP cleanliness pass; route/runtime proof is incomplete and repository lint remains baseline-red. |
| **Total** | **100** | **97** | Round 10's runtime blocker is closed; persistent route evidence and repository-wide baseline prevent 100/100. |

### Dual-score view

- **Local implementation:** 99/100 — provider rules, fallback propagation, tests, schemas, executor/session behavior, and focused gates are present and green.
- **Runtime enforcement:** 96/100 — production-shaped fallback mappings now work through the shared classifier; the route-level OAuth composition/persistence path remains independently unproven.
- **Overall:** **97/100**, capped by route/runtime evidence and the repository-level lint baseline.

## Path to 100

1. Add mocked HTTP-level tests for Freebuff `GET /api/oauth/freebuff/device-code` and `POST /api/oauth/freebuff/poll`, asserting provider invocation, normalized token persistence/upsert into `provider_connections`, canonical provider identity, and sanitized route-visible failures.
2. Produce a safe local runtime/audit packet for the composed Freebuff OAuth and executor entrypoints, without live Codebuff calls or credentials, if the task's production-facing gate requires runtime evidence.
3. Keep the task-scoped gates green and either document the unrelated repository-wide lint baseline as an accepted external constraint or clear the seven unrelated lint errors if a global green gate is mandatory.

## Final recommendation

Keep Task 0173 in `docs/tasks/02-doing/`. Do not update `docs/reports/review/20260814-task-0173-final-review.md`, do not update the Review Trail, and do not move the task to `docs/tasks/03-review/` because the independently verified score is **97/100**, not 100/100.
