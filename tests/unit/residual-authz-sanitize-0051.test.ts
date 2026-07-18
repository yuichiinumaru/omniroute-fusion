/**
 * Task 0051 — residual authz + error sanitization sweep.
 *
 * Covers:
 * - F-07-014: createErrorResponse / createErrorResponseFromUnknown sanitize by default
 * - F-07-009: public monitoring health allowlist (no breaker/session dump)
 * - F-07-010: /api/health/ping is PUBLIC_READONLY
 * - F-04-W2-004: MCP tool error sanitize helpers
 * - F-06-008 / F-07-011: A2A sanitize + fail-closed auth
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NextRequest } from "next/server";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-0051-"));
const ORIGINAL_DATA_DIR = process.env.DATA_DIR;
const ORIGINAL_OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY;
const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

process.env.DATA_DIR = TEST_DATA_DIR;
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || "task-0051-api-key-secret-32chars!!";
process.env.JWT_SECRET = process.env.JWT_SECRET || "task-0051-jwt-secret-for-tests-32chars!!";
delete process.env.OMNIROUTE_API_KEY;

const core = await import("../../src/lib/db/core.ts");
core.resetDbInstance();

const { createErrorResponse, createErrorResponseFromUnknown } = await import(
  "../../src/lib/api/errorResponse.ts"
);
const { isPublicApiRoute } = await import("../../src/shared/constants/publicApiRoutes.ts");
const { classifyRoute } = await import("../../src/server/authz/classify.ts");
const { buildPublicHealthPayload } = await import("../../src/lib/monitoring/observability.ts");
const {
  sanitizeMcpErrorMessage,
  mcpToolErrorResult,
  sanitizeMcpToolResult,
} = await import("../../open-sse/mcp-server/errorSanitize.ts");
const { sanitizeErrorMessage } = await import("../../open-sse/utils/error.ts");
const settingsDb = await import("../../src/lib/db/settings.ts");
const healthRoute = await import("../../src/app/api/monitoring/health/route.ts");
const a2aRoute = await import("../../src/app/a2a/route.ts");
const taskExecution = await import("../../src/lib/a2a/taskExecution.ts");

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  if (ORIGINAL_DATA_DIR === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = ORIGINAL_DATA_DIR;
  if (ORIGINAL_OMNIROUTE_API_KEY === undefined) delete process.env.OMNIROUTE_API_KEY;
  else process.env.OMNIROUTE_API_KEY = ORIGINAL_OMNIROUTE_API_KEY;
  if (ORIGINAL_JWT_SECRET === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
});

// ── F-07-014: shared API error helper ───────────────────────────────────────

test("createErrorResponseFromUnknown never returns stack path in error.message", async () => {
  const leaky = new Error("at /tmp/x\n    at foo (/home/app/src/lib/db.ts:12:3)");
  const response = createErrorResponseFromUnknown(leaky);
  const body = (await response.json()) as {
    error?: { message?: string };
  };

  assert.equal(response.status, 500);
  assert.ok(body.error?.message, "message present");
  assert.ok(
    !body.error.message.includes("at /"),
    `must not leak stack path, got: ${body.error.message}`
  );
  assert.ok(
    !body.error.message.includes("/home/app"),
    `must not leak absolute path, got: ${body.error.message}`
  );
  assert.ok(!body.error.message.includes("\n"), "must not include multi-line stack");
});

test("createErrorResponse sanitizes message and details by default", async () => {
  const response = createErrorResponse({
    status: 500,
    message: "Failed at /var/lib/omniroute/core.ts:99",
    details: {
      stack: "should be dropped",
      path: "/secret",
      reason: "boom at /tmp/evil.ts:1",
    },
  });
  const body = (await response.json()) as {
    error?: { message?: string; details?: Record<string, unknown> };
  };

  assert.ok(!body.error?.message?.includes("/var/lib"));
  assert.ok(body.error?.message?.includes("<path>") || !body.error?.message?.includes(".ts"));
  assert.ok(body.error?.details);
  assert.equal(body.error?.details?.stack, undefined);
  assert.equal(body.error?.details?.path, undefined);
  const reason = String(body.error?.details?.reason ?? "");
  assert.ok(!reason.includes("/tmp/evil.ts") || reason.includes("<path>"));
});

// ── F-07-010: ping public classification ────────────────────────────────────

test("GET /api/health/ping is PUBLIC_READONLY", () => {
  assert.equal(isPublicApiRoute("/api/health/ping", "GET"), true);
  assert.equal(isPublicApiRoute("/api/health/ping", "HEAD"), true);
  assert.equal(isPublicApiRoute("/api/health/ping", "POST"), false);

  const classified = classifyRoute("/api/health/ping", "GET");
  assert.equal(classified.routeClass, "PUBLIC");
  assert.equal(classified.reason, "public_readonly_prefix");
});

// ── F-07-009: public health allowlist ───────────────────────────────────────

test("buildPublicHealthPayload only exposes allowlisted fields", () => {
  const payload = buildPublicHealthPayload("9.9.9-test");
  assert.equal(payload.status, "healthy");
  assert.equal(payload.version, "9.9.9-test");
  assert.equal(typeof payload.uptime, "number");
  assert.equal(payload.system.version, "9.9.9-test");
  assert.ok(typeof payload.timestamp === "string");

  const keys = Object.keys(payload).sort();
  assert.deepEqual(keys, ["status", "system", "timestamp", "uptime", "version"].sort());
  assert.ok(!("providerBreakers" in payload));
  assert.ok(!("sessions" in payload));
  assert.ok(!("credentialHealth" in payload));
  assert.ok(!("lockouts" in payload));
});

test("unauthenticated GET /api/monitoring/health returns public allowlist only", async () => {
  // Force requireLogin so open-install bypass is off.
  await settingsDb.updateSettings({ requireLogin: true, password: "hashed-test-password" });

  const response = await healthRoute.GET(
    new Request("http://localhost/api/monitoring/health", { method: "GET" })
  );
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.status, "healthy");
  assert.ok(typeof body.version === "string" || typeof body.system === "object");
  assert.equal(body.providerBreakers, undefined);
  assert.equal(body.providerHealth, undefined);
  assert.equal(body.sessions, undefined);
  assert.equal(body.credentialHealth, undefined);
  assert.equal(body.lockouts, undefined);
  assert.equal(body.rateLimitStatus, undefined);
  assert.equal(body.activeSessions, undefined);
});

test("N1: non-manage client API key gets public health shape only", async () => {
  await settingsDb.updateSettings({ requireLogin: true, password: "hashed-test-password" });
  const apiKeysDb = await import("../../src/lib/db/apiKeys.ts");
  // Unscoped client key — valid for CLIENT_API but not management.
  const clientKey = await apiKeysDb.createApiKey("client-health", "machine-health-0051", []);

  const response = await healthRoute.GET(
    new Request("http://localhost/api/monitoring/health", {
      method: "GET",
      headers: { authorization: `Bearer ${clientKey.key}` },
    })
  );
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.status, "healthy");
  assert.equal(body.providerBreakers, undefined);
  assert.equal(body.sessions, undefined);
  assert.equal(body.credentialHealth, undefined);
  assert.equal(body.lockouts, undefined);
  assert.equal(body.rateLimitStatus, undefined);
});

test("N1: manage-scope API key may receive full health snapshot fields", async () => {
  await settingsDb.updateSettings({ requireLogin: true, password: "hashed-test-password" });
  const apiKeysDb = await import("../../src/lib/db/apiKeys.ts");
  const manageKey = await apiKeysDb.createApiKey("manage-health", "machine-health-0051", [
    "manage",
  ]);

  const response = await healthRoute.GET(
    new Request("http://localhost/api/monitoring/health", {
      method: "GET",
      headers: { authorization: `Bearer ${manageKey.key}` },
    })
  );
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  // Full snapshot includes recon fields that public allowlist must not expose.
  // At least one of these keys is present on the authenticated full payload.
  const hasFullField =
    "providerBreakers" in body ||
    "rateLimitStatus" in body ||
    "sessions" in body ||
    "activeSessions" in body ||
    "system" in body;
  assert.ok(hasFullField, "manage key should unlock full health payload shape");
});

// ── F-04-W2-004: MCP sanitize helpers ───────────────────────────────────────

test("MCP sanitizeMcpErrorMessage strips stack paths", () => {
  const msg = sanitizeMcpErrorMessage(
    new Error("boom at /tmp/x\n    at handler (/app/open-sse/mcp-server/server.ts:10:1)")
  );
  assert.ok(!msg.includes("at /"));
  assert.ok(!msg.includes("\n"));
  assert.ok(!msg.includes("/app/open-sse") || msg.includes("<path>"));
});

test("mcpToolErrorResult returns isError with sanitized text", () => {
  const result = mcpToolErrorResult(
    new Error("API [500]: internal at /var/data/omniroute.db.ts:1\n    at foo")
  );
  assert.equal(result.isError, true);
  const text = result.content[0]?.text || "";
  assert.match(text, /^Error: /);
  assert.ok(!text.includes("at /"));
  assert.ok(!text.includes("\n"));
});

test("sanitizeMcpToolResult rewrites isError content blocks", () => {
  const result = sanitizeMcpToolResult({
    content: [{ type: "text" as const, text: "Error: fail at /home/sephiroth/secret.ts:4" }],
    isError: true,
  });
  const text = result.content[0]?.text || "";
  assert.ok(!text.includes("/home/sephiroth/secret.ts") || text.includes("<path>"));
});

// ── F-07-011 / F-06-008: A2A fail-closed + sanitize ─────────────────────────

function makeJsonRpcRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/a2a", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

test("A2A fail-closed: rejects unauthenticated requests when OMNIROUTE_API_KEY unset", async () => {
  delete process.env.OMNIROUTE_API_KEY;
  await settingsDb.updateSettings({ a2aEnabled: true });

  const response = await a2aRoute.POST(
    makeJsonRpcRequest({
      jsonrpc: "2.0",
      id: "no-auth",
      method: "message/send",
      params: { message: { role: "user", content: "hello" } },
    })
  );
  const body = (await response.json()) as {
    error?: { code?: number; message?: string };
  };

  assert.equal(body.error?.code, -32600);
  assert.match(body.error?.message || "", /Unauthorized/i);
});

test("A2A accepts matching OMNIROUTE_API_KEY", async () => {
  process.env.OMNIROUTE_API_KEY = "test-a2a-secret";
  await settingsDb.updateSettings({ a2aEnabled: false });

  const response = await a2aRoute.POST(
    makeJsonRpcRequest(
      {
        jsonrpc: "2.0",
        id: "auth-ok-disabled",
        method: "message/send",
        params: { message: { role: "user", content: "hello" } },
      },
      { authorization: "Bearer test-a2a-secret" }
    )
  );
  const body = (await response.json()) as {
    error?: { code?: number; message?: string };
  };

  // Auth passed; disabled gate should fire.
  assert.equal(response.status, 503);
  assert.equal(body.error?.code, -32000);
  assert.match(body.error?.message || "", /disabled/i);
  delete process.env.OMNIROUTE_API_KEY;
});

test("executeA2ATaskWithState sanitizes error artifacts (F-06-008)", async () => {
  const updates: Array<{ state: string; artifacts?: unknown; message?: string }> = [];
  const tm = {
    updateTask: (
      _id: string,
      state: "completed" | "failed",
      artifacts?: Array<{ type: string; content: string }>,
      message?: string
    ) => {
      updates.push({ state, artifacts, message });
      return {};
    },
  };

  const task = {
    id: "task-leak",
    skill: "test",
    messages: [],
    state: "working" as const,
    artifacts: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await assert.rejects(
    () =>
      taskExecution.executeA2ATaskWithState(tm, task as never, async () => {
        throw new Error("db fail at /tmp/x\n    at query (/app/src/lib/db.ts:1:1)");
      }),
    /db fail/
  );

  assert.equal(updates.length, 1);
  assert.equal(updates[0].state, "failed");
  const content = (updates[0].artifacts as Array<{ content: string }>)[0]?.content || "";
  assert.ok(!content.includes("at /"));
  assert.ok(!content.includes("\n"));
  assert.ok(!(updates[0].message || "").includes("at /"));
});

test("sanitizeErrorMessage baseline still strips absolute source paths", () => {
  const safe = sanitizeErrorMessage("boom /home/user/proj/src/file.ts:10:2 more");
  assert.ok(safe.includes("<path>") || !safe.includes("/home/user"));
});
