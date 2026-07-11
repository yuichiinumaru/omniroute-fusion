# Task 0042: Chat Pipeline Result Envelope + Error Sanitization Gaps

> **Status**: `[x]` Ready for review
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S3)
> **Action type**: FIX + HARDEN
> **Blocks**: none
> **Depends on**: none
> **Architect-2**: Upgraded 2026-07-11 — quota-share lines verified; mid-stream path is `streamHandler.ts`; F-01-W2-005 demoted to stretch

---

## Source reports (builder reference)

Primary:
- `docs/reports/01-open-sse-pipeline.md` — F-01-001, F-01-002, F-01-003, F-01-004, F-01-005, F-01-W2-003 (stretch: F-01-W2-005, F-01-007, F-01-011, F-01-W2-007)

Also relevant:
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context
- Search SSRF / semantic cache findings live in the same slice report but are owned by Task **0048**

Hard Rule: **#12**.

---

## Objective

Restore **safe, contract-correct** responses on the open-sse chat/media pipeline:

1. **F-01-001 (P0)**: Quota-share block must return the standard `{ success, status, error?, response }` envelope — never a bare `Response` that collapses to `undefined` at the SSE chat wrapper.
2. Close Hard Rule **#12** gaps: unsanitized upstream/handler/stream errors (F-01-002, F-01-003, F-01-W2-003).
3. Expand streaming **response header denylist** (F-01-004).
4. Finalize pending-request/usage on SSE **cancel** (F-01-005).

Stretch: `createStreamingErrorResult` (F-01-W2-005 P2), `unavailableResponse` (F-01-007), early-stream keepalive (F-01-011), plugin `onRequest` block (F-01-W2-007).

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-01-001** | P0 | Quota-share block returns raw `Response` (breaks `handleChatCore` contract) |
| **F-01-002** | P1 | Unsanitized upstream error bodies (moderations/audio) |
| **F-01-003** | P1 | Translation failure with `errorType` bypasses sanitizer |
| **F-01-004** | P1 | Streaming response header denylist incomplete |
| **F-01-005** | P1 | `createSSEStream` cancel does not finalize pending request |
| **F-01-W2-003** | P1 | Mid-stream disconnect embeds raw `Error.message` |
| Stretch | P2/P3 | F-01-W2-005, F-01-007, F-01-011, F-01-W2-007 |

See **Source reports** above for full relative paths.

### Evidence anchors (verified 2026-07-11)

- `open-sse/handlers/chatCore.ts:2070-2074` — `decision.kind === "block"` returns bare `new Response(...)`
- Callers: `src/sse/handlers/chat.ts` expects `result.success` / `result.response`
- `open-sse/handlers/responsesHandler.ts` also consumes envelope (wrong shape if bare Response)
- Moderations/audio handlers return raw upstream text
- Translator error branch with `errorType` skips `createErrorResult`
- `open-sse/handlers/chatCore/responseHeaders.ts` thin denylist
- `open-sse/utils/stream.ts` cancel only clears idle timer (F-01-005)
- **F-01-W2-003**: `open-sse/utils/streamHandler.ts:163-167,379-431,515-524` — mid-stream `error.message` unsanitized (not only `stream.ts`)

### Out of scope

- Search SSRF / semantic cache (Task **0048**)
- Combo resilience / soft-failure breaker (Task **0043**, includes F-04-001)
- Fusion runtime (03-review)

---

## Test Requirements

- MUST: mock `enforceQuotaShare` → `block` → assert result has `success === false`, status 429 (or product status), and `response` is a Response with OpenAI-compatible error body (not bare Response as sole return)
- MUST: moderations/audio error paths produce messages without stack path markers (`!includes("at /")`)
- MUST: translator `errorType` branch sanitized
- MUST: response header builder strips `set-cookie`, `authorization`, hop-by-hop samples
- MUST: stream cancel invokes pending clear / finalizer (spy or counter)
- MUST: mid-stream error SSE from `streamHandler` path uses sanitized text (absolute path stripped)

---

## Exit Conditions (GDD/TDD)

- [x] F-01-001 fixed with unit test (named e.g. `tests/unit/chat-quota-share-envelope.test.ts` or existing chatCore suite)
- [x] F-01-002, F-01-003, F-01-W2-003 fixed with regression asserts
- [x] F-01-004 denylist expanded (document allowlist vs denylist choice)
- [x] F-01-005 cancel finalization wired
- [x] Stretch items listed as residual if not done
- [x] Targeted tests: `node --import tsx/esm --test tests/unit/<pipeline-envelope-or-stream-sanitize>.test.ts`
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` — no new errors
- [x] CHANGELOG.md entry

---

## Details

### What

Subtasks:

- [x] **Ler código existente** e o report em `docs/reports/01-open-sse-pipeline.md` listado em Source reports: `open-sse/handlers/chatCore.ts` (quota-share + translator errors), `src/sse/handlers/chat.ts` result handling, `open-sse/handlers/responsesHandler.ts`, `open-sse/handlers/moderations.ts`, `audioSpeech.ts`, `audioTranscription.ts`, `chatCore/responseHeaders.ts`, `open-sse/utils/stream.ts` cancel, **`open-sse/utils/streamHandler.ts`** mid-stream errors, `open-sse/utils/error.ts` (`createErrorResult`, `sanitizeErrorMessage`, streaming helpers), existing chat/error unit tests
- [x] Fix quota-share return to `createErrorResult` / envelope
- [x] Route media/moderation upstream errors through sanitizers
- [x] Unify translator error branches
- [x] Expand header denylist (prefer align with hop-by-hop + sensitive set)
- [x] Cancel path finalize
- [x] Sanitize mid-stream / streaming error helpers (`streamHandler.getErrorMessage` + chunk builders)
- [x] Tests + CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/handlers/chatCore.ts` | Modificar — envelope + translator sanitize |
| `open-sse/handlers/chatCore/responseHeaders.ts` | Modificar — denylist |
| `open-sse/handlers/moderations.ts` | Modificar |
| `open-sse/handlers/audioSpeech.ts` | Modificar |
| `open-sse/handlers/audioTranscription.ts` | Modificar |
| `open-sse/utils/stream.ts` | Modificar — cancel |
| `open-sse/utils/streamHandler.ts` | Modificar — mid-stream sanitize (F-01-W2-003) |
| `open-sse/utils/error.ts` | Modificar se helpers incomplete |
| `src/sse/handlers/chat.ts` | Ler — contract consumers |
| `open-sse/handlers/responsesHandler.ts` | Ler — envelope consumers |
| `tests/unit/` | Criar/expandir |
| `CHANGELOG.md` | Entry |

### How

1. Grep all `return new Response` inside `handleChatCore` and fix outliers to envelope.
2. Grep raw `err.message` / upstream body returns in handlers under scope + `streamHandler.ts`.
3. TDD each finding with minimal fixture.

### Why

Quota-share is meant to fail closed; a broken envelope makes enforcement invisible/broken. Unsanitized errors violate Hard Rule #12 across the proxy surface.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT change fusion contracts or dual-mode health logic.
> DO NOT invent error shapes — match existing OpenAI-compatible `error.message` bodies used by `createErrorResult`.
> DO NOT claim stream cancel fixed without a test spy/counter.
> DO NOT claim F-01-W2-003 fixed if only `stream.ts` was edited — mid-stream path is `streamHandler.ts`.

> [!IMPORTANT]
> First subtask: read existing code. Prefer shared helpers over one-off JSON.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**
- [x] **Zod Validation**: N/A unless new fields
- [x] **Security**: Hard Rule #12
- [x] **Error Sanitization**: mandatory
- [x] **No Raw SQL**: N/A
- [x] **Tests with production change**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/handlers/chatCore.ts` — F-01-001 quota-share envelope + F-01-003 translator createErrorResult
  - `open-sse/handlers/chatCore/responseHeaders.ts` — F-01-004 denylist (hop-by-hop + auth/cookie; policy: denylist)
  - `open-sse/handlers/moderations.ts` — F-01-002 errorResponse path
  - `open-sse/handlers/audioSpeech.ts` — F-01-002 buildErrorBody/sanitize
  - `open-sse/handlers/audioTranscription.ts` — F-01-002 + Kie createTask catch
  - `open-sse/utils/stream.ts` — F-01-005 cancel → onFailure(499)/clearPending
  - `open-sse/utils/streamHandler.ts` — F-01-W2-003 sanitizeErrorMessage in getErrorMessage
  - `tests/unit/chat-pipeline-envelope-sanitize-0042.test.ts` — new (11 tests)
  - `tests/unit/stream-handler.test.ts` — multi-line expectations aligned with sanitizer
  - `CHANGELOG.md` — Unreleased Security entry
  - task moved `01-open` → `03-review`
- **Finding IDs closed**: F-01-001, F-01-002, F-01-003, F-01-004, F-01-005, F-01-W2-003
- **Residual / stretch (not done)**: F-01-W2-005 (`createStreamingErrorResult` envelope), F-01-007 (`unavailableResponse`), F-01-011 (early-stream keepalive), F-01-W2-007 (plugin onRequest block), F-01-006 path-segment (out of primary list)
- **Testes**:
  - `node --import tsx/esm --test tests/unit/chat-pipeline-envelope-sanitize-0042.test.ts` → 11/11 pass
  - `node --import tsx/esm --test tests/unit/stream-handler.test.ts tests/unit/chat-pipeline-envelope-sanitize-0042.test.ts tests/unit/sse-error-passthrough-3324.test.ts` → 45/45 pass
- **typecheck / lint**:
  - `npm run typecheck:core` → clean
  - eslint on changed files → 0 errors (2 pre-existing `any` warnings in new test only)
- **CHANGELOG**: `[Unreleased]` → Security → Task 0042 entry
- **Agente executor**: builder (Grok Build subagent)
- **Data de conclusão**: 2026-07-11
- **Pre-commit HEAD (before this commit)**: `718adc7f6c66f29c3a7542fbaa46337219fb61b1`

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**:
- **Veredito**:
- **Score**:
- **Notas**:
