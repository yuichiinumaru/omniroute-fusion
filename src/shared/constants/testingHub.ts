/**
 * Testing hub — **RETIRED** (EPIC-20 / Task 0099 / T20-N).
 *
 * Canonical discovery for former Testing content is **Operations topbar**:
 * - Labs → `buildOperationsPath("labs")` (`/operations/labs`)
 * - Media → `buildOperationsPath("media")` (`/operations/media`)
 * - Plugins → Integrations peer (`buildOperationsPath("integrations")`)
 *
 * Route `/dashboard/testing` is a **redirect shell only** (→ Labs). Do not reintroduce
 * Testing as a product hub, primary leaf, or intermediate launchpad.
 *
 * Hideable preference id `testing` is retained (archive-not-delete).
 *
 * Reverse chrome (Task 0076 **D1**, updated 0099): Ops topbar is the L1 return path for
 * labs/media — not a Testing reverse strip / TestingHubSubnav. Policy: `docs/guides/UI.md`
 * § Hub reverse chrome + § Tools → Operations (EPIC-20 absorb).
 */

import { buildOperationsPath } from "./epic20Operations";

export type TestingHubGroupId = "interactive" | "batch-media" | "extensions";

export interface TestingHubLink {
  id: string;
  /**
   * Canonical Ops destination after 0099 (Labs / Media / Integrations).
   * Legacy `/dashboard/*` lab URLs remain in `TESTING_HUB_LEGACY_HREFS` + redirect matrix.
   */
  href: string;
  label: string;
  description: string;
  icon: string;
  /**
   * When true, the destination is a lab surface (absent from all sidebar chrome).
   */
  isLab?: boolean;
}

export interface TestingHubGroup {
  id: TestingHubGroupId;
  title: string;
  description: string;
  icon: string;
  links: readonly TestingHubLink[];
}

/**
 * Canonical redirect target for the retired Testing hub route.
 * Matrix: `/dashboard/testing` → Labs (not Media).
 */
export const TESTING_HUB_CANONICAL_PATH = buildOperationsPath("labs");

/**
 * Archive inventory of absorbed Testing destinations → **canonical Ops paths**.
 * Not rendered as a living hub; used by palette/docs/tests as SSoT of absorb map.
 */
export const TESTING_HUB_GROUPS: readonly TestingHubGroup[] = [
  {
    id: "interactive",
    title: "Interactive labs",
    description: "Request playgrounds and format translators (Operations → Labs)",
    icon: "science",
    links: [
      {
        id: "playground",
        href: buildOperationsPath("labs"),
        label: "Playground",
        description: "Interactive chat / completions lab against routed models",
        icon: "science",
        isLab: true,
      },
      {
        id: "translator",
        href: buildOperationsPath("labs"),
        label: "Translator",
        description: "Inspect request/response format translation between APIs",
        icon: "translate",
        isLab: true,
      },
      {
        id: "search-tools",
        href: buildOperationsPath("labs"),
        label: "Search Tools",
        description: "Exercise web-search tool providers and payloads",
        icon: "manage_search",
        isLab: true,
      },
    ],
  },
  {
    id: "batch-media",
    title: "Batch & media",
    description: "Batch jobs under Labs; media generation under Media peer",
    icon: "view_list",
    links: [
      {
        id: "batch",
        href: buildOperationsPath("labs"),
        label: "Batch",
        description: "Create and monitor provider batch jobs",
        icon: "view_list",
      },
      {
        id: "batch-files",
        href: buildOperationsPath("labs"),
        label: "Batch Files",
        description: "Upload and manage batch input files",
        icon: "folder",
      },
      {
        id: "media",
        href: buildOperationsPath("media"),
        label: "Media",
        description: "Generate and test image, video, music, speech, and transcription models",
        icon: "perm_media",
      },
    ],
  },
  {
    id: "extensions",
    title: "Extensions",
    description: "Plugins live under Operations → Integrations",
    icon: "extension",
    links: [
      {
        id: "plugins",
        href: buildOperationsPath("integrations"),
        label: "Plugins",
        description: "Marketplace and installed dashboard plugins",
        icon: "extension",
      },
    ],
  },
] as const;

/** Flat list of every absorbed destination href (canonical Ops paths). */
export const TESTING_HUB_HREFS: readonly string[] = TESTING_HUB_GROUPS.flatMap((group) =>
  group.links.map((link) => link.href)
);

/**
 * Legacy lab/media/plugins paths that still redirect into Ops (0086 matrix `from`).
 * Kept for redirect-matrix coverage and archive-not-delete bookmarks.
 */
export const TESTING_HUB_LEGACY_HREFS: readonly string[] = [
  "/dashboard/playground",
  "/dashboard/translator",
  "/dashboard/search-tools",
  "/dashboard/batch",
  "/dashboard/batch/files",
  "/dashboard/cache/media",
  "/dashboard/plugins",
  "/dashboard/testing",
] as const;
