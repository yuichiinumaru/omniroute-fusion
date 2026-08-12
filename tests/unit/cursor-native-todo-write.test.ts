import test from "node:test";
import assert from "node:assert/strict";
import { decodeNativeTodoWriteCompletion } from "../../open-sse/utils/cursorAgentProtobuf/nativeTodoWrite.ts";

// ─── Wire-format helpers (mirror upstream fixture style) ─────────────────

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
function lp(field: number, payload: Buffer): Buffer {
  return Buffer.concat([tag(field, 2), v(payload.length), payload]);
}
function s(field: number, value: string): Buffer {
  return lp(field, Buffer.from(value, "utf8"));
}
function vi(field: number, value: number): Buffer {
  return Buffer.concat([tag(field, 0), v(value)]);
}
function todo(content: string, status: number): Buffer {
  // TodoItem { content (2), status (3) }
  return lp(1, Buffer.concat([s(2, content), vi(3, status)]));
}

// ─── Successful decode (fail→pass for current fork: decoder doesn't exist) ──

test("decodeNativeTodoWriteCompletion parses a complete completion envelope", () => {
  // ToolCallCompletedUpdate {
  //   tool_call_id (1),
  //   tool_call (2): ToolCall {
  //     todo_write (9): TodoWriteDetails {
  //       args (1): TodoWriteArgs { todos (1 repeated), merge (2) }
  //     }
  //   }
  // }
  const todoArgs = Buffer.concat([todo("Inspect files", 3), todo("Write report", 2), vi(2, 0)]);
  const todoDetails = lp(1, todoArgs);
  const toolCall = lp(9, todoDetails);
  const completed = Buffer.concat([s(1, "toolu_todo_1"), lp(2, toolCall)]);

  assert.deepEqual(decodeNativeTodoWriteCompletion(completed), {
    kind: "native_todo_write",
    toolCallId: "toolu_todo_1",
    merge: false,
    todos: [
      { content: "Inspect files", status: "completed" },
      { content: "Write report", status: "in_progress" },
    ],
  });
});

test("decodeNativeTodoWriteCompletion preserves merge=true", () => {
  const todoArgs = Buffer.concat([todo("Inspect files", 3), vi(2, 1)]);
  const todoDetails = lp(1, todoArgs);
  const toolCall = lp(9, todoDetails);
  const completed = Buffer.concat([s(1, "toolu_todo_merge"), lp(2, toolCall)]);

  assert.deepEqual(decodeNativeTodoWriteCompletion(completed), {
    kind: "native_todo_write",
    toolCallId: "toolu_todo_merge",
    merge: true,
    todos: [{ content: "Inspect files", status: "completed" }],
  });
});

test("decodeNativeTodoWriteCompletion decodes the four valid statuses", () => {
  for (const [code, status] of [
    [1, "pending"],
    [2, "in_progress"],
    [3, "completed"],
    [4, "cancelled"],
  ] as const) {
    const todoArgs = Buffer.concat([todo("Step", code)]);
    const completed = Buffer.concat([s(1, `tc-${code}`), lp(2, lp(9, lp(1, todoArgs)))]);
    const decoded = decodeNativeTodoWriteCompletion(completed);
    assert.ok(decoded, `decodes status code ${code}`);
    assert.equal(decoded!.todos[0].status, status);
  }
});

test("decodeNativeTodoWriteCompletion decodes the empty todos case", () => {
  // No todos items, no merge.
  const completed = Buffer.concat([s(1, "tc-empty"), lp(2, lp(9, lp(1, Buffer.alloc(0))))]);
  assert.deepEqual(decodeNativeTodoWriteCompletion(completed), {
    kind: "native_todo_write",
    toolCallId: "tc-empty",
    merge: false,
    todos: [],
  });
});

// ─── Fail-closed paths ───────────────────────────────────────────────────

test("decodeNativeTodoWriteCompletion rejects unknown status codes", () => {
  const todoArgs = Buffer.concat([todo("Bad", 99)]);
  const completed = Buffer.concat([s(1, "tc-bad"), lp(2, lp(9, lp(1, todoArgs)))]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion rejects missing tool_call_id", () => {
  const completed = Buffer.concat([lp(2, lp(9, lp(1, todo("x", 3))))]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion rejects empty tool_call_id", () => {
  const completed = Buffer.concat([s(1, ""), lp(2, lp(9, lp(1, todo("x", 3))))]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion rejects missing tool_call", () => {
  const completed = Buffer.concat([s(1, "tc")]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion rejects missing todo_write variant", () => {
  // tool_call present but field 9 missing
  const completed = Buffer.concat([s(1, "tc"), lp(2, Buffer.alloc(0))]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion rejects missing args variant", () => {
  const completed = Buffer.concat([s(1, "tc"), lp(2, lp(9, Buffer.alloc(0)))]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion rejects duplicate tool_call_id field", () => {
  // Two tool_call_id entries at the outer level — uniqueness check must fail.
  const dup = Buffer.concat([s(1, "tc-1"), s(1, "tc-2"), lp(2, lp(9, lp(1, todo("x", 3))))]);
  assert.equal(decodeNativeTodoWriteCompletion(dup), null);
});

test("decodeNativeTodoWriteCompletion rejects duplicate merge field", () => {
  const todoArgs = Buffer.concat([todo("x", 3), vi(2, 1), vi(2, 0)]);
  const completed = Buffer.concat([s(1, "tc"), lp(2, lp(9, lp(1, todoArgs)))]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion rejects merge with non-varint wire type", () => {
  // merge (2) provided as a length-delimited field — invalid; should fail closed.
  const todoArgs = Buffer.concat([
    todo("x", 3),
    lp(2, Buffer.from([0x00])), // length-delimited, not varint
  ]);
  const completed = Buffer.concat([s(1, "tc"), lp(2, lp(9, lp(1, todoArgs)))]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion rejects non-UTF-8 tool_call_id bytes", () => {
  const todoArgs = todo("x", 3);
  const bad = Buffer.concat([
    // length-delimited string field 1 containing invalid UTF-8 byte sequence
    lp(1, Buffer.from([0xff, 0xfe, 0xfd])),
    lp(2, lp(9, lp(1, todoArgs))),
  ]);
  assert.equal(decodeNativeTodoWriteCompletion(bad), null);
});

test("decodeNativeTodoWriteCompletion rejects item with missing content", () => {
  // status only, no content
  const item = lp(1, vi(3, 3));
  const completed = Buffer.concat([s(1, "tc"), lp(2, lp(9, lp(1, item)))]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion rejects item with missing status", () => {
  // content only, no status
  const item = lp(1, s(2, "step"));
  const completed = Buffer.concat([s(1, "tc"), lp(2, lp(9, lp(1, item)))]);
  assert.equal(decodeNativeTodoWriteCompletion(completed), null);
});

test("decodeNativeTodoWriteCompletion returns null for empty input", () => {
  assert.equal(decodeNativeTodoWriteCompletion(Buffer.alloc(0)), null);
});
