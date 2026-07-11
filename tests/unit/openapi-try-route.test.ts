import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SignJWT } from "jose";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-openapi-try-route-"));
const ORIGINAL_DATA_DIR = process.env.DATA_DIR;
const ORIGINAL_INITIAL_PASSWORD = process.env.INITIAL_PASSWORD;
const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

process.env.DATA_DIR = TEST_DATA_DIR;
process.env.INITIAL_PASSWORD = "openapi-try-password";
process.env.JWT_SECRET = "openapi-try-jwt-secret";

const core = await import("../../src/lib/db/core.ts");
const route = await import("../../src/app/api/openapi/try/route.ts");

const originalFetch = globalThis.fetch;

async function resetStorage() {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

async function createAuthCookie() {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);
  return `auth_token=${token}`;
}

function makeRequest(body: unknown, cookie?: string) {
  return new Request("http://localhost/api/openapi/try", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

test.beforeEach(async () => {
  await resetStorage();
  globalThis.fetch = originalFetch;
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test.after(() => {
  globalThis.fetch = originalFetch;
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });

  if (ORIGINAL_DATA_DIR === undefined) {
    delete process.env.DATA_DIR;
  } else {
    process.env.DATA_DIR = ORIGINAL_DATA_DIR;
  }
  if (ORIGINAL_INITIAL_PASSWORD === undefined) {
    delete process.env.INITIAL_PASSWORD;
  } else {
    process.env.INITIAL_PASSWORD = ORIGINAL_INITIAL_PASSWORD;
  }
  if (ORIGINAL_JWT_SECRET === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  }
});

test("openapi try route requires management authentication before proxying", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("unexpected");
  };

  const response = await route.POST(
    makeRequest({
      method: "GET",
      path: "/api/v1/models",
    }) as any
  );
  const body = (await response.json()) as any;

  assert.equal(response.status, 401);
  assert.equal(body.error.message, "Authentication required");
  assert.equal(fetchCalled, false);
});

test("openapi try route rejects protocol-relative targets after authentication", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("unexpected");
  };

  const response = await route.POST(
    makeRequest(
      {
        method: "GET",
        path: "//evil.example/api",
      },
      await createAuthCookie()
    ) as any
  );
  const body = (await response.json()) as any;

  assert.equal(response.status, 400);
  assert.equal(body.error.message, "Invalid request");
  assert.equal(fetchCalled, false);
});

test("openapi try route rejects bare /api/ management paths (allowlist tightened, F-07-001)", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("unexpected");
  };

  const response = await route.POST(
    makeRequest(
      {
        method: "GET",
        path: "/api/combos/test",
      },
      await createAuthCookie()
    ) as any
  );
  const body = (await response.json()) as any;

  assert.equal(response.status, 400);
  assert.equal(body.error.message, "Invalid request");
  assert.equal(fetchCalled, false);
});

test("openapi try route denies LOCAL_ONLY / SPAWN_CAPABLE destinations without fetch or cookie forward (F-07-001)", async () => {
  const cookie = await createAuthCookie();
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("unexpected");
  };

  // Even with a valid management session, try-proxy must refuse spawn surfaces.
  // Bare `/api/` is already rejected by the allowlist; the denylist is
  // defence-in-depth for any future allowlist slip (tested via helpers below).
  for (const path of [
    "/api/services/cliproxy/install",
    "/api/cli-tools/runtime/claude",
    "/api/version-manager/install",
    "/api/middleware/hooks",
  ]) {
    const response = await route.POST(
      makeRequest({ method: "POST", path, body: {} }, cookie) as any
    );
    const body = (await response.json()) as { error?: unknown };
    // Allowlist rejects bare /api/* first (400). Either 400 or 403 is fail-closed.
    assert.ok(
      response.status === 400 || response.status === 403,
      `expected fail-closed for ${path}, got ${response.status}`
    );
    assert.equal(fetchCalled, false, `must not fetch for denied path ${path}`);
    // Fail-closed response carries an error; fetch never ran → cookies not forwarded.
    assert.ok(body.error, `expected error body for denied path ${path}`);
  }
});

test("isDeniedTryProxyPath flags LOCAL_ONLY and SPAWN_CAPABLE paths (F-07-001)", () => {
  assert.equal(route.isDeniedTryProxyPath("/api/services/cliproxy/install", "POST"), true);
  assert.equal(route.isDeniedTryProxyPath("/api/cli-tools/runtime/claude", "POST"), true);
  assert.equal(route.isDeniedTryProxyPath("/api/version-manager/start", "POST"), true);
  assert.equal(route.isDeniedTryProxyPath("/api/middleware/hooks", "POST"), true);
  assert.equal(route.isDeniedTryProxyPath("/api/restart", "POST"), true);
  assert.equal(route.isDeniedTryProxyPath("/api/v1/models", "GET"), false);
  assert.equal(route.isDeniedTryProxyPath("/v1/chat/completions", "POST"), false);
});

test("openapi try route strips hop-by-hop headers and proxies same-origin client API paths", async () => {
  const cookie = await createAuthCookie();
  let fetchUrl = "";
  let fetchInit: RequestInit | undefined;
  globalThis.fetch = async (url, init) => {
    fetchUrl = String(url);
    fetchInit = init;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const response = await route.POST(
    makeRequest(
      {
        method: "POST",
        path: "/api/v1/chat/completions",
        headers: {
          Authorization: "Bearer test-key",
          Host: "evil.example",
          "X-Forwarded-Proto": "https",
        },
        body: { model: "test", messages: [] },
      },
      cookie
    ) as any
  );
  const body = (await response.json()) as any;
  const forwardedHeaders = fetchInit?.headers as Record<string, string>;

  assert.equal(response.status, 200);
  assert.equal(body.status, 200);
  assert.equal(fetchUrl, "http://localhost/api/v1/chat/completions");
  assert.equal(fetchInit?.method, "POST");
  assert.equal(forwardedHeaders.Authorization, "Bearer test-key");
  assert.equal(forwardedHeaders.Host, undefined);
  assert.equal(forwardedHeaders["X-Forwarded-Proto"], undefined);
  assert.equal(forwardedHeaders.Cookie, cookie);
});
