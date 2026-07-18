/**
 * Task 0060 — Testing hub IA.
 * Option A: `/dashboard/testing` hub; no new primary sidebar leaf.
 * Debug-only pages remain debug-gated in sidebar chrome but always linked from hub.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
  countPresetVisibleLeaves,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  TESTING_HUB_GROUPS,
  TESTING_HUB_HREFS,
} from "../../../src/shared/constants/testingHub";
import { OPERATIONS_HUB_HREFS } from "../../../src/shared/constants/operationsHub";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("Testing is not a primary sidebar leaf (primary-nav budget)", () => {
  assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("testing"), false);
  assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 9);
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("testing"));
});

test("Operations primary leaf and count remain intact after Task 0060", () => {
  const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
  assert.ok(ops);
  assert.equal(ops.href, "/dashboard/operations");
  assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("home"));
  const home = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "home");
  assert.ok(home);
  assert.equal(home.labelFallback, "Dashboard");
});

test("Testing hub exposes all seven Task 0060 target routes", () => {
  const required = [
    "/dashboard/playground",
    "/dashboard/cache/media",
    "/dashboard/translator",
    "/dashboard/batch",
    "/dashboard/batch/files",
    "/dashboard/plugins",
    "/dashboard/search-tools",
  ];
  for (const href of required) {
    assert.ok(TESTING_HUB_HREFS.includes(href), `Testing hub missing href: ${href}`);
  }
  assert.equal(TESTING_HUB_GROUPS.length, 3);
  assert.deepEqual(
    TESTING_HUB_GROUPS.map((g) => g.id),
    ["interactive", "batch-media", "extensions"]
  );

  const interactive = TESTING_HUB_GROUPS.find((g) => g.id === "interactive");
  assert.ok(interactive);
  for (const id of ["playground", "translator", "search-tools"] as const) {
    const link = interactive.links.find((l) => l.id === id);
    assert.ok(link, `missing interactive link ${id}`);
    assert.equal(link.debugSidebarOnly, true);
  }
});

test("testing page and client exist and compose hub groups", () => {
  const page = read("src/app/(dashboard)/dashboard/testing/page.tsx");
  assert.ok(page.includes("TestingHubClient"));
  const client = read("src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx");
  assert.ok(client.includes("TESTING_HUB_GROUPS"));
  assert.ok(client.includes('data-testid="testing-hub"'));
  assert.ok(client.includes("data-testing-hub-link"));
  assert.ok(TESTING_HUB_HREFS.includes("/dashboard/playground"));
  assert.ok(TESTING_HUB_HREFS.includes("/dashboard/batch"));
  assert.ok(TESTING_HUB_HREFS.includes("/dashboard/plugins"));
});

test("deep-link target routes still exist as real pages (no redirect-only shells)", () => {
  for (const rel of [
    "src/app/(dashboard)/dashboard/playground/page.tsx",
    "src/app/(dashboard)/dashboard/cache/media/page.tsx",
    "src/app/(dashboard)/dashboard/translator/page.tsx",
    "src/app/(dashboard)/dashboard/batch/page.tsx",
    "src/app/(dashboard)/dashboard/batch/files/page.tsx",
    "src/app/(dashboard)/dashboard/plugins/page.tsx",
    "src/app/(dashboard)/dashboard/search-tools/page.tsx",
  ]) {
    const src = read(rel);
    assert.ok(src.length > 20, `expected non-empty ${rel}`);
    assert.equal(src.includes('redirect("/dashboard/testing")'), false, rel);
  }
});

test("role presets still keep ≤10 primary leaves", () => {
  assert.ok(countPresetVisibleLeaves("minimal") <= 10);
  assert.ok(countPresetVisibleLeaves("developer") <= 10);
  assert.equal(countPresetVisibleLeaves("admin"), PRIMARY_SIDEBAR_ITEM_IDS.length);
});

test("CommandPalette includes Testing hub and lab destinations", () => {
  const src = read("src/shared/components/CommandPalette.tsx");
  assert.ok(src.includes("testingHubExtras"));
  assert.ok(src.includes('href: "/dashboard/testing"'));
  assert.ok(src.includes('href: "/dashboard/playground"'));
  assert.ok(src.includes('href: "/dashboard/translator"'));
  assert.ok(src.includes('href: "/dashboard/search-tools"'));
  assert.ok(src.includes('href: "/dashboard/batch"'));
  assert.ok(src.includes('href: "/dashboard/plugins"'));
});

test("Operations hub cross-links Testing for discoverability", () => {
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/testing"));
});

test("Header maps Testing hub deep destinations", () => {
  const src = read("src/shared/components/Header.tsx");
  assert.ok(src.includes("TESTING_DEEP_HEADER_META"));
  assert.ok(src.includes('titleFallback: "Testing"'));
  assert.ok(src.includes('match: (p) => p === "/dashboard/testing"'));
});

test("DevTools sidebar chrome does not render or list Translator, Playground, or Search Tools", () => {
  const src = read("src/shared/constants/sidebarVisibility.ts");
  // Keep the structure for compatibility, but ensure they are not listed in DEVTOOLS_ITEMS anymore
  assert.ok(src.includes("DEVTOOLS_ITEMS"));
  const devtoolsBlock = src.match(/const DEVTOOLS_ITEMS: readonly SidebarItemDefinition\[\] = \[([\s\S]*?)\];/);
  if (devtoolsBlock) {
    const blockContent = devtoolsBlock[1];
    assert.equal(blockContent.includes('id: "playground"'), false);
    assert.equal(blockContent.includes('id: "translator"'), false);
    assert.equal(blockContent.includes('id: "search-tools"'), false);
  } else {
    // If it is shortened to empty array `[]`
    assert.ok(src.includes("DEVTOOLS_ITEMS: readonly SidebarItemDefinition[] = [];"));
  }
});
