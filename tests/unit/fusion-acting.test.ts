/**
 * Epic 0004 — Fusion Acting unit tests.
 * Covers resolveFusionUnits.acting, buildActingHandoffPrompt, and
 * handleFusionChatV2 handoff (judge → acting as final voice).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveFusionUnits,
  handleFusionChatV2,
  buildActingHandoffPrompt,
  extractPanelText,
  type ResolvedFusionUnit,
} from "../../open-sse/services/fusion.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function chatText(text: string) {
  return {
    choices: [{ message: { role: "assistant", content: text } }],
  };
}

const log = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

describe("resolveFusionUnits — acting", () => {
  it("returns null acting when absent", () => {
    const { panels, judge, acting } = resolveFusionUnits({
      name: "f",
      models: ["a", "b"],
    });
    assert.equal(acting, null);
    assert.equal(panels.length, 2);
    assert.equal(judge.kind, "model");
    assert.equal(judge.kind === "model" && judge.model, "a");
  });

  it("resolves top-level acting model string", () => {
    const { acting } = resolveFusionUnits({
      name: "f",
      models: ["p1", "p2"],
      acting: "builder-model",
    });
    assert.deepEqual(acting, { kind: "model", model: "builder-model" });
  });

  it("resolves top-level acting combo-ref", () => {
    const { acting } = resolveFusionUnits({
      name: "f",
      models: ["p1"],
      acting: { kind: "combo-ref", comboName: "builder" },
    });
    assert.deepEqual(acting, { kind: "combo-ref", comboName: "builder" });
  });

  it("does not infer acting from panels", () => {
    const { acting } = resolveFusionUnits({
      name: "f",
      models: [{ kind: "combo-ref", comboName: "builder" }, "p2"],
      judge: "judge-m",
    });
    assert.equal(acting, null);
  });
});

describe("buildActingHandoffPrompt", () => {
  it("includes review text and acting instructions", () => {
    const prompt = buildActingHandoffPrompt("Review says fix the race.");
    assert.match(prompt, /ACTING model/i);
    assert.match(prompt, /FUSION REVIEW/);
    assert.match(prompt, /Review says fix the race/);
    assert.match(prompt, /Do NOT mention the fusion panel/i);
  });
});

describe("handleFusionChatV2 — acting handoff", () => {
  it("legacy path (no acting): judge is final voice", async () => {
    const calls: string[] = [];
    const handleSingleModel = async (_body: Record<string, unknown>, model: string) => {
      calls.push(model);
      if (model === "judge") return jsonResponse(chatText("JUDGE FINAL"));
      return jsonResponse(chatText(`answer from ${model}`));
    };

    const res = await handleFusionChatV2({
      body: { messages: [{ role: "user", content: "hi" }], stream: false },
      panels: [
        { kind: "model", model: "p1" },
        { kind: "model", model: "p2" },
      ],
      judge: { kind: "model", model: "judge" },
      handleSingleModel,
      log,
      comboName: "t",
      tuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(extractPanelText(json), "JUDGE FINAL");
    assert.ok(calls.includes("p1") && calls.includes("p2") && calls.includes("judge"));
    assert.ok(!calls.includes("acting"));
  });

  it("with acting: panels → judge (internal) → acting final", async () => {
    const calls: string[] = [];
    const bodies: Array<{ model: string; hasReview?: boolean; stream?: unknown }> = [];

    const handleSingleModel = async (body: Record<string, unknown>, model: string) => {
      calls.push(model);
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const last = messages[messages.length - 1] as { content?: string } | undefined;
      const content = typeof last?.content === "string" ? last.content : "";
      bodies.push({
        model,
        hasReview: content.includes("FUSION REVIEW") || content.includes("JUDGE"),
        stream: body.stream,
      });

      if (model === "judge") return jsonResponse(chatText("SYNTHESIZED REVIEW"));
      if (model === "acting") return jsonResponse(chatText("ACTING FINAL"));
      return jsonResponse(chatText(`panel ${model}`));
    };

    const res = await handleFusionChatV2({
      body: {
        messages: [{ role: "user", content: "implement X" }],
        stream: true,
        tools: [{ type: "function", function: { name: "write" } }],
      },
      panels: [
        { kind: "model", model: "p1" },
        { kind: "model", model: "p2" },
      ],
      judge: { kind: "model", model: "judge" },
      acting: { kind: "model", model: "acting" },
      handleSingleModel,
      log,
      comboName: "t",
      tuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(extractPanelText(json), "ACTING FINAL");
    assert.ok(calls.includes("p1") && calls.includes("p2"));
    assert.ok(calls.includes("judge"));
    assert.ok(calls.includes("acting"));

    // Judge should have been non-streaming for handoff extraction.
    const judgeCall = bodies.find((b) => b.model === "judge");
    assert.equal(judgeCall?.stream, false);

    // Acting should receive handoff prompt with review.
    const actingCall = bodies.find((b) => b.model === "acting");
    assert.equal(actingCall?.hasReview, true);
  });

  it("returns 400 when acting is combo-ref without handleComboChat", async () => {
    const handleSingleModel = async () => jsonResponse(chatText("x"));
    const res = await handleFusionChatV2({
      body: { messages: [{ role: "user", content: "hi" }] },
      panels: [
        { kind: "model", model: "p1" },
        { kind: "model", model: "p2" },
      ],
      judge: { kind: "model", model: "j" },
      acting: { kind: "combo-ref", comboName: "builder" },
      handleSingleModel,
      log,
      comboName: "t",
      tuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 2000 },
    });
    assert.equal(res.status, 400);
  });
});
