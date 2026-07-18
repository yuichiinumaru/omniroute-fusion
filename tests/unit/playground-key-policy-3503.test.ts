/**
 * #3503 — dashboard playground key-by-id policy resolution (hash-only F-05-002).
 *
 * The playground sends only the API key *id* (never the secret) via
 * `x-omniroute-playground-key-id`; the gateway loads **metadata by id** and
 * applies that key's policy. SECURITY INVARIANT: this is honored ONLY for an
 * authenticated dashboard session — the header alone must never resolve a key,
 * so it can't be abused by an unauthenticated caller to apply (or probe) a key's
 * policy.
 *
 * After hash-only storage the secret is never reconstituted from the DB
 * (Task 0041 R1). Policy application uses `getApiKeyMetadataById` only.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SignJWT } from "jose";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omr-playground-key-3503-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || "playground-3503-api-secret";
process.env.JWT_SECRET = "playground-3503-jwt-secret";

const apiKeysDb = await import("../../src/lib/db/apiKeys.ts");
const {
  resolvePlaygroundKeyMetadata,
  resolvePlaygroundTestKey,
  enforceApiKeyPolicy,
} = await import("../../src/shared/utils/apiKeyPolicy.ts");

const PLAYGROUND_KEY_ID_HEADER = "x-omniroute-playground-key-id";

const created = await apiKeysDb.createApiKey("playground-3503", "machine-3503", []);
const KEY_ID = created.id;
// Restrict the key so policy enforcement is observable without secret rehydration.
await apiKeysDb.updateApiKeyPermissions(KEY_ID, { allowedModels: ["gpt-4o-mini"] });

async function sessionCookie(): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const jwt = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);
  return `auth_token=${jwt}`;
}

function req(headers: Record<string, string>) {
  return {
    method: "POST",
    headers: new Headers(headers),
    url: "http://localhost/api/v1/chat/completions",
  } as unknown as Request;
}

test.after(() => {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("#3503 — authenticated session + key-id header loads policy metadata (no secret)", async () => {
  const meta = await resolvePlaygroundKeyMetadata(
    req({ [PLAYGROUND_KEY_ID_HEADER]: KEY_ID, cookie: await sessionCookie() })
  );
  assert.ok(meta, "authenticated session should load key metadata by id");
  assert.equal(meta.id, KEY_ID);
  assert.equal(meta.name, "playground-3503");
  assert.deepEqual(meta.allowedModels, ["gpt-4o-mini"]);
});

test("#3503 — hash-only: secret is never reconstituted by id", async () => {
  // Deprecated secret-rehydrate helper must fail closed.
  const secret = await resolvePlaygroundTestKey(
    req({ [PLAYGROUND_KEY_ID_HEADER]: KEY_ID, cookie: await sessionCookie() })
  );
  assert.equal(secret, null, "resolvePlaygroundTestKey must not return secrets after hash-only");

  const listed = await apiKeysDb.getApiKeyById(KEY_ID);
  assert.equal(listed?.key, null, "getApiKeyById must strip stored key material");
});

test("#3503 — enforceApiKeyPolicy applies id-selected model restriction", async () => {
  const denied = await enforceApiKeyPolicy(
    req({ [PLAYGROUND_KEY_ID_HEADER]: KEY_ID, cookie: await sessionCookie() }),
    "gpt-4o"
  );
  assert.equal(denied.apiKey, null, "playground path has no bearer secret");
  assert.equal(denied.apiKeyInfo?.id, KEY_ID);
  assert.ok(denied.rejection, "disallowed model must be rejected via policy-by-id");
  assert.equal(denied.rejection.status, 403);

  const allowed = await enforceApiKeyPolicy(
    req({ [PLAYGROUND_KEY_ID_HEADER]: KEY_ID, cookie: await sessionCookie() }),
    "gpt-4o-mini"
  );
  assert.equal(allowed.apiKeyInfo?.id, KEY_ID);
  assert.equal(allowed.rejection, null, "allowed model must pass policy-by-id");
});

test("#3503 — SECURITY: the key-id header is IGNORED without an authenticated session", async () => {
  const meta = await resolvePlaygroundKeyMetadata(req({ [PLAYGROUND_KEY_ID_HEADER]: KEY_ID }));
  assert.equal(meta, null, "an unauthenticated request must never resolve a key by id");

  const policy = await enforceApiKeyPolicy(req({ [PLAYGROUND_KEY_ID_HEADER]: KEY_ID }), "gpt-4o");
  assert.equal(policy.apiKeyInfo, null);
  assert.equal(policy.rejection, null, "without session, playground id is ignored (local mode)");
});

test("#3503 — SECURITY: an invalid session token is rejected", async () => {
  const meta = await resolvePlaygroundKeyMetadata(
    req({ [PLAYGROUND_KEY_ID_HEADER]: KEY_ID, cookie: "auth_token=not-a-valid-jwt" })
  );
  assert.equal(meta, null, "a forged/invalid session token must not resolve a key");
});

test("#3503 — no key-id header → null even with a valid session", async () => {
  const meta = await resolvePlaygroundKeyMetadata(req({ cookie: await sessionCookie() }));
  assert.equal(meta, null);
});
