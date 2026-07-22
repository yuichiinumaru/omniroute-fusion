/**
 * EPIC-20 Operations hub reform — topbar ids + path builders + redirect matrix (Task 0086 / T20-A).
 *
 * Freezes **exactly 10** Operations topbar peers and **one** path shape per family so
 * 0087–0100 implementers do not invent alternate homes, dual hosts
 * (`/dashboard/operations/x` vs `/operations/x`), extra primary leaves, or multi-topbar stacks.
 *
 * Product law: `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` §2 (I) + §5 (II).
 * Pattern: `epic19Rebalance.ts` (Task 0078).
 *
 * **Hub root freeze:** canonical hub is **`/operations`**. Shell default topbar selection
 * uses `OPERATIONS_DEFAULT_TOPBAR_ID` (`endpoints`) — not a second hub host.
 * Peer pages: **`/operations/{topbarId}`** only.
 *
 * **Not live yet:** Next.js `/operations/*` routes + chrome mount are **0087+**.
 * This module freezes destinations only (no product page cutover).
 *
 * **Traffic Inspector** is **out of Operations topbar** → Observe peer (T20-M / 0098).
 * Frozen destination: `EPIC20_TRAFFIC_INSPECTOR_PATH` via `buildObserveTrafficInspectorPath()`.
 */

import { buildObserveHubPath } from "./observeHub";
import {
  CONNECT_CATALOG_LEGACY_HREF,
  CONNECT_RETIRED_API_ENDPOINTS_HREF,
} from "./sidebarVisibility";

// ---------------------------------------------------------------------------
// Operations topbar ids (Epic §2 order — locked)
// ---------------------------------------------------------------------------

/**
 * Operations topbar peer ids — **exactly 10**, Epic §2 order.
 * Segment-2 under `/operations/{id}` — **one** peer list only (Hard Rule #22).
 * Do **not** add Endpoint APIs/Catalog/Context or MCP/A2A as topbar peers.
 */
export const OPERATIONS_TOPBAR_IDS = [
  "endpoints",
  "core-mcp",
  "agents",
  "cloud-agents",
  "a2a-acp-bridge",
  "skills",
  "integrations",
  "memory",
  "labs",
  "media",
] as const;

export type OperationsTopbarId = (typeof OPERATIONS_TOPBAR_IDS)[number];

const OPERATIONS_TOPBAR_ID_SET: ReadonlySet<string> = new Set(OPERATIONS_TOPBAR_IDS);

export function isOperationsTopbarId(value: string): value is OperationsTopbarId {
  return OPERATIONS_TOPBAR_ID_SET.has(value);
}

/**
 * Operator-facing topbar labels (Epic §2).
 * CoreMCP rename (MCP Server → CoreMCP) is frozen here for UI copy in later slices.
 */
export const OPERATIONS_TOPBAR_LABELS: Readonly<Record<OperationsTopbarId, string>> = {
  endpoints: "Endpoint",
  "core-mcp": "CoreMCP",
  agents: "Agents",
  "cloud-agents": "Cloud Agents",
  "a2a-acp-bridge": "A2A/ACP Bridge",
  skills: "Skills",
  integrations: "Integrations",
  memory: "Memory",
  labs: "Labs",
  media: "Media",
};

/**
 * Default topbar peer when shell mounts `/operations` without a segment.
 * Does **not** change hub root path — still `/operations` (not `/operations/endpoints`).
 */
export const OPERATIONS_DEFAULT_TOPBAR_ID = "endpoints" as const satisfies OperationsTopbarId;

// ---------------------------------------------------------------------------
// Path builders — single shape: `/operations` and `/operations/{id}`
// ---------------------------------------------------------------------------

/** Canonical Operations hub root (sidebar leaf target shape). */
export const OPERATIONS_HUB_PATH = "/operations" as const;

/**
 * Build Operations hub root URL.
 * **Frozen:** `/operations` (not `/operations/endpoints`).
 * Shells should highlight `OPERATIONS_DEFAULT_TOPBAR_ID` when path is hub root.
 */
export function buildOperationsHubPath(): typeof OPERATIONS_HUB_PATH {
  return OPERATIONS_HUB_PATH;
}

/**
 * Build Operations peer path: always `/operations/{id}`.
 * No query tabs as path shape; fusion blocks use collapsibles on the page (0088+).
 */
export function buildOperationsPath(id: OperationsTopbarId): `/${string}` {
  return `${OPERATIONS_HUB_PATH}/${id}`;
}

/**
 * Path for default peer content when implementers need an explicit endpoints URL
 * (e.g. deep-link equivalence). Hub root remains `buildOperationsHubPath()`.
 */
export function buildOperationsDefaultPath(): string {
  return buildOperationsPath(OPERATIONS_DEFAULT_TOPBAR_ID);
}

// ---------------------------------------------------------------------------
// Traffic Inspector → Observe (out of Operations topbar) — T20-M owns mount
// ---------------------------------------------------------------------------

/**
 * Observe operational panel id for Traffic Inspector.
 * **Not** a log `ObserveSource`. **Not** an Operations topbar id.
 * T20-M (0098) mounts the panel; this freezes the path shape only.
 */
export const OBSERVE_TRAFFIC_PANEL = "traffic" as const;

/**
 * Frozen Traffic Inspector destination under Observe.
 * Single concrete path — **no “or”**.
 * Shape matches EPIC-19 operational panels: `?panel=` on Observe hub
 * (`/dashboard/activity?panel=traffic`).
 *
 * Task 0098: live UI mounts under Observe hub; legacy
 * `/dashboard/tools/traffic-inspector` redirects here.
 */
export const EPIC20_TRAFFIC_INSPECTOR_PATH = "/dashboard/activity?panel=traffic" as const;

/**
 * Build Observe Traffic Inspector path (canonical `to` for traffic-inspector redirects).
 * Uses `panel=` only — never pollutes log `source` enum.
 * Equals `buildObserveTrafficPanelPath()` / `buildObserveOperationalPanelPath("traffic")`.
 */
export function buildObserveTrafficInspectorPath(): typeof EPIC20_TRAFFIC_INSPECTOR_PATH {
  const path = buildObserveHubPath("activity", { panel: OBSERVE_TRAFFIC_PANEL });
  return path as typeof EPIC20_TRAFFIC_INSPECTOR_PATH;
}

// ---------------------------------------------------------------------------
// Anti-leaf / anti multi-topbar freezes
// ---------------------------------------------------------------------------

/**
 * Surfaces that must **never** become primary sidebar leaves under EPIC-20.
 * Stay as Operations topbar peers or Observe peer — not `PRIMARY_SIDEBAR_ITEMS`.
 */
export const EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS = [
  "endpoints",
  "core-mcp",
  "agents",
  "cloud-agents",
  "a2a-acp-bridge",
  "skills",
  "integrations",
  "memory",
  "labs",
  "media",
  "testing",
  "mcp",
  "playground",
  "translator",
  "search-tools",
  "tools",
  "traffic-inspector",
] as const;

/**
 * Live Endpoint page tab values that must **not** become Operations topbar peer ids.
 * Content fuses under `endpoints` (apis/catalog) or `integrations` (context-sources).
 * @see EndpointPageClient ENDPOINT_TABS
 */
export const EPIC20_FORBIDDEN_ENDPOINT_SUBTOPBAR_IDS = [
  "apis",
  "catalog",
  "context-sources",
] as const;

/**
 * Live Endpoint protocol strip homes that leave Endpoint and must **not** reappear
 * as a second Operations “sub-topbar” family under endpoints.
 * CoreMCP = topbar `core-mcp`; A2A lives under `a2a-acp-bridge`.
 */
export const EPIC20_FORBIDDEN_PROTOCOL_SUBTOPBAR_IDS = ["mcp", "a2a"] as const;

/**
 * Live Memory page tab values that must not become topbar peers — stack under `memory`.
 */
export const EPIC20_FORBIDDEN_MEMORY_SUBTOPBAR_IDS = [
  "memories",
  "engine",
  "playground",
] as const;

// ---------------------------------------------------------------------------
// Redirect matrix (from → to) — implementers use builders only
// ---------------------------------------------------------------------------

export type Epic20RedirectHub = "operations" | "observe";

export type Epic20RedirectEntry = Readonly<{
  /** Legacy path or path+query operators may bookmark today. */
  from: string;
  /** Canonical destination produced by a path builder (no ad-hoc strings). */
  to: string;
  hub: Epic20RedirectHub;
  /**
   * Owning implementer slice (EPIC-20 child task id).
   * Matrix freeze is 0086; product redirects land with owner slices.
   */
  ownerTask:
    | "0087"
    | "0088"
    | "0089"
    | "0090"
    | "0091"
    | "0092"
    | "0093"
    | "0094"
    | "0095"
    | "0096"
    | "0097"
    | "0098"
    | "0099";
  /** Optional note (aliases, residual block/hash ownership). */
  note?: string;
}>;

/**
 * Full from→to matrix covering Epic §5 + inventory-discovered legacy aliases
 * (`operationsHub.ts`, `testingHub.ts`, `CONNECT_CATALOG_SSOT_HREF`).
 * Page-level `redirect()` wiring is **0087–0099** — this freezes destinations only.
 *
 * Every `to` is produced by `buildOperationsHubPath` / `buildOperationsPath` /
 * `buildObserveTrafficInspectorPath` (no divergent ad-hoc strings).
 */
export const OPERATIONS_REDIRECT_MATRIX: readonly Epic20RedirectEntry[] = [
  // --- Hub root ---
  {
    from: "/dashboard/operations",
    to: buildOperationsHubPath(),
    hub: "operations",
    ownerTask: "0087",
    note: "hub root freeze = /operations; shell default topbar id = endpoints",
  },

  // --- Endpoint (0088) ---
  {
    from: "/dashboard/api-manager",
    to: buildOperationsPath("endpoints"),
    hub: "operations",
    ownerTask: "0088",
    note: "API Keys block on Endpoint fusion",
  },
  {
    from: "/dashboard/endpoint",
    to: buildOperationsPath("endpoints"),
    hub: "operations",
    ownerTask: "0088",
  },
  {
    from: "/dashboard/endpoint?tab=apis",
    to: buildOperationsPath("endpoints"),
    hub: "operations",
    ownerTask: "0088",
    note: "apis is page collapsible residual, not topbar peer",
  },
  {
    // Pre-0088 catalog tab deep-link (CONNECT_CATALOG_LEGACY_HREF)
    from: CONNECT_CATALOG_LEGACY_HREF,
    to: buildOperationsPath("endpoints"),
    hub: "operations",
    ownerTask: "0088",
    note: "catalog block residual on endpoints fusion (0088); discovery uses CONNECT_CATALOG_SSOT_HREF",
  },
  {
    from: CONNECT_RETIRED_API_ENDPOINTS_HREF,
    to: buildOperationsPath("endpoints"),
    hub: "operations",
    ownerTask: "0088",
    note: "retired /dashboard/api-endpoints → catalog SSoT → endpoints",
  },
  {
    from: "/dashboard/endpoint?tab=context-sources",
    to: buildOperationsPath("integrations"),
    hub: "operations",
    ownerTask: "0094",
    note: "context-sources leave Endpoint dual strip → Integrations stack",
  },

  // --- CoreMCP (0089) ---
  {
    from: "/dashboard/mcp",
    to: buildOperationsPath("core-mcp"),
    hub: "operations",
    ownerTask: "0089",
    note: "rename MCP Server → CoreMCP in UI",
  },

  // --- Agents (0090) ---
  {
    from: "/dashboard/cli-agents",
    to: buildOperationsPath("agents"),
    hub: "operations",
    ownerTask: "0090",
  },
  {
    from: "/dashboard/cli-code",
    to: buildOperationsPath("agents"),
    hub: "operations",
    ownerTask: "0090",
  },

  // --- Cloud Agents (0091) ---
  {
    from: "/dashboard/cloud-agents",
    to: buildOperationsPath("cloud-agents"),
    hub: "operations",
    ownerTask: "0091",
  },

  // --- A2A/ACP Bridge (0092) ---
  {
    from: "/dashboard/tools/agent-bridge",
    to: buildOperationsPath("a2a-acp-bridge"),
    hub: "operations",
    ownerTask: "0092",
  },
  {
    from: "/dashboard/a2a",
    to: buildOperationsPath("a2a-acp-bridge"),
    hub: "operations",
    ownerTask: "0092",
  },
  {
    from: "/dashboard/acp-agents",
    to: buildOperationsPath("a2a-acp-bridge"),
    hub: "operations",
    ownerTask: "0092",
  },

  // --- Skills (0093) ---
  {
    from: "/dashboard/omni-skills",
    to: buildOperationsPath("skills"),
    hub: "operations",
    ownerTask: "0093",
    note: "Core Skills rename residual (Omni Skills → Core Skills)",
  },
  {
    from: "/dashboard/agent-skills",
    to: buildOperationsPath("skills"),
    hub: "operations",
    ownerTask: "0093",
  },

  // --- Integrations (0094) ---
  {
    from: "/dashboard/webhooks",
    to: buildOperationsPath("integrations"),
    hub: "operations",
    ownerTask: "0094",
  },
  {
    from: "/dashboard/plugins",
    to: buildOperationsPath("integrations"),
    hub: "operations",
    ownerTask: "0094",
  },

  // --- Memory (0095) ---
  {
    from: "/dashboard/memory",
    to: buildOperationsPath("memory"),
    hub: "operations",
    ownerTask: "0095",
  },
  {
    from: "/dashboard/memory?tab=memories",
    to: buildOperationsPath("memory"),
    hub: "operations",
    ownerTask: "0095",
    note: "kill apocryphal memories/engine/playground topbar; stack content",
  },
  {
    from: "/dashboard/memory?tab=engine",
    to: buildOperationsPath("memory"),
    hub: "operations",
    ownerTask: "0095",
  },
  {
    from: "/dashboard/memory?tab=playground",
    to: buildOperationsPath("memory"),
    hub: "operations",
    ownerTask: "0095",
  },

  // --- Labs (0096) + Testing absorb (0099) ---
  {
    from: "/dashboard/playground",
    to: buildOperationsPath("labs"),
    hub: "operations",
    ownerTask: "0096",
  },
  {
    from: "/dashboard/translator",
    to: buildOperationsPath("labs"),
    hub: "operations",
    ownerTask: "0096",
  },
  {
    from: "/dashboard/search-tools",
    to: buildOperationsPath("labs"),
    hub: "operations",
    ownerTask: "0096",
  },
  {
    from: "/dashboard/batch",
    to: buildOperationsPath("labs"),
    hub: "operations",
    ownerTask: "0096",
  },
  {
    from: "/dashboard/batch/files",
    to: buildOperationsPath("labs"),
    hub: "operations",
    ownerTask: "0096",
    note: "batch files = collapsible subsection of Labs Batch",
  },
  {
    from: "/dashboard/testing",
    to: buildOperationsPath("labs"),
    hub: "operations",
    ownerTask: "0099",
    note: "Testing hub absorbed; launchpad redirects to Labs (not Media)",
  },

  // --- Media (0097) ---
  {
    from: "/dashboard/cache/media",
    to: buildOperationsPath("media"),
    hub: "operations",
    ownerTask: "0097",
    note: "legacy /cache/media path; modality strip remains L1 under Media peer",
  },

  // --- Traffic Inspector → Observe (0098) — NOT Operations topbar ---
  {
    from: "/dashboard/tools/traffic-inspector",
    to: buildObserveTrafficInspectorPath(),
    hub: "observe",
    ownerTask: "0098",
    note: "Observe peer only; EPIC20_TRAFFIC_INSPECTOR_PATH = /dashboard/activity?panel=traffic",
  },
] as const;
