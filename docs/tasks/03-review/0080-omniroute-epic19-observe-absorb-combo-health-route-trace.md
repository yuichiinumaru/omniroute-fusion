# Task 0080: EPIC-19 T19-C — Observe Absorbs Combo-Health + Route-Trace (+ `id=`) + Health Discoverability

> **Status**: `[x]` ACCEPTED_SOURCE_100 (independent re-review 2026-07-20 composite 94; live `:22000` redeploy blocker) — in `03-review/`
> **Priority**: 🔴 P0
> **Type**: `feature` + `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-19 §2.2 Analytics → Observe (operational); wave3 audit B6 adjacency (combo-health/route-trace vs Observe); Task **0078** SSoT
> **Blocks**: **0081 hard** (analytics page ownership — 0081 must not start until operational tabs redirected); hard-helps **0082** (analytics leaf drop)
> **Depends on**: **0078** (hard)
> **Parallel class**: `parallel-safe` vs **0079** if file ownership held; **serializable hard before 0081** on `analytics/page.tsx`
> **Review routing**: independent Observe IA PR; if both 0080+0081 touch analytics shell, **bundle review** or complete 0080 first

---

## Objective

Move **operational debug** surfaces (Combo Health + Route Trace) under **Observe** chrome and redirect analytics tab URLs. Ensure **server health** remains discoverable on the Observe hub (partial Task 0061 — complete discoverability contract).

**Surfaces (locked):**

| Legacy | Canonical (0078) |
|--------|------------------|
| `/dashboard/analytics?tab=combo-health` | Observe combo-health surface |
| `/dashboard/analytics?tab=route-trace` (+ `route-explain`) | Observe route-trace surface |
| `?id=` on route-trace | **Must preserve** deep link to request id |
| `/dashboard/health` + logs stream | Observe pillar — ensure hub discoverability |

**Done when:**

1. Combo Health + Route Trace reachable under Observe chrome (plus redirects).
2. Analytics query redirects (or hub filter) land on Observe destinations for those two tabs only — **do not** steal overview/evals/search/utilization/compression (0081).
3. `id=` deep link for route-trace works end-to-end on the Observe destination.
4. Health is discoverable from Observe hub UI (link/card/filter — not necessarily a new primary leaf).
5. Unit tests cover Observe operational redirect rows + `id=` preservation + no-new-leaf.

---

## Background Context

### O que já existe:

- Observe hub: `src/shared/constants/observeHub.ts` + `dashboard/activity/` (`ObserveHubClient`, sources via `?source=`).
- Analytics tabs include operational ones: `ComboHealthTab.tsx`, `RouteExplainabilityTab.tsx` mounted from `analytics/page.tsx`; nested redirects e.g. `analytics/combo-health/page.tsx` → `?tab=combo-health`.
- Route-trace alias: `route-explain` → `route-trace`; `initialRequestId` from `searchParams.get("id")`.
- Health page: `/dashboard/health` (hideable id `health`; not primary).
- Observe redirect gold: `OBSERVE_REDIRECT_MATRIX` + `tests/unit/ui/observe-hub-sidebar.test.ts`.
- Logs already redirect into Observe (`logs/*`, `audit/*`).

### O que está faltando / quebrado:

- Combo health + route path still live under Analytics mental model.
- Observe hub sources do not include combo-health / route-trace panels.
- Health discoverability only partial (0061) — Epic requires Observe discoverability check.
- No redirect SSoT for analytics operational tabs → Observe.

### Explicitly out of scope:

- Moving storytelling analytics tabs to Dashboard (0081).
- Providers costs config (0079).
- Sidebar leaf removal (0082).
- Rewriting ComboHealth/RouteExplainability **business logic** — chrome re-home only.
- Dual-nav Analytics leaf retention after 0082.

### Collision notes:

- **0081 hard-depends this task**: finish Observe split first. Preferred: Observe mounts components; analytics page **redirects** when `tab` is combo-health/route-trace. Completion Evidence **must** record: “operational tabs redirected; storytelling tabs still on analytics for 0081.”
- **0079**: no shared files if ownership held.
- **0076**: if Observe hub gains reverse chrome, do not re-litigate Ops reverse chrome decision.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0078** hard |
| **Blocks** | **0081 hard** (analytics ownership); helps **0082** |
| **File ownership (exclusive)** | Observe hub client (`activity/*`); mount of ComboHealth/RouteTrace under Observe; analytics redirect branch for **only** combo-health/route-trace; tests `tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts`; observeHub extensions for **`panel=`** operational destinations only if implementing 0078 freeze (do **not** pollute log `source` enum) |
| **Do not touch** | Providers costs routes (0079); Dashboard home storytelling shell (0081 exclusive after hard handoff); `PRIMARY_SIDEBAR_ITEMS` removal (0082); fusions/ops (0075–0077) except read-only |
| **Collision vs live lanes** | **analytics/page.tsx** shared with 0081 — **hard serial**: this task first |
| **parallel-safe** | **Yes vs 0079**. **Not parallel-safe vs 0081** on analytics page |

---

## Test Requirements

- DEVE montar Combo Health + Route Trace sob Observe chrome (panel/tab/source per 0078)
- DEVE redirecionar ou reescrever:
  - `tab=combo-health` → Observe combo-health builder
  - `tab=route-trace` e `tab=route-explain` → Observe route-trace builder
- DEVE preservar `id=<requestId>` no destino route-trace (assert builder + page read path)
- DEVE expor health discoverability no Observe hub (assert link/href to `/dashboard/health` or 0078 health path in hub client/constants)
- DEVE unit-testar matrix rows from 0078 for these operational redirects
- DEVE manter hideable analytics sub-ids (`analytics-combo-health`, etc.) if present — prefs archive-not-delete
- DEVE assertir no-new-leaf: no primary `combo-health` / `route-trace` / `health` leaf added
- NÃO DEVE redirect overview/evals/search/utilization/compression away from analytics **until** 0081 (unless 0078 defines interim dual-serve — default: leave those tabs on analytics page for 0081)

---

## Exit Conditions (GDD/TDD)

- [x] Observe hub surfaces combo-health + route-trace with working components
- [x] Legacy analytics operational tab URLs reach Observe destinations (including `id=`)
- [x] Health discoverability assertion green on Observe hub
- [x] `node --import tsx/esm --test tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts` (or recorded path) passa com 0 falhas
- [x] Related observe hub tests still pass
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Completion Evidence includes disposition of `analytics/page.tsx` dual-tab ownership handoff to 0081: **“operational tabs redirected; storytelling tabs still on analytics for 0081”**
- [x] Completion Evidence preenchido antes de `03-review/`

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: 0078 SSoT; Epic §2.2; `observeHub.ts`; activity Observe clients; `analytics/page.tsx` + ComboHealth + RouteExplainability; nested analytics combo-health/page; health page; observe hub tests; PageTabBar id delete behavior
- [x] Extend Observe SSoT for operational panels **only via 0078 contracts** (or implement builders already frozen)
- [x] Mount components under Observe; wire deep link `id=`
- [x] Redirect analytics operational tabs → Observe
- [x] Health discoverability affordance on Observe hub
- [x] TDD matrix + id preservation
- [x] **Refactoring pass**: reuse tabs components; no copy of large business logic
- [x] **Verificação de regressão**: new + observe tests + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| 0078 SSoT module | Ler — builders |
| `src/shared/constants/observeHub.ts` | Modificar — operational destinations if in scope of freeze |
| `src/app/(dashboard)/dashboard/activity/**` | Modificar — hub chrome mounts |
| `src/app/(dashboard)/dashboard/analytics/page.tsx` | Modificar — redirect branch for 2 tabs only |
| `src/app/(dashboard)/dashboard/analytics/ComboHealthTab.tsx` | Ler / re-export mount |
| `src/app/(dashboard)/dashboard/analytics/RouteExplainabilityTab.tsx` | Ler / re-export mount |
| `src/app/(dashboard)/dashboard/analytics/combo-health/page.tsx` | Modificar redirect if needed |
| `src/app/(dashboard)/dashboard/health/page.tsx` | Ler — target of discoverability link |
| `tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts` | Criar |
| `tests/unit/ui/observe-hub-sidebar.test.ts` | Regressão |
| `tests/unit/ui/page-tab-bar.test.tsx` | Ler — id param behavior |

### How

1. Read 0078 Observe destination shapes.
2. Implement Observe UI entry via **`?panel=`** per 0078 freeze (combo-health | route-trace) — **do not** pollute log `source` enum; **do not invent third scheme**.
3. Import existing tab components into Observe shell.
4. On analytics page, if tab is operational → `redirect`/`router.replace` to Observe builder with `id` preserved.
5. Add health link on Observe hub.
6. Tests.

### Why

Combo health + route path are Investigate/debug, not economic storytelling. Observe is the ops stream hub.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent Observe query schemes outside 0078.  
> DO NOT drop `id=` for route-trace.  
> DO NOT move storytelling tabs to Dashboard here (0081).  
> DO NOT add primary leaves.  
> DO NOT delete ComboHealth/RouteExplainability modules.

> [!IMPORTANT]
> This task **hard-blocks 0081**.  
> Record analytics dual-ownership disposition in Completion Evidence.  
> Orthogonal to **0071/0077** fusion acting chips.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Paths match 0078 + Epic
- [x] **Zod Validation**: Prefer parse-don't-validate for new query keys if added
- [x] **Security**: No secrets; request id only in query
- [x] **Error Sanitization**: N/A for chrome
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Re-home + redirect

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Created**: `src/app/(dashboard)/dashboard/analytics/AnalyticsPageClient.tsx` (storytelling shell only)
  - **Created**: `tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts`
  - **Modified**: `src/app/(dashboard)/dashboard/analytics/page.tsx` — server redirect for operational tabs only via 0078 builders
  - **Modified**: `src/app/(dashboard)/dashboard/analytics/combo-health/page.tsx` — nested → `buildObserveComboHealthPath()`
  - **Modified**: `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx` — mount `ComboHealthTab` / `RouteExplainabilityTab` on `?panel=`
  - **Modified**: `src/app/(dashboard)/dashboard/activity/page.tsx` — docs for panel deep links
  - **Modified**: `src/shared/components/ObserveHubSubnav.tsx` — combo-health + route-trace subnav links (builders); health retained
  - **Modified**: `src/app/(dashboard)/dashboard/analytics/RouteExplainabilityTab.tsx` — preserve `id=` when `panel=route-trace`
  - **Modified**: `tests/unit/dashboard-shell-tabs.test.ts` — analytics shell asserts ops redirect + storytelling residual
  - **Unchanged modules reused**: `ComboHealthTab.tsx`, `RouteExplainabilityTab.tsx` (no business-logic rewrite); `epic19Rebalance.ts` builders only
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts`
  - `node --import tsx/esm --test tests/unit/ui/epic19-rebalance-matrix-0078.test.ts tests/unit/ui/observe-hub-sidebar.test.ts tests/unit/ui/observe-settings-ia-gaps-0061.test.ts tests/unit/dashboard-shell-tabs.test.ts`
- **Resultado dos testes**: **77/77 pass** (0 fail) across 0080 + 0078 matrix + observe hub/0061 + dashboard-shell-tabs
- **Resultado do lint**: `npx eslint` on all touched files — clean (exit 0)
- **Resultado do typecheck/build**: `npm run typecheck:core` — clean (exit 0)
- **id= deep-link proof**:
  - Builder: `buildObserveRouteTracePath("req-0080")` → `/dashboard/activity?panel=route-trace&id=req-0080`
  - Analytics server: `tab=route-trace|route-explain` + `id` → `resolveEpic19RouteTraceDestination(id)`
  - Observe hub: reads `searchParams.get("id")` → `RouteExplainabilityTab initialRequestId`
  - Tab selection sync: `RouteExplainabilityTab` writes `id=` when `panel=route-trace` (and legacy `tab=`)
- **analytics/page.tsx disposition for 0081**: **operational tabs redirected; storytelling tabs still on analytics for 0081**
  - Redirected: `combo-health`, `route-trace`, `route-explain` (+ nested `/analytics/combo-health`)
  - Still on analytics client: `overview`, `evals`, `search`, `utilization`, `compression` (0081 owns Dashboard absorb)
- **Agente executor**: gt-ts-engineer (frontend IA) / parent builders
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Independent re-review (chrome + live proof) — 2026-07-20
- **Reviewer**: independent FULL RE-REVIEWER (`reviewers`; builders untrusted)
- **Veredito**: `ACCEPTED_SOURCE_100` + LIVE_DEPLOY_BLOCKER
- **Score**: `94/100` composite (local 100 / source runtime 100 / live `:22000` 55)
- **Notas**: Source SSoT + single-strip OK; path-to-100 mounted `ObserveHubSubnav` on health loading/error. Live `:22000` image has **0** `resolveSidebarHubAlias` hits — Health sidebar still unlit until redeploy test stack only (never `:21000`).
- **Full report**: `docs/reports/reviews/2026-07-20-task-0080-epic19-observe-chrome-rereview.md`
- **Lane outcome**: stay `03-review/`

### Residual (health sidebar + single chrome) — 2026-07-19
- **Reviewer**: `builders` / gt-frontend-quality-reviewer
- **Veredito**: `ACCEPTED_100` / APROVADO
- **Score**: `100/100`
- **Notas**: `/dashboard/health` → Observe via `SIDEBAR_ACTIVE_HUB_ALIASES`; activity/`?panel=` prefix-match; exactly one `ObserveHubSubnav` on activity + health (no `PageTabBar`); core 0080 ops mounts/redirects/`id=` re-verified green. Shared SSoT with 0084.
- **Full report**: `docs/reports/reviews/2026-07-19-task-0080-epic19-observe-health-sidebar-residual-frontend-quality-review.md`
- **Lane outcome**: `03-review/`

### Prior (core 0080) — 2026-07-19
- **Reviewer**: independent FULL RE-REVIEWER (`reviewers`; builders untrusted) — re-review + path-to-100
- **Veredito**: `ACCEPTED_100` / APROVADO
- **Score**: `100/100` (local 100 / source runtime 100; live `:22000` deploy lag)
- **Notas**: Observe `?panel=` mounts; analytics ops redirects; `id=` chain; health discoverability; no source enum pollution. Path-to-100: `focus-ring` + Combo Health icon `monitor_heart`.
- **Full report**: `docs/reports/reviews/2026-07-19-task-0080-epic19-observe-combo-health-route-trace-independent-rereview.md`

## Review Ledger

### Latest Review (independent chrome re-review)
- **Date**: 2026-07-20
- **Reviewer profile**: `reviewers` / independent FULL RE-REVIEWER
- **Score**: `94/100` (source 100; live deploy lag)
- **Verdict**: `ACCEPTED_SOURCE_100` + LIVE_DEPLOY_BLOCKER
- **Full report**: `docs/reports/reviews/2026-07-20-task-0080-epic19-observe-chrome-rereview.md`
- **Lane outcome**: `docs/tasks/03-review/0080-omniroute-epic19-observe-absorb-combo-health-route-trace.md`
- **Path-to-100**: health loading/error now mount ObserveHubSubnav; tests assert 3 exclusive mounts

### Previous Reports
- `2026-07-19` — residual health sidebar builder review `100/100`
- `2026-07-19` — residual rework in `02-doing` (operator: health not lighting Observe)
- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0080-epic19-observe-combo-health-route-trace-independent-rereview.md`
  - **Carried forward**: live 22000 deploy lag (ops) — **still open 2026-07-20**
  - **Resolved since**: F-NIT-1 dual icons; F-NIT-2 focus-ring (independent path-to-100)
- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0080-epic19-observe-combo-health-route-trace-frontend-quality-review.md`

---

## REWORK ADDENDUM (2026-07-19 — operator correction)

> **Why returned to `01-open/`:** Combo-health + route-trace → Observe destinations are **mostly correct**. Residual: **`/dashboard/health` does not light Observe** in the sidebar; chrome must stay **one** Observe hub strip (logs `source` + operational `panel` / health) without stacking legacy analytics bars.
>
> **Root cause:** Active-state path prefix not extended for health; EPIC-19 focused on panel re-home more than sidebar matcher. Design system law now explicit in `AGENTS.md`.

### Additional exit conditions

- [x] Sidebar **Observe** is active (current) when pathname is `/dashboard/health` (and combo-health / route-trace observe destinations)
- [x] Still **exactly one** Observe hub chrome strip (no re-introduction of Analytics PageTabBar on Observe routes)
- [x] Unit test for sidebar active matcher includes health + observe panels
- [x] typecheck + targeted tests green

### Additional subtasks

- [x] **Ler** sidebar active-match logic + ObserveHubSubnav / activity hub
- [x] Extend matchers so health + observe operational panels light Observe
- [x] Anti-regression: no multi-topbar on observe routes
- [x] Completion Evidence

### Residual Completion Evidence (2026-07-19 — sidebar active + single chrome)

- **Sidebar Observe active**: `SIDEBAR_ACTIVE_HUB_ALIASES` maps `/dashboard/health` → `activity` (`/dashboard/activity`). Activity + `?panel=combo-health|route-trace` already share `/dashboard/activity` path → prefix match lights Observe.
- **Single chrome strip**: `ObserveHubClient.tsx` and `health/page.tsx` each mount exactly one `<ObserveHubSubnav>`; no `PageTabBar` on those routes (asserted in `tests/unit/ui/observe-hub-sidebar.test.ts`).
- **Tests**: `tests/unit/sidebar-route-match.test.ts` (health → activity; anti-phantom) + observe hub single-chrome test.
- **typecheck**: `npm run typecheck:core` clean.
- **Shared with 0084**: matcher SSoT in `src/shared/utils/sidebarRouteMatch.ts` (same sidebar active fix).
- **Lane**: residual ACCEPTED_100 with 0084 → `03-review/` (2026-07-19 frontend-quality residual review).

