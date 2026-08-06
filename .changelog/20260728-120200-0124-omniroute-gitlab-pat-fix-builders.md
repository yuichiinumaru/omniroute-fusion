---
date: 20260728-120200
timestamp: 20260728-120200
project: omniroute
agent: builder-engineer
task: "0124"
description: "Fix GitLab Duo PAT validation endpoint, add registry entry, and document platform constraint"
is_rebuild_safe: true
---

# Task 0124: Fix GitLab Duo PAT validation endpoint, add registry entry, and document platform constraint

## Summary

Fixed the GitLab Duo PAT provider by updating `validateGitLabPatProvider` in `src/lib/providers/validation.ts` to probe the PAT-accessible `/api/v4/code_suggestions/completions` endpoint instead of the OAuth-only `direct_access` endpoint. Added a dedicated PAT registry entry at `open-sse/config/providers/registry/gitlab/index.ts` with model definitions, default context length, and human-readable description noting the platform constraint ("code completion only, max ~20 tokens"). Documented caveat in `specialty-media.ts` authHint.

## Changes

- `src/lib/providers/validation.ts`: Updated `gitlab` validator to probe `/api/v4/code_suggestions/completions` with PAT bearer token and completion payload. Cleaned up type signature.
- `open-sse/config/providers/registry/gitlab/index.ts`: Created PAT registry entry (`id: "gitlab"`, model catalog, context length, description).
- `open-sse/config/providers/shared.ts`: Added `description?: string` to `RegistryEntry` interface.
- `open-sse/config/providers/index.ts`: Added `gitlab` to provider registry map.
- `src/shared/constants/providers/apikey/specialty-media.ts`: Updated UI `authHint` with platform constraint caveat.
- `tests/unit/validation-gitlab-pat.test.ts`: Created unit test suite covering PAT validation endpoint probe, wrong PAT failure, no direct_access hit, and registry entry properties.

## Verification

- `node --import tsx/esm --test tests/unit/validation-gitlab-pat.test.ts tests/unit/executor-gitlab.test.ts`: 10 tests passed, 0 failed.
- `npm run typecheck:core`: PASSED (0 errors).
- `npx eslint`: PASSED (0 errors, 0 warnings).
