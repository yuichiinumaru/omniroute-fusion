import test from "node:test";
import assert from "node:assert/strict";
import {
  newStreamCtx,
  processFrame,
  type StreamCtx,
} from "../../open-sse/executors/cursor";
import {
  decodeNativeTodoWriteCompletion,
} from "../../open-sse/utils/cursorAgentProtobuf/nativeTodoWrite";
import {
  encodeRequestContextResponse,
  openAIToolsToMcpDefs,
  type ExecServerEvent,
  type OpenAITool,
} from "../../open-sse/utils/cursorAgentProtobuf";

// ─── Wire-format helpers (mirror the encoder primitives) ──────────────────
//
// Used to synthesise ExecServerMessage payloads and Connect-RPC frames for
// processFrame integration tests. Keep aligned with cursorAgentProtobuf.ts.

function v(n: number): Buffer {
  const out: number[] = [];
  while (n > 0x7f) {
    out.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  out.push(n);
  return Buffer.from(out);
}
function tag(field: number, wireType: number): Buffer {
  return v((field << 3) | wireType);
}
function lenPrefixed(field: number, payload: Buffer): Buffer {
  return Buffer.concat([tag(field, 2), v(payload.length), payload]);
}
function stringField(field: number, value: string): Buffer {
  return lenPrefixed(field, Buffer.from(value, "utf8"));
}
function varintField(field: number, value: number): Buffer {
  return Buffer.concat([tag(field, 0), v(value)]);
}

// AgentServerMessage { exec_server_message (2): ESM { ... } }
function buildExecServerMessage(
  execMsgId: number,
  execId: string,
  variantField: number,
  variantPayload: Buffer
): Buffer {
  const esm = Buffer.concat([
    varintField(1, execMsgId),
    stringField(15, execId),
    lenPrefixed(variantField, variantPayload),
  ]);
  return lenPrefixed(2, esm);
}

// InteractionUpdate { tool_call_completed (3): <args> }
function buildTodoCompleted(todoArgs: Buffer, toolCallId: string): Buffer {
  // ToolCallCompletedUpdate { tool_call_id (1), tool_call (2): { todo_write (9): { args (1): ... } } }
  const todoDetails = lenPrefixed(1, todoArgs);
  const toolCall = lenPrefixed(9, todoDetails);
  const completed = Buffer.concat([stringField(1, toolCallId), lenPrefixed(2, toolCall)]);
  const iu = lenPrefixed(3, completed);
  return lenPrefixed(1, iu);
}

function todoItem(content: string, status: number): Buffer {
  // TodoItem { content (2): string, status (3): varint }
  return lenPrefixed(1, Buffer.concat([stringField(2, content), varintField(3, status)]));
}

function bashTool(): OpenAITool {
  return {
    type: "function",
    function: {
      name: "bash",
      description: "Run a shell command",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          workdir: { type: "string" },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
  };
}

function readTool(): OpenAITool {
  return {
    type: "function",
    function: {
      name: "read",
      description: "Read a file",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" },
        },
        required: ["filePath"],
        additionalProperties: false,
      },
    },
  };
}

function ptySpawnTool(): OpenAITool {
  return {
    type: "function",
    function: {
      name: "pty_spawn",
      description: "Spawn a PTY",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          args: { type: "array", items: { type: "string" } },
          workdir: { type: "string" },
          description: { type: "string" },
          notifyOnExit: { type: "boolean" },
        },
        required: ["command", "args", "description"],
        additionalProperties: false,
      },
    },
  };
}

// ─── Native TodoWrite decoder fail-closed contract ────────────────────────

test("decodeNativeTodoWriteCompletion returns null on a length-delimited field overrun", () => {
  // ToolCallCompletedUpdate with a top-level length-delimited field whose
  // declared length overruns the actual payload bytes. The wire decoder's
  // checkedLen() throws; the decoder must catch and return null rather than
  // leak the exception to processFrame / driveH2.
  const malformed = Buffer.concat([
    tag(1, 2),
    v(200), // declared length
    Buffer.from([1, 2, 3]), // 3 payload bytes only
  ]);
  assert.doesNotThrow(() => decodeNativeTodoWriteCompletion(malformed));
  assert.equal(decodeNativeTodoWriteCompletion(malformed), null);
});

test("decodeNativeTodoWriteCompletion returns null when an inner todos field overruns", () => {
  // Wrap a normal tool_call_id, but make the inner TodoItem field 1 (the
  // nested TodoWriteArgs.todos wrapper) declare a length that overruns the
  // remaining bytes inside the args envelope.
  const todoArgs = Buffer.concat([
    // legitimate envelope opener: just the todos field with bogus length
    tag(1, 2),
    v(1_000_000),
    Buffer.from([0xaa, 0xbb]),
  ]);
  const todoDetails = lenPrefixed(1, todoArgs);
  const toolCall = lenPrefixed(9, todoDetails);
  const completed = Buffer.concat([stringField(1, "tc-overrun"), lenPrefixed(2, toolCall)]);
  assert.doesNotThrow(() => decodeNativeTodoWriteCompletion(completed));
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion returns null for an unsupported wire type", () => {
  // Top-level field with wireType 7 (invalid). decodeFields throws.
  const malformed = Buffer.concat([tag(1, 7), v(1)]);
  assert.doesNotThrow(() => decodeNativeTodoWriteCompletion(malformed));
  assert.equal(decodeNativeTodoWriteCompletion(malformed), null);
});

// ─── Bridge runtime wiring: tool_choice filtering is honored ──────────────

test("processFrame honors a pre-filtered tool_choice when bridging shell events", () => {
  // tool_choice: { type: "function", function: { name: "read" } } filters the
  // bridge candidate set down to the read tool. A shell event should NOT
  // produce a structured tool_call because the caller filtered bash/pty_spawn
  // out. Without this guarantee (Reviewer blocker 1) the bridge could still
  // surface a tool the caller's tool_choice forbade.
  const mcpTools = openAIToolsToMcpDefs([bashTool(), ptySpawnTool(), readTool()]);
  const filtered = mcpTools.filter((t) => t.name === "read");

  const emitted: string[] = [];
  const ctx = newStreamCtx("auto", (s) => emitted.push(s));
  const acked = new Set<string>();

  const shellEvent: Buffer = buildExecServerMessage(
    1,
    "exec-shell-filter",
    2, // ESM_SHELL_ARGS
    Buffer.concat([stringField(1, "echo hi"), stringField(2, "/tmp")])
  );
  processFrame(shellEvent, ctx, acked, { mcpTools: filtered });

  // No structured tool call — the filter excluded the bash tool.
  assert.equal(ctx.toolCalls.length, 0);
  assert.equal(ctx.requiresColdResume, false);
  assert.equal(ctx.endReason, null);
  // No tool_calls SSE chunks emitted.
  for (const line of emitted) {
    assert.equal(/"tool_calls"/.test(line), false, `no tool_calls chunk: ${line}`);
  }
});

test("processFrame emits a structured tool_call when the bridge candidate is present", () => {
  const mcpTools = openAIToolsToMcpDefs([bashTool(), readTool()]);
  const emitted: string[] = [];
  const ctx = newStreamCtx("auto", (s) => emitted.push(s));
  const acked = new Set<string>();

  const readEvent: Buffer = buildExecServerMessage(
    7, // ESM_READ_ARGS
    "exec-read",
    7,
    stringField(1, "/tmp/probe.txt")
  );
  processFrame(readEvent, ctx, acked, { mcpTools });

  assert.equal(ctx.toolCalls.length, 1);
  assert.equal(ctx.toolCalls[0].name, "read");
  // Stable, non-empty, call_-prefixed id (OpenAI contract).
  assert.match(ctx.toolCalls[0].id, /^call_/);
  // Lifecycle markers: bridge emission must mark cold-resume + tool_calls.
  assert.equal(ctx.requiresColdResume, true);
  assert.equal(ctx.endReason, "tool_calls");
  // Serialized arguments shape.
  assert.deepEqual(JSON.parse(ctx.toolCalls[0].argumentsJson), {
    filePath: "/tmp/probe.txt",
  });
  // SSE sequence: role chunk + tool_calls init + tool_calls args (no exec_mcp
  // init+args because the bridge emits a single combined init via
  // emitStructuredToolCall).
  assert.ok(emitted.some((line) => line.includes('"tool_calls"')));
  for (const line of emitted) {
    assert.equal(/"tool_call_id"/.test(line), false, "no cursor-internal exec ids leak");
  }
});

test("processFrame does NOT bridge when mcpTools is empty (tool_choice:\"none\")", () => {
  const emitted: string[] = [];
  const ctx = newStreamCtx("auto", (s) => emitted.push(s));
  const acked = new Set<string>();
  const shellEvent: Buffer = buildExecServerMessage(
    1,
    "exec-shell-none",
    2,
    Buffer.concat([stringField(1, "echo hi"), stringField(2, "/tmp")])
  );
  processFrame(shellEvent, ctx, acked, { mcpTools: [] });
  assert.equal(ctx.toolCalls.length, 0);
  assert.equal(ctx.requiresColdResume, false);
  for (const line of emitted) {
    assert.equal(/"tool_calls"/.test(line), false);
  }
});

// ─── Native TodoWrite bridge: cold-resume + stable IDs ─────────────────────

test("processFrame bridges a TodoWrite completion through the OpenAI tool contract", () => {
  // todoArgs: todos (1) { content, status }, merge (2)=0
  const todoArgs = Buffer.concat([todoItem("Inspect", 3), todoItem("Write", 2), varintField(2, 0)]);
  const todoCompleted = buildTodoCompleted(todoArgs, "toolu_todo_bridge_1");
  const mcpTools = openAIToolsToMcpDefs([
    {
      type: "function",
      function: {
        name: "todowrite",
        description: "Update todos",
        parameters: {
          type: "object",
          properties: {
            todos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  status: {
                    type: "string",
                    enum: ["pending", "in_progress", "completed", "cancelled"],
                  },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["content", "status", "priority"],
                additionalProperties: false,
              },
            },
          },
          required: ["todos"],
          additionalProperties: false,
        },
      },
    },
  ]);

  const emitted: string[] = [];
  const ctx = newStreamCtx("auto", (s) => emitted.push(s));
  // Provide structured history so the bridge has priorities to preserve
  // (the schema requires priority; without history the bridge fails closed).
  processFrame(todoCompleted, ctx, new Set(), {
    mcpTools,
    todoHistory: [
      { content: "Inspect", priority: "high" },
      { content: "Write", priority: "medium" },
    ],
  });

  assert.equal(ctx.toolCalls.length, 1, "one structured tool call emitted");
  assert.equal(ctx.toolCalls[0].name, "todowrite");
  assert.match(ctx.toolCalls[0].id, /^call_/);
  assert.equal(ctx.requiresColdResume, true, "TodoWrite bridge forces cold resume");
  assert.equal(ctx.endReason, "tool_calls");
  // Stable serialized arguments.
  const parsed = JSON.parse(ctx.toolCalls[0].argumentsJson);
  assert.equal(Array.isArray(parsed.todos), true);
  for (const item of parsed.todos) {
    assert.equal(typeof item.content, "string");
    assert.equal(typeof item.status, "string");
  }
  // No raw wire / decoder state leaks into SSE.
  for (const line of emitted) {
    assert.equal(/toolu_todo/.test(line), false, "cursor-internal toolCallId must not leak");
    assert.equal(/"todo_write":/.test(line), false, "wire field names must not leak");
  }
});

test("processFrame does not bridge TodoWrite when the wire payload is malformed", () => {
  // Inject a corrupted TodoWrite envelope — processFrame's decoder must
  // return null and the bridge must NOT emit a fabricated tool call.
  const malformedTodoCompleted = buildTodoCompleted(
    Buffer.concat([tag(1, 2), v(200), Buffer.from([1, 2, 3])]), // bogus inner length
    "tc-malformed"
  );
  const mcpTools = openAIToolsToMcpDefs([
    {
      type: "function",
      function: {
        name: "todowrite",
        parameters: {
          type: "object",
          properties: {
            todos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  status: { type: "string" },
                },
                required: ["content", "status"],
              },
            },
          },
          required: ["todos"],
        },
      },
    },
  ]);
  const emitted: string[] = [];
  const ctx = newStreamCtx("auto", (s) => emitted.push(s));
  processFrame(malformedTodoCompleted, ctx, new Set(), { mcpTools });
  assert.equal(ctx.toolCalls.length, 0, "no fabricated tool call");
  assert.equal(ctx.requiresColdResume, false);
  for (const line of emitted) {
    assert.equal(/"tool_calls"/.test(line), false);
  }
});

// ─── Credential / error sanitization ──────────────────────────────────────

test("processFrame sanitizes upstream error messages so credentials don't leak", () => {
  // Synthesise a Connect-RPC JSON error payload carrying a credential-shaped
  // string in the err.message field (mirrors what a hostile upstream could
  // send). The executor stores this in ctx.midStreamError; the eventual SSE /
  // JSON emission must NOT contain the bearer / sk- / cookie fragments.
  const secretToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake";
  const apiKey = "sk-proj-1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const cookie = "session=abcd1234; Path=/; Secure";
  const errPayload = Buffer.from(
    JSON.stringify({
      error: {
        message: `internal failure ${secretToken} ${apiKey} ${cookie}`,
        code: "internal",
      },
    }),
    "utf8"
  );
  const emitted: string[] = [];
  const ctx: StreamCtx = newStreamCtx("auto", (s) => emitted.push(s));
  processFrame(errPayload, ctx, new Set());
  assert.ok(ctx.midStreamError, "midStreamError was captured");
  // Re-emit through the same code path finalizeSseStream uses to assert the
  // emitted error chunks don't leak raw credentials.
  const blob = JSON.stringify({
    error: { message: ctx.midStreamError!.message },
  });
  assert.equal(/Bearer\s/i.test(blob), false, "Bearer token must not leak");
  assert.equal(/sk-[A-Za-z0-9]{8,}/.test(blob), false, "openai-style key must not leak");
  assert.equal(/session=abcd/i.test(blob), false, "session cookie must not leak");
  // But a non-credential message is preserved (so the client gets *some*
  // signal — just the sanitized version).
  assert.match(blob, /internal failure/);
  void encodeRequestContextResponse; // typecheck import
});

test("processFrame sanitizes err.details[0].debug.details.title/detail from upstream", () => {
  // Connect-RPC error envelopes sometimes surface the upstream exception's
  // debug details. A credential-shaped string there must be sanitized before
  // the executor stores it in ctx.midStreamError.
  const credentialTitle = "Bearer sup3rs3cret-token-value-with-entropy";
  const payload = Buffer.from(
    JSON.stringify({
      error: {
        details: [
          {
            debug: {
              details: {
                title: credentialTitle,
                detail: "fallback",
              },
            },
          },
        ],
      },
    }),
    "utf8"
  );
  const ctx: StreamCtx = newStreamCtx("auto", () => {});
  processFrame(payload, ctx, new Set());
  assert.ok(ctx.midStreamError, "captured");
  assert.equal(
    /Bearer\s/i.test(ctx.midStreamError!.message),
    false,
    "Bearer credential must be redacted"
  );
});

// ─── Cancellation / abort safety ──────────────────────────────────────────

test("processFrame still emits a typed rejection for unsupported built-in events", () => {
  // exec_write is not part of the bridge surface; the executor must still
  // dispatch its typed rejection upstream. We assert no bridge tool call is
  // emitted and ctx state advances (does not wedge on unrecognized events).
  const mcpTools = openAIToolsToMcpDefs([bashTool(), readTool()]);
  const emitted: string[] = [];
  const ctx = newStreamCtx("auto", (s) => emitted.push(s));
  const writeEvent: Buffer = buildExecServerMessage(
    1,
    "exec-write-unsupported",
    3, // ESM_WRITE_ARGS
    stringField(1, "/tmp/x")
  );
  // processFrame writes a typed rejection on the h2 stream; we don't have one
  // here, so the rejection write is skipped (the existing code wraps it in
  // try/catch). The important guarantee is the bridge side-effect.
  processFrame(writeEvent, ctx, new Set(), { mcpTools });
  assert.equal(ctx.toolCalls.length, 0, "no bridge for unsupported event");
  assert.equal(ctx.requiresColdResume, false);
});

// ─── Bridge never invents a tool result when nothing matches ──────────────

test("bridge surfaces no tool result when no declared tool matches the native event", () => {
  const mcpTools = openAIToolsToMcpDefs([
    {
      type: "function",
      function: {
        name: "search_web",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    },
  ]);
  const ctx = newStreamCtx("auto", () => {});
  const shellEvent: Buffer = buildExecServerMessage(
    1,
    "exec-shell-mismatch",
    2,
    Buffer.concat([stringField(1, "echo hi"), stringField(2, "/tmp")])
  );
  processFrame(shellEvent, ctx, new Set(), { mcpTools });
  assert.equal(ctx.toolCalls.length, 0, "no fabricated tool call");
  assert.equal(ctx.requiresColdResume, false);
});

// ─── Bridge does not duplicate Composer inline-parser logic ───────────────

test("processFrame does not invoke the bridge for raw text deltas (composer parser stays separate)", () => {
  // A text_delta InteractionUpdate alone must not trigger a bridge — only
  // the dedicated exec_* / native_todo_write event paths do. This guards
  // against accidentally short-circuiting the composer inline-parser path.
  const mcpTools = openAIToolsToMcpDefs([bashTool(), readTool()]);
  const ctx = newStreamCtx("auto", () => {});
  const textDelta = Buffer.concat([
    lenPrefixed(1, stringField(1, "hi")),
    lenPrefixed(1, Buffer.from([0])),
  ]);
  // Build a real text_delta payload (text_delta (1) -> TDU { text (1) }).
  const tdu = stringField(1, "hello");
  const iu = lenPrefixed(1, tdu);
  const textEvent = lenPrefixed(1, iu);
  processFrame(textEvent, ctx, new Set(), { mcpTools });
  assert.equal(ctx.toolCalls.length, 0);
  assert.equal(ctx.requiresColdResume, false);
});

// ─── Final regression: bridge call IDs are stable and unique ──────────────

test("processFrame generates stable, unique tool_call IDs for parallel native events", () => {
  const mcpTools = openAIToolsToMcpDefs([bashTool(), readTool()]);
  const ctx = newStreamCtx("auto", () => {});
  const acked = new Set<string>();
  // Two parallel read events with distinct paths; bridge each.
  processFrame(
    buildExecServerMessage(1, "exec-r1", 7, stringField(1, "/tmp/a")),
    ctx,
    acked,
    { mcpTools }
  );
  processFrame(
    buildExecServerMessage(2, "exec-r2", 7, stringField(1, "/tmp/b")),
    ctx,
    acked,
    { mcpTools }
  );
  assert.equal(ctx.toolCalls.length, 2);
  assert.notEqual(ctx.toolCalls[0].id, ctx.toolCalls[1].id, "IDs must be distinct");
  for (const tc of ctx.toolCalls) {
    assert.match(tc.id, /^call_/);
  }
  assert.deepEqual(JSON.parse(ctx.toolCalls[0].argumentsJson), { filePath: "/tmp/a" });
  assert.deepEqual(JSON.parse(ctx.toolCalls[1].argumentsJson), { filePath: "/tmp/b" });
});

// ─── Suppress unused-var lint from the imports above ──────────────────────

test("smoke: imports resolve", () => {
  assert.ok(typeof processFrame === "function");
  assert.ok(typeof decodeNativeTodoWriteCompletion === "function");
  assert.ok(typeof newStreamCtx === "function");
});

// ─── Smoke: EventKind unknown shape — bridge returns null and no emit ─────

test("processFrame does not bridge events of kind exec_* that are not shell/read", () => {
  // exec_diagnostics / exec_grep / exec_fetch / exec_ls / exec_delete /
  // exec_write_shell_stdin all map to typed rejections upstream. The bridge
  // must not fabricate tool_calls for them.
  const mcpTools = openAIToolsToMcpDefs([bashTool(), readTool()]);
  for (const [variant, payload] of [
    [9, Buffer.alloc(0)], // exec_diagnostics
    [5, stringField(1, "pattern")], // exec_grep
    [20, stringField(1, "https://example.com")], // exec_fetch
    [8, stringField(1, "/")], // exec_ls
    [4, stringField(1, "/tmp/x")], // exec_delete
    [23, Buffer.alloc(0)], // exec_write_shell_stdin
  ] as const) {
    const ctx = newStreamCtx("auto", () => {});
    processFrame(
      buildExecServerMessage(1, `exec-non-bridge-${variant}`, variant, payload),
      ctx,
      new Set(),
      { mcpTools }
    );
    assert.equal(ctx.toolCalls.length, 0, `variant ${variant} must not bridge`);
  }
});

// ─── Cancellation: bridge honors fresh mcpTools on each call ─────────────

test("processFrame does not cache bridge candidates across frames", () => {
  // First frame: mcpTools includes bash. Second frame: empty mcpTools (the
  // caller revoked tools mid-stream). Even if the executor would normally
  // reuse a previous mcpTools reference, the bridge must trust the
  // per-frame opt.mcpTools argument.
  const mcpTools = openAIToolsToMcpDefs([bashTool()]);
  const ctx = newStreamCtx("auto", () => {});
  processFrame(
    buildExecServerMessage(
      1,
      "exec-shell-cached",
      2,
      Buffer.concat([stringField(1, "echo hi"), stringField(2, "/tmp")])
    ),
    ctx,
    new Set(),
    { mcpTools }
  );
  assert.equal(ctx.toolCalls.length, 1);
  // Reset ctx state and dispatch a fresh shell event with empty mcpTools.
  const ctx2 = newStreamCtx("auto", () => {});
  processFrame(
    buildExecServerMessage(
      2,
      "exec-shell-revoked",
      2,
      Buffer.concat([stringField(1, "echo again"), stringField(2, "/tmp")])
    ),
    ctx2,
    new Set(),
    { mcpTools: [] }
  );
  assert.equal(ctx2.toolCalls.length, 0);
  // Type the unused shape so future edits don't drift.
  const ev: ExecServerEvent = {
    kind: "exec_shell",
    execMsgId: 0,
    execId: "",
    command: "",
    workingDir: "",
    timeout: 0,
    isBackground: false,
    hardTimeout: 0,
  };
  assert.ok(ev);
});

// ─── Runtime wiring: execute() must pass bridgeTools to driveH2 ───────────
//
// `processFrame` itself cannot observe the wiring between execute() and
// driveH2 — its `mcpTools` argument is caller-supplied. To pin the wiring at
// the call site we read the source and assert both driveH2 calls are invoked
// with `bridgeTools` (the tool_choice-filtered set) rather than the full
// `mcpTools` reference. This is the runtime-wiring regression test for
// Reviewer blocker #1.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

test("execute() routes the tool_choice-filtered bridgeTools set into driveH2", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const cursorSrc = readFileSync(
    resolve(here, "../../open-sse/executors/cursor.ts"),
    "utf8"
  );

  // Locate the two driveH2 call sites inside execute() and verify each passes
  // the bridgeTools symbol — never the raw mcpTools reference.
  const driveH2Matches = [...cursorSrc.matchAll(/this\.driveH2\(([^)]+?)\)/gs)];
  assert.ok(driveH2Matches.length >= 2, "expected two driveH2 call sites in execute()");
  for (const match of driveH2Matches) {
    const args = match[1];
    assert.match(
      args,
      /\bbridgeTools\b/,
      "driveH2 must receive bridgeTools so tool_choice is honored"
    );
    assert.equal(
      /\bmcpTools\b/.test(args.split("\n").slice(1).join("\n")), // ignore the `ctx` arg name on the first line
      false,
      "driveH2 must not receive the unfiltered mcpTools set"
    );
  }
});