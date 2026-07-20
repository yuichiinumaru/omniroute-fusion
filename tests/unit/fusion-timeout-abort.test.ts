/**
 * Task 0070 / H-FUSION-014 — fusion panel timeout abort / straggler abort contract.
 *
 * Verifies:
 * - timed-out / dropped panel dispatches receive AbortSignal.abort
 * - successful panels are not aborted before their Response is consumed
 * - client parent signal abort propagates to panel work
 * - total panel failure still 503; multi-panel quorum still 200 + judge
 */
import test from "node:test";
import assert from "node:assert/strict";

const { handleFusionChatV2 } = await import("../../open-sse/services/fusion.ts");

const noop = () => {};
const log = { info: noop, warn: noop, debug: noop, error: noop };

type Body = Record<string, unknown>;
type Target = { modelAbortSignal?: AbortSignal | null } | undefined;

function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

test("V2: hard-timeout panel receives AbortSignal.abort", async () => {
  const signals = new Map<string, AbortSignal>();
  const abortEvents: string[] = [];

  const handleSingleModel = async (_body: Body, model: string, target?: Target) => {
    const signal = target?.modelAbortSignal ?? null;
    if (signal) {
      signals.set(model, signal);
      signal.addEventListener(
        "abort",
        () => {
          abortEvents.push(model);
        },
        { once: true }
      );
    }

    if (model === "p/slow") {
      // Stay pending past hard timeout; abort should cancel the wait.
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 5000);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true }
        );
      });
      return okResponse("too-late");
    }
    return okResponse(`ans-${model}`);
  };

  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }], stream: false },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/slow" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: {
      minPanel: 1,
      // minPanel is clamped to max(2, …) internally when panel.length>=2; use short
      // hard timeout so p/slow is dropped while p/a succeeds → single-survivor path.
      stragglerGraceMs: 20,
      panelHardTimeoutMs: 80,
    },
  });

  // Wait a tick for abort listeners fired after collect/timeout.
  await new Promise((r) => setTimeout(r, 30));

  assert.ok(signals.has("p/slow"), "slow panel must receive a modelAbortSignal");
  assert.equal(signals.get("p/slow")!.aborted, true, "timed-out panel signal must be aborted");
  assert.ok(abortEvents.includes("p/slow"), "abort event must fire for timed-out panel");
  // Fusion still produces a client response (single survivor or 503 — either is ok for abort contract).
  assert.ok(res.status === 200 || res.status === 503);
});

test("V2: successful panel is not aborted before Response is returned", async () => {
  const abortedAtReturn = new Map<string, boolean>();

  const handleSingleModel = async (_body: Body, model: string, target?: Target) => {
    const signal = target?.modelAbortSignal ?? null;
    if (model === "p/judge") {
      return okResponse("FINAL");
    }
    // Record abort state at the moment we hand back a successful Response.
    abortedAtReturn.set(model, signal?.aborted === true);
    return okResponse(`ans-${model}`);
  };

  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }], stream: false },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
  });

  assert.equal(res.status, 200);
  assert.equal(abortedAtReturn.get("p/a"), false, "p/a must not be aborted before return");
  assert.equal(abortedAtReturn.get("p/b"), false, "p/b must not be aborted before return");
});

test("V2: parent comboChatBase.signal abort aborts panel work", async () => {
  const parent = new AbortController();
  let panelSignal: AbortSignal | null = null;
  let panelAbortFired = false;
  let started = false;

  const handleSingleModel = async (_body: Body, model: string, target?: Target) => {
    if (model.startsWith("p/panel")) {
      started = true;
      panelSignal = target?.modelAbortSignal ?? null;
      panelSignal?.addEventListener(
        "abort",
        () => {
          panelAbortFired = true;
        },
        { once: true }
      );
      const aborted = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 5000);
        panelSignal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve(true);
          },
          { once: true }
        );
      });
      // Do not count as a successful panel answer after client abort.
      if (aborted) {
        return new Response(JSON.stringify({ error: { message: "aborted" } }), {
          status: 499,
          headers: { "Content-Type": "application/json" },
        });
      }
      return okResponse("late");
    }
    return okResponse(`ans-${model}`);
  };

  const fusionPromise = handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }], stream: false },
    panels: [
      { kind: "model", model: "p/panel-a" },
      { kind: "model", model: "p/panel-b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    comboChatBase: { signal: parent.signal },
    log,
    tuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 2000 },
  });

  // Abort client mid-flight after panels start.
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(started, true, "panels should have started");
  parent.abort();

  const res = await fusionPromise;
  await new Promise((r) => setTimeout(r, 20));

  assert.ok(panelSignal, "panel must receive abort signal");
  assert.equal(panelSignal!.aborted, true, "panel signal aborted after parent abort");
  assert.equal(panelAbortFired, true, "panel abort listener fired");
  // All panels aborted before answers → 503 total failure
  assert.equal(res.status, 503);
});

test("V2: multi-panel quorum still judges when enough panels succeed (abort regression)", async () => {
  const calls: string[] = [];
  const handleSingleModel = async (_body: Body, model: string, target?: Target) => {
    calls.push(model);
    // Signal is present for panels (abort plumbing wired) but not required for happy path.
    void target;
    if (model === "p/judge") return okResponse("FINAL");
    return okResponse(`ans-${model}`);
  };

  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }], stream: false },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
  });

  assert.equal(res.status, 200);
  assert.ok(calls.includes("p/a") && calls.includes("p/b") && calls.includes("p/judge"));
});

test("V2: all panels fail/timeout → 503 (abort plumbing does not change total-fail)", async () => {
  const handleSingleModel = async (_body: Body, _model: string, target?: Target) => {
    // Never resolve unless aborted (simulates hung upstream that gets aborted on hard timeout).
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 10_000);
      target?.modelAbortSignal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    });
    return okResponse("should-not-count");
  };

  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }], stream: false },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: { minPanel: 2, stragglerGraceMs: 10, panelHardTimeoutMs: 60 },
  });

  assert.equal(res.status, 503);
});

test("V2: straggler dropped by grace is aborted while successes feed the judge", async () => {
  const abortEvents: string[] = [];
  let stragglerSignal: AbortSignal | null = null;

  const handleSingleModel = async (_body: Body, model: string, target?: Target) => {
    const signal = target?.modelAbortSignal ?? null;
    if (model === "p/straggler") {
      stragglerSignal = signal;
      signal?.addEventListener(
        "abort",
        () => {
          abortEvents.push(model);
        },
        { once: true }
      );
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 5000);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true }
        );
      });
      return okResponse("straggler-late");
    }
    if (model === "p/judge") return okResponse("FINAL");
    // Fast panels
    return okResponse(`ans-${model}`);
  };

  const res = await handleFusionChatV2({
    body: { messages: [{ role: "user", content: "Q" }], stream: false },
    panels: [
      { kind: "model", model: "p/a" },
      { kind: "model", model: "p/b" },
      { kind: "model", model: "p/straggler" },
    ],
    judge: { kind: "model", model: "p/judge" },
    handleSingleModel,
    log,
    tuning: {
      minPanel: 2,
      stragglerGraceMs: 30,
      panelHardTimeoutMs: 5000,
    },
  });

  await new Promise((r) => setTimeout(r, 40));

  assert.equal(res.status, 200);
  assert.ok(stragglerSignal, "straggler must receive abort signal");
  assert.equal(stragglerSignal!.aborted, true, "straggler aborted after grace collect finish");
  assert.ok(abortEvents.includes("p/straggler"));
});
