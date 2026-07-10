# Qoder PAT → Cosy Chat API Investigation

**Date**: 2026-07-08/09  
**Status**: BLOCKED (upstream 500)  
**Severity**: Medium — PAT auth flow works, but Cosy chat endpoint is down

---

## Summary

Qoder Personal Access Tokens (`pt-*`) can be exchanged for job tokens (`jt-*`) successfully, but the Cosy chat endpoint (`api1.qoder.sh`) consistently returns HTTP 500. This is an upstream Qoder server-side issue, not an OmniRoute implementation bug.

---

## What Was Done

### 1. PAT Recovery (✅ Complete)
- 10 Qoder PATs recovered from `~/working/secrets/` backups
- 9 valid (exchange works), 1 dead (`2m` — expired token)
- PATs written to DB (`/tmp/omniroute-data/storage.sqlite`) as plaintext (container has no `STORAGE_ENCRYPTION_KEY`)
- `test_status` reset from `expired` → `active` for all 9 connections

### 2. CLI Gate Bug Fix (✅ Source applied, needs rebuild)
- **File**: `src/app/api/providers/[id]/test/route.ts:311`
- **Bug**: `authType !== "apikey"` should be `authType === "apikey"`
- PAT/apikey via HTTP Cosy doesn't need CLI local — the condition was inverted
- Fix applied in source but Docker image needs rebuild to take effect

### 3. Model Catalog Update (✅ Complete)
- Removed 14 obsolete models (qoder-rome, qwen3-coder-plus, kimi-k2, etc.)
- Added 12 current models from official docs (https://docs.qoder.com/user-guide/chat/model-tier-selector)
- **Files modified**:
  - `open-sse/config/providers/registry/qoder/index.ts`
  - `open-sse/config/freeModelCatalog.data.ts`

### 4. Cosy Endpoint Testing (❌ 500 from upstream)

#### Flow Validated
```
PAT (pt-*) → api.qoder.com/v1/chat/completions → 401 TOKEN_INVALID (expected)
         → openapi.qoder.sh/api/v1/jobToken/exchange → 200 + jt-* ✅
         → api1.qoder.sh/algo/api/v2/service/pro/sse/agent_chat_generation → 500 ❌
```

#### What Was Tested
| Test | Result | Notes |
|------|--------|-------|
| PAT → primary API (`api.qoder.com`) | 401 TOKEN_INVALID | Expected — PATs not accepted as Bearer |
| PAT → job token exchange | ✅ 200 + `jt-*` | Works correctly |
| `jt-*` → Cosy with `model: "lite"` | 500 | |
| `jt-*` → Cosy without model field | 500 | |
| `jt-*` → Cosy with `model: "auto"` + `stream: true` | 500 | |
| Cosy headers (AES-128-CBC + RSA + MD5 sig) | ✅ Generated correctly | Matches `buildCosyHeadersForValidation()` |

#### Cosy Auth Flow (Implemented Correctly)
1. Generate random AES-16 key
2. Encrypt user info (`uid`, `security_oauth_token: jt-*`, `name`, `email`) with AES-128-CBC
3. RSA-encrypt the AES key with Qoder's public key
4. Build payload with `version: "v1"`, `cosyVersion: "0.12.3"`, `requestId`
5. Base64-encode payload
6. Sign with MD5: `base64(payload) + \n + base64(encryptedKey) + \n + timestamp + \n + body + \n + sigPath`
7. Send as `Authorization: Bearer COSY.{payloadB64}.{sig}`

---

## Blockers

1. **Cosy 500 Internal Server Error** — The `api1.qoder.sh` endpoint returns 500 for all request variations. This is upstream Qoder infrastructure, not fixable from our side.

2. **Docker rebuild pending** — CLI gate fix (`authType === "apikey"`) is in source but not in running container. Rebuild needed when Cosy is fixed.

---

## Potential Future Investigation Routes

### If Cosy comes back online
1. Test with `model: "lite"` (free tier, 0 credits) to validate end-to-end
2. Check if Cosy expects specific `AgentId` values (currently using `agent_common`)
3. Verify if `cosyVersion` needs updating (currently `0.12.3`)
4. Check if Qoder CLI has been updated with new endpoint URLs

### Alternative approaches
1. **Check Qoder CLI binary** — `qodercli` might have updated Cosy endpoints or auth flow
2. **Monitor Qoder status page** — Check if there's a known outage
3. **Try different `AgentId`** — The `?AgentId=agent_common` parameter might need to change
4. **Check Cosy protocol version** — The `cosyVersion: "0.12.3"` might be outdated
5. **Network-level debugging** — Check if `api1.qoder.sh` resolves correctly, TLS issues
6. **Contact Qoder support** — Report the 500 error with trace IDs from our tests

### Model ID format
- The Qoder docs show UI-level names ("Qwen3.7-Max", "Lite") but the actual API model IDs might differ
- The old model IDs (`qoder-rome-30ba3b`, `qwen3-coder-plus`) might still work with Cosy
- Need to test with original model IDs when Cosy is back online

---

## Key Files
- `open-sse/executors/qoder.ts` — Executor with PAT→Cosy fallback
- `open-sse/services/qoderCli.ts` — `resolveQoderJobToken()`, `buildCosyHeadersForValidation()`, `exchangeQoderJobToken()`
- `open-sse/config/providers/registry/qoder/index.ts` — Model catalog
- `src/app/api/providers/[id]/test/route.ts:311` — CLI gate fix

---

## Environment
- Container: `omniroute-21000` (port 21000)
- DB: `/tmp/omniroute-data/storage.sqlite` (mounted as `/data/storage.sqlite`)
- No `STORAGE_ENCRYPTION_KEY` in container — PATs stored as plaintext
- 9 active PATs: pf, pj, nr, mpz, jj, gw, cc, bi, ad
