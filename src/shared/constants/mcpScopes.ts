/**
 * MCP Authorization Scopes — Defines permission scopes for each MCP tool.
 *
 * Each tool requires specific scopes to execute. API keys can be configured
 * with a subset of scopes to limit tool access (least-privilege).
 *
 * SSoT for dashboard/API-key scope UI and parity tests. Keep in sync with live
 * tool `scopes` fields under open-sse/mcp-server (see tests/unit/mcp-scope-parity-0047).
 */

// ============ Scope Definitions ============

/** All available MCP scopes (derived from live tool modules). */
export const MCP_SCOPE_LIST = [
  "execute:completions",
  "execute:search",
  "execute:skills",
  "pricing:write",
  "read:cache",
  "read:catalog",
  "read:combos",
  "read:compression",
  "read:gamification",
  "read:health",
  "read:memory",
  "read:models",
  "read:notion",
  "read:obsidian",
  "read:plugins",
  "read:proxies",
  "read:quota",
  "read:skills",
  "read:tools",
  "read:usage",
  "write:budget",
  "write:cache",
  "write:combos",
  "write:compression",
  "write:gamification",
  "write:memory",
  "write:notion",
  "write:obsidian",
  "write:plugins",
  "write:resilience",
  "write:skills",
] as const;

export type McpScope = (typeof MCP_SCOPE_LIST)[number];

/** Live unique scope count for hub copy / key builders. */
export const MCP_SCOPE_COUNT = MCP_SCOPE_LIST.length;

// ============ Tool → Scope Mapping ============

/** Maps each MCP tool to its required scopes (must match tool-module inline scopes). */
export const MCP_TOOL_SCOPES: Record<string, readonly McpScope[]> = {
  // Core / routing / cache / compression / proxies
  omniroute_best_combo_for_task: ["read:combos", "read:health"],
  omniroute_cache_flush: ["write:cache"],
  omniroute_cache_stats: ["read:cache"],
  omniroute_check_quota: ["read:quota"],
  omniroute_compression_combo_stats: ["read:compression"],
  omniroute_compression_configure: ["write:compression"],
  omniroute_compression_status: ["read:compression"],
  omniroute_cost_report: ["read:usage"],
  omniroute_db_health_check: ["read:health", "write:resilience"],
  omniroute_explain_route: ["read:health", "read:usage"],
  omniroute_get_combo_metrics: ["read:combos"],
  omniroute_get_health: ["read:health"],
  omniroute_get_provider_metrics: ["read:health"],
  omniroute_get_session_snapshot: ["read:usage"],
  omniroute_list_combos: ["read:combos"],
  omniroute_list_compression_combos: ["read:compression"],
  omniroute_list_models_catalog: ["read:models"],
  omniroute_oneproxy_fetch: ["read:proxies"],
  omniroute_oneproxy_rotate: ["read:proxies"],
  omniroute_oneproxy_stats: ["read:proxies"],
  omniroute_route_request: ["execute:completions"],
  omniroute_set_budget_guard: ["write:budget"],
  omniroute_set_compression_engine: ["write:compression"],
  omniroute_set_resilience_profile: ["write:resilience"],
  omniroute_set_routing_strategy: ["write:combos"],
  omniroute_simulate_route: ["read:health", "read:combos"],
  omniroute_switch_combo: ["write:combos"],
  omniroute_sync_pricing: ["pricing:write"],
  omniroute_test_combo: ["execute:completions", "read:combos"],
  omniroute_tool_search: ["read:tools"],
  omniroute_web_fetch: ["execute:search"],
  omniroute_web_search: ["execute:search"],

  // Memory
  omniroute_memory_add: ["write:memory"],
  omniroute_memory_clear: ["write:memory"],
  omniroute_memory_search: ["read:memory"],

  // Skills
  omniroute_skills_enable: ["write:skills"],
  omniroute_skills_execute: ["execute:skills"],
  omniroute_skills_executions: ["read:skills"],
  omniroute_skills_list: ["read:skills"],

  // Agent skills
  omniroute_agent_skills_coverage: ["read:catalog"],
  omniroute_agent_skills_get: ["read:catalog"],
  omniroute_agent_skills_list: ["read:catalog"],

  // Pool / browser
  omniroute_browser_pool_status: ["read:health"],
  omniroute_pool_health: ["read:health"],
  omniroute_pool_reset: ["write:resilience"],
  omniroute_pool_sessions: ["read:health"],
  omniroute_pool_status: ["read:health"],
  omniroute_pool_warm: ["write:resilience"],

  // Gamification
  gamification_anomalies: ["read:gamification"],
  gamification_badges: ["read:gamification"],
  gamification_invite: ["write:gamification"],
  gamification_leaderboard: ["read:gamification"],
  gamification_profile: ["read:gamification"],
  gamification_rank: ["read:gamification"],
  gamification_servers: ["read:gamification"],
  gamification_transfer: ["write:gamification"],

  // Plugins
  plugin_activate: ["write:plugins"],
  plugin_configure: ["write:plugins"],
  plugin_deactivate: ["write:plugins"],
  plugin_executions: ["read:plugins"],
  plugin_install: ["write:plugins"],
  plugin_list: ["read:plugins"],
  plugin_scan: ["write:plugins"],
  plugin_uninstall: ["write:plugins"],

  // Notion
  notion_append_blocks: ["write:notion"],
  notion_get_database: ["read:notion"],
  notion_get_page: ["read:notion"],
  notion_list_block_children: ["read:notion"],
  notion_query_database: ["read:notion"],
  notion_search: ["read:notion"],

  // Obsidian
  obsidian_append_note: ["write:obsidian"],
  obsidian_check_status: ["read:obsidian"],
  obsidian_delete_note: ["write:obsidian"],
  obsidian_execute_command: ["write:obsidian"],
  obsidian_get_active_file: ["read:obsidian"],
  obsidian_get_document_map: ["read:obsidian"],
  obsidian_get_note_metadata: ["read:obsidian"],
  obsidian_get_periodic_note: ["read:obsidian"],
  obsidian_get_tags: ["read:obsidian"],
  obsidian_list_commands: ["read:obsidian"],
  obsidian_list_vault: ["read:obsidian"],
  obsidian_move_note: ["write:obsidian"],
  obsidian_open_file: ["write:obsidian"],
  obsidian_patch_note: ["write:obsidian"],
  obsidian_read_note: ["read:obsidian"],
  obsidian_search_simple: ["read:obsidian"],
  obsidian_search_structured: ["read:obsidian"],
  obsidian_sync_conflicts: ["read:obsidian"],
  obsidian_sync_resolve_conflict: ["write:obsidian"],
  obsidian_sync_status: ["read:obsidian"],
  obsidian_sync_trigger: ["write:obsidian"],
  obsidian_write_note: ["write:obsidian"],

  // Other
  omniroute_ccr_retrieve: ["read:compression"],

} as const;

/** Unique registered MCP tools with declared scopes (hub + docs counts). */
export const MCP_TOOL_COUNT = Object.keys(MCP_TOOL_SCOPES).length;

/** Transports exposed by the MCP hub (stdio / SSE / streamable-http). */
export const MCP_TRANSPORT_COUNT = 3 as const;
