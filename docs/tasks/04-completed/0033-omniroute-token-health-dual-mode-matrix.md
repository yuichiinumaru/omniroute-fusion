# Task 0033: Token Health Sweep Harden + Dual-Mode Matrix Tests

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
> **Priority**: 🔴 P0
> **Type**: `testing` + `remediation`
> **Origin**: Epic 0006 — Dual-Mode Auth / API-Key Refresh Correctness (S2)
> **Action type**: HARDEN + NEW (matrix tests)
> **Blocks**: Task 0034 (heal), Task 0036 (deploy proof), Task 0037 (UI contracts preferred)
> **Depends on**: Task 0032 (shared auth-mode helper)

---

## Objective

Harden the token health sweep so **no static credential** (apikey / cookie / blank authType + apiKey) can be marked `errorCode/lastErrorType = no_refresh_token` even when `supportsTokenRefresh(provider)` is true. Expand regression coverage to a dual-mode matrix:

| Case | Expected after `checkConnection` |
|------|----------------------------------|
| gemini + `apikey` + no RT | stays `active` (already covered) |
| qoder + `apikey` (PAT) + no RT | stays `active` |
| codebuddy-cn + free/apikey dual + no RT | stays `active` (not oauth-refresh path) |
| cookie auth + no RT | stays `active` |
| blank/`null` authType + non-empty apiKey | stays `active` |
| oauth + supports refresh + no RT | `expired` + `no_refresh_token` (#5326 preserved) |

Also confirm `getProviderConnections({ authType: "oauth" })` filter remains enforced (sweep entry ~L333).

## Background Context

### Live evidence (21000)

- **13** gemini apikey + **9** qoder apikey rows already carry false `no_refresh_token` (see Epic 0006 table).
- Deployed health chunk on 21000 lacks `connectionUsesOAuthRefresh`; workspace source has guard at `tokenHealthCheck.ts` ~L389–407.
- SQL filter exists: `providers.ts` ~L157–163.

### What already exists

- Guard: `connectionUsesOAuthRefresh` + #5326 branch (`src/lib/tokenHealthCheck.ts`)
- Tests: antigravity oauth no-RT → expired; gemini apikey → active; filter test; pure helper asserts — `tests/unit/token-health-no-refresh-token-expired-5326.test.ts`
- Sweep loads oauth only: `getProviderConnections({ authType: "oauth" })` ~L333

### What is missing / broken

- No unit case for **qoder** apikey PAT
- No unit case for **codebuddy-cn** free-apikey dual (`FREE_APIKEY_PROVIDER_IDS` / registry)
- No unit case for **cookie** / **blank+apiKey** through full `checkConnection` (helper-only coverage today for some)
- Residual risk: any future caller invoking `checkConnection` on apikey rows without SQL filter

### Out of scope

- Heal of existing DB rows → Task 0034
- UI copy → Epic 0007 / Tasks 0037–0039
- gemini-cli ya29 401 as API key misuse
- Windsurf long-lived product policy beyond “do not false-expire non-refresh credentials” → Task 0035

---

## Test Requirements

- MUST assert qoder apikey connection without refresh token remains `testStatus=active` and not `no_refresh_token`
- MUST assert codebuddy-cn connection in apikey/free dual mode without RT is not force-expired
- MUST assert cookie + blank authType+apiKey paths do not receive OAuth expiry message
- MUST assert oauth refresh-capable without RT still expires (#5326)
- MUST keep gemini apikey regression green
- MUST keep authType SQL filter test green
- DEVE usar shared helper from Task 0032 (no re-duplicating authType lists inside health)

---

## Exit Conditions (GDD/TDD)

- [x] Dual-mode matrix tests land (extend `token-health-no-refresh-token-expired-5326.test.ts` **or** add `tests/unit/token-health-dual-mode-matrix.test.ts` — one suite must cover matrix above)
- [x] Every dual-mode id listed in Epic 0006 table that can appear as apikey has ≥1 negative test for `no_refresh_token`
- [x] #5326 oauth positive case still passes
- [x] Health branch still gates with `connectionUsesOAuthRefresh` (or shared `shouldMarkNoRefreshExpired`) **and** `supportsTokenRefresh`
- [x] `node --import tsx/esm --test tests/unit/token-health-no-refresh-token-expired-5326.test.ts` passes
- [x] `node --import tsx/esm --test tests/unit/token-health-dual-mode-matrix.test.ts` passes if file created (else N/A documented)
- [x] `node --import tsx/esm --test tests/unit/connection-auth-mode*.test.ts` still passes
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors on touched files
- [x] CHANGELOG.md entry at TOP (token health dual-mode matrix / harden)

---

## Details

### What

Subtasks:

- [x] **Read existing code**: `src/lib/tokenHealthCheck.ts` (sweep + `checkConnection`), Task 0032 shared module, `open-sse/services/tokenRefresh.ts` supports set, `src/shared/constants` / FREE_APIKEY for codebuddy-cn, existing 5326 tests, `createProviderConnection` required fields
- [x] **Confirm guard is on every no-refresh path** inside `checkConnection` (not only SQL filter)
- [x] **Write failing matrix tests first (TDD)** for qoder / codebuddy-cn / cookie / blank+apiKey
- [x] **Fix only if a test fails** on current source (prefer prove green, then document)
- [x] **Comment dual-mode inventory** near helper or test header (gemini, qoder, codebuddy-cn) — no fabricated providers
- [x] **Refactoring pass**: tests clear, no network in unit path
- [x] **Verification**: typecheck + lint + named tests; ensure `resetDbInstance` + `test.after` cleanup (DB handle hang risk)

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/tokenHealthCheck.ts` | Ler + endurecer se gap residual |
| `src/shared/utils/connectionAuthMode.ts` (or path from 0032) | Ler — use shared gate |
| `open-sse/services/tokenRefresh.ts` | Ler — supportsTokenRefresh set |
| `src/lib/db/providers.ts` | Ler — create/filter for fixtures |
| `tests/unit/token-health-no-refresh-token-expired-5326.test.ts` | Modificar e/ou regressão |
| `tests/unit/token-health-dual-mode-matrix.test.ts` | Criar se matrix extrai |
| `CHANGELOG.md` | Modificar — entry at top |

### How

1. TDD: add qoder apikey fixture mirroring gemini test pattern (`authType: "apikey"`, `apiKey` set, `refreshToken: null`).
2. For codebuddy-cn: grep live registry for dual free-apikey path; use real `authType` values the product stores (do not invent).
3. Cookie fixture: `authType: "cookie"` without RT.
4. Blank: `authType: null`/`undefined` + apiKey string.
5. Run suite; only change production code if a case fails (source may already pass with 0032).

### Why

Live operators on :21000 see AI Studio and Qoder PATs as “re-authenticate / no refresh token”. Matrix tests are the permanent regression guard so deploy lag (21000 missing helper) and future dual-mode providers cannot reintroduce the same class of bug. Contracts (`errorCode` taxonomy) stabilize Epic 0007 UI work.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT mark task complete because “gemini already has a test” — qoder/codebuddy/cookie/blank are mandatory matrix cells.
> DO NOT heal production rows in this task.
> DO NOT call real provider networks in unit tests.

> [!IMPORTANT]
> Read EVERY file in "Where" before writing.
> Always `resetDbInstance()` + cleanup temp `DATA_DIR` in `test.after`.
> Preserve #5326: oauth without RT must still expire.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Provider ids grepped from registry / supportsTokenRefresh set
- [x] **Zod Validation**: N/A
- [x] **Security**: Fake keys only in tests; no real tokens
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: Use `src/lib/db/providers.ts` fixtures only
- [x] **Archive Protocol**: N/A

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `tests/unit/token-health-dual-mode-matrix.test.ts` (created — full matrix)
  - `src/lib/tokenHealthCheck.ts` (already gated via 0032 `shouldMarkNoRefreshExpired`; no residual gap)
  - `CHANGELOG.md` (combined 0032–0034 entry)
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/token-health-dual-mode-matrix.test.ts`
  - `node --import tsx/esm --test tests/unit/token-health-no-refresh-token-expired-5326.test.ts`
  - `node --import tsx/esm --test tests/unit/connection-auth-mode.test.ts`
- **Resultado dos testes**: PASS — matrix 8 + #5326 7 + helper 15 (path-to-100 2026-07-18)
- **Resultado do lint**: PASS
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core`)
- **Entrada no changelog**: Unreleased → Fixed → Dual-mode auth (0032–0034)
- **Agente executor**: Grok Build subagent (main session, operator-authorized)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: Independent FULL RE-REVIEWER (`reviewers` / agentID=reviewers)
- **Data da review**: 2026-07-18 (final independent re-review)
- **Veredito**: APROVADO — PASS 100 (path-to-100 closed); held in `03-review/`
- **Score (path to 100)**: 100/100
- **Notas**: Connection-level gate verified (`shouldMarkNoRefreshExpired` + `connectionUsesOAuthRefresh`, not provider-id only). Dual-mode matrix covers gemini/qoder/codebuddy-cn apikey, cookie, blank+apiKey, #5326 oauth positive. Fresh re-run 27/27 (matrix + 5326 + connection-auth-mode); typecheck:core clean. Residual path-to-100: pin `supportsTokenRefresh(true)` on dual-mode negative cells; assert blank authType after fixture; optional cookie-on-refresh-capable counterfactual. Report: `docs/reports/reviews/2026-07-11-task-0033-token-health-dual-mode-matrix-review.md`
- **Se REJEITADO**: N/A (S ≥ 90 — not moved to `02-doing/`; not promoted to `04-completed/`)

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers` (independent full re-review / agentID=reviewers)
- **Score**: `100/100`
- **Verdict**: `PASS_PATH_TO_100_CLOSED`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0033-token-health-dual-mode-matrix-final-review.md`
- **Lane outcome**: remains in review (`03-review/`)
- **Task reference**: Task (omniroute-token-health-dual-mode-matrix)
- **Patches applied this review**: inherit 0032 array-gate; Details hygiene; epic suite re-green

#### Current Open Blockers

- none — path-to-100 closed at 100
- `EXTERNAL_BLOCKER`: none for this task (live 21000 deploy verify = Task 0036 where applicable)

#### Path-to-100 Summary

- Closed in-session by independent re-reviewer; see full report Path to 100

### Previous Reports

- `2026-07-18` — `100/100` — `docs/reports/reviews/2026-07-18-task-0033-token-health-dual-mode-matrix-final-review.md`
  - **Carried forward**: none
  - **Resolved since**: all prior residuals + this-session purity polish
  - **Regression guard**: dual-mode static never `no_refresh_token` expire; oauth #5326 still expires; Windsurf long-lived import stays active
- `91/100` prior reaudit — `docs/reports/reviews/2026-07-16-task-0033-token-health-dual-mode-matrix-reaudit.md` (score UNTRUSTED for history only)

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
