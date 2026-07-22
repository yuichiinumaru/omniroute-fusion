# Task 0112: EPIC-24 T24-A — Combo topology pure graph builder (TDD)

> **Status**: `[ ]` Open  
> **Priority**: 🟡 P1  
> **Type**: `feature` + `testing`  
> **Origin**: EPIC-24 Combo Topology · operator: Routing topbar + dropdown + nest to provider  
> **Blocks**: 0113 (UI consumes builder API)  
> **Depends on**: none  
> **Parallelism**: `serializable` as epic gate  
> **Review routing**: independent · unit contracts  

---

## Objective

Ship a **pure** function that turns combo records (+ selection) into React Flow–ready nodes/edges for structural topology: combo → (model | nested combo) → provider. Cover fusion judge/acting, depth/cycle guards, and **All** forest mode. No React, no API, no page.

---

## Background Context

### O que já existe:
- Nesting: `combo-ref`, `validateComboDAG`, depth defaults (`maxComboDepth` ~3) in combo structure modules  
- Steps: `src/lib/combos/steps.ts`, schema `comboModelEntry`  
- Live graph is **different**: `comboFlowModel.ts` (request cascade) — do not extend for this  
- Flow types: `@xyflow/react` `Node`/`Edge` shapes used by `FlowCanvas`  

### O que falta:
- Structural expansion for visualization  
- Unit tests as contract for UI  

---

## Test Requirements

- [ ] Empty combos → empty graph  
- [ ] Single model step → combo + model + provider nodes; edges combo→model→provider  
- [ ] combo-ref expands to child combo (by name) within depth  
- [ ] Cycle: A→B→A does not infinite-loop; cycle edge skipped or stub once  
- [ ] Depth cap respected (default 3)  
- [ ] Fusion root includes judge and acting branches when set  
- [ ] Selection `all` → multiple roots (forest); selection one id/name → single root  
- [ ] Missing combo-ref target → stub node or labeled unresolved (documented in test)  
- [ ] `connectionId` on model: either ignored or metadata on node (no account node required)  
- [ ] Provider id derived from `providerId` or parseable `provider/model` string  

---

## Exit Conditions

- [ ] Module exported and imported only by tests in this task (UI wire is 0113)  
- [ ] `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts` PASS  
- [ ] `npm run typecheck:core` clean for touched paths  
- [ ] Changelog ledger when code lands  
- [ ] No changes to Live studio  

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `steps.ts`, combo schema, `comboStructure` nesting/DAG, `ProviderTopology` layout only for inspiration, EPIC-24  
- [ ] **Criar** pure builder e.g. `src/lib/combos/comboTopologyGraph.ts`  
  - Input: `{ combos: ComboLike[]; selection: "all" | string }`  
  - Output: `{ nodes: TopologyNode[]; edges: TopologyEdge[] }` with stable ids  
- [ ] Node kinds: `combo` | `model` | `provider` (+ optional `unresolved`)  
- [ ] Expand combo-ref via name map; track `visited` + depth  
- [ ] Judge/acting as edges with `role` in edge data  
- [ ] **Tests** first or with implementation (TDD preferred)  
- [ ] **Refactoring pass**  
- [ ] **Regressão**: run unit file  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/combos/comboTopologyGraph.ts` | **Criar** pure builder |
| `src/lib/combos/steps.ts` | **Ler** step shapes |
| `src/shared/validation/schemas/combo.ts` | **Ler** |
| `open-sse/services/comboStructure.ts` or equivalent nest helpers | **Ler** depth/cycle spirit |
| `tests/unit/combo-topology-graph.test.ts` | **Criar** |

### How

1. Do not import React or next.  
2. Prefer deterministic layout positions optional in Phase UI — builder may omit `position` (UI layout) or assign simple layered x/y for dagre-less MVP.  
3. If layout is UI-only, builder returns graph without positions; 0113 runs a simple layered layout.  

### Why

Nested combos are invisible; pure graph is the product truth layer.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **Collision** | `comboTopologyGraph.ts`, topology unit test |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT wire Live WS. DO NOT mutate combos. DO NOT invent APIs.  
> DO NOT treat Live `comboFlowModel` as the structural builder.  
> PORT 21000 = production.

> [!IMPORTANT]
> Depth/cycle behavior must match documented defaults and be asserted in tests.

---

## 🛡️ Compliance Checklist

- [ ] **Doc Accuracy**: N/A code  
- [ ] **Zod**: N/A (reads already-normalized shapes)  
- [ ] **Security**: no secrets in graph ids  
- [ ] **No Raw SQL**: N/A  

---

## 📋 Completion Evidence

- **Arquivos**:  
- **Testes**:  
- **Resultado**:  
- **Lint/typecheck**:  
- **Changelog**:  
- **Agente**:  
- **Data**:  

---

## 🔍 Review Trail

- **Reviewer**:  
- **Veredito**:  
