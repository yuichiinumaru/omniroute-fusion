# Task 0048: Search SSRF, Semantic Cache Correctness, Path-Segment Injection

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
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

### Initial (2026-07-11)

- **Arquivos criados/modificados**:
  - `src/shared/network/safePathSegment.ts` — shared path-segment allowlist (0045 may import)
  - `open-sse/handlers/audioSpeech.ts` / `audioTranscription.ts` — use shared validator
  - `open-sse/handlers/search.ts` — baseUrl policy + `safeOutboundFetch` (public-only / block-metadata)
  - `open-sse/services/searchCache.ts` + `src/app/api/v1/search/route.ts` — cache key includes provider_options + content
  - `src/lib/semanticCache.ts` — signature extras (tools/format/stream/…)
  - `open-sse/handlers/chatCore/semanticCache.ts` / `semanticCacheStore.ts` / `streamingSemanticCacheStore.ts` + `chatCore.ts` wire
  - `tests/unit/search-ssrf-semantic-cache-path-0048.test.ts` — new
  - `tests/unit/chatcore-semantic-cache.test.ts` — seedHit aligned with extras
  - `CHANGELOG.md` — Unreleased Security entry
- **Finding IDs closed**: F-01-W2-001, F-01-W2-002, F-01-006, F-01-W2-004
- **Residual / stretch (not done)**: F-05-W2-005 headroom health probe SSRF
- **Agente executor**: builder (Task 0048)
- **Data de conclusão**: 2026-07-11

### Path-to-100 HF regression fix (2026-07-18)

- **Arquivos modificados**:
  - `src/shared/network/safePathSegment.ts` — multi-segment-safe: each segment allowlisted; accepts HF `org/model`; rejects `..` / `//` / `%` / `\` / `?` / `#` / leading-trailing `/`
  - `open-sse/utils/safePath.ts` — re-exports SSoT from shared (collapse dual helpers with 0045)
  - `tests/unit/search-ssrf-semantic-cache-path-0048.test.ts` — HF accept cases + tighter reject matrix
  - `tests/unit/executor-harden-0045.test.ts` — SSoT multi-segment accept
  - `CHANGELOG.md` — path-to-100 Security bullet + F-01-006 wording update
- **Blocking F1 closed**: HF `openai/whisper-large-v3`, `facebook/mms-tts-eng`, catalog TTS ids accepted; traversal still rejected
- **Testes (exact)**:
  ```text
  node --import tsx/esm --test \
    tests/unit/search-ssrf-semantic-cache-path-0048.test.ts \
    tests/unit/audio-speech-handler.test.ts \
    tests/unit/audio-transcription-handler.test.ts
  → pass (incl. HF TTS/ASR happy paths + invalid path reject)
  ```
- **Residual**: F-05-W2-005 headroom health probe SSRF (stretch — not done)
- **Agente executor**: gt-ts-engineer (builders parent)
- **Data**: 2026-07-18
- **Lane**: remains `docs/tasks/02-doing/` (do not move; parent owns lane)

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Initial (2026-07-11)

- **Reviewer**: reviewers (Code Quality Reviewer / independent)
- **Veredito**: NEEDS FIX
- **Score**: 73/100
- **Report**: `docs/reports/reviews/2026-07-11-task-0048-search-ssrf-cache-review.md`
- **Blockers**: F1 HF multi-segment rejection; F2 dual path helpers; F3 incomplete audio evidence
- Lane: S<90 → moved `03-review/` → `02-doing/`

### Builder path-to-100 note (2026-07-18)

- F1 closed: multi-segment allowlist; audio speech + transcription HF tests green.
- F2 closed: dual helpers collapsed — open-sse re-exports shared SSoT.
- F3 closed: live audio suites re-run and pass.

### Expert path-to-100 verify (2026-07-18, gt-ts-expert)

- SSoT + HF + search SSRF + semantic cache hold.
- **Expert score (self)**: **95/100** — stretch F-05 residual only.

### Independent security return-review (2026-07-18, agentID=`reviewers`)

- **Veredito**: `ACCEPTED_100`
- **Score**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-18-task-0048-search-ssrf-return-review.md`
- **Previous Reports**:
  - `docs/reports/reviews/2026-07-18-task-0048-search-ssrf-cache-final-review.md` (claimed 100 — re-proved)
  - `docs/reports/reviews/2026-07-11-task-0048-search-ssrf-cache-review.md` (73/100 NEEDS FIX — HF)
- **Delta**: HF multi-segment re-verified ACCEPT; commercial SSRF ignore client baseUrl; semantic + search cache keys; SSoT path helper; stretch F-05 residual OK
- **Evidence**: 0048 + executor-harden path suites green; outbound URL guard matrix (IMDS/decimal IP/IPv4-mapped DENY)
- **Patches**: none
- **Lane**: S=100 → stay `03-review/`

### Security re-review final (2026-07-18, gt-security-reviewer under builders)

- **Veredito**: `ACCEPTED_100`
- **Score**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-18-task-0048-search-ssrf-cache-final-review.md`
- **Previous Reports**:
  - `docs/reports/reviews/2026-07-11-task-0048-search-ssrf-cache-review.md` (73/100 NEEDS FIX)
- **Delta**: F1/F2/F3 RESOLVED; I1 ElevenLabs single-segment closed this session; primary findings closed; stretch F-05 residual OK
- **Evidence**: `node --import tsx/esm --test` 0048 + audio-speech + audio-transcription + executor-harden-0045 → **81 pass / 0 fail**
- **Lane**: S=100 → moved `02-doing/` → `03-review/`

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
