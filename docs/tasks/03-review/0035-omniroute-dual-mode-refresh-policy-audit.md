# Task 0035: Dual-Mode Refresh Policy / supportsTokenRefresh Call-Site Audit

> **Status**: `[x]` Complete — pending review
> **Priority**: 🟡 P1
> **Type**: `remediation` + `governance`
> **Origin**: Epic 0006 — Dual-Mode Auth / API-Key Refresh Correctness (S4)
> **Action type**: EXTEND + HARDEN
> **Blocks**: none (feeds maintainability; 0036 can proceed without full policy doc)
> **Depends on**: Task 0032 (shared helper available)

---

## Objective

Audit every call site that treats a provider as “refreshable” and ensure **connection-level auth mode** participates whenever a decision would expire, skip, or message a connection. Document Windsurf long-lived import behavior so it is not false-expired as missing refresh token when product policy says long-lived Codeium keys need no RT.

Concrete deliverables:

1. Inventory table of `supportsTokenRefresh(` and related refresh gates with file:line
2. Each site classified: **provider-only OK** vs **must use connection helper**
3. Code fixes for any site still dual-mode-blind on connection decisions
4. Short in-code or `docs/` note (accurate, grepped) for Windsurf long-lived path already in `tokenRefresh.ts` ~L442–465

---

## Exit Conditions (GDD/TDD)

- [x] Grep inventory completed and pasted into Completion Evidence (command + hit list)
- [x] Each dual-mode-blind connection decision fixed OR explicitly accepted with rationale
- [x] Health + refresh route + test route + token-health API reviewed against Task 0032 helper
- [x] Windsurf long-lived notes aligned (comment and/or accurate short doc section — no fabricated APIs)
- [x] Relevant unit tests pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors on touched files
- [x] CHANGELOG.md entry at TOP

---

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/utils/connectionAuthMode.ts` — `isLongLivedImportCredential`; gate in `shouldMarkNoRefreshExpired`; Windsurf heal eligibility
  - `open-sse/services/tokenRefresh.ts` — policy JSDoc on `supportsTokenRefresh`; Windsurf long-lived path comments
  - `src/lib/tokenHealthCheck.ts` — re-export `isLongLivedImportCredential`; policy comments on #5326
  - `src/app/api/providers/[id]/refresh/route.ts` — `connectionUsesOAuthRefresh` + long-lived skip
  - `src/app/api/providers/[id]/test/route.ts` — `normalizeAuthType` / `connectionUsesOAuthRefresh` dispatch; long-lived re-auth copy
  - `src/app/api/token-health/route.ts` — filter with `connectionUsesOAuthRefresh`
  - `src/lib/db/providers.ts` — FOOT-GUN comment on `authType || "oauth"` (default **unchanged**)
  - `docs/architecture/RESILIENCE_GUIDE.md` — dual-mode OAuth refresh policy section
  - `tests/unit/connection-auth-mode.test.ts` — Windsurf long-lived matrix
  - `tests/unit/token-health-no-refresh-token-expired-5326.test.ts` — Windsurf health regression
  - `tests/unit/dual-mode-refresh-policy-audit-0035.test.ts` — source-level call-site gates
  - `CHANGELOG.md`

### Call-site inventory

**Command:**
```bash
rg -n "supportsTokenRefresh\\(" src open-sse
rg -n "no_refresh_token|connectionUsesOAuthRefresh|normalizeAuthType|isLongLivedImportCredential" src open-sse
```

| File:line | Kind | Classification | Action |
|-----------|------|----------------|--------|
| `open-sse/services/tokenRefresh.ts:1665` | `supportsTokenRefresh` definition | **provider-only OK** (catalog) | Documented: necessary ≠ sufficient |
| `open-sse/services/tokenRefresh.ts` `refreshWindsurfToken` | long-lived import no-op | **provider product path** | Comments aligned with `isLongLivedImportCredential` |
| `src/lib/tokenHealthCheck.ts:371–373` | #5326 expiry | **must use connection helper** | Uses `shouldMarkNoRefreshExpired(conn, supportsTokenRefresh(...))` |
| `src/lib/tokenHealthCheck.ts:407` | skip proactive refresh if family unsupported | **provider-only OK** | After oauth filter + RT present; catalog capability |
| `src/app/api/providers/[id]/refresh/route.ts` | manual refresh gate | **must use connection helper** | `connectionUsesOAuthRefresh` + long-lived skip |
| `src/app/api/providers/[id]/test/route.ts` | dispatch + reauth messages | **must use connection helper** | `normalizeAuthType` / `connectionUsesOAuthRefresh` / long-lived |
| `src/app/api/token-health/route.ts` | badge aggregate | **must use connection helper** | `authType:oauth` SQL + RT + `connectionUsesOAuthRefresh` |
| `src/shared/utils/connectionAuthMode.ts` | SSoT helpers | N/A (definition) | Includes long-lived Windsurf/Devin |
| `src/lib/db/providers.ts:369` | `authType \|\| "oauth"` | **documented foot-gun** | Comment only — default unchanged (oauth import safety) |
| Tests (`agy-provider`, `codebuddy-cn-provider`, `service-token-refresh`, …) | membership asserts | **provider-only OK** | Unchanged |

**Policy:** `supportsTokenRefresh(provider)` is necessary but **not sufficient** for connection expiry.

**Windsurf:** import-token (`mapTokens` → `refreshToken: null`, default `authMethod: "import"`) is long-lived; health must not mark `no_refresh_token`. Verified sources: `src/lib/oauth/providers/windsurf.ts`, `refreshWindsurfToken`.

- **Testes que verificam o trabalho**:
  ```bash
  node --import tsx/esm --test \
    tests/unit/connection-auth-mode.test.ts \
    tests/unit/token-health-no-refresh-token-expired-5326.test.ts \
    tests/unit/dual-mode-refresh-policy-audit-0035.test.ts \
    tests/unit/heal-no-refresh-token.test.ts \
    tests/unit/token-health-dual-mode-matrix.test.ts \
    tests/unit/service-token-refresh.test.ts \
    tests/unit/codex-manual-refresh-rotating-guard.test.ts
  npm run typecheck:core
  npx eslint <touched files>
  ```
- **Resultado dos testes**: PASS (56 tests, 0 fail)
- **Resultado do lint**: PASS (0 errors; pre-existing `any` warnings in 5326 test only)
- **Resultado do typecheck/build**: PASS (`typecheck:core`)
- **Entrada no changelog**: `[Unreleased]` → Fixed → Dual-mode refresh policy audit (Epic 0006 S4 / Task 0035)
- **Agente executor**: Grok Build subagent (ts-engineer)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: Code Quality Reviewer (independent task reviewer / parent agentID=reviewers)
- **Data da review**: 2026-07-11
- **Veredito**: APROVADO (PASS WITH NOTES)
- **Score (path to 100)**: 93
- **Notas**: Fresh re-verification of inventory, gates, Windsurf policy, tests (56/56), typecheck, lint, CHANGELOG. Prod `supportsTokenRefresh(` limited to definition + tokenHealthCheck (gated #5326 + post-RT catalog skip). Residual: pre-existing raw `error.message` in refresh catch (F1); UI/scheduler exact `authType` strings OOS (F2/F4); optional `"imported"` vs `"import"` align (F3). Report: `docs/reports/reviews/2026-07-11-task-0035-dual-mode-refresh-policy-audit-review.md`. Lane: stay `03-review/` (S≥90). Not moved to `02-doing/` or `04-completed/`.
- **Se REJEITADO**: N/A
