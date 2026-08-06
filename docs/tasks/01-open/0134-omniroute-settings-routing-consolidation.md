# Task 0134: Consolidate AI and resilience settings under Routing

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2
> **Type**: `feature`
> **Origin**: User request — remove separate `settings/ai` and `settings/resilience` topbars; move their content into the Routing topbar.
> **Blocks**: —
> **Depends on**: Existing IA work in Tasks 0054, 0075, and 0110; no backend dependency
> **Parallelism**: `serializable` — owns the Settings tab registry, Routing page, redirects, i18n, and chrome tests.
> **Review routing**: frontend-quality + IA review

## Objective

Present one self-evident Settings Routing topbar containing the current Routing, AI, and resilience sections, while preserving legacy deep links through redirects. The destination MUST mount exactly one Settings hub topbar and MUST NOT create stacked or duplicate navigation chrome.

## Background Context

### O que já existe:
- Settings topbars are registered centrally in `settingsHub.ts` and rendered by the settings layout.
- `settings/ai/page.tsx`, `settings/routing/page.tsx`, and `settings/resilience/page.tsx` render separate component groups.
- Existing IA tasks enforce single-topbar and destination-peer rules.
- APIs remain independent and should not be renamed by this UI task.

### O que está faltando / quebrado:
- AI and resilience are separate top-level destinations even though operators expect routing policy in one place.
- Legacy paths must be redirected without leaving phantom tab entries or stale active-state metadata.

### False-gap check:
- This extends existing Settings IA work; it does not recreate the Settings hub or alter API contracts.

## Test Requirements

- `/dashboard/settings/routing` MUST expose all existing routing, AI, and resilience sections exactly once.
- `/dashboard/settings/ai` and `/dashboard/settings/resilience` MUST redirect to Routing and preserve no competing topbar.
- Settings hub tab registry MUST contain one Routing entry and no AI/resilience peer entries.
- Sidebar/header active state MUST identify the Settings/Routing destination.
- i18n keys used by the destination MUST resolve in all supported locales or use the established fallback policy.
- Anti-phantom matrix MUST show at most one Settings hub topbar per relevant route.

## Exit Conditions (GDD/TDD)

- [ ] Routing page renders the verified union of existing AI, routing, and resilience components once.
- [ ] Legacy routes redirect and tests cover both paths.
- [ ] Tab registry/sidebar/header/i18n references are updated without deleting unrelated translations.
- [ ] Single-topbar and active-state regression tests pass.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] Targeted IA/UI tests pass.
- [ ] `.changelog/` entry is created and rebuilt.
- [ ] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [ ] **Ler código existente**: read `settingsHub.ts`, settings layout/page redirects, all three page files, imported tab components, sidebar visibility, Header descriptions, UI guide, and existing IA tests.
- [ ] Build a section-to-endpoint inventory before moving any render calls.
- [ ] Write failing chrome/redirect tests for the final matrix.
- [ ] Move render composition into Routing and remove only obsolete peer registration.
- [ ] Keep legacy routes as redirects; update active-state and i18n references.
- [ ] **Refactoring pass**: do not duplicate component instances or API calls.
- [ ] **Verificação de regressão**: targeted UI tests, typecheck, lint, and `:23456` smoke proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/constants/settingsHub.ts` | Modify tab registry. |
| `src/app/(dashboard)/dashboard/settings/layout.tsx` | Verify single topbar host. |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | Update legacy redirects. |
| `src/app/(dashboard)/dashboard/settings/routing/page.tsx` | Compose destination sections. |
| `src/app/(dashboard)/dashboard/settings/ai/page.tsx` | Read source composition/redirect target. |
| `src/app/(dashboard)/dashboard/settings/resilience/page.tsx` | Read source composition/redirect target. |
| `src/shared/constants/sidebarVisibility.ts` and `src/shared/components/Header.tsx` | Update active/description metadata. |
| `src/i18n/messages/*.json` | Update only verified live keys. |
| `docs/guides/UI.md` | Read IA contract; update only if needed. |
| `tests/unit/` IA/settings tests | Create/modify matrix. |
| `.changelog/` | Criar entry. |

### How

1. Inventory sections and preserve their API ownership.
2. Add failing anti-phantom and redirect tests.
3. Compose one Routing page and remove obsolete topbar peers.
4. Validate all deep links, active state, translations, and no duplicate mounts.

### Why

Routing, AI behavior, and resilience are one operator mental model. Consolidation reduces navigation ambiguity while retaining compatibility for saved links.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Safe beside backend/provider tasks. |
| **serializable** | Sequence with any Settings topbar edit and Tasks 0129, 0132, and 0135 when shared settings/schema/UI files are touched. |
| **Collision** | `settingsHub.ts`, Routing page, settings layout/redirects, settings store/schema, i18n, Security settings UI, and chrome tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not delete API routes or unrelated i18n keys. The user requested moving topbars, not nesting a second topbar. Follow `docs/guides/UI.md` and verify every component before moving it.

## 🛡️ Compliance Checklist

- [ ] **Doc Accuracy**: section and endpoint inventory verified.
- [ ] **Zod Validation**: no new external input; preserve existing schemas.
- [ ] **Security**: no auth/API behavior changed.
- [ ] **Error Sanitization**: existing API paths unchanged.
- [ ] **No Raw SQL**: no DB changes.
- [ ] **Archive Protocol**: preserve legacy paths; no destructive delete.

## 📋 Completion Evidence

- **Arquivos criados/modificados**: [preencher]
- **Testes que verificam o trabalho**: [preencher]
- **Resultado dos testes**: [PASS/FAIL + output real]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck/build**: [PASS/FAIL]
- **Entrada no changelog**: [preencher]
- **Agente executor**: [preencher]
- **Data de conclusão**: [YYYY-MM-DD]

## 🔍 Review Trail

- **Reviewer**: [preencher]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [preencher]
