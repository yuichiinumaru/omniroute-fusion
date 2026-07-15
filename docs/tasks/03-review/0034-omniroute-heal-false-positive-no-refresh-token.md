# Task 0034: Heal False-Positive Apikey `no_refresh_token` Rows

> **Status**: `[x]` Complete — pending review
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: Epic 0006 — Dual-Mode Auth / API-Key Refresh Correctness (S3)
> **Action type**: NEW (heal path) + HARDEN
> **Blocks**: Task 0036 (deploy/verify expects 0 apikey `no_refresh_token` after heal)
> **Depends on**: Task 0033 (preferred — contracts stable); Task 0032 minimum

---

## Objective

Provide a **safe, tested heal path** that restores provider connections incorrectly marked by the dual-mode bug:

- Selection: `error_code = 'no_refresh_token'` (and/or `last_error_type = 'no_refresh_token'`) **AND** connection is non-OAuth refreshable (authType apikey / api_key / cookie / none, OR blank authType with present apiKey)
- Action: set `test_status` back to `active` (or prior non-terminal if product standard is clearer — default **active** when apiKey/cookie credential still present), clear `last_error`, `last_error_at`, `last_error_type`, `last_error_source`, `error_code` for those false positives only

Must **not** heal legitimate OAuth #5326 rows (oauth + truly missing refresh token).

**Parent pin (2026-07-11) — delivery shape:**

1. **Required**: pure/domain function `healFalsePositiveNoRefreshConnections(...)` under `src/lib/` (e.g. `src/lib/db/healFalsePositiveNoRefresh.ts` or adjacent) that uses `getProviderConnections` + `updateProviderConnection` + Task 0032 helper. **No raw SQL on encrypted `api_key`.**
2. **Required**: unit tests for heal/non-heal matrix.
3. **Required**: one clear invocation path — either (a) versioned migration that calls the TS function via migrationRunner if the project supports non-SQL migrations, or (b) one-shot boot hook guarded by idempotent flag / “already healed” marker so restarts do not spam updates.
4. **Forbidden as sole delivery**: bare SQL `UPDATE` that only checks `api_key IS NOT NULL` on ciphertext without domain decrypt.

## Background Context

### Live evidence (21000, 2026-07-11)

| auth_type | provider | count `no_refresh_token` |
|-----------|----------|--------------------------|
| apikey | gemini | **13** |
| apikey | qoder | **9** |
| oauth | windsurf | 2 (do **not** auto-heal as apikey) |
| oauth | github | 1 (likely legitimate — **do not** heal) |

Even after Task 0032/0033 code fix, **stuck rows do not self-heal** — sweep only marks when `testStatus` is empty/active; expired false-positives remain expired forever.

### What already exists

- Update path: `updateProviderConnection` in `src/lib/db/providers.ts`
- Terminal statuses elsewhere: banned / credits_exhausted / expired for real OAuth
- Message text: `"No refresh token available — re-authenticate this account."` from health check ~L398

### What is missing

- No one-shot heal for apikey false positives
- No test proving oauth `no_refresh_token` rows are left alone
- No operator-facing verification query documented for 21000

### Heal safety rules

| Keep expired | Heal |
|--------------|------|
| `authType=oauth` + `no_refresh_token` | `authType∈{apikey,api_key,cookie,none}` + `no_refresh_token` |
| Real `401` / `banned` / `credits_exhausted` (other error codes) | Only `no_refresh_token` false-positive codes |
| Rows without any credential (no apiKey and no cookie material) — prefer leave for operator | Rows with static credential still stored |

---

## Test Requirements

- MUST heal fixture: gemini apikey + `testStatus=expired` + `errorCode=no_refresh_token` + apiKey present → after heal: active + null error fields
- MUST heal fixture: qoder apikey same pattern
- MUST NOT heal fixture: oauth antigravity/github style + `no_refresh_token`
- MUST be idempotent (second run changes 0 additional rows / no throw)
- MUST NOT clear unrelated error codes (`refresh_failed`, `banned`, etc.)

---

## Exit Conditions (GDD/TDD)

- [x] Heal implementation exists as **TS domain function** (parent pin) + invoked from migrationRunner or idempotent boot hook
- [x] Unit tests cover heal + non-heal matrix (`tests/unit/heal-no-refresh-token*.test.ts` or equivalent)
- [x] `node --import tsx/esm --test tests/unit/heal-no-refresh-token*.test.ts` (or named suite) passes
- [x] Shared auth-mode helper used to decide heal eligibility (from Task 0032) — no ad-hoc string-only half matrix
- [x] Operator verification SQL documented in task Completion Evidence:
  ```sql
  SELECT auth_type, provider, COUNT(*) FROM provider_connections
  WHERE error_code='no_refresh_token' GROUP BY 1,2;
  ```
  Expected after heal on fixed code: **0 rows** with `auth_type='apikey' AND error_code='no_refresh_token'`
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors on touched files
- [x] CHANGELOG.md entry at TOP (heal false-positive no_refresh_token)

---

## Details

### What

Subtasks:

- [ ] **Read existing code**: `providers.ts` update/create, `tokenHealthCheck.ts` error field names (camel vs snake via rowToCamel), migrationRunner patterns, existing migrations for style, Task 0032 helper API
- [ ] **Design heal predicate** using `!connectionUsesOAuthRefresh(conn) && errorCode === 'no_refresh_token'`
- [ ] **TDD**: write failing tests with expired apikey fixtures
- [ ] **Implement heal** (prefer pure function + call from migration or boot once)
- [ ] **Ensure oauth rows untouched**
- [ ] **Refactoring pass**: no broad `UPDATE … SET test_status='active'` without error_code filter
- [ ] **Verification**: unit tests + typecheck + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/db/providers.ts` | Ler — update API / field names |
| `src/lib/tokenHealthCheck.ts` / shared auth module | Ler — eligibility helper |
| `src/lib/db/migrations/` | Criar migration se chosen path |
| `src/lib/db/migrationRunner.ts` | Ler — how migrations apply |
| `src/lib/…/healFalsePositiveNoRefreshToken.ts` (path TBD) | Criar se function path |
| `tests/unit/heal-no-refresh-token*.test.ts` | Criar |
| `CHANGELOG.md` | Modificar |

### How

1. Prefer function `healFalsePositiveNoRefreshConnections(db?)` that selects candidates via existing domain module (no raw SQL in routes).
2. If migration SQL: use snake_case columns matching schema (`error_code`, `auth_type`, `test_status`, `api_key` presence check careful with encryption — prefer TS heal that uses decrypt layer if credentials must be inspected).
3. **Encryption caution**: if `api_key` is encrypted at rest, eligibility via `auth_type` alone is safer than SQL on ciphertext; TS path with `getProviderConnections` is preferred.
4. Log count healed at info level without printing secrets.

### Why

Operators already have 22 false-positive apikey rows on 21000. Code fix alone leaves dashboards red forever. Heal is the ops half of Epic 0006 success metric “0 apikey rows with no_refresh_token”.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT heal oauth `no_refresh_token` rows — that is correct #5326 behavior.
> DO NOT mass-reset `banned` / `credits_exhausted` / real 401 failures.
> DO NOT write raw SQL in API routes — use `src/lib/db/` modules or migrationRunner.

> [!IMPORTANT]
> Prefer TS heal through domain modules when credentials are encrypted.
> Document exact before/after counts in Completion Evidence when run against a fixture DB (and against 21000 only under operator approval / Task 0036).

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Column/field names grepped from providers module
- [ ] **Zod Validation**: N/A unless new admin API (avoid new public API if possible)
- [ ] **Security**: No logging of apiKey/token values
- [ ] **Error Sanitization**: N/A for heal internals
- [ ] **No Raw SQL**: Domain module or versioned migration only
- [ ] **Archive Protocol**: N/A

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/lib/db/healFalsePositiveNoRefresh.ts` (created — domain heal)
  - `src/instrumentation-node.ts` (idempotent startup hook after crash-cooldown clear)
  - `tests/unit/heal-no-refresh-token.test.ts` (created)
  - `CHANGELOG.md` (combined 0032–0034 entry)
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/heal-no-refresh-token.test.ts`
- **Resultado dos testes**: PASS — 6 heal tests (gemini heal, qoder heal, oauth keep, unrelated codes, idempotent, mixed)
- **Resultado do lint**: PASS
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core`)
- **Heal path chosen**: TS domain function + idempotent boot hook in `instrumentation-node.ts` (not bare SQL)
- **Operator verification SQL** (run after deploy on 21000 / Task 0036):
  ```sql
  SELECT auth_type, provider, COUNT(*) FROM provider_connections
  WHERE error_code='no_refresh_token' GROUP BY 1,2;
  ```
  Expected: **0** rows with `auth_type='apikey' AND error_code='no_refresh_token'`. OAuth rows may remain (legitimate #5326).
- **Entrada no changelog**: Unreleased → Fixed → Dual-mode auth (0032–0034)
- **Agente executor**: Grok Build subagent (main session, operator-authorized)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: Code Quality Reviewer / independent task reviewer (`reviewers`)
- **Data da review**: 2026-07-11
- **Veredito**: APROVADO (PASS WITH NOTES)
- **Score (path to 100)**: 95
- **Notas**: Domain heal + SSoT `isFalsePositiveNoRefreshToken` + boot hook + 6/6 unit tests (gemini/qoder heal, oauth keep, unrelated codes, idempotent, mixed). No raw SQL on ciphertext. Fresh: `heal-no-refresh-token.test.ts` 6/6 PASS; `connection-auth-mode.test.ts` 13/13 PASS; post-heal SQL NULLs verified. Residual LOW: JSDoc drift on windsurf long-lived heal; missing cookie/blank integration fixtures. Path-to-100 in report. Stay `03-review/` (S≥90). Live 21000 verify = Task 0036.
- **Report**: `docs/reports/reviews/2026-07-11-task-0034-heal-false-positive-no-refresh-token-review.md`
- **Se REJEITADO**: n/a — not moved
