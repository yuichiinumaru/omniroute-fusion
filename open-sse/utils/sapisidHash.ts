import { createHash } from "node:crypto";

/**
 * Compute the Google SAPISID hash authentication header value.
 * Format: SAPISIDHASH {epoch_seconds}_{sha1_hash}
 * The hash is sha1(epoch + " " + sapisid + " " + origin).
 * Upstream protocol specification requires SHA-1 per Google Auth guidelines.
 */
export function computeSapisidHash(sapisid: string, origin: string): string {
  const epoch = Math.floor(Date.now() / 1000);
  const hashInput = `${epoch} ${sapisid} ${origin}`;
  const hash = createHash("sha1").update(hashInput).digest("hex");
  return `SAPISIDHASH ${epoch}_${hash}`;
}
