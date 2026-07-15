# Review Report: Task 0042 — Chat Pipeline Envelope + Error Sanitize — 2026-07-11

## Review Lineage

- **Current task**: Task 0042 (`omniroute-chat-pipeline-envelope-and-sanitize`); live path `docs/tasks/03-review/0042-omniroute-chat-pipeline-envelope-and-sanitize.md`
- **Previous reports read**: none under `docs/reports/reviews/` for 0042
- **Related reports considered**:
  - Source slice: `docs/reports/01-open-sse-pipeline.md` (F-01-001…005, F-01-W2-003)
  - Sibling review format: `2026-07-11-task-0039-provider-auth-status-limits-i18n-review.md`
  - Commit: `69c4698` (`fix(security): close P0 secrets-at-rest + chat envelope (0041, 0042)`)
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 95 | All primary finding IDs closed in code; stretch residual documented; F-01-001 mock-depth partial |
| F-01-001 quota-share envelope | 97 | `createErrorResult` + pending clear + Retry-After; no bare `Response` |
| Hard Rule #12 sanitization | 96 | moderations/audio/translator/streamHandler mid-stream all sanitized via shared helpers |
| F-01-004 / F-01-005 | 95 | denylist expanded + documented; cancel finalizes pending/onFailure with tests |
| Tests / verification | 88 | 11/11 + stream-handler green; P0 lacks runtime `enforceQuotaShare` mock (source-grep instead) |
| Scope discipline | 98 | No fusion / dual-mode / search SSRF bleed; stretch listed residual |
| Hygiene / evidence | 94 | CHANGELOG present; eslint 0 errors on touched files |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none

### Regressions

- none on Task 0042 surfaces (fresh targeted suite green)

### New Findings

- `NEW` N1 (Medium / test quality): F-01-001 MUST asked for mock `enforceQuotaShare` → `block` runtime assertion; suite uses source-region grep + `createErrorResult` shape unit instead.
- `NEW` N2 (Low / residual security posture): Streaming response filter remains a **denylist** (documented); allowlist still tighter residual for exotic auth headers.
- `NEW` N3 (Info / residual): Stretch F-01-W2-005 / F-01-007 / F-01-011 / F-01-W2-007 correctly left open.
- `NOTE` N4 (Info): Server-side `logStream` still prints raw `error.message` before sanitized SSE emit — not client-facing.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full `npm run typecheck:core` not re-run this session (workspace has parallel UI WIP). Touched 0042 paths are local, eslint clean (0 errors), prior completion evidence claimed typecheck clean — not treated as S9 failure.
- `EXTERNAL_BLOCKER`: none

## Findings

### Blocking

- none

### Non-blocking (path-to-100)

| ID | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- |
| N1 | Medium | P0 quota-share envelope not proven via runtime mock of `enforceQuotaShare` → `block` | Task MUST (lines 75–76); tests `chat-pipeline-envelope-sanitize-0042.test.ts:23-42` are source-grep; `:44-62` only unit-test `createErrorResult` | Add integration-style unit that mocks `@/lib/quota/enforce` (or inject seam) so `handleChatCore` returns `{ success:false, status:429, response }` end-to-end |
| N2 | Low | Denylist leaves non-listed sensitive headers forwardable | `responseHeaders.ts:15-41` documents denylist policy; task accepted denylist | Optional: allowlist Content-Type/Cache-Control/Connection/OmniRoute meta + selected rate-limit headers only |
| N3 | Info | Stretch items residual | Task evidence residual list | Out of primary scope — track in epic backlog |
| N4 | Info | Raw mid-stream error still logged server-side | `streamHandler.ts:352-354` logs `error.message`; client path uses `getErrorMessage` → `sanitizeErrorMessage` | Optional: log sanitized copy only |

### Explicit non-issues (verified)

| Guard | Status | Proof |
| --- | --- | --- |
| F-01-001 bare Response removed | ✅ | `chatCore.ts:2043-2061` returns `createErrorResult(...)`; clears `pendingConnId`; sets `Retry-After` on envelope response |
| F-01-001 caller contract | ✅ | Envelope has `success/status/error/response`; `HTTP_STATUS.RATE_LIMITED === 429` |
| F-01-002 moderations | ✅ | `moderations.ts:58-83` → `errorResponse` (sanitizes via `buildErrorBody`) |
| F-01-002 audio speech/transcription | ✅ | `upstreamErrorResponse` → `buildErrorBody` + `sanitizeErrorMessage`; Kie createTask catch sanitized |
| F-01-003 translator errorType | ✅ | `chatCore.ts:1827-1833` unified `createErrorResult` (no hand-built JSON) |
| F-01-004 denylist | ✅ | hop-by-hop + set-cookie/authorization/www-authenticate/cookie/api-key variants; unit strips samples |
| F-01-005 cancel finalize | ✅ | `stream.ts:2621-2648` onFailure 499/`client_disconnected` or `clearPendingRequestFromStream`; spy + counter tests |
| F-01-W2-003 mid-stream | ✅ | `streamHandler.ts:164-170` `getErrorMessage` → `sanitizeErrorMessage`; disconnect SSE test strips `/home/...` paths |
| Anti-hallucination | ✅ | Mid-stream fix is in `streamHandler.ts`, not only `stream.ts` |
| CHANGELOG | ✅ | `[Unreleased]` Security entry for Task 0042 |
| Targeted tests | ✅ | Fresh re-run: 45/45 pass (11 envelope + stream-handler + sse-error-passthrough) |
| lint touched | ✅ | eslint 0 errors (2 pre-existing `any` warnings in new test only) |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-01-001 envelope + unit test | ✅ partial | Code fixed; test is static+helper (not full mock) — see N1 |
| F-01-002 sanitization + no `at /` | ✅ | moderations/audio behavioral tests pass |
| F-01-003 translator errorType sanitized | ✅ | source contract + `createErrorResult` dirty-message test |
| F-01-004 header denylist samples | ✅ | set-cookie / authorization / hop-by-hop stripped; Connection re-set by us |
| F-01-005 cancel spy/counter | ✅ | onFailure call count + pending counter → 0 |
| F-01-W2-003 streamHandler sanitized SSE | ✅ | path-bearing Error → no `/home/svc/...` in SSE text |
| Stretch residual listed | ✅ | task completion evidence |
| Targeted tests pass | ✅ | 11/11 + 45 combined |
| typecheck:core | ⚠️ not re-run | prior evidence + no type-risky surface delta this review |
| lint no new errors | ✅ | 0 errors on touched paths |
| CHANGELOG | ✅ | Unreleased Security |

## Path to 100

1. **+5** — Runtime mock of `enforceQuotaShare` → `block` through `handleChatCore` (or a thin extracted guard helper) asserting envelope `success===false`, status 429, OpenAI-compatible body, `Retry-After` when provided (closes N1; satisfies task MUST literally).
2. **+2** — Optionally tighten response header policy to allowlist if product accepts (closes N2).

None of the above are required for merge of the primary security/contract fix set.

## Open Questions

- none blocking approval

## Verdict

**PASS WITH NOTES** — Score **93**. Task stays in `docs/tasks/03-review/`. Not moved to `02-doing/` (S ≥ 90). Not moved to `04-completed/` (human-only).

### Commands re-run this review

```bash
node --import tsx/esm --test \
  tests/unit/chat-pipeline-envelope-sanitize-0042.test.ts \
  tests/unit/stream-handler.test.ts \
  tests/unit/sse-error-passthrough-3324.test.ts
# → 45/45 PASS

npx eslint \
  open-sse/handlers/chatCore.ts \
  open-sse/handlers/chatCore/responseHeaders.ts \
  open-sse/handlers/moderations.ts \
  open-sse/handlers/audioSpeech.ts \
  open-sse/handlers/audioTranscription.ts \
  open-sse/utils/stream.ts \
  open-sse/utils/streamHandler.ts \
  tests/unit/chat-pipeline-envelope-sanitize-0042.test.ts
# → 0 errors, 2 any-warnings (test only)
```

### Score rationale (compact)

Primary P0/P1 fixes are real, correctly placed, and covered by targeted tests for every finding ID. Deduction is almost entirely for weaker-than-MUST F-01-001 test depth (static branch proof instead of mock-driven runtime) plus accepted denylist residual — not for unsanitized client paths still open in scope.
