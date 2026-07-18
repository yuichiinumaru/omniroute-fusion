# Review Report: Task 0045 — Executor SSRF / Path / Timeout / Sanitize — Independent Security Return-Review 2026-07-18

## Review Lineage

- **Current task**: Task 0045 (`omniroute-executor-ssrf-path-timeout-sanitize`); live path `docs/tasks/03-review/0045-omniroute-executor-ssrf-path-timeout-sanitize.md`
- **Previous reports read** (UNTRUSTED prior scores — re-proved live):
  - `docs/reports/reviews/2026-07-18-task-0045-executor-ssrf-final-review.md` (claimed 100)
  - `docs/reports/reviews/2026-07-16-task-0045-executor-ssrf-reaudit.md` (**88**, REJECT — N6 `//evil` / `%2e%2e`)
  - `docs/reports/reviews/2026-07-11-task-0045-executor-ssrf-review.md` (91)
- **Source findings**: F-02-001…005, F-02-W2-001…003
- **Review mode**: independent FULL security return-review + **path-to-100** residual close
- **Reviewer profile**: `gt-security-reviewer` (agentID=`reviewers`)
- **Harnesses**: security-harness (validate-egress), code-quality-harness, tsjs

## Score And Verdict

- **Pre path-to-100 independent score**: `97/100` — primary P1 closed; residual whitespace smuggle via `isValidPathSegment.trim()` on chatPath
- **Post path-to-100 score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` — remain `docs/tasks/03-review/`
- **Patches this session**:
  1. `open-sse/utils/safePath.ts` — reject ASCII whitespace/control chars in `isSafeChatPath` (trim-bypass residual)
  2. `tests/unit/executor-harden-0045.test.ts` — guards for `/v1/chat\t`, trailing space, `\n`, `\r`

### Rubric snapshot (post path-to-100)

| Dimension | Score | Notes |
| --- | --- | --- |
| F-02-001 chatPath production wire | 100 | DefaultExecutor + Base `resolveSafeChatPath`; N6 matrix + WS residual closed |
| F-02-002 Vertex key log redaction | 100 | `redactUrlSecrets` + requestLogger |
| F-02-003 Qwen resourceUrl SSRF | 100 | allowlist + host:port + redirect hop re-validation (manual) |
| F-02-004 / W2-003 error sanitize | 100 | listed web streams + chatgpt HTTP + devin-cli |
| F-02-005 / W2-002 timeouts | 100 | start-timeout class + specialized start-only |
| F-02-W2-001 Opencode race | 100 | ALS concurrent unit |
| Path SSoT w/ 0048 | 100 | re-export identity equal to shared `safePathSegment` |
| Tests | 100 | executor-harden + search-ssrf + related **45/45** combined pass this session |

## Adversarial Live Proof (this session)

### isSafeChatPath attack matrix (direct)

| Input | Result |
| --- | --- |
| `//evil.com` | **DENY** |
| `//evil.com/v1` | **DENY** |
| `/%2e%2e`, `/v1/%2e%2e/admin` | **DENY** |
| `/v1/..`, `/v1/../admin`, `/v1/foo..bar` | **DENY** |
| `/v1//chat`, `/v1\chat`, `?`/`#`/`\0` | **DENY** |
| `/v1/chat\t`, `/v1/chat ` (pre-fix was true) | **DENY** post path-to-100 |
| `/v1/chat/completions`, `/v1/models` | **ALLOW** |
| unicode slash / fullwidth dots | **DENY** (allowlist) |

### Qwen resourceUrl

| Input | Result |
| --- | --- |
| IP / localhost / metadata / userinfo / http | **DENY** |
| `portal.qwen.ai`, `:443`, `*.qwen.ai`, `*.aliyuncs.com` | **ALLOW** (product allowlist) |
| Redirect to metadata / evil | **DENY** hop re-validation |
| Relative Location on allowlisted host | **ALLOW** same host |

### Production wires verified

- `default.ts` / `base.ts`: `resolveSafeChatPath(psd?.chatPath)`
- `default.ts` qwen: `resolveQwenChatCompletionsUrl(resourceUrl)`
- `base.ts` qwen: `redirect: "manual"` + `fetchFollowingQwenRedirects`
- Path-segment SSoT: open-sse re-export **same function identity** as `@/shared/network/safePathSegment`

## Findings

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| N6 historical | RESOLVED | Medium | Closed pre-session | `//evil` / `%2e%2e` — re-verified DENY |
| N10 | RESOLVED this session | Low | Closed path-to-100 | chatPath whitespace passed via segment `.trim()` while raw path retained |
| Stretch F-02-W2-004/009/010 | residual | Info | OK | out of primary contract |
| Optional gemini-web | residual | Info | OK | not in primary F-02 list |

## Path-to-100 Applied (reviewer)

```diff
# open-sse/utils/safePath.ts — isSafeChatPath
+ if (/[\s\r\n\t\v\f\u0000-\u001f\u007f]/.test(path)) return false;
```

Regression guards added in `executor-harden-0045.test.ts`.

## Guards (must stay green)

- G1: `//evil.com` / `%2e%2e` / `\` / empty segments rejected
- G2: chatPath whitespace/control rejected
- G3: Qwen allowlist + redirect hop re-validate
- G4: Vertex `?key=` redacted in logs
- G5: start-timeout → TimeoutError
- G6: Opencode concurrent format isolation
- G7: path SSoT identity with 0048
- G8: Hard Rule #12 on listed client error paths

## Lane Outcome

- **S = 100** → stay `03-review/`
- **Path-to-100**: applied (N10 whitespace)

## Review Ledger Entry

- **Date**: 2026-07-18
- **Reviewer**: `gt-security-reviewer` (agentID=`reviewers`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: this file
- **Previous**: `2026-07-18-task-0045-executor-ssrf-final-review.md`, `2026-07-16-task-0045-executor-ssrf-reaudit.md` (88), `2026-07-11-task-0045-executor-ssrf-review.md`
