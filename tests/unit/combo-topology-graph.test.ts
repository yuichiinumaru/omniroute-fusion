import test from "node:test";
import assert from "node:assert/strict";
import { buildComboTopologyGraph } from "../../src/lib/combos/comboTopologyGraph.ts";

test("1. Empty combos -> empty graph", () => {
  const result1 = buildComboTopologyGraph({ combos: [], selection: "all" });
  assert.deepEqual(result1.nodes, []);
  assert.deepEqual(result1.edges, []);

  const result2 = buildComboTopologyGraph({
    combos: [{ name: "ComboA", models: ["openai/gpt-4o"] }],
    selection: "NonExistentCombo",
  });
  assert.deepEqual(result2.nodes, []);
  assert.deepEqual(result2.edges, []);
});

test("2. Single model step -> combo + model + provider nodes; edges combo->model->provider", () => {
  const combos = [
    {
      id: "c-1",
      name: "FastModels",
      strategy: "priority",
      models: ["openai/gpt-4o"],
    },
  ];

  const { nodes, edges } = buildComboTopologyGraph({ combos, selection: "FastModels" });

  assert.equal(nodes.length, 3);
  const comboNode = nodes.find((n) => n.type === "combo");
  const modelNode = nodes.find((n) => n.type === "model");
  const providerNode = nodes.find((n) => n.type === "provider");

  assert.ok(comboNode, "Combo node should exist");
  assert.ok(modelNode, "Model node should exist");
  assert.ok(providerNode, "Provider node should exist");

  assert.equal(comboNode.id, "combo:FastModels");
  assert.equal(comboNode.data.name, "FastModels");
  assert.equal(comboNode.data.isRoot, true);

  assert.equal(modelNode.id, "model:openai/gpt-4o");
  assert.equal(modelNode.data.model, "openai/gpt-4o");
  assert.equal(modelNode.data.providerId, "openai");

  assert.equal(providerNode.id, "provider:openai");
  assert.equal(providerNode.data.providerId, "openai");

  assert.equal(edges.length, 2);
  const comboToModelEdge = edges.find((e) => e.source === "combo:FastModels" && e.target === "model:openai/gpt-4o");
  const modelToProviderEdge = edges.find((e) => e.source === "model:openai/gpt-4o" && e.target === "provider:openai");

  assert.ok(comboToModelEdge, "Edge combo->model should exist");
  assert.equal(comboToModelEdge.data.role, "model");

  assert.ok(modelToProviderEdge, "Edge model->provider should exist");
  assert.equal(modelToProviderEdge.data.role, "provider");
});

test("3. combo-ref expands to child combo (by name) within depth", () => {
  const combos = [
    {
      name: "ParentCombo",
      models: [{ kind: "combo-ref", comboName: "ChildCombo" }],
    },
    {
      name: "ChildCombo",
      models: ["anthropic/claude-3-5-sonnet"],
    },
  ];

  const { nodes, edges } = buildComboTopologyGraph({ combos, selection: "ParentCombo" });

  const parentNode = nodes.find((n) => n.id === "combo:ParentCombo");
  const childNode = nodes.find((n) => n.id === "combo:ChildCombo");
  const modelNode = nodes.find((n) => n.id === "model:anthropic/claude-3-5-sonnet");
  const providerNode = nodes.find((n) => n.id === "provider:anthropic");

  assert.ok(parentNode);
  assert.ok(childNode);
  assert.ok(modelNode);
  assert.ok(providerNode);

  const parentToChildEdge = edges.find(
    (e) => e.source === "combo:ParentCombo" && e.target === "combo:ChildCombo"
  );
  assert.ok(parentToChildEdge);
  assert.equal(parentToChildEdge.data.role, "combo-ref");

  const childToModelEdge = edges.find(
    (e) => e.source === "combo:ChildCombo" && e.target === "model:anthropic/claude-3-5-sonnet"
  );
  assert.ok(childToModelEdge);
  assert.equal(childToModelEdge.data.role, "model");
});

test("4. Cycle: A->B->A does not infinite-loop; cycle edge skipped or stub once", () => {
  const combos = [
    {
      name: "ComboA",
      models: [{ kind: "combo-ref", comboName: "ComboB" }],
    },
    {
      name: "ComboB",
      models: [{ kind: "combo-ref", comboName: "ComboA" }],
    },
  ];

  const { nodes, edges } = buildComboTopologyGraph({ combos, selection: "ComboA" });

  assert.equal(nodes.length, 2);
  const nodeA = nodes.find((n) => n.id === "combo:ComboA");
  const nodeB = nodes.find((n) => n.id === "combo:ComboB");
  assert.ok(nodeA);
  assert.ok(nodeB);

  const edgeAB = edges.find((e) => e.source === "combo:ComboA" && e.target === "combo:ComboB");
  const edgeBA = edges.find((e) => e.source === "combo:ComboB" && e.target === "combo:ComboA");

  assert.ok(edgeAB, "Edge A->B should exist");
  assert.ok(edgeBA, "Edge B->A should exist as cycle stub without infinite recursion");

  // The forward edge A->B is a normal expansion (ComboA not yet visited when A expands).
  assert.equal(
    edgeAB?.data.cycleClosing,
    undefined,
    "Forward edge A->B must NOT be flagged cycleClosing"
  );
  // The backward edge B->A closes the cycle (ComboA is already on the visited path when B expands).
  assert.equal(
    edgeBA?.data.cycleClosing,
    true,
    "Back edge B->A must be flagged cycleClosing so the UI can render it distinctly"
  );
});

test("5. Depth cap respected (default 3)", () => {
  const combos = [
    { name: "Level0", models: [{ kind: "combo-ref", comboName: "Level1" }] },
    { name: "Level1", models: [{ kind: "combo-ref", comboName: "Level2" }] },
    { name: "Level2", models: [{ kind: "combo-ref", comboName: "Level3" }] },
    { name: "Level3", models: [{ kind: "combo-ref", comboName: "Level4" }] },
    { name: "Level4", models: ["openai/gpt-4o"] },
  ];

  const { nodes, edges } = buildComboTopologyGraph({ combos, selection: "Level0", maxDepth: 3 });

  // Level0 -> Level1 (depth 0->1), Level1 -> Level2 (depth 1->2), Level2 -> Level3 (depth 2->3 cap reached).
  // Level3 node is created, but Level3 is NOT expanded to Level4.
  const level3Node = nodes.find((n) => n.id === "combo:Level3");
  const level4Node = nodes.find((n) => n.id === "combo:Level4");
  const gptNode = nodes.find((n) => n.id === "model:openai/gpt-4o");

  assert.ok(level3Node, "Level3 node should exist at depth cap limit");
  assert.equal(level4Node, undefined, "Level4 node should NOT be expanded past maxDepth=3");
  assert.equal(gptNode, undefined, "Model under Level4 should NOT be expanded past maxDepth=3");

  const edgeL2L3 = edges.find((e) => e.source === "combo:Level2" && e.target === "combo:Level3");
  assert.ok(edgeL2L3, "Edge Level2->Level3 should exist");
});

test("6. Fusion root includes judge and acting branches when set", () => {
  const combos = [
    {
      name: "FusionCombo",
      strategy: "fusion",
      models: ["openai/gpt-4o"],
      judge: "google/gemini-1.5-pro",
      acting: "anthropic/claude-3-5-sonnet",
    },
  ];

  const { nodes, edges } = buildComboTopologyGraph({ combos, selection: "FusionCombo" });

  assert.ok(nodes.find((n) => n.id === "combo:FusionCombo"));
  assert.ok(nodes.find((n) => n.id === "model:openai/gpt-4o"));
  assert.ok(nodes.find((n) => n.id === "model:google/gemini-1.5-pro"));
  assert.ok(nodes.find((n) => n.id === "model:anthropic/claude-3-5-sonnet"));

  const judgeEdge = edges.find(
    (e) => e.source === "combo:FusionCombo" && e.target === "model:google/gemini-1.5-pro"
  );
  assert.ok(judgeEdge, "Judge edge should exist");
  assert.equal(judgeEdge.data.role, "judge");

  const actingEdge = edges.find(
    (e) => e.source === "combo:FusionCombo" && e.target === "model:anthropic/claude-3-5-sonnet"
  );
  assert.ok(actingEdge, "Acting edge should exist");
  assert.equal(actingEdge.data.role, "acting");
});

test("7. Selection 'all' -> multiple roots (forest); selection one id/name -> single root", () => {
  const combos = [
    { id: "id-1", name: "ComboOne", models: ["openai/gpt-4o"] },
    { id: "id-2", name: "ComboTwo", models: ["anthropic/claude-3-5-sonnet"] },
  ];

  const forestResult = buildComboTopologyGraph({ combos, selection: "all" });
  const rootNodes = forestResult.nodes.filter((n) => n.type === "combo" && n.data.isRoot);
  assert.equal(rootNodes.length, 2, "Forest mode should contain 2 root combo nodes");

  const singleResultById = buildComboTopologyGraph({ combos, selection: "id-2" });
  assert.equal(
    singleResultById.nodes.filter((n) => n.type === "combo").length,
    1,
    "Selection by ID should produce single root combo"
  );
  assert.equal(singleResultById.nodes[0].data.name, "ComboTwo");

  const singleResultByName = buildComboTopologyGraph({ combos, selection: "ComboOne" });
  assert.equal(
    singleResultByName.nodes.filter((n) => n.type === "combo").length,
    1,
    "Selection by Name should produce single root combo"
  );
  assert.equal(singleResultByName.nodes[0].data.name, "ComboOne");
});

test("8. Missing combo-ref target -> stub node or labeled unresolved", () => {
  const combos = [
    {
      name: "MainCombo",
      models: [{ kind: "combo-ref", comboName: "GhostCombo" }],
    },
  ];

  const { nodes, edges } = buildComboTopologyGraph({ combos, selection: "MainCombo" });

  const unresolvedNode = nodes.find((n) => n.type === "unresolved");
  assert.ok(unresolvedNode, "Unresolved stub node should exist for missing combo-ref");
  assert.equal(unresolvedNode.id, "unresolved:GhostCombo");
  assert.equal(unresolvedNode.data.kind, "unresolved");
  assert.equal(unresolvedNode.data.name, "GhostCombo");

  const refEdge = edges.find(
    (e) => e.source === "combo:MainCombo" && e.target === "unresolved:GhostCombo"
  );
  assert.ok(refEdge, "Edge to unresolved node should exist");
  assert.equal(refEdge.data.role, "combo-ref");
});

test("9. connectionId on model: stored as metadata on node", () => {
  const combos = [
    {
      name: "AccountCombo",
      models: [
        {
          kind: "model",
          model: "openai/gpt-4o",
          connectionId: "conn-acc-999",
        },
      ],
    },
  ];

  const { nodes } = buildComboTopologyGraph({ combos, selection: "AccountCombo" });

  const modelNode = nodes.find((n) => n.id === "model:openai/gpt-4o");
  assert.ok(modelNode);
  assert.equal(modelNode.data.connectionId, "conn-acc-999");
  assert.equal(nodes.find((n) => n.type === "provider")?.id, "provider:openai");
});

test("10. Provider id derived from providerId or parseable provider/model string", () => {
  const combos = [
    {
      name: "ProviderDerivationCombo",
      models: [
        { kind: "model", model: "custom-model", providerId: "groq" },
        "deepseek/deepseek-chat",
      ],
    },
  ];

  const { nodes } = buildComboTopologyGraph({ combos, selection: "ProviderDerivationCombo" });

  assert.ok(nodes.find((n) => n.id === "provider:groq"), "Provider node from explicit providerId");
  assert.ok(
    nodes.find((n) => n.id === "provider:deepseek"),
    "Provider node derived from 'deepseek/deepseek-chat'"
  );

  // Explicit `providerId` must take precedence over any prefix parseable from `model`.
  // Mirrors comboStructure.ts::normalizeRuntimeStep precedence (providerId || provider || parsed).
  const overrideCombos = [
    {
      name: "OverrideCombo",
      models: [
        // Step claims "mistral" via prefix but providerId says "openrouter".
        { kind: "model", model: "mistral/mistral-large", providerId: "openrouter" },
      ],
    },
  ];
  const overrideResult = buildComboTopologyGraph({ combos: overrideCombos, selection: "OverrideCombo" });
  const overrideProvider = overrideResult.nodes.find((n) => n.type === "provider");
  assert.ok(overrideProvider, "Provider node should exist for explicit providerId override");
  assert.equal(
    overrideProvider?.id,
    "provider:openrouter",
    "Explicit providerId must win over parseable provider/model prefix"
  );
  assert.equal(
    overrideResult.nodes.find((n) => n.type === "model")?.data.providerId,
    "openrouter",
    "Model node data.providerId must carry the explicit providerId override"
  );
});

test("11. Fusion judge as combo-ref — production case (fusion.ts ResolvedFusionUnit = model | combo-ref)", () => {
  // fusion.ts resolves a fusion judge/acting unit as either a model step or a
  // nested combo-ref. The topology builder must surface the combo-ref branch
  // when the operator made the judge nested, just as it surfaces model steps.
  const combos = [
    {
      name: "FusionWithNestedJudge",
      strategy: "fusion",
      models: ["openai/gpt-4o"],
      judge: { kind: "combo-ref", comboName: "JudgeCombo" },
    },
    {
      name: "JudgeCombo",
      models: ["anthropic/claude-3-5-sonnet"],
    },
  ];

  const { nodes, edges } = buildComboTopologyGraph({ combos, selection: "FusionWithNestedJudge" });

  const comboRoot = nodes.find((n) => n.id === "combo:FusionWithNestedJudge");
  const judgeCombo = nodes.find((n) => n.id === "combo:JudgeCombo");
  const judgeModel = nodes.find((n) => n.id === "model:anthropic/claude-3-5-sonnet");
  const panelModel = nodes.find((n) => n.id === "model:openai/gpt-4o");

  assert.ok(comboRoot, "Root fusion combo should be present");
  assert.ok(judgeCombo, "Nested judge combo-ref target should expand to a combo node");
  assert.ok(judgeModel, "Model step inside the nested judge combo should be present");
  assert.ok(panelModel, "Panel model step should be present");

  // Edge: root combo -> JudgeCombo carries role `judge` (NOT `combo-ref`)
  // because the slot semantics (judge) take priority over the step kind when
  // the slot is not the `models` array.
  const judgeRefEdge = edges.find(
    (e) => e.source === "combo:FusionWithNestedJudge" && e.target === "combo:JudgeCombo"
  );
  assert.ok(judgeRefEdge, "Judge-combo-ref edge should be drawn from root to nested judge combo");
  assert.equal(
    judgeRefEdge.data.role,
    "judge",
    "Nested-combo judge edge keeps `judge` role — slot semantics preserved"
  );

  // Edge: JudgeCombo -> its model survives the nest as a normal `model` edge.
  const nestedModelEdge = edges.find(
    (e) => e.source === "combo:JudgeCombo" && e.target === "model:anthropic/claude-3-5-sonnet"
  );
  assert.ok(nestedModelEdge, "Edge from nested judge combo to its model should exist");
  assert.equal(nestedModelEdge.data.role, "model");

  // No unresolved stub since JudgeCombo IS in the combos array.
  assert.equal(
    nodes.find((n) => n.type === "unresolved"),
    undefined,
    "Resolved judge combo-ref must NOT emit an unresolved stub"
  );
});

test("12. Same model / different connectionId does not collapse account distinction", () => {
  // The builder's model-node id is keyed by `model` only, so two steps with
  // the SAME model but DIFFERENT account connectionIds collapse into ONE
  // model node by design (per Test Requirement #9: connectionId is metadata,
  // no account node required). However, the two steps still produce DISTINCT
  // combo->model edges (edge-id suffix includes stepIndex), so the UI continues
  // to see both routing targets distinctly even though they share a model node.
  // This documents the structural contract: node-id collapses, edge-id does not.
  const combos = [
    {
      name: "MultiAccountCombo",
      models: [
        { kind: "model", model: "openai/gpt-4o", connectionId: "conn-acc-001" },
        { kind: "model", model: "openai/gpt-4o", connectionId: "conn-acc-002" },
      ],
    },
  ];

  const { nodes, edges } = buildComboTopologyGraph({ combos, selection: "MultiAccountCombo" });

  const modelNodes = nodes.filter((n) => n.type === "model");
  assert.equal(modelNodes.length, 1, "Two same-model steps collapse into ONE model node by id contract");
  assert.equal(modelNodes[0].id, "model:openai/gpt-4o");

  // The connectionId captured on the surviving node is deterministic (first-
  // step-wins via addNode merge-on-revisit, which deliberately does NOT
  // overwrite data). Documenting the exact value so a future collision-policy
  // change surfaces as a test diff.
  assert.equal(
    modelNodes[0].data.connectionId,
    "conn-acc-001",
    "First-step connectionId survives on the collapsed model node (deterministic)"
  );

  // Exactly one provider node for openai.
  const providerNodes = nodes.filter((n) => n.type === "provider");
  assert.equal(providerNodes.length, 1);
  assert.equal(providerNodes[0].id, "provider:openai");

  // The two same-model steps emit TWO DISTINCT combo->model edges (edge id
  // includes stepIndex) — preserving per-step routing distinctions in the
  // edge layer even though the model node collapsed. Edge-id does NOT dedupe
  // across step indices; only the model-node id dedupes.
  const comboToModelEdges = edges.filter(
    (e) => e.source === "combo:MultiAccountCombo" && e.target === "model:openai/gpt-4o"
  );
  assert.equal(
    comboToModelEdges.length,
    2,
    "Two distinct combo->model edges preserve per-step routing distinctness at the edge layer"
  );

  // No account / connection nodes were materialised.
  assert.equal(
    nodes.find((n) => n.type === "unresolved"),
    undefined,
    "No unresolved nodes for a same-model multi-account combo"
  );
});
