/**
 * Task 0035 — dual-mode refresh policy audit (source + pure gate).
 *
 * Asserts connection-scoped refresh decision sites use the shared
 * connectionAuthMode helpers rather than provider-only supportsTokenRefresh
 * or raw `authType === "oauth"` string checks for expiry / manual refresh.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");

async function readSrc(rel: string): Promise<string> {
  return readFile(path.join(root, rel), "utf8");
}

test("tokenHealthCheck #5326 gate uses shouldMarkNoRefreshExpired + supportsTokenRefresh", async () => {
  const src = await readSrc("src/lib/tokenHealthCheck.ts");
  assert.match(src, /shouldMarkNoRefreshExpired\s*\(/);
  assert.match(src, /supportsTokenRefresh\s*\(\s*conn\.provider\s*\)/);
  assert.match(src, /from\s+["']@\/shared\/utils\/connectionAuthMode["']/);
  // Must not mark expired from supportsTokenRefresh alone without the gate helper.
  assert.doesNotMatch(
    src,
    /if\s*\(\s*supportsTokenRefresh\s*\(\s*conn\.provider\s*\)\s*&&\s*!conn\.refreshToken/
  );
});

test("manual refresh route uses connectionUsesOAuthRefresh (not raw authType === oauth only)", async () => {
  const src = await readSrc("src/app/api/providers/[id]/refresh/route.ts");
  assert.match(src, /connectionUsesOAuthRefresh/);
  assert.match(src, /isLongLivedImportCredential/);
  assert.match(src, /from\s+["']@\/shared\/utils\/connectionAuthMode["']/);
  // Dual-mode-blind exact-string gate must not be the sole OAuth check.
  assert.doesNotMatch(src, /if\s*\(\s*connection\.authType\s*!==\s*["']oauth["']\s*\)/);
});

test("connection test route normalizes auth mode for dual-mode dispatch", async () => {
  const src = await readSrc("src/app/api/providers/[id]/test/route.ts");
  assert.match(src, /normalizeAuthType/);
  assert.match(src, /connectionUsesOAuthRefresh/);
  assert.match(src, /isLongLivedImportCredential/);
  assert.match(src, /from\s+["']@\/shared\/utils\/connectionAuthMode["']/);
});

test("token-health API filters with connectionUsesOAuthRefresh", async () => {
  const src = await readSrc("src/app/api/token-health/route.ts");
  assert.match(src, /connectionUsesOAuthRefresh/);
  assert.match(src, /from\s+["']@\/shared\/utils\/connectionAuthMode["']/);
});

test("supportsTokenRefresh documents provider-only policy (necessary not sufficient)", async () => {
  const src = await readSrc("open-sse/services/tokenRefresh.ts");
  assert.match(src, /necessary but \*\*not\s+sufficient\*\*|necessary but not sufficient/i);
  assert.match(src, /connectionUsesOAuthRefresh/);
  // Windsurf long-lived path remains documented on refreshWindsurfToken.
  assert.match(src, /long-lived/i);
  assert.match(src, /isLongLivedImportCredential/);
});

test("createProviderConnection default oauth foot-gun is documented", async () => {
  const src = await readSrc("src/lib/db/providers.ts");
  assert.match(src, /FOOT-GUN/);
  assert.match(src, /authType:\s*data\.authType\s*\|\|\s*["']oauth["']/);
});
