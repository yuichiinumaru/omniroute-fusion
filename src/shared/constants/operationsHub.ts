/**
 * Operations hub destinations (Task 0059).
 * Primary sidebar leaf → `/dashboard/operations`.
 * Existing routes remain deep-linkable; the hub is discoverability only.
 *
 * Catalog SSoT (Task 0024): only `CONNECT_CATALOG_SSOT_HREF` — never re-list
 * retired `/dashboard/api-endpoints` as a hub discovery peer.
 *
 * Reverse chrome (Task 0076 **D1**): intentional one-way launchpad. Destination
 * peers do **not** mount an Operations reverse strip / OperationsHubSubnav —
 * return via primary Operations leaf, CommandPalette, or browser history.
 * Policy: `docs/guides/UI.md` § Hub reverse chrome.
 */

import { CONNECT_CATALOG_SSOT_HREF } from "./sidebarVisibility";

export type OperationsHubGroupId = "api-endpoints" | "agents" | "integrations";

export interface OperationsHubLink {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: string;
}

export interface OperationsHubGroup {
  id: OperationsHubGroupId;
  title: string;
  description: string;
  icon: string;
  links: readonly OperationsHubLink[];
}

/** Grouped destinations shown on `/dashboard/operations`. */
export const OPERATIONS_HUB_GROUPS: readonly OperationsHubGroup[] = [
  {
    id: "api-endpoints",
    title: "API / Endpoints",
    description: "Keys, proxy surfaces, catalog, and protocol servers",
    icon: "api",
    links: [
      {
        id: "api-manager",
        href: "/dashboard/api-manager",
        label: "API Keys",
        description: "Access tokens and key policies",
        icon: "key",
      },
      {
        id: "endpoints",
        href: "/dashboard/endpoint",
        label: "Endpoints",
        description: "Proxy endpoints and context sources",
        icon: "api",
      },
      // Task 0024 S5: single catalog SSoT — do NOT re-list retired
      // `/dashboard/api-endpoints` (redirect-only) as a hub discovery peer.
      {
        id: "api-catalog",
        href: CONNECT_CATALOG_SSOT_HREF,
        label: "API Catalog",
        description: "OpenAPI-style endpoint catalog",
        icon: "menu_book",
      },
      {
        id: "mcp",
        href: "/dashboard/mcp",
        label: "MCP Server",
        description: "Model Context Protocol tools and transports",
        icon: "hub",
      },
      {
        id: "a2a",
        href: "/dashboard/a2a",
        label: "A2A Server",
        description: "Agent-to-Agent protocol tasks",
        icon: "device_hub",
      },
    ],
  },
  {
    id: "agents",
    title: "Agents",
    description: "CLI tools, agents, cloud agents, and bridges",
    icon: "smart_toy",
    links: [
      {
        id: "cli-agents",
        href: "/dashboard/cli-agents",
        label: "CLI Agents",
        description: "Agent-category CLI tools",
        icon: "smart_toy",
      },
      {
        id: "cli-code",
        href: "/dashboard/cli-code",
        label: "CLI Code",
        description: "Code-category CLI tools",
        icon: "terminal",
      },
      {
        id: "cloud-agents",
        href: "/dashboard/cloud-agents",
        label: "Cloud Agents",
        description: "Codex Cloud, Devin, Jules",
        icon: "cloud",
      },
      {
        id: "acp-agents",
        href: "/dashboard/acp-agents",
        label: "ACP Agents",
        description: "Agent Communication Protocol registry",
        icon: "device_hub",
      },
      {
        id: "agent-bridge",
        href: "/dashboard/tools/agent-bridge",
        label: "Agent Bridge",
        description: "Interop mappings for external agents",
        icon: "link",
      },
    ],
  },
  {
    id: "integrations",
    title: "Integrations / Tools",
    description: "Webhooks, traffic, memory, and skills",
    icon: "extension",
    links: [
      {
        id: "webhooks",
        href: "/dashboard/webhooks",
        label: "Webhooks",
        description: "Event subscriptions and delivery",
        icon: "webhook",
      },
      {
        id: "traffic-inspector",
        href: "/dashboard/tools/traffic-inspector",
        label: "Traffic Inspector",
        description: "Inspect proxied request traffic",
        icon: "network_check",
      },
      {
        id: "memory",
        href: "/dashboard/memory",
        label: "Memory",
        description: "Persistent conversational memory",
        icon: "psychology",
      },
      {
        id: "agent-skills",
        href: "/dashboard/agent-skills",
        label: "Agent Skills",
        description: "Outbound SKILL.md for external agents",
        icon: "share",
      },
      {
        id: "omni-skills",
        href: "/dashboard/omni-skills",
        label: "Omni Skills",
        description: "Inbound sandbox tools for model requests",
        icon: "auto_fix_high",
      },
      {
        id: "testing",
        href: "/dashboard/testing",
        label: "Testing",
        description: "Playground, translator, batch, media lab, plugins",
        icon: "science",
      },
    ],
  },
] as const;

/** Flat list of every hub destination href (for tests / palette extras). */
export const OPERATIONS_HUB_HREFS: readonly string[] = OPERATIONS_HUB_GROUPS.flatMap((group) =>
  group.links.map((link) => link.href)
);
