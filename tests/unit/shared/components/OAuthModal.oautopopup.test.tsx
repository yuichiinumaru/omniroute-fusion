// @vitest-environment jsdom
// OAuthModal — Task 0135 decision matrix
//
// Verifies the operator-controlled `oauthAutoOpen` toggle only suppresses
// `window.open(...)` for the authorization-code + Codex PKCE popup flows.
// Device-code (window.open of verification URL) and import-token flows are
// intentionally unchanged. We mock fetch + window.open and assert what
// triggers and what does not.

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const fn = (key: string) => key;
    fn.rich = (key: string) => {
      // Return a React node that simply renders the key for assertion purposes.
      return key;
    };
    return fn;
  },
}));

const cleanupCallbacks: Array<() => void> = [];

function makeContainer(): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  cleanupCallbacks.push(() => container.remove());
  return container;
}

interface FetchHandler {
  method?: string;
  url: RegExp;
  status?: number;
  body: unknown;
}

function buildFetchMock(handlers: FetchHandler[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    for (const h of handlers) {
      if (h.method && h.method.toUpperCase() !== method) continue;
      if (!h.url.test(url)) continue;
      return new Response(JSON.stringify(h.body), {
        status: h.status ?? 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "unhandled" }), { status: 501 });
  });
}

interface Harness {
  root: Root;
  container: HTMLDivElement;
  openSpy: ReturnType<typeof vi.fn>;
  unmount: () => void;
}

async function mountOAuthModal(provider: string, settingsValue: unknown): Promise<Harness> {
  const container = makeContainer();
  const root = createRoot(container);

  // window.open spy — return a fake popup window so popupRef stays truthy
  // when the modal wants to track it. jsdom has no DOM opener support, but
  // the modal only relies on `popupRef.current.closed`.
  const openSpy = vi.fn(() => ({ closed: false, focus: vi.fn() } as unknown as Window));
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: openSpy,
  });

  const fetchMock = buildFetchMock([
    {
      url: /\/api\/settings/,
      body: { oauthAutoOpen: settingsValue },
    },
    // Authorization-code (standard) response
    {
      url: /\/api\/oauth\/(?!.*device-code).*\/authorize/,
      body: {
        authUrl: "https://provider.example.com/oauth/authorize?x=1",
        state: "abc",
        codeVerifier: "verifier",
        redirectUri: "http://localhost:20128/callback",
      },
    },
    // Codex PKCE callback server response
    {
      url: /\/api\/oauth\/codex\/start-callback-server/,
      body: {
        authUrl: "http://localhost:1455/auth/callback?code=...&state=...",
        redirectUri: "http://localhost:1455/auth/callback",
      },
    },
    // Device-code response
    {
      url: /\/api\/oauth\/.*\/device-code/,
      body: {
        device_code: "DEV1",
        user_code: "USER-CODE",
        verification_uri: "https://provider.example.com/device",
        verification_uri_complete: "https://provider.example.com/device?code=USER-CODE",
        interval: 5,
        expires_in: 600,
      },
    },
  ]);
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  // Import lazily so the mock is in place before module evaluation.
  const { default: OAuthModal } = await import("@/shared/components/OAuthModal");

  await act(async () => {
    root.render(
      <OAuthModal isOpen provider={provider} providerInfo={{ name: provider }} onClose={() => {}} />
    );
  });

  // Wait for the fetch → settings → startOAuthFlow chain to settle. Two ticks
  // covers the settings fetch + the subsequent OAuth authorize/device-code
  // fetch. The OAuth flow then either opens a popup (auto-open=true) or
  // jumps straight to the manual input step (auto-open=false).
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  return {
    root,
    container,
    openSpy,
    unmount: () => {
      root.unmount();
    },
  };
}

describe("OAuthModal — oauthAutoOpen popup gating (Task 0135)", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    while (cleanupCallbacks.length > 0) {
      cleanupCallbacks.pop()?.();
    }
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("auto-open=true (default): opens popup for the authorization-code flow on localhost", async () => {
    // Antigravity is a plain authorization-code provider that does NOT enter
    // the Claude/Cline `forceManual` branch, so it exercises the actual
    // popup-on-localhost code path that the toggle gates.
    const harness = await mountOAuthModal("antigravity", true);

    const popupOpens = harness.openSpy.mock.calls.filter(
      ([_url, target]) => target === "oauth_popup" || target === "oauth_auth"
    );
    expect(popupOpens.length).toBeGreaterThanOrEqual(1);
    harness.unmount();
  });

  it("auto-open=false: skips window.open for the authorization-code flow", async () => {
    const harness = await mountOAuthModal("antigravity", false);

    const popupOpens = harness.openSpy.mock.calls.filter(
      ([_url, target]) => target === "oauth_popup" || target === "oauth_auth"
    );
    expect(popupOpens.length).toBe(0);
    harness.unmount();
  });

  it("auto-open=false: skips window.open for the forceManual branch (remote / Claude)", async () => {
    const harness = await mountOAuthModal("claude", false);
    
    // The forceManual branch (Claude/Cline) or !isTrueLocalhost triggers the manual input path.
    // It should not open the popup when auto-open is disabled.
    const popupOpens = harness.openSpy.mock.calls.filter(
      ([_url, target]) => target === "oauth_auth" || target === "oauth_popup"
    );
    expect(popupOpens.length).toBe(0);
    
    // Should land on manual step
    expect(harness.container.textContent).toContain("step1OpenUrl");
    harness.unmount();
  });

  it("auto-open=false: still starts Codex PKCE callback server but skips popup", async () => {
    const harness = await mountOAuthModal("codex", false);
    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    // The callback server should have been started — fetch was called against
    // /api/oauth/codex/start-callback-server.
    const serverCalls = fetchSpy.mock.calls.filter(([u]) =>
      /\/api\/oauth\/codex\/start-callback-server/.test(String(u))
    );
    expect(serverCalls.length).toBe(1);

    // But the OAuth auth popup must NOT have been auto-opened.
    const popupOpens = harness.openSpy.mock.calls.filter(
      ([_url, target]) => target === "oauth_auth"
    );
    expect(popupOpens.length).toBe(0);
    harness.unmount();
  });

  it("auto-open=false on Codex: modal lands on the manual paste step", async () => {
    const harness = await mountOAuthModal("codex", false);

    // The "step1OpenUrl" label is rendered only on the manual input step.
    expect(harness.container.textContent).toContain("step1OpenUrl");
    harness.unmount();
  });

  it("device-code flow is unaffected by oauthAutoOpen=false (window.open is informational)", async () => {
    const harness = await mountOAuthModal("kiro", false);

    // Device-code should still open the verification URL (oauth_verify)
    // even when auto-open is disabled — the user must reach the verifier
    // page to type their code, so leaving it untouched is the correct UX.
    // window.open signature: (url, targetName) — we filter on the second arg.
    const verifyOpens = harness.openSpy.mock.calls.filter(
      ([_url, target]) => target === "oauth_verify"
    );
    expect(verifyOpens.length).toBe(1);
    harness.unmount();
  });

  it("auto-open setting falls back to true when /api/settings fails", async () => {
    const container = makeContainer();
    const root = createRoot(container);

    const openSpy = vi.fn(() => ({ closed: false, focus: vi.fn() } as unknown as Window));
    Object.defineProperty(window, "open", {
      configurable: true,
      writable: true,
      value: openSpy,
    });

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (/\/api\/settings/.test(url)) {
        return new Response(JSON.stringify({ error: "boom" }), { status: 500 });
      }
      return new Response(
        JSON.stringify({
          authUrl: "https://provider.example.com/oauth/authorize?x=1",
          state: "abc",
          codeVerifier: "verifier",
          redirectUri: "http://localhost:20128/callback",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const { default: OAuthModal } = await import("@/shared/components/OAuthModal");
    // Antigravity exercises the actual popup branch (Claude/Cline force the
    // manual fallback path which calls window.open unconditionally).
    await act(async () => {
      root.render(
        <OAuthModal
          isOpen
          provider="antigravity"
          providerInfo={{ name: "antigravity" }}
          onClose={() => {}}
        />
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // With settings fetch failing, default true must still kick in so the
    // popup opens — otherwise a transient settings blip would silently lock
    // operators out of OAuth.
    const popupOpens = openSpy.mock.calls.filter(([_u, t]) => t === "oauth_popup");
    expect(popupOpens.length).toBeGreaterThanOrEqual(1);
    root.unmount();
  });
});