/**
 * Task 0075 — Fusions peer-route RoutingHubSubnav mount matrix (0009 U1).
 * List + create + edit must keep Routing hub chrome continuous; no new primary leaf.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PRIMARY_SIDEBAR_ITEM_IDS,
} from "../../../src/shared/constants/sidebarVisibility";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

/** Peer surfaces that must expose Routing hub strip with fusions active. */
const FUSIONS_ROUTING_HUB_PEERS: Array<{
  rel: string;
  role: "list" | "editor-shell" | "editor-page";
  mustInclude: readonly string[];
}> = [
  {
    rel: "src/app/(dashboard)/dashboard/fusions/page.tsx",
    role: "list",
    mustInclude: ["RoutingHubSubnav", 'active="fusions"'],
  },
  {
    rel: "src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx",
    role: "editor-shell",
    mustInclude: ["RoutingHubSubnav", 'active="fusions"'],
  },
  {
    rel: "src/app/(dashboard)/dashboard/fusions/new/page.tsx",
    role: "editor-page",
    // Create page inherits strip from shared FusionEditorClient (no divergent markup).
    mustInclude: ["FusionEditorClient"],
  },
  {
    rel: "src/app/(dashboard)/dashboard/fusions/[id]/page.tsx",
    role: "editor-page",
    mustInclude: ["FusionEditorClient"],
  },
];

test("fusions peer matrix: list + editor shell mount RoutingHubSubnav active=fusions", () => {
  for (const peer of FUSIONS_ROUTING_HUB_PEERS) {
    assert.equal(existsSync(join(root, peer.rel)), true, `missing ${peer.rel}`);
    const src = read(peer.rel);
    for (const token of peer.mustInclude) {
      assert.ok(
        src.includes(token),
        `${peer.rel} (${peer.role}) must include ${token}`
      );
    }
  }

  // Shared editor client is the single mount for both new + [id] (not page-only half-matrix).
  const editor = read("src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx");
  assert.ok(
    editor.includes('from "@/shared/components/RoutingHubSubnav"') ||
      editor.includes("from '@/shared/components/RoutingHubSubnav'"),
    "FusionEditorClient must import RoutingHubSubnav"
  );
  assert.ok(
    editor.includes("<RoutingHubSubnav active=\"fusions\"") ||
      editor.includes("<RoutingHubSubnav active='fusions'") ||
      (editor.includes("RoutingHubSubnav") && editor.includes('active="fusions"')),
    "FusionEditorClient must render RoutingHubSubnav with active=fusions"
  );

  // Pages must not mount a divergent second strip independently of the client
  // (single shared client is the contract — sabotage if pages only mount and client loses it).
  const newPage = read("src/app/(dashboard)/dashboard/fusions/new/page.tsx");
  const idPage = read("src/app/(dashboard)/dashboard/fusions/[id]/page.tsx");
  assert.ok(newPage.includes("FusionEditorClient"));
  assert.ok(idPage.includes("FusionEditorClient"));
  // Sabotage: editor pages must NOT independently mount RoutingHubSubnav (would double-strip
  // if client also mounts, or drift if only one page mounts).
  assert.equal(
    newPage.includes("RoutingHubSubnav"),
    false,
    "new/page must inherit strip from FusionEditorClient only"
  );
  assert.equal(
    idPage.includes("RoutingHubSubnav"),
    false,
    "[id]/page must inherit strip from FusionEditorClient only"
  );
});

test("fusions editor loading and error branches still reference RoutingHubSubnav", () => {
  // Prefer strip always when shell renders (Task 0075 exit condition).
  const editor = read("src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx");
  // Shared binding used across loading / error / main return — sabotage if one branch drops it.
  assert.ok(
    editor.includes("const routingHub = <RoutingHubSubnav active=\"fusions\"") ||
      editor.includes("const routingHub = <RoutingHubSubnav active='fusions'"),
    "editor must define shared routingHub binding with active=fusions"
  );
  const hubUses = editor.match(/\{routingHub\}/g) || [];
  assert.ok(
    hubUses.length >= 3,
    `loading + load-error + main must all render {routingHub} (got ${hubUses.length})`
  );
  // Back affordance retained on error + main (list recoverability).
  assert.ok(editor.includes('href="/dashboard/fusions"'));
  assert.ok(editor.includes('data-testid="fusion-editor"'));
});

test("Routing hub top-level mounts remain (no regression of 0025/0058 surfaces)", () => {
  const surfaces: Array<{ rel: string; active: string }> = [
    { rel: "src/app/(dashboard)/dashboard/combos/page.tsx", active: "combos" },
    { rel: "src/app/(dashboard)/dashboard/combos/live/page.tsx", active: "live" },
    {
      rel: "src/app/(dashboard)/dashboard/context/settings/page.tsx",
      active: "compression-settings",
    },
    {
      rel: "src/app/(dashboard)/dashboard/compression/studio/page.tsx",
      active: "compression-studio",
    },
    { rel: "src/app/(dashboard)/dashboard/fusions/page.tsx", active: "fusions" },
  ];
  for (const { rel, active } of surfaces) {
    const src = read(rel);
    assert.ok(src.includes("RoutingHubSubnav"), `${rel} missing RoutingHubSubnav`);
    assert.ok(
      src.includes(`active="${active}"`),
      `${rel} missing active="${active}"`
    );
  }
});

test("anti-new-leaf: fusions/playground/translator/search-tools not primary ids", () => {
  for (const id of ["fusions", "playground", "translator", "search-tools"] as const) {
    assert.equal(
      PRIMARY_SIDEBAR_ITEM_IDS.includes(id),
      false,
      `${id} must not be a primary sidebar leaf`
    );
  }
  // DEVTOOLS remains empty / non-lab (0060 contract).
  const sidebar = read("src/shared/constants/sidebarVisibility.ts");
  const devtoolsBlock = sidebar.match(
    /const DEVTOOLS_ITEMS: readonly SidebarItemDefinition\[\] = \[([\s\S]*?)\];/
  );
  assert.ok(devtoolsBlock, "DEVTOOLS_ITEMS declaration must exist");
  assert.equal(devtoolsBlock![1].trim(), "", "DEVTOOLS_ITEMS must stay empty");
});

test("RoutingHubSubnav still uses HUB_SUBNAV_* SSoT (no white-on-primary editor shell)", () => {
  const subnav = read("src/shared/components/RoutingHubSubnav.tsx");
  assert.ok(subnav.includes("HUB_SUBNAV_SHELL_CLASS"));
  assert.ok(subnav.includes("HUB_SUBNAV_ACTIVE_CLASS"));
  assert.ok(subnav.includes("HUB_SUBNAV_INACTIVE_CLASS"));
  assert.ok(subnav.includes("HUB_SUBNAV_ITEM_BASE_CLASS"));
  // Editor must not invent a local strip class string for hub chrome.
  const editor = read("src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx");
  assert.equal(
    editor.includes("bg-primary text-white"),
    false,
    "editor must not invent white-on-primary hub chrome"
  );
});
