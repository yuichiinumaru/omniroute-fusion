import "../../open-sse/utils/setupPolyfill.ts";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-proxy-trust-test-"));
const ORIGINAL_DATA_DIR = process.env.DATA_DIR;

process.env.DATA_DIR = TEST_DATA_DIR;
process.env.API_KEY_SECRET = "test-secret";
process.env.PII_REDACTION_ENABLED = "true";
delete process.env.OMNIROUTE_API_KEY;

const core = await import("../../src/lib/db/core.ts");
const freeProxiesDb = await import("../../src/lib/db/freeProxies.ts");
const { isPrivateHost, isCloudMetadataHost } = await import(
  "../../src/shared/network/isPrivateHost.ts"
);
const {
  assertValidProxyHost,
  validateProxyHost,
  normalizeProxyHostname,
  setGlobalProxyLookupForTests,
} = await import("../../src/shared/network/proxyHostGuard.ts");
const { isLocalOnlyPath } = await import("../../src/server/authz/routeGuard.ts");
const {
  createProxyRegistrySchema,
  updateProxyRegistrySchema,
  bulkImportProxiesSchema,
  proxyConfigSchema,
  updateProxyConfigSchema,
  testProxySchema,
} = await import("../../src/shared/validation/schemas/proxy.ts");
const { ProxiflyProvider } = await import("../../src/lib/freeProxyProviders/proxifly.ts");
const { IplocateProvider } = await import("../../src/lib/freeProxyProviders/iplocate.ts");
const { OneproxyProvider } = await import("../../src/lib/freeProxyProviders/oneproxy.ts");
const { getEnabledProviders, getAllProviders } = await import(
  "../../src/lib/freeProxyProviders/index.ts"
);
const addToPoolRoute =
  await import("../../src/app/api/settings/free-proxies/[id]/add-to-pool/route.ts");
const bulkAddRoute =
  await import("../../src/app/api/settings/free-proxies/bulk-add-to-pool/route.ts");
const freeProxiesRoute = await import("../../src/app/api/settings/free-proxies/route.ts");
const proxiesRoute = await import("../../src/app/api/settings/proxies/route.ts");
const proxiesBulkImportRoute = await import(
  "../../src/app/api/settings/proxies/bulk-import/route.ts"
);
const proxySettingsRoute = await import("../../src/app/api/settings/proxy/route.ts");
const proxyTestRoute = await import("../../src/app/api/settings/proxy/test/route.ts");
const proxiesDb = await import("../../src/lib/db/proxies.ts");
const settingsDb = await import("../../src/lib/db/settings.ts");
const proxyEgress = await import("../../src/lib/proxyEgress.ts");
const proxyDispatcher = await import("../../open-sse/utils/proxyDispatcher.ts");
const proxyFetchModule = await import("../../open-sse/utils/proxyFetch.ts");
const proxyHealth = await import("../../src/lib/proxyHealth.ts");
const { MimocodeExecutor } = await import("../../open-sse/executors/mimocode.ts");

async function reset() {
  core.resetDbInstance();
  setGlobalProxyLookupForTests(null);
  proxyHealth.__setProxyHealthTcpCheckForTesting(null);
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

test.beforeEach(async () => {
  await reset();
  addToPoolRoute._resetConnectivityTesterForTests();
  bulkAddRoute._resetQuickTesterForTests();
});

test.after(() => {
  core.resetDbInstance();
  setGlobalProxyLookupForTests(null);
  proxyHealth.__setProxyHealthTcpCheckForTesting(null);
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  if (ORIGINAL_DATA_DIR === undefined) {
    delete process.env.DATA_DIR;
  } else {
    process.env.DATA_DIR = ORIGINAL_DATA_DIR;
  }
});

// ── 1. SSRF Private IP & Loopback Rejection via isPrivateHost ───────────────

const PRIVATE_HOSTS = [
  // IPv4 Loopback
  "127.0.0.1",
  "127.0.1.1",
  "127.10.20.30",
  "0.0.0.0",
  // RFC 1918 Private IPv4
  "10.0.0.1",
  "10.255.255.254",
  "172.16.0.1",
  "172.31.255.255",
  "192.168.0.1",
  "192.168.1.254",
  // Link-Local & Cloud IMDS
  "169.254.169.254",
  "169.254.0.1",
  "169.254.255.254",
  // Carrier-Grade NAT (RFC 6598)
  "100.64.0.1",
  "100.127.255.254",
  // IPv6 Loopback
  "::1",
  "[::1]",
  "::",
  "0:0:0:0:0:0:0:1",
  // IPv6 ULA (fc00::/7)
  "fc00::1",
  "[fc00::1]",
  "fd00::1",
  "fd12:3456:789a::1",
  // IPv6 Link-Local (fe80::/10)
  "fe80::1",
  "[fe80::1]",
  "fe80:0:0:0:0:0:0:1",
  // IPv4-mapped IPv6
  "::ffff:127.0.0.1",
  "::ffff:10.0.0.1",
  "::ffff:192.168.1.1",
  // Trailing-dot bypass defense
  "127.0.0.1.",
  "127.0.0.1..",
  "localhost.",
  "169.254.169.254.",
  "10.0.0.1.",
  "192.168.1.1.",
  // Reserved / Localhost Domains
  "localhost",
  "app.localhost",
  "printer.local",
  "service.internal",
  "metadata.google.internal",
  "metadata.goog",
  "100.100.100.200",
  "fd00:ec2::254",
];

const PUBLIC_HOSTS = [
  "198.51.100.1",
  "203.0.113.1",
  "93.184.216.34",
  "8.8.8.8",
  "1.1.1.1",
  "proxy.example.com",
  "egress.company.org",
  "2606:4700:4700::1111",
];

test("isPrivateHost correctly classifies private/loopback/link-local/metadata hosts", () => {
  for (const host of PRIVATE_HOSTS) {
    assert.equal(isPrivateHost(host), true, `${host} must be classified as private`);
  }
  for (const host of PUBLIC_HOSTS) {
    assert.equal(isPrivateHost(host), false, `${host} must be classified as public`);
  }
});

test("isCloudMetadataHost identifies IMDS endpoints", () => {
  assert.equal(isCloudMetadataHost("169.254.169.254"), true);
  assert.equal(isCloudMetadataHost("metadata.google.internal"), true);
  assert.equal(isCloudMetadataHost("metadata.goog"), true);
  assert.equal(isCloudMetadataHost("100.100.100.200"), true);
  assert.equal(isCloudMetadataHost("fd00:ec2::254"), true);
  assert.equal(isCloudMetadataHost("169.254.1.1"), true);
  assert.equal(isCloudMetadataHost("proxy.example.com"), false);
  assert.equal(isCloudMetadataHost("8.8.8.8"), false);
});

// ── 2. Schema-Level BYO Proxy Validation ────────────────────────────────────

test("createProxyRegistrySchema rejects private, loopback, and link-local hosts", () => {
  for (const host of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "fc00::1",
    "fe80::1",
    "localhost",
    "service.local",
  ]) {
    const result = createProxyRegistrySchema.safeParse({
      name: "Test Proxy",
      type: "http",
      host,
      port: 8080,
    });
    assert.equal(result.success, false, `createProxyRegistrySchema must reject ${host}`);
    if (!result.success) {
      assert.ok(
        result.error.issues.some(
          (i) => i.path.includes("host") && /private|loopback|local/i.test(i.message)
        )
      );
    }
  }
});

test("createProxyRegistrySchema accepts valid public hosts and IPs", () => {
  for (const host of ["198.51.100.1", "203.0.113.1", "proxy.example.com", "93.184.216.34"]) {
    const result = createProxyRegistrySchema.safeParse({
      name: "Public Proxy",
      type: "http",
      host,
      port: 8080,
    });
    assert.equal(result.success, true, `createProxyRegistrySchema must accept ${host}`);
  }
});

test("updateProxyRegistrySchema rejects private host on update", () => {
  const result = updateProxyRegistrySchema.safeParse({
    id: "proxy-123",
    host: "127.0.0.1",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (i) => i.path.includes("host") && /private|loopback|local/i.test(i.message)
      )
    );
  }
});

test("bulkImportProxiesSchema rejects items containing private hosts", () => {
  const result = bulkImportProxiesSchema.safeParse({
    items: [
      { name: "Valid", type: "http", host: "198.51.100.1", port: 8080 },
      { name: "Invalid Private", type: "http", host: "10.0.0.1", port: 8080 },
    ],
  });
  assert.equal(result.success, false);
});

test("proxyConfigSchema rejects private hosts in global / provider configs", () => {
  const result = proxyConfigSchema.safeParse({
    type: "http",
    host: "192.168.1.1",
    port: 8080,
  });
  assert.equal(result.success, false);

  const validResult = proxyConfigSchema.safeParse({
    type: "http",
    host: "proxy.example.com",
    port: 8080,
  });
  assert.equal(validResult.success, true);
});

test("updateProxyConfigSchema rejects private host payloads", () => {
  const result = updateProxyConfigSchema.safeParse({
    level: "global",
    proxy: {
      type: "http",
      host: "127.0.0.1",
      port: 8080,
    },
  });
  assert.equal(result.success, false);
});

test("testProxySchema rejects private host test requests", () => {
  const result = testProxySchema.safeParse({
    proxy: {
      type: "http",
      host: "169.254.169.254",
      port: 8080,
    },
  });
  assert.equal(result.success, false);
});

// ── 3. Free-Pool Scrapers Private IP Filtering & Default Posture ─────────────

test("Free-pool providers are disabled by default when no env vars are set", () => {
  const orig1proxy = process.env.FREE_PROXY_1PROXY_ENABLED;
  const origProxifly = process.env.FREE_PROXY_PROXIFLY_ENABLED;
  const origIplocate = process.env.FREE_PROXY_IPLOCATE_ENABLED;

  delete process.env.FREE_PROXY_1PROXY_ENABLED;
  delete process.env.FREE_PROXY_PROXIFLY_ENABLED;
  delete process.env.FREE_PROXY_IPLOCATE_ENABLED;

  try {
    const oneproxy = new OneproxyProvider();
    const proxifly = new ProxiflyProvider();
    const iplocate = new IplocateProvider();

    assert.equal(oneproxy.isEnabled(), false, "1proxy must be disabled by default");
    assert.equal(proxifly.isEnabled(), false, "Proxifly must be disabled by default");
    assert.equal(iplocate.isEnabled(), false, "IPLocate must be disabled by default");

    const enabled = getEnabledProviders();
    assert.equal(enabled.length, 0, "getEnabledProviders() must return empty array by default");

    const all = getAllProviders();
    assert.equal(all.length, 3, "getAllProviders() must return all 3 provider instances");
  } finally {
    if (orig1proxy !== undefined) process.env.FREE_PROXY_1PROXY_ENABLED = orig1proxy;
    if (origProxifly !== undefined) process.env.FREE_PROXY_PROXIFLY_ENABLED = origProxifly;
    if (origIplocate !== undefined) process.env.FREE_PROXY_IPLOCATE_ENABLED = origIplocate;
  }
});

test("Free-pool providers enable cleanly with explicit opt-in env vars", () => {
  const orig1proxy = process.env.FREE_PROXY_1PROXY_ENABLED;
  const origProxifly = process.env.FREE_PROXY_PROXIFLY_ENABLED;
  const origIplocate = process.env.FREE_PROXY_IPLOCATE_ENABLED;

  try {
    process.env.FREE_PROXY_1PROXY_ENABLED = "true";
    process.env.FREE_PROXY_PROXIFLY_ENABLED = "true";
    process.env.FREE_PROXY_IPLOCATE_ENABLED = "true";

    const oneproxy = new OneproxyProvider();
    const proxifly = new ProxiflyProvider();
    const iplocate = new IplocateProvider();

    assert.equal(oneproxy.isEnabled(), true);
    assert.equal(proxifly.isEnabled(), true);
    assert.equal(iplocate.isEnabled(), true);

    const enabled = getEnabledProviders();
    assert.equal(enabled.length, 3);
  } finally {
    if (orig1proxy !== undefined) process.env.FREE_PROXY_1PROXY_ENABLED = orig1proxy;
    else delete process.env.FREE_PROXY_1PROXY_ENABLED;
    if (origProxifly !== undefined) process.env.FREE_PROXY_PROXIFLY_ENABLED = origProxifly;
    else delete process.env.FREE_PROXY_PROXIFLY_ENABLED;
    if (origIplocate !== undefined) process.env.FREE_PROXY_IPLOCATE_ENABLED = origIplocate;
    else delete process.env.FREE_PROXY_IPLOCATE_ENABLED;
  }
});

test("Free-pool provider sync returns 0 and error message when disabled", async () => {
  const orig1proxy = process.env.FREE_PROXY_1PROXY_ENABLED;
  const origProxifly = process.env.FREE_PROXY_PROXIFLY_ENABLED;
  const origIplocate = process.env.FREE_PROXY_IPLOCATE_ENABLED;

  delete process.env.FREE_PROXY_1PROXY_ENABLED;
  delete process.env.FREE_PROXY_PROXIFLY_ENABLED;
  delete process.env.FREE_PROXY_IPLOCATE_ENABLED;

  try {
    const oneproxy = new OneproxyProvider();
    const proxifly = new ProxiflyProvider();
    const iplocate = new IplocateProvider();

    const r1 = await oneproxy.sync();
    assert.equal(r1.fetched, 0);
    assert.ok(r1.errors[0].includes("disabled"));

    const r2 = await proxifly.sync();
    assert.equal(r2.fetched, 0);
    assert.ok(r2.errors[0].includes("disabled"));

    const r3 = await iplocate.sync();
    assert.equal(r3.fetched, 0);
    assert.ok(r3.errors[0].includes("disabled"));
  } finally {
    if (orig1proxy !== undefined) process.env.FREE_PROXY_1PROXY_ENABLED = orig1proxy;
    if (origProxifly !== undefined) process.env.FREE_PROXY_PROXIFLY_ENABLED = origProxifly;
    if (origIplocate !== undefined) process.env.FREE_PROXY_IPLOCATE_ENABLED = origIplocate;
  }
});

test("ProxiflyProvider filters out private and loopback IPs during sync", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnabled = process.env.FREE_PROXY_PROXIFLY_ENABLED;
  const originalQuantity = process.env.FREE_PROXY_PROXIFLY_QUANTITY;

  process.env.FREE_PROXY_PROXIFLY_ENABLED = "true";
  process.env.FREE_PROXY_PROXIFLY_QUANTITY = "5";

  globalThis.fetch = (async () => {
    const proxies = [
      { ip: "127.0.0.1", port: 8080, protocol: "http" },
      { ip: "10.0.0.5", port: 8080, protocol: "http" },
      { ip: "192.168.1.1", port: 8080, protocol: "http" },
      { ip: "169.254.169.254", port: 8080, protocol: "http" },
      { ip: "198.51.100.10", port: 8080, protocol: "http", quality_score: 80 },
    ];
    return new Response(JSON.stringify(proxies), { status: 200 });
  }) as typeof fetch;

  try {
    const provider = new ProxiflyProvider();
    const result = await provider.sync();

    // 4 private proxies should be skipped with logged errors, 1 public proxy added
    assert.equal(result.added, 1);
    assert.equal(result.fetched, 1);
    assert.equal(result.errors.length, 4);
    assert.ok(result.errors.some((e) => e.includes("skipped private/loopback host 127.0.0.1")));
    assert.ok(result.errors.some((e) => e.includes("skipped private/loopback host 10.0.0.5")));

    const staged = await provider.list({ limit: 10 });
    assert.equal(staged.length, 1);
    assert.equal(staged[0].host, "198.51.100.10");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.FREE_PROXY_PROXIFLY_ENABLED = originalEnabled ?? "";
    process.env.FREE_PROXY_PROXIFLY_QUANTITY = originalQuantity ?? "";
  }
});

test("IplocateProvider filters out private and loopback IPs during sync", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnabled = process.env.FREE_PROXY_IPLOCATE_ENABLED;

  process.env.FREE_PROXY_IPLOCATE_ENABLED = "true";

  globalThis.fetch = (async () => {
    const proxies = [
      { ip: "127.0.0.1", port: 8080, country: "US" },
      { ip: "::1", port: 8080, country: "US" },
      { ip: "198.51.100.20", port: 8080, country: "US" },
    ];
    return new Response(JSON.stringify(proxies), { status: 200 });
  }) as typeof fetch;

  try {
    const provider = new IplocateProvider();
    const result = await provider.sync();

    assert.ok(result.errors.some((e) => e.includes("skipped private/loopback host 127.0.0.1")));
    assert.ok(result.errors.some((e) => e.includes("skipped private/loopback host ::1")));
    assert.ok(result.added >= 1);

    const staged = await provider.list({ limit: 10 });
    assert.ok(staged.every((p) => p.host === "198.51.100.20"));
  } finally {
    globalThis.fetch = originalFetch;
    process.env.FREE_PROXY_IPLOCATE_ENABLED = originalEnabled ?? "";
  }
});

test("OneproxyProvider filters out private and loopback IPs during sync", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnabled = process.env.FREE_PROXY_1PROXY_ENABLED;

  process.env.FREE_PROXY_1PROXY_ENABLED = "true";

  globalThis.fetch = (async () => {
    const data = {
      total: 3,
      count: 3,
      offset: 0,
      proxies: [
        { ip: "10.0.0.1", port: 8080, protocol: "http" },
        { ip: "fc00::1", port: 8080, protocol: "http" },
        { ip: "198.51.100.30", port: 8080, protocol: "http", quality_score: 75 },
      ],
    };
    return new Response(JSON.stringify(data), { status: 200 });
  }) as typeof fetch;

  try {
    const provider = new OneproxyProvider();
    const result = await provider.sync();

    assert.ok(result.errors.some((e) => e.includes("skipped private/loopback host 10.0.0.1")));
    assert.ok(result.errors.some((e) => e.includes("skipped private/loopback host fc00::1")));
    assert.equal(result.added, 1);

    const staged = await provider.list({ limit: 10 });
    assert.equal(staged.length, 1);
    assert.equal(staged[0].host, "198.51.100.30");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.FREE_PROXY_1PROXY_ENABLED = originalEnabled ?? "";
  }
});

// ── 4. DNS Rebinding & Host Validation Guard Unit Tests ─────────────────────

test("assertValidProxyHost: IP literals bypass DNS lookup", async () => {
  let lookupCalled = false;
  const fakeLookup = async () => {
    lookupCalled = true;
    return [{ address: "93.184.216.34", family: 4 }];
  };

  const v4 = await assertValidProxyHost("198.51.100.1", { lookup: fakeLookup });
  assert.equal(v4, "198.51.100.1");
  assert.equal(lookupCalled, false, "IP literal must not trigger DNS lookup");

  const v6 = await assertValidProxyHost("2606:4700:4700::1111", { lookup: fakeLookup });
  assert.equal(v6, "2606:4700:4700::1111");
  assert.equal(lookupCalled, false);

  const bracketedV6 = await assertValidProxyHost("[2606:4700:4700::1111]", { lookup: fakeLookup });
  assert.equal(bracketedV6, "2606:4700:4700::1111");
  assert.equal(lookupCalled, false);
});

test("assertValidProxyHost: rejects literal private IPs immediately without DNS lookup", async () => {
  let lookupCalled = false;
  const fakeLookup = async () => {
    lookupCalled = true;
    return [{ address: "93.184.216.34", family: 4 }];
  };

  for (const host of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "[::1]",
    "fc00::1",
    "fe80::1",
    "localhost",
  ]) {
    lookupCalled = false;
    await assert.rejects(
      async () => assertValidProxyHost(host, { lookup: fakeLookup }),
      /private|loopback|local/i
    );
    assert.equal(lookupCalled, false, `${host} must be rejected before DNS lookup`);
  }
});

test("assertValidProxyHost: resolves public hostname to public IP successfully", async () => {
  const fakeLookup = async (name: string) => {
    if (name === "proxy.public.example.com") {
      return [{ address: "93.184.216.34", family: 4 }];
    }
    throw new Error("Unknown host");
  };

  const host = await assertValidProxyHost("proxy.public.example.com", { lookup: fakeLookup });
  assert.equal(host, "proxy.public.example.com");
});

test("assertValidProxyHost: rejects hostname resolving to private/loopback/metadata IP (DNS rebinding)", async () => {
  const privateResolutions: Array<{ host: string; resolvedIp: string }> = [
    { host: "rebind-loopback.example.com", resolvedIp: "127.0.0.1" },
    { host: "rebind-rfc1918-10.example.com", resolvedIp: "10.0.0.5" },
    { host: "rebind-rfc1918-172.example.com", resolvedIp: "172.16.0.10" },
    { host: "rebind-rfc1918-192.example.com", resolvedIp: "192.168.1.50" },
    { host: "rebind-imds.example.com", resolvedIp: "169.254.169.254" },
    { host: "rebind-cgnat.example.com", resolvedIp: "100.64.0.1" },
    { host: "rebind-v6-loopback.example.com", resolvedIp: "::1" },
    { host: "rebind-v6-ula.example.com", resolvedIp: "fc00::5" },
    { host: "rebind-v6-linklocal.example.com", resolvedIp: "fe80::1" },
    { host: "rebind-gcp-metadata.example.com", resolvedIp: "100.100.100.200" },
  ];

  for (const { host, resolvedIp } of privateResolutions) {
    const fakeLookup = async () => [{ address: resolvedIp, family: resolvedIp.includes(":") ? 6 : 4 }];
    await assert.rejects(
      async () => assertValidProxyHost(host, { lookup: fakeLookup }),
      /DNS rebinding|blocked private address/i,
      `Hostname resolving to ${resolvedIp} must be rejected by DNS rebinding guard`
    );
  }
});

test("assertValidProxyHost: rejects mixed public and private DNS answers (multi-A defense)", async () => {
  const fakeLookup = async () => [
    { address: "93.184.216.34", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ];

  await assert.rejects(
    async () => assertValidProxyHost("mixed-rebind.example.com", { lookup: fakeLookup }),
    /DNS rebinding|blocked private address/i
  );
});

test("assertValidProxyHost: rejects hostname when DNS lookup fails or returns empty", async () => {
  const failingLookup = async () => {
    throw new Error("ENOTFOUND");
  };
  await assert.rejects(
    async () => assertValidProxyHost("nonexistent.example.com", { lookup: failingLookup }),
    /lookup failed/i
  );

  const emptyLookup = async () => [];
  await assert.rejects(
    async () => assertValidProxyHost("empty.example.com", { lookup: emptyLookup }),
    /no addresses returned/i
  );
});

test("validateProxyHost: returns safe result object for valid and invalid hosts", async () => {
  const fakeLookup = async (name: string) => {
    if (name === "safe.example.com") return [{ address: "93.184.216.34", family: 4 }];
    if (name === "bad.example.com") return [{ address: "127.0.0.1", family: 4 }];
    throw new Error("ENOTFOUND");
  };

  const valid = await validateProxyHost("safe.example.com", { lookup: fakeLookup });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.host, "safe.example.com");

  const invalid = await validateProxyHost("bad.example.com", { lookup: fakeLookup });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.ok(/DNS rebinding/i.test(invalid.error));

  const notFound = await validateProxyHost("notfound.example.com", { lookup: fakeLookup });
  assert.equal(notFound.ok, false);
  if (!notFound.ok) assert.ok(/lookup failed/i.test(notFound.error));
});

// ── 5. Free Proxy Promotion Hardening (Private IP + DNS Rebinding) ──────────

test("promoteFreeProxyToPool rejects private host promotion", async () => {
  const { id } = await freeProxiesDb.upsertFreeProxy({
    source: "1proxy",
    host: "127.0.0.1",
    port: 8080,
    type: "http",
    countryCode: null,
    qualityScore: null,
    latencyMs: null,
    anonymity: null,
    lastValidated: null,
  });

  const promotedId = await freeProxiesDb.promoteFreeProxyToPool(id, {
    name: "Private Promote Attempt",
    type: "http",
    host: "127.0.0.1",
    port: 8080,
    source: "1proxy",
  });

  assert.equal(promotedId, null, "promoteFreeProxyToPool must refuse private hosts");
});

test("POST /api/settings/free-proxies/[id]/add-to-pool returns 400 for private host", async () => {
  const { id } = await freeProxiesDb.upsertFreeProxy({
    source: "1proxy",
    host: "10.0.0.1",
    port: 8080,
    type: "http",
    countryCode: null,
    qualityScore: null,
    latencyMs: null,
    anonymity: null,
    lastValidated: null,
  });

  const req = new Request("http://localhost/test", { method: "POST" });
  const res = await addToPoolRoute.POST(req, { params: Promise.resolve({ id }) });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.type, "invalid_request");
  assert.ok(/private|loopback/i.test(body.error.message));
});

test("POST /api/settings/free-proxies/[id]/add-to-pool returns 400 for DNS rebinding host without connectivity probe", async () => {
  setGlobalProxyLookupForTests(async () => [{ address: "127.0.0.1", family: 4 }]);
  let connectivityTested = false;
  addToPoolRoute._setConnectivityTesterForTests(async () => {
    connectivityTested = true;
    return { success: true, latencyMs: 50 };
  });

  const { id } = await freeProxiesDb.upsertFreeProxy({
    source: "proxifly",
    host: "rebind.example.com",
    port: 8080,
    type: "http",
    countryCode: null,
    qualityScore: null,
    latencyMs: null,
    anonymity: null,
    lastValidated: null,
  });

  const req = new Request("http://localhost/test", { method: "POST" });
  const res = await addToPoolRoute.POST(req, { params: Promise.resolve({ id }) });

  assert.equal(res.status, 400);
  assert.equal(connectivityTested, false, "Connectivity tester must NOT be called for rebinding host");
  const body = await res.json();
  assert.ok(/private|loopback|DNS rebinding/i.test(body.error.message));
});

test("POST /api/settings/free-proxies/bulk-add-to-pool marks private and rebinding hosts as failed", async () => {
  setGlobalProxyLookupForTests(async (name) => {
    if (name === "rebind.example.com") return [{ address: "192.168.1.100", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  });

  let quickTested = false;
  bulkAddRoute._setQuickTesterForTests(async () => {
    quickTested = true;
    return { ok: true, latencyMs: 30 };
  });

  const { id: id1 } = await freeProxiesDb.upsertFreeProxy({
    source: "proxifly",
    host: "192.168.1.1",
    port: 8080,
    type: "http",
    countryCode: null,
    qualityScore: null,
    latencyMs: null,
    anonymity: null,
    lastValidated: null,
  });

  const { id: id2 } = await freeProxiesDb.upsertFreeProxy({
    source: "1proxy",
    host: "rebind.example.com",
    port: 8080,
    type: "http",
    countryCode: null,
    qualityScore: null,
    latencyMs: null,
    anonymity: null,
    lastValidated: null,
  });

  const req = new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [id1, id2] }),
  });
  const res = await bulkAddRoute.POST(req);
  const body = await res.json();

  assert.equal(body.succeeded, 0);
  assert.equal(body.failed, 2);
  assert.ok(body.results[0].error.includes("Private or loopback"));
  assert.ok(body.results[1].error.includes("Private or loopback"));
  assert.equal(quickTested, false, "Quick tester must not run for private or rebinding hosts");
});

// ── 6. Proxy Registry & Settings Routes DNS Rebinding Protection ────────────

test("POST /api/settings/proxies rejects host resolving to private IP via DNS rebinding", async () => {
  setGlobalProxyLookupForTests(async () => [{ address: "127.0.0.1", family: 4 }]);

  const req = new Request("http://localhost/api/settings/proxies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Rebind Proxy",
      type: "http",
      host: "evil-rebind.example.com",
      port: 8080,
    }),
  });

  const res = await proxiesRoute.POST(req);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.type, "invalid_request");
  assert.ok(/DNS rebinding|blocked private/i.test(body.error.message));
});

test("PATCH /api/settings/proxies rejects host resolving to private IP", async () => {
  setGlobalProxyLookupForTests(async (name) => {
    if (name === "initial-public.example.com") return [{ address: "93.184.216.34", family: 4 }];
    if (name === "evil-update.example.com") return [{ address: "10.0.0.1", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  });

  const createReq = new Request("http://localhost/api/settings/proxies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Initial Proxy",
      type: "http",
      host: "initial-public.example.com",
      port: 8080,
    }),
  });
  const createRes = await proxiesRoute.POST(createReq);
  assert.equal(createRes.status, 201);
  const created = await createRes.json();

  const updateReq = new Request("http://localhost/api/settings/proxies", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: created.id,
      host: "evil-update.example.com",
    }),
  });
  const updateRes = await proxiesRoute.PATCH(updateReq);
  assert.equal(updateRes.status, 400);
  const updateBody = await updateRes.json();
  assert.ok(/DNS rebinding|blocked private/i.test(updateBody.error.message));
});

test("POST /api/settings/proxies/bulk-import marks DNS rebinding items as failed", async () => {
  setGlobalProxyLookupForTests(async (name) => {
    if (name === "good.example.com") return [{ address: "93.184.216.34", family: 4 }];
    if (name === "bad-rebind.example.com") return [{ address: "172.16.0.5", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  });

  const req = new Request("http://localhost/api/settings/proxies/bulk-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { name: "Good Proxy", type: "http", host: "good.example.com", port: 8080 },
        { name: "Rebind Proxy", type: "http", host: "bad-rebind.example.com", port: 8080 },
      ],
    }),
  });

  const res = await proxiesBulkImportRoute.POST(req);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.created, 1);
  assert.equal(body.failed, 1);
  assert.equal(body.results[0].success, true);
  assert.equal(body.results[1].success, false);
  assert.ok(/DNS rebinding|blocked private/i.test(body.results[1].error));
});

test("POST /api/settings/proxy/test rejects DNS rebinding host without connecting", async () => {
  setGlobalProxyLookupForTests(async () => [{ address: "169.254.169.254", family: 4 }]);

  const req = new Request("http://localhost/api/settings/proxy/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      proxy: {
        type: "http",
        host: "imds-rebind.example.com",
        port: 8080,
      },
    }),
  });

  const res = await proxyTestRoute.POST(req);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.type, "invalid_request");
  assert.ok(/DNS rebinding|blocked private/i.test(body.error.message));
});

test("PUT /api/settings/proxy rejects config with DNS rebinding host", async () => {
  setGlobalProxyLookupForTests(async () => [{ address: "192.168.1.1", family: 4 }]);

  const req = new Request("http://localhost/api/settings/proxy", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      level: "global",
      proxy: {
        type: "http",
        host: "rebind-settings.example.com",
        port: 8080,
      },
    }),
  });

  const res = await proxySettingsRoute.PUT(req);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.type, "invalid_request");
  assert.ok(/DNS rebinding|blocked private/i.test(body.error.message));
});

// ── 7. Authz & LOCAL_ONLY Route Locality Matrix ─────────────────────────────

test("All proxy registry, free-proxy, and proxy config routes are classified LOCAL_ONLY", () => {
  const LOCAL_ONLY_ROUTES = [
    // Free proxy routes
    "/api/settings/free-proxies",
    "/api/settings/free-proxies/",
    "/api/settings/free-proxies/sync",
    "/api/settings/free-proxies/stats",
    "/api/settings/free-proxies/bulk-add-to-pool",
    "/api/settings/free-proxies/test-id-123/add-to-pool",
    // Proxy registry routes
    "/api/settings/proxies",
    "/api/settings/proxies/",
    "/api/settings/proxies/bulk-import",
    "/api/settings/proxies/assignments",
    "/api/settings/proxies/bulk-assign",
    "/api/settings/proxies/health",
    "/api/settings/proxies/migrate",
    "/api/settings/proxies/egress",
    // Proxy settings routes
    "/api/settings/proxy",
    "/api/settings/proxy/",
    "/api/settings/proxy/test",
    "/api/settings/proxy/bypass-token",
    "/api/settings/proxy/redaction-status",
    "/api/settings/proxy/cloudflare-deploy",
    "/api/settings/proxy/vercel-deploy",
    "/api/settings/proxy/deno-deploy",
    // 1proxy compat routes
    "/api/settings/oneproxy",
    "/api/settings/oneproxy/",
    "/api/settings/oneproxy/rotate",
  ];

  for (const route of LOCAL_ONLY_ROUTES) {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      assert.equal(
        isLocalOnlyPath(route, method),
        true,
        `Route ${method} ${route} must be classified as LOCAL_ONLY`
      );
    }
  }

  // Non-local routes must not be falsely marked LOCAL_ONLY
  assert.equal(isLocalOnlyPath("/api/settings"), false);
  assert.equal(isLocalOnlyPath("/api/providers"), false);
  assert.equal(isLocalOnlyPath("/api/combos"), false);
});

test("Proxy registry and free-proxy routes require management auth", async () => {
  process.env.INITIAL_PASSWORD = "test-password";
  process.env.REQUIRE_API_KEY = "true";
  try {
    const req = new Request("http://localhost/api/settings/proxies", {
      headers: { Authorization: "Bearer invalid-key" },
    });
    const res = await proxiesRoute.GET(req);
    assert.ok(res.status === 401 || res.status === 403);

    const freeReq = new Request("http://localhost/api/settings/free-proxies", {
      headers: { Authorization: "Bearer invalid-key" },
    });
    const freeRes = await freeProxiesRoute.GET(freeReq);
    assert.ok(freeRes.status === 401 || freeRes.status === 403);

    const proxySetReq = new Request("http://localhost/api/settings/proxy", {
      headers: { Authorization: "Bearer invalid-key" },
    });
    const proxySetRes = await proxySettingsRoute.GET(proxySetReq);
    assert.ok(proxySetRes.status === 401 || proxySetRes.status === 403);
  } finally {
    delete process.env.INITIAL_PASSWORD;
    delete process.env.REQUIRE_API_KEY;
  }
});

// ── 8. Documentation & Non-Goal File Checks ─────────────────────────────────

test("docs/security/PROXY_TRUST.md exists and documents core non-goals", () => {
  const docPath = path.resolve(process.cwd(), "docs/security/PROXY_TRUST.md");
  assert.ok(fs.existsSync(docPath), "PROXY_TRUST.md must exist on disk");

  const content = fs.readFileSync(docPath, "utf-8");
  assert.ok(content.includes("Non-Goal 1: No Shipped or Default-Enabled Free Proxy List"));
  assert.ok(content.includes("Non-Goal 2: Free-Pool Providers are Staging-Only & Untrusted"));
  assert.ok(content.includes("Bring-Your-Own (BYO) Proxies"));
  assert.ok(content.includes("Server-Side Request Forgery (SSRF) Hardening"));
  assert.ok(content.includes("Hard Rule #20"));
  assert.ok(content.includes("isPrivateHost"));
});

test("AGENTS.md and DocumentationTab reference PROXY_TRUST.md", () => {
  const agentsPath = path.resolve(process.cwd(), "AGENTS.md");
  const agentsContent = fs.readFileSync(agentsPath, "utf-8");
  assert.ok(agentsContent.includes("docs/security/PROXY_TRUST.md"));

  const docTabPath = path.resolve(
    process.cwd(),
    "src/app/(dashboard)/dashboard/settings/components/proxy/DocumentationTab.tsx"
  );
  const docTabContent = fs.readFileSync(docTabPath, "utf-8");
  assert.ok(docTabContent.includes("docs/security/PROXY_TRUST.md"));
});

// ── 9. Direct DB Helper & Lifecycle DNS Rebinding Protections (P0) ──────────

test("promoteFreeProxyToPool rejects DNS rebinding host with injected resolver and leaves registry clean", async () => {
  const { id } = await freeProxiesDb.upsertFreeProxy({
    source: "1proxy",
    host: "rebind.free.local",
    port: 8080,
    type: "http",
    countryCode: null,
    qualityScore: null,
    latencyMs: null,
    anonymity: null,
    lastValidated: null,
  });

  const promotedId = await freeProxiesDb.promoteFreeProxyToPool(
    id,
    {
      name: "Rebind Promote Attempt",
      type: "http",
      host: "rebind.free.local",
      port: 8080,
      source: "1proxy",
    },
    {
      lookup: async () => [{ address: "127.0.0.1", family: 4 }],
    }
  );

  assert.equal(promotedId, null, "promoteFreeProxyToPool must return null on rebinding");
  const proxies = await proxiesDb.listProxies();
  assert.equal(proxies.length, 0, "No proxy_registry row must be written on rebinding");
  const freeProxy = await freeProxiesDb.getFreeProxyById(id);
  assert.equal(freeProxy?.inPool, false, "free_proxies.in_pool must remain false");
});

test("promoteFreeProxyToPool accepts valid public host with injected resolver", async () => {
  const { id } = await freeProxiesDb.upsertFreeProxy({
    source: "1proxy",
    host: "valid.free.example.com",
    port: 8080,
    type: "http",
    countryCode: null,
    qualityScore: null,
    latencyMs: null,
    anonymity: null,
    lastValidated: null,
  });

  const promotedId = await freeProxiesDb.promoteFreeProxyToPool(
    id,
    {
      name: "Valid Promote",
      type: "http",
      host: "valid.free.example.com",
      port: 8080,
      source: "1proxy",
    },
    {
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
    }
  );

  assert.ok(promotedId, "promoteFreeProxyToPool must return id for valid public host");
  const proxies = await proxiesDb.listProxies();
  assert.equal(proxies.length, 1);
  const freeProxy = await freeProxiesDb.getFreeProxyById(id);
  assert.equal(freeProxy?.inPool, true);
  assert.equal(freeProxy?.poolProxyId, promotedId);
});

test("createProxy rejects literal private IP addresses directly at DB boundary", async () => {
  await assert.rejects(
    proxiesDb.createProxy({ name: "Loopback", type: "http", host: "127.0.0.1", port: 8080 }),
    /private|loopback|local/i
  );
  await assert.rejects(
    proxiesDb.createProxy({ name: "RFC1918", type: "http", host: "10.0.0.1", port: 8080 }),
    /private|loopback|local/i
  );
  await assert.rejects(
    proxiesDb.createProxy({ name: "IMDS", type: "http", host: "169.254.169.254", port: 8080 }),
    /private|loopback|local/i
  );
  await assert.rejects(
    proxiesDb.createProxy({ name: "IPv6-ULA", type: "http", host: "fc00::1", port: 8080 }),
    /private|loopback|local/i
  );
  await assert.rejects(
    proxiesDb.createProxy({ name: "Localhost", type: "http", host: "localhost", port: 8080 }),
    /private|loopback|local/i
  );

  const proxies = await proxiesDb.listProxies();
  assert.equal(proxies.length, 0, "No rows written on rejected createProxy");
});

test("createProxy rejects DNS rebinding host and writes zero rows", async () => {
  await assert.rejects(
    proxiesDb.createProxy(
      { name: "Rebind", type: "http", host: "rebind.example.com", port: 8080 },
      { lookup: async () => [{ address: "192.168.1.1", family: 4 }] }
    ),
    /DNS rebinding|blocked private/i
  );

  const proxies = await proxiesDb.listProxies();
  assert.equal(proxies.length, 0, "Zero rows written on DNS rebinding rejection");
});

test("createProxyAndAssign rejects private and DNS rebinding hosts", async () => {
  await assert.rejects(
    proxiesDb.createProxyAndAssign(
      { name: "P1", type: "http", host: "127.0.0.1", port: 8080 },
      { scope: "global" }
    ),
    /private|loopback|local/i
  );

  await assert.rejects(
    proxiesDb.createProxyAndAssign(
      { name: "P2", type: "http", host: "rebind.example.com", port: 8080 },
      { scope: "global" },
      { lookup: async () => [{ address: "10.0.0.1", family: 4 }] }
    ),
    /DNS rebinding|blocked private/i
  );

  const proxies = await proxiesDb.listProxies();
  assert.equal(proxies.length, 0);
});

test("updateProxy and updateProxyAndAssign reject updating to private or rebinding host", async () => {
  const created = await proxiesDb.createProxy({
    name: "Valid Proxy",
    type: "http",
    host: "198.51.100.1",
    port: 8080,
  });
  assert.ok(created?.id);

  await assert.rejects(
    proxiesDb.updateProxy(created.id, { host: "127.0.0.1" }),
    /private|loopback|local/i
  );

  await assert.rejects(
    proxiesDb.updateProxy(
      created.id,
      { host: "rebind.example.com" },
      { lookup: async () => [{ address: "172.16.0.1", family: 4 }] }
    ),
    /DNS rebinding|blocked private/i
  );

  await assert.rejects(
    proxiesDb.updateProxyAndAssign(
      created.id,
      { host: "10.0.0.1" },
      { scope: "provider", scopeId: "openai" }
    ),
    /private|loopback|local/i
  );

  const current = await proxiesDb.getProxyById(created.id);
  assert.equal(current?.host, "198.51.100.1", "Host must remain unchanged after rejected updates");
});

test("migrateLegacyProxyConfigToRegistry skips private and rebinding legacy records while migrating valid ones", async () => {
  await settingsDb.setProxyForLevel("global", null, {
    type: "http",
    host: "127.0.0.1",
    port: 8080,
  });
  await settingsDb.setProxyForLevel("provider", "openai", {
    type: "https",
    host: "198.51.100.10",
    port: 443,
  });

  const result = await proxiesDb.migrateLegacyProxyConfigToRegistry();
  assert.equal(result.skipped, false);
  assert.equal(result.migrated, 1, "Only the public provider proxy should be migrated");

  const proxies = await proxiesDb.listProxies();
  assert.equal(proxies.length, 1);
  assert.equal(proxies[0].host, "198.51.100.10");
});

// ── 10. Runtime Dispatcher & Stored-Proxy Runtime Protection (P0) ────────────

test("createProxyDispatcher throws for private, loopback, link-local, and metadata URLs", () => {
  const privateUrls = [
    "http://127.0.0.1:8080",
    "http://10.0.0.1:8080",
    "http://192.168.1.1:8080",
    "http://172.16.0.1:8080",
    "http://169.254.169.254:8080",
    "http://localhost:8080",
    "http://test.localhost:8080",
    "http://proxy.local:8080",
    "http://metadata.google.internal:8080",
    "socks5://127.0.0.1:1080",
  ];

  for (const url of privateUrls) {
    assert.throws(
      () => proxyDispatcher.createProxyDispatcher(url),
      /Proxy host cannot be a private or local address/i,
      `createProxyDispatcher must throw for ${url}`
    );
  }
});

test("proxyConfigToUrl throws for proxy config objects with private host", () => {
  assert.throws(
    () => proxyDispatcher.proxyConfigToUrl({ type: "http", host: "127.0.0.1", port: 8080 }),
    /Proxy host cannot be a private or local address/i
  );
  assert.throws(
    () => proxyDispatcher.proxyConfigToUrl({ type: "socks5", host: "10.0.0.1", port: 1080 }),
    /Proxy host cannot be a private or local address/i
  );
  assert.throws(
    () => proxyDispatcher.proxyConfigToUrl({ type: "http", host: "169.254.169.254", port: 8080 }),
    /Proxy host cannot be a private or local address/i
  );
});

test("validateProxyPool marks pre-existing rebinding proxy as error and refuses egress probe", async () => {
  // Raw direct insert simulating pre-existing or bypassed DB record
  const db = core.getDbInstance();
  const id = "preexisting-rebind-id";
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO proxy_registry
      (id, name, type, host, port, username, password, region, notes, status, source, family, created_at, updated_at)
      VALUES (?, 'Pre-existing Rebind', 'http', 'rebind-stored.example.com', 8080, '', '', NULL, NULL, 'active', 'manual', 'auto', ?, ?)`
  ).run(id, now, now);

  setGlobalProxyLookupForTests(async (name) => {
    if (name === "rebind-stored.example.com") return [{ address: "127.0.0.1", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  });

  let networkProbed = false;
  proxyEgress._setEgressProbeForTests(async () => {
    networkProbed = true;
    return { ip: "203.0.113.1", latencyMs: 10 };
  });

  try {
    const report = await proxyEgress.validateProxyPool();
    assert.equal(report.length, 1);
    assert.equal(report[0].proxyId, id);
    assert.equal(report[0].alive, false);
    assert.equal(report[0].newStatus, "error");
    assert.equal(networkProbed, false, "Egress network probe must NOT be executed for rebinding host");

    const updated = await proxiesDb.getProxyById(id);
    assert.equal(updated?.status, "error");
  } finally {
    proxyEgress._setEgressProbeForTests(null);
  }
});

test("diagnoseAllEgressIps reports error for connection with rebinding proxy without network probe", async () => {
  setGlobalProxyLookupForTests(async (name) => {
    if (name === "rebinding-account.example.com") return [{ address: "10.0.0.1", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  });

  let probeCalled = false;
  proxyEgress._setEgressProbeForTests(async () => {
    probeCalled = true;
    return { ip: "203.0.113.1", latencyMs: 10 };
  });

  try {
    const diagnostic = await proxyEgress.diagnoseAllEgressIps({
      getConnections: async () => [
        { id: "conn-rebind", provider: "openai", name: "Rebind Conn" },
      ],
      resolveProxy: async () => ({
        proxy: { type: "http", host: "rebinding-account.example.com", port: 8080 },
        level: "account",
      }),
    });

    assert.equal(diagnostic.connections.length, 1);
    assert.equal(diagnostic.connections[0].egressIp, null);
    assert.ok(diagnostic.connections[0].error);
    assert.ok(/DNS rebinding|blocked private/i.test(diagnostic.connections[0].error));
    assert.equal(probeCalled, false, "Probe must not be called when host is rebinding");
  } finally {
    proxyEgress._setEgressProbeForTests(null);
  }
});

test("runWithProxyContext rejects DNS rebinding host before TCP reachability or dispatcher fetch", async () => {
  setGlobalProxyLookupForTests(async (name) => {
    if (name === "rebind-stored.example.com") return [{ address: "127.0.0.1", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  });

  let tcpCalls = 0;
  proxyHealth.__setProxyHealthTcpCheckForTesting(async () => {
    tcpCalls++;
    return true;
  });

  let dispatcherFetchCalls = 0;
  const mockUndiciFetch = async (
    _input: RequestInfo | URL,
    _init?: RequestInit & { dispatcher?: unknown }
  ): Promise<Response> => {
    dispatcherFetchCalls++;
    return new Response("ok", { status: 200 });
  };

  try {
    await assert.rejects(
      async () => {
        await proxyFetchModule.runWithProxyContext(
          { type: "http", host: "rebind-stored.example.com", port: 8080 },
          async () => {
            return proxyFetchModule.proxyFetch(
              "https://api.openai.com/v1/chat/completions",
              {},
              { undiciFetch: mockUndiciFetch }
            );
          }
        );
      },
      /DNS rebinding|blocked private/i
    );

    assert.equal(tcpCalls, 0, "Zero TCP reachability checks must be made");
    assert.equal(dispatcherFetchCalls, 0, "Zero dispatcher fetch calls must be made");
  } finally {
    proxyHealth.__setProxyHealthTcpCheckForTesting(null);
    setGlobalProxyLookupForTests(null);
  }
});

test("runWithProxyContext rejects string proxy URL with DNS rebinding host before TCP reachability or dispatcher fetch", async () => {
  setGlobalProxyLookupForTests(async (name) => {
    if (name === "rebind-stored-str.example.com") return [{ address: "127.0.0.1", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  });

  let tcpCalls = 0;
  proxyHealth.__setProxyHealthTcpCheckForTesting(async () => {
    tcpCalls++;
    return true;
  });

  let dispatcherFetchCalls = 0;
  const mockUndiciFetch = async (
    _input: RequestInfo | URL,
    _init?: RequestInit & { dispatcher?: unknown }
  ): Promise<Response> => {
    dispatcherFetchCalls++;
    return new Response("ok", { status: 200 });
  };

  try {
    await assert.rejects(
      async () => {
        await proxyFetchModule.runWithProxyContext(
          "http://rebind-stored-str.example.com:8080",
          async () => {
            return proxyFetchModule.proxyFetch(
              "https://api.openai.com/v1/chat/completions",
              {},
              { undiciFetch: mockUndiciFetch }
            );
          }
        );
      },
      /DNS rebinding|blocked private/i
    );

    assert.equal(tcpCalls, 0, "Zero TCP reachability checks must be made");
    assert.equal(dispatcherFetchCalls, 0, "Zero dispatcher fetch calls must be made");
  } finally {
    proxyHealth.__setProxyHealthTcpCheckForTesting(null);
    setGlobalProxyLookupForTests(null);
  }
});

test("runWithProxyContext accepts valid public hostname proxy when DNS resolves to public IP", async () => {
  setGlobalProxyLookupForTests(async (name) => {
    if (name === "valid-public-proxy.example.com") return [{ address: "93.184.216.34", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  });

  let tcpCalls = 0;
  proxyHealth.__setProxyHealthTcpCheckForTesting(async () => {
    tcpCalls++;
    return true;
  });

  let dispatcherFetchCalls = 0;
  const mockUndiciFetch = async (
    _input: RequestInfo | URL,
    _init?: RequestInit & { dispatcher?: unknown }
  ): Promise<Response> => {
    dispatcherFetchCalls++;
    return new Response("ok", { status: 200 });
  };

  try {
    const res = await proxyFetchModule.runWithProxyContext(
      { type: "http", host: "valid-public-proxy.example.com", port: 8080 },
      async () => {
        return proxyFetchModule.proxyFetch(
          "https://api.openai.com/v1/chat/completions",
          {},
          { undiciFetch: mockUndiciFetch }
        );
      }
    );

    assert.equal(res.status, 200);
    assert.equal(tcpCalls, 1, "TCP check is performed for reachable public proxy");
    assert.equal(dispatcherFetchCalls, 1, "Dispatcher fetch is executed for valid public proxy");
  } finally {
    proxyHealth.__setProxyHealthTcpCheckForTesting(null);
    setGlobalProxyLookupForTests(null);
  }
});

test("MimocodeExecutor getProxyDispatcher rejects per-account proxy with DNS rebinding host before dispatcher construction or network I/O", async () => {
  let lookupCalls = 0;
  setGlobalProxyLookupForTests(async (name) => {
    lookupCalls++;
    if (name === "rebind-mimo.example.com") {
      return [{ address: "127.0.0.1", family: 4 }];
    }
    return [{ address: "93.184.216.34", family: 4 }];
  });

  const testExec = new MimocodeExecutor();
  const fp = "fp-rebind-mimo-test";
  (testExec as any).accounts = [
    { fingerprint: fp, jwt: "", expiresAt: 0, cooldownUntil: 0, consecutiveFails: 0, proxy: null },
  ];
  (testExec as any).syncAccountsFromCredentials({
    providerSpecificData: {
      accountProxies: [
        {
          fingerprint: fp,
          proxy: { type: "http", host: "rebind-mimo.example.com", port: 8080 },
        },
      ],
    },
  });

  try {
    await assert.rejects(
      async () => {
        await (testExec as any).getProxyDispatcher(fp);
      },
      /DNS rebinding|blocked private/i
    );

    assert.ok(lookupCalls >= 1, "DNS lookup must be invoked to detect rebinding");

    // Also verify execute fails closed on account rebinding proxy without network calls
    const res = await testExec.execute({
      model: "mimo-auto",
      stream: false,
      body: { messages: [{ role: "user", content: "ping" }] },
      credentials: {
        providerSpecificData: {
          accountProxies: [
            {
              fingerprint: fp,
              proxy: { type: "http", host: "rebind-mimo.example.com", port: 8080 },
            },
          ],
        },
      } as any,
    });

    assert.strictEqual(res.response.status, 502);
    const errBody = await res.response.json();
    assert.ok(
      errBody?.error?.message?.includes("DNS rebinding") ||
        errBody?.error?.message?.includes("blocked private") ||
        errBody?.error?.code === "EXECUTOR_ERROR" ||
        errBody?.error?.code === "NO_ACCOUNTS"
    );
  } finally {
    setGlobalProxyLookupForTests(null);
  }
});

test("MimocodeExecutor getProxyDispatcher accepts valid public hostname proxy when DNS resolves to public IP", async () => {
  let lookupCalls = 0;
  setGlobalProxyLookupForTests(async (name) => {
    lookupCalls++;
    if (name === "valid-mimo.example.com") {
      return [{ address: "93.184.216.34", family: 4 }];
    }
    return [{ address: "93.184.216.34", family: 4 }];
  });

  const testExec = new MimocodeExecutor();
  const fp = "fp-valid-mimo-test";
  (testExec as any).accounts = [
    { fingerprint: fp, jwt: "", expiresAt: 0, cooldownUntil: 0, consecutiveFails: 0, proxy: null },
  ];
  (testExec as any).syncAccountsFromCredentials({
    providerSpecificData: {
      accountProxies: [
        {
          fingerprint: fp,
          proxy: { type: "http", host: "valid-mimo.example.com", port: 8080 },
        },
      ],
    },
  });

  try {
    const dispatcher = await (testExec as any).getProxyDispatcher(fp);
    assert.ok(dispatcher, "Dispatcher must be created for valid public proxy host");
    assert.ok(lookupCalls >= 1, "DNS lookup must be invoked");
  } finally {
    setGlobalProxyLookupForTests(null);
  }
});
