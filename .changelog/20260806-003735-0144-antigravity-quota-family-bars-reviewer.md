---
date: 20260806-003735
timestamp: 20260806-003735
project: "omniroute-2"
agent: "reviewer"
task: "0144"
description: "Consolidate Antigravity quota display into verified family bars while preserving credits and unknown state."
is_rebuild_safe: true
---

# Task 0144: antigravity-quota-family-bars

## Summary

Adds typed family grouping, minimum-remaining aggregation, reset/stale metadata preservation, and antigravity/agy regression coverage.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/antigravity-quota-family-bars.test.ts tests/unit/provider-limits-ui.test.ts tests/unit/antigravity-usage-service.test.ts tests/unit/antigravity-usage-fetcher.test.ts tests/unit/usage-antigravity-family-split.test.ts
