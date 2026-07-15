# Review Report: Task 0041 — Secrets at Rest Encryption — 2026-07-11

## Review Lineage

- **Current task**: Task 0041 (`omniroute-secrets-at-rest-encryption`); was `docs/tasks/03-review/0041-…`, moved to `docs/tasks/02-doing/` after this review
- **Previous reports read**: none under `docs/reports/reviews/` for 0041
- **Related reports considered**:
  - Source slice: `docs/reports/05-lib-data-auth.md` (F-05-001, F-05-W2-003, F-05-002, F-05-003, F-05-W2-001; stretch F-05-007–010)
  - Soft coord: Task 0049 key-reveal / hash-only product outcome
  - Commit: `69c4698` (`fix(security): close P0 secrets-at-rest + chat envelope (0041, 0042)`)
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `78/100`
- **Verdict**: `NEEDS FIX`
- **Lane recommendation**: `return-to-doing` (S < 90 — move to `docs/tasks/02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 80 | Primary store-path fixes land; hash-only leaves id→secret consumers broken |
| F-05-001 secrets encrypt | 96 | `enc:v1:` at rest when key set; fail-closed refuse plaintext write |
| F-05-W2-003 upsert/rotate | 98 | `INSERT OR REPLACE` + rotation tests |
| F-05-002 api_keys hash-only | 72 | DB path solid; playground + CLI id-resolve regressions unaddressed |
| F-05-003 / F-05-W2-001 PSD | 88 | Prefer keys encrypt + response redact; incomplete key inventory + no bulk re-encrypt migrate |
| Tests / verification | 70 | Intentional 0041 pack green (78); `playground-key-policy-3503` **fails** |
| Scope / hygiene | 92 | CHANGELOG Security entry; no new SQL migration (lazy) acceptable |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none (first pass)

### Regressions

- `REGRESSION` R1: Dashboard playground key-by-id resolution returns `null` after hash-only strip (`tests/unit/playground-key-policy-3503.test.ts` fails).
- `REGRESSION` R2: CLI settings / `resolveApiKey(apiKeyId)` can no longer rehydrate secrets by id (silent fall-through).

### New Findings

- `NEW` N1 (High): Hash-only without adapting id-based secret consumers.
- `NEW` N2 (Medium): PSD credential encryption only on next write — no lazy re-encrypt migration for existing cookie rows.
- `NEW` N3 (Low): `PSD_SECRET_KEYS` / sanitizer omit many `webSessionCredentials.storageKeys` entries.
- `NEW` N4 (Info): Stretch F-05-007 fail-closed only on secrets path; connection `encrypt()` still fail-open.
- `NOTE` N5 (Info): Stretch F-05-008–010 (proxy/webhook/version_manager) correctly residual.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full `npm run typecheck:core` / `npm run lint` not re-run this session; prior completion evidence claimed clean — not treated as functional failure. Targeted unit packs re-run fresh.
- `EXTERNAL_BLOCKER`: none

## Findings

### Blocking

| ID | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- |
| R1 / N1 | **HIGH** | Hash-only + `stripStoredApiKeyMaterial` makes `getApiKeyById().key` always `null`, breaking playground policy-by-id | `apiKeys.ts:521-526` sets `key=null`; `apiKeyPolicy.ts:301-302` returns `row?.key`; fresh run: `playground-key-policy-3503` **fails** (expected secret, actual `null`). Downstream: `apiKeyResolver.ts:10-14`, `cli-tools/{claude,qwen,codex}-settings` keyId paths, `keys/[id]/reveal` always 404 for key body | **Do not restore plaintext column.** (1) Playground: resolve **metadata by id** (new `getApiKeyMetadataById` / policy branch on `x-omniroute-playground-key-id`) without reconstituting secret. (2) CLI resolve-by-id: require one-time paste / create-new-key, or explicit regenerate flow — never expect DB re-read of secret. (3) Update `#3503` + CLI tests for new contract. Reveal 404 is acceptable product outcome with 0049. |
| R2 | **HIGH** | Same root as N1 for CLI tool config writers | `claude-settings/route.ts:117-120`, `codex-settings`, `qwen-settings`, `apiKeyResolver.getOrCreateApiKey` fall through when `keyRecord.key` null — may write wrong/missing token | Same as R1 (2): UX that selects an existing key must obtain secret only at create/regenerate time, not from DB |

### Non-blocking (path-to-100)

| ID | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- |
| N2 | Medium | Existing PSD cookie rows stay plaintext until connection update | `encryptProviderSpecificData` only on write (`encryption.ts:255-267`); no `migratePlaintextPsd…` unlike `migratePlaintextSecretsToEncrypted` / `migrateApiKeysToHashOnly` | Add lazy scan/re-encrypt of `provider_connections.provider_specific_data` secret keys when encryption enabled (idempotent), + unit on temp DB |
| N3 | Low | Incomplete secret-key inventory vs web-session providers | `PSD_SECRET_KEYS` / `PSD_RESPONSE_REDACT_KEYS` cover cookie/token/sso/… but not e.g. `ssxmod_itna`, `__Secure-1PSID`, `abra_sess`, `tongyi_sso_ticket` from `webSessionCredentials.ts` | Extend both lists from `storageKeys` SSOT (or encrypt whole PSD string blob) |
| N4 | Info | Stretch F-05-007 partial | `secrets.ts:26-31` fail-closed; `encryption.ts:163-170` still returns plaintext on encrypt error for connection fields | Optional: throw when `isEncryptionEnabled()` and cipher fails |
| N5 | Info | Stretch F-05-008–010 residual | Task stretch | Backlog / later task |

### Explicit non-issues (verified)

| Guard | Status | Proof |
| --- | --- | --- |
| F-05-001 ciphertext at rest | ✅ | `secrets.ts:25-35,89-97`; test asserts `enc:v1:` and plaintext absent from DB row |
| F-05-W2-003 rotate | ✅ | `INSERT OR REPLACE`; tests rotation under encryption |
| Dual-read legacy secrets | ✅ | `decodeSecretFromStorage` + `migratePlaintextSecretsToEncrypted` |
| Env prefer over DB | ✅ | `instrumentation-node.ts:43-68` only restores/persists when env empty |
| F-05-002 create/regen hash-only | ✅ | `createApiKey` / `regenerateApiKey` store `omni_hashonly_` + hash; validate by hash works; placeholder cannot auth |
| F-05-002 migrate legacy rows | ✅ | `migrateApiKeysToHashOnly` + unit |
| F-05-003 write encrypt / read decrypt | ✅ | `encryptConnectionFields` → PSD keys; providers insert/update encrypt; cookie dedup decrypts before compare (`providers.ts:234-236`) |
| F-05-W2-001 sanitizer | ✅ | `requestDefaults.ts:220-254`; unit strips cookie/token/sso/… |
| rowToCamel parses PSD JSON | ✅ | `caseMapping.ts:43-48` so decrypt sees object keys |
| CHANGELOG | ✅ | Unreleased Security Task 0041 entry |
| Intentional unit pack | ✅ | Fresh: `db-secrets` + `db-encryption` + `db-apiKeys-crud` + `request-defaults-store-session` → **78/78 pass** |
| Anti-hallucination | ✅ | No reintroduction of bulk plaintext store; validate primary is `key_hash` |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-05-001 no plaintext JWT/API secret writes when key present | ✅ | `encodeSecretForStorage` refuses non-`enc:v1:` |
| F-05-W2-003 upsert/rotate | ✅ | `INSERT OR REPLACE` + tests |
| F-05-002 hash-only + migration | ⚠️ | Storage/validation ✅; **call-site adaptation incomplete** (R1/R2) |
| F-05-003 PSD encrypt | ⚠️ | New writes ✅; existing-row migrate missing (N2) |
| F-05-W2-001 sanitizer web-session keys | ✅ | Prefer keys + test; residual provider-specific keys (N3) |
| Unit tests secrets + apiKeys + PSD sanitize | ⚠️ | Intentional pack green; **related regression pack fails** |
| typecheck / lint | ⚪ | Not re-run this session; prior evidence claimed pass |
| CHANGELOG security entry | ✅ | Present |
| Migration file if schema change | ✅ N/A | Lazy re-encrypt; placeholder keeps NOT NULL UNIQUE |

## Fresh verification commands

```bash
# Intentional 0041 pack — PASS 78/78
node --import tsx/esm --test \
  tests/unit/db-secrets.test.ts \
  tests/unit/db-encryption.test.ts \
  tests/unit/db-apiKeys-crud.test.ts \
  tests/unit/request-defaults-store-session.test.ts

# Hash-only consumer regression — FAIL 1/4
node --import tsx/esm --test tests/unit/playground-key-policy-3503.test.ts
```

## Required fix plan (builder)

1. **Playground policy-by-id** without secret reconstitution:
   - Add id-based metadata load used by `enforceApiKeyPolicy` when `x-omniroute-playground-key-id` + dashboard session.
   - Update `tests/unit/playground-key-policy-3503.test.ts` to assert policy/metadata resolution (not equality to stored secret).
2. **CLI / resolver by id**: document + implement “secret only at create/regenerate”; fail loudly if id selected without provided secret; keep `createApiKey` one-shot return.
3. **Optional N2**: lazy PSD re-encrypt migration mirror secrets migrate.
4. Re-run intentional pack + playground + a CLI settings unit if present.

## Verdict

**NEEDS FIX** — primary at-rest encryption for JWT/API secrets, api_keys hash storage, and PSD write/read paths are real and tested, but hash-only was shipped without adapting id→secret consumers, proven by a failing existing regression suite. Return to `02-doing`.
