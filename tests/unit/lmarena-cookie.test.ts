/**
 * Unit tests for LMArena cookie reconstruction and reading (cookie.ts)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reconstructLMArenaCookie,
  readLMArenaCookie,
  LMARENA_AUTH_COOKIE,
} from "../../open-sse/executors/lmarena/cookie.ts";

describe("lmarena-cookie.ts", () => {
  it("reconstructs single cookie from chunked Supabase SSR cookies", () => {
    const raw = "arena-auth-prod-v1.0=chunk0; arena-auth-prod-v1.1=chunk1";
    const rebuilt = reconstructLMArenaCookie(raw);
    assert.ok(rebuilt.includes(`${LMARENA_AUTH_COOKIE}=chunk0chunk1`));
  });

  it("returns unchanged cookie if arena-auth-prod-v1 is non-empty", () => {
    const raw = "arena-auth-prod-v1=single_cookie_val";
    const rebuilt = reconstructLMArenaCookie(raw);
    assert.equal(rebuilt, raw);
  });

  it("reads cookie from direct cookie, apiKey, or providerSpecificData", () => {
    assert.equal(
      readLMArenaCookie({ cookie: "arena-auth-prod-v1=val1" }),
      "arena-auth-prod-v1=val1"
    );
    assert.equal(
      readLMArenaCookie({ apiKey: "arena-auth-prod-v1=val2" }),
      "arena-auth-prod-v1=val2"
    );
    assert.equal(
      readLMArenaCookie({ providerSpecificData: { cookie: "arena-auth-prod-v1=val3" } }),
      "arena-auth-prod-v1=val3"
    );
  });
});
