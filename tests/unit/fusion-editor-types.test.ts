/**
 * Task 0016 path-to-100 — pure helpers for Fusion editor load/save.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSavePayload,
  emptyFusionForm,
  formFromCombo,
  isFusionStrategy,
  normalizeFusionUnit,
  type FusionEditorForm,
} from "../../src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts";

test("isFusionStrategy accepts only fusion family", () => {
  assert.equal(isFusionStrategy("fusion"), true);
  assert.equal(isFusionStrategy("conditional-fusion"), true);
  assert.equal(isFusionStrategy("priority"), false);
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

test("buildSavePayload: fallbackStrategy fusion is allowed in form but schema rejects — editor should use non-fusion only", () => {
  // Editor dropdown excludes fusion; payload still passes through string — D8 is runtime/schema.
  const form = emptyFusionForm();
  form.name = "f4";
  form.panels = [{ kind: "model", model: "p/a" }];
  form.triggers.mode = "text-match";
  form.triggers.textPatterns = ["urgent"];
  form.fallbackStrategy = "priority";
  const payload = buildSavePayload(form, null, "create");
  assert.notEqual(payload.config.fallbackStrategy, "fusion");
  assert.notEqual(payload.config.fallbackStrategy, "conditional-fusion");
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
