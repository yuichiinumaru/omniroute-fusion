/**
 * Task 0047 / F-08-001 / F-08-010 — default api client must not throw
 * `Error: [object Object]` for structured `{ error: { message } }` bodies.
 */
import test from "node:test";
import assert from "node:assert/strict";

const { getErrorMessage, parseResponseBody } = await import("../../src/shared/utils/api.ts");
const { extractApiErrorMessage } = await import("../../src/shared/http/apiErrorMessage.ts");

// Re-implement handleResponse wiring contract without importing the private
// function: default export consumers rely on getErrorMessage + parseResponseBody.
async function handleResponseLike(response: Response) {
  const data = await parseResponseBody(response);
  if (!response.ok) {
    const message = getErrorMessage(data, response.status, "An error occurred");
    const error = new Error(message) as Error & { status?: number; data?: unknown };
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function jsonRes(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("extractApiErrorMessage: object { error: { message } } → message", () => {
  assert.equal(
    extractApiErrorMessage({ error: { message: "x", code: "E" } }, "fallback"),
    "x"
  );
});

test("extractApiErrorMessage: string error passthrough", () => {
  assert.equal(extractApiErrorMessage({ error: "plain" }, "fallback"), "plain");
});

test("extractApiErrorMessage: never yields [object Object]", () => {
  const msg = extractApiErrorMessage({ error: { code: "NO_MSG" } }, "safe-fallback");
  assert.equal(msg, "safe-fallback");
  assert.ok(!msg.includes("[object Object]"));
  assert.ok(!String(new Error(msg)).includes("[object Object]"));
});

test("getErrorMessage: nested message and string forms", () => {
  assert.equal(getErrorMessage({ error: { message: "nested" } }), "nested");
  assert.equal(getErrorMessage({ error: "stringy" }), "stringy");
  assert.equal(getErrorMessage(null, 502, "boom"), "boom (HTTP 502)");
});

test("handleResponse-like throws human message for structured envelope", async () => {
  await assert.rejects(
    () =>
      handleResponseLike(
        jsonRes({ error: { code: "INVALID_ORIGIN", message: "Invalid request origin" } }, 403)
      ),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Invalid request origin");
      assert.ok(!err.message.includes("[object Object]"));
      return true;
    }
  );
});

test("handleResponse-like succeeds on ok JSON", async () => {
  const data = await handleResponseLike(jsonRes({ ok: true }, 200));
  assert.deepEqual(data, { ok: true });
});

test("handleResponse-like handles plain-text 500 without JSON parse throw", async () => {
  const res = new Response("Internal Server Error", { status: 500 });
  await assert.rejects(
    () => handleResponseLike(res),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /Internal Server Error|HTTP 500|An error occurred/);
      assert.ok(!err.message.includes("[object Object]"));
      return true;
    }
  );
});
