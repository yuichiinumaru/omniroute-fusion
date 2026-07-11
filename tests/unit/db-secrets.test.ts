import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-db-secrets-"));
process.env.DATA_DIR = TEST_DATA_DIR;
const ORIGINAL_STORAGE_KEY = process.env.STORAGE_ENCRYPTION_KEY;
delete process.env.STORAGE_ENCRYPTION_KEY;

const core = await import("../../src/lib/db/core.ts");
const secretsDb = await import("../../src/lib/db/secrets.ts");

async function resetStorage() {
  core.resetDbInstance();

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
      }
      break;
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string }).code
          : undefined;
      if ((code === "EBUSY" || code === "EPERM") && attempt < 9) {
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }

  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

test.beforeEach(async () => {
  delete process.env.STORAGE_ENCRYPTION_KEY;
  await resetStorage();
});

test.after(async () => {
  core.resetDbInstance();
  if (ORIGINAL_STORAGE_KEY === undefined) {
    delete process.env.STORAGE_ENCRYPTION_KEY;
  } else {
    process.env.STORAGE_ENCRYPTION_KEY = ORIGINAL_STORAGE_KEY;
  }
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("getPersistedSecret returns null for missing keys", () => {
  assert.equal(secretsDb.getPersistedSecret("missing"), null);
});

test("persistSecret stores and reads secrets from the key_value table", () => {
  secretsDb.persistSecret("oauth_token", "secret-value");

  assert.equal(secretsDb.getPersistedSecret("oauth_token"), "secret-value");
});

test("persistSecret replaces an existing secret (rotation / upsert)", () => {
  secretsDb.persistSecret("api_token", "first-value");
  secretsDb.persistSecret("api_token", "second-value");

  assert.equal(secretsDb.getPersistedSecret("api_token"), "second-value");
});

test("malformed persisted rows are treated as missing secrets", () => {
  const db = core.getDbInstance();
  db.prepare("INSERT INTO key_value (namespace, key, value) VALUES (?, ?, ?)").run(
    "secrets",
    "broken",
    "not-json"
  );

  assert.equal(secretsDb.getPersistedSecret("broken"), null);
});

test("with STORAGE_ENCRYPTION_KEY, persistSecret stores enc:v1 ciphertext at rest", () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-0041-secrets-encrypt-key";

  secretsDb.persistSecret("jwtSecret", "super-secret-jwt-material");

  const db = core.getDbInstance();
  const row = db
    .prepare("SELECT value FROM key_value WHERE namespace = 'secrets' AND key = ?")
    .get("jwtSecret") as { value?: string } | undefined;

  assert.ok(row?.value);
  const parsed = JSON.parse(row!.value!);
  assert.equal(typeof parsed, "string");
  assert.match(parsed, /^enc:v1:/);
  assert.equal(row!.value!.includes("super-secret-jwt-material"), false);

  assert.equal(secretsDb.getPersistedSecret("jwtSecret"), "super-secret-jwt-material");
});

test("with STORAGE_ENCRYPTION_KEY, second persistSecret rotates ciphertext", () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-0041-secrets-rotate-key";

  secretsDb.persistSecret("apiKeySecret", "first-signing-secret");
  secretsDb.persistSecret("apiKeySecret", "rotated-signing-secret");

  assert.equal(secretsDb.getPersistedSecret("apiKeySecret"), "rotated-signing-secret");

  const db = core.getDbInstance();
  const row = db
    .prepare("SELECT value FROM key_value WHERE namespace = 'secrets' AND key = ?")
    .get("apiKeySecret") as { value?: string } | undefined;
  assert.ok(row?.value);
  assert.equal(row!.value!.includes("first-signing-secret"), false);
  assert.equal(row!.value!.includes("rotated-signing-secret"), false);
  assert.match(JSON.parse(row!.value!), /^enc:v1:/);
});

test("migratePlaintextSecretsToEncrypted rewrites legacy plaintext rows", () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-0041-secrets-migrate-key";

  const db = core.getDbInstance();
  // Seed legacy plaintext secret (pre-0041 shape)
  db.prepare("INSERT INTO key_value (namespace, key, value) VALUES (?, ?, ?)").run(
    "secrets",
    "jwtSecret",
    JSON.stringify("legacy-plaintext-jwt")
  );

  const n = secretsDb.migratePlaintextSecretsToEncrypted();
  assert.ok(n >= 1);

  const row = db
    .prepare("SELECT value FROM key_value WHERE namespace = 'secrets' AND key = ?")
    .get("jwtSecret") as { value?: string } | undefined;
  assert.ok(row?.value);
  assert.match(JSON.parse(row!.value!), /^enc:v1:/);
  assert.equal(row!.value!.includes("legacy-plaintext-jwt"), false);
  assert.equal(secretsDb.getPersistedSecret("jwtSecret"), "legacy-plaintext-jwt");
});
