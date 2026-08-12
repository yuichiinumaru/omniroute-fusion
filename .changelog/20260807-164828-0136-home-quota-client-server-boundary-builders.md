---
date: 20260807-164828
timestamp: 20260807-164828
project: "omniroute-2"
agent: "builders"
task: "0136"
description: "Keep Home quota client aggregation free of DB, Redis, and Node builtin dependencies."
is_rebuild_safe: true
---

# Task 0136: home-quota-client-server-boundary

## Summary

Splits pure client aggregation from server-only DB access, adds dpdm import-graph proofs, and fixes the Next client bundle failure caused by ioredis dns/net/tls imports.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/error-message-sanitization.test.ts tests/unit/provider-quota-summary-0136.test.ts; npx vitest run --config vitest.config.ts tests/unit/ui/home-degraded-warnings-0128.test.tsx tests/unit/ui/home-provider-quota-summary-0136.test.tsx; npm run typecheck:core
