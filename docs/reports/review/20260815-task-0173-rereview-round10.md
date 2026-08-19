# Task 0173: Freebuff Provider Connector — Delta-Aware Independent Re-Review (Round 10)

## Verdict

**REJECTED — 92/100 — remain in `docs/tasks/02-doing/`**

Promotion status: **not promoted**. Round 10 independently confirms the focused suite and task-scoped gates, but the claimed shared-fallback correction still does not enforce the Freebuff reason/scope contract through the production combo boundary. The newly added extracted-message assertions cover only text that happens to match the current rules; they do not cover the production-shaped `Hourly IP quota reached` and `Free capacity busy` messages, and the parsed `reason` is still discarded before `checkFallbackError`. No application source code was edited by this reviewer.

## Delta from Round 9

| Round 9 finding | Round 10 status | Evidence |
|---|---|---|
| Focused test count | **RESOLVED / CONFIRMED** | Fresh `node --import tsx/esm --test tests/unit/freebuff-*.test.ts`: **63 tests, 63 passed, 0 failed, 0 skipped**. |
| Core typecheck | **RESOLVED / CONFIRMED** | Fresh `npm run typecheck:core`: exit 0. |
| Scoped lint and LSP diagnostics | **RESOLVED / CONFIRMED** | Scoped ESLint over the seven reviewed Freebuff/accountFallback files: **0 errors, 0 warnings**. LSP diagnostics for provider rules, account fallback, executor, session, OAuth provider, and both focused test files: **0 diagnostics**. |
| Changelog validation | **RESOLVED / CONFIRMED** | `rebuild.sh validate`: `issues=0 entries=83`. |
| Provider-specific shared fallback enforcement | **PERSISTENT** | `combo.ts::extractComboErrorText` still returns only nested `error.message`; both combo callers still pass a `structuredError` containing only `code` and `type`. `reason` is not forwarded to `checkFallbackError`. |
| Production-shaped extracted-message behavior | **PERSISTENT / CONFIRMED** | Direct probes using the same extracted message + `{code,type}` shape return: `Hourly IP quota reached` → 5,000ms/no scope; `Admission rate limit reached` → 15,000ms/connection; `Free capacity busy` → 5,000ms with generic `model_capacity`/no scope. Required results are 30s/provider, 15s/connection, and 5s/provider respectively. |
| Added extracted-message test | **PARTIAL / EVIDENCE GAP REMAINS** | The test covers `IP admission cap reached` and `Admission rate limit reached`, which match text rules, but does not cover `Free capacity busy` and does not execute the real `extractComboErrorText` → caller → classifier chain. The full JSON-string test remains non-production-shaped. |
| Route-level OAuth persistence/runtime proof | **EVIDENCE_GAP / PERSISTENT** | No focused HTTP-level Freebuff device-code/poll route test or safe local runtime/audit packet was found in this round. |
| Repository-wide lint | **PERSISTENT BASELINE** | Fresh `npm run lint`: **7 errors, 4,149 warnings** across the repository; task-scoped files remain clean. |

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
- LSP diagnostics for all reviewed Freebuff/accountFallback source and focused test files — **0 diagnostics**.
- Repository-wide `npm run lint` — **FAIL baseline: 7 errors, 4,149 warnings**. The seven errors are in unrelated `visual-reference` files (`App.tsx`, `PrismTree.tsx`, `execution-stream.tsx`, and `usage-analytics.tsx`), not the reviewed task files.
- `open-sse/config/providerErrorRules.ts::buildFreebuffRules` currently recognizes:
  - `free_mode_capacity_deferred`, `capacity deferred`, `capacity_deferred` → provider/5s;
  - `ip_capped`, `ip admission cap`, `ip cap` → provider/30s;
  - `rate_limited`, `rate limit`, `admission rate limit` → connection/15s.
- `open-sse/services/combo.ts::extractComboErrorText` explicitly prefers `error.message`, then top-level `message`/`detail`, and returns the parsed body separately. It does not alter or preserve the nested `error.reason` in a typed classifier input.
- Both `executeTarget` and `handleRoundRobinCombo` construct `structuredError` from only nested `error.code` and `error.type`, then call `checkFallbackError` with the extracted human-readable `errorText`.
- Independent production-shaped probes, using the same effective classifier inputs, returned:

  | Nested Freebuff 429 body | Extracted `errorText` | `structuredError` | Observed result | Required result |
  |---|---|---|---|---|
  | `{error:{message:"Hourly IP quota reached", reason:"ip_capped", code:"rate_limit_exceeded", type:"rate_limit_error"}}` | `Hourly IP quota reached` | `{code,type}` | 5,000ms, no scope, `rate_limit_exceeded` | 30,000ms, provider |
  | `{error:{message:"Admission rate limit reached", reason:"rate_limited", code:"rate_limit_exceeded", type:"rate_limit_error"}}` | `Admission rate limit reached` | `{code,type}` | 15,000ms, connection, `rate_limit_exceeded` | 15,000ms, connection |
  | `{error:{message:"Free capacity busy", reason:"free_mode_capacity_deferred", code:"rate_limit_exceeded", type:"rate_limit_error"}}` | `Free capacity busy` | `{code,type}` | 5,000ms, no scope, `model_capacity` | 5,000ms, provider |

- The current added unit assertions use `IP admission cap reached` and `Admission rate limit reached`. The first returns 30s/provider because it contains the rule's human-readable phrase; this does not prove that the actual `Hourly IP quota reached` production message is recognized. The current test does not assert the `Free capacity busy` production-shaped case.
- No live Codebuff endpoint, credential, production port, or production Docker service was used.

## Findings

### High — provider rule propagation remains disconnected from the real combo error shape

The intended `accountFallback.ts` plumbing is present: provider rule matches can provide explicit cooldown and scope, and `checkFallbackError` can return that scope. However, the real combo boundary still loses the signal needed to select the rule.

`extractComboErrorText` chooses the nested `error.message` for a normal structured Freebuff 429. The two combo callers then reduce the nested error to only `code` and `type`. They do not preserve `reason`, and `checkFallbackError` has no provider-error body/reason parameter beyond those reduced fields. Therefore the configured `ip_capped` and `free_mode_capacity_deferred` rules cannot match when the upstream message is `Hourly IP quota reached` or `Free capacity busy`. The direct rule and full-JSON unit tests remain green because they provide the reason in the input string or body, not because the production caller preserves it.

This is a **PERSISTENT** Round 9 finding, not a resolved correction. Round 10 additionally confirms that the added extracted-message test is too narrow: it verifies only messages already containing a configured textual synonym and omits the capacity case whose cooldown number is generic-correct but whose required provider scope is still absent.

**Required:** preserve and validate the upstream `reason` in the typed combo error contract, or pass the parsed provider error body/reason through to `checkFallbackError`; then add a boundary test that invokes the same extraction and caller shaping as production. Assert all three exact mappings:

- `ip_capped` / `Hourly IP quota reached` → 30,000ms, provider scope;
- `rate_limited` / `Admission rate limit reached` → 15,000ms, connection scope;
- `free_mode_capacity_deferred` / `Free capacity busy` → 5,000ms, provider scope.

### Medium — route-level OAuth persistence and runtime evidence remain unproven

The generic OAuth route and `persistOAuthConnection` helper are present, and direct provider unit tests pass. However, no focused HTTP-level Freebuff route test was independently found that proves device-code and poll actions persist the normalized token into `provider_connections`, preserve the canonical provider identity, and sanitize route-visible failures. No safe local runtime/audit packet proves the composed production entrypoint. This remains an evidence gap for a production-facing provider connector.

### Medium — repository-wide lint remains red outside task scope

The repository-wide lint command remains non-green at 7 errors and 4,149 warnings. The errors are outside the reviewed Freebuff/accountFallback files, so this is treated as a baseline/integration limitation rather than a Freebuff regression. It nevertheless prevents a claim of a fully green repository-level quality gate.

## Score matrix

| Area | Weight | Score | Delta rationale |
|---|---:|---:|---|
| Provider registration, OAuth wiring, and catalog | 20 | 20 | Registration, aliases, endpoints, generic route membership, and six-model catalog remain verified. |
| Device OAuth correctness and boundary safety | 20 | 19 | Strict schemas, aliases, malformed-response failure, direct redaction, typecheck, scoped lint, and LSP cleanliness pass; route-level persistence/error propagation proof remains absent. |
| Session lifecycle, recovery, and concurrency | 25 | 24 | Lifecycle, recovery, structured admission 429s, direct cooldowns, breaker entrypoint, coalescing, and strict admission shape pass; shared combo fallback enforcement remains incomplete. |
| Executor request, streaming, and anti-downgrade behavior | 25 | 23 | Headers, metadata, SSE, anti-downgrade signature parity, Composio parity, direct 429 handling, and local rule plumbing pass; actual combo-path reason propagation remains unproven and fails production-shaped probes. |
| Verification and evidence integrity | 10 | 6 | 63 focused tests, typecheck, scoped lint, changelog validation, schema probes, and LSP cleanliness pass; the newly added shared-fallback assertions remain non-equivalent to the production path, repository lint is baseline-red, and route/runtime proof is incomplete. |
| **Total** | **100** | **92** | No score increase: Round 10 confirms the Round 9 runtime/evidence blocker remains open. |

### Dual-score view

- **Local implementation:** 96/100 — intended fields and rule plumbing exist, compile, lint, and pass isolated tests.
- **Runtime enforcement:** 88/100 — direct Freebuff paths work, but the combo caller drops the provider reason before shared classification; one production-shaped case gets only a generic reason/scope and another gets the generic 5-second cooldown.
- **Overall:** **92/100**, capped by effective runtime enforcement and evidence integrity.

## Path to 100

1. Carry the validated provider `reason` from the parsed combo error body into the typed `structuredError` contract or another explicit input to `checkFallbackError`; do this in both priority and round-robin combo paths.
2. Add a true combo/fallback boundary test with nested Freebuff 429 bodies and the real extraction/caller shaping. Assert `Hourly IP quota reached`/`ip_capped` → 30s/provider, `Admission rate limit reached`/`rate_limited` → 15s/connection, and `Free capacity busy`/`free_mode_capacity_deferred` → 5s/provider.
3. Add mocked HTTP-level OAuth route tests for Freebuff `device-code` and `poll`, including persistence, canonical alias normalization, and sanitized route-visible failures; produce the required safe local runtime/audit evidence if the task gate requires it.
4. Keep task-scoped gates green and record the unrelated repository-wide ESLint baseline honestly, or clear the repository-level errors if a global green gate is mandatory.

## Final recommendation

Keep Task 0173 in `docs/tasks/02-doing/`. Do not update the Review Trail, update the final review, or move the task to `docs/tasks/03-review/` because the independently verified score is **92/100**, not 100/100.
