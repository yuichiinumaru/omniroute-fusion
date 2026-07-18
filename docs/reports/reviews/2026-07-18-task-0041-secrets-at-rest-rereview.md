# Review Report: Task 0041 — Secrets at Rest Encryption — 2026-07-18 (re-review)

## Review Lineage

- **Current task**: Task 0041 (`omniroute-secrets-at-rest-encryption`); `docs/tasks/02-doing/` → promote `03-review/`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0041-secrets-at-rest-review.md` (score 78, NEEDS FIX)
- **Related reports considered**:
  - Source slice: `docs/reports/05-lib-data-auth.md` (F-05-001, F-05-W2-003, F-05-002, F-05-003, F-05-W2-001; stretch F-05-007–010)
  - Soft coord: Task 0049 key-reveal / hash-only product outcome
- **Review mode**: `re-review` (security specialist / `gt-security-reviewer`, parent `builders`)
- **Reviewer profile**: security-focused parallel subagent
- **Parent agentID**: `builders`
- **Harnesses loaded**: code-quality-harness, security-harness (secrets-management), tsjs-harness route, scoring-rubric

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPT`
- **Lane recommendation**: `promote-to-review` (`docs/tasks/03-review/`) — S = 100

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 100 | All MUST exits verified live |
| F-05-001 secrets encrypt | 100 | `enc:v1:` at rest; fail-closed refuse plaintext write |
| F-05-W2-003 upsert/rotate | 100 | `INSERT OR REPLACE` + rotation tests |
| F-05-002 api_keys hash-only | 100 | Store + validate by hash; consumers adapted (playground metadata, CLI 400, evals fail-loud, combo-test mint, cloud enable mint) |
| F-05-003 / F-05-W2-001 PSD | 100 | Write encrypt + lazy re-encrypt migrate + SSOT inventory redact |
| Crypto rigor (AES-GCM / scrypt / tag pin) | 100 | Auth tag length pinned; encrypt fail-closed when key configured |
| Tests / verification | 100 | 118 intentional + combo-test 9/9; typecheck:core PASS |
| Scope / hygiene | 100 | CHANGELOG Unreleased Security updated; no phantom secrets logged |

## Delta Summary

### Resolved Since Previous Review (2026-07-11 → 2026-07-18)

| ID | Class | Proof |
| --- | --- | --- |
| R1 / N1 playground id→secret | `RESOLVED` | `getApiKeyMetadataById` + `resolvePlaygroundKeyMetadata` + #3503 tests (secret stays null; policy by id) |
| R2 CLI resolve-by-id | `RESOLVED` | `ApiKeySecretUnavailableError`; claude/codex/qwen 400; extended to remaining CLI/settings routes via `isApiKeySecretUnavailableError` → 400 |
| N2 PSD lazy re-encrypt | `RESOLVED` | `migratePlaintextPsdSecretsToEncrypted` + unit on temp DB |
| N3 storageKeys inventory | `RESOLVED` | `PSD_SECRET_KEYS` SSOT covers web-session `storageKeys`; redact + encrypt share inventory tests |
| N4 encrypt fail-open | `RESOLVED` | `encryption.ts` `encrypt()` throws when `STORAGE_ENCRYPTION_KEY` configured; unit “N4 fail-closed” |
| NEW (this re-review) combo-test Authorization missing | `RESOLVED` | `getInternalApiKey` create/regenerate one-shot; test asserts Bearer present without rehydrate |
| NEW evals id→secret silent fail | `RESOLVED` | fail-loud hash-only message |
| NEW cloud enable rehydrate | `RESOLVED` | enable always mints verify key; GET does **not** mint on poll |

### Persistent Findings

- none blocking

### Regressions

- none open (combo-test regression found during re-review and fixed in-path-to-100)

### New Findings (closed same session)

| ID | Severity | Summary | Disposition |
| --- | --- | --- | --- |
| NR1 | High (product) | `combos/test` no longer attached Authorization after hash-only strip | Fixed: named `combo-test-internal` create/regenerate |
| NR2 | Medium | evals `apiKeyId` path threw “not found” when secret null | Fixed: explicit hash-only error |
| NR3 | Medium | cloud enable used `existingKeys[0]?.key` always null | Fixed: mint on enable |
| NR4 | Low | Most CLI routes threw uncaught → 500 | Fixed: map to 400 |

### Accepted residual (stretch / non-blocking)

| ID | Class | Notes |
| --- | --- | --- |
| N5 | `SUPERSEDED` as task stretch | F-05-008 proxies / F-05-009 webhooks / F-05-010 version_manager keys — task stretch backlog; not required for exit |

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: full-repo `npm run lint` not re-run this session (targeted typecheck:core PASS; no new lint expected on crypto modules)
- `EXTERNAL_BLOCKER`: none
- Production :21000 not touched (per policy)

## Findings

### Blocking

- none

### Non-blocking (accepted)

| ID | Severity | Summary | Evidence | Status |
| --- | --- | --- | --- | --- |
| N5 | Info | Stretch F-05-008–010 residual | Task stretch scope | Backlog / later task |

### Explicit non-issues (verified)

| Guard | Status | Proof |
| --- | --- | --- |
| F-05-001 ciphertext at rest | ✅ | `secrets.ts` encode fail-closed; tests assert `enc:v1:` and plaintext absent |
| F-05-W2-003 rotate | ✅ | `INSERT OR REPLACE`; rotation under encryption |
| Dual-read legacy secrets | ✅ | `decodeSecretFromStorage` + `migratePlaintextSecretsToEncrypted` |
| Env prefer over DB | ✅ | `instrumentation-node.ts` only restores/persists when env empty |
| F-05-002 hash-only create/validate | ✅ | placeholder `omni_hashonly_`; validate by `key_hash`; placeholder excluded from legacy dual-read |
| F-05-002 playground without secret | ✅ | metadata-by-id; #3503 security: header ignored without session |
| F-05-002 CLI fail-loud | ✅ | resolver + 400 mapping across CLI settings + MITM |
| F-05-003 write encrypt / read decrypt | ✅ | PSD encrypt helpers + providers cookie decrypt |
| F-05-003 existing-row migrate | ✅ | lazy migrate + unit |
| F-05-W2-001 sanitizer | ✅ | SSOT `PSD_SECRET_KEYS` strip all inventory keys |
| AES-256-GCM auth tag pin | ✅ | `authTagLength: 16`; truncated tag unit |
| encrypt fail-closed (N4) | ✅ | throws when key configured; unit |
| Reveal product outcome | ✅ | `/api/keys/[id]/reveal` 404 without recoverable secret (align 0049) |
| CHANGELOG | ✅ | Unreleased Security Task 0041 entry expanded |
| Anti-hallucination | ✅ | No bulk plaintext restore; validate primary is hash |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-05-001 no plaintext JWT/API secret writes when key present | ✅ | `encodeSecretForStorage` refuses non-`enc:v1:` |
| F-05-W2-003 upsert/rotate | ✅ | `INSERT OR REPLACE` + tests |
| F-05-002 hash-only + migration + consumers | ✅ | store/migrate + playground + CLI + evals + combo-test + cloud enable |
| F-05-003 PSD encrypt | ✅ | write + lazy migrate |
| F-05-W2-001 sanitizer web-session keys | ✅ | SSOT inventory |
| Unit tests secrets + apiKeys + PSD sanitize | ✅ | 118 pack + combo-test 9/9 |
| typecheck:core | ✅ | PASS this session |
| CHANGELOG security entry | ✅ | Present + pass-2 residual notes |
| Migration file if schema change | ✅ N/A | Lazy re-encrypt |
| MUST NOT break boot when secrets in env | ✅ | env-first bootstrap |

## Threat model (security harness)

| Asset | Threat | Control |
| --- | --- | --- |
| JWT / API signing secrets in SQLite | DATA_DIR / backup leak | AES-256-GCM `enc:v1:` field encryption; fail-closed write |
| Inference API keys | Same | Hash-only at rest; secret only at create/regenerate |
| Web-session cookies in PSD | Same + API response leak | Per-key encrypt + response redact SSOT |
| Rotation stuck | Write-once INSERT OR IGNORE | Upsert `INSERT OR REPLACE` |
| Id-header privilege escalation (playground) | Impersonate key policy without auth | Session gate on `x-omniroute-playground-key-id` |
| Placeholder used as bearer | Auth with `omni_hashonly_*` | Legacy dual-read excludes placeholders |

## Fresh verification commands

```bash
# Intentional 0041 pack + combo-test regression guard — PASS 118/118 (+ 9 combo)
node --import tsx/esm --test \
  tests/unit/playground-key-policy-3503.test.ts \
  tests/unit/cli-mitm-schema.test.ts \
  tests/unit/db-encryption.test.ts \
  tests/unit/request-defaults-store-session.test.ts \
  tests/unit/db-secrets.test.ts \
  tests/unit/db-apiKeys-crud.test.ts \
  tests/unit/db-providers-crud.test.ts \
  tests/unit/combo-test-route.test.ts

npm run typecheck:core  # PASS
```

## Path to 100

- Achieved this session via residual consumer fixes (combo-test, evals, cloud enable, CLI 400 map) on top of builder pass-2 (R1/R2/N2/N3) and broader encrypt fail-closed (N4).
- Optional later (non-blocking): F-05-008–010 encrypt other secret tables; reduce regenerate frequency if audit noise from combo probes matters.

## Task Ledger Patch Suggestion

```markdown
### Review Ledger (2026-07-18 — security re-review)
- **Reviewer**: gt-security-reviewer (parent builders)
- **Veredito**: ACCEPT
- **Score**: 100/100
- **Report**: docs/reports/reviews/2026-07-18-task-0041-secrets-at-rest-rereview.md
- **Previous**: docs/reports/reviews/2026-07-11-task-0041-secrets-at-rest-review.md (78 → 100)
- **Lane**: 02-doing → 03-review
```

## Verdict

**ACCEPT (100)** — at-rest encryption for JWT/API secrets, api_keys hash-only, PSD credential encrypt/migrate/redact, and hash-only consumer adaptations are proven with fresh unit evidence. Stretch F-05-008–010 remains backlog only. Promote to `03-review`.
