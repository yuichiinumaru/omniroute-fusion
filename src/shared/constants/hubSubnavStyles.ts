/**
 * Shared Routing / Observe / Settings "subnav" visual contract (Tasks 0054 / 0058 / 0061).
 * Active selected-state must match RoutingHubSubnav — not the default PageTabBar gray fill.
 */

/** Outer shell: rounded-xl low-contrast panel. */
export const HUB_SUBNAV_SHELL_CLASS =
  "flex flex-wrap items-center gap-1 rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-1";

/** Selected item affordance (primary tint, not white/gray surface fill). */
export const HUB_SUBNAV_ACTIVE_CLASS = "border border-primary/20 bg-primary/10 text-primary";

/** Unselected item (transparent border keeps layout stable vs active). */
export const HUB_SUBNAV_INACTIVE_CLASS =
  "border border-transparent text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-main";

/** Link/button base shared by hub subnavs (explicit focus ring for keyboard a11y). */
export const HUB_SUBNAV_ITEM_BASE_CLASS =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background";
