# Independent Review Re-Review: Task 0162 — Antigravity provider compatibility

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0162-omniroute-antigravity-provider-compatibility.md`
- **Reviewer session**: `ses_00283b3f0ffekDVFxGHV26pfww`
- **Review date**: 2026-08-13
- **Mode**: independent source/filesystem re-review; no sub-reviewers or live provider calls.
- **Decision rule**: `90–100 = APPROVED`; `<90 = REJECTED`.
- **Authority**: current checked-in source, checked-in upstream reference, and fresh command output outrank stale Completion Evidence or prior report prose.
- **Exclusions honored**: no live Antigravity account/request, no credentials, no `:22000`, no git, no changelog tooling.

## Verdict

- **Verdict**: **REJECTED**
- **Score**: **57/100**
- **Lane**: task remains in `docs/tasks/02-doing/`; do not promote to `03-review/` or `04-completed/`.
- **Reason**: the current tree has a production module/export mismatch that fails `typecheck:core`, prevents the focused Antigravity family from loading, and leaves the runtime/profile contracts divergent from the checked-in upstream reference.

This re-review supersedes the prior report's stale green-verification claims where fresh evidence conflicts. The prior report's withdrawn model-catalog finding remains withdrawn; model IDs are not scored. The prior tool-cloaking decoy finding is also not reintroduced: the task explicitly requires preserving the inactive identity mapping, and the current `getCloakedAntigravityToolName()` behavior/tests preserve that contract.

## Findings

### F1 — BLOCKER: registry/shared export mismatch

- `open-sse/config/providers/registry/antigravity/index.ts:4,15` imports and uses `ANTIGRAVITY_BASE_URLS` from `../../shared.ts`.
- `open-sse/config/providers/shared.ts:9` imports `ANTIGRAVITY_RUNTIME_BASE_URLS`, but its export block at line 718 exports `ANTIGRAVITY_BASE_URLS` without importing or defining that name.
- Fresh `npm run typecheck:core` output: `open-sse/config/providers/shared.ts(718,3): error TS2304: Cannot find name 'ANTIGRAVITY_BASE_URLS'.`
- Fresh focused execution fails at module loading with: `SyntaxError: The requested module '../../shared.ts' does not provide an export named 'ANTIGRAVITY_BASE_URLS'`.

This is a direct production build/runtime blocker, not a test-only concern. Completion Evidence incorrectly claimed the import error was fixed and that typecheck/tests passed.

### F2 — BLOCKER: focused Antigravity test family is not green

Fresh command:

```text
node --import tsx/esm --test tests/unit/antigravity-*.test.ts
```

Result: **35 passed, 24 failed, 0 cancelled**. Most failures are caused by the F1 module export error. Passing profile/bootstrap/tool-preservation tests do not compensate for the family failing to load.

### F3 — PERSISTENT: runtime URL separation is not wired consistently

The fork defines separate sets in `open-sse/config/antigravityUpstream.ts`, but registry and shared-provider export wiring use the nonexistent combined `ANTIGRAVITY_BASE_URLS`. The combined set includes the sandbox URL, while the checked-in upstream registry uses `ANTIGRAVITY_RUNTIME_BASE_URLS`.

The fork also retains legacy combined-set consumers in `src/lib/oauth/constants/oauth.ts` and `src/lib/usage/fetcher.ts`. In contrast, discovery uses `getAntigravityFetchAvailableModelsUrls()` and bootstrap uses `ANTIGRAVITY_BOOTSTRAP_BASE_URLS`. The production contract is therefore split: discovery/bootstrap are separated, but registry/runtime/legacy usage surfaces are not consistently runtime-only.

### F4 — PERSISTENT: IDE/CLI profile and version contract is not upstream-compatible

The checked-in upstream reference provides separate IDE and CLI release URLs, fallbacks, caches, resolver functions, and user-agent forms:

- `antigravity/ide/<version> darwin/arm64`
- `antigravity/cli/<version> (aidev_client; os_type=darwin; arch=arm64; auth_method=consumer)`

The fork has one `resolveAntigravityVersion()` cache/feed/fallback (`4.2.0`), maps `cli`/`sdk` to generic `harness`, and emits an Electron-style default IDE user-agent (`Antigravity/<version> (...) Chrome/... Electron/...`). Fresh tests prove the fork's current behavior, but not the distinct upstream IDE/CLI contract.

### F5 — EVIDENCE GAP: Completion Evidence and prior report are stale

Task Completion Evidence says `117 pass / 0 fail`, core typecheck pass, and lint warnings count 7. Fresh execution contradicts those claims: focused tests fail 24 tests, typecheck fails one error, and scoped lint currently reports 0 errors / 14 warnings for the narrower command used in this re-review. The task must not be promoted using stale evidence.

## What is verified as passing

- `open-sse/translator/helpers/geminiHelper.ts:95` contains `HARM_CATEGORY_CIVIC_INTEGRITY` with threshold `OFF`.
- `open-sse/config/toolCloaking.ts::getCloakedAntigravityToolName` remains identity-preserving; focused tool-cloaking tests that load independently pass, including native/OpenCode tool-name preservation and no synthetic decoy injection assertions.
- `open-sse/services/antigravityProjectBootstrap.ts` uses the dedicated bootstrap URL set and has non-fatal/memoized tests passing.
- Scoped ESLint completed with **0 errors and 14 warnings**; warnings are `no-explicit-any` in test fixtures. This is not sufficient to offset failed typecheck/tests.
- No live network request or credential was used by this review.

## Score breakdown

| Dimension | Points | Notes |
|---|---:|---|
| Build/runtime integrity | 5/25 | Typecheck fails and registry imports a missing runtime export; focused modules fail to instantiate. |
| Focused verification evidence | 4/20 | 35 tests pass, but 24 fail; Completion Evidence is stale. |
| Runtime/discovery/bootstrap URL contract | 12/20 | Dedicated discovery/bootstrap helpers exist, but registry and legacy runtime/usage consumers still use the combined/nonexistent set. |
| User-Agent/profile/version compatibility | 13/20 | Profile plumbing and harness headers are covered, but the one-cache Electron/default IDE path does not match the checked-in IDE/CLI split. |
| Safety/tool/request behavior | 18/15 | Safety category and inactive tool-preservation contract are present; capped contribution at 15/15. |
| **Total** | **57/100** | **REJECTED** |

> The raw category subtotal is normalized to the 100-point gate by capping the final safety contribution at 15; the decisive result remains the failed build/test gates.

## Required path to 100

1. Restore one coherent exported symbol contract: either export/import the runtime/base constant deliberately, or change the registry/shared export to the checked-in upstream `ANTIGRAVITY_RUNTIME_BASE_URLS` contract. Then verify every import and generated provider registry consumer.
2. Make runtime content and quota paths use `ANTIGRAVITY_RUNTIME_BASE_URLS`; keep sandbox exclusively in discovery where intended, and add an explicit test proving runtime URLs exclude sandbox while discovery includes it.
3. Decide and implement the checked-in upstream IDE/CLI compatibility contract: separate profile values, release sources, fallbacks, caches, resolver calls, and UA/header forms, or document a source-backed intentional fork divergence and remove it from the gate. Do not infer availability from model IDs.
4. Re-run the full focused family until it reports zero failures; re-run `npm run typecheck:core`; run scoped lint and record exact fresh output.
5. Refresh Completion Evidence with actual output and add the `.changelog/` entry/reference required by `docs/tasks/AGENTS.md`; do not claim a changelog was deferred when the task's exit matrix requires it.
6. Only after all exits pass should a different reviewer re-review and consider promotion.

## Conclusion

Task 0162 is rejected at **57/100**. The current source is not promotion-ready because the registry/shared symbol mismatch is a verified build/runtime blocker and the focused family is not green. The task remains in `docs/tasks/02-doing/`.
