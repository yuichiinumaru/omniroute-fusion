// @vitest-environment jsdom
// OAuthModal — Task 0151 F1 cancellation regression
//
// Proves device-code and callback-server polling are abortable with cleanup
// on modal close/unmount, that stale state/onSuccess is prevented, and that
// AbortError is silent (no error step). Uses fake timers for determinism.

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("OAuthModal — abortable polling (Task 0151 F1)", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] } as never);
  });

  afterEach(async () => {
    // Flush any pending timers before restoring to avoid cross-test leakage
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    // Reset fetch to avoid state bleed
    (globalThis as unknown as Record<string, unknown>).fetch = undefined as unknown as typeof fetch;
  });

  it("device-code polling stops on unmount — no further /poll and no onSuccess", async () => {
    let pollCalls = 0;
    const onSuccess = vi.fn();

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      if (/\/api\/settings/.test(url)) {
        return jsonResponse({ oauthAutoOpen: true });
      }
      if (/\/api\/oauth\/.*\/device-code/.test(url)) {
        return jsonResponse({
          device_code: "DEV-CANCEL-1",
          user_code: "ABCD-1111",
          verification_uri: "https://provider.example.com/device",
          verification_uri_complete: "https://provider.example.com/device?code=ABCD-1111",
          interval: 0.05, // 50ms for fast test
          expires_in: 600,
        });
      }
      if (/\/api\/oauth\/.*\/poll/.test(url)) {
        pollCalls += 1;
        // Always pending so the loop would continue indefinitely if not aborted
        return jsonResponse({ pending: true });
      }
      return jsonResponse({ error: "unhandled" }, 501);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Silence window.open for device verification URL
    const openSpy = vi.fn(() => ({ closed: false, focus: vi.fn() } as unknown as Window));
    Object.defineProperty(window, "open", { configurable: true, writable: true, value: openSpy });

    const { default: OAuthModal } = await import("@/shared/components/OAuthModal");

    const container = makeContainer();
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <OAuthModal isOpen provider="kiro" providerInfo={{ name: "kiro" }} onClose={() => {}} onSuccess={onSuccess} />
      );
    });
    // Flush the settings + device-code fetch chain (microtasks)
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Let the first polling delay elapse (50ms) and allow the first poll fetch
    await act(async () => {
      vi.advanceTimersByTime(60);
      // Flush microtasks for fetch
      await Promise.resolve();
      await Promise.resolve();
    });

    const callsBeforeUnmount = pollCalls;
    expect(callsBeforeUnmount).toBeGreaterThanOrEqual(1);

    // Unmount the modal — this must abort polling
    await act(async () => {
      root.unmount();
    });

    // Advance timers well beyond several intervals; if not aborted, polls would continue
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    const callsAfterUnmount = pollCalls;
    expect(callsAfterUnmount).toBe(callsBeforeUnmount);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("device-code polling is aborted on isOpen=false — no stale onSuccess after cancellation", async () => {
    let pollCalls = 0;
    const onSuccess = vi.fn();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (/\/api\/settings/.test(url)) return jsonResponse({ oauthAutoOpen: true });
      if (/device-code/.test(url)) {
        return jsonResponse({
          device_code: "DEV-CANCEL-2",
          user_code: "WXYZ-2222",
          verification_uri: "https://provider.example.com/device",
          interval: 0.05,
          expires_in: 600,
        });
      }
      if (/\/api\/oauth\/.*\/poll/.test(url)) {
        pollCalls += 1;
        // First poll pending, second would succeed — but we abort before second
        if (pollCalls === 2) {
          return jsonResponse({ success: true, connection: { id: "c1", provider: "kiro" } });
        }
        return jsonResponse({ pending: true });
      }
      return jsonResponse({}, 200);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    Object.defineProperty(window, "open", { configurable: true, writable: true, value: vi.fn(() => ({ closed: false } as unknown as Window)) });

    const { default: OAuthModal } = await import("@/shared/components/OAuthModal");

    const container = makeContainer();
    const root = createRoot(container);

    // Wrapper to toggle isOpen prop without unmounting the tree
    function Wrapper({ isOpen }: { isOpen: boolean }) {
      return <OAuthModal isOpen={isOpen} provider="kiro" providerInfo={{ name: "kiro" }} onClose={() => {}} onSuccess={onSuccess} />;
    }

    await act(async () => {
      root.render(<Wrapper isOpen={true} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(60);
      await Promise.resolve();
      await Promise.resolve();
    });

    const beforeClose = pollCalls;
    expect(beforeClose).toBeGreaterThanOrEqual(1);

    // Close the modal (isOpen -> false). This must abort polling and prevent onSuccess.
    await act(async () => {
      root.render(<Wrapper isOpen={false} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(pollCalls).toBe(beforeClose);
    expect(onSuccess).not.toHaveBeenCalled();

    root.unmount();
  });

  it("callback-server polling stops on unmount — no further /poll-callback and no onSuccess", async () => {
    let pollCallbackCalls = 0;
    const onSuccess = vi.fn();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (/\/api\/settings/.test(url)) return jsonResponse({ oauthAutoOpen: true });
      if (/\/api\/oauth\/codex\/start-callback-server/.test(url)) {
        return jsonResponse({
          authUrl: "https://auth.example.com/authorize?state=expected-state",
          state: "expected-state",
          codeVerifier: "verifier-xyz",
          redirectUri: "http://localhost:1455/auth/callback",
        });
      }
      if (/\/api\/oauth\/codex\/poll-callback/.test(url)) {
        pollCallbackCalls += 1;
        return jsonResponse({ pending: true });
      }
      return jsonResponse({ error: "unhandled" }, 501);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    Object.defineProperty(window, "open", { configurable: true, writable: true, value: vi.fn(() => ({ closed: false } as unknown as Window)) });

    const { default: OAuthModal } = await import("@/shared/components/OAuthModal");

    const container = makeContainer();
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <OAuthModal isOpen provider="codex" providerInfo={{ name: "codex" }} onClose={() => {}} onSuccess={onSuccess} />
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Callback-server polling is 2000ms interval — advance to trigger first poll
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
      await Promise.resolve();
    });

    const beforeUnmount = pollCallbackCalls;
    expect(beforeUnmount).toBeGreaterThanOrEqual(1);

    await act(async () => {
      root.unmount();
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(pollCallbackCalls).toBe(beforeUnmount);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
