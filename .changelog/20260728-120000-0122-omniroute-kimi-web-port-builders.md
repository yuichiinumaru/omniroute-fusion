---
date: 20260728-120000
timestamp: 20260728-120000
project: omniroute
agent: builder-engineer
task: "0122"
description: "Port Kimi-web executor from upstream (Connect-RPC)"
is_rebuild_safe: true
---

# Task 0122: Port Kimi-web executor from upstream (Connect-RPC)

## Summary
Ported the `kimi-web` provider to target `www.kimi.com`'s Connect-RPC API using binary frame encoding/decoding and token extraction.

## Changes
- `open-sse/executors/kimi-web.ts`: Replaced executor with Connect-RPC implementation targeting `www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat`.
- `open-sse/config/providers/registry/kimi/web/runtime.ts`: Added `k3` and `k2d6` model resolution catalog.
- `open-sse/config/providers/registry/kimi/web/index.ts`: Updated model IDs to `k3` and `k2d6`.
- `src/lib/providers/webCookieAuth.ts`: Added `extractKimiAccessToken()`.
- `src/lib/providers/validation/webProvidersA.ts`: Added `validateKimiWebProvider`.
- `tests/unit/executor-kimi-web.test.ts`: Rewrote tests targeting `www.kimi.com` without bare try/catch swallowing errors.
- `tests/unit/kimi-web-models-discovery.test.ts`: Created model discovery and catalog tests.

## Verification
- Run `node --import tsx/esm --test tests/unit/executor-kimi-web*.test.ts tests/unit/kimi-web-models-discovery.test.ts` (22/22 PASS)
- Run `npm run typecheck:core` (PASS)
- Run `npx eslint --max-warnings=0` on touched files (0 errors, 0 warnings)
