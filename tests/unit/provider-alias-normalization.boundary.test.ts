import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Task 0176 — Canonical alias normalization: table-driven BOUNDARY contract.
//
// Exercises the PUBLIC boundaries (runSingleModelTest + TraeExecutor), not the
// helper in isolation (anti-TDD rule). Each row asserts the upstream-observable
// dispatch payload (provider, model) and whether fetch was called.
//
// Rows reference tests/unit/nvidia-model-test-identity.test.ts as the opaque
// passthrough contract template and tests/unit/opencode-namespace-separation
// as the alias-separation style.
// ─────────────────────────────────────────────────────────────────────────────

const TEST_DATA_DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), "omniroute-alias-boundary-")
);
const ORIGINAL_DATA_DIR = process.env.DATA_DIR;

process.env.DATA_DIR = TEST_DATA_DIR;

const core = await import("../../src/lib/db/core.ts");
const providersDb = await import("../../src/lib/db/providers.ts");
const { runSingleModelTest } = await import("../../src/lib/api/modelTestRunner.ts");
const { TraeExecutor } = await import("../../open-sse/executors/trae.ts");

const originalFetch = globalThis.fetch;

async function resetStorage() {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

async function seedConnection(provider: string, authType: string, extra: Record<string, unknown> = {}) {
  return providersDb.createProviderConnection({
    provider,
    authType,
    name: `${provider}-boundary-${Math.random().toString(16).slice(2, 8)}`,
    isActive: true,
    testStatus: "active",
    ...extra,
  });
}

/** Install a fetch mock that records every upstream `body.model` observed. */
function installUpstreamCapture() {
  const seen: Array<{ url: string; model: string }> = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL | string, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : "url" in input ? input.url : String(input);
    let model = "";
    try {
      const parsed = JSON.parse(String(init.body));
      model = typeof parsed?.model === "string" ? parsed.model : "";
    } catch {
      model = "";
    }
    seen.push({ url, model });
    return new Response(
      JSON.stringify({
        id: "chatcmpl-boundary",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "OK" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;
  return {
    seen,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test.beforeEach(async () => {
  await resetStorage();
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test.after(async () => {
  globalThis.fetch = originalFetch;
  await resetStorage();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  if (ORIGINAL_DATA_DIR === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = ORIGINAL_DATA_DIR;
});

// ─────────────────────────────────────────────────────────────────────────────
// Boundary matrix — single table, all rows assert upstream payload + fetch.
// ─────────────────────────────────────────────────────────────────────────────

const CHAT_BOUNDARY_ROWS = [
  {
    label: "row1 bare model id",
    providerId: "grok-cli",
    modelId: "grok-4.6",
    expectProvider: "grok-cli",
    expectModel: "grok-4.6",
    expectFetch: 1,
  },
  {
    label: "row2 alias-prefixed / NO double prefix",
    providerId: "grok-cli",
    modelId: "gc/grok-4.6",
    expectProvider: "grok-cli",
    expectModel: "grok-4.6",
    expectFetch: 1,
  },
  {
    label: "row3 id-prefixed canonical",
    providerId: "grok-cli",
    modelId: "grok-cli/grok-4.5",
    expectProvider: "grok-cli",
    expectModel: "grok-4.5",
    expectFetch: 1,
  },
  {
    label: "row5 opaque slash passthrough (cline)",
    providerId: "cline",
    modelId: "nvidia/nemotron-3-ultra-550b-a55b",
    expectProvider: "cline",
    expectModel: "nvidia/nemotron-3-ultra-550b-a55b",
    expectFetch: 1,
  },
  {
    label: "row6 cross-namespace model id (nvidia)",
    providerId: "nvidia",
    modelId: "openai/gpt-oss-120b",
    expectProvider: "nvidia",
    expectModel: "openai/gpt-oss-120b",
    expectFetch: 1,
  },
] as const;

test.describe("runSingleModelTest upstream dispatch payload matrix (rows 1,2,3,5,6)", () => {
  for (const row of CHAT_BOUNDARY_ROWS) {
    test(`${row.label}: provider=${row.providerId}, input=${row.modelId} → dispatch=${row.expectProvider}/${row.expectModel} fetch×${row.expectFetch}`, async () => {
      await seedConnection(row.providerId, row.providerId === "nvidia" ? "apikey" : "oauth", {
        accessToken: "sk-boundary-test",
        email: `boundary@${row.providerId}.test`,
        providerSpecificData:
          row.providerId === "grok-cli"
            ? { userId: "usr-boundary", principalType: "User" }
            : {},
      });

      const capture = installUpstreamCapture();
      try {
        const result = await runSingleModelTest({
          providerId: row.providerId,
          modelId: row.modelId,
          timeoutMs: 8_000,
        });

        // Identity fields are computed from the normalized fullModelStr and
        // are the canonical dispatch target.
        assert.equal(result.resolvedProvider, row.expectProvider);
        assert.equal(result.resolvedModel, row.expectModel);

        // Upstream-observable: exactly the expected number of fetch calls with
        // the expected model in the JSON payload (NO double prefix for rows 1-3;
        // slash preserved verbatim for opaque passthrough rows 5-6).
        assert.equal(capture.seen.length, row.expectFetch);
        const upstream = capture.seen[0];
        assert.ok(upstream, "expected an upstream fetch");
        assert.equal(upstream.model, row.expectModel);
        if (row.expectModel.includes("/")) {
          // opaque / cross-namespace passthrough: slash must survive verbatim.
          assert.ok(upstream.model.includes("/"), "opaque passthrough slash must be preserved");
        } else {
          assert.ok(!upstream.model.includes("/"), "upstream model must not carry a prefix");
        }
      } finally {
        capture.restore();
      }
    });
  }
});

test("row4: grok-build (denylisted legacy) → local 400, NO fetch", async () => {
  await seedConnection("grok-cli", "oauth", {
    accessToken: "sk-boundary-test",
    email: "boundary@grok-cli.test",
    providerSpecificData: { userId: "usr-boundary", principalType: "User" },
  });

  const capture = installUpstreamCapture();
  try {
    const result = await runSingleModelTest({
      providerId: "grok-cli",
      modelId: "grok-build",
      timeoutMs: 8_000,
    });
    assert.equal(result.httpStatus, 400);
    assert.equal(result.status, "error");
    assert.match(String(result.error || ""), /grok-build/i);
    assert.equal(capture.seen.length, 0, "denylisted model must not reach fetch");
  } finally {
    capture.restore();
  }
});

test("row2 rejects nested provider prefix", async () => {
  await seedConnection("grok-cli", "oauth", {
    accessToken: "sk-boundary-test",
    email: "boundary@grok-cli.test",
    providerSpecificData: { userId: "usr-boundary", principalType: "User" },
  });

  const capture = installUpstreamCapture();
  try {
    const result = await runSingleModelTest({
      providerId: "grok-cli",
      modelId: "grok-cli/gc/grok-4.6",
      timeoutMs: 8_000,
    });
    assert.equal(result.httpStatus, 400);
    assert.equal(result.status, "error");
    assert.match(String(result.error || ""), /nested provider prefix/i);
    assert.equal(capture.seen.length, 0, "nested provider prefix must not reach fetch");
  } finally {
    capture.restore();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Trae boundary — rows 7,8,9: resolveMode must normalize WITHOUT regex strip.
// resolveMode is private; execute() drives it and the session body is the
// upstream-observable payload (exactly like tests/unit/trae-executor.test.ts).
// ─────────────────────────────────────────────────────────────────────────────

const TRAE_BOUNDARY_ROWS = [
  { label: "row7 alias-prefixed tr/", model: "tr/minimax-m3", expectModelName: "minimax-m3" },
  { label: "row8 bare", model: "minimax-m3", expectModelName: "minimax-m3" },
  { label: "row9 id-prefixed trae/", model: "trae/minimax-m3", expectModelName: "minimax-m3" },
] as const;

test.describe("TraeExecutor.execute upstream session body (rows 7,8,9)", () => {
  for (const row of TRAE_BOUNDARY_ROWS) {
    test(`${row.label}: ${row.model} → model_name=${row.expectModelName} (no regex strip)`, async () => {
      const calls: { sessionBody?: { initial_message?: { model_name?: string } } } = {};
      const original = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL | string, init: RequestInit = {}) => {
        const url = typeof input === "string" ? input : "url" in input ? input.url : String(input);
        if (url.endsWith("/chat_sessions")) {
          calls.sessionBody = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              code: 0,
              data: { chat_session_id: "sess1", status: 2, message_id: "msg1" },
              message: "success",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        // events stream — single done frame
        const encoder = new TextEncoder();
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('event: done\ndata: {"status":"completed"}\n\n'));
              controller.close();
            },
          }),
          { status: 200, headers: { "Content-Type": "text/event-stream" } }
        );
      }) as typeof fetch;

      try {
        const executor = new TraeExecutor();
        await executor.execute({
          model: row.model,
          body: { messages: [{ role: "user", content: "hi" }] },
          stream: false,
          credentials: {
            accessToken: "JWT.test.token",
            providerSpecificData: {
              webId: "WID",
              bizUserId: "BUID",
              userUniqueId: "UUID",
              scope: "marscode-us",
              tenant: "marscode",
              region: "US-East",
            },
          },
        });
        assert.equal(
          calls.sessionBody?.initial_message?.model_name,
          row.expectModelName,
          "upstream model_name must be the bare id (regex-free normalization)"
        );
      } finally {
        globalThis.fetch = original;
      }
    });
  }
});