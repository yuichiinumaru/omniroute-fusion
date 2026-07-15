/**
 * Tools inventory under Operations (Task 0059).
 * Flat chrome no longer mounts an "operations" accordion section; TOOLS_GROUP
 * remains as conceptual inventory in sidebarVisibility, and the Operations hub
 * surfaces the same destinations.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OPERATIONS_HUB_GROUPS } from "../../src/shared/constants/operationsHub";

const root = join(import.meta.dirname, "../..");
const sidebarSrc = readFileSync(join(root, "src/shared/constants/sidebarVisibility.ts"), "utf8");

test("TOOLS_GROUP source keeps plan 14 tool order", () => {
  // Extract the TOOLS_GROUP items block order by id string sequence
  const toolsBlock = sidebarSrc.match(
    /const TOOLS_GROUP: SidebarItemGroup = \{[\s\S]*?items: \[([\s\S]*?)\],\n\s*\};/
  );
  assert.ok(toolsBlock, "TOOLS_GROUP block must exist in sidebarVisibility.ts");
  const ids = [...toolsBlock[1].matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    ids,
    ["cli-code", "cli-agents", "acp-agents", "cloud-agents", "agent-bridge", "traffic-inspector"],
    "TOOLS_GROUP items order must be cli-code, cli-agents, acp-agents, cloud-agents, agent-bridge, traffic-inspector"
  );
});

test("TOOLS_GROUP cli-code item has correct href in source", () => {
  assert.ok(sidebarSrc.includes('id: "cli-code"'));
  assert.ok(sidebarSrc.includes('href: "/dashboard/cli-code"'));
  assert.ok(sidebarSrc.includes('i18nKey: "cliCode"'));
});

test("TOOLS_GROUP cli-agents item has correct href in source", () => {
  assert.ok(sidebarSrc.includes('id: "cli-agents"'));
  assert.ok(sidebarSrc.includes('href: "/dashboard/cli-agents"'));
  assert.ok(sidebarSrc.includes('i18nKey: "cliAgents"'));
});

test("TOOLS_GROUP acp-agents item has correct href in source", () => {
  assert.ok(sidebarSrc.includes('id: "acp-agents"'));
  assert.ok(sidebarSrc.includes('href: "/dashboard/acp-agents"'));
  assert.ok(sidebarSrc.includes('i18nKey: "acpAgents"'));
});

test("TOOLS_GROUP does NOT contain legacy cli-tools or agents entries", () => {
  const toolsBlock = sidebarSrc.match(
    /const TOOLS_GROUP: SidebarItemGroup = \{[\s\S]*?items: \[([\s\S]*?)\],\n\s*\};/
  );
  assert.ok(toolsBlock);
  assert.equal(toolsBlock[1].includes('id: "cli-tools"'), false);
  assert.equal(toolsBlock[1].includes('id: "agents"'), false);
});

test("Operations hub agents group covers CLI/agent tool destinations (Task 0059)", () => {
  const agents = OPERATIONS_HUB_GROUPS.find((g) => g.id === "agents");
  assert.ok(agents);
  const hrefs = agents.links.map((l) => l.href);
  assert.ok(hrefs.includes("/dashboard/cli-code"));
  assert.ok(hrefs.includes("/dashboard/cli-agents"));
  assert.ok(hrefs.includes("/dashboard/acp-agents"));
  assert.ok(hrefs.includes("/dashboard/cloud-agents"));
  assert.ok(hrefs.includes("/dashboard/tools/agent-bridge"));
});
