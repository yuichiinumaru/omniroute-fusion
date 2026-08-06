/**
 * Task 0113 — Combo Topology UI route + subnav + command palette (EPIC-24 T24-B).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildComboTopologyGraph } from "../../../src/lib/combos/comboTopologyGraph.ts";
import { layoutComboTopologyGraph } from "../../../src/app/(dashboard)/dashboard/combos/topology/layoutComboTopology.ts";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("RoutingHubSubnav links includes Topology peer (Task 0113)", () => {
  const src = read("src/shared/components/RoutingHubSubnav.tsx");
  assert.ok(src.includes('id: "topology"'));
  assert.ok(src.includes('href: "/dashboard/combos/topology"'));
  assert.ok(src.includes('label: "Topology"'));
  assert.ok(src.includes('icon: "account_tree"'));
});

test("CommandPalette includes Topology destination (Task 0113)", () => {
  const src = read("src/shared/components/CommandPalette.tsx");
  assert.ok(src.includes('href: "/dashboard/combos/topology"'));
  assert.ok(src.includes('id: "combos-topology"'));
  assert.ok(src.includes('combosTopology'));
});

test("ComboTopology page and client components exist (Task 0113)", () => {
  assert.equal(
    existsSync(join(root, "src/app/(dashboard)/dashboard/combos/topology/page.tsx")),
    true,
    "missing page.tsx"
  );
  assert.equal(
    existsSync(join(root, "src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx")),
    true,
    "missing ComboTopologyClient.tsx"
  );
  assert.equal(
    existsSync(join(root, "src/app/(dashboard)/dashboard/combos/topology/layoutComboTopology.ts")),
    true,
    "missing layoutComboTopology.ts"
  );
});

test("ComboTopologyClient mounts single RoutingHubSubnav active=topology", () => {
  const clientSrc = read("src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx");
  assert.ok(clientSrc.includes("<RoutingHubSubnav active=\"topology\" />"));
  assert.ok(clientSrc.includes('data-routing-hub-subnav="topology"'));
  assert.ok(clientSrc.includes('data-testid="combo-topology-dropdown"'));
  assert.ok(clientSrc.includes("buildComboTopologyGraph"));
});

test("layoutComboTopologyGraph computes coordinates for topology nodes", () => {
  const mockCombos = [
    {
      id: "c1",
      name: "SmartCombo",
      strategy: "priority",
      models: [
        { model: "openai/gpt-4o", weight: 1 },
        { combo: "SubCombo", weight: 2 },
      ],
    },
    {
      id: "c2",
      name: "SubCombo",
      strategy: "round-robin",
      models: [{ model: "anthropic/claude-3-5-sonnet", weight: 1 }],
    },
  ];

  const rawGraph = buildComboTopologyGraph({ combos: mockCombos, selection: "all" });
  assert.ok(rawGraph.nodes.length >= 3, `Expected at least 3 nodes, got ${rawGraph.nodes.length}`);
  assert.ok(rawGraph.edges.length >= 2, `Expected at least 2 edges, got ${rawGraph.edges.length}`);

  const layout = layoutComboTopologyGraph(rawGraph.nodes, rawGraph.edges);
  assert.equal(layout.nodes.length, rawGraph.nodes.length);
  assert.equal(layout.edges.length, rawGraph.edges.length);

  for (const node of layout.nodes) {
    assert.equal(typeof node.position.x, "number");
    assert.equal(typeof node.position.y, "number");
    assert.ok(!Number.isNaN(node.position.x));
    assert.ok(!Number.isNaN(node.position.y));
  }
});

// ── Layout edge-case suite ───────────────────────────────────────────────────
// Layout correctness regressions: degenerate inputs that the layered algorithm
// must handle without NaN, infinite loops, or rank drift. Each case targets a
// real-world shape the Combo Topology view can receive.

test("layoutComboTopologyGraph: empty nodes -> empty result (no NaN positions)", () => {
  const layout = layoutComboTopologyGraph([], []);
  assert.deepEqual(layout.nodes, []);
  assert.deepEqual(layout.edges, []);
});

test("layoutComboTopologyGraph: single isolated combo node lands at origin", () => {
  const combos = [
    { id: "c1", name: "SoloCombo", strategy: "priority", models: [] },
  ];
  const rawGraph = buildComboTopologyGraph({ combos, selection: "SoloCombo" });

  assert.equal(rawGraph.nodes.length, 1, "Isolated combo with no models produces exactly one node");

  const layout = layoutComboTopologyGraph(rawGraph.nodes, rawGraph.edges);
  assert.equal(layout.nodes.length, 1);
  assert.equal(layout.nodes[0].position.x, 0, "Single root node lands at x=0 (rank 0)");
  assert.equal(layout.nodes[0].position.y, 0, "Single node in a layer lands at y=0 (centered)");
});

test("layoutComboTopologyGraph: no matching selection -> empty graph -> empty layout", () => {
  const combos = [
    { id: "c1", name: "ComboA", models: ["openai/gpt-4o"] },
  ];
  const rawGraph = buildComboTopologyGraph({ combos, selection: "Nonexistent" });
  assert.deepEqual(rawGraph.nodes, []);
  assert.deepEqual(rawGraph.edges, []);

  const layout = layoutComboTopologyGraph(rawGraph.nodes, rawGraph.edges);
  assert.deepEqual(layout.nodes, []);
  assert.deepEqual(layout.edges, []);
});

test("layoutComboTopologyGraph: deep nesting assigns strictly increasing x by rank", () => {
  // Level0 -> Level1 -> Level2 -> model
  const combos = [
    { name: "Level0", models: [{ kind: "combo-ref", comboName: "Level1" }] },
    { name: "Level1", models: [{ kind: "combo-ref", comboName: "Level2" }] },
    { name: "Level2", models: ["openai/gpt-4o"] },
  ];
  const rawGraph = buildComboTopologyGraph({ combos, selection: "Level0" });

  const layout = layoutComboTopologyGraph(rawGraph.nodes, rawGraph.edges);
  assert.ok(layout.nodes.length >= 4, "Deep nesting produces at least 4 nodes");

  // Extract x positions by node id for precise assertion.
  const xById = new Map(layout.nodes.map((n) => [n.id, n.position.x]));

  const xRoot = xById.get("combo:Level0");
  const xL1 = xById.get("combo:Level1");
  const xL2 = xById.get("combo:Level2");
  const xModel = xById.get("model:openai/gpt-4o");

  assert.ok(xRoot !== undefined && xL1 !== undefined && xL2 !== undefined && xModel !== undefined);

  // Each nested level must be exactly one X_STEP (260) to the right of its parent.
  assert.ok(xRoot! < xL1!, "Level1 must be to the right of Level0");
  assert.ok(xL1! < xL2!, "Level2 must be to the right of Level1");
  assert.ok(xL2! < xModel!, "Model must be to the right of Level2");

  // Strictly increasing ranks mean strictly increasing x coordinates.
  assert.equal(xL1! - xRoot!, 260, "Level1 is one X_STEP right of root (longest-path layout)");
  assert.equal(xL2! - xL1!, 260, "Level2 is one X_STEP right of Level1");
  assert.equal(xModel! - xL2!, 260, "Model is one X_STEP right of Level2");
});

test("layoutComboTopologyGraph: cycle edge does not deepen the rank of the cycle target", () => {
  // ComboA -> ComboB -> ComboA (cycle). The back-edge B->A must NOT push
  // ComboA to a deeper rank than its root rank (0); the cycle edge is
  // excluded from rank computation by `data.cycleClosing`.
  const combos = [
    { name: "ComboA", models: [{ kind: "combo-ref", comboName: "ComboB" }] },
    { name: "ComboB", models: [{ kind: "combo-ref", comboName: "ComboA" }] },
  ];
  const rawGraph = buildComboTopologyGraph({ combos, selection: "ComboA" });

  const layout = layoutComboTopologyGraph(rawGraph.nodes, rawGraph.edges);

  const xById = new Map(layout.nodes.map((n) => [n.id, n.position.x]));
  const xA = xById.get("combo:ComboA");
  const xB = xById.get("combo:ComboB");

  assert.ok(xA !== undefined);
  assert.ok(xB !== undefined);
  assert.equal(xA, 0, "Root ComboA stays at rank 0 (x=0) despite cycle back-edge");
  assert.equal(xB, 260, "ComboB is rank 1 (one X_STEP right of root)");
  assert.ok(xB! > xA!, "Cycle child still positioned to the right of its root parent");
});

test("layoutComboTopologyGraph: forest (all) produces multiple rank-0 roots with x=0", () => {
  const combos = [
    { id: "id-1", name: "RootOne", models: ["openai/gpt-4o"] },
    { id: "id-2", name: "RootTwo", models: ["anthropic/claude-3-5-sonnet"] },
  ];
  const rawGraph = buildComboTopologyGraph({ combos, selection: "all" });

  const layout = layoutComboTopologyGraph(rawGraph.nodes, rawGraph.edges);

  const roots = layout.nodes.filter((n) => n.type === "combo" && n.data.isRoot);
  assert.equal(roots.length, 2, "Forest mode produces two root nodes");

  for (const root of roots) {
    assert.equal(
      root.position.x,
      0,
      `Root "${root.id}" must be at x=0 (rank 0); got x=${root.position.x}`
    );
  }

  // Both roots are in the same rank (0), so they should be vertically stacked.
  assert.ok(
 roots[0].position.y !== roots[1].position.y,
    "Two roots in the same layer must have distinct y positions (vertically stacked)"
  );
});

test("layoutComboTopologyGraph: all positions are finite numbers (no NaN/Infinity)", () => {
  // Stress: 10 combos, mix of models and combo-refs, forest mode.
  const combos = [];
  for (let i = 0; i < 10; i++) {
    combos.push({
      id: `c${i}`,
      name: `Combo${i}`,
      strategy: i % 2 === 0 ? "priority" : "round-robin",
      models: [
        `openai/gpt-4o-mini`,
        { kind: "combo-ref", comboName: `Combo${(i + 1) % 10}` },
      ],
    });
  }
  const rawGraph = buildComboTopologyGraph({ combos, selection: "all" });
  assert.ok(rawGraph.nodes.length > 0, "Stress fixture produces nodes");

  const layout = layoutComboTopologyGraph(rawGraph.nodes, rawGraph.edges);

  for (const node of layout.nodes) {
    assert.equal(typeof node.position.x, "number", `${node.id}: x is number`);
    assert.equal(typeof node.position.y, "number", `${node.id}: y is number`);
    assert.ok(Number.isFinite(node.position.x), `${node.id}: x is finite`);
    assert.ok(Number.isFinite(node.position.y), `${node.id}: y is finite`);
  }
});

test("layoutComboTopologyGraph: preserves edge identity and count from rawGraph", () => {
  const combos = [
    {
      name: "PreserveCombo",
      models: [
        "openai/gpt-4o",
        { kind: "combo-ref", comboName: "ChildCombo" },
      ],
    },
    { name: "ChildCombo", models: ["anthropic/claude-3-5-sonnet"] },
  ];
  const rawGraph = buildComboTopologyGraph({ combos, selection: "PreserveCombo" });

  const layout = layoutComboTopologyGraph(rawGraph.nodes, rawGraph.edges);

  // Edges pass through untouched (layout only repositions nodes).
  assert.equal(layout.edges.length, rawGraph.edges.length);
  const layoutEdgeIds = new Set(layout.edges.map((e) => e.id));
  for (const e of rawGraph.edges) {
    assert.ok(layoutEdgeIds.has(e.id), `Edge ${e.id} preserved in layout output`);
  }
});

// ── Anti-phantom chrome (Hard Rule #22) regression suite ─────────────────────
// React's <Suspense> contract substitutes the `fallback` for the suspended
// subtree. The fallback and the inner subtree are NEVER mounted simultaneously
// — they are mutually exclusive render branches chosen by the Suspense
// state machine. The single-topbar invariant (Hard Rule #22) therefore holds
// if and only if:
//
//   (a) the inner component mounts exactly one <RoutingHubSubnav>, and
//   (b) the Suspense fallback mounts exactly one <RoutingHubSubnav>, and
//   (c) the exported component's top-level return is the <Suspense> wrapper
//       itself (no sibling <RoutingHubSubnav> outside the Suspense boundary).
//
// These tests verify the structural invariant mechanically. A future
// regression that adds an additional <RoutingHubSubnav> outside <Suspense>
// (e.g. above the wrapper, or as a sibling of the exporter's return) will
// fail test (c) or (a)+(c) — turning this verification-by-reasoning into
// verification-by-test.

test("Anti-phantom chrome (Rule #22): inner component mounts exactly one RoutingHubSubnav", () => {
  const src = read("src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx");

  // Count occurrences of the literal <RoutingHubSubnav active="topology" /> JSX.
  // The combo-topology client must mount the hub subnav exactly once in the
  // inner render path (the interactive client body); a second mount inside
  // the inner component would already violate the single-topbar rule without
  // Suspense even participating.
  const innerMatches = src.match(/<RoutingHubSubnav active="topology"\s*\/>/g) || [];
  assert.equal(
    innerMatches.length,
    2,
    "ComboTopologyClient must mount <RoutingHubSubnav active=\"topology\" /> exactly twice in source: once in the inner component, once in the Suspense fallback. Found: " + innerMatches.length
  );
});

test("Anti-phantom chrome (Rule #22): inner subtree is wrapped by <Suspense> with the fallback carrying the only other subnav", () => {
  const src = read("src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx");

  // The exported default must return a <Suspense> at the top level. We assert
  // the existence of the Suspense wrapper around the inner component.
  assert.ok(
    src.includes("<Suspense") && src.includes("<ComboTopologyClientInner />"),
    "Exported component must wrap <ComboTopologyClientInner /> in <Suspense>"
  );

  // The Suspense fallback must contain the second <RoutingHubSubnav> so the
  // subnav still renders during the inner suspension. We locate the Suspense
  // fallback block and count the subnav inside it.
  const suspenseOpen = src.indexOf("<Suspense");
  assert.ok(suspenseOpen >= 0, "<Suspense> must be present");
  const fallbackStart = src.indexOf("fallback=", suspenseOpen);
  assert.ok(fallbackStart >= 0, "Suspense must carry a fallback= prop");
  // Derive the end of the fallback expression by matching the JSX block.
  // We use the simple heuristic: the fallback block opens with `{` (curly)
  // because the fallback is a multi-line JSX expression, and ends at the
  // matching `}` before `>`. We lazy-match via brace counting from the
  // first `{` after `fallback=`.
  const fbBraceOpen = src.indexOf("{", fallbackStart);
  let depth = 0;
  let fbBraceClose = -1;
  for (let i = fbBraceOpen; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        fbBraceClose = i;
        break;
      }
    }
  }
  assert.ok(fbBraceClose > fbBraceOpen, "Suspense fallback block must be a balanced JSX expression");
  const fallbackBlock = src.slice(fbBraceOpen, fbBraceClose + 1);
  const fallbackSubnavMatches = fallbackBlock.match(/<RoutingHubSubnav active="topology"\s*\/>/g) || [];
  assert.equal(
    fallbackSubnavMatches.length,
    1,
    "Suspense fallback must mount exactly one <RoutingHubSubnav active=\"topology\" />. Found: " + fallbackSubnavMatches.length
  );

  // Total subnav occurrences in the whole file must equal exactly 2 (one in
  // the inner component, one in the fallback). A third mount (e.g. outside
  // the Suspense boundary, at the exporter's top level, or in a sibling) is
  // a Hard Rule #22 regression that would permit two simultaneous hubs.
  const totalMatches = src.match(/<RoutingHubSubnav active="topology"\s*\/>/g) || [];
  assert.equal(
    totalMatches.length,
    2,
    "ComboTopologyClient.tsx must contain exactly two <RoutingHubSubnav> occurrences (inner + fallback); a third would risk simultaneous mount. Found: " + totalMatches.length
  );
});

test("Anti-phantom chrome (Rule #22): no RoutingHubSubnav mount outside the Suspense boundary", () => {
  const src = read("src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx");

  // Find the exported default's body. The file has only one
  // `export default function ComboTopologyClient()`, and its return is the
  // <Suspense> wrapper. We assert it returns exactly the <Suspense> and
  // contains no <RoutingHubSubnav> at the exporter's top level outside the
  // Suspense wrapper. The exporter's body begins after the function
  // declaration line.
  const exporterMatch = src.match(/export\s+default\s+function\s+ComboTopologyClient\s*\(\s*\)\s*\{/);
  assert.ok(exporterMatch, "Exported default function ComboTopologyClient must be present");
  const exporterStart = src.indexOf(exporterMatch[0]) + exporterMatch[0].length;

  // The exporter's body ends at the function's closing brace. We count braces
  // starting from exporterStart to locate the body.
  let depth = 1;
  let exporterEnd = -1;
  for (let i = exporterStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        exporterEnd = i;
        break;
      }
    }
  }
  assert.ok(exporterEnd > exporterStart, "Exporter body must be balanced");
  const exporterBody = src.slice(exporterStart, exporterEnd + 1);

  // The exporter body must contain exactly the <Suspense> wrapper. We assert
  // the body's only <RoutingHubSubnav> occurrences are inside the Suspense
  // fallback block (already verified by the prior test). To prove no extra
  // subnav mounts at the exporter's top level (outside Suspense), we strip
  // the <Suspense>...</Suspense> block and assert zero occurrences remain
  // in the rest of the exporter body.
  const suspenseOpen = exporterBody.indexOf("<Suspense");
  assert.ok(suspenseOpen >= 0, "Exporter must open <Suspense>");
  // Match the <Suspense ... >...</Suspense> by counting <Suspense ...> against
  // </Suspense>. We treat <Suspense as the open token and </Suspense> as the
  // close token.
  let sDepth = 0;
  let suspenseIdx = suspenseOpen;
  let suspenseEnd = -1;
  for (let i = suspenseOpen; i < exporterBody.length; i++) {
    const tail = exporterBody.slice(i, i + 9);
    if (tail.startsWith("<Suspense")) {
      sDepth++;
      i += 8;
    } else if (exporterBody.slice(i, i + 10) === "</Suspense") {
      sDepth--;
      if (sDepth === 0) {
        // Skip to the closing '>' of </Suspense>.
        const gt = exporterBody.indexOf(">", i);
        suspenseEnd = gt;
        break;
      }
      i += 9;
    }
  }
  assert.ok(suspenseEnd > suspenseOpen, "Exporter's <Suspense> block must be balanced");

  const outsideSuspense =
    exporterBody.slice(0, suspenseOpen) +
    exporterBody.slice(suspenseEnd + 1);
  const outsideMatches = outsideSuspense.match(/<RoutingHubSubnav/g) || [];
  assert.equal(
    outsideMatches.length,
    0,
    "No <RoutingHubSubnav> may mount outside the <Suspense> boundary in the exported component. Found: " + outsideMatches.length
  );
});
