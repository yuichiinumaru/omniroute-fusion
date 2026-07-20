# Task 0078: EPIC-19 T19-A — SSoT Map Freeze for Dashboard/Observe/Providers IA Rebalance

> **Status**: `[R]` In review (moved 2026-07-19 — frontend-quality 100/100)
> **Priority**: 🔴 P0
> **Type**: `governance` + `feature` (docs + path-builder constants only — no chrome cutover)
> **Action type**: UX_VIS + HARDEN (matrix freeze)
> **Origin**: EPIC-19 product matrix LOCKED 2026-07-19; evidence `docs/tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md`; audit `docs/reports/audits/2026-07-19-wave3-frontend-ia-operator-claims-verification.md` (B5 costs config vs storytelling; A5 no-new-leaf); live `PRIMARY_SIDEBAR_ITEMS`, `observeHub.ts`, `CostsSubnav.tsx`, `analytics/page.tsx`; batch fix pass C-05/C-02/C-03
> **Blocks**: 0079, 0080, 0081, 0082 (all implementation slices of EPIC-19)
> **Depends on**: none hard (Epic 0005 IA baseline already shipped)
> **Parallel class**: `serializable` first slice — **must complete before** 0079–0082 product moves
> **Review routing**: independent (docs + pure constants/tests); bundle only if executor co-lands with 0079

---

## Objective

Freeze the **operator-locked destination matrix** as documentation + code SSoT (path builders / redirect matrices / hub destination tables) so later tasks implement **one** map, not invent alternate homes.

**Done when:**

1. `docs/guides/UI.md` section `## EPIC-19 IA rebalance (planned)` + `docs/architecture/NAV-TREE-TARGET.md` section `## EPIC-19 target` describe the **post-EPIC-19** primary chrome and L1 destinations (planned language until 0082 flips live).
2. Code constants export **canonical path builders** and a **redirect matrix** matching Epic §4 (from → to), patterned after `OBSERVE_REDIRECT_MATRIX` / `buildObserveHubPath`.
3. Unit tests assert the frozen matrix (tab ids, from/to pairs, **0** new primary leaves for Translator/Playground/Search Tools) **without** yet removing `analytics`/`costs` from `PRIMARY_SIDEBAR_ITEMS` (that cutover is **0082**).
4. Destination paths for Providers config + Observe operational tabs + Dashboard storytelling are **named once** (no “or” left in frozen constants) and referenced by 0079–0081.
5. Full inventory of live redirects into costs/analytics (including **usage → costs/budget**) is recorded; implementer tasks own the updates.

---

## Background Context

### O que já existe:

- Live primary chrome (**9** leaves) in `src/shared/constants/sidebarVisibility.ts` — still includes `analytics` + `costs` peers (`PRIMARY_SIDEBAR_ITEMS` ids: home, providers, combos, activity, analytics, costs, operations, settings-general, docs).
- Observe hub SSoT: `src/shared/constants/observeHub.ts` — `OBSERVE_HUB_PATH`, `buildObserveHubPath`, `OBSERVE_REDIRECT_MATRIX`, sources via `?source=` (activity/request/proxy/console/audit/mcp/a2a). Health is deep link `/dashboard/health` (partial Task 0061).
- Costs config chrome: `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` — Overview + budget + pricing + quota-share routes under `/dashboard/costs/*`.
- Analytics shell: `src/app/(dashboard)/dashboard/analytics/page.tsx` — tabs `overview | evals | search | utilization | combo-health | compression | route-trace` (+ alias `route-explain`); deep link `?id=` for route-trace.
- Ops/Testing hubs: `operationsHub.ts`, `testingHub.ts` — labs intentionally **not** primary leaves (audit A1–A5).
- Legacy alias: `src/app/(dashboard)/dashboard/usage/page.tsx` may redirect into `/dashboard/costs/budget` — **must inventory**.
- IA invariants: `docs/guides/UI.md` §1 (no-new-leaf, archive-not-delete); target map `docs/architecture/NAV-TREE-TARGET.md` still lists Analytics + Costs as L0 (pre-rebalance).
- Gold redirect test style: `tests/unit/ui/observe-hub-sidebar.test.ts` asserts `OBSERVE_REDIRECT_MATRIX`.

### O que está faltando / quebrado:

- No single code module freezes Epic 19 destinations → implementers invent `/providers/budget` vs `?tab=budget` etc.
- UI.md / NAV-TREE still document Analytics + Costs as primary peers (operator wants them **gone** after migration).
- Wave 3 audit CONFIRMED costs mix config vs storytelling (B5) and rejected promoting labs to primary leaves (A5).
- Redirect matrix for analytics/costs re-home is not encoded as testable SSoT yet; legacy usage/costs aliases incomplete.

### Mandatory freeze table — ONE shape per family (no “or” in Completion Evidence)

| Family | Frozen v1 shape (canonical) | Builder responsibility |
|--------|----------------------------|------------------------|
| Providers budget | **`/dashboard/providers/budget`** (nested under providers layout) | `buildProvidersBudgetPath()` (name may vary) |
| Providers pricing | **`/dashboard/providers/pricing`** | `buildProvidersPricingPath()` |
| Providers quota-share | **`/dashboard/providers/quota-share`** | `buildProvidersQuotaSharePath()` |
| Observe combo-health | **`?panel=combo-health`** on Observe hub path (`buildObserveHubPath` extension or sibling builder) | **Separate from** log `?source=` enum — do **not** pollute source with combo-health/route-trace |
| Observe route-trace | **`?panel=route-trace`** (+ preserve `id=` deep link) | same panel family; document interaction with `buildObserveHubPath` |
| Observe health | keep `/dashboard/health` deep link + hub discoverability | document only |
| Dashboard storytelling | **`/home?tab=`** (match live home `href: "/home"`) for `overview` \| `evals` \| `search` \| `utilization` \| `compression` \| `costs-overview` | `buildDashboardStoryPath(tab)` |
| Tools / labs | Operations → Testing hub (no new primary leaf) | no new builder required |

**Forbidden:** leaving both nested-route and `?tab=` for Providers; mixing Observe operational panels into log `source` enum; dual Dashboard hosts (`/home` vs `/dashboard/...` without single builder).

### Locked matrix (from → to — implementers use builders only)

| From (today) | To hub | Canonical `to` (frozen) |
|--------------|--------|-------------------------|
| `/dashboard/costs/budget` | **Providers** | `/dashboard/providers/budget` |
| `/dashboard/costs/pricing` | **Providers** | `/dashboard/providers/pricing` |
| `/dashboard/costs/quota-share` | **Providers** | `/dashboard/providers/quota-share` |
| `/dashboard/analytics?tab=combo-health` | **Observe** | Observe hub + `panel=combo-health` |
| `/dashboard/analytics?tab=route-trace` (+ `route-explain`, `id=`) | **Observe** | Observe hub + `panel=route-trace` (+ `id=`) |
| Logs + `/dashboard/health` | **Observe** | already Observe pillar; document discoverability |
| Remaining analytics tabs + `/dashboard/costs` overview | **Dashboard** (`home` leaf) | `/home?tab=<id>` |
| Playground / Translator / Search Tools | **Operations → Testing** | **0** new primary leaves |

### Inventory requirement (M-01)

Before freeze is complete, run and record in Completion Evidence:

```bash
rg -n "dashboard/costs|dashboard/analytics|costs/budget" src/app src/shared --glob '*.{ts,tsx}'
```

Including any **usage → costs/budget** redirects. Every hit must either (a) map to a matrix row owned by 0079–0081, or (b) be listed as residual with owner task.

### Explicitly out of scope:

- Implementing Providers subnav pages, Observe panel mounts, Dashboard tab shell, or sidebar leaf removal (→ 0079–0082).
- Rewriting backend, HOLD-URL prefix strip, Cybernetics, toast/notification polish.
- Re-doing EPIC-13 chrome product files (0075 fusions strip, 0076 Ops reverse chrome product, 0077 acting list chip).
- Free-tiers home invent (not in locked matrix — residual note only).

### Collision notes (0075–0077 / docs):

- Product UI files for fusions/ops are largely disjoint — **true**. Shared chrome SSoT (**UI.md**, **NAV-TREE**, leaf-count tests) is **serial-sensitive**, not fully orthogonal.
- **0077** owns only NAV-TREE labs/DEVTOOLS + Home label residual; **this task** owns `## EPIC-19 target` planned L0–L1; **0082** flips planned→live.
- **0076** owns UI.md reverse-chrome only; **this task** owns only `## EPIC-19 IA rebalance (planned)` under UI.md.
- Strike any prior claim of “no overlap with 0077” — section locks apply instead.

---

## Doc section ownership (global map)

| Doc section | Owner task |
|-------------|------------|
| UI.md reverse chrome / Ops-Testing launchpad | **0076** |
| UI.md `## EPIC-19 IA rebalance (planned)` | **0078** (this task) |
| UI.md `## Primary chrome (live)` post-cutover | **0082** |
| UI.md `## Tools → Operations (interim)` | **0083** |
| NAV-TREE labs/DEVTOOLS residual | **0077** |
| NAV-TREE `## EPIC-19 target` planned L0–L1 | **0078** (this task) |
| NAV-TREE live L0 after leaf drop | **0082** |

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | None hard |
| **Blocks** | **0079, 0080, 0081, 0082** (hard). Soft-blocks **0083** until Tools interim docs section green (0083 soft-depends this task) |
| **File ownership (exclusive)** | New SSoT module under `src/shared/constants/` (suggested: `epic19Rebalance.ts`); UI.md **only** `## EPIC-19 IA rebalance (planned)`; NAV-TREE **only** `## EPIC-19 target` planned L0–L1; new unit test `tests/unit/ui/epic19-rebalance-matrix-0078.test.ts` |
| **Do not touch** | `PRIMARY_SIDEBAR_ITEMS` membership (read-only assert still includes analytics+costs until 0082); product page shells for costs/analytics/home; reverse-chrome UI.md section (0076); NAV-TREE labs residual (0077); live primary dump flip (0082); fusion/ops product files |
| **Collision vs live lanes** | Section-locked vs 0076/0077/0082/0083. Product routes orthogonal to 0075–0077; shared chrome SSoT serial-sensitive. |
| **parallel-safe** | **No** vs 0079–0082 product work (they depend on freeze). Safe vs 0075–0077 product UI if section locks held. |

---

## Test Requirements

- DEVE existir módulo SSoT exportando no mínimo:
  - canonical destination path builders for Providers **nested** budget/pricing/quota-share
  - Observe destinations for combo-health + route-trace via **`panel=`** (**not** log `source`) including optional `id` for route-trace
  - Dashboard storytelling builders for `/home?tab=` overview, evals, search, utilization, compression, costs-overview
  - full `from → to` redirect matrix covering Epic §4 rows + inventory-discovered legacy (e.g. usage→budget)
- DEVE haver teste unitário que itera a redirect matrix e asserta:
  - every `from` is a known legacy path/query pattern
  - every `to` uses the canonical builders (no ad-hoc strings in matrix rows that diverge from builders)
  - `route-trace` / `route-explain` + `id=` preservation rule is encoded
  - **zero “or” shapes** — one string form per destination family
- DEVE assertir **anti-leaf**: matrix / docs do **not** introduce primary leaves for `playground`, `translator`, `search-tools`, or a new `tools`/`labs` peer
- DEVE assertir (pre-cutover snapshot): `PRIMARY_SIDEBAR_ITEM_IDS` still includes `analytics` and `costs` until 0082 — this task does not remove them
- DEVE documentar target primary chrome post-0082 as ids **`home, providers, combos, activity, operations, settings-general, docs`** (length **7**) in planned sections only
- NÃO DEVE claim “Analytics leaf gone” in live dump tables until 0082 completes
- DEVE inventory `rg` hits for redirects into costs/analytics including usage→costs/budget

---

## Exit Conditions (GDD/TDD)

- [x] `docs/guides/UI.md` updated **only** under `## EPIC-19 IA rebalance (planned)` (+ invariants cross-link if needed); reverse-chrome/live/Tools sections untouched
- [x] `docs/architecture/NAV-TREE-TARGET.md` updated **only** under `## EPIC-19 target` planned L0–L1; labs residual left to 0077; live flip left to 0082
- [x] Code SSoT module committed with path builders + redirect matrix + JSDoc citing Epic 19 — **mandatory freeze table shapes above with no “or”**
- [x] Observe uses **`panel=`** separate from log `source=` (documented on builders)
- [x] Dashboard builders use **`/home?tab=`** matching live home href
- [x] Inventory `rg` recorded; every costs/analytics inbound redirect listed (incl. usage→budget if present)
- [x] Unit test file for matrix passes: `node --import tsx/esm --test tests/unit/ui/epic19-rebalance-matrix-0078.test.ts` (or final path recorded in Completion Evidence)
- [x] Existing observe redirect tests still pass (no regression to `OBSERVE_REDIRECT_MATRIX` contract / source enum pollution)
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Completion Evidence includes: dump of exported matrix rows (single shape per family) + note that leaf cutover is **0082**
- [x] Completion Evidence preenchido antes de `03-review/`

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: `docs/tasks/00-planning/EPIC-19-…md` (full); wave3 audit; `docs/guides/UI.md`; `docs/architecture/NAV-TREE-TARGET.md`; `src/shared/constants/sidebarVisibility.ts`; `observeHub.ts`; `operationsHub.ts`; `testingHub.ts`; `analytics/page.tsx`; `costs/CostsSubnav.tsx`; `usage/page.tsx` (budget branch); `tests/unit/ui/observe-hub-sidebar.test.ts`; sidebar tests
- [x] **Inventory** redirects into costs/analytics (`rg` above)
- [x] Encode **mandatory freeze table** shapes as builders + matrix (no alternate schemes)
- [x] Write failing-then-passing unit tests for matrix + anti-leaf
- [x] Update UI.md + NAV-TREE **planned** sections only (status: planned / post-EPIC-19)
- [x] **Refactoring pass**: single module, no duplicated path strings across docs vs code
- [x] **Verificação de regressão**: matrix test + observe hub tests + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md` | Ler — locked matrix SSoT |
| `docs/reports/audits/2026-07-19-wave3-frontend-ia-operator-claims-verification.md` | Ler — B5/A5 evidence |
| `docs/guides/UI.md` | Modificar — **only** `## EPIC-19 IA rebalance (planned)` |
| `docs/architecture/NAV-TREE-TARGET.md` | Modificar — **only** `## EPIC-19 target` planned L0–L1 |
| `src/shared/constants/observeHub.ts` | Ler — builder/matrix pattern; do not pollute source enum |
| `src/shared/constants/sidebarVisibility.ts` | Ler (assert only pre-cutover) |
| `src/shared/constants/operationsHub.ts` | Ler — Tools→Ops |
| `src/shared/constants/testingHub.ts` | Ler — labs inventory |
| `src/shared/constants/epic19Rebalance.ts` (or equivalent name) | **Criar** — path builders + redirect matrix |
| `src/app/(dashboard)/dashboard/analytics/page.tsx` | Ler — tab + `id=` contracts |
| `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` | Ler — costs L1 routes |
| `src/app/(dashboard)/dashboard/usage/page.tsx` | Ler — inventory usage→costs redirects |
| `tests/unit/ui/epic19-rebalance-matrix-0078.test.ts` | **Criar** — matrix + anti-leaf asserts |
| `tests/unit/ui/observe-hub-sidebar.test.ts` | Ler / run regression |

### How

1. Read Epic §2–4 + live tabs/routes; inventory every from→to including usage aliases.
2. Encode builders exactly as mandatory freeze table (Providers nested; Observe `panel=`; Dashboard `/home?tab=`).
3. Encode `EPIC19_REDIRECT_MATRIX` with TypeScript types; unit test fails if matrix `to` diverges from builders.
4. TDD: assert matrix length ≥ Epic rows; assert no playground/translator/search-tools primary promotion; assert target primary ids length 7 planned.
5. Update docs **planned** sections only so readers are not lied to before 0082.
6. Do **not** change page redirects yet (0079–0081 own that).

### Why

Without a freeze, parallel implementers diverge on URLs and dual-nav returns. Operator matrix is product law; this task is the structural engineer’s blueprint before chrome moves. C-05: “pick one” without committed shapes caused dependency collapse.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent destination hubs outside **Providers / Observe / Dashboard / Operations**.  
> DO NOT add primary sidebar leaves for Translator, Playground, Search Tools, Labs, or Testing.  
> DO NOT remove `analytics`/`costs` from `PRIMARY_SIDEBAR_ITEMS` in this task (0082).  
> DO NOT delete costs/analytics page modules — archive-not-delete; redirects land later.  
> DO NOT leave “or” destination shapes in frozen constants / Completion Evidence.  
> DO NOT pollute Observe log `source` enum with combo-health/route-trace (use `panel=`).  
> DO NOT overwrite UI.md reverse-chrome (0076), live primary (0082), Tools interim (0083), or NAV-TREE labs residual (0077).  
> DO NOT mark complete without running the new matrix unit test and recording output in Completion Evidence.

> [!IMPORTANT]
> Read EVERY file in Where before writing.  
> Cite Epic 19 + wave3 audit paths in code JSDoc / docs.  
> If a prerequisite path is missing in live code, surface it as a blocker note in Completion Evidence — do not hallucinate file existence.  
> Free-tiers: residual note only unless operator asks.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Paths/ids grepped against live code before documenting (`PRIMARY_SIDEBAR_ITEM_IDS`, `OBSERVE_HUB_PATH`, live redirects)
- [x] **Zod Validation**: N/A — typed string unions + `isObserveOperationalPanel` / `isDashboardStoryTab` guards; no new HTTP parsers
- [x] **Security**: No secrets
- [x] **Error Sanitization**: N/A — constants/docs only
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Docs/constants only; no silent deletes; leaf drop deferred to 0082

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Criados**: `src/shared/constants/epic19Rebalance.ts`; `tests/unit/ui/epic19-rebalance-matrix-0078.test.ts`
  - **Modificados (planned sections only)**: `docs/guides/UI.md` (`## EPIC-19 IA rebalance (planned)`); `docs/architecture/NAV-TREE-TARGET.md` (`## EPIC-19 target` + changelog row)
  - **NÃO tocados (by design)**: `PRIMARY_SIDEBAR_ITEMS` membership; product shells costs/analytics/home; reverse-chrome UI.md; NAV-TREE labs residual; observeHub source enum
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/ui/epic19-rebalance-matrix-0078.test.ts` (18 tests after path-to-100 unique-`from` guard)
  - Regression: `node --import tsx/esm --test tests/unit/ui/observe-hub-sidebar.test.ts` (28 tests)
- **Resultado dos testes**: **PASS** — epic19 18/18; observe-hub 28/28 (re-verified gt-ts-expert 2026-07-19)
- **Resultado do lint**: `npx eslint src/shared/constants/epic19Rebalance.ts tests/unit/ui/epic19-rebalance-matrix-0078.test.ts` — clean (exit 0)
- **Resultado do typecheck/build**: `npm run typecheck:core` — clean (exit 0)
- **Entrada no changelog**: `CHANGELOG.md` `[Unreleased]` → **Changed** — EPIC-19 IA rebalance matrix freeze (Task 0078 / T19-A)
- **Frozen matrix dump** (from→to list — single shape per family):
  ```
  TARGET PRIMARY (planned post-0082, length 7):
    home, providers, combos, activity, operations, settings-general, docs
  BUILDERS:
    budget        → /dashboard/providers/budget
    pricing       → /dashboard/providers/pricing
    quota-share   → /dashboard/providers/quota-share
    combo-health  → /dashboard/activity?panel=combo-health
    route-trace   → /dashboard/activity?panel=route-trace
    route-trace+id→ /dashboard/activity?panel=route-trace&id=<id>
    story tabs    → /home?tab=overview|evals|search|utilization|compression|costs-overview
  EPIC19_REDIRECT_MATRIX (20 rows):
    /dashboard/costs/budget                  => /dashboard/providers/budget              [providers/0079]
    /dashboard/costs/pricing                 => /dashboard/providers/pricing             [providers/0079]
    /dashboard/costs/quota-share             => /dashboard/providers/quota-share         [providers/0079]
    /dashboard/usage?tab=budget              => /dashboard/providers/budget              [providers/0079]
    /dashboard/settings/pricing              => /dashboard/providers/pricing             [providers/0079]
    /dashboard/analytics?tab=combo-health    => /dashboard/activity?panel=combo-health   [observe/0080]
    /dashboard/analytics/combo-health        => /dashboard/activity?panel=combo-health   [observe/0080]
    /dashboard/analytics?tab=route-trace     => /dashboard/activity?panel=route-trace    [observe/0080]
    /dashboard/analytics?tab=route-explain   => /dashboard/activity?panel=route-trace    [observe/0080]
    /dashboard/analytics                     => /home?tab=overview                       [dashboard/0081]
    /dashboard/analytics?tab=overview        => /home?tab=overview                       [dashboard/0081]
    /dashboard/analytics?tab=evals           => /home?tab=evals                          [dashboard/0081]
    /dashboard/analytics/evals               => /home?tab=evals                          [dashboard/0081]
    /dashboard/analytics?tab=search          => /home?tab=search                         [dashboard/0081]
    /dashboard/analytics/search              => /home?tab=search                         [dashboard/0081]
    /dashboard/analytics?tab=utilization     => /home?tab=utilization                    [dashboard/0081]
    /dashboard/analytics/utilization         => /home?tab=utilization                    [dashboard/0081]
    /dashboard/analytics?tab=compression     => /home?tab=compression                    [dashboard/0081]
    /dashboard/analytics/compression         => /home?tab=compression                    [dashboard/0081]
    /dashboard/costs                         => /home?tab=costs-overview                 [dashboard/0081]
  ```
  **Leaf cutover is 0082** — live `PRIMARY_SIDEBAR_ITEMS` still includes `analytics` + `costs` (asserted in tests).
- **Inventory rg hits** (`rg -n "dashboard/costs|dashboard/analytics|costs/budget" src/app src/shared --glob '*.{ts,tsx}'`):

  | Hit | Classification / owner |
  |-----|------------------------|
  | `epic19Rebalance.ts` matrix `from` rows | This task (freeze) |
  | `sidebarVisibility.ts` analytics/costs primary hrefs | **0082** leaf drop |
  | `home/DashboardTopbar.tsx` links to analytics + costs | **0081/0082** residual soft links |
  | `HomePageClient.tsx` Link → `/dashboard/analytics` | **0081** residual |
  | `analytics/{utilization,search,evals,compression,combo-health}/page.tsx` → `?tab=` | **0080/0081** nested redirect rewire |
  | `usage/page.tsx` `tab=budget` → `buildProvidersBudgetPath()` (live) | **0079** (wired; matrix freezes final) |
  | `settings/pricing/page.tsx` → `buildProvidersPricingPath()` (live) | **0079** (wired; matrix freezes final) |
  | `costs/CostsSubnav.tsx` L1 routes | **0079** product absorb + **0081** overview |
  | `combos/ComboControlCenterClient.tsx` Combo Health + Costs deep links | **0080/0081** residual |
  | `api-manager/ApiManagerPageClient.tsx` costs query deep link | **0081** residual (costs-overview + query passthrough TBD) |
  | free-tiers / usage component imports (path strings only) | residual note — free-tiers not in locked matrix |

  Soft inbound (not hard redirects): topbar, ComboControlCenter, ApiManager, HomePageClient — implementer tasks update when destinations exist.
- **Agente executor**: gt-ts-engineer (frontend IA SSoT) / builders parent
- **Path-to-100 applicator**: gt-ts-expert (CHANGELOG + compliance + unique-from test; no product redirect wiring)
- **Data de conclusão**: 2026-07-19
- **Status note**: Freeze scope complete; promoted to `03-review/` after frontend-quality re-review score 100.
---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent FULL RE-REVIEWER (`reviewers`; builders untrusted) — 2026-07-19 re-review
- **Data da review**: 2026-07-19
- **Veredito**: **APROVADO** / `ACCEPTED_100` (scope freeze complete; stay `03-review/`)
- **Score (path to 100)**: **100**
  - `local_implementation`: 100 (builders + matrix + tests + docs; path-to-100 UI.md honesty)
  - `runtime_enforcement`: N/A by freeze contract — page `redirect()` owned by **0079–0081**; live `:22000` image stale (ops), not freeze defect
- **Notas**:
  - Adversarial re-verify: epic19 matrix **18/18 PASS**; observe-hub green; source PRIMARY length **7** (post-0082) matches `EPIC19_TARGET_PRIMARY_SIDEBAR_IDS`.
  - Frozen shapes: Providers nested; Observe `?panel=` only (no `OBSERVE_SOURCES` pollution); Dashboard `/home?tab=`.
  - Live 22000 still shows analytics/costs peers — **pre-EPIC-19 Docker**, not source matrix failure.
  - Path-to-100 this re-review: UI.md no longer claims redirects “not wired yet”.
  - Full report: `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-independent-rereview.md`
- **Se REJEITADO**: n/a
- **Axiom compliance (tsjs)**: Type Purity ✅ · Boundary ✅ · Immutability ✅ · State Exclusivity ✅ · Async N/A

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract.

### Latest Review

- **Date**: 2026-07-19
- **Reviewer profile**: `reviewers` / independent FULL RE-REVIEWER (builders untrusted)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-independent-rereview.md`
- **Lane outcome**: stay `03-review/`
- **Task reference**: Task 0078 (`omniroute-epic19-ssot-map-rebalance-matrix`)

#### Current Open Blockers

- none (freeze scope)

#### Path-to-100 Summary

- Closed this re-review: UI.md residual “does not wire redirect yet” + “planned freeze” label → destination freeze SSoT wording.
- Residual: live `:22000` Docker image pre-EPIC-19 (ops rebuild — not 0078 code).
- Regression guard: matrix unit tests (18) + observe-hub (28) + source PRIMARY length 7 post-0082.

### Previous Reports

- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-frontend-quality-review.md`
  - **Carried forward**: none material for freeze
  - **Resolved since**: UI.md redirect-wiring honesty (independent re-review)
  - **Regression guard**: matrix unit tests (18) + observe-hub (28)
- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0064-0078-path-to-100-gt-ts-expert.md`
  - **Carried forward**: none material for freeze
  - **Resolved since**: matrix note accuracy (usage/settings intermediate claims)
