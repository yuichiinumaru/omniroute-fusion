import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getIdempotencyKey,
  scopeIdempotencyKey,
  checkIdempotency,
  saveIdempotency,
  clearIdempotency,
  getIdempotencyStats,
} from "../../src/lib/idempotencyLayer.ts";

describe("Idempotency Layer", () => {
  beforeEach(() => {
    clearIdempotency();
  });

  describe("getIdempotencyKey", () => {
    it("returns null for null headers", () => {
      assert.equal(getIdempotencyKey(null), null);
    });

    it("returns a scoped hash for Idempotency-Key header", () => {
      const headers = new Headers({ "Idempotency-Key": "abc-123" });
      const key = getIdempotencyKey(headers);
      assert.equal(key, scopeIdempotencyKey("abc-123", undefined));
      assert.match(key!, /^[a-f0-9]{64}$/);
    });

    it("does NOT treat X-Request-Id as an idempotency key (F-06-W2-002)", () => {
      const headers = new Headers({ "X-Request-Id": "req-456" });
      assert.equal(getIdempotencyKey(headers), null);
    });

    it("prefers Idempotency-Key and ignores X-Request-Id", () => {
      const headers = new Headers({
        "Idempotency-Key": "idemp-1",
        "X-Request-Id": "req-2",
      });
      assert.equal(getIdempotencyKey(headers), scopeIdempotencyKey("idemp-1", undefined));
    });

    it("supports plain object headers", () => {
      const headers = { "idempotency-key": "obj-key" };
      assert.equal(getIdempotencyKey(headers), scopeIdempotencyKey("obj-key", undefined));
    });

    it("scopes by principal so two API keys never share a cache entry", () => {
      const headers = new Headers({ "Idempotency-Key": "same-raw-key" });
      const keyA = getIdempotencyKey(headers, "api-key-A");
      const keyB = getIdempotencyKey(headers, "api-key-B");
      assert.notEqual(keyA, keyB);
      assert.equal(keyA, scopeIdempotencyKey("same-raw-key", "api-key-A"));
      assert.equal(keyB, scopeIdempotencyKey("same-raw-key", "api-key-B"));
    });
  });

  describe("checkIdempotency / saveIdempotency", () => {
    it("returns null for unknown key", () => {
      assert.equal(checkIdempotency("unknown"), null);
    });

    it("returns null for null key", () => {
      assert.equal(checkIdempotency(null), null);
    });

    it("returns cached response within window", () => {
      const response = { choices: [{ message: { content: "hello" } }] };
      saveIdempotency("key-1", response, 200);
      const result = checkIdempotency("key-1");
      assert.deepEqual(result, { response, status: 200 });
    });

    it("returns null after expiry", async () => {
      const response = { choices: [] };
      saveIdempotency("key-2", response, 200, 50); // 50ms window
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(checkIdempotency("key-2"), null);
    });

    it("does nothing for null key", async () => {
      saveIdempotency(null, { data: 1 }, 200);
      assert.equal((await getIdempotencyStats()).activeKeys, 0);
    });

    it("cross-tenant: same raw key under different principals does not collide", () => {
      const raw = "shared-client-id";
      const keyA = scopeIdempotencyKey(raw, "tenant-a");
      const keyB = scopeIdempotencyKey(raw, "tenant-b");
      saveIdempotency(keyA, { owner: "a" }, 200);
      assert.equal(checkIdempotency(keyB), null);
      assert.deepEqual(checkIdempotency(keyA), { response: { owner: "a" }, status: 200 });
    });
  });

  describe("getIdempotencyStats", () => {
    it("reports active keys", async () => {
      saveIdempotency("a", {}, 200);
      saveIdempotency("b", {}, 200);
      const stats = await getIdempotencyStats();
      assert.equal(stats.activeKeys, 2);
      assert.equal(stats.windowMs, 5000);
    });
  });
});
