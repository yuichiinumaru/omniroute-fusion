# Task 0045: Executor SSRF / Path Sanitize / Secret Logging / Timeouts

> **Status**: `[ ]` Open
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

- [ ] All primary P1 findings closed
- [ ] Shared path segment helper exported if also needed by audio handlers (0048 may import)
- [ ] Unit tests under `tests/unit/` for sanitize/timeout/qwen/vertex redaction
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` — no new errors
- [ ] CHANGELOG.md entry

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** e o report em `docs/reports/02-open-sse-executors-config.md` listado em Source reports: `open-sse/executors/base.ts`, `default.ts` (path + qwen case), `vertex.ts`, web stream error sites (`chatgpt-web`, `perplexity-web`, `grok-web`), opencode executor, `sanitizePath` or equivalent helpers, `FETCH_TIMEOUT_MS` usage, existing executor tests
- [ ] Wire production sanitize on chatPath
- [ ] Redact Vertex key in logs; avoid logging full URL with secrets
- [ ] Allowlist/validate resourceUrl host in DefaultExecutor qwen branch
- [ ] Sanitize stream + JSON error paths in listed executors
- [ ] Fix timeout classification + specialized abort semantics
- [ ] Fix Opencode per-request format state (instance fields / AsyncLocalStorage / clone)
- [ ] Tests + CHANGELOG

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

- [ ] **Doc Accuracy**
- [ ] **Zod Validation** if config schemas change
- [ ] **Security**: SSRF + secrets + #12
- [ ] **Error Sanitization**: mandatory
- [ ] **No Raw SQL**: N/A
- [ ] **Tests**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
- **Finding IDs closed**:
- **Testes**:
- **typecheck / lint**:
- **CHANGELOG**:
- **Agente executor**:
- **Data de conclusão**:

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**:
- **Veredito**:
- **Score**:
- **Notas**:
