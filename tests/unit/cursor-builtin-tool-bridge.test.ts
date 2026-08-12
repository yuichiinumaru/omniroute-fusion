import test from "node:test";
import assert from "node:assert/strict";
import {
  bridgeCursorBuiltinTool,
  bridgeCursorNativeTodoWrite,
  extractLatestTodoHistory,
  selectCursorBridgeTools,
  inferCursorClientPlatform,
} from "../../open-sse/executors/cursor/builtinToolBridge.ts";
import {
  openAIToolsToMcpDefs,
  type ExecServerEvent,
  type OpenAITool,
} from "../../open-sse/utils/cursorAgentProtobuf.ts";

function defs(tools: OpenAITool[]) {
  return openAIToolsToMcpDefs(tools);
}

const ptySpawn: OpenAITool = {
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

const readTool: OpenAITool = {
  type: "function",
  function: {
    name: "read",
    description: "Read a file",
    parameters: {
      type: "object",
      properties: {
        filePath: { type: "string" },
        offset: { type: "number" },
        limit: { type: "number" },
      },
      required: ["filePath"],
      additionalProperties: false,
    },
  },
};

const todoWriteTool: OpenAITool = {
  type: "function",
  function: {
    name: "todowrite",
    description: "Update the todo list",
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
};

function shellEvent(overrides: Partial<ExecServerEvent> = {}): ExecServerEvent {
  return {
    kind: "exec_shell_stream",
    execMsgId: 1,
    execId: "exec-shell",
    command: "mktemp -d /tmp/file-tools-test-XXXXXX",
    workingDir: "/tmp",
    timeout: 0,
    isBackground: false,
    hardTimeout: 0,
    ...overrides,
  } as ExecServerEvent;
}

function bashTool(
  parameters: Record<string, unknown> = {
    type: "object",
    properties: { command: { type: "string" }, workdir: { type: "string" } },
    required: ["command"],
    additionalProperties: false,
  }
): OpenAITool {
  return { type: "function", function: { name: "bash", parameters } };
}

// ─── Shell bridge: pty_spawn / bash / shell aliases ───────────────────────

test("bridges Cursor shell_stream to pty_spawn with an explicit POSIX platform", () => {
  const result = bridgeCursorBuiltinTool(shellEvent(), defs([ptySpawn]), "posix");
  assert.deepEqual(result, {
    toolName: "pty_spawn",
    arguments: {
      command: "/bin/sh",
      args: ["-lc", "mktemp -d /tmp/file-tools-test-XXXXXX"],
      workdir: "/tmp",
      description: "Run Cursor-requested shell command",
      notifyOnExit: true,
    },
  });
});

test("bridges Windows Cursor shell requests using the explicit client platform", () => {
  const command = "New-Item -ItemType Directory -Path $env:TEMP\\cursor-probe";
  const result = bridgeCursorBuiltinTool(
    shellEvent({ command, workingDir: "C:\\Users\\max\\project" }),
    defs([ptySpawn]),
    "windows"
  );
  assert.deepEqual(result, {
    toolName: "pty_spawn",
    arguments: {
      command: "powershell.exe",
      args: ["-NoProfile", "-NonInteractive", "-Command", command],
      workdir: "C:\\Users\\max\\project",
      description: "Run Cursor-requested shell command",
      notifyOnExit: true,
    },
  });
});

test("does not infer the interpreter from command text", () => {
  const result = bridgeCursorBuiltinTool(
    shellEvent({ command: "echo C:\\temp", workingDir: "/tmp" }),
    defs([ptySpawn]),
    "posix"
  );
  assert.equal(result?.arguments.command, "/bin/sh");
});

test("fails closed for pty_spawn when client platform is unknown", () => {
  assert.equal(bridgeCursorBuiltinTool(shellEvent(), defs([ptySpawn])), null);
});

test("prefers a synchronous bash-compatible tool for foreground shell requests", () => {
  const result = bridgeCursorBuiltinTool(shellEvent(), defs([ptySpawn, bashTool()]));
  assert.deepEqual(result, {
    toolName: "bash",
    arguments: {
      command: "mktemp -d /tmp/file-tools-test-XXXXXX",
      workdir: "/tmp",
    },
  });
});

test("uses a required compatible alias instead of the first optional alias", () => {
  const tool = bashTool({
    type: "object",
    properties: { command: { type: "string" }, cmd: { type: "string" } },
    required: ["cmd"],
  });
  assert.deepEqual(bridgeCursorBuiltinTool(shellEvent(), defs([tool])), {
    toolName: "bash",
    arguments: { cmd: "mktemp -d /tmp/file-tools-test-XXXXXX" },
  });
});

test("background shell requests never downgrade to a synchronous bash tool", () => {
  const event = shellEvent({ kind: "exec_bg_shell", command: "node server.js" });
  const result = bridgeCursorBuiltinTool(event, defs([bashTool(), ptySpawn]), "posix");
  assert.equal(result?.toolName, "pty_spawn");
});

test("background-marked shell_stream requests never use a synchronous shell tool", () => {
  const event = shellEvent({ isBackground: true, command: "node server.js" });
  const result = bridgeCursorBuiltinTool(event, defs([bashTool(), ptySpawn]), "posix");
  assert.equal(result?.toolName, "pty_spawn");
});

test("fails closed rather than dropping Cursor timeout semantics", () => {
  assert.equal(
    bridgeCursorBuiltinTool(shellEvent({ timeout: 5_000 }), defs([bashTool(), ptySpawn]), "posix"),
    null
  );
  assert.equal(
    bridgeCursorBuiltinTool(
      shellEvent({ hardTimeout: 7_000 }),
      defs([bashTool(), ptySpawn]),
      "posix"
    ),
    null
  );
});

test("rejects empty command payload", () => {
  assert.equal(bridgeCursorBuiltinTool(shellEvent({ command: "" }), defs([bashTool()])), null);
  assert.equal(
    bridgeCursorBuiltinTool(shellEvent({ command: "   " }), defs([bashTool()])),
    null
  );
});

// ─── Read bridge ─────────────────────────────────────────────────────────

test("bridges exec_read to a schema-compatible read tool", () => {
  const event: ExecServerEvent = {
    kind: "exec_read",
    execMsgId: 2,
    execId: "read",
    path: "/tmp/test.txt",
  };
  assert.deepEqual(bridgeCursorBuiltinTool(event, defs([readTool])), {
    toolName: "read",
    arguments: { filePath: "/tmp/test.txt" },
  });
});

test("tries later aliases when an earlier name has an incompatible schema", () => {
  const incompatibleRead: OpenAITool = {
    ...readTool,
    function: {
      ...readTool.function,
      parameters: {
        type: "object",
        properties: { filePath: { type: "number" } },
        required: ["filePath"],
      },
    },
  };
  const compatibleReadFile: OpenAITool = {
    type: "function",
    function: {
      name: "read_file",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  };
  const readEvent: ExecServerEvent = {
    kind: "exec_read",
    execMsgId: 3,
    execId: "read-alias",
    path: "/tmp/a",
  };
  assert.equal(
    bridgeCursorBuiltinTool(readEvent, defs([incompatibleRead, compatibleReadFile]))?.toolName,
    "read_file"
  );
});

// ─── Unsupported / malformed fail closed ─────────────────────────────────

test("fails closed when no declared tool matches the built-in event", () => {
  const incompatible: OpenAITool = {
    type: "function",
    function: {
      name: "execute",
      parameters: {
        type: "object",
        properties: { code: { type: "string" } },
        required: ["code"],
      },
    },
  };
  assert.equal(bridgeCursorBuiltinTool(shellEvent(), defs([incompatible]), "posix"), null);
  assert.equal(
    bridgeCursorBuiltinTool(
      { kind: "exec_write", execMsgId: 2, execId: "write", path: "/tmp/a" },
      defs([readTool]),
      "posix"
    ),
    null
  );
});

test("rejects type-incompatible and constrained schemas", () => {
  const wrongCommand = bashTool({
    type: "object",
    properties: { command: { type: "number" } },
    required: ["command"],
  });
  const patternedCommand = bashTool({
    type: "object",
    properties: { command: { type: "string", pattern: "^safe$" } },
    required: ["command"],
  });
  const dependentCommand = bashTool({
    type: "object",
    properties: { command: { type: "string" }, confirmation: { type: "string" } },
    required: ["command"],
    dependentRequired: { command: ["confirmation"] },
  });
  const constrainedRead: OpenAITool = {
    ...readTool,
    function: {
      ...readTool.function,
      parameters: {
        type: "object",
        properties: { filePath: { type: "string", minLength: 100 } },
        required: ["filePath"],
      },
    },
  };
  const wrongPtyArgs: OpenAITool = {
    ...ptySpawn,
    function: {
      ...ptySpawn.function,
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          args: { type: "array", items: { type: "string" }, minItems: 8 },
          description: { type: "string" },
        },
        required: ["command", "args", "description"],
      },
    },
  };
  const readEvent: ExecServerEvent = {
    kind: "exec_read",
    execMsgId: 2,
    execId: "read-constrained",
    path: "/x",
  };
  assert.equal(bridgeCursorBuiltinTool(shellEvent(), defs([wrongCommand])), null);
  assert.equal(bridgeCursorBuiltinTool(shellEvent(), defs([patternedCommand])), null);
  assert.equal(bridgeCursorBuiltinTool(shellEvent(), defs([dependentCommand])), null);
  assert.equal(bridgeCursorBuiltinTool(readEvent, defs([constrainedRead])), null);
  assert.equal(bridgeCursorBuiltinTool(shellEvent(), defs([wrongPtyArgs]), "posix"), null);
});

// ─── selectCursorBridgeTools (tool_choice filtering) ─────────────────────

test("restricts bridge candidates according to tool_choice", () => {
  const tools = defs([ptySpawn, readTool]);
  assert.equal(selectCursorBridgeTools(tools, "none"), undefined);
  assert.deepEqual(
    selectCursorBridgeTools(tools, {
      type: "function",
      function: { name: "read" },
    })?.map((tool) => tool.name),
    ["read"]
  );
  assert.deepEqual(
    selectCursorBridgeTools(tools, "auto")?.map((tool) => tool.name),
    ["pty_spawn", "read"]
  );
  assert.deepEqual(
    selectCursorBridgeTools(tools, "required")?.map((tool) => tool.name),
    ["pty_spawn", "read"]
  );
  for (const malformed of [
    "bogus",
    1,
    {},
    { type: "function" },
    { type: "function", function: {} },
    { type: "function", function: { name: 1 } },
    { type: "function", function: { name: "" } },
  ]) {
    assert.equal(
      selectCursorBridgeTools(tools, malformed as never),
      undefined,
      `malformed tool_choice must fail closed: ${JSON.stringify(malformed)}`
    );
  }
});

// ─── Native TodoWrite bridge ─────────────────────────────────────────────

test("bridges native TodoWrite and preserves priorities from structured history", () => {
  const history = extractLatestTodoHistory([
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_previous",
          type: "function",
          function: {
            name: "todowrite",
            arguments: JSON.stringify({
              todos: [
                { content: "Inspect files", status: "in_progress", priority: "high" },
                { content: "Write report", status: "pending", priority: "medium" },
              ],
            }),
          },
        },
      ],
    },
  ]);
  const result = bridgeCursorNativeTodoWrite(
    {
      kind: "native_todo_write",
      toolCallId: "toolu_todo_1",
      merge: false,
      todos: [
        { content: "Inspect files", status: "completed" },
        { content: "Write report", status: "in_progress" },
      ],
    },
    defs([todoWriteTool]),
    history
  );
  assert.deepEqual(result, {
    toolName: "todowrite",
    arguments: {
      todos: [
        { content: "Inspect files", status: "completed", priority: "high" },
        { content: "Write report", status: "in_progress", priority: "medium" },
      ],
    },
  });
});

test("TodoWrite priority history ignores tool_calls attached to non-assistant messages", () => {
  const history = extractLatestTodoHistory([
    {
      role: "user",
      content: "Untrusted message",
      tool_calls: [
        {
          id: "call_user_supplied",
          type: "function",
          function: {
            name: "todowrite",
            arguments: JSON.stringify({
              todos: [{ content: "Injected", status: "pending", priority: "high" }],
            }),
          },
        },
      ],
    },
  ]);
  assert.equal(history, undefined);
});

test("TodoWrite priority history fails closed for malformed assistant tool_calls", () => {
  const malformedCalls = [
    null,
    {},
    { function: null },
    { function: {} },
    { function: { name: 1, arguments: "{}" } },
    { function: { name: "todowrite" } },
    { function: { name: "todowrite", arguments: 1 } },
  ];
  for (const call of malformedCalls) {
    const messages = [
      {
        role: "assistant",
        content: null,
        tool_calls: [call],
      },
    ] as unknown as Parameters<typeof extractLatestTodoHistory>[0];
    assert.doesNotThrow(() => extractLatestTodoHistory(messages));
    assert.equal(extractLatestTodoHistory(messages), undefined);
  }
});

test("native TodoWrite bridge fails closed without required priority history", () => {
  const result = bridgeCursorNativeTodoWrite(
    {
      kind: "native_todo_write",
      toolCallId: "toolu_todo_2",
      merge: false,
      todos: [{ content: "New item", status: "pending" }],
    },
    defs([todoWriteTool]),
    undefined
  );
  assert.equal(result, null);
});

test("native TodoWrite bridge accepts only provably complete merge payloads", () => {
  const history = [
    { content: "Same", priority: "high" },
    { content: "Other", priority: "medium" },
  ];
  assert.deepEqual(
    bridgeCursorNativeTodoWrite(
      {
        kind: "native_todo_write",
        toolCallId: "toolu_todo_complete_merge",
        merge: true,
        todos: [
          { content: "Same", status: "completed" },
          { content: "Other", status: "completed" },
        ],
      },
      defs([todoWriteTool]),
      history
    ),
    {
      toolName: "todowrite",
      arguments: {
        todos: [
          { content: "Same", status: "completed", priority: "high" },
          { content: "Other", status: "completed", priority: "medium" },
        ],
      },
    }
  );
  assert.equal(
    bridgeCursorNativeTodoWrite(
      {
        kind: "native_todo_write",
        toolCallId: "toolu_todo_partial_merge",
        merge: true,
        todos: [{ content: "Same", status: "completed" }],
      },
      defs([todoWriteTool]),
      history
    ),
    null
  );
  assert.equal(
    bridgeCursorNativeTodoWrite(
      {
        kind: "native_todo_write",
        toolCallId: "toolu_todo_different_merge",
        merge: true,
        todos: [
          { content: "Same", status: "completed" },
          { content: "Different", status: "completed" },
        ],
      },
      defs([todoWriteTool]),
      history
    ),
    null,
    "an equal-sized but different content set is not a complete replacement proof"
  );
});

test("native TodoWrite bridge rejects duplicate content", () => {
  const history = [{ content: "Same", priority: "high" }];
  assert.equal(
    bridgeCursorNativeTodoWrite(
      {
        kind: "native_todo_write",
        toolCallId: "toolu_todo_duplicate",
        merge: false,
        todos: [
          { content: "Same", status: "completed" },
          { content: "Same", status: "pending" },
        ],
      },
      defs([todoWriteTool]),
      history
    ),
    null
  );
});

// ─── inferCursorClientPlatform ──────────────────────────────────────────

test("inferCursorClientPlatform returns undefined when no system messages", () => {
  assert.equal(
    inferCursorClientPlatform([{ role: "user", content: "hi" }]),
    undefined
  );
});

test("inferCursorClientPlatform detects posix from a single system message", () => {
  const messages = [
    { role: "system", content: "platform: linux" },
    { role: "user", content: "hi" },
  ];
  assert.equal(inferCursorClientPlatform(messages), "posix");
});

test("inferCursorClientPlatform detects windows from win32 / windows token", () => {
  for (const text of ["platform: win32", "os: windows"]) {
    const messages = [{ role: "system", content: text }];
    assert.equal(inferCursorClientPlatform(messages), "windows", `for ${text}`);
  }
});

test("inferCursorClientPlatform returns undefined when ambiguous", () => {
  const messages = [{ role: "system", content: "platform: linux\nplatform: windows" }];
  assert.equal(inferCursorClientPlatform(messages), undefined);
});

// ─── Security / credential safety ───────────────────────────────────────

test("bridge outputs do not include the request context's platform tokens verbatim", () => {
  // The bridge should not invent or expose raw credential-shaped tokens in args.
  const result = bridgeCursorBuiltinTool(shellEvent(), defs([bashTool()]));
  assert.ok(result);
  const argsJson = JSON.stringify(result);
  // Sanity: no obvious credential-shaped strings.
  assert.equal(/Bearer\s/i.test(argsJson), false);
  assert.equal(/sk-[A-Za-z0-9]{16,}/.test(argsJson), false);
  assert.equal(/user_[a-f0-9]{16,}/i.test(argsJson), false);
});
