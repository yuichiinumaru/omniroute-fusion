/**
 * Task 0076 — Operations/Testing reverse chrome decision contract.
 * Product decision **D1**: hubs are intentional one-way launchpads.
 * Encode absence of reverse subnav (anti half-implementation phantom).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PRIMARY_SIDEBAR_ITEM_IDS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OPERATIONS_HUB_HREFS,
} from "../../../src/shared/constants/operationsHub";
import {
  TESTING_HUB_HREFS,
} from "../../../src/shared/constants/testingHub";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

/** Map hub href → page source under dashboard (for absence matrix). */
function hrefToPageRel(href: string): string | null {
  if (!href.startsWith("/dashboard/")) return null;
  // Strip query/hash so catalog deep-links still resolve to a page.tsx peer.
  const pathOnly = href.split("?")[0].split("#")[0];
  const rest = pathOnly.slice("/dashboard/".length);
  if (!rest) return null;
  return `src/app/(dashboard)/dashboard/${rest}/page.tsx`;
}

const FORBIDDEN_REVERSE_TOKENS = [
  "OperationsHubSubnav",
  "TestingHubSubnav",
  "HubBackStrip",
  "data-ops-hub-back",
  "data-testing-hub-back",
  "data-hub-back-strip",
] as const;

test("D1 decision is documented in UI.md reverse-chrome section (Task 0076)", () => {
  const ui = read("docs/guides/UI.md");
  assert.ok(
    ui.includes("## Hub reverse chrome") || ui.includes("## Hub reverse chrome "),
    "UI.md must have Hub reverse chrome section"
  );
  assert.ok(ui.includes("0076"), "UI.md reverse-chrome section must cite task 0076");
  assert.ok(
    /D1|one-way|launchpad/i.test(ui),
    "UI.md must record D1 / one-way / launchpad policy"
  );
  assert.ok(
    ui.includes("Operations") && ui.includes("Testing"),
    "UI.md policy must name Operations and Testing hubs"
  );
  // Must not claim reverse chrome exists on peers when D1 omits it.
  assert.equal(
    /Operations destinations (have|mount) reverse/i.test(ui),
    false,
    "UI.md must not claim Operations peers have reverse chrome under D1"
  );
});

test("no OperationsHubSubnav / TestingHubSubnav / HubBackStrip component required", () => {
  for (const name of [
    "src/shared/components/OperationsHubSubnav.tsx",
    "src/shared/components/TestingHubSubnav.tsx",
    "src/shared/components/HubBackStrip.tsx",
  ]) {
    assert.equal(
      existsSync(join(root, name)),
      false,
      `D1 forbids shared reverse component ${name}`
    );
  }
});

test("Operations hub destination peers intentionally omit reverse hub chrome", () => {
  const expectedPeers = OPERATIONS_HUB_HREFS.filter(
    (href) => href !== "/dashboard/operations" && href !== "/dashboard/testing"
  );
  const checked: string[] = [];
  const missingPages: string[] = [];
  for (const href of expectedPeers) {
    const rel = hrefToPageRel(href);
    if (!rel || !existsSync(join(root, rel))) {
      missingPages.push(href);
      continue;
    }
    const src = read(rel);
    checked.push(rel);
    for (const token of FORBIDDEN_REVERSE_TOKENS) {
      assert.equal(
        src.includes(token),
        false,
        `${rel} must not half-mount reverse chrome token ${token} (D1)`
      );
    }
    // No "Back to Operations" reverse strip pattern on destination pages.
    assert.equal(
      /back to operations/i.test(src),
      false,
      `${rel} must not mount Back-to-Operations reverse chrome (D1)`
    );
  }
  assert.deepEqual(
    missingPages,
    [],
    `every Operations destination href must resolve to a page.tsx (missing: ${missingPages.join(", ")})`
  );
  assert.equal(
    checked.length,
    expectedPeers.length,
    `Ops absence matrix must cover all non-hub OPERATIONS_HUB_HREFS (got ${checked.length}/${expectedPeers.length})`
  );
});

test("Testing hub destination peers intentionally omit reverse hub chrome", () => {
  const checked: string[] = [];
  const missingPages: string[] = [];
  for (const href of TESTING_HUB_HREFS) {
    const rel = hrefToPageRel(href);
    if (!rel || !existsSync(join(root, rel))) {
      missingPages.push(href);
      continue;
    }
    const src = read(rel);
    checked.push(rel);
    for (const token of FORBIDDEN_REVERSE_TOKENS) {
      assert.equal(
        src.includes(token),
        false,
        `${rel} must not half-mount reverse chrome token ${token} (D1)`
      );
    }
    assert.equal(
      /back to testing/i.test(src),
      false,
      `${rel} must not mount Back-to-Testing reverse chrome (D1)`
    );
  }
  assert.deepEqual(
    missingPages,
    [],
    `every Testing destination href must resolve to a page.tsx (missing: ${missingPages.join(", ")})`
  );
  assert.equal(
    checked.length,
    TESTING_HUB_HREFS.length,
    `Testing absence matrix must cover all TESTING_HUB_HREFS (got ${checked.length}/${TESTING_HUB_HREFS.length})`
  );
});

test("hub inventories still list Operations and Testing destinations (0059/0060)", () => {
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/api-manager"));
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/mcp"));
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/testing"));
  assert.ok(TESTING_HUB_HREFS.includes("/dashboard/playground"));
  assert.ok(TESTING_HUB_HREFS.includes("/dashboard/translator"));
  assert.ok(TESTING_HUB_HREFS.includes("/dashboard/batch"));

  const opsClient = read(
    "src/app/(dashboard)/dashboard/operations/OperationsHubClient.tsx"
  );
  const testingClient = read(
    "src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx"
  );
  assert.ok(opsClient.includes("OPERATIONS_HUB_GROUPS"));
  assert.ok(testingClient.includes("TESTING_HUB_GROUPS"));
});

test("CommandPalette still discovers hub destinations under D1", () => {
  const src = read("src/shared/components/CommandPalette.tsx");
  assert.ok(src.includes("operationsHubExtras") || src.includes("/dashboard/operations"));
  assert.ok(src.includes("testingHubExtras") || src.includes("/dashboard/testing"));
  assert.ok(src.includes('href: "/dashboard/api-manager"'));
  assert.ok(src.includes('href: "/dashboard/playground"'));
});

test("anti-new-leaf + labs absent from primary (relative, not forever-9)", () => {
  for (const id of ["fusions", "playground", "translator", "search-tools", "testing"] as const) {
    assert.equal(
      PRIMARY_SIDEBAR_ITEM_IDS.includes(id),
      false,
      `${id} must not be a primary sidebar leaf`
    );
  }
  // Operations remains the primary leaf for return path under D1.
  assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("operations"));

  const sidebar = read("src/shared/constants/sidebarVisibility.ts");
  const devtoolsBlock = sidebar.match(
    /const DEVTOOLS_ITEMS: readonly SidebarItemDefinition\[\] = \[([\s\S]*?)\];/
  );
  assert.ok(devtoolsBlock);
  assert.equal(devtoolsBlock![1].trim(), "", "DEVTOOLS_ITEMS must stay empty (0060)");
});

test("operationsHub + testingHub SSoT comments point at D1 / Task 0076", () => {
  const ops = read("src/shared/constants/operationsHub.ts");
  const testing = read("src/shared/constants/testingHub.ts");
  assert.ok(
    /0076|one-way|launchpad|reverse chrome/i.test(ops),
    "operationsHub.ts should document reverse-chrome decision pointer"
  );
  assert.ok(
    /0076|one-way|launchpad|reverse chrome/i.test(testing),
    "testingHub.ts should document reverse-chrome decision pointer"
  );
});
