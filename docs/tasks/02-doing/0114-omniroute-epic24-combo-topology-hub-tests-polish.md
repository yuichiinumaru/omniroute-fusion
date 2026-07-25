# Task 0114: EPIC-24 T24-C — Hub discoverability tests + polish

> **Status**: `[~]` In Progress  
> **Priority**: 🟢 P2  
> **Type**: `testing` + `feature` polish  
> **Origin**: EPIC-24 · anti-phantom chrome + docs  
> **Depends on**: **0113** (route + subnav id exist)  
> **Parallelism**: after 0113  
> **Review routing**: frontend-quality  

---

## Objective

Lock Routing hub discoverability for Topology (single topbar, peer matrix, no dual chrome), minor UX polish (empty copy, a11y labels), and point docs/ideas at shipped surface. No new product scope (no accounts/live).

---

## Background Context

### Precedents:
- `tests/unit/*routing-hub*`, `fusions-routing-hub-matrix*`, epic19/20 chrome gates  
- EPIC-24 D1/D10  

---

## Test Requirements

- [x] Topology appears in RoutingHubSubnav LINKS with expected href  
- [x] Mounting topology page yields **one** `[data-routing-hub-subnav]`  
- [x] Active id is topology when on that route  
- [x] Command palette includes topology entry (if pattern tested elsewhere)  
- [x] Graph builder still green from 0112  

---

## Exit Conditions

- [x] Hub/chrome unit tests PASS  
- [x] `ideas.md` §2 links EPIC-24 / tasks  
- [x] Optional one-liner in `docs/guides/UI.md` peer list if docs-sync expects it  
- [x] Changelog ledger  
- [x] Epic-24 DoD checklist updated when this ships  

---

## Details

### What

Subtasks:
- [x] **Ler** existing hub matrix tests; 0113 route  
- [x] Extend or add `tests/unit/ui/*combo-topology*` / routing hub matrix  
- [x] a11y: dropdown `aria-label`, nav already labeled  
- [x] Polish empty states if gaps  
- [x] Update `ideas.md`  
- [x] **Regressão**  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `tests/unit/ui/*` hub matrix | **Modificar/Criar** |
| `docs/tasks/00-planning/ideas.md` | **Modificar** |
| `docs/guides/UI.md` | **Modificar** if needed |
| `docs/tasks/00-planning/EPIC-24-*.md` | **Modificar** status when done |

### How

Copy epic20/19 chrome test style: render shell, query subnav links, assert count ≤ 1 hub strip.

### Why

Prevents multi-topbar regression and documents discoverability.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT expand MVP to live WS or account nodes.  
> PORT 21000 = production.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: grepped paths  
- [x] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence

- **Arquivos**:
  - `tests/unit/ui/routing-hub-discoverability-0025.test.ts` (modified)
  - `tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` (modified)
  - `tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts` (created)
  - `docs/guides/UI.md` (modified)
  - `.changelog/20260725-140000-0114-epic24-combo-topology-hub-tests-polish-builders.md` (created)
  - `docs/tasks/00-planning/EPIC-24-omniroute-combo-topology.md` (modified)
- **Testes**:
  - `node --import tsx/esm --test tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts` (5 PASS)
  - `node --import tsx/esm --test tests/unit/ui/routing-hub-discoverability-0025.test.ts` (14 PASS)
  - `node --import tsx/esm --test tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` (5 PASS)
  - `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts` (12 PASS)
  - `node --import tsx/esm --test tests/unit/ui/combo-topology-ui-route-0113.test.ts` (13 PASS)
  - `npm run typecheck:core` (PASS)
  - `npx eslint --max-warnings=0 tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts tests/unit/ui/routing-hub-discoverability-0025.test.ts tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` (PASS, 0 errors, 0 warnings)
- **Changelog**: `.changelog/20260725-140000-0114-epic24-combo-topology-hub-tests-polish-builders.md`
- **Agente**: gt-ts-engineer
- **Data**: 2026-07-25  

---

## 🔍 Review Trail

- **Reviewer**:  
- **Veredito**:  
