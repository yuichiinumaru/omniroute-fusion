"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Handle, Position, type Node, type Edge, type NodeTypes } from "@xyflow/react";
import RoutingHubSubnav from "@/shared/components/RoutingHubSubnav";
import FlowCanvas from "@/shared/components/flow/FlowCanvas";
import ProviderIcon from "@/shared/components/ProviderIcon";
import {
  buildComboTopologyGraph,
  type ComboTopologyInput,
} from "@/lib/combos/comboTopologyGraph";
import { layoutComboTopologyGraph } from "./layoutComboTopology";
import { cn } from "@/shared/utils/cn";

// ── Node Components ──────────────────────────────────────────────────────────

function ComboNode({ data }: { data: Record<string, unknown> }) {
  const isRoot = Boolean(data.isRoot);
  const strategy = typeof data.strategy === "string" ? data.strategy : "priority";
  const label = typeof data.label === "string" ? data.label : typeof data.name === "string" ? data.name : "Combo";

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-3.5 py-2.5 rounded-xl border-2 bg-surface shadow-xs min-w-[190px] max-w-[250px] transition-all",
        isRoot
          ? "border-accent ring-2 ring-accent/20"
          : "border-border hover:border-accent/40"
      )}
      data-testid={`node-combo-${data.name || label}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-accent !border-surface !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-accent !border-surface !w-3 !h-3"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-accent shrink-0">
            {isRoot ? "account_tree" : "layers"}
          </span>
          <span className="text-xs font-bold text-text truncate">
            {label}
          </span>
        </div>
        {isRoot && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-accent/15 text-accent shrink-0">
            Root
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[10px] text-text-muted">strategy:</span>
        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-black/5 dark:bg-white/5 text-text-muted truncate">
          {strategy}
        </span>
      </div>
    </div>
  );
}

function ModelNode({ data }: { data: Record<string, unknown> }) {
  // SAFETY: `data` is React Flow's open `Record<string, unknown>` contract. We
  // narrow with `typeof` guards rather than `as` casts so that a non-string
  // runtime value (e.g. a number or object) cannot leak into the rendered label
  // or get forwarded to `ProviderIcon`/`Handle` as a malformed id. This is the
  // A1 (Type Purity) polish from the path-to-100 — the prior `as string | null`
  // assertions combined `|| null` shortcuts were safe by accident, not by proof.
  const providerId = typeof data.providerId === "string" ? data.providerId : null;
  const label =
    typeof data.label === "string" ? data.label
    : typeof data.model === "string" ? data.model
    : "Model";
  const connectionId = typeof data.connectionId === "string" ? data.connectionId : null;
  const weight = typeof data.weight === "number" ? data.weight : undefined;

  return (
    <div
      className="flex flex-col gap-1 px-3 py-2 rounded-xl border border-blue-500/30 bg-surface shadow-xs min-w-[180px] max-w-[240px]"
      data-testid={`node-model-${label}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-blue-500 !border-surface !w-2.5 !h-2.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-blue-500 !border-surface !w-2.5 !h-2.5"
      />

      <div className="flex items-center gap-2">
        {providerId ? (
          <div className="size-5 rounded flex items-center justify-center bg-blue-500/10 shrink-0">
            <ProviderIcon providerId={providerId} size={14} type="color" />
          </div>
        ) : (
          <span className="material-symbols-outlined text-[16px] text-blue-500 shrink-0">
            smart_toy
          </span>
        )}
        <span className="text-xs font-semibold text-text truncate flex-1" title={label}>
          {label}
        </span>
      </div>

      {(connectionId || weight !== undefined) && (
        <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
          {connectionId && (
            <span className="truncate bg-black/5 dark:bg-white/5 px-1 rounded font-mono">
              conn: {connectionId}
            </span>
          )}
          {weight !== undefined && (
            <span className="font-mono bg-blue-500/10 text-blue-500 px-1 rounded">
              w:{weight}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderNode({ data }: { data: Record<string, unknown> }) {
  // SAFETY: typeof guards (see ModelNode for the rationale). ProviderId may
  // be null; label falls back to providerId, then to a stable default so
  // ProviderIcon never receives a non-string id.
  const providerId =
    typeof data.providerId === "string" ? data.providerId
    : typeof data.label === "string" ? data.label
    : "provider";
  const label = typeof data.label === "string" ? data.label : providerId;

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface shadow-xs min-w-[130px] max-w-[180px]"
      data-testid={`node-provider-${providerId}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-border !border-surface !w-2 !h-2"
      />

      <div className="size-5 rounded flex items-center justify-center bg-black/5 dark:bg-white/5 shrink-0">
        <ProviderIcon providerId={providerId} size={14} type="color" />
      </div>

      <span className="text-xs font-medium text-text truncate">
        {label}
      </span>
    </div>
  );
}

function UnresolvedNode({ data }: { data: Record<string, unknown> }) {
  // SAFETY: typeof guards; see ModelNode note above.
  const name =
    typeof data.name === "string" ? data.name
    : typeof data.label === "string" ? data.label
    : "unresolved";

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 min-w-[140px] max-w-[200px]"
      data-testid={`node-unresolved-${name}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-amber-500 !border-surface !w-2 !h-2"
      />

      <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0">
        warning
      </span>

      <span className="text-xs font-medium truncate">
        {name} (unresolved)
      </span>
    </div>
  );
}

// SAFETY: React Flow's `NodeTypes` expects `ComponentType<NodeProps<NodeData>>`
// where `NodeData` is a per-node generic parameter. Our node components declare
// `{ data: Record<string, unknown> }` which is a *supertype* (wider) of the
// concrete `TopologyNodeData` produced by `buildComboTopologyGraph` (note the
// `[key: string]: unknown` open index signature on `TopologyNodeData`). React
// Flow reconstructs the `data` object from the node array at runtime and passes
// it positionally — there is no prototype-chain or class-identity stripping
// because `TopologyNodeData` is a plain interface, not a class. The cast is
// therefore sound and is the same form used by `ProviderTopology` (U0). We use
// `as unknown as ...` to force narrowing rather than an unchecked `as any`.
/**
 * Resolve the inline label for a topology edge.
 *
 * Precedence (explicit via early-return, no nested ternary):
 *   1. Builder-supplied `label` (e.g. user-authored step label).
 *   2. Weight badge when a weight is present (`w:N`) — useful for weighted
 *      strategies and the same-model multi-account edge layer (test #12).
 *   3. Role name for non-structural slots (`judge`, `acting`, `combo-ref`)
 *      so the UI can visually distinguish fusion branches.
 *   4. `undefined` for plain model/provider edges (no label clutter).
 */
function resolveEdgeLabel(
  label: string | undefined,
  weight: number | undefined,
  role: string | undefined
): string | undefined {
  if (label) return label;
  if (weight !== undefined) return `w:${weight}`;
  if (role && role !== "model" && role !== "provider") return role;
  return undefined;
}

/**
 * Resolve the stroke color, dash pattern, width, and animation flag for a
 * topology edge based on its role and whether it closes a cycle. Extracted to
 * keep the mapping flat and precedence-explicit; mirrors the
 * `FLOW_EDGE_COLORS` palette from `edgeStyles.ts` but specializes for the
 * combo-topology role taxonomy (model / combo-ref / judge / acting / provider).
 */
function resolveEdgeStyle(
  role: string | undefined,
  isCycle: boolean
): { stroke: string; strokeWidth: number; strokeDasharray?: string; animated: boolean } {
  const isJudge = role === "judge";
  const isActing = role === "acting";
  const isProvider = role === "provider";

  if (isCycle) {
    return { stroke: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "5 5", animated: true };
  }
  if (isJudge) {
    return { stroke: "#8b5cf6", strokeWidth: 2, animated: true };
  }
  if (isActing) {
    return { stroke: "#ec4899", strokeWidth: 2, animated: true };
  }
  if (isProvider) {
    return {
      stroke: "var(--color-text-muted, #94a3b8)",
      strokeWidth: 1.5,
      strokeDasharray: "2 2",
      animated: false,
    };
  }
  // Default: model or combo-ref edges.
  return { stroke: "#3b82f6", strokeWidth: 1.5, animated: false };
}

const nodeTypes: NodeTypes = {
  combo: ComboNode as unknown as NodeTypes["combo"],
  model: ModelNode as unknown as NodeTypes["model"],
  provider: ProviderNode as unknown as NodeTypes["provider"],
  unresolved: UnresolvedNode as unknown as NodeTypes["unresolved"],
};

// ── Client Inner Component ───────────────────────────────────────────────────

function ComboTopologyClientInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [combos, setCombos] = useState<ComboTopologyInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedCombo = searchParams.get("combo") || "all";

  const fetchCombos = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/combos", { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: ComboTopologyInput[] = Array.isArray(data)
        ? data
        : (data?.combos ?? data?.data ?? []);
      setCombos(list);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load combos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCombos(controller.signal);
    return () => controller.abort();
  }, []);

  const handleComboSelection = (comboNameOrId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (comboNameOrId === "all") {
      params.delete("combo");
    } else {
      params.set("combo", comboNameOrId);
    }
    const queryStr = params.toString();
    router.replace(queryStr ? `/dashboard/combos/topology?${queryStr}` : "/dashboard/combos/topology", { scroll: false });
  };

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!combos || combos.length === 0) return { nodes: [], edges: [] };

    const rawGraph = buildComboTopologyGraph({
      combos,
      selection: selectedCombo,
    });

    const layout = layoutComboTopologyGraph(rawGraph.nodes, rawGraph.edges);

    const formattedNodes: Node[] = layout.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data,
      position: n.position,
    }));

    const formattedEdges: Edge[] = layout.edges.map((e) => {
      const isCycle = Boolean(e.data?.cycleClosing);
      const role = e.data?.role;
      const weight = e.data?.weight;
      const edgeStyleResolved = resolveEdgeStyle(
        typeof role === "string" ? role : undefined,
        isCycle
      );

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: resolveEdgeLabel(
          e.label,
          typeof weight === "number" ? weight : undefined,
          typeof role === "string" ? role : undefined
        ),
        animated: edgeStyleResolved.animated,
        style: {
          stroke: edgeStyleResolved.stroke,
          strokeWidth: edgeStyleResolved.strokeWidth,
          ...(edgeStyleResolved.strokeDasharray
            ? { strokeDasharray: edgeStyleResolved.strokeDasharray }
            : {}),
        },
        labelStyle: {
          fill: "var(--color-text-muted)",
          fontSize: 10,
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: "var(--color-bg-surface, #1e293b)",
          fillOpacity: 0.85,
        },
      };
    });

    return { nodes: formattedNodes, edges: formattedEdges };
  }, [combos, selectedCombo]);

  // Content-aware fit key: sorted node ids combined with selection. A pure
  // count (`${selectedCombo}-${nodes}-${edges}`) would miss identity changes
  // that preserve the count (e.g. swapping one combo for another in the same
  // selection), leaving React Flow on a stale graph with no refit. The node-id
  // digest is bounded by the visible graph size (5-30 nodes per the task
  // contract) so the string cost is negligible.
  const fitKey = useMemo(() => {
    const idDigest = flowNodes
      .map((n) => n.id)
      .sort()
      .join(",");
    return `${selectedCombo}|${idDigest}`;
  }, [flowNodes, selectedCombo]);

  return (
    <div className="flex h-[calc(100dvh-6rem)] min-h-[480px] flex-col gap-3 p-4" data-routing-hub-subnav="topology">
      <RoutingHubSubnav active="topology" />

      {/* Toolbar / Combo Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-3">
          <label htmlFor="combo-topology-select" className="text-xs font-semibold text-text-muted">
            Combo Selection:
          </label>
          <select
            id="combo-topology-select"
            value={selectedCombo}
            onChange={(e) => handleComboSelection(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-text shadow-xs outline-none focus:border-accent"
            data-testid="combo-topology-dropdown"
          >
            <option value="all">All Combos ({combos.length})</option>
            {combos.map((c) => {
              const val = c.name || c.id || "";
              if (!val) return null;
              return (
                <option key={val} value={val}>
                  {c.name || c.id}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>Nodes: <strong className="text-text">{flowNodes.length}</strong></span>
          <span>Edges: <strong className="text-text">{flowEdges.length}</strong></span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative min-h-0 flex-1 rounded-xl border border-border bg-surface/50 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            <span className="material-symbols-outlined animate-spin text-[24px] mr-2">
              progress_activity
            </span>
            Loading combo topology...
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-error">
            <span className="material-symbols-outlined text-[32px]">error</span>
            <p>{error}</p>
            <button
              onClick={() => fetchCombos()}
              className="mt-2 rounded-lg bg-surface border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-black/5 dark:hover:bg-white/5"
            >
              Retry
            </button>
          </div>
        ) : flowNodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-text-muted">
            <span className="material-symbols-outlined text-[32px]">account_tree</span>
            <p>No combo topology to display.</p>
          </div>
        ) : (
          <FlowCanvas
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitKey={fitKey}
            interactive={true}
          />
        )}
      </div>
    </div>
  );
}

// ── Exported Page Client with Suspense ───────────────────────────────────────

export default function ComboTopologyClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-6rem)] min-h-[480px] flex-col gap-3 p-4">
          <RoutingHubSubnav active="topology" />
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border bg-surface/50 text-sm text-text-muted">
            Loading topology view...
          </div>
        </div>
      }
    >
      <ComboTopologyClientInner />
    </Suspense>
  );
}
