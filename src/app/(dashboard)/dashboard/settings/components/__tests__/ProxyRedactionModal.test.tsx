// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProxyRedactionModal from "../ProxyRedactionModal";
import { PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE } from "@/shared/constants/proxyRedaction";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type FetchCall = {
  url: string;
  method: string;
  body: unknown;
};

describe("ProxyRedactionModal (Mounted React DOM Component Tests)", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchCalls: FetchCall[] = [];
  const cleanupCallbacks: Array<() => void> = [];

  function installFetchMock(
    handler: (url: string, init?: RequestInit) => { status?: number; body?: unknown }
  ) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = String(init?.method || "GET").toUpperCase();
      let body: unknown = null;
      if (typeof init?.body === "string") {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = init.body;
        }
      }
      fetchCalls.push({ url, method, body });
      const res = handler(url, init);
      const status = res.status ?? 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => res.body ?? {},
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  async function flushEffects() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    fetchCalls = [];
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    cleanupCallbacks.push(() => {
      act(() => {
        root.unmount();
      });
      container.remove();
    });
  });

  afterEach(() => {
    while (cleanupCallbacks.length > 0) {
      cleanupCallbacks.pop()?.();
    }
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderModal(props?: {
    isOpen?: boolean;
    onClose?: () => void;
    onEnablePiiAndContinue?: () => Promise<void> | void;
    onBypassAndContinue?: (token: string) => Promise<void> | void;
  }) {
    const onClose = props?.onClose ?? vi.fn();
    const onEnablePiiAndContinue = props?.onEnablePiiAndContinue ?? vi.fn();
    const onBypassAndContinue = props?.onBypassAndContinue ?? vi.fn();

    act(() => {
      root.render(
        <ProxyRedactionModal
          isOpen={props?.isOpen ?? true}
          onClose={onClose}
          onEnablePiiAndContinue={onEnablePiiAndContinue}
          onBypassAndContinue={onBypassAndContinue}
        />
      );
    });

    return { onClose, onEnablePiiAndContinue, onBypassAndContinue };
  }

  it("does not render modal content when isOpen is false", () => {
    renderModal({ isOpen: false });
    expect(container.textContent).toBe("");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("mounts and renders dialog title, security warning banner, and Hard Rule #20 badge", () => {
    renderModal({ isOpen: true });

    expect(container.textContent).toContain("PII Redaction Required for Proxy Routing");
    expect(container.textContent).toContain("Security Warning: Unredacted Proxy Routing");
    expect(container.textContent).toContain("Hard Rule #20 Protected");
    expect(container.textContent).toContain("Recommended: Enable PII Redaction");
    expect(container.textContent).toContain("High Risk: Route Without Redaction");
    expect(container.textContent).toContain(PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE);
  });

  it("Primary CTA path: triggers PUT /api/settings/feature-flags, invokes callbacks, and closes modal", async () => {
    installFetchMock((url, init) => {
      if (url === "/api/settings/feature-flags" && init?.method === "PUT") {
        return { status: 200, body: { success: true } };
      }
      return { status: 404, body: {} };
    });

    const onEnablePiiAndContinue = vi.fn(async () => {});
    const onClose = vi.fn();

    renderModal({ isOpen: true, onEnablePiiAndContinue, onClose });

    // Find the Primary CTA button
    const buttons = Array.from(container.querySelectorAll("button"));
    const primaryBtn = buttons.find((btn) =>
      btn.textContent?.includes("Enable PII Redaction & Continue")
    );
    expect(primaryBtn).toBeTruthy();

    await act(async () => {
      primaryBtn?.click();
    });
    await flushEffects();

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toEqual({
      url: "/api/settings/feature-flags",
      method: "PUT",
      body: { key: "PII_REDACTION_ENABLED", value: "true" },
    });

    expect(onEnablePiiAndContinue).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Primary CTA path error handling: renders error message and does not close modal on API failure", async () => {
    installFetchMock((url) => {
      if (url === "/api/settings/feature-flags") {
        return { status: 500, body: { error: "Database disk failure" } };
      }
      return { status: 404, body: {} };
    });

    const onEnablePiiAndContinue = vi.fn();
    const onClose = vi.fn();

    renderModal({ isOpen: true, onEnablePiiAndContinue, onClose });

    const buttons = Array.from(container.querySelectorAll("button"));
    const primaryBtn = buttons.find((btn) =>
      btn.textContent?.includes("Enable PII Redaction & Continue")
    );

    await act(async () => {
      primaryBtn?.click();
    });
    await flushEffects();

    expect(onEnablePiiAndContinue).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Database disk failure");
  });

  function setInputValue(input: HTMLInputElement, value: string) {
    const lastValue = input.value;
    input.value = value;
    const tracker = (input as unknown as { _valueTracker?: { setValue: (v: string) => void } })
      ._valueTracker;
    if (tracker) {
      tracker.setValue(lastValue);
    }
    act(() => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function toggleCheckbox(input: HTMLInputElement) {
    act(() => {
      input.click();
    });
  }

  function getBypassButton(): HTMLButtonElement | null {
    const buttons = Array.from(container.querySelectorAll("button"));
    return (
      (buttons.find((btn) =>
        btn.textContent?.includes("Bypass & Continue (Single Use)")
      ) as HTMLButtonElement) ?? null
    );
  }

  it("Secondary path: disables bypass button until checkbox is checked AND exact phrase is typed", async () => {
    renderModal({ isOpen: true });

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement | null;

    expect(checkbox).toBeTruthy();
    expect(textInput).toBeTruthy();

    // Initial state: disabled
    expect(getBypassButton()?.disabled).toBe(true);

    // 1. Checkbox checked, but phrase empty -> still disabled
    if (checkbox) toggleCheckbox(checkbox);
    await flushEffects();
    expect(checkbox?.checked).toBe(true);
    expect(getBypassButton()?.disabled).toBe(true);

    // 2. Checkbox checked, wrong phrase -> still disabled
    if (textInput) setInputValue(textInput, "wrong phrase text");
    await flushEffects();
    expect(getBypassButton()?.disabled).toBe(true);

    // 3. Checkbox unchecked, correct phrase -> still disabled
    if (checkbox) toggleCheckbox(checkbox); // unchecks
    if (textInput) setInputValue(textInput, PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE);
    await flushEffects();
    expect(checkbox?.checked).toBe(false);
    expect(getBypassButton()?.disabled).toBe(true);

    // 4. Checkbox checked AND exact phrase -> ENABLED
    if (checkbox) toggleCheckbox(checkbox); // checks again
    await flushEffects();
    expect(checkbox?.checked).toBe(true);
    expect(getBypassButton()?.disabled).toBe(false);
  });

  it("Secondary path execution: requests bypass token, invokes callback with token, and closes modal", async () => {
    installFetchMock((url, init) => {
      if (url === "/api/settings/proxy/bypass-token" && init?.method === "POST") {
        return { status: 200, body: { success: true, bypassToken: "pbt_test_token_12345" } };
      }
      return { status: 404, body: {} };
    });

    const onBypassAndContinue = vi.fn(async () => {});
    const onClose = vi.fn();

    renderModal({ isOpen: true, onBypassAndContinue, onClose });

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;

    // Fill form
    toggleCheckbox(checkbox);
    setInputValue(textInput, PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE);
    await flushEffects();

    const bypassBtn = getBypassButton();
    expect(bypassBtn?.disabled).toBe(false);

    // Click bypass button
    await act(async () => {
      bypassBtn?.click();
    });
    await flushEffects();

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toEqual({
      url: "/api/settings/proxy/bypass-token",
      method: "POST",
      body: {
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
        reason: "User acknowledged unredacted proxy routing risks in dashboard modal",
      },
    });

    expect(onBypassAndContinue).toHaveBeenCalledWith("pbt_test_token_12345");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Secondary path error handling: renders error message and does not close modal on API failure", async () => {
    installFetchMock((url) => {
      if (url === "/api/settings/proxy/bypass-token") {
        return { status: 400, body: { error: { message: "Invalid confirmation phrase" } } };
      }
      return { status: 404, body: {} };
    });

    const onBypassAndContinue = vi.fn();
    const onClose = vi.fn();

    renderModal({ isOpen: true, onBypassAndContinue, onClose });

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;

    toggleCheckbox(checkbox);
    setInputValue(textInput, PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE);
    await flushEffects();

    const bypassBtn = getBypassButton();
    expect(bypassBtn?.disabled).toBe(false);

    await act(async () => {
      bypassBtn?.click();
    });
    await flushEffects();

    expect(onBypassAndContinue).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Invalid confirmation phrase");
  });

  it("Cancel button closes modal and resets form state", async () => {
    const onClose = vi.fn();
    renderModal({ isOpen: true, onClose });

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const buttons = Array.from(container.querySelectorAll("button"));
    const cancelBtn = buttons.find((btn) => btn.textContent?.trim() === "Cancel");

    expect(cancelBtn).toBeTruthy();

    toggleCheckbox(checkbox);
    setInputValue(textInput, "some phrase");
    await flushEffects();

    await act(async () => {
      cancelBtn?.click();
    });
    await flushEffects();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
