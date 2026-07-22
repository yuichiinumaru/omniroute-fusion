# Task 0090: EPIC-20 T20-E — Agents Fusion (CLI Agents + CLI Code) + Grid/List + Kill Top Explainers

> **Status**: `[x]` Implemented — reviewed 2026-07-20 (score **100**; path-to-100 applied; 03-review)
> **Priority**: 🔴 P0  
> **Type**: `feature` + `remediation`  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: EPIC-20 §2 topbar #3 `agents` + §3 fusion pattern + §7 T20-E — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`; `AGENTS.md` Dashboard IA; `CLAUDE.md` #22–#23; UI.md §1.1  
> **Blocks**: none hard  
> **Depends on**: **0086** hard; **0087** hard (shell + `/operations/agents` host)  
> **Parallelism**: **`parallel-safe` vs 0088 and 0089`** with exclusive file ownership; serializable vs 0086/0087  
> **Review routing**: frontend-quality; independent Agents fusion PR  

---

## Objective

Fuse **CLI Agents** and **CLI Code** into one Operations peer **Agents** at **`/operations/agents`** as a **vertical collapsible stack**, remove **top** explainer/concept/comparison cards (move to bottom, default collapsed), and add a **grid vs list** view toggle for tool cards.

**Done when:**

1. `/operations/agents` shows fused content: **CLI Agents block → CLI Code block** (vertical collapsibles; both default expanded for work surface).  
2. **Exactly one** Operations topbar (0087) — no Agents-only second topbar; no dual page headers acting as chrome.  
3. Top-of-page `CliConceptCard` / `CliComparisonCard` (and similar explainers) **removed from top**; if retained, **bottom + default collapsed**.  
4. **Grid vs list** toggle controls tool presentation for both blocks (shared control preferred).  
5. Legacy redirects: `/dashboard/cli-agents`, `/dashboard/cli-code` → 0086 `buildOperationsPath("agents")` (preserve detail routes `/dashboard/cli-agents/[id]`, `/dashboard/cli-code/[id]` via redirect to stable detail paths or nested under `/operations/agents/...` — **pick one shape**, no “or” in Completion Evidence).  
6. Anti-phantom tests + **0 new primary leaves**.

---

## Background Context

### O que já existe:

- CLI Agents: `dashboard/cli-agents/page.tsx` + `CliAgentsPageClient.tsx` — filters, **grid** of `CliToolCard`, **top** `CliConceptCard` + `CliComparisonCard`.  
- CLI Code: `dashboard/cli-code/page.tsx` + `CliCodePageClient.tsx` — filters, grid, same concept/comparison cards pattern, shared tool cards under `cli-code/components/`.  
- Detail routes: `cli-agents/[id]`, `cli-code/[id]` → `ToolDetailClient`.  
- Catalog: `CLI_TOOLS` + schemas `cliCatalog`.  
- Ops hub cards deep-link both pages separately.  
- Shell: **0087** stub `/operations/agents`.

### O que está faltando / quebrado:

- Two near-duplicate pages for agent vs code CLI categories.  
- Permanent non-collapsible explainer wall at **top** (violates Epic §3 / operator law).  
- No list layout option (operator requested grid vs list).  
- Not under self-evident `/operations/agents`.

### Fusion pattern (locked)

| Order | Block | Source |
|-------|-------|--------|
| 1 | CLI Agents | agent-category tools from `CLI_TOOLS` |
| 2 | CLI Code | code-category tools |

- Shared toolbar: search/filters as appropriate (may stay per-block if simpler; document choice).  
- **Grid | List** toggle (persist optional: localStorage key documented).  
- Explainers (`CliConceptCard`, `CliComparisonCard`) → **bottom**, collapsible, **default collapsed**.  
- Cloud Agents / ACP / Bridge are **other topbar peers** — do **not** fuse here.

### Detail route freeze (mandatory one shape)

Pick and encode in tests (example — executor may match existing App Router constraints):

| Preferred | Canonical detail |
|-----------|------------------|
| A (recommended) | Keep `/dashboard/cli-agents/[id]` and `/dashboard/cli-code/[id]` working (no break deep links); list page only fuses at `/operations/agents` |
| B | Nest `/operations/agents/{agent\|code}/[id]` + redirect old detail URLs |

Completion Evidence must state **A or B** once — no dual claim.

### Explicitly out of scope:

- Cloud Agents reform (T20-F).  
- A2A/ACP Bridge (T20-G).  
- Endpoint / CoreMCP (0088/0089).  
- Changing CLI install/detection backend.  
- New primary leaves for CLI Agents/Code.

### Collision notes:

- **0087**: content under layout only.  
- **0088/0089**: disjoint file trees if no shared layout edits.  
- Shared components `CliConceptCard` / `CliComparisonCard` / `CliToolCard` — modify presentation props carefully; other pages may import them (grep first).

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086** hard; **0087** hard |
| **Blocks** | none hard |
| **File ownership (exclusive)** | `/operations/agents` fusion client; `cli-agents` + `cli-code` list `page.tsx` redirects; optional shared agents fusion module; grid/list UI; tests `tests/unit/ui/epic20-agents-fusion-0090.test.ts` |
| **Do not touch** | operations layout topbar (0087); endpoint/mcp trees (0088/0089); cloud-agents page product; PRIMARY leaf set |
| **Collision vs live lanes** | parallel-safe vs 0088/0089; watch shared `src/shared/components/cli/*` — if editing shared cards, note serial risk vs other CLI UI work |
| **parallel-safe** | **Yes vs 0088 and 0089** if cli/* exclusive; **serializable vs 0086/0087** |

---

## Test Requirements

- DEVE existir `/operations/agents` com two collapsible sections (Agents then Code)  
- DEVE montar **exactly one** Operations topbar  
- DEVE NÃO renderizar concept/comparison cards at page **top** in expanded non-collapsible form  
- DEVE oferecer toggle **grid vs list** and switch layout class/structure (source or DOM test)  
- DEVE redirecionar `/dashboard/cli-agents` and `/dashboard/cli-code` list pages → agents builder  
- DEVE preservar detail navigation for tools (frozen A or B)  
- DEVE assertir **0 new primary leaves**  
- DEVE manter tool cards functional (detection refresh still works)  
- NÃO DEVE fuse Cloud Agents / ACP into this page  

---

## Exit Conditions (GDD/TDD)

- [x] Fusion page complete at `/operations/agents`  
- [x] Top explainers removed or bottom+collapsed default  
- [x] Grid/list toggle working for tool presentation  
- [x] Legacy list redirects via 0086 builders  
- [x] Detail route strategy frozen (A or B) + tests  
- [x] Anti-phantom tests: `node --import tsx/esm --test tests/unit/ui/epic20-agents-fusion-0090.test.ts`  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados  
- [x] Completion Evidence with chrome matrix + detail strategy  

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: EPIC-20 §2–3 Agents row; 0086 builders; 0087 agents stub; `CliAgentsPageClient.tsx`; `CliCodePageClient.tsx`; `shared/components/cli/*` (concept/comparison/tool cards); detail `[id]` pages; `CLI_TOOLS` / `cliCatalog`; ops hub links  
- [x] Build fused Agents page under `/operations/agents`  
- [x] Vertical collapsibles Agents → Code  
- [x] Move explainers bottom + default collapsed  
- [x] Implement grid/list toggle (shared)  
- [x] Redirect list pages; freeze detail strategy  
- [x] Retarget hub/palette hrefs  
- [x] TDD chrome + redirect + toggle + explainer placement  
- [x] **Refactoring pass**: extract shared list logic; avoid duplicating two full clients forever  
- [x] **Verificação de regressão**: 0090 tests + shell regression + typecheck + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` | Ler |
| `src/shared/constants/epic20Operations.ts` | Ler |
| `src/app/(dashboard)/operations/agents/page.tsx` | Modificar — fusion body |
| `src/app/(dashboard)/operations/agents/AgentsFusionClient.tsx` (name may vary) | **Criar** |
| `src/app/(dashboard)/dashboard/cli-agents/page.tsx` | Redirect shell |
| `src/app/(dashboard)/dashboard/cli-agents/CliAgentsPageClient.tsx` | Extract/reuse |
| `src/app/(dashboard)/dashboard/cli-code/page.tsx` | Redirect shell |
| `src/app/(dashboard)/dashboard/cli-code/CliCodePageClient.tsx` | Extract/reuse |
| `src/app/(dashboard)/dashboard/cli-agents/[id]/page.tsx` | Per frozen strategy |
| `src/app/(dashboard)/dashboard/cli-code/[id]/page.tsx` | Per frozen strategy |
| `src/shared/components/cli/**` | Collapsible explainer defaults / list layout support |
| `src/shared/constants/operationsHub.ts` | Retarget agents cards |
| `tests/unit/ui/epic20-agents-fusion-0090.test.ts` | **Criar** |

### How

1. Confirm 0086/0087 green.  
2. Compose fusion client from existing agent/code filters + cards.  
3. Collapsibles + bottom explainers.  
4. Grid/list toggle.  
5. Redirects + detail freeze.  
6. Anti-phantom tests.  

### Why

Two CLI list pages + top explainer walls are the opposite of self-evident Ops navigation. One Agents peer with collapsibles + density toggle matches operator law and Epic matrix.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT keep permanent expanded concept/comparison cards at the top.  
> DO NOT add a second Agents topbar or PageTabBar for agent vs code (collapsibles only).  
> DO NOT fuse Cloud Agents / ACP / Bridge into this peer.  
> DO NOT invent paths outside 0086.  
> DO NOT double-mount OperationsTopbar.  
> DO NOT add primary sidebar leaves for CLI Agents or CLI Code.  
> DO NOT leave dual detail strategies undocumented.  
> DO NOT mark complete without anti-phantom + redirect + toggle evidence.

> [!IMPORTANT]
> Read EVERY file in Where before writing.  
> Grep all `CliConceptCard` / `CliComparisonCard` consumers before changing defaults.  
> Prefer reuse of `CliToolCard` over rewriting install UX.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Paths grepped  
- [x] **Zod Validation**: N/A  
- [x] **Security**: No secrets  
- [x] **Error Sanitization**: N/A  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: Redirect list pages; keep detail clients  
- [x] **Chrome law (HR #22)**: Exactly one Ops topbar; explainers collapsed at bottom  
- [x] **Self-evident paths (HR #23)**: `/operations/agents` + legacy redirects  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Criados**: `src/app/(dashboard)/operations/agents/page.tsx`, `AgentsFusionClient.tsx`; `tests/unit/ui/epic20-agents-fusion-0090.test.ts`
  - **Redirect shells**: `dashboard/cli-agents/page.tsx`, `dashboard/cli-code/page.tsx` → `buildOperationsPath("agents")`
  - **Shared UI**: `CliToolCard` `layout` prop; `CliConceptCard` / `CliComparisonCard` TYPE_HREFS → `/operations/agents#…`
  - **Retargets**: `operationsHub.ts`, `CommandPalette.tsx`, `ToolDetailClient` back, `AcpAgentsPageClient`, `UpstreamProxyCard`
  - **Tests updated**: operations-hub-0059, sidebar-tools-group, CliConcept/Comparison, AcpAgentsPage (client import post-0092)
- **Detail route strategy (A or B)**: **A** — list fused at `/operations/agents`; detail stays `/dashboard/cli-agents/[id]` + `/dashboard/cli-code/[id]` (no redirect on detail).
- **Chrome matrix**:
  | Route | Ops topbar | PageTabBar | Agents 2nd topbar | Explainers |
  |-------|------------|------------|-------------------|------------|
  | `/operations/agents` | 1 (layout) | 0 | 0 (collapsibles only) | bottom, `defaultOpen={false}` |
  | `/dashboard/cli-agents` list | n/a (redirect) | — | — | — |
  | `/dashboard/cli-code` list | n/a (redirect) | — | — | — |
  | detail `[id]` | legacy header only | 0 | 0 | n/a |
- **Grid/list proof**: Shared `agents-view-mode-control` radiogroup; `data-view-layout={viewMode}` on tool lists; `CliToolCard` `layout` + `data-layout`; persist key `omniroute.operations.agents.viewMode` via `useSyncExternalStore`.
- **Testes + output**:
  - `node --import tsx/esm --test tests/unit/ui/epic20-agents-fusion-0090.test.ts` → **11/11 pass**
  - related: sidebar-tools-group + operations-hub-discoverability → pass
  - vitest UI: CliConceptCard, CliComparisonCard, CliToolCard, AcpAgentsPage → **32/32 pass**
- **typecheck / lint**: `npm run typecheck:core` clean; eslint on touched files clean (no new errors)
- **Agente executor**: gt-ts-engineer
- **Data de conclusão**: 2026-07-20

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — `03-review`
- **Score (path to 100)**: **100/100** (was 93; residuals applied same session)
- **Report**: `docs/reports/reviews/2026-07-20-task-0090-omniroute-epic20-agents-fusion.md`
- **Notas**:
  - Contract green: Agents→Code fusion; explainers bottom collapsed; grid/list; strategy **A**; single topbar.
  - Path-to-100 applied: i18n fusion chrome (`fusionPageTitle`, viewMode*, explainers*, code empty/count); `@deprecated` on orphan list clients; Header `/operations/agents` peer; tests 13/13 green.
