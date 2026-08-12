---
date: 20260806-210546
timestamp: 20260806-210546
project: "omniroute-2"
agent: "reviewer"
task: "0131"
description: "Add bounded same-target repetition sanity retries before combo fallback."
is_rebuild_safe: true
---

# Task 0131: repetition-sanity-retry

## Summary

Preserves opt-in guard semantics, retries within budget with a system sanity instruction, isolates repetition from breaker exhaustion, and falls through deterministically.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/stream-repetition-guard.test.ts tests/unit/combo-repetition-fallback.test.ts tests/unit/combo-repetition-sanity-retry.test.ts
