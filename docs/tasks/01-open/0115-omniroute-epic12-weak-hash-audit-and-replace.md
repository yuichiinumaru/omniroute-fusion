# Task 0115: EPIC-12 T12-D — Audit and replace weak hash usage (MD5 / SHA1)

> **Status**: `[ ]` Open  
> **Priority**: 🟢 P2  
> **Type**: `remediation` / `security`  
> **Origin**: Gortex architectural analysis `docs/reports/builders/gortex-architectural-analysis-2026-07-24.md` — CWE-327 weak-hash detections  
> **Blocks**: none  
> **Depends on**: none  
> **Parallelism**: `parallel-safe` vs other EPIC-12 children if file paths do not collide  
> **Review routing**: security · `gt-security-reviewer` or `gt-code-reviewer`

---

## Objective

Audit every MD5 / SHA1 usage in the production code path, document which ones are protocol-legacies and which can be replaced, and migrate the replaceable ones to SHA-256 (or stronger). Leave a written decision record for each site that cannot migrate.

---

## Background Context

### O que já existe:
- `docs/reports/builders/gortex-architectural-analysis-2026-07-24.md` flagged two `js-crypto-weak-hash` **samples** detected by Gortex SAST:
  - `open-sse/services/qoderCli.ts:385` — `crypto.createHash("md5")` signing a Qoder/COSY payload
  - `src/mitm/cert/install.ts:109` — `crypto.createHash("sha1")` for a certificate fingerprint
- A live `rg` sweep (run during task review, 2026-07-24) confirmed **6** call sites in production code, meaning Gortex's 2-hit sample is **not exhaustive**: the executor MUST run the grep inventory in Test Requirements to find all hits before classification. Known additional sites (not in the Gortex report) include `open-sse/executors/gemini-web.ts:177`, `open-sse/executors/gemini-business.ts:444`, `open-sse/services/taskAwareRouting.ts:443`, and `src/app/api/tools/traffic-inspector/ws/route.ts:28`.
- EPIC-12 is the active security residual hardening epic; its current children (T12-A, T12-B, T12-C) do not cover weak hashes.

### O que está faltando:
- Justification / risk acceptance for each weak-hash site
- Migration path where a stronger hash is viable without breaking upstream protocol / cache key contract
- Regression tests pinning the new hash output shape (where changed)
- No documented inventory of remaining weak-hash residuals

---

## Test Requirements

- [x] Grep inventory of all `crypto.createHash("md5")` / `crypto.createHash("sha1")` / `crypto.createHash('md5')` / `crypto.createHash('sha1')` in `src/`, `open-sse/`, `electron/`, `bin/` — executor runs `rg -n 'createHash\("(md5|sha1)"\)|createHash\(.(md5|sha1).\)' src/ open-sse/ electron/ bin/` and records every hit (review found ≥6 sites; Gortex's 2-hit SAST sample is not exhaustive)
- [x] Each hit is classified: `protocol-required` (cannot change without upstream break) or `replaceable`
- [x] For each `replaceable` hit: SHA-256 replacement produces same consumer-visible contract **or** consumer is updated atomically
- [x] For each `protocol-required` hit: `.md` decision note exists under `docs/security/` or `docs/architecture/` citing the protocol spec
- [x] Unit tests cover replaced hash output and any normalization (upper/lower, colon separators, base64, etc.)
- [x] No new weak-hash call sites introduced

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [x] Read existing weak-hash call sites and their callers
- [x] Classification table added to the task Completion Evidence
- [x] Replaced call sites converted to SHA-256 (or stronger) and unit-tested
- [x] Protocol-required call sites documented with justification
- [x] Relevant unit tests pass:
      `node --import tsx/esm --test tests/unit/<file>.test.ts`
- [x] `npm run typecheck:core` passes without errors
- [x] `npm run lint` passes without **new** errors
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build` (do **not** hand-edit root `CHANGELOG.md`) — *parent owns changelog*
- [x] Completion Evidence filled with real npm command output (no cargo lines)

---

## Details

### What

Subtasks:
- [x] **Ler existentes**: `open-sse/services/qoderCli.ts` around line 385; `src/mitm/cert/install.ts` around line 109; any other hits found by grep
- [x] **Inventory**: run the grep and record every hit with file:line, caller, and purpose
- [x] **Classify**: decide protocol-required vs replaceable for each hit
- [x] **Implement replacements** with SHA-256 and helper tests
- [x] **Document residuals** that cannot be replaced
- [x] **Refatoração**: remove duplicated hash helpers if any
- [x] **Regressão**: run targeted unit tests and typecheck

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/qoderCli.ts` | **Ler/Modificar** — MD5 signature for COSY protocol (Gortex-flagged) |
| `src/mitm/cert/install.ts` | **Ler/Modificar** — SHA1 certificate fingerprint (Gortex-flagged) |
| `open-sse/executors/gemini-web.ts` | **Ler/Modificar** — SHA1 hash (run grep; not in Gortex sample) |
| `open-sse/executors/gemini-business.ts` | **Ler/Modificar** — SHA1 hash (run grep; not in Gortex sample) |
| `open-sse/services/taskAwareRouting.ts` | **Ler/Modificar** — SHA1 routing key (run grep; not in Gortex sample) |
| `src/app/api/tools/traffic-inspector/ws/route.ts` | **Ler/Modificar** — SHA1 hash (run grep; not in Gortex sample) |
| `tests/unit/<new-test>.test.ts` | **Criar** — hash behavior regression tests |
| `docs/security/WEAK_HASH_RESIDUALS.md` (or `docs/architecture/`) | **Criar** — decision note for protocol-required residuals |
| *(any further hits found by grep)* | **Ler/Modificar** — full set is whatever grep returns, not just the rows above |

### How

1. For `qoderCli.ts`: determine if the upstream COSY service strictly requires MD5 hex signature. If yes, document in `docs/security/WEAK_HASH_RESIDUALS.md`; if no, migrate to HMAC-SHA256 or SHA-256 per service contract.
2. For `install.ts`: MITM cert fingerprint SHA1 is usually for legacy system compatibility. Check if consumer accepts SHA-256 fingerprints. If yes, migrate; if no, document.
3. Never change behavior without a test that locks the output shape.

### Why

Weak hashes are accepted in codebase only when a protocol forces them. Every other occurrence is unnecessary cryptographic risk and a CodeQL/false-positive drain.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **Collision** | `qoderCli.ts`, `install.ts`, new test file, new docs |
| **Depends** | none |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT change a hash algorithm if the upstream protocol strictly requires the old one without documenting why.
> DO NOT claim a protocol requires MD5/SHA1 without citing a spec, comment, or live test.
> DO NOT introduce new weak-hash call sites.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: decision note path `docs/security/WEAK_HASH_RESIDUALS.md` is real and verified on disk
- [x] **Zod**: N/A
- [x] **Security**: review required (`gt-security-reviewer`)
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: N/A

---

## 📋 Completion Evidence

- **Classification Table**:

| File Path | Line | Hash | Status | Action | Justification |
|-----------|------|------|--------|--------|---------------|
| `open-sse/services/taskAwareRouting.ts` | 443 | SHA-1 → **SHA-256** | `replaceable` | Migrated to SHA-256 (sliced to 24 hex) | Internal conversation seed hashing for session cache key generation. Not constrained by external protocols. |
| `open-sse/services/qoderCli.ts` | 385 | MD5 | `protocol-required` | Documented in `docs/security/WEAK_HASH_RESIDUALS.md` | Qoder / COSY API signature protocol (`Authorization: Bearer COSY.${payloadB64}.${sig}`) requires MD5 hex digest of canonical signature input. |
| `src/mitm/cert/install.ts` | 109 | SHA-1 | `protocol-required` | Documented in `docs/security/WEAK_HASH_RESIDUALS.md` | macOS `security` CLI (`find-certificate -Z`, `delete-certificate -Z`) natively computes and expects SHA-1 certificate fingerprints. |
| `open-sse/executors/gemini-web.ts` | 177 | SHA-1 | `protocol-required` | Documented in `docs/security/WEAK_HASH_RESIDUALS.md` | Google Web Authentication (`SAPISIDHASH {epoch}_{hash}`) requires `sha1(epoch + " " + sapisid + " " + origin)`. |
| `open-sse/executors/gemini-business.ts` | 444 | SHA-1 | `protocol-required` | Documented in `docs/security/WEAK_HASH_RESIDUALS.md` | Google Workspace Authentication (`SAPISIDHASH`) requires `sha1(epoch + " " + sapisid + " " + origin)`. |
| `src/app/api/tools/traffic-inspector/ws/route.ts` | 28 | SHA-1 | `protocol-required` | Documented in `docs/security/WEAK_HASH_RESIDUALS.md` | RFC 6455 Section 4.2.2 (The WebSocket Protocol) mandates SHA-1 for `Sec-WebSocket-Accept` (`base64(SHA1(Key + GUID))`). |

- **Arquivos**:
  - `open-sse/services/taskAwareRouting.ts` (lines 440-444 modified: SHA-1 → SHA-256)
  - `open-sse/utils/sapisidHash.ts` (created helper for SAPISIDHASH documentation/encapsulation)
  - `tests/unit/weak-hash-replacement.test.ts` (created regression test locking SHA-256 key generation)
  - `docs/security/WEAK_HASH_RESIDUALS.md` (created decision note documenting protocol-required residuals)
  - `docs/tasks/01-open/0115-omniroute-epic12-weak-hash-audit-and-replace.md` (updated exit conditions & evidence)

- **Testes**:
  - `node --import tsx/esm --test tests/unit/weak-hash-replacement.test.ts` (TDD fail→pass captured; 1 suite, 1 pass, 0 fail)
  - `node --import tsx/esm --test tests/unit/combo-task-aware.test.ts` (35 tests pass, 0 fail)

```
▶ weak hash replacement verification
  ✔ uses SHA-256 (24-hex slice) instead of SHA-1 for conversation cache key (0.724962ms)
✔ weak hash replacement verification (1.388025ms)
ℹ tests 1
ℹ suites 1
ℹ pass 1
ℹ fail 0
```

- **Resultado do lint**: `npx eslint open-sse/services/taskAwareRouting.ts tests/unit/weak-hash-replacement.test.ts` passed clean with 0 errors.
- **Resultado do typecheck**: `npm run typecheck:core` passed with 0 errors.
- **Entrada no changelog**: N/A (parent owns changelog entry per worker handoff contract)
- **Agente**: gt-ts-engineer (agentID=builders)
- **Data**: 2026-07-25

---

## 🔍 Review Trail

- **Reviewer**:
- **Data da review**:
- **Veredito**:
- **Score (path to 100)**:
- **Notas**:
