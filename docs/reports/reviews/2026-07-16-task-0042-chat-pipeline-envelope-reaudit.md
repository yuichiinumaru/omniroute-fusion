# Review Report: Task 0042 — Chat Pipeline Envelope + Error Sanitize — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0042 (`omniroute-chat-pipeline-envelope-and-sanitize`); live path `docs/tasks/03-review/0042-omniroute-chat-pipeline-envelope-and-sanitize.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0042-chat-pipeline-envelope-review.md` — score 93/100, PASS WITH NOTES
- **Related reports considered**:
  - `docs/reports/01-open-sse-pipeline.md` (F-01-001…005, F-01-W2-003)
  - Hard Rule #12 / `docs/security/ERROR_SANITIZATION.md`
- **Review mode**: `re-review` (adversarial security re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers / gt-security-reviewer rigor)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| F-01-001 quota-share envelope | 97 | Still `createErrorResult` + pending clear + Retry-After |
| Hard Rule #12 client paths in scope | 95 | errorType→createErrorResult; moderations/audio; streamHandler sanitize |
| F-01-004 / F-01-005 | 95 | denylist + cancel finalizer intact |
| Residual bypass hunt | 88 | Streaming helper envelope `.error` field still raw; denylist residual |
| Tests | 90 | 45/45 pass; F-01-001 still source-grep not full mock |
| Scope / stretch discipline | 98 | Stretch residual correctly open |

## Delta Summary

### Resolved Since Previous Review

- none (no builder follow-up)

### Persistent Findings

- `PERSISTENT` **N1**: F-01-001 MUST mock of `enforceQuotaShare→block` still not present; static source + `createErrorResult` unit only.
- `PERSISTENT` **N2**: Streaming response filter remains denylist (documented).
- `PERSISTENT` **N3**: Stretch F-01-W2-005 / F-01-007 / F-01-011 / F-01-W2-007 residual.
- `PERSISTENT` **N4**: Server `logStream` still logs raw `error.message` (not client-facing).

### Regressions

- **none**. Re-ran targeted suite **45/45 pass**. Quota-share still envelope; mid-stream still sanitizes.

### New Findings

- `NEW` **N5 (Low)**: `createStreamingErrorResult` (`streamErrorResult.ts:38-41`) puts **raw** `message` on envelope `error` while Response body is sanitized via `buildErrorBody`. Callers that surface `result.error` (not `result.response`) can reintroduce Hard Rule #12 leakage. Stretch F-01-W2-005 remains open; this is the concrete residual.
- `NOTE` **N6**: Translator `errorType` branch **does not** bypass sanitizer — confirmed `createErrorResult` → `buildErrorBody` → `sanitizeErrorMessage`. Dirty stack first-line becomes `"boom"`; path tokens redacted. Prior F-01-003 remains RESOLVED.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full `handleChatCore` mock integration for quota-share still absent (same as prior N1).
- `EXTERNAL_BLOCKER`: none

## Findings

### Blocking

- none

### Non-blocking (path-to-100) — security-impact ranked

| ID | Class | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- | --- |
| N5 | NEW | Low | Streaming error envelope `.error` unsanitized | `streamErrorResult.ts:41` vs body via `buildErrorBody` | Set `error: errorBody.error.message` (mirror `createErrorResult`) |
| N1 | PERSISTENT | Medium (test) | No runtime enforceQuotaShare mock | task MUST; test file static region | Mock seam through handleChatCore |
| N2 | PERSISTENT | Low | Denylist residual exotic headers | `responseHeaders.ts` | Optional allowlist |
| N4 | PERSISTENT | Info | Server log raw mid-stream | `streamHandler.ts` log line | Log sanitized copy |
| N3 | PERSISTENT | Info | Stretch residual | task evidence | Epic backlog |

### Explicit non-issues (re-verified)

| Guard | Status | Proof |
| --- | --- | --- |
| F-01-001 bare Response removed | ✅ | `chatCore.ts:2043-2061` `createErrorResult` |
| F-01-002 media/moderation | ✅ | `errorResponse` / `upstreamErrorResponse` → sanitize |
| F-01-003 errorType path | ✅ | unified `createErrorResult`; live dirty-message probe |
| F-01-004 denylist | ✅ | set-cookie/authorization/hop-by-hop present |
| F-01-005 cancel finalize | ✅ | `stream.ts` cancel → onFailure 499 / clearPending |
| F-01-W2-003 mid-stream | ✅ | `getErrorMessage` → `sanitizeErrorMessage`; tests green |
| Targeted tests | ✅ | **45/45** this reaudit |

## Contract Compliance

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Primary F-01-001…005 + W2-003 | ✅ | code + tests |
| F-01-001 mock depth | ⚠️ partial | same as prior N1 |
| Hard Rule #12 in-scope client paths | ✅ | with N5 residual on streaming envelope field |
| CHANGELOG | ✅ | Unreleased Security Task 0042 |

## Re-run commands (this reaudit)

```bash
node --import tsx/esm --test \
  tests/unit/chat-pipeline-envelope-sanitize-0042.test.ts \
  tests/unit/stream-handler.test.ts \
  tests/unit/sse-error-passthrough-3324.test.ts
# → 45/45 PASS

node --import tsx/esm -e '/* createErrorResult dirty message probe — sanitized */'
```

## Path To 100

1. **+4** — Runtime mock `enforceQuotaShare→block` envelope assertion (N1).
2. **+2** — Sanitize `createStreamingErrorResult` envelope `.error` (N5).
3. **+1** — Optional header allowlist (N2).

## Verdict

**HELD_IN_REVIEW_PATH_TO_100** — Score **92/100**.  
Adversarial re-check of **errorType bypass** and **raw stack paths**: primary client-facing Response bodies remain sanitized; no regression of F-01-001 envelope contract. Residual is test depth + streaming envelope field + accepted denylist/stretch.

**Moved**: no  
**Patched**: no
