/**
 * Unit tests for validateLMArenaProvider (updated contract)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateLMArenaProvider } from "../../src/lib/providers/validation/webProvidersA.ts";

describe("validateLMArenaProvider", () => {
  it("rejects empty cookie", async () => {
    const res = await validateLMArenaProvider({ apiKey: "" });
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes("Missing LMArena session cookie"));
  });

  it("probes new endpoint create-evaluation with new body shape", async () => {
    const originalFetch = global.fetch;
    let probedUrl = "";
    let probedBody: Record<string, unknown> | null = null;

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      probedUrl = typeof input === "string" ? input : input.toString();
      probedBody = typeof init?.body === "string" ? JSON.parse(init.body) : null;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    try {
      const res = await validateLMArenaProvider({ apiKey: "arena-auth-prod-v1=test" });
      assert.equal(res.valid, true);
      assert.equal(probedUrl, "https://arena.ai/nextjs-api/stream/create-evaluation");
      assert.equal(probedBody?.mode, "direct-battle");
      assert.equal(probedBody?.modality, "chat");
      assert.ok(probedBody?.id);
      assert.ok(probedBody?.userMessageId);
      assert.ok(probedBody?.modelAMessageId);
      assert.ok((probedBody?.userMessage as Record<string, unknown> | undefined)?.content);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
