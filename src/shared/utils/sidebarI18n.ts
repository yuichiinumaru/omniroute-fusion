/**
 * Shared next-intl sidebar-namespace helpers for hub strips / topbars.
 * Used by DashboardTopbar, CostsSubnav, ObserveHubSubnav, etc.
 */

/**
 * Callable translator for the `sidebar` namespace, with optional key-existence probe.
 * next-intl's `useTranslations` runtime may expose `.has()`; the optional property
 * models that without widening the call site to `any`.
 */
export type SidebarTranslator = ((key: string, values?: Record<string, unknown>) => string) & {
  has?: (key: string) => boolean;
};

/**
 * Resolve a sidebar i18n key when present; otherwise use the English fallback.
 * Guards `.has` with `typeof` so callers stay safe if the runtime omits it.
 */
export function sidebarText(t: SidebarTranslator, key: string, fallback: string): string {
  return typeof t.has === "function" && t.has(key) ? t(key) : fallback;
}

/**
 * Narrow `useTranslations("sidebar")` to {@link SidebarTranslator}.
 *
 * SAFETY: next-intl returns a callable translator for the requested namespace;
 * current runtime versions also expose optional `.has()`. Callers must still
 * resolve labels via {@link sidebarText} (which guards `.has`) rather than
 * assuming every key exists.
 */
export function asSidebarTranslator(t: (key: string, values?: Record<string, unknown>) => string): SidebarTranslator {
  // SAFETY: structural narrow of next-intl translator; optional `.has` is
  // re-checked at use sites via sidebarText.
  return t as SidebarTranslator;
}
