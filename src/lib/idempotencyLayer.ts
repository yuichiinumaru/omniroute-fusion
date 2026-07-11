/**
 * Idempotency Layer — Phase 9.2
 *
 * In-memory deduplication of requests with the same idempotency key.
 * If a request with the same key arrives within 5 seconds, returns
 * the cached response instead of making a new API call.
 *
 * Headers: Idempotency-Key (preferred). X-Request-Id is NOT used as an
 * idempotency key (F-06-W2-002) — it is too commonly shared by proxies/SDKs.
 *
 * Keys are scoped by principal (API key id) so two tenants cannot share
 * a cached completion even when they send the same Idempotency-Key.
 *
 * @module lib/idempotencyLayer
 */

import { createHash } from "crypto";
import { getSettings } from "@/lib/localDb";

const DEFAULT_WINDOW_MS = 5000;

/** @type {Map<string, { response: object, status: number, expiresAt: number }>} */
const idempotencyStore = new Map();

// Periodic cleanup every 30s
let cleanupInterval;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of idempotencyStore) {
      if (now >= entry.expiresAt) {
        idempotencyStore.delete(key);
      }
    }
  }, 30000);
  // Don't prevent process exit
  if (cleanupInterval.unref) cleanupInterval.unref();
}

/**
 * Build a principal-scoped store key: sha256(principal|rawKey).
 * Exported for unit tests.
 *
 * @param {string} rawKey
 * @param {string|null|undefined} principalId - API key id (or similar tenant id)
 * @returns {string}
 */
export function scopeIdempotencyKey(rawKey, principalId) {
  const scope =
    typeof principalId === "string" && principalId.trim().length > 0
      ? principalId.trim()
      : "anonymous";
  return createHash("sha256").update(`${scope}|${rawKey}`).digest("hex");
}

/**
 * Extract and scope an idempotency key from request headers.
 * Only the dedicated Idempotency-Key header is accepted (not X-Request-Id).
 *
 * @param {Headers|object|null|undefined} headers
 * @param {string|null|undefined} [principalId] - API key id for tenant isolation
 * @returns {string|null} scoped store key, or null when no Idempotency-Key
 */
export function getIdempotencyKey(headers, principalId) {
  if (!headers) return null;
  const get = typeof headers.get === "function" ? (k) => headers.get(k) : (k) => headers[k];
  // Prefer canonical header; Headers.get is case-insensitive; plain objects may be lowercased.
  const raw =
    get("idempotency-key") ||
    get("Idempotency-Key") ||
    (typeof headers === "object" && headers !== null
      ? // plain object fallback with common casings
        headers["Idempotency-Key"] || headers["idempotency-key"] || null
      : null);
  if (typeof raw !== "string" || raw.trim().length === 0) return null;
  return scopeIdempotencyKey(raw.trim(), principalId);
}

/**
 * Check if a response exists for the given (already scoped) idempotency key.
 * @param {string|null|undefined} key
 * @returns {{ response: object, status: number }|null}
 */
export function checkIdempotency(key) {
  if (!key) return null;
  const entry = idempotencyStore.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    idempotencyStore.delete(key);
    return null;
  }
  return { response: entry.response, status: entry.status };
}

/**
 * Save a response for idempotency dedup.
 * @param {string|null|undefined} key - already scoped key from getIdempotencyKey
 * @param {object} response - Response body to cache
 * @param {number} status - HTTP status code
 * @param {number} [windowMs=5000] - Dedup window in ms
 */
export function saveIdempotency(key, response, status, windowMs = DEFAULT_WINDOW_MS) {
  if (!key) return;
  ensureCleanup();
  idempotencyStore.set(key, {
    response,
    status,
    expiresAt: Date.now() + windowMs,
  });
}

/**
 * Get current idempotency store stats.
 */
export async function getIdempotencyStats() {
  let windowMs = DEFAULT_WINDOW_MS;
  try {
    const settings = await getSettings();
    if (typeof settings.idempotencyWindowMs === "number" && settings.idempotencyWindowMs > 0) {
      windowMs = settings.idempotencyWindowMs;
    }
  } catch {
    // Fallback to default if settings unavailable
  }
  return {
    activeKeys: idempotencyStore.size,
    windowMs,
  };
}

/**
 * Clear all idempotency entries (for testing).
 */
export function clearIdempotency() {
  idempotencyStore.clear();
}
