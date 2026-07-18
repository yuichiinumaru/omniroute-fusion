import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";

import { classifyRoute } from "../../src/server/authz/classify.ts";
import {
  isAlwaysProtectedPath,
  isLocalOnlyPath,
} from "../../src/server/authz/routeGuard.ts";
import { isPublicApiRoute } from "../../src/shared/constants/publicApiRoutes.ts";
import { cloudCredentialUpdateSchema } from "../../src/shared/validation/schemas/cloud.ts";
import { createApiKey, deleteApiKey } from "../../src/lib/db/apiKeys.ts";

const originalJwtSecret = process.env.JWT_SECRET;
const originalApiKeySecret = process.env.API_KEY_SECRET;

async function createAuthCookie() {
  process.env.JWT_SECRET = "test-0049-privileged-handler-secret";
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT({ sub: "test-user-0049" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  return `auth_token=${token}`;
}

test.afterEach(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
  if (originalApiKeySecret === undefined) delete process.env.API_KEY_SECRET;
  else process.env.API_KEY_SECRET = originalApiKeySecret;
});

// ─── Public surface / classification (F-07-006) ─────────────────────────────

test("cloud credential update is MANAGEMENT; worker helpers stay PUBLIC (F-07-006)", () => {
  assert.equal(classifyRoute("/api/cloud/credentials/update", "PUT").routeClass, "MANAGEMENT");
  assert.equal(isPublicApiRoute("/api/cloud/credentials/update", "PUT"), false);
  assert.equal(isPublicApiRoute("/api/cloud/", "GET"), false);

  assert.equal(classifyRoute("/api/cloud/auth", "POST").routeClass, "PUBLIC");
  assert.equal(classifyRoute("/api/cloud/model/resolve", "POST").routeClass, "PUBLIC");
  assert.equal(classifyRoute("/api/cloud/models/alias", "GET").routeClass, "PUBLIC");
  assert.equal(isPublicApiRoute("/api/cloud/auth"), true);
  assert.equal(isPublicApiRoute("/api/cloud/model/resolve"), true);
  // Segment-safe: auth prefix must not swallow credentials or authorize
  assert.equal(isPublicApiRoute("/api/cloud/authorize"), false);
});

test("cloudCredentialUpdateSchema accepts optional connectionId", () => {
  const ok = cloudCredentialUpdateSchema.safeParse({
    provider: "openai",
    connectionId: "conn-1",
    credentials: { accessToken: "tok" },
  });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.connectionId, "conn-1");

  const missing = cloudCredentialUpdateSchema.safeParse({
    provider: "openai",
    credentials: {},
  });
  assert.equal(missing.success, false);
});

// ─── Route guard membership (F-07-007 / W2-004 / W2-005) ────────────────────

test("ALWAYS_PROTECTED: relay tokens, translator/send/history, sessions, cloud credentials, keys (0049)", () => {
  assert.equal(isAlwaysProtectedPath("/api/relay/tokens"), true);
  assert.equal(isAlwaysProtectedPath("/api/relay/tokens/abc"), true);
  assert.equal(isAlwaysProtectedPath("/api/translator/send"), true);
  assert.equal(isAlwaysProtectedPath("/api/translator/history"), true);
  assert.equal(isAlwaysProtectedPath("/api/sessions"), true);
  assert.equal(isAlwaysProtectedPath("/api/cloud/credentials"), true);
  assert.equal(isAlwaysProtectedPath("/api/cloud/credentials/update"), true);
  assert.equal(isAlwaysProtectedPath("/api/cli-tools/keys"), true);
});

test("LOCAL_ONLY: cli-tools/keys inventory is loopback-only (F-07-W2-005)", () => {
  assert.equal(isLocalOnlyPath("/api/cli-tools/keys"), true);
  assert.equal(isLocalOnlyPath("/api/cli-tools/keys/"), true);
  // sibling non-keys routes remain classification-independent here
  assert.equal(isLocalOnlyPath("/api/cli-tools/apply"), false);
});

// ─── Handler auth: cloud credentials (F-07-006) ─────────────────────────────

test("cloud credentials update rejects unauthenticated caller (always auth)", async () => {
  const route = await import("../../src/app/api/cloud/credentials/update/route.ts");
  const response = await route.PUT(
    new Request("http://localhost/api/cloud/credentials/update", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        credentials: { accessToken: "stolen" },
      }),
    })
  );
  assert.equal(response.status, 401);
});

test("cloud credentials update rejects inference key without manage scope", async () => {
  process.env.API_KEY_SECRET = "test-api-key-secret-0049";
  const created = await createApiKey("unscoped-0049", "machine-0049-unscoped", []);
  try {
    const route = await import("../../src/app/api/cloud/credentials/update/route.ts");
    const response = await route.PUT(
      new Request("http://localhost/api/cloud/credentials/update", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${created.key}`,
        },
        body: JSON.stringify({
          provider: "openai",
          credentials: { accessToken: "stolen" },
        }),
      })
    );
    assert.equal(response.status, 403);
    const body = await response.json();
    const msg = String(body?.error?.message ?? body?.error ?? "");
    assert.match(msg, /manage/i);
  } finally {
    await deleteApiKey(created.id);
  }
});

// ─── Handler auth: relay tokens (F-07-007) ───────────────────────────────────

test("relay tokens GET/POST without auth → 401 (always)", async () => {
  const route = await import("../../src/app/api/relay/tokens/route.ts");
  const getRes = await route.GET(new Request("http://localhost/api/relay/tokens"));
  assert.equal(getRes.status, 401);

  const postRes = await route.POST(
    new Request("http://localhost/api/relay/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "evil" }),
    })
  );
  assert.equal(postRes.status, 401);
});

test("relay tokens list/create never expose tokenHash; rawToken only on create", async () => {
  const cookie = await createAuthCookie();
  const route = await import("../../src/app/api/relay/tokens/route.ts");
  const idRoute = await import("../../src/app/api/relay/tokens/[id]/route.ts");

  const createRes = await route.POST(
    new Request("http://localhost/api/relay/tokens", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ name: "0049-relay-test" }),
    })
  );
  assert.equal(createRes.status, 200);
  const created = await createRes.json();
  assert.ok(typeof created.rawToken === "string" && created.rawToken.length > 0);
  assert.equal(created.tokenHash, undefined);
  assert.ok(!("tokenHash" in created));

  const listRes = await route.GET(
    new Request("http://localhost/api/relay/tokens", { headers: { cookie } })
  );
  assert.equal(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(Array.isArray(list));
  for (const item of list) {
    assert.equal(item.tokenHash, undefined);
    assert.ok(!("tokenHash" in item));
    assert.equal(item.rawToken, undefined);
  }

  const detailRes = await idRoute.GET(
    new Request(`http://localhost/api/relay/tokens/${created.id}`, {
      headers: { cookie },
    }),
    { params: Promise.resolve({ id: created.id }) }
  );
  assert.equal(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.equal(detail.tokenHash, undefined);
  assert.ok(!("tokenHash" in detail));
  assert.equal(detail.id, created.id);

  // cleanup
  await idRoute.DELETE(
    new Request(`http://localhost/api/relay/tokens/${created.id}`, {
      method: "DELETE",
      headers: { cookie },
    }),
    { params: Promise.resolve({ id: created.id }) }
  );
});

// ─── Handler auth: translator/send (F-07-W2-004) ────────────────────────────

test("translator/send without management auth → 401", async () => {
  const route = await import("../../src/app/api/translator/send/route.ts");
  const response = await route.POST(
    new Request("http://localhost/api/translator/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        body: { model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] },
      }),
    })
  );
  assert.equal(response.status, 401);
});

// ─── cli-tools/keys hash-only / no bulk raw (F-07-W2-005) ───────────────────

test("cli-tools/keys never returns rawKey or full plaintext after 0041", async () => {
  process.env.API_KEY_SECRET = "test-api-key-secret-0049";
  const created = await createApiKey("CLI Tools 0049", "machine-0049-cli", ["manage"]);
  try {
    const cookie = await createAuthCookie();
    const route = await import("../../src/app/api/cli-tools/keys/route.ts");
    const response = await route.GET(
      new Request("http://localhost/api/cli-tools/keys", {
        headers: { cookie },
      })
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    const key = payload.keys.find((entry: { id: string }) => entry.id === created.id);
    assert.ok(key, "created key should be present");
    assert.equal(key.rawKey, undefined);
    assert.ok(!("rawKey" in key));
    // display mask must not equal the one-time create secret
    assert.notEqual(key.key, created.key);
    if (typeof key.key === "string") {
      assert.match(key.key, /\*{2,}/);
    }
  } finally {
    await deleteApiKey(created.id);
  }
});

// ─── translator/history (0049 R1) ───────────────────────────────────────────

test("translator/history without management auth → 401 (always)", async () => {
  const route = await import("../../src/app/api/translator/history/route.ts");
  const response = await route.GET(new Request("http://localhost/api/translator/history"));
  assert.equal(response.status, 401);
});

// ─── sessions stretch (F-07-W2-006 + N3) ────────────────────────────────────

test("sessions GET without management auth → 401 (always / open-install safe)", async () => {
  const route = await import("../../src/app/api/sessions/route.ts");
  const response = await route.GET(new Request("http://localhost/api/sessions"));
  assert.equal(response.status, 401);
});

// ─── open-install matrix (N2): always:true handlers still 401 unauth ────────

test("open-install matrix: primary privileged handlers 401 without credentials", async () => {
  const cloud = await import("../../src/app/api/cloud/credentials/update/route.ts");
  const relay = await import("../../src/app/api/relay/tokens/route.ts");
  const send = await import("../../src/app/api/translator/send/route.ts");
  const history = await import("../../src/app/api/translator/history/route.ts");
  const keys = await import("../../src/app/api/cli-tools/keys/route.ts");
  const sessions = await import("../../src/app/api/sessions/route.ts");

  const unauth = (url: string, method = "GET", body?: string) =>
    new Request(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body,
    });

  assert.equal(
    (
      await cloud.PUT(
        unauth(
          "http://localhost/api/cloud/credentials/update",
          "PUT",
          JSON.stringify({ provider: "openai", credentials: { accessToken: "x" } })
        )
      )
    ).status,
    401
  );
  assert.equal((await relay.GET(unauth("http://localhost/api/relay/tokens"))).status, 401);
  assert.equal(
    (
      await send.POST(
        unauth(
          "http://localhost/api/translator/send",
          "POST",
          JSON.stringify({ provider: "openai", body: { model: "m", messages: [] } })
        )
      )
    ).status,
    401
  );
  assert.equal(
    (await history.GET(unauth("http://localhost/api/translator/history"))).status,
    401
  );
  assert.equal((await keys.GET(unauth("http://localhost/api/cli-tools/keys"))).status, 401);
  assert.equal((await sessions.GET(unauth("http://localhost/api/sessions"))).status, 401);
});

// ─── multi-conn connectionId binding (N1) ───────────────────────────────────

test("cloud credentials multi-conn without connectionId → 400; wrong id → 404", async () => {
  const providersDb = await import("../../src/lib/db/providers.ts");
  const cookie = await createAuthCookie();
  const provider = `openai-0049-multiconn-${Date.now()}`;

  const a = await providersDb.createProviderConnection({
    provider,
    authType: "apikey",
    name: "conn-a",
    isActive: true,
    apiKey: "sk-a",
  });
  const b = await providersDb.createProviderConnection({
    provider,
    authType: "apikey",
    name: "conn-b",
    isActive: true,
    apiKey: "sk-b",
  });

  try {
    const route = await import("../../src/app/api/cloud/credentials/update/route.ts");

    const ambiguous = await route.PUT(
      new Request("http://localhost/api/cloud/credentials/update", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          provider,
          credentials: { accessToken: "tok" },
        }),
      })
    );
    assert.equal(ambiguous.status, 400);
    const ambBody = await ambiguous.json();
    assert.match(String(ambBody?.error ?? ""), /connectionId|Multiple/i);

    const wrong = await route.PUT(
      new Request("http://localhost/api/cloud/credentials/update", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          provider,
          connectionId: "does-not-exist-0049",
          credentials: { accessToken: "tok" },
        }),
      })
    );
    assert.equal(wrong.status, 404);

    const ok = await route.PUT(
      new Request("http://localhost/api/cloud/credentials/update", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          provider,
          connectionId: a.id,
          credentials: { accessToken: "tok-ok" },
        }),
      })
    );
    assert.equal(ok.status, 200);
    const okBody = await ok.json();
    assert.equal(okBody.success, true);
    assert.equal(okBody.connectionId, a.id);
  } finally {
    await providersDb.deleteProviderConnectionsByProvider(provider);
  }
});
