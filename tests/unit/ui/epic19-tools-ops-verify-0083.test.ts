/**
 * Task 0083 / EPIC-19 T19-F — Tools → Operations verify-only (rewritten for 0099).
 * Wave3 A1–A5: labs stay under Ops topbar Labs/Media (not Testing hub);
 * no new Tools/Labs/Testing primary leaf; DEVTOOLS stays empty of labs.
 *
 * EPIC-20 / 0099: Testing hub retired → Labs; discovery contracts updated.
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
  TESTING_HUB_CANONICAL_PATH,
  TESTING_HUB_GROUPS,
  TESTING_HUB_HREFS,
} from "../../../src/shared/constants/testingHub";
import { EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS } from "../../../src/shared/constants/epic19Rebalance";
import { buildOperationsPath } from "../../../src/shared/constants/epic20Operations";

const root = join(import.meta.dirname, "../../..");

/** Wave3 A1–A5 lab ids: not primary, not DEVTOOLS; live on Ops Labs peer. */
const LAB_IDS = ["playground", "translator", "search-tools"] as const;
const FORBIDDEN_TOOLS_PRIMARY_IDS = [
  "playground",
  "translator",
  "search-tools",
  "testing",
  "tools",
  "labs",
] as const;

const LABS = buildOperationsPath("labs");
const MEDIA = buildOperationsPath("media");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

// ─── A3 / Ops → Labs discoverability (0099 replaces Testing card) ────────────

test("A3: OPERATIONS_HUB_HREFS includes Labs peer (Testing retired)", () => {
  assert.ok(
    OPERATIONS_HUB_HREFS.includes(LABS) || OPERATIONS_HUB_HREFS.includes("/operations/labs"),
    "Operations hub must deep-link Labs (EPIC-20 Testing retire)"
  );
  assert.equal(
    OPERATIONS_HUB_HREFS.includes("/dashboard/testing"),
    false,
    "Operations hub must not keep Testing card after 0099"
  );

  const integrations = OPERATIONS_HUB_GROUPS.find((g) => g.id === "integrations");
  assert.ok(integrations, "integrations group must exist");
  const labsCard = integrations.links.find((l) => l.id === "labs");
  assert.ok(labsCard, "integrations must include labs card");
  assert.equal(labsCard.href, LABS);
  assert.equal(
    integrations.links.some((l) => l.id === "testing"),
    false,
    "integrations must not include testing card"
  );
});

// ─── A2 / Labs absorb inventory ──────────────────────────────────────────────

test("A2: absorb map includes playground, translator, search-tools → Labs", () => {
  assert.equal(TESTING_HUB_CANONICAL_PATH, LABS);
  const interactive = TESTING_HUB_GROUPS.find((g) => g.id === "interactive");
  assert.ok(interactive, "interactive group must exist");
  for (const id of LAB_IDS) {
    const link = interactive.links.find((l) => l.id === id);
    assert.ok(link, `interactive lab link missing: ${id}`);
    assert.equal(link.isLab, true, `${id} must be marked isLab`);
    assert.equal(link.href, LABS);
  }
  assert.ok(TESTING_HUB_HREFS.includes(LABS));
});

test("absorb map still exposes batch + media destinations (Ops Labs/Media)", () => {
  const batch = TESTING_HUB_GROUPS.flatMap((g) => g.links).find((l) => l.id === "batch");
  const media = TESTING_HUB_GROUPS.flatMap((g) => g.links).find((l) => l.id === "media");
  assert.ok(batch);
  assert.equal(batch.href, LABS);
  assert.ok(media);
  assert.equal(media.href, MEDIA);
  assert.ok(
    OPERATIONS_HUB_HREFS.includes(MEDIA) || OPERATIONS_HUB_HREFS.includes("/operations/media")
  );
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

// ─── Palette discoverability (Ops paths — no orphan Testing home) ────────────

test("CommandPalette surfaces Labs/Media via Ops builders (0099)", () => {
  const palette = read("src/shared/components/CommandPalette.tsx");
  assert.ok(
    palette.includes("testingHubExtras"),
    "CommandPalette must keep testingHubExtras injection (0060 discoverability id)"
  );
  assert.ok(
    palette.includes('buildOperationsPath("labs")'),
    "palette must deep-link Labs builder"
  );
  assert.ok(
    palette.includes('buildOperationsPath("media")'),
    "palette must deep-link Media builder"
  );
  assert.equal(
    palette.includes('href: "/dashboard/testing"'),
    false,
    "palette must not keep /dashboard/testing as product home"
  );
});

// ─── Docs honesty: Tools→Ops absorb (0099 supersedes interim Testing home) ───

test("UI.md documents Tools → Operations absorb (Labs/Media, Testing retired)", () => {
  const ui = read("docs/guides/UI.md");
  assert.ok(
    /## Tools\s*→\s*Operations/i.test(ui),
    "UI.md must own Tools → Operations section"
  );
  assert.ok(
    /Labs|Media/i.test(ui) && /retired|absorb/i.test(ui),
    "UI.md must state Labs/Media home and Testing retire/absorb"
  );
  assert.ok(
    /0\s+new\s+primary\s+leaves?|no new primary leaf|not a first-class primary|never re-add/i.test(
      ui
    ),
    "UI.md Tools section must forbid new primary Tools/Labs leaf"
  );
  assert.ok(
    ui.includes("0083") || ui.includes("EPIC-19") || ui.includes("0099") || ui.includes("EPIC-20"),
    "cite 0083/0099 or EPIC-19/20"
  );
});

test("NAV-TREE does not claim labs as L0 primary peers", () => {
  const nav = read("docs/architecture/NAV-TREE-TARGET.md");
  // Must not claim labs are primary L0 peers.
  assert.equal(
    /L0\s*\|\s*(Playground|Translator|Search Tools|Labs)/i.test(nav),
    false,
    "NAV-TREE must not list labs as L0 primary rows"
  );
});
