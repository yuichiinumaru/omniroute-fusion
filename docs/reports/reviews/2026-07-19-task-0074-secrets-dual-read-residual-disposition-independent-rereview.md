# Independent Security Re-Review: Task 0074 — Secrets Dual-Read Residual Disposition (H-PRODUCT-006 / F-SEC-W2-005)

## Review Lineage

- **Current task**: `docs/tasks/03-review/0074-omniroute-secrets-dual-read-residual-disposition.md`
- **Reviewer**: Independent FULL SECURITY RE-REVIEWER (agentID=`reviewers`)
- **Builder claims**: **UNTRUSTED** — re-proved from live docs + code anchors + tests
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0074-secrets-dual-read-residual-disposition-security-review.md` (builders ACCEPT 100 after path-to-100 doc fixes)
  - Task Completion Evidence (disposition **D1**)
  - `docs/security/SECRETS_AT_REST.md` (SSOT)
- **Skills**: security-harness · secrets-management · code-quality-harness · tsjs-harness
- **Constraints**: no git · no `:21000` · no prod SQLite probe

## Score And Verdict

| Field | Value |
|-------|-------|
| **Score** | **100/100** |
| **Verdict** | **ACCEPT** / `ACCEPTED_100` |
| **Lane** | **stay `03-review`** |
| **Patches applied this re-review** | **none** |

### Dual Score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | D1 docs+ops; encrypt-on-write / dual-read / migrate flag grepped true |
| `runtime_enforcement` | N/A | Contract: **no** behavior change under D1 |

Overall → **100** (docs disposition task; no false runtime claims).

## Disposition Re-Check

| Item | Live truth |
|------|------------|
| **Chosen** | **D1** — docs + ops checklist only |
| **D2 force-migrate** | Not implemented (correct for D1); `migratePlaintextSecretsToEncrypted` already exported for operator maintenance |
| **D3 flag-order fix** | Not implemented; F-SEC-W2-005 **accepted** as restart-retry |
| **0041 re-opened?** | **NO** |

### Is dual-read a bug?

**No.** Intentional legacy compatibility so plaintext rows remain readable until rewrite. Disabling dual-read without migrate would risk boot brick.

## Live Code Anchors

### `src/lib/db/secrets.ts`

| Behavior | Proof |
|----------|-------|
| Encrypt-on-write when key set | `encodeSecretForStorage` refuses non-`enc:v1:` when `isEncryptionEnabled()` (L25–34) |
| Dual-decode | `decodeSecretFromStorage` JSON + raw `enc:v1:` (L44–57) |
| Lazy migrate | `ensureSecretsEncryptedMigration` → `migratePlaintextSecretsToEncrypted` (L61–68, L111+) |
| **F-SEC-W2-005** | `_secretsEncryptMigrated = true` **before** try/migrate (L62–63) — matches accepted residual |

### `src/lib/db/encryption.ts`

- Reads **only** `process.env.STORAGE_ENCRYPTION_KEY` (zero runtime `OMNIROUTE_CRYPT_KEY` in `src/` / `open-sse/` / `bin/`)
- Fail-closed encrypt when key configured; passthrough when absent

### SSOT accuracy (`docs/security/SECRETS_AT_REST.md`)

| Claim | Status |
|-------|--------|
| STORAGE_ENCRYPTION_KEY-only for `encryption.ts` | ✅ correct; notes ENVIRONMENT.md stale alias as docs drift |
| Ops DB path `DATA_DIR/storage.sqlite` | ✅ matches `SQLITE_FILE` in `core.ts` |
| Dual-read residual model table | ✅ matches code |
| F-SEC-W2-005 restart-retry | ✅ matches flag order |
| DATABASE_GUIDE cross-link | ✅ present |

## Tests

```bash
node --import tsx/esm --test tests/unit/db-secrets.test.ts tests/unit/db-encryption.test.ts
# → 18 pass, 0 fail (incl. enc:v1 write + migratePlaintextSecretsToEncrypted)
```

## Findings

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| — | — | — | No open findings in task scope |

### Accepted EXTERNAL residuals

1. **F-SEC-W2-005** — in-process migrate not retried after throw until restart (P3; D1 acceptance).
2. **Dual-read window** — offline SQLite theft may still see plaintext rows until rewrite (transition risk, documented).
3. **ENVIRONMENT.md** still lists `OMNIROUTE_CRYPT_KEY` as legacy alias despite zero code hits — separate docs hygiene, not 0074 reopen.
4. **D2/D3** remain optional product choices if operators want stronger rewrite guarantees.

## Contract Compliance

| Exit MUST | Status |
|-----------|--------|
| Disposition recorded D1 | ✅ |
| Security/ops SSOT under docs/security | ✅ `SECRETS_AT_REST.md` |
| Ops checklist set key → restart → optional SQL | ✅ |
| No secrets code change (D1) | ✅ |
| 0041 not re-opened | ✅ |
| Existing secrets/encryption tests pass | ✅ 18/18 |
| CHANGELOG docs bullet | ✅ Unreleased Changed |

## Path To 100

**Already closed** (prior path-to-100 fixed fabricated `OMNIROUTE_CRYPT_KEY` runtime alias + wrong DB filename). Independent re-review confirms fixes held. No further patches.

## Return Table Row

| task | score | verdict | patches | report | lane |
|------|------:|---------|---------|--------|------|
| 0074 | 100 | ACCEPT | none | this file | stay 03-review |
