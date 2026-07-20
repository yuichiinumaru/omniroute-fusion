---
title: "Secrets at Rest — Dual-Read Disposition"
version: 3.8.x
lastUpdated: 2026-07-19
---

# Secrets at Rest — Dual-Read Disposition

> **Status:** Intentional transition residual (Task **0074** / H-PRODUCT-006 / F-SEC-W2-005).  
> **Does not re-open** Task **0041** acceptance.  
> **Code anchors** (grep-verified): `src/lib/db/secrets.ts`, `src/lib/db/encryption.ts`, `src/lib/db/apiKeys.ts`, `src/lib/db/providers.ts`, `src/lib/db/proxies.ts`.

## Disposition (0074)

| Choice | Decision |
|--------|----------|
| **Selected** | **D1 — Docs + ops checklist only** |
| **Not selected** | D2 force-migrate HTTP/CLI surface; D3 one-shot migrate-flag retry hardening |
| **Rationale** | Task 0041 already encrypts on write (fail-closed when `STORAGE_ENCRYPTION_KEY` is set) and lazy-migrates on read. Dual-read is the **compatibility** window for long-lived DBs, not a regression. Wave 2 recommended D1 unless operators need stronger rewrite guarantees. F-SEC-W2-005 (in-process migrate not retried after throw) is accepted as **restart-retry** under D1. |

**Is dual-read a bug?** **No.** It is intentional compatibility so legacy plaintext rows remain readable until rewrite succeeds. Disabling dual-read without a completed migrate would brick boots that still have plaintext secrets.

---

## What 0041 closed (still true)

| Behavior | Evidence |
|----------|----------|
| Write with key → ciphertext only | `encodeSecretForStorage` in `src/lib/db/secrets.ts` refuses non-`enc:v1:` when `isEncryptionEnabled()` |
| Encrypt fail-closed | `encrypt()` in `src/lib/db/encryption.ts` throws when key is configured but derivation/cipher fails (no silent plaintext write) |
| API keys primary path | `src/lib/db/apiKeys.ts` — `key_hash = ?` lookup first |
| Lazy migrate | `migratePlaintextSecretsToEncrypted` / `ensureSecretsEncryptedMigration` in `secrets.ts` |
| Key absent (dev) | Plaintext at rest **by design** when `STORAGE_ENCRYPTION_KEY` is unset (`isEncryptionEnabled()` is false) |

Related field encryption (same key gate via `isEncryptionEnabled()`):

- Provider connection tokens / PSD — `encryptConnectionFields` / `decryptProviderSpecificData` (`encryption.ts`, used from `providers.ts`)
- Proxy relay auth — `relayAuthEnc` preferred with plaintext `relayAuth` fallback (`proxies.ts` `extractRelayAuth`)

---

## Residual risk model (dual-read window)

| Condition | Residual |
|-----------|----------|
| `STORAGE_ENCRYPTION_KEY` set, old rows never rewritten | Dual-read **serves** plaintext until migrate or next write succeeds |
| Key **not** set | Plaintext at rest by design (local/dev) |
| `_secretsEncryptMigrated = true` even if migrate throws | In-process migrate may not re-run until process restart (**F-SEC-W2-005**, P3). Accepted under D1 as restart-retry. |

Offline SQLite theft of a long-lived DB that gained encryption later may still contain plaintext rows until rewrite. That is the residual window — **not** “encrypt-on-write failed.”

---

## Ops checklist (non-prod preferred)

> Do **not** probe production `:21000` SQLite from agent sessions unless the operator explicitly owns a live verify.

1. **Set the key** (generate once; back up off-box):
   ```bash
   openssl rand -hex 32
   # .env
   STORAGE_ENCRYPTION_KEY=<generated>
   # optional version label for rotations (bootstrap/electron; not read by encryption.ts itself)
   STORAGE_ENCRYPTION_KEY_VERSION=v1
   ```
   **Code truth (grep-verified 2026-07-19):** `src/lib/db/encryption.ts` reads **only**
   `process.env.STORAGE_ENCRYPTION_KEY` (`isEncryptionEnabled()`, key derivation, encrypt fail-closed).
   `docs/reference/ENVIRONMENT.md` still lists `OMNIROUTE_CRYPT_KEY` as a “legacy alias,” but that
   name has **zero** hits in `src/` / `open-sse/` / `bin/` — **do not rely on it**. Set
   `STORAGE_ENCRYPTION_KEY`.

2. **Restart the process once** so lazy migrate runs on first secret read (`ensureSecretsEncryptedMigration` → `migratePlaintextSecretsToEncrypted`).

3. **Optional operator verify on a non-prod copy** of `DATA_DIR` (default `~/.omniroute/`; file is **`storage.sqlite`** per `SQLITE_FILE` in `src/lib/db/core.ts` — not `omniroute.db`):
   ```bash
   # Count secrets namespace rows still lacking enc:v1 ciphertext marker
   DATA_DIR="${DATA_DIR:-$HOME/.omniroute}"
   sqlite3 "$DATA_DIR/storage.sqlite" \
     "SELECT COUNT(*) FROM key_value WHERE namespace='secrets' AND value NOT LIKE '%enc:v1:%';"
   ```
   Expect `0` after a successful migrate with the key set. A non-zero count means rewrite pending (dual-read still serves those rows).

4. **Force rewrite path (manual / in-process)** — `migratePlaintextSecretsToEncrypted()` is already exported from `src/lib/db/secrets.ts` and is idempotent (returns rewritten row count). There is **no** unauthenticated HTTP migrate endpoint (by design). Operators who need a scripted rewrite should call the exported function from a maintenance context they control, or restart so lazy migrate re-runs.

5. **Losing the key** loses access to ciphertext. Keep key backups separate from the DB (see also `docs/ops/DATABASE_GUIDE.md` encryption section).

---

## F-SEC-W2-005 note

`ensureSecretsEncryptedMigration` sets `_secretsEncryptMigrated = true` before the migrate try/catch. If `migratePlaintextSecretsToEncrypted()` throws, the same process will not retry until restart. Dual-read still serves legacy plaintext; a restart re-enters ensure and retries. **Accepted under D1**; D3 would move the flag set to after success only.

---

## Related docs

- `docs/ops/DATABASE_GUIDE.md` — encryption overview / key backup
- `docs/reference/ENVIRONMENT.md` — `STORAGE_ENCRYPTION_KEY`, `STORAGE_ENCRYPTION_KEY_VERSION` (note: `OMNIROUTE_CRYPT_KEY` row is stale docs drift — code does not read it)
- `docs/tasks/04-completed/0041-omniroute-secrets-at-rest-encryption.md` — closed acceptance baseline
- Wave 2 investigation: `docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md` § H-PRODUCT-006
