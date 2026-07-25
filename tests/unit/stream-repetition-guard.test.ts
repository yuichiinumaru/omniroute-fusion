import test from "node:test";
import assert from "node:assert/strict";

import { createRepetitionGuard } from "../../open-sse/services/streamRepetitionGuard.ts";

test("streamRepetitionGuard returns repetition_detected when 3 identical chunks (>=50 chars) arrive consecutively", () => {
  const guard = createRepetitionGuard();
  const repeatedChunk = "This is a long content block that repeats repeatedly in a model output loop for Dahl kimi-k2.6 case.";
  assert.strictEqual(repeatedChunk.length >= 50, true);

  assert.strictEqual(guard.check(repeatedChunk), "ok");
  assert.strictEqual(guard.check(repeatedChunk), "ok");
  assert.strictEqual(guard.check(repeatedChunk), "repetition_detected");
});

test("streamRepetitionGuard returns ok when chunks are different", () => {
  const guard = createRepetitionGuard();
  const chunk1 = "This is the first content block that is sufficiently long for checking repetitions.";
  const chunk2 = "This is the second content block that has completely different text content overall.";
  const chunk3 = "This is the third content block that is also different from the previous two blocks.";

  assert.strictEqual(guard.check(chunk1), "ok");
  assert.strictEqual(guard.check(chunk2), "ok");
  assert.strictEqual(guard.check(chunk3), "ok");
});

test("streamRepetitionGuard returns ok when chunks are short or whitespace-only", () => {
  const guard = createRepetitionGuard();
  const shortChunk1 = " ";
  const shortChunk2 = "\n\n";
  const shortChunk3 = "hello";

  assert.strictEqual(guard.check(shortChunk1), "ok");
  assert.strictEqual(guard.check(shortChunk2), "ok");
  assert.strictEqual(guard.check(shortChunk3), "ok");

  // Interspersed short chunks should not break tracking of valid 50+ char chunks
  const validChunk = "This is a long content block that repeats repeatedly in a model output loop for Dahl kimi-k2.6 case.";
  assert.strictEqual(guard.check(validChunk), "ok");
  assert.strictEqual(guard.check(shortChunk1), "ok"); // Ignored
  assert.strictEqual(guard.check(validChunk), "ok");
  assert.strictEqual(guard.check(shortChunk2), "ok"); // Ignored
  assert.strictEqual(guard.check(validChunk), "repetition_detected"); // 3rd valid identical chunk!
});

test("streamRepetitionGuard returns ok for tool-call argument streams (incremental growth)", () => {
  const guard = createRepetitionGuard();
  const argChunk1 = '{"name": "get_weather", "arguments": {"location": "San Francisco", ';
  const argChunk2 = '{"name": "get_weather", "arguments": {"location": "San Francisco", "units": "celsius"}}';
  const argChunk3 = '{"name": "get_weather", "arguments": {"location": "San Francisco", "units": "celsius", "days": 5}}';

  assert.strictEqual(argChunk1.length >= 50, true);
  assert.strictEqual(argChunk2.length >= 50, true);
  assert.strictEqual(argChunk3.length >= 50, true);

  assert.strictEqual(guard.check(argChunk1), "ok");
  assert.strictEqual(guard.check(argChunk2), "ok");
  assert.strictEqual(guard.check(argChunk3), "ok");
});

test("streamRepetitionGuard reset() clears state", () => {
  const guard = createRepetitionGuard();
  const chunk = "This is a long content block that repeats repeatedly in a model output loop for Dahl kimi-k2.6 case.";

  assert.strictEqual(guard.check(chunk), "ok");
  assert.strictEqual(guard.check(chunk), "ok");

  guard.reset();

  // State cleared, so next check is count 1
  assert.strictEqual(guard.check(chunk), "ok");
  assert.strictEqual(guard.check(chunk), "ok");
  assert.strictEqual(guard.check(chunk), "repetition_detected");
});

test("streamRepetitionGuard respects custom minChunkLength and historySize", () => {
  const guard = createRepetitionGuard({ minChunkLength: 10, historySize: 2 });
  const shortChunk = "123456789012345"; // 15 chars

  assert.strictEqual(guard.check(shortChunk), "ok");
  assert.strictEqual(guard.check(shortChunk), "repetition_detected");
});
