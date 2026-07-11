import { MCP_TOOL_MAP } from "./schemas/tools.ts";
import { getMcpPrincipalFromStore } from "./httpAuthContext.ts";

type AuthInfoLike = {
  clientId?: string;
  scopes?: string[];
  extra?: Record<string, unknown>;
};

export type McpToolExtraLike = {
  authInfo?: AuthInfoLike;
  sessionId?: string;
  /** Client-controlled metadata — NEVER used as a scope grant source (F-04-002). */
  _meta?: unknown;
};

/** Scope grant sources. Client `_meta` is intentionally not a grant path. */
export type ScopeSource = "authInfo" | "env" | "none";

export interface CallerScopeContext {
  callerId: string;
  scopes: string[];
  source: ScopeSource;
}

export interface ScopeCheckResult {
  allowed: boolean;
  required: string[];
  provided: string[];
  missing: string[];
  reason?: string;
}

function normalizeScopeList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const normalized = raw
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function scopeMatches(grantedScope: string, requiredScope: string): boolean {
  if (grantedScope === "*" || grantedScope === requiredScope) {
    return true;
  }
  if (grantedScope.endsWith("*")) {
    const prefix = grantedScope.slice(0, -1);
    return requiredScope.startsWith(prefix);
  }
  return false;
}

/**
 * Resolve caller scopes from authenticated principal only.
 *
 * Priority:
 * 1. `extra.authInfo` (injected by HTTP transport from management principal)
 * 2. ALS principal store (same HTTP request context)
 * 3. Process env `OMNIROUTE_MCP_SCOPES` fallback (stdio / operator)
 *
 * Client-supplied `_meta.scopes` / `_meta.auth.scopes` are **never** trusted (F-04-002).
 */
export function resolveCallerScopeContext(
  extra: McpToolExtraLike | undefined,
  fallbackScopes: readonly string[] = []
): CallerScopeContext {
  const store = getMcpPrincipalFromStore();

  const callerId =
    (typeof extra?.authInfo?.clientId === "string" && extra.authInfo.clientId.trim()) ||
    (typeof store?.clientId === "string" && store.clientId.trim()) ||
    (typeof extra?.sessionId === "string" && extra.sessionId.trim()) ||
    "anonymous";

  const authScopes = normalizeScopeList(extra?.authInfo?.scopes);
  if (authScopes.length > 0) {
    return { callerId, scopes: authScopes, source: "authInfo" };
  }

  const storeScopes = normalizeScopeList(store?.scopes);
  if (storeScopes.length > 0) {
    return { callerId, scopes: storeScopes, source: "authInfo" };
  }

  // Intentionally ignore extra._meta — forged client scopes must not escalate.
  const fallback = normalizeScopeList(fallbackScopes);
  if (fallback.length > 0) {
    return { callerId, scopes: fallback, source: "env" };
  }

  return { callerId, scopes: [], source: "none" };
}

export function evaluateToolScopes(
  toolName: string,
  callerScopes: readonly string[],
  enforceScopes: boolean,
  inlineScopes?: readonly string[]
): ScopeCheckResult {
  const provided = normalizeScopeList(callerScopes);

  if (!enforceScopes) {
    return { allowed: true, required: [], provided, missing: [] };
  }

  const toolScopes = inlineScopes ?? MCP_TOOL_MAP[toolName]?.scopes;
  const required = Array.isArray(toolScopes) ? Array.from(toolScopes) : [];

  if (required.length === 0) {
    return {
      allowed: false,
      required: [],
      provided,
      missing: [],
      reason: "tool_definition_missing",
    };
  }

  const missing = required.filter(
    (requiredScope) => !provided.some((grantedScope) => scopeMatches(grantedScope, requiredScope))
  );

  return {
    allowed: missing.length === 0,
    required,
    provided,
    missing,
    reason: missing.length > 0 ? "missing_scopes" : undefined,
  };
}
