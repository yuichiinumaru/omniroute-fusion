# Review Report: Task 0048 — Search SSRF + Semantic Cache + Path — 2026-07-11

## Review Lineage

- **Current task**: Task 0048 (`omniroute-search-ssrf-semantic-cache-path`); live path at review start `docs/tasks/03-review/0048-omniroute-search-ssrf-semantic-cache-path.md`
- **Previous reports read**: none under `docs/reports/reviews/` for 0048
- **Related reports considered**: `docs/reports/01-open-sse-pipeline.md` (F-01-W2-001/002/004, F-01-006); sibling Task 0045 path helper surface (`open-sse/utils/safePath.ts`)
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `73/100`
- **Verdict**: `NEEDS FIX`
- **Lane recommendation**: `return-to-doing` (S < 90 — move to `docs/tasks/02-doing/`; do **not** remain in `03-review/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 78 | SSRF + semantic cache + search cache key land; path finding “closed” but breaks HF |
| F-01-W2-001 search SSRF | 96 | Commercial ignores client baseUrl; self-hosted gated; `safeOutboundFetch` |
| F-01-W2-002 semantic cache | 93 | tools/format/stream in signature; stream skip/store gate for non-OpenAI |
| F-01-W2-004 search cache key | 95 | `provider_options` + `content` in key; route wired |
| F-01-006 path segments | 42 | Separators blocked, but single-segment rule rejects all HF `org/model` IDs |
| Tests / evidence | 55 | New 20/20 suite green; pre-existing audio HF happy-path tests fail (2) |
| Scope / hygiene | 85 | Stretch F-05-W2-005 residual OK; dual path helpers (0045 vs 0048) residual |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none (first review)

### Regressions

- HuggingFace ASR/TTS model path interpolation rejects valid `org/model` IDs after F-01-006 harden.

### New Findings

- `NEW` F1 (**HIGH**): `isValidPathSegment` forbids `/`, breaking every catalog HF audio model path and two production handler tests.
- `NEW` F2 (**MEDIUM**): dual path-segment helpers (0048 `safePathSegment.ts` vs 0045 `open-sse/utils/safePath.ts`) — epic preferred one SSoT; both reject multi-segment IDs the same way.
- `NEW` F3 (**LOW** / evidence): completion evidence claimed related suites green; live `audio-speech` / `audio-transcription` HF routing tests fail.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: full `npm run typecheck:core` / `npm run lint` not re-run this session (builder evidence present; not used as sole pass gate).
- `EXTERNAL_BLOCKER`: none
- Stretch F-05-W2-005 headroom probe SSRF correctly residual / not scored as failure.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | HIGH | Open (blocking) | HF multi-segment model IDs rejected by path validator used on speech/transcription URL builders | this report | Registry models `openai/whisper-large-v3`, `facebook/mms-tts-eng`, `canopylabs/orpheus-3b-0.1-ft`; `isValidPathSegment("openai/whisper-large-v3") === false`; audio tests fail |
| F2 | NEW | MEDIUM | Open (path-to-100) | Two parallel path helpers post-0045/0048 | this report | `src/shared/network/safePathSegment.ts` vs `open-sse/utils/safePath.ts` both export `assertSafePathSegment` |
| F3 | NEW | LOW | Open (path-to-100) | Phantom/overstated completion evidence vs live audio suite | this report | Evidence lists only 0048 suite; live HF routes fail |
| G1 | — | Guard | Pass | Commercial search ignores client baseUrl / keeps registry origin | this report | Serper + SearchAPI route tests in 0048 suite |
| G2 | — | Guard | Pass | Self-hosted SearXNG LAN allowed; IMDS blocked | this report | 0048 suite self-hosted + metadata cases |
| G3 | — | Guard | Pass | Semantic cache tools/format diverge keys; Claude stream hit skipped | this report | 0048 suite + `canServeSemanticCacheStreamHit` |
| G4 | — | Guard | Pass | Search cache key includes provider_options | this report | `searchCache.ts` + route `computeCacheKey(..., body.provider_options, body.content)` |
| G5 | — | Guard | Pass | No bare `fetch(` remains in `search.ts` | this report | rg → 0 hits; `safeOutboundFetch` at commercial path |

## Detailed Findings

### F1 [HIGH] `safePathSegment` / audio handlers break HuggingFace model IDs

**Evidence**

- Production catalog models intentionally contain `/`:
  - ASR: `open-sse/config/audioRegistry.ts` — `openai/whisper-large-v3`, `openai/whisper-large-v3-turbo`
  - TTS: `canopylabs/orpheus-3b-0.1-ft`, `ResembleAI/chatterbox`, `hexgrad/Kokoro-82M`
- Validator rejects any `/`:

```17:37:src/shared/network/safePathSegment.ts
export function isValidPathSegment(segment: unknown): boolean {
  // ...
  if (
    value.includes("/") ||
    // ...
  ) {
    return false;
  }
  return SAFE_PATH_SEGMENT_RE.test(value);
}
```

- Wired on HF URL builders:
  - `open-sse/handlers/audioSpeech.ts` — `handleHuggingFaceTtsSpeech` → `` `${baseUrl}/${modelId}` ``
  - `open-sse/handlers/audioTranscription.ts` — `handleHuggingFaceTranscription` same pattern
- Live probe: `isValidPathSegment("openai/whisper-large-v3")` → `false` (same for all catalog HF models).
- Live tests (this session):

```
✖ handleAudioSpeech routes HuggingFace TTS providers to model-specific endpoints
✖ handleAudioTranscription routes HuggingFace providers with raw audio uploads
38 pass / 2 fail (audio-speech + audio-transcription combined)
```

**Impact**

- F-01-006 is not safely closed: injection is blocked, but **all default HF audio model IDs return 400 Invalid model ID**.
- ElevenLabs voice IDs (single segment) still work; HF is the production breakage.
- Exit condition “path segment `a/b` rejected” is met for pure injection cases, but the validator is applied to multi-segment **legitimate** HF paths without a multi-segment-safe API.

**Fix**

Prefer one of:

1. **Per-segment allowlist join** (recommended): accept `org/model` / multi-segment IDs only when **each** non-empty segment matches `^[A-Za-z0-9._~-]+$`, reject empty segments, `..`, `.`, `\`, `?`, `#`, `%`, and leading/trailing `/`. Export e.g. `isValidPathSegmentTree` / `isValidModelPath` used by HF builders; keep strict single-segment for ElevenLabs voice.
2. Or HF-only: split on `/`, validate each segment with current `isValidPathSegment`, rejoin.
3. Re-run `tests/unit/audio-speech-handler.test.ts` + `audio-transcription-handler.test.ts` and add an explicit positive assertion for `openai/whisper-large-v3` in the 0048 suite so the regression cannot reappear.

Do **not** re-allow raw `..`, `//`, query/fragment, or percent-encoding smuggling.

### F2 [MEDIUM] Dual path helpers after 0045 + 0048

**Evidence**

- Epic 0008 soft preference: one shared `assertSafePathSegment`.
- 0048: `src/shared/network/safePathSegment.ts` (audio).
- 0045: `open-sse/utils/safePath.ts` (executors) — separate implementation, looser charset (no allowlist), still rejects `/`.

**Impact**

- Drift risk: two definitions of “safe path segment”; audio fix may not land in executor helper (or vice versa).

**Fix**

- Converge on one module (prefer `src/shared/network/safePathSegment.ts` with multi-segment support + re-export from `open-sse/utils/safePath.ts` for executor imports), or document intentional split if chatPath semantics differ.

### F3 [LOW] Completion evidence incomplete

**Evidence**

- Task completion lists only `search-ssrf-semantic-cache-path-0048.test.ts` (20/20) + related search/semantic suites.
- Did not record pre-existing audio handler tests that directly exercise the changed validators; those fail live.

**Impact**

- Review theater risk: F-01-006 marked closed while production HF paths broken.

**Fix**

- Expand MUST tests to include HF happy-path after multi-segment fix; update completion evidence.

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Commercial search `baseUrl` to private/IMDS rejected or ignored | ✅ | Serper keeps `https://google.serper.dev`; SearchAPI client IMDS ignored; credential IMDS → fail closed |
| Self-hosted exceptions gated + documented | ✅ | `SELF_HOSTED_SEARCH_PROVIDERS`; SearXNG loopback OK; metadata blocked |
| Search HTTP via `safeOutboundFetch` when secrets attach | ✅ | No bare `fetch(` in `search.ts`; guard public-only / block-metadata |
| Semantic cache key differs tools present vs absent | ✅ | 0048 suite |
| Semantic cache key differs response format | ✅ | 0048 suite |
| Cache hit preserves format path or skip on mismatch | ✅ stream; ✅ key isolation non-stream | Claude stream → null; stream store blocked for non-openai |
| Search cache no collision across baseUrl/options | ✅ | `computeCacheKey` includes `o` + `content`; route passes both |
| Path `a/b`, `..`, `//`, empty rejected | ⚠️ partial | Rejected, but also rejects valid HF `org/model` (F1) |
| Both speech + transcription updated | ✅ wiring | Both import shared helper — but both regress HF |
| Targeted unit suite passes | ✅ for new suite / ❌ related audio | 20/20 0048; 2 HF audio fails |
| typecheck:core / lint | ⬜ not re-run | Builder evidence only |
| CHANGELOG entry | ✅ | Unreleased Security Task 0048 |
| Stretch headroom SSRF | residual OK | Explicitly not done |

## Residual Risks (non-blocking)

- DNS-rebinding after hostname-only public-only check is a pre-existing `safeOutboundFetch` / guard class issue — not introduced by 0048.
- Non-stream Claude/Gemini hits rely on store of `translatedResponse` + `clientResponseFormat` in key; stream path correctly refuses OpenAI SSE synthesis. No extra integration test for non-stream Claude hit body shape (acceptable residual if F1 fixed first).
- Key-order sensitivity in `JSON.stringify(providerOptions)` → false misses only, not false hits.

## Fresh Verification (this session)

```bash
node --import tsx/esm --test tests/unit/search-ssrf-semantic-cache-path-0048.test.ts
# → 20/20 pass

node --import tsx/esm --test tests/unit/audio-speech-handler.test.ts tests/unit/audio-transcription-handler.test.ts
# → 38 pass / 2 fail (both HuggingFace happy-path routes)
```

## Recommended Remediations (builder)

1. **Fix F1 first** — multi-segment-safe validation for HF model paths; keep single-segment strictness for ElevenLabs voice.
2. Re-green audio speech + transcription unit suites; add HF positive case to 0048 tests.
3. Optionally fold F2 helper SSoT with 0045.
4. Re-check typecheck/lint on touched files; update task completion evidence.

## Lane Action

- **Moved**: `docs/tasks/03-review/0048-…` → `docs/tasks/02-doing/0048-…` (S=73 < 90).
- **Not moved** to `04-completed/` (reviewer authority ends at verdict).
