# Task 0037: Provider Connection Auth-Status Copy Helper + Unit Tests

> **Status**: `[x]` Complete — pending review
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0007 — Provider Connection Auth-Status UX (S1 + S5 matrix)
> **Action type**: UX_VIS + HARDEN
> **Blocks**: Task 0038, Task 0039
> **Depends on**: Task 0033 preferred (stable error taxonomy / dual-mode contracts); Task 0032 helper optional for auth-mode reuse

---

## Objective

Create a pure status-copy helper used by Providers hub surfaces:

```ts
formatConnectionStatusMessage(input) → { badge, title, detail, cta, tone? }
```

Inputs at minimum: `authType`, `testStatus`, `errorCode` / `lastErrorType`, `lastError`, optional `expiryStatus`.

Rules (binary):

| Auth mode | `no_refresh_token` / pure apikey expiry | Primary CTA language |
|-----------|------------------------------------------|----------------------|
| `apikey` / `api_key` | Never “refresh token” / “re-authenticate OAuth” | Rotate/retest key |
| `oauth` | Re-auth / re-import / refresh failed (keep) | Re-authenticate |
| `cookie` | Re-paste session cookie | Update cookie |
| Legacy apikey + false `no_refresh_token` (pre-heal) | Neutral “needs re-test” / health glitch — **not** OAuth | Retest connection |

This task is **helper + unit tests only** — wiring is 0038/0039.

## Background Context

### Live false copy (pre-heal 21000)

Operators see **13 gemini + 9 qoder** apikey cards with `lastError`:  
“No refresh token available — re-authenticate this account.”

### What already exists

- `ProviderCard.tsx` ~L344–347: generic `expiredBadge` when `expiryStatus === "expired"`
- `ProviderLimits/index.tsx` ~L417–418: `` `${errorMsg} — re-authenticate this account.` `` on 401
- `TokenHealthBadge.tsx`: aggregate OAuth (`totalOAuth`) — verify it does not count apikey
- `statusVocabulary.ts`: tone/badge mapping (Epic 0005 micro) — prefer reuse for tones
- Backend taxonomy: `no_refresh_token`, `refresh_failed`, reauth messaging from health/test routes
- Shared auth-mode: Task 0032 (`normalizeAuthType` / `connectionUsesOAuthRefresh`) — import if path is UI-safe

### What is missing

- No single formatter for auth-mode-aware badge/title/detail/cta
- UI hard-codes OAuth re-auth suffix without reading `authType`

### IA invariant (mandatory)

From `docs/guides/UI.md` invariant #1: **no new default-visible sidebar leaf**.  
All work stays under existing Providers hub / connection cards. Do **not** add routes or `PRIMARY_SIDEBAR_ITEMS` entries.

### Out of scope

- Backend heal (0006 / 0034)
- Full Providers page rewrite
- KiroAuthModal refresh-token field (correct for Kiro OAuth import)
- Sidebar redesign

---

## Test Requirements

- MUST unit-test matrix:
  1. gemini-like apikey + `no_refresh_token` → no “refresh token” / no OAuth re-auth primary CTA
  2. oauth + `no_refresh_token` → re-auth messaging allowed
  3. apikey + 401 / invalid key style codes → key rotation language
  4. oauth + `refresh_failed` → refresh/re-auth language
  5. cookie + error → cookie re-paste language
- MUST assert helper is pure (no i18n hard dependency if possible — return message keys or English defaults with key fields; document pattern used by similar formatters in repo)
- MUST NOT add sidebar items (assert by design: no edits to `sidebarVisibility.ts` in this task)

---

## Exit Conditions (GDD/TDD)

- [x] Helper module created at **`src/shared/utils/connectionStatusCopy.ts`** (parent pin 2026-07-11 — shared by ProviderCard + ProviderLimits; not buried under a single page tree)
- [x] Unit tests: `node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts` pass
- [x] Matrix cases above all covered with string/CTA assertions
- [x] Reuses `normalizeAuthType` from Task 0032 when available (or duplicates minimal alias list with TODO only if import cycle — prefer import)
- [x] No changes to `src/shared/constants/sidebarVisibility.ts` / no new `PRIMARY_SIDEBAR_ITEMS`
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors on touched files
- [x] CHANGELOG.md entry at TOP (UX helper; can be combined wording with later wire if preferred, but helper should still be noted)

---

## Details

### What

Subtasks:

- [x] **Read existing code**: `ProviderCard.tsx`, `providers/page.tsx` (expiryStatus aggregation ~L371+), `ProviderLimits/index.tsx` ~L400–430, `TokenHealthBadge.tsx`, `statusVocabulary.ts`, `docs/guides/UI.md` invariants, Task 0032 auth-mode module, error codes from health check
- [x] **Design return shape** aligned with Badge variants / statusVocabulary tones
- [x] **TDD**: write matrix tests first
- [x] **Implement pure helper**
- [x] **Document key→English map** for 0039 i18n handoff
- [x] **Refactoring pass**: keep focused; scenario table + pure formatter
- [x] **Verification**: tests + typecheck + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/utils/connectionStatusCopy.ts` (path TBD) | Criar — pure formatter |
| `src/shared/utils/connectionAuthMode.ts` (0032) | Ler — normalizeAuthType |
| `src/shared/constants/statusVocabulary.ts` | Ler — tone reuse |
| `src/app/(dashboard)/dashboard/providers/components/ProviderCard.tsx` | Ler — current badge strings |
| `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.tsx` | Ler — re-auth concat |
| `docs/guides/UI.md` | Ler — no new leaf invariant |
| `tests/unit/connection-status-copy.test.ts` | Criar |
| `CHANGELOG.md` | Modificar |

### How

1. Normalize authType first.
2. Branch on errorCode/lastErrorType before free-text `lastError` parsing.
3. For apikey + `no_refresh_token`, return neutral retest copy even if `lastError` still contains OAuth sentence (legacy rows until heal).
4. Export constants for i18n keys if project pattern uses keys; else English strings with stable `id` field for 0039.

### Why

Backend heal (0006) fixes data over time; UI must never tell API-key operators to “re-authenticate OAuth” even while legacy rows linger. Shared formatter is the condensation target for card + limits widgets.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT hide real OAuth re-auth for `authType=oauth`.
> DO NOT add a new sidebar leaf or Providers sub-route for “auth status”.
> DO NOT implement ProviderCard wiring here (Task 0038).

> [!IMPORTANT]
> Cite `docs/guides/UI.md`: **no new default-visible sidebar leaf**.
> Coordinate errorCode allowlist with Epic 0006 (`no_refresh_token`, `refresh_failed`).
> Read EVERY file in "Where" before writing.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Component paths grepped
- [x] **Zod Validation**: N/A (pure UI helper)
- [x] **Security**: No secrets in copy
- [x] **Error Sanitization**: Do not surface raw stacks; display existing lastError only when appropriate
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: N/A
- [x] **UI IA**: No new default-visible sidebar leaf (`docs/guides/UI.md`)

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/utils/connectionStatusCopy.ts` (created — pure formatter + `CONNECTION_STATUS_COPY_IDS` + `keys.*`)
  - `tests/unit/connection-status-copy.test.ts` (created — 10 matrix/pure tests)
  - `CHANGELOG.md` (Unreleased → Added → Task 0037)
  - `docs/tasks/03-review/0037-…` (moved from `01-open/`)
- **Not touched (by design)**: `sidebarVisibility.ts`, ProviderCard, ProviderLimits (0038/0039)
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts`
- **Resultado dos testes**: PASS — 10/10
  - apikey + no_refresh_token → Retest CTA (no OAuth)
  - api_key alias + no_refresh_token → same
  - oauth + no_refresh_token → Re-authenticate allowed
  - apikey + 401 / invalid key → Rotate API key
  - oauth + refresh_failed → Re-authenticate
  - cookie + error / no_refresh_token → Update cookie
  - pure + healthy + legacy pre-heal neutral retest
- **Resultado do lint**: PASS (`eslint` on touched files, exit 0)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core`)
- **Entrada no changelog**: Unreleased → Added → Provider connection auth-status copy helper (0037)
- **Agente executor**: Grok Build subagent (main session, operator-authorized)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based]
- **Se REJEITADO**: mover para `02-doing/` com motivo no topo
