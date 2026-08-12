---
date: 20260806-183724
timestamp: 20260806-183724
project: "omniroute-2"
agent: "reviewer"
task: "0136"
description: "Add a canonical top-six provider quota summary to Home."
is_rebuild_safe: true
---

# Task 0136: home-provider-quota-summary

## Summary

Aggregates active accounts by canonical provider, preserves unknown/stale quota semantics, uses bounded domain reads, and renders a single-chrome Home widget.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/provider-quota-summary-0136.test.ts && npx vitest run --config vitest.config.ts tests/unit/ui/home-provider-quota-summary-0136.test.tsx tests/unit/ui/home-degraded-warnings-0128.test.tsx tests/unit/ui/home-page-client-dashboard-smoke-4615.test.tsx tests/unit/ui/home-provider-topology-section-4606.test.tsx tests/unit/ui/home-topology-hidden-4596.test.tsx
