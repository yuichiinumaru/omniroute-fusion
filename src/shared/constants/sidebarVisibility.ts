/**
 * Sidebar IA — Epic 0005 guardrail
 * --------------------------------
 * Live chrome is **flat** (**9** primary leaves after Task 0059; budget ≤~10):
 * `PRIMARY_SIDEBAR_ITEMS` → `SIDEBAR_SECTIONS` (`main` + optional `devtools`).
 * Conceptual 7 pillars live only in `OPERATIONAL_PILLAR_SECTION_IDS` (docs/mapping)
 * — **not** accordion sections.
 *
 * Nested destinations (fusions, compression, MCP/A2A, logs) = in-page tabs / hubs /
 * command-palette extras — never default peer leaves.
 *
 * Do NOT add a default-visible leaf without:
 *  1. Mapping it to one of the 7 conceptual pillars
 *  2. Confirming it is not a strategy/engine/preset/table that belongs as a tab/row
 *  3. A note on Epic 0005 (or successor task)
 *
 * When removing a leaf: keep the route (or redirect), keep the hideable id if users
 * may have stored prefs, and log provenance under `.archive/sidebar/` — never silent delete.
 *
 * Pre-S6 / flat archives: `.archive/sidebar/2026-07-10-seven-pillars/`,
 * `.archive/sidebar/2026-07-10-flat-primary-nav/`
 */

export const HIDEABLE_SIDEBAR_ITEM_IDS = [
  // Home / pulse
  "home",
  // Registry / connect
  "api-manager",
  "endpoints",
  "providers",
  "embedded-services",
  "combos",
  "combos-live",
  "fusions",
  "quota",
  // Compression Context (Settings → Combos → engines → Studio)
  "context-settings",
  "context-combos",
  "context-caveman",
  "context-rtk",
  "context-headroom",
  "context-session-dedup",
  "context-ccr",
  "context-llmlingua",
  "context-lite",
  "context-aggressive",
  "context-ultra",
  "compression-studio",
  // Operations hub (Task 0059) + Tools
  "operations",
  "cli-code",
  "cli-agents",
  "acp-agents",
  "cloud-agents",
  "agent-bridge",
  "traffic-inspector",
  // Registry > Exposures / integrations
  "api-endpoints",
  "webhooks",
  // System > proxy
  "proxy",
  "mitm-proxy",
  "1proxy",
  // Observability / analytics
  "analytics",
  "analytics-combo-health",
  "analytics-utilization",
  "costs",
  "cache",
  "analytics-compression",
  "analytics-search",
  "analytics-evals",
  "provider-stats",
  // Observability — observe hub + collapsed stream leaves
  "activity",
  "logs",
  "logs-proxy",
  "logs-console",
  "logs-activity",
  "health",
  "runtime",
  // Governance > costs / economics
  "costs-pricing",
  "costs-budget",
  "costs-free-tiers",
  "costs-quota-share",
  "free-provider-rankings",
  // Observability — collapsed audit leaves
  "audit",
  "audit-mcp",
  "audit-a2a",
  // Dev Tools / Testing hub (Task 0060 — hub is not a primary leaf)
  "testing",
  "translator",
  "playground",
  "search-tools",
  // Operations > agentic
  "memory",
  "skills",
  "agent-skills",
  "mcp",
  "a2a",
  "plugins",
  // Gamification (demoted under Operations)
  "leaderboard",
  "profile",
  "tokens",
  // Registry modality / Operations batch
  "media",
  "batch",
  "batch-files",
  // System / settings
  "settings-general",
  "settings-appearance",
  "settings-ai",
  "settings-routing",
  "settings-resilience",
  "settings-advanced",
  "settings-security",
  "settings-access-tokens",
  "settings-feature-flags",
  "settings-sidebar",
  // Help
  "docs",
  "issues",
  "changelog",
] as const;

export type HideableSidebarItemId = (typeof HIDEABLE_SIDEBAR_ITEM_IDS)[number];

/**
 * Sidebar icons: neutral only — active state uses Tailwind `text-primary`
 * on the link; icons inherit via currentColor. The legacy per-item color
 * accent map was removed in Task 0052 (2026-07-12); this stub is kept as
 * a `currentColor` passthrough so existing tests asserting neutral icons
 * continue to pass.
 */
export function getSidebarIconAccent(_id: string): string {
  return "currentColor";
}

/**
 * Conceptual product pillars (IA mapping for hubs / docs).
 * These are NOT collapsible sidebar sections — navigation is flat primary leaves.
 */
export const OPERATIONAL_PILLAR_SECTION_IDS = [
  "core-pulse",
  "registry",
  "routing",
  "governance",
  "operations",
  "observability",
  "system",
] as const;

export type OperationalPillarSectionId = (typeof OPERATIONAL_PILLAR_SECTION_IDS)[number];

/** Flat sidebar chrome only — no accordion sections. */
export type SidebarSectionId = "main" | "devtools";

export interface SidebarItemDefinition {
  id: HideableSidebarItemId;
  href: string;
  i18nKey: string;
  subtitleKey?: string;
  /** Literal label shown when `i18nKey` has no translation (avoids per-locale edits). */
  labelFallback?: string;
  /** Literal subtitle shown when `subtitleKey` is absent/untranslated. */
  subtitleFallback?: string;
  icon: string;
  exact?: boolean;
  external?: boolean;
}

export interface SidebarItemGroup {
  type: "group";
  id: string;
  titleKey: string;
  titleFallback: string;
  items: readonly SidebarItemDefinition[];
}

export type SidebarSectionChild = SidebarItemDefinition | SidebarItemGroup;

export interface SidebarSectionDefinition {
  id: SidebarSectionId;
  titleKey: string;
  titleFallback: string;
  children: readonly SidebarSectionChild[];
  showTitle?: boolean;
  visibility?: "always" | "debug";
  defaultPinned?: boolean;
}

export function getSectionItems(
  section: SidebarSectionDefinition | { children: readonly SidebarSectionChild[] }
): readonly SidebarItemDefinition[] {
  return section.children.flatMap((child) =>
    "type" in child && child.type === "group" ? child.items : [child as SidebarItemDefinition]
  );
}

// ─── Hub inventories & retired-id contracts (not mounted as accordion) ───────
// Pre-flat pillar arrays (CORE_PULSE…HELP) were deleted 2026-07-18 (Task 0025 F4).
// Archives: `.archive/sidebar/2026-07-10-seven-pillars/`,
// `.archive/sidebar/2026-07-10-flat-primary-nav/`.
// Live chrome is PRIMARY_SIDEBAR_ITEMS only. Nested destinations = hubs / tabs /
// command palette / hideable deep links.

/**
 * Connect / exposure dual-nav retired (Epic 0005 S5).
 * `api-endpoints` → `/dashboard/endpoint?tab=catalog` (SSoT Connect surface).
 * MCP/A2A single homes under Operations hub / protocol pages.
 * Hideable id retained for stored prefs. Snapshot:
 * `.archive/sidebar/2026-07-10-connect-exposure/SNAPSHOT.md`
 */
export const CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS = ["api-endpoints"] as const;

/**
 * Catalog SSoT (Task 0024). Retired `/dashboard/api-endpoints` redirects here.
 * Discovery surfaces (Operations hub, palette, Header) must use this href —
 * never re-list the retired path as a peer destination.
 */
export const CONNECT_CATALOG_SSOT_HREF = "/dashboard/endpoint?tab=catalog" as const;

/** Redirect-only legacy path for the catalog surface (not a discovery peer). */
export const CONNECT_RETIRED_API_ENDPOINTS_HREF = "/dashboard/api-endpoints" as const;

/**
 * Engine strategies are routes + settings rows, NOT sidebar leaves (Epic 0005 S3).
 * Deep links `/dashboard/context/{engine}` still work; hideable ids kept for prefs.
 * Snapshot: `.archive/sidebar/2026-07-10-ia-collapse/SNAPSHOT.md`
 */
export const COMPRESSION_ENGINE_SIDEBAR_IDS = [
  "context-caveman",
  "context-rtk",
  "context-headroom",
  "context-session-dedup",
  "context-ccr",
  "context-llmlingua",
  "context-lite",
  "context-aggressive",
  "context-ultra",
] as const;

/**
 * Compression hub inventory (settings / combos / studio) — not a sidebar group.
 * Routing hub subnav + deep links surface these destinations.
 */
export const COMPRESSION_CONTEXT_GROUP: SidebarItemGroup = {
  type: "group",
  id: "compression-context",
  titleKey: "compressionContextGroup",
  titleFallback: "Compression Context",
  items: [
    {
      id: "context-settings",
      href: "/dashboard/context/settings",
      i18nKey: "contextSettings",
      labelFallback: "Compression Settings",
      subtitleFallback: "Global defaults + engines",
      icon: "settings",
    },
    {
      id: "context-combos",
      href: "/dashboard/context/combos",
      i18nKey: "contextCombos",
      subtitleKey: "contextCombosSubtitle",
      icon: "hub",
    },
    {
      id: "compression-studio",
      href: "/dashboard/compression/studio",
      i18nKey: "compressionStudio",
      labelFallback: "Compression Studio",
      subtitleFallback: "Live engine cascade",
      icon: "monitoring",
    },
  ],
};

/**
 * Analytics dual-nav leaves retired (Epic 0005 S2). Nested routes redirect to
 * `/dashboard/analytics?tab=…`. Hideable ids retained for stored prefs.
 * Snapshot: `.archive/sidebar/2026-07-10-ia-collapse/SNAPSHOT.md`
 */
export const ANALYTICS_DUAL_NAV_SIDEBAR_IDS = [
  "analytics-combo-health",
  "analytics-utilization",
  "analytics-compression",
  "analytics-search",
  "analytics-evals",
] as const;

/**
 * Observe / Execution Stream hub (Epic 0005 S4).
 * Collapses former Activity + Logs* + Audit* peer leaves into one default leaf.
 * Nested routes redirect to `/dashboard/activity?source=…`.
 * Hideable ids for retired leaves retained in HIDEABLE_SIDEBAR_ITEM_IDS.
 * Snapshot: `.archive/sidebar/2026-07-10-observe-stream/SNAPSHOT.md`
 * @see OBSERVE_STREAM_SIDEBAR_IDS in `./observeHub.ts`
 */

/**
 * Health dashboard nav target (Task 0061).
 * Keep `/dashboard/health` + hideable id `health`. Not a primary sidebar leaf and
 * not an Observe log-stream tab — discoverable via Observe hub link + command palette.
 */
export const HEALTH_NAV_ITEM: SidebarItemDefinition = {
  id: "health",
  href: "/dashboard/health",
  i18nKey: "health",
  labelFallback: "Health",
  subtitleKey: "healthSubtitle",
  subtitleFallback: "System health, breakers, and rate limits",
  icon: "health_and_safety",
};

/**
 * Costs hub deep destinations (hideable only — not primary peers).
 * Primary chrome exposes a single `costs` leaf → `/dashboard/costs`.
 * Plans screen (`costs-quota-plans`) was retired into PoolWizard Step 2.
 */
export const COSTS_HUB_DEEP_LINK_IDS = [
  "quota",
  "costs-quota-share",
  "costs-pricing",
  "costs-budget",
  "costs-free-tiers",
  "free-provider-rankings",
] as const;

/** Debug tools section remains empty unless debug mode mounts extras later. */
const DEVTOOLS_ITEMS: readonly SidebarItemDefinition[] = [];

// ─── Flat primary nav (~10 leaves; no accordion groups) ──────────────────────
// Nested destinations live as in-page tabs/subnav, not sidebar collapsibles.
// Full page inventory still routable via hideable ids + deep links/redirects.

/**
 * Exactly the default-visible primary leaves (target ≤ 10).
 * Order = product priority. Debug tools are a separate section when debug mode is on.
 */
export const PRIMARY_SIDEBAR_ITEMS: readonly SidebarItemDefinition[] = [
  {
    id: "home",
    href: "/home",
    i18nKey: "dashboard",
    labelFallback: "Dashboard",
    icon: "home",
    exact: true,
  },
  {
    id: "providers",
    href: "/dashboard/providers",
    i18nKey: "providers",
    labelFallback: "Providers",
    subtitleFallback: "Models · services · exposures",
    icon: "dns",
  },
  {
    id: "combos",
    href: "/dashboard/combos",
    i18nKey: "routingNav",
    labelFallback: "Routing",
    subtitleFallback: "Combos · fusions · compression",
    icon: "alt_route",
  },
  {
    id: "activity",
    href: "/dashboard/activity",
    i18nKey: "observeNav",
    labelFallback: "Observe",
    subtitleFallback: "Logs · audit · health",
    icon: "timeline",
  },
  {
    id: "analytics",
    href: "/dashboard/analytics",
    i18nKey: "analytics",
    labelFallback: "Analytics",
    // Do not lead with "Usage" — that vocabulary is token-volume (usageSubtitle), not this hub.
    subtitleFallback: "Charts · evals · health",
    icon: "analytics",
  },
  {
    id: "costs",
    href: "/dashboard/costs",
    i18nKey: "costsNav",
    labelFallback: "Costs",
    subtitleFallback: "Budget · pricing · quota",
    icon: "payments",
  },
  /**
   * Operations hub (Task 0059 Option A).
   * Absorbs former primary "API Keys" leaf; `/dashboard/api-manager` remains deep-linked
   * from the hub. Hideable id `api-manager` retained for stored prefs.
   * Former Operations leaf was `cli-code` → `/dashboard/cli-code`; that route remains.
   */
  {
    id: "operations",
    href: "/dashboard/operations",
    i18nKey: "operationsNav",
    labelFallback: "Operations",
    subtitleFallback: "API · agents · integrations",
    icon: "manufacturing",
  },
  {
    id: "settings-general",
    href: "/dashboard/settings/general",
    i18nKey: "settingsNav",
    labelFallback: "Settings",
    subtitleFallback: "System · interface · network",
    icon: "settings",
  },
  {
    id: "docs",
    href: "/docs",
    i18nKey: "docs",
    labelFallback: "Docs",
    subtitleFallback: "Guides · changelog",
    icon: "menu_book",
    external: true,
  },
];

export const PRIMARY_SIDEBAR_ITEM_IDS = PRIMARY_SIDEBAR_ITEMS.map((i) => i.id);

/** Flat sidebar: one always-open main list + optional debug tools (no section accordion). */
export const SIDEBAR_SECTIONS: readonly SidebarSectionDefinition[] = [
  {
    id: "main",
    titleKey: "mainNav",
    titleFallback: "Main",
    children: PRIMARY_SIDEBAR_ITEMS,
    showTitle: false,
  },
  {
    id: "devtools",
    titleKey: "devtoolsSection",
    titleFallback: "Dev Tools",
    children: DEVTOOLS_ITEMS,
    visibility: "debug",
    showTitle: false,
  },
] as const;

// ─── Ordering & preset setting keys ──────────────────────────────────────────

export const HIDDEN_SIDEBAR_ITEMS_SETTING_KEY = "hiddenSidebarItems";
export const SIDEBAR_SECTION_ORDER_KEY = "sidebarSectionOrder";
export const SIDEBAR_ITEM_ORDER_KEY = "sidebarItemOrder";
export const SIDEBAR_PRESET_KEY = "sidebarActivePreset";
export const SIDEBAR_SETTINGS_UPDATED_EVENT = "omniroute:settings-updated";

// ─── Preset types & definitions ───────────────────────────────────────────────

export type SidebarPresetId = "all" | "minimal" | "developer" | "admin";

export interface SidebarPresetDefinition {
  id: SidebarPresetId;
  icon: string;
  hiddenItems: HideableSidebarItemId[];
}

/** Flat primary nav role views (all ≤ 10 default leaves). */
const MINIMAL_SHOWN: ReadonlySet<HideableSidebarItemId> = new Set([
  "home",
  "providers",
  "combos",
  "operations",
  "activity",
  "settings-general",
  "docs",
]);

/**
 * Developer: ops-focused primary hubs (hide marketing Docs).
 * Lab destinations (translator / playground / search-tools) are NOT sidebar items
 * (Task 0060 reopen) — discover via Testing hub / command palette / direct routes.
 */
const DEVELOPER_SHOWN: ReadonlySet<HideableSidebarItemId> = new Set([
  "home",
  "providers",
  "combos",
  "operations",
  "activity",
  "analytics",
  "costs",
  "settings-general",
  // docs intentionally omitted — differentiates vs all/admin primary sets
]);

/** Admin: full primary chrome (includes Docs). Off-tree settings ids remain hideable prefs only. */
const ADMIN_SHOWN: ReadonlySet<HideableSidebarItemId> = new Set([
  ...PRIMARY_SIDEBAR_ITEM_IDS,
  "settings-security",
  "settings-feature-flags",
]);

function buildHiddenList(shown: ReadonlySet<HideableSidebarItemId>): HideableSidebarItemId[] {
  return HIDEABLE_SIDEBAR_ITEM_IDS.filter((id) => !shown.has(id));
}

export const SIDEBAR_PRESETS: readonly SidebarPresetDefinition[] = [
  { id: "all", icon: "select_all", hiddenItems: [] },
  { id: "minimal", icon: "minimize", hiddenItems: buildHiddenList(MINIMAL_SHOWN) },
  { id: "developer", icon: "code", hiddenItems: buildHiddenList(DEVELOPER_SHOWN) },
  { id: "admin", icon: "admin_panel_settings", hiddenItems: buildHiddenList(ADMIN_SHOWN) },
];

export type SidebarItemOrder = Partial<Record<SidebarSectionId, string[]>>;

// ─── Ordering utilities ───────────────────────────────────────────────────────

export function applySectionOrder(
  sections: readonly SidebarSectionDefinition[],
  order: SidebarSectionId[]
): SidebarSectionDefinition[] {
  if (order.length === 0) return [...sections];
  const knownIds = new Set(sections.map((s) => s.id));
  const validOrder = order.filter((id) => knownIds.has(id));
  const orderMap = new Map(validOrder.map((id, i) => [id, i]));
  return [...sections].sort((a, b) => {
    const ai = orderMap.get(a.id) ?? validOrder.length + sections.indexOf(a);
    const bi = orderMap.get(b.id) ?? validOrder.length + sections.indexOf(b);
    return ai - bi;
  });
}

export function applyItemOrder(
  children: readonly SidebarSectionChild[],
  order: string[]
): SidebarSectionChild[] {
  if (order.length === 0) return [...children];
  const getChildId = (c: SidebarSectionChild): string =>
    "type" in c && c.type === "group" ? c.id : (c as SidebarItemDefinition).id;
  const knownIds = new Set(children.map(getChildId));
  const validOrder = order.filter((id) => knownIds.has(id));
  const orderMap = new Map(validOrder.map((id, i) => [id, i]));
  return [...children].sort((a, b) => {
    const aId = getChildId(a);
    const bId = getChildId(b);
    const ai = orderMap.get(aId) ?? validOrder.length + children.indexOf(a);
    const bi = orderMap.get(bId) ?? validOrder.length + children.indexOf(b);
    return ai - bi;
  });
}

// ─── Settings helpers ─────────────────────────────────────────────────────────

export function normalizeHiddenSidebarItems(value: unknown): HideableSidebarItemId[] {
  if (!Array.isArray(value)) return [];

  const hiddenItems = new Set<HideableSidebarItemId>();

  for (const item of value) {
    if (
      typeof item === "string" &&
      HIDEABLE_SIDEBAR_ITEM_IDS.includes(item as HideableSidebarItemId)
    ) {
      hiddenItems.add(item as HideableSidebarItemId);
    }
  }

  return HIDEABLE_SIDEBAR_ITEM_IDS.filter((item) => hiddenItems.has(item));
}

/** Visible default-tree leaf count for a preset (non-debug sections only). */
export function countPresetVisibleLeaves(presetId: SidebarPresetId): number {
  const preset = SIDEBAR_PRESETS.find((p) => p.id === presetId);
  if (!preset) return 0;
  const hidden = new Set(preset.hiddenItems);
  const defaultLeafIds = SIDEBAR_SECTIONS.filter((section) => section.visibility !== "debug").flatMap(
    (section) => getSectionItems(section).map((item) => item.id)
  );
  return defaultLeafIds.filter((id) => !hidden.has(id)).length;
}
