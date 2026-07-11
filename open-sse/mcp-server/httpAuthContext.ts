import { AsyncLocalStorage } from "node:async_hooks";

/** Minimal principal snapshot stored in ALS for tool handlers (F-04-002/003). */
export type McpHttpPrincipal = {
  clientId: string;
  scopes: string[];
  role: "tenant" | "admin" | "none";
  token: string;
};

type McpHttpAuthContext = {
  authorization?: string;
  cookie?: string;
  xApiKey?: string;
  anthropicVersion?: string;
  principal?: McpHttpPrincipal | null;
};

const mcpHttpAuthContext = new AsyncLocalStorage<McpHttpAuthContext>();

function headerValue(request: Request, name: string): string | undefined {
  const value = request.headers.get(name);
  return value && value.trim().length > 0 ? value : undefined;
}

export function getMcpHttpAuthHeadersForInternalFetch(): Record<string, string> {
  const context = mcpHttpAuthContext.getStore();
  const headers: Record<string, string> = {};
  if (context?.authorization) headers.Authorization = context.authorization;
  if (context?.cookie) headers.Cookie = context.cookie;
  if (context?.xApiKey && context?.anthropicVersion) {
    headers["x-api-key"] = context.xApiKey;
    headers["anthropic-version"] = context.anthropicVersion;
  }
  return headers;
}

export function getMcpPrincipalFromStore(): {
  clientId: string;
  scopes: string[];
  role: "tenant" | "admin" | "none";
} | null {
  const principal = mcpHttpAuthContext.getStore()?.principal;
  if (!principal) return null;
  return {
    clientId: principal.clientId,
    scopes: principal.scopes,
    role: principal.role,
  };
}

export async function withMcpHttpAuthContext<T>(
  request: Request,
  callback: () => Promise<T>,
  principal?: McpHttpPrincipal | null
): Promise<T> {
  return mcpHttpAuthContext.run(
    {
      authorization: headerValue(request, "authorization"),
      cookie: headerValue(request, "cookie"),
      xApiKey: headerValue(request, "x-api-key"),
      anthropicVersion: headerValue(request, "anthropic-version"),
      principal: principal ?? null,
    },
    callback
  );
}
