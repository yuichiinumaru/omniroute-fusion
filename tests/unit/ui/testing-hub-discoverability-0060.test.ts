/**
 * Task 0060 — Testing hub IA (rewritten for EPIC-20 / 0099 retire).
 * Labs remain absent from sidebar chrome; discovery is Ops Labs/Media + palette.
 * `/dashboard/testing` redirects to Labs — not a living product hub.
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
  TESTING_HUB_CANONICAL_PATH,
  TESTING_HUB_GROUPS,
  TESTING_HUB_HREFS,
  TESTING_HUB_LEGACY_HREFS,
} from "../../../src/shared/constants/testingHub";
import { OPERATIONS_HUB_HREFS } from "../../../src/shared/constants/operationsHub";
import { buildOperationsPath } from "../../../src/shared/constants/epic20Operations";

const root = join(import.meta.dirname, "../../..");

/** Lab destinations removed from sidebar chrome (Task 0060 reopen). */
const SIDEBAR_ABSENT_LAB_IDS = ["playground", "translator", "search-tools"] as const;
const SIDEBAR_ABSENT_LAB_HREFS = [
  "/dashboard/playground",
  "/dashboard/translator",
  "/dashboard/search-tools",
] as const;

const LABS = buildOperationsPath("labs");
const MEDIA = buildOperationsPath("media");
const INTEGRATIONS = buildOperationsPath("integrations");

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
  // Task 0082 / EPIC-19: 7 primary leaves (analytics + costs dropped)
  assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("testing"));
});

test("Operations primary leaf and count remain intact after Task 0060", () => {
  const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
  assert.ok(ops);
  assert.equal(ops.href, "/operations");
  assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("home"));
  const home = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "home");
  assert.ok(home);
  assert.equal(home.labelFallback, "Dashboard");
});

test("Testing absorb map (0099) points seven surfaces at Ops Labs/Media/Integrations", () => {
  assert.equal(TESTING_HUB_CANONICAL_PATH, LABS);
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
    assert.equal(link.isLab, true);
    assert.equal(link.href, LABS);
  }

  assert.ok(TESTING_HUB_HREFS.includes(LABS));
  assert.ok(TESTING_HUB_HREFS.includes(MEDIA));
  assert.ok(TESTING_HUB_HREFS.includes(INTEGRATIONS));
});

test("testing page is redirect-only shell to Labs (0099)", () => {
  const page = read("src/app/(dashboard)/dashboard/testing/page.tsx");
  assert.ok(page.includes("redirect("));
  assert.ok(
    page.includes("TESTING_HUB_CANONICAL_PATH") || page.includes('buildOperationsPath("labs")')
  );
  assert.equal(page.includes("TestingHubClient"), false);
});

test("legacy lab routes redirect to Ops (not back to Testing hub)", () => {
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

test("CommandPalette discovers Labs/Media via Ops builders (0099)", () => {
  const src = read("src/shared/components/CommandPalette.tsx");
  assert.ok(src.includes("testingHubExtras"));
  assert.ok(src.includes('buildOperationsPath("labs")'));
  assert.ok(src.includes('buildOperationsPath("media")'));
  assert.ok(src.includes('buildOperationsPath("integrations")'));
  assert.equal(src.includes('href: "/dashboard/testing"'), false);
  assert.equal(src.includes('href: "/dashboard/playground"'), false);
});

test("Operations hub deep-links Labs (not Testing) for discoverability", () => {
  assert.ok(OPERATIONS_HUB_HREFS.includes(LABS) || OPERATIONS_HUB_HREFS.includes("/operations/labs"));
  assert.ok(OPERATIONS_HUB_HREFS.includes(MEDIA) || OPERATIONS_HUB_HREFS.includes("/operations/media"));
  assert.equal(OPERATIONS_HUB_HREFS.includes("/dashboard/testing"), false);
});

test("Header maps Labs/Testing deep destinations (TESTING_DEEP_HEADER_META)", () => {
  const src = read("src/shared/components/Header.tsx");
  assert.ok(src.includes("TESTING_DEEP_HEADER_META"));
  assert.ok(src.includes('titleFallback: "Labs"') || src.includes('titleFallback: "Testing"'));
  assert.ok(
    src.includes("/dashboard/testing") || src.includes("/operations/labs"),
    "Header must still match testing or labs path"
  );
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

test("Ops Labs + palette remain the discovery path for lab routes (0099)", () => {
  assert.ok(OPERATIONS_HUB_HREFS.includes(LABS) || OPERATIONS_HUB_HREFS.includes("/operations/labs"));
  const palette = read("src/shared/components/CommandPalette.tsx");
  assert.ok(palette.includes('buildOperationsPath("labs")'));
  assert.ok(palette.includes("testingHubExtras"));

  const hubConsts = read("src/shared/constants/testingHub.ts");
  assert.equal(
    hubConsts.includes("debugSidebarOnly"),
    false,
    "stale debugSidebarOnly field must not remain in testingHub constants"
  );
  assert.ok(hubConsts.includes("isLab?: boolean") || hubConsts.includes("isLab: true"));
  assert.ok(/RETIRED|retired|0099/i.test(hubConsts));
  assert.equal(
    hubConsts.includes("TESTING_AREA_PATH_PREFIXES"),
    false,
    "TESTING_AREA_PATH_PREFIXES must not be reintroduced unused"
  );
  assert.ok(TESTING_HUB_LEGACY_HREFS.includes("/dashboard/testing"));
});

test("Media absorb map matches generation lab (Ops Media peer)", () => {
  const media = TESTING_HUB_GROUPS.flatMap((g) => g.links).find((l) => l.id === "media");
  assert.ok(media);
  assert.equal(media.href, MEDIA);
  assert.equal(media.label, "Media");
  assert.equal(media.label.includes("Cache"), false);
  assert.equal(media.description.toLowerCase().includes("cached media"), false);
  assert.equal(media.description.toLowerCase().includes("proxy traffic"), false);
  assert.match(media.description.toLowerCase(), /generat|image|video|music|speech/);
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
