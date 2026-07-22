type SidebarLikeItem = {
  href: string;
  exact?: boolean;
  external?: boolean;
  id?: string;
};

/**
 * Primary leaf ids that own hub-child sibling trees under `/dashboard/*`
 * (or self-evident roots like `/operations`).
 * (EPIC-19 T19-G / Task 0084; EPIC-20 / 0087 Operations canonical path.)
 */
export type SidebarHubPrimaryLeafId = "combos" | "activity" | "operations";

/**
 * SSoT: path prefix → primary sidebar leaf for hub children that do **not** nest
 * under the primary `href` (prefix match alone cannot light the rail).
 *
 * - Routing (`combos` → `/dashboard/combos`): fusions, compression studio, context/*
 * - Observe (`activity` → `/dashboard/activity`): health (panels/sources share activity path)
 * - Operations (`operations` → `/operations`): legacy `/dashboard/operations` until fully retired
 *
 * Note: `/operations/*` lights Operations via primary href prefix match (no alias needed).
 * Longest matching `pathPrefix` wins when prefixes ever nest.
 */
export const SIDEBAR_ACTIVE_HUB_ALIASES: readonly {
  readonly pathPrefix: string;
  readonly primaryLeafId: SidebarHubPrimaryLeafId;
  readonly primaryHref: string;
}[] = [
  {
    pathPrefix: "/dashboard/fusions",
    primaryLeafId: "combos",
    primaryHref: "/dashboard/combos",
  },
  {
    pathPrefix: "/dashboard/compression",
    primaryLeafId: "combos",
    primaryHref: "/dashboard/combos",
  },
  {
    pathPrefix: "/dashboard/context",
    primaryLeafId: "combos",
    primaryHref: "/dashboard/combos",
  },
  {
    pathPrefix: "/dashboard/health",
    primaryLeafId: "activity",
    primaryHref: "/dashboard/activity",
  },
  {
    // Legacy Traffic Inspector path (redirects to Observe ?panel=traffic) — 0098.
    // Canonical `/dashboard/activity` already lights Observe via primary href prefix.
    pathPrefix: "/dashboard/tools/traffic-inspector",
    primaryLeafId: "activity",
    primaryHref: "/dashboard/activity",
  },
  {
    // Legacy hub path (redirects to /operations) — keep active state if hit before redirect.
    pathPrefix: "/dashboard/operations",
    primaryLeafId: "operations",
    primaryHref: "/operations",
  },
] as const;

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Resolve hub-child pathnames that live as siblings of the primary leaf href.
 * Returns null when the path is not in the alias table (use normal prefix match).
 */
export function resolveSidebarHubAlias(
  pathname: string | null | undefined
): { primaryLeafId: SidebarHubPrimaryLeafId; primaryHref: string } | null {
  if (!pathname) return null;

  let best: (typeof SIDEBAR_ACTIVE_HUB_ALIASES)[number] | null = null;
  for (const alias of SIDEBAR_ACTIVE_HUB_ALIASES) {
    if (!pathMatchesPrefix(pathname, alias.pathPrefix)) continue;
    if (!best || alias.pathPrefix.length > best.pathPrefix.length) {
      best = alias;
    }
  }

  if (!best) return null;
  return { primaryLeafId: best.primaryLeafId, primaryHref: best.primaryHref };
}

export function matchesSidebarHref(
  pathname: string | null | undefined,
  href: string,
  exact = false
): boolean {
  if (!pathname) return false;
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveSidebarHref(
  pathname: string | null | undefined,
  items: SidebarLikeItem[]
): string | null {
  // Hub-child aliases first: fusions/compression/context/health → primary leaf href.
  const alias = resolveSidebarHubAlias(pathname);
  if (alias) {
    const visible = items.some(
      (item) => !item.external && item.href === alias.primaryHref
    );
    if (visible) return alias.primaryHref;
  }

  let bestMatch: SidebarLikeItem | null = null;

  for (const item of items) {
    if (item.external) continue;
    if (!matchesSidebarHref(pathname, item.href, item.exact === true)) continue;

    if (!bestMatch) {
      bestMatch = item;
      continue;
    }

    if (item.href.length > bestMatch.href.length) {
      bestMatch = item;
      continue;
    }

    if (item.href.length === bestMatch.href.length && item.exact && !bestMatch.exact) {
      bestMatch = item;
    }
  }

  return bestMatch?.href || null;
}
