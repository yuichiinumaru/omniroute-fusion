# Task 0039: ProviderLimits / Widgets + i18n for Auth-Status Copy

> **Status**: `[ ]` Open
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

- [ ] ProviderLimits uses auth-mode-aware copy (helper) for 401 / error message suffix
- [ ] Related usage widgets that hard-code “re-authenticate this account” are grepped and fixed or explicitly deferred with reason in evidence
- [ ] EN i18n keys added under existing providers/usage namespace (no orphan keys)
- [ ] Additional locales: follow project convention (copy EN or use existing sync script if one exists — do not invent workflows)
- [ ] `node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts` passes
- [ ] Any new limits-focused tests pass
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` passes without new errors on touched files
- [ ] No new default-visible sidebar leaf (`docs/guides/UI.md`)
- [ ] CHANGELOG.md entry at TOP

---

## Details

### What

Subtasks:

- [ ] **Read existing code**: `ProviderLimits/index.tsx` (fetchQuota 401 path), parent props for connection authType availability, Task 0037 helper, `src/i18n/messages/en.json` (or split locale files) providers keys, other `re-authenticate this account` hits via grep, `docs/guides/UI.md`, `statusVocabulary.ts`
- [ ] **Thread authType** into ProviderLimits if not currently available from parent
- [ ] **Replace suffix logic** with helper `detail`/`cta`
- [ ] **Add i18n keys** and wire `t()` where card/limits still use English literals from helper
- [ ] **Grep residual OAuth-only strings** in dashboard providers/usage
- [ ] **a11y**: ensure badge text is not color-only meaning
- [ ] **Refactoring pass**
- [ ] **Verification**: tests + typecheck + lint; optional i18n coverage script if project has one

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.tsx` | Modificar — re-auth suffix |
| `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/**` | Ler — sibling components |
| `src/app/(dashboard)/home/ProviderQuotaWidget.tsx` | Ler — if shows similar copy |
| `src/shared/utils/connectionStatusCopy.ts` | Ler + extend keys if needed |
| `src/i18n/messages/*.json` | Modificar — EN (+ locales per convention) |
| `src/shared/constants/statusVocabulary.ts` | Ler — tone alignment |
| `docs/guides/UI.md` | Ler — IA invariant |
| `src/shared/constants/sidebarVisibility.ts` | Ler only — no new leaves |
| `tests/unit/connection-status-copy*.test.ts` | Estender |
| `CHANGELOG.md` | Modificar |

### How

1. Grep:
   ```bash
   rg -n "re-authenticate this account|refresh token" src/app src/shared
   ```
2. For each hit under Providers/usage: pass connection auth context into formatter.
3. For 401 on apikey: prefer “Invalid API key / retest or rotate key” keys.
4. For 401 on oauth: keep re-auth keys.
5. EN messages first; sync other locales using existing repo tooling if available.

### Why

ProviderLimits is a high-visibility failure surface during quota fetch. Leaving the hard-coded OAuth suffix undoes card-level work from 0038 for the same connection. i18n keeps the dashboard consistent with 42-locale product expectations without inventing new navigation.

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

- [ ] **Doc Accuracy**: Keys/paths grepped
- [ ] **Zod Validation**: N/A
- [ ] **Security**: No secrets in UI strings
- [ ] **Error Sanitization**: No raw stacks in widgets
- [ ] **No Raw SQL**: N/A
- [ ] **UI IA**: No new default-visible sidebar leaf (`docs/guides/UI.md`)
- [ ] **i18n**: EN keys present for new copy

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista]
- **Grep residual re-auth hits**: [paste + disposition]
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
