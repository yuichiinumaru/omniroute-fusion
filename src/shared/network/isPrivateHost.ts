/**
 * Pure, zero-dependency private/loopback/link-local and cloud-metadata host checker.
 *
 * This module is safe to import in client components, edge runtimes, and schemas
 * because it has zero dependencies on Node.js built-ins (`node:net`, `node:dns`)
 * or database/server runtime.
 */

function normalizeHost(hostname: string): string {
  let normalized = String(hostname || "").trim().toLowerCase();
  normalized = normalized.replace(/\.+$/, "");
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    return normalized.slice(1, -1);
  }
  return normalized;
}

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const CLOUD_METADATA_HOSTNAMES = new Set([
  "169.254.169.254", // AWS / GCP / Azure / Oracle IMDS
  "metadata.google.internal", // GCP
  "metadata.goog", // GCP
  "100.100.100.200", // Alibaba Cloud
  "fd00:ec2::254", // AWS IPv6 IMDS
]);

/**
 * Returns true if the host is a known cloud metadata endpoint.
 */
export function isCloudMetadataHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (!host) return false;
  if (CLOUD_METADATA_HOSTNAMES.has(host)) return true;
  if (host.startsWith("169.254.")) return true; // IPv4 link-local /16
  return false;
}

/**
 * Returns true if the host is a private, loopback, link-local, carrier-grade NAT,
 * or reserved internal address.
 *
 * Covers:
 * - IPv4 Loopback (127.0.0.0/8, 0.0.0.0/8)
 * - RFC 1918 Private IPv4 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - IPv4 Link-Local & IMDS (169.254.0.0/16)
 * - CGNAT (100.64.0.0/10)
 * - IPv6 Loopback (::1, ::)
 * - IPv6 ULA (fc00::/7)
 * - IPv6 Link-Local (fe80::/10)
 * - IPv4-mapped IPv6 (::ffff:0:0/96)
 * - Reserved local/internal domains (.localhost, .local, .internal, localhost)
 * - Cloud metadata hostnames (metadata.google.internal, metadata.goog, 100.100.100.200)
 */
export function isPrivateHost(hostname: string): boolean {
  const normalized = normalizeHost(hostname);
  if (!normalized) return true;

  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "::" ||
    normalized === "0:0:0:0:0:0:0:0" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    // `.internal` is reserved for private use (ICANN-style) and is the
    // hostname suffix used by GCP/Azure metadata probes (e.g. `metadata.google.internal`).
    normalized.endsWith(".internal") ||
    normalized.startsWith("::ffff:") ||
    CLOUD_METADATA_HOSTNAMES.has(normalized)
  ) {
    return true;
  }

  const v4Match = normalized.match(IPV4_REGEX);
  if (v4Match) {
    const a = parseInt(v4Match[1], 10);
    const b = parseInt(v4Match[2], 10);
    const c = parseInt(v4Match[3], 10);
    const d = parseInt(v4Match[4], 10);

    // Fail-closed on invalid octet numbers
    if (a > 255 || b > 255 || c > 255 || d > 255) return true;

    // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8
    if (a === 0 || a === 10 || a === 127) return true;
    // 169.254.0.0/16 (Link-Local / IMDS)
    if (a === 169 && b === 254) return true;
    // 192.168.0.0/16 (RFC 1918)
    if (a === 192 && b === 168) return true;
    // 172.16.0.0/12 (RFC 1918: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 100.64.0.0/10 (CGNAT: 100.64.0.0 - 100.127.255.255)
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (normalized.includes(":")) {
    if (normalized === "::1" || normalized === "::") return true;
    const firstGroup = normalized.split(":")[0];
    const num = parseInt(firstGroup, 16);
    if (!Number.isNaN(num)) {
      // fc00::/7 (Unique Local Address: fc00.. - fdff..)
      if (num >= 0xfc00 && num <= 0xfdff) return true;
      // fe80::/10 (Link-Local Unicast: fe80.. - febf..)
      if (num >= 0xfe80 && num <= 0xfebf) return true;
    }
    return (
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }

  return false;
}
