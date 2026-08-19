---
date: 20260814-142036
timestamp: 20260814-142036
project: "omniroute-2"
agent: "builders"
task: "0168"
description: "Gate proxy enablement behind active PII redaction with high-friction confirmation and bypass tokens across API and UI layers"
is_rebuild_safe: true
---

# Task 0168: require-pii-redaction-before-proxy-enable

## Summary

Proxy enablement now requires active PII redaction or an explicit high-friction confirmation modal with typed acknowledgment and one-time bypass token. Hard Rule #20 preserved with PII defaults remaining strictly opt-in.

## Changes

- Gated proxy enablement behind effective PII redaction status at both API and UI layers.
- When PII redaction is disabled, proxy enable requests are rejected with `409 Conflict` (`PII_REDACTION_REQUIRED`) unless an authorized, time-bound bypass token is provided.
- Gated management assignment routes (`/api/v1/management/proxies/assignments` and `/api/v1/management/proxies/bulk-assign`) with the redaction gate and bypass token verification.
- Added high-friction confirmation modal in the dashboard UI offering a primary "Enable PII Redaction & Continue" path and an explicit bypass path requiring typed confirmation phrase (`"I understand the risks of unredacted proxy routing"`) and risk checkbox.
- Created `POST /api/settings/proxy/bypass-token` and `GET /api/settings/proxy/redaction-status` endpoints.
- Fixed env-vs-DB drift in `src/lib/guardrails/piiMasker.ts` to resolve `PII_REDACTION_ENABLED` via `isFeatureFlagEnabled()`.
- Added durable, fail-closed audit log recording (`recordMandatoryAuditLog`) ensuring every bypass token generation and consumption event (`proxy.bypass_token_created`, `proxy.unredacted_bypass`) persists to SQLite or blocks unredacted bypass.
- Enforced strict token creation ordering so in-memory bypass tokens are never committed if audit persistence fails.
- Preserved Hard Rule #20 (PII redaction default remains opt-in `false`).

## Verification

- [x] Relevant tests/build/lint commands executed and captured in task evidence.
  - `node --import tsx/esm --test tests/unit/proxy-redaction-gate.test.ts tests/unit/pii-opt-in-default.test.ts` (63/63 pass)
  - `npx vitest run src/app/(dashboard)/dashboard/settings/components/__tests__/ProxyRedactionModal.test.tsx` (8/8 pass)
  - `npx vitest run tests/unit/shared/components/ProxyRedactionModal.test.tsx` (8/8 pass)
  - `npm run typecheck:core` (0 errors)
  - `npx eslint` on modified files (0 errors, 0 warnings)
