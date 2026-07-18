/**
 * Task 0011 — resolveFusionUnits: map combo models + judge fields to
 * ResolvedFusionUnit panels and a single judge unit (no dispatch).
 */
import test from "node:test";
import assert from "node:assert/strict";

const { resolveFusionUnits, EMPTY_FUSION_JUDGE } = await import(
  "../../open-sse/services/fusion.ts"
);

// ─── Legacy string panels ──────────────────────────────────────────────────

test("resolveFusionUnits: legacy string panels map to kind:model units", () => {
  const { panels, judge } = resolveFusionUnits({
    name: "legacy-fusion",
    models: ["a", "b", "c"],
  });

  assert.equal(panels.length, 3);
  assert.deepEqual(panels[0], { kind: "model", model: "a" });
  assert.deepEqual(panels[1], { kind: "model", model: "b" });
  assert.deepEqual(panels[2], { kind: "model", model: "c" });
  // No judge / judgeModel → first panel
  assert.deepEqual(judge, { kind: "model", model: "a" });
});

// ─── Explicit model steps ──────────────────────────────────────────────────

test("resolveFusionUnits: model-step entry maps to kind:model", () => {
  const { panels } = resolveFusionUnits({
    name: "model-step-fusion",
    models: [{ kind: "model", model: "x" }],
  });

  assert.equal(panels.length, 1);
  assert.equal(panels[0].kind, "model");
  if (panels[0].kind === "model") {
    assert.equal(panels[0].model, "x");
  }
});

// ─── Combo-ref panels ──────────────────────────────────────────────────────

test("resolveFusionUnits: combo-ref entry maps to kind:combo-ref", () => {
  const allCombos = [{ name: "pool-1", models: ["p/m1"] }];
  const { panels } = resolveFusionUnits(
    {
      name: "ref-panel-fusion",
      models: [{ kind: "combo-ref", comboName: "pool-1" }],
    },
    allCombos
  );

  assert.equal(panels.length, 1);
  assert.deepEqual(panels[0], { kind: "combo-ref", comboName: "pool-1" });
});

// ─── Mixed arrays ──────────────────────────────────────────────────────────

test("resolveFusionUnits: mixed strings + model steps + combo-refs", () => {
  const allCombos = [{ name: "pool-1", models: ["p/m1"] }];
  const { panels } = resolveFusionUnits(
    {
      name: "mixed-fusion",
      models: [
        "legacy/a",
        { kind: "model", model: "typed/b", label: "B" },
        { kind: "combo-ref", comboName: "pool-1", label: "Pool" },
      ],
    },
    allCombos
  );

  assert.equal(panels.length, 3);
  assert.deepEqual(panels[0], { kind: "model", model: "legacy/a" });
  assert.deepEqual(panels[1], { kind: "model", model: "typed/b", label: "B" });
  assert.deepEqual(panels[2], { kind: "combo-ref", comboName: "pool-1", label: "Pool" });
});

// ─── Judge: data.judge as combo-ref ────────────────────────────────────────

test("resolveFusionUnits: data.judge combo-ref wins over judgeModel and first panel", () => {
  const allCombos = [
    { name: "judge-pool", models: ["j/m1"] },
    { name: "panel-pool", models: ["p/m1"] },
  ];
  const { panels, judge } = resolveFusionUnits(
    {
      name: "judge-ref-fusion",
      models: ["a/m1", "b/m2"],
      judge: { kind: "combo-ref", comboName: "judge-pool" },
      config: { judgeModel: "should-not-use/judge" },
    },
    allCombos
  );

  assert.equal(panels.length, 2);
  assert.deepEqual(judge, { kind: "combo-ref", comboName: "judge-pool" });
});

// ─── Judge: data.judge as model string ─────────────────────────────────────

test("resolveFusionUnits: data.judge string resolves to kind:model", () => {
  const { judge } = resolveFusionUnits({
    name: "judge-string-fusion",
    models: ["a/m1", "b/m2"],
    judge: "judge/model",
  });

  assert.deepEqual(judge, { kind: "model", model: "judge/model" });
});

// ─── Judge: config.judgeModel fallback ─────────────────────────────────────

test("resolveFusionUnits: falls back to config.judgeModel when data.judge absent", () => {
  const { judge } = resolveFusionUnits({
    name: "judge-model-fallback",
    models: ["a/m1", "b/m2"],
    config: { judgeModel: "cfg/judge" },
  });

  assert.deepEqual(judge, { kind: "model", model: "cfg/judge" });
});

// ─── Judge: first panel fallback ───────────────────────────────────────────

test("resolveFusionUnits: falls back to first panel when judge and judgeModel absent", () => {
  const { panels, judge } = resolveFusionUnits({
    name: "first-panel-judge",
    models: ["first/panel", "second/panel"],
  });

  assert.deepEqual(judge, panels[0]);
  assert.deepEqual(judge, { kind: "model", model: "first/panel" });
});

// ─── Empty / invalid models ────────────────────────────────────────────────

test("resolveFusionUnits: empty models yields empty panels", () => {
  const { panels, judge } = resolveFusionUnits({
    name: "empty-fusion",
    models: [],
  });

  assert.deepEqual(panels, []);
  // No panel to fall back to → empty model placeholder
  assert.deepEqual(judge, { kind: "model", model: "" });
});

test("resolveFusionUnits: skips null/undefined/invalid entries in models", () => {
  const { panels } = resolveFusionUnits({
    name: "skip-invalid",
    models: ["ok/m1", null, undefined, "", { kind: "combo-ref" }, { foo: "bar" }, "ok/m2"],
  });

  assert.equal(panels.length, 2);
  assert.deepEqual(panels[0], { kind: "model", model: "ok/m1" });
  assert.deepEqual(panels[1], { kind: "model", model: "ok/m2" });
});

// ─── Judge precedence order ────────────────────────────────────────────────

test("resolveFusionUnits: data.judge beats config.judgeModel even when judge is model step", () => {
  const { judge } = resolveFusionUnits({
    name: "precedence",
    models: ["a/m1"],
    judge: { kind: "model", model: "explicit/judge", label: "J" },
    config: { judgeModel: "legacy/judge" },
  });

  assert.deepEqual(judge, { kind: "model", model: "explicit/judge", label: "J" });
});

test("resolveFusionUnits: blank config.judgeModel falls through to first panel", () => {
  const { judge } = resolveFusionUnits({
    name: "blank-judge-model",
    models: ["panel/one", "panel/two"],
    config: { judgeModel: "   " },
  });

  assert.deepEqual(judge, { kind: "model", model: "panel/one" });
});

// ─── Task 0018 hardening ───────────────────────────────────────────────────

test("resolveFusionUnits: first panel as combo-ref becomes default judge when no judge set", () => {
  const allCombos = [{ name: "pool-1", models: ["p/m1"] }];
  const { panels, judge } = resolveFusionUnits(
    {
      name: "ref-first",
      models: [{ kind: "combo-ref", comboName: "pool-1" }, "legacy/b"],
    },
    allCombos
  );

  assert.equal(panels.length, 2);
  assert.deepEqual(judge, { kind: "combo-ref", comboName: "pool-1" });
});

test("resolveFusionUnits: labels on model and combo-ref are preserved", () => {
  const allCombos = [{ name: "pool-x", models: ["x"] }];
  const { panels, judge } = resolveFusionUnits(
    {
      name: "labels",
      models: [
        { kind: "model", model: "a/m", label: "Alpha" },
        { kind: "combo-ref", comboName: "pool-x", label: "Pool X" },
      ],
      judge: { kind: "model", model: "j/m", label: "Judge L" },
    },
    allCombos
  );

  assert.deepEqual(panels[0], { kind: "model", model: "a/m", label: "Alpha" });
  assert.deepEqual(panels[1], {
    kind: "combo-ref",
    comboName: "pool-x",
    label: "Pool X",
  });
  assert.deepEqual(judge, { kind: "model", model: "j/m", label: "Judge L" });
});

// ─── Path-to-100: EMPTY_FUSION_JUDGE + invalid judge fallthrough ───────────

test("resolveFusionUnits: empty panels use EMPTY_FUSION_JUDGE sentinel", () => {
  const { panels, judge } = resolveFusionUnits({
    name: "empty-sentinel",
    models: [],
  });
  assert.deepEqual(panels, []);
  assert.deepEqual(judge, EMPTY_FUSION_JUDGE);
  assert.equal(EMPTY_FUSION_JUDGE.kind, "model");
  assert.equal(EMPTY_FUSION_JUDGE.kind === "model" ? EMPTY_FUSION_JUDGE.model : "x", "");
});

test("resolveFusionUnits: invalid data.judge falls through to judgeModel then first panel", () => {
  // Unnormalizable judge object is skipped → config.judgeModel wins.
  const viaJudgeModel = resolveFusionUnits({
    name: "invalid-judge-to-model",
    models: ["panel/a", "panel/b"],
    judge: { kind: "combo-ref" }, // missing comboName → normalizeComboStep fails
    config: { judgeModel: "cfg/judge" },
  });
  assert.deepEqual(viaJudgeModel.judge, { kind: "model", model: "cfg/judge" });

  // Invalid judge + blank judgeModel → first panel.
  const viaFirstPanel = resolveFusionUnits({
    name: "invalid-judge-to-panel",
    models: ["panel/first", "panel/second"],
    judge: { foo: "bar" },
    config: { judgeModel: "   " },
  });
  assert.deepEqual(viaFirstPanel.judge, { kind: "model", model: "panel/first" });
});
