import type { TopologyNode, TopologyEdge } from "@/lib/combos/comboTopologyGraph";

const X_STEP = 260; // Horizontal distance between layers
const Y_STEP = 80;  // Vertical distance between nodes in the same layer

/**
 * Pure DAG layout algorithm for Combo Topology graph.
 *
 * Assigns x, y coordinates to raw topology nodes based on topological depth
 * (rank). A longest-path layered layout: roots get rank 0, and every node's
 * rank is one greater than the max of its non-cycle predecessors' ranks.
 *
 * Robustness guarantees:
 *   - Empty `rawNodes` → empty result (no NaN positions).
 *   - Single isolated node → rank 0, positioned at origin.
 *   - Cycle edges (`data.cycleClosing === true`) are excluded from rank
 *     computation so a back-edge never pulls a node to a deeper rank.
 *   - Edges referencing nodes absent from `rawNodes` are skipped in rank
 *     propagation (defensive against stale edge arrays).
 *   - Orphan nodes (no root tag, no predecessors) fall back to rank 0.
 *   - The propagation loop terminates in at most `rawNodes.length + 1` passes
 *     (longest simple path bound), so cycles in the non-cycle edge set (which
 *     should not happen since cycle edges are filtered) cannot cause a hang.
 */
export function layoutComboTopologyGraph(
  rawNodes: TopologyNode[],
  rawEdges: TopologyEdge[]
): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  if (rawNodes.length === 0) return { nodes: [], edges: [] };

  const nodeMap = new Map<string, TopologyNode>();
  for (const n of rawNodes) {
    nodeMap.set(n.id, { ...n });
  }

  // Step 1: Identify non-cycle edges that connect nodes present in `rawNodes`.
  // Cycle-closing edges are excluded from rank computation so a back-edge does
  // not pull the target node to a deeper rank than its tree path warrants.
  const structuralEdges = rawEdges.filter(
    (e) => !e.data?.cycleClosing && nodeMap.has(e.source) && nodeMap.has(e.target)
  );

  // Step 2: Compute in-degrees over structural (non-cycle, in-graph) edges.
  const inDegree = new Map<string, number>();
  for (const n of rawNodes) {
    inDegree.set(n.id, 0);
  }
  for (const e of structuralEdges) {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  }

  // Step 3: Seed rank 0 for roots. A node is a root if it carries the builder
  // `isRoot` tag OR has zero structural predecessors. The `isRoot` check is a
  // superset — it can mark a node with incoming edges as rank 0 when it is a
  // selected root that also appears as a child elsewhere (forest mode).
  const rankMap = new Map<string, number>();
  for (const n of rawNodes) {
    if (n.data?.isRoot || inDegree.get(n.id) === 0) {
      rankMap.set(n.id, 0);
    }
  }

  // Step 4: Propagate ranks along structural edges (longest path). A target's
  // rank is the maximum of `sourceRank + 1` over all incoming structural edges.
  // We check for `undefined` explicitly (rather than a `-1` sentinel) so the
  // semantics read clearly: "if the target has no rank yet, or a longer path
  // would reach it, assign the longer path."
  let changed = true;
  let maxPasses = rawNodes.length + 1;
  while (changed && maxPasses-- > 0) {
    changed = false;
    for (const e of structuralEdges) {
      const srcRank = rankMap.get(e.source);
      if (srcRank === undefined) continue;
      const newRank = srcRank + 1;
      const currentTargetRank = rankMap.get(e.target);
      if (currentTargetRank === undefined || newRank > currentTargetRank) {
        rankMap.set(e.target, newRank);
        changed = true;
      }
    }
  }

  // Defensive rank assignment (consolidated). Covers three cases in one pass:
  //   (a) Orphan nodes that escaped both the seed and the propagation.
  //   (b) Cycle-only graphs where every node has incoming edges but none
  //       carries `isRoot` — the seed loop above left `rankMap` empty, so
  //       propagation had nothing to advance; we anchor every node at 0.
  //   (c) Nodes that participated in propagation but, due to a stale edge
  //       filter skipping all their incoming edges, ended up unranked.
  // Folding the "if rankMap.size === 0" pre-check into this single
  // post-propagation pass removes the redundant seeding branch (Path-to-100
  // Item 5) without changing semantics: the prior code executed both branches
  // in the cycle-only case, each set rank 0; here we run once.
  if (rankMap.size === 0) {
    for (const n of rawNodes) rankMap.set(n.id, 0);
  } else {
    for (const n of rawNodes) {
      if (!rankMap.has(n.id)) rankMap.set(n.id, 0);
    }
  }

  // Step 5: Group nodes by rank and position them in vertical columns.
  const groups = new Map<number, TopologyNode[]>();
  for (const n of rawNodes) {
    const r = rankMap.get(n.id) || 0;
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(n);
  }

  const sortedRanks = Array.from(groups.keys()).sort((a, b) => a - b);

  // Position nodes: x is determined by rank (layer column), y is centered
  // vertically within the layer. A single-node layer produces y = 0 (origin),
  // which is the expected degenerate case.
  const positionedNodes: TopologyNode[] = [];
  for (const r of sortedRanks) {
    const nodesInRank = groups.get(r)!;
    const totalHeight = (nodesInRank.length - 1) * Y_STEP;
    const startY = -totalHeight / 2;

    nodesInRank.forEach((node, index) => {
      positionedNodes.push({
        ...node,
        position: {
          x: r * X_STEP,
          y: startY + index * Y_STEP,
        },
      });
    });
  }

  return {
    nodes: positionedNodes,
    edges: rawEdges,
  };
}
