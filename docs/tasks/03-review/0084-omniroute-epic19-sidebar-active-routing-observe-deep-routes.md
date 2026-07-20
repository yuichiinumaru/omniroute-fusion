# Task 0084: EPIC-19 T19-G — Sidebar Active State for Routing & Observe Deep Routes

> **Status**: `[x]` ACCEPTED_SOURCE_100 (independent re-review 2026-07-20 composite 94; live `:22000` redeploy blocker) — in `03-review/`  
> **Priority**: 🔴 P0  
> **Type**: `remediation`  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: EPIC-19 operator residual; screenshots 2026-07-19; `docs/reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md` (active-state path mismatch)  
> **Blocks**: self-evident path rename (0085 benefits from correct active maps)  
> **Depends on**: none hard (can parallel 0079/0081 rework if matchers are shared carefully)  
> **Parallel class**: `parallel-safe` vs Providers/Dashboard topbar rework if only sidebar matchers touched  

---

## REWORK / PROCESS NOTE

Operator confirmed Routing and Observe IA are “almost perfect” except **sidebar active (green)**:

- Fusions, compression settings, compression studio do **not** light **Routing** (Combos/Live do).  
- Health does **not** light **Observe**.  

This is the same EPIC-19 IA wave — not a new epic. Design system law: organization must be auto-evident (sidebar shows where you are). See `AGENTS.md` → Dashboard IA.

---

## Objective

Make primary sidebar **Routing** and **Observe** correctly `aria-current` / active styles for all deep destinations that belong to those hubs.

### Done when

1. Visiting `/dashboard/fusions`, `/dashboard/fusions/*`, compression studio/settings/context routes that are Routing-pillar light **Routing** (`combos` leaf).  
2. Visiting `/dashboard/health` and Observe combo-health / route-trace destinations light **Observe** (`activity` leaf).  
3. Unit tests encode the active-match matrix (anti-phantom: wrong leaf not active).  
4. No new sidebar leaves.

---

## Background

### Exists

- `PRIMARY_SIDEBAR_ITEMS`: combos → `/dashboard/combos`, activity → `/dashboard/activity`.  
- Hub children live as **sibling** paths (`/dashboard/fusions`, `/dashboard/health`, `/dashboard/compression/*`) — prefix match on hub href fails.  
- Inventory report documents this as path-mismatch contribution.

### Missing

- Explicit active-id matcher map for deep routes → primary leaf id.

---

## Test Requirements

- DEVE existir SSoT function or table: path → primary sidebar id  
- DEVE assertir fusions + compression studio → `combos`  
- DEVE assertir health + observe panels → `activity`  
- DEVE **não** marcar `providers`/`home` active on those paths  
- DEVE passar `npm run typecheck:core` e testes unitários do matcher  

---

## Exit Conditions

- [x] Matcher SSoT + unit tests green  
- [x] Manual or component assertion: fusions lights Routing; health lights Observe  
- [x] No new primary leaves  
- [x] Completion Evidence lists files + test names  
- [x] `npm run typecheck:core` PASS  
- [x] Targeted unit tests PASS  

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: sidebar active logic (layout/Sidebar), `sidebarVisibility.ts`, RoutingHubSubnav, Observe hub, inventory report  
- [x] Implement path→leaf matcher (prefix table or route groups)  
- [x] Wire into sidebar active computation  
- [x] Unit tests matrix  
- [x] Completion Evidence  

### Where

| Path | Action |
|------|--------|
| Sidebar layout / active match module | Modificar |
| `tests/unit/ui/*sidebar*active*` or new | Criar/modificar |
| `docs/guides/UI.md` brief note if needed | Opcional |

### How

1. Inventory all Routing-pillar and Observe-pillar routes.  
2. Encode matcher; prefer explicit table over fragile string hacks.  
3. Tests first (TDD).  
4. Verify live on :22000 only if operator asks (not :21000).  

### Why

Without active state, the 7-leaf IA is not auto-evident — operator cannot trust the green rail.

---

## Anti-Hallucination

- Do not invent new leaves.  
- Do not rename URLs in this task (that is **0085**).  
- Do not re-open multi-topbar work (0079/0081 own that).  

---

## Completion Evidence

- **Arquivos criados/modificados**:
  - **Modified**: `src/shared/utils/sidebarRouteMatch.ts` — SSoT `SIDEBAR_ACTIVE_HUB_ALIASES` + `resolveSidebarHubAlias()`; `getActiveSidebarHref` resolves hub children before prefix match
  - **Modified**: `tests/unit/sidebar-route-match.test.ts` — Routing/Observe active matrix + anti-phantom
  - **Modified**: `tests/unit/ui/observe-hub-sidebar.test.ts` — single Observe chrome strip (0080 residual)
  - **Unchanged (already wired)**: `src/shared/components/Sidebar.tsx` uses `getActiveSidebarHref(pathname, allVisibleItems)` — no new leaves in `PRIMARY_SIDEBAR_ITEMS`
- **Alias table (pathPrefix → primaryLeafId / primaryHref)**:
  - `/dashboard/fusions` → `combos` / `/dashboard/combos`
  - `/dashboard/compression` → `combos` / `/dashboard/combos`
  - `/dashboard/context` → `combos` / `/dashboard/combos`
  - `/dashboard/health` → `activity` / `/dashboard/activity`
  - Combos + live + activity (+ `?panel=`/`?source=`) already prefix-match primary hrefs
- **Testes**:
  - `node --import tsx/esm --test tests/unit/sidebar-route-match.test.ts` → **11/11 pass**
  - `node --import tsx/esm --test tests/unit/ui/observe-hub-sidebar.test.ts` → **all pass** (incl. single chrome)
  - Key cases: fusions/compression/context → combos; health/activity → activity; anti-phantom providers/home; hidden leaf not lit
- **typecheck**: `npm run typecheck:core` — clean (exit 0)
- **No new primary leaves**: PRIMARY still 7; matcher only remaps sibling hub paths
- **Agente**: gt-ts-engineer (parent builders)
- **Data**: 2026-07-19

---

## Changelog draft (parent publishes)

`fix(ui): sidebar active state for Routing/Observe deep routes (EPIC-19 T19-G)`

---

## 🔍 Review Trail

### Independent re-review — 2026-07-20
- **Reviewer**: independent FULL RE-REVIEWER (`reviewers`; builders untrusted)
- **Veredito**: `ACCEPTED_SOURCE_100` + LIVE_DEPLOY_BLOCKER
- **Score**: `94/100` composite (local 100 / source runtime 100 / live `:22000` 55)
- **Notas**: SSoT + unit matrix + PRIMARY proof green. Live `:22000` still fails health/fusions/compression active state (image missing alias symbols). Combos/live + activity panels PASS live. Redeploy test only.
- **Full report**: `docs/reports/reviews/2026-07-20-task-0084-epic19-sidebar-active-chrome-rereview.md`
- **Lane outcome**: stay `03-review/`

### Prior builder review — 2026-07-19
- **Reviewer**: `builders` / gt-frontend-quality-reviewer
- **Data da review**: 2026-07-19
- **Veredito**: `ACCEPTED_100` / APROVADO
- **Score**: `100/100`
- **Notas**: SSoT `SIDEBAR_ACTIVE_HUB_ALIASES` lights Routing for fusions/compression/context and Observe for health; unit matrix + anti-phantom green; no new leaves; Sidebar `aria-current` wired. Shared residual with 0080.
- **Full report**: `docs/reports/reviews/2026-07-19-task-0084-epic19-sidebar-active-routing-observe-frontend-quality-review.md`
- **Lane outcome**: moved to `docs/tasks/03-review/`

## Review Ledger

### Latest Review
- **Date**: 2026-07-20
- **Reviewer profile**: `reviewers` / independent FULL RE-REVIEWER
- **Score**: `94/100` (source 100; live deploy lag)
- **Verdict**: `ACCEPTED_SOURCE_100` + LIVE_DEPLOY_BLOCKER
- **Full report**: `docs/reports/reviews/2026-07-20-task-0084-epic19-sidebar-active-chrome-rereview.md`
- **Lane outcome**: `docs/tasks/03-review/0084-omniroute-epic19-sidebar-active-routing-observe-deep-routes.md`

### Previous
- **Date**: 2026-07-19
- **Reviewer profile**: `builders` / gt-frontend-quality-reviewer
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0084-epic19-sidebar-active-routing-observe-frontend-quality-review.md`
