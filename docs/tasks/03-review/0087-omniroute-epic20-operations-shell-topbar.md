# Task 0087: EPIC-20 T20-B — Operations Shell: Single Topbar Host on `/operations/*`

> **Status**: `[x]` Review ready (S=100)  
> **Priority**: 🔴 P0  
> **Type**: `feature` + `remediation`  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: EPIC-20 §1 goals 1+5+6 + §7 T20-B — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`; root `AGENTS.md` Dashboard IA (exactly one hub topbar); `CLAUDE.md` Hard Rules #22–#23; `docs/guides/UI.md` §1.1; pattern from EPIC-19 `DashboardTopbar` / `ProvidersTopBar`  
> **Blocks**: **0088, 0089, 0090** (hard for chrome host + route tree; soft-blocks later T20-F… when they need shell mount)  
> **Depends on**: **0086** (hard — use frozen topbar ids + `buildOperationsPath` only)  
> **Parallelism**: `serializable` vs 0086; after 0086, **soft-serial** before 0088–0090 (they mount content under the shell)  
> **Review routing**: frontend-quality; independent Ops shell PR preferred  

---

## Objective

Replace Operations as a **card-only launchpad without in-hub topbar** with a **single Operations topbar shell** that hosts all `/operations/{id}` peers (10 ids from 0086). Cards may remain as **optional home content under the default tab**, not as a second navigation chrome layer.

**Done when:**

1. Canonical routes exist under **`/operations/*`** (App Router) for at least the hub + all 10 topbar ids (content may be placeholders / re-exports until 0088–0090 + later slices fill them).  
2. **Exactly one** Operations topbar strip mounts on every `/operations/*` surface (`data-operations-topbar` or equivalent test id).  
3. Active peer highlights match 0086 ids; clicking peers navigates via `buildOperationsPath` only.  
4. Legacy `/dashboard/operations` redirects to hub default (0086 builder).  
5. Primary sidebar **Operations** leaf stays **one** leaf; active state for all `/operations/*` (coordinate with route match helpers / 0084-style matchers if present).  
6. Anti-phantom unit test: topbar mount count **≤ 1** on Ops routes; **0** stacked second PageTabBar/subnav as hub chrome.

---

## Background Context

### O que já existe:

- Hub page: `src/app/(dashboard)/dashboard/operations/page.tsx` + `OperationsHubClient.tsx` — renders `OPERATIONS_HUB_GROUPS` cards only.  
- Reverse chrome D1 (0076): destinations do **not** mount Ops reverse strip; policy was launchpad-only — **superseded for Ops self-chrome** by EPIC-20 (Ops gains its **own** topbar, not reverse chrome on old `/dashboard/*` pages).  
- Gold single-topbar patterns:  
  - `src/app/(dashboard)/home/DashboardTopbar.tsx` (`data-dashboard-topbar`)  
  - `src/app/(dashboard)/dashboard/providers/components/ProvidersTopBar.tsx`  
  - Observe hub strip on activity  
- Path builders: **0086** SSoT module (must exist before this task).  
- Sidebar leaf: `operations` → still `/dashboard/operations` until this task retargets href to `/operations` (or dual-write redirect).

### O que está faltando / quebrado:

- No `/operations` route tree.  
- No Operations topbar component.  
- Hub is discoverability-only cards → operator cannot see 10 peers as chrome.  
- Risk of reintroducing multi-topbar if shell + PageTabBar + cards-as-nav all stack (EPIC-19 0081 lesson).

### Chrome law (non-negotiable)

| Surface | Allowed chrome | Forbidden |
|---------|----------------|-----------|
| `/operations` and `/operations/{id}` | **One** Operations topbar (10 peers) | Second hub strip, Endpoint sub-topbar, MCP/A2A protocol strip as hub chrome |
| Default tab content | Optional cards / overview blocks **as content** under topbar | Cards that act as a second L1 nav replacing the topbar |
| Legacy `/dashboard/*` until fused | May keep own page chrome until 0088–0090 rehome | Mounting Operations topbar **and** full old dual strips without a plan |

### Explicitly out of scope:

- Endpoint Keys+Catalog fusion body (→ **0088**).  
- CoreMCP rename/content (→ **0089**).  
- Agents CLI fusion (→ **0090**).  
- Full Labs/Media/Integrations fusions (later T20).  
- Traffic → Observe (T20-M).  
- Retiring Testing hub product content beyond ensuring shell peer `labs` exists as mount point.

### Collision notes:

- **0086**: read-only after green; do not redefine ids.  
- **0088–0090**: own page **body** under shell; they must **import** shell topbar (or rely on layout) — do not invent second strips. Prefer `src/app/(dashboard)/operations/layout.tsx` mounting topbar once.  
- **0076 reverse-chrome tests**: update only if they incorrectly forbid Ops self-topbar; do not reintroduce reverse strips on all legacy destinations.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086** hard |
| **Blocks** | **0088, 0089, 0090** hard (need shell + routes); soft-blocks later T20 content slices |
| **File ownership (exclusive)** | New `src/app/(dashboard)/operations/**` tree (layout + pages); `OperationsTopbar` (or name consistent with DashboardTopbar); hub client rework under Ops; redirect shell for `/dashboard/operations`; sidebar Operations `href` retarget; tests `tests/unit/ui/epic20-operations-shell-0087.test.ts` |
| **Do not touch** | Endpoint dual-strip kill (0088); mcp page rename (0089); cli-agents/cli-code fusion (0090); PRIMARY_SIDEBAR_ITEMS **leaf count** (no new leaves — only href/active match) |
| **Collision vs live lanes** | Serializable after 0086; 0088–0090 must wait for layout topbar contract |
| **parallel-safe** | **No** vs 0088–0090 on layout/topbar files. Safe vs non-Ops work |

---

## Test Requirements

- DEVE existir layout/host such that every `/operations/{id}` page family mounts **exactly one** element matching Operations topbar test id  
- DEVE listar os **10** peers from 0086 with correct labels (CoreMCP not “MCP Server” as peer label)  
- DEVE navegar peers via `buildOperationsPath` (source assert or import)  
- DEVE redirecionar `/dashboard/operations` → hub default builder  
- DEVE manter **0 new primary leaves** (`PRIMARY_SIDEBAR_ITEMS.length` unchanged; no labs/mcp leaf)  
- DEVE assertir sidebar Operations active for `/operations` and `/operations/endpoints` (and preferably all ids) via route-match helper  
- DEVE anti-phantom: grep/source or unit test proves no dual mount of OperationsTopbar + PageTabBar hub strip on shell routes  
- NÃO DEVE stack card groups as a second topbar; if cards remain, they are content under default peer only  
- NÃO DEVE implement full Endpoint/CoreMCP/Agents fusion content (stubs OK with “owned by 0088–0090” comment)

---

## Exit Conditions (GDD/TDD)

- [x] `/operations` route tree + layout with **single** Operations topbar  
- [x] All 10 peer routes resolve (placeholder content allowed except where already wired)  
- [x] `/dashboard/operations` redirects via 0086 builder  
- [x] Sidebar Operations href + active-state cover `/operations/*`  
- [x] Anti-phantom unit test passes: `node --import tsx/esm --test tests/unit/ui/epic20-operations-shell-0087.test.ts`  
- [x] Optional hub cards only under default tab as content (documented)  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados (eslint on shell + match helpers — exit 0, reviewer 2026-07-20)  
- [x] Completion Evidence com matrix de chrome (route → topbar count = 1)  

---

## Details

### What

Subtasks:

- [ ] **Ler código existente**: 0086 SSoT module + tests; EPIC-20 §1–2, §5; `operations/page.tsx`, `OperationsHubClient.tsx`, `operationsHub.ts`; `DashboardTopbar.tsx`, `ProvidersTopBar.tsx`; `sidebarVisibility.ts` operations item; `sidebar-route-match` tests; `ops-testing-reverse-chrome-0076.test.ts`; App Router layout patterns under `(dashboard)`  
- [ ] Create `operations` App Router segment + layout mounting **one** topbar  
- [ ] Implement `OperationsTopbar` from 0086 ids only  
- [ ] Default hub content (cards optional) under default topbar id  
- [ ] Redirect `/dashboard/operations` → builder  
- [ ] Retarget sidebar leaf href; active match for `/operations/*`  
- [ ] Stub peer pages for ids not yet fused (0088–0090 fill endpoints/core-mcp/agents)  
- [ ] TDD anti-phantom + redirect + peer count tests  
- [ ] **Refactoring pass**: prefer layout-level topbar; pages export content only  
- [ ] **Verificação de regressão**: shell tests + typecheck + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` | Ler |
| `docs/tasks/01-open/0086-omniroute-epic20-ssot-operations-topbar-paths.md` | Ler — contract |
| `src/shared/constants/epic20Operations.ts` (0086 name) | Ler — builders/ids |
| `src/app/(dashboard)/operations/layout.tsx` | **Criar** — single topbar host |
| `src/app/(dashboard)/operations/**/page.tsx` | **Criar** — hub + 10 peers (stubs OK) |
| `src/app/(dashboard)/operations/OperationsTopbar.tsx` (or shared/) | **Criar** |
| `src/app/(dashboard)/dashboard/operations/page.tsx` | Modificar → redirect shell |
| `src/app/(dashboard)/dashboard/operations/OperationsHubClient.tsx` | Reuse as content under default tab if kept |
| `src/shared/constants/sidebarVisibility.ts` | Modificar — operations `href` only |
| `src/shared/utils/` route match helpers if present | Modificar — `/operations/*` active |
| `tests/unit/ui/epic20-operations-shell-0087.test.ts` | **Criar** |
| `tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts` | Ler / adjust only if false-fail |

### How

1. Confirm 0086 exports green.  
2. Add `(dashboard)/operations/layout.tsx` that renders **only** OperationsTopbar + `{children}`.  
3. Implement topbar peers from `OPERATIONS_TOPBAR_IDS`; `data-operations-topbar`.  
4. Pages for each id; default id shows optional card content (not a second strip).  
5. Redirect legacy hub; update sidebar href.  
6. Active-state tests; anti-phantom mount count.  
7. Leave Endpoint/MCP/CLI bodies for 0088–0090.  

### Why

Hierarchy must be **sidebar (Operations) → one topbar → collapsibles**. Without the shell, fusions reattach to orphan `/dashboard/*` pages and recreate multi-topbar chaos.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent topbar peers beyond 0086’s 10 ids.  
> DO NOT mount DashboardTopbar / CostsSubnav / Endpoint tab strip as Ops hub chrome.  
> DO NOT add primary sidebar leaves.  
> DO NOT claim Endpoint fusion complete — only shell + stubs.  
> DO NOT reintroduce reverse-chrome strips on all legacy destinations “for consistency.”  
> DO NOT mark complete without anti-phantom test evidence (mount ≤ 1).

> [!IMPORTANT]
> Read EVERY file in Where before writing.  
> If 0086 incomplete, **stop** — blocker.  
> Prefer layout topbar so 0088–0090 cannot accidentally double-mount.  
> Cards = content, never a second L1.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Routes grepped / exercised  
- [ ] **Zod Validation**: N/A for chrome shell  
- [ ] **Security**: No secrets  
- [ ] **Error Sanitization**: N/A  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: Redirect legacy hub; do not delete card client without reuse  
- [ ] **Chrome law (HR #22)**: Exactly one Operations topbar; anti-phantom test  
- [ ] **Self-evident paths (HR #23)**: Live `/operations/{id}`  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **CREATE** `src/app/(dashboard)/operations/layout.tsx` — single topbar host
  - **CREATE** `src/app/(dashboard)/operations/OperationsTopbar.tsx` — 10 peers from 0086 SSoT
  - **CREATE** `src/app/(dashboard)/operations/page.tsx` — hub root content
  - **CREATE** `src/app/(dashboard)/operations/[segment]/page.tsx` — 10 peer routes (stubs)
  - **CREATE** `src/app/(dashboard)/operations/OperationsHubClient.tsx` — cards as content
  - **CREATE** `src/app/(dashboard)/operations/OperationsSegmentPlaceholder.tsx`
  - **MODIFY** `src/app/(dashboard)/dashboard/operations/page.tsx` → redirect via `buildOperationsHubPath()`
  - **MODIFY** `src/app/(dashboard)/dashboard/operations/OperationsHubClient.tsx` → re-export
  - **MODIFY** `src/shared/constants/sidebarVisibility.ts` — ops href `/operations`
  - **MODIFY** `src/shared/utils/sidebarRouteMatch.ts` — legacy `/dashboard/operations` alias
  - **MODIFY** `src/shared/components/Header.tsx` — title match for `/operations/*`
  - **CREATE** `tests/unit/ui/epic20-operations-shell-0087.test.ts`
  - Related test href updates (0059, 0060, 0076, sidebar-*)
- **Chrome matrix (route → topbar count)**:
  | Route | Topbar mount |
  |-------|--------------|
  | `/operations` (layout) | 1 (`OperationsTopbar` in layout only) |
  | `/operations/{id}` ×10 | 1 (same layout; pages mount 0 topbars) |
  | page bodies / hub cards | 0 topbar chrome (content only) |
  | PageTabBar / CostsSubnav / DashboardTopbar on shell | 0 |
- **Testes**: `tests/unit/ui/epic20-operations-shell-0087.test.ts` + related sidebar/ops tests
- **Resultado dos testes**: 101/101 pass (`node --import tsx/esm --test` epic20-shell + matrix + sidebar-route-match + 0059/0060/0076/sidebar)
- **Resultado do lint / typecheck**: `npm run typecheck:core` exit 0
- **Agente executor**: gt-ts-engineer
- **Data de conclusão**: 2026-07-20  

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — move `02-doing` → `03-review`
- **Score (path to 100)**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-20-task-0087-epic20-shell-review.md`
- **Notas**: Single layout-hosted `OperationsTopbar` (10 peers from 0086); `/operations/*` routes; legacy redirect via `buildOperationsHubPath`; sidebar leaf + active for all peers; anti-phantom 14/14. Parallel EPIC-20 slices (0088+) may break older 0059/0076 inventory asserts — out of shell scope (EXTERNAL residual R4).
