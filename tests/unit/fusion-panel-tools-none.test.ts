/**
 * Task 0018 — Fusion panel body invariants (Decision D9).
 *
 * Panel fan-out must force stream:false + tool_choice:"none" while keeping the
 * original tools array so history tool_calls remain valid context. Judge body
 * must keep the client's stream/tools and must NOT force tool_choice:"none".
 */
import test from "node:test";
import assert from "node:assert/strict";

const { handleFusionChatV2, handleFusionChat } = await import("../../open-sse/services/fusion.ts");

const noop = () => {};
const log = { info: noop, warn: noop, debug: noop, error: noop };

type Body = Record<string, unknown>;

function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const fastTuning = {
  minPanel: 2,
  stragglerGraceMs: 50,
  panelHardTimeoutMs: 5000,
};

// ─── tools kept + tool_choice none ─────────────────────────────────────────

test("panel body: tools array preserved and tool_choice forced to none", async () => {
  const panelBodies: Body[] = [];
  const tools = [
    { type: "function", function: { name: "write_file", parameters: {} } },
    { type: "function", function: { name: "read_file", parameters: {} } },
  ];

  const handleSingleModel = async (body: Body, model: string) => {
    if (model !== "p/judge") panelBodies.push(body);
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };

  const res = await handleFusionChatV2({
    body: {
      messages: [
        { role: "user", content: "edit me" },
        {
          role: "assistant",
          content: null,
          tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
        },
      ],
      stream: true,
      tools,
      tool_choice: "required",
    },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    comboName: "panel-tools",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.equal(panelBodies.length, 2);
  for (const b of panelBodies) {
    assert.equal(b.stream, false, "panel must be non-streaming");
    assert.equal(b.tool_choice, "none", "panel must not invoke tools");
    assert.deepEqual(b.tools, tools, "panel must keep original tools definitions");
    // Client tool_choice is stripped/replaced — not left as "required".
    assert.notEqual(b.tool_choice, "required");
  }
});

// ─── stream false even when client asked for stream ────────────────────────

test("panel body: stream forced false regardless of client stream flag", async () => {
  const panelStreams: unknown[] = [];
  const judgeStreams: unknown[] = [];

  const handleSingleModel = async (body: Body, model: string) => {
    if (model === "p/judge") {
      judgeStreams.push(body.stream);
      return okResponse("FINAL");
    }
    panelStreams.push(body.stream);
    return okResponse(`ans-${model}`);
  };

  await handleFusionChatV2({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: true,
      tools: [{ name: "x" }],
    },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: fastTuning,
  });

  assert.deepEqual(panelStreams, [false, false]);
  assert.deepEqual(judgeStreams, [true], "judge keeps client stream:true");
});

// ─── no tools on request still gets tool_choice none ───────────────────────

test("panel body: tool_choice none when client body has no tools field", async () => {
  const panelBodies: Body[] = [];
  const handleSingleModel = async (body: Body, model: string) => {
    if (model !== "p/judge") panelBodies.push(body);
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };

  await handleFusionChatV2({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: false,
    },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: fastTuning,
  });

  assert.equal(panelBodies.length, 2);
  for (const b of panelBodies) {
    assert.equal(b.stream, false);
    assert.equal(b.tool_choice, "none");
    assert.equal("tools" in b ? b.tools : undefined, undefined);
  }
});

// ─── legacy string path preserves the same panel body contract ─────────────

test("legacy handleFusionChat panel body matches V2 invariants", async () => {
  const panelBodies: Body[] = [];
  const handleSingleModel = async (body: Body, model: string) => {
    if (model !== "p/judge") panelBodies.push(body);
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };

  const res = await handleFusionChat({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: true,
      tools: [{ name: "legacy-tool" }],
      tool_choice: "auto",
    },
    models: ["p/a", "p/b"],
    handleSingleModel,
    log,
    comboName: "legacy-panel-body",
    judgeModel: "p/judge",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.equal(panelBodies.length, 2);
  for (const b of panelBodies) {
    assert.equal(b.stream, false);
    assert.equal(b.tool_choice, "none");
    assert.deepEqual(b.tools, [{ name: "legacy-tool" }]);
  }
});

// ─── combo-ref panel receives same panelBody ownership ─────────────────────

test("combo-ref panel receives stream:false + tool_choice:none + tools kept", async () => {
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
      tools: [{ name: "search" }],
      tool_choice: "auto",
    },
    panels: [
      { kind: "model", model: "p/direct" },
      { kind: "combo-ref", comboName: "pool-1" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    handleComboChat,
    allCombos: [{ name: "pool-1", models: ["p/m1"] }],
    nesting: {
      depth: 0,
      maxDepth: 3,
      visitedComboNames: ["root"],
      rootComboName: "root",
      attemptBudget: { count: 0, limit: 400 },
    },
    log,
    comboName: "root",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.ok(comboPanelBody, "combo-ref panel must be dispatched");
  assert.equal(comboPanelBody!.stream, false);
  assert.equal(comboPanelBody!.tool_choice, "none");
  assert.deepEqual(comboPanelBody!.tools, [{ name: "search" }]);
});
