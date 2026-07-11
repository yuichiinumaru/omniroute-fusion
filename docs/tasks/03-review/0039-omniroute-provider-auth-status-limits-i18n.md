# Task 0039: ProviderLimits / Widgets + i18n for Auth-Status Copy

> **Status**: `[x]` Complete — pending review
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0007 — Provider Connection Auth-Status UX (S3 + S4)
> **Action type**: UX_VIS
> **Blocks**: none (closes Epic 0007 after 0038)
> **Depends on**: Task 0037; Task 0038 preferred for end-to-end copy consistency (can parallelize i18n keys after 0037)

---

## Objective

1. Replace hard-coded OAuth re-auth suffix in **ProviderLimits** and related quota/usage widgets with the Task 0037 helper (auth-mode aware).
2. Land **i18n keys** for new strings (EN first; other locales follow project pattern — reuse safe generic keys when possible).
3. Align badge tones with `statusVocabulary` where applicable; no rainbow chrome.
4. Ensure accessibility: badges/buttons have clear labels for apikey vs oauth next actions.

Primary offender today:

```417:419:src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.tsx
            const reauthMsg = /re-?authenticat|sign in|log in/i.test(errorMsg)
              ? errorMsg
              : `${errorMsg} — re-authenticate this account.`;
```

This path is correct for dead OAuth tokens but wrong when the connection is apikey/PAT or when the 401 is “invalid API key”.

---

## Background Context

### What already exists

- ProviderLimits 401 branch concatenates re-auth unconditionally when message lacks re-auth regex
- Home/usage widgets may surface connection errors similarly — grep before editing
- Task 0037 helper + tests; Task 0038 card wire
- `src/i18n/messages/*.json` providers/stats namespaces
- `docs/guides/UI.md` — no new default-visible sidebar leaf

### What is missing

- Limits widget does not receive/use `authType` for copy
- i18n keys for helper CTAs/titles
- Locale coverage beyond EN for new keys (follow existing i18n process — EN required; others best-effort per project norms)

### Out of scope

- Full sidebar redesign / new leaves
- Backend heal
- KiroAuthModal field changes
- Optional polish task 0040 (not opened — residual polish stays in this task if small)

### Live context

Even after 0006 heal, operators must never see “refresh token / re-authenticate” as the primary CTA on pure apikey failures. Limits 401 path is a second surface beyond ProviderCard.

---

## Test Requirements

- MUST extend unit coverage for limits-oriented inputs (authType + 401 message → no OAuth suffix for apikey)
- MUST verify EN keys exist for any new user-visible strings introduced
- MUST NOT add `PRIMARY_SIDEBAR_ITEMS` entries
- MUST keep `connection-status-copy` matrix green
- Prefer existing i18n test patterns if present; otherwise manual key presence assert in unit test or docs accuracy discipline

---

## Exit Conditions (GDD/TDD)

- [x] ProviderLimits uses auth-mode-aware copy (helper) for 401 / error message suffix
- [x] Related usage widgets that hard-code “re-authenticate this account” are grepped and fixed or explicitly deferred with reason in evidence
- [x] EN i18n keys added under existing providers/usage namespace (no orphan keys)
- [x] Additional locales: follow project convention (copy EN or use existing sync script if one exists — do not invent workflows)
- [x] `node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts` passes
- [x] Any new limits-focused tests pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors on touched files
- [x] No new default-visible sidebar leaf (`docs/guides/UI.md`)
- [x] CHANGELOG.md entry at TOP

---

## Details

### What

Subtasks:

- [x] **Read existing code**: ProviderLimits, helper, en.json, grep residual, UI.md constraints
- [x] **Thread authType** into ProviderLimits via `connectionsRef` on 401 path
- [x] **Replace suffix logic** with `formatQuotaAuthErrorMessage` → helper `detail` + `tr(keys.detail)`
- [x] **Add i18n keys** under `usage.connectionStatus` + `providers.connectionStatus`; sync locales
- [x] **Grep residual OAuth-only strings** in dashboard providers/usage
- [x] **a11y**: helper detail/cta are textual (not color-only); error row still shows text
- [x] **Refactoring pass**
- [x] **Verification**: tests + typecheck + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.tsx` | Modificar — re-auth suffix |
| `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/i18nFallback.ts` | Strip `__MISSING__:` sentinels |
| `src/shared/utils/connectionStatusCopy.ts` | `formatQuotaAuthErrorMessage` export |
| `src/i18n/messages/*.json` | EN + locale sync |
| `tests/unit/connection-status-copy-limits.test.ts` | Limits-focused tests |
| `CHANGELOG.md` | Entrada 0039 |

### How

1. Grep residual re-auth strings under `src/app` / `src/shared`
2. 401 on apikey → rotate/retest keys; oauth → re-auth; cookie → update session
3. EN messages first; `npm run i18n:sync-ui` for other locales

### Why

ProviderLimits is a high-visibility failure surface during quota fetch. Leaving the hard-coded OAuth suffix undoes card-level work from 0038 for the same connection.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT add sidebar leaves or new hub routes.
> DO NOT apply OAuth re-auth suffix when `authType` is apikey/cookie.
> DO NOT fabricate i18n namespaces — reuse providers/usage/stats existing structure after listing keys.

> [!IMPORTANT]
> `docs/guides/UI.md` — **no new default-visible sidebar leaf**.
> Read EVERY file in "Where" before writing.
> Grep residual “re-authenticate this account” before claiming complete.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Keys/paths grepped
- [x] **Zod Validation**: N/A
- [x] **Security**: No secrets in UI strings
- [x] **Error Sanitization**: No raw stacks in widgets
- [x] **No Raw SQL**: N/A
- [x] **UI IA**: No new default-visible sidebar leaf (`docs/guides/UI.md`)
- [x] **i18n**: EN keys present for new copy

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/utils/connectionStatusCopy.ts` — added `formatQuotaAuthErrorMessage`
  - `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.tsx` — 401 path uses helper + authType from connections
  - `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/i18nFallback.ts` — strip `__MISSING__:` sentinels
  - `src/i18n/messages/en.json` — `usage.connectionStatus.*` + `providers.connectionStatus.*` (10 scenarios × badge/title/detail/cta)
  - `src/i18n/messages/{41 locales}.json` — synced via `npm run i18n:sync-ui`
  - `tests/unit/connection-status-copy-limits.test.ts` — created
  - `CHANGELOG.md` — Unreleased Added entry (0039)
  - `docs/tasks/03-review/0039-…` — this file
- **Grep residual re-auth hits**:
  - **Usage/ProviderLimits**: none (hard-coded suffix removed)
  - **connectionStatusCopy.ts**: oauth EN default `detail` still legitimately says re-auth (oauth-only branch)
  - **API routes** `providers/[id]/test|refresh`: backend oauth expiry messages — deferred (not UI widgets; oauth-correct)
  - **ProviderCard/ConnectionRow / connectionStatusPresentation**: parallel Task 0038 work (left unstaged for that agent)
  - **ProviderQuotaWidget**: no hard-coded re-auth suffix; uses cached quotas only — no change needed
- **Testes que verificam o trabalho**:
  ```bash
  node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts
  npm run typecheck:core
  npx eslint --max-warnings=999 <touched files>
  ```
- **Resultado dos testes**: PASS — 18/18 (10 matrix 0037 + 8 limits 0039)
- **Resultado do lint**: PASS (0 errors on touched files)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core`)
- **Entrada no changelog**: `CHANGELOG.md` → `[Unreleased]` → **ProviderLimits auth-status copy + i18n (Epic 0007 S3–S4 / Task 0039)**
- **Agente executor**: Grok Build subagent (Task 0039)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based]
- **Se REJEITADO**: mover para `02-doing/` com motivo no topo
