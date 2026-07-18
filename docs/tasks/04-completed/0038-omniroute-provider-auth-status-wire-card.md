# Task 0038: Wire Auth-Status Copy into ProviderCard + Connection Detail

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
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

- [x] `ProviderCard` uses helper (or parent maps helper output into badge props)
- [x] Connection error/expiry presentation on providers page is auth-mode aware where lastError/errorCode shown
- [x] Apikey + `no_refresh_token` / false expiry does not show OAuth re-auth primary copy on card
- [x] OAuth expired still shows re-auth-capable badge/CTA
- [x] `node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts` passes
- [x] Any new wire tests pass under `node --import tsx/esm --test …`
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` passes without new errors on touched files
- [x] No new entries in `PRIMARY_SIDEBAR_ITEMS`
- [x] CHANGELOG.md entry at TOP

---

## Details

### What

Subtasks:

- [x] **Read existing code**: `ProviderCard.tsx` full props/stats type, `providers/page.tsx` stats builder, connection detail components under `providers/[id]/` if they show lastError, Task 0037 helper API, `docs/guides/UI.md`
- [x] **Thread authType + errorCode** into the props the card already receives (extend stats type if needed)
- [x] **Replace hard-coded expired badge label** with helper badge/title when error taxonomy present; keep i18n `t()` wrappers if helper returns keys
- [x] **Preserve non-auth expiry** (true tokenExpiresAt past for oauth) behavior
- [x] **Verify TokenHealthBadge** still oauth-only (no code change unless bug found — then minimal fix)
- [x] **Refactoring pass**: avoid duplicating helper logic in JSX
- [x] **Verification**: typecheck + lint + tests

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

- [x] **Doc Accuracy**: Paths grepped
- [x] **Zod Validation**: N/A unless new API
- [x] **Security**: No credential display beyond existing masking
- [x] **Error Sanitization**: Do not render raw stacks
- [x] **No Raw SQL**: N/A
- [x] **UI IA**: No new default-visible sidebar leaf

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/utils/connectionStatusPresentation.ts` (created — pure adapters for card + connection row)
  - `src/app/(dashboard)/dashboard/providers/components/ProviderCard.tsx` (auth-status badge via helper)
  - `src/app/(dashboard)/dashboard/providers/page.tsx` (stats: `rawErrorCode`, `lastErrorType`, `lastError`, `latestTestStatus`)
  - `src/app/(dashboard)/dashboard/providers/[id]/components/ConnectionRow.tsx` (lastError rewrite via helper)
  - `tests/unit/connection-status-presentation-0038.test.ts` (wire-shape + source guards)
  - `CHANGELOG.md` (Unreleased → Added → Task 0038)
  - `docs/tasks/03-review/0038-…` (moved from `01-open/`)
- **Not touched (by design)**: `sidebarVisibility.ts`, ProviderLimits (0039), TokenHealthBadge (still oauth-scoped aggregate)
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts tests/unit/connection-status-presentation-0038.test.ts`
- **Resultado dos testes**: PASS — 29/29 (0037 matrix + presentation wire shapes + source guards)
  - apikey + no_refresh_token → Retest badge (no OAuth)
  - oauth + no_refresh_token → Re-auth allowed
  - ConnectionRow apikey rewrites OAuth lastError sentence
  - ConnectionRow oauth keeps raw re-auth text
- **Resultado do lint**: PASS (`eslint` on touched files, exit 0)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core`)
- **Entrada no changelog**: Unreleased → Added → ProviderCard auth-status copy wire (0038)
- **Agente executor**: Grok Build subagent (main session, operator-authorized)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: Code Quality Reviewer / independent task reviewer (`reviewers`)
- **Data da review**: 2026-07-11
- **Veredito**: APROVADO (PASS WITH NOTES)
- **Score (path to 100)**: 94/100
- **Notas**: ProviderCard + ConnectionRow consume shared presentation adapters over `formatConnectionStatusMessage`; apikey/`compatible` + `no_refresh_token` never primary-CTAs OAuth re-auth; oauth keeps re-auth. 29/29 unit tests green (reviewer re-run). Residual: expiryStatus still provider-scoped (N1), EN badge until 0039, dead neutral expiredBadge fallback. Report: `docs/reports/reviews/2026-07-11-task-0038-provider-auth-status-wire-card-review.md`. Lane: stay `03-review/` (S≥90); do not move to `02-doing/` or `04-completed/`.
- **Se REJEITADO**: N/A

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-18 (final-gate; report id `2026-07-16-…-final-review`)
- **Reviewer profile**: `reviewers`
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-16-task-0038-provider-auth-status-wire-card-final-review.md`
- **Lane outcome**: remains in `03-review` (S=100; not demoted; not auto-promoted)
- **Task reference**: Task 0038 (`omniroute-provider-auth-status-wire-card`)

#### Current Open Blockers

- none

#### Path-to-100 Summary

- ✅ **N3**: badge/tooltip via `translateConnectionStatusCopy` + `providers.connectionStatus` keys
- ✅ **N1**: `expiryStatus` scoped to connectionId set for the card’s authType connections
- ✅ **N5**: source-guard `ProviderListRow.tsx` in presentation tests
- ✅ **N2/N4**: ConnectionRow map; dead expiredBadge fallback removed

#### Path-to-100 Fix (2026-07-18 final-gate)

- **Reviewer**: `reviewers` — re-verified builder path-to-100; no further production patches
- **Tests**: presentation + copy combined green (35/35)
- **Lane**: remain `03-review/` at 100

#### Regression Guards

- `resolveProviderCardAuthStatusCopy` must remain on ProviderCard **and** ProviderListRow
- `resolveConnectionErrorDisplay` must rewrite apikey false OAuth lastError
- page stats must keep `rawErrorCode` / `lastErrorType` / `lastError` / `latestTestStatus`
- no `PRIMARY_SIDEBAR_ITEMS` / sidebar leaf changes

### Previous Reports

- `2026-07-16 final` — `100/100` — `docs/reports/reviews/2026-07-16-task-0038-provider-auth-status-wire-card-final-review.md`
  - **Resolved**: N1–N5; score 100
  - **Regression guard**: presentation suite + live CTA probe
- `2026-07-16 reaudit` — `95/100` — `docs/reports/reviews/2026-07-16-task-0038-provider-auth-status-wire-card-reaudit.md`
  - **Carried forward then fixed**: N1–N5 path-to-100 residuals
  - **Resolved since**: path-to-100 + final-gate
  - **Regression guard**: presentation suite + live CTA probe
- `2026-07-11` — `94/100` — `docs/reports/reviews/2026-07-11-task-0038-provider-auth-status-wire-card-review.md`
  - **Carried forward**: N1 provider-scoped expiry; N2 ConnectionRow map; N3 EN badge; N4 dead fallback
  - **Resolved since**: path-to-100
  - **Regression guard**: presentation suite + live CTA probe

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
