/**
 * Task 0114 — Combo Topology RoutingHubSubnav hub matrix & anti-phantom chrome tests (EPIC-24 T24-C).
 * Verifies single topbar mount across all /dashboard/combos/* routes and topology discoverability.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PRIMARY_SIDEBAR_ITEM_IDS } from "../../../src/shared/constants/sidebarVisibility";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

/** Peer routes under the Routing hub that must mount RoutingHubSubnav with exact active id. */
const ROUTING_HUB_TOPOLOGY_PEERS: Array<{
  rel: string;
  active: string;
}> = [
  { rel: "src/app/(dashboard)/dashboard/combos/page.tsx", active: "combos" },
  { rel: "src/app/(dashboard)/dashboard/combos/live/page.tsx", active: "live" },
  { rel: "src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx", active: "topology" },
  { rel: "src/app/(dashboard)/dashboard/fusions/page.tsx", active: "fusions" },
  { rel: "src/app/(dashboard)/dashboard/context/settings/page.tsx", active: "compression-settings" },
  { rel: "src/app/(dashboard)/dashboard/compression/studio/page.tsx", active: "compression-studio" },
];

test("EPIC-24 Topology peer matrix: all routing hub peers mount exact RoutingHubSubnav active id", () => {
  for (const peer of ROUTING_HUB_TOPOLOGY_PEERS) {
    assert.equal(existsSync(join(root, peer.rel)), true, `missing peer file ${peer.rel}`);
    const src = read(peer.rel);
    assert.ok(
      src.includes("RoutingHubSubnav"),
      `${peer.rel} must mount RoutingHubSubnav`
    );
    assert.ok(
      src.includes(`active="${peer.active}"`),
      `${peer.rel} must specify active="${peer.active}"`
    );
  }
});

test("anti-phantom chrome: topology page mounts exactly one RoutingHubSubnav strip", () => {
  const clientSrc = read("src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx");
  const subnavMatches = clientSrc.match(/<RoutingHubSubnav/g) || [];
  assert.equal(
    subnavMatches.length,
    2, // One in Suspense fallback + one in main container (mutually exclusive render branches)
    "ComboTopologyClient must render exactly one RoutingHubSubnav per branch (fallback + main)"
  );
  assert.ok(
    clientSrc.includes('data-routing-hub-subnav="topology"'),
    "topology client shell must carry data-routing-hub-subnav attribute"
  );
});

test("Topology is discoverable in RoutingHubSubnav LINKS array", () => {
  const subnavSrc = read("src/shared/components/RoutingHubSubnav.tsx");
  assert.ok(subnavSrc.includes('id: "topology"'));
  assert.ok(subnavSrc.includes('href: "/dashboard/combos/topology"'));
  assert.ok(subnavSrc.includes('label: "Topology"'));
  assert.ok(subnavSrc.includes('icon: "account_tree"'));
});

test("Topology is discoverable in CommandPalette options", () => {
  const paletteSrc = read("src/shared/components/CommandPalette.tsx");
  assert.ok(paletteSrc.includes('href: "/dashboard/combos/topology"'));
  assert.ok(paletteSrc.includes('id: "combos-topology"'));
});

test("anti-new-leaf: topology is NOT added as a primary sidebar leaf", () => {
  // SAFETY: `PRIMARY_SIDEBAR_ITEM_IDS` is a `readonly` tuple literal whose
  // narrow element type excludes "topology". We need a runtime `.includes()`
  // probe to assert absence, but TypeScript refuses `readonly tuple.includes(string)`
  // because the element type is too narrow. The `as unknown as <element>` hop is
  // sound (string -> unknown -> element type does not bypass a real runtime guard
  // — the value "topology" is the literal under test and `.includes()` performs
  // a strict-equality scan over the actual tuple elements at runtime). The cast
  // exists to satisfy the parameter type of `ReadonlyArray<T>.includes()`, not to
  // smuggle an unsafe value into the test; the assertion verifies the EXACT
  // opposite — that "topology" is NOT a member.
  assert.equal(
    PRIMARY_SIDEBAR_ITEM_IDS.includes("topology" as unknown as typeof PRIMARY_SIDEBAR_ITEM_IDS[number]),
    false,
    "topology must remain an in-page Routing hub peer, not a primary sidebar leaf"
  );
});
