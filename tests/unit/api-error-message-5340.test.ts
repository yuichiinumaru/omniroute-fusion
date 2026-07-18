import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractApiErrorMessage } from "@/shared/http/apiErrorMessage";

describe("extractApiErrorMessage (#5340)", () => {
  it("surfaces the message from a structured error envelope", () => {
    const body = {
      error: { code: "INVALID_ORIGIN", message: "Invalid request origin", correlation_id: "x" },
    };
    assert.equal(extractApiErrorMessage(body, "fallback"), "Invalid request origin");
  });

  it("returns a plain string error as-is", () => {
    assert.equal(extractApiErrorMessage({ error: "boom" }, "fallback"), "boom");
  });

  it("never renders a raw error object — falls back when message is missing", () => {
    assert.equal(extractApiErrorMessage({ error: { code: "X" } }, "fallback"), "fallback");
  });

  it("falls back for empty, null, or malformed bodies", () => {
    assert.equal(extractApiErrorMessage({ error: "  " }, "fallback"), "fallback");
    assert.equal(extractApiErrorMessage(null, "fallback"), "fallback");
    assert.equal(extractApiErrorMessage({}, "fallback"), "fallback");
    assert.equal(extractApiErrorMessage({ error: { message: 42 } }, "fallback"), "fallback");
  });

  it("reads top-level message / detail when nested error has no message (0047 N5)", () => {
    assert.equal(
      extractApiErrorMessage({ message: "top-level fail" }, "fallback"),
      "top-level fail"
    );
    assert.equal(extractApiErrorMessage({ detail: "detail fail" }, "fallback"), "detail fail");
    assert.equal(
      extractApiErrorMessage({ error: { code: "X" }, message: "prefer nested then top" }, "fb"),
      "prefer nested then top"
    );
  });

  it("never yields [object Object] for structured envelopes", () => {
    const msg = extractApiErrorMessage({ error: { code: "X", nested: true } }, "safe");
    assert.equal(msg.includes("[object Object]"), false);
    assert.equal(msg, "safe");
  });

  it("coerces non-string fallback to a safe string (0047 N6)", () => {
    // JS misuse of fallback: never render object
    const msg = extractApiErrorMessage({}, { bad: true } as unknown as string);
    assert.equal(typeof msg, "string");
    assert.equal(msg.includes("[object Object]"), false);
  });
});
