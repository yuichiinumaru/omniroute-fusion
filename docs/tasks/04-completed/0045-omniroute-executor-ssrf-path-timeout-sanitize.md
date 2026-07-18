# Task 0045: Executor SSRF / Path Sanitize / Secret Logging / Timeouts

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🟠 P1
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S6)
> **Action type**: HARDEN + FIX
> **Blocks**: none
> **Depends on**: none (share path helper with 0048 if both land — prefer one `assertSafePathSegment`)
> **Architect-2**: Upgraded 2026-07-11 — concrete module paths for qwen resourceUrl, vertex, web stream errors

---

## Source reports (builder reference)

Primary:
- `docs/reports/02-open-sse-executors-config.md` — F-02-001, F-02-002, F-02-003, F-02-004, F-02-005, F-02-W2-001, F-02-W2-002, F-02-W2-003 (stretch: F-02-W2-004, F-02-009–010)

Also relevant:
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context
- Shared path helper may also serve Task **0048** (audio path segments in `01-open-sse-pipeline.md`)

Hard Rule: **#12**.

---

## Objective

Harden open-sse **executors** against path injection, secret leakage, unsafe outbound URL construction, incorrect timeout classification, and Hard Rule #12 leaks:

1. **F-02-001**: DefaultExecutor production path must apply chatPath sanitization (not only dead/test helper).
2. **F-02-002**: Vertex Express API keys must not appear in full in logs/URLs redacted logs.
3. **F-02-003**: Qwen `resourceUrl` (DefaultExecutor `case "qwen"`) must host-allowlist / SSRF-guard before URL interpolation.
4. **F-02-004 / F-02-W2-003**: Mid-stream and HTTP JSON client errors must sanitize `err.message`.
5. **F-02-005 / F-02-W2-002**: Timeout classification and FETCH_TIMEOUT_MS semantics corrected (start vs full-request).
6. **F-02-W2-001**: OpencodeExecutor singleton race on `_requestFormat` under concurrency.

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-02-001** | P1 | DefaultExecutor ignores chatPath sanitization (production) |
| **F-02-002** | P1 | Vertex Express API keys embedded in URL logged in full |
| **F-02-003** | P1 | Qwen `resourceUrl` without host allowlist |
| **F-02-004** | P1 | Mid-stream client content raw `err.message` |
| **F-02-005** | P1 | Fetch start-timeout rarely classified as TimeoutError |
| **F-02-W2-001** | P1 | OpencodeExecutor `_requestFormat` race |
| **F-02-W2-002** | P1 | Specialized executors treat FETCH_TIMEOUT as full-request abort |
| **F-02-W2-003** | P1 | Client JSON error bodies raw `err.message` |
| Stretch | P2 | F-02-W2-004 Vertex credentials mutate; F-02-009 multi-URL 5xx; F-02-010 Pollinations mutate |

See **Source reports** above for full relative paths.

### Evidence anchors (verified 2026-07-11)

- `open-sse/executors/default.ts:308-310` — `` `https://${resourceUrl || "portal.qwen.ai"}/v1/chat/completions` ``
- `open-sse/executors/vertex.ts` — Express `?key=` URL construction; log risk of full URL
- Stream error embeds: `open-sse/executors/chatgpt-web.ts`, `perplexity-web.ts`, `grok-web.ts` (`[Stream error: ${err.message}]`)
- Contrast already-safe: `firecrawl-fetch.ts`, `tavily-fetch.ts`, `trae.ts` use sanitizers
- Opencode executor singleton `_requestFormat` (report F-02-W2-001)

### Out of scope

- Provider registry dual source of truth full rewrite (F-02-007) unless needed for sanitize wire
- Bedrock `@ts-nocheck` cleanup alone
- Search handler baseUrl SSRF (Task **0048**)

---

## Test Requirements

- MUST: path with `/`, `..`, query separators rejected by production URL builder path used by DefaultExecutor
- MUST: logs/redactors strip Vertex key query material (assert log spy)
- MUST: Qwen resourceUrl to private IP / non-allowlisted host rejected
- MUST: error responses/stream chunks use sanitize helpers (no `at /` stacks) for listed web executors
- MUST: start-timeout maps to TimeoutError classification path
- MUST: concurrent Opencode requests do not cross-contaminate request format (parallel unit test)
- Document intended FETCH_TIMEOUT semantics in code comment + test

---

## Exit Conditions (GDD/TDD)

- [x] All primary P1 findings closed
- [x] Shared path segment helper exported if also needed by audio handlers (0048 may import)
- [x] Unit tests under `tests/unit/` for sanitize/timeout/qwen/vertex redaction
- [x] `npm run typecheck:core` passes (pre-existing unrelated error in `combo/runtimeUnits.ts` only)
- [x] `npm run lint` — no new errors (targeted suites green)
- [x] CHANGELOG.md entry

---

## Details

### What

Subtasks:

- [x] **Ler código existente** e o report em `docs/reports/02-open-sse-executors-config.md` listado em Source reports: `open-sse/executors/base.ts`, `default.ts` (path + qwen case), `vertex.ts`, web stream error sites (`chatgpt-web`, `perplexity-web`, `grok-web`), opencode executor, `sanitizePath` or equivalent helpers, `FETCH_TIMEOUT_MS` usage, existing executor tests
- [x] Wire production sanitize on chatPath
- [x] Redact Vertex key in logs; avoid logging full URL with secrets
- [x] Allowlist/validate resourceUrl host in DefaultExecutor qwen branch
- [x] Sanitize stream + JSON error paths in listed executors
- [x] Fix timeout classification + specialized abort semantics
- [x] Fix Opencode per-request format state (instance fields / AsyncLocalStorage / clone)
- [x] Tests + CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/executors/default.ts` | Modificar — path sanitize + qwen resourceUrl |
| `open-sse/executors/base.ts` | Modificar — timeout/errors |
| `open-sse/executors/vertex.ts` | Modificar — log redaction |
| `open-sse/executors/chatgpt-web.ts` | Modificar — stream error sanitize |
| `open-sse/executors/perplexity-web.ts` | Modificar — stream error sanitize |
| `open-sse/executors/grok-web.ts` | Modificar — stream error sanitize |
| Opencode executor module | Modificar — race |
| Path sanitize helper (new or existing) | Criar/modificar |
| `tests/unit/` | Expandir |
| `CHANGELOG.md` | Entry |

### How

1. Grep `sanitizePath` / `chatPath` to find dead vs live paths.
2. Grep `resourceUrl` and Vertex `?key=` construction.
3. Grep `err.message` in executors.
4. TDD concurrency for Opencode.

### Why

Executors are the last hop to the internet: path injection and open resourceUrl are SSRF-class; logging API keys and raw errors violate security hard rules.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT log live credentials in tests.
> DO NOT widen allowlists to “any https host” for resourceUrl without operator config gate.
> DO NOT break non-Vertex providers when redacting URLs.
> DO NOT invent a separate “qwen executor” for F-02-003 — production path is DefaultExecutor case `"qwen"`.

> [!IMPORTANT]
> First subtask: read existing code. Prefer shared helpers over copy-paste.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**
- [x] **Zod Validation** if config schemas change (N/A)
- [x] **Security**: SSRF + secrets + #12
- [x] **Error Sanitization**: mandatory
- [x] **No Raw SQL**: N/A
- [x] **Tests**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

### Initial (2026-07-11)

- **Arquivos criados/modificados**:
  - Created: `open-sse/utils/safePath.ts`, `open-sse/utils/fetchStartTimeout.ts`, `open-sse/utils/qwenResourceUrl.ts`, `tests/unit/executor-harden-0045.test.ts`
  - Modified: `open-sse/utils/urlSanitize.ts` (`redactUrlSecrets`), `open-sse/utils/requestLogger.ts`, `open-sse/executors/base.ts`, `default.ts`, `opencode.ts`, `chatgpt-web.ts`, `perplexity-web.ts`, `bedrock.ts`, `copilot-web.ts`, `blackbox-web.ts`, `huggingchat.ts`, `mimocode.ts`, `ninerouter.ts`, `cliproxyapi.ts`, `gitlab.ts`, `tests/unit/url-sanitize.test.ts`, `CHANGELOG.md`
- **Finding IDs closed**: F-02-001, F-02-002, F-02-003, F-02-004, F-02-005, F-02-W2-001, F-02-W2-002, F-02-W2-003
- **Testes**: `node --import tsx/esm --test tests/unit/executor-harden-0045.test.ts` (+ related suites) — green
- **CHANGELOG**: Unreleased Security entry for Task 0045
- **Agente executor**: builder (Grok Build subagent)
- **Data de conclusão**: 2026-07-11

### Path-to-100 reaudit close (2026-07-18)

- **Arquivos modificados**:
  - `open-sse/utils/safePath.ts` — re-export path-segment SSoT from `@/shared/network/safePathSegment`; harden `isSafeChatPath` (N6: reject `//`, `\`, `%`, empty segments; compose via shared allowlist)
  - `src/shared/network/safePathSegment.ts` — multi-segment-safe allowlist (shared with 0048); type predicate (no `as string`)
  - `open-sse/executors/chatgpt-web.ts` — `errorResponse` → `sanitizeErrorMessage` (N2 / Hard Rule #12)
  - `open-sse/executors/muse-spark-web.ts` — `fetchWithStartTimeout` (N1); sanitize error bodies
  - `open-sse/executors/claude-web.ts` / `grok-web.ts` — drop body-lifetime `AbortSignal.timeout(FETCH_TIMEOUT_MS)` (N1)
  - `open-sse/executors/qoder.ts` — `parseAndValidateNonMetadataUrl` on `customApiBase`/`resourceUrl` (N7)
  - `open-sse/utils/qwenResourceUrl.ts` — N9: `isHostPortForm` so `portal.qwen.ai:443` is host-only (not scheme false-deny)
  - `tests/unit/executor-harden-0045.test.ts` — N6/N7/N2/N9 guards + HF multi-segment accept
  - `CHANGELOG.md` — Unreleased Security path-to-100 entry
- **Blockers closed this pass**: N6, N2, N1 (muse/claude/grok), N7, N4 (SSoT collapse), N9 (host:port)
- **Residual open (non-blocking / optional)**:
  - Stretch F-02-W2-004 / F-02-009 / F-02-010 unchanged
  - Optional: gemini-web start-only timeout + sanitize (out of primary F-02 list)
- **Testes (exact)**:
  ```text
  node --import tsx/esm --test \
    tests/unit/executor-harden-0045.test.ts \
    tests/unit/search-ssrf-semantic-cache-path-0048.test.ts \
    tests/unit/url-sanitize.test.ts \
    tests/unit/audio-speech-handler.test.ts \
    tests/unit/audio-transcription-handler.test.ts
  → pass (executor-harden includes N6/N7/N2/N9 cases; audio HF happy paths green)
  ```
- **Agente executor**: gt-ts-engineer + gt-ts-expert (builders parent)
- **Data**: 2026-07-18
- **Lane**: later moved to `docs/tasks/03-review/` after final security 100

### Final security path-to-100 (2026-07-18, gt-security-reviewer)

- **Arquivos modificados**:
  - `open-sse/utils/qwenResourceUrl.ts` — `resolveQwenRedirectLocation` + `fetchFollowingQwenRedirects` (N8)
  - `open-sse/executors/base.ts` — qwen path `redirect: "manual"` + hop re-validation wrapper
  - `open-sse/executors/devin-cli.ts` — spawn SSE → `sanitizeErrorMessage` (N3)
  - `tests/unit/executor-harden-0045.test.ts` — N8 follow/deny + N3 sanitize cases
  - `CHANGELOG.md` — Unreleased Security final polish bullet
- **Blockers closed this pass**: N8, N3
- **Testes (exact)**:
  ```text
  node --import tsx/esm --test \
    tests/unit/executor-harden-0045.test.ts \
    tests/unit/url-sanitize.test.ts
  → 32 pass / 0 fail
  ```
- **Score**: **100/100** — ACCEPTED_100
- **Report**: `docs/reports/reviews/2026-07-18-task-0045-executor-ssrf-final-review.md`

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Latest reviewer**: gt-security-reviewer (agentID=`reviewers`, independent return-review)
- **Veredito**: ACCEPTED_100
- **Score**: 100/100 (pre-fix independent 97 → path-to-100 N10)
- **Notas**: Re-proved N6 `//evil`/`%2e%2e`; closed N10 chatPath whitespace/control trim-bypass. Report: `docs/reports/reviews/2026-07-18-task-0045-executor-ssrf-return-review.md`. Lane: stay `03-review/`.
- **Prior (builders final)**: N8 Qwen redirect + N3 devin-cli — `docs/reports/reviews/2026-07-18-task-0045-executor-ssrf-final-review.md`

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `gt-security-reviewer` (agentID=`reviewers`, independent return-review)
- **Score**: `100/100` (pre path-to-100 independent 97 → path-to-100)
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0045-executor-ssrf-return-review.md`
- **Lane outcome**: stay `docs/tasks/03-review/`
- **Task reference**: Task 0045 (`omniroute-executor-ssrf-path-timeout-sanitize`)
- **Patches this pass**:
  - `open-sse/utils/safePath.ts` — reject whitespace/control in `isSafeChatPath` (trim-bypass residual N10)
  - `tests/unit/executor-harden-0045.test.ts` — WS / control regression guards
- **Fresh proof**: N6 `//evil` / `%2e%2e` DENY; Qwen redirect hop DENY metadata; executor-harden + 0048 path suites green

#### Current Open Blockers

- none

#### Remaining residuals (optional / out of contract)

- Stretch F-02-W2-004 / F-02-009 / F-02-010
- Optional gemini-web timeout/sanitize (not in primary F-02 list)

#### Path-to-100 Summary (independent return-review 2026-07-18)

1. ~~Harden `isSafeChatPath` N6 (`//evil`, `%2e%2e`)~~ done (prior)
2. ~~N8 Qwen redirect hop re-validation~~ done (prior)
3. ~~N3 devin-cli sanitize~~ done (prior)
4. ~~N10 chatPath whitespace/control trim-bypass~~ done (this return-review)

#### Regression Guards (must stay green)

- DefaultExecutor/Base `resolveSafeChatPath` production wire (+ N6 + N10 cases)
- Qwen allowlist denies IP/local/userinfo/non-suffix hosts
- Qwen redirect hop re-validation (manual + allowlist)
- `redactUrlSecrets` on Vertex `?key=` logs
- Start-timeout → TimeoutError on BaseExecutor
- Opencode ALS concurrent format isolation
- Qoder metadata customApiBase reject (N7)
- Path-segment SSoT shared with 0048 (HF multi-segment accept)
- chatgpt-web / devin-cli client errors sanitized (Hard Rule #12)
- chatPath whitespace/control rejected (N10)

### Previous Reports

- `2026-07-18` — `100/100` — `docs/reports/reviews/2026-07-18-task-0045-executor-ssrf-return-review.md`
  - **Resolved this pass**: N10 whitespace/control trim-bypass
- `2026-07-18` — `100/100` — `docs/reports/reviews/2026-07-18-task-0045-executor-ssrf-final-review.md`
  - **Resolved this pass**: N8, N3
- `2026-07-16` — `88/100` — `docs/reports/reviews/2026-07-16-task-0045-executor-ssrf-reaudit.md`
  - **Carried into builder fix pass**: N1–N2, N4, N6–N7
  - **Resolved on builder pass**: N1, N2, N4, N6, N7, N9
- `2026-07-11` — `91/100` — `docs/reports/reviews/2026-07-11-task-0045-executor-ssrf-review.md`
  - **Carried forward historically**: N1 timeout residuals, N2 chatgpt #12, N3 devin-cli, N4 dual path helper, N5 thin tests
  - **Regression guard**: G1–G5 primary wires

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
