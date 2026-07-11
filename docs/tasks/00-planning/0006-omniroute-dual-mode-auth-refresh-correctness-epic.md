# Epic 0006 — Dual-Mode Auth / API-Key Refresh Correctness

> **Status**: Planning (promote child tasks next)  
> **Priority**: High (P0 — live data on `:21000` already corrupted)  
> **Author**: Grok session (omniroute-fusion) · 2026-07-11  
> **Project**: omniroute-fusion  
> **Type**: remediation / architecture / maintainability  
> **Action types**: `HARDEN` (refresh gates) + `EXTEND` (shared auth-mode helpers) + `NEW` (heal path / matrix tests)  
> **Depends on**: none  
> **Related**:  
> - Issue class **#5326** (OAuth no-refresh → expired) — partial fix present; dual-mode regression  
> - Live evidence: `data-21000/storage.sqlite`  
> - Sister epic **0007** (provider connection UX / status copy) — **do not mix UI chrome here**  
> - Epic 0005 UI IA is orthogonal (sidebar); this epic is credentials runtime

---

## 1. Goal (RF8 · Goals)

### Problem

OmniRoute treats several providers as **refresh-capable by provider id** (`supportsTokenRefresh("gemini")`, `"qoder"`, …) even when the **connection** is a static API key / PAT. The token health sweep's `#5326` branch then marks those rows:

```
testStatus = expired
errorCode / lastErrorType = no_refresh_token
lastError = "No refresh token available — re-authenticate this account."
```

That message is **OAuth-only**. Static AI Studio / PAT credentials never have a refresh token by design.

**Live production evidence** (`data-21000/storage.sqlite`, 2026-07-11):

| auth_type | provider | rows with `no_refresh_token` |
|-----------|----------|------------------------------|
| `apikey`  | `gemini` | **13** (all AI Studio keys) |
| `apikey`  | `qoder`  | **9** (PATs) |
| `oauth`   | `windsurf` | 2 (may be long-lived import / missing RT) |
| `oauth`   | `github` | 1 (likely legitimate re-auth) |

Container `omniroute-21000` build **lacks** `connectionUsesOAuthRefresh` in the health-check chunk (only `supportsTokenRefresh(provider)`). Workspace source already has:

- `connectionUsesOAuthRefresh()` in `src/lib/tokenHealthCheck.ts`
- `getProviderConnections({ authType })` SQL filter in `src/lib/db/providers.ts`
- regression tests in `tests/unit/token-health-no-refresh-token-expired-5326.test.ts` (gemini apikey case)

Residual gaps:

1. **Deploy lag** — 21000/base images not rebuilt from guarded source.  
2. **Stuck rows** — even after code fix, expired false-positives do not self-heal.  
3. **Provider-id refresh set** still dual-mode-blind (`gemini`, `qoder`, `codebuddy-cn` free-apikey path, Windsurf long-lived import).  
4. **Repeated auth-mode checks** scattered (health check, test route OAuth branch, refresh route, token-health API) — condensation opportunity.  
5. **Default `authType: data.authType || "oauth"`** in `createProviderConnection` is foot-gun for any caller that forgets authType (POST `/api/providers` hardcodes `apikey` today).

### Value

1. **Correctness**: API keys never enter OAuth refresh / no-refresh expiry paths.  
2. **Ops**: clear heal path for already-corrupted rows (gemini/qoder on 21000).  
3. **Maintainability**: one shared “connection may use OAuth refresh?” helper (+ optional dual-mode matrix) instead of copy-pasted authType string checks.  
4. **Regression safety**: matrix tests for every dual-mode provider id.

### Success metrics

| Metric | Target |
|--------|--------|
| Gemini AI Studio apikey | Never `no_refresh_token` from health sweep |
| Qoder PAT apikey | Same |
| Dual-mode matrix | Every id in `supportsTokenRefresh` ∩ dual-auth paths covered by unit test |
| Live 21000 | 0 apikey rows with `error_code = no_refresh_token` after heal |
| Shared helper | ≥2 call sites use one module (health + test/refresh) |
| Deploy | Image used by 21000 includes `connectionUsesOAuthRefresh` guard (or equivalent) |

### Stop criteria (out of scope)

- UI badge copy / ProviderCard expired messaging → **Epic 0007**.  
- gemini-cli 401 “Incorrect API key provided: ya29…” (OAuth access token misuse as API key) — separate executor bug unless proven same root.  
- kimi-coding `unrecoverable_refresh_error` (true OAuth death).  
- Full OAuth provider onboarding redesign.  
- Changing Windsurf long-lived import product behavior beyond not false-expiring when policy says long-lived.

---

## 2. Domain (RF8 · Domain)

### Bounded context

| Area | Owner modules | Notes |
|------|---------------|-------|
| Token health sweep | `src/lib/tokenHealthCheck.ts` | `#5326` no-refresh branch; must gate on **connection** auth mode |
| Connection CRUD | `src/lib/db/providers.ts` | `authType` filter; default authType |
| Refresh service | `open-sse/services/tokenRefresh.ts` | `supportsTokenRefresh(provider)` is **provider-level** only |
| Connection test | `src/app/api/providers/[id]/test/route.ts` | OAuth test path “Refresh token expired…” |
| Manual refresh | `src/app/api/providers/[id]/refresh/route.ts` | Already rejects non-oauth |
| Token health API | `src/app/api/token-health/route.ts` | oauth filter + requires refreshToken |
| Dual-mode catalog | registry `gemini`, `qoder`; free dual `codebuddy-cn` | `authType: apikey` + `oauth` block OR free-apikey on oauth primary |
| Tests | `tests/unit/token-health-no-refresh-token-expired-5326.test.ts` | Extend matrix |

### Dual-mode / high-risk inventory (code + live)

| Provider id | Registry authType | Also OAuth / refresh? | Live apikey `no_refresh`? | Notes |
|-------------|-------------------|------------------------|---------------------------|-------|
| `gemini` | `apikey` + oauth block | Yes (`supportsTokenRefresh`) | **YES (13)** | AI Studio static key vs Google OAuth refresh |
| `qoder` | `apikey` + oauth block | Yes | **YES (9)** | PAT vs OAuth; free dual |
| `codebuddy-cn` | `oauth` primary | Free-apikey dual (`FREE_APIKEY_PROVIDER_IDS`) | none in DB | Risk if apikey rows ever hit sweep without guard |
| `windsurf` | `oauth` | Long-lived import may lack RT | 2 oauth no_rt | Special-case already partially handled in refresh service |
| `github` | `oauth` | refresh-capable | 1 oauth no_rt | Likely legitimate |
| Pure apikey (openai, openrouter, …) | apikey | `supportsTokenRefresh` false | no | Safe if sweep is oauth-only |

**Explicit `supportsTokenRefresh` set today:**  
`gemini`, `antigravity`, `agy`, `claude`, `codex`, `qwen`, `qoder`, `github`, `kiro`, `amazon-q`, `cline`, `kimi-coding`, `windsurf`, `devin-cli`, `gitlab-duo`, `codebuddy-cn` (+ any provider with `refreshUrl`/`tokenUrl` in PROVIDERS).

### False gaps (do NOT rebuild)

| Tempting rebuild | Reality |
|------------------|---------|
| Split gemini into two provider ids only | Helps UX; does **not** replace connection-level guard |
| Disable health check globally | Starves real OAuth (kimi short TTL) |
| Only filter SQL oauth | Defense in depth still needs connection-level guard inside `checkConnection` (exportable / manual call / future callers) |

### Current-state evidence (source)

- Guard: `connectionUsesOAuthRefresh` — `src/lib/tokenHealthCheck.ts` ~L85–111  
- Branch: `checkConnection` no-refresh — same file ~L378–408  
- SQL filter comment: `src/lib/db/providers.ts` ~L157–163 (filter was previously **silently ignored**)  
- Default authType oauth: `createProviderConnection` ~L369  
- Tests: gemini apikey + filter tests already exist; **qoder / codebuddy-cn / matrix missing**  
- Deploy: `omniroute-21000` health chunk marks expired on `supportsTokenRefresh(provider)` only (no connection auth gate)

---

## 3. Stories / slices (for task-architect)

| Story | Intent | Suggested child tasks (architect to refine) |
|-------|--------|-----------------------------------------------|
| **S0 Evidence freeze** | Capture dual-mode inventory + 21000 counts as durable evidence packet | 1 planning/evidence task or section in epic (done here) |
| **S1 Shared auth-mode helper** | Extract/share `connectionUsesOAuthRefresh` (or stronger `connectionMayRefreshOAuthToken`) to a small module usable from health + test + refresh | HARDEN + condense |
| **S2 Health sweep harden + matrix tests** | Ensure guard on every no-refresh / refresh path; add tests for gemini, qoder, codebuddy-cn apikey, cookie, blank authType+apiKey | TDD |
| **S3 Heal false-positive rows** | One-shot heal: apikey (+ cookie?) with `error_code=no_refresh_token` → restore `active` + clear error fields when apiKey present | migration script or admin/boot heal with tests |
| **S4 Dual-mode refresh policy** | Document + optionally narrow `supportsTokenRefresh` callers to always pass connection; Windsurf long-lived policy alignment | EXTEND |
| **S5 Deploy verification** | Rebuild/redeploy 21000 (or operator-owned) and prove 0 apikey `no_refresh_token` + health logs clean | verification task |

### Suggested dependency order

```
S1 (helper) → S2 (health + tests) → S3 (heal) → S5 (deploy verify)
                ↘ S4 (policy) parallel after S1
```

0007 (UI) may start after S2 contracts for status codes are stable; UI must not block S3 heal.

---

## 4. Condensation opportunity (maintainability)

Repeated concepts today:

1. “Is this connection OAuth-refreshable?” — health check only.  
2. “Is authType apikey?” — string compares in many files (`apikey` / `api_key` / `api-key`).  
3. Provider-level `supportsTokenRefresh(id)` mixed with connection-level decisions.

**Target shape (architect/tasks to implement, not invent more than needed):**

```ts
// e.g. open-sse/utils/connectionAuthMode.ts or src/shared/utils/connectionAuthMode.ts
export function normalizeAuthType(raw): "oauth" | "apikey" | "cookie" | "none" | "unknown"
export function connectionUsesOAuthRefresh(conn): boolean
export function shouldMarkNoRefreshExpired(conn, supportsRefresh: boolean): boolean
```

Single place for dual-mode rules; health + test routes import it.

---

## 5. Validation commands (epic-level)

```bash
node --import tsx/esm --test tests/unit/token-health-no-refresh-token-expired-5326.test.ts
# after matrix expansion:
node --import tsx/esm --test tests/unit/token-health-*-*.test.ts
npm run typecheck:core
# live heal check (read-only):
sqlite3 data-21000/storage.sqlite \
  "SELECT auth_type, provider, COUNT(*) FROM provider_connections WHERE error_code='no_refresh_token' GROUP BY 1,2;"
```

Expected post-fix: **0 rows** where `auth_type='apikey' AND error_code='no_refresh_token'`.

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Heal reactivates truly bad keys | Only clear `no_refresh_token` false-positives; leave `401` / `banned` alone |
| Breaking real OAuth #5326 | Keep marking oauth refresh-capable + no RT as expired |
| Deploy without heal | S3 + S5 explicit |
| gemini-cli separate 401 | Out of scope note in stop criteria |

---

## 7. Promotion note for gt-task-architect

Promote **atomic tasks into `docs/tasks/01-open/`** starting at next free number (**0032+** as of 2026-07-11).  
Use template `docs/tasks/.archive/000-template-moved-to-parent.md` (local).  
Do **not** put UI badge/copy work in this epic — that is **0007**.  
Every task: first subtask = read existing code; binary exit conditions; TDD for heal + matrix.

---

## 8. Child tasks (promoted 2026-07-11)

| Task | File | Slice |
|------|------|-------|
| 0032 | `docs/tasks/01-open/0032-omniroute-connection-auth-mode-helper.md` | S1 helper |
| 0033 | `docs/tasks/01-open/0033-omniroute-token-health-dual-mode-matrix.md` | S2 matrix |
| 0034 | `docs/tasks/01-open/0034-omniroute-heal-false-positive-no-refresh-token.md` | S3 heal |
| 0035 | `docs/tasks/01-open/0035-omniroute-dual-mode-refresh-policy-audit.md` | S4 policy |
| 0036 | `docs/tasks/01-open/0036-omniroute-deploy-verify-21000-dual-mode-auth.md` | S5 verify |

**Parent review upgrades:** pin helper path `src/shared/utils/connectionAuthMode.ts`; pin heal to TS domain function (not ciphertext SQL); 0036 runbook anchored to `omniroute-21000` + `data-21000/`.
