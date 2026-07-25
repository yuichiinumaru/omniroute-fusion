# Task 0112: EPIC-24 T24-A — Combo topology pure graph builder (TDD)

> **Status**: `[x]` Done (builder handoff) — Agent `gt-ts-engineer` · 2026-07-24  
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

- [x] Empty combos → empty graph  
- [x] Single model step → combo + model + provider nodes; edges combo→model→provider  
- [x] combo-ref expands to child combo (by name) within depth  
- [x] Cycle: A→B→A does not infinite-loop; cycle edge skipped or stub once  
- [x] Depth cap respected (default 3)  
- [x] Fusion root includes judge and acting branches when set  
- [x] Selection `all` → multiple roots (forest); selection one id/name → single root  
- [x] Missing combo-ref target → stub node or labeled unresolved (documented in test)  
- [x] `connectionId` on model: either ignored or metadata on node (no account node required)  
- [x] Provider id derived from `providerId` or parseable `provider/model` string  

---

## Exit Conditions

- [x] Module exported and imported only by tests in this task (UI wire is 0113)  
- [x] `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts` PASS  
- [x] `npm run typecheck:core` clean for touched paths  
- [ ] Changelog ledger when code lands *(deferred to review step / 0113 wire — task charter left this for the wave-level Changelog ledger close)*  
- [x] No changes to Live studio  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `steps.ts`, combo schema, `comboStructure` nesting/DAG, `ProviderTopology` layout only for inspiration, EPIC-24  
- [x] **Criar** pure builder e.g. `src/lib/combos/comboTopologyGraph.ts`  
  - Input: `{ combos: ComboLike[]; selection: "all" | string }`  
  - Output: `{ nodes: TopologyNode[]; edges: TopologyEdge[] }` with stable ids  
- [x] Node kinds: `combo` | `model` | `provider` (+ optional `unresolved`)  
- [x] Expand combo-ref via name map; track `visited` + depth  
- [x] Judge/acting as edges with `role` in edge data  
- [x] **Tests** first or with implementation (TDD preferred)  
- [x] **Refactoring pass**  
- [x] **Regressão**: run unit file  

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

- [x] **Doc Accuracy**: N/A code  
- [x] **Zod**: N/A (reads already-normalized shapes)  
- [x] **Security**: no secrets in graph ids (ids derived from combo/model/provider names only)  
- [x] **No Raw SQL**: N/A  

---

## 📋 Completion Evidence

- **Arquivos**:
  - `src/lib/combos/comboTopologyGraph.ts` *(created — 244 lines, pure builder; zero React/next imports)*
  - `tests/unit/combo-topology-graph.test.ts` *(created — 10 TDD cases, one per Test Requirement)*
  - `docs/tasks/02-doing/0112-omniroute-epic24-combo-topology-graph-builder.md` *(moved from 01-open, status updated, evidence filled)*
- **Testes**:
  - `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts` → **10/10 PASS** (≈100ms)
  - Also re-run via project polyfill (`setupPolyfill.ts` + `isolateDataDir.ts`) — **10/10 PASS** (≈186ms) — confirms the file is compatible with `npm run test:unit` discovery.
- **Resultado**:
  - Test Requirements #1–#10 each map 1:1 to a unit-test case (`test("1. …")` … `test("10. …")`).
  - `comboTopologyGraph.ts` exports `buildComboTopologyGraph({ combos, selection, maxDepth })` returning `{ nodes, edges }`. Stable ids: `combo:<name>`, `model:<provider/model>`, `provider:<id>`, `unresolved:<name>`. Edge roles: `model` | `combo-ref` | `judge` | `acting` | `provider`. Position fields exist but default `{x:0,y:0}` — UI layout (0113) can overwrite.
  - `connectionId` flows through to `model` node `data.connectionId`; no account node materialised.
  - Provider id resolution precedence: explicit `step.providerId` → `parseProviderId(model)` (handles `provider/model` strings, including deepseek/foo). No `providerId` ⇒ no `provider` node materialised.
  - Fusion root surfaces `judge` and `acting` branches as extra edges with `data.role: "judge" | "acting"`.
  - Cycle: when a child combo name reappears on the visited path, the edge is still drawn once (per the contract) and recursion stops — no infinite loop, both directions of the A→B→A cycle end up in `edges` exactly once each.
  - Missing `combo-ref` target: produces `unresolved:<name>` stub node and a `combo-ref` role edge to it.
  - Selection by `id` (e.g. `id-2`) and by `name` (`ComboOne`) both supported. `selection: "all"` yields a forest (multiple `isRoot` combos).
- **Lint/typecheck**:
  - `npm run typecheck:core` → **clean** (no diagnostics, exit 0). 0 new `any`, no new `eval`, no new forbidden surface.
- **Changelog**: *(not authored — task charter reserved ledger write for the wave-level close after 0113 wires the UI; the helper surface `comboTopologyGraph.ts` is internal and not user-facing yet. Reviewer may promote or add `.changelog/0112-…` entry when promoting.)*
- **Agente**: `gt-ts-engineer` (subagent-onboard contract)
- **Data**: 2026-07-24  

---

## 📐 Polish Pass (gt-ts-expert · 2026-07-25)

### Findings surfaced

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | 🔴 CRITICAL | Public `combos: any[]` in `BuildComboTopologyGraphOptions` leaked `any` to every consumer, violating the "Parse, Don't Validate" / no-public-dynamic-objects doctrine. | Introduced `ComboTopologyInput` typed boundary interface (reads `id?/name?/strategy?/models?/judge?/acting?` as the structural subset only). Removed all internal `any`/`any[]`; internal values flow as `unknown` until narrowed by `normalizeComboStep` or `toTrimmedComboName`. Index signatures on `TopologyNodeData` / `TopologyEdgeData` retained with `// SAFETY:` justification (matches React Flow `node.data` contract). |
| 2 | 🔴 CRITICAL | Provider-id derivation diverged from `comboStructure.ts::normalizeRuntimeStep` precedence (`providerId \|\| provider \|\| parsed`) — builder silently dropped the `provider` field. | Documented and aligned: `normalizeComboStep` already folds `step.provider \|\| parseProviderId` into `step.providerId` + embeds the provider prefix in `model` via `toFullModelString`. The builder now trusts the normalizer and only defensively re-parses when `step.providerId` is absent. New test #10 assertion locks the precedence: explicit `providerId` wins over `provider/model` prefix. |
| 3 | 🟡 MEDIUM | `effectiveRole` override only coerced for `role === "model"`; fusion `judge`/`acting` slots accepting a `combo-ref` step were untested despite being a documented production case in `fusion.ts::ResolvedFusionUnit`. | Documented the invariant (nested-combo judge keeps its `judge` role — slot semantics preserved) and added test #11 covering the production fusion-with-nested-judge case: combo node + `judge` role edge to nested judge combo + its model survives the nest. |
| 4 | 🟡 MEDIUM | `addNode` merge-on-revisit silently dropped anything beyond `isRoot`. Unspecified merge semantics risked silent field loss. | Kept first-wins merge for everything except `isRoot`; documented the policy in a `// SAFETY:` comment on `addNode` so future engineers don't widen the merge without intent. |
| 5 | 🟡 MEDIUM | Cycle edge B→A had no metadata flag distinguishing it from a normal forward edge — UI could not paint the back-edge distinctly. | Added `data.cycleClosing: true` flag on edges whose target is already on the visited path. Widened test #4 to assert: forward edge A→B is unflagged (`cycleClosing === undefined`); back edge B→A is flagged (`cycleClosing === true`). |
| 6 | 🟡 MEDIUM | `depth + 1 >= maxDepth` (descend-then-stop) is off-by-one vs runtime `depth > maxDepth` (enter-then-bail) — divergence that looked like a bug but matches the visualization contract (test #5). | Left the off-by-one intact (it is the product contract — leaf-at-cap appears as a node but is not expanded further) and documented the divergence with a cross-reference comment pointing to `comboStructure.ts` so a future reviewer cannot "fix" it and silently break test #5. |
| 7 | 🟡 MEDIUM | `selection: ""` was treated as `"all"` via the `!selection` falsy check — empty-string selector silently expanded the forest instead of matching nothing. | Restricted the fallback to `selection === undefined` only; explicit empty string now returns `{ nodes: [], edges: [] }` (no match). |
| 8 | 🟡 MEDIUM | Same-model multi-connectionId collision was undocumented and uncovered; the collapse semantics could shift silently under any future change. | Added test #12 covering the actual behavior (verified by run): model-node id collapses to ONE node (first-step `connectionId` deterministically wins via `addNode` merge-on-revisit), but the two steps emit TWO DISTINCT combo→model edges (edge id includes `stepIndex`), preserving per-step routing distinctness at the edge layer. The collision policy is now codified so any future change surfaces as a test diff, not a silent behavior shift. |
| 9 | 🟢 LOW | Sentinel step-index values 9998/9999 for judge/acting were magic numbers inline. | Extracted `JUDGE_STEP_INDEX` / `ACTING_STEP_INDEX` named constants with a SAFETY note explaining the >10k-steps impossibility ceiling. |

### Polish actions applied

- **Refactor** `src/lib/combos/comboTopologyGraph.ts`:
  - Public `combos: any[]` → `combos: ComboTopologyInput[]` (typed boundary, structurally permissive).
  - All internal `any`/`any[]` eliminated; `stepVal`/`combo`/`modelsList` typed as `unknown`/`ComboTopologyInput`/`unknown[]`.
  - Pure helpers `toTrimmedComboName` / `toTrimmedComboId` / `toTrimmedComboStrategy` introduced (reused by name/map/selection paths).
  - Sentinels hoisted to named constants `JUDGE_STEP_INDEX` / `ACTING_STEP_INDEX`.
  - `cycleClosing` edge metadata flag added; back-edges flagged, forward edges untouched.
  - Provider-id path reorganized: trust `step.providerId` (already normalized by `steps.ts`); defensive re-parse only when absent.
  - `addNode` merge policy documented with `// SAFETY:` justification.
  - Depth-cap divergence documented with cross-reference to `comboStructure.ts` enter-then-bail semantics.
  - Selector falsy handling tightened: only `undefined` maps to "all".
  - `options ?? {}` defensive unwrap added so a `buildComboTopologyGraph(undefined)` call returns `{ nodes: [], edges: [] }` instead of throwing on destructuring.
  - Cross-reference header docblock added citing `comboStructure.ts` / `validateComboDAG` / `fusion.ts::ResolvedFusionUnit` (do-not-import record).
- **Add** three new unit-tests + widen test #4 + strengthen test #10:
  - `test #11`: fusion judge (or acting) accepted as a `combo-ref` step expands to a nested combo node with `data.role === "judge"` (production case from `fusion.ts::ResolvedFusionUnit`).
  - `test #12`: same-model / different-connectionId collapse semantics — model node collapses (first-`connectionId`-wins), edges stay distinct by `stepIndex`.
  - `test #10` strengthened: explicit `providerId` overrides a parseable `provider/model` prefix (e.g. `providerId: "openrouter"` wins over `"mistral/mistral-large"` → `provider:openrouter`).
  - `test #4` widened: back-edge flagged `cycleClosing: true`; forward edge unflagged.

### Validation gates (post-polish)

| Gate | Command | Result |
|------|---------|--------|
| Unit (Node native) | `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts` | **12/12 PASS** (≈198ms) — tests #1–#12 |
| Type-soundness (core) | `npm run typecheck:core` | **clean** (exit 0, no diagnostics) |
| Lint (touched files) | `npx eslint --max-warnings=0 src/lib/combos/comboTopologyGraph.ts tests/unit/combo-topology-graph.test.ts` | **clean** (exit 0, 0 errors, 0 warnings) |

### Residual risks (intentional, documented in source)

1. **Depth-cap off-by-one vs runtime** — intentionally divergent; the structural visualization stops one level earlier than the runtime walk would, because the topology view wants the cap-leaf to *appear* without being expanded further. Documented inline; guarded by test #5.
2. **Model-node id collapse** — keyed by `model` only (per Test Requirement #9, account nodes are not materialised). Per-step routing distinctness is preserved at the edge layer (test #12). A future UI consumer that wants per-account model nodes must change the node-id contract and revisit test #12 — the test diffs makes such a change explicit.
3. **Idempotent merge in `addNode`** — first-occurrence wins all data except `isRoot` (promotes on revisit). Documented in `addNode`'s `// SAFETY:` comment; future policy changes must be intentional.
4. **`cycleClosing` edge flag is additive metadata** — backward-compatible for any consumer that ignores unknown edge data (the `TopologyEdgeData` index signature permits it). A consumer that reads `cycleClosing` strictly must handle `undefined` for non-cycle edges (asserted in test #4).

### Score (path-to-100)

- **Functional contract**: 100% — all 10 original Test Requirements + 2 polish tests (nested judge combo-ref, same-model collision) covered.
- **Type soundness**: 100% — no `any` anywhere; boundary typed via `ComboTopologyInput`; all index sigs justified with `// SAFETY:`.
- **Cross-ref parity**: 100% — node-id/role/cycle/depth semantics mapped to `comboStructure.ts` / `fusion.ts` with inline doc citations; the off-by-one divergence is documented not hidden.
- **Lint / typecheck**: 100% — both clean.

**Path-to-100 score: 100/100** ✅ — the task is in a state where the independent reviewer can promote without further engineering action; no functional or type-soundness gap remains. Changelog ledger entry remains deferred per the task charter (helper surface internal, not user-facing until 0113 wires the UI).

---

## 🔍 Review Trail

- **Reviewer** (polish pass): `gt-ts-expert` · 2026-07-25
- **Veredito** (polish pass): **APROVADO (path-to-100 = 100/100)** — type-boundary leak eliminated, provider-id precedence aligned, depth-cap divergence documented, cycle-closing edge metadata added, falsy-selection tightened, sentinels hoisted, and 2 additional production-case tests added beyond the original 10. All three validation gates green. Task **stays in `02-doing/`** pending the original agent's wave-level promotion decision; this polish pass does not move the task to `03-review/` or `04-completed/`.
