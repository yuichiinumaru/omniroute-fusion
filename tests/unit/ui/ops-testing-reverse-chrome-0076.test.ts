/**
 * Task 0076 — Operations reverse chrome decision contract (updated 0099).
 * Product decision **D1**: hubs are intentional one-way launchpads.
 * Testing hub retired (0099) — Labs/Media are Ops topbar peers, not reverse chrome.
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
  TESTING_HUB_LEGACY_HREFS,
} from "../../../src/shared/constants/testingHub";
import { buildOperationsPath } from "../../../src/shared/constants/epic20Operations";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

/** Map hub href → page source (for absence matrix). Supports EPIC-20 `/operations/*`. */
function hrefToPageRel(href: string): string | null {
  // Strip query/hash so catalog / fusion deep-links still resolve to a page.tsx peer.
  const pathOnly = href.split("?")[0].split("#")[0];
  if (pathOnly.startsWith("/operations/")) {
    const rest = pathOnly.slice("/operations/".length);
    if (!rest) return null;
    const staticPeer = `src/app/(dashboard)/operations/${rest}/page.tsx`;
    if (existsSync(join(root, staticPeer))) return staticPeer;
    // Dynamic segment host (0087+) until peer fusion mounts a static page.
    return "src/app/(dashboard)/operations/[segment]/page.tsx";
  }
  if (pathOnly === "/operations") {
    return "src/app/(dashboard)/operations/page.tsx";
  }
  if (!pathOnly.startsWith("/dashboard/")) return null;
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

test("D1 decision is documented in UI.md reverse-chrome section (Task 0076 + 0099)", () => {
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
    ui.includes("Operations") && /Testing/i.test(ui),
    "UI.md policy must name Operations and Testing"
  );
  assert.ok(
    /retired|absorb/i.test(ui),
    "UI.md must note Testing retire/absorb (0099)"
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

test("absorbed lab destinations intentionally omit Testing reverse chrome", () => {
  // Canonical Ops paths from absorb map + legacy redirect shells
  const destinations = [
    ...new Set([
      ...TESTING_HUB_HREFS,
      ...TESTING_HUB_LEGACY_HREFS.filter((h) => h !== "/dashboard/testing"),
    ]),
  ];
  const checked: string[] = [];
  const missingPages: string[] = [];
  for (const href of destinations) {
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
    `every absorbed lab destination must resolve to a page.tsx (missing: ${missingPages.join(", ")})`
  );
  assert.ok(checked.length > 0, "must check at least one lab destination");
});

test("hub inventories: Ops deep-links Labs; Testing is not Ops card (0099)", () => {
  assert.ok(
    OPERATIONS_HUB_HREFS.includes("/operations/endpoints") ||
      OPERATIONS_HUB_HREFS.some((h) => h.includes("endpoints"))
  );
  assert.ok(
    OPERATIONS_HUB_HREFS.includes("/operations/core-mcp") ||
      OPERATIONS_HUB_HREFS.some((h) => h.includes("core-mcp"))
  );
  assert.equal(OPERATIONS_HUB_HREFS.includes("/dashboard/testing"), false);
  assert.ok(
    OPERATIONS_HUB_HREFS.includes(buildOperationsPath("labs")) ||
      OPERATIONS_HUB_HREFS.includes("/operations/labs")
  );
  assert.ok(TESTING_HUB_HREFS.includes(buildOperationsPath("labs")));
  assert.ok(TESTING_HUB_HREFS.includes(buildOperationsPath("media")));

  // EPIC-20: hub client lives under /operations shell
  const opsClient = read("src/app/(dashboard)/operations/OperationsHubClient.tsx");
  assert.ok(opsClient.includes("OPERATIONS_HUB_GROUPS"));
  // Testing client is archive stub only
  const testingClient = read(
    "src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx"
  );
  assert.ok(/@deprecated|RETIRED|retired/i.test(testingClient));
});

test("CommandPalette still discovers lab destinations under D1 (Ops paths)", () => {
  const src = read("src/shared/components/CommandPalette.tsx");
  assert.ok(
    src.includes("operationsHubExtras") ||
      src.includes("/dashboard/operations") ||
      src.includes("/operations")
  );
  assert.ok(
    src.includes("testingHubExtras") ||
      src.includes('buildOperationsPath("labs")')
  );
  // Discovery may use builders or legacy paths that redirect into fusion
  assert.ok(
    src.includes('href: "/dashboard/api-manager"') ||
      src.includes("api-manager") ||
      src.includes("buildOperationsPath") ||
      src.includes("endpoints")
  );
  assert.ok(
    src.includes('buildOperationsPath("labs")') ||
      src.includes("/operations/labs")
  );
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

test("operationsHub + testingHub SSoT comments point at D1 / Task 0076 (+ 0099)", () => {
  const ops = read("src/shared/constants/operationsHub.ts");
  const testing = read("src/shared/constants/testingHub.ts");
  assert.ok(
    /0076|one-way|launchpad|reverse chrome/i.test(ops),
    "operationsHub.ts should document reverse-chrome decision pointer"
  );
  assert.ok(
    /0076|one-way|launchpad|reverse chrome|RETIRED|0099/i.test(testing),
    "testingHub.ts should document reverse-chrome / retire decision pointer"
  );
});
