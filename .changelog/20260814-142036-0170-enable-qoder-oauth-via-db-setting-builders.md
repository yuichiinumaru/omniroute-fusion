---
date: 20260814-142036
timestamp: 20260814-142036
project: "omniroute-2"
agent: "builders"
task: "0170"
description: "Support dynamic Qoder browser OAuth configuration via Database settings and Feature Flags without server restart"
is_rebuild_safe: true
---

# Task 0170: enable-qoder-oauth-via-db-setting

## Summary

Qoder OAuth eligibility is now dynamically configurable via DB settings and feature flags with environment variable fallback and strict client secret redaction.

## Changes

- Redacted `qoderOAuthClientSecret` in `PATCH /api/settings` and `PUT /api/settings` responses to ensure secrets are never leaked to the browser, exposing only `hasQoderOAuthClientSecret`.
- Wired `QoderOAuthSettingsModal` in `ProviderModalsPanel.tsx` for `providerId === 'qoder'`.
- Updated `open-sse/services/tokenRefresh.ts` to use dynamic resolvers (`resolveQoderOAuthTokenUrl`, `resolveQoderOAuthClientId`, `resolveQoderOAuthClientSecret`) from `@/lib/oauth/constants/oauth`.
- Expanded unit test suite in `tests/unit/qoder-oauth-db-setting.test.ts` to verify secret redaction in PATCH/PUT, dynamic token refresh resolution, skipped refresh when unconfigured, and modal wiring.

## Verification

- [x] Relevant tests/build/lint commands executed and captured in task evidence.
