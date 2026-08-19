// Task 0178 — canonical, exception-safe fetch-capture helper.
//
// Canonical owner: this is the SINGLE shared fetch-capture helper for the test
// corpus (verified 2026-08-18: no withFetchCapture/captureFetch helper existed
// in tests/helpers/, tests/_setup/, or any shared module — only local copies
// inside individual test files). It lives in the existing `tests/helpers/`
// bank (fakeUpstreamStream, faultyUpstream, goldenSnapshot, managementSession,
// propertyConfig, translationFixtures). A new `tests/_helpers/` directory was
// deliberately NOT created to avoid a duplicate helper bank (§ Path Economy).
//
// Design contract (from docs/reports/audits/test-suite-mega-audit-TEMPLATES.md):
//   withFetchCapture(dispatcher, callback) — snapshot and restore
//   globalThis.fetch in `finally`; record URL, method, headers, parsed body;
//   never assert mock existence.
//
// The helper never logs anything and never asserts: tests assert the captured
// `calls` (observable boundary evidence). `toSanitizedEvidence()` exists for
// failure logs / reports and redacts credentials (authorization, cookies,
// api keys, sensitive query params, …) and truncates large values so evidence
// never leaks full sensitive payloads.

export type CapturedFetchCall = Readonly<{
  url: string;
  method: string;
  /** Plain record preserving header insertion order (for order assertions). */
  headers: Readonly<Record<string, string>>;
  /** Parsed JSON body; raw string when not JSON; undefined when unparseable. */
  body: unknown;
  /** Helper for type-safe body access in tests without loose 'as any' casts. */
  bodyAs<T>(): T;
}>;

export type FetchCapture = Readonly<{
  /** Every observed upstream fetch, in call order. Assertion surface. */
  calls: readonly CapturedFetchCall[];
  /**
   * Credential-redacted, truncated view of the capture for logs/evidence.
   * Never use this for boundary assertions (it strips exactly the values
   * such assertions need).
   */
  toSanitizedEvidence(): readonly SanitizedFetchEvidence[];
}>;

export type SanitizedFetchEvidence = Readonly<{
  url: string;
  method: string;
  headers: Readonly<Record<string, string>>;
  body: unknown;
}>;

/** Border evidence handler. Throwing here propagates to the fetch caller. */
export type FetchCaptureDispatcher = (
  input: RequestInfo | URL | string,
  init: RequestInit,
  call: CapturedFetchCall
) => Response | Promise<Response>;

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "api-key",
  "proxy-authorization",
  "set-cookie",
]);

const SENSITIVE_BODY_KEYS = new Set([
  "apikey",
  "api_key",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "clientsecret",
  "client_secret",
  "password",
  "authorization",
  "secret",
  "token",
]);

const SENSITIVE_URL_PARAMS = new Set([
  "key",
  "api_key",
  "apikey",
  "api-key",
  "x-api-key",
  "token",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "secret",
  "client_secret",
  "clientsecret",
  "password",
  "authorization",
  "auth",
  "code",
]);

const MAX_EVIDENCE_STRING = 200;

function urlOf(input: RequestInfo | URL | string): string {
  if (typeof input === "string") return input;
  if ("url" in input) return (input as Request).url;
  return String(input);
}

function methodOf(input: RequestInfo | URL | string, init: RequestInit): string {
  if (init.method) return init.method;
  if (typeof input === "object" && input !== null && "method" in input) {
    return String((input as Request).method);
  }
  return "GET";
}

function extractHeaders(headers: HeadersInit | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  if (headers instanceof Headers) {
    for (const [key, value] of headers.entries()) out[key] = value;
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) out[key] = String(value);
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    out[key] = value == null ? "" : String(value);
  }
  return out;
}

function headersOf(input: RequestInfo | URL | string, init: RequestInit): Record<string, string> {
  const baseHeaders =
    typeof input === "object" && input !== null && "headers" in input && (input as Request).headers
      ? extractHeaders((input as Request).headers)
      : {};
  const initHeaders = extractHeaders(init.headers);

  const merged: Record<string, string> = { ...baseHeaders };
  for (const [initKey, initVal] of Object.entries(initHeaders)) {
    const existingKey = Object.keys(merged).find((k) => k.toLowerCase() === initKey.toLowerCase());
    if (existingKey && existingKey !== initKey) {
      delete merged[existingKey];
    }
    merged[initKey] = initVal;
  }
  return merged;
}

async function parseBody(input: RequestInfo | URL | string, init: RequestInit): Promise<unknown> {
  let body = init.body;
  if (body == null && typeof input === "object" && input !== null && "clone" in input) {
    try {
      body = await (input as Request).clone().text();
    } catch {
      body = undefined;
    }
  }
  if (body == null) return undefined;
  if (typeof body === "string") {
    if (body.trim() === "") return undefined;
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body; // keep the raw string when it is not JSON
    }
  }
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries());
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    try {
      return Object.fromEntries(body.entries());
    } catch {
      return undefined;
    }
  }
  if (
    (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return undefined; // streaming / binary bodies are not cheaply parseable evidence
  }
  return body; // plain object body (structured clone) — keep as-is
}

function sanitizeUrl(rawUrl: string): string {
  try {
    const urlObj = new URL(rawUrl);
    let modified = false;
    for (const paramKey of Array.from(urlObj.searchParams.keys())) {
      if (SENSITIVE_URL_PARAMS.has(paramKey.toLowerCase())) {
        urlObj.searchParams.set(paramKey, "<redacted>");
        modified = true;
      }
    }
    return modified ? urlObj.toString() : rawUrl;
  } catch {
    return rawUrl;
  }
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    if (value.length > MAX_EVIDENCE_STRING) {
      return `${value.slice(0, MAX_EVIDENCE_STRING)}…(${value.length} chars total)`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (depth >= 4) return "<array…>";
    return value.map((item) => scrubValue(item, depth + 1));
  }
  if (value !== null && typeof value === "object") {
    if (depth >= 4) return "<object…>";
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_BODY_KEYS.has(key.toLowerCase())
        ? "<redacted>"
        : scrubValue(item, depth + 1);
    }
    return out;
  }
  return value;
}

function sanitizeCall(call: CapturedFetchCall): SanitizedFetchEvidence {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(call.headers)) {
    headers[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? "<redacted>" : value;
  }
  return {
    url: sanitizeUrl(call.url),
    method: call.method,
    headers,
    body: scrubValue(call.body),
  };
}

/**
 * Install `dispatcher` as globalThis.fetch, run `run`, and restore the
 * original fetch in a `finally` path — whether `run` resolves or throws.
 *
 * @param dispatcher - Reply builder for observed fetch calls (may inspect the
 *   captured call; throwing surfaces to the code under test).
 * @param run - The test body; receives the capture for boundary assertions.
 * @returns The value `run` resolves to.
 */
export async function withFetchCapture<T>(
  dispatcher: FetchCaptureDispatcher,
  run: (capture: FetchCapture) => T | Promise<T>
): Promise<T> {
  const calls: CapturedFetchCall[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL | string, init: RequestInit = {}) => {
    const call: CapturedFetchCall = {
      url: urlOf(input),
      method: methodOf(input, init),
      headers: headersOf(input, init),
      body: await parseBody(input, init),
      bodyAs<U>(): U {
        return this.body as U;
      },
    };
    calls.push(call);
    return dispatcher(input, init, call);
  }) as typeof fetch;

  const capture: FetchCapture = {
    calls: calls as readonly CapturedFetchCall[],
    toSanitizedEvidence(): readonly SanitizedFetchEvidence[] {
      return calls.map(sanitizeCall);
    },
  };

  try {
    return await run(capture);
  } finally {
    globalThis.fetch = original;
  }
}
