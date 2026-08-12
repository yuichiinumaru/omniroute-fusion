# Independent Review — Task 0154 upstream release/changelog ledger

- **Task**: 0154
- **Reviewer**: independent reviewer-hand
- **Date**: 2026-08-09
- **Verdict**: REJECTED — remain in `docs/tasks/02-doing/`
- **Score**: 68/100

## Scope and evidence

Reviewed the task file, `docs/tasks/AGENTS.md`, review-lane promotion law, parent evidence/script contracts, the OmniRoute skill documentation, the collector, unit tests, canonical ledger, and manifest. No prior Task 0154 independent review report was found.

Fresh commands:

- `node --import tsx/esm --test tests/unit/upstream-release-ledger.test.ts` — **35 pass, 0 fail**.
- `npm run typecheck:core` — **exit 0**.
- `npx eslint --no-ignore .agents/skills/omniroute/scripts/upstream-release-ledger.mjs tests/unit/upstream-release-ledger.test.ts` — **exit 0** (React detection warning only).
- `npm run lint` — repository-wide **not green**: 7 errors in pre-existing `visual-reference` files; the task-owned scoped lint is green.
- Real collector dry-run — baseline `3.8.42` from `package.json`, 277 releases fetched, 8 retained, changelog available, `wrote: false`.
- Ledger/manifest invariant probe — 8 top-level release headings, 8 manifest releases, all 8 `changelogExcerptAvailable: true`, `changelogAvailable: true`; exact heading/version arrays match.

## Passing conditions

- Baseline is read from the target package rather than hardcoded.
- Default draft/prerelease policy is visible and tested.
- Relative path rejection, dry-run default, atomic temp+rename, pagination, malformed JSON, HTTP errors, changelog absence, semver filtering, duplicate-section prevention, and linkage regression have coverage.
- Current ledger heading count equals manifest release count (8 = 8), and all manifest excerpt flags are true for the current corpus.
- Provenance clearly labels the ledger as external evidence only.

## Blocking findings

### F1 — Secret/header output is not safe (blocker)

`renderLedger()` copies the upstream release body into the ledger after only length truncation and heading normalization (`.agents/skills/omniroute/scripts/upstream-release-ledger.mjs:568-574`). It does not redact credentials, bearer tokens, or arbitrary response/header-shaped content. A direct probe with a release body containing `Authorization: Bearer ghp_SECRET123` produced both strings in the written ledger. The existing test explicitly permits a token-like string in the ledger (`tests/unit/upstream-release-ledger.test.ts:582-588`), which contradicts Task 0154's hard requirement that credentials, GitHub tokens, and arbitrary response headers must not enter the ledger. This is a security failure, not a documentation nit.

### F2 — Claimed byte-identical idempotency is false and untested (blocker)

`renderLedger()` uses the new fetch timestamp on every run (`.agents/skills/omniroute/scripts/upstream-release-ledger.mjs:464-468, 508-510`) and explicitly discards `existingContent` (`:607-611`). A real temporary-root repeated-run probe showed `byteIdentical: false`; the only differences were the generated timestamp in the provenance header and footer. The test named “byte-identical” only counts headings and does not assert equality (`tests/unit/upstream-release-ledger.test.ts:477-522`). This does not meet the script contract's stated byte-identical idempotency or the task's preservation requirement.

### F3 — Network timeout/safety contract is undocumented in behavior (blocker)

The script header claims per-fetch 10-second and overall timeout expectations (`.agents/skills/omniroute/scripts/upstream-release-ledger.mjs:33`), but `fetchReleases()` and `fetchChangelog()` call the injected/global fetch without an `AbortController`, timeout signal, or caller-enforced deadline (`:301-430`). A hung public endpoint can therefore hang the collector indefinitely. The tests do not exercise timeout or cancellation.

### F4 — Pagination diagnostics can falsely report a complete result (high)

When a response contains a `Link: rel="next"` header but has fewer than `perPage` entries, and `maxPages` is reached, the loop exits without adding the documented pagination-cap diagnostic because the post-loop condition requires `all.length >= perPage * maxPages` (`.agents/skills/omniroute/scripts/upstream-release-ledger.mjs:310-388`). A direct probe with one item, a next link, and `maxPages: 1` returned `diagnostics: []`. This violates the requirement for bounded actionable diagnostics and can make a partial release corpus appear complete.

### F5 — Commit SHA provenance is not implemented (high)

The manifest field is hard-coded to null (`.agents/skills/omniroute/scripts/upstream-release-ledger.mjs:498-500`: `r.tag_name ? null : null`), and no tag/ref commit lookup is performed. Thus the current manifest has `tagCommitSha: null` for every release despite the task requiring commit IDs when available and a manifest usable for exact code-revision investigation. `targetCommitish: main` is not an exact revision.

### F6 — Path containment is lexical, not symlink-safe (medium)

The resolved-path check uses string `startsWith(repoRoot)` (`.agents/skills/omniroute/scripts/upstream-release-ledger.mjs:712-719`). It does not establish a realpath boundary and would accept a path under a symlink escaping the repository, or a sibling path sharing the repository prefix. The relative-path guards are useful but do not prove the stronger “only declared in-repo targets” safety claim.

## Path to 100

1. Add a single, tested sanitizer/redaction policy for release-body and changelog text before ledger output; reject or redact bearer/API-token/header-shaped content. Update the currently permissive test to assert no secret/header output.
2. Make unchanged reruns byte-stable by preserving a stable generation value/sections or by excluding volatile fetch time from the rendered ledger; assert exact byte equality in the integration test for ledger and manifest as required by the contract.
3. Add per-request `AbortController` timeout handling and tests for hung release/changelog fetches; make timeout diagnostics bounded and actionable.
4. Track whether a next page remains when the page cap is reached and always emit a partial-result diagnostic; add a short-page-plus-next-link regression test.
5. Resolve tag/ref commit SHAs through a bounded GitHub API call where available, record them in the manifest, and test the fallback/unknown case explicitly.
6. Replace lexical containment with a realpath-aware boundary check (including existing symlinks) and test an escaping symlink fixture.
7. Refresh Completion Evidence with the corrected command output and remove claims that currently fail (byte-identical ledger, no-token ledger, and complete provenance).

## Task ledger patch recommendation

Leave the task in `docs/tasks/02-doing/`, retain `[~]`, add the rejection reasons to the top and Review Trail, and do not promote to `03-review`. No product code, generated changelog, tasklist, or other task was modified by this review.
