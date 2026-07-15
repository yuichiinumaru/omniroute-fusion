# Task 0032: Shared Connection Auth-Mode Helper Extraction

> **Status**: `[x]` Complete — pending review
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: Epic 0006 — Dual-Mode Auth / API-Key Refresh Correctness (S1)
> **Action type**: HARDEN + EXTEND (condensation)
> **Blocks**: Task 0033, Task 0034, Task 0035, Task 0037 (preferred contract reuse)
> **Depends on**: none

---

## Objective

Extract and condense “is this connection OAuth-refreshable?” logic into a single shared module so health check, test/refresh routes, and (later) UI status mapping do not re-implement divergent `authType` string compares (`apikey` / `api_key` / `api-key` / `cookie` / blank + apiKey).

Concrete outcome: one module exports at least:

- `normalizeAuthType(raw)` → canonical `"oauth" | "apikey" | "cookie" | "none" | "unknown"`
- `connectionUsesOAuthRefresh(conn)` (behavior-preserving move of existing helper)
- optional `shouldMarkNoRefreshExpired(conn, supportsRefresh: boolean)` as a pure gate used by the #5326 branch

`src/lib/tokenHealthCheck.ts` must re-export or import the shared helper so existing imports (`tokenHealthCheck.connectionUsesOAuthRefresh`) keep working until call sites are updated.

## Background Context

### Live evidence (2026-07-11, `data-21000/storage.sqlite`)

| auth_type | provider | rows with `error_code = no_refresh_token` |
|-----------|----------|-------------------------------------------|
| `apikey`  | `gemini` | **13** (AI Studio keys) |
| `apikey`  | `qoder`  | **9** (PATs) |
| `oauth`   | `windsurf` | 2 |
| `oauth`   | `github` | 1 |

Root cause class: provider-id refresh set (`supportsTokenRefresh("gemini")` etc.) applied without connection-level auth mode. Workspace source already has a guard; live `omniroute-21000` build **lacks** `connectionUsesOAuthRefresh` in the health chunk (only `supportsTokenRefresh(provider)`).

### What already exists

- `connectionUsesOAuthRefresh()` — `src/lib/tokenHealthCheck.ts` ~L85–111
- #5326 no-refresh branch — same file ~L378–408 (uses helper + `supportsTokenRefresh`)
- SQL `authType` filter — `src/lib/db/providers.ts` ~L157–163 (was previously silently ignored)
- Unit coverage of helper + gemini apikey — `tests/unit/token-health-no-refresh-token-expired-5326.test.ts`
- Manual refresh already rejects non-oauth — `src/app/api/providers/[id]/refresh/route.ts` ~L29–33
- Provider-level only: `supportsTokenRefresh` — `open-sse/services/tokenRefresh.ts` ~L1644–1666

### What is missing / broken

- Helper lives only inside `tokenHealthCheck.ts` — not reusable from test route OAuth branch, refresh policy docs, or UI (Epic 0007)
- Scattered `authType === "apikey"` compares elsewhere will drift from blank-authType + apiKey rules
- No `normalizeAuthType` SSoT for dual aliases (`api_key`, `api-key`)

### False gaps (do NOT rebuild)

- Splitting gemini into two provider ids alone does **not** replace connection-level guards
- Disabling health check globally starves real OAuth (kimi short TTL)
- SQL oauth-only filter alone is insufficient for exportable `checkConnection` / future callers

---

## Test Requirements

- MUST preserve current boolean matrix of `connectionUsesOAuthRefresh` (apikey/cookie/none false; oauth true; blank+apiKey false; blank without apiKey true)
- MUST map `api_key` and `api-key` aliases to non-OAuth via `normalizeAuthType` or equivalent
- MUST keep existing tests green: `token-health-no-refresh-token-expired-5326.test.ts` still imports helper (via re-export or updated import)
- MUST add focused unit tests for the new module (pure functions, no DB required)
- MUST NOT change #5326 semantics for true OAuth rows without refresh token (still expired)

---

## Exit Conditions (GDD/TDD)

- [x] Shared module created at **`src/shared/utils/connectionAuthMode.ts`** (parent pin 2026-07-11: primary consumers are `src/lib/*` health + API routes + dashboard; open-sse keeps provider-level `supportsTokenRefresh` and only imports shared helpers if a later call site needs them without reverse cycle)
- [x] `normalizeAuthType` + `connectionUsesOAuthRefresh` exported from that module
- [x] `tokenHealthCheck.ts` uses shared helper (no duplicated authType branch)
- [x] Existing public symbol still reachable for regression tests (`connectionUsesOAuthRefresh` from health module and/or shared module)
- [x] New tests: `node --import tsx/esm --test tests/unit/connection-auth-mode*.test.ts` pass
- [x] Regression: `node --import tsx/esm --test tests/unit/token-health-no-refresh-token-expired-5326.test.ts` pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors on touched files
- [x] CHANGELOG.md entry at TOP under Unreleased (backend/auth-mode helper condensation)

---

## Details

### What

Subtasks:

- [ ] **Read existing code**: `src/lib/tokenHealthCheck.ts` (helper + #5326 branch), `src/lib/db/providers.ts` (authType filter + `createProviderConnection` default `authType || "oauth"` ~L369), `open-sse/services/tokenRefresh.ts` (`supportsTokenRefresh`), `src/app/api/providers/[id]/refresh/route.ts`, `src/app/api/providers/[id]/test/route.ts` (oauth vs qoder apikey branches), `tests/unit/token-health-no-refresh-token-expired-5326.test.ts`, import graph for `src/shared` ↔ `open-sse` cycles
- [ ] **Choose module location** that avoids circular deps; if shared lives under `src/shared/utils/`, keep open-sse call sites on Task 0035 unless path is safe for open-sse
- [ ] **Implement pure helpers** with JSDoc: dual-mode rules, blank authType + apiKey foot-gun
- [ ] **Wire `tokenHealthCheck.ts`** to import shared helper; re-export for back-compat if tests import from health module
- [ ] **Write unit tests** for normalize + connectionUsesOAuthRefresh matrix
- [ ] **Refactoring pass**: no behavior change beyond single source of truth; delete duplicated branch only after tests green
- [ ] **Verification**: typecheck + lint + named unit tests

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/tokenHealthCheck.ts` | Ler + modificar — move/import helper; keep #5326 branch |
| `src/shared/utils/connectionAuthMode.ts` | Criar — SSoT auth-mode helpers (**pinned path**) |
| `src/lib/db/providers.ts` | Ler — authType filter + create default (no mandatory change) |
| `open-sse/services/tokenRefresh.ts` | Ler — provider-level `supportsTokenRefresh` (call-site audit is Task 0035) |
| `tests/unit/connection-auth-mode.test.ts` | Criar — pure helper matrix |
| `tests/unit/token-health-no-refresh-token-expired-5326.test.ts` | Ler + ajustar imports se necessário |
| `CHANGELOG.md` | Modificar — entry at top |

### How

1. Grep all `authType === "apikey"` / `api_key` / `connectionUsesOAuthRefresh` to measure condensation surface (do not rewrite every call site in this task — only extract + health wire).
2. Copy current helper semantics verbatim into the shared module first (TDD: move tests that assert helper purity).
3. Optionally add `shouldMarkNoRefreshExpired(conn, supportsRefresh)` wrapping the three conditions used at L389–392.
4. Leave heal migration (Task 0034) and matrix expansion (Task 0033) out of scope.

### Why

Without a shared helper, dual-mode providers (`gemini`, `qoder`, `codebuddy-cn`) will keep regressing whenever a new path checks only `supportsTokenRefresh(provider)`. Live 21000 already shows 22 false-positive apikey `no_refresh_token` rows. Condensation is the maintainability gate for Epic 0006 S2–S5 and preferred import for Epic 0007 copy helper.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT change product behavior for true OAuth #5326 (oauth + supports refresh + no RT → expired).
> DO NOT implement heal SQL, UI badge copy, or gemini-cli `ya29` 401 handling here.
> DO NOT invent new authType enum values beyond what DB/API already use without grepping schemas.

> [!IMPORTANT]
> Read EVERY file in "Where" before writing.
> Prefer re-export from `tokenHealthCheck` so existing tests do not flake on import path alone.
> Parent pin: implement under `src/shared/utils/connectionAuthMode.ts`. Do **not** move to open-sse unless a cycle forces it — if so, document the cycle graph in Completion Evidence before relocating.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Function/path names grepped before documenting
- [ ] **Zod Validation**: N/A unless new API surface (none expected)
- [ ] **Security**: No secrets; no credential logging
- [ ] **Error Sanitization**: N/A (pure helpers)
- [ ] **No Raw SQL**: N/A
- [ ] **Archive Protocol**: Move/extract, do not delete history of behavior

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/utils/connectionAuthMode.ts` (created — SSoT)
  - `src/lib/tokenHealthCheck.ts` (import + re-export; #5326 uses `shouldMarkNoRefreshExpired`)
  - `tests/unit/connection-auth-mode.test.ts` (created)
  - `CHANGELOG.md` (Unreleased Fixed — Epic 0006 combined)
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/connection-auth-mode.test.ts`
  - `node --import tsx/esm --test tests/unit/token-health-no-refresh-token-expired-5326.test.ts`
- **Resultado dos testes**: PASS — 10 pure helper + 6 #5326 regression (16 total in combined run)
- **Resultado do lint**: PASS (`eslint` on touched files, exit 0)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core`)
- **Entrada no changelog**: Unreleased → Fixed → Dual-mode auth (0032–0034)
- **Agente executor**: Grok Build subagent (main session, operator-authorized)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: Code Quality Reviewer (`reviewers` / parent agentID=reviewers)
- **Data da review**: 2026-07-11
- **Veredito**: APROVADO com notas (PASS WITH NOTES) — **held in `03-review/`** (S≥90; do not complete; do not return to doing)
- **Score (path to 100)**: 96/100
- **Report**: `docs/reports/reviews/2026-07-11-task-0032-connection-auth-mode-helper-review.md`
- **Notas**:
  - Shared SSoT at `src/shared/utils/connectionAuthMode.ts` with `normalizeAuthType`, `connectionUsesOAuthRefresh`, `shouldMarkNoRefreshExpired`; re-exported from `tokenHealthCheck.ts`.
  - Fresh tests: 20/20 PASS (`connection-auth-mode` + `#5326`); eslint on touched files exit 0.
  - #5326 oauth positive path preserved; apikey/cookie/blank+apiKey never enter no-RT expiry.
  - Path-to-100 residuals only: Details subtasks still `[ ]` (N1); stale completion evidence test counts (N2).
- **Se REJEITADO**: N/A — score ≥ 90, stay in `03-review/`
