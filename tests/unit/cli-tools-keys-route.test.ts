import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";

const keysRoute = await import("../../src/app/api/keys/route.ts");
const cliToolsKeysRoute = await import("../../src/app/api/cli-tools/keys/route.ts");
const { createApiKey, deleteApiKey } = await import("../../src/lib/db/apiKeys.ts");

const originalJwtSecret = process.env.JWT_SECRET;
const originalApiKeySecret = process.env.API_KEY_SECRET;

async function createAuthCookie() {
  process.env.JWT_SECRET = "test-cli-tools-keys-secret";
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT({ sub: "test-user" })
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

test("CLI tools key list is hash-only — no bulk rawKey for authenticated consumers (0041/0049)", async () => {
  process.env.API_KEY_SECRET = "test-api-key-secret";
  const created = await createApiKey("CLI Tools Test Key", "test-machine-cli-tools");

  try {
    const cookie = await createAuthCookie();
    const request = new Request("http://localhost/api/cli-tools/keys", {
      headers: {
        cookie,
      },
    });

    const response = await cliToolsKeysRoute.GET(request);
    assert.equal(response.status, 200);
    const payload = await response.json();
    const key = payload.keys.find((entry) => entry.id === created.id);

    assert.ok(key, "created key should be present");
    // Never re-export full secret after hash-only migration (Task 0041 / F-07-W2-005).
    assert.equal(key.rawKey, undefined);
    assert.ok(!("rawKey" in key));
    assert.notEqual(key.key, created.key);
    if (typeof key.key === "string") {
      assert.match(key.key, /\*{2,}/);
    }
  } finally {
    await deleteApiKey(created.id);
  }
});

test("general keys route stays masked for non-CLI consumers", async () => {
  process.env.API_KEY_SECRET = "test-api-key-secret";
  const created = await createApiKey("Masked Key Test", "test-machine-masked");

  try {
    const cookie = await createAuthCookie();
    const request = new Request("http://localhost/api/keys", {
      headers: { cookie },
    });

    const response = await keysRoute.GET(request);
    assert.equal(response.status, 200);
    const payload = await response.json();
    const key = payload.keys.find((entry) => entry.id === created.id);

    assert.ok(key, "created key should be present");
    // Hash-only list: never equals the one-time create secret; mask or null only.
    assert.notEqual(key.key, created.key);
    if (typeof key.key === "string") {
      assert.match(key.key, /\*{2,}/);
    } else {
      assert.equal(key.key, null);
    }
  } finally {
    await deleteApiKey(created.id);
  }
});
