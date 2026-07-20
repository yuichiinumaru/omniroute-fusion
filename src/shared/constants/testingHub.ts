/**
 * Testing hub destinations (Task 0060).
 * Hub route: `/dashboard/testing` — discoverability only; no primary sidebar leaf
 * (primary-nav budget stays ~9 leaves after Task 0059).
 * Existing routes remain deep-linkable. Playground / Translator / Search Tools are
 * intentionally NOT listed in any sidebar section (including debug DEVTOOLS);
 * the Testing hub, command palette, and direct URLs are the discovery paths.
 *
 * Reverse chrome (Task 0076 **D1**): intentional one-way launchpad. Destination
 * peers do **not** mount a Testing reverse strip / TestingHubSubnav — return via
 * Operations→Testing hub card, CommandPalette, or browser history (no Testing
 * primary leaf). Policy: `docs/guides/UI.md` § Hub reverse chrome.
 */

export type TestingHubGroupId = "interactive" | "batch-media" | "extensions";

export interface TestingHubLink {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: string;
  /**
   * When true, the hub card shows a small "lab" badge.
   * Lab destinations are intentionally absent from all sidebar chrome
   * (including debug DEVTOOLS); discovery is hub / palette / direct URL only.
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

/** Grouped destinations shown on `/dashboard/testing`. */
export const TESTING_HUB_GROUPS: readonly TestingHubGroup[] = [
  {
    id: "interactive",
    title: "Interactive labs",
    description: "Request playgrounds and format translators for manual verification",
    icon: "science",
    links: [
      {
        id: "playground",
        href: "/dashboard/playground",
        label: "Playground",
        description: "Interactive chat / completions lab against routed models",
        icon: "science",
        isLab: true,
      },
      {
        id: "translator",
        href: "/dashboard/translator",
        label: "Translator",
        description: "Inspect request/response format translation between APIs",
        icon: "translate",
        isLab: true,
      },
      {
        id: "search-tools",
        href: "/dashboard/search-tools",
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
    description: "Async batch jobs, file uploads, and media generation labs",
    icon: "view_list",
    links: [
      {
        id: "batch",
        href: "/dashboard/batch",
        label: "Batch",
        description: "Create and monitor provider batch jobs",
        icon: "view_list",
      },
      {
        id: "batch-files",
        href: "/dashboard/batch/files",
        label: "Batch Files",
        description: "Upload and manage batch input files",
        icon: "folder",
      },
      {
        id: "media",
        href: "/dashboard/cache/media",
        label: "Media",
        // Route path is legacy (`/cache/media`); page is generation playground (image/video/music/speech).
        description: "Generate and test image, video, music, speech, and transcription models",
        icon: "perm_media",
      },
    ],
  },
  {
    id: "extensions",
    title: "Extensions",
    description: "Installable dashboard plugins for experimental surfaces",
    icon: "extension",
    links: [
      {
        id: "plugins",
        href: "/dashboard/plugins",
        label: "Plugins",
        description: "Marketplace and installed dashboard plugins",
        icon: "extension",
      },
    ],
  },
] as const;

/** Flat list of every hub destination href (for tests / palette extras). */
export const TESTING_HUB_HREFS: readonly string[] = TESTING_HUB_GROUPS.flatMap((group) =>
  group.links.map((link) => link.href)
);
