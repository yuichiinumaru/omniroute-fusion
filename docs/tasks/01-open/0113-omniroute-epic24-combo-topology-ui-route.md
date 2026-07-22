# Task 0113: EPIC-24 T24-B — Combo Topology UI route + dropdown + canvas

> **Status**: `[ ]` Open  
> **Priority**: 🟡 P1  
> **Type**: `feature`  
> **Origin**: EPIC-24 · Routing hub peer **Topology**  
> **Blocks**: practical usability; pairs with 0114 hub tests  
> **Depends on**: **0112** graph builder API frozen  
> **Parallelism**: after 0112; collision with `RoutingHubSubnav` vs 0114 (prefer 0113 owns subnav link)  
> **Review routing**: frontend-quality · single-topbar  

---

## Objective

Add Routing hub peer **Topology** at `/dashboard/combos/topology`: one `RoutingHubSubnav`, combo **dropdown** (including **All**) under the topbar, React Flow canvas rendering `buildComboTopologyGraph` via shared `FlowCanvas`. View-only.

---

## Background Context

### O que já existe:
- `RoutingHubSubnav` peers: Combos, Fusions, Live, Compression*  
- Live: `/dashboard/combos/live`  
- `FlowCanvas`, `edgeStyles`, `StatusDot`  
- `GET /api/combos`  
- Pure builder from 0112  

### O que falta:
- Route + client + dropdown + node components  
- Subnav + command palette entries  

---

## Test Requirements

- [ ] Page mounts with `data-routing-hub-subnav="topology"` (or agreed id)  
- [ ] Exactly one routing hub subnav (no second PageTabBar hub strip)  
- [ ] Dropdown includes All + combo names/ids from fetch  
- [ ] Changing selection rebuilds graph (assert via testid or pure re-call)  
- [ ] Optional: `?combo=` initializes selection  

(Hub matrix bulk assertions may land in 0114.)

---

## Exit Conditions

- [ ] Route works locally (builder worktree; smoke on 22000 only if operator deploys)  
- [ ] Subnav + palette discover Topology  
- [ ] Graph shows nested combo → provider for a fixture-like combo in unit/integration if feasible  
- [ ] `npm run typecheck:core` PASS  
- [ ] i18n en keys or English fallbacks via `tx` pattern  
- [ ] Changelog ledger  
- [ ] Hard Rules #22–23: single topbar  

---

## Details

### What

Subtasks:
- [ ] **Ler**: `RoutingHubSubnav`, `combos/live/page.tsx`, `FlowCanvas`, `ProviderTopology` node styling (inspiration), 0112 exports, CommandPalette routing extras  
- [ ] Extend `RoutingHubActive` + `LINKS` with `{ id: "topology", href: "/dashboard/combos/topology", label: "Topology", icon: "account_tree" }` (icon bikeshed ok)  
- [ ] CommandPalette peer entry  
- [ ] **Criar** `src/app/(dashboard)/dashboard/combos/topology/page.tsx` + `ComboTopologyClient.tsx`  
- [ ] Fetch `/api/combos`; dropdown under subnav; selection state + optional URL sync  
- [ ] Node components: ComboNode, ModelNode, ProviderNode (simple cards like ProviderTopology density)  
- [ ] Layout: layered or simple dag — must be readable for 5–30 nodes  
- [ ] Empty / loading / error states  
- [ ] **Refactoring pass**  
- [ ] **Regressão** typecheck + targeted tests  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/components/RoutingHubSubnav.tsx` | **Modificar** |
| `src/shared/components/CommandPalette.tsx` | **Modificar** |
| `src/app/(dashboard)/dashboard/combos/topology/page.tsx` | **Criar** |
| `src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx` | **Criar** |
| `src/app/(dashboard)/dashboard/combos/topology/*Node*.tsx` | **Criar** as needed |
| `src/shared/components/flow/*` | **Reusar** |
| `src/lib/combos/comboTopologyGraph.ts` | **Ler** / consume |
| `src/i18n/messages/en.json` | **Modificar** optional |
| `docs/guides/UI.md` | **Ler**; update peer list only if required by docs-sync |

### How

1. Shell: `RoutingHubSubnav` then toolbar row (`label` + `<select>`) then `flex-1` canvas.  
2. Default selection: **All** or first combo — prefer **All** for overview.  
3. Do not fetch providers list unless needed for icons; ProviderIcon by providerId ok.  

### Why

Operators asked for Routing topbar surface + combo picker; this is the product UI.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **Depends** | 0112 |
| **Collision** | `RoutingHubSubnav.tsx`, CommandPalette |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT add sidebar leaf. DO NOT stack second hub topbar.  
> DO NOT implement account graph as P0.  
> DO NOT deploy/mutate :21000.  

> [!IMPORTANT]
> Topology ≠ Live. Labels must not claim “live traffic” for MVP static config.

---

## 🛡️ Compliance Checklist

- [ ] **Zod**: N/A client display of API JSON  
- [ ] **Security**: management-auth same as other combo pages  
- [ ] **Doc Accuracy**: if UI.md peer list updated, match code  

---

## 📋 Completion Evidence

- **Arquivos**:  
- **Testes**:  
- **Manual smoke**:  
- **Changelog**:  
- **Agente**:  
- **Data**:  

---

## 🔍 Review Trail

- **Reviewer**:  
- **Veredito**:  
