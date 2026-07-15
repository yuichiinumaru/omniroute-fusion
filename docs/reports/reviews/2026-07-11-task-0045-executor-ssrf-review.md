# Review Report: Task 0045 — Executor SSRF / Path / Timeout / Sanitize — 2026-07-11

## Review Lineage

- **Current task**: Task 0045 (`omniroute-executor-ssrf-path-timeout-sanitize`); live path `docs/tasks/03-review/0045-omniroute-executor-ssrf-path-timeout-sanitize.md`
- **Previous reports read**: none under `docs/reports/reviews/` for 0045
- **Related reports considered**: `docs/reports/02-open-sse-executors-config.md` (F-02-001…005, F-02-W2-001…003); sibling review format `2026-07-11-task-0032-connection-auth-mode-helper-review.md`
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`
- **Commit verified**: `f1c54df` — `fix(sse): harden executors path/SSRF/timeout/sanitize (Task 0045)`

## Score And Verdict

- **Score**: `91/100`
- **Verdict**: `PASS WITH NOTES` / `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 94 | Primary P1 IDs closed on named production paths; CHANGELOG + helpers + tests present |
| Path sanitize (F-02-001) | 96 | DefaultExecutor + BaseExecutor use `resolveSafeChatPath` on live factory path |
| Qwen SSRF (F-02-003) | 95 | Host allowlist, IP/local/userinfo rejected; DefaultExecutor `case "qwen"` wired |
| Secret logging (F-02-002) | 93 | `redactUrlSecrets` on BaseExecutor logs + `requestLogger.logTargetRequest`; Vertex fetch URL still carries real key (correct) |
| Error sanitize (F-02-004 / W2-003) | 88 | Listed stream + HTTP JSON sites fixed; residual chatgpt-web local `errorResponse` + devin-cli |
| Timeout (F-02-005 / W2-002) | 90 | Base + named specialized executors use start-only helper; muse-spark/claude-web/grok residual |
| Opencode race (W2-001) | 97 | ALS isolation + concurrent unit test green |
| Tests / evidence | 90 | 17/17 harden suite + related suites green; weak specialized W2-002/W2-003 integration coverage |
| Scope / SSoT hygiene | 86 | Dual `assertSafePathSegment` (open-sse vs `src/shared/network`) |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none (first review)

### Regressions

- none observed on Task 0045 surfaces (related unit suites green)

### New Findings

- `NEW` N1 (Medium / residual W2-002): `muse-spark-web.ts` still merges `AbortSignal.timeout(FETCH_TIMEOUT_MS)` for the main chat fetch (named as similar path in F-02-W2-002). `claude-web.ts` / `grok-web.ts` same class residual (not primary evidence bullets).
- `NEW` N2 (Medium / Hard Rule #12 residual): `chatgpt-web.ts` local `errorResponse()` does **not** sanitize; HTTP catch paths still pass raw `err.message` (e.g. session exchange / connection failed). Mid-stream F-02-004 site **is** fixed.
- `NEW` N3 (Low / residual F-02-004 evidence): `devin-cli.ts` still embeds raw `err.message` in client SSE JSON (`spawn_failed`).
- `NEW` N4 (Low / hygiene): Two `assertSafePathSegment` helpers — `open-sse/utils/safePath.ts` (weaker denylist) vs `src/shared/network/safePathSegment.ts` (stricter allowlist, used by 0048 audio). Task asked for one shared helper; production 0045 only needs `resolveSafeChatPath`.
- `NEW` N5 (Low / test gap): Harden suite proves helper + BaseExecutor + DefaultExecutor path/Qwen/Opencode; does not assert ninerouter/blackbox/bedrock client bodies or specialized start-only integration.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full `npm run typecheck:core` / `npm run lint` not re-run this session (task claims only pre-existing `combo/runtimeUnits.ts` error). Targeted unit suites re-run green.
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | NEW | Medium | Open (path-to-100) | muse-spark (+ claude/grok web) still full-request FETCH_TIMEOUT abort | this report | `muse-spark-web.ts` ~1254; `claude-web.ts` 463/489/1255; `grok-web.ts` 1767 |
| N2 | NEW | Medium | Open (path-to-100) | chatgpt-web HTTP `errorResponse` unsanitized | this report | `chatgpt-web.ts:2203-2207`, `:2863-2866`, `:3080-3083` |
| N3 | NEW | Low | Open (path-to-100) | devin-cli spawn SSE raw message | this report | `devin-cli.ts:169-173` |
| N4 | NEW | Low | Open (path-to-100) | Dual assertSafePathSegment SSoT | this report | `open-sse/utils/safePath.ts` vs `src/shared/network/safePathSegment.ts` |
| N5 | NEW | Low | Open (path-to-100) | No specialized W2-002/W2-003 integration asserts | this report | `executor-harden-0045.test.ts` helper-focused |
| G1 | — | Guard | Pass | DefaultExecutor production chatPath sanitize | this report | `default.ts:189-201` + tests |
| G2 | — | Guard | Pass | Qwen resourceUrl allowlist on DefaultExecutor | this report | `default.ts:311-313` + `qwenResourceUrl.ts` |
| G3 | — | Guard | Pass | Vertex `?key=` redacted in request logger + Base logs | this report | `urlSanitize.ts:37-68`, `requestLogger.ts:349`, `base.ts:902-903` |
| G4 | — | Guard | Pass | Start-timeout → TimeoutError on BaseExecutor | this report | hang-fetch unit + `isFetchStartTimeoutError` |
| G5 | — | Guard | Pass | Opencode concurrent format isolation | this report | ALS + parallel claude/openai test |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-02-001 DefaultExecutor chatPath sanitize | ✅ | `resolveSafeChatPath` on openai/anthropic-compatible; unsafe → default path |
| F-02-002 Vertex key not in full in logs | ✅ | `redactUrlSecrets`; logTargetRequest spy test |
| F-02-003 Qwen resourceUrl host allowlist | ✅ | `parseQwenResourceHost` rejects private/non-allowlisted; DefaultExecutor throws |
| F-02-004 mid-stream sanitize (chatgpt/pplx/grok) | ✅ | All three wrap stream content with `sanitizeErrorMessage` |
| F-02-005 start-timeout TimeoutError class | ✅ | `fetchWithStartTimeout` rethrows TimeoutError; BaseExecutor TIMEOUT log |
| F-02-W2-001 Opencode format race | ✅ | ALS; concurrent unit test passes |
| F-02-W2-002 specialized start-only timeout | ⚠️ | Named: ninerouter, cliproxyapi, blackbox, huggingchat, gitlab ✅; muse-spark residual |
| F-02-W2-003 client JSON sanitize (listed) | ✅ | bedrock, copilot-web, blackbox, huggingchat, mimocode sanitize |
| Shared path segment helper for 0048 | ⚠️ | Exported from open-sse, but 0048 uses `src/shared/network/safePathSegment.ts` |
| Unit tests under `tests/unit/` | ✅ | `executor-harden-0045.test.ts` 17/17 PASS (fresh) |
| typecheck:core / lint | ⚪ | Not re-run; accepted per task residual claim |
| CHANGELOG Unreleased Security | ✅ | Task 0045 bullet present |

## Production Wiring Proof

```
open-sse/utils/safePath.ts
  resolveSafeChatPath / isSafeChatPath / assertSafePathSegment
    ↑ DefaultExecutor + BaseExecutor (chatPath only)

open-sse/utils/qwenResourceUrl.ts
  resolveQwenChatCompletionsUrl
    ↑ DefaultExecutor case "qwen"

open-sse/utils/urlSanitize.ts::redactUrlSecrets
    ↑ BaseExecutor safeLogUrl
    ↑ requestLogger.logTargetRequest

open-sse/utils/fetchStartTimeout.ts
  fetchWithStartTimeout + isFetchStartTimeoutError
    ↑ BaseExecutor execute
    ↑ ninerouter / cliproxyapi / blackbox-web / huggingchat / gitlab

open-sse/executors/opencode.ts
  AsyncLocalStorage request format around super.execute
```

### Fresh verification commands

```bash
node --import tsx/esm --test tests/unit/executor-harden-0045.test.ts
# → 17 pass, 0 fail

node --import tsx/esm --test tests/unit/url-sanitize.test.ts
# → 9 pass

node --import tsx/esm --test tests/unit/executor-default-base.test.ts
# → 48 pass
```

## Path-to-100 (optional, non-blocking)

1. Migrate muse-spark (and ideally claude-web / grok-web chat fetches) to `fetchWithStartTimeout`.
2. Route chatgpt-web `errorResponse` through `sanitizeErrorMessage` / shared `buildErrorBody`.
3. Sanitize devin-cli spawn client messages.
4. Re-export or delete open-sse `assertSafePathSegment` so one SSoT remains (`src/shared/network/safePathSegment.ts`).
5. Add one integration assert each for a specialized start-timeout executor and a bedrock/copilot JSON sanitize path.

## Verdict rationale

Primary P1 findings named by Task 0045 are closed on the production hot paths with green targeted tests and a correct CHANGELOG entry. Residuals (muse-spark timeout semantics, chatgpt-web HTTP error helper, dual path-segment helpers, thin specialized tests) are real but do not reopen the DefaultExecutor path/SSRF/timeout/Opencode contracts enough to force a return to `02-doing/`.

**Score 91 → stay in `03-review/`.**
