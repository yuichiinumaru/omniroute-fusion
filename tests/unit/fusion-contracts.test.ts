/**
 * Task 0010 — Fusion contracts (Zod schemas + exported runtime types).
 * Covers triggers mode enum, textPatterns, fallbackStrategy self-recursion
 * guard (D8), top-level judge (D1/D2), and backward-compat judgeModel.
 */
import test from "node:test";
import assert from "node:assert/strict";

const {
  createComboSchema,
  updateComboSchema,
  comboRuntimeConfigSchema,
  comboModelEntry,
} = await import("../../src/shared/validation/schemas/combo.ts");

const { ROUTING_STRATEGY_VALUES, ROUTING_STRATEGIES } = await import(
  "../../src/shared/constants/routingStrategies.ts"
);

import type {
  HandleFusionChatOptionsV2,
  ResolvedFusionUnit,
} from "../../open-sse/services/fusion.ts";

// Runtime symbols from fusion.ts (types are imported above).
const fusionMod = await import("../../open-sse/services/fusion.ts");

// ─── Strategy registry ─────────────────────────────────────────────────────

test("ROUTING_STRATEGY_VALUES includes fusion and conditional-fusion exactly once each", () => {
  const fusionCount = ROUTING_STRATEGY_VALUES.filter((v) => v === "fusion").length;
  const conditionalCount = ROUTING_STRATEGY_VALUES.filter((v) => v === "conditional-fusion")
    .length;
  assert.equal(fusionCount, 1);
  assert.equal(conditionalCount, 1);
  assert.ok(ROUTING_STRATEGIES.some((s) => s.value === "fusion"));
  assert.ok(ROUTING_STRATEGIES.some((s) => s.value === "conditional-fusion"));
});

// ─── triggers.mode enum ────────────────────────────────────────────────────

test("triggers.mode accepts always, tool-call, and text-match", () => {
  for (const mode of ["always", "tool-call", "text-match"] as const) {
    const result = createComboSchema.safeParse({
      name: `fusion-triggers-${mode}`,
      models: ["a/m1", "b/m2"],
      strategy: "conditional-fusion",
      config: {
        triggers: { mode },
        fallbackStrategy: "priority",
      },
    });
    assert.equal(result.success, true, `mode=${mode} should pass: ${JSON.stringify(result)}`);
    if (result.success) {
      assert.equal(result.data.config?.triggers?.mode, mode);
    }
  }
});

test("triggers.mode rejects unknown values", () => {
  const result = createComboSchema.safeParse({
    name: "fusion-triggers-bad",
    models: ["a/m1", "b/m2"],
    strategy: "conditional-fusion",
    config: {
      triggers: { mode: "regex" },
      fallbackStrategy: "priority",
    },
  });
  assert.equal(result.success, false);
});

// ─── triggers.textPatterns ─────────────────────────────────────────────────

test("triggers.textPatterns accepts string[] when mode is text-match", () => {
  const result = createComboSchema.safeParse({
    name: "fusion-text-patterns",
    models: ["a/m1", "b/m2"],
    strategy: "conditional-fusion",
    config: {
      triggers: {
        mode: "text-match",
        textPatterns: ["write a file", "edit the", "create*"],
      },
      fallbackStrategy: "priority",
    },
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (result.success) {
    assert.deepEqual(result.data.config?.triggers?.textPatterns, [
      "write a file",
      "edit the",
      "create*",
    ]);
  }
});

test("triggers keeps requireApproval and toolPatterns defaults", () => {
  const result = createComboSchema.safeParse({
    name: "fusion-trigger-defaults",
    models: ["a/m1", "b/m2"],
    strategy: "conditional-fusion",
    config: {
      triggers: { mode: "tool-call" },
      fallbackStrategy: "round-robin",
    },
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (result.success) {
    assert.equal(result.data.config?.triggers?.requireApproval, false);
    assert.deepEqual(result.data.config?.triggers?.toolPatterns, [
      "write*",
      "edit*",
      "create*",
    ]);
  }
});

// ─── fallbackStrategy self-recursion guard (D8) ────────────────────────────

test("fallbackStrategy rejects fusion and conditional-fusion", () => {
  for (const bad of ["fusion", "conditional-fusion", " Fusion ", "CONDITIONAL-FUSION"]) {
    const result = createComboSchema.safeParse({
      name: `fusion-fallback-bad-${bad.trim()}`,
      models: ["a/m1", "b/m2"],
      strategy: "conditional-fusion",
      config: {
        triggers: { mode: "always" },
        fallbackStrategy: bad,
      },
    });
    assert.equal(
      result.success,
      false,
      `fallbackStrategy=${JSON.stringify(bad)} must be rejected`
    );
  }
});

test("fallbackStrategy accepts non-fusion strategies", () => {
  for (const ok of ["priority", "weighted", "round-robin", "cost-optimized"]) {
    const result = createComboSchema.safeParse({
      name: `fusion-fallback-ok-${ok}`,
      models: ["a/m1", "b/m2"],
      strategy: "conditional-fusion",
      config: {
        triggers: { mode: "always" },
        fallbackStrategy: ok,
      },
    });
    assert.equal(result.success, true, `fallbackStrategy=${ok} should pass`);
    if (result.success) {
      assert.equal(result.data.config?.fallbackStrategy, ok);
    }
  }
});

test("comboRuntimeConfigSchema alone rejects fusion fallbackStrategy", () => {
  const bad = comboRuntimeConfigSchema.safeParse({ fallbackStrategy: "fusion" });
  assert.equal(bad.success, false);

  const ok = comboRuntimeConfigSchema.safeParse({ fallbackStrategy: "priority" });
  assert.equal(ok.success, true);
});

// ─── top-level judge (D1 / D2) ─────────────────────────────────────────────

test("createComboSchema accepts top-level judge as string (comboModelEntry)", () => {
  const result = createComboSchema.safeParse({
    name: "fusion-judge-string",
    models: ["a/m1", "b/m2"],
    strategy: "fusion",
    judge: "cc/claude-opus-4-7",
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (result.success) {
    assert.equal(result.data.judge, "cc/claude-opus-4-7");
  }
});

test("createComboSchema accepts top-level judge as model step", () => {
  const result = createComboSchema.safeParse({
    name: "fusion-judge-model-step",
    models: ["a/m1", "b/m2"],
    strategy: "fusion",
    judge: { kind: "model", model: "cc/claude-opus-4-7", label: "Judge" },
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (result.success) {
    assert.equal(typeof result.data.judge, "object");
    assert.equal((result.data.judge as { model: string }).model, "cc/claude-opus-4-7");
  }
});

test("createComboSchema accepts top-level judge as combo-ref", () => {
  const result = createComboSchema.safeParse({
    name: "fusion-judge-combo-ref",
    models: ["a/m1", "b/m2"],
    strategy: "fusion",
    judge: { kind: "combo-ref", comboName: "synthesis-judge", label: "Judge pool" },
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (result.success) {
    assert.equal((result.data.judge as { comboName: string }).comboName, "synthesis-judge");
  }
});

test("updateComboSchema accepts judge and counts as a valid update field", () => {
  const onlyJudge = updateComboSchema.safeParse({
    judge: { kind: "combo-ref", comboName: "judge-pool" },
  });
  assert.equal(onlyJudge.success, true, JSON.stringify(onlyJudge));

  const clearJudge = updateComboSchema.safeParse({ judge: null });
  assert.equal(clearJudge.success, true, JSON.stringify(clearJudge));
});

test("comboModelEntry is the same union used for judge (D2)", () => {
  const asString = comboModelEntry.safeParse("x/y");
  const asModel = comboModelEntry.safeParse({ model: "x/y" });
  const asRef = comboModelEntry.safeParse({ kind: "combo-ref", comboName: "pool" });
  assert.equal(asString.success, true);
  assert.equal(asModel.success, true);
  assert.equal(asRef.success, true);
});

// ─── backward compatibility: config.judgeModel ─────────────────────────────

test("config.judgeModel string still validates (legacy path)", () => {
  const result = createComboSchema.safeParse({
    name: "fusion-legacy-judge-model",
    models: ["a/m1", "b/m2", "c/m3"],
    strategy: "fusion",
    config: {
      judgeModel: "cc/claude-opus-4-7",
      fusionTuning: { minPanel: 2, stragglerGraceMs: 8000, panelHardTimeoutMs: 90000 },
    },
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (result.success) {
    assert.equal(result.data.config?.judgeModel, "cc/claude-opus-4-7");
  }
});

test("judge field and config.judgeModel can coexist", () => {
  const result = createComboSchema.safeParse({
    name: "fusion-judge-both",
    models: ["a/m1", "b/m2"],
    strategy: "fusion",
    judge: { kind: "combo-ref", comboName: "judge-pool" },
    config: { judgeModel: "legacy/model" },
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (result.success) {
    assert.equal((result.data.judge as { comboName: string }).comboName, "judge-pool");
    assert.equal(result.data.config?.judgeModel, "legacy/model");
  }
});

// ─── exported runtime types (fusion.ts) ────────────────────────────────────

test("fusion.ts exports ResolvedFusionUnit and HandleFusionChatOptionsV2 types", () => {
  // Runtime smoke: module loads and legacy HandleFusionChatOptions path still exists.
  assert.equal(typeof fusionMod.handleFusionChat, "function");
  assert.equal(typeof fusionMod.FUSION_DEFAULTS, "object");

  // Compile-time contract exercised by constructing values that match the types.
  const modelUnit: ResolvedFusionUnit = {
    kind: "model",
    model: "a/m1",
    label: "Panel A",
  };
  const refUnit: ResolvedFusionUnit = {
    kind: "combo-ref",
    comboName: "pool",
    label: "Pool",
  };
  assert.equal(modelUnit.kind, "model");
  assert.equal(refUnit.kind, "combo-ref");

  // Shape check for HandleFusionChatOptionsV2 (types-only; no runtime dispatch).
  const optsV2: HandleFusionChatOptionsV2 = {
    body: { messages: [] },
    panels: [modelUnit, refUnit],
    judge: modelUnit,
    handleSingleModel: async () => new Response("ok"),
    log: {
      info: () => {},
      warn: () => {},
      debug: () => {},
    },
    comboName: "fusion-demo",
    tuning: { minPanel: 2 },
  };
  assert.equal(optsV2.panels.length, 2);
  assert.equal(optsV2.judge.kind, "model");
});
