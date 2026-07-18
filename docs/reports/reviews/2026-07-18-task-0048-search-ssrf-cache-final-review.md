# Review Report: Task 0048 — Search SSRF + Semantic Cache + Path — 2026-07-18

## Review Lineage

- **Current task**: Task 0048 (`omniroute-search-ssrf-semantic-cache-path`); live path at review start `docs/tasks/02-doing/0048-omniroute-search-ssrf-semantic-cache-path.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0048-search-ssrf-cache-review.md` — score **73/100**, verdict **NEEDS FIX** (blocking F1 HF multi-segment rejection; F2 dual path helpers; F3 incomplete audio evidence)
- **Related reports considered**:
  - `docs/reports/01-open-sse-pipeline.md` — source findings F-01-W2-001/002/004, F-01-006
  - Sibling Task 0045 path helper surface (`open-sse/utils/safePath.ts` → shared SSoT)
- **Review mode**: `path-to-100` re-review (security + TS surface)
- **Reviewer profile**: `gt-security-reviewer` (formal parallel-review)
- **Parent agentID**: `builders`
- **Harnesses**: code-quality-harness + security-harness (validate-egress) + tsjs-harness route

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` → move to `docs/tasks/03-review/` (S=100; parent may promote to completed after wave closeout)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 100 | Primary findings closed; stretch residual documented |
| F-01-W2-001 search SSRF | 100 | Commercial ignores client baseUrl; public-only fetch; metadata fail-closed |
| F-01-W2-002 semantic cache | 100 | tools/format/stream/client format in signature; stream skip non-OpenAI |
| F-01-W2-004 search cache key | 100 | `provider_options` + `content` in key; route wired |
| F-01-006 path segments | 100 | Multi-segment HF OK; traversal/separators rejected; ElevenLabs single-segment |
| SSoT / dual helpers (prior F2) | 100 | open-sse re-exports shared `safePathSegment` only |
| Tests / evidence | 100 | 0048 + audio speech/transcription + 0045 path suites **81/81** pass |
| Scope / hygiene | 100 | Stretch F-05-W2-005 residual OK; CHANGELOG present |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` **F1** (HIGH): multi-segment-safe `isValidPathSegment` accepts HF `org/model` (`openai/whisper-large-v3`, `facebook/mms-tts-eng`, catalog TTS) while rejecting `..`, `//`, `%`, `\`, `?`, `#`, leading/trailing `/`. Audio HF happy-paths green.
- `RESOLVED` **F2** (MEDIUM): dual helpers collapsed — `open-sse/utils/safePath.ts` re-exports SSoT from `src/shared/network/safePathSegment.ts` (type predicate; no `as string`).
- `RESOLVED` **F3** (LOW): live audio speech + transcription suites re-run and pass (HF routing included).
- `RESOLVED` **I1** (this re-review path-to-100): ElevenLabs voice uses `isValidSinglePathSegment` so multi-segment path extension is blocked while HF retains multi-segment API.

### Persistent Findings

- none blocking

### Regressions

- none — prior HF breakage fixed without reopening traversal injection

### New Findings

- none open after path-to-100 polish

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP` (non-blocking): full monorepo `npm run typecheck:core` / `npm run lint` not re-run this session; targeted unit matrix is the acceptance gate for this remediation.
- `EXTERNAL_BLOCKER`: none
- Stretch **F-05-W2-005** headroom health probe SSRF — residual by contract (not scored as failure)

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | HIGH | Closed | HF multi-segment model IDs accepted per-segment allowlist | 2026-07-11 | `safePathSegment.ts`; 0048 suite + audio HF tests |
| F2 | RESOLVED | MEDIUM | Closed | Path SSoT single implementation | 2026-07-11 | `open-sse/utils/safePath.ts` re-export only |
| F3 | RESOLVED | LOW | Closed | Audio suite evidence | 2026-07-11 | 81/81 combined pass this session |
| I1 | RESOLVED | Improvement | Closed | ElevenLabs single-segment voice | this report | `isValidSinglePathSegment`; speech handler + tests |
| G1 | Guard | Pass | Pass | Commercial search ignores client baseUrl | 2026-07-11 + re-verify | Serper keeps `https://google.serper.dev` |
| G2 | Guard | Pass | Pass | Self-hosted LAN ok; IMDS blocked | re-verify | SearXNG loopback; metadata reject |
| G3 | Guard | Pass | Pass | Semantic tools/format diverge; Claude stream skip | re-verify | 0048 suite |
| G4 | Guard | Pass | Pass | Search cache key includes provider_options | re-verify | `searchCache.ts` + route |
| G5 | Guard | Pass | Pass | No bare `fetch(` in `search.ts` | re-verify | `safeOutboundFetch` only |
| G6 | Guard | Pass | Pass | 0045 multi-segment assert still green | re-verify | `executor-harden-0045` |

## Detailed Verification

### F-01-W2-001 — Search SSRF

**Policy** (`open-sse/handlers/search.ts`):

- Commercial: ignore client `provider_options.baseUrl`; credential override only after `parseAndValidatePublicUrl`.
- Self-hosted (`searxng-search`, `ollama-search`): client/credential baseUrl via `parseAndValidateNonMetadataUrl` (LAN OK, metadata/link-local blocked).
- Outbound: `safeOutboundFetch` with `guard: "public-only"` (commercial) or `"block-metadata"` (self-hosted); `allowRedirect: false`; Z.AI MCP transport uses public-only custom fetch.

**Live proof**: commercial Serper + SearchAPI client IMDS ignored (registry host only); SearchAPI credential IMDS fail-closed; SearXNG loopback allowed; SearXNG metadata rejected.

### F-01-W2-002 — Semantic cache

**Signature extras** (`src/lib/semanticCache.ts`): tools, tool_choice, response_format, client_format, stream, seed, stop, max_tokens.

**Hit serving** (`open-sse/handlers/chatCore/semanticCache.ts`): stream hits skipped unless `canServeSemanticCacheStreamHit` (OpenAI only). Store path for streaming refuses non-OpenAI (`streamingSemanticCacheStore.ts`). Non-stream stores `translatedResponse` keyed by client format — no cross-format collision.

### F-01-W2-004 — Search cache key

`computeCacheKey` includes `o: providerOptions` and `content`. Route passes `body.provider_options` + `body.content`.

### F-01-006 — Path segments (SSoT shared with 0045)

```ts
// src/shared/network/safePathSegment.ts
isValidPathSegment      // multi-segment-safe (HF)
isValidSinglePathSegment // single-segment only (ElevenLabs voice)
assertSafePathSegment
```

- Reject matrix: `..`, `a/../b`, `//`, empty, `\`, `?`, `#`, `%`, leading/trailing `/`.
- Accept: HF catalog ids + simple voice/model ids.
- Audio HF builders use multi-segment API; ElevenLabs voice uses single-segment API.
- `open-sse/utils/safePath.ts` re-exports SSoT + owns `isSafeChatPath` only.

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Commercial search private/IMDS baseUrl rejected or ignored | ✅ | 0048 suite |
| Self-hosted exceptions gated + documented | ✅ | `SELF_HOSTED_SEARCH_PROVIDERS` + comments |
| Search HTTP via `safeOutboundFetch` when secrets attach | ✅ | commercial + Z.AI paths |
| Semantic cache key differs tools present vs absent | ✅ | 0048 suite |
| Semantic cache key differs response format | ✅ | 0048 suite |
| Cache hit preserves format path or skip on mismatch | ✅ | stream Claude → null; key isolation |
| Search cache no collision across baseUrl/options | ✅ | key includes `o` + content |
| Path injection rejected; HF `org/model` accepted | ✅ | multi-segment allowlist + reject matrix |
| Both speech + transcription updated | ✅ | both import shared helper; HF green |
| Targeted unit suite passes | ✅ | **81 pass / 0 fail** |
| CHANGELOG entry | ✅ | Unreleased Security (0048 + path-to-100 + voice single-segment) |
| Stretch headroom SSRF | residual OK | Explicitly not done |

## Residual Risks (non-blocking / out of scope)

1. **F-05-W2-005** headroom health probe SSRF — stretch residual (task contract).
2. **DNS rebinding** after hostname-only public-only check is a pre-existing `safeOutboundFetch` / guard class residual — not introduced by 0048.
3. **Key-order sensitivity** in `JSON.stringify(providerOptions)` → false misses only, not false hits.
4. Non-stream Claude/Gemini body-shape is guaranteed by `translatedResponse` store + `client_format` in signature; no extra e2e assertion (acceptable).

## Fresh Verification (this session)

```bash
node --import tsx/esm --test \
  tests/unit/search-ssrf-semantic-cache-path-0048.test.ts \
  tests/unit/audio-speech-handler.test.ts \
  tests/unit/audio-transcription-handler.test.ts \
  tests/unit/executor-harden-0045.test.ts
# → 81 pass / 0 fail
```

### Path-to-100 polish applied by security reviewer (this session)

| Change | File |
| --- | --- |
| `isValidSinglePathSegment` SSoT | `src/shared/network/safePathSegment.ts` |
| ElevenLabs voice uses single-segment | `open-sse/handlers/audioSpeech.ts` |
| Re-export single-segment helper | `open-sse/utils/safePath.ts` |
| Unit coverage for single vs multi | `tests/unit/search-ssrf-semantic-cache-path-0048.test.ts`, `audio-speech-handler.test.ts` |
| CHANGELOG bullet | `CHANGELOG.md` |

HF multi-segment allowlist intentionally preserved for 0045/0048 coordination.

## Path to 100

- **Achieved**. No further in-scope blockers.

## Lane Action

- **Recommended**: move `docs/tasks/02-doing/0048-…` → `docs/tasks/03-review/0048-…` (S=100).
- Do **not** auto-promote to `04-completed/` without parent wave closeout.
- **Not touched**: production port `:21000`; no git operations.
