import { normalizeComboStep } from "./steps.ts";

/**
 * Pure combo-topology graph builder (EPIC-24 T24-A).
 *
 * Transforms combo records + selection into React Flow-ready nodes & edges for
 * structural visualization: combo -> (model | nested combo) -> provider. No
 * React, no API, no DB. Reads already-normalized step shapes from `steps.ts`.
 *
 * Cross-reference (do not import — high-fan-out module):
 *   - `open-sse/services/combo/comboStructure.ts::resolveNestedComboTargets`
 *     is the runtime truth layer for execution; this builder is the structural
 *     visualization layer only.
 *   - `open-sse/services/combo/comboStructure.ts::validateComboDAG` is the
 *     create-time cycle guard — this builder mirrors its cycle semantics in
 *     pure-graph form. See `MAX_COMBO_DEPTH` in `open-sse/services/combo/comboPredicates.ts`.
 *   - `open-sse/services/fusion.ts::ResolvedFusionUnit` proves that a fusion
 *     judge/acting entry can be either `model` or `combo-ref`; this builder
 *     supports both branches for a fusion root's judge/acting fields.
 */

export type TopologyNodeKind = "combo" | "model" | "provider" | "unresolved";

export interface TopologyNodeData {
  label: string;
  kind: TopologyNodeKind;
  name?: string;
  model?: string;
  providerId?: string | null;
  connectionId?: string | null;
  weight?: number;
  strategy?: string;
  isRoot?: boolean;
  id?: string;
  // SAFETY: open index signature matches the React Flow `node.data` contract
  // used by the upstream UI consumer (0113). It MUST stay `unknown` (never
  // `any`) so consumers reading undeclared keys are forced to narrow them.
  [key: string]: unknown;
}

export interface TopologyNode {
  id: string;
  type: TopologyNodeKind;
  data: TopologyNodeData;
  position: { x: number; y: number };
}

export type TopologyEdgeRole = "model" | "combo-ref" | "judge" | "acting" | "provider";

export interface TopologyEdgeData {
  role: TopologyEdgeRole;
  weight?: number;
  label?: string;
  /** True when this edge closes a cycle (target is already on the visited path); UI may render it differently. */
  cycleClosing?: boolean;
  // SAFETY: open index signature for React Flow `edge.data`. Keep `unknown`.
  [key: string]: unknown;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data: TopologyEdgeData;
}

/**
 * Minimal structural contract the builder reads from a combo record.
 *
 * The builder is intentionally permissive at the input boundary: real combo
 * records carry many more fields (config, autoConfig, context_cache_protection,
 * system_message) that are irrelevant to pure topology. Consumers pass the
 * combos as they already exist in state, so we accept a structural subset
 * rather than forcing a full `ComboLike` cast.
 *
 * All fields are optional at the input boundary to keep callers from having
 * to pre-normalize; the builder normalizes each step entry via
 * {@link normalizeComboStep} before reading it.
 */
export interface ComboTopologyInput {
  id?: string | null;
  name?: string | null;
  strategy?: string | null;
  models?: unknown[] | null;
  /** Fusion judge entry — same step shapes as `models` entries (model | combo-ref). */
  judge?: unknown | null;
  /** Fusion acting entry — same step shapes as `models` entries (model | combo-ref). */
  acting?: unknown | null;
}

export interface BuildComboTopologyGraphOptions {
  combos: ComboTopologyInput[];
  selection?: "all" | string;
  maxDepth?: number;
}

export interface ComboTopologyGraphResult {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

const DEFAULT_MAX_DEPTH = 3;

/**
 * Sentinel step indices used to disambiguate fusion judge/acting edges from
 * `models` array entries. Chosen well beyond realistic `models[]` length so
 * an edge id collision would require ≥10000 sibling model steps (impossible
 * under the upstream Zod combo schema).
 */
const JUDGE_STEP_INDEX = 9999;
const ACTING_STEP_INDEX = 9998;

/**
 * Pure graph builder for Combo Topology.
 * Transforms combo records + selection into React Flow-ready nodes & edges.
 */
export function buildComboTopologyGraph(
  options: BuildComboTopologyGraphOptions
): ComboTopologyGraphResult {
  const {
    combos = [],
    selection = "all",
    maxDepth = DEFAULT_MAX_DEPTH,
  } = options ?? {};

  if (!Array.isArray(combos) || combos.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Map combos by trimmed name
  const comboMap = new Map<string, ComboTopologyInput>();
  for (const c of combos) {
    const name = toTrimmedComboName(c?.name);
    if (name) comboMap.set(name, c);
  }

  // Select root combos based on `selection`.
  // Only `undefined` falls back to the forest ("all"). Passing an empty string
  // is treated as an explicit selector (which matches nothing → empty graph),
  // matching the structural contract instead of silently expanding everything.
  let rootCombos: ComboTopologyInput[] = [];
  if (selection === "all" || selection === undefined) {
    rootCombos = combos.filter((c) => toTrimmedComboName(c?.name) !== null);
  } else {
    const matched = combos.find((c) => c?.id === selection || c?.name === selection);
    const matchedName = toTrimmedComboName(matched?.name);
    if (matched && matchedName) {
      rootCombos = [matched];
    }
  }

  if (rootCombos.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodesMap = new Map<string, TopologyNode>();
  const edgesMap = new Map<string, TopologyEdge>();

  function addNode(node: TopologyNode) {
    const existing = nodesMap.get(node.id);
    if (existing) {
      // SAFETY: merge only the root tag on revisit; all other data carriers
      // (strategy, id, connectionId) are deterministic per node id and were
      // already written by the first occurrence. We deliberately do NOT merge
      // arbitrary fields to avoid masking inconsistent producers.
      if (node.data.isRoot) {
        existing.data.isRoot = true;
      }
    } else {
      nodesMap.set(node.id, node);
    }
  }

  function addEdge(edge: TopologyEdge) {
    if (!edgesMap.has(edge.id)) {
      edgesMap.set(edge.id, edge);
    }
  }

  function processStep(
    stepVal: unknown,
    parentComboNodeId: string,
    parentComboName: string,
    role: TopologyEdgeRole,
    depth: number,
    visitedPath: Set<string>,
    stepIndex: number
  ): void {
    const step = normalizeComboStep(stepVal, {
      comboName: parentComboName,
      index: stepIndex,
      allCombos: combos,
    });

    if (!step) return;

    // A `combo-ref` discovered through a top-level models/judge/acting slot
    // always renders with its own `combo-ref` role, regardless of the slot.
    // A nested-combo judge (production case from fusion.ts ResolvedFusionUnit)
    // keeps its `judge` role because the slot semantics matter for UI.
    const effectiveRole: TopologyEdgeRole =
      role === "model" && step.kind === "combo-ref" ? "combo-ref" : role;

    if (step.kind === "model") {
      const modelStr = step.model;
      const modelNodeId = `model:${modelStr}`;
      // `normalizeComboStep` already resolved provider-id precedence
      // (step.providerId || step.provider || parseProviderId(rawModel)) and
      // embedded the provider prefix into `model` via `toFullModelString`.
      // We therefore trust `step.providerId` and only fall back to re-parsing
      // `modelStr` defensively (covers direct callers passing pre-normalized
      // model strings the normalizer treats as opaque). Aligns with
      // `comboStructure.ts::normalizeRuntimeStep` line 104.
      const providerId =
        step.providerId ||
        (modelStr.includes("/") ? modelStr.split("/")[0].trim() || null : null);

      addNode({
        id: modelNodeId,
        type: "model",
        data: {
          label: step.label || modelStr,
          kind: "model",
          model: modelStr,
          providerId: providerId || null,
          connectionId: step.connectionId ?? null,
          weight: step.weight,
        },
        position: { x: 0, y: 0 },
      });

      const edgeId = `edge:${parentComboNodeId}->${modelNodeId}:${effectiveRole}:${stepIndex}`;
      addEdge({
        id: edgeId,
        source: parentComboNodeId,
        target: modelNodeId,
        ...(step.label ? { label: step.label } : {}),
        data: {
          role: effectiveRole,
          weight: step.weight,
        },
      });

      if (providerId) {
        const providerNodeId = `provider:${providerId}`;
        addNode({
          id: providerNodeId,
          type: "provider",
          data: {
            label: providerId,
            kind: "provider",
            providerId,
          },
          position: { x: 0, y: 0 },
        });

        const providerEdgeId = `edge:${modelNodeId}->${providerNodeId}:provider`;
        addEdge({
          id: providerEdgeId,
          source: modelNodeId,
          target: providerNodeId,
          data: {
            role: "provider",
          },
        });
      }
    } else if (step.kind === "combo-ref") {
      const childName = step.comboName;
      const childCombo = comboMap.get(childName);

      if (!childCombo) {
        const unresolvedNodeId = `unresolved:${childName}`;
        addNode({
          id: unresolvedNodeId,
          type: "unresolved",
          data: {
            label: `${childName} (unresolved)`,
            kind: "unresolved",
            name: childName,
          },
          position: { x: 0, y: 0 },
        });

        const edgeId = `edge:${parentComboNodeId}->${unresolvedNodeId}:${effectiveRole}:${stepIndex}`;
        addEdge({
          id: edgeId,
          source: parentComboNodeId,
          target: unresolvedNodeId,
          ...(step.label ? { label: step.label } : {}),
          data: {
            role: effectiveRole,
            weight: step.weight,
          },
        });
      } else {
        const childComboNodeId = `combo:${childName}`;
        addNode({
          id: childComboNodeId,
          type: "combo",
          data: {
            label: childName,
            kind: "combo",
            name: childName,
            strategy: toTrimmedComboStrategy(childCombo.strategy) || "priority",
            id: toTrimmedComboId(childCombo.id),
          },
          position: { x: 0, y: 0 },
        });

        // Cycle detection: if the child is on the current branch's visited
        // path, we still draw the edge once (per the task contract) but flag
        // it as cycle-closing and stop recursion. This mirrors the
        // production guard in `comboStructure.ts` (visited.has → return [])
        // but is strictly structural — we surface the back-edge to the UI.
        const closesCycle = visitedPath.has(childName);

        const edgeId = `edge:${parentComboNodeId}->${childComboNodeId}:${effectiveRole}:${stepIndex}`;
        addEdge({
          id: edgeId,
          source: parentComboNodeId,
          target: childComboNodeId,
          ...(step.label ? { label: step.label } : {}),
          data: {
            role: effectiveRole,
            weight: step.weight,
            ...(closesCycle ? { cycleClosing: true } : {}),
          },
        });

        if (closesCycle) {
          return;
        }

        // Depth cap (structural visualization layer).
        // NOTE: this is `depth + 1 >= maxDepth` (descend-then-stop), which is
        // intentionally one level stricter than the runtime guard in
        // `comboStructure.ts` (which bails on `depth > maxDepth` when
        // *entering*). The visualization contract (test #5) requires the
        // leaf-at-cap depth to *appear* as a node but not be expanded further;
        // the runtime, by contrast, may still traverse into nodes at the cap
        // depth because it plays enter-then-bail semantics. Do not "fix" the
        // off-by-one without revisiting test #5 — the divergence is the
        // product contract for the topology view.
        if (depth + 1 >= maxDepth) {
          return;
        }

        const nextVisited = new Set(visitedPath);
        nextVisited.add(childName);
        traverseCombo(childCombo, depth + 1, nextVisited);
      }
    }
  }

  function traverseCombo(combo: ComboTopologyInput, depth: number, visitedPath: Set<string>): void {
    const comboName = toTrimmedComboName(combo.name);
    if (!comboName) return;

    const comboNodeId = `combo:${comboName}`;
    addNode({
      id: comboNodeId,
      type: "combo",
      data: {
        label: comboName,
        kind: "combo",
        name: comboName,
        strategy: toTrimmedComboStrategy(combo.strategy) || "priority",
        id: toTrimmedComboId(combo.id),
        isRoot: depth === 0,
      },
      position: { x: 0, y: 0 },
    });

    const modelsList = Array.isArray(combo.models) ? combo.models : [];
    modelsList.forEach((stepVal: unknown, idx: number) => {
      processStep(stepVal, comboNodeId, comboName, "model", depth, visitedPath, idx);
    });

    if (combo.judge != null) {
      processStep(combo.judge, comboNodeId, comboName, "judge", depth, visitedPath, JUDGE_STEP_INDEX);
    }

    if (combo.acting != null) {
      processStep(combo.acting, comboNodeId, comboName, "acting", depth, visitedPath, ACTING_STEP_INDEX);
    }
  }

  for (const rc of rootCombos) {
    const rcName = toTrimmedComboName(rc.name);
    if (!rcName) continue;
    const visited = new Set<string>([rcName]);
    traverseCombo(rc, 0, visited);
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
  };
}

function toTrimmedComboName(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toTrimmedComboId(value: unknown): string | undefined {
  const trimmed = toTrimmedComboName(value);
  return trimmed ?? undefined;
}

function toTrimmedComboStrategy(value: unknown): string | null {
  return toTrimmedComboName(value);
}
