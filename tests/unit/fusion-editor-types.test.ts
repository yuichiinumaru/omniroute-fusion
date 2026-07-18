/**
 * Task 0016 path-to-100 — pure helpers for Fusion editor load/save.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  FALLBACK_STRATEGY_OPTIONS,
  buildSavePayload,
  emptyFusionForm,
  filterFusionCombos,
  formFromCombo,
  isFusionStrategy,
  normalizeFusionUnit,
  type FusionEditorForm,
} from "../../src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts";
import { ROUTING_STRATEGIES } from "../../src/shared/constants/routingStrategies.ts";
import { createComboSchema } from "../../src/shared/validation/schemas/combo.ts";

test("isFusionStrategy accepts only fusion family", () => {
  assert.equal(isFusionStrategy("fusion"), true);
  assert.equal(isFusionStrategy("conditional-fusion"), true);
  assert.equal(isFusionStrategy("priority"), false);
});

test("filterFusionCombos keeps fusion family and excludes hidden/non-fusion", () => {
  const input = [
    { id: "1", name: "f1", strategy: "fusion" },
    { id: "2", name: "f2", strategy: "conditional-fusion" },
    { id: "3", name: "prio", strategy: "priority" },
    { id: "4", name: "hidden-f", strategy: "fusion", isHidden: true },
    { id: "5", name: "no-strategy" },
    { id: "6", name: "weighted", strategy: "weighted", isHidden: false },
  ];
  const out = filterFusionCombos(input);
  assert.deepEqual(
    out.map((c) => c.id),
    ["1", "2"]
  );
});

test("normalizeFusionUnit: string, model step, combo-ref", () => {
  assert.deepEqual(normalizeFusionUnit("p/m"), { kind: "model", model: "p/m" });
  assert.equal(normalizeFusionUnit({ kind: "combo-ref", comboName: "inner" })?.kind, "combo-ref");
  assert.equal(normalizeFusionUnit({ kind: "combo-ref", comboName: "  " }), null);
});

test("buildSavePayload: always → strategy fusion", () => {
  const form = emptyFusionForm();
  form.name = "f1";
  form.panels = [
    { kind: "model", model: "p/a" },
    { kind: "model", model: "p/b" },
  ];
  form.judge = { kind: "model", model: "p/judge" };
  form.triggers.mode = "always";
  const payload = buildSavePayload(form, null, "create");
  assert.equal(payload.strategy, "fusion");
  assert.equal((payload.config.triggers as { mode: string }).mode, "always");
  assert.equal(payload.config.fallbackStrategy, undefined);
  assert.deepEqual(payload.judge, "p/judge");
});

test("buildSavePayload: tool-call → conditional-fusion + fallback", () => {
  const form = emptyFusionForm();
  form.name = "f2";
  form.panels = [{ kind: "model", model: "p/a" }];
  form.triggers.mode = "tool-call";
  form.fallbackStrategy = "priority";
  const payload = buildSavePayload(form, null, "create");
  assert.equal(payload.strategy, "conditional-fusion");
  assert.equal(payload.config.fallbackStrategy, "priority");
});

test("buildSavePayload: update clears judge with null", () => {
  const form = emptyFusionForm();
  form.name = "f3";
  form.panels = [{ kind: "model", model: "p/a" }];
  form.judge = null;
  form.triggers.mode = "always";
  const payload = buildSavePayload(form, {}, "update");
  assert.equal(payload.judge, null);
});

test("FALLBACK_STRATEGY_OPTIONS: Decision D8 excludes fusion family from editor dropdown", () => {
  const values = FALLBACK_STRATEGY_OPTIONS.map((o) => o.value);
  assert.ok(values.length >= 14, `expected non-fusion strategies, got ${values.length}`);
  assert.ok(!values.includes("fusion"), "dropdown must not offer fusion");
  assert.ok(!values.includes("conditional-fusion"), "dropdown must not offer conditional-fusion");
  // Parity with ROUTING_STRATEGIES filter used by the editor UI.
  const expected = ROUTING_STRATEGIES.filter(
    (s) => s.value !== "fusion" && s.value !== "conditional-fusion"
  ).map((s) => s.value);
  assert.deepEqual(values, expected);
});

test("buildSavePayload: text-match → conditional-fusion + textPatterns + non-fusion fallback", () => {
  const form = emptyFusionForm();
  form.name = "f4-text";
  form.panels = [
    { kind: "model", model: "p/a" },
    { kind: "model", model: "p/b" },
  ];
  form.judge = { kind: "model", model: "p/judge" };
  form.triggers.mode = "text-match";
  form.triggers.textPatterns = ["urgent", "escalate"];
  form.fallbackStrategy = "weighted";
  const payload = buildSavePayload(form, null, "create");
  assert.equal(payload.strategy, "conditional-fusion");
  const triggers = payload.config.triggers as {
    mode: string;
    textPatterns: string[];
  };
  assert.equal(triggers.mode, "text-match");
  assert.deepEqual(triggers.textPatterns, ["urgent", "escalate"]);
  assert.equal(payload.config.fallbackStrategy, "weighted");
  assert.ok(
    FALLBACK_STRATEGY_OPTIONS.some((o) => o.value === payload.config.fallbackStrategy),
    "saved fallback must be in editor D8 allowlist"
  );
  // Couple to Zod create schema (server contract).
  const parsed = createComboSchema.safeParse(payload);
  assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error?.issues));
});

test("formFromCombo: maps judgeModel legacy + strategy conditional default mode", () => {
  const form = formFromCombo({
    id: "1",
    name: "stored",
    strategy: "conditional-fusion",
    models: ["p/a", "p/b"],
    config: {
      judgeModel: "p/judge",
      triggers: { mode: "text-match", textPatterns: ["hello"] },
      fallbackStrategy: "weighted",
    },
  });
  assert.equal(form.triggers.mode, "text-match");
  assert.deepEqual(form.triggers.textPatterns, ["hello"]);
  assert.equal(form.judge?.kind, "model");
  assert.equal(form.judge && form.judge.kind === "model" ? form.judge.model : "", "p/judge");
  assert.equal(form.fallbackStrategy, "weighted");
  assert.equal(form.panels.length, 2);
});

test("formFromCombo: always mode when strategy fusion without triggers", () => {
  const form = formFromCombo({
    id: "2",
    name: "plain",
    strategy: "fusion",
    models: ["p/a"],
    config: {},
  });
  assert.equal(form.triggers.mode, "always");
});

test("emptyFusionForm is a valid starting point for create", () => {
  const form: FusionEditorForm = emptyFusionForm();
  form.name = "n";
  form.panels = [{ kind: "model", model: "p/a" }];
  const payload = buildSavePayload(form, null, "create");
  assert.equal(payload.name, "n");
  assert.ok(payload.models.length >= 1);
});
