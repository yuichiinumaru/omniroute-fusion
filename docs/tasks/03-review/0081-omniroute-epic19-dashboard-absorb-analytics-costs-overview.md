# Task 0081: EPIC-19 T19-D — Dashboard Absorbs Remaining Analytics Tabs + Costs Overview

> **Status**: `[x]` Chrome rework ACCEPT 100 + peer residual path-to-100 (2026-07-20); lane `03-review`
> **Priority**: 🔴 P0
> **Type**: `feature` + `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-19 §2.3 Remaining Analytics → Dashboard; Costs Overview → Dashboard; Task **0078** SSoT; wave3 B1/B2 product intent (storytelling hub)
> **Blocks**: **0082** (analytics/costs leaf drop requires redirects + content homes)
> **Depends on**: **0078 hard** + **0080 hard** (do not start until operational tabs redirected off analytics shell)
> **Parallel class**: `serializable` vs **0080** (analytics page — hard gate); soft-coordinate with **0079** on CostsSubnav (**Overview only** here)
> **Review routing**: **bundled review with 0080** if both touch analytics shell; else independent after 0080 lands

---

## Objective

Make **Dashboard** (`home` primary leaf, i18n “Dashboard”) the **storytelling hub**: remaining analytics tabs + costs overview. Kill Analytics as a content home (redirects), without yet removing sidebar leaves (0082).

**Surfaces (locked):**

| Legacy | Destination (0078 frozen) |
|--------|---------------------------|
| `/dashboard/analytics` | `/home?tab=overview` (or default storytelling tab) |
| `?tab=overview` | `/home?tab=overview` |
| `?tab=evals\|search\|utilization\|compression` | `/home?tab=<same>` |
| `/dashboard/costs` (overview only) | `/home?tab=costs-overview` |
| (already Observe after 0080) | combo-health + route-trace — **must not** re-host on Dashboard |

**Done when:**

1. Dashboard hosts storytelling tabs: overview, evals, search, utilization, compression, costs-overview (exact ids per 0078).
2. `/dashboard/analytics` (+ storytelling tabs) redirects to Dashboard destinations.
3. `/dashboard/costs` overview redirects to Dashboard costs-overview (config paths already → Providers via 0079).
4. Nested analytics routes (`evals/`, `search/`, `utilization/`, `compression/`) update redirects to Dashboard builders.
5. Unit tests encode storytelling redirect matrix; no dual primary content shell without redirect.
6. **0** new primary leaves.

---

## Background Context

### O que já existe:

- Home/Dashboard: `/home` via `home/page.tsx` + `HomePageClient.tsx`; primary id `home`, i18nKey `dashboard`.
- Analytics shell: `analytics/page.tsx` with PageTabBar + tabs (operational tabs may already redirect after 0080).
- Nested redirects: `analytics/{evals,search,utilization,compression}/page.tsx` → analytics query tabs.
- Costs overview: `costs/page.tsx` + `CostOverviewTab.tsx` + CostsSubnav Overview link.
- DashboardTopbar may still deep-link Analytics/Costs (update links to Dashboard tabs as part of chrome honesty).
- Tests: `tests/unit/dashboard-shell-tabs.test.ts`, `tests/e2e/analytics-tabs.spec.ts` (update or supersede for new hub).

### O que está faltando / quebrado:

- Storytelling split across Analytics leaf + Home cockpit + Costs overview.
- No Dashboard PageTabBar storytelling shell for absorbed content.
- Analytics root still a content home (operator wants leaf gone after 0082; content must live first).

### Explicitly out of scope:

- Removing `analytics`/`costs` from `PRIMARY_SIDEBAR_ITEMS` (0082).
- Providers budget/pricing/quota-share (0079).
- Observe operational tabs (0080) — assert they stay on Observe.
- Notification toast polish / home “social” redesign beyond what’s required to host tabs.
- HOLD-URL full path rename.

### Collision notes:

- **0080**: **hard dependency** — complete Observe operational redirects before deleting/rehoming analytics tab shell. If 0080 incomplete: **stop** (do not re-home combo-health/route-trace).
- **0079**: CostsSubnav split — 0079 owns Budget/Pricing/Quota-share hrefs; **0081 exclusive Overview retarget** + costs overview page redirect. Do not re-break Providers config redirects.
- **0075–0077 / 0071**: product routes orthogonal; shared chrome SSoT serial-sensitive.
- **0082**: will drop peers — keep hideable ids.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0078 hard** + **0080 hard** |
| **Blocks** | **0082** hard |
| **File ownership (exclusive after handoff)** | `src/app/(dashboard)/home/**` storytelling shell (`/home`); analytics storytelling redirects; `costs/page.tsx` overview redirect; CostsSubnav **Overview href only**; DashboardTopbar peer links; tests `tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts` |
| **Do not touch** | Providers policy routes / three config CostsSubnav hrefs (0079); Observe operational mounts except asserting redirects still point Observe for combo-health/route-trace; sidebar primary array removal (0082) |
| **Collision vs live lanes** | analytics page with 0080 (hard after); CostsSubnav Overview only vs 0079 |
| **parallel-safe** | **No vs 0080**. Soft parallel vs 0079 if CostsSubnav Overview-only + costs overview file only |

---

## Test Requirements

- DEVE existir Dashboard storytelling shell (PageTabBar or equivalent) on **`/home?tab=`** with tabs from 0078: overview, evals, search, utilization, compression, costs-overview
- DEVE redirecionar:
  - `/dashboard/analytics` → `/home?tab=overview` (or 0078 default)
  - `/dashboard/analytics?tab=overview|evals|search|utilization|compression` → matching `/home?tab=`
  - `/dashboard/costs` → `/home?tab=costs-overview`
- DEVE retarget CostsSubnav **Overview only** → Dashboard costs-overview builder (0079 owns the three config links)
- DEVE **não** hospedar combo-health/route-trace no Dashboard (assert redirect still → Observe builders from 0078/0080)
- DEVE atualizar nested analytics path redirects to Dashboard builders
- DEVE unit-testar matrix rows (storytelling set) + anti dual-home for costs overview
- DEVE strengthen deep-link inventory via `rg`:
  ```bash
  rg -n "dashboard/analytics|dashboard/costs|/home\\?tab" src/app src/shared --glob '*.{ts,tsx}'
  ```
  Every residual peer link (DashboardTopbar, palette, nested redirects) either updated or residual-listed.
- DEVE manter hideable ids for analytics/costs prefs (no silent id removal)
- DEVE assertir no-new-leaf
- NÃO DEVE remove primary `analytics`/`costs` leaves yet (0082)
- NÃO DEVE rewrite Providers config redirects (0079)

---

## Exit Conditions (GDD/TDD)

- [x] Dashboard hosts all six storytelling surfaces on `/home?tab=` with working mounts (components may be imported from analytics/costs modules)
- [x] Legacy analytics storytelling URLs + costs overview redirect to Dashboard
- [x] CostsSubnav Overview → Dashboard costs-overview only (three config links untouched if 0079 done)
- [x] Operational analytics tabs still land on Observe (regression assert)
- [x] Providers config redirects still land on Providers (regression assert if 0079 done)
- [x] Deep-link `rg` inventory recorded; residual peer links fixed or listed
- [x] `node --import tsx/esm --test tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts` passa com 0 falhas
- [x] Update or quarantine obsolete `dashboard-shell-tabs` / e2e analytics assumptions that conflict — document in Completion Evidence
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Completion Evidence preenchido antes de `03-review/`

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: 0078 SSoT; 0080 disposition notes; Epic §2.3; home shell; analytics page + tabs; costs overview; DashboardTopbar; existing analytics/dashboard tests
- [x] Implement Dashboard storytelling tab shell using 0078 tab ids
- [x] Re-home mounts (import UsageAnalytics, EvalsTab, Search/Utilization/Compression tabs, CostOverviewTab)
- [x] Convert analytics root + storytelling nested routes to redirects
- [x] Convert costs overview page to redirect
- [x] Fix DashboardTopbar / internal links that still advertise Analytics/Costs as peer destinations for storytelling
- [x] TDD matrix tests + Observe/Providers regression asserts
- [x] **Refactoring pass**: avoid maintaining two full analytics shells
- [x] **Verificação de regressão**: new tests + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| 0078 SSoT module | Ler — frozen `/home?tab=` builders |
| `src/app/(dashboard)/home/**` | Modificar — storytelling hub (live href `/home`) |
| Home clients under home/ | Modificar as needed |
| `src/app/(dashboard)/dashboard/analytics/page.tsx` | Modificar → redirect storytelling tabs (after 0080 operational branch) |
| `src/app/(dashboard)/dashboard/analytics/{evals,search,utilization,compression}/page.tsx` | Redirect update |
| `src/app/(dashboard)/dashboard/costs/page.tsx` | Overview redirect → `/home?tab=costs-overview` |
| `src/app/(dashboard)/dashboard/costs/CostOverviewTab.tsx` | Ler / mount on Dashboard |
| `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` | **Overview href only** → Dashboard builder |
| `DashboardTopbar.tsx` (path under dashboard) | Update peer links |
| `tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts` | Criar |
| `tests/unit/dashboard-shell-tabs.test.ts` | Atualizar |

### How

1. Confirm 0080 hard-complete (operational tabs redirected); if not, **stop**.
2. Build Dashboard tab shell on `/home?tab=` per 0078.
3. Redirect analytics storytelling + costs overview; CostsSubnav Overview only.
4. `rg` deep-link inventory; fix DashboardTopbar/palette residuals.
5. Tests for full storytelling matrix + negative tests for combo-health/route-trace → Observe.
6. Do not edit `PRIMARY_SIDEBAR_ITEMS` membership.

### Why

Storytelling belongs on Dashboard; Analytics leaf becomes dead chrome after content moves. Costs overview is economic storytelling, not Providers config.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent tab ids outside 0078.  
> DO NOT re-host combo-health/route-trace on Dashboard.  
> DO NOT remove sidebar leaves (0082).  
> DO NOT break 0079 Providers config redirects.  
> DO NOT add Tools/Playground primary leaves.

> [!IMPORTANT]
> **Hard depends 0080** — do not start without operational handoff.  
> Exclusive CostsSubnav Overview + costs overview redirect.  
> Verify real home path (`/home`) with grep before editing.  
> Archive-not-delete analytics modules — redirect + import.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Routes grepped live
- [x] **Zod Validation**: N/A unless new parsers
- [x] **Security**: No secrets
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Re-home + redirect

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Criados**: `src/app/(dashboard)/home/DashboardStoryHubClient.tsx`; `tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts`
  - **Modificados (hub + redirects)**: `src/app/(dashboard)/home/page.tsx`; `home/DashboardTopbar.tsx`; `dashboard/analytics/page.tsx` (+ nested `evals|search|utilization|compression/page.tsx`); `dashboard/costs/page.tsx`; `dashboard/costs/CostsSubnav.tsx` (Overview only); `dashboard/analytics/AnalyticsPageClient.tsx` (archive comment)
  - **Deep-link honesty**: `dashboard/HomePageClient.tsx`; `dashboard/combos/ComboControlCenterClient.tsx`; `dashboard/api-manager/ApiManagerPageClient.tsx`
  - **Tests updated**: `tests/unit/dashboard-shell-tabs.test.ts`; `tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts`; `tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts`
  - **Unchanged modules re-homed via import**: `UsageAnalytics`, `DiversityScoreCard`, `EvalsTab`, `SearchAnalyticsTab`, `ProviderUtilizationTab`, `CompressionAnalyticsTab`, `CostOverviewTab`, `HomePageClient` (overview cockpit)
  - **Not touched**: `PRIMARY_SIDEBAR_ITEMS` membership (0082); Providers config routes (0079); Observe operational mounts (0080)
- **Testes que verificam o trabalho**:
  - `tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts` (primary)
  - regression: `epic19-observe-ops-redirect-0080`, `epic19-providers-costs-redirect-0079`, `epic19-rebalance-matrix-0078`, `dashboard-shell-tabs`
- **Resultado dos testes**:
  - `node --import tsx/esm --test tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts tests/unit/dashboard-shell-tabs.test.ts` → **49 pass / 0 fail**
  - `node --import tsx/esm --test tests/unit/ui/epic19-rebalance-matrix-0078.test.ts` → **18 pass / 0 fail**
- **Resultado do lint**: `npx eslint` on touched files → **0 errors** (4 pre-existing warnings in HomePageClient / ApiManagerPageClient only)
- **Resultado do typecheck/build**: `npm run typecheck:core` → **exit 0**
- **Redirect matrix storytelling rows** (all via `buildDashboardStoryPath`):
  | from | to |
  |------|-----|
  | `/dashboard/analytics` | `/home?tab=overview` |
  | `/dashboard/analytics?tab=overview` | `/home?tab=overview` |
  | `/dashboard/analytics?tab=evals` (+ nested `/evals`) | `/home?tab=evals` |
  | `/dashboard/analytics?tab=search` (+ nested) | `/home?tab=search` |
  | `/dashboard/analytics?tab=utilization` (+ nested) | `/home?tab=utilization` |
  | `/dashboard/analytics?tab=compression` (+ nested) | `/home?tab=compression` |
  | `/dashboard/costs` (+ preserved range/apiKeyIds/groupBy) | `/home?tab=costs-overview` |
  | Ops regression: combo-health / route-trace | still Observe `?panel=` (0080) |
  | Providers regression: budget/pricing/quota-share | still Providers nested (0079) |
- **Deep-link `rg` inventory** (`rg -n "dashboard/analytics|dashboard/costs|/home\\?tab" src/app src/shared --glob '*.{ts,tsx}'`):
  - **Updated**: DashboardTopbar, CostsSubnav Overview, HomePageClient, ComboControlCenter (Combo Health→Observe, Costs→story), ApiManager costs deep-link
  - **Intentional residuals (0082 / archive)**: `sidebarVisibility.ts` primary `href` for `analytics` + `costs` leaves (leaf drop is 0082; pages redirect); `epic19Rebalance.ts` matrix `from` rows; providers page comments; story hub imports from `analytics/` + `costs/` modules (archive-not-delete)
- **Obsolete e2e note**: `tests/e2e/analytics-tabs.spec.ts` still navigates `/dashboard/analytics` — redirects make paths work but tab-shell assumptions may need refresh in a follow-up e2e pass (not blocking unit gate). Documented, not quarantined this slice.
- **Agente executor**: gt-ts-engineer (frontend IA) / parent builders
- **Data de conclusão**: 2026-07-19

### Path-to-100 residual fix (2026-07-19, post formal review 91)

Closes review blockers **F1 / R1 / F2 / F3 / F4** without moving the task out of `02-doing`.

| ID | Fix | Evidence |
|----|-----|----------|
| **F1** | `DashboardStoryHubClient` derives `activeTab` from `useSearchParams().get("tab")` (Observe style); PageTabBar `syncSearchParam={false}`; `router.replace(buildDashboardStoryPath(next))` on change so Topbar Links and hub content share one tab id | source + 0081 path-to-100 suite |
| **F2** | Removed dual Analytics peer with `storyTab: "overview"`; single overview owner is Dashboard via `buildDashboardStoryPath("overview")` | Topbar + F2 asserts |
| **F3** | Mount `CostsSubnav` on costs-overview surface; add Overview back-link on `ProvidersPolicySubnav` → Dashboard costs-overview | hub + policy subnav |
| **R1** | Aligned `dashboard-ia-consolidation-0056.test.ts` with story builders + redirect shell + single overview control | 0056 6/6 green |
| **F4** | Compliance checklist boxes checked after re-grep | this file |

- **Arquivos path-to-100**:
  - `src/app/(dashboard)/home/DashboardStoryHubClient.tsx` — URL-driven tab + CostsSubnav mount
  - `src/app/(dashboard)/home/DashboardTopbar.tsx` — drop dual Analytics overview peer
  - `src/app/(dashboard)/dashboard/providers/components/ProvidersPolicySubnav.tsx` — Overview → costs-overview
  - Tests: `epic19-dashboard-storytelling-0081.test.ts` (path-to-100 describes), `dashboard-ia-consolidation-0056.test.ts`, `dashboard-shell-tabs.test.ts`
- **Comandos (fresh)**:
  ```bash
  node --import tsx/esm --test \
    tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts \
    tests/unit/ui/dashboard-ia-consolidation-0056.test.ts \
    tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
    tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts \
    tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
    tests/unit/dashboard-shell-tabs.test.ts
  # → 77 pass / 0 fail
  npx eslint <touched files> --max-warnings 0  # exit 0
  npm run typecheck:core  # exit 0
  ```
- **Agente fixer**: gt-ts-engineer + remediation-harness / parent builders
- **Lane**: re-review promoted to `03-review` (100/100 ACCEPT)

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (agentID=reviewers) — **peer topbar residual re-review 2026-07-20**
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPT`
- **Score (path to 100)**: pre-fix residual **96** → **100/100** after PR1
- **Notas**: Operator residual Cache/Tokens/Leaderboard/Profile. Three peers always mounted topbar correctly. **PR1**: Profile early `if (loading) return` omitted `DashboardTopbar` on first paint — fixed + regression test. 0084 Routing matchers secondary **PASS**. Stay `03-review/`.
- **Se REJEITADO**: N/A
- **Lane recommendation**: **stay** `03-review/`
- **Full report**: `docs/reports/reviews/2026-07-20-task-0081-dashboard-peer-topbar-coverage-rereview.md`
- **Same-day chrome re-review**: `docs/reports/reviews/2026-07-20-task-0081-dashboard-chrome-rereview.md` (claimed 100 without spotting Profile loading gap — superseded on peer completeness)

## Review Ledger

### Latest Review
- **Date**: 2026-07-20
- **Reviewer profile**: `gt-frontend-quality-reviewer` (peer topbar residual re-review)
- **Score**: `100/100` (pre-fix 96 → path-to-100)
- **Verdict**: `ACCEPT`
- **Blockers**: none — **PR1** Profile loading early-return without topbar **fixed this session**
- **Patches this review**: `profile/page.tsx` + 0081 peer loading-safe test
- **Full report**: `docs/reports/reviews/2026-07-20-task-0081-dashboard-peer-topbar-coverage-rereview.md`
- **Lane outcome**: **stay** `docs/tasks/03-review/`

### Previous Reports
- `docs/reports/reviews/2026-07-20-task-0081-dashboard-chrome-rereview.md` (100; missed Profile loading chrome gap)
- `docs/reports/reviews/2026-07-19-task-0081-chrome-rework-review.md` (100; CR1 peer split path-to-100)
- `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-independent-rereview.md` (100; triple chrome accepted — superseded by operator rework)
- `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-rereview.md` (builders 100)
- `docs/reports/reviews/2026-07-19-task-0081-epic19-dashboard-storytelling-frontend-quality-review.md` (91, PATH_TO_100; F1/R1/F2/F3/F4)

---

## REWORK ADDENDUM (2026-07-19 — operator correction)

> **Why returned to `01-open/`:** Storytelling content on `/home?tab=` + redirects from analytics/costs overview are **kept**. Chrome was wrong: **DashboardTopbar + story PageTabBar + CostsSubnav** (up to **triple** chrome). Operator wants **one** topbar for Dashboard.
>
> **Root cause:** Task asked for PageTabBar shell + mounting CostsSubnav on costs-overview; review explicitly “accepted triple chrome.” Design system / self-evident organization not enforced. See `AGENTS.md` IA section.
>
> **Do not undo:** redirects analytics→home, costs overview→home tab, Observe-owned combo-health/route-trace.

### Target single Dashboard topbar (operator)

Peers on **one** strip (labels may match i18n):  
Dashboard/Home · Overview (ex-analytics) · Evals · Search · Utilization · Compression · Costs · Cache · Tokens · Leaderboard · Profile  

- Analytics leaf is gone; “Overview” **is** the analytics overview surface.  
- Costs overview is a peer on this strip — **not** a nested CostsSubnav under Costs.  
- Cache / Tokens / Leaderboard / Profile already on DashboardTopbar — must share the **same** strip as story tabs (no second bar).

### Additional exit conditions

- [x] **Exactly one** topbar mount on `/home` for all listed peers (no DashboardTopbar + separate story PageTabBar + CostsSubnav stack)
- [x] Costs-overview does **not** render `CostsSubnav`
- [x] Anti-phantom unit test: routes under Dashboard hub assert topbar strip count === 1
- [x] Sidebar Dashboard active on all `/home?tab=` surfaces (primary `home` leaf + `/home?tab=` unchanged)
- [x] typecheck + targeted tests green

### Additional subtasks

- [x] **Ler** `DashboardTopbar.tsx`, `DashboardStoryHubClient.tsx`, CostsSubnav usage
- [x] Unify story tabs into the single topbar SSoT (or one component that owns all peers)
- [x] Remove CostsSubnav mount from story hub
- [x] Anti-phantom chrome tests + Completion Evidence screenshots/description

---

## 📋 Completion Evidence — chrome rework (2026-07-19)

> Content redirects **kept**. Chrome fixed to **one** `DashboardTopbar` strip.

### What changed

| Surface | Before (wrong) | After (operator) |
|---------|----------------|------------------|
| `/home?tab=*` | DashboardTopbar + PageTabBar (+ CostsSubnav on costs-overview) | **Only** `DashboardTopbar` |
| costs-overview content | CostOverviewTab + CostsSubnav | CostOverviewTab only |
| cache / tokens / leaderboard / profile | no shared topbar | same `DashboardTopbar` |

**Single topbar peers** (`data-dashboard-topbar`) — operator list, **not** merged:  
Dashboard/Home · Overview (ex-analytics) · Evals · Search · Utilization · Compression · Costs · Cache · Tokens · Leaderboard · Profile  

| Peer | Destination | Content |
|------|-------------|---------|
| Dashboard/Home | `/home` | `HomePageClient` cockpit |
| Overview | `/home?tab=overview` | `UsageAnalytics` + `DiversityScoreCard` |
| Evals…Costs | story builders | respective surfaces |
| Cache…Profile | `/dashboard/*` | peer pages + same topbar |

- F2: exactly one `storyTab: "overview"` (Overview peer only); Dashboard/Home is `kind: "home"` bare `/home` — no dual aria-current.  
- `CostsSubnav` component remains (residual deep-link / 0079 matrix tests); **not mounted** on Dashboard story hub.  
- Providers policy discoverability stays via `ProvidersPolicySubnav` Overview → costs-overview (0079 chrome may archive-unmount policy strip on Providers itself).

### Files

- `src/app/(dashboard)/home/DashboardTopbar.tsx` — expanded peers; Suspense-wrapped; `data-dashboard-topbar`
- `src/app/(dashboard)/home/DashboardStoryHubClient.tsx` — content only (no PageTabBar / CostsSubnav)
- `src/app/(dashboard)/home/page.tsx` — single topbar mount
- `src/app/(dashboard)/dashboard/{cache,tokens,leaderboard,profile}/page.tsx` — mount same topbar
- Tests: `tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts`, `tests/unit/dashboard-shell-tabs.test.ts`, `tests/unit/ui/dashboard-ia-consolidation-0056.test.ts`

### Commands

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts \
  tests/unit/ui/dashboard-ia-consolidation-0056.test.ts \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
  tests/unit/ui/epic19-observe-ops-redirect-0080.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
  tests/unit/dashboard-shell-tabs.test.ts
# → 80 pass / 0 fail (builder); **81 pass / 0 fail** after reviewer peer-split path-to-100

npx eslint <touched> --max-warnings 0  # exit 0
npm run typecheck:core                # exit 0
```

### Redirects (unchanged)

Analytics storytelling + costs overview still → `/home?tab=`; ops → Observe; Providers config → Providers.

### Path-to-100 (chrome rework review)

Builder had merged Dashboard/Home + Overview into one peer — fixed vs operator list:

- `DashboardTopbar.tsx` — 11 peers; home = bare `/home`; Overview = sole `storyTab: "overview"`
- `DashboardStoryHubClient.tsx` — home cockpit vs overview analytics content split
- Tests assert operator labels + distinct destinations + F2

### Lane

Promoted to **`03-review/`** at **100/100**.

- **Agente builder**: gt-ts-engineer / parent builders
- **Agente reviewer + path-to-100**: gt-frontend-quality-reviewer / parent builders
- **Data**: 2026-07-19

---

## 📋 Residual path-to-100 — peer topbar completeness (2026-07-20)

Operator residual: Cache / Tokens / Leaderboard / Profile “não mostram topbar unificada”.

### Matrix (live code)

| Peer | Mounts `DashboardTopbar` | Notes |
|------|--------------------------|-------|
| Cache | **YES** | outer return; loading under topbar |
| Tokens | **YES** | outer return |
| Leaderboard | **YES** | outer return |
| Profile | **YES** (fixed) | **PR1**: loading early-return previously omitted topbar |

### Fix

- `src/app/(dashboard)/dashboard/profile/page.tsx` — always mount topbar above loading/content
- `tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts` — mount count === 1 + no loading early-return before topbar

### Commands

```bash
node --import tsx/esm --test tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts
# → 26 pass / 0 fail
npx eslint src/app/\(dashboard\)/dashboard/profile/page.tsx \
  tests/unit/ui/epic19-dashboard-storytelling-0081.test.ts --max-warnings 0
```

### Secondary (0084)

Fusions / context/settings / compression studio → Routing (`combos`) via `SIDEBAR_ACTIVE_HUB_ALIASES` — **PASS** (not 0081 ownership).

### Score

**100/100 ACCEPT** — report: `docs/reports/reviews/2026-07-20-task-0081-dashboard-peer-topbar-coverage-rereview.md`

- **Agente**: Frontend Quality Reviewer (residual re-review + fix)
- **Data**: 2026-07-20

