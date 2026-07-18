/**
 * Persist process-root secrets (JWT_SECRET, API_KEY_SECRET) in the key_value store.
 *
 * Security (Task 0041 / F-05-001 + F-05-W2-003):
 * - When STORAGE_ENCRYPTION_KEY is set, values are stored as AES-256-GCM ciphertext
 *   (`enc:v1:…`) and never written as plaintext.
 * - Writes use upsert/replace so secrets are rotatable (not INSERT OR IGNORE forever).
 * - Reads dual-decode: ciphertext preferred, plaintext legacy still readable until
 *   the next write re-encrypts them.
 */

import { getDbInstance } from "./core";
import { decrypt, encrypt, isEncryptionEnabled } from "./encryption";

interface SecretRow {
  value?: string;
}

const ENC_PREFIX = "enc:v1:";

/**
 * Encode a secret for at-rest storage.
 * With encryption enabled the ciphertext must start with `enc:v1:` — refuse plaintext.
 */
function encodeSecretForStorage(plaintext: string): string {
  if (isEncryptionEnabled()) {
    const encrypted = encrypt(plaintext);
    if (typeof encrypted !== "string" || !encrypted.startsWith(ENC_PREFIX)) {
      // Fail closed when an encryption key is configured (stretch F-05-007 for secrets path).
      throw new Error("Failed to encrypt secret at rest (STORAGE_ENCRYPTION_KEY present)");
    }
    return JSON.stringify(encrypted);
  }
  return JSON.stringify(plaintext);
}

/**
 * Decode a stored secret value. Accepts:
 * - JSON-stringified ciphertext (`"enc:v1:…"`)
 * - JSON-stringified plaintext (legacy)
 * - raw `enc:v1:…` without JSON wrapping (defensive)
 * Malformed / non-string JSON → null (treated as missing).
 */
function decodeSecretFromStorage(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "string") return null;
    const decrypted = decrypt(parsed);
    return typeof decrypted === "string" ? decrypted : null;
  } catch {
    if (raw.startsWith(ENC_PREFIX)) {
      const decrypted = decrypt(raw);
      return typeof decrypted === "string" ? decrypted : null;
    }
    return null;
  }
}

let _secretsEncryptMigrated = false;

function ensureSecretsEncryptedMigration(): void {
  if (_secretsEncryptMigrated) return;
  _secretsEncryptMigrated = true;
  try {
    migratePlaintextSecretsToEncrypted();
  } catch {
    // Non-fatal — dual-read still serves legacy plaintext until next write.
  }
}

export function getPersistedSecret(key: string): string | null {
  try {
    ensureSecretsEncryptedMigration();
    const db = getDbInstance();
    const row = db
      .prepare("SELECT value FROM key_value WHERE namespace = 'secrets' AND key = ?")
      .get(key) as SecretRow | undefined;
    if (typeof row?.value !== "string") return null;
    return decodeSecretFromStorage(row.value);
  } catch {
    return null;
  }
}

/**
 * Persist (or rotate) a secret. Upserts so a second write replaces the prior value.
 * When STORAGE_ENCRYPTION_KEY is set the value is stored as `enc:v1:` ciphertext only.
 *
 * Fail-loud: encryption/encoding failures propagate (never silently drop a rotation
 * while claiming success). Only SQLite I/O failures are soft-swallowed so process-local
 * env secrets still boot when the DB is unavailable.
 */
export function persistSecret(key: string, value: string): void {
  // Encode outside the DB try so cipher/key failures are not masked as "DB offline".
  const stored = encodeSecretForStorage(value);
  try {
    const db = getDbInstance();
    // PRIMARY KEY (namespace, key) — INSERT OR REPLACE enables rotation + encrypt migration.
    db.prepare(
      "INSERT OR REPLACE INTO key_value (namespace, key, value) VALUES ('secrets', ?, ?)"
    ).run(key, stored);
  } catch {
    // Non-fatal DB I/O only: secrets still work for the current process if persistence fails.
  }
}

/**
 * One-time/lazy migration: re-encrypt any plaintext secrets rows when encryption is on.
 * Returns the number of rows rewritten. Safe to call repeatedly (idempotent).
 */
export function migratePlaintextSecretsToEncrypted(): number {
  if (!isEncryptionEnabled()) return 0;

  try {
    const db = getDbInstance();
    const rows = db
      .prepare("SELECT key, value FROM key_value WHERE namespace = 'secrets'")
      .all() as Array<{ key: string; value: string }>;

    let migrated = 0;
    for (const row of rows) {
      if (typeof row.value !== "string") continue;
      const plaintext = decodeSecretFromStorage(row.value);
      if (plaintext === null) continue;

      // Skip rows that already store ciphertext (after JSON unwrap).
      let alreadyEncrypted = false;
      try {
        const parsed: unknown = JSON.parse(row.value);
        alreadyEncrypted = typeof parsed === "string" && parsed.startsWith(ENC_PREFIX);
      } catch {
        alreadyEncrypted = row.value.startsWith(ENC_PREFIX) || row.value.includes(ENC_PREFIX);
      }
      if (alreadyEncrypted) continue;

      try {
        const stored = encodeSecretForStorage(plaintext);
        db.prepare(
          "INSERT OR REPLACE INTO key_value (namespace, key, value) VALUES ('secrets', ?, ?)"
        ).run(row.key, stored);
        migrated += 1;
      } catch {
        // Skip individual row failures.
      }
    }
    return migrated;
  } catch {
    return 0;
  }
}
