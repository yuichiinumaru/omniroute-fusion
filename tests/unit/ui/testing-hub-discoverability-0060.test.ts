/**
 * Task 0060 — Testing hub IA (reopen: no sidebar chrome for lab routes).
 * Option A: `/dashboard/testing` hub; no new primary sidebar leaf.
 * Translator / Playground / Search Tools must NOT appear in any sidebar section
 * (including debug DEVTOOLS); remain discoverable via Testing hub, command palette,
 * and direct routes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
  SIDEBAR_SECTIONS,
  countPresetVisibleLeaves,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  TESTING_HUB_GROUPS,
  TESTING_HUB_HREFS,
} from "../../../src/shared/constants/testingHub";
import { OPERATIONS_HUB_HREFS } from "../../../src/shared/constants/operationsHub";

const root = join(import.meta.dirname, "../../..");

/** Lab destinations removed from sidebar chrome (Task 0060 reopen). */
const SIDEBAR_ABSENT_LAB_IDS = ["playground", "translator", "search-tools"] as const;
const SIDEBAR_ABSENT_LAB_HREFS = [
  "/dashboard/playground",
  "/dashboard/translator",
  "/dashboard/search-tools",
] as const;

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function allRenderedSidebarLeafIds(): string[] {
  return SIDEBAR_SECTIONS.flatMap((section) =>
    getSectionItems(section).map((item) => item.id)
  );
}

function allRenderedSidebarHrefs(): string[] {
  return SIDEBAR_SECTIONS.flatMap((section) =>
    getSectionItems(section).map((item) => item.href)
  );
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
  for (const id of SIDEBAR_ABSENT_LAB_IDS) {
    const link = interactive.links.find((l) => l.id === id);
    assert.ok(link, `missing interactive hub link ${id}`);
    // Lab badge metadata only — these routes are NOT sidebar items anymore.
    assert.equal(link.isLab, true);
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

test("deep-link target routes still exist as real pages (no redirect-to-testing shells)", () => {
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

test("DEVTOOLS_ITEMS is empty — no lab routes in debug sidebar chrome", () => {
  const src = read("src/shared/constants/sidebarVisibility.ts");
  assert.ok(src.includes("DEVTOOLS_ITEMS"));
  const devtoolsBlock = src.match(
    /const DEVTOOLS_ITEMS: readonly SidebarItemDefinition\[\] = \[([\s\S]*?)\];/
  );
  assert.ok(devtoolsBlock, "DEVTOOLS_ITEMS declaration must exist");
  const blockContent = devtoolsBlock![1];
  assert.equal(blockContent.trim(), "", "DEVTOOLS_ITEMS must be an empty array");
  for (const id of SIDEBAR_ABSENT_LAB_IDS) {
    assert.equal(blockContent.includes(`id: "${id}"`), false);
  }

  const devtoolsSection = SIDEBAR_SECTIONS.find((s) => s.id === "devtools");
  assert.ok(devtoolsSection, "devtools section structure retained");
  assert.equal(getSectionItems(devtoolsSection!).length, 0);
});

test("Translator, Playground, Search Tools are absent from all sidebar sections", () => {
  const leafIds = allRenderedSidebarLeafIds();
  const hrefs = allRenderedSidebarHrefs();

  for (const id of SIDEBAR_ABSENT_LAB_IDS) {
    assert.equal(
      leafIds.includes(id),
      false,
      `${id} must not be a rendered sidebar leaf (main or debug)`
    );
    assert.equal(
      PRIMARY_SIDEBAR_ITEM_IDS.includes(id),
      false,
      `${id} must not be a primary leaf`
    );
  }
  for (const href of SIDEBAR_ABSENT_LAB_HREFS) {
    assert.equal(
      hrefs.includes(href),
      false,
      `${href} must not appear as a sidebar href`
    );
  }

  // Legacy hideable prefs may retain the ids without mounting chrome.
  for (const id of SIDEBAR_ABSENT_LAB_IDS) {
    assert.ok(
      (HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
      `hideable id "${id}" retained for stored prefs`
    );
  }
});

test("Testing hub + palette remain the discovery path for lab routes", () => {
  for (const href of SIDEBAR_ABSENT_LAB_HREFS) {
    assert.ok(TESTING_HUB_HREFS.includes(href), `hub missing ${href}`);
  }
  const palette = read("src/shared/components/CommandPalette.tsx");
  for (const href of SIDEBAR_ABSENT_LAB_HREFS) {
    assert.ok(palette.includes(`href: "${href}"`), `palette missing ${href}`);
  }
  const hubClient = read("src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx");
  assert.ok(hubClient.includes("data-testing-hub-link"));
  assert.ok(hubClient.includes("link.isLab"), "hub client must render isLab badge");
  assert.equal(
    hubClient.includes("debugSidebarOnly"),
    false,
    "stale debugSidebarOnly field must not remain in hub client"
  );
  const hubConsts = read("src/shared/constants/testingHub.ts");
  assert.equal(
    hubConsts.includes("debugSidebarOnly"),
    false,
    "stale debugSidebarOnly field must not remain in testingHub constants"
  );
  assert.ok(hubConsts.includes("isLab?: boolean") || hubConsts.includes("isLab: true"));
  // Dead export removed (parity with Task 0059 OPERATIONS_AREA_PATH_PREFIXES cleanup).
  assert.equal(
    hubConsts.includes("TESTING_AREA_PATH_PREFIXES"),
    false,
    "TESTING_AREA_PATH_PREFIXES must not be reintroduced unused"
  );
});

test("Media hub card matches generation playground (not proxy cache inspector)", () => {
  const media = TESTING_HUB_GROUPS.flatMap((g) => g.links).find((l) => l.id === "media");
  assert.ok(media);
  assert.equal(media.href, "/dashboard/cache/media");
  assert.equal(media.label, "Media");
  assert.equal(media.label.includes("Cache"), false);
  assert.equal(media.description.toLowerCase().includes("cached media"), false);
  assert.equal(media.description.toLowerCase().includes("proxy traffic"), false);
  assert.match(media.description.toLowerCase(), /generat|image|video|music|speech/);
  // Hub intro must not reintroduce stale "media cache" product copy.
  const hubClient = read("src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx");
  assert.equal(
    /media\s+cache/i.test(hubClient),
    false,
    "TestingHubClient intro must not say media cache"
  );
  assert.match(hubClient, /media\s+generation/i);
});

test("Header Testing deep routes have en.json title/description keys", () => {
  const en = JSON.parse(read("src/i18n/messages/en.json")) as {
    sidebar: Record<string, string>;
    header: Record<string, string>;
  };
  // titleKey resolves via sidebar namespace; descKey via header namespace.
  const requiredSidebar = [
    "testingNav",
    "playground",
    "translator",
    "searchTools",
    "batch",
    "batchFiles",
    "media",
    "plugins",
  ];
  for (const key of requiredSidebar) {
    assert.equal(typeof en.sidebar[key], "string", `sidebar.${key} missing`);
    assert.ok(en.sidebar[key].length > 0, `sidebar.${key} empty`);
  }
  const requiredHeader = [
    "testingDescription",
    "playgroundDescription",
    "translatorDescription",
    "searchToolsDescription",
    "batchDescription",
    "batchFilesDescription",
    "mediaDescription",
    "pluginsDescription",
  ];
  for (const key of requiredHeader) {
    assert.equal(typeof en.header[key], "string", `header.${key} missing`);
    assert.ok(en.header[key].length > 0, `header.${key} empty`);
  }
  // searchTools is a lab, not analytics-search.
  assert.equal(
    en.header.searchToolsDescription.toLowerCase().includes("cache hit"),
    false,
    "searchToolsDescription must not reuse analytics-search copy"
  );
  assert.match(en.header.searchToolsDescription.toLowerCase(), /search|provider|payload|result/);
  // media description must describe generation, not proxy cache.
  assert.match(en.header.mediaDescription.toLowerCase(), /image|video|music|generat/);
});
