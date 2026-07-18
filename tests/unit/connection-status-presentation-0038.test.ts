/**
 * Epic 0007 Task 0038 — wire-shape tests for ProviderCard / ConnectionRow
 * presentation adapters. Exercises the exact props shapes the UI passes into
 * `resolveProviderCardAuthStatusCopy` / `resolveConnectionErrorDisplay`
 * (component shallow render not required — pure adapters document the wire).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  connectionStatusToneToBadgeVariant,
  mapProviderCardAuthTypeToCredentialMode,
  resolveConnectionErrorDisplay,
  resolveProviderCardAuthStatusCopy,
  shouldShowProviderCardAuthStatusBadge,
} from "../../src/shared/utils/connectionStatusPresentation.ts";
import { CONNECTION_STATUS_COPY_IDS } from "../../src/shared/utils/connectionStatusCopy.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const OAUTH_FORBIDDEN =
  /refresh\s*token|re-?authenticat|oauth|sign\s*in\s*(again)?|log\s*in\s*(again)?/i;

// ── ProviderCard stats shape (page.tsx getProviderStats → ProviderCard) ─────

test("ProviderCard shape: apikey + no_refresh_token → Retest badge, no OAuth primary", () => {
  // Exact fields page.tsx now attaches for the helper.
  const stats = {
    authType: "apikey",
    expiryStatus: "expired" as const,
    rawErrorCode: "no_refresh_token",
    lastErrorType: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
    latestTestStatus: "expired",
  };

  assert.equal(shouldShowProviderCardAuthStatusBadge(stats), true);
  const copy = resolveProviderCardAuthStatusCopy(stats);
  assert.ok(copy);
  assert.equal(copy!.id, CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken);
  assert.doesNotMatch(copy!.badge, OAUTH_FORBIDDEN);
  assert.doesNotMatch(copy!.cta, OAUTH_FORBIDDEN);
  assert.doesNotMatch(copy!.title, OAUTH_FORBIDDEN);
  assert.doesNotMatch(copy!.detail, /re-?authenticate this account/i);
  assert.match(copy!.badge, /re-?test|key|issue/i);
  assert.equal(connectionStatusToneToBadgeVariant(copy!.tone), "warning");
});

test("ProviderCard shape: oauth + no_refresh_token → Re-auth badge allowed", () => {
  const copy = resolveProviderCardAuthStatusCopy({
    authType: "oauth",
    expiryStatus: "expired",
    rawErrorCode: "no_refresh_token",
    lastErrorType: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
    latestTestStatus: "expired",
  });
  assert.ok(copy);
  assert.equal(copy!.id, CONNECTION_STATUS_COPY_IDS.oauthNoRefreshToken);
  assert.match(copy!.cta, /re-?authenticat/i);
  assert.match(copy!.badge, /re-?auth|auth/i);
  assert.equal(connectionStatusToneToBadgeVariant(copy!.tone), "error");
});

test("ProviderCard shape: compatible category + no_refresh_token is apikey path (not oauth)", () => {
  assert.equal(mapProviderCardAuthTypeToCredentialMode("compatible"), "apikey");
  const copy = resolveProviderCardAuthStatusCopy({
    authType: "compatible",
    expiryStatus: "expired",
    rawErrorCode: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
  });
  assert.ok(copy);
  assert.equal(copy!.id, CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken);
  assert.doesNotMatch(copy!.cta, OAUTH_FORBIDDEN);
});

test("ProviderCard shape: healthy / no error → no auth-status badge", () => {
  assert.equal(
    shouldShowProviderCardAuthStatusBadge({
      authType: "apikey",
      expiryStatus: null,
      latestTestStatus: "active",
    }),
    false
  );
  assert.equal(
    resolveProviderCardAuthStatusCopy({
      authType: "oauth",
      expiryStatus: "expiring_soon",
      latestTestStatus: "active",
    }),
    null
  );
});

test("ProviderCard shape: web-cookie category maps to cookie mode", () => {
  assert.equal(mapProviderCardAuthTypeToCredentialMode("web-cookie"), "cookie");
  const copy = resolveProviderCardAuthStatusCopy({
    authType: "web-cookie",
    rawErrorCode: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
  });
  assert.ok(copy);
  assert.equal(copy!.id, CONNECTION_STATUS_COPY_IDS.cookieUpdate);
  assert.match(copy!.cta, /cookie/i);
});

// ── ConnectionRow lastError display ─────────────────────────────────────────

test("ConnectionRow: apikey lastError OAuth sentence rewritten to retest copy", () => {
  const display = resolveConnectionErrorDisplay({
    authType: "apikey",
    testStatus: "expired",
    errorCode: "no_refresh_token",
    lastErrorType: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
  });
  assert.ok(display);
  assert.equal(display!.rewritten, true);
  assert.doesNotMatch(display!.text, /re-?authenticate this account/i);
  assert.match(display!.text, /API-key|re-?test|key/i);
  assert.doesNotMatch(display!.title, /re-?authenticate this account/i);
});

test("ConnectionRow: oauth lastError keeps re-auth capable raw text", () => {
  const raw = "No refresh token available — re-authenticate this account.";
  const display = resolveConnectionErrorDisplay({
    authType: "oauth",
    testStatus: "expired",
    errorCode: "no_refresh_token",
    lastErrorType: "no_refresh_token",
    lastError: raw,
  });
  assert.ok(display);
  assert.equal(display!.rewritten, false);
  assert.equal(display!.text, raw);
  assert.match(display!.copy?.cta ?? "", /re-?authenticat/i);
});

// ── Source wiring guards (no sidebar / uses helper) ─────────────────────────

test("ProviderCard.tsx wires resolveProviderCardAuthStatusCopy (not only expiredBadge)", () => {
  const src = readFileSync(
    join(ROOT, "src/app/(dashboard)/dashboard/providers/components/ProviderCard.tsx"),
    "utf8"
  );
  assert.match(src, /resolveProviderCardAuthStatusCopy/);
  assert.match(src, /translateConnectionStatusCopy/);
  assert.match(src, /connectionStatusPresentation/);
  assert.doesNotMatch(src, /PRIMARY_SIDEBAR_ITEMS/);
  // Dead expiredBadge fallback removed (Task 0038 N4).
  assert.doesNotMatch(src, /!authStatusCopy && stats\.expiryStatus === ["']expired["']/);
});

test("ProviderListRow.tsx wires resolveProviderCardAuthStatusCopy (Task 0038 N5)", () => {
  const src = readFileSync(
    join(ROOT, "src/app/(dashboard)/dashboard/providers/components/ProviderListRow.tsx"),
    "utf8"
  );
  assert.match(src, /resolveProviderCardAuthStatusCopy/);
  assert.match(src, /translateConnectionStatusCopy/);
  assert.doesNotMatch(src, /PRIMARY_SIDEBAR_ITEMS/);
});

test("providers/page.tsx passes rawErrorCode / lastErrorType into stats", () => {
  const src = readFileSync(
    join(ROOT, "src/app/(dashboard)/dashboard/providers/page.tsx"),
    "utf8"
  );
  assert.match(src, /rawErrorCode/);
  assert.match(src, /lastErrorType/);
  assert.match(src, /latestTestStatus/);
});

test("ConnectionRow.tsx wires resolveConnectionErrorDisplay", () => {
  const src = readFileSync(
    join(
      ROOT,
      "src/app/(dashboard)/dashboard/providers/[id]/components/ConnectionRow.tsx"
    ),
    "utf8"
  );
  assert.match(src, /resolveConnectionErrorDisplay/);
  assert.match(src, /connectionErrorDisplay/);
});

test("0038 does not touch sidebarVisibility or ProviderLimits", () => {
  // Static guard: presentation module must not import sidebar / limits widgets.
  const presentation = readFileSync(
    join(ROOT, "src/shared/utils/connectionStatusPresentation.ts"),
    "utf8"
  );
  assert.doesNotMatch(presentation, /sidebarVisibility|ProviderLimits|PRIMARY_SIDEBAR/);
  const card = readFileSync(
    join(ROOT, "src/app/(dashboard)/dashboard/providers/components/ProviderCard.tsx"),
    "utf8"
  );
  assert.doesNotMatch(card, /sidebarVisibility|PRIMARY_SIDEBAR/);
});
