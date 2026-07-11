# Task 0035: Dual-Mode Refresh Policy / supportsTokenRefresh Call-Site Audit

> **Status**: `[ ]` Open
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

## Background Context

### Explicit `supportsTokenRefresh` set (today)

From `open-sse/services/tokenRefresh.ts` ~L1644–1666:

`gemini`, `antigravity`, `agy`, `claude`, `codex`, `qwen`, `qoder`, `github`, `kiro`, `amazon-q`, `cline`, `kimi-coding`, `windsurf`, `devin-cli`, `gitlab-duo`, `codebuddy-cn` (+ any PROVIDERS entry with `refreshUrl`/`tokenUrl`).

### Dual-mode / high-risk ids

| Provider | Risk | Live apikey no_rt? |
|----------|------|--------------------|
| gemini | AI Studio vs OAuth | **YES 13** |
| qoder | PAT vs OAuth | **YES 9** |
| codebuddy-cn | free-apikey dual | none in DB yet |
| windsurf | long-lived import may lack RT | 2 oauth no_rt (special case) |

### What already exists

- Manual refresh rejects non-oauth: `src/app/api/providers/[id]/refresh/route.ts` ~L29–33
- Health uses connection guard (after 0032/0033)
- Windsurf long-lived branch in `tokenRefresh.ts` logs “token may be a long-lived API key”
- Token health API oauth + refreshToken filter (verify live): `src/app/api/token-health/route.ts`

### What is missing

- No single audit artifact listing every supportsTokenRefresh consumer
- Test route OAuth diagnostics may still speak OAuth for dual-mode paths inconsistently
- Default `authType: data.authType || "oauth"` foot-gun in `createProviderConnection` ~L369 — document + optionally fail closed for dual-mode providers when callers omit authType (only if safe; do not break oauth imports)

### Out of scope

- UI badge strings (Epic 0007)
- Full OAuth onboarding redesign
- gemini-cli ya29 401
- Changing Windsurf product beyond not false-expiring long-lived keys incorrectly

---

## Test Requirements

- MUST produce audit table in Completion Evidence (every `supportsTokenRefresh` hit in `src/` + `open-sse/` + routes)
- MUST add/adjust ≥1 unit test for any **code fix** made in this task
- MUST NOT regress Windsurf long-lived skip behavior (existing token refresh tests remain green if present)
- MUST document expected policy: `supportsTokenRefresh(provider)` is **necessary but not sufficient** for connection expiry

---

## Exit Conditions (GDD/TDD)

- [ ] Grep inventory completed and pasted into Completion Evidence (command + hit list)
- [ ] Each dual-mode-blind connection decision fixed OR explicitly accepted with rationale
- [ ] Health + refresh route + test route + token-health API reviewed against Task 0032 helper
- [ ] Windsurf long-lived notes aligned (comment and/or accurate short doc section — no fabricated APIs)
- [ ] Relevant unit tests pass:
  - `node --import tsx/esm --test tests/unit/token-health-no-refresh-token-expired-5326.test.ts`
  - `node --import tsx/esm --test tests/unit/service-token-refresh.test.ts` (and/or `token-refresh-service.test.ts` if touched)
  - any new audit-related unit test file
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` passes without new errors on touched files
- [ ] CHANGELOG.md entry at TOP if code changed; if docs-only, CHANGELOG docs entry still required

---

## Details

### What

Subtasks:

- [ ] **Read existing code**: `tokenRefresh.ts` (supportsTokenRefresh + windsurf case), all grep hits, `tokenHealthCheck.ts`, refresh/test/token-health routes, `createProviderConnection` default, dual-mode registry entries for gemini/qoder/codebuddy-cn
- [ ] **Build call-site matrix** (spreadsheet-in-markdown in evidence)
- [ ] **Apply connection helper** where a connection object is available and decision is connection-scoped
- [ ] **Leave pure catalog checks** (e.g. “does provider family support refresh at all?”) as provider-level with comment
- [ ] **Windsurf**: confirm long-lived path does not mark no_refresh incorrectly; align comments with Epic 0006 stop criteria
- [ ] **Optional foot-gun**: document createProviderConnection oauth default; only change default if tests prove safe
- [ ] **Verification**: tests + typecheck + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/tokenRefresh.ts` | Ler + anotar/ajustar windsurf + supportsTokenRefresh consumers |
| `src/lib/tokenHealthCheck.ts` | Ler — reference correct pattern |
| `src/shared/utils/connectionAuthMode.ts` (0032 path) | Ler — import at connection-scoped sites |
| `src/app/api/providers/[id]/refresh/route.ts` | Ler + harden if needed |
| `src/app/api/providers/[id]/test/route.ts` | Ler + dual-mode branches |
| `src/app/api/token-health/route.ts` | Ler |
| `src/lib/db/providers.ts` | Ler — create default authType |
| `tests/unit/*token*refresh*.test.ts` | Ler + extend if behavior changes |
| `CHANGELOG.md` | Modificar |

### How

1. Run:
   ```bash
   rg -n "supportsTokenRefresh\\(" src open-sse
   rg -n "no_refresh_token|connectionUsesOAuthRefresh|normalizeAuthType" src open-sse
   ```
2. For each hit: if function receives a connection, require auth-mode gate before expiry/message.
3. Prefer shared helper over new string lists.
4. Keep provider catalog membership tests unchanged unless set intentionally changes (avoid).

### Why

Provider-id refresh membership is correct for “can this family refresh at all?” but lethal when used as the only gate for connection expiry. Audit prevents the next dual-mode provider from reintroducing 21000-class data corruption.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT remove providers from `supportsTokenRefresh` solely to “fix” apikey — that breaks real OAuth paths for the same id.
> DO NOT document endpoints/env vars without grep proof.
> DO NOT implement UI copy here.

> [!IMPORTANT]
> Connection-level gate + provider-level capability are both required for no-refresh expiry.
> Windsurf: long-lived import is product behavior — align with existing service comments, do not invent new auth flows.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: All cited paths/functions grepped
- [ ] **Zod Validation**: Only if new request fields (unlikely)
- [ ] **Security**: No credential dumps in audit evidence
- [ ] **Error Sanitization**: Preserve buildErrorBody/sanitize patterns if touching responses
- [ ] **No Raw SQL**: N/A
- [ ] **Archive Protocol**: N/A

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista]
- **Call-site inventory**: [table]
- **Testes que verificam o trabalho**: [comandos]
- **Resultado dos testes**: [PASS/FAIL + contagem]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck/build**: [PASS/FAIL]
- **Entrada no changelog**: [referência]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based]
- **Se REJEITADO**: mover para `02-doing/` com motivo no topo
