# EPIC-24 — Combo Topology (Routing hub)

> **Status**: **Children open** — promoted 2026-07-22  
> **Priority**: **P1** (operator-requested; discoverability of nested combos)  
> **Type**: feature / UI  
> **Project**: omniroute-2  
> **Author**: architect-orchestrator  
> **Tagline**: See how combos nest — down to provider — as a graph under Routing.  
> **Depends on**: Routing hub chrome (`RoutingHubSubnav`), combo schema (incl. combo-ref, fusion judge/acting), shared `flow/*`  
> **Related**: Home `ProviderTopology` (visual inspiration only); Live studio is **runtime** cascade — do not overload  
> **Ideas seed**: `docs/tasks/00-planning/ideas.md` §2  
> **Harvest**: explore subagent 2026-07-22 (RoutingHub, ProviderTopology, comboStructure nesting)  

### Children

| ID | Slice | Path |
|----|-------|------|
| **0112** | T24-A Pure graph builder (TDD) | `docs/tasks/01-open/0112-omniroute-epic24-combo-topology-graph-builder.md` |
| **0113** | T24-B Routing page + dropdown + canvas | `docs/tasks/01-open/0113-omniroute-epic24-combo-topology-ui-route.md` |
| **0114** | T24-C Hub chrome matrix + polish | `docs/tasks/01-open/0114-omniroute-epic24-combo-topology-hub-tests-polish.md` |

**Gate:** **0112 first** (fail-first pure tests). **0113** after graph API freezes. **0114** can finish with 0113 or immediately after.

---

## 1. Goals

### Problem

Operators configure nested combos (`combo-ref` → combo → model → provider) and fusion panels/judge/acting. Text lists and editors do not show the **structure**. Provider Topology on `/home` shows pools, not policy. Live studio shows **runtime** cascade, not config expansion.

### Value

- Dropdown under Routing topbar: pick **one combo** or **All**
- Graph: combo → steps (model | combo-ref) → nested combos → **provider** leaves  
- Account/`connectionId` badges optional (P2)  
- View-only; edit stays in Combos/Fusions editors  

### Success metrics

| Metric | Target |
|--------|--------|
| Peer topbar item **Topology** | Single `RoutingHubSubnav` chrome; active state correct |
| Dropdown | Lists combos from `GET /api/combos` + **All** |
| Nested combo-ref | Expanded up to runtime depth default (3); cycles not infinite |
| Model → provider | Provider node from `providerId` / model prefix |
| All mode | Forest of roots (not one forced mega-hub) |
| No dual topbar | Anti-phantom matrix |
| Pure builder tests | Cycle, depth, empty, single, all |

### Stop criteria (MVP)

- No WS / live pulse required  
- No in-canvas editing  
- No new sidebar leaf  
- Account nodes not required  
- Not a Live Studio replacement  

---

## 2. Locked product decisions

| # | Decision |
|---|----------|
| **D1** | Peer item on **Routing** hub topbar (`RoutingHubSubnav`), not sidebar leaf |
| **D2** | Route MVP: `/dashboard/combos/topology` (mirror Live); future rename `/routing/topology` ok later |
| **D3** | Control under hub topbar: `<select>` combo list + **All** (`value=""` or `"all"`) |
| **D4** | Graph is **config structure**, not live traffic (Live remains runtime) |
| **D5** | Expand combo-refs with same depth/cycle rules as runtime flatten defaults (`maxComboDepth` 3, visited set) |
| **D6** | P0 leaves = **provider**; `connectionId` = badge or dashed edge only if cheap, else Phase 2 |
| **D7** | Fusion: include `judge` + `acting` as role-labeled branches off root combo when present |
| **D8** | Reuse `FlowCanvas` + `edgeStyles`; new node components (combo / model / provider) |
| **D9** | URL optional `?combo=<id\|name\|all>` for shareable focus |
| **D10** | Single hub topbar only — no stacked subnavs |

---

## 3. Node / edge model (MVP)

**Nodes:** `combo` | `model` | `provider` (combo-ref expands into target combo node, not a permanent kind)

**Edges:**

| Edge | Meaning |
|------|---------|
| combo → model | Step in `models[]` (order label optional) |
| combo → combo | Nested `combo-ref` |
| model → provider | Served-by |
| combo → model/combo | Judge / acting (label `judge` / `acting`) |

**All:** one disconnected component per non-hidden root combo (or all listed combos).

---

## 4. Architecture notes

- Pure module: `comboTopologyGraph.ts` (or under `src/lib/combos/`) — no React  
- Data: `GET /api/combos` client-side; expand using in-memory map name→combo  
- Align expansion with `validateComboDAG` / nested resolve spirit (`src/lib/combos` / open-sse comboStructure) — do not call live routing  
- Distinct from `comboFlowModel.ts` (Live request cascade)

---

## 5. Epic DoD

- [ ] 0112–0114 done + reviewed  
- [x] Topology usable for a nested combo-ref chain down to provider  
- [x] Hub matrix green  
- [x] Changelog ledger entry  
- [x] ideas.md §2 points to this epic  

---

**Author**: architect-orchestrator · **Date**: 2026-07-22
