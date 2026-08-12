---
date: 20260808-175844
timestamp: 20260808-175844
project: "omniroute-2"
agent: "gt-ts-expert"
task: "codex-runtime-prefix-fix"
description: "Fix Codex requests failing before upstream dispatch and prevent duplicate codex/cx model qualification."
is_rebuild_safe: true
---

# Task codex-runtime-prefix-fix: fix-codex-runtime-timeout-and-prefix-normalization

## Summary

Replaced two undefined requestOptions references in chatCore timeout wiring with the consolidated settings object. Added Codex-scoped provider-model normalization so cx/model, codex/model, and codex/cx/model converge to provider codex plus the bare model while non-Codex slash IDs remain untouched. Added production-path and source regressions. Build concurrency now auto-scales per build up to 80% logical CPU, bounded by memory and nofile.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/fine-grained-timeouts-consumers.test.ts tests/unit/model-resolver.test.ts tests/unit/chat-helpers.test.ts tests/unit/codex-gpt56-compat.test.ts (75/75); node --import tsx/esm --test tests/unit/build-next-isolated.test.ts (20/20); npm run typecheck:core (0); npx eslint touched files (0 errors); npm run build (617/617, exit 0); production :22000 restart + /api/health/ping status ok
