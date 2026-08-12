# Task 0134: Consolidate AI and resilience settings under Routing

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
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

- [x] Routing page renders the verified union of existing AI, routing, and resilience components once.
- [x] Legacy routes redirect and tests cover both paths.
- [x] Tab registry/sidebar/header/i18n references are updated without deleting unrelated translations.
- [x] Single-topbar and active-state regression tests pass.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] Targeted IA/UI tests pass.
- [ ] `.changelog/` entry is created and rebuilt (deferred to parent per instruction).
- [x] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [x] **Ler código existente**: read `settingsHub.ts`, settings layout/page redirects, all three page files, imported tab components, sidebar visibility, Header descriptions, UI guide, and existing IA tests.
- [x] Build a section-to-endpoint inventory before moving any render calls.
- [x] Write failing chrome/redirect tests for the final matrix.
- [x] Move render composition into Routing and remove only obsolete peer registration.
- [x] Keep legacy routes as redirects; update active-state and i18n references.
- [x] **Refactoring pass**: do not duplicate component instances or API calls.
- [x] **Verificação de regressão**: targeted UI tests, typecheck, lint, and `:23456` smoke proof.

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

- [x] **Doc Accuracy**: section and endpoint inventory verified.
- [x] **Zod Validation**: no new external input; preserve existing schemas.
- [x] **Security**: no auth/API behavior changed.
- [x] **Error Sanitization**: existing API paths unchanged.
- [x] **No Raw SQL**: no DB changes.
- [x] **Archive Protocol**: preserve legacy paths; no destructive delete.

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/constants/settingsHub.ts` (removed obsolete ai/resilience tabs; updated tab count to 8; mapped legacy path resolution)
  - `src/app/(dashboard)/dashboard/settings/routing/page.tsx` (composed union of Routing, AI, and Resilience components)
  - `src/app/(dashboard)/dashboard/settings/ai/page.tsx` (redirect shell to `/dashboard/settings/routing`)
  - `src/app/(dashboard)/dashboard/settings/resilience/page.tsx` (redirect shell to `/dashboard/settings/routing`)
  - `src/app/(dashboard)/dashboard/settings/page.tsx` (legacy `?tab=ai` and `?tab=resilience` redirect to `/dashboard/settings/routing`)
  - `src/shared/utils/sidebarRouteMatch.ts` (added `/dashboard/settings` alias to light `settings-general` in sidebar)
  - `src/shared/components/Header.tsx` (added deep header title metadata for `/dashboard/settings/routing`)
  - `tests/unit/ui/settings-routing-consolidation-0134.test.ts` (new anti-phantom, single-topbar, and redirect unit tests)
  - `tests/unit/ui/settings-hub-tabnav-0054.test.ts` (updated 8-tab inventory test)
  - `tests/unit/settings-ui-layout-static.test.ts` (updated component location assertions)
  - `tests/integration/integration-wiring.test.ts` (updated page integration assertions)
  - `tests/unit/dashboard-shell-tabs.test.ts` (updated redirect route assertions)
- **Testes que verificam o trabalho**: `node --import tsx/esm --test tests/unit/ui/settings-routing-consolidation-0134.test.ts tests/unit/ui/settings-hub-tabnav-0054.test.ts tests/unit/settings-ui-layout-static.test.ts tests/integration/integration-wiring.test.ts tests/unit/dashboard-shell-tabs.test.ts tests/unit/sidebar-route-match.test.ts` (suite completa: `node --import tsx/esm --test tests/unit/ui/*.test.ts tests/unit/settings-*.test.ts`)
- **Resultado dos testes**: PASS (112/112 tests passed across 6 targeted suites; 726/726 tests passed across 138 total UI/settings test suites)
- **Resultado do lint**: PASS (`npm run typecheck:core` clean, `npx eslint` clean on all Task 0134 modified surfaces)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core` clean, 0 errors)
- **Entrada no changelog**: `.changelog/20260806-200240-0134-consolidate-settings-routing-ai-resilience-reviewer.md`; rebuild concluído com 49 entradas.
```markdown
### Changelog Draft
- **task**: 0134
- **agent**: builder-engineer
- **project**: omniroute
- **title**: consolidate-settings-routing-ai-resilience
- **description**: Consolidate AI and resilience settings into a single Settings Routing topbar and redirect legacy routes.
- **summary**: Consolidated AI and resilience sections into the Routing page in settings, removed obsolete peer tab registrations from settingsHub, set up redirects from /dashboard/settings/ai and /dashboard/settings/resilience to /dashboard/settings/routing, updated sidebar/header active state, and added anti-phantom single-topbar unit tests.
- **verification**: `node --import tsx/esm --test tests/unit/ui/settings-routing-consolidation-0134.test.ts`
```
- **Agente executor**: builder-engineer (polished by polish worker)
- **Data de conclusão**: 2026-08-06

## 🔍 Review Trail

- **Reviewer**: parent reviewer with Gortex-assisted review
- **Data da review**: 2026-08-06
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: Fresh 112/112 targeted and 726/726 UI/settings tests, typecheck, lint, and :23456 redirects passed; single-topbar/redirect/i18n matrix verified.
