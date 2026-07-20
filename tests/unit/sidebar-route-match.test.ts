import test from "node:test";
import assert from "node:assert/strict";

const {
  getActiveSidebarHref,
  matchesSidebarHref,
  resolveSidebarHubAlias,
  SIDEBAR_ACTIVE_HUB_ALIASES,
} = await import("../../src/shared/utils/sidebarRouteMatch.ts");

/** Minimal PRIMARY-like items (mirrors live PRIMARY_SIDEBAR_ITEMS hrefs). */
const PRIMARY_ITEMS = [
  { id: "home", href: "/home", exact: true },
  { id: "providers", href: "/dashboard/providers" },
  { id: "combos", href: "/dashboard/combos" },
  { id: "activity", href: "/dashboard/activity" },
  { id: "operations", href: "/dashboard/operations" },
  { id: "settings-general", href: "/dashboard/settings/general" },
  { id: "docs", href: "/docs", external: true },
] as const;

test("matchesSidebarHref respects exact routes and segment boundaries", () => {
  assert.equal(matchesSidebarHref("/dashboard", "/dashboard", true), true);
  assert.equal(matchesSidebarHref("/dashboard/cache", "/dashboard", true), false);
  assert.equal(matchesSidebarHref("/dashboard/cache/media", "/dashboard/cache"), true);
  assert.equal(matchesSidebarHref("/dashboard/cachex", "/dashboard/cache"), false);
});

test("getActiveSidebarHref prefers the most specific sidebar entry", () => {
  const items = [
    { href: "/dashboard/cache" },
    { href: "/dashboard/cache/media" },
    { href: "/dashboard/limits" },
  ];

  assert.equal(getActiveSidebarHref("/dashboard/cache/media", items), "/dashboard/cache/media");
  assert.equal(getActiveSidebarHref("/dashboard/cache", items), "/dashboard/cache");
  assert.equal(getActiveSidebarHref("/dashboard/cache/entries", items), "/dashboard/cache");
  assert.equal(getActiveSidebarHref("/dashboard/limits", items), "/dashboard/limits");
});

test("SIDEBAR_ACTIVE_HUB_ALIASES is an explicit SSoT table (path → primary leaf)", () => {
  assert.ok(Array.isArray(SIDEBAR_ACTIVE_HUB_ALIASES));
  assert.ok(SIDEBAR_ACTIVE_HUB_ALIASES.length >= 4);

  const byPrefix = new Map(
    SIDEBAR_ACTIVE_HUB_ALIASES.map((a) => [a.pathPrefix, a] as const)
  );

  assert.equal(byPrefix.get("/dashboard/fusions")?.primaryLeafId, "combos");
  assert.equal(byPrefix.get("/dashboard/fusions")?.primaryHref, "/dashboard/combos");
  assert.equal(byPrefix.get("/dashboard/compression")?.primaryLeafId, "combos");
  assert.equal(byPrefix.get("/dashboard/context")?.primaryLeafId, "combos");
  assert.equal(byPrefix.get("/dashboard/health")?.primaryLeafId, "activity");
  assert.equal(byPrefix.get("/dashboard/health")?.primaryHref, "/dashboard/activity");
});

// ─── EPIC-19 T19-G / 0084: Routing + Observe deep-route active matrix ────────

const ROUTING_PATHS = [
  "/dashboard/fusions",
  "/dashboard/fusions/new",
  "/dashboard/fusions/abc-123",
  "/dashboard/compression/studio",
  "/dashboard/context/settings",
  "/dashboard/context/combos",
  "/dashboard/context/caveman",
  "/dashboard/combos",
  "/dashboard/combos/live",
] as const;

const OBSERVE_PATHS = [
  "/dashboard/health",
  "/dashboard/activity",
  // pathname only (query panel/source stripped by usePathname) — still Observe hub root
] as const;

test("resolveSidebarHubAlias maps Routing pillar siblings → combos", () => {
  assert.deepEqual(resolveSidebarHubAlias("/dashboard/fusions"), {
    primaryLeafId: "combos",
    primaryHref: "/dashboard/combos",
  });
  assert.deepEqual(resolveSidebarHubAlias("/dashboard/fusions/new"), {
    primaryLeafId: "combos",
    primaryHref: "/dashboard/combos",
  });
  assert.deepEqual(resolveSidebarHubAlias("/dashboard/compression/studio"), {
    primaryLeafId: "combos",
    primaryHref: "/dashboard/combos",
  });
  assert.deepEqual(resolveSidebarHubAlias("/dashboard/context/settings"), {
    primaryLeafId: "combos",
    primaryHref: "/dashboard/combos",
  });
  assert.deepEqual(resolveSidebarHubAlias("/dashboard/context/rtk"), {
    primaryLeafId: "combos",
    primaryHref: "/dashboard/combos",
  });
});

test("resolveSidebarHubAlias maps Observe health → activity", () => {
  assert.deepEqual(resolveSidebarHubAlias("/dashboard/health"), {
    primaryLeafId: "activity",
    primaryHref: "/dashboard/activity",
  });
  // Paths already under the primary leaf do not need aliases
  assert.equal(resolveSidebarHubAlias("/dashboard/activity"), null);
  assert.equal(resolveSidebarHubAlias("/dashboard/combos"), null);
  assert.equal(resolveSidebarHubAlias("/dashboard/combos/live"), null);
});

test("getActiveSidebarHref: Routing deep routes light combos (Routing leaf)", () => {
  for (const path of ROUTING_PATHS) {
    assert.equal(
      getActiveSidebarHref(path, [...PRIMARY_ITEMS]),
      "/dashboard/combos",
      `expected Routing active for ${path}`
    );
  }
});

test("getActiveSidebarHref: Observe deep routes light activity (Observe leaf)", () => {
  for (const path of OBSERVE_PATHS) {
    assert.equal(
      getActiveSidebarHref(path, [...PRIMARY_ITEMS]),
      "/dashboard/activity",
      `expected Observe active for ${path}`
    );
  }
});

test("anti-phantom: Routing/Observe deep routes do not light providers or home", () => {
  const deepPaths = [
    "/dashboard/fusions",
    "/dashboard/compression/studio",
    "/dashboard/context/settings",
    "/dashboard/health",
    "/dashboard/activity",
    "/dashboard/combos/live",
  ];

  for (const path of deepPaths) {
    const active = getActiveSidebarHref(path, [...PRIMARY_ITEMS]);
    assert.notEqual(active, "/home", `home must not be active for ${path}`);
    assert.notEqual(active, "/dashboard/providers", `providers must not be active for ${path}`);
    assert.notEqual(active, "/dashboard/operations", `operations must not be active for ${path}`);
    assert.notEqual(
      active,
      "/dashboard/settings/general",
      `settings must not be active for ${path}`
    );
  }
});

test("anti-phantom: providers path still lights providers, not combos/activity", () => {
  assert.equal(
    getActiveSidebarHref("/dashboard/providers", [...PRIMARY_ITEMS]),
    "/dashboard/providers"
  );
  assert.equal(
    getActiveSidebarHref("/dashboard/providers/budget", [...PRIMARY_ITEMS]),
    "/dashboard/providers"
  );
});

test("hub alias is ignored when target primary leaf is not in visible items", () => {
  const withoutRouting = PRIMARY_ITEMS.filter((i) => i.id !== "combos");
  assert.equal(getActiveSidebarHref("/dashboard/fusions", [...withoutRouting]), null);

  const withoutObserve = PRIMARY_ITEMS.filter((i) => i.id !== "activity");
  assert.equal(getActiveSidebarHref("/dashboard/health", [...withoutObserve]), null);
});

test("null/empty pathname yields no active href", () => {
  assert.equal(getActiveSidebarHref(null, [...PRIMARY_ITEMS]), null);
  assert.equal(getActiveSidebarHref(undefined, [...PRIMARY_ITEMS]), null);
  assert.equal(getActiveSidebarHref("", [...PRIMARY_ITEMS]), null);
  assert.equal(resolveSidebarHubAlias(null), null);
});
