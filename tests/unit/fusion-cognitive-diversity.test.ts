/**
 * EPIC-22 — Cognitive diversity as config (anti-bullshit contracts).
 *
 * T22-A (0107): pure catalog section MUST pass.
 * T22-B/C/D (0108–0110): skeleton contracts skipped until those tasks land
 * (`test.skip` message tags the owning task). Do not unskip without green impl.
 *
 * Style: Node native `node:test` + `node:assert/strict` (fusion-panel-tools-none).
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  FUSION_COGNITIVE_LENS_IDS,
  FUSION_JUDGE_MODE_DEFAULT,
  FUSION_JUDGE_MODE_IDS,
  fusionJudgeFingerprint,
  fusionLensFingerprint,
  isFusionCognitiveLensId,
  isFusionJudgeModeId,
  resolveJudgeModeDirective,
  resolvePanelLensText,
  type FusionCognitiveLensId,
} from "../../src/shared/constants/fusionCognitiveLenses.ts";

type Body = Record<string, unknown>;

function okResponse(content: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

const fastTuning = {
  minPanel: 2,
  stragglerGraceMs: 50,
  panelHardTimeoutMs: 5000,
};

function extractSystemBlob(body: Body): string {
  const chunks: string[] = [];
  if (typeof body.system === "string") chunks.push(body.system);
  if (Array.isArray(body.messages)) {
    for (const m of body.messages as Array<{ role?: string; content?: unknown }>) {
      if (m.role !== "system" && m.role !== "developer") continue;
      if (typeof m.content === "string") chunks.push(m.content);
      else if (Array.isArray(m.content)) {
        for (const p of m.content as Array<{ text?: string }>) {
          if (p?.text) chunks.push(p.text);
        }
      }
    }
  }
  return chunks.join("\n");
}

const noop = () => {};
const log = { info: noop, warn: noop, debug: noop, error: noop };

// ─── T22-A pure catalog ────────────────────────────────────────────────────

test("catalog: closed lens id set matches EPIC-22 (no low/medium/high/adaptive)", () => {
  assert.deepEqual([...FUSION_COGNITIVE_LENS_IDS], [
    "first-principles",
    "adversarial",
    "security",
    "systems",
    "implementation",
    "skeptical-evidence",
    "custom",
  ]);

  const forbidden = ["low", "medium", "high", "adaptive", "turbo", "none"];
  for (const id of forbidden) {
    assert.equal(
      isFusionCognitiveLensId(id),
      false,
      `provider-thinking / unknown id must not be a lens: ${id}`
    );
  }
  assert.equal(isFusionCognitiveLensId("adversarial"), true);
});

test("catalog: every preset lens resolves to non-empty fingerprint text (≥20 chars)", () => {
  for (const id of FUSION_COGNITIVE_LENS_IDS) {
    if (id === "custom") continue;
    const text = resolvePanelLensText(id, undefined);
    assert.ok(text && text.length >= 20, `${id} must resolve to ≥20 chars, got ${text?.length ?? 0}`);
    assert.ok(
      text.includes(fusionLensFingerprint(id)),
      `${id} inject must include ${fusionLensFingerprint(id)}`
    );
    assert.match(text, new RegExp(`\\[omniroute-lens:${id}\\]`));
  }
});

test("catalog: preset inject texts are pairwise distinct (anti-correlation)", () => {
  const presets = FUSION_COGNITIVE_LENS_IDS.filter((id) => id !== "custom");
  const texts = presets.map((id) => resolvePanelLensText(id, undefined));
  const fingerprints = presets.map((id) => fusionLensFingerprint(id));

  // Full inject strings must differ so panels cannot silently share framing.
  assert.equal(new Set(texts).size, texts.length, "duplicate preset inject text");
  // Fingerprints themselves must be unique tokens.
  assert.equal(new Set(fingerprints).size, fingerprints.length, "duplicate fingerprint token");

  // No preset text may embed another preset's fingerprint (cross-correlation).
  for (let i = 0; i < presets.length; i++) {
    for (let j = 0; j < fingerprints.length; j++) {
      if (i === j) continue;
      assert.equal(
        texts[i].includes(fingerprints[j]),
        false,
        `${presets[i]} must not embed ${fingerprints[j]}`
      );
    }
  }
});

test("catalog: whitespace-padded mode ids resolve like trimmed ids", () => {
  const addon = "PAD_ADDON_MARKER";
  assert.equal(resolvePanelLensText("  adversarial  ", undefined), resolvePanelLensText("adversarial"));
  assert.equal(
    resolvePanelLensText("  adversarial  ", `  ${addon}  `),
    resolvePanelLensText("adversarial", addon)
  );
  assert.equal(resolvePanelLensText("  custom  ", addon), addon);
  assert.equal(resolvePanelLensText("  turbo  ", addon), "");
});

test("catalog: custom without addon is empty; with addon returns addon", () => {
  assert.equal(resolvePanelLensText("custom", undefined), "");
  assert.equal(resolvePanelLensText("custom", null), "");
  assert.equal(resolvePanelLensText("custom", ""), "");
  assert.equal(resolvePanelLensText("custom", "   "), "");

  const addon = "Operator-only framing for this panel.";
  assert.equal(resolvePanelLensText("custom", addon), addon);
  assert.equal(resolvePanelLensText("custom", `  ${addon}  `), addon);
  // custom has no catalog fingerprint requirement
  assert.equal(resolvePanelLensText("custom", addon).includes("[omniroute-lens:"), false);
});

test("catalog: resolvePanelLensText composes preset + \\n\\n + addon", () => {
  const addon = "EXTRA_ADDON_MARKER_zz";
  const composed = resolvePanelLensText("adversarial", addon);
  const preset = resolvePanelLensText("adversarial", undefined);

  assert.ok(composed.includes(fusionLensFingerprint("adversarial")));
  assert.ok(composed.includes(addon));
  assert.equal(composed, `${preset}\n\n${addon}`);

  // omit mode + addon alone (D4)
  assert.equal(resolvePanelLensText(undefined, addon), addon);
  assert.equal(resolvePanelLensText(null, addon), addon);
  assert.equal(resolvePanelLensText("", addon), addon);
});

test("catalog: unknown non-empty mode returns empty (documented no-op inject)", () => {
  // Unknown mode → empty string; addon ignored so unvalidated config cannot inject.
  assert.equal(resolvePanelLensText("turbo", undefined), "");
  assert.equal(resolvePanelLensText("turbo", "should-not-inject"), "");
  assert.equal(resolvePanelLensText("low", "nope"), "");
  assert.equal(resolvePanelLensText("medium", "nope"), "");
  assert.equal(resolvePanelLensText("high", "nope"), "");
  assert.equal(resolvePanelLensText("not-a-lens", "x"), "");
});

test("catalog: omit mode without addon is empty (default-off)", () => {
  assert.equal(resolvePanelLensText(undefined, undefined), "");
  assert.equal(resolvePanelLensText(undefined, null), "");
  assert.equal(resolvePanelLensText("", ""), "");
  assert.equal(resolvePanelLensText(null, "   "), "");
});

test("catalog: judge mode ids + resolveJudgeModeDirective fingerprints", () => {
  assert.deepEqual([...FUSION_JUDGE_MODE_IDS], [
    "synthesize",
    "dialectical",
    "security-review",
    "pick-best",
  ]);
  assert.equal(FUSION_JUDGE_MODE_DEFAULT, "synthesize");
  assert.equal(isFusionJudgeModeId("pick-best"), true);
  assert.equal(isFusionJudgeModeId("turbo"), false);

  for (const id of FUSION_JUDGE_MODE_IDS) {
    const text = resolveJudgeModeDirective(id);
    assert.ok(text.length >= 20, id);
    assert.ok(text.includes(fusionJudgeFingerprint(id)), id);
  }

  // omit / unknown → synthesize default
  assert.equal(resolveJudgeModeDirective(undefined), resolveJudgeModeDirective("synthesize"));
  assert.equal(resolveJudgeModeDirective(""), resolveJudgeModeDirective("synthesize"));
  assert.equal(resolveJudgeModeDirective("turbo"), resolveJudgeModeDirective("synthesize"));

  assert.notEqual(
    resolveJudgeModeDirective("pick-best"),
    resolveJudgeModeDirective("synthesize")
  );
});

test("catalog: type-level FusionCognitiveLensId exhaustiveness smoke", () => {
  // Runtime smoke that every id is assignable through the type union.
  const sample: FusionCognitiveLensId = "systems";
  assert.equal(isFusionCognitiveLensId(sample), true);
  assert.equal(FUSION_COGNITIVE_LENS_IDS.includes(sample), true);
});

// ─── T22-B schema + normalize + resolve plumb (0108) ───────────────────────

const { createComboSchema, FUSION_SYSTEM_ADDON_MAX_CHARS } = await import(
  "../../src/shared/validation/schemas/combo.ts"
);
const { normalizeComboStep } = await import("../../src/lib/combos/steps.ts");
const { resolveFusionUnits } = await import("../../open-sse/services/fusion.ts");

test("schema: accepts thinkingMode adversarial and keeps field — EPIC-22/0108", () => {
  const result = createComboSchema.safeParse({
    name: "cognitive-adv",
    strategy: "fusion",
    models: [{ kind: "model", model: "p/a", thinkingMode: "adversarial" }],
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (!result.success) return;
  const step = result.data.models[0] as { thinkingMode?: string; model?: string };
  assert.equal(step.thinkingMode, "adversarial");
  assert.equal(step.model, "p/a");
});

test("schema: rejects unknown thinkingMode — EPIC-22/0108", () => {
  const result = createComboSchema.safeParse({
    name: "cognitive-turbo",
    models: [{ kind: "model", model: "p/a", thinkingMode: "turbo" }],
  });
  assert.equal(result.success, false);
});

test("schema: custom without systemAddon fails — EPIC-22/0108", () => {
  const missing = createComboSchema.safeParse({
    name: "cognitive-custom-empty",
    models: [{ kind: "model", model: "p/a", thinkingMode: "custom" }],
  });
  assert.equal(missing.success, false);

  const blank = createComboSchema.safeParse({
    name: "cognitive-custom-blank",
    models: [{ kind: "model", model: "p/a", thinkingMode: "custom", systemAddon: "   " }],
  });
  assert.equal(blank.success, false);
});

test("schema: custom + non-empty systemAddon accepted — EPIC-22/0108", () => {
  const result = createComboSchema.safeParse({
    name: "cognitive-custom-ok",
    models: [
      {
        kind: "model",
        model: "p/a",
        thinkingMode: "custom",
        systemAddon: "Operator-only framing.",
      },
    ],
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (!result.success) return;
  const step = result.data.models[0] as { thinkingMode?: string; systemAddon?: string };
  assert.equal(step.thinkingMode, "custom");
  assert.equal(step.systemAddon, "Operator-only framing.");
});

test("schema: optional systemAddon with preset mode accepted — EPIC-22/0108", () => {
  const result = createComboSchema.safeParse({
    name: "cognitive-preset-addon",
    models: [
      {
        kind: "model",
        model: "p/a",
        thinkingMode: "security",
        systemAddon: "Focus on SSRF.",
      },
    ],
  });
  assert.equal(result.success, true, JSON.stringify(result));
  if (!result.success) return;
  const step = result.data.models[0] as { thinkingMode?: string; systemAddon?: string };
  assert.equal(step.thinkingMode, "security");
  assert.equal(step.systemAddon, "Focus on SSRF.");
});

test("schema: systemAddon over max length fails — EPIC-22/0108", () => {
  const tooLong = "x".repeat(FUSION_SYSTEM_ADDON_MAX_CHARS + 1);
  const result = createComboSchema.safeParse({
    name: "cognitive-addon-too-long",
    models: [
      {
        kind: "model",
        model: "p/a",
        thinkingMode: "adversarial",
        systemAddon: tooLong,
      },
    ],
  });
  assert.equal(result.success, false);
  assert.equal(FUSION_SYSTEM_ADDON_MAX_CHARS, 4000);
});

test("schema: config.judgeMode pick-best accepted; unknown rejected — EPIC-22/0108", () => {
  const ok = createComboSchema.safeParse({
    name: "judge-mode-ok",
    strategy: "fusion",
    models: ["p/a", "p/b"],
    config: { judgeMode: "pick-best", fusionTuning: { minPanel: 2 } },
  });
  assert.equal(ok.success, true, JSON.stringify(ok));
  if (ok.success) {
    assert.equal(ok.data.config?.judgeMode, "pick-best");
  }

  const bad = createComboSchema.safeParse({
    name: "judge-mode-bad",
    strategy: "fusion",
    models: ["p/a"],
    config: { judgeMode: "turbo" },
  });
  assert.equal(bad.success, false);
});

test("normalizeComboStep preserves thinkingMode + systemAddon — EPIC-22/0108", () => {
  const step = normalizeComboStep(
    {
      kind: "model",
      model: "p/panel",
      thinkingMode: "first-principles",
      systemAddon: "EXTRA",
      label: "A",
    },
    { comboName: "norm-cog", index: 0 }
  );
  assert.ok(step);
  assert.equal(step?.kind, "model");
  if (step?.kind === "model") {
    assert.equal(step.thinkingMode, "first-principles");
    assert.equal(step.systemAddon, "EXTRA");
    assert.equal(step.label, "A");
    assert.equal(step.model, "p/panel");
  }
});

test("resolveFusionUnits / comboStepToFusionUnit plumbs mode+addon on model units — EPIC-22/0108", () => {
  const { panels, judge } = resolveFusionUnits({
    name: "resolve-cog",
    models: [
      {
        kind: "model",
        model: "p/a",
        thinkingMode: "adversarial",
        systemAddon: "counter-examples",
      },
      { kind: "model", model: "p/b", thinkingMode: "systems" },
      "p/plain",
    ],
    judge: { kind: "model", model: "p/judge" },
  });

  assert.equal(panels.length, 3);
  assert.deepEqual(panels[0], {
    kind: "model",
    model: "p/a",
    thinkingMode: "adversarial",
    systemAddon: "counter-examples",
  });
  assert.deepEqual(panels[1], {
    kind: "model",
    model: "p/b",
    thinkingMode: "systems",
  });
  // omit fields ⇒ pre-feature shape (kind + model only)
  assert.deepEqual(panels[2], { kind: "model", model: "p/plain" });
  assert.deepEqual(judge, { kind: "model", model: "p/judge" });
});

test("schema+resolve omit cognitive fields ⇒ pre-feature shape — EPIC-22/0108", () => {
  const parsed = createComboSchema.safeParse({
    name: "omit-cog",
    strategy: "fusion",
    models: [{ kind: "model", model: "p/a" }, "p/b"],
    config: { judgeModel: "p/judge" },
  });
  assert.equal(parsed.success, true, JSON.stringify(parsed));
  if (!parsed.success) return;

  const step0 = parsed.data.models[0] as Record<string, unknown>;
  assert.equal("thinkingMode" in step0, false);
  assert.equal("systemAddon" in step0, false);
  assert.equal("judgeMode" in (parsed.data.config ?? {}), false);

  const { panels } = resolveFusionUnits({
    name: parsed.data.name,
    models: parsed.data.models,
    config: parsed.data.config,
  });
  assert.deepEqual(panels[0], { kind: "model", model: "p/a" });
  assert.deepEqual(panels[1], { kind: "model", model: "p/b" });
});

test("schema → normalize → resolve round-trip keeps cognitive fields — EPIC-22/0108", () => {
  const parsed = createComboSchema.safeParse({
    name: "round-trip-cog",
    strategy: "fusion",
    models: [
      {
        kind: "model",
        model: "p/a",
        thinkingMode: "skeptical-evidence",
        systemAddon: "Cite sources.",
        label: "Skeptic",
      },
    ],
    config: { judgeMode: "dialectical", judgeModel: "p/judge" },
  });
  assert.equal(parsed.success, true, JSON.stringify(parsed));
  if (!parsed.success) return;

  const rawStep = parsed.data.models[0];
  const normalized = normalizeComboStep(rawStep, { comboName: "round-trip-cog", index: 0 });
  assert.ok(normalized && normalized.kind === "model");
  if (!normalized || normalized.kind !== "model") return;
  assert.equal(normalized.thinkingMode, "skeptical-evidence");
  assert.equal(normalized.systemAddon, "Cite sources.");

  const { panels } = resolveFusionUnits({
    name: parsed.data.name,
    models: parsed.data.models,
    config: parsed.data.config,
  });
  assert.equal(panels[0].kind, "model");
  if (panels[0].kind === "model") {
    assert.equal(panels[0].thinkingMode, "skeptical-evidence");
    assert.equal(panels[0].systemAddon, "Cite sources.");
    assert.equal(panels[0].label, "Skeptic");
  }
  assert.equal(parsed.data.config?.judgeMode, "dialectical");
});

// ─── T22-C runtime anti-bullshit (0109) ────────────────────────────────────

const { handleFusionChatV2, buildJudgePrompt } = await import(
  "../../open-sse/services/fusion.ts"
);

const toolsFixture = [
  { type: "function", function: { name: "write_file", parameters: {} } },
];

test("runtime: unset modes → no lens fingerprint in panel system — EPIC-22/0109", async () => {
  const panelBodies: Body[] = [];
  const handleSingleModel = async (body: Body, model: string) => {
    if (model !== "p/judge") panelBodies.push(body);
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };

  const res = await handleFusionChatV2({
    body: {
      messages: [
        { role: "system", content: "Base system." },
        { role: "user", content: "Q" },
      ],
      stream: true,
      tools: toolsFixture,
      tool_choice: "auto",
    },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    comboName: "cog-baseline",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.equal(panelBodies.length, 2);
  for (const b of panelBodies) {
    const blob = extractSystemBlob(b);
    assert.equal(blob.includes("[omniroute-lens:"), false, "no lens fingerprint");
    assert.equal(b.stream, false, "D9 stream false");
    assert.equal(b.tool_choice, "none", "D9 tool_choice none");
    assert.deepEqual(b.tools, toolsFixture, "D9 tools kept");
  }
});

test(
  "runtime: different thinkingModes ⇒ different system blobs (anti-bullshit) — EPIC-22/0109",
  async () => {
    const byModel = new Map<string, Body>();
    const handleSingleModel = async (body: Body, model: string) => {
      if (model !== "p/judge") byModel.set(model, body);
      if (model === "p/judge") return okResponse("FINAL");
      return okResponse(`ans-${model}`);
    };

    const res = await handleFusionChatV2({
      body: {
        messages: [
          { role: "system", content: "Base system." },
          { role: "user", content: "Q" },
        ],
        stream: true,
        tools: toolsFixture,
        tool_choice: "required",
      },
      panels: [
        { kind: "model", model: "p/a", thinkingMode: "first-principles" },
        { kind: "model", model: "p/b", thinkingMode: "adversarial" },
      ],
      judge: { kind: "model", model: "p/judge" },
      handleSingleModel,
      log,
      comboName: "cog-diversity",
      tuning: fastTuning,
    });

    assert.equal(res.status, 200);
    const bodyA = byModel.get("p/a");
    const bodyB = byModel.get("p/b");
    assert.ok(bodyA && bodyB, "both panel bodies captured");
    const blobA = extractSystemBlob(bodyA!);
    const blobB = extractSystemBlob(bodyB!);
    assert.notEqual(blobA, blobB, "system blobs must differ by mode");
    assert.ok(
      blobA.includes(fusionLensFingerprint("first-principles")),
      "panel A first-principles fingerprint"
    );
    assert.ok(
      blobB.includes(fusionLensFingerprint("adversarial")),
      "panel B adversarial fingerprint"
    );
    assert.equal(blobA.includes(fusionLensFingerprint("adversarial")), false);
    assert.equal(blobB.includes(fusionLensFingerprint("first-principles")), false);
    // D9 still holds under inject
    for (const b of [bodyA!, bodyB!]) {
      assert.equal(b.stream, false);
      assert.equal(b.tool_choice, "none");
      assert.deepEqual(b.tools, toolsFixture);
    }
  }
);

test("runtime: mode + systemAddon composes both texts — EPIC-22/0109", async () => {
  const addon = "EXTRA_ADDON_MARKER_zz";
  let panelBody: Body | null = null;
  const handleSingleModel = async (body: Body, model: string) => {
    if (model === "p/a") panelBody = body;
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };

  await handleFusionChatV2({
    body: {
      messages: [
        { role: "system", content: "Base." },
        { role: "user", content: "Q" },
      ],
      stream: false,
    },
    panels: [
      {
        kind: "model",
        model: "p/a",
        thinkingMode: "security",
        systemAddon: addon,
      },
      { kind: "model", model: "p/b", thinkingMode: "systems" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: fastTuning,
  });

  assert.ok(panelBody);
  const blob = extractSystemBlob(panelBody!);
  assert.ok(blob.includes(fusionLensFingerprint("security")));
  assert.ok(blob.includes(addon));
});

test("runtime: custom + systemAddon injects addon only — EPIC-22/0109", async () => {
  const addon = "Operator-only framing for this panel.";
  let panelBody: Body | null = null;
  const handleSingleModel = async (body: Body, model: string) => {
    if (model === "p/a") panelBody = body;
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };

  await handleFusionChatV2({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: false,
    },
    panels: [
      { kind: "model", model: "p/a", thinkingMode: "custom", systemAddon: addon },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: fastTuning,
  });

  assert.ok(panelBody);
  const blob = extractSystemBlob(panelBody!);
  assert.ok(blob.includes(addon));
  assert.equal(blob.includes("[omniroute-lens:"), false);
});

test("runtime: panel modes do not leak into judge body — EPIC-22/0109", async () => {
  let judgeBody: Body | null = null;
  const handleSingleModel = async (body: Body, model: string) => {
    if (model === "p/judge") {
      judgeBody = body;
      return okResponse("FINAL");
    }
    return okResponse(`ans-${model}`);
  };

  await handleFusionChatV2({
    body: {
      messages: [
        { role: "system", content: "Base system." },
        { role: "user", content: "Q" },
      ],
      stream: true,
    },
    panels: [
      { kind: "model", model: "p/a", thinkingMode: "first-principles" },
      { kind: "model", model: "p/b", thinkingMode: "adversarial" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: fastTuning,
  });

  assert.ok(judgeBody);
  const judgeBlob = extractSystemBlob(judgeBody!);
  assert.equal(
    judgeBlob.includes(fusionLensFingerprint("first-principles")),
    false,
    "judge must not get panel first-principles lens"
  );
  assert.equal(
    judgeBlob.includes(fusionLensFingerprint("adversarial")),
    false,
    "judge must not get panel adversarial lens"
  );
  // Judge user turn must still include sources (not panel system inject)
  const messages = (judgeBody!.messages as Array<{ role?: string; content?: unknown }>) ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = typeof lastUser?.content === "string" ? lastUser.content : "";
  assert.ok(userText.includes("[Source 1]"), "judge prompt has panel sources");
  assert.equal(userText.includes("[omniroute-lens:"), false, "judge prompt has no panel lens");
});

test("runtime: judgeMode pick-best changes judge prompt vs synthesize — EPIC-22/0109", async () => {
  let pickBestUser = "";
  let synthesizeUser = "";

  const makeHandler = (slot: "pick" | "syn") => async (body: Body, model: string) => {
    if (model === "p/judge") {
      const messages = (body.messages as Array<{ role?: string; content?: unknown }>) ?? [];
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const text = typeof lastUser?.content === "string" ? lastUser.content : "";
      if (slot === "pick") pickBestUser = text;
      else synthesizeUser = text;
      return okResponse("FINAL");
    }
    return okResponse(`ans-${model}`);
  };

  const base = {
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: false,
    },
    panels: [
      { kind: "model" as const, model: "p/a" },
      { kind: "model" as const, model: "p/b" },
    ],
    judge: { kind: "model" as const, model: "p/judge" },
    log,
    tuning: fastTuning,
  };

  await handleFusionChatV2({
    ...base,
    handleSingleModel: makeHandler("pick"),
    judgeMode: "pick-best",
    comboName: "judge-pick",
  });
  await handleFusionChatV2({
    ...base,
    handleSingleModel: makeHandler("syn"),
    // omit judgeMode → synthesize default
    comboName: "judge-syn",
  });

  assert.ok(pickBestUser.length > 0 && synthesizeUser.length > 0);
  assert.notEqual(pickBestUser, synthesizeUser);
  assert.ok(pickBestUser.includes(fusionJudgeFingerprint("pick-best")));
  assert.ok(synthesizeUser.includes(fusionJudgeFingerprint("synthesize")));
  assert.equal(pickBestUser.includes(fusionJudgeFingerprint("synthesize")), false);

  // Pure helper parity with runtime capture
  const purePick = buildJudgePrompt([{ text: "a" }, { text: "b" }], "pick-best");
  const pureSyn = buildJudgePrompt([{ text: "a" }, { text: "b" }], "synthesize");
  assert.ok(purePick.includes(fusionJudgeFingerprint("pick-best")));
  assert.ok(pureSyn.includes(fusionJudgeFingerprint("synthesize")));
  assert.notEqual(purePick, pureSyn);
});

test("runtime: single-panel early path still injects mode — EPIC-22/0109", async () => {
  let bodyCaptured: Body | null = null;
  const handleSingleModel = async (body: Body, model: string) => {
    bodyCaptured = body;
    return okResponse(`ans-${model}`);
  };

  const res = await handleFusionChatV2({
    body: {
      messages: [
        { role: "system", content: "Base." },
        { role: "user", content: "solo" },
      ],
      stream: true,
      tools: toolsFixture,
    },
    panels: [{ kind: "model", model: "p/solo", thinkingMode: "implementation" }],
    judge: { kind: "model", model: "p/solo" },
    handleSingleModel,
    log,
    comboName: "single-cog",
  });

  assert.equal(res.status, 200);
  assert.ok(bodyCaptured);
  const blob = extractSystemBlob(bodyCaptured!);
  assert.ok(blob.includes(fusionLensFingerprint("implementation")));
  // Early single-panel path keeps client stream/tools (not D9 panel policy).
  assert.equal(bodyCaptured!.stream, true);
  assert.deepEqual(bodyCaptured!.tools, toolsFixture);
});

test("runtime: combo-ref panel with no mode still D9 — EPIC-22/0109", async () => {
  let comboPanelBody: Body | null = null;
  const handleSingleModel = async (_body: Body, model: string) => {
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };
  const handleComboChat = async (opts: { body: Body; combo: { name: string } }) => {
    comboPanelBody = opts.body;
    return okResponse("ans-combo:pool-1");
  };

  const res = await handleFusionChatV2({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: true,
      tools: toolsFixture,
      tool_choice: "auto",
    },
    panels: [
      { kind: "combo-ref", comboName: "pool-1" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    handleComboChat,
    allCombos: [{ name: "pool-1", models: ["p/x"], strategy: "priority" }],
    log,
    comboName: "cog-combo-ref",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.ok(comboPanelBody);
  assert.equal(comboPanelBody!.stream, false);
  assert.equal(comboPanelBody!.tool_choice, "none");
  assert.deepEqual(comboPanelBody!.tools, toolsFixture);
  assert.equal(extractSystemBlob(comboPanelBody!).includes("[omniroute-lens:"), false);
});

// ─── T22-D editor pure (0110) ──────────────────────────────────────────────

test(
  "editor: unitToPayload / formFromCombo round-trip thinkingMode + systemAddon — EPIC-22/0110",
  async () => {
    const {
      buildSavePayload,
      emptyFusionForm,
      formFromCombo,
      normalizeFusionUnit,
      unitToPayload,
    } = await import(
      "../../src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts"
    );
    const { createComboSchema } = await import(
      "../../src/shared/validation/schemas/combo.ts"
    );

    // normalize keeps valid mode+addon; drops invalid mode
    const normalized = normalizeFusionUnit({
      kind: "model",
      model: "p/a",
      thinkingMode: "adversarial",
      systemAddon: "counter-examples",
    });
    assert.ok(normalized && normalized.kind === "model");
    if (!normalized || normalized.kind !== "model") return;
    assert.equal(normalized.thinkingMode, "adversarial");
    assert.equal(normalized.systemAddon, "counter-examples");

    const dropped = normalizeFusionUnit({
      kind: "model",
      model: "p/x",
      thinkingMode: "not-a-lens",
    });
    assert.ok(dropped && dropped.kind === "model");
    if (dropped && dropped.kind === "model") {
      assert.equal(dropped.thinkingMode, undefined);
    }

    // unitToPayload emits structured when mode/addon set; bare string when empty
    assert.deepEqual(unitToPayload(normalized), {
      kind: "model",
      model: "p/a",
      thinkingMode: "adversarial",
      systemAddon: "counter-examples",
    });
    assert.equal(unitToPayload({ kind: "model", model: "p/plain" }), "p/plain");

    // Full form → save → schema → formFromCombo round-trip
    const form = emptyFusionForm();
    form.name = "editor-cog-rt";
    form.panels = [
      {
        kind: "model",
        model: "p/a",
        thinkingMode: "first-principles",
        systemAddon: "Rebuild from axioms.",
      },
      { kind: "model", model: "p/b", thinkingMode: "systems" },
    ];
    form.judge = { kind: "model", model: "p/judge" };
    form.judgeMode = "dialectical";
    form.triggers.mode = "always";

    const payload = buildSavePayload(form, null, "create");
    const parsed = createComboSchema.safeParse(payload);
    assert.equal(parsed.success, true, JSON.stringify(parsed));
    if (!parsed.success) return;

    const reloaded = formFromCombo({
      id: "rt",
      name: payload.name,
      strategy: payload.strategy,
      models: payload.models,
      judge: payload.judge ?? undefined,
      config: payload.config,
    });
    assert.equal(reloaded.judgeMode, "dialectical");
    assert.equal(reloaded.panels[0]?.kind, "model");
    if (reloaded.panels[0]?.kind === "model") {
      assert.equal(reloaded.panels[0].thinkingMode, "first-principles");
      assert.equal(reloaded.panels[0].systemAddon, "Rebuild from axioms.");
    }
    if (reloaded.panels[1]?.kind === "model") {
      assert.equal(reloaded.panels[1].thinkingMode, "systems");
    }
  }
);
