/**
 * Fusion combo strategy — parallel panel + judge synthesis.
 *
 * Ported from upstream decolua/9router (Daniil Schovkunov). Adds Fusion as the 16th
 * combo strategy: fan the prompt out to every panel model in parallel, then a judge
 * model synthesizes one final answer from all panel responses.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-combo-fusion-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || "combo-fusion-test-secret";

const { handleComboChat } = await import("../../open-sse/services/combo.ts");

const noop = () => {};
const log = { info: noop, warn: noop, debug: noop, error: noop };

type Body = Record<string, unknown>;

// Minimal OpenAI-chat Response-shaped object compatible with the engine's .ok + .clone().json() surface.
function okResponse(content: string, { delayMs = 0 } = {}): Response | Promise<Response> {
  const body = JSON.stringify({ choices: [{ message: { role: "assistant", content } }] });
  const make = () =>
    new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
  return delayMs > 0 ? new Promise((r) => setTimeout(() => r(make()), delayMs)) : make();
}

function errResponse(status = 500): Response {
  return new Response(JSON.stringify({ error: { message: "boom" } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fusionCombo(models: string[], extra: Record<string, unknown> = {}) {
  return {
    name: "test-fusion-combo",
    strategy: "fusion",
    models: models.map((m) => ({ model: m })),
    config: extra,
  };
}

test("fusion: single-model panel answers directly (nothing to fuse)", async () => {
  const calls: string[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    calls.push(m);
    return okResponse("solo");
  };
  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "hi" }] },
    combo: fusionCombo(["p/only"]),
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0], "p/only");
  assert.equal(res.status, 200);
});

test("fusion: fans out to the panel then routes a synthesis turn to the judge", async () => {
  const seen: string[] = [];
  const seenBodies: Body[] = [];
  const handleSingleModel = async (b: Body, m: string) => {
    seen.push(m);
    seenBodies.push(b);
    if (m === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${m}`);
  };

  const res = await handleComboChat({
    body: {
      messages: [{ role: "user", content: "Q" }],
      stream: true,
      tools: [{ name: "x" }],
    },
    combo: fusionCombo(["p/a", "p/b", "p/c"], { judgeModel: "p/judge" }),
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });

  // 3 panel calls + 1 judge call.
  assert.equal(seen.length, 4);
  assert.deepEqual(seen.slice(0, 3).sort(), ["p/a", "p/b", "p/c"]);
  assert.equal(seen[3], "p/judge");

  // Panel calls are non-streaming; tools stay so history tool_calls remain
  // understandable, with tool_choice forced to "none" (no panel tool use).
  for (let i = 0; i < 3; i++) {
    const b = seenBodies[i];
    assert.equal(b.stream, false, "panel call should be non-streaming");
    assert.deepEqual(b.tools, [{ name: "x" }], "panel call should keep tools");
    assert.equal(b.tool_choice, "none", "panel call should set tool_choice none");
  }

  // Judge call carries every panel answer + keeps the client's stream flag.
  const judgeBody = seenBodies[3];
  const judgeMsgs = judgeBody.messages as Array<{ role: string; content: string }>;
  const judgeText = judgeMsgs[judgeMsgs.length - 1].content;
  assert.match(judgeText, /ans-p\/a/);
  assert.match(judgeText, /ans-p\/b/);
  assert.match(judgeText, /ans-p\/c/);
  assert.match(judgeText, /Source 1/);
  assert.equal(judgeBody.stream, true);

  assert.equal(res.status, 200);
});

test("fusion: defaults the judge to the first panel model when none is set", async () => {
  const seen: string[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    seen.push(m);
    return okResponse(`ans-${m}`);
  };
  await handleComboChat({
    body: { messages: [{ role: "user", content: "Q" }] },
    combo: fusionCombo(["p/first", "p/second"]),
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  // Last call is the judge; defaults to panel[0].
  assert.equal(seen[seen.length - 1], "p/first");
});

test("fusion: proceeds on quorum without waiting for a straggler (grace window)", async () => {
  const handleSingleModel = async (_b: Body, m: string) => {
    if (m === "p/slow") return okResponse("slow", { delayMs: 5000 });
    if (m === "p/judge") return okResponse("FINAL");
    return okResponse(`fast-${m}`);
  };

  const t0 = Date.now();
  const seenBodies: Body[] = [];
  const wrapped = async (b: Body, m: string) => {
    seenBodies.push(b);
    return handleSingleModel(b, m);
  };
  await handleComboChat({
    body: { messages: [{ role: "user", content: "Q" }] },
    combo: fusionCombo(["p/x", "p/y", "p/slow"], {
      judgeModel: "p/judge",
      fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 10000 },
    }),
    handleSingleModel: wrapped,
    log,
    settings: {},
    allCombos: [],
  });
  const elapsed = Date.now() - t0;

  // Two fast answers reach quorum; grace is 50ms, so we never wait ~5s for p/slow.
  assert.ok(elapsed < 2000, `should not wait for straggler (took ${elapsed}ms)`);

  const judgeBody = seenBodies[seenBodies.length - 1];
  const judgeMsgs = judgeBody.messages as Array<{ role: string; content: string }>;
  const judgeText = judgeMsgs[judgeMsgs.length - 1].content;
  assert.match(judgeText, /fast-p\/x/);
  assert.match(judgeText, /fast-p\/y/);
  assert.ok(!/slow/.test(judgeText), "straggler answer should not appear in the judge prompt");
});

test("fusion: returns the lone survivor directly when only one panel model succeeds", async () => {
  const seen: string[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    seen.push(m);
    if (m === "p/ok") return okResponse("lone");
    return errResponse(500);
  };
  await handleComboChat({
    body: { messages: [{ role: "user", content: "Q" }] },
    combo: fusionCombo(["p/ok", "p/bad"], {
      judgeModel: "p/judge",
      fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
    }),
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  // No judge call — single answer means there is nothing to fuse.
  assert.ok(
    !seen.includes("p/judge"),
    "judge should not be invoked when only one panel model survives"
  );
});

test("fusion: returns 503 when the whole panel fails", async () => {
  const handleSingleModel = async () => errResponse(500);
  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Q" }] },
    combo: fusionCombo(["p/a", "p/b"], {
      fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
    }),
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(res.status, 503);
});

// ─── Task 0013: combo-ref panels + conditional-fusion gate via handleComboChat ─

test("fusion: combo-ref panel is not dropped — nested combo executes via handleComboChat", async () => {
  const nestedLeafCalls: string[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    nestedLeafCalls.push(m);
    if (m === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${m}`);
  };

  const nestedCombo = {
    name: "pool-1",
    strategy: "priority",
    models: [{ model: "p/nested-a" }, { model: "p/nested-b" }],
  };
  const fusion = {
    name: "fusion-with-ref",
    strategy: "fusion",
    models: [
      { kind: "model", model: "p/direct" },
      { kind: "combo-ref", comboName: "pool-1" },
    ],
    config: {
      judgeModel: "p/judge",
      fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
      nestedComboMode: "execute",
    },
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Q" }], stream: false },
    combo: fusion,
    handleSingleModel,
    log,
    settings: {},
    allCombos: [fusion, nestedCombo],
  });

  assert.equal(res.status, 200);
  // Direct panel model + nested priority leaf + judge. Combo-ref must not be dropped.
  assert.ok(nestedLeafCalls.includes("p/direct"), "model panel must run");
  assert.ok(
    nestedLeafCalls.includes("p/nested-a") || nestedLeafCalls.includes("p/nested-b"),
    "combo-ref panel must dispatch nested combo (not silent-drop)"
  );
  assert.ok(nestedLeafCalls.includes("p/judge"), "judge must synthesize");
});

test("conditional-fusion: matching tool call dispatches fusion; miss uses fallback", async () => {
  const fusionCalls: string[] = [];
  const fallbackCalls: string[] = [];

  const handleSingleModel = async (_b: Body, m: string) => {
    if (m.startsWith("f/")) fusionCalls.push(m);
    else fallbackCalls.push(m);
    if (m === "f/judge") return okResponse("FUSED");
    return okResponse(`ans-${m}`);
  };

  const combo = {
    name: "cond-fusion",
    strategy: "conditional-fusion",
    models: [
      { model: "f/a" },
      { model: "f/b" },
      // Fallback path (priority) will try these after strategy override — but
      // when fusion triggers, only f/* models should run.
    ],
    config: {
      judgeModel: "f/judge",
      fallbackStrategy: "priority",
      triggers: { mode: "tool-call", toolPatterns: ["write*", "edit*"] },
      fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
    },
  };

  // Trigger match → fusion path (panel + judge).
  const matchBody = {
    messages: [
      { role: "user", content: "please write" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
    ],
  };
  const matchRes = await handleComboChat({
    body: matchBody,
    combo: { ...combo, strategy: "conditional-fusion" },
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(matchRes.status, 200);
  assert.ok(fusionCalls.includes("f/a") && fusionCalls.includes("f/b"), "fusion panel must run");
  assert.ok(fusionCalls.includes("f/judge"), "fusion judge must run on trigger match");

  // No tool call → fallback strategy (priority): first model only, no judge fan-out.
  fusionCalls.length = 0;
  fallbackCalls.length = 0;
  const missRes = await handleComboChat({
    body: { messages: [{ role: "user", content: "just chat" }] },
    combo: {
      ...combo,
      strategy: "conditional-fusion",
      // Priority fallback iterates models as targets; keep simple string models.
      models: ["f/a", "f/b"],
    },
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(missRes.status, 200);
  assert.ok(!fusionCalls.includes("f/judge"), "judge must not run on trigger miss");
  // Priority: first successful model only — not a full fusion panel+judge shape.
  // (Panel models share the f/ prefix in this fixture; judge absence is the fusion marker.)
  assert.ok(
    fusionCalls.includes("f/a") || fusionCalls.includes("f/b"),
    "priority fallback should hit a panel model as a normal target"
  );
  assert.ok(
    !fusionCalls.includes("f/judge"),
    "trigger miss must not invoke fusion judge"
  );
  // Full fusion would call both panels + judge; miss should not call judge and typically stops early.
  assert.ok(fusionCalls.filter((m) => m !== "f/judge").length >= 1);
});

test("conditional-fusion: trigger miss must not mutate combo.strategy (shared-object safety)", async () => {
  const sharedCombo = {
    name: "immutable-cond-fusion",
    strategy: "conditional-fusion",
    models: ["f/a", "f/b"],
    config: {
      judgeModel: "f/judge",
      fallbackStrategy: "priority",
      triggers: { mode: "tool-call", toolPatterns: ["write*"] },
      fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
    },
  };

  const handleSingleModel = async (_b: Body, m: string) => {
    if (m === "f/judge") return okResponse("FUSED");
    return okResponse(`ans-${m}`);
  };

  // 1) Trigger miss — local strategy falls back; object must stay conditional-fusion.
  await handleComboChat({
    body: { messages: [{ role: "user", content: "just chat" }] },
    combo: sharedCombo,
    handleSingleModel,
    log,
    settings: {},
    allCombos: [sharedCombo],
  });
  assert.equal(
    sharedCombo.strategy,
    "conditional-fusion",
    "combo.strategy must remain immutable after trigger miss"
  );

  // 2) Same object, trigger hit — still fuses (proves we did not permanently rewrite strategy).
  const seen: string[] = [];
  await handleComboChat({
    body: {
      messages: [
        {
          role: "assistant",
          content: null,
          tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
        },
      ],
    },
    combo: sharedCombo,
    handleSingleModel: async (_b, m) => {
      seen.push(m);
      if (m === "f/judge") return okResponse("FUSED");
      return okResponse(`ans-${m}`);
    },
    log,
    settings: {},
    allCombos: [sharedCombo],
  });
  assert.equal(sharedCombo.strategy, "conditional-fusion");
  assert.ok(seen.includes("f/judge"), "second call with matching tool must still fuse");
});

test("conditional-fusion: forbidden fallbackStrategy fusion collapses to priority (D8 wire)", async () => {
  const seen: string[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    seen.push(m);
    if (m === "f/judge") return okResponse("SHOULD_NOT_RUN");
    return okResponse(`ans-${m}`);
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "no tools" }] },
    combo: {
      name: "d8-wire",
      strategy: "conditional-fusion",
      models: ["p/first", "p/second"],
      config: {
        judgeModel: "f/judge",
        // Intentionally forbidden — runtime must not recurse into fusion.
        fallbackStrategy: "fusion",
        triggers: { mode: "tool-call", toolPatterns: ["write*"] },
      },
    },
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(res.status, 200);
  assert.ok(!seen.includes("f/judge"), "D8: forbidden fusion fallback must not run judge");
  // Priority takes first success — typically only p/first.
  assert.ok(seen.includes("p/first") || seen.includes("p/second"));
  assert.ok(seen.length <= 2, "must not fan out a full fusion panel");
});

test("conditional-fusion: forbidden fallbackStrategy conditional-fusion collapses to priority (D8 wire)", async () => {
  const seen: string[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    seen.push(m);
    if (m === "f/judge") return okResponse("SHOULD_NOT_RUN");
    return okResponse(`ans-${m}`);
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "no tools" }] },
    combo: {
      name: "d8-wire-cf",
      strategy: "conditional-fusion",
      models: ["p/first", "p/second"],
      config: {
        judgeModel: "f/judge",
        // Sibling forbidden string — same D8 collapse as "fusion".
        fallbackStrategy: "conditional-fusion",
        triggers: { mode: "tool-call", toolPatterns: ["write*"] },
      },
    },
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(res.status, 200);
  assert.ok(!seen.includes("f/judge"), "D8: forbidden conditional-fusion fallback must not run judge");
  assert.ok(seen.includes("p/first") || seen.includes("p/second"));
  assert.ok(seen.length <= 2, "must not fan out a full fusion panel");
});

// ─── Task 0014: always / text-match modes via handleComboChat ────────────────

test("conditional-fusion: mode always dispatches fusion regardless of body", async () => {
  const seen: string[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    seen.push(m);
    if (m === "f/judge") return okResponse("FUSED");
    return okResponse(`ans-${m}`);
  };
  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "no tools here" }] },
    combo: {
      name: "always-fusion",
      strategy: "conditional-fusion",
      models: [{ model: "f/a" }, { model: "f/b" }],
      config: {
        judgeModel: "f/judge",
        fallbackStrategy: "priority",
        triggers: { mode: "always" },
        fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
      },
    },
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(res.status, 200);
  assert.ok(seen.includes("f/judge"), "always mode must invoke fusion judge");
  assert.ok(seen.includes("f/a") && seen.includes("f/b"), "always mode must run panel");
});

test("conditional-fusion: text-match fires on keyword and falls back on miss", async () => {
  const fusionJudgeRuns: number[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    if (m === "f/judge") fusionJudgeRuns.push(1);
    return okResponse(`ans-${m}`);
  };
  const base = {
    name: "text-fusion",
    strategy: "conditional-fusion",
    models: [{ model: "f/a" }, { model: "f/b" }],
    config: {
      judgeModel: "f/judge",
      fallbackStrategy: "priority",
      triggers: { mode: "text-match", textPatterns: ["security", "review"] },
      fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
    },
  };

  fusionJudgeRuns.length = 0;
  const hit = await handleComboChat({
    body: { messages: [{ role: "user", content: "Please do a SECURITY review" }] },
    combo: base,
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(hit.status, 200);
  assert.ok(fusionJudgeRuns.length >= 1, "text match must dispatch fusion");

  fusionJudgeRuns.length = 0;
  const miss = await handleComboChat({
    body: { messages: [{ role: "user", content: "hello there" }] },
    combo: { ...base, models: ["f/a", "f/b"] },
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(miss.status, 200);
  assert.equal(fusionJudgeRuns.length, 0, "text miss must not invoke fusion judge");
});

test("fusion strategy with tool-call triggers is gated (not unconditional)", async () => {
  const judgeRuns: number[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    if (m === "f/judge") judgeRuns.push(1);
    return okResponse(`ans-${m}`);
  };
  const combo = {
    name: "gated-fusion",
    strategy: "fusion",
    models: [{ model: "f/a" }, { model: "f/b" }],
    config: {
      judgeModel: "f/judge",
      fallbackStrategy: "priority",
      triggers: { mode: "tool-call", toolPatterns: ["write*"] },
      fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
    },
  };

  // No tool call → fallback, not fusion.
  const miss = await handleComboChat({
    body: { messages: [{ role: "user", content: "chat" }] },
    combo: { ...combo, models: ["f/a", "f/b"] },
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(miss.status, 200);
  assert.equal(judgeRuns.length, 0, "gated fusion strategy must not judge on miss");

  // Matching tool call → fusion.
  judgeRuns.length = 0;
  const hit = await handleComboChat({
    body: {
      messages: [
        { role: "user", content: "write" },
        {
          role: "assistant",
          tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
        },
      ],
    },
    combo,
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(hit.status, 200);
  assert.ok(judgeRuns.length >= 1, "gated fusion strategy must judge on tool match");
});

// ─── Path-to-100 (Task 0013/0014): gated D8 wire + combo-ref panel path ─────

test("gated strategy fusion: forbidden fallbackStrategy fusion collapses to priority (D8 wire)", async () => {
  const seen: string[] = [];
  const handleSingleModel = async (_b: Body, m: string) => {
    seen.push(m);
    if (m === "f/judge") return okResponse("SHOULD_NOT_RUN");
    return okResponse(`ans-${m}`);
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "no tools" }] },
    combo: {
      name: "d8-wire-gated-fusion",
      strategy: "fusion",
      models: ["p/first", "p/second"],
      config: {
        judgeModel: "f/judge",
        fallbackStrategy: "fusion",
        triggers: { mode: "tool-call", toolPatterns: ["write*"] },
      },
    },
    handleSingleModel,
    log,
    settings: {},
    allCombos: [],
  });
  assert.equal(res.status, 200);
  assert.ok(!seen.includes("f/judge"), "D8: gated fusion forbidden fallback must not judge");
  assert.ok(seen.includes("p/first") || seen.includes("p/second"));
});

test("fusion strategy: combo-ref panel is not dropped (typed panels + nested handleComboChat)", async () => {
  const singleModels: string[] = [];
  const nestedComboNames: string[] = [];

  const handleSingleModel = async (_b: Body, m: string) => {
    singleModels.push(m);
    if (m === "f/judge") return okResponse("FINAL");
    return okResponse(`ans-${m}`);
  };

  const res = await handleComboChat({
    body: { messages: [{ role: "user", content: "Q" }] },
    combo: {
      name: "ref-panel-fusion",
      strategy: "fusion",
      models: [
        { kind: "model", model: "p/direct" },
        { kind: "combo-ref", comboName: "inner-pool" },
      ],
      config: {
        judgeModel: "f/judge",
        fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
      },
    },
    handleSingleModel,
    log,
    settings: { fusionWire: true },
    allCombos: [
      {
        name: "inner-pool",
        strategy: "priority",
        models: ["inner/m1"],
      },
    ],
  });

  assert.equal(res.status, 200);
  // Nested priority combo runs handleSingleModel for inner/m1 via recursive handleComboChat.
  assert.ok(
    singleModels.includes("inner/m1") || singleModels.includes("p/direct"),
    `expected nested or direct panel leaf; got ${JSON.stringify(singleModels)}`
  );
  assert.ok(singleModels.includes("p/direct"), "model panel must still run");
  assert.ok(singleModels.includes("inner/m1"), "combo-ref panel leaf must execute (not dropped)");
  assert.ok(singleModels.includes("f/judge"), "judge must still run after panel fan-out");
  void nestedComboNames;
});
