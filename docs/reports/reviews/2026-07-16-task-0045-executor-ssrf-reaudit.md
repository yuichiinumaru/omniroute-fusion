# Review Report: Task 0045 — Executor SSRF / Path / Timeout / Sanitize — Adversarial Re-audit 2026-07-16

## Review Lineage

- **Current task**: Task 0045 (`omniroute-executor-ssrf-path-timeout-sanitize`); live path `docs/tasks/03-review/0045-omniroute-executor-ssrf-path-timeout-sanitize.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0045-executor-ssrf-review.md` — score **91/100**, `PASS WITH NOTES` / held path-to-100 (N1–N5 residuals)
- **Related reports considered**:
  - Source findings: `docs/reports/02-open-sse-executors-config.md` (F-02-001…005, F-02-W2-001…003)
  - SSRF patterns: `.agents/skills/security-harness/references/ssrf-validation-builder-patterns.md` (IPv6 brackets, redirect re-validation, DNS rebind)
  - Sibling path SSoT: Task 0048 / `src/shared/network/safePathSegment.ts`
- **Review mode**: `re-review` (adversarial / independent security re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `88/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Lane recommendation**: `return-to-doing` (S < 90 — move to `docs/tasks/02-doing/` for path-to-100; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / primary P1 exits (letter) | 92 | Named F-02-001…005 + W2-001…003 still closed on DefaultExecutor / Base / Qwen / Opencode / listed streams |
| Adversarial SSRF residual depth | 78 | chatPath `//` + `%2e%2e` still “safe”; Qwen redirect not re-validated; sibling Qoder open base; dual weak/strong path helpers |
| Secret logging (F-02-002) | 93 | `redactUrlSecrets` still on Base + requestLogger; live probe redacts `key` / `token` / userinfo |
| Error sanitize (F-02-004 / W2-003) | 82 | Mid-stream sites still sanitized; chatgpt-web HTTP `errorResponse` still raw `err.message` (PERSISTENT N2) |
| Timeout (F-02-005 / W2-002) | 84 | Base + named specialized OK; muse-spark / claude-web / grok-web still full-request `AbortSignal.timeout(FETCH_TIMEOUT_MS)` |
| Tests / evidence | 91 | Fresh `executor-harden-0045` + `url-sanitize` **26/26** pass; no new integration asserts for residuals |
| Scope / SSoT hygiene | 80 | Dual `assertSafePathSegment` (open-sse denylist vs shared allowlist) still unresolved |

## Delta Summary

### Resolved Since Previous Review

- none — no product remediation landed against path-to-100 items N1–N5 since 2026-07-11.

### Persistent Findings

- `PERSISTENT` N1 (Medium): muse-spark / claude-web / grok-web still merge `AbortSignal.timeout(FETCH_TIMEOUT_MS)` into chat fetch lifetime (F-02-W2-002 residual class).
- `PERSISTENT` N2 (Medium / Hard Rule #12): chatgpt-web local `errorResponse()` still embeds unsanitized `err.message` on session exchange / connection failed paths.
- `PERSISTENT` N3 (Low): devin-cli spawn SSE still embeds raw `err.message` (out of primary list).
- `PERSISTENT` N4 (Low / hygiene): two `assertSafePathSegment` implementations; production chatPath uses weaker open-sse `isSafeChatPath` denylist.
- `PERSISTENT` N5 (Low / test gap): harden suite still helper-focused; no specialized W2-002/W2-003 body asserts.

### Regressions

- none vs 2026-07-11 guards G1–G5 (DefaultExecutor path wire, Qwen allowlist, Vertex redact, start-timeout class, Opencode ALS).

### New Findings (adversarial)

- `NEW` N6 (Medium): `isSafeChatPath` accepts protocol-relative and encoded-traversal forms that the task’s path-sanitize narrative should reject:
  - `//evil.com` → `isSafeChatPath` **true** (string-concat today yields same-host path `…/v1//evil.com`, **not** host switch; `new URL(path, base)` **would** switch host — fragile)
  - `/v1/%2e%2e/admin` → **true** (encoded `..` not decoded before check)
  - `/v1\chat` backslash → **true**
  - Contrast: `src/shared/network/safePathSegment.ts` rejects `%`, `//`, `\` via allowlist — SSoT split is security-relevant, not cosmetic.
- `NEW` N7 (Medium / sibling SSRF class): `open-sse/executors/qoder.ts` still builds `endpointUrl` from `credentials.customApiBase || credentials.resourceUrl` with only `https://` prefixing — **no** host allowlist / private-IP reject. Not OAuth-written like Qwen `resource_url` (operator/config surface), but Bearer is attached; adversarial executor SSRF residual outside named F-02-003 wire.
- `NEW` N8 (Low–Medium): Qwen allowlist validates hostname only; outbound `fetch` follows redirects by default — no hop re-validation (contrast `cursorImages.ts` `redirect: "manual"`). Credential exfil requires compromised allowlisted host redirect target.
- `NEW` N9 (Info / functional): host-only `portal.qwen.ai:443` is misclassified as scheme (`portal.qwen.ai:`) → “https required” (false deny, not bypass).
- `NOTE` N10: `file://`, IPv4/IPv6 literals (incl. bracketed `[::1]` / `::ffff:127.0.0.1`), userinfo, non-allowlisted suffixes — **denied** by live `parseQwenResourceHost` probe.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full `npm run typecheck:core` / full lint not re-run this session (targeted unit suites only).
- `EXTERNAL_BLOCKER`: none (DNS rebind against real `*.qwen.ai` not live-probed; residual is design-level).

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Medium | Open | Web executors full-request FETCH_TIMEOUT | 2026-07-11 | `muse-spark-web.ts:1254`, `claude-web.ts:463/489/1255`, `grok-web.ts:1767` |
| N2 | PERSISTENT | Medium | Open | chatgpt-web HTTP errors unsanitized | 2026-07-11 | `chatgpt-web.ts:2203-2207`, `:2863-2866`, `:3080-3083` |
| N3 | PERSISTENT | Low | Open | devin-cli raw spawn message | 2026-07-11 | prior report |
| N4 | PERSISTENT | Low | Open | Dual path-segment helpers | 2026-07-11 | `open-sse/utils/safePath.ts` vs `src/shared/network/safePathSegment.ts` |
| N5 | PERSISTENT | Low | Open | Thin specialized integration tests | 2026-07-11 | `executor-harden-0045.test.ts` |
| N6 | NEW | Medium | Open | chatPath accepts `//`, `%2e%2e`, `\` | this reaudit | live `isSafeChatPath` probe; `default.ts:190-191` concat |
| N7 | NEW | Medium | Open (sibling) | Qoder customApiBase/resourceUrl open | this reaudit | `qoder.ts:194-205` |
| N8 | NEW | Low–Medium | Open | Qwen no redirect re-validation | this reaudit | allowlist only; default fetch follow |
| N9 | NEW | Info | Open | host:port false deny | this reaudit | scheme regex on `host:port` |
| G1–G5 | Guard | — | Pass | Primary F-02 wires still hold | 2026-07-11 + reverify | see below |

### Guards (still pass)

| ID | Guard | Status | Fresh proof |
| --- | --- | --- | --- |
| G1 | DefaultExecutor chatPath sanitize wire | Pass | `resolveSafeChatPath` on openai/anthropic-compatible + Base |
| G2 | Qwen resourceUrl allowlist | Pass | IP/local/userinfo/non-allowlist denied; `case "qwen"` uses resolver |
| G3 | Vertex `?key=` redacted in logs | Pass | `redactUrlSecrets` live probe + prior wire |
| G4 | Start-timeout → TimeoutError | Pass | suite green |
| G5 | Opencode concurrent format isolation | Pass | suite green |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-02-001 DefaultExecutor chatPath sanitize | ⚠️ letter OK / spirit gap | Production uses `resolveSafeChatPath`; N6 shows denylist incomplete vs claimed “reject path injection” |
| F-02-002 Vertex key not full in logs | ✅ | `redactUrlSecrets` |
| F-02-003 Qwen resourceUrl allowlist | ✅ (with N8 residual) | `qwenResourceUrl.ts` + DefaultExecutor |
| F-02-004 mid-stream sanitize | ✅ | chatgpt/pplx/grok stream wrap sanitize |
| F-02-005 start-timeout class | ✅ | Base + helper tests |
| F-02-W2-001 Opencode race | ✅ | ALS + concurrent test |
| F-02-W2-002 specialized start-only | ⚠️ | Named specialized OK; muse-spark/claude/grok residual (N1) |
| F-02-W2-003 client JSON sanitize (listed) | ✅ listed / ⚠️ chatgpt HTTP residual N2 | |
| Shared path helper SSoT w/ 0048 | ❌ | Dual helpers (N4) |
| Unit tests | ✅ | 26 pass this session (`executor-harden-0045` + `url-sanitize`) |
| CHANGELOG | ✅ | Prior entry (not re-verified for new gaps) |

## Evidence Reviewed

- Task file: `docs/tasks/03-review/0045-omniroute-executor-ssrf-path-timeout-sanitize.md`
- Prior report: `docs/reports/reviews/2026-07-11-task-0045-executor-ssrf-review.md`
- Source: `open-sse/utils/{safePath,qwenResourceUrl,urlSanitize,fetchStartTimeout}.ts`, `open-sse/executors/{default,base,qoder,chatgpt-web,muse-spark-web,claude-web,grok-web}.ts`, `src/shared/network/safePathSegment.ts`
- Commands run:
  ```bash
  # Adversarial helper probes (Qwen / path / redact) — see session transcript
  node --import tsx/esm --test tests/unit/executor-harden-0045.test.ts tests/unit/url-sanitize.test.ts
  # → 26 pass / 0 fail
  ```
- Commands not run: full `typecheck:core`, full lint, live network SSRF against real DNS.

## Path To 100 (blocking for S ≥ 90)

1. **Harden `isSafeChatPath`**: reject paths starting with `//`, containing `\`, containing `%` (or at least `%2e` / `%2f` / `%5c`), and optionally normalize via `path.posix.normalize` before checks. Align with or re-export `src/shared/network/safePathSegment` composition rules. Add unit cases for `//evil.com`, `/%2e%2e/x`.
2. **Sanitize chatgpt-web `errorResponse` callers** through `sanitizeErrorMessage` / `buildErrorBody` (close PERSISTENT N2 / Hard Rule #12).
3. **Migrate muse-spark (minimum) and ideally claude-web/grok-web** chat fetches to `fetchWithStartTimeout` (close N1).
4. **Document or guard Qoder base URL** (N7): either operator-trust note in residual register **or** reuse private-host reject helper before Bearer fetch.
5. Optional path-to-100: Qwen `redirect: "manual"` + re-validate Location; collapse dual `assertSafePathSegment`; one specialized integration assert.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
### Latest Review
- Date: 2026-07-16
- Score: 88/100
- Verdict: REJECTED_TO_DOING
- Full report: docs/reports/reviews/2026-07-16-task-0045-executor-ssrf-reaudit.md
- Lane outcome: returned to doing
```

## Verdict Rationale

Primary letter exits remain green and no regression of G1–G5. Adversarial re-audit **re-scores residual depth**: incomplete chatPath denylist (N6), untouched Medium #12 / timeout residuals (N1–N2), and sibling open base URL (N7) keep security confidence below the hold bar. **Score 88 → return to `02-doing/`** for path-to-100 items 1–3 at minimum.
