---
date: 20260806-034644
timestamp: 20260806-034644
project: "omniroute-2"
agent: "reviewer"
task: "0128"
description: "Replace noisy Home degraded-key toasts with accessible inline warnings below Provider Topology."
is_rebuild_safe: true
---

# Task 0128: home-degraded-key-inline-warnings

## Summary

Preserves health polling, sanitizes reasons, prevents search redirects and duplicate chrome, and adds deterministic Home warning coverage.

## Changes

- Documented task completion details.

## Verification

- [x] npx vitest run --config vitest.config.ts tests/unit/ui/home-degraded-warnings-0128.test.tsx tests/unit/ui/home-page-client-dashboard-smoke-4615.test.tsx tests/unit/ui/home-provider-topology-section-4606.test.tsx tests/unit/ui/home-topology-hidden-4596.test.tsx
