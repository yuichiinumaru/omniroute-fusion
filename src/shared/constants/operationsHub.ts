/**
 * Operations hub destinations (Task 0059 + EPIC-20 shell host + Task 0099 retire Testing).
 * Primary sidebar leaf → `/operations` (0087). Cards are content under the default
 * topbar peer — not a second L1. Prefer **topbar deep links** via `buildOperationsPath`
 * (landed peers only — never invent fake `/operations/*` pages).
 *
 * Catalog SSoT (Task 0024): only `CONNECT_CATALOG_SSOT_HREF` — never re-list
 * retired `/dashboard/api-endpoints` as a hub discovery peer.
 *
 * Testing hub absorbed (0099): no Testing card; Labs + Media are topbar peers.
 * Traffic Inspector is Observe peer (0098) — not Ops discovery.
 *
 * Reverse chrome (Task 0076 **D1**, updated 0099): Ops **self-chrome** is
 * `OperationsTopbar` on `/operations/*` only — not reverse strips on legacy pages.
 * Policy: `docs/guides/UI.md` § Hub reverse chrome.
 */

import { buildOperationsPath } from "./epic20Operations";
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

/** Grouped destinations shown on Operations hub content (under `/operations` shell). */
export const OPERATIONS_HUB_GROUPS: readonly OperationsHubGroup[] = [
  {
    id: "api-endpoints",
    title: "API / Endpoints",
    description: "Keys, proxy surfaces, catalog, and protocol servers",
    icon: "api",
    links: [
      {
        id: "api-manager",
        // 0088: Keys collapsible on Endpoint fusion (hash deep-link, not dual home)
        href: `${buildOperationsPath("endpoints")}#api-keys`,
        label: "API Keys",
        description: "Access tokens and key policies",
        icon: "key",
      },
      {
        id: "endpoints",
        // Fusion peer body (Keys + APIs + Catalog stack)
        href: buildOperationsPath("endpoints"),
        label: "Endpoints",
        description: "Proxy endpoints, keys, and API catalog",
        icon: "api",
      },
      // Task 0024 S5 + 0088: single catalog SSoT on Endpoint fusion —
      // do NOT re-list retired `/dashboard/api-endpoints` as a discovery peer.
      // Hash targets catalog block; CONNECT_CATALOG_SSOT_HREF remains path-only for redirects.
      {
        id: "api-catalog",
        href: `${CONNECT_CATALOG_SSOT_HREF}#api-catalog`,
        label: "API Catalog",
        description: "OpenAPI-style endpoint catalog",
        icon: "menu_book",
      },
      {
        id: "mcp",
        // EPIC-20 / 0089: CoreMCP peer (legacy /dashboard/mcp redirects here)
        href: buildOperationsPath("core-mcp"),
        label: "CoreMCP",
        description: "Model Context Protocol tools and transports",
        icon: "hub",
      },
      {
        id: "a2a",
        // EPIC-20 / 0092: A2A lives under A2A/ACP Bridge stack
        href: buildOperationsPath("a2a-acp-bridge"),
        label: "A2A / ACP Bridge",
        description: "Agent-to-Agent, ACP registry, and agent bridge",
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
        // EPIC-20 / 0090 — fused under Operations Agents (strategy A keeps detail routes)
        href: `${buildOperationsPath("agents")}#cli-agents`,
        label: "CLI Agents",
        description: "Agent-category CLI tools",
        icon: "smart_toy",
      },
      {
        id: "cli-code",
        href: `${buildOperationsPath("agents")}#cli-code`,
        label: "CLI Code",
        description: "Code-category CLI tools",
        icon: "terminal",
      },
      {
        id: "cloud-agents",
        // EPIC-20 / 0091
        href: buildOperationsPath("cloud-agents"),
        label: "Cloud Agents",
        description: "Codex Cloud, Devin, Jules",
        icon: "cloud",
      },
      {
        id: "acp-agents",
        // EPIC-20 / 0092 — fused under A2A/ACP Bridge (section hash)
        href: `${buildOperationsPath("a2a-acp-bridge")}#acp-agents`,
        label: "ACP Agents",
        description: "Agent Communication Protocol registry",
        icon: "device_hub",
      },
      {
        id: "agent-bridge",
        // EPIC-20 / 0092 — fused under A2A/ACP Bridge (section hash)
        href: `${buildOperationsPath("a2a-acp-bridge")}#agent-bridge`,
        label: "Agent Bridge",
        description: "Interop mappings for external agents",
        icon: "link",
      },
    ],
  },
  {
    id: "integrations",
    title: "Integrations / Tools",
    description: "Webhooks, memory, skills, labs, and media",
    icon: "extension",
    links: [
      {
        id: "webhooks",
        // EPIC-20 / 0094 — Integrations stack
        href: buildOperationsPath("integrations"),
        label: "Webhooks",
        description: "Event subscriptions and delivery",
        icon: "webhook",
      },
      // Traffic Inspector moved to Observe peer (EPIC-20 / 0098) — not Ops discovery.
      // Canonical: /dashboard/activity?panel=traffic
      {
        id: "memory",
        // EPIC-20 T20-J / 0095: canonical Memory peer (legacy /dashboard/memory redirects)
        href: buildOperationsPath("memory"),
        label: "Memory",
        description: "Persistent conversational memory",
        icon: "psychology",
      },
      {
        id: "agent-skills",
        // EPIC-20 0093: both skill cards land on fused Skills peer (section via hash).
        href: `${buildOperationsPath("skills")}#agent-skills`,
        label: "Agent Skills",
        description: "Outbound SKILL.md for external agents",
        icon: "share",
      },
      {
        id: "omni-skills",
        href: `${buildOperationsPath("skills")}#core-skills`,
        label: "Core Skills",
        description: "Inbound sandbox tools for model requests",
        icon: "auto_fix_high",
      },
      {
        // EPIC-20 / 0099 — Testing hub retired; Labs is Ops topbar peer
        id: "labs",
        href: buildOperationsPath("labs"),
        label: "Labs",
        description: "Playground, translator, search tools, and batch jobs",
        icon: "science",
      },
      {
        // EPIC-20 / 0097 + 0099 — Media is Ops topbar peer (not Testing card)
        id: "media",
        href: buildOperationsPath("media"),
        label: "Media",
        description: "Image, video, music, speech, and transcription lab",
        icon: "perm_media",
      },
    ],
  },
] as const;

/** Flat list of every hub destination href (for tests / palette extras). */
export const OPERATIONS_HUB_HREFS: readonly string[] = OPERATIONS_HUB_GROUPS.flatMap((group) =>
  group.links.map((link) => link.href)
);
