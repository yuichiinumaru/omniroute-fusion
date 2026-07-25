import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getConversationCacheKey } from "../../open-sse/services/taskAwareRouting.ts";

describe("weak hash replacement verification", () => {
  it("uses SHA-256 (24-hex slice) instead of SHA-1 for conversation cache key", () => {
    const key = getConversationCacheKey({ conversation_id: "thread-abc-123" });
    const expectedSha256 = createHash("sha256")
      .update("explicit:thread-abc-123")
      .digest("hex")
      .slice(0, 24);
    assert.equal(key, expectedSha256);
    assert.equal(key?.length, 24);
  });
});
