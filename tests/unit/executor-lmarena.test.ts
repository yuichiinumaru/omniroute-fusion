/**
 * Unit tests for LMArenaExecutor (new API contract & tlsFetch override)
 * Test file intentionally uses loose `any` casts to exercise internal APIs.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LMArenaExecutor } from "../../open-sse/executors/lmarena.ts";
import { __setTlsFetchOverrideForTesting } from "../../open-sse/services/lmarenaTlsClient.ts";

describe("executor-lmarena.ts", () => {
  it("builds new request shape (id, mode, modelAId, userMessageId, modelAMessageId, userMessage, modality)", () => {
    const executor = new LMArenaExecutor();
    const req = (executor as any).transformRequest("gemini-3.1-pro", {
      messages: [{ role: "user", content: "Hello Arena" }],
    }) as any;

    assert.equal(req.mode, "direct-battle");
    assert.equal(req.modelAId, "gemini-3.1-pro");
    assert.equal(req.modality, "chat");
    assert.equal(req.userMessage.content, "Hello Arena");
    assert.ok(req.id);
    assert.ok(req.userMessageId);
    assert.ok(req.modelAMessageId);
  });

  it("dispatches request via TLS fetch mock when cookie is present", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    __setTlsFetchOverrideForTesting(async (url, opts) => {
      capturedUrl = url;
      capturedBody = JSON.parse(opts.body || "{}");
      return {
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        text: '0:{"text":"Hello from Arena"}\nd:{}\n',
        body: null,
      };
    });

    try {
      const executor = new LMArenaExecutor();
      const res = await executor.execute({
        model: "claude-sonnet-5",
        body: { messages: [{ role: "user", content: "Hi" }], stream: false },
        stream: false,
        credentials: { cookie: "arena-auth-prod-v1=test_cookie" } as any,
        signal: new AbortController().signal,
        log: console as any,
      });

      assert.equal(res.response.status, 200);
      assert.equal(capturedUrl, "https://arena.ai/nextjs-api/stream/create-evaluation");
      assert.equal(capturedBody.mode, "direct-battle");
      const json = await res.response.json();
      assert.equal(json.choices[0].message.content, "Hello from Arena");
    } finally {
      __setTlsFetchOverrideForTesting(null);
    }
  });

  it("returns 401 when cookie is missing", async () => {
    const executor = new LMArenaExecutor();
    const res = await executor.execute({
      model: "gpt-4",
      body: { messages: [{ role: "user", content: "Hi" }] },
      stream: false,
      credentials: {},
      signal: new AbortController().signal,
      log: console as any,
    });

    assert.equal(res.response.status, 401);
    const json = await res.response.json();
    assert.equal(json.error.code, "missing_cookie");
  });
});
