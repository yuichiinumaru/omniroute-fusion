import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");
const repoRoot = join(import.meta.dirname, "../..");

test("flat primary sidebar: main + debug only", () => {
  const sectionIds = sidebarVisibility.SIDEBAR_SECTIONS.map((section) => section.id);
  assert.deepEqual(sectionIds, ["main", "devtools"]);
  // Task 0059: Operations hub absorbs API Keys → 9 primary leaves
  assert.equal(sidebarVisibility.PRIMARY_SIDEBAR_ITEMS.length, 9);
  assert.equal(sidebarVisibility.countPresetVisibleLeaves("all"), 9);
});

test("primary hubs include observe + routing + providers + operations", () => {
  const ids = sidebarVisibility.PRIMARY_SIDEBAR_ITEM_IDS;
  assert.ok(ids.includes("home"));
  assert.ok(ids.includes("providers"));
  assert.ok(ids.includes("combos"));
  assert.ok(ids.includes("activity"));
  assert.ok(ids.includes("operations"));
  assert.ok(ids.includes("settings-general"));
  // API Keys absorbed into Operations hub (Task 0059)
  assert.equal(ids.includes("api-manager"), false);
  assert.equal(sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS.includes("api-manager"), true);
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
  assert.deepEqual(sidebarVisibility.normalizeHiddenSidebarItems(["auto-combo" as any, "logs"]), [
    "logs",
  ]);
});

test("plugins route remains real (marketplace) even when not a primary leaf", async () => {
  assert.equal(sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS.includes("plugins"), true);
  assert.equal(sidebarVisibility.PRIMARY_SIDEBAR_ITEM_IDS.includes("plugins"), false);

  const pluginsPage = await readFile(
    join(repoRoot, "src/app/(dashboard)/dashboard/plugins/page.tsx"),
    "utf8"
  );
  assert.doesNotMatch(pluginsPage, /^\s*redirect\(/m);
  assert.match(pluginsPage, /marketplace/i);
});

test("changelog remains hideable deep surface", () => {
  assert.equal(sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS.includes("changelog"), true);
  assert.equal(sidebarVisibility.PRIMARY_SIDEBAR_ITEM_IDS.includes("changelog"), false);
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
  // Settings hub SSoT (Task 0054): default via buildSettingsPath("general") or literal path
  assert.match(
    settingsPage,
    /buildSettingsPath\(["']general["']\)|\/dashboard\/settings\/general/
  );

  const compressionPage = await readFile(
    join(repoRoot, "src/app/(dashboard)/dashboard/compression/page.tsx"),
    "utf8"
  );
  // Task 0058: compression hub entry points at context settings (not a mode page)
  assert.match(compressionPage, /redirect\("\/dashboard\/context\/settings"\)/);
});

test("icon accents are neutral", () => {
  assert.equal(sidebarVisibility.getSidebarIconAccent("providers"), "currentColor");
  assert.equal(sidebarVisibility.getSidebarIconAccent("analytics"), "currentColor");
});
