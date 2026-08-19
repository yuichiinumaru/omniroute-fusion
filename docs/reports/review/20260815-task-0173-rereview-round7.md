# Task 0173: Freebuff Provider Connector — Delta-Aware Independent Re-Review (Round 7)

## Verdict

**REJECTED — 86/100 — remain in `docs/tasks/02-doing/`**

Promotion status: **not promoted**. This round independently checked the latest correction claims against the live implementation, the locally indexed Freebuff reference evidence, focused tests, typecheck, lint, changelog validation, and the runtime fallback classification path. No application source code was edited by this reviewer.

The latest corrections are real: focused coverage is now **54/54**, signature parity is independently confirmed at **36/36**, Composio parity is resolved, boundary parsing is present, and the shared provider breaker is reached on Freebuff admission/chat 429 paths. The remaining gaps prevent a 100/100 promotion: the Zod objects are not strict and one error schema still accepts `{}`; compatibility aliases are declared in fallback code but excluded by the raw schemas; and the provider-specific Freebuff rule scopes/cooldowns are not applied by the direct executor 429 path or the generic fallback result.

## Delta from the prior 86/100 review

| Prior finding | Current status | Evidence |
|---|---|---|
| Focused test coverage | **RESOLVED** | Fresh `node --import tsx/esm --test tests/unit/freebuff-*.test.ts`: **54 passed, 0 failed, 0 skipped**. |
| Authoritative signature parity and Composio meta-tools | **RESOLVED** | Live `FREEBUFF_SIGNATURE_TOOL_NAMES` contains **36** names; all four Composio names are present; all five generic names are excluded; no overlap exists. |
| Session admission/chat 429 breaker entrypoint | **RESOLVED for breaker reachability** | `FreebuffExecutor.execute()` calls `recordProviderFailure("freebuff", ...)` for admission `ProviderError` 429 and direct chat 429. Focused tests pass and the prior missing-call finding is closed. |
| Provider-specific error-rule semantics | **PERSISTENT / NOT RESOLVED** | `getProviderErrorRuleMatch("freebuff", ...)` returns the intended matches (`provider/5s`, `provider/30s`, `connection/15s`), but the executor performs only common `recordProviderFailure` and local Retry-After parsing. Fresh `checkFallbackError` probes return **5,000ms for all three reasons**, not the configured 30,000/15,000ms, and no direct executor code consumes `scope` or rule `cooldownMs`. |
| Strict external schemas | **PERSISTENT / PARTIAL** | OAuth/session boundaries use `safeParse` and reject malformed primitives/arrays. However, each `z.object(...)` strips unknown keys rather than rejecting them; `{}` still validates against `FreebuffAdmissionErrorPayloadSchema`; nested error/user objects are also non-strict. |
| Compatibility aliases | **NEW / EVIDENCE GAP** | `requestDeviceCode` contains fallback branches for `authUrl`, `url`, and `hash`, and session admission contains fallback branches for `id`/`session_id`, but the raw schemas reject those responses before the fallback branches run. This compatibility contract is not tested against the authoritative upstream shape. |
| Token redaction | **RESOLVED for direct tested paths** | Existing focused tests and current sanitizers cover direct OAuth/session/executor response paths. Route-level/log-chain propagation remains unproven. |
| Concurrent session coalescing | **RESOLVED** | Same-account/model admission coalesces and rejected in-flight promises are cleaned up; focused concurrency tests pass. |
| Changelog validation | **RESOLVED** | `bash .agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh validate`: `issues=0 entries=83`. |
| Repository-wide lint | **PARTIAL / baseline remains red** | Fresh JSON aggregate: **7 errors, 4,149 warnings**, 5 files with errors and 458 files with warnings. Scoped Freebuff lint is **0 errors, 0 warnings**. |

## Verification evidence

- `node --import tsx/esm --test tests/unit/freebuff-*.test.ts` — **PASS: 54 passed, 0 failed, 0 skipped**.
- `npm run typecheck:core` — **PASS: exit 0**.
- Scoped ESLint on the six Freebuff implementation/test files — **PASS: 0 errors, 0 warnings**.
- Repository-wide ESLint JSON aggregate — **7 errors, 4,149 warnings**; no Freebuff-scoped error or warning.
- `bash .agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh validate` — **PASS: issues=0 entries=83**.
- LSP diagnostics: `freebuff.ts` and `freebuffSession.ts` each report **0 diagnostics**.
- Live signature invariant probe: **36 actual names**, all four Composio meta-tools present, generic/signature overlap empty.
- Schema boundary probes:
  - device `{loginUrl:"x",fingerprintHash:"h",expiresAt:1,extra:"x"}` — **accepted; extra stripped**;
  - poll `{status:"pending",extra:"x"}` — **accepted; extra stripped**;
  - session `{instanceId:"i",expiresAt:1,extra:"x"}` — **accepted; extra stripped**;
  - admission error `{}` — **accepted**;
  - nested admission error unknown key — **accepted; nested extra stripped**;
  - poll `{}` — rejected by refinement.
- Provider-rule probes:
  - direct matcher: capacity deferred → provider/5s; IP capped → provider/30s; rate limited → connection/15s;
  - `checkFallbackError` route: all three → generic rate-limit fallback of 5s, proving configured scope/cooldown is not carried through this path.
- No live Codebuff endpoint, credential, production port, or production Docker service was used.

## Findings

### High — provider-specific scope/cooldown rules are not enforced on the Freebuff executor path

`open-sse/config/providerErrorRules.ts` correctly declares Freebuff matches, but `open-sse/executors/freebuff.ts` does not import or call `getProviderErrorRuleMatch`. Its admission and chat 429 branches call the common `recordProviderFailure` and derive `retry_after` from upstream response data. The generic `checkFallbackError` path does invoke the matcher only for the configured backoff branch, but its return type retains only `reason` and a generic computed cooldown; it does not propagate `ProviderErrorRuleMatch.scope` or the provider rule's explicit `cooldownMs` into the executor/connection/model/provider lock decisions.

Fresh probes show the concrete consequence: direct rule matching yields the configured Freebuff policy (IP-capped 30s provider cooldown; ordinary rate-limited 15s connection cooldown), while `checkFallbackError` returns 5s for all three. Therefore the registry is tested as a standalone classifier, not as an enforced runtime policy. This is a material runtime-enforcement gap for the task's provider-error contract.

### Medium — schemas are validated but not strict external-boundary schemas

`FreebuffDeviceCodeResponseRawSchema`, `FreebuffPollResponseRawSchema`, `FreebuffSessionAdmissionResponseSchema`, and `FreebuffAdmissionErrorPayloadSchema` use `z.object(...)` without `.strict()`. Zod strips undocumented keys by default, so malformed or schema-drifting payloads can appear valid after data loss. `FreebuffAdmissionErrorPayloadSchema.safeParse({})` succeeds because all fields are optional. Nested error/user objects are likewise permissive. The focused tests verify selected required fields and malformed payloads, but do not verify unknown-key rejection, empty admission-error rejection, nested strictness, or schema-preserved aliases.

### Medium — schema/fallback compatibility contract is internally inconsistent

`requestDeviceCode` has fallback code for `authUrl`, `url`, and `hash`, while the raw schema only permits `loginUrl` and `fingerprintHash`. `ensureFreebuffSession` has fallback code for `id` and `session_id`, while `FreebuffSessionAdmissionResponseSchema` only permits `instanceId`. Any upstream response using those aliases is rejected before the fallback logic executes. This is either dead compatibility code or a latent upstream regression. The current tests cover only canonical fields, so compatibility remains unproven.

### Medium — repository-wide lint and runtime evidence remain incomplete

The exact repository lint command is still red because of seven errors and 4,149 warnings across the full repository; the Freebuff files themselves are clean. There is also no mocked route-level OAuth persistence test or production-entrypoint/runtime smoke packet. These are evidence limitations rather than newly observed Freebuff defects, but they prevent perfect verification credit.

## Score matrix

| Area | Weight | Score | Delta rationale |
|---|---:|---:|---|
| Provider registration, OAuth wiring, and catalog | 20 | 20 | Registration, aliases, endpoints, route membership, and six-model catalog remain verified. |
| Device OAuth correctness and boundary safety | 20 | 17 | Safe parsing, malformed-response failure, and direct redaction are present; strict unknown-key behavior, error-schema strictness, alias compatibility, and route-level persistence proof remain incomplete. |
| Session lifecycle, recovery, and concurrency | 25 | 23 | Lifecycle, 428/409/410 recovery, structured admission 429s, breaker entrypoint, and coalescing are present; provider-rule scope/cooldown enforcement and strict admission shape remain incomplete. |
| Executor request, streaming, and anti-downgrade behavior | 25 | 19 | Headers, metadata, SSE, 429 response mapping, complete 36-name signature set, and Composio parity pass; provider-rule application and end-to-end upstream detector/tool-invocation compatibility remain unproven. |
| Verification and evidence integrity | 10 | 7 | 54 focused tests, typecheck, scoped lint, changelog validation, LSP cleanliness, and signature probes pass; full lint remains red and route/runtime evidence is unit-only. |
| **Total** | **100** | **86** | The score remains below the exact 100/100 promotion gate. |

## Path to 100

1. Make every external response schema's intended contract explicit: use `.strict()` where unknown keys are invalid, reject empty error payloads when they are not actionable, and make nested error/user objects strict. If aliases are intentionally supported, include them in the schemas and normalize them before downstream use; otherwise remove the dead fallback branches. Add tests for unknown keys, nested unknown keys, empty payloads, alias forms, and wrong types.
2. Thread `ProviderErrorRuleMatch` through actual Freebuff admission/chat 429 handling and the generic fallback decision. Apply the configured scope (`provider` vs `connection`, and `model` for 409) and explicit cooldowns, or document a deliberate policy conversion with tests asserting the resulting lock state and duration. Test all three 429 reasons on both admission and chat paths.
3. Add route-level mocked OAuth tests proving device-code/poll persistence and sanitized errors, plus a safe local runtime/audit packet if promotion requires runtime evidence.
4. Record the repository-wide lint baseline honestly and keep the Freebuff-scoped lint gate green; resolve unrelated `visual-reference` errors only if a repository-wide green gate is required.

## Final recommendation

The correction pass materially improved Task 0173 and independently closes signature parity, focused-test coverage, coalescing, direct breaker reachability, and changelog validation. It does **not** close strict boundary behavior or provider-specific error-policy enforcement. Keep the task in `docs/tasks/02-doing/`, do not update its Review Trail, and do not move it to `docs/tasks/03-review/` until the score reaches exactly 100/100.
