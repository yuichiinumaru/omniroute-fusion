# Task 0114: EPIC-24 T24-C — Hub discoverability tests + polish

> **Status**: `[ ]` Open  
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

- [ ] Topology appears in RoutingHubSubnav LINKS with expected href  
- [ ] Mounting topology page yields **one** `[data-routing-hub-subnav]`  
- [ ] Active id is topology when on that route  
- [ ] Command palette includes topology entry (if pattern tested elsewhere)  
- [ ] Graph builder still green from 0112  

---

## Exit Conditions

- [ ] Hub/chrome unit tests PASS  
- [ ] `ideas.md` §2 links EPIC-24 / tasks  
- [ ] Optional one-liner in `docs/guides/UI.md` peer list if docs-sync expects it  
- [ ] Changelog ledger  
- [ ] Epic-24 DoD checklist updated when this ships  

---

## Details

### What

Subtasks:
- [ ] **Ler** existing hub matrix tests; 0113 route  
- [ ] Extend or add `tests/unit/ui/*combo-topology*` / routing hub matrix  
- [ ] a11y: dropdown `aria-label`, nav already labeled  
- [ ] Polish empty states if gaps  
- [ ] Update `ideas.md`  
- [ ] **Regressão**  

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

- [ ] **Doc Accuracy**: grepped paths  
- [ ] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence

- **Arquivos**:  
- **Testes**:  
- **Changelog**:  
- **Agente**:  
- **Data**:  

---

## 🔍 Review Trail

- **Reviewer**:  
- **Veredito**:  
