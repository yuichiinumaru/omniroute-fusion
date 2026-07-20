/**
 * Task 0012 — handleFusionChatV2 multi-unit dispatch (model + combo-ref panels/judge).
 *
 * Verifies:
 * - model units → handleSingleModel
 * - combo-ref units → handleComboChat with nested context
 * - 400 when combo-ref present without handleComboChat
 * - panel body stream:false + tool_choice:"none" (tools kept)
 * - judge body keeps client stream/tools (no tool_choice:"none" forced)
 * - nesting depth/cycle → 503
 * - degrade: 0 answers → 503, 1 answer → synthesize from collected text (no re-dispatch)
 * - legacy handleFusionChat still works for string models
 */
import test from "node:test";
import assert from "node:assert/strict";

const { handleFusionChat, handleFusionChatV2, FUSION_DEFAULTS } =
  await import("../../open-sse/services/fusion.ts");

const noop = () => {};
const log = { info: noop, warn: noop, debug: noop, error: noop };

type Body = Record<string, unknown>;

function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function errResponse(status = 500): Response {
  return new Response(JSON.stringify({ error: { message: "boom" } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fastTuning = {
  minPanel: 2,
  stragglerGraceMs: 50,
  panelHardTimeoutMs: 5000,
};

// ─── model panel + model judge ─────────────────────────────────────────────

test("V2: model panels call handleSingleModel; model judge synthesizes", async () => {
  const singleCalls: Array<{ model: string; body: Body }> = [];
  const comboCalls: unknown[] = [];

  const handleSingleModel = async (body: Body, model: string) => {
    singleCalls.push({ model, body });
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };
  const handleComboChat = async () => {
    comboCalls.push(true);
    return okResponse("should-not-run");
  };

  const res = await handleFusionChatV2({
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
    handleComboChat,
    log,
    comboName: "fusion-models",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.equal(comboCalls.length, 0, "no combo-ref → handleComboChat unused");
  // 2 panels + 1 judge
  assert.equal(singleCalls.length, 3);
  assert.deepEqual(
    singleCalls
      .slice(0, 2)
      .map((c) => c.model)
      .sort(),
    ["p/a", "p/b"]
  );
  assert.equal(singleCalls[2].model, "p/judge");
});

// ─── combo-ref panel ───────────────────────────────────────────────────────

test("V2: combo-ref panel calls handleComboChat with panelBody + nesting", async () => {
  const singleModels: string[] = [];
  const comboOpts: Array<{
    comboName: string;
    body: Body;
    nestingDepth: number | undefined;
    visited: string[] | undefined;
  }> = [];

  const handleSingleModel = async (body: Body, model: string) => {
    singleModels.push(model);
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };
  const handleComboChat = async (opts: {
    body: Body;
    combo: { name: string };
    nesting?: { depth: number; visitedComboNames: string[] } | null;
  }) => {
    comboOpts.push({
      comboName: opts.combo.name,
      body: opts.body,
      nestingDepth: opts.nesting?.depth,
      visited: opts.nesting?.visitedComboNames,
    });
    return okResponse(`ans-combo:${opts.combo.name}`);
  };

  const allCombos = [{ name: "pool-1", models: ["p/m1", "p/m2"] }];
  const nesting = {
    depth: 0,
    maxDepth: 3,
    visitedComboNames: ["root-fusion"],
    rootComboName: "root-fusion",
    attemptBudget: { count: 0, limit: 400 },
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
    allCombos,
    nesting,
    log,
    comboName: "root-fusion",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.equal(comboOpts.length, 1, "one combo-ref panel");
  assert.equal(comboOpts[0].comboName, "pool-1");
  assert.equal(comboOpts[0].nestingDepth, 1, "child nesting depth incremented");
  assert.ok(comboOpts[0].visited?.includes("pool-1"), "child combo name added to visited");
  assert.ok(comboOpts[0].visited?.includes("root-fusion"), "parent visited preserved");

  // Panel body ownership: stream false, tool_choice none, tools kept
  const panelBody = comboOpts[0].body;
  assert.equal(panelBody.stream, false);
  assert.equal(panelBody.tool_choice, "none");
  assert.deepEqual(panelBody.tools, [{ name: "search" }]);

  // Model panel also got panelBody
  const panelDirect = singleModels.includes("p/direct");
  assert.ok(panelDirect);
  assert.equal(singleModels[singleModels.length - 1], "p/judge");
});

// ─── combo-ref judge ───────────────────────────────────────────────────────

test("V2: combo-ref judge calls handleComboChat (not handleSingleModel)", async () => {
  const singleModels: string[] = [];
  const comboNames: string[] = [];
  const judgeBodies: Body[] = [];

  const handleSingleModel = async (_body: Body, model: string) => {
    singleModels.push(model);
    return okResponse(`ans-${model}`);
  };
  const handleComboChat = async (opts: { body: Body; combo: { name: string } }) => {
    comboNames.push(opts.combo.name);
    judgeBodies.push(opts.body);
    return okResponse("JUDGE-FINAL");
  };

  const res = await handleFusionChatV2({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: true,
      tools: [{ name: "x" }],
    },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "combo-ref", comboName: "judge-pool" },
    handleSingleModel,
    handleComboChat,
    allCombos: [{ name: "judge-pool", models: ["j/1"] }],
    nesting: {
      depth: 0,
      maxDepth: 3,
      visitedComboNames: ["f"],
      rootComboName: "f",
      attemptBudget: { count: 0, limit: 400 },
    },
    log,
    comboName: "f",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.deepEqual(singleModels.sort(), ["p/a", "p/b"]);
  assert.deepEqual(comboNames, ["judge-pool"]);

  // Judge keeps client stream + tools; does NOT force tool_choice none / stream false
  const jb = judgeBodies[0];
  assert.equal(jb.stream, true, "judge keeps client stream flag");
  assert.deepEqual(jb.tools, [{ name: "x" }]);
  assert.notEqual(jb.tool_choice, "none");
  const msgs = jb.messages as Array<{ content: string }>;
  assert.match(msgs[msgs.length - 1].content, /Source 1/);
  assert.match(msgs[msgs.length - 1].content, /ans-p\/a/);
});

// ─── missing handleComboChat ───────────────────────────────────────────────

test("V2: returns 400 when combo-ref panel present without handleComboChat", async () => {
  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }] },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "combo-ref", comboName: "pool-1" },
    ],
    judge: { kind: "model", model: "p/a" },
    handleSingleModel: async () => okResponse("x"),
    // handleComboChat intentionally omitted
    allCombos: [{ name: "pool-1", models: ["m"] }],
    log,
    tuning: fastTuning,
  });
  assert.equal(res.status, 400);
  const json = (await res.json()) as { error?: { message?: string } };
  assert.match(String(json?.error?.message ?? json), /handleComboChat/i);
});

test("V2: returns 400 when combo-ref judge present without handleComboChat", async () => {
  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }] },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "combo-ref", comboName: "judge-pool" },
    handleSingleModel: async () => okResponse("x"),
    log,
    tuning: fastTuning,
  });
  assert.equal(res.status, 400);
});

// ─── panel body contract ───────────────────────────────────────────────────

test("V2: panel body has stream:false, tool_choice:none, tools intact", async () => {
  const panelBodies: Body[] = [];
  const handleSingleModel = async (body: Body, model: string) => {
    if (model !== "p/judge") panelBodies.push(body);
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };

  await handleFusionChatV2({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: true,
      tools: [{ name: "t1" }, { name: "t2" }],
      tool_choice: "required",
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
    assert.deepEqual(b.tools, [{ name: "t1" }, { name: "t2" }]);
  }
});

// ─── nesting cycle / depth ─────────────────────────────────────────────────

test("V2: circular combo-ref fails the cycled unit (handleComboChat not called)", async () => {
  // Panel combo-ref points at a combo already in visitedComboNames
  let comboCalled = false;
  const handleComboChat = async () => {
    comboCalled = true;
    return okResponse("should-not-succeed-as-cycle");
  };
  const seenModels: string[] = [];
  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }] },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "combo-ref", comboName: "already-visited" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel: async (_b, m) => {
      seenModels.push(m);
      if (m === "p/judge") return okResponse("FINAL");
      return okResponse(`ans-${m}`);
    },
    handleComboChat,
    allCombos: [{ name: "already-visited", models: ["x"] }],
    nesting: {
      depth: 1,
      maxDepth: 3,
      visitedComboNames: ["root", "already-visited"],
      rootComboName: "root",
      attemptBudget: { count: 0, limit: 400 },
    },
    log,
    tuning: fastTuning,
  });

  // Cycle guard drops the combo-ref before handleComboChat; lone survivor
  // finalizes from collected panel text (no judge, no re-dispatch — Task 0069).
  // Status is 200 (survivor) not 503 (not all failed).
  assert.equal(comboCalled, false, "cycle must not call handleComboChat");
  assert.equal(res.status, 200, "lone survivor answers from collected text");
  assert.ok(!seenModels.includes("p/judge"), "cycle drop leaves one answer → no judge");
  assert.equal(
    seenModels.filter((m) => m === "p/a").length,
    1,
    "collect only for survivor (no re-dispatch)"
  );
});

test("V2: all panels cycle → 503 (no survivors)", async () => {
  let comboCalled = false;
  const handleComboChat = async () => {
    comboCalled = true;
    return okResponse("nope");
  };
  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }] },
    panels: [
      { kind: "combo-ref", comboName: "cycle-a" },
      { kind: "combo-ref", comboName: "cycle-b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel: async () => okResponse("unused"),
    handleComboChat,
    allCombos: [
      { name: "cycle-a", models: ["a"] },
      { name: "cycle-b", models: ["b"] },
    ],
    nesting: {
      depth: 1,
      maxDepth: 3,
      visitedComboNames: ["root", "cycle-a", "cycle-b"],
      rootComboName: "root",
      attemptBudget: { count: 0, limit: 400 },
    },
    log,
    tuning: fastTuning,
  });

  assert.equal(res.status, 503);
  assert.equal(comboCalled, false);
});

test("V2: max nesting depth exceeded returns 503 for combo-ref", async () => {
  let comboCalled = false;
  const handleComboChat = async () => {
    comboCalled = true;
    return okResponse("nope");
  };

  // Both panels are combo-refs at max depth → both 503 → all fail
  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }] },
    panels: [
      { kind: "combo-ref", comboName: "pool-a" },
      { kind: "combo-ref", comboName: "pool-b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel: async () => okResponse("unused"),
    handleComboChat,
    allCombos: [
      { name: "pool-a", models: ["a"] },
      { name: "pool-b", models: ["b"] },
    ],
    nesting: {
      depth: 3,
      maxDepth: 3,
      visitedComboNames: ["r", "c1", "c2"],
      rootComboName: "r",
      attemptBudget: { count: 0, limit: 400 },
    },
    log,
    tuning: fastTuning,
  });

  assert.equal(res.status, 503, "all panels fail depth guard → 503");
  assert.equal(comboCalled, false, "handleComboChat never reached at max depth");
});

// ─── degrade behavior ──────────────────────────────────────────────────────

test("V2: 0 panel answers → 503", async () => {
  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }] },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel: async () => errResponse(500),
    log,
    tuning: fastTuning,
  });
  assert.equal(res.status, 503);
});

test("V2: empty panels array → 400 (no models to fuse)", async () => {
  let singleCalled = false;
  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }] },
    panels: [],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel: async () => {
      singleCalled = true;
      return okResponse("x");
    },
    log,
    tuning: fastTuning,
  });
  assert.equal(res.status, 400);
  assert.equal(singleCalled, false, "empty panel must not dispatch");
  const json = (await res.json()) as { error?: { message?: string } };
  assert.match(String(json?.error?.message ?? json), /no models/i);
});

test("V2: single-panel fusion answers directly without judge synthesis", async () => {
  const seen: string[] = [];
  const handleSingleModel = async (body: Body, m: string) => {
    seen.push(m);
    // Original client stream must be preserved on the 1-panel short-circuit.
    assert.equal(body.stream, true);
    return okResponse("solo");
  };

  const res = await handleFusionChatV2({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: true,
      tools: [{ name: "x" }],
    },
    panels: [{ kind: "model", model: "p/only" }],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    comboName: "one-panel",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.deepEqual(seen, ["p/only"]);
  assert.ok(!seen.includes("p/judge"), "1-panel path must not invoke judge");
  const text = extractText(await res.json());
  assert.equal(text, "solo");
});

test("V2: single survivor finalizes from collected text without re-dispatch (no judge)", async () => {
  const seen: string[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    seen.push(m);
    if (m === "p/ok") return okResponse("lone");
    return errResponse(500);
  };

  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }], stream: false },
    panels: [
      { kind: "model", model: "p/ok" },
      { kind: "model", model: "p/bad" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.ok(!seen.includes("p/judge"), "judge not invoked for single survivor");
  // Collect only — no second upstream call for the survivor (H-FUSION-005 / Task 0069)
  assert.equal(seen.filter((m) => m === "p/ok").length, 1);
  assert.equal(extractText(await res.json()), "lone");
});

test("V2: single survivor does not fail client when a hypothetical re-dispatch would 5xx", async () => {
  let okCalls = 0;
  const handleSingleModel = async (_b: Body, m: string) => {
    if (m === "p/ok") {
      okCalls++;
      // First call = panel collect success. Any later call would 5xx (fail-after-success).
      if (okCalls === 1) return okResponse("lone-success");
      return errResponse(503);
    }
    return errResponse(500);
  };

  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }], stream: false },
    panels: [
      { kind: "model", model: "p/ok" },
      { kind: "model", model: "p/bad" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: fastTuning,
  });

  assert.equal(res.status, 200, "client must not see error after successful collect");
  assert.equal(okCalls, 1, "no re-dispatch after collect success");
  assert.equal(extractText(await res.json()), "lone-success");
});

test("V2: single survivor stream:true synthesizes SSE from collected text", async () => {
  let okCalls = 0;
  const handleSingleModel = async (_b: Body, m: string) => {
    if (m === "p/ok") {
      okCalls++;
      if (okCalls === 1) return okResponse("streamed-lone");
      return errResponse(500);
    }
    return errResponse(500);
  };

  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }], stream: true },
    panels: [
      { kind: "model", model: "p/ok" },
      { kind: "model", model: "p/bad" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.equal(okCalls, 1, "collect only — synthesize SSE, do not re-dispatch");
  const ct = res.headers.get("content-type") ?? "";
  assert.match(ct, /text\/event-stream/);
  const raw = await res.text();
  assert.match(raw, /streamed-lone/);
  assert.match(raw, /\[DONE\]/);
});

// ─── mixed model + combo-ref coexistence ───────────────────────────────────

test("V2: mixed model + combo-ref panels coexist and both feed the judge", async () => {
  const handleSingleModel = async (body: Body, model: string) => {
    if (model === "p/judge") {
      const msgs = body.messages as Array<{ content: string }>;
      const last = msgs[msgs.length - 1].content;
      assert.match(last, /ans-p\/direct/);
      assert.match(last, /ans-combo:pool-1/);
      return okResponse("FINAL");
    }
    return okResponse(`ans-${model}`);
  };
  const handleComboChat = async (opts: { combo: { name: string } }) =>
    okResponse(`ans-combo:${opts.combo.name}`);

  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }] },
    panels: [
      { kind: "model", model: "p/direct" },
      { kind: "combo-ref", comboName: "pool-1", label: "Pool" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    handleComboChat,
    allCombos: [{ name: "pool-1", models: ["m"] }],
    nesting: {
      depth: 0,
      maxDepth: 3,
      visitedComboNames: ["f"],
      rootComboName: "f",
      attemptBudget: { count: 0, limit: 400 },
    },
    log,
    comboName: "f",
    tuning: fastTuning,
  });
  assert.equal(res.status, 200);
});

// ─── legacy string path ────────────────────────────────────────────────────

test("legacy handleFusionChat still fans out string models + judge", async () => {
  const seen: string[] = [];
  const handleSingleModel = async (body: Body, m: string) => {
    seen.push(m);
    if (m === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${m}`);
  };

  const res = await handleFusionChat({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: true,
      tools: [{ name: "x" }],
    },
    models: ["p/a", "p/b", "p/c"],
    handleSingleModel,
    log,
    comboName: "legacy",
    judgeModel: "p/judge",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.equal(seen.length, 4);
  assert.deepEqual(seen.slice(0, 3).sort(), ["p/a", "p/b", "p/c"]);
  assert.equal(seen[3], "p/judge");
  assert.equal(typeof FUSION_DEFAULTS.panelHardTimeoutMs, "number");
});

// ─── comboChatBase nested option forwarding (Task 0012/0013 path-to-100) ───

test("V2: comboChatBase settings/signal/acl forward into nested handleComboChat", async () => {
  const received: Array<Record<string, unknown>> = [];
  const signal = new AbortController().signal;
  const settings = { maxComboDepth: 4, fusionProbe: true };
  const apiKeyAllowedConnections = ["conn-a", "conn-b"];
  const isModelAvailable = async () => true;

  const handleSingleModel = async (_body: Body, model: string) => {
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };
  const handleComboChat = async (opts: Record<string, unknown>) => {
    received.push(opts);
    return okResponse("ans-nested");
  };

  const res = await handleFusionChatV2({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: false,
      tools: [{ name: "t" }],
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
    comboChatBase: {
      settings,
      isModelAvailable,
      relayOptions: { sessionId: "s1" },
      signal,
      apiKeyAllowedConnections,
    },
    log,
    comboName: "root",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.equal(received.length, 1, "one combo-ref panel");
  assert.equal(received[0].settings, settings);
  // Panel fan-out uses a per-panel AbortController linked to parent signal
  // (Task 0070) — not the parent reference itself.
  assert.ok(received[0].signal instanceof AbortSignal, "panel signal is AbortSignal");
  assert.notEqual(
    received[0].signal,
    signal,
    "panel owns a child AbortController (linked to parent)"
  );
  assert.equal(received[0].isModelAvailable, isModelAvailable);
  assert.deepEqual(received[0].apiKeyAllowedConnections, apiKeyAllowedConnections);
  assert.deepEqual(received[0].relayOptions, { sessionId: "s1" });
  // body/combo/nesting still win over base
  assert.equal((received[0].combo as { name: string }).name, "pool-1");
  assert.equal((received[0].nesting as { depth: number }).depth, 1);
});

test("V2: comboChatBase also forwards into combo-ref judge handleComboChat", async () => {
  const received: Array<Record<string, unknown>> = [];
  const signal = new AbortController().signal;
  const settings = { maxComboDepth: 5, judgeProbe: true };
  const apiKeyAllowedConnections = ["conn-j"];

  const handleSingleModel = async (_body: Body, model: string) => {
    return okResponse(`ans-${model}`);
  };
  const handleComboChat = async (opts: Record<string, unknown>) => {
    received.push(opts);
    return okResponse("judge-final");
  };

  const res = await handleFusionChatV2({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: true,
      tools: [{ name: "t" }],
    },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "combo-ref", comboName: "judge-pool" },
    handleSingleModel,
    handleComboChat,
    allCombos: [{ name: "judge-pool", models: ["p/j"] }],
    nesting: {
      depth: 0,
      maxDepth: 3,
      visitedComboNames: ["root"],
      rootComboName: "root",
      attemptBudget: { count: 0, limit: 400 },
    },
    comboChatBase: {
      settings,
      signal,
      apiKeyAllowedConnections,
      relayOptions: { sessionId: "judge-s" },
    },
    log,
    comboName: "root",
    tuning: fastTuning,
  });

  assert.equal(res.status, 200);
  assert.equal(received.length, 1, "judge is the only combo-ref");
  assert.equal(received[0].settings, settings);
  assert.equal(received[0].signal, signal);
  assert.deepEqual(received[0].apiKeyAllowedConnections, apiKeyAllowedConnections);
  assert.deepEqual(received[0].relayOptions, { sessionId: "judge-s" });
  assert.equal((received[0].combo as { name: string }).name, "judge-pool");
  // Judge body must not force stream:false / tool_choice when acting absent
  const judgeBody = received[0].body as Record<string, unknown>;
  assert.notEqual(judgeBody.tool_choice, "none");
});

// ─── helpers ───────────────────────────────────────────────────────────────

function extractText(json: unknown): string {
  const j = json as { choices?: Array<{ message?: { content?: string } }> };
  return j?.choices?.[0]?.message?.content ?? "";
}
