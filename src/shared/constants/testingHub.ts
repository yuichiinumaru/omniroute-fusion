/**
 * Testing hub destinations (Task 0060).
 * Hub route: `/dashboard/testing` — discoverability only; no primary sidebar leaf
 * (primary-nav budget stays ~9 leaves after Task 0059).
 * Existing routes remain deep-linkable. Debug-gated sidebar items (playground,
 * translator, search-tools) stay debug-only in chrome; the Testing hub always
 * links them so they are reachable without debug mode.
 */

export type TestingHubGroupId = "interactive" | "batch-media" | "extensions";

export interface TestingHubLink {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: string;
  /** True when the same destination is also listed under Dev Tools (debug chrome). */
  debugSidebarOnly?: boolean;
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
        debugSidebarOnly: true,
      },
      {
        id: "translator",
        href: "/dashboard/translator",
        label: "Translator",
        description: "Inspect request/response format translation between APIs",
        icon: "translate",
        debugSidebarOnly: true,
      },
      {
        id: "search-tools",
        href: "/dashboard/search-tools",
        label: "Search Tools",
        description: "Exercise web-search tool providers and payloads",
        icon: "manage_search",
        debugSidebarOnly: true,
      },
    ],
  },
  {
    id: "batch-media",
    title: "Batch & media",
    description: "Async batch jobs, file uploads, and media cache inspection",
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
        label: "Media Cache",
        description: "Inspect cached media assets from proxy traffic",
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

/** Pathnames that belong under the Testing product area (header title fallback). */
export const TESTING_AREA_PATH_PREFIXES: readonly string[] = [
  "/dashboard/testing",
  "/dashboard/playground",
  "/dashboard/translator",
  "/dashboard/search-tools",
  "/dashboard/batch",
  "/dashboard/batch/files",
  "/dashboard/cache/media",
  "/dashboard/plugins",
] as const;
