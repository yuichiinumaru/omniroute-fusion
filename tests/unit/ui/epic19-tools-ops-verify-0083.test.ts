/**
 * Task 0083 / EPIC-19 T19-F — Tools → Operations verify-only.
 * Wave3 A1–A5 re-check after 0082 primary cutover: labs stay under Ops → Testing;
 * no new Tools/Labs/Testing primary leaf; DEVTOOLS stays empty of labs.
 *
 * Product code is out of scope unless Operations→Testing card is missing (regression).
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
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OPERATIONS_HUB_GROUPS,
  OPERATIONS_HUB_HREFS,
} from "../../../src/shared/constants/operationsHub";
import {
  TESTING_HUB_GROUPS,
  TESTING_HUB_HREFS,
} from "../../../src/shared/constants/testingHub";
import { EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS } from "../../../src/shared/constants/epic19Rebalance";

const root = join(import.meta.dirname, "../../..");

/** Wave3 A1–A5 lab ids: not primary, not DEVTOOLS; live on Testing hub. */
const LAB_IDS = ["playground", "translator", "search-tools"] as const;
const LAB_HREFS = [
  "/dashboard/playground",
  "/dashboard/translator",
  "/dashboard/search-tools",
] as const;
const FORBIDDEN_TOOLS_PRIMARY_IDS = [
  "playground",
  "translator",
  "search-tools",
  "testing",
  "tools",
  "labs",
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

// ─── A3 / Ops → Testing discoverability ──────────────────────────────────────

test("A3: OPERATIONS_HUB_HREFS includes Testing hub (/dashboard/testing)", () => {
  assert.ok(
    OPERATIONS_HUB_HREFS.includes("/dashboard/testing"),
    "Operations hub must cross-link Testing (EPIC-19 Tools→Ops interim)"
  );

  const integrations = OPERATIONS_HUB_GROUPS.find((g) => g.id === "integrations");
  assert.ok(integrations, "integrations group must exist");
  const testingCard = integrations.links.find((l) => l.id === "testing");
  assert.ok(testingCard, "integrations must include testing card");
  assert.equal(testingCard.href, "/dashboard/testing");
});

// ─── A2 / Testing hub lab inventory ──────────────────────────────────────────

test("A2: TESTING_HUB_HREFS includes playground, translator, search-tools labs", () => {
  for (const href of LAB_HREFS) {
    assert.ok(TESTING_HUB_HREFS.includes(href), `Testing hub missing lab href: ${href}`);
  }

  const interactive = TESTING_HUB_GROUPS.find((g) => g.id === "interactive");
  assert.ok(interactive, "interactive group must exist");
  for (const id of LAB_IDS) {
    const link = interactive.links.find((l) => l.id === id);
    assert.ok(link, `interactive lab link missing: ${id}`);
    assert.equal(link.isLab, true, `${id} must be marked isLab`);
  }
});

test("Testing hub still exposes batch + media lab destinations (Ops→Testing depth)", () => {
  for (const href of ["/dashboard/batch", "/dashboard/cache/media"] as const) {
    assert.ok(
      TESTING_HUB_HREFS.includes(href),
      `Testing hub missing batch/media href: ${href}`
    );
  }
});

// ─── A1 / A4 / A5 — no primary Tools / Labs / Testing leaf ───────────────────

test("A1/A4/A5: PRIMARY excludes playground, translator, search-tools, testing, tools, labs", () => {
  const primaryIds = PRIMARY_SIDEBAR_ITEM_IDS as readonly string[];
  for (const id of FORBIDDEN_TOOLS_PRIMARY_IDS) {
    assert.equal(
      primaryIds.includes(id),
      false,
      `primary must not include tools/labs id=${id}`
    );
  }
  for (const id of EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS) {
    assert.equal(
      primaryIds.includes(id),
      false,
      `EPIC19_FORBIDDEN primary leak: ${id}`
    );
  }
  // Post-0082 chrome is 7 leaves; Tools did not spend a freed slot.
  assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
  assert.ok(primaryIds.includes("operations"), "operations primary leaf retained");
});

// ─── DEVTOOLS empty of labs ──────────────────────────────────────────────────

test("DEVTOOLS_ITEMS does not list the three labs as default chrome", () => {
  const src = read("src/shared/constants/sidebarVisibility.ts");
  const match = src.match(
    /const DEVTOOLS_ITEMS: readonly SidebarItemDefinition\[\] = \[([\s\S]*?)\];/
  );
  assert.ok(match, "DEVTOOLS_ITEMS declaration must exist");
  const block = match[1];
  assert.equal(block.trim(), "", "DEVTOOLS_ITEMS must remain empty array");
  for (const id of LAB_IDS) {
    assert.equal(block.includes(`id: "${id}"`), false, `devtools must not list ${id}`);
  }

  const devtools = SIDEBAR_SECTIONS.find((s) => s.id === "devtools");
  assert.ok(devtools);
  assert.equal(getSectionItems(devtools!).length, 0);
});

// ─── Hideable archive-not-delete for Testing + labs ──────────────────────────

test("hideable ids still include testing + three labs (archive-not-delete prefs)", () => {
  const hideable = HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[];
  assert.ok(hideable.includes("testing"), "hideable must retain testing");
  for (const id of LAB_IDS) {
    assert.ok(hideable.includes(id), `hideable must retain lab id=${id}`);
  }
});

// ─── Palette discoverability (no orphan path) ────────────────────────────────

test("CommandPalette still surfaces Testing hub + three labs", () => {
  const palette = read("src/shared/components/CommandPalette.tsx");
  assert.ok(
    palette.includes("testingHubExtras"),
    "CommandPalette must keep testingHubExtras injection (0060/0083 discoverability)"
  );
  assert.ok(
    palette.includes('href: "/dashboard/testing"'),
    "palette missing Testing hub href"
  );
  for (const href of LAB_HREFS) {
    assert.ok(palette.includes(`href: "${href}"`), `palette missing ${href}`);
  }
});

// ─── Docs honesty: Tools→Ops interim only ────────────────────────────────────

test("UI.md has Tools → Operations (interim) honesty (Task 0083)", () => {
  const ui = read("docs/guides/UI.md");
  assert.ok(
    /## Tools\s*→\s*Operations\s*\(interim\)/i.test(ui) ||
      ui.includes("## Tools → Operations (interim)"),
    "UI.md must own ## Tools → Operations (interim)"
  );
  assert.ok(
    /Operations\s*→\s*Testing/i.test(ui) || ui.includes("Operations → Testing"),
    "UI.md must state Tools interim home is Operations → Testing"
  );
  assert.ok(
    /0\s+new\s+primary\s+leaves?|no new primary leaf|not a first-class primary|never re-add/i.test(
      ui
    ),
    "UI.md Tools interim must forbid new primary Tools/Labs leaf"
  );
  assert.ok(ui.includes("0083") || ui.includes("EPIC-19"), "cite 0083 or EPIC-19");
});

test("NAV-TREE states labs under Operations → Testing (not orphan / debug-only only)", () => {
  const nav = read("docs/architecture/NAV-TREE-TARGET.md");
  assert.ok(
    /Operations\s*→\s*Testing/i.test(nav) || nav.includes("Operations → Testing"),
    "NAV-TREE must cite Operations → Testing path for tools labs"
  );
  // Must not claim labs are primary L0 peers.
  assert.equal(
    /L0\s*\|\s*(Playground|Translator|Search Tools|Labs)/i.test(nav),
    false,
    "NAV-TREE must not list labs as L0 primary rows"
  );
});
