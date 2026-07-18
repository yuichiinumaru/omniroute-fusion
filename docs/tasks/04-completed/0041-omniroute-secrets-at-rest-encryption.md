# Task 0041: Secrets at Rest — JWT/API Secrets, API Keys Hash, PSD Cookies

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S2)
> **Action type**: HARDEN
> **Blocks**: soft — Task 0049 key-reveal policy should align with hash-only outcome
> **Depends on**: none
> **Architect-2**: Upgraded 2026-07-11 — F-05-W2-003 upsert/rotate promoted to primary

---

## Source reports (builder reference)

Primary:
- `docs/reports/05-lib-data-auth.md` — F-05-001, F-05-W2-003, F-05-002, F-05-003, F-05-W2-001 (stretch: F-05-007, F-05-008–010)

Also relevant:
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context

---

## Objective

Eliminate high-impact **at-rest credential exposure** in SQLite:

1. **F-05-001 (P0)**: Persist JWT / API signing secrets via field encryption (`enc:v1:`), never plaintext `key_value` blobs when encryption is available.
2. **F-05-W2-003 (P2 → primary)**: Replace write-once `INSERT OR IGNORE` with **upsert/replace** so rotation and encrypt-migration can rewrite values.
3. **F-05-002 (P1)**: Stop storing inference API keys in plaintext; validate by hash only (accessTokens pattern).
4. **F-05-003 (P1)**: Encrypt web-session / cookie credentials in `provider_specific_data` (or encrypt the PSD blob).
5. **F-05-W2-001 (P1)**: Extend PSD response sanitizer so web-session keys are never returned to clients.

Stretch: fail-closed encrypt (F-05-007), proxy/webhook/version_manager secrets (F-05-008–010).

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-05-001** | P0 | JWT / API signing secrets stored plaintext in SQLite |
| **F-05-W2-003** | P2→primary | `persistSecret` is write-once (`INSERT OR IGNORE`); cannot rotate/replace |
| **F-05-002** | P1 | Inference API keys persisted in plaintext alongside hash |
| **F-05-003** | P1 | Web-session / cookie credentials unencrypted in PSD |
| **F-05-W2-001** | P1 | PSD response sanitizer omits web-session credential keys |
| Stretch | P2 | F-05-007 fail-open encrypt; F-05-008 proxies; F-05-009 webhooks; F-05-010 version_manager keys |

See **Source reports** above for full relative paths.

### Evidence anchors (verified 2026-07-11)

- `src/lib/db/secrets.ts:7-24` — `getPersistedSecret` / `persistSecret` with `INSERT OR IGNORE` and plaintext `JSON.stringify(value)`
- `src/instrumentation-node.ts` — writes `jwtSecret` / `apiKeySecret` via persist
- `src/lib/db/apiKeys.ts` — stores `key` + `key_hash`; validate matches either
- `src/lib/db/accessTokens.ts` — correct hash-only pattern
- `src/lib/db/encryption.ts` — `encryptConnectionFields` misses PSD cookies
- `src/lib/db/webSessionDedup.ts` — cookie/token keys in PSD
- PSD sanitizer omit list incomplete for session material

### Out of scope

- Dual-mode auth health false-positives (0006)
- Live 0036 deploy verify
- Relay token budget enforcement (stretch / 0050)
- Handler auth for credential routes (0049) — coordinate hash-only + no bulk plaintext reveal

---

## Test Requirements

- MUST: with `STORAGE_ENCRYPTION_KEY` set, `persistSecret` round-trips ciphertext at rest (DB value starts with `enc:v1:` or project convention)
- MUST: second `persistSecret(sameKey, newValue)` **replaces** prior value (rotation) — not silent no-op under INSERT OR IGNORE
- MUST: creating/regenerating an API key does not leave plaintext `key` column (or leaves null after migration); validate still works via hash
- MUST: one-time migration path for existing plaintext keys/secrets (test on temp DB)
- MUST: PSD containing cookie/session fields encrypts on write / decrypts on read path used by providers
- MUST: API mapping sanitizer strips web-session keys (assert response JSON lacks cookie/token fields)
- MUST NOT break boot when secrets already in env (prefer env over DB)

---

## Exit Conditions (GDD/TDD)

- [x] F-05-001 closed — no plaintext JWT/API signing secret writes when encryption key present
- [x] F-05-W2-003 closed — secrets upsert/rotate works; encrypt migration can rewrite rows
- [x] F-05-002 closed — hash-only validation; migration for existing rows + id→secret consumers adapted (playground metadata-by-id; CLI fail-loud)
- [x] F-05-003 closed — PSD credential material encrypted on write + lazy re-encrypt migration for existing rows
- [x] F-05-W2-001 closed — sanitizer coverage for web-session keys (storageKeys inventory aligned)
- [x] Unit tests green for secrets + apiKeys + PSD sanitize (temp SQLite + `resetDbInstance` cleanup)
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` — no new errors on touched modules
- [x] CHANGELOG.md security entry (Unreleased; residual consumer fix covered in Changelog Draft below)
- [x] Migration file under `src/lib/db/migrations/` if schema/column change required — N/A (lazy re-encrypt)

---

## Details

### What

Subtasks:

- [x] **Ler código existente** e o report em `docs/reports/05-lib-data-auth.md` listado em Source reports: `src/lib/db/secrets.ts`, `encryption.ts`, `apiKeys.ts`, `accessTokens.ts`, `providers.ts` PSD paths, `webSessionDedup.ts`, PSD sanitizer module(s), `src/instrumentation-node.ts`, migrations pattern, existing encryption tests
- [x] Design dual-read: ciphertext preferred, plaintext legacy until migrated
- [x] Fix `persistSecret` to upsert/replace (F-05-W2-003) **before or with** encrypt write path
- [x] Implement secret encrypt/decrypt on persist/get
- [x] Implement api_keys hash-only + migration helper
- [x] Implement PSD encryption for credential keys or whole blob
- [x] Expand response sanitizer + unit tests
- [x] Stretch fail-closed encrypt errors if time (secrets path)
- [x] CHANGELOG + evidence
- [x] Pass-2: playground metadata-by-id + CLI fail-loud + PSD migrate + storageKeys inventory

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/db/secrets.ts` | Modificar — encrypt at rest + upsert |
| `src/lib/db/encryption.ts` | Ler + estender helpers se necessário |
| `src/lib/db/apiKeys.ts` | Modificar — hash-only |
| `src/lib/db/accessTokens.ts` | Ler — pattern reference |
| `src/lib/db/providers.ts` | Modificar — PSD encrypt/decrypt |
| `src/lib/db/webSessionDedup.ts` | Ler — key inventory |
| PSD sanitize helper (grep `provider_specific` / redaction) | Modificar |
| `src/instrumentation-node.ts` | Ler + adjust secret bootstrap if needed |
| `src/lib/db/migrations/` | Nova migration se coluna/schema |
| `tests/unit/` | Criar/expandir |
| `CHANGELOG.md` | Entry |

### How

1. Copy accessTokens hash-only validation pattern for apiKeys.
2. Reuse `encrypt()`/`decrypt()` for secrets store; refuse plaintext write when key configured (stretch fail-closed F-05-007).
3. Inventory PSD credential keys from webSessionDedup + providers; encrypt those keys or entire JSON.
4. Migration: scan existing rows, transform offline, unit-test on fixture DB.

### Why

DB backup / DATA_DIR leak is a common operator failure mode. Root signing secrets and client API keys in plaintext make that compromise total. Encrypt without upsert leaves rotation and migration stuck on the first written value.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT log decrypted secrets in tests or CHANGELOG.
> DO NOT force encryption without migration path for existing installs.
> DO NOT leave validateKey matching plaintext after claiming hash-only.
> DO NOT leave `INSERT OR IGNORE` as the only write path after claiming rotation/encrypt migration works.

> [!IMPORTANT]
> Grep all `persistSecret` / `api_keys` writers before changing schema.
> Hard Rule #18: TDD with temp SQLite fixtures.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**
- [ ] **Zod Validation**: N/A unless API reveal shape changes
- [ ] **Security**: no secret commits
- [ ] **Error Sanitization**: N/A
- [ ] **No Raw SQL** outside `src/lib/db/`
- [ ] **Migrations** idempotent in transaction

---

## 📋 Completion Evidence (preenchido pelo agente executor)

### Pass 1 (2026-07-11) — primary store paths

- **Arquivos**: `secrets.ts` encrypt+upsert; `encryption.ts` PSD encrypt/decrypt; `apiKeys.ts` hash-only; `providers.ts` PSD decrypt on cookie compare; `requestDefaults.ts` redact; unit packs; CHANGELOG Security entry
- **Finding IDs**: F-05-001, F-05-W2-003, F-05-002 (store), F-05-003 (write), F-05-W2-001 (prefer keys); stretch F-05-007 secrets path
- **Migration**: lazy re-encrypt (no SQL file)

### Pass 2 (2026-07-18) — review NEEDS FIX residuals (R1/R2/N2/N3)

- **Arquivos criados/modificados**:
  - `src/lib/db/apiKeys.ts` — `getApiKeyMetadataById`, `isModelAllowedForMetadata`, `buildApiKeyMetadataFromRow`
  - `src/lib/localDb.ts` — re-export metadata-by-id + metadata model check
  - `src/shared/utils/apiKeyPolicy.ts` — playground policy-by-id (no secret rehydrate); `resolvePlaygroundKeyMetadata`; deprecated `resolvePlaygroundTestKey` → null
  - `src/shared/services/apiKeyResolver.ts` — fail-loud `ApiKeySecretUnavailableError` when id selected without secret
  - `src/app/api/cli-tools/{claude,codex,qwen}-settings/route.ts` — use resolver; 400 on unrehydratable id
  - `src/lib/db/encryption.ts` — expanded `PSD_SECRET_KEYS` (web-session storageKeys); `providerSpecificDataNeedsEncryption`
  - `src/lib/db/providers.ts` — `migratePlaintextPsdSecretsToEncrypted` lazy on connection read
  - `src/lib/providers/requestDefaults.ts` — expanded `PSD_RESPONSE_REDACT_KEYS`
  - `tests/unit/playground-key-policy-3503.test.ts` — metadata/policy assertions (not secret equality)
  - `tests/unit/cli-mitm-schema.test.ts` — fail-loud + explicit-secret prefer
  - `tests/unit/db-encryption.test.ts` — storageKeys inventory + needsEncryption
  - `tests/unit/db-providers-crud.test.ts` — PSD migrate temp-DB
  - `tests/unit/request-defaults-store-session.test.ts` — provider-specific redact keys
- **Review residuals closed**: R1, R2, N2, N3
- **Still residual (stretch/info)**: N4 connection `encrypt()` fail-open; N5 F-05-008–010 proxy/webhook/version_manager
- **Testes** (fresh 2026-07-18):
  ```bash
  node --import tsx/esm --test \
    tests/unit/playground-key-policy-3503.test.ts \
    tests/unit/cli-mitm-schema.test.ts \
    tests/unit/db-encryption.test.ts \
    tests/unit/request-defaults-store-session.test.ts \
    tests/unit/db-secrets.test.ts \
    tests/unit/db-apiKeys-crud.test.ts \
    tests/unit/db-providers-crud.test.ts
  ```
  → **106/106 pass**
- **typecheck**: `npm run typecheck:core` → PASS
- **eslint**: touched modules → 0 errors
- **CHANGELOG**: Unreleased Security Task 0041 entry present (pass 1); Changelog Draft for pass 2 below
- **Agente executor**: gt-ts-engineer (builders) pass-2 residual close
- **Data de conclusão (pass 2)**: 2026-07-18
- **Task location**: left in `docs/tasks/02-doing/` (builder must not move)

### Changelog Draft (pass 2 — parent/reviewer to merge)

```yaml
task: "0041"
agent: "gt-ts-engineer"
project: "omniroute"
title: "Adapt hash-only API key consumers + PSD re-encrypt migrate"
description: |
  Playground applies key policy by id via metadata (no secret rehydrate).
  CLI resolveApiKey fails loud when keyId selected without secret.
  PSD secret-key inventory covers web-session storageKeys; lazy migrate
  encrypts legacy plaintext cookie rows when STORAGE_ENCRYPTION_KEY set.
summary: "Close review R1/R2/N2/N3 for secrets-at-rest path-to-100"
verification: "106 unit tests + typecheck:core pass"
```

### Entrypoint Chain Proof

- **Claim**: Playground can enforce selected key policy without reconstituting secret
- **Entrypoint**: `enforceApiKeyPolicy` (`src/shared/utils/apiKeyPolicy.ts`)
- **Adapter**: `resolvePlaygroundKeyMetadata` → dashboard session gate + header
- **Helper**: `getApiKeyMetadataById` / `isModelAllowedForMetadata` (`src/lib/db/apiKeys.ts`)
- **Regression test**: `tests/unit/playground-key-policy-3503.test.ts` (policy deny/allow by id; secret stays null)
- **Evidence classification**: unit / temp-SQLite integration

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Previous Reports

1. `docs/reports/reviews/2026-07-11-task-0041-secrets-at-rest-review.md` — 78/100 NEEDS FIX (return to doing)
2. `docs/reports/reviews/2026-07-18-task-0041-secrets-at-rest-rereview.md` — **100/100 ACCEPT** (promote 03-review)

### Review Ledger (2026-07-18 — independent security return-review)

- **Reviewer**: `gt-security-reviewer` (agentID=`reviewers`)
- **Veredito**: **ACCEPTED_100**
- **Score**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-18-task-0041-secrets-at-rest-return-review.md`
- **Previous Reports**:
  - `docs/reports/reviews/2026-07-18-task-0041-secrets-at-rest-rereview.md` (claimed 100 — re-proved)
  - `docs/reports/reviews/2026-07-11-task-0041-secrets-at-rest-review.md` (78, NEEDS FIX)
- **Notas**: Live adversarial proof: enc:v1 at rest + rotate; hash-only api_keys; PSD SSOT; playground #3503; secrets+apiKeys+playground **71/71**. Stretch F-05-008–010 residual OK. Lane: stay `03-review/`.
- **Patches**: none

### Prior Review Ledger (2026-07-18 — security re-review under builders)

- **Reviewer**: `gt-security-reviewer` (parent `builders`)
- **Veredito**: **ACCEPT**
- **Score**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-18-task-0041-secrets-at-rest-rereview.md`
- **Notas**: Prior R1/R2/N2/N3 closed by builder pass-2; N4 encrypt fail-closed verified; re-review fixed residual hash-only consumers (combo-test Authorization, evals fail-loud, cloud enable mint, CLI 400 map). Stretch F-05-008–010 backlog only. Fresh: 118 unit + combo-test 9/9 + typecheck:core PASS. Lane: `02-doing` → `03-review`.

### Builder residual status (closed at re-review)

| Review ID | Status | Fix |
|-----------|--------|-----|
| R1 / N1 playground id→secret | **CLOSED** | metadata-by-id + `enforceApiKeyPolicy` playground branch; #3503 rewritten |
| R2 CLI resolve-by-id | **CLOSED** | `ApiKeySecretUnavailableError` + 400 across CLI/settings routes |
| N2 PSD lazy re-encrypt | **CLOSED** | `migratePlaintextPsdSecretsToEncrypted` + unit |
| N3 storageKeys inventory | **CLOSED** | PSD_SECRET_KEYS + redact SSOT; inventory unit |
| N4 encrypt fail-open | **CLOSED** | `encrypt()` throws when key configured |
| NR1 combo-test Authorization | **CLOSED** | create/regenerate `combo-test-internal` one-shot |
| NR2 evals id→secret | **CLOSED** | fail-loud hash-only message |
| NR3 cloud enable rehydrate | **CLOSED** | mint on enable; GET does not mint on poll |
| N5 F-05-008–010 | residual (stretch) | backlog |

### Historical note (2026-07-11)

- **Reviewer**: independent code-quality reviewer (`reviewers` parent)
- **Veredito**: NEEDS FIX · **Score**: 78/100 · Report: `docs/reports/reviews/2026-07-11-task-0041-secrets-at-rest-review.md`

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
