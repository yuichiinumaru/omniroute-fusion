---
date: 20260728-120000
timestamp: 20260728-120000
project: omniroute
agent: builder-engineer
task: "0121"
description: "Port LM Arena executor modernization (PR #6280) from upstream"
is_rebuild_safe: true
---

# Task 0121: Port LM Arena executor modernization (PR #6280) from upstream

## Summary

Ported the upstream LM Arena executor modernization (PR #6280) to target arena.ai's current `/nextjs-api/stream/create-evaluation` endpoint, integrating Chrome TLS impersonation (`lmarenaTlsClient.ts`), Supabase SSR chunked cookie reconstruction, static UUID model catalog (`directModels.ts`), updated provider validation, and `// SAFETY:` comments across all `as T` casts.

## Changes

- `open-sse/executors/lmarena.ts`: Replaced executor with upstream `create-evaluation` contract and `BaseExecutor` integration. All `as T` casts carry `// SAFETY:` comments.
- `open-sse/executors/lmarena/{cookie,models,stream,response}.ts`: Added helper modules for chunked cookie parsing, UUID model resolution, SSE parsing, and response mapping.
- `open-sse/services/lmarenaTlsClient.ts`: Added TLS impersonation client using `tls-client-node` with Chrome profile.
- `open-sse/config/providers/registry/lmarena/directModels.ts`: Added static direct-chat seed catalog (737 lines).
- `src/lib/providers/validation/webProvidersA.ts`: Updated `validateLMArenaProvider` to probe `/nextjs-api/stream/create-evaluation`.
- `tests/unit/lmarena-validation.test.ts`: Removed explicit `any` types.
- `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md`: Updated Fix 1 to align with ported PR #6280 architecture.

## Verification

- `node --import tsx/esm --test tests/unit/lmarena-*.test.ts tests/unit/executor-lmarena.test.ts`: 38 tests passed, 0 failed across 9 suites.
- `npm run typecheck:core`: PASSED (0 errors).
- `npx eslint`: PASSED on all touched production and test files.
