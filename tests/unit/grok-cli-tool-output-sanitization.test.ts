import test from "node:test";
import assert from "node:assert/strict";

const { GrokCliExecutor } = await import("@omniroute/open-sse/executors/grok-cli");

test("grok-cli tool output sanitization - valid JSON string remains valid", () => {
  const executor = new GrokCliExecutor();
  const body = {
    input: [
      {
        type: "function_call_output",
        call_id: "call_123",
        output: '{"status":"ok","result":42}',
      },
    ],
  };

  const out = executor.transformRequest("grok-4.5", body, false, {} as never) as Record<
    string,
    unknown
  >;

  const input = out.input as Array<Record<string, unknown>>;
  assert.equal(input[0].output, '{"status":"ok","result":42}');
});

test("grok-cli tool output sanitization - repairs incomplete unicode escapes and lone surrogates", () => {
  const executor = new GrokCliExecutor();

  // Test incomplete unicode escape \u12
  const bodyUnicode = {
    input: [
      {
        type: "function_call_output",
        call_id: "call_1",
        output: "error near \\u12 line 5",
      },
    ],
  };
  const outUnicode = executor.transformRequest(
    "grok-4.5",
    bodyUnicode,
    false,
    {} as never
  ) as Record<string, unknown>;
  const inputUnicode = outUnicode.input as Array<Record<string, unknown>>;
  assert.equal(inputUnicode[0].output, "error near  line 5");

  // Test lone surrogate
  const bodySurrogate = {
    input: [
      {
        type: "function_call_output",
        call_id: "call_2",
        output: "broken \uD800 char",
      },
    ],
  };
  const outSurrogate = executor.transformRequest(
    "grok-4.5",
    bodySurrogate,
    false,
    {} as never
  ) as Record<string, unknown>;
  const inputSurrogate = outSurrogate.input as Array<Record<string, unknown>>;
  assert.equal(inputSurrogate[0].output, "broken \uFFFD char");
});

test("grok-cli tool output sanitization - handles arrays, objects, and null outputs", () => {
  const executor = new GrokCliExecutor();

  const bodyArray = {
    input: [
      {
        type: "function_call_output",
        call_id: "call_arr",
        output: [{ text: "line 1" }, "line 2", 123],
      },
      {
        type: "function_call_output",
        call_id: "call_obj",
        output: { key: "value" },
      },
      {
        type: "function_call_output",
        call_id: "call_null",
        output: null,
      },
    ],
  };

  const out = executor.transformRequest("grok-4.5", bodyArray, false, {} as never) as Record<
    string,
    unknown
  >;
  const input = out.input as Array<Record<string, unknown>>;

  assert.equal(typeof input[0].output, "string");
  assert.ok((input[0].output as string).includes("line 1"));
  assert.equal(input[1].output, '{"key":"value"}');
  assert.equal(input[2].output, "");
});

// ---------------------------------------------------------------------------
// Negative / sabotage coverage.
//
// The sanitizer's whole job is to guarantee that whatever a (possibly hostile
// or buggy) agent client puts in `function_call_output.output`, the value put
// on the wire is a JSON-encodable string. These cases lock that contract down.
// ---------------------------------------------------------------------------

/** Run one output value through the executor and return the sanitized result. */
function sanitizeOutput(output: unknown): unknown {
  const executor = new GrokCliExecutor();
  const body = {
    input: [{ type: "function_call_output", call_id: "call_probe", output }],
  };
  const out = executor.transformRequest("grok-4.5", body, false, {} as never) as Record<
    string,
    unknown
  >;
  return (out.input as Array<Record<string, unknown>>)[0].output;
}

/** Deeply nested array: [[[[…'leaf'…]]]] with `depth` levels of nesting. */
function makeDeeplyNestedArray(depth: number): unknown[] {
  const root: unknown[] = [];
  let cursor = root;
  for (let i = 0; i < depth; i++) {
    const next: unknown[] = [];
    cursor.push(next);
    cursor = next;
  }
  cursor.push("leaf");
  return root;
}

test("grok-cli tool output sanitization - invalid JSON is preserved as plain text", () => {
  // Must not be dropped or turned into undefined: the tool result text still
  // carries information the model needs, it just is not valid JSON.
  assert.equal(
    sanitizeOutput("{not valid json, missing closing brace"),
    "{not valid json, missing closing brace"
  );
  assert.equal(
    sanitizeOutput("Error: command failed with exit code 1"),
    "Error: command failed with exit code 1"
  );
});

test("grok-cli tool output sanitization - preserves valid surrogate pairs (emoji)", () => {
  // Regression: a blanket /[\uD800-\uDFFF]/g replacement corrupts well-formed
  // surrogate PAIRS into two U+FFFD chars, silently mangling legitimate output.
  // Only UNPAIRED surrogates are invalid and may be replaced.
  const rocket = String.fromCharCode(0xd83d, 0xde80); // U+1F680 as a surrogate pair
  const loneHigh = String.fromCharCode(0xd800);
  const loneLow = String.fromCharCode(0xdc00);

  assert.equal(sanitizeOutput(`deploy ${rocket} done`), `deploy ${rocket} done`);
  assert.equal(sanitizeOutput(`bad ${loneHigh} char`), "bad \uFFFD char");
  assert.equal(sanitizeOutput(`bad ${loneLow} char`), "bad \uFFFD char");
  // Mixed: lone surrogates replaced, the valid pair between them survives.
  assert.equal(sanitizeOutput(`${loneHigh}${rocket}${loneLow}`), `\uFFFD${rocket}\uFFFD`);
});

test("grok-cli tool output sanitization - never emits a non-string output", () => {
  // JSON.stringify RETURNS undefined (it does not throw) for functions, symbols
  // and undefined. If that leaked through, the item would ship upstream with a
  // missing `output` field — exactly the malformed body this repair prevents.
  const hostileValues: unknown[] = [
    undefined,
    null,
    42,
    true,
    10n,
    () => "fn",
    Symbol("sym"),
    { nested: { deep: true } },
    [{ text: "a" }, "b", 1],
    "",
  ];

  for (const value of hostileValues) {
    const sanitized = sanitizeOutput(value);
    assert.equal(
      typeof sanitized,
      "string",
      `output for ${String(typeof value)} must be a string, got ${typeof sanitized}`
    );
  }
});

test("grok-cli tool output sanitization - survives circular and unserializable structures", () => {
  const circularObject: Record<string, unknown> = { a: 1 };
  circularObject.self = circularObject;

  const circularArray: unknown[] = [];
  circularArray.push(circularArray);

  const throwingToJson = {
    toJSON() {
      throw new Error("toJSON exploded");
    },
  };

  for (const value of [circularObject, circularArray, throwingToJson]) {
    const sanitized = sanitizeOutput(value);
    assert.equal(typeof sanitized, "string", "circular/unserializable input must yield a string");
  }
});

test("grok-cli tool output sanitization - bounded against deeply nested arrays", () => {
  // Unbounded recursion here previously threw RangeError (stack overflow) out of
  // transformRequest, killing the request instead of degrading gracefully.
  for (const depth of [3_000, 50_000]) {
    const sanitized = sanitizeOutput(makeDeeplyNestedArray(depth));
    assert.equal(typeof sanitized, "string", `depth ${depth} must not overflow the stack`);
  }
});

test("grok-cli tool output sanitization - every sanitized output is JSON-encodable", () => {
  // The end-to-end invariant: the whole transformed body must serialize, since
  // BaseExecutor JSON.stringify()s it before dispatch.
  const rocket = String.fromCharCode(0xd83d, 0xde80);
  const executor = new GrokCliExecutor();
  const body = {
    input: [
      {
        type: "function_call_output",
        call_id: "c1",
        output: `lone ${String.fromCharCode(0xd800)}`,
      },
      { type: "function_call_output", call_id: "c2", output: "trailing \\u12" },
      { type: "function_call_output", call_id: "c3", output: `emoji ${rocket}` },
      { type: "function_call_output", call_id: "c4", output: undefined },
      { type: "function_call_output", call_id: "c5", output: makeDeeplyNestedArray(50_000) },
    ],
  };

  const out = executor.transformRequest("grok-4.5", body, false, {} as never);
  const serialized = JSON.stringify(out);
  assert.equal(typeof serialized, "string");

  const roundTripped = JSON.parse(serialized) as Record<string, unknown>;
  for (const item of roundTripped.input as Array<Record<string, unknown>>) {
    assert.equal(
      typeof item.output,
      "string",
      `${String(item.call_id)} must carry a string output`
    );
  }
});

test("grok-cli tool output sanitization - leaves non-function_call_output items untouched", () => {
  const executor = new GrokCliExecutor();
  const message = { type: "message", role: "user", content: "hello" };
  const functionCall = { type: "function_call", call_id: "c1", name: "run", arguments: "{}" };

  const out = executor.transformRequest(
    "grok-4.5",
    { input: [message, functionCall] },
    false,
    {} as never
  ) as Record<string, unknown>;

  const input = out.input as Array<Record<string, unknown>>;
  assert.deepEqual(input[0], message);
  assert.deepEqual(input[1], functionCall);
});
