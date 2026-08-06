import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCursorModelId } from "../../open-sse/utils/cursorAgentProtobuf.ts";

test("normalizeCursorModelId maps composer-v2.5 variants to canonical model IDs", () => {
  assert.equal(normalizeCursorModelId("composer-v2.5"), "composer-2.5");
  assert.equal(normalizeCursorModelId("composer-v2.5-fast"), "composer-2.5-fast");
  assert.equal(normalizeCursorModelId("composer-v2-latest"), "composer-2.5");
  assert.equal(normalizeCursorModelId("Composer-V2.5"), "composer-2.5");
});

test("normalizeCursorModelId preserves existing composer model aliases", () => {
  assert.equal(normalizeCursorModelId(""), "composer-2.5");
  assert.equal(normalizeCursorModelId("composer-2-5"), "composer-2.5");
  assert.equal(normalizeCursorModelId("composer-2.5-sdk"), "composer-2.5");
  assert.equal(normalizeCursorModelId("composer-latest"), "composer-2.5");
  assert.equal(normalizeCursorModelId("composer-2-5-fast"), "composer-2.5-fast");
  assert.equal(normalizeCursorModelId("composer-2.5-sdk-fast"), "composer-2.5-fast");
  assert.equal(normalizeCursorModelId("composer-latest-fast"), "composer-2.5-fast");
});

test("normalizeCursorModelId passes through unknown IDs unchanged", () => {
  assert.equal(normalizeCursorModelId("gpt-4"), "gpt-4");
  assert.equal(normalizeCursorModelId("claude-sonnet-4"), "claude-sonnet-4");
});
