/**
 * API: OpenAPI "Try It" Proxy
 * POST — forwards a request to a local endpoint and returns the result
 *
 * Security (Task 0040 / F-07-001):
 *   - Allowlist is intentionally narrow (client API surfaces only) — bare
 *     `"/api/"` is forbidden because it re-opens LOCAL_ONLY spawn gates via
 *     same-origin loopback re-entry when cookies are forwarded.
 *   - Paths matching LOCAL_ONLY / SPAWN_CAPABLE / ALWAYS_PROTECTED are denied
 *     even if a future allowlist entry would otherwise cover them.
 *   - Cookies are never attached to denied destinations (and only forwarded
 *     after the path has passed the allowlist + denylist checks).
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { validateBody, isValidationFailure } from "@/shared/validation/helpers";
import {
  isAlwaysProtectedPath,
  isLocalOnlyPath,
  isSpawnCapablePath,
} from "@/server/authz/routeGuard";

/**
 * Safe Try-It targets. Client inference / protocol surfaces only.
 * Must NOT include bare `"/api/"` (F-07-001).
 */
export const ALLOWED_TRY_PATH_PREFIXES: ReadonlyArray<string> = [
  "/api/v1/",
  "/v1/",
  "/v1beta/",
  "/a2a",
  "/.well-known/agent.json",
];

const BLOCKED_FORWARD_HEADERS = new Set([
  "connection",
  "content-length",
  "cookie",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
]);

/**
 * Normalize a try-path for classification: strip query string and hash so
 * `isLocalOnlyPath("/api/services/x?foo=1")` still matches the prefix list.
 */
export function normalizeTryPath(path: string): string {
  const withoutHash = path.split("#")[0] ?? path;
  return withoutHash.split("?")[0] || path;
}

/**
 * True when the Try-It proxy must refuse to forward to `path`.
 * Defence-in-depth on top of the allowlist (Hard Rules #15 + #17).
 */
export function isDeniedTryProxyPath(path: string, method = "GET"): boolean {
  const normalized = normalizeTryPath(path);
  return (
    isLocalOnlyPath(normalized, method) ||
    isSpawnCapablePath(normalized) ||
    isAlwaysProtectedPath(normalized)
  );
}

const tryRequestSchema = z.object({
  method: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
    .optional()
    .default("GET"),
  path: z
    .string()
    .min(1, "Path is required")
    .startsWith("/", "Path must start with /")
    .refine((value) => !value.startsWith("//"), "Path must be a same-origin path")
    .refine(
      (value) =>
        ALLOWED_TRY_PATH_PREFIXES.some((prefix) =>
          normalizeTryPath(value).startsWith(prefix)
        ),
      "Path must target an OmniRoute client API endpoint"
    ),
  headers: z.record(z.string(), z.string()).optional().default({}),
  body: z.any().optional(),
});

function getRequestOrigin(request: NextRequest) {
  return request.nextUrl?.origin || new URL(request.url).origin;
}

function buildForwardHeaders(headers: Record<string, string>) {
  const forwardHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey || BLOCKED_FORWARD_HEADERS.has(normalizedKey)) continue;
    forwardHeaders[key] = value;
  }

  return forwardHeaders;
}

export async function POST(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const rawBody = await request.json();
    const validation = validateBody(tryRequestSchema, rawBody);
    if (isValidationFailure(validation)) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { method, path, headers, body: reqBody } = validation.data;
    const httpMethod = method.toUpperCase();
    const normalizedPath = normalizeTryPath(path);

    // Defence-in-depth: refuse LOCAL_ONLY / SPAWN_CAPABLE / ALWAYS_PROTECTED
    // destinations before any cookie is attached or fetch is issued (F-07-001).
    if (isDeniedTryProxyPath(normalizedPath, httpMethod)) {
      return NextResponse.json(
        {
          error:
            "Proxying to local-only, spawn-capable, or always-protected endpoints is not allowed",
        },
        { status: 403 }
      );
    }

    const origin = getRequestOrigin(request);
    const targetUrl = new URL(path, origin);
    if (targetUrl.origin !== origin) {
      return NextResponse.json({ error: "Path must be same-origin" }, { status: 400 });
    }

    const start = performance.now();

    // Forward only after the path has passed allowlist + denylist checks.
    // Cookies are never attached to denied destinations (early return above).
    const forwardHeaders = buildForwardHeaders(headers as Record<string, string>);

    // Forward auth from the dashboard session for allowed client-API targets only.
    const cookie = request.headers.get("cookie");
    if (cookie && !forwardHeaders["Cookie"]) {
      forwardHeaders["Cookie"] = cookie;
    }

    if (reqBody && !forwardHeaders["Content-Type"]) {
      forwardHeaders["Content-Type"] = "application/json";
    }

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: forwardHeaders,
    };

    if (reqBody && httpMethod !== "GET") {
      fetchOptions.body = typeof reqBody === "string" ? reqBody : JSON.stringify(reqBody);
    }

    const res = await fetch(targetUrl, fetchOptions);
    const latencyMs = Math.round(performance.now() - start);

    // Read response
    const contentType = res.headers.get("content-type") || "";
    let responseBody: unknown;

    if (contentType.includes("application/json")) {
      responseBody = await res.json();
    } else {
      const text = await res.text();
      // Truncate very large responses
      responseBody = text.length > 10000 ? text.slice(0, 10000) + "\n... (truncated)" : text;
    }

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
      body: responseBody,
      latencyMs,
      contentType,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: 0,
        statusText: "Network Error",
        headers: {},
        body: { error: sanitizeErrorMessage(error) || "Request failed" },
        latencyMs: 0,
        contentType: "application/json",
      },
      { status: 200 } // Return 200 so the frontend can display the error
    );
  }
}
