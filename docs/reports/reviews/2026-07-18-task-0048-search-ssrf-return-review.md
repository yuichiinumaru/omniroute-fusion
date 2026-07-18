# Review Report: Task 0048 — Search SSRF / Semantic Cache / Path — Independent Security Return-Review 2026-07-18

## Review Lineage

- **Current task**: Task 0048 (`omniroute-search-ssrf-semantic-cache-path`); live path `docs/tasks/03-review/0048-omniroute-search-ssrf-semantic-cache-path.md`
- **Previous reports read** (UNTRUSTED prior scores — re-proved live):
  - `docs/reports/reviews/2026-07-18-task-0048-search-ssrf-cache-final-review.md` (claimed 100)
  - `docs/reports/reviews/2026-07-11-task-0048-search-ssrf-cache-review.md` (73, NEEDS FIX — HF multi-segment)
- **Source findings**: F-01-W2-001, F-01-W2-002, F-01-006, F-01-W2-004; stretch F-05-W2-005
- **Review mode**: independent FULL security return-review (SSRF + cache poison + path injection)
- **Reviewer profile**: `gt-security-reviewer` (agentID=`reviewers`)
- **Harnesses**: security-harness (validate-egress), code-quality-harness, tsjs

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` — remain `docs/tasks/03-review/`
- **Patches this session**: none (HF regression already closed; sibling 0045 whitespace does not break multi-segment HF)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| F-01-W2-001 search SSRF | 100 | Commercial ignores client baseUrl; public-only / block-metadata guards; no bare `fetch(` |
| F-01-W2-002 semantic cache | 100 | tools/format/stream/client_format in signature; non-OpenAI stream skip |
| F-01-W2-004 search cache key | 100 | `provider_options` + content in key |
| F-01-006 path segments | 100 | Multi-segment HF OK; traversal/separators rejected; ElevenLabs single-segment |
| SSoT path helper | 100 | shared `safePathSegment`; open-sse re-export same fn |
| Tests | 100 | 0048 suite + audio + 0045 path suites green this session |

## Adversarial Live Proof (this session)

```text
node --import tsx/esm --test \
  tests/unit/search-ssrf-semantic-cache-path-0048.test.ts \
  tests/unit/executor-harden-0045.test.ts
→ pass (combined 45 with 0045 after sibling WS harden)

# Path segment matrix
openai/whisper-large-v3 → multi ACCEPT, single DENY
facebook/mms-tts-eng → multi ACCEPT
a/../b, .., %, \, ?, #, //, leading/trailing / → DENY
9-segment path → DENY (MAX_SEGMENTS=8)
SSoT identity: open-sse isValidPathSegment === shared module export

# Outbound URL guard (public-only)
127.0.0.1, ::1, 169.254.169.254, 0x7f000001, decimal IP, 127.1, IPv4-mapped v6 → DENY
file:/ gopher: → DENY
https://google.serper.dev/ → ALLOW
# non-metadata
LAN/loopback ALLOW; IMDS DENY

# Search policy
commercial: client baseUrl ignored (registry host only)
self-hosted: loopback OK; metadata rejected
```

### HF regression (prior F1) — CLOSED

Prior 73 review rejected HF `org/model` as over-strict single-segment. Live SSoT now:

- per-segment allowlist `[A-Za-z0-9._~-]+`
- multi-segment up to 8 parts / 256 chars
- audio speech/transcription use multi-segment for model ids
- ElevenLabs voice uses `isValidSinglePathSegment` (no extra path extension)

## Findings

| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| F1 HF multi-segment | HIGH historical | **RESOLVED** | re-verified ACCEPT HF + DENY traversal |
| F2 dual helpers | MEDIUM historical | **RESOLVED** | single SSoT |
| Stretch F-05-W2-005 | Info | residual OK | headroom probe SSRF — explicit stretch not done |

### Non-issue

- `https://google.serper.dev.evil.com/` ALLOW under public-only is correct (public DNS name, not private). Commercial search still ignores client baseUrl.

## Guards (must stay green)

- G1: commercial client baseUrl ignored
- G2: self-hosted metadata/IMDS blocked
- G3: no bare `fetch(` in `search.ts` (only `safeOutboundFetch`, `allowRedirect: false`)
- G4: semantic tools/format diverge keys; Claude stream skip
- G5: search cache key includes provider_options
- G6: HF multi-segment accept + traversal reject
- G7: ElevenLabs single-segment only

## Lane Outcome

- **S = 100** → stay `03-review/`
- **Path-to-100**: N/A

## Review Ledger Entry

- **Date**: 2026-07-18
- **Reviewer**: `gt-security-reviewer` (agentID=`reviewers`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: this file
- **Previous**: `2026-07-18-task-0048-search-ssrf-cache-final-review.md`, `2026-07-11-task-0048-search-ssrf-cache-review.md`
