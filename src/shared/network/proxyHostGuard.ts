import { isIP } from "node:net";
import dns from "node:dns";
import { isPrivateHost, isCloudMetadataHost } from "./isPrivateHost";

export type ProxyDnsLookupFn = (
  hostname: string
) => Promise<Array<{ address: string; family: number }>>;

export interface ValidateProxyHostOptions {
  lookup?: ProxyDnsLookupFn;
}

const defaultLookup: ProxyDnsLookupFn = (hostname) =>
  dns.promises.lookup(hostname, { all: true });

let globalLookupOverride: ProxyDnsLookupFn | null = null;

/**
 * Test seam: override default DNS resolver across all proxy validation paths.
 */
export function setGlobalProxyLookupForTests(fn: ProxyDnsLookupFn | null): void {
  globalLookupOverride = fn;
}

/**
 * Normalizes a proxy hostname string:
 * - trims surrounding whitespace
 * - strips trailing dots (e.g. "127.0.0.1.", "proxy.com.")
 * - de-brackets IPv6 literals (e.g. "[2001:db8::1]" -> "2001:db8::1")
 * - strips :port if present in single-colon IPv4/hostname formats
 */
export function normalizeProxyHostname(hostname: string): string {
  let normalized = String(hostname || "").trim().toLowerCase();
  normalized = normalized.replace(/\.+$/, "");
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }
  if ((normalized.match(/:/g) || []).length === 1) {
    normalized = normalized.split(":")[0];
  }
  return normalized;
}

/**
 * Asserts that a proxy host is a valid public IP or public hostname and does NOT
 * resolve to a private/loopback/link-local/CGNAT or cloud metadata address.
 *
 * Checks:
 * 1. Host is non-empty.
 * 2. Literal checks against private/loopback/link-local/ULA/CGNAT/metadata ranges.
 * 3. If IP literal, returns normalized host.
 * 4. If hostname, performs DNS resolution (or uses injected lookup) and rejects
 *    if DNS fails, returns no records, or resolves to ANY private/metadata IP
 *    (preventing DNS rebinding and multi-A answer attacks).
 *
 * @throws {Error} with a descriptive message if invalid, unresolvable, or private.
 * @returns {Promise<string>} The normalized valid public host.
 */
export async function assertValidProxyHost(
  hostname: string,
  options?: ValidateProxyHostOptions
): Promise<string> {
  const bare = normalizeProxyHostname(hostname);
  if (!bare) {
    throw new Error("Proxy host is required");
  }

  // 1. Literal host checks
  if (isPrivateHost(bare) || isCloudMetadataHost(bare)) {
    throw new Error("Proxy host cannot be a private, loopback, or local address");
  }

  // 2. If it's an IP literal, it has already been verified non-private above
  if (isIP(bare)) {
    return bare;
  }

  // 3. DNS resolution for hostnames
  const lookup = options?.lookup ?? globalLookupOverride ?? defaultLookup;
  let resolved: Array<{ address: string; family: number }>;
  try {
    resolved = await lookup(bare);
  } catch (err) {
    throw new Error(
      `Proxy host could not be resolved (lookup failed): ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!Array.isArray(resolved) || resolved.length === 0) {
    throw new Error("Proxy host could not be resolved (no addresses returned)");
  }

  for (const record of resolved) {
    const addr = record?.address;
    if (!addr || isPrivateHost(addr) || isCloudMetadataHost(addr)) {
      throw new Error(
        `Proxy host resolves to a blocked private address (DNS rebinding detected): ${addr || "unknown"}`
      );
    }
  }

  return bare;
}

/**
 * Safe validator wrapper returning a result object instead of throwing.
 */
export async function validateProxyHost(
  hostname: string,
  options?: ValidateProxyHostOptions
): Promise<{ ok: true; host: string } | { ok: false; error: string }> {
  try {
    const host = await assertValidProxyHost(hostname, options);
    return { ok: true, host };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
