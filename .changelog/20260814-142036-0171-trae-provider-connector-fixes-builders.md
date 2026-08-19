---
date: 20260814-142036
timestamp: 20260814-142036
project: "omniroute-2"
agent: "builders"
task: "0171"
description: "Fix Trae model double prefixing and restore public cred resolution for Hard Rule #11 compliance"
is_rebuild_safe: true
---

# Task 0171: trae-provider-connector-fixes

## Summary

Trae executor now strips tr/ provider prefix from model names before upstream dispatch and resolves client ID via resolvePublicCred without inline literals.

## Changes

- Strip `tr/` and `trae/` provider prefixes in `TraeExecutor.resolveMode` to prevent upstream 502/4001 empty config errors.
- Resolve Trae OAuth client ID via `resolvePublicCred("trae_id")` across `open-sse/executors/trae.ts`, `src/app/authorize/parseCallback.ts`, and `src/shared/components/TraeAuthModal.tsx` for Hard Rule #11 compliance.
- Add regression test suite in `tests/unit/trae-publiccred.test.ts` asserting no raw Trae client ID literals exist in production sources.

## Verification

- [x] Relevant tests/build/lint commands executed and captured in task evidence.
