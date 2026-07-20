# Task 0074: Secrets Dual-Read Residual Disposition (H-PRODUCT-006 / F-SEC-W2-005)

> **Status**: `[R]` In review (security reviewer ACCEPT 100 → 03-review 2026-07-19)  

> **Priority**: 🟡 P2 (transition residual; P3 if `STORAGE_ENCRYPTION_KEY` always set and migrate always succeeds)  
> **Type**: `verification` + optional `remediation`  
> **Action type**: HARDEN (docs decision first; code only if disposition chooses migrate hardening)  
> **Origin**: EPIC-12 — OmniRoute Security Residual Harden · Wave 2 security residual investigation  
> **Finding IDs**: **H-PRODUCT-006**, **F-SEC-W2-005** (migrate one-shot flag)  
> **Blocks**: none  
> **Depends on**: none (Task **0041** secrets-at-rest already completed — do **not** re-open 0041 acceptance)  
> **Parallelism**: `parallel-safe` (docs + optional `secrets.ts` / tests; no RouteGuard / sanitize sweep ownership)  
> **Review routing**: **independent**  

---

## Source reports (builder reference)

Primary:
- [`docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md`](../../reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md) — § H-PRODUCT-006, F-SEC-W2-005, disposition recommendation §3  
- [`docs/tasks/00-planning/EPIC-12-omniroute-security-residual-harden.md`](../00-planning/EPIC-12-omniroute-security-residual-harden.md) — T12-C  
- Task **0041** completion evidence: `docs/tasks/04-completed/0041-omniroute-secrets-at-rest-encryption.md`  

Code anchors (Wave 2):
- `src/lib/db/secrets.ts` — `encodeSecretForStorage`, dual-decode, `ensureSecretsEncryptedMigration`, `_secretsEncryptMigrated`, `migratePlaintextSecretsToEncrypted`
- `src/lib/db/encryption.ts` — encrypt fail-closed when key set; passthrough when key absent
- `src/lib/db/apiKeys.ts` — hash-only primary + legacy plaintext dual-read rewrite
- `src/lib/db/providers.ts` + PSD decrypt dual-read
- `src/lib/db/proxies.ts` — `relayAuthEnc` preferred, plaintext `relayAuth` fallback

---

## Objective

Produce an **explicit product/security disposition** for the secrets **dual-read transition residual** left after Task 0041:

1. **Document** (in-repo ops/security note) that dual-read is **intentional compatibility**, not a regression of encrypt-on-write / fail-closed / hash-only primary.
2. **Choose one** disposition outcome and implement only what that outcome requires:

| Option | When | Work |
|--------|------|------|
| **D1 — Docs + ops checklist only** | Accept residual window while key set + rows rewrite lazily | Security/ops doc section + optional runbook commands; **no** behavior change |
| **D2 — Force-migrate path** | Want operator-triggered full rewrite | Documented CLI/script **or** exported admin function + unit tests; still dual-read until success |
| **D3 — Migrate retry fix** | Address F-SEC-W2-005 only | Fix `_secretsEncryptMigrated = true` before failed migrate so retry can re-run in-process; tests |

Default recommendation from Wave 2: **D1** unless operator wants stronger rewrite guarantees — then **D2** and/or **D3**.

Concrete definition of done: a reviewer can answer “is dual-read a bug?” with **no** from the new doc, and any chosen code path has binary tests.

## Background Context

### What 0041 closed (still true — do not regress)

| Behavior | Evidence |
|----------|----------|
| Write with key → `enc:v1:` only | `encodeSecretForStorage` refuses plaintext when encryption enabled |
| Encrypt fail-closed | `encrypt()` throws when key configured but cipher fails |
| API keys primary path | `key_hash = ?` only |
| Lazy migrate | `migratePlaintextSecretsToEncrypted` / PSD migrate |

### Residual risk model (Wave 2)

| Condition | Residual |
|-----------|----------|
| `STORAGE_ENCRYPTION_KEY` set, old rows never rewritten | Dual-read **serves** plaintext until migrate/write succeeds |
| Key **not** set (dev) | Plaintext at rest **by design** |
| `_secretsEncryptMigrated` set true even if migrate throws | In-process migrate may not retry until restart (**F-SEC-W2-005**, P3) |

### Out of scope

- Re-auditing or re-opening Task 0041 acceptance criteria wholesale  
- Prod DB inspection on `:21000` (charter: no live prod DB probe from agents unless operator-owned verify explicitly requested later)  
- Expanding encrypt to unrelated tables outside the 0041 surface  
- RouteGuard / err.message work (0072 / 0073)  

---

## Test Requirements

### Always (even for D1)

- [x] **DEVE** existing secrets/encryption unit tests still pass (locate via grep: `secrets`, `STORAGE_ENCRYPTION_KEY`, `enc:v1` under `tests/unit/`)
- [x] **DEVE** doc claim only behaviors grepped from `src/lib/db/{secrets,encryption,apiKeys,providers,proxies}.ts` (Hard Rule: no fabricated APIs)

### If D2 chosen

- [x] **DEVE** force-migrate returns count of rewritten rows and is idempotent (second call → 0 or no-op)
- [x] **DEVE** with encryption disabled, force-migrate is no-op (0 rows)
- [x] **DEVE** after force-migrate with key set, stored values for migrated keys start with `enc:v1:` (or JSON-wrapped ciphertext per `encodeSecretForStorage` shape)

### If D3 chosen

- [x] **DEVE** unit test: when `migratePlaintextSecretsToEncrypted` throws once, a subsequent `getPersistedSecret` / ensure path **retries** migrate (or documents restart-only with explicit test of flag semantics)
- [x] **DEVE** successful migrate still sets the one-shot flag

---

## Exit Conditions (GDD/TDD)

- [x] Disposition **D1 / D2 / D3** (or D1+D3 etc.) recorded in Completion Evidence **and** in the new/updated doc section
- [x] Security/ops documentation landed under `docs/security/` (preferred: short section in existing secrets/encryption-related doc **or** new `docs/security/SECRETS_AT_REST.md` if no home exists — **grep first**; do not invent conflicting SSOT)
- [x] Ops checklist includes: set `STORAGE_ENCRYPTION_KEY`, restart process once to run lazy migrate, optional SQL/count proof commands for **operator** use on **non-prod** copies
- [x] If code changed: unit tests for D2/D3 green via `node --import tsx/esm --test tests/unit/<file>.test.ts`
- [x] `npm run typecheck:core` if TS touched
- [x] `npm run lint` on touched files if code touched
- [x] Explicit statement: **0041 not re-opened**; residual is transition-class only
- [x] CHANGELOG only if code behavior changes (D2/D3); pure docs may use `docs:` entry or skip per project changelog norms — executor decides consistently with recent docs-only PRs
- [x] Completion Evidence filled

---

## Details

### What

Subtasks:

- [x] **Ler código existente**:
  - `src/lib/db/secrets.ts` (full dual-read + migrate flag)
  - `src/lib/db/encryption.ts` (fail-closed vs passthrough)
  - `src/lib/db/apiKeys.ts` (legacy dual-read)
  - `src/lib/db/providers.ts` PSD decrypt notes
  - `src/lib/db/proxies.ts` `extractRelayAuth`
  - Wave 2 H-PRODUCT-006 section
  - Task 0041 completed task file
  - Existing `docs/security/*` for encryption/secrets mentions (`grep -rn` dual-read / STORAGE_ENCRYPTION_KEY / enc:v1)
- [x] **Decide disposition** (D1 default) — write decision at top of Completion Evidence before coding
- [x] **Docs**: residual risk model table + ops checklist + “not a 0041 regression” statement
- [x] **If D3**: fix migrate flag ordering / retry; TDD first
- [x] **If D2**: implement force-migrate export + test; wire only via existing admin/CLI pattern if one exists (grep `migratePlaintext` / maintenance routes) — **do not** invent unauthenticated HTTP migrate
- [x] **Verificação**: run existing + new unit tests
- [x] **Refactoring pass**: minimal diff

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/db/secrets.ts` | Ler; Modificar **only if** D2/D3 |
| `src/lib/db/encryption.ts` | Ler — fail-closed / key absent behavior |
| `src/lib/db/apiKeys.ts` | Ler — document dual-read; modify only if disposition includes API-key force rewrite |
| `src/lib/db/providers.ts` | Ler — PSD migrate dual-read |
| `src/lib/db/proxies.ts` | Ler — relayAuth dual-read |
| `docs/tasks/04-completed/0041-omniroute-secrets-at-rest-encryption.md` | Ler — acceptance baseline |
| `docs/security/SECRETS_AT_REST.md` **or** existing security doc section | Criar/Modificar — disposition SSOT |
| `docs/ops/RELEASE_CHECKLIST.md` or ops runbook (only if already the home for DATA_DIR/key setup) | Optional cross-link — **grep first** |
| `tests/unit/**` secrets/encryption tests | Ler/extend for D2/D3 |
| `CHANGELOG.md` | If code behavior changes |

### How

1. Grep docs + code for current secrets-at-rest narrative; avoid a second conflicting SSOT.
2. Record disposition choice (D1/D2/D3) with one-paragraph rationale.
3. Write docs section:

   - What encrypt-on-write guarantees  
   - Why dual-read exists  
   - Residual window conditions  
   - Ops: set key → restart → optional verify no plaintext secrets rows  
   - F-SEC-W2-005 note (fixed under D3 or accepted as restart-retry)

4. If D3: change flag set to **after** successful migrate (or only set on success; allow retry on throw) with unit test.
5. If D2: expose `migratePlaintextSecretsToEncrypted` (already exported) via documented operator invocation path; add force path for PSD/proxies only if disposition includes them — otherwise secrets namespace only and document the narrower scope.
6. Run tests; fill evidence.

### Why

Wave 2 classified dual-read as **intentional transition residual**, not encrypt-at-rest failure. Without an explicit disposition, future agents re-open 0041 or invent emergency rewrites. Closing EPIC-12 T12-C means **decision + docs** (and optional small migrate hardening), not a new crypto design.

### Dependency & collision notes

| Item | Value |
|------|--------|
| Depends on | none |
| Blocks | none |
| File ownership | docs/security + optional `secrets.ts` / unit tests |
| Collision | Low; avoid simultaneous large refactors of `secrets.ts` with unrelated encryption work |
| parallel-safe | **Yes** |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT re-open Task 0041 or claim “secrets always plaintext after 0041” — Wave 2 marks that **FALSE**.  
> DO NOT inspect or mutate production `:21000` SQLite from this task.  
> DO NOT add unauthenticated HTTP endpoints that dump or rewrite secrets.  
> DO NOT disable dual-read without a migrate success path for legacy rows (boot brick risk).

> [!IMPORTANT]
> Doc Accuracy: every env var / function name grepped in `src/` before writing.  
> Prefer D1 unless code change is justified in Completion Evidence.  
> If D2/D3: TDD first.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: grepped names only  
- [x] **Security**: no secret material in docs/tests beyond fixtures  
- [x] **Error Sanitization**: n/a unless new route (avoid)  
- [x] **No Raw SQL** in routes — db module only  
- [x] **Archive Protocol**: n/a  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Disposition chosen**: **D1** (docs + ops checklist only)
- **Rationale**: Wave 2 default. 0041 already guarantees encrypt-on-write + fail-closed when `STORAGE_ENCRYPTION_KEY` is set; dual-read is intentional legacy compatibility, not encrypt failure. No operator request for D2 force-migrate surface or D3 flag ordering; F-SEC-W2-005 is P3 restart-retry and is documented as accepted.
- **Docs path(s)**:
  - **SSOT**: `docs/security/SECRETS_AT_REST.md` (new) — disposition table, residual risk model, ops checklist (set key → restart → optional non-prod SQL count), F-SEC-W2-005 note, “not a 0041 regression”
  - Cross-link: `docs/ops/DATABASE_GUIDE.md` § Encryption Key → SECRETS_AT_REST.md
- **Code changes**: **none** (D1)
- **F-SEC-W2-005**: **accepted** (restart-retry); documented; not fixed under D3
- **H-PRODUCT-006**: **disposition closed** as intentional dual-read residual with ops checklist
- **Testes + resultado**:
  - `node --import tsx/esm --test tests/unit/db-secrets.test.ts tests/unit/db-encryption.test.ts` (+ 0051 suite co-run) → **all pass** including migrate/enc:v1 cases
- **typecheck / lint**: n/a code; docs only
- **0041 re-opened?**: **NO**
- **CHANGELOG**: Unreleased **Changed** docs disposition bullet (no code behavior change)
- **Agente executor / data**: builders / gt-ts-engineer + security · 2026-07-19
- **Path-to-100 (security reviewer 2026-07-19)**:
  - Corrected SSOT: `encryption.ts` reads **only** `STORAGE_ENCRYPTION_KEY` (do not claim `OMNIROUTE_CRYPT_KEY` runtime alias — docs-only drift elsewhere)
  - Corrected ops SQL path: `DATA_DIR/storage.sqlite` (not `omniroute.db`)
  - Exit/Test/Compliance checkboxes marked complete for review promote

---

## 🔍 Review Ledger

- **Latest report**: [`docs/reports/reviews/2026-07-19-task-0074-secrets-dual-read-residual-disposition-independent-rereview.md`](../../reports/reviews/2026-07-19-task-0074-secrets-dual-read-residual-disposition-independent-rereview.md)
- **Reviewer**: Independent FULL SECURITY RE-REVIEWER (agentID=`reviewers`)
- **Data**: 2026-07-19
- **Veredito**: **ACCEPT** / `ACCEPTED_100`
- **Score**: **100/100** (docs disposition; runtime N/A under D1)
- **Patches this re-review**: **none** (prior path-to-100 doc fixes held: STORAGE_ENCRYPTION_KEY-only + `storage.sqlite`)
- **Lane**: **stay `03-review`** (S=100; builder claims re-proved untrusted)
- **Notas**: D1 correct; 0041 not re-opened; F-SEC-W2-005 accepted restart-retry; dual-read intentional
- **Previous reports**:
  - [`…-security-review.md`](../../reports/reviews/2026-07-19-task-0074-secrets-dual-read-residual-disposition-security-review.md) — gt-security-reviewer (builders) ACCEPT 100 after doc accuracy path-to-100
