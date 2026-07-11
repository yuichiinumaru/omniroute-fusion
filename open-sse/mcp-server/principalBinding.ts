/**
 * Principal binding for multi-tenant MCP tools (F-04-003).
 *
 * Caller-chosen `apiKeyId` / `fromApiKeyId` must not escalate across tenants.
 * Authenticated API-key principals are always pinned to their own id.
 * Operator principals (dashboard session, CLI token, env-key, admin scope) may target others.
 */

import type { McpToolExtraLike } from "./scopeEnforcement.ts";
import { getMcpPrincipalFromStore } from "./httpAuthContext.ts";

export type PrincipalRole = "tenant" | "admin" | "none";

export interface ResolvedPrincipal {
  clientId: string | null;
  role: PrincipalRole;
  scopes: readonly string[];
}

const ADMIN_CLIENT_IDS = new Set(["dashboard", "cli", "env-key"]);

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve the authenticated principal from tool `extra` and/or ALS store.
 */
export function resolvePrincipal(extra?: McpToolExtraLike): ResolvedPrincipal {
  const store = getMcpPrincipalFromStore();
  const authClientId = normalizeId(extra?.authInfo?.clientId) ?? normalizeId(store?.clientId);
  const scopes =
    Array.isArray(extra?.authInfo?.scopes) && extra.authInfo.scopes.length > 0
      ? extra.authInfo.scopes
      : (store?.scopes ?? []);
  const extraRole = extra?.authInfo?.extra?.role;

  // Explicit role from transport / ALS wins over scope heuristics.
  if (store?.role === "admin" || extraRole === "admin") {
    return {
      clientId: authClientId ?? store?.clientId ?? "admin",
      role: "admin",
      scopes,
    };
  }

  if (authClientId && ADMIN_CLIENT_IDS.has(authClientId)) {
    return { clientId: authClientId, role: "admin", scopes };
  }

  // Explicit admin scope elevates for cross-tenant ops (not bare manage/*).
  if (scopes.includes("admin")) {
    return {
      clientId: authClientId ?? store?.clientId ?? "admin",
      role: "admin",
      scopes,
    };
  }

  if (store?.role === "tenant" && store.clientId) {
    return { clientId: store.clientId, role: "tenant", scopes: store.scopes };
  }

  if (authClientId && authClientId !== "anonymous") {
    return { clientId: authClientId, role: "tenant", scopes };
  }

  return { clientId: null, role: "none", scopes };
}

/**
 * Bind a requested tenant id to the authenticated principal.
 * - tenant: always remapped/rejected to principal id
 * - admin: requested id allowed; falls back to principal id
 * - none: requested required (stdio operator without principal)
 */
export function bindApiKeyIdToPrincipal(
  requested: unknown,
  extra?: McpToolExtraLike,
  options: { optional?: boolean } = {}
): string | undefined {
  const principal = resolvePrincipal(extra);
  const requestedId = normalizeId(requested);

  if (principal.role === "tenant") {
    if (!principal.clientId) {
      throw new Error("Forbidden: authenticated principal has no client id");
    }
    // Remap (never honor foreign ids) — F-04-003 IDOR pin
    return principal.clientId;
  }

  if (principal.role === "admin") {
    return requestedId ?? principal.clientId ?? undefined;
  }

  // No principal (stdio / unauthenticated path)
  if (requestedId) return requestedId;
  if (options.optional) return undefined;
  throw new Error("apiKeyId is required when no authenticated principal is bound");
}

/**
 * Overlay principal-bound tenant ids onto tool arguments.
 */
export function bindTenantPrincipalIds(
  args: unknown,
  extra?: McpToolExtraLike
): unknown {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return args;
  }

  const record = args as Record<string, unknown>;
  const out: Record<string, unknown> = { ...record };
  const principal = resolvePrincipal(extra);

  // Pin apiKeyId for tenant principals always; for others only when present or required.
  if (principal.role === "tenant") {
    out.apiKeyId = bindApiKeyIdToPrincipal(record.apiKeyId, extra);
  } else if ("apiKeyId" in record) {
    const bound = bindApiKeyIdToPrincipal(record.apiKeyId, extra, { optional: true });
    if (bound !== undefined) {
      out.apiKeyId = bound;
    } else {
      delete out.apiKeyId;
    }
  }

  if ("fromApiKeyId" in record) {
    out.fromApiKeyId = bindApiKeyIdToPrincipal(record.fromApiKeyId, extra);
  }

  return out;
}
