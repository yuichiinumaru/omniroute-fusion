# Review Report: Task 0041 — Secrets at Rest Encryption — Independent Security Return-Review 2026-07-18

## Review Lineage

- **Current task**: Task 0041 (`omniroute-secrets-at-rest-encryption`); live path `docs/tasks/03-review/0041-omniroute-secrets-at-rest-encryption.md`
- **Previous reports read** (UNTRUSTED prior scores — re-proved live):
  - `docs/reports/reviews/2026-07-18-task-0041-secrets-at-rest-rereview.md` (claimed 100)
  - `docs/reports/reviews/2026-07-11-task-0041-secrets-at-rest-review.md` (78, NEEDS FIX)
- **Source findings**: F-05-001, F-05-W2-003, F-05-002, F-05-003, F-05-W2-001; stretch F-05-007–010
- **Review mode**: independent FULL security return-review (adversarial live proof)
- **Reviewer profile**: `gt-security-reviewer` (agentID=`reviewers`)
- **Harnesses**: security-harness (secrets-management), code-quality-harness, tsjs

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` — remain `docs/tasks/03-review/`
- **Patches this session**: none (primary contract already closed; stretch backlog only)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| F-05-001 JWT/API secrets encrypt | 100 | Live temp-DB: JSON-wrapped `enc:v1:` at rest; plaintext absent |
| F-05-W2-003 upsert/rotate | 100 | `INSERT OR REPLACE`; rotation returns new value |
| F-05-002 hash-only API keys | 100 | `omni_hashonly_` placeholder at rest; validate by hash; metadata-by-id |
| F-05-003 / W2-001 PSD | 100 | `PSD_SECRET_KEYS` SSOT + lazy re-encrypt migrate + response redact |
| Crypto rigor | 100 | AES-256-GCM; `authTagLength: 16`; encrypt fail-closed when key configured |
| Consumers after hash-only | 100 | Playground policy-by-id; CLI fail-loud; unit pack green |
| Tests / evidence freshness | 100 | Fresh: secrets + apiKeys + playground #3503 = **71/71**; broader pack previously 106+ |

## Adversarial Live Proof (this session)

```text
# Temp DATA_DIR + STORAGE_ENCRYPTION_KEY
persistSecret(jwt) → raw SQLite value JSON-string of enc:v1:… ; get returns plaintext
persistSecret rotate → new value; old plaintext absent from ciphertext blob
encrypt()/decrypt() round-trip OK
isEncryptionEnabled true when key set
encrypt fail-closed path present (throws when key configured + derive/cipher fails)

# Unit
node --import tsx/esm --test \
  tests/unit/db-secrets.test.ts \
  tests/unit/db-apiKeys-crud.test.ts \
  tests/unit/playground-key-policy-3503.test.ts
→ 71 pass / 0 fail
```

### Contract map

| Exit / MUST | Status | Proof |
| --- | --- | --- |
| Ciphertext when encryption key present | ✅ | live + unit |
| Second persist replaces (not IGNORE) | ✅ | `INSERT OR REPLACE` + rotation tests |
| API keys not stored plaintext | ✅ | create stores `omni_hashonly_`; hash validate |
| Legacy migrate | ✅ | secrets + apiKeys + PSD migrate helpers + tests |
| PSD cookie/session encrypt + sanitizer | ✅ | encryption helpers + requestDefaults redact SSOT |
| Env prefer over DB at boot | ✅ | instrumentation dual path (not re-broken) |
| No secret logs in fixtures | ✅ | tests assert placeholder / null secret |

## Findings

| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| — | — | none blocking | Primary P0/P1 closed under live adversarial proof |
| N5 stretch | Info | residual OK | F-05-008 proxies / F-05-009 webhooks / F-05-010 version_manager — explicit task stretch |
| Dual-mode | Info | by design | Without `STORAGE_ENCRYPTION_KEY`, secrets passthrough plaintext (dev); fail-closed only when key configured |

## Guards (must stay green)

- G1: secrets row never contains raw JWT/API secret when key set
- G2: `persistSecret` rotation via REPLACE
- G3: api_keys `key` column placeholder; auth via `key_hash`
- G4: playground cannot rehydrate secret by id
- G5: encrypt throws instead of plaintext when key configured and cipher fails
- G6: PSD secret keys inventory shared encrypt/redact

## Lane Outcome

- **S = 100** → stay `03-review/`
- **Path-to-100**: N/A (already 100; no code patch required this session)

## Review Ledger Entry

- **Date**: 2026-07-18
- **Reviewer**: `gt-security-reviewer` (agentID=`reviewers`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: this file
- **Previous**: `2026-07-18-task-0041-secrets-at-rest-rereview.md`, `2026-07-11-task-0041-secrets-at-rest-review.md`
