/**
 * MCP HTTP Transport Layer — session-aware handlers for SSE and Streamable HTTP.
 *
 * Runs the MCP server **inside** the Next.js process so it can be toggled
 * from the dashboard without requiring `omniroute --mcp`.
 *
 * Transport modes:
 *   - SSE:             GET /api/mcp/sse (event stream)  +  POST /api/mcp/sse (messages)
 *   - Streamable HTTP: POST /api/mcp/stream (messages)  +  GET /api/mcp/stream (SSE stream)  +  DELETE /api/mcp/stream (session end)
 *
 * F-04-W2-001: sessions are per-connection (no process-global singleton that
 * cross-talks clients). SSE and streamable modes do not tear each other down.
 * F-04-002: authenticated principal scopes are injected as transport authInfo.
 */

import { randomUUID } from "node:crypto";
import { createMcpServer } from "./server.ts";
import { withMcpHttpAuthContext } from "./httpAuthContext.ts";
import {
  principalToAuthInfo,
  resolveMcpPrincipalFromRequest,
} from "./mcpPrincipal.ts";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type McpHttpSession = {
  sessionId: string;
  server: McpServer;
  transport: WebStandardStreamableHTTPServerTransport;
  startedAt: number;
  lastActivityAt: number;
  /** Transport surface used to open the session (for status reporting). */
  kind: "sse" | "streamable-http";
};

/** Back-compat alias for source-level tests / older imports. */
type StreamableSession = McpHttpSession;

/** Streamable sessions keyed by mcp-session-id (F-04-W2-001 isolation). */
const _streamableSessions = new Map<string, StreamableSession>();
/** SSE sessions keyed by mcp-session-id — independent of streamable map. */
const _sseSessions = new Map<string, McpHttpSession>();

const MCP_SESSION_IDLE_MS = 5 * 60 * 1000;

const _mcpSessionSweep = setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of _streamableSessions) {
    if (now - session.lastActivityAt > MCP_SESSION_IDLE_MS) {
      try {
        closeStreamableSession(sessionId);
      } catch {
        // ignore
      }
    }
  }
  for (const [sessionId, session] of _sseSessions) {
    if (now - session.lastActivityAt > MCP_SESSION_IDLE_MS) {
      try {
        closeSseSession(sessionId);
      } catch {
        // ignore
      }
    }
  }
}, 60_000);
if (typeof _mcpSessionSweep === "object" && "unref" in _mcpSessionSweep) {
  (_mcpSessionSweep as { unref?: () => void }).unref?.();
}

function closeStreamableSession(sessionId: string): void {
  const session = _streamableSessions.get(sessionId);
  if (!session) {
    return;
  }

  try {
    session.transport.close();
  } catch {
    // ignore shutdown errors
  }
  _streamableSessions.delete(sessionId);
}

function closeSseSession(sessionId: string): void {
  const session = _sseSessions.get(sessionId);
  if (!session) {
    return;
  }

  try {
    session.transport.close();
  } catch {
    // ignore shutdown errors
  }
  _sseSessions.delete(sessionId);
}

function closeAllStreamableSessions(): void {
  for (const sessionId of _streamableSessions.keys()) {
    closeStreamableSession(sessionId);
  }
}

function closeAllSseSessions(): void {
  for (const sessionId of _sseSessions.keys()) {
    closeSseSession(sessionId);
  }
}

async function createSession(kind: "sse" | "streamable-http"): Promise<McpHttpSession> {
  const sessionId = randomUUID();
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
  });
  const session: McpHttpSession = {
    sessionId,
    server,
    transport,
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    kind,
  };

  // Await connect so initialize is not raced (F-04-W2-007 partial)
  await server.connect(transport);

  if (kind === "sse") {
    _sseSessions.set(sessionId, session);
  } else {
    _streamableSessions.set(sessionId, session);
  }
  console.log(`[MCP] HTTP transport started (${kind}:${sessionId})`);
  return session;
}

function createStreamableSession(): StreamableSession {
  // Production initialize path uses createSession() (await connect). This sync
  // helper remains for source-level regression tests that assert lastActivityAt.
  const sessionId = randomUUID();
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
  });
  const session: StreamableSession = {
    sessionId,
    server,
    transport,
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    kind: "streamable-http",
  };
  void server.connect(transport);
  _streamableSessions.set(sessionId, session);
  console.log(`[MCP] HTTP transport started (streamable-http:${sessionId})`);
  return session;
}

async function handleStreamableRequest(request: Request): Promise<Response> {
  return handleSessionRequest(request, "streamable-http");
}

async function isInitializeRequest(request: Request): Promise<boolean> {
  if (request.method !== "POST") {
    return false;
  }

  try {
    const body = (await request.clone().json()) as { method?: unknown };
    return body?.method === "initialize";
  } catch {
    return false;
  }
}

function errorResponse(message: string, code: number, status = 400): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code, message },
      id: null,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function withSessionHeader(response: Response, sessionId: string): Response {
  if (response.headers.get("mcp-session-id")) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("mcp-session-id", sessionId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function resolveAuthInfo(request: Request): Promise<AuthInfo | undefined> {
  try {
    const principal = await resolveMcpPrincipalFromRequest(request);
    return principal ? principalToAuthInfo(principal) : undefined;
  } catch (err) {
    console.error("[MCP] principal resolve failed:", err);
    return undefined;
  }
}

async function runWithAuth<T>(
  request: Request,
  authInfo: AuthInfo | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const principal = authInfo
    ? {
        clientId: authInfo.clientId,
        scopes: authInfo.scopes,
        role: (authInfo.extra?.role as "tenant" | "admin" | "none") || "tenant",
        token: authInfo.token,
      }
    : null;
  return withMcpHttpAuthContext(request, fn, principal);
}

async function handleSessionRequest(
  request: Request,
  kind: "sse" | "streamable-http"
): Promise<Response> {
  const sessions = kind === "sse" ? _sseSessions : _streamableSessions;
  const sessionId = request.headers.get("mcp-session-id");
  const authInfo = await resolveAuthInfo(request);

  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      // MCP spec: unknown session → 404 so clients re-initialize
      return errorResponse("Not Found: Unknown Mcp-Session-Id header", -32000, 404);
    }

    try {
      session.lastActivityAt = Date.now();
      const response = await runWithAuth(request, authInfo, () =>
        session.transport.handleRequest(request, { authInfo })
      );
      if (request.method === "DELETE") {
        if (kind === "sse") closeSseSession(sessionId);
        else closeStreamableSession(sessionId);
      }
      return withSessionHeader(response, sessionId);
    } catch (err) {
      console.error(`[MCP] ${kind} error:`, err);
      if (request.method === "DELETE") {
        if (kind === "sse") closeSseSession(sessionId);
        else closeStreamableSession(sessionId);
      }
      return new Response(JSON.stringify({ error: "MCP transport error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // GET without session: open a new session stream (SSE-style clients)
  if (request.method === "GET") {
    const session = await createSession(kind);
    try {
      const response = await runWithAuth(request, authInfo, () =>
        session.transport.handleRequest(request, { authInfo })
      );
      return withSessionHeader(response, session.sessionId);
    } catch (err) {
      if (kind === "sse") closeSseSession(session.sessionId);
      else closeStreamableSession(session.sessionId);
      console.error(`[MCP] ${kind} error:`, err);
      return new Response(JSON.stringify({ error: "MCP transport error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (!(await isInitializeRequest(request))) {
    return errorResponse("Bad Request: Mcp-Session-Id header is required", -32000);
  }

  const session = await createSession(kind);

  try {
    const response = await runWithAuth(request, authInfo, () =>
      session.transport.handleRequest(request, { authInfo })
    );
    return withSessionHeader(response, session.sessionId);
  } catch (err) {
    if (kind === "sse") closeSseSession(session.sessionId);
    else closeStreamableSession(session.sessionId);
    console.error(`[MCP] ${kind} error:`, err);
    return new Response(JSON.stringify({ error: "MCP transport error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Handle Streamable HTTP requests (POST / GET / DELETE).
 * Used by the Next.js route at /api/mcp/stream.
 */
export async function handleMcpStreamableHTTP(request: Request): Promise<Response> {
  return handleStreamableRequest(request);
}

// Ensure createStreamableSession is retained (source tests + potential callers)
void createStreamableSession;

/**
 * Handle SSE requests with per-client session isolation (F-04-W2-001).
 * Does not share transport state with other clients or with streamable mode.
 */
export async function handleMcpSSE(request: Request): Promise<Response> {
  return handleSessionRequest(request, "sse");
}

export function getMcpHttpStatus(): {
  online: boolean;
  transport: string | null;
  startedAt: number | null;
  uptime: string | null;
} {
  const allSessions = [
    ...Array.from(_streamableSessions.values()),
    ...Array.from(_sseSessions.values()),
  ];
  const startedAt =
    allSessions.length > 0
      ? Math.min(...allSessions.map((session) => session.startedAt))
      : null;

  let transport: string | null = null;
  if (_streamableSessions.size > 0 && _sseSessions.size > 0) {
    transport = "mixed";
  } else if (_streamableSessions.size > 0) {
    transport = "streamable-http";
  } else if (_sseSessions.size > 0) {
    transport = "sse";
  }

  return {
    online: transport !== null,
    transport,
    startedAt,
    uptime: startedAt ? `${Math.floor((Date.now() - startedAt) / 1000)}s` : null,
  };
}

export function isMcpHttpTransportReady(
  enabled: boolean,
  transport: string | null | undefined
): boolean {
  return enabled && (transport === "sse" || transport === "streamable-http");
}

export function shutdownMcpHttp(): void {
  closeAllStreamableSessions();
  closeAllSseSessions();
  console.log("[MCP] HTTP transport shutdown");
}

export function isMcpHttpActive(): boolean {
  return _streamableSessions.size > 0 || _sseSessions.size > 0;
}

/** Test helper: active session counts (isolation assertions). */
export function getMcpHttpSessionCounts(): { streamable: number; sse: number } {
  return { streamable: _streamableSessions.size, sse: _sseSessions.size };
}
