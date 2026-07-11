# Task 0038: Wire Auth-Status Copy into ProviderCard + Connection Detail

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0007 — Provider Connection Auth-Status UX (S2)
> **Action type**: UX_VIS
> **Blocks**: none (0039 can proceed in parallel after 0037)
> **Depends on**: Task 0037

---

## Objective

Consume `formatConnectionStatusMessage` (Task 0037) on Providers list/detail surfaces so:

1. `ProviderCard` expired badge / error presentation is **auth-mode aware** (oauth token death vs false health expiry vs apikey failure)
2. Connection-level detail on the Providers page (stats aggregation in `providers/page.tsx` and any connection row error display) stops hard-coding OAuth “re-authenticate” as the only story
3. Operators looking at AI Studio / Qoder PAT cards no longer get OAuth primary CTA from the card chrome

Stay entirely inside existing Providers hub UI. **No new sidebar leaf** (`docs/guides/UI.md` invariant #1).

## Background Context

### What already exists

- `ProviderCard.tsx` — `expiryStatus === "expired"` → `t("expiredBadge")` (~L344–347) with no authType distinction
- `providers/page.tsx` — builds `expiryStatus` from connection expiry flags (~L371–410), surfaces `lastError` derived codes (~L130–153)
- Helper from Task 0037 + unit matrix
- Live pain: apikey rows still show OAuth lastError until heal; UI must override presentation

### What is missing

- Card does not receive/use authType for badge label
- No tooltip/detail distinguishing credential modes
- Wire of pure helper into React tree

### Out of scope

- ProviderLimits / quota widgets → Task 0039
- i18n full locale pass → Task 0039 (EN keys may land here if required for card)
- Backend heal
- TokenHealthBadge aggregate redesign (only verify it remains oauth-scoped)

### IA invariant

**No new default-visible sidebar leaf** — do not edit `PRIMARY_SIDEBAR_ITEMS` / add nav destinations. Work is badge/copy only under Providers.

---

## Test Requirements

- MUST keep Task 0037 unit suite green
- MUST add component or page-level unit/shallow tests **if** project pattern supports them for ProviderCard; otherwise extend pure helper tests with the exact props shapes ProviderCard passes (document which)
- MUST assert: for a stats/connection object with `authType: "apikey"` and expired/`no_refresh_token`, rendered badge text path does not call OAuth re-auth as primary label (snapshot or string assert)
- MUST NOT modify `sidebarVisibility.ts`

---

## Exit Conditions (GDD/TDD)

- [ ] `ProviderCard` uses helper (or parent maps helper output into badge props)
- [ ] Connection error/expiry presentation on providers page is auth-mode aware where lastError/errorCode shown
- [ ] Apikey + `no_refresh_token` / false expiry does not show OAuth re-auth primary copy on card
- [ ] OAuth expired still shows re-auth-capable badge/CTA
- [ ] `node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts` passes
- [ ] Any new wire tests pass under `node --import tsx/esm --test …`
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` passes without new errors on touched files
- [ ] No new entries in `PRIMARY_SIDEBAR_ITEMS`
- [ ] CHANGELOG.md entry at TOP

---

## Details

### What

Subtasks:

- [ ] **Read existing code**: `ProviderCard.tsx` full props/stats type, `providers/page.tsx` stats builder, connection detail components under `providers/[id]/` if they show lastError, Task 0037 helper API, `docs/guides/UI.md`
- [ ] **Thread authType + errorCode** into the props the card already receives (extend stats type if needed)
- [ ] **Replace hard-coded expired badge label** with helper badge/title when error taxonomy present; keep i18n `t()` wrappers if helper returns keys
- [ ] **Preserve non-auth expiry** (true tokenExpiresAt past for oauth) behavior
- [ ] **Verify TokenHealthBadge** still oauth-only (no code change unless bug found — then minimal fix)
- [ ] **Refactoring pass**: avoid duplicating helper logic in JSX
- [ ] **Verification**: typecheck + lint + tests

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/(dashboard)/dashboard/providers/components/ProviderCard.tsx` | Modificar — badge/copy wire |
| `src/app/(dashboard)/dashboard/providers/page.tsx` | Modificar — pass authType/error fields into stats |
| `src/app/(dashboard)/dashboard/providers/[id]/**` | Ler + modificar se connection detail shows OAuth-only copy |
| `src/shared/utils/connectionStatusCopy.ts` (0037) | Ler — consume |
| `src/shared/components/TokenHealthBadge.tsx` | Ler — confirm oauth aggregate only |
| `docs/guides/UI.md` | Ler — IA invariant |
| `src/shared/constants/sidebarVisibility.ts` | Ler only — **do not add leaves** |
| `tests/unit/connection-status-copy*.test.ts` | Regressão / extensão de shapes |
| `CHANGELOG.md` | Modificar |

### How

1. Extend the stats object built in `page.tsx` with `authType`, `errorCode`, `lastErrorType` if missing.
2. In `ProviderCard`, call helper when rendering expired/error chips.
3. Prefer tooltip `title`/`detail` from helper for hover text.
4. Keep design tokens / Badge variants; no rainbow accents (UI.md).

### Why

Card chrome is the first place operators judge credential health. Wiring the pure helper is what converts Epic 0007 from library code into product trust.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT add sidebar items or new top-level routes.
> DO NOT remove oauth re-auth messaging for real oauth failures.
> DO NOT rewrite entire Providers page layout.

> [!IMPORTANT]
> `docs/guides/UI.md` — **no new default-visible sidebar leaf**.
> Read EVERY file in "Where" before writing.
> Prefer helper over inline string conditionals.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Paths grepped
- [ ] **Zod Validation**: N/A unless new API
- [ ] **Security**: No credential display beyond existing masking
- [ ] **Error Sanitization**: Do not render raw stacks
- [ ] **No Raw SQL**: N/A
- [ ] **UI IA**: No new default-visible sidebar leaf

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista]
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
