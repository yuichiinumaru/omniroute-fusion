/**
 * Resolve MCP AuthInfo from an HTTP request for transport injection (F-04-002).
 *
 * Scopes come only from the authenticated principal (API key metadata, dashboard
 * session, CLI token) or process env fallback — never from client `_meta`.
 */

import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { extractApiKey } from "../../src/sse/services/auth.ts";
import { getApiKeyMetadata } from "../../src/lib/db/apiKeys.ts";
import { isDashboardSessionAuthenticated } from "../../src/shared/utils/apiAuth.ts";
import { isCliTokenAuthValid } from "../../src/lib/middleware/cliTokenAuth.ts";
import type { PrincipalRole } from "./principalBinding.ts";

export type McpPrincipalSnapshot = {
  clientId: string;
  scopes: string[];
  role: PrincipalRole;
  token: string;
};

function envFallbackScopes(): string[] {
  return (process.env.OMNIROUTE_MCP_SCOPES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Map API-key / management scopes onto MCP tool scopes.
 * `manage` / `admin` grant full MCP surface (`*`) for operators.
 */
export function mapPrincipalScopesToMcp(scopes: readonly string[]): string[] {
  if (scopes.some((s) => s === "*" || s === "admin" || s === "manage")) {
    return ["*"];
  }
  const unique = Array.from(new Set(scopes.map((s) => s.trim()).filter(Boolean)));
  return unique.length > 0 ? unique : envFallbackScopes();
}

/**
 * Resolve the authenticated MCP principal from the inbound HTTP request.
 *
 * Role rules (F-04-003):
 * - dashboard session / CLI token / env-key → admin (may target any apiKeyId)
 * - other API keys (even with manage) → tenant (pinned to their own id)
 */
export async function resolveMcpPrincipalFromRequest(
  request: Request
): Promise<McpPrincipalSnapshot | null> {
  if (await isDashboardSessionAuthenticated(request)) {
    return {
      clientId: "dashboard",
      scopes: ["*"],
      role: "admin",
      token: "dashboard-session",
    };
  }

  if (await isCliTokenAuthValid(request)) {
    return {
      clientId: "cli",
      scopes: ["*"],
      role: "admin",
      token: "cli-token",
    };
  }

  const apiKey = extractApiKey(request, { allowUrl: false });
  if (!apiKey) {
    return null;
  }

  let meta: Awaited<ReturnType<typeof getApiKeyMetadata>> = null;
  try {
    meta = await getApiKeyMetadata(apiKey);
  } catch {
    return null;
  }
  if (!meta) return null;

  // env-key and explicit `admin` scope are operator-level; plain `manage` is tenant-pinned
  // so multi-operator deployments cannot IDOR each other's memories via MCP.
  const role: PrincipalRole =
    meta.id === "env-key" || meta.scopes.includes("admin") ? "admin" : "tenant";

  return {
    clientId: meta.id,
    scopes: mapPrincipalScopesToMcp(meta.scopes),
    role,
    token: apiKey,
  };
}

export function principalToAuthInfo(principal: McpPrincipalSnapshot): AuthInfo {
  return {
    token: principal.token,
    clientId: principal.clientId,
    scopes: [...principal.scopes],
    extra: { role: principal.role },
  };
}
