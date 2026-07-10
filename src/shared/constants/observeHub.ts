/**
 * Observe / Execution Stream hub (Epic 0005 S4).
 * SSoT path: `/dashboard/activity` with `?source=` filter.
 * Domain viewers remain separate; this module only defines routing chrome.
 */

export type ObserveSource =
  | "activity"
  | "request"
  | "proxy"
  | "console"
  | "audit"
  | "mcp"
  | "a2a";

export const OBSERVE_SOURCES: readonly ObserveSource[] = [
  "activity",
  "request",
  "proxy",
  "console",
  "audit",
  "mcp",
  "a2a",
] as const;

export const OBSERVE_HUB_PATH = "/dashboard/activity" as const;

/** Sidebar leaf ids collapsed into the Observe hub (hideable prefs retained). */
export const OBSERVE_STREAM_SIDEBAR_IDS = [
  "logs",
  "logs-proxy",
  "logs-console",
  "logs-activity",
  "audit",
  "audit-mcp",
  "audit-a2a",
] as const;

/** Normalize query `source` (and legacy aliases) to a known tab. */
export function normalizeObserveSource(raw: string | null | undefined): ObserveSource {
  if (!raw) return "activity";
  const value = raw.trim().toLowerCase();
  if (value === "logs" || value === "request-logs" || value === "call-logs") return "request";
  if (value === "proxy-logs") return "proxy";
  if (value === "console-logs") return "console";
  if (value === "compliance") return "audit";
  if (value === "audit-mcp" || value === "mcp-audit") return "mcp";
  if (value === "audit-a2a" || value === "a2a-audit") return "a2a";
  if ((OBSERVE_SOURCES as readonly string[]).includes(value)) {
    return value as ObserveSource;
  }
  return "activity";
}

/**
 * Build hub URL for redirects / deep links.
 * Default source omits `source` so the hub URL stays clean for activity.
 */
export function buildObserveHubPath(
  source: ObserveSource = "activity",
  extras?: Record<string, string | null | undefined>
): string {
  const qs = new URLSearchParams();
  if (source !== "activity") qs.set("source", source);
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value != null && value !== "") qs.set(key, value);
    }
  }
  const query = qs.toString();
  return query ? `${OBSERVE_HUB_PATH}?${query}` : OBSERVE_HUB_PATH;
}

/** Old path → hub path mapping (documented for tests + provenance). */
export const OBSERVE_REDIRECT_MATRIX: ReadonlyArray<{
  from: string;
  source: ObserveSource;
}> = [
  { from: "/dashboard/logs", source: "request" },
  { from: "/dashboard/logs/proxy", source: "proxy" },
  { from: "/dashboard/logs/console", source: "console" },
  { from: "/dashboard/logs/activity", source: "activity" },
  { from: "/dashboard/audit", source: "audit" },
  { from: "/dashboard/audit/mcp", source: "mcp" },
  { from: "/dashboard/audit/a2a", source: "a2a" },
  { from: "/dashboard/usage", source: "request" },
] as const;
