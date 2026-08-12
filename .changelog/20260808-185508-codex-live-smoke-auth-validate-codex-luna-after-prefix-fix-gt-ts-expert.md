---
date: 20260808-185508
timestamp: 20260808-185508
project: "omniroute-2"
agent: "gt-ts-expert"
task: "codex-live-smoke-auth"
description: "Run one minimal real Responses request through the production Codex path after fixing model qualification."
is_rebuild_safe: true
---

# Task codex-live-smoke-auth: validate-codex-luna-after-prefix-fix

## Summary

The request reached the real Codex executor with canonical routing cx/gpt-5.6-luna → codex/gpt-5.6-luna and no requestOptions ReferenceError. The provider rejected all three eligible accounts with 401 because their refresh tokens are expired/invalid; 13 additional accounts were already filtered at 100% session usage. No successful completion/output tokens were produced.

## Changes

- Documented task completion details.

## Verification

- [x] OMNIROUTE_BUILD_CPUS=8 OMNIROUTE_BUILD_MEMORY_MB=16384 npm run build (exit 0, cpus=8, 617/617); production :22000 health ok; one direct production POST /v1/responses smoke via src/app/api/v1/responses/route.ts with model cx/gpt-5.6-luna and minimal arithmetic prompt; route log canonicalized to codex/gpt-5.6-luna; upstream result HTTP 401 token_expired
