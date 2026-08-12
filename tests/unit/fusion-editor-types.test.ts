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
  unitToPayload,
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
  assert.equal(form.judgeMode, "");
  assert.equal("judgeMode" in payload.config, false);
});

// ─── EPIC-22 / Task 0110 — cognitive lens editor pure helpers ──────────────

test("normalizeFusionUnit: reads valid mode+addon; drops invalid mode — EPIC-22/0110", () => {
  const ok = normalizeFusionUnit({
    kind: "model",
    model: "p/a",
    thinkingMode: "adversarial",
    systemAddon: "counter-examples",
  });
  assert.ok(ok && ok.kind === "model");
  if (!ok || ok.kind !== "model") return;
  assert.equal(ok.thinkingMode, "adversarial");
  assert.equal(ok.systemAddon, "counter-examples");

  const bad = normalizeFusionUnit({
    kind: "model",
    model: "p/b",
    thinkingMode: "turbo",
    systemAddon: "kept-when-mode-invalid",
  });
  assert.ok(bad && bad.kind === "model");
  if (!bad || bad.kind !== "model") return;
  assert.equal(bad.thinkingMode, undefined);
  assert.equal(bad.systemAddon, "kept-when-mode-invalid");
});

test("unitToPayload: emits structured object when mode or addon set — EPIC-22/0110", () => {
  const withMode = unitToPayload({
    kind: "model",
    model: "p/a",
    thinkingMode: "security",
  });
  assert.equal(typeof withMode, "object");
  assert.deepEqual(withMode, {
    kind: "model",
    model: "p/a",
    thinkingMode: "security",
  });

  const withAddonOnly = unitToPayload({
    kind: "model",
    model: "p/b",
    systemAddon: "Focus on SSRF.",
  });
  assert.deepEqual(withAddonOnly, {
    kind: "model",
    model: "p/b",
    systemAddon: "Focus on SSRF.",
  });
});

test("unitToPayload: empty mode+addon omits keys (bare string) — EPIC-22/0110", () => {
  assert.equal(unitToPayload({ kind: "model", model: "p/plain" }), "p/plain");
  assert.equal(
    unitToPayload({ kind: "model", model: "p/plain", systemAddon: "   " }),
    "p/plain"
  );
});

test("buildSavePayload → createComboSchema.safeParse succeeds for lens combo — EPIC-22/0110", () => {
  const form = emptyFusionForm();
  form.name = "lens-combo";
  form.panels = [
    {
      kind: "model",
      model: "p/a",
      thinkingMode: "first-principles",
      systemAddon: "Rebuild from axioms.",
    },
    { kind: "model", model: "p/b", thinkingMode: "adversarial" },
  ];
  form.judge = { kind: "model", model: "p/judge" };
  form.judgeMode = "dialectical";
  form.triggers.mode = "always";
  const payload = buildSavePayload(form, null, "create");
  const parsed = createComboSchema.safeParse(payload);
  assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error?.issues));
  if (!parsed.success) return;
  assert.equal(parsed.data.config?.judgeMode, "dialectical");
  const step0 = parsed.data.models[0] as {
    thinkingMode?: string;
    systemAddon?: string;
  };
  assert.equal(step0.thinkingMode, "first-principles");
  assert.equal(step0.systemAddon, "Rebuild from axioms.");
});

test("formFromCombo round-trips mode+addon+judgeMode — EPIC-22/0110", () => {
  const form = formFromCombo({
    id: "cog-1",
    name: "cog-fusion",
    strategy: "fusion",
    models: [
      {
        kind: "model",
        model: "p/a",
        thinkingMode: "skeptical-evidence",
        systemAddon: "Cite sources.",
      },
      { kind: "model", model: "p/b", thinkingMode: "systems" },
    ],
    judge: "p/judge",
    config: { judgeMode: "pick-best", triggers: { mode: "always" } },
  });
  assert.equal(form.judgeMode, "pick-best");
  assert.equal(form.panels.length, 2);
  assert.equal(form.panels[0]?.kind, "model");
  if (form.panels[0]?.kind === "model") {
    assert.equal(form.panels[0].thinkingMode, "skeptical-evidence");
    assert.equal(form.panels[0].systemAddon, "Cite sources.");
  }
  if (form.panels[1]?.kind === "model") {
    assert.equal(form.panels[1].thinkingMode, "systems");
  }

  const payload = buildSavePayload(form, null, "create");
  const again = formFromCombo({
    id: "cog-1",
    name: payload.name,
    strategy: payload.strategy,
    models: payload.models,
    judge: payload.judge ?? undefined,
    config: payload.config,
  });
  assert.equal(again.judgeMode, "pick-best");
  if (again.panels[0]?.kind === "model") {
    assert.equal(again.panels[0].thinkingMode, "skeptical-evidence");
    assert.equal(again.panels[0].systemAddon, "Cite sources.");
  }
});

test("switching kind to combo-ref drops cognitive fields on unitToPayload — EPIC-22/0110", () => {
  // Editor setKind("combo-ref") builds a fresh unit without mode/addon.
  const refPayload = unitToPayload({ kind: "combo-ref", comboName: "inner" });
  assert.deepEqual(refPayload, { kind: "combo-ref", comboName: "inner" });
  assert.equal("thinkingMode" in (refPayload as object), false);
  assert.equal("systemAddon" in (refPayload as object), false);
});

// ─── Task 0133 — Rules Mode Payload & Schema Tests ──────────────────────────

test("buildSavePayload & formFromCombo round-trip rules mode with AND/OR operator", () => {
  const form = emptyFusionForm();
  form.name = "rules-fusion";
  form.panels = [{ kind: "model", model: "p/a" }, { kind: "model", model: "p/b" }];
  form.triggers.mode = "rules";
  form.triggers.operator = "OR";
  form.triggers.rules = [
    { id: "r1", kind: "tool-call", pattern: "write*" },
    { id: "r2", kind: "text-match", pattern: "security" },
  ];
  form.fallbackStrategy = "priority";

  const payload = buildSavePayload(form, null, "create");
  assert.equal(payload.strategy, "conditional-fusion");
  const triggers = payload.config.triggers as {
    mode: string;
    operator: string;
    rules: Array<{ kind: string; pattern: string }>;
  };
  assert.equal(triggers.mode, "rules");
  assert.equal(triggers.operator, "OR");
  assert.equal(triggers.rules.length, 2);
  assert.equal(triggers.rules[0]?.kind, "tool-call");
  assert.equal(triggers.rules[0]?.pattern, "write*");
  assert.equal(triggers.rules[1]?.kind, "text-match");
  assert.equal(triggers.rules[1]?.pattern, "security");

  // Validate against Zod schema
  const parsed = createComboSchema.safeParse(payload);
  assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error?.issues));

  // Round-trip back to form
  const loaded = formFromCombo({
    id: "combo-1",
    name: payload.name,
    strategy: payload.strategy,
    models: payload.models,
    config: payload.config,
  });

  assert.equal(loaded.triggers.mode, "rules");
  assert.equal(loaded.triggers.operator, "OR");
  assert.equal(loaded.triggers.rules.length, 2);
  assert.equal(loaded.triggers.rules[0]?.kind, "tool-call");
  assert.equal(loaded.triggers.rules[0]?.pattern, "write*");
  assert.equal(loaded.triggers.rules[1]?.kind, "text-match");
  assert.equal(loaded.triggers.rules[1]?.pattern, "security");
});

test("createComboSchema rejects rule tree with depth > 5", () => {
  // Build a tree of depth 6
  let deepRule: Record<string, unknown> = { kind: "tool-call", pattern: "write*" };
  for (let i = 0; i < 5; i++) {
    deepRule = { operator: "AND", rules: [deepRule] };
  }

  const payload = {
    name: "deep-rules-combo",
    strategy: "conditional-fusion" as const,
    models: ["p/a"],
    config: {
      triggers: {
        mode: "rules",
        operator: "AND",
        rules: [deepRule],
      },
    },
  };

  const parsed = createComboSchema.safeParse(payload);
  assert.equal(parsed.success, false, "Tree depth > 5 must be rejected by Zod schema");
});
