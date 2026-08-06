---
date: 20260728-120100
timestamp: 20260728-120100
project: omniroute
agent: builder-engineer
task: "0122"
description: "Port Kimi-web executor from upstream (Connect-RPC, www.kimi.com, bearer token)"
is_rebuild_safe: true
---

# Task 0122: Port Kimi-web executor from upstream (Connect-RPC, www.kimi.com, bearer token)

## Summary

Ported the upstream Kimi-web executor targeting `www.kimi.com` Connect-RPC API (`https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat`). Updated model resolution (`k3`, `k2d6`), added bearer token extraction helper `extractKimiAccessToken()`, updated `validateKimiWebProvider` with clean type annotations, added `// SAFETY:` comments across all `as T` casts, and set provider affiliate URL in `web-cookie.ts`.

## Changes

- `open-sse/executors/kimi-web.ts`: Ported Connect-RPC executor and added `// SAFETY:` comments to all `as T` type assertions.
- `open-sse/config/providers/registry/kimi/web/runtime.ts`: Created runtime model resolver (`k3`, `k2d6`).
- `open-sse/config/providers/registry/kimi/web/index.ts`: Updated registry model definitions.
- `src/lib/providers/webCookieAuth.ts`: Added `extractKimiAccessToken()`.
- `src/lib/providers/validation/webProvidersA.ts`: Added `validateKimiWebProvider` probe and cleaned up type annotations (`{ apiKey }: { apiKey?: string }` and `catch (error: unknown)`).
- `src/shared/constants/providers/web-cookie.ts`: Updated `website` URL to `https://www.kimi.com/code?aff=omniroute`.
- `tests/unit/executor-kimi-web.test.ts`, `executor-kimi-web-decoder.test.ts`, `kimi-web-models-discovery.test.ts`: Created/updated test suites.

## Verification

- `node --import tsx/esm --test tests/unit/executor-kimi-web.test.ts tests/unit/executor-kimi-web-decoder.test.ts tests/unit/kimi-web-models-discovery.test.ts`: 22 tests passed, 0 failed.
- `node --import tsx/esm --test tests/unit/kimi*.test.ts tests/unit/executor-kimi*.test.ts`: 35 tests passed, 0 failed (full Kimi regression suite).
- `npm run typecheck:core`: PASSED (0 errors).
- `npx eslint`: PASSED (0 errors, 0 warnings).
