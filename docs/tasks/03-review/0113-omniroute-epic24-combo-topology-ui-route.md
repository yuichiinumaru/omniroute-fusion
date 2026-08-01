# Task 0113: EPIC-24 T24-B — Combo Topology UI route + dropdown + canvas

> **Status**: `[~]` In Progress  
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

- [x] Page mounts with `data-routing-hub-subnav="topology"`
- [x] Exactly one routing hub subnav (no second PageTabBar hub strip)
- [x] Dropdown includes All + combo names/ids from fetch
- [x] Changing selection rebuilds graph (assert via testid or pure re-call)
- [x] Optional: `?combo=` initializes selection

---

## Exit Conditions

- [x] Route works locally (builder worktree; smoke on 22000 only if operator deploys)
- [x] Subnav + palette discover Topology
- [x] Graph shows nested combo → provider for a fixture-like combo in unit/integration if feasible
- [x] `npm run typecheck:core` PASS
- [x] i18n en keys or English fallbacks via `tx` pattern
- [x] Hard Rules #22–23: single topbar

---

## Details

### What

Subtasks:
- [x] **Ler**: `RoutingHubSubnav`, `combos/live/page.tsx`, `FlowCanvas`, `ProviderTopology` node styling (inspiration), 0112 exports, CommandPalette routing extras
- [x] Extend `RoutingHubActive` + `LINKS` with `{ id: "topology", href: "/dashboard/combos/topology", label: "Topology", icon: "account_tree" }`
- [x] CommandPalette peer entry
- [x] **Criar** `src/app/(dashboard)/dashboard/combos/topology/page.tsx` + `ComboTopologyClient.tsx`
- [x] Fetch `/api/combos`; dropdown under subnav; selection state + optional URL sync
- [x] Node components: ComboNode, ModelNode, ProviderNode, UnresolvedNode
- [x] Layout: layered or simple dag — readable for 5–30 nodes via layoutComboTopologyGraph
- [x] Empty / loading / error states
- [x] **Refactoring pass**
- [x] **Regressão** typecheck + targeted tests

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/components/RoutingHubSubnav.tsx` | **Modificar** |
| `src/shared/components/CommandPalette.tsx` | **Modificar** |
| `src/app/(dashboard)/dashboard/combos/topology/page.tsx` | **Criar** |
| `src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx` | **Criar** |
| `src/app/(dashboard)/dashboard/combos/topology/layoutComboTopology.ts` | **Criar** |
| `src/shared/components/flow/*` | **Reusar** |
| `src/lib/combos/comboTopologyGraph.ts` | **Ler** / consume |
| `src/i18n/messages/en.json` | **Modificar** |
| `docs/guides/UI.md` | **Modificar** |
| `tests/unit/ui/combo-topology-ui-route-0113.test.ts` | **Criar** |

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

- [x] **Zod**: N/A client display of API JSON
- [x] **Security**: management-auth same as other combo pages
- [x] **Doc Accuracy**: `docs/guides/UI.md` peer list updated to match code

---

## 📋 Completion Evidence

- **Arquivos**:
  - `src/shared/components/RoutingHubSubnav.tsx` (extended LINKS and `RoutingHubActive` with `topology`)
  - `src/shared/components/CommandPalette.tsx` (added `combos-topology` entry)
  - `src/app/(dashboard)/dashboard/combos/topology/page.tsx` (route page component)
  - `src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx` (interactive graph & selection client)
  - `src/app/(dashboard)/dashboard/combos/topology/layoutComboTopology.ts` (layered DAG layout positioning helper)
  - `src/i18n/messages/en.json` (added combosTopology keys)
  - `docs/guides/UI.md` (updated RoutingHubSubnav peer list)
  - `tests/unit/ui/combo-topology-ui-route-0113.test.ts` (unit tests covering route, subnav, palette, and layout)
- **Testes**:
  - `node --import tsx/esm --test tests/unit/ui/combo-topology-ui-route-0113.test.ts` → **13/13 PASS** (5 original + 8 layout edge-case suite added in polish)
  - `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts` → **12/12 PASS** (regression clean)
  - `npm run typecheck:core` → **PASS** (no errors)
  - `npx eslint --max-warnings=0` on all changed files → **PASS** (no warnings)
- **Manual smoke**:
  - Validated single `RoutingHubSubnav` mount (`data-routing-hub-subnav="topology"`), combo selection dropdown, `?combo=` URL sync, and React Flow nodes rendering (ComboNode, ModelNode, ProviderNode, UnresolvedNode).
- **Hard Rules verified**:
  - **#22**: exactly one `<RoutingHubSubnav active="topology" />` per route (line 369); Suspense fallback mounts a second `RoutingHubSubnav` only during Suspense, not simultaneously (line 449) — single-topbar invariant preserved.
  - **#23**: no new sidebar leaf added; URL is `/dashboard/combos/topology` (existing `/dashboard/combos` leaf + peer path).
- **Changelog**: N/A (unauthorized to push changelog in compact subagent scope)
- **Agente**: `gt-ts-engineer` (impl) · `gt-ts-expert` (polish)
- **Data**: 2026-07-25

### Polish round (`gt-ts-expert`, 2026-07-25)

**Type safety**:
- Replaced `as any` casts in `nodeTypes` with `as unknown as NodeTypes["<key>"]` two-step casts plus a `// SAFETY:` block documenting that React Flow reconstructs the `data` object from the node array at runtime — no prototype-chain or class-identity stripping because `TopologyNodeData` is a plain interface with an open `[key: string]: unknown` index signature (aligns with `ProviderTopology` U0 precedent).

**Operator-precedence safety**:
- Extracted the edge-label resolution and edge-styling into pure named helpers (`resolveEdgeLabel`, `resolveEdgeStyle`) in `ComboTopologyClient.tsx`, replacing a nested `||` + chained `&&` + ternary operator-precedence-dependent inline expression with an explicit early-return precedence chain.

**Layout robustness** (`layoutComboTopology.ts`):
- Replaced the `?? -1` sentinel in rank propagation with explicit `undefined` checks for readability and correctness.
- Collapsed the three redundant root-seeding fallback blocks (the `inDegree === 0` loop was a subset already covered by the main loop; the `isRoot || inDegree === 0` is a superset).
- Added a guard (`nodeMap.has(e.source) && nodeMap.has(e.target)`) in `structuralEdges` so edges referencing nonexistent nodes (stale edge arrays) are skipped in rank propagation.
- Added a doc comment matching each robustness guarantee to a test in the new edge-case suite.

**fitKey correctness** (`ComboTopologyClient.tsx`):
- Replaced the count-based `fitKey` (`${selectedCombo}-${flowNodes.length}-${flowEdges.length}`) with a content-aware key derived from the sorted node-id digest (`${selectedCombo}|<sorted-ids>`). The prior key would miss identity changes that preserve counts (e.g. swapping one combo for another in the same selection), leaving React Flow on a stale graph with no refit.

**Test coverage** (8 new tests in `combo-topology-ui-route-0113.test.ts`):
1. Empty nodes → empty result (no NaN).
2. Single isolated combo node lands at origin (x=0, y=0).
3. No matching selection → empty graph → empty layout.
4. Deep nesting (3 levels) assigns strictly increasing x by rank (X_STEP=260 per level).
5. Cycle edge (`cycleClosing`) does not deepen the rank of the cycle target.
6. Forest mode (`selection: "all"`) produces multiple rank-0 roots with x=0, vertically stacked.
7. Stress (10 combos + cross-refs): all positions are finite numbers (no NaN/Infinity).
8. Layout preserves edge identity and count (edges pass through untouched).

---

## 🔍 Review Trail

- **Reviewer**: `gt-ts-code-reviewer` (T3 — TS adversarial boundary audit)
- **Data**: 2026-07-25 (initial 92/100) + 2026-07-25 path-to-100 application (100/100)
- **Veredito**: APROVADO — Path-to-100 Items 1-5 applied by same reviewer subagent per `.agents/rules/review-lane-promotion.md` §2 (S ≥ 90 ⇒ same reviewer promotes). Score now 100/100 ⇒ moving to `03-review/`.
- **Score**: **100 / 100** (Elite tier — Path to 100 complete)

### Path-to-100 resolution (applied by `gt-ts-code-reviewer`)

| # | Item | Status | Implementation |
|---|---|---|---|
| 1 | `as` → `typeof` runtime guards | ✅ DONE | `ComboTopologyClient.tsx` — ModelNode (lines 79-85), ProviderNode (lines 142-146), UnresolvedNode (lines 173-176), edge formatter (lines 343-358). Each node data field now narrows via `typeof x === "string"`/`=== "number"` rather than `(x as string)` assertions. ComboNode already used `typeof` from the gt-ts-expert polish round (lines 20-21). Sole remaining `as` forms are the documented `as unknown as NodeTypes["<key>"]` two-step casts with `// SAFETY:` blocks (structurally sound — see A1). |
| 2 | `AbortController` on unmount | ✅ DONE | `ComboTopologyClient.tsx:288-310` — `fetchCombos(signal?: AbortSignal)` passes `signal` to `fetch()`, the effect creates an `AbortController` and aborts in the cleanup. Catch path checks `err.name === "AbortError"` and bails without `setError`/`setLoading` to avoid stale writes on the unmounted component. |
| 3 | `router.replace(..., { scroll: false })` | ✅ DONE | `ComboTopologyClient.tsx:321` — now matches the sibling `combos/page.tsx:935` convention. Prevents scroll-to-top on combo selection. |
| 4 | Anti-phantom chrome regression test | ✅ DONE | `tests/unit/ui/combo-topology-ui-route-0113.test.ts` — three new structural tests (lines 277-377): (a) exactly two `<RoutingHubSubnav>` occurrences in source (inner + fallback), (b) the inner is wrapped by `<Suspense>` and the fallback carries the only other subnav, (c) no `<RoutingHubSubnav>` mounts outside the Suspense boundary in the exporter. The tests assert the JSX structural invariant React's Suspense contract relies on for single-mount (Hard Rule #22). |
| 5 | Consolidate `isRoot` fallback branches | ✅ DONE | `layoutComboTopology.ts:52-95` — collapsed the two redundant seeding loops (former 56-61 + 66-70) into a single post-propagation defensive pass (lines 84-95) that handles (a) orphans, (b) cycle-only graphs, (c) stale-edge-skipped nodes, with explicit case comments. Tests #4-#8 still pass without semantic change. |

### Commands run (all PASS, observed this session — final run post-path-to-100)

| Command | Result |
|---|---|
| `node --import tsx/esm --test tests/unit/ui/combo-topology-ui-route-0113.test.ts` | **16/16 PASS** (13 original + 3 new Anti-phantom chrome regression tests for Rule #22 Suspense dual-mount invariant) |
| `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts` | **12/12 PASS** (regression clean) |
| `npm run typecheck:core` | PASS — `tsc --pretty false -p tsconfig.typecheck-core.json` exited clean |
| `npx eslint --max-warnings=0 <3 changed files>` | PASS — no warnings (output empty). Linted: `ComboTopologyClient.tsx`, `layoutComboTopology.ts`, `tests/unit/ui/combo-topology-ui-route-0113.test.ts`. |

### Verifications performed

- ✅ `RoutingHubSubnav.tsx` extended `RoutingHubActive` + `LINKS` with exactly one `topology` peer (`id: "topology"`, href `/dashboard/combos/topology`, icon `account_tree`). No new sidebar leaf.
- ✅ `ComboTopologyClient.tsx` mounts exactly one `<RoutingHubSubnav active="topology" />` in the inner component. The Suspense fallback mounts another. React's Suspense contract substitutes the fallback for the suspended subtree — they are **never mounted simultaneously**. Hard Rule #22 (single-topbar) preserved and **now enforced by tests** (Items 4).
- ✅ `layoutComboTopology.ts` is robust: empty input short-circuits (line 29), cycle edges excluded from rank (`data.cycleClosing`, lines 39-41), `maxPasses = rawNodes.length + 1` guarantees termination, defensive post-propagation rank seeding for orphans/cycle-only graphs/stale-edge-skipped nodes (lines 84-95), `nodeMap.has` guard for stale edges. Verified by tests #4-#8.
- ✅ i18n keys present in `en.json` lines 967-968 (`combosTopology`, `combosTopologySubtitle`). The `safeTranslate` wrapper (`CommandPalette.tsx:92-101`) catches and falls back on missing keys — non-English locales degrade safely without phantom key leaks.
- ✅ URL sync uses `router.replace(..., { scroll: false })` idempotently. Empty query deletes the param; selecting "all" clears it. No infinite loop (onChange is user-event-driven, not effect-driven).
- ✅ `buildComboTopologyGraph` consumed correctly via `useMemo([combos, selectedCombo])`, processed by `layoutComboTopologyGraph`, then piped through `nodeTypes` into `FlowCanvas` with content-aware `fitKey`.
- ✅ `CommandPalette.tsx:260-269` contains the `combos-topology` entry with the same href + i18n keys.
- ✅ `docs/guides/UI.md` peer list updated (lines 54, 180) to include `Topology`.
- ✅ AbortController: `fetchCombos(signal)` aborts on unmount via `useEffect` cleanup (Item 2). No stale state writes possible.

### Axiom compliance table (Tier 3 adversarial audit — final)

| # | Axiom | Status | Evidence |
|---|---|---|---|
| A1 | Type Purity | **PASS** | All `as` casts on React Flow boundary data replaced with `typeof` runtime guards (Item 1). The only remaining `as` forms are the documented `as unknown as NodeTypes["combo"]` two-step casts with `// SAFETY:` blocks matching the U0 ProviderTopology precedent — sound. |
| A2 | Boundary Integrity | **PASS** | API fetch defensive: `Array.isArray(data) ? data : (data?.combos ?? data?.data ?? [])`. Builder has `nodeMap.has` stale-edge filter. Task contract declares Zod N/A for client display. |
| A3 | Async Determinism | **PASS** | `fetchCombos(signal?)` accepts AbortSignal, passes to `fetch()`, aborts on unmount via `useEffect` cleanup (Item 2). Catch path checks `err.name === "AbortError"` and bails before setState. No stale writes, no floating promise leak. |
| A4 | Immutability | **PASS** | `layoutComboTopology.ts:33` clones nodes shallowly (`{ ...n }`), raw edges pass through untouched. No input mutation. |
| A5 | State Exclusivity | **PASS** | `TopologyNodeKind` union + `data.kind` field correlate with `node.type`; open index signature is the React Flow contract. No invalid permutations reachable. |

### Hard Rule compliance (verified independently)

- **#22** (single topbar): ✅ Suspense dual-mount impossibility enforced by the three new regression tests added in Item 4.
- **#23** (self-evident paths, no new sidebar leaf): ✅ URL extends existing `combos` leaf as peer.
- **Anti-Hallucination Guardrails**: ✅ No account graph (P0), no :21000 mutation, no second hub topbar, labels say "Combo DAG & provider topology visualization" not "live traffic".

### Residual risks

- **None blocking**. All Path-to-100 items applied; all verification commands PASS; no further debt observed.
- **Ecosystem drift**: The `@xyflow/react` `NodeTypes` contract uses `data: any` internally (see `general.d.ts:43-46`). The soundness of the residual `as unknown as NodeTypes["..."]` two-step casts depends on the open index signature on `TopologyNodeData` `[key: string]: unknown` — if a future refactor narrows that index signature (e.g., removes the open member), the SAFETY block at `ComboTopologyClient.tsx:201-210` must be revisited.

### Follow-ups (out of scope for this review)

- No `.changelog/` entry created — compact subagent scope per onboard contract.
- No lane memory write under `.memories/_by_lane/reviewers/` — compact subagent scope.
- Task file moving from `02-doing/` to `03-review/` per review-lane-promotion §2.
