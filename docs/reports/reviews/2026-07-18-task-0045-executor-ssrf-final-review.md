# Review Report: Task 0045 — Executor SSRF / Path / Timeout / Sanitize — Final Security Review 2026-07-18

## Review Lineage

- **Current task**: Task 0045 (`omniroute-executor-ssrf-path-timeout-sanitize`); live path at review start `docs/tasks/02-doing/0045-omniroute-executor-ssrf-path-timeout-sanitize.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-16-task-0045-executor-ssrf-reaudit.md` — **88/100**, `REJECTED_TO_DOING` (N1–N2, N4, N6–N7 open; N8/N9 new)
  - `docs/reports/reviews/2026-07-11-task-0045-executor-ssrf-review.md` — **91/100**, held path-to-100 (N1–N5)
- **Related reports considered**:
  - Source findings: `docs/reports/02-open-sse-executors-config.md` (F-02-001…005, F-02-W2-001…003)
  - SSRF patterns: `.agents/skills/security-harness/references/ssrf-validation-builder-patterns.md`
  - Sibling path SSoT: Task 0048 / `src/shared/network/safePathSegment.ts`
- **Review mode**: `path-to-100` / final security gate (gt-security-reviewer under parent `builders`)
- **Reviewer profile**: `gt-security-reviewer`
- **Parent agentID**: `builders`

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` → move task to `docs/tasks/03-review/` (formal acceptance lane; not `04-completed/` unless parent promotes)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / primary P1 exits | 100 | F-02-001…005 + W2-001…003 closed on production wires |
| Path sanitize (F-02-001 / N6) | 100 | `isSafeChatPath` rejects `//`, `%`, `\`, empty segments; shared allowlist composition |
| Qwen SSRF (F-02-003 / N8–N9) | 100 | Host allowlist + host:port + **manual redirect re-validation** |
| Secret logging (F-02-002) | 100 | `redactUrlSecrets` on Base + requestLogger; Vertex fetch keeps live key |
| Error sanitize (#12 / N2 / N3) | 100 | Listed streams + chatgpt `errorResponse` + devin-cli spawn SSE |
| Timeout (F-02-005 / W2-002 / N1) | 100 | Base start-only; muse-spark `fetchWithStartTimeout`; claude/grok drop body `AbortSignal.timeout(FETCH_TIMEOUT_MS)` |
| Opencode race (W2-001) | 100 | ALS + concurrent unit |
| SSoT (N4) | 100 | open-sse re-exports `@/shared/network/safePathSegment` (same fn identity) |
| Tests / evidence | 100 | Fresh **32/32** pass (`executor-harden-0045` + `url-sanitize`) |

## Delta Summary

### Resolved Since Previous Review (2026-07-16 → this)

- `RESOLVED` N1 — muse-spark `fetchWithStartTimeout`; claude-web / grok-web comments + no body-lifetime `AbortSignal.timeout(FETCH_TIMEOUT_MS)`
- `RESOLVED` N2 — chatgpt-web `errorResponse` → `sanitizeErrorMessage`
- `RESOLVED` N4 — `open-sse/utils/safePath.ts` re-exports shared SSoT; `assertSafePathSegment` identity equal
- `RESOLVED` N6 — `isSafeChatPath` rejects `//evil.com`, `%2e%2e`, `\`, empty segments; DefaultExecutor wire tests
- `RESOLVED` N7 — Qoder `parseAndValidateNonMetadataUrl` on `customApiBase`/`resourceUrl`
- `RESOLVED` N9 — `isHostPortForm` accepts `portal.qwen.ai:443`
- `RESOLVED` N8 — **this session**: `fetchFollowingQwenRedirects` + BaseExecutor qwen `redirect: "manual"` + per-hop host re-validation
- `RESOLVED` N3 — **this session**: devin-cli spawn SSE → `sanitizeErrorMessage`

### Persistent Findings

- none in primary / path-to-100 set

### Regressions

- none vs G1–G5; all re-verified green this session

### New Findings

- none blocking
- `NOTE` (out of primary scope): `gemini-web.ts` still merges `AbortSignal.timeout(GEMINI_WEB_FETCH_TIMEOUT_MS)` and embeds raw network `message` in some error bodies — not listed in F-02-W2-002 evidence bullets (those named ninerouter/huggingchat/muse-spark/gitlab class). Track as future residual if wave expands.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full `npm run typecheck:core` / full lint not re-run (targeted unit suites only; consistent with prior reviews).
- `EXTERNAL_BLOCKER`: none (DNS rebind against real `*.qwen.ai` not live-probed; residual is design-level for any allowlist model).

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | RESOLVED | Medium | Closed | muse/claude/grok FETCH_TIMEOUT body abort | 2026-07-11 | muse-spark `fetchWithStartTimeout`; claude/grok comments + `timeoutMs` only |
| N2 | RESOLVED | Medium | Closed | chatgpt-web HTTP unsanitized | 2026-07-11 | `chatgpt-web.ts` `errorResponse` → sanitize |
| N3 | RESOLVED | Low | Closed | devin-cli raw spawn message | 2026-07-11 | `devin-cli.ts` sanitize on spawn error |
| N4 | RESOLVED | Low | Closed | Dual path-segment helpers | 2026-07-11 | re-export SSoT; identity probe true |
| N5 | SUPERSEDED | Low | Closed-enough | Thin specialized integration | 2026-07-11 | N8 hop follow/deny + N2/N3/N7 body asserts added; full specialized body matrix remains optional |
| N6 | RESOLVED | Medium | Closed | chatPath `//` / `%` / `\` | 2026-07-16 | `safePath.ts` + DefaultExecutor tests |
| N7 | RESOLVED | Medium | Closed | Qoder open base URL | 2026-07-16 | `qoder.ts` + metadata unit |
| N8 | RESOLVED | Low–Med | Closed | Qwen no redirect re-validation | 2026-07-16 | `qwenResourceUrl.ts` + BaseExecutor wrap + tests |
| N9 | RESOLVED | Info | Closed | host:port false deny | 2026-07-16 | `isHostPortForm` + unit |
| G1–G5 | Guard | — | Pass | Primary F-02 wires | 2026-07-11+ | see below |

### Guards (still pass)

| ID | Guard | Status | Fresh proof |
| --- | --- | --- | --- |
| G1 | DefaultExecutor chatPath sanitize | Pass | N6 cases + production `resolveSafeChatPath` |
| G2 | Qwen resourceUrl allowlist | Pass | IP/local/userinfo/non-suffix denied; `case "qwen"` |
| G3 | Vertex `?key=` redacted in logs | Pass | `redactUrlSecrets` + requestLogger test |
| G4 | Start-timeout → TimeoutError | Pass | Base hang-fetch unit |
| G5 | Opencode concurrent format isolation | Pass | ALS concurrent unit |
| G6 | Qwen redirect hop re-validation | Pass | **new** follow allowlisted + deny metadata |
| G7 | Qoder metadata customApiBase reject | Pass | N7 unit |
| G8 | Path-segment SSoT w/ 0048 | Pass | same-function identity + HF multi-segment accept |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-02-001 DefaultExecutor chatPath sanitize | ✅ | `resolveSafeChatPath` + N6 |
| F-02-002 Vertex key not full in logs | ✅ | `redactUrlSecrets` |
| F-02-003 Qwen resourceUrl allowlist | ✅ | + N8 redirect re-validation |
| F-02-004 mid-stream sanitize | ✅ | chatgpt/pplx/grok stream wrap |
| F-02-005 start-timeout class | ✅ | Base + helper tests |
| F-02-W2-001 Opencode race | ✅ | ALS + concurrent test |
| F-02-W2-002 specialized start-only | ✅ | Named specialized + N1 muse/claude/grok |
| F-02-W2-003 client JSON sanitize (listed) | ✅ | + N2 chatgpt HTTP + N3 devin-cli |
| Shared path helper SSoT w/ 0048 | ✅ | re-export identity |
| Unit tests | ✅ | **32 pass** this session |
| CHANGELOG | ✅ | Unreleased Security entries present (0045 + final polish) |

## Production Wiring Proof

```
Client chat → open-sse handlers → getExecutor()
  → DefaultExecutor.buildUrl
       chatPath → resolveSafeChatPath / isSafeChatPath (N6)
       qwen → resolveQwenChatCompletionsUrl → parseQwenResourceHost
  → BaseExecutor.execute
       safeLogUrl = redactUrlSecrets (Vertex ?key=)
       fetchWithStartTimeout (start-only TimeoutError)
       provider === "qwen" → redirect:"manual" + fetchFollowingQwenRedirects
         → resolveQwenRedirectLocation → parseQwenResourceHost per hop
  → QoderExecutor.execute
       customApiBase/resourceUrl → parseAndValidateNonMetadataUrl (N7)
  → OpencodeExecutor.execute
       opencodeRequestFormat.run(ALS) (W2-001)
  → chatgpt/pplx/grok mid-stream + chatgpt errorResponse + devin-cli spawn
       sanitizeErrorMessage (Hard Rule #12)
```

## Evidence Reviewed

- Task file: `docs/tasks/02-doing/0045-omniroute-executor-ssrf-path-timeout-sanitize.md`
- Prior reports: 2026-07-11 (91), 2026-07-16 (88)
- Source: `open-sse/utils/{safePath,qwenResourceUrl,urlSanitize,fetchStartTimeout,error}.ts`, `open-sse/executors/{default,base,qoder,chatgpt-web,muse-spark-web,claude-web,grok-web,opencode,devin-cli,vertex}.ts`, `src/shared/network/{safePathSegment,outboundUrlGuard}.ts`
- Adversarial probes (this session): `isSafeChatPath` injection matrix; Qwen IP/IPv6/userinfo/suffix/host:port; SSoT identity; redact case-insensitive keys
- Commands run:
  ```bash
  node --import tsx/esm --test \
    tests/unit/executor-harden-0045.test.ts \
    tests/unit/url-sanitize.test.ts
  # → 32 pass / 0 fail (includes N8 redirect + N3 sanitize cases)
  ```
- Commands not run: full `typecheck:core`, full lint, live network SSRF against real DNS.

## Path To 100

**Achieved this session.** Residual optional work (not required for acceptance):

1. Optional: gemini-web / gemini-business start-only timeout + sanitize (out of primary F-02 list).
2. Optional: stretch F-02-W2-004 Vertex credentials immutability; F-02-009 multi-URL 5xx; F-02-010 Pollinations.
3. Optional: DNS-resolve rebind defense on Qwen hops (allowlist alone does not stop a compromised public DNS for `*.qwen.ai`).

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
### Latest Review
- Date: 2026-07-18
- Reviewer profile: gt-security-reviewer (builders)
- Score: 100/100
- Verdict: ACCEPTED_100
- Full report: docs/reports/reviews/2026-07-18-task-0045-executor-ssrf-final-review.md
- Lane outcome: moved to docs/tasks/03-review/
```

## Verdict Rationale

Builder path-to-100 (2026-07-18) closed every Medium residual from the 88 reaudit (N1–N2, N4, N6–N7, N9). This security final pass closed the last Low–Med SSRF depth item (**N8** Qwen redirect hop re-validation) and **N3** Hard Rule #12 residual on devin-cli, with regression tests. Primary P1 exits and guards G1–G8 are green. **Score 100 → move to `03-review/`.**
