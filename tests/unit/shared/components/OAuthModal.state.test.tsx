// @vitest-environment jsdom
// OAuthModal — Task 0151 F2 PKCE state boundary tests
//
// Matching state must succeed; missing state must reject; mismatched state must
// reject. Manual paste must not default missing state to the expected value
// (previous bug). Keeps import fallback and device-code non-PKCE semantics.

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const fn = (key: string) => key;
    (fn as unknown as { rich: (k: string) => string }).rich = (k: string) => k;
    return fn;
  },
}));

function makeContainer(): HTMLElement {
  const c = document.createElement("div");
  document.body.appendChild(c);
  return c;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function mountWithAuthData(provider: string, authData: Record<string, unknown>) {
  const container = makeContainer();
  const root = createRoot(container);

  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({ closed: false } as unknown as Window)),
  });

  // Track what state the exchange POST sends
  let capturedExchangeState: string | null | undefined = "__NOT_CALLED__";
  let capturedExchangeBody: Record<string, unknown> | null = null;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (/\/api\/settings/.test(url)) return jsonResponse({ oauthAutoOpen: false });
    if (/\/api\/oauth\/.*\/authorize/.test(url)) {
      // Never reached for PKCE callback-server providers on this path (authData is mocked
      // via window message), but provide it so the OAuthModal doesn't stall if it does call.
      return jsonResponse({
        authUrl: `https://provider.example.com/authorize?state=${authData.state}`,
        state: authData.state,
        codeVerifier: authData.codeVerifier,
        redirectUri: authData.redirectUri,
      });
    }
    if (/\/api\/oauth\/.*\/exchange/.test(url) && method === "POST") {
      try {
        capturedExchangeBody = JSON.parse(String((init?.body as string) ?? "{}"));
      } catch {
        capturedExchangeBody = {};
      }
      capturedExchangeState = (capturedExchangeBody as Record<string, unknown>)?.state as string | undefined;
      // Exchange should NOT be reached for missing/mismatch cases; if it is, succeed
      return jsonResponse(
        { success: true, connection: { id: "c1", provider } },
        200
      );
    }
    if (/\/api\/oauth\/codex\/start-callback-server/.test(url)) {
      // Prevent the PKCE callback-server polling from hijacking the test — codex
      // would otherwise enter the callback-server loop and never expose the
      // manual paste path. For state tests we use antigravity (plain
      // authorization_code) which directly populates authData from /authorize.
      return jsonResponse({
        authUrl: `https://provider.example.com/authorize?state=${authData.state}`,
        state: authData.state,
        codeVerifier: authData.codeVerifier,
        redirectUri: authData.redirectUri,
      });
    }
    if (/\/api\/oauth\/.*\/start-callback-server/.test(url)) {
      return jsonResponse(
        {
          authUrl: `https://provider.example.com/authorize?state=${authData.state}`,
          state: authData.state,
          codeVerifier: authData.codeVerifier,
          redirectUri: authData.redirectUri,
        },
        200
      );
    }
    return jsonResponse({}, 200);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const onSuccess = vi.fn();
  const onClose = vi.fn();

  const { default: OAuthModal } = await import("@/shared/components/OAuthModal");

  await act(async () => {
    root.render(
      <OAuthModal isOpen provider={provider} providerInfo={{ name: provider }} onClose={onClose} onSuccess={onSuccess} />
    );
  });

  // Flush: fetch settings + authorize/poll chain into authData. For antigravity
  // on localhost (jsdom), this populates authData with {state, codeVerifier, ...}.
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }

  return {
    container,
    root,
    fetchMock,
    onSuccess,
    getCapturedExchangeState: () => capturedExchangeState,
    getCapturedExchangeBody: () => capturedExchangeBody,
    resetCapturedExchange: () => {
      capturedExchangeState = "__NOT_CALLED__";
      capturedExchangeBody = null;
    },
    cleanup: () => {
      root.unmount();
      container.remove();
    },
  };
}

// Simulate the browser sending an oauth_callback postMessage (popup path)
function fireOAuthCallback(state: string | null | undefined, code = "code-123") {
  const event = new MessageEvent("message", {
    data: { type: "oauth_callback", data: { code, state } },
    origin: window.location.origin,
  } as MessageEventInit);
  window.dispatchEvent(event);
}

async function submitManualCallback(container: HTMLElement, callbackUrl: string) {
  // Find the manual paste input (placeholder contains "callback?code=")
  const inputs = Array.from(container.querySelectorAll("input")) as HTMLInputElement[];
  // The callback paste input is the one without readOnly that has a placeholder
  const pasteInput = inputs.find((el) => !el.readOnly && el.placeholder.length > 0)
    ?? inputs.find((el) => !el.readOnly);
  expect(pasteInput, "manual callback input must be present").toBeDefined();
  const input = pasteInput as HTMLInputElement;

  // React's onChange may use the native setter path; set via prototype for reliability.
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set
    ?? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, callbackUrl);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    // Also fire React's change path
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Click Connect (the first primary button that says "connect")
  const buttons = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[];
  const connectBtn = buttons.find((b) => /connect/i.test(b.textContent ?? ""));
  expect(connectBtn, "Connect button must be present").toBeDefined();
  await act(async () => {
    (connectBtn as HTMLButtonElement).click();
  });
  // Allow fetch + state update microtasks
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

describe("OAuthModal — PKCE callback state (Task 0151 F2)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    // jsdom location persists across tests; ensure origin is stable
    (globalThis as unknown as Record<string, unknown>).fetch = undefined as unknown as typeof fetch;
  });

  it("matching state via postMessage reaches exchange with the same state", async () => {
    const expectedState = "state-expected-abc";
    const harness = await mountWithAuthData("antigravity", {
      state: expectedState,
      codeVerifier: "verifier-123",
      redirectUri: "http://localhost:20128/callback",
      authUrl: `https://provider.example.com/authorize?state=${expectedState}`,
    });

    // antigravity was rendered with oauthAutoOpen=false, so it lands on the
    // manual input step — use the postMessage path via the authData listener.
    // The listener only reacts when authData is present, so we dispatch after
    // the data has settled.
    fireOAuthCallback(expectedState, "code-ok");

    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    }

    expect(harness.getCapturedExchangeState()).toBe(expectedState);
    expect(harness.onSuccess).toHaveBeenCalledTimes(1);
    expect(harness.container.textContent).toContain("success");

    harness.cleanup();
  });

  it("mismatched state via postMessage is rejected — no exchange, shows state mismatch", async () => {
    const expectedState = "state-expected-aaa";
    const harness = await mountWithAuthData("antigravity", {
      state: expectedState,
      codeVerifier: "verifier-123",
      redirectUri: "http://localhost:20128/callback",
      authUrl: `https://provider.example.com/authorize?state=${expectedState}`,
    });

    fireOAuthCallback("wrong-state-bbb", "code-ok");

    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    }

    expect(harness.getCapturedExchangeState()).toBe("__NOT_CALLED__");
    expect(harness.onSuccess).not.toHaveBeenCalled();
    expect(harness.container.textContent).toMatch(/state mismatch/i);

    harness.cleanup();
  });

  it("missing state via postMessage is rejected — no exchange, shows state mismatch", async () => {
    const expectedState = "state-expected-ccc";
    const harness = await mountWithAuthData("antigravity", {
      state: expectedState,
      codeVerifier: "verifier-123",
      redirectUri: "http://localhost:20128/callback",
      authUrl: `https://provider.example.com/authorize?state=${expectedState}`,
    });

    fireOAuthCallback(undefined, "code-ok");

    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    }

    expect(harness.getCapturedExchangeState()).toBe("__NOT_CALLED__");
    expect(harness.onSuccess).not.toHaveBeenCalled();
    expect(harness.container.textContent).toMatch(/state mismatch/i);

    harness.cleanup();
  });

  it("manual paste: matching state in callback URL succeeds", async () => {
    const expectedState = "manual-state-mmm";
    const harness = await mountWithAuthData("antigravity", {
      state: expectedState,
      codeVerifier: "verifier-123",
      redirectUri: "http://localhost:20128/callback",
      authUrl: `https://provider.example.com/authorize?state=${expectedState}`,
    });

    await submitManualCallback(
      harness.container,
      `http://localhost:20128/callback?code=code-manual&state=${expectedState}`
    );

    expect(harness.getCapturedExchangeState()).toBe(expectedState);
    expect(harness.onSuccess).toHaveBeenCalledTimes(1);

    harness.cleanup();
  });

  it("manual paste: mismatched state in callback URL is rejected — no exchange", async () => {
    const expectedState = "manual-state-nnn";
    const harness = await mountWithAuthData("antigravity", {
      state: expectedState,
      codeVerifier: "verifier-123",
      redirectUri: "http://localhost:20128/callback",
      authUrl: `https://provider.example.com/authorize?state=${expectedState}`,
    });

    await submitManualCallback(
      harness.container,
      "http://localhost:20128/callback?code=code-manual&state=WRONG-STATE"
    );

    expect(harness.getCapturedExchangeState()).toBe("__NOT_CALLED__");
    expect(harness.onSuccess).not.toHaveBeenCalled();
    expect(harness.container.textContent).toMatch(/state mismatch/i);

    harness.cleanup();
  });

  it("manual paste: missing state in callback URL is rejected — no default to expectedState", async () => {
    const expectedState = "manual-state-ooo";
    const harness = await mountWithAuthData("antigravity", {
      state: expectedState,
      codeVerifier: "verifier-123",
      redirectUri: "http://localhost:20128/callback",
      authUrl: `https://provider.example.com/authorize?state=${expectedState}`,
    });

    // No `state=` param — previously this defaulted to expectedState via
    // `state = url.searchParams.get("state") || state`, which incorrectly
    // treated a missing-state callback as valid. Must now reject.
    await submitManualCallback(
      harness.container,
      "http://localhost:20128/callback?code=code-manual"
    );

    expect(harness.getCapturedExchangeState()).toBe("__NOT_CALLED__");
    expect(harness.onSuccess).not.toHaveBeenCalled();
    expect(harness.container.textContent).toMatch(/state mismatch/i);

    harness.cleanup();
  });

  it("manual paste: raw code#state fragment with mismatched state is rejected", async () => {
    const expectedState = "frag-state-ppp";
    const harness = await mountWithAuthData("antigravity", {
      state: expectedState,
      codeVerifier: "verifier-123",
      redirectUri: "http://localhost:20128/callback",
      authUrl: `https://provider.example.com/authorize?state=${expectedState}`,
    });

    await submitManualCallback(harness.container, "rawcode123#WRONG-FRAG");

    expect(harness.getCapturedExchangeState()).toBe("__NOT_CALLED__");
    expect(harness.onSuccess).not.toHaveBeenCalled();
    expect(harness.container.textContent).toMatch(/state mismatch/i);

    harness.cleanup();
  });
});
