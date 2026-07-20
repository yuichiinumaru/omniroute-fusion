# Task 0079: EPIC-19 T19-B — Providers Absorb Budget / Pricing / Quota-Share + Redirects

> **Status**: `[x]` Chrome rework **ACCEPTED_100** — in `03-review/` (single-topbar + destinations)
> **Priority**: 🔴 P0
> **Type**: `feature` + `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-19 §2.1 Costs → Providers (config/action); wave3 audit B5 (costs mix config vs storytelling); locked matrix in Epic + Task **0078** SSoT
> **Blocks**: 0082 (sidebar drop costs leaf depends on redirects working)
> **Depends on**: **0078** (hard — use frozen path builders / redirect matrix; do not invent homes)
> **Parallel class**: `parallel-safe` vs **0080** if exclusive file ownership held; coordinate docs only with 0081
> **Review routing**: independent Providers IA PR preferred; bundle with 0082 only if same release train needs costs leaf drop

---

## Objective

Re-home **mutable money/quota policy** chrome under **Providers** and make old Costs config URLs redirect without 404.

**Surfaces (locked):**

| Legacy | Canonical (from 0078 builders) |
|--------|--------------------------------|
| `/dashboard/costs/budget` | Providers budget surface |
| `/dashboard/costs/pricing` | Providers pricing surface |
| `/dashboard/costs/quota-share` | Providers quota-share surface |

**Done when:**

1. Operators reach Budget / Pricing / Quota-share **only** under Providers chrome (plus redirects).
2. Legacy `/dashboard/costs/{budget|pricing|quota-share}` **redirect** to canonical Providers destinations (server redirect preferred; same pattern as logs→observe).
3. Page **code** for those surfaces is not deleted — re-homed routes and/or thin wrappers; archive-not-delete for any retired chrome helper.
4. Unit tests encode redirect matrix rows for these three paths using 0078 SSoT exports.
5. **0** new primary sidebar leaves.

**Out of this task:** Costs **overview** storytelling → **0081** (Dashboard). Sidebar removal of `costs` leaf → **0082**.

---

## Background Context

### O que já existe:

- `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` — Overview + Budget + Pricing + Quota Share links under `/dashboard/costs/*`.
- Live pages: `costs/budget/page.tsx`, `costs/pricing/page.tsx`, `costs/quota-share/` (full client tree), `costs/page.tsx` (overview).
- Providers hub: `src/app/(dashboard)/dashboard/providers/page.tsx` + `ProvidersTopBar` — **no** budget/pricing/quota-share subnav today.
- Hideable ids already: `costs-budget`, `costs-pricing`, `costs-quota-share` in `sidebarVisibility.ts` (keep for prefs).
- Hub subnav styles: `src/shared/constants/hubSubnavStyles.ts` (`HUB_SUBNAV_*`) — reuse for Providers policy strip.
- Epic rationale: these surfaces **modify** limits/pricing/quota division — Configure intent → Providers.

### O que está faltando / quebrado:

- Config surfaces live under Costs mental model (operator rejected).
- No Providers subnav/routes for policy surfaces.
- No redirects from legacy costs config paths to Providers.
- Tests still assume `costs` primary leaf owns these destinations (`sidebar-costs-section.test.ts` etc. — leave leaf assertions to 0082; this task must not break redirectability).

### Explicitly out of scope:

- Dashboard absorption of costs overview / analytics storytelling (0081).
- Observe combo-health / route-trace (0080).
- Dropping sidebar leaves / palette purge (0082).
- Free-tiers / free-provider-rankings moves (not in Epic 19 locked matrix — leave unless already linked; do not invent).
- EPIC-13 fusions/ops chrome (0075–0077).

### Collision notes:

- **0075–0077**: do not touch fusions/ops reverse chrome.
- **0080**: disjoint if this task only owns `costs/budget|pricing|quota-share`, Providers subnav, and providers policy routes.
- **0081**: exclusive owner of CostsSubnav **Overview** href + `costs/page.tsx` overview redirect. **0079 hard rule:** only retarget Budget/Pricing/Quota-share **hrefs** (and active states) in `CostsSubnav`; leave Overview href for **0081**.
- **0076** Ops topbar: no overlap.
- **usage → costs/budget**: update `usage/page.tsx` budget branch to 0078 Providers budget builder (M-01 inventory).

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0078** hard |
| **Blocks** | **0082** (costs leaf drop); soft helps 0081 clarity |
| **File ownership (exclusive)** | Providers policy routes/subnav under `dashboard/providers/`; `costs/budget`, `costs/pricing`, `costs/quota-share` pages (redirect shells); `usage/page.tsx` budget-branch retarget; CostsSubnav **Budget/Pricing/Quota-share hrefs only**; any new `ProvidersPolicySubnav` (name may vary); tests `tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts` |
| **Do not touch** | `analytics/page.tsx` (0080/0081); `costs/page.tsx` overview content move (0081); CostsSubnav **Overview** href (0081 exclusive); `PRIMARY_SIDEBAR_ITEMS` removal (0082); `observeHub.ts` operational panels (0080); fusion/ops files |
| **Collision vs live lanes** | Safe vs 0080 if file lists disjoint. **CostsSubnav split (hard):** 0079 = three config hrefs only; 0081 = Overview only — no other CostsSubnav edits |
| **parallel-safe** | **Yes vs 0080** with ownership above. **Serializable vs 0081** on `CostsSubnav.tsx` with exclusive row ownership |

---

## Test Requirements

- DEVE existir redirect (server `redirect()` preferred) for:
  - `/dashboard/costs/budget` → 0078 Providers budget builder (`/dashboard/providers/budget`)
  - `/dashboard/costs/pricing` → 0078 Providers pricing builder
  - `/dashboard/costs/quota-share` → 0078 Providers quota-share builder
- DEVE atualizar `usage/page.tsx` budget branch (if present) to redirect to 0078 Providers budget builder — not costs/budget
- DEVE montar Providers chrome (subnav or equivalent) on the three canonical surfaces with active states for budget/pricing/quota-share
- DEVE preservar functionality of quota-share / budget / pricing UIs (no blank pages) — smoke via existing unit/component tests if present, or source-level mount matrix
- DEVE assertir via unit test reading source or SSoT matrix that the three legacy paths map to Providers destinations (import from 0078 module)
- DEVE manter hideable ids `costs-budget`, `costs-pricing`, `costs-quota-share` (archive-not-delete prefs)
- DEVE assertir **no-new-leaf**: `PRIMARY_SIDEBAR_ITEMS` does not gain `budget`/`pricing`/`quota-share` peer leaves
- DEVE em CostsSubnav: retarget **only** Budget/Pricing/Quota-share hrefs (+ active states); **leave Overview href to 0081**
- NÃO DEVE deletar quota-share component tree — re-home only
- NÃO DEVE redirect `/dashboard/costs` overview in this task (0081)
- NÃO DEVE edit CostsSubnav Overview link

---

## Exit Conditions (GDD/TDD)

- [x] Three Providers-canonical surfaces render under Providers chrome with working UI
- [x] Three legacy costs config routes redirect to those surfaces (binary: following redirect yields Providers destination path from 0078)
- [x] Unit test(s) for redirect matrix rows pass: `node --import tsx/esm --test tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts` (and/or extended 0078 matrix file)
- [x] `CostsSubnav`: Budget/Pricing/Quota-share hrefs → Providers builders; Overview left for 0081 — documented in Completion Evidence
- [x] `usage/page.tsx` budget branch retargeted to Providers budget builder (or “no usage budget redirect” grepped zero)
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Completion Evidence with paths + test output before `03-review/`

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: 0078 SSoT module + tests; Epic §2.1; `CostsSubnav.tsx`; `costs/budget|pricing|quota-share` pages; Providers page/topbar; `hubSubnavStyles.ts`; hideable ids; existing `sidebar-costs-*.test.ts` (read impact)
- [x] Implement Providers destinations (routes and/or re-exports) using **only** 0078 paths
- [x] Convert legacy cost config pages to redirect shells
- [x] Add/adjust Providers subnav for policy surfaces
- [x] TDD redirect matrix asserts
- [x] **Refactoring pass**: avoid duplicating CostsSubnav logic; share styles via `HUB_SUBNAV_*`
- [x] **Verificação de regressão**: new tests + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/01-open/0078-…` + 0078 SSoT module | Ler — frozen builders |
| `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` | Modificar — **Budget/Pricing/Quota-share hrefs only** (Overview = 0081) |
| `src/app/(dashboard)/dashboard/costs/budget/page.tsx` | Modificar → redirect shell |
| `src/app/(dashboard)/dashboard/costs/pricing/page.tsx` | Modificar → redirect shell |
| `src/app/(dashboard)/dashboard/costs/quota-share/**` | Ler; re-home or keep as implementation imported by Providers route |
| `src/app/(dashboard)/dashboard/usage/page.tsx` | Modificar — budget branch → Providers budget builder |
| `src/app/(dashboard)/dashboard/providers/**` | Modificar/criar policy routes + subnav (nested `/dashboard/providers/{budget,pricing,quota-share}`) |
| `src/shared/constants/hubSubnavStyles.ts` | Ler — shared chrome classes |
| `src/shared/constants/sidebarVisibility.ts` | Ler — hideable ids only |
| `tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts` | Criar |
| `tests/unit/sidebar-costs-*.test.ts` | Ler — do not “fix” leaf drop here |

### How

1. Confirm 0078 builders for the three destinations.
2. Create Providers routes that render existing page clients (prefer import/move over copy-paste).
3. Replace legacy `costs/{budget,pricing,quota-share}/page.tsx` with `redirect(builder())`.
4. Mount Providers policy subnav on canonical pages.
5. CostsSubnav: retarget three config links only; leave Overview.
6. Update usage budget branch if grepped.
7. Tests: static source contains redirect targets; matrix import matches builders.
8. Leave `/dashboard/costs` overview alone for 0081.

### Why

Config-as-Costs confuses operators. Providers is the Configure hub for money/quota policy. Redirects protect bookmarks.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent paths outside 0078 SSoT.  
> DO NOT drop the `costs` primary leaf (0082).  
> DO NOT delete quota-share implementation files.  
> DO NOT absorb costs overview or analytics tabs here.  
> DO NOT retarget CostsSubnav Overview (0081 exclusive).  
> DO NOT add primary leaves for budget/pricing/tools labs.

> [!IMPORTANT]
> Read EVERY file in Where before writing.  
> If 0078 is incomplete, **stop** and return blocker — do not freestyle destinations.  
> File-lock `analytics/page.tsx` and Observe modules for 0080/0081.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Destinations match 0078 + Epic
- [x] **Zod Validation**: N/A for pure redirects
- [x] **Security**: No secrets; local-only rules unchanged
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Re-home + redirect; quota-share client tree kept under `costs/quota-share/` and imported by Providers route

---

## 📋 Completion Evidence (preenchido pelo agente executor)

### Destination re-home (kept from first pass)

- **Arquivos (first pass, still valid)**:
  - Providers nested routes: `providers/budget|pricing|quota-share/page.tsx`
  - Legacy costs config pages → server `redirect(buildProviders*Path())`
  - `CostsSubnav` Budget/Pricing/Quota-share hrefs → Providers builders; Overview owned by 0081
  - `usage?tab=budget` + `settings/pricing` → Providers builders
  - Redirect matrix unit: `tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts`
- **Redirect matrix rows**:
  | from | to (0078 builder) |
  |------|-------------------|
  | `/dashboard/costs/budget` | `/dashboard/providers/budget` |
  | `/dashboard/costs/pricing` | `/dashboard/providers/pricing` |
  | `/dashboard/costs/quota-share` | `/dashboard/providers/quota-share` |
  | `/dashboard/usage?tab=budget` | `/dashboard/providers/budget` |
  | `/dashboard/settings/pricing` | `/dashboard/providers/pricing` |
  | `/dashboard/costs` overview | **not** redirected (0081) |

### Chrome unify rework (2026-07-19 — operator dual-strip fix)

**Before:** Policy pages mounted `ProvidersTopBar` (with `currentPath="/dashboard/providers"` — wrong peer active) **plus** `ProvidersPolicySubnav` (second strip: Overview | Budget | Pricing | Quota Share) = multi-topbar violation.

**After:** Exactly **one** hub strip — `ProvidersTopBar` peers:

| Peer | Path (0078) | Active via `currentPath` |
|------|-------------|--------------------------|
| Providers | `/dashboard/providers` | exact |
| Stats | `/dashboard/provider-stats` | exact |
| Services | `/dashboard/providers/services` | exact |
| Quota | `/dashboard/quota` | exact |
| Rankings | `/dashboard/free-provider-rankings` | exact |
| Free Tiers | `/dashboard/free-tiers` | exact |
| Runtime | `/dashboard/runtime` | exact |
| **Budget** | `PROVIDERS_BUDGET_PATH` | exact |
| **Pricing** | `PROVIDERS_PRICING_PATH` | exact |
| **Quota Sharing** | `PROVIDERS_QUOTA_SHARE_PATH` | exact |

- **Arquivos rework**:
  - **Modified** `providers/components/ProvidersTopBar.tsx` — expand `PROVIDERS_TOPBAR_PATHS` + `TOPBAR_LINKS` with Budget/Pricing/Quota Sharing (0078 path constants)
  - **Modified** `providers/budget|pricing|quota-share/page.tsx` — single `ProvidersTopBar` with correct peer `currentPath`; **stop-mount** PolicySubnav
  - **Modified** `providers/components/ProvidersPolicySubnav.tsx` — `@deprecated` archive-not-delete (stop-mount; file retained)
  - **Modified** `tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts` — anti-phantom single topbar + peer SSoT
  - **Modified** `tests/unit/provider-connections-ui-regression.test.ts` — peer matrix includes policy routes; dual-strip fail
  - **CHANGELOG** Unreleased — chrome unify note
- **Sidebar Providers active**: Nested `/dashboard/providers/{budget,pricing,quota-share}` already light **Providers** via `matchesSidebarHref` prefix on `/dashboard/providers` (`sidebarRouteMatch.ts`). Full peer-sibling matchers (quota/stats/runtime/…) co-owned with **0084** — documented, not changed here.
- **Testes**:
  ```
  node --import tsx/esm --test \
    tests/unit/provider-connections-ui-regression.test.ts \
    tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts
  ```
  → **18/18 pass** (7 peer-regression + 11 0079 suite)
- **typecheck**: `npm run typecheck:core` — **exit 0**
- **No-new-leaf**: PRIMARY_SIDEBAR unchanged; hideable ids retained
- **Agente executor**: gt-ts-engineer / builders parent
- **Data**: 2026-07-19
- **Status note**: Leave in `02-doing` (operator instruction). No git. No :21000.
---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` / independent re-reviewers — **chrome re-review 2026-07-20**
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` / APROVADO
- **Score (path to 100)**: `100/100` (no patches required)
- **Notas**: Re-verified operator single-topbar contract against live source. Exactly one `ProvidersTopBar` on Providers list + Budget + Pricing + Quota-share + all peer siblings; Budget/Pricing/Quota Sharing peers on same strip; `ProvidersPolicySubnav` + `CostsSubnav` zero live imports under `src/`; redirects + 0078 SSoT intact. Anti-phantom unit suite green in 88-test chrome batch.
- **Se REJEITADO**: N/A
- **Lane outcome**: **stay** `03-review/` (ACCEPT 100)
- **Full report**: `docs/reports/reviews/2026-07-20-task-0079-providers-chrome-rereview.md`
- **Prior chrome rework report**: `docs/reports/reviews/2026-07-19-task-0079-chrome-rework-review.md`

## Review Ledger

### Latest Review
- **Date**: 2026-07-20
- **Reviewer profile**: `gt-frontend-quality-reviewer` / independent re-reviewers (chrome re-review)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Blockers**: none
- **Patches this review**: none (S≥90; no path-to-100 needed)
- **Full report**: `docs/reports/reviews/2026-07-20-task-0079-providers-chrome-rereview.md`
- **Lane outcome**: **stay** `docs/tasks/03-review/`
- **Dual-topbar evidence**: zero live `ProvidersPolicySubnav` / `CostsSubnav` imports; policy pages mount exactly one `ProvidersTopBar` with Budget/Pricing/Quota Sharing as peers

### Previous Reports
- `2026-07-20` — independent chrome re-review — `100/100` — `docs/reports/reviews/2026-07-20-task-0079-providers-chrome-rereview.md`
- `2026-07-19` — chrome rework — `100/100` — `docs/reports/reviews/2026-07-19-task-0079-chrome-rework-review.md`
  - **Resolved**: dual strip TopBar + PolicySubnav (operator reject)
- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0079-epic19-providers-budget-pricing-quota-independent-rereview.md`
  - **Superseded on chrome**: accepted pre-rework dual strip; destination re-home still valid
- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0079-epic19-providers-budget-pricing-quota-frontend-quality-review.md`
  - **Superseded on chrome**: scored PolicySubnav as strong hierarchy (wrong under Hard Rule #22)
  - **Carried forward**: live deploy lag residual (ops only)

---

## REWORK ADDENDUM (2026-07-19 — operator correction)

> **Why returned to `01-open/`:** Destination re-home (Budget/Pricing/Quota-share → Providers paths + redirects) is **kept**. Chrome was wrong: **ProvidersTopBar + PolicySubnav (Costs-style second strip)** = multi-topbar. Operator did **not** want inherited Costs chrome under Providers.
>
> **Root cause (process):** Task under-specified single-topbar design system; architect focused on path matrix; builder/review accepted dual chrome. Operator communication + task writing both insufficient on chrome. See `AGENTS.md` → Dashboard IA / Design System (Hard Rule #22 in CLAUDE.md).
>
> **Do not undo:** nested `/dashboard/providers/{budget,pricing,quota-share}` routes, server redirects from `/dashboard/costs/*`, usage→budget retarget, no-new-leaf.

### Additional exit conditions (chrome unify — mandatory)

- [x] **Exactly one** hub topbar on Providers list + Budget + Pricing + Quota-share pages (mount matrix unit test; **fail** if `ProvidersPolicySubnav` + `ProvidersTopBar` both render as separate strips)
- [x] **Budget, Pricing, Quota Sharing** are **peer items on the same topbar** as Providers / Stats / Services / Quota / Rankings / Free Tiers / Runtime (order per operator)
- [x] **No** `CostsSubnav` on Providers policy routes
- [x] **No** second “Overview | Budget | Pricing | Quota Sharing” strip under ProvidersTopBar
- [x] Sidebar **Providers** active (green) on budget/pricing/quota-share routes
- [x] `npm run typecheck:core` + targeted unit tests green

### Additional subtasks

- [x] **Ler** live `ProvidersTopBar`, `ProvidersPolicySubnav`, operator screenshots / AGENTS.md IA section
- [x] Merge policy peers into **one** topbar SSoT; delete or stop mounting PolicySubnav as second bar
- [x] Update active-state matchers for nested providers policy paths
- [x] Anti-phantom tests: max 1 hub topbar component tree per route
- [x] Completion Evidence: before/after chrome description + test names

