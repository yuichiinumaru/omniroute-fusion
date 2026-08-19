---
date: 20260819-044200
timestamp: 20260819-044200
project: "omniroute-2"
agent: "builder-engineer"
task: "0186"
description: "Generalized Grok CLI default reasoning effort to high for all non-composer models (including grok-4.6) when no explicit effort is supplied, preserving explicit choices and unsupported-effort deletion."
is_rebuild_safe: true
---

# Task 0186: Grok CLI default reasoning effort high for every model

## Summary

Generalized `normalizeGrokBuildReasoning` in `open-sse/executors/grok-cli.ts` so that every non-composer grok-cli model (including `grok-4.6`) defaults to `reasoning: { effort: "high" }` when no explicit effort is passed. Preserved unsupported-effort deletion, composer exclusion (`grok-composer-2.5-fast`), and explicit effort preservation.

## Changes

- `open-sse/executors/grok-cli.ts`: Updated `normalizeGrokBuildReasoning` to apply high default to all non-composer models when `!hasExplicitEffort`; passed `effectiveModel` to ensure default model fallback (`grok-composer-2.5-fast`) removes reasoning properly.
- `tests/unit/grok-cli-reasoning-effort-default.test.ts`: Added focused TDD matrix asserting upstream-observable body for grok-4.6 default, grok-4.5 regression, explicit effort preservation, explicit unsupported effort dropping, composer exclusion, and snake `reasoning_effort` stripping.

## Verification

- [x] Focused TDD matrix (`tests/unit/grok-cli-reasoning-effort-default.test.ts`): 6/6 PASS
- [x] Grok regression suite (`grok-cli-provider-compatibility.test.ts`, `grok-cli-strip-params.test.ts`, `provider-alias-normalization.boundary.test.ts`): 40/40 PASS
- [x] `npm run typecheck:core`: 0 errors
- [x] `npx eslint open-sse/executors/grok-cli.ts tests/unit/grok-cli-reasoning-effort-default.test.ts`: 0 errors
