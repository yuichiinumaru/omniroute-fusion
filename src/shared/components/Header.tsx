"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

const subscribePlatform = () => () => {};
const getPlatformIsMac = () => {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/.test(platform);
};
const getPlatformIsMacServer = () => false;
import TokenHealthBadge from "./TokenHealthBadge";
import DegradationBadge from "./DegradationBadge";
import LanguageSelector from "./LanguageSelector";
import ProviderIcon from "./ProviderIcon";
import { useTranslations } from "next-intl";
import {
  OAUTH_PROVIDERS,
  APIKEY_PROVIDERS,
  NOAUTH_PROVIDERS,
  CLAUDE_CODE_COMPATIBLE_PREFIX,
  OPENAI_COMPATIBLE_PREFIX,
  ANTHROPIC_COMPATIBLE_PREFIX,
} from "@/shared/constants/providers";
import {
  SIDEBAR_SECTIONS,
  getSectionItems,
  type SidebarItemDefinition,
  type HideableSidebarItemId,
} from "@/shared/constants/sidebarVisibility";
import {
  OPERATIONS_HUB_PATH,
  OPERATIONS_TOPBAR_LABELS,
  buildOperationsPath,
} from "@/shared/constants/epic20Operations";
import { useIsElectron } from "@/shared/hooks/useElectron";

const isE2EMode = process.env.NEXT_PUBLIC_OMNIROUTE_E2E_MODE === "1";

// Map sidebar item id → header description i18n key
// "omni-skills" / "settings" are extended keys (graceful fallback; not all map 1:1 to hideable ids)
const HEADER_DESCRIPTIONS: Partial<
  Record<HideableSidebarItemId | "omni-skills" | "settings", string>
> = {
  home: "homeDescription",
  endpoints: "endpointDescription",
  "api-manager": "apiManagerDescription",
  providers: "providerDescription",
  combos: "comboDescription",
  batch: "batchDescription",
  costs: "costsDescription",
  analytics: "analyticsDescription",
  cache: "cacheDescription",
  quota: "limitsDescription",
  runtime: "runtimeDescription",
  media: "mediaDescription",
  operations: "operationsDescription",
  testing: "testingDescription",
  "cli-code": "cliToolsDescription",
  "cli-agents": "agentsDescription",
  "acp-agents": "agentsDescription",
  "cloud-agents": "cloudAgentsDescription",
  memory: "memoryDescription",
  skills: "skillsDescription",
  "agent-skills": "agentSkillsDescription",
  "omni-skills": "omniSkillsDescription",
  settings: "settingsDescription",
  "context-caveman": "contextCavemanDescription",
  "context-rtk": "contextRtkDescription",
  "context-combos": "contextCombosDescription",
  translator: "translatorDescription",
  playground: "playgroundDescription",
  "search-tools": "searchToolsDescription",
  logs: "logsDescription",
  audit: "auditDescription",
  webhooks: "webhooksDescription",
  health: "healthDescription",
  proxy: "proxyDescription",
  changelog: "changelogDescription",
  // Protocols
  mcp: "mcpDescription",
  a2a: "a2aDescription",
  // Retired redirect-only id — brand as catalog SSoT, not a competing surface (Task 0024)
  "api-endpoints": "endpointDescription",
  // Agents & AI sub-pages
  "batch-files": "batchFilesDescription",
  // Analytics sub-pages
  "analytics-evals": "analyticsEvalsDescription",
  "analytics-search": "analyticsSearchDescription",
  "analytics-utilization": "analyticsUtilizationDescription",
  "analytics-combo-health": "analyticsComboHealthDescription",
  "analytics-compression": "analyticsCompressionDescription",
  // Costs sub-pages
  "costs-budget": "costsBudgetDescription",
  "costs-pricing": "costsPricingDescription",
  // Logs sub-pages
  "logs-proxy": "logsProxyDescription",
  "logs-console": "logsConsoleDescription",
  "logs-activity": "logsActivityDescription",
  // Audit sub-pages
  "audit-mcp": "auditMcpDescription",
  // Settings sub-pages
  "settings-general": "settingsGeneralDescription",
  "settings-appearance": "settingsAppearanceDescription",
  "settings-ai": "settingsAiDescription",
  "settings-security": "settingsSecurityDescription",
  "settings-routing": "settingsRoutingDescription",
  "settings-resilience": "settingsResilienceDescription",
  "settings-advanced": "settingsAdvancedDescription",
  // Proxy sub-pages
  "mitm-proxy": "mitmProxyDescription",
  "1proxy": "oneProxyDescription",
};

type DeepHeaderMeta = {
  match: (pathname: string) => boolean;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  icon: string;
};

function matchOpsPeerPath(
  id: keyof typeof OPERATIONS_TOPBAR_LABELS
): (p: string) => boolean {
  const base = buildOperationsPath(id);
  return (p) => p === base || p.startsWith(`${base}/`);
}

/**
 * Deep destinations under Operations (Task 0059 / EPIC-20 Task 0100).
 * Not primary sidebar leaves. **All 10 topbar peers** have explicit matchers
 * **before** hub-root. Catch-all must NOT use `p.startsWith("/operations/")`
 * (that shadowed peer titles). Evaluated **before** primary sidebar prefix
 * match so `/operations/{peer}` shows peer label, not always "Operations".
 *
 * titleFallback mirrors `OPERATIONS_TOPBAR_LABELS` (0086 SSoT).
 */
const OPERATIONS_DEEP_HEADER_META: ReadonlyArray<DeepHeaderMeta> = [
  {
    // EPIC-20 / 0088: Endpoint fusion
    match: (p) =>
      matchOpsPeerPath("endpoints")(p) ||
      p === "/dashboard/endpoint" ||
      p.startsWith("/dashboard/endpoint/") ||
      p === "/dashboard/api-manager" ||
      p.startsWith("/dashboard/api-manager/"),
    titleKey: "endpoints",
    titleFallback: OPERATIONS_TOPBAR_LABELS.endpoints,
    descKey: "endpointDescription",
    icon: "api",
  },
  {
    // EPIC-20 / 0089: CoreMCP
    match: (p) =>
      matchOpsPeerPath("core-mcp")(p) ||
      p === "/dashboard/mcp" ||
      p.startsWith("/dashboard/mcp/"),
    titleKey: "mcp",
    titleFallback: OPERATIONS_TOPBAR_LABELS["core-mcp"],
    descKey: "mcpDescription",
    icon: "hub",
  },
  {
    // EPIC-20 / 0090: Agents fusion
    match: (p) =>
      matchOpsPeerPath("agents")(p) ||
      p === "/dashboard/cli-agents" ||
      p.startsWith("/dashboard/cli-agents/") ||
      p === "/dashboard/cli-code" ||
      p.startsWith("/dashboard/cli-code/"),
    titleKey: "operationsAgents",
    titleFallback: OPERATIONS_TOPBAR_LABELS.agents,
    descKey: "agentsDescription",
    icon: "smart_toy",
  },
  {
    // EPIC-20 / 0091: Cloud Agents
    match: (p) =>
      matchOpsPeerPath("cloud-agents")(p) ||
      p === "/dashboard/cloud-agents" ||
      p.startsWith("/dashboard/cloud-agents/"),
    titleKey: "cloudAgents",
    titleFallback: OPERATIONS_TOPBAR_LABELS["cloud-agents"],
    descKey: "cloudAgentsDescription",
    icon: "cloud",
  },
  {
    // EPIC-20 / 0092: A2A/ACP Bridge
    match: (p) =>
      matchOpsPeerPath("a2a-acp-bridge")(p) ||
      p === "/dashboard/a2a" ||
      p.startsWith("/dashboard/a2a/") ||
      p === "/dashboard/acp-agents" ||
      p.startsWith("/dashboard/acp-agents/") ||
      p === "/dashboard/tools/agent-bridge" ||
      p.startsWith("/dashboard/tools/agent-bridge/"),
    titleKey: "a2aAcpBridge",
    titleFallback: OPERATIONS_TOPBAR_LABELS["a2a-acp-bridge"],
    descKey: "a2aDescription",
    icon: "device_hub",
  },
  {
    // EPIC-20 / 0093: Skills
    match: (p) =>
      matchOpsPeerPath("skills")(p) ||
      p === "/dashboard/skills" ||
      p.startsWith("/dashboard/skills/") ||
      p === "/dashboard/omni-skills" ||
      p.startsWith("/dashboard/omni-skills/") ||
      p === "/dashboard/agent-skills" ||
      p.startsWith("/dashboard/agent-skills/"),
    titleKey: "skills",
    titleFallback: OPERATIONS_TOPBAR_LABELS.skills,
    descKey: "skillsDescription",
    icon: "auto_fix_high",
  },
  {
    // EPIC-20 / 0094: Integrations
    match: (p) =>
      matchOpsPeerPath("integrations")(p) ||
      p === "/dashboard/webhooks" ||
      p.startsWith("/dashboard/webhooks/") ||
      p === "/dashboard/plugins" ||
      p.startsWith("/dashboard/plugins/"),
    titleKey: "integrationsGroup",
    titleFallback: OPERATIONS_TOPBAR_LABELS.integrations,
    descKey: "webhooksDescription",
    icon: "extension",
  },
  {
    // EPIC-20 / 0095: Memory
    match: (p) =>
      matchOpsPeerPath("memory")(p) ||
      p === "/dashboard/memory" ||
      p.startsWith("/dashboard/memory/"),
    titleKey: "memory",
    titleFallback: OPERATIONS_TOPBAR_LABELS.memory,
    descKey: "memoryDescription",
    icon: "psychology",
  },
  {
    // EPIC-20 / 0096 + 0099: Labs (+ Testing absorb).
    // Prefer titleFallback "Labs" — no dedicated sidebar i18n key for Labs peer.
    match: (p) =>
      matchOpsPeerPath("labs")(p) ||
      p === "/dashboard/testing" ||
      p.startsWith("/dashboard/testing/"),
    titleKey: "labsNav",
    titleFallback: "Labs",
    descKey: "testingDescription",
    icon: "science",
  },
  {
    // EPIC-20 / 0097: Media
    match: (p) =>
      matchOpsPeerPath("media")(p) ||
      p === "/dashboard/cache/media" ||
      p.startsWith("/dashboard/cache/media/"),
    titleKey: "media",
    titleFallback: OPERATIONS_TOPBAR_LABELS.media,
    descKey: "mediaDescription",
    icon: "perm_media",
  },
  {
    // Hub root only — never `p.startsWith("/operations/")` (shadows peers).
    match: (p) =>
      p === OPERATIONS_HUB_PATH ||
      p === `${OPERATIONS_HUB_PATH}/` ||
      p === "/dashboard/operations" ||
      p.startsWith("/dashboard/operations/"),
    titleKey: "operationsNav",
    titleFallback: "Operations",
    descKey: "operationsDescription",
    icon: "manufacturing",
  },
  {
    // Task 0024: retired catalog path — brand as catalog SSoT, not dual product.
    match: (p) => p === "/dashboard/api-endpoints" || p.startsWith("/dashboard/api-endpoints/"),
    titleKey: "endpoints",
    titleFallback: "API Catalog",
    descKey: "endpointDescription",
    icon: "menu_book",
  },
  {
    // 0098: legacy Traffic Inspector flash title before Observe redirect.
    match: (p) =>
      p === "/dashboard/tools/traffic-inspector" ||
      p.startsWith("/dashboard/tools/traffic-inspector/"),
    titleKey: "trafficInspector",
    titleFallback: "Traffic Inspector",
    descKey: "trafficInspectorDescription",
    icon: "network_check",
  },
];

/**
 * Former Testing hub lab deep destinations (Task 0060; retired 0099).
 * Legacy `/dashboard/*` lab shells only — canonical Labs/Media live in
 * OPERATIONS_DEEP_HEADER_META (resolved before sidebar prefix match).
 */
const TESTING_DEEP_HEADER_META: ReadonlyArray<DeepHeaderMeta> = [
  {
    match: (p) => p === "/dashboard/playground" || p.startsWith("/dashboard/playground/"),
    titleKey: "playground",
    titleFallback: "Playground",
    descKey: "playgroundDescription",
    icon: "science",
  },
  {
    match: (p) => p === "/dashboard/translator" || p.startsWith("/dashboard/translator/"),
    titleKey: "translator",
    titleFallback: "Translator",
    descKey: "translatorDescription",
    icon: "translate",
  },
  {
    match: (p) => p === "/dashboard/search-tools" || p.startsWith("/dashboard/search-tools/"),
    titleKey: "searchTools",
    titleFallback: "Search Tools",
    descKey: "searchToolsDescription",
    icon: "manage_search",
  },
  {
    match: (p) => p === "/dashboard/batch/files" || p.startsWith("/dashboard/batch/files/"),
    titleKey: "batchFiles",
    titleFallback: "Batch Files",
    descKey: "batchFilesDescription",
    icon: "folder",
  },
  {
    match: (p) => p === "/dashboard/batch" || p.startsWith("/dashboard/batch/"),
    titleKey: "batch",
    titleFallback: "Batch",
    descKey: "batchDescription",
    icon: "view_list",
  },
];

/**
 * Settings deep destinations (Task 0134).
 */
const SETTINGS_DEEP_HEADER_META: ReadonlyArray<DeepHeaderMeta> = [
  {
    match: (p) => p === "/dashboard/settings/routing" || p.startsWith("/dashboard/settings/routing/"),
    titleKey: "settingsRouting",
    titleFallback: "Routing",
    descKey: "settingsRoutingDescription",
    icon: "route",
  },
];

/**
 * Pure Header deep-title resolver (EPIC-20 / Task 0100 gate).
 * Returns titleFallback for Ops/Testing deep destinations; null when Header
 * should use primary sidebar (or other specials).
 */
export function resolveDeepHeaderTitleFallback(
  pathname: string | null | undefined
): string | null {
  if (!pathname) return null;
  const pathOnly = pathname.split("?")[0] ?? pathname;
  for (const entry of OPERATIONS_DEEP_HEADER_META) {
    if (entry.match(pathOnly)) return entry.titleFallback;
  }
  for (const entry of TESTING_DEEP_HEADER_META) {
    if (entry.match(pathOnly)) return entry.titleFallback;
  }
  for (const entry of SETTINGS_DEEP_HEADER_META) {
    if (entry.match(pathOnly)) return entry.titleFallback;
  }
  return null;
}

function resolveDeepHeaderMeta(pathname: string): DeepHeaderMeta | null {
  for (const entry of OPERATIONS_DEEP_HEADER_META) {
    if (entry.match(pathname)) return entry;
  }
  for (const entry of TESTING_DEEP_HEADER_META) {
    if (entry.match(pathname)) return entry;
  }
  for (const entry of SETTINGS_DEEP_HEADER_META) {
    if (entry.match(pathname)) return entry;
  }
  return null;
}

// Build href → sidebar item lookup (non-external items only)
const sidebarByHref = new Map<string, SidebarItemDefinition>();
for (const section of SIDEBAR_SECTIONS) {
  for (const item of getSectionItems(section)) {
    if (!item.external) sidebarByHref.set(item.href, item);
  }
}

function getSidebarItem(pathname: string): SidebarItemDefinition | undefined {
  const exact = sidebarByHref.get(pathname);
  if (exact) return exact;
  // Longest prefix match
  let best: SidebarItemDefinition | undefined;
  let bestLen = 0;
  for (const [href, item] of sidebarByHref) {
    if (pathname.startsWith(href) && href.length > bestLen) {
      best = item;
      bestLen = href.length;
    }
  }
  return best;
}

type HeaderProps = {
  onMenuClick?: () => void;
  onOpenCommandPalette?: () => void;
  showMenuButton?: boolean;
};

type ElectronWindow = Window & {
  electronAPI?: {
    platform?: string;
  };
};

type PageInfo = {
  title: string;
  description: string;
  icon?: string;
  providerId?: string;
};

function usePageInfo(pathname: string | null): PageInfo {
  const ts = useTranslations("sidebar");
  const th = useTranslations("header");

  if (!pathname) return { title: "", description: "" };

  // Special: provider detail page /dashboard/providers/[id]
  const providerMatch = pathname.match(/\/providers\/([^/]+)$/);
  if (providerMatch) {
    const pid = providerMatch[1];
    const info = OAUTH_PROVIDERS[pid] || NOAUTH_PROVIDERS[pid] || APIKEY_PROVIDERS[pid];
    if (info) return { title: info.name, description: "", providerId: info.id };
    if (pid.startsWith(CLAUDE_CODE_COMPATIBLE_PREFIX))
      return { title: "CC Compatible", description: "", providerId: "claude" };
    if (pid.startsWith(OPENAI_COMPATIBLE_PREFIX))
      return { title: th("openaiCompatible"), description: "", providerId: "oai-cc" };
    if (pid.startsWith(ANTHROPIC_COMPATIBLE_PREFIX))
      return { title: th("anthropicCompatible"), description: "", providerId: "anthropic-m" };
  }

  // Deep hub destinations **before** primary sidebar prefix match (EPIC-20 / 0100).
  // Without this, `/operations/skills` etc. always resolve to leaf "Operations".
  const deepMeta = resolveDeepHeaderMeta(pathname);
  if (deepMeta) {
    let title = deepMeta.titleFallback;
    try {
      title = ts(deepMeta.titleKey);
    } catch {
      title = deepMeta.titleFallback;
    }
    let description = "";
    try {
      description = th(deepMeta.descKey);
    } catch {
      description = "";
    }
    return { title, description, icon: deepMeta.icon };
  }

  // Derive from primary sidebar leaves (exact / longest prefix)
  const item = getSidebarItem(pathname);
  if (item) {
    const descKey = HEADER_DESCRIPTIONS[item.id];
    let title = item.labelFallback ?? item.i18nKey;
    try {
      title = ts(item.i18nKey);
    } catch {
      // keep labelFallback when locale key is missing mid-deploy
    }
    return {
      title,
      description: descKey ? th(descKey) : "",
      icon: item.icon,
    };
  }

  // Health dashboard (Task 0061 — not a primary leaf; linked from Observe + palette)
  if (pathname === "/dashboard/health" || pathname.startsWith("/dashboard/health/")) {
    let title = "Health";
    try {
      title = ts("health");
    } catch {
      title = "Health";
    }
    let description = "";
    try {
      description = th("healthDescription");
    } catch {
      description = "";
    }
    return { title, description, icon: "health_and_safety" };
  }

  // Settings → Interface (route remains /settings/appearance; Task 0061 Option B)
  if (
    pathname === "/dashboard/settings/appearance" ||
    pathname.startsWith("/dashboard/settings/appearance/")
  ) {
    return {
      title: "Interface",
      description: "Tunnels, home pins, and display preferences",
      icon: "display_settings",
    };
  }

  return { title: "", description: "" };
}

export default function Header({
  onMenuClick,
  onOpenCommandPalette,
  showMenuButton = true,
}: HeaderProps) {
  const isMac = useSyncExternalStore(subscribePlatform, getPlatformIsMac, getPlatformIsMacServer);
  const pathname = usePathname();
  const router = useRouter();
  const isElectron = useIsElectron();
  const t = useTranslations("header");
  const { title, description, icon, providerId } = usePageInfo(pathname);
  const isMacElectron =
    isElectron &&
    typeof window !== "undefined" &&
    // SAFETY: ElectronWindow only adds an optional `electronAPI` member to Window;
    // every Window satisfies it, and the optional chain guards absence at runtime.
    (window as ElectronWindow).electronAPI?.platform === "darwin";

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-bg px-8 py-4 dark:border-white/5"
      style={{
        paddingTop: isMacElectron ? "calc(1rem + var(--desktop-safe-top))" : undefined,
      }}
    >
      {/* Mobile menu button */}
      <div className="flex items-center gap-3 lg:hidden">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="text-text-main hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
      </div>

      {/* Page title with icon - desktop */}
      <div className="hidden lg:flex items-center gap-3">
        {(icon || providerId) && (
          <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 shrink-0">
            {icon ? (
              <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
            ) : (
              providerId && <ProviderIcon providerId={providerId} size={22} type="color" />
            )}
          </div>
        )}
        {title && (
          <div>
            <h1 className="text-xl font-semibold text-text-main tracking-tight">{title}</h1>
            {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 ml-auto">
        {onOpenCommandPalette && (
          <>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden md:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-bg-subtle text-text-muted hover:text-text-main hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
              title="Quick navigation (⌘K / Ctrl+K)"
              aria-label="Open quick navigation"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              <span className="text-xs">Quick nav</span>
              <kbd className="hidden lg:inline-flex font-mono text-[10px] px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Open quick navigation"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
          </>
        )}
        <LanguageSelector />
        {!isE2EMode && <DegradationBadge />}
        {!isE2EMode && <TokenHealthBadge />}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
          title={t("logout")}
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  );
}
