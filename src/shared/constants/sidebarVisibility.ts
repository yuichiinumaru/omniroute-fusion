/**
 * Sidebar IA — Epic 0005 guardrail
 * --------------------------------
 * Live chrome is **flat** (~10 primary leaves): `PRIMARY_SIDEBAR_ITEMS` → `SIDEBAR_SECTIONS`
 * (`main` + optional `devtools`). Conceptual 7 pillars live only in
 * `OPERATIONAL_PILLAR_SECTION_IDS` (docs/mapping) — **not** accordion sections.
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

// ─── Item arrays ────────────────────────────────────────────────────────────

const CORE_PULSE_ITEMS: readonly SidebarItemDefinition[] = [
  {
    id: "home",
    href: "/home",
    i18nKey: "home",
    subtitleKey: "homeSubtitle",
    icon: "home",
    exact: true,
  },
  {
    id: "health",
    href: "/dashboard/health",
    i18nKey: "health",
    subtitleKey: "healthSubtitle",
    icon: "health_and_safety",
  },
];

/**
 * Connect / exposure dual-nav retired (Epic 0005 S5).
 * `api-endpoints` → `/dashboard/endpoint?tab=catalog` (SSoT Connect surface).
 * MCP/A2A single homes under Registry exposures.
 * Hideable id retained for stored prefs. Snapshot:
 * `.archive/sidebar/2026-07-10-connect-exposure/SNAPSHOT.md`
 */
export const CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS = ["api-endpoints"] as const;

const EXPOSURES_GROUP: SidebarItemGroup = {
  type: "group",
  id: "exposures",
  titleKey: "exposuresGroup",
  titleFallback: "Exposures",
  items: [
    {
      id: "endpoints",
      href: "/dashboard/endpoint",
      i18nKey: "endpoints",
      subtitleKey: "endpointsSubtitle",
      icon: "api",
    },
    {
      id: "mcp",
      href: "/dashboard/mcp",
      i18nKey: "mcp",
      subtitleKey: "mcpSubtitle",
      icon: "hub",
    },
    {
      id: "a2a",
      href: "/dashboard/a2a",
      i18nKey: "a2a",
      subtitleKey: "a2aSubtitle",
      icon: "device_hub",
    },
    {
      id: "webhooks",
      href: "/dashboard/webhooks",
      i18nKey: "webhooks",
      subtitleKey: "webhooksSubtitle",
      icon: "webhook",
    },
  ],
};

const REGISTRY_ITEMS: readonly SidebarSectionChild[] = [
  {
    id: "providers",
    href: "/dashboard/providers",
    i18nKey: "providers",
    subtitleKey: "providersSubtitle",
    icon: "dns",
  },
  {
    id: "embedded-services",
    href: "/dashboard/providers/services",
    i18nKey: "embeddedServices",
    labelFallback: "Embedded Services",
    subtitleKey: "embeddedServicesSubtitle",
    subtitleFallback: "Local process services (not outbound proxy)",
    icon: "deployed_code",
  },
  {
    id: "media",
    href: "/dashboard/cache/media",
    i18nKey: "media",
    subtitleKey: "mediaSubtitle",
    icon: "perm_media",
  },
  EXPOSURES_GROUP,
];

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

export const COMPRESSION_CONTEXT_GROUP: SidebarItemGroup = {
  type: "group",
  id: "compression-context",
  titleKey: "compressionContextGroup",
  titleFallback: "Compression Context",
  // Hub only: Settings → Combos → Studio. Engines live inside Settings / deep links.
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

const ROUTING_ITEMS: readonly SidebarSectionChild[] = [
  {
    id: "combos",
    href: "/dashboard/combos",
    i18nKey: "combos",
    subtitleKey: "combosSubtitle",
    icon: "layers",
  },
  {
    id: "combos-live",
    href: "/dashboard/combos/live",
    i18nKey: "combosLive",
    labelFallback: "Combo Studio",
    subtitleFallback: "Live routing cascade",
    icon: "account_tree",
  },
  {
    id: "fusions",
    href: "/dashboard/fusions",
    i18nKey: "fusions",
    subtitleKey: "fusionsSubtitle",
    labelFallback: "Fusions",
    subtitleFallback: "Panel + judge model combos",
    icon: "hub",
  },
  COMPRESSION_CONTEXT_GROUP,
  {
    id: "settings-routing",
    href: "/dashboard/settings/routing",
    i18nKey: "globalRouting",
    subtitleKey: "globalRoutingSubtitle",
    icon: "route",
  },
];

const GOVERNANCE_ITEMS: readonly SidebarItemDefinition[] = [
  {
    id: "api-manager",
    href: "/dashboard/api-manager",
    i18nKey: "apiManager",
    subtitleKey: "apiManagerSubtitle",
    icon: "vpn_key",
  },
  {
    id: "settings-access-tokens",
    href: "/dashboard/settings/access-tokens",
    i18nKey: "settingsAccessTokens",
    labelFallback: "Access Tokens",
    subtitleKey: "settingsAccessTokensSubtitle",
    icon: "key",
  },
  {
    id: "settings-security",
    href: "/dashboard/settings/security",
    i18nKey: "settingsSecurity",
    subtitleKey: "settingsSecuritySubtitle",
    icon: "shield",
  },
  {
    id: "quota",
    href: "/dashboard/quota",
    i18nKey: "providerQuota",
    subtitleKey: "providerQuotaSubtitle",
    icon: "tune",
  },
  {
    id: "costs-quota-share",
    href: "/dashboard/costs/quota-share",
    i18nKey: "costsQuotaShare",
    subtitleKey: "costsQuotaShareSubtitle",
    icon: "pie_chart",
  },
  {
    id: "costs",
    href: "/dashboard/costs",
    i18nKey: "costsOverview",
    subtitleKey: "costsOverviewSubtitle",
    icon: "account_balance_wallet",
  },
  {
    id: "costs-pricing",
    href: "/dashboard/costs/pricing",
    i18nKey: "costsPricing",
    subtitleKey: "costsPricingSubtitle",
    icon: "price_change",
  },
  {
    id: "costs-budget",
    href: "/dashboard/costs/budget",
    i18nKey: "costsBudget",
    subtitleKey: "costsBudgetSubtitle",
    icon: "savings",
  },
  {
    id: "costs-free-tiers",
    href: "/dashboard/free-tiers",
    i18nKey: "costsFreeTiers",
    subtitleKey: "costsFreeTiersSubtitle",
    icon: "request_quote",
  },
  {
    id: "free-provider-rankings",
    href: "/dashboard/free-provider-rankings",
    i18nKey: "freeProviderRankings",
    subtitleKey: "freeProviderRankingsSubtitle",
    icon: "leaderboard",
  },
];

const TOOLS_GROUP: SidebarItemGroup = {
  type: "group",
  id: "tools",
  titleKey: "toolsGroup",
  titleFallback: "Tools",
  items: [
    {
      id: "cli-code",
      href: "/dashboard/cli-code",
      i18nKey: "cliCode",
      subtitleKey: "cliCodeSubtitle",
      icon: "terminal",
    },
    {
      id: "cli-agents",
      href: "/dashboard/cli-agents",
      i18nKey: "cliAgents",
      subtitleKey: "cliAgentsSubtitle",
      icon: "smart_toy",
    },
    {
      id: "acp-agents",
      href: "/dashboard/acp-agents",
      i18nKey: "acpAgents",
      subtitleKey: "acpAgentsSubtitle",
      icon: "device_hub",
    },
    {
      id: "cloud-agents",
      href: "/dashboard/cloud-agents",
      i18nKey: "cloudAgents",
      subtitleKey: "cloudAgentsSubtitle",
      icon: "cloud",
    },
    {
      id: "agent-bridge",
      href: "/dashboard/tools/agent-bridge",
      i18nKey: "agentBridge",
      subtitleKey: "agentBridgeSubtitle",
      icon: "link",
    },
    {
      id: "traffic-inspector",
      href: "/dashboard/tools/traffic-inspector",
      i18nKey: "trafficInspector",
      subtitleKey: "trafficInspectorSubtitle",
      icon: "network_check",
    },
  ],
};

const BATCH_GROUP: SidebarItemGroup = {
  type: "group",
  id: "batch",
  titleKey: "batchGroup",
  titleFallback: "Batch",
  items: [
    {
      id: "batch",
      href: "/dashboard/batch",
      i18nKey: "batch",
      subtitleKey: "batchSubtitle",
      icon: "view_list",
    },
    {
      id: "batch-files",
      href: "/dashboard/batch/files",
      i18nKey: "batchFiles",
      subtitleKey: "batchFilesSubtitle",
      icon: "folder",
    },
  ],
};

const AGENTIC_GROUP: SidebarItemGroup = {
  type: "group",
  id: "agentic",
  titleKey: "agenticGroup",
  titleFallback: "Agentic",
  items: [
    {
      id: "memory",
      href: "/dashboard/memory",
      i18nKey: "memory",
      subtitleKey: "memorySubtitle",
      icon: "psychology",
    },
    {
      id: "agent-skills",
      href: "/dashboard/agent-skills",
      i18nKey: "agentSkills",
      labelFallback: "Agent Skills",
      subtitleKey: "agentSkillsSubtitle",
      subtitleFallback: "Outbound SKILL.md for external agents",
      icon: "share",
    },
    {
      id: "skills",
      href: "/dashboard/omni-skills",
      i18nKey: "omniSkills",
      labelFallback: "Omni Skills",
      subtitleKey: "omniSkillsSubtitle",
      subtitleFallback: "Inbound sandbox tools for model requests",
      icon: "auto_fix_high",
    },
    {
      id: "plugins",
      href: "/dashboard/plugins",
      i18nKey: "plugins",
      labelFallback: "Plugins",
      subtitleKey: "pluginsSubtitle",
      subtitleFallback: "Installable dashboard plugins (not MCP tools)",
      icon: "extension",
    },
  ],
};

const GAMIFICATION_GROUP: SidebarItemGroup = {
  type: "group",
  id: "gamification",
  titleKey: "gamificationGroup",
  titleFallback: "Gamification",
  items: [
    {
      id: "leaderboard",
      href: "/dashboard/leaderboard",
      i18nKey: "leaderboard",
      subtitleKey: "leaderboardSubtitle",
      icon: "emoji_events",
    },
    {
      id: "profile",
      href: "/dashboard/profile",
      i18nKey: "profile",
      subtitleKey: "profileSubtitle",
      icon: "person",
    },
    {
      id: "tokens",
      href: "/dashboard/tokens",
      i18nKey: "tokens",
      subtitleKey: "tokensSubtitle",
      icon: "toll",
    },
  ],
};

const OPERATIONS_ITEMS: readonly SidebarSectionChild[] = [
  TOOLS_GROUP,
  BATCH_GROUP,
  AGENTIC_GROUP,
  GAMIFICATION_GROUP,
];

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
 * Observability destinations (conceptual pillar inventory).
 * Flat primary chrome only exposes the Observe hub leaf (`activity`).
 */
const OBSERVABILITY_ITEMS: readonly SidebarItemDefinition[] = [
  {
    id: "activity",
    href: "/dashboard/activity",
    i18nKey: "activity",
    subtitleKey: "activitySubtitle",
    subtitleFallback: "Unified event stream — activity, logs, and audit",
    icon: "timeline",
  },
  HEALTH_NAV_ITEM,
  {
    id: "analytics",
    href: "/dashboard/analytics",
    i18nKey: "analytics",
    subtitleKey: "analyticsSubtitle",
    labelFallback: "Analytics",
    subtitleFallback: "Charts, trends, evals, and utilization",
    icon: "analytics",
  },
  {
    id: "cache",
    href: "/dashboard/cache",
    i18nKey: "cache",
    subtitleKey: "cacheSubtitle",
    icon: "cached",
  },
  {
    id: "provider-stats",
    href: "/dashboard/provider-stats",
    i18nKey: "providerStats",
    subtitleKey: "providerStatsSubtitle",
    icon: "speed",
  },
  {
    id: "runtime",
    href: "/dashboard/runtime",
    i18nKey: "runtime",
    subtitleKey: "runtimeSubtitle",
    icon: "bolt",
  },
];

const SYSTEM_ITEMS: readonly SidebarItemDefinition[] = [
  {
    id: "settings-general",
    href: "/dashboard/settings/general",
    i18nKey: "settingsGeneral",
    labelFallback: "Data & Storage",
    subtitleKey: "settingsGeneralSubtitle",
    subtitleFallback: "Database, backups, and retention",
    icon: "tune",
  },
  {
    id: "settings-appearance",
    href: "/dashboard/settings/appearance",
    i18nKey: "settingsAppearance",
    // Task 0061 Option B: functional prefs only (theme/branding removed in 0053).
    labelFallback: "Interface",
    subtitleKey: "settingsAppearanceSubtitle",
    subtitleFallback: "Tunnels, home pins, and display prefs",
    icon: "display_settings",
  },
  {
    id: "settings-ai",
    href: "/dashboard/settings/ai",
    i18nKey: "settingsAi",
    subtitleKey: "settingsAiSubtitle",
    icon: "auto_awesome",
  },
  {
    id: "settings-resilience",
    href: "/dashboard/settings/resilience",
    i18nKey: "settingsResilience",
    subtitleKey: "settingsResilienceSubtitle",
    icon: "health_and_safety",
  },
  {
    id: "settings-advanced",
    href: "/dashboard/settings/advanced",
    i18nKey: "settingsAdvanced",
    subtitleKey: "settingsAdvancedSubtitle",
    icon: "engineering",
  },
  {
    id: "settings-feature-flags",
    href: "/dashboard/settings/feature-flags",
    i18nKey: "settingsFeatureFlags",
    subtitleKey: "settingsFeatureFlagsSubtitle",
    icon: "flag",
  },
  {
    id: "settings-sidebar",
    href: "/dashboard/settings/sidebar",
    i18nKey: "settingsSidebar",
    subtitleKey: "settingsSidebarSubtitle",
    icon: "view_sidebar",
  },
  {
    id: "proxy",
    href: "/dashboard/system/proxy",
    i18nKey: "proxy",
    labelFallback: "Network",
    subtitleKey: "proxySubtitle",
    subtitleFallback: "Outbound proxy for provider traffic",
    icon: "dns",
  },
];

const DEVTOOLS_ITEMS: readonly SidebarItemDefinition[] = [];

const HELP_ITEMS: readonly SidebarItemDefinition[] = [
  {
    id: "docs",
    href: "/docs",
    i18nKey: "docs",
    subtitleKey: "docsSubtitle",
    icon: "menu_book",
    external: true,
  },
  {
    id: "issues",
    href: "https://github.com/diegosouzapw/OmniRoute/issues",
    i18nKey: "issues",
    subtitleKey: "issuesSubtitle",
    icon: "bug_report",
    external: true,
  },
  {
    id: "changelog",
    href: "/dashboard/changelog",
    i18nKey: "changelog",
    subtitleKey: "changelogSubtitle",
    icon: "campaign",
  },
];

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

/** Developer: ops-focused primary hubs (hide marketing Docs) + debug tools when debugMode. */
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
  "translator",
  "playground",
  "search-tools",
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
