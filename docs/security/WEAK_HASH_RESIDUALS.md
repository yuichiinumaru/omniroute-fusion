---
title: "Weak Hash Residuals & Protocol Exceptions (MD5 / SHA-1)"
---

# Weak Hash Residuals & Protocol Exceptions (MD5 / SHA-1)

> **Status**: Active  
> **Last Updated**: 2026-07-25  
> **Task Reference**: Task 0115 (EPIC-12 T12-D — Audit and replace weak hash usage)

---

## Executive Summary

As part of the EPIC-12 security hardening initiative (Task 0115), a comprehensive codebase audit was conducted across `src/`, `open-sse/`, `electron/`, and `bin/` to identify all occurrences of weak cryptographic hash algorithms (`MD5` and `SHA-1`).

All internal/replaceable hash usage has been migrated to `SHA-256`. Call sites where `MD5` or `SHA-1` remain are strictly governed by external wire protocols, RFC standards, or operating system CLI tool contracts where higher-strength hashes are not supported by the upstream target.

---

## Classification Inventory

| File Path | Line | Hash | Status | Protocol / Standard Requirement |
|-----------|------|------|--------|--------------------------------|
| `open-sse/services/taskAwareRouting.ts` | 443 | SHA-1 → **SHA-256** | `replaceable` (**MIGRATED**) | Internal conversation cache key. Migrated to SHA-256. |
| `open-sse/services/qoderCli.ts` | 385 | MD5 | `protocol-required` | Qoder / COSY API signature protocol (`Authorization: Bearer COSY.${payloadB64}.${sig}`) requires MD5 hex digest of canonical signature input. |
| `src/mitm/cert/install.ts` | 109 | SHA-1 | `protocol-required` | macOS `security` CLI (`find-certificate -Z`, `delete-certificate -Z`) natively computes and expects SHA-1 certificate fingerprints in macOS System Keychain. |
| `open-sse/utils/sapisidHash.ts` (used by `gemini-web.ts` & `gemini-business.ts`) | 12 | SHA-1 | `protocol-required` | Google Web & Workspace Authentication (`SAPISIDHASH {epoch}_{hash}`) requires `sha1(epoch + " " + sapisid + " " + origin)`. Encapsulated in shared helper module. |
| `src/app/api/tools/traffic-inspector/ws/route.ts` | 28 | SHA-1 | `protocol-required` | RFC 6455 Section 4.2.2 (The WebSocket Protocol) mandates SHA-1 for `Sec-WebSocket-Accept` (`base64(SHA1(Key + GUID))`). |

---

## Detailed Justification per Residual Site

### 1. `open-sse/services/qoderCli.ts:385` — Qoder/COSY Authorization Signature
- **Algorithm**: `MD5`
- **Context**: `buildCosyHeadersForValidation(bodyStr, token)`
- **Upstream Spec**: Qoder / COSY SSE Agent Chat Generation endpoint (`/api/v2/service/pro/sse/agent_chat_generation`).
- **Technical Reason**: The upstream Qoder/COSY server validates incoming requests by re-computing the MD5 digest over `${payloadB64}\n${cosyKeyB64}\n${timestamp}\n${bodyStr}\n${sigPath}`. Using any other digest algorithm causes immediate `401 Unauthorized` / `403 Forbidden` authentication failure by the COSY gateway.

### 2. `src/mitm/cert/install.ts:109` — MITM Root CA Certificate Fingerprint
- **Algorithm**: `SHA-1`
- **Context**: `getCertFingerprint(certPath: string)`
- **Upstream Spec**: macOS System Keychain `security` command line tool (`/usr/bin/security`).
- **Technical Reason**: The macOS `security find-certificate -a -Z /Library/Keychains/System.keychain` command returns certificates formatted with SHA-1 hashes (`SHA-1 hash: ...`). Furthermore, `security delete-certificate -Z <SHA1-hash>` requires the SHA-1 fingerprint to select and delete certificates from the keychain. Changing `getCertFingerprint` to SHA-256 breaks certificate validation and uninstallation on macOS.

### 3. `open-sse/utils/sapisidHash.ts:12` — Google Gemini Web & Workspace SAPISIDHASH
- **Algorithm**: `SHA-1`
- **Context**: `computeSapisidHash(sapisid: string, origin: string)` (consumed by `open-sse/executors/gemini-web.ts` and `open-sse/executors/gemini-business.ts`)
- **Upstream Spec**: Google Authentication Architecture (SAPISIDHASH header spec).
- **Technical Reason**: Google web and workspace endpoints mandate the exact `SAPISIDHASH` header specification: `SAPISIDHASH {epoch_seconds}_{sha1(epoch + " " + sapisid + " " + origin)}`. Upstream Google endpoints validate this header for cookie-authenticated web sessions. Using SHA-256 would invalidate session authentication.

### 4. `src/app/api/tools/traffic-inspector/ws/route.ts:28` — Traffic Inspector WebSocket Handshake
- **Algorithm**: `SHA-1`
- **Context**: `acceptKey(clientKey: string)`
- **Upstream Spec**: IETF RFC 6455 (The WebSocket Protocol), Section 4.2.2.
- **Technical Reason**: Standard WebSocket handshakes require the server to compute `Sec-WebSocket-Accept = base64(SHA1(Sec-WebSocket-Key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))`. RFC 6455 strictly requires SHA-1. Any deviation results in browser and WebSocket client connection rejection.

---

## Verification & Audit Enforcement

1. **Automated Scanner Guard**: Future SAST or CodeQL flags on these 4 residual locations should be tagged as `protocol-required` residual exceptions referencing this document.
2. **No New Sites**: Running `rg -n 'createHash\("(md5|sha1)"\)|createHash\(.(md5|sha1).\)' src/ open-sse/ electron/ bin/` MUST return only the 4 protocol-required residual call sites documented above.
