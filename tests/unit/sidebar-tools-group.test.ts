/**
 * Tools inventory under Operations hub (Task 0059 / 0025 path-to-100).
 * Flat chrome no longer mounts an "operations" accordion or TOOLS_GROUP
 * array in sidebarVisibility — Operations hub is the SSoT for tool destinations.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OPERATIONS_HUB_GROUPS, OPERATIONS_HUB_HREFS } from "../../src/shared/constants/operationsHub";
import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
} from "../../src/shared/constants/sidebarVisibility";

const root = join(import.meta.dirname, "../..");
const sidebarSrc = readFileSync(join(root, "src/shared/constants/sidebarVisibility.ts"), "utf8");

const TOOL_HREFS = [
  "/dashboard/cli-code",
  "/dashboard/cli-agents",
  "/dashboard/acp-agents",
  "/dashboard/cloud-agents",
  "/dashboard/tools/agent-bridge",
  "/dashboard/tools/traffic-inspector",
] as const;

const TOOL_IDS = [
  "cli-code",
  "cli-agents",
  "acp-agents",
  "cloud-agents",
  "agent-bridge",
  "traffic-inspector",
] as const;

test("TOOLS_GROUP dead inventory is not reintroduced in sidebarVisibility", () => {
  assert.equal(
    /const TOOLS_GROUP: SidebarItemGroup/.test(sidebarSrc),
    false,
    "TOOLS_GROUP must stay deleted (use Operations hub)"
  );
});

test("Operations hub agents group covers CLI/agent tool destinations", () => {
  const agents = OPERATIONS_HUB_GROUPS.find((g) => g.id === "agents");
  assert.ok(agents);
  const hrefs = agents.links.map((l) => l.href);
  for (const href of [
    "/dashboard/cli-code",
    "/dashboard/cli-agents",
    "/dashboard/acp-agents",
    "/dashboard/cloud-agents",
    "/dashboard/tools/agent-bridge",
  ]) {
    assert.ok(hrefs.includes(href), `agents group missing ${href}`);
  }
});

test("Operations hub integrations cover traffic-inspector", () => {
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/tools/traffic-inspector"));
});

test("tool destinations remain hideable, not primary peers", () => {
  for (const id of TOOL_IDS) {
    assert.ok(
      (HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
      `expected hideable "${id}"`
    );
    assert.equal(
      PRIMARY_SIDEBAR_ITEM_IDS.includes(id),
      false,
      `"${id}" must not be a primary peer`
    );
  }
});

test("Operations hub does not reintroduce legacy cli-tools or agents ids", () => {
  const linkIds = OPERATIONS_HUB_GROUPS.flatMap((g) => g.links.map((l) => l.id));
  assert.equal(linkIds.includes("cli-tools"), false);
  assert.equal(linkIds.includes("agents"), false);
});

test("all plan-14 tool hrefs are reachable from Operations hub", () => {
  for (const href of TOOL_HREFS) {
    assert.ok(OPERATIONS_HUB_HREFS.includes(href), `hub missing ${href}`);
  }
});
