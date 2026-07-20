/**
 * EPIC-19 IA rebalance — destination matrix SSoT (Task 0078 / T19-A).
 *
 * Freezes **one shape per family** so 0079–0082 implementers do not invent
 * alternate homes (`?tab=` vs nested route, dual Dashboard hosts, etc.).
 *
 * Product law: `docs/tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md`
 * Audit: `docs/reports/audits/2026-07-19-wave3-frontend-ia-operator-claims-verification.md`
 *
 * Destination matrix + builders. Primary leaf drop (`analytics` / `costs`) landed in
 * Task **0082** — live chrome matches `EPIC19_TARGET_PRIMARY_SIDEBAR_IDS`.
 *
 * Observe operational panels use **`?panel=`** — **never** the log `source` enum
 * (`observeHub.ts` OBSERVE_SOURCES). Do not pollute source with combo-health / route-trace.
 */

import { OBSERVE_HUB_PATH, buildObserveHubPath } from "./observeHub";

// ---------------------------------------------------------------------------
// Providers config (nested under providers layout) — Task 0079 owns pages
// ---------------------------------------------------------------------------

/** Canonical Providers budget surface (frozen nested route). */
export const PROVIDERS_BUDGET_PATH = "/dashboard/providers/budget" as const;

/** Canonical Providers pricing surface (frozen nested route). */
export const PROVIDERS_PRICING_PATH = "/dashboard/providers/pricing" as const;

/** Canonical Providers quota-share surface (frozen nested route). */
export const PROVIDERS_QUOTA_SHARE_PATH = "/dashboard/providers/quota-share" as const;

export function buildProvidersBudgetPath(): typeof PROVIDERS_BUDGET_PATH {
  return PROVIDERS_BUDGET_PATH;
}

export function buildProvidersPricingPath(): typeof PROVIDERS_PRICING_PATH {
  return PROVIDERS_PRICING_PATH;
}

export function buildProvidersQuotaSharePath(): typeof PROVIDERS_QUOTA_SHARE_PATH {
  return PROVIDERS_QUOTA_SHARE_PATH;
}

// ---------------------------------------------------------------------------
// Observe operational panels (`?panel=`) — Task 0080 owns mounts
// Separate from log stream `?source=` (see observeHub.ts).
// ---------------------------------------------------------------------------

/**
 * Observe operational panel query values.
 * **Not** members of `ObserveSource` / `OBSERVE_SOURCES`.
 */
export type ObserveOperationalPanel = "combo-health" | "route-trace";

export const OBSERVE_OPERATIONAL_PANELS = ["combo-health", "route-trace"] as const satisfies readonly ObserveOperationalPanel[];

const OBSERVE_PANEL_SET: ReadonlySet<string> = new Set(OBSERVE_OPERATIONAL_PANELS);

export function isObserveOperationalPanel(value: string): value is ObserveOperationalPanel {
  return OBSERVE_PANEL_SET.has(value);
}

/**
 * Build Observe hub URL for an operational panel.
 * Uses `panel=` only (does not set `source` — default activity stream chrome).
 * For `route-trace`, optional `id` preserves analytics deep-link contract.
 */
export function buildObserveOperationalPanelPath(
  panel: ObserveOperationalPanel,
  extras?: Readonly<{ id?: string | null | undefined }>
): string {
  const params: Record<string, string | null | undefined> = { panel };
  if (panel === "route-trace" && extras?.id != null && extras.id !== "") {
    params.id = extras.id;
  }
  return buildObserveHubPath("activity", params);
}

export function buildObserveComboHealthPath(): string {
  return buildObserveOperationalPanelPath("combo-health");
}

/**
 * Route-trace surface on Observe hub.
 * Alias `route-explain` (legacy analytics tab) resolves to the same builder.
 * Pass `id` to preserve request deep links from analytics `?tab=route-trace&id=`.
 */
export function buildObserveRouteTracePath(id?: string | null): string {
  return buildObserveOperationalPanelPath("route-trace", { id });
}

/** Re-export hub path constant for discoverability docs (health stays deep-linked). */
export { OBSERVE_HUB_PATH };

/** Health remains a deep link (Task 0061); document discoverability on Observe hub. */
export const OBSERVE_HEALTH_DEEP_LINK = "/dashboard/health" as const;

// ---------------------------------------------------------------------------
// Dashboard storytelling (`/home?tab=`) — Task 0081 owns shell
// Matches live primary home leaf href: `/home` (sidebarVisibility.ts).
// ---------------------------------------------------------------------------

export type DashboardStoryTab =
  | "overview"
  | "evals"
  | "search"
  | "utilization"
  | "compression"
  | "costs-overview";

export const DASHBOARD_STORY_TABS = [
  "overview",
  "evals",
  "search",
  "utilization",
  "compression",
  "costs-overview",
] as const satisfies readonly DashboardStoryTab[];

const DASHBOARD_STORY_TAB_SET: ReadonlySet<string> = new Set(DASHBOARD_STORY_TABS);

export function isDashboardStoryTab(value: string): value is DashboardStoryTab {
  return DASHBOARD_STORY_TAB_SET.has(value);
}

/** Live home href — single Dashboard host (no dual `/dashboard/home`). */
export const DASHBOARD_STORY_HUB_PATH = "/home" as const;

/**
 * Build Dashboard storytelling URL: always `/home?tab=<id>` (single shape; tab never omitted).
 */
export function buildDashboardStoryPath(tab: DashboardStoryTab): string {
  const qs = new URLSearchParams();
  qs.set("tab", tab);
  return `${DASHBOARD_STORY_HUB_PATH}?${qs.toString()}`;
}

// ---------------------------------------------------------------------------
// Target primary chrome — live after Task 0082 (matches PRIMARY_SIDEBAR_ITEM_IDS)
// ---------------------------------------------------------------------------

/**
 * Primary sidebar ids after Task **0082** leaf drop.
 * Length **7**. Live SSoT also: `PRIMARY_SIDEBAR_ITEMS` in `sidebarVisibility.ts`.
 */
export const EPIC19_TARGET_PRIMARY_SIDEBAR_IDS = [
  "home",
  "providers",
  "combos",
  "activity",
  "operations",
  "settings-general",
  "docs",
] as const;

/** Leaves removed from default primary chrome by 0082 (hideable ids retained). */
export const EPIC19_LEAVES_TO_DROP = ["analytics", "costs"] as const;

/**
 * Surfaces that must **never** become primary leaves under EPIC-19
 * (stay under Operations → Testing hub).
 */
export const EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS = [
  "playground",
  "translator",
  "search-tools",
  "tools",
  "labs",
  "testing",
] as const;

// ---------------------------------------------------------------------------
// Redirect matrix (from → to) — implementers use builders only
// ---------------------------------------------------------------------------

export type Epic19RedirectHub = "providers" | "observe" | "dashboard";

export type Epic19RedirectEntry = Readonly<{
  /** Legacy path or path+query pattern operators may bookmark today. */
  from: string;
  /** Canonical destination produced by a path builder (no ad-hoc strings). */
  to: string;
  hub: Epic19RedirectHub;
  /** Owning implementer slice. */
  ownerTask: "0079" | "0080" | "0081";
  /** Optional note (aliases, id preservation). */
  note?: string;
}>;

/**
 * Full from→to matrix covering Epic §4 + inventory-discovered legacy aliases.
 * Page-level `redirect()` wiring is **0079–0081** — this freezes destinations only.
 */
export const EPIC19_REDIRECT_MATRIX: readonly Epic19RedirectEntry[] = [
  // --- Costs config → Providers (0079) ---
  {
    from: "/dashboard/costs/budget",
    to: buildProvidersBudgetPath(),
    hub: "providers",
    ownerTask: "0079",
  },
  {
    from: "/dashboard/costs/pricing",
    to: buildProvidersPricingPath(),
    hub: "providers",
    ownerTask: "0079",
  },
  {
    from: "/dashboard/costs/quota-share",
    to: buildProvidersQuotaSharePath(),
    hub: "providers",
    ownerTask: "0079",
  },
  // Legacy aliases into costs config
  {
    from: "/dashboard/usage?tab=budget",
    to: buildProvidersBudgetPath(),
    hub: "providers",
    ownerTask: "0079",
    note: "legacy usage budget tab; live redirect uses buildProvidersBudgetPath() (0079)",
  },
  {
    from: "/dashboard/settings/pricing",
    to: buildProvidersPricingPath(),
    hub: "providers",
    ownerTask: "0079",
    note: "legacy settings pricing route; live redirect uses buildProvidersPricingPath() (0079)",
  },

  // --- Analytics operational → Observe (0080) ---
  {
    from: "/dashboard/analytics?tab=combo-health",
    to: buildObserveComboHealthPath(),
    hub: "observe",
    ownerTask: "0080",
  },
  {
    from: "/dashboard/analytics/combo-health",
    to: buildObserveComboHealthPath(),
    hub: "observe",
    ownerTask: "0080",
    note: "nested analytics route today rewrites to ?tab=combo-health",
  },
  {
    from: "/dashboard/analytics?tab=route-trace",
    to: buildObserveRouteTracePath(),
    hub: "observe",
    ownerTask: "0080",
    note: "preserve id= via buildObserveRouteTracePath(id) when query has id",
  },
  {
    from: "/dashboard/analytics?tab=route-explain",
    to: buildObserveRouteTracePath(),
    hub: "observe",
    ownerTask: "0080",
    note: "legacy tab alias → same route-trace panel",
  },

  // --- Remaining analytics + costs overview → Dashboard storytelling (0081) ---
  {
    from: "/dashboard/analytics",
    to: buildDashboardStoryPath("overview"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/analytics?tab=overview",
    to: buildDashboardStoryPath("overview"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/analytics?tab=evals",
    to: buildDashboardStoryPath("evals"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/analytics/evals",
    to: buildDashboardStoryPath("evals"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/analytics?tab=search",
    to: buildDashboardStoryPath("search"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/analytics/search",
    to: buildDashboardStoryPath("search"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/analytics?tab=utilization",
    to: buildDashboardStoryPath("utilization"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/analytics/utilization",
    to: buildDashboardStoryPath("utilization"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/analytics?tab=compression",
    to: buildDashboardStoryPath("compression"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/analytics/compression",
    to: buildDashboardStoryPath("compression"),
    hub: "dashboard",
    ownerTask: "0081",
  },
  {
    from: "/dashboard/costs",
    to: buildDashboardStoryPath("costs-overview"),
    hub: "dashboard",
    ownerTask: "0081",
    note: "costs overview storytelling only; budget/pricing/quota-share stay Providers",
  },
] as const;

/**
 * Resolve route-trace deep link: preserve `id` when present on legacy analytics URLs.
 * Encodes the id= preservation rule for 0080 implementers.
 */
export function resolveEpic19RouteTraceDestination(
  id: string | null | undefined
): string {
  return buildObserveRouteTracePath(id);
}
