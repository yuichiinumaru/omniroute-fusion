# Task 0095: EPIC-20 T20-J — Memory Single Page (Kill memories/engine/playground Topbar)

> **Status**: `[x]` Implemented — review accepted 100 (2026-07-20)
> **Priority**: 🔴 P0
> **Type**: `feature` + `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-20 §2 locked topbar #8 `memory`; §3 fusion; §5 path matrix (`/operations/memory`, legacy `/dashboard/memory` + tabs); AGENTS.md Hard Rules #22–#23
> **Blocks**: soft-helps T20-O chrome matrix
> **Depends on**: **0086** hard; **0087** hard. **Do not start until 0086 completed**, or same wave with freeze (0086 first).
> **Parallelism**: `parallel-safe` vs **0091–0094**; **serializable** after **0086/0087**
> **Review routing**: independent Memory PR

---

## Objective

Convert Memory into a **single Operations peer page** that **kills the in-page tab topbar** (`memories` | `engine` | `playground`) and stacks content vertically with collapsibles; explainers bottom collapsed.

**Surfaces (locked):**

| Role | Path |
|------|------|
| Canonical | `/operations/memory` (0086) |
| Legacy | `/dashboard/memory`, `/dashboard/memory?tab=memories|engine|playground` → canonical (+ optional section anchors per 0086) |

**Vertical stack (recommended product order — confirm against operator screenshots if conflict, else use):**

1. **Memories** (browse/manage) — primary work surface, default expanded  
2. **Engine** (status/config) — collapsible  
3. **Playground** (retrieve preview) — collapsible  

(If epic text only says “stack content” without order, prefer **Memories → Engine → Playground** matching historical default tab `memories` first. Document final order in Completion Evidence.)

**Done when:**

1. **No** tab strip (`data-testid` `tab-memories` / `tab-engine` / `tab-playground` chrome) as L1 navigation.
2. All three former tabs’ content reachable on one scroll via collapsibles/sections.
3. `MemoryConceptCard` / top explainers → **bottom**, collapsible, **default collapsed**.
4. Memory enable toggle remains reachable (header or Engine section — document placement).
5. Legacy `?tab=` URLs redirect or map to section without keeping tab bar UI.
6. Only Ops hub peer `memory`; anti-phantom ≤1 Ops topbar.
7. Tab components re-homed as sections — not deleted.
8. Tests: no tab chrome, stack markers, redirects, anti-phantom, no-new-leaf.

**Out of this task:** Memory backend (FTS5/Qdrant), Labs playground (chat), Integrations, new memory product features.

---

## Background Context

### O que já existe:

- Page: `src/app/(dashboard)/dashboard/memory/page.tsx` — `TabId = "memories" | "playground" | "engine"`; `TABS` order memories/engine/playground; pill tab bar with `data-testid={`tab-${tab}`}`; concept card **top**; enable switch beside tabs.
- Tabs: `components/tabs/MemoriesTab.tsx`, `EngineTab.tsx`, `PlaygroundTab.tsx`.
- Hooks: `useMemorySettings`, `useEngineStatus`.
- Concept: `MemoryConceptCard.tsx`.
- Hub: `operationsHub.ts` → `/dashboard/memory`.
- Docs: `docs/frameworks/MEMORY.md` (read-only unless path update required residual).

### O que está faltando / quebrado:

- In-page **tab topbar** is a second chrome layer under Ops (Hard Rule #22 violation once Ops has hub topbar).
- EPIC explicitly: **kill** apocryphal memories/engine/playground topbar.
- No `/operations/memory` canonical pilot path.

### Explicitly out of scope:

- Changing retrieval algorithms, embedding providers, Qdrant install flow logic (UI re-home only).
- Merging with Cache memory cards (`dashboard/cache`) — different product.
- Chat Playground Labs (T20-K).

### Collision notes:

- **0091–0094**: disjoint.
- **0086**: owns path builders including `?tab=` legacy mapping for memory.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086** hard · **0087** hard |
| **File ownership (exclusive)** | `dashboard/memory/**` chrome reform; canonical operations memory route; tests `tests/unit/ui/epic20-memory-single-page-0095.test.ts` |
| **Do not touch** | cache/media, labs playground, integrations, skills |
| **parallel-safe** | Yes vs 0091–0094 |
| **serializable** | After 0086/0087 |

---

## Test Requirements

- DEVE **não** montar tab navigation strip for memories/engine/playground as L1 (assert absence of tab switcher pattern / former `tab-*` testids as exclusive nav — sections may reuse testids only if not tab buttons)
- DEVE empilhar Memories → Engine → Playground (or recorded order) com collapsibles/`data-section`
- DEVE mover `MemoryConceptCard` (or equivalent explainer) para bottom `defaultOpen={false}`
- DEVE redirecionar `/dashboard/memory` e `?tab=` variants → 0086 memory builder (preserve deep section if 0086 defines hash/query)
- DEVE manter enable toggle functional
- DEVE ≤1 Ops hub topbar; no-new-leaf
- DEVE re-home tab modules as section content (files exist, imported)
- NÃO DEVE keep dual chrome: Ops topbar + Memory tab topbar
- NÃO DEVE invent memory APIs

---

## Exit Conditions (GDD/TDD)

> npm matrix only — no cargo.

- [x] Memory peer is single-scroll stack without memories/engine/playground tab topbar
- [x] Concept/explainer bottom collapsed by default
- [x] Legacy `/dashboard/memory` (+ `?tab=`) reach canonical via 0086
- [x] Anti-phantom ≤1 Ops topbar on Memory peer
- [x] Unit tests pass:
      `node --import tsx/esm --test tests/unit/ui/epic20-memory-single-page-0095.test.ts`
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`
- [x] Completion Evidence filled (final section order + enable-toggle placement)

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: EPIC-20; 0086/0087; `memory/page.tsx`; all three tabs; MemoryConceptCard; hooks; operationsHub memory row; Collapsible; any memory e2e/unit tests grepped
- [x] Confirm 0086 memory builders + `?tab=` redirect/map rows
- [x] Replace tab bar with stacked collapsible sections; import tab bodies
- [x] Move concept card to bottom collapsed
- [x] Place enable toggle without tab chrome dependency
- [x] Canonical route + legacy redirect
- [x] TDD no-tab-topbar + order + redirects + anti-phantom
- [x] **Refactoring pass**: page.tsx thin composition
- [x] **Verificação de regressão**: tests + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| EPIC-20 | Ler |
| 0086 SSoT / 0087 shell | Ler |
| `src/app/(dashboard)/dashboard/memory/page.tsx` | Modificar — kill tab topbar; single-scroll |
| `src/app/(dashboard)/dashboard/memory/components/tabs/*.tsx` | Ler / re-export as sections |
| `src/app/(dashboard)/dashboard/memory/components/MemoryConceptCard.tsx` | Mover uso para bottom collapsible |
| Canonical `operations/.../memory` | Criar per 0087 pattern |
| `src/shared/components/Collapsible.tsx` | Ler |
| `tests/unit/ui/epic20-memory-single-page-0095.test.ts` | Criar |
| Root `CHANGELOG.md` | Unreleased |

### How

1. Gate on 0086 memory path + tab query mapping.
2. Remove `TABS` button strip; render three sections always (collapsible).
3. `MemoriesTab` defaultOpen true; Engine/Playground configurable (document).
4. Concept card at bottom collapsed.
5. Legacy page becomes redirect or same component under dual path during pilot.
6. Tests assert **no** dual topbar and section presence.

### Why

Memory’s three-tab chrome becomes a second topbar under Operations reform. EPIC-20 explicitly kills that strip so Memory is one self-evident peer: sidebar → Ops topbar Memory → stacked content.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | 0091, 0092, 0093, 0094 |
| **serializable** | After 0086 + 0087 |
| **Collision** | None with sibling T20-F–I if trees exclusive |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT keep memories/engine/playground as PageTabBar or pill topbar L1.  
> DO NOT delete tab implementation modules — re-home.  
> DO NOT start without 0086.  
> DO NOT confuse with Labs Playground or Cache memory cards.  
> PORT 21000 = production.

> [!IMPORTANT]
> Hard Rule #22–#23: one Ops topbar peer; self-evident `/operations/memory`.  
> If `?tab=` deep links must survive, map via 0086 — do not freestyle query schemes.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Paths match 0086 + EPIC-20
- [ ] **Zod Validation**: Prefer parse for any new section query if added
- [ ] **Security**: Memory settings/API auth unchanged
- [ ] **Error Sanitization**: Preserve playground error paths
- [ ] **No Raw SQL**: N/A UI task
- [ ] **Archive Protocol**: Re-home tabs as sections

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos**:
  - `src/app/(dashboard)/dashboard/memory/MemoryPageClient.tsx` — single-scroll stack body
  - `src/app/(dashboard)/dashboard/memory/page.tsx` — legacy redirect via `buildOperationsPath("memory")`
  - `src/app/(dashboard)/operations/memory/page.tsx` — canonical peer mount
  - `src/shared/constants/operationsHub.ts` — hub card → `buildOperationsPath("memory")`
  - `src/shared/components/Header.tsx` — title meta covers `/operations/memory` + legacy
  - Tabs kept: `components/tabs/{Memories,Engine,Playground}Tab.tsx` (re-homed as sections)
  - Tests: `tests/unit/ui/epic20-memory-single-page-0095.test.ts`, `memory-page.test.tsx`; regression `v388-phase1/3`; e2e path/section updates
- **Section order**: **Memories** (`defaultOpen={true}`) → **Engine** (`defaultOpen={false}`) → **Playground** (`defaultOpen={false}`) → **Concept** bottom (`defaultOpen={false}`)
- **Enable toggle placement**: page header (top-right), independent of former tab chrome (`data-testid="memory-enabled-toggle"`)
- **Testes**:
  - `node --import tsx/esm --test tests/unit/ui/epic20-memory-single-page-0095.test.ts` → 11 pass
  - `npx vitest run --config vitest.config.ts tests/unit/ui/memory-page.test.tsx` → 4 pass
  - `tests/unit/v388-phase1-screen-fixes.test.ts` + `v388-phase3-memory.test.ts` → pass
  - `npm run typecheck:core` → clean
  - eslint on touched files → clean
- **Outputs**: no dual chrome (Ops layout topbar only + content collapsibles); no tab-* L1 buttons
- **Changelog**: root `CHANGELOG.md` `[Unreleased]` Added — Task 0095 / T20-J
- **Agente**: gt-ts-engineer (builders)
- **Data**: 2026-07-20

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — move `02-doing` → `03-review`
- **Score (path to 100)**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-20-task-0094-0095-0096-epic20-integrations-memory-labs-frontend-review.md`
- **Notas**: Tab topbar killed; Memories → Engine → Playground stack; concept bottom collapsed; enable toggle header; legacy redirect; 11/11 + vitest 4/4. Non-blocking: Header catch-all shadows peer-specific memory title entry.
