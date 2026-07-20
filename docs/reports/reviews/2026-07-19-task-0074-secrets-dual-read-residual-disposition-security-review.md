# Review Report: Task 0074 — Secrets Dual-Read Residual Disposition (H-PRODUCT-006 / F-SEC-W2-005) — 2026-07-19

## Review Lineage

- **Current task**: Task 0074 (`omniroute-secrets-dual-read-residual-disposition`); live path was `docs/tasks/02-doing/0074-…` at review start
- **Previous reports read**:
  - Task Completion Evidence (builders / gt-ts-engineer + security) — disposition **D1**
  - `docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md` — H-PRODUCT-006, F-SEC-W2-005
  - Task **0041** closed baseline (referenced; not re-opened)
- **Related docs considered**:
  - `docs/security/SECRETS_AT_REST.md` (new SSOT — reviewed + corrected)
  - `docs/ops/DATABASE_GUIDE.md` cross-link
  - `src/lib/db/{secrets,encryption,apiKeys,providers,proxies}.ts` code anchors
- **Review mode**: `builder-parallel-security-review` (gt-security-reviewer / parent agentID=`builders`)
- **Skills**: code-quality-harness · security-harness · secrets-management · tsjs-harness
- **Constraints honored**: no git · no `:21000` · no prod SQLite probe

## Score And Verdict

- **Score**: `100/100` (after path-to-100 in this review)
- **Verdict**: `ACCEPT` / `ACCEPTED_100`
- **Lane recommendation**: → `docs/tasks/03-review/`

### Dual Score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | D1 docs-only; existing secrets/encryption tests 18/18 pass |
| `runtime_enforcement` | N/A | Task contract: **no** runtime behavior change under D1; disposition is documentation + residual acceptance |

Overall → **100** (library-only / docs disposition; no false runtime claims after path-to-100).

### Rubric snapshot

| Area | Score | Notes |
|------|------:|-------|
| Disposition choice (D1) | 100 | Matches Wave 2 default; justified |
| Doc accuracy (post-fix) | 100 | STORAGE_ENCRYPTION_KEY-only; storage.sqlite path |
| 0041 non-regression | 100 | Explicit “not re-opened”; encrypt-on-write still true |
| F-SEC-W2-005 | 100 | Accepted restart-retry; flag order grepped |
| Ops checklist | 100 | set key → restart → optional non-prod SQL |
| Tests | 100 | existing unit suite green; no new D2/D3 code |
| CHANGELOG | 100 | Unreleased Changed docs bullet |

## Delta Summary

### Resolved Since Previous Review (first formal security review)

- `RESOLVED` (path-to-100): SSOT falsely claimed `OMNIROUTE_CRYPT_KEY` is accepted by `encryption.ts` — **code only reads `STORAGE_ENCRYPTION_KEY`**. SSOT corrected; ENVIRONMENT.md drift called out without inventing runtime alias.
- `RESOLVED` (path-to-100): ops SQL used wrong DB filename `omniroute.db` → **`storage.sqlite`** (`SQLITE_FILE` in `core.ts`)
- `RESOLVED` (path-to-100): Exit/Test/Compliance checkboxes completed for promote
- `VERIFIED`: D1 disposition appropriate; no unauthenticated migrate endpoint; dual-read intentional
- `VERIFIED`: `_secretsEncryptMigrated = true` before migrate try/catch (F-SEC-W2-005 semantics match doc)

### Persistent Findings

- none blocking in task scope

### Regressions

- none (no secrets code change)

### New Findings

- none blocking

### Evidence Gaps / External Blockers

- **EXTERNAL (docs debt, not 0074 reopen)**: `docs/reference/ENVIRONMENT.md` still documents `OMNIROUTE_CRYPT_KEY` as legacy alias though `src/` has zero hits — separate hygiene if desired
- **EXTERNAL**: D2 force-migrate admin surface / D3 flag-order fix remain optional product choices if operators want stronger rewrite guarantees
- **EXTERNAL**: dual-read residual window for offline SQLite theft until rewrite — accepted transition risk, documented

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F-DOC-0074-01 | Doc accuracy | Debt → **fixed** | Closed | Claimed OMNIROUTE_CRYPT_KEY runtime alias | encryption.ts: only STORAGE_ENCRYPTION_KEY |
| F-DOC-0074-02 | Doc accuracy | Debt → **fixed** | Closed | Ops SQL used `omniroute.db` | core.ts SQLITE_FILE = `storage.sqlite` |

### Explicit non-issues (verified this review)

| Guard | Status | Proof |
| --- | --- | --- |
| Dual-read intentional | ✅ | secrets.ts decode accepts plaintext + enc:v1; module header |
| Encrypt-on-write when key set | ✅ | `encodeSecretForStorage` fail-closed without `enc:v1:` |
| Fail-closed encrypt | ✅ | encryption.ts throws when key set and cipher/derive fails |
| API keys hash-primary | ✅ | apiKeys.ts `key_hash = ?` first |
| Migrate exported + idempotent | ✅ | `migratePlaintextSecretsToEncrypted` exported; tests cover rewrite |
| F-SEC-W2-005 flag order | ✅ | `_secretsEncryptMigrated = true` then try migrate (accepted under D1) |
| No unauth HTTP migrate | ✅ | no new route; ops note only |
| 0041 not reopened | ✅ | evidence + no secrets behavior change |
| DATABASE_GUIDE cross-link | ✅ | points to SECRETS_AT_REST.md |
| Existing unit tests | ✅ | db-secrets + db-encryption 18 pass this review |

### Threat model re-check (security-harness / secrets-management)

| Element | Assessment |
| --- | --- |
| **Asset** | Process-root secrets (`JWT_SECRET`, `API_KEY_SECRET`) and related encrypted fields at rest |
| **Threat** | Misclassifying dual-read as “encrypt failed”; silent disable of dual-read → boot brick; unauth migrate dump |
| **Disposition** | Dual-read = intentional compatibility while key set + legacy rows exist; not a 0041 regression |
| **Residual accepted** | Plaintext rows may remain until lazy migrate/write; F-SEC-W2-005 in-process non-retry until restart |
| **Hard Rules** | No `:21000` probe; no secrets in docs beyond fixture guidance; no new HTTP secret rewrite |

## Evidence Reviewed

### Source / docs

- `src/lib/db/secrets.ts` — encode/decode dual-read, ensure migrate, `_secretsEncryptMigrated`, `migratePlaintextSecretsToEncrypted`
- `src/lib/db/encryption.ts` — `isEncryptionEnabled`, encrypt fail-closed, **no** `OMNIROUTE_CRYPT_KEY`
- `src/lib/db/apiKeys.ts` — hash-only primary + legacy dual-read notes
- `src/lib/db/proxies.ts` — `extractRelayAuth` relayAuthEnc preferred
- `src/lib/db/core.ts` — `SQLITE_FILE` → `storage.sqlite`
- `docs/security/SECRETS_AT_REST.md` (post path-to-100)
- `docs/ops/DATABASE_GUIDE.md` cross-link
- `CHANGELOG.md` Unreleased Changed
- `tests/unit/db-secrets.test.ts`, `tests/unit/db-encryption.test.ts`

### Commands run (this review)

```bash
rg -n 'OMNIROUTE_CRYPT_KEY|STORAGE_ENCRYPTION_KEY' src/lib/db/encryption.ts
# only STORAGE_ENCRYPTION_KEY

rg -n 'OMNIROUTE_CRYPT_KEY' src/ open-sse/ bin/   # no runtime hits

node --import tsx/esm --test tests/unit/db-secrets.test.ts tests/unit/db-encryption.test.ts
# → 18 pass
```

### Commands not run and why

- Live prod DB inspection on `:21000` — **forbidden** by task + agent rules
- D2/D3 implementation — not chosen under D1

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Disposition recorded D1 | ✅ | task evidence + SECRETS_AT_REST |
| Security/ops doc landed | ✅ | `docs/security/SECRETS_AT_REST.md` |
| Ops checklist (key → restart → verify) | ✅ | corrected path post path-to-100 |
| Existing secrets tests pass | ✅ | 18/18 |
| 0041 not re-opened | ✅ | explicit |
| CHANGELOG if needed | ✅ | docs Changed bullet |
| F-SEC-W2-005 disposition | ✅ | accepted restart-retry |

## Path To 100

**Closed** in this review via SSOT accuracy fixes + checkbox promote hygiene.

Out-of-scope follow-ups (do **not** reopen 0074 unless product chooses D2/D3):

1. Optional D3: set `_secretsEncryptMigrated` only after successful migrate
2. Optional D2: documented operator force-migrate invocation (still no unauth HTTP)
3. Optional ENVIRONMENT.md stale `OMNIROUTE_CRYPT_KEY` row cleanup / or restore real code fallback

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
- Latest: docs/reports/reviews/2026-07-19-task-0074-secrets-dual-read-residual-disposition-security-review.md
- Score: 100 · Verdict: ACCEPTED_100 · Reviewer: gt-security-reviewer (builders)
- Path-to-100: SECRETS_AT_REST STORAGE_ENCRYPTION_KEY-only + storage.sqlite ops path
- Disposition: D1 · F-SEC-W2-005 accepted restart-retry · 0041 not reopened
```

## Return To Parent

| Field | Value |
|-------|-------|
| Report | `docs/reports/reviews/2026-07-19-task-0074-secrets-dual-read-residual-disposition-security-review.md` |
| Score | **100** |
| Verdict | **ACCEPT** |
| Top blockers | none (doc accuracy fixed in-review) |
| Path-to-100 | closed (in-review) |
| Lane move | **→ `docs/tasks/03-review/`** (S=100) |
