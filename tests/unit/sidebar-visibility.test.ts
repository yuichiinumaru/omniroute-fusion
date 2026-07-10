import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");
const repoRoot = join(import.meta.dirname, "../..");

function sectionItems(sectionId: string) {
  const section = sidebarVisibility.SIDEBAR_SECTIONS.find(
    (candidate) => candidate.id === sectionId
  );
  assert.ok(section, `expected ${sectionId} sidebar section to exist`);
  return sidebarVisibility.getSectionItems(section);
}

test("observability sidebar: Observe hub + analytics hubs (Epic 0005 S4/S6)", () => {
  const items = sectionItems("observability");
  assert.deepEqual(
    items.map((item) => item.id),
    ["activity", "analytics", "cache", "provider-stats", "runtime"]
  );
});

test("seven pillars primary order (Epic 0005 S6)", () => {
  const sectionIds = sidebarVisibility.SIDEBAR_SECTIONS.map((section) => section.id);
  assert.deepEqual(sectionIds.slice(0, 7), [
    "core-pulse",
    "registry",
    "routing",
    "governance",
    "operations",
    "observability",
    "system",
  ]);
});

test("routing hosts combos, fusions, compression hub (no engines)", () => {
  const items = sectionItems("routing");
  assert.deepEqual(
    items.map((item) => item.id),
    [
      "combos",
      "combos-live",
      "fusions",
      "context-settings",
      "context-combos",
      "compression-studio",
      "settings-routing",
    ]
  );
  assert.deepEqual(
    items
      .filter((item) => item.id.startsWith("context-"))
      .map((item) => ({ id: item.id, href: item.href })),
    [
      { id: "context-settings", href: "/dashboard/context/settings" },
      { id: "context-combos", href: "/dashboard/context/combos" },
    ]
  );
});

test("sidebar visibility drops stale entries from saved settings", () => {
  const allSidebarItemIds = sidebarVisibility.SIDEBAR_SECTIONS.flatMap((section) =>
    sidebarVisibility.getSectionItems(section).map((item) => item.id)
  );

  assert.equal(
    (sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("auto-combo"),
    false
  );
  assert.equal((allSidebarItemIds as string[]).includes("auto-combo"), false);
  assert.equal(
    (sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("settings"),
    false
  );
  assert.equal((allSidebarItemIds as string[]).includes("settings"), false);
  assert.deepEqual(sidebarVisibility.normalizeHiddenSidebarItems(["auto-combo" as any, "logs"]), [
    "logs",
  ]);
});

test("help sidebar exposes changelog after docs and issues", () => {
  const items = sectionItems("help");
  assert.deepEqual(
    items.map((item) => ({
      id: item.id,
      href: item.href,
      i18nKey: item.i18nKey,
    })),
    [
      { id: "docs", href: "/docs", i18nKey: "docs" },
      {
        id: "issues",
        href: "https://github.com/diegosouzapw/OmniRoute/issues",
        i18nKey: "issues",
      },
      { id: "changelog", href: "/dashboard/changelog", i18nKey: "changelog" },
    ]
  );
  assert.equal(sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS.includes("changelog"), true);
});

test("plugins (marketplace) has a discoverable sidebar entry under operations (#3656)", async () => {
  const items = sectionItems("operations");
  const plugins = items.find((item) => item.id === "plugins");
  assert.ok(plugins, "expected a plugins item in the operations section");
  assert.equal(plugins.href, "/dashboard/plugins");
  assert.equal(sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS.includes("plugins"), true);

  const pluginsPage = await readFile(
    join(repoRoot, "src/app/(dashboard)/dashboard/plugins/page.tsx"),
    "utf8"
  );
  assert.doesNotMatch(pluginsPage, /^\s*redirect\(/m);
  assert.match(pluginsPage, /marketplace/i);
});

test("legacy dashboard routes redirect to their consolidated surfaces", async () => {
  const autoComboPage = await readFile(
    join(repoRoot, "src/app/(dashboard)/dashboard/auto-combo/page.tsx"),
    "utf8"
  );
  const usagePage = await readFile(
    join(repoRoot, "src/app/(dashboard)/dashboard/usage/page.tsx"),
    "utf8"
  );
  const settingsPage = await readFile(
    join(repoRoot, "src/app/(dashboard)/dashboard/settings/page.tsx"),
    "utf8"
  );

  assert.match(autoComboPage, /redirect\("\/dashboard\/combos\?filter=intelligent"\)/);
  assert.match(usagePage, /buildObserveHubPath\("request"\)|redirect\(.*activity/);
  assert.match(settingsPage, /redirect\(resolveSettingsRoute\(tab\)\)/);
  assert.match(settingsPage, /\/dashboard\/settings\/general/);

  const compressionPage = await readFile(
    join(repoRoot, "src/app/(dashboard)/dashboard/compression/page.tsx"),
    "utf8"
  );
  assert.match(compressionPage, /redirect\("\/dashboard\/context\/caveman"\)/);
});
