# Task 0048: Search SSRF, Semantic Cache Correctness, Path-Segment Injection

> **Status**: `[x]` Ready for review
> **Priority**: 🟠 P1
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S9)
> **Action type**: HARDEN + FIX
> **Blocks**: none
> **Depends on**: none (optional shared path helper with Task 0045)
> **Architect-2**: Upgraded 2026-07-11 — concrete modules `semanticCache.ts`, `searchCache.ts`, `safeOutboundFetch`

---

## Source reports (builder reference)

Primary:
- `docs/reports/01-open-sse-pipeline.md` — F-01-W2-001, F-01-W2-002, F-01-006, F-01-W2-004 (P2 co-primary)

Also relevant:
- `docs/reports/05-lib-data-auth.md` — stretch F-05-W2-005 (headroom health probe SSRF)
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context
- Chat envelope / Hard Rule #12 pipeline items in the same `01` report are Task **0042**

---

## Objective

Close **client-influenced SSRF**, **cache poisoning/mismatch**, and **path injection** on pipeline utilities:

1. **F-01-W2-001**: Search `provider_options.baseUrl` (and bare `fetch`) must not allow arbitrary SSRF / API-key exfiltration to attacker hosts.
2. **F-01-W2-002**: Semantic cache signature must include tools/format (and other material fields); hits must not always emit wrong OpenAI-shaped bodies for non-OpenAI clients.
3. **F-01-006**: Path-segment validation must reject `/`, `\`, query/fragment separators (audio speech/transcription path builders).
4. **F-01-W2-004 (P2 co-primary)**: Search result cache key must include `provider_options` (incl. baseUrl) so different destinations do not share hits — same surface as W2-001.

Stretch: headroom health probe SSRF (F-05-W2-005).

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-01-W2-001** | P1 | Client-controlled search `baseUrl` + bare `fetch` = SSRF |
| **F-01-W2-002** | P1 | Semantic cache signature omits tools/format; wrong body shape on hit |
| **F-01-006** | P1 | Path-segment validation allows URL path injection |
| **F-01-W2-004** | P2 | Search cache key ignores `provider_options` (co-primary) |
| Stretch | P2 | F-05-W2-005 headroom probe SSRF |

See **Source reports** above for full relative paths.

### Evidence anchors (verified 2026-07-11)

- `open-sse/handlers/search.ts:258-260` — `resolveSearchBaseUrl` prefers client `baseUrl`
- `open-sse/handlers/search.ts` — bare `fetch` on commercial paths; Z.AI MCP uses guarded fetch
- `src/app/api/v1/search/route.ts` — passes `provider_options` through
- Prefer `src/shared/network/safeOutboundFetch.ts` for outbound policy
- `src/lib/semanticCache.ts:119-131` — signature omits tools/format
- `open-sse/handlers/chatCore/semanticCache.ts` — hit always OpenAI-shaped SSE/JSON
- `open-sse/services/searchCache.ts:36-55` — cache key omits provider_options
- Audio path segments: `audioSpeech.ts` / `audioTranscription.ts`

### Out of scope

- Executor resourceUrl (Task **0045**)
- openapi/try proxy (Task **0040**)
- Combo cache/dedup fields (F-03-007 stretch elsewhere)

---

## Test Requirements

- MUST: search with `baseUrl` pointing at `http://127.0.0.1` / link-local / non-allowlisted host rejected for commercial providers (or ignored in favor of registry base)
- MUST: self-hosted exceptions (e.g. searxng) explicitly gated and documented
- MUST: semantic cache key differs when tools array present vs absent; when response format differs
- MUST: cache hit preserves client-expected format path or is skipped when format mismatch
- MUST: search cache entries for different baseUrl/options do not collide
- MUST: path segment `a/b`, `..`, `//`, empty rejected by shared/production validators used by audio handlers
- Prefer pure unit tests with mocked fetch; update tests that currently accept localhost baseUrl for commercial providers

---

## Exit Conditions (GDD/TDD)

- [x] F-01-W2-001, F-01-W2-002, F-01-006 closed with tests
- [x] F-01-W2-004 closed or explicitly residual with partial note
- [x] `node --import tsx/esm --test` targeted suite passes (search + semantic-cache + path)
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` — no new errors
- [x] CHANGELOG.md entry

---

## Details

### What

Subtasks:

- [x] **Ler código existente** e o(s) report(s) em `docs/reports/01-open-sse-pipeline.md` (+ stretch `docs/reports/05-lib-data-auth.md`) listados em Source reports: `open-sse/handlers/search.ts`, `src/app/api/v1/search/route.ts`, `src/lib/semanticCache.ts`, `open-sse/handlers/chatCore/semanticCache.ts`, `open-sse/services/searchCache.ts`, `src/shared/network/safeOutboundFetch.ts`, `audioSpeech.ts` / `audioTranscription.ts` path checks, optional headroom probe fetch
- [x] Implement destination policy for search baseUrl (block private ranges / require https allowlist / ignore client baseUrl unless self-hosted operator flag)
- [x] Route search HTTP through `safeOutboundFetch` where secrets attach
- [x] Expand semantic cache signature fields + format-aware hit serving
- [x] Include provider_options in search cache key
- [x] Harden path segment validator; share with 0045 if exists
- [ ] Optional headroom SSRF guard (stretch — not done)
- [x] Tests + CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/handlers/search.ts` | Modificar — SSRF + fetch policy |
| `src/app/api/v1/search/route.ts` | Ler/modificar schema/options if needed |
| `src/lib/semanticCache.ts` | Modificar — signature fields |
| `open-sse/handlers/chatCore/semanticCache.ts` | Modificar — hit shape |
| `open-sse/services/searchCache.ts` | Modificar — cache key |
| `src/shared/network/safeOutboundFetch.ts` | Ler — reuse |
| `open-sse/handlers/audioSpeech.ts` | Modificar — path validate |
| `open-sse/handlers/audioTranscription.ts` | Modificar — path validate |
| Shared path helper | Criar/modificar |
| Headroom health (stretch) | Modificar |
| `tests/unit/` (incl. search-route, chatcore-semantic-cache) | Expandir |
| `CHANGELOG.md` | Entry |

### How

1. Trace `provider_options` from client body to fetch URL.
2. Dump semantic cache key composition; list omitted fields from report.
3. Replace weak `!includes("..")` checks with charset allowlist + encodeURIComponent discipline.

### Why

SSRF from search baseUrl can steal cloud metadata or exfiltrate API keys. Cache signature gaps return wrong completions to clients and cross-contaminate distinct requests.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT allow arbitrary client baseUrl in production defaults for commercial providers.
> DO NOT “fix” cache bugs by disabling semantic cache globally without flag.
> DO NOT claim path validation fixed if only one of speech/transcription is updated.

> [!IMPORTANT]
> First subtask: read existing code. Coordinate helper path with 0045.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**
- [x] **Zod Validation** for provider_options if schema tightened (no schema change required — policy enforced in handler)
- [x] **Security**: SSRF + path
- [x] **Tests**
- [x] **No raw secrets in fixtures**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/network/safePathSegment.ts` — shared path-segment allowlist (0045 may import)
  - `open-sse/handlers/audioSpeech.ts` / `audioTranscription.ts` — use shared validator
  - `open-sse/handlers/search.ts` — baseUrl policy + `safeOutboundFetch` (public-only / block-metadata)
  - `open-sse/services/searchCache.ts` + `src/app/api/v1/search/route.ts` — cache key includes provider_options + content
  - `src/lib/semanticCache.ts` — signature extras (tools/format/stream/…)
  - `open-sse/handlers/chatCore/semanticCache.ts` / `semanticCacheStore.ts` / `streamingSemanticCacheStore.ts` + `chatCore.ts` wire
  - `tests/unit/search-ssrf-semantic-cache-path-0048.test.ts` — new (20 tests)
  - `tests/unit/chatcore-semantic-cache.test.ts` — seedHit aligned with extras
  - `CHANGELOG.md` — Unreleased Security entry
  - task moved `01-open` → `03-review`
- **Finding IDs closed**: F-01-W2-001, F-01-W2-002, F-01-006, F-01-W2-004
- **Residual / stretch (not done)**: F-05-W2-005 headroom health probe SSRF
- **Testes**:
  - `node --import tsx/esm --test tests/unit/search-ssrf-semantic-cache-path-0048.test.ts` → 20/20 pass
  - related: semantic-cache, chatcore-semantic-cache*, search-route, search-handler-extended, search-registry, search-cache-ttl-zero → green
- **typecheck / lint**:
  - `npm run typecheck:core` → clean
  - eslint on touched files → 0 errors (pre-existing `any` warnings only in search.ts)
- **CHANGELOG**: Unreleased Security — Task 0048
- **Agente executor**: builder (Task 0048)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**:
- **Veredito**:
- **Score**:
- **Notas**:
