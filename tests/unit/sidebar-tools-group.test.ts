/**
 * Tools inventory under Operations hub (Task 0059 / 0025 path-to-100).
 * Flat chrome no longer mounts an "operations" accordion or TOOLS_GROUP
 * array in sidebarVisibility — Operations hub is the SSoT for tool destinations.
 * EPIC-20: agent destinations use Ops topbar deep links (0090–0092 / 0099).
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
import { buildOperationsPath } from "../../src/shared/constants/epic20Operations";

const root = join(import.meta.dirname, "../..");
const sidebarSrc = readFileSync(join(root, "src/shared/constants/sidebarVisibility.ts"), "utf8");

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

test("Operations hub agents group covers CLI/agent tool destinations (Ops paths)", () => {
  const agents = OPERATIONS_HUB_GROUPS.find((g) => g.id === "agents");
  assert.ok(agents);
  const hrefs = agents.links.map((l) => l.href);
  for (const href of [
    `${buildOperationsPath("agents")}#cli-code`,
    `${buildOperationsPath("agents")}#cli-agents`,
    buildOperationsPath("a2a-acp-bridge"),
    buildOperationsPath("cloud-agents"),
  ]) {
    assert.ok(
      hrefs.includes(href) || hrefs.some((h) => h.startsWith(href.split("#")[0])),
      `agents group missing ${href}`
    );
  }
  // No legacy island deep-links
  assert.equal(hrefs.includes("/dashboard/acp-agents"), false);
  assert.equal(hrefs.includes("/dashboard/cloud-agents"), false);
  assert.equal(hrefs.includes("/dashboard/tools/agent-bridge"), false);
});

test("Operations hub does not re-home Traffic Inspector (Observe peer)", () => {
  assert.equal(
    OPERATIONS_HUB_HREFS.includes("/dashboard/tools/traffic-inspector"),
    false,
    "Traffic Inspector is Observe (0098), not Ops Integrations"
  );
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
