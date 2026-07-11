/**
 * Task 0047 / F-08-002 / F-08-003 — MCP hub counts + full scope/tool SSoT parity.
 *
 * Shared `MCP_SCOPE_LIST` / `MCP_TOOL_SCOPES` must cover every live tool module the
 * MCP server registers (not just pool tools). Hub counts must come from those
 * constants, never hardcodes like tools:37 / scopes:13.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { MCP_TOOLS } = await import("../../open-sse/mcp-server/schemas/tools.ts");
const { memoryTools } = await import("../../open-sse/mcp-server/tools/memoryTools.ts");
const { skillTools } = await import("../../open-sse/mcp-server/tools/skillTools.ts");
const { agentSkillTools } = await import("../../open-sse/mcp-server/tools/agentSkillTools.ts");
const { poolTools } = await import("../../open-sse/mcp-server/tools/poolTools.ts");
const { gamificationTools } = await import("../../open-sse/mcp-server/tools/gamificationTools.ts");
const { pluginTools } = await import("../../open-sse/mcp-server/tools/pluginTools.ts");
const { notionTools } = await import("../../open-sse/mcp-server/tools/notionTools.ts");
const { obsidianTools } = await import("../../open-sse/mcp-server/tools/obsidianTools.ts");
const { compressionTools } = await import("../../open-sse/mcp-server/tools/compressionTools.ts");
const { getAllToolDefinitions } = await import("../../open-sse/mcp-server/toolSearch/catalog.ts");
const mcpScopes = await import("../../src/shared/constants/mcpScopes.ts");
const { MCP_SCOPE_LIST, MCP_TOOL_SCOPES, MCP_SCOPE_COUNT, MCP_TOOL_COUNT, MCP_TRANSPORT_COUNT } =
  mcpScopes;

type ToolLike = { name: string; scopes?: readonly string[] };

function collectEntries(collection: unknown): ToolLike[] {
  if (Array.isArray(collection)) {
    return collection.filter(
      (t): t is ToolLike =>
        Boolean(t) && typeof t === "object" && typeof (t as ToolLike).name === "string"
    );
  }
  if (collection && typeof collection === "object") {
    return Object.values(collection as Record<string, ToolLike>).filter(
      (t) => t && typeof t.name === "string"
    );
  }
  return [];
}

const LIVE_COLLECTIONS: ReadonlyArray<{ label: string; collection: unknown }> = [
  { label: "MCP_TOOLS", collection: MCP_TOOLS },
  { label: "memoryTools", collection: memoryTools },
  { label: "skillTools", collection: skillTools },
  { label: "agentSkillTools", collection: agentSkillTools },
  { label: "poolTools", collection: poolTools },
  { label: "gamificationTools", collection: gamificationTools },
  { label: "pluginTools", collection: pluginTools },
  { label: "notionTools", collection: notionTools },
  { label: "obsidianTools", collection: obsidianTools },
  { label: "compressionTools", collection: compressionTools },
];

function liveToolMap(): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  for (const { collection } of LIVE_COLLECTIONS) {
    for (const tool of collectEntries(collection)) {
      if (!map.has(tool.name)) {
        map.set(tool.name, Array.isArray(tool.scopes) ? tool.scopes : []);
      }
    }
  }
  return map;
}

test("MCP_SCOPE_COUNT / MCP_TOOL_COUNT match list lengths (hub SSoT)", () => {
  assert.equal(MCP_SCOPE_COUNT, MCP_SCOPE_LIST.length);
  assert.equal(MCP_TOOL_COUNT, Object.keys(MCP_TOOL_SCOPES).length);
  assert.equal(MCP_TRANSPORT_COUNT, 3);
  assert.ok(MCP_TOOL_COUNT >= 90, `expected ~93 tools, got ${MCP_TOOL_COUNT}`);
  assert.ok(MCP_SCOPE_COUNT >= 25, `expected ~31 scopes, got ${MCP_SCOPE_COUNT}`);
});

test("every live tool inline scope is in MCP_SCOPE_LIST", () => {
  const known = new Set(MCP_SCOPE_LIST as readonly string[]);
  const missing: string[] = [];
  for (const { label, collection } of LIVE_COLLECTIONS) {
    for (const tool of collectEntries(collection)) {
      // Some collections (e.g. agentSkillTools) omit inline scopes and rely on
      // MCP_TOOLS / MCP_TOOL_MAP + shared MCP_TOOL_SCOPES for enforcement.
      if (!Array.isArray(tool.scopes)) continue;
      assert.ok(
        tool.scopes.length > 0,
        `${label}/${tool.name}: scopes array must be non-empty when present`
      );
      for (const scope of tool.scopes) {
        if (!known.has(scope)) missing.push(`${tool.name}:${scope}`);
      }
    }
  }
  assert.deepEqual(missing, [], `unknown scopes: ${missing.join(", ")}`);
});

test("every live tool is mapped in MCP_TOOL_SCOPES; inline scopes match when present", () => {
  const live = liveToolMap();
  const mismatches: string[] = [];
  for (const [name, scopes] of live) {
    const canonical = (MCP_TOOL_SCOPES as Record<string, readonly string[]>)[name];
    if (!canonical) {
      mismatches.push(`missing map entry: ${name}`);
      continue;
    }
    // Only enforce equality when the live module declares scopes inline.
    if (scopes.length === 0) continue;
    const a = [...scopes].sort().join(",");
    const b = [...canonical].sort().join(",");
    if (a !== b) mismatches.push(`${name}: live=[${a}] map=[${b}]`);
  }
  assert.deepEqual(mismatches, [], mismatches.join("\n"));
});

test("MCP_TOOL_SCOPES has no orphan tools absent from live modules", () => {
  const live = liveToolMap();
  const orphans = Object.keys(MCP_TOOL_SCOPES).filter((name) => !live.has(name));
  assert.deepEqual(orphans, [], `orphans: ${orphans.join(", ")}`);
});

test("getAllToolDefinitions catalog size equals MCP_TOOL_COUNT", () => {
  const catalog = getAllToolDefinitions();
  assert.equal(
    catalog.length,
    MCP_TOOL_COUNT,
    "catalog and shared MCP_TOOL_COUNT must stay aligned"
  );
});

test("TOTAL_MCP_TOOL_COUNT is exported from server (heartbeat inventory)", async () => {
  const { TOTAL_MCP_TOOL_COUNT } = await import("../../open-sse/mcp-server/server.ts");
  assert.equal(typeof TOTAL_MCP_TOOL_COUNT, "number");
  assert.ok(TOTAL_MCP_TOOL_COUNT >= MCP_TOOL_COUNT - 5);
  assert.ok(TOTAL_MCP_TOOL_COUNT <= MCP_TOOL_COUNT + 5);
});

test("MCP hub page imports live counts — no hardcoded tools:37 / scopes:13", () => {
  const hubPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../src/app/(dashboard)/dashboard/mcp/page.tsx"
  );
  const source = readFileSync(hubPath, "utf8");
  assert.match(source, /MCP_TOOL_COUNT/);
  assert.match(source, /MCP_SCOPE_COUNT/);
  assert.match(source, /MCP_TRANSPORT_COUNT/);
  assert.doesNotMatch(source, /tools:\s*37/);
  assert.doesNotMatch(source, /scopes:\s*13/);
});

test("MCP_SCOPE_LIST includes memory/skills/plugins/notion/obsidian/gamification scopes", () => {
  const known = new Set(MCP_SCOPE_LIST as readonly string[]);
  for (const scope of [
    "read:memory",
    "write:memory",
    "read:skills",
    "write:skills",
    "execute:skills",
    "read:plugins",
    "write:plugins",
    "read:notion",
    "write:notion",
    "read:obsidian",
    "write:obsidian",
    "read:gamification",
    "write:gamification",
    "read:catalog",
    "read:tools",
  ]) {
    assert.ok(known.has(scope), `missing scope ${scope}`);
  }
});
