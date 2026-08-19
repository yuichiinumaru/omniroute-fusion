import test from "node:test";
import assert from "node:assert/strict";

/**
 * Regression & Diagnostic test for Task 0166 — OpenCode Zen 429 classification.
 *
 * Due to sandbox isolation rules forbidding live upstream network calls in automated CI/review,
 * this investigation utilizes deterministic characterization test probes to verify behavior
 * across three primary HTTP 429 response profiles:
 *
 * - Probe A: Cloudflare Edge 429 (Error 1015) with HTML challenge body, cf-ray, missing OpenCode headers.
 * - Probe B: Backend Platform Quota Exhaustion (x-ratelimit-remaining-requests: 0, organization_quota_exceeded).
 * - Probe C: Transient Request Rate Limit (429 with Retry-After: 5).
 *
 * Code analysis details:
 * 1. `providerRuleRegistry` currently registers "opencode", "opencode-go", and "opencode-cli",
 *    but omits "opencode-zen".
 * 2. When upstream OpenCode Zen returns HTTP 429 with `x-ratelimit-remaining-requests: 0`:
 *    - For `opencode`: `getProviderErrorRuleMatch` matches, and both `classifyError` and
 *      `checkFallbackError` classify as `QUOTA_EXHAUSTED`.
 *    - For `opencode-zen`: `getProviderErrorRuleMatch` returns `null`.
 *      - In `checkFallbackError`, the status-429 rule triggers with `RATE_LIMIT_EXCEEDED` (~5s backoff).
 *      - In `classifyError`, generic bodies fall back to `RATE_LIMIT_EXCEEDED`, while explicit
 *        quota bodies (e.g. `organization_quota_exceeded`) are caught by text classification.
 * 3. Cloudflare Error 1015 (Edge IP Rate Limiting):
 *    - Returns 429 with HTML/Text ("error code: 1015") and no OpenCode backend headers.
 *    - Correctly classified as transient `RATE_LIMIT_EXCEEDED`.
 * 4. Transient Request Rate Limit:
 *    - Returns 429 with `retry-after: 5` and generic rate limit message.
 *    - Correctly parsed into 5000ms cooldown and `RATE_LIMIT_EXCEEDED`.
 */

const { classifyError, checkFallbackError } = await import(
  "../../open-sse/services/accountFallback.ts"
);
const { getProviderErrorRuleMatch, providerRuleRegistry } = await import(
  "../../open-sse/config/providerErrorRules.ts"
);
const { RateLimitReason } = await import("../../open-sse/config/constants.ts");

test("Task 0166: providerRuleRegistry contains opencode aliases but documents opencode-zen omission", () => {
  assert.ok(providerRuleRegistry.has("opencode"), "Registry must include 'opencode'");
  assert.ok(providerRuleRegistry.has("opencode-go"), "Registry must include 'opencode-go'");
  assert.ok(providerRuleRegistry.has("opencode-cli"), "Registry must include 'opencode-cli'");

  // Documents the diagnostic finding for Task 0166: opencode-zen is not in registry
  const zenRules = providerRuleRegistry.get("opencode-zen");
  assert.equal(
    zenRules,
    undefined,
    "Diagnostic finding: 'opencode-zen' is currently omitted from providerRuleRegistry"
  );
});

test("Task 0166: getProviderErrorRuleMatch behavior for opencode vs opencode-zen", () => {
  // opencode matches provider rule
  const opencodeMatch = getProviderErrorRuleMatch("opencode", 429, {
    "x-ratelimit-remaining-requests": "0",
  });
  assert.ok(opencodeMatch, "opencode must match quota header rule");
  assert.equal(opencodeMatch.reason, "quota_exhausted");
  assert.equal(opencodeMatch.scope, "provider");

  // opencode-zen returns null because it is not registered
  const zenMatch = getProviderErrorRuleMatch("opencode-zen", 429, {
    "x-ratelimit-remaining-requests": "0",
  });
  assert.equal(
    zenMatch,
    null,
    "opencode-zen returns null from getProviderErrorRuleMatch due to registry omission"
  );
});

test("Task 0166: classifyError with x-ratelimit-remaining-requests=0 (opencode vs opencode-zen)", () => {
  const genericBody = { error: { message: "Rate limit reached" } };

  // opencode alias: provider error rule fires, producing QUOTA_EXHAUSTED
  const opencodeReason = classifyError(429, "Rate limit reached", {
    provider: "opencode",
    headers: { "x-ratelimit-remaining-requests": "0" },
    body: genericBody,
  });
  assert.equal(opencodeReason, RateLimitReason.QUOTA_EXHAUSTED);

  // opencode-zen: provider error rule misses; falls back to text classifier which sees "Rate limit reached"
  const zenReasonGeneric = classifyError(429, "Rate limit reached", {
    provider: "opencode-zen",
    headers: { "x-ratelimit-remaining-requests": "0" },
    body: genericBody,
  });
  assert.equal(
    zenReasonGeneric,
    RateLimitReason.RATE_LIMIT_EXCEEDED,
    "With generic body and missing provider rule, opencode-zen falls back to RATE_LIMIT_EXCEEDED"
  );

  // opencode-zen with explicit quota body: text classifier catches organization_quota_exceeded
  const zenReasonExplicit = classifyError(
    429,
    JSON.stringify({ error: { code: "organization_quota_exceeded" } }),
    {
      provider: "opencode-zen",
      headers: { "x-ratelimit-remaining-requests": "0" },
      body: { error: { code: "organization_quota_exceeded" } },
    }
  );
  assert.equal(
    zenReasonExplicit,
    RateLimitReason.QUOTA_EXHAUSTED,
    "Explicit quota body text is classified as QUOTA_EXHAUSTED via text classifier"
  );
});

test("Task 0166: checkFallbackError on 429 quota exhaustion (opencode vs opencode-zen)", () => {
  // opencode: checkFallbackError uses getProviderErrorRuleMatch -> QUOTA_EXHAUSTED
  const opencodeFallback = checkFallbackError(
    429,
    "Rate limit reached",
    0,
    null,
    "opencode",
    { "x-ratelimit-remaining-requests": "0" }
  );
  assert.equal(opencodeFallback.reason, RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(opencodeFallback.shouldFallback, true);

  // opencode-zen: checkFallbackError misses provider rule -> falls through to status 429 rule (RATE_LIMIT_EXCEEDED, ~5s)
  const zenFallback = checkFallbackError(
    429,
    "Rate limit reached",
    0,
    null,
    "opencode-zen",
    { "x-ratelimit-remaining-requests": "0" }
  );
  assert.equal(
    zenFallback.reason,
    RateLimitReason.RATE_LIMIT_EXCEEDED,
    "opencode-zen falls back to RATE_LIMIT_EXCEEDED due to missing provider rule"
  );
  assert.equal(zenFallback.shouldFallback, true);
  assert.ok(
    zenFallback.cooldownMs > 0 && zenFallback.cooldownMs <= 10000,
    "Applies transient short cooldown (~5s)"
  );
});

test("Task 0166: Cloudflare Error 1015 (Edge IP Rate Limiting) response classification", () => {
  const cfErrorHtml = `<!DOCTYPE html><html><body>Error 1015: You are being rate limited. Cloudflare Ray ID: 89ab12cd</body></html>`;

  // Cloudflare Error 1015 has no backend x-ratelimit or x-opencode headers
  const cfReason = classifyError(429, cfErrorHtml, {
    provider: "opencode-zen",
    headers: {
      server: "cloudflare",
      "cf-ray": "89ab12cd34ef56gh-IAD",
      "content-type": "text/html; charset=UTF-8",
    },
    body: cfErrorHtml,
  });

  assert.equal(
    cfReason,
    RateLimitReason.RATE_LIMIT_EXCEEDED,
    "Cloudflare Error 1015 must be classified as RATE_LIMIT_EXCEEDED"
  );

  const cfFallback = checkFallbackError(
    429,
    cfErrorHtml,
    0,
    null,
    "opencode-zen",
    {
      server: "cloudflare",
      "cf-ray": "89ab12cd34ef56gh-IAD",
    }
  );

  assert.equal(cfFallback.reason, RateLimitReason.RATE_LIMIT_EXCEEDED);
  assert.equal(cfFallback.shouldFallback, true);
});

test("Task 0166: Quota header variations and case-insensitivity in Opencode rules", () => {
  // Case-insensitive header name
  const upperCaseMatch = getProviderErrorRuleMatch("opencode", 429, {
    "X-RateLimit-Remaining-Requests": "0",
  });
  assert.ok(upperCaseMatch);
  assert.equal(upperCaseMatch.reason, "quota_exhausted");

  // Remaining tokens = 0
  const tokenMatch = getProviderErrorRuleMatch("opencode", 429, {
    "x-ratelimit-remaining-tokens": "0",
  });
  assert.ok(tokenMatch);
  assert.equal(tokenMatch.reason, "quota_exhausted");

  // Positive remaining requests -> no quota rule match
  const positiveMatch = getProviderErrorRuleMatch("opencode", 429, {
    "x-ratelimit-remaining-requests": "15",
  });
  assert.equal(positiveMatch, null, "Positive remaining requests must not trigger quota exhaustion");
});

test("Task 0166: Probe C — Transient Request Rate Limit (429 with Retry-After: 5)", () => {
  const transientBody = {
    error: {
      message: "Rate limit reached. Please wait before retrying.",
      type: "rate_limit_error",
    },
  };

  const reason = classifyError(429, JSON.stringify(transientBody), {
    provider: "opencode-zen",
    headers: {
      "retry-after": "5",
      "content-type": "application/json",
      "x-opencode-request": "req-transient-429-001",
    },
    body: transientBody,
  });
  assert.equal(reason, RateLimitReason.RATE_LIMIT_EXCEEDED);

  const fallback = checkFallbackError(
    429,
    JSON.stringify(transientBody),
    0,
    null,
    "opencode-zen",
    {
      "retry-after": "5",
      "content-type": "application/json",
      "x-opencode-request": "req-transient-429-001",
    }
  );
  assert.equal(fallback.reason, RateLimitReason.RATE_LIMIT_EXCEEDED);
  assert.equal(fallback.shouldFallback, true);
  assert.equal(fallback.cooldownMs, 5000, "Retry-After: 5 must parse to 5000ms cooldown");
});
