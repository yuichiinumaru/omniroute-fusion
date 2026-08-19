import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureFreebuffSession,
  releaseFreebuffSession,
  getFreebuffSession,
  setFreebuffSession,
  clearAllFreebuffSessions,
  getSessionKey,
  ProviderError,
  type FreebuffSession,
} from "../../open-sse/services/freebuffSession.ts";

test.beforeEach(() => {
  clearAllFreebuffSessions();
});

test("getSessionKey derives unique key from credentials", () => {
  assert.equal(getSessionKey({ connectionId: "conn-123" }), "conn-123");
  assert.equal(getSessionKey({ accessToken: "token-abc" }), "token-abc");
  assert.equal(getSessionKey({ apiKey: "key-xyz" }), "key-xyz");
  assert.equal(getSessionKey(undefined), "default");
});

test("ensureFreebuffSession admits new 1-hour session via POST /api/v1/freebuff/session", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let calledUrl = "";
  let calledMethod = "";
  let calledHeaders: Record<string, string> = {};
  let calledBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calledUrl = url.toString();
    calledMethod = init?.method || "GET";
    calledHeaders = (init?.headers || {}) as Record<string, string>;
    calledBody = init?.body ? JSON.parse(init.body as string) : null;

    return new Response(
      JSON.stringify({
        instanceId: "fb-inst-001",
        expiresAt: Date.now() + 3600_000,
        quota: { remaining: 100, limit: 100 },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "test-auth-token", connectionId: "conn-1" };
  const instanceId = await ensureFreebuffSession(credentials, "deepseek-v4-pro");

  assert.equal(instanceId, "fb-inst-001");
  assert.equal(calledUrl, "https://codebuff.com/api/v1/freebuff/session");
  assert.equal(calledMethod, "POST");
  assert.equal(calledHeaders["Authorization"], "Bearer test-auth-token");
  assert.equal(calledHeaders["x-freebuff-model"], "deepseek-v4-pro");
  assert.equal(calledHeaders["User-Agent"], "ai-sdk/openai-compatible/0.1.0/codebuff");
  assert.deepEqual(calledBody, { model: "deepseek-v4-pro" });

  const cached = getFreebuffSession(credentials);
  assert.ok(cached);
  assert.equal(cached.instanceId, "fb-inst-001");
  assert.equal(cached.model, "deepseek-v4-pro");
  assert.ok(cached.expiresAt > Date.now());
});

test("ensureFreebuffSession reuses active session for the same model", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(
      JSON.stringify({
        instanceId: "fb-inst-reuse",
        expiresAt: Date.now() + 3600_000,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "test-token" };
  const id1 = await ensureFreebuffSession(credentials, "gpt-5.6-luna");
  assert.equal(id1, "fb-inst-reuse");
  assert.equal(fetchCallCount, 1);

  // Second call for same model should reuse cached session without new fetch
  const id2 = await ensureFreebuffSession(credentials, "gpt-5.6-luna");
  assert.equal(id2, "fb-inst-reuse");
  assert.equal(fetchCallCount, 1);
});

test("ensureFreebuffSession admits new session when requested model changes", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let fetchCallCount = 0;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    fetchCallCount++;
    const body = init?.body ? JSON.parse(init.body as string) : {};
    return new Response(
      JSON.stringify({
        instanceId: `inst-for-${body.model}`,
        expiresAt: Date.now() + 3600_000,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "test-token" };
  const id1 = await ensureFreebuffSession(credentials, "deepseek-v4-pro");
  assert.equal(id1, "inst-for-deepseek-v4-pro");
  assert.equal(fetchCallCount, 1);

  // Requesting minimax-m3 should trigger new session admission
  const id2 = await ensureFreebuffSession(credentials, "minimax-m3");
  assert.equal(id2, "inst-for-minimax-m3");
  assert.equal(fetchCallCount, 2);

  const cached = getFreebuffSession(credentials);
  assert.equal(cached?.model, "minimax-m3");
});

test("ensureFreebuffSession renews expired session automatically", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    return new Response(
      JSON.stringify({
        instanceId: `inst-renewed-${fetchCallCount}`,
        expiresAt: Date.now() + 3600_000,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "test-token" };
  // Pre-seed an expired session
  setFreebuffSession(credentials, {
    instanceId: "inst-old",
    model: "glm-5.2",
    expiresAt: Date.now() - 5000, // expired
    acquiredAt: Date.now() - 3605_000,
  });

  const id = await ensureFreebuffSession(credentials, "glm-5.2");
  assert.equal(id, "inst-renewed-1");
  assert.equal(fetchCallCount, 1);
});

test("ensureFreebuffSession handles 409 model_locked by releasing and retrying", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const calls: Array<{ method: string; url: string }> = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = url.toString();
    const method = init?.method || "GET";
    calls.push({ method, url: u });

    if (method === "POST" && calls.filter((c) => c.method === "POST").length === 1) {
      // First POST returns 409 conflict
      return new Response(
        JSON.stringify({ error: "model_locked", message: "Existing model session is locked" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    if (method === "DELETE") {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    if (method === "POST" && calls.filter((c) => c.method === "POST").length === 2) {
      // Second POST succeeds
      return new Response(
        JSON.stringify({ instanceId: "inst-after-release", expiresAt: Date.now() + 3600_000 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const credentials = { accessToken: "test-token" };
  const id = await ensureFreebuffSession(credentials, "mimo-v2.5");
  assert.equal(id, "inst-after-release");

  assert.equal(calls.length, 3);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[1].method, "DELETE");
  assert.equal(calls[2].method, "POST");
});

test("releaseFreebuffSession sends DELETE and clears cache", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let deleteCalled = false;
  let deleteHeaders: Record<string, string> = {};

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "DELETE") {
      deleteCalled = true;
      deleteHeaders = (init?.headers || {}) as Record<string, string>;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const credentials = { accessToken: "token-to-delete", connectionId: "conn-del" };
  setFreebuffSession(credentials, {
    instanceId: "inst-to-del",
    model: "deepseek-v4-flash",
    expiresAt: Date.now() + 100000,
    acquiredAt: Date.now(),
  });

  const released = await releaseFreebuffSession(credentials);
  assert.equal(released, true);
  assert.equal(deleteCalled, true);
  assert.equal(deleteHeaders["Authorization"], "Bearer token-to-delete");
  assert.equal(deleteHeaders["x-freebuff-instance-id"], "inst-to-del");
  assert.equal(deleteHeaders["x-freebuff-model"], "deepseek-v4-flash");

  assert.equal(getFreebuffSession(credentials), undefined);
});

test("ensureFreebuffSession throws on fatal HTTP error", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ error: "unauthorized", message: "Invalid credentials" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "bad-token" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "deepseek-v4-pro");
    },
    /Freebuff session admission failed \(401\)/
  );
});

// ── Concurrent Admission Coalescing & Error Boundaries ────────────────────────

test("ensureFreebuffSession coalesces concurrent admission requests into a single POST", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let postCount = 0;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "POST") {
      postCount++;
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 30));
      return new Response(
        JSON.stringify({
          instanceId: "inst-coalesced-100",
          expiresAt: Date.now() + 3600_000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const credentials = { accessToken: "tok-concurrent", connectionId: "conn-conc" };

  // Dispatch 5 concurrent admission requests simultaneously
  const results = await Promise.all([
    ensureFreebuffSession(credentials, "deepseek-v4-pro"),
    ensureFreebuffSession(credentials, "deepseek-v4-pro"),
    ensureFreebuffSession(credentials, "deepseek-v4-pro"),
    ensureFreebuffSession(credentials, "deepseek-v4-pro"),
    ensureFreebuffSession(credentials, "deepseek-v4-pro"),
  ]);

  assert.equal(postCount, 1, "Must issue only 1 POST for concurrent burst of same account/model");
  assert.deepEqual(results, [
    "inst-coalesced-100",
    "inst-coalesced-100",
    "inst-coalesced-100",
    "inst-coalesced-100",
    "inst-coalesced-100",
  ]);
});

test("ensureFreebuffSession handles distinct accounts independently during concurrent requests", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let postCount = 0;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "POST") {
      postCount++;
      const auth = (init?.headers as Record<string, string>)["Authorization"];
      const token = auth.replace("Bearer ", "");
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(
        JSON.stringify({
          instanceId: `inst-${token}`,
          expiresAt: Date.now() + 3600_000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const cred1 = { accessToken: "acc-1", connectionId: "c1" };
  const cred2 = { accessToken: "acc-2", connectionId: "c2" };

  const [id1, id2] = await Promise.all([
    ensureFreebuffSession(cred1, "deepseek-v4-pro"),
    ensureFreebuffSession(cred2, "deepseek-v4-pro"),
  ]);

  assert.equal(postCount, 2, "Must issue separate POSTs for distinct accounts");
  assert.equal(id1, "inst-acc-1");
  assert.equal(id2, "inst-acc-2");
});

test("ensureFreebuffSession cleans up in-flight session promise on rejection", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let attempts = 0;
  globalThis.fetch = (async () => {
    attempts++;
    if (attempts === 1) {
      return new Response(
        JSON.stringify({ error: "temporary_failure", message: "Server busy" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ instanceId: "inst-after-retry", expiresAt: Date.now() + 3600_000 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-fail-then-pass" };

  // First attempt fails
  await assert.rejects(async () => {
    await ensureFreebuffSession(credentials, "minimax-m3");
  });

  // Second attempt should not be stuck on previous rejected in-flight promise
  const successId = await ensureFreebuffSession(credentials, "minimax-m3");
  assert.equal(successId, "inst-after-retry");
  assert.equal(attempts, 2);
});

test("ensureFreebuffSession throws structured error on 428 waiting room", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ error: "waiting_room_required", message: "Queue wait needed" }),
      { status: 428, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-428-err" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "gpt-5.6-luna");
    },
    (err: Error & { status?: number; code?: string }) => {
      assert.equal(err.status, 428);
      assert.equal(err.code, "waiting_room_required");
      return true;
    }
  );
});

test("ensureFreebuffSession throws structured ProviderError on 429 rate limit during admission", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ error: "rate_limited", message: "Too many admissions", retry_after: 20 }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "20",
        },
      }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-429-err" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "deepseek-v4-flash");
    },
    (err: Error & { status?: number; code?: string; reason?: string; retryAfter?: number; retryAfterMs?: number; provider?: string }) => {
      assert.ok(err instanceof ProviderError, "err must be an instance of ProviderError");
      assert.ok(err instanceof Error, "err must be an instance of Error");
      assert.equal(err.status, 429);
      assert.equal(err.code, "rate_limit_exceeded");
      assert.equal(err.reason, "rate_limited");
      assert.equal(err.retryAfter, 20);
      assert.equal(err.retryAfterMs, 20000);
      assert.equal(err.provider, "freebuff");
      assert.ok(err.message.includes("429"));
      return true;
    }
  );
});

test("ensureFreebuffSession throws structured ProviderError on 429 ip_capped during admission", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ error: "ip_capped", message: "IP quota exceeded" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "45",
        },
      }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-429-ip" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "deepseek-v4-pro");
    },
    (err: ProviderError) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.status, 429);
      assert.equal(err.code, "rate_limit_exceeded");
      assert.equal(err.reason, "ip_capped");
      assert.equal(err.retryAfter, 45);
      assert.equal(err.retryAfterMs, 45000);
      assert.equal(err.provider, "freebuff");
      return true;
    }
  );
});

test("ensureFreebuffSession throws structured ProviderError on 429 free_mode_capacity_deferred during admission", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ error: "free_mode_capacity_deferred", message: "Free capacity busy" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-429-cap" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "gpt-5.6-luna");
    },
    (err: ProviderError) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.status, 429);
      assert.equal(err.code, "rate_limit_exceeded");
      assert.equal(err.reason, "free_mode_capacity_deferred");
      assert.equal(err.retryAfter, 5);
      assert.equal(err.retryAfterMs, 5000);
      assert.equal(err.provider, "freebuff");
      return true;
    }
  );
});

test("ensureFreebuffSession throws structured error on 410 session expired during admission", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ error: "session_expired", message: "Session token invalid" }),
      { status: 410, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-410-err" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "glm-5.2");
    },
    (err: Error & { status?: number; code?: string }) => {
      assert.equal(err.status, 410);
      assert.equal(err.code, "session_expired");
      return true;
    }
  );
});

test("ensureFreebuffSession sanitizes upstream stack traces, secret file paths, and AKIA tokens", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      "Crash at /home/ubuntu/codebuff/backend/index.ts:55:10 with AKIA_SECRET_TOKEN and akia_secret_12345678",
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-sanitize" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "deepseek-v4-pro");
    },
    (err: Error) => {
      assert.ok(!err.message.includes("/home/ubuntu/codebuff"), "Path must be stripped");
      assert.ok(!err.message.includes("AKIA_SECRET_TOKEN"), "AKIA_SECRET_TOKEN must be redacted");
      assert.ok(!err.message.includes("akia_secret_12345678"), "akia_secret_12345678 must be redacted");
      assert.ok(err.message.includes("Freebuff session admission failed (500)"));
      return true;
    }
  );
});

test("ensureFreebuffSession redacts Bearer and JWT tokens in error messages", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  globalThis.fetch = (async () => {
    return new Response(
      `Auth failed with Bearer ${jwt} and auth_user_secret_token_12345 and cf_token_live_abc987`,
      { status: 401, headers: { "Content-Type": "text/plain" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-jwt" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "deepseek-v4-pro");
    },
    (err: Error) => {
      assert.ok(!err.message.includes(jwt), "JWT token must be redacted");
      assert.ok(!err.message.includes("eyJhbGciOi"), "JWT header must not leak");
      assert.ok(!err.message.includes("auth_user_secret_token_12345"), "auth_ token must be redacted");
      assert.ok(!err.message.includes("cf_token_live_abc987"), "cf_ token must be redacted");
      assert.ok(err.message.includes("<token>"), "Token placeholder must be present");
      return true;
    }
  );
});

test("ensureFreebuffSession fails closed on malformed JSON response", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response("Not JSON at all", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }) as typeof fetch;

  const credentials = { accessToken: "tok-malformed" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "deepseek-v4-pro");
    },
    /Freebuff session admission malformed JSON/
  );
});

test("ensureFreebuffSession fails closed when instanceId is missing from response", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ status: "ok", message: "no instance id returned" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-no-inst" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "deepseek-v4-pro");
    },
    /Invalid session admission response format/
  );
});

test("ensureFreebuffSession fails closed when response schema is invalid array", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify([{ invalid: "array" }]),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-invalid-schema" };
  await assert.rejects(
    async () => {
      await ensureFreebuffSession(credentials, "deepseek-v4-pro");
    },
    /Invalid session admission response format/
  );
});

test("ensureFreebuffSession normalizes id and session_id aliases from upstream admission responses", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // 1. Upstream returns { id: "inst-from-id" }
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        id: "inst-from-id",
        expiresAt: Date.now() + 3600_000,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const creds1 = { accessToken: "tok-alias-id" };
  const id1 = await ensureFreebuffSession(creds1, "deepseek-v4-pro");
  assert.equal(id1, "inst-from-id");
  assert.equal(getFreebuffSession(creds1)?.instanceId, "inst-from-id");

  // 2. Upstream returns { session_id: "inst-from-session-id" }
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        session_id: "inst-from-session-id",
        expiresAt: Date.now() + 3600_000,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const creds2 = { accessToken: "tok-alias-session-id" };
  const id2 = await ensureFreebuffSession(creds2, "gpt-5.6-luna");
  assert.equal(id2, "inst-from-session-id");
  assert.equal(getFreebuffSession(creds2)?.instanceId, "inst-from-session-id");
});

test("ensureFreebuffSession accepts extra keys in 200 admission response via passthrough schema", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        instanceId: "inst-passthrough-ok",
        expiresAt: Date.now() + 3600_000,
        unknownField: "extra_property",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const credentials = { accessToken: "tok-passthrough-ok" };
  const instanceId = await ensureFreebuffSession(credentials, "deepseek-v4-pro");
  assert.equal(instanceId, "inst-passthrough-ok");
});

test("ensureFreebuffSession applies provider error rule cooldowns on 429 admission without Retry-After header", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // 1. ip_capped without retry-after header -> applies 30s rule cooldown
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ error: "ip_capped", message: "IP quota exhausted" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  await assert.rejects(
    async () => {
      await ensureFreebuffSession({ accessToken: "tok-rule-ip" }, "deepseek-v4-pro");
    },
    (err: ProviderError) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.status, 429);
      assert.equal(err.reason, "ip_capped");
      assert.equal(err.retryAfter, 30);
      assert.equal(err.retryAfterMs, 30000);
      return true;
    }
  );

  // 2. rate_limited without retry-after header -> applies 15s rule cooldown
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ error: "rate_limited", message: "Account rate limit" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  await assert.rejects(
    async () => {
      await ensureFreebuffSession({ accessToken: "tok-rule-rate" }, "deepseek-v4-pro");
    },
    (err: ProviderError) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.status, 429);
      assert.equal(err.reason, "rate_limited");
      assert.equal(err.retryAfter, 15);
      assert.equal(err.retryAfterMs, 15000);
      return true;
    }
  );

  // 3. free_mode_capacity_deferred without retry-after header -> applies 5s rule cooldown
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ error: "free_mode_capacity_deferred", message: "Capacity busy" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  await assert.rejects(
    async () => {
      await ensureFreebuffSession({ accessToken: "tok-rule-cap" }, "deepseek-v4-pro");
    },
    (err: ProviderError) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.status, 429);
      assert.equal(err.reason, "free_mode_capacity_deferred");
      assert.equal(err.retryAfter, 5);
      assert.equal(err.retryAfterMs, 5000);
      return true;
    }
  );
});
