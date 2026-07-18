import test from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ORIGINAL_STORAGE_KEY = process.env.STORAGE_ENCRYPTION_KEY;

async function importFresh(modulePath) {
  const url = pathToFileURL(path.resolve(modulePath)).href;
  return import(`${url}?test=${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function encryptWithLegacyDynamicSalt(secret: string, plaintext: string): string {
  const key = scryptSync(secret, createHash("sha256").update(secret).digest().slice(0, 16), 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `enc:v1:${iv.toString("hex")}:${encrypted}:${authTag}`;
}

test.after(() => {
  if (ORIGINAL_STORAGE_KEY === undefined) {
    delete process.env.STORAGE_ENCRYPTION_KEY;
  } else {
    process.env.STORAGE_ENCRYPTION_KEY = ORIGINAL_STORAGE_KEY;
  }
});

test("encryption stays in passthrough mode when no storage key is configured", async () => {
  delete process.env.STORAGE_ENCRYPTION_KEY;
  const encryption = await importFresh("src/lib/db/encryption.ts");

  assert.equal(encryption.isEncryptionEnabled(), false);
  assert.equal(encryption.encrypt("plain-text"), "plain-text");
  assert.equal(encryption.decrypt("plain-text"), "plain-text");
  assert.equal(encryption.encrypt(""), "");
  assert.equal(encryption.decrypt(null), null);
  assert.equal(encryption.decrypt(undefined), undefined);
  assert.equal("validateEncryptionConfig" in encryption, false);
});

test("encrypt/decrypt round-trip uses the expected serialized format", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-304-secret-a";
  const encryption = await importFresh("src/lib/db/encryption.ts");

  const encrypted = encryption.encrypt("hello world");
  const decrypted = encryption.decrypt(encrypted);

  assert.equal(encryption.isEncryptionEnabled(), true);
  assert.match(encrypted, /^enc:v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
  assert.equal(decrypted, "hello world");
  assert.equal(encryption.encrypt(encrypted), encrypted);
});

test("encrypt never returns plaintext when STORAGE_ENCRYPTION_KEY is configured (N4 fail-closed)", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-0041-n4-fail-closed";
  const encryption = await importFresh("src/lib/db/encryption.ts");

  const samples = ["must-not-be-plaintext", "sk-live-abc", "cookie=session"];
  for (const plain of samples) {
    const out = encryption.encrypt(plain);
    assert.notEqual(out, plain, `encrypt must not pass through plaintext for ${plain}`);
    assert.match(out, /^enc:v1:/);
  }

  const psd = encryption.encryptProviderSpecificData({
    cookie: "session=abc",
    token: "tok",
    workspaceId: "ws-ok",
  });
  assert.match(psd.cookie, /^enc:v1:/);
  assert.match(psd.token, /^enc:v1:/);
  assert.equal(psd.workspaceId, "ws-ok");

  const conn = encryption.encryptConnectionFields({
    apiKey: "sk-conn",
    accessToken: "at",
    refreshToken: "rt",
    idToken: "idt",
  });
  assert.match(conn.apiKey, /^enc:v1:/);
  assert.match(conn.accessToken, /^enc:v1:/);
  assert.match(conn.refreshToken, /^enc:v1:/);
  assert.match(conn.idToken, /^enc:v1:/);
});

test("PSD_SECRET_KEYS is the SSOT shared with response redaction inventory", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-0041-ssot";
  const encryption = await importFresh("src/lib/db/encryption.ts");
  const { PSD_SECRET_KEYS: sharedKeys } = await import(
    "../../src/shared/constants/psdSecretKeys.ts"
  );

  assert.deepEqual(
    [...encryption.PSD_SECRET_KEYS],
    [...sharedKeys],
    "encryption.PSD_SECRET_KEYS must re-export shared SSOT"
  );
});

test("decrypt rejects a truncated GCM authentication tag (authTagLength pinned to 16 bytes)", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-304-secret-authtag";
  const encryption = await importFresh("src/lib/db/encryption.ts");

  const encrypted = encryption.encrypt("forge-me");
  assert.equal(encryption.decrypt(encrypted), "forge-me");

  // Truncate the trailing auth tag to 1 byte (2 hex chars). With authTagLength
  // pinned to 16 bytes on createDecipheriv, Node rejects the short tag instead
  // of verifying a weakened tag, so decrypt must fail closed (null).
  const [prefix, version, ivHex, encryptedHex] = encrypted.split(":");
  const truncated = `${prefix}:${version}:${ivHex}:${encryptedHex}:ab`;
  assert.equal(encryption.decrypt(truncated), null);
});

test("connection field helpers encrypt and decrypt all supported credential fields", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-304-secret-b";
  const encryption = await importFresh("src/lib/db/encryption.ts");

  const connection = {
    apiKey: "sk-123",
    accessToken: "access-123",
    refreshToken: "refresh-123",
    idToken: "id-123",
    untouched: "keep-me",
  };

  const encrypted = encryption.encryptConnectionFields({ ...connection });
  const decrypted = encryption.decryptConnectionFields(encrypted);

  assert.notEqual(encrypted.apiKey, connection.apiKey);
  assert.match(encrypted.apiKey, /^enc:v1:/);
  assert.match(encrypted.accessToken, /^enc:v1:/);
  assert.match(encrypted.refreshToken, /^enc:v1:/);
  assert.match(encrypted.idToken, /^enc:v1:/);
  assert.deepEqual(decrypted, connection);
});

test("PSD credential keys encrypt on write and decrypt on read (F-05-003)", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-0041-psd-secret";
  const encryption = await importFresh("src/lib/db/encryption.ts");

  const psd = {
    cookie: "session=abc; path=/",
    token: "web-session-token",
    sso: "sso-secret",
    ssxmod_itna: "qwen-mod-token",
    "__Secure-1PSID": "gemini-psid",
    abra_sess: "muse-session",
    workspaceId: "ws-123",
    tag: "primary",
  };

  const encrypted = encryption.encryptProviderSpecificData({ ...psd });
  assert.match(encrypted.cookie, /^enc:v1:/);
  assert.match(encrypted.token, /^enc:v1:/);
  assert.match(encrypted.sso, /^enc:v1:/);
  assert.match(encrypted.ssxmod_itna, /^enc:v1:/);
  assert.match(encrypted["__Secure-1PSID"], /^enc:v1:/);
  assert.match(encrypted.abra_sess, /^enc:v1:/);
  // Non-secret metadata stays plaintext (json_extract-safe)
  assert.equal(encrypted.workspaceId, "ws-123");
  assert.equal(encrypted.tag, "primary");

  const decrypted = encryption.decryptProviderSpecificData(encrypted);
  assert.deepEqual(decrypted, psd);

  // Via connection field helpers
  const conn = {
    apiKey: "sk-x",
    providerSpecificData: { ...psd },
  };
  const encConn = encryption.encryptConnectionFields({ ...conn, providerSpecificData: { ...psd } });
  assert.match(encConn.providerSpecificData.cookie, /^enc:v1:/);
  const decConn = encryption.decryptConnectionFields(encConn);
  assert.equal(decConn.providerSpecificData.cookie, psd.cookie);
});

test("PSD_SECRET_KEYS covers every web-session storageKey (N3 inventory)", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-0041-psd-inventory";
  const encryption = await importFresh("src/lib/db/encryption.ts");
  const { WEB_SESSION_CREDENTIAL_REQUIREMENTS } = await import(
    "../../src/shared/providers/webSessionCredentials.ts"
  );

  const secretSet = new Set(encryption.PSD_SECRET_KEYS as readonly string[]);
  const missing: string[] = [];
  for (const req of Object.values(WEB_SESSION_CREDENTIAL_REQUIREMENTS)) {
    for (const key of req.storageKeys) {
      if (key && !secretSet.has(key)) missing.push(key);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `PSD_SECRET_KEYS missing web-session storageKeys: ${missing.join(", ")}`
  );
});

test("providerSpecificDataNeedsEncryption detects plaintext secret keys", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-0041-psd-needs";
  const encryption = await importFresh("src/lib/db/encryption.ts");

  assert.equal(encryption.providerSpecificDataNeedsEncryption({ cookie: "plain" }), true);
  assert.equal(
    encryption.providerSpecificDataNeedsEncryption({ cookie: encryption.encrypt("plain") }),
    false
  );
  assert.equal(encryption.providerSpecificDataNeedsEncryption({ workspaceId: "ws" }), false);
});

test("decrypt returns null when the value is malformed or the key is wrong", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-304-secret-c";
  const firstModule = await importFresh("src/lib/db/encryption.ts");
  const encrypted = firstModule.encrypt("top-secret");

  process.env.STORAGE_ENCRYPTION_KEY = "task-304-secret-d";
  const secondModule = await importFresh("src/lib/db/encryption.ts");

  // When decryption fails with wrong key, return null (not encrypted ciphertext)
  // This prevents sending encrypted tokens to APIs
  assert.equal(secondModule.decrypt(encrypted), null);
  assert.equal(secondModule.decrypt("enc:v1:not-valid"), null);
});

test("legacy encryption migration parses ciphertext in canonical payload order", async () => {
  process.env.STORAGE_ENCRYPTION_KEY = "task-304-legacy-secret";
  const encryption = await importFresh("src/lib/db/encryption.ts");
  const legacyCiphertext = encryptWithLegacyDynamicSalt(
    process.env.STORAGE_ENCRYPTION_KEY,
    "legacy-provider-token"
  );

  // decrypt() dual-reads legacy dynamic-salt ciphertext for compatibility
  assert.equal(encryption.decrypt(legacyCiphertext), "legacy-provider-token");

  const migrated = encryption.migrateLegacyEncryptedString(legacyCiphertext);

  assert.equal(migrated.updated, true);
  assert.match(migrated.value, /^enc:v1:/);
  assert.equal(encryption.decrypt(migrated.value), "legacy-provider-token");
});
