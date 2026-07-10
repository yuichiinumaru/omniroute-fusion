// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsFieldRow from "@/shared/components/settings/SettingsFieldRow";
import SettingsTextField from "@/shared/components/settings/SettingsTextField";

describe("SettingsFieldRow", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders label, description, and control slot with field density tokens", () => {
    act(() => {
      root.render(
        <SettingsFieldRow
          label="API base URL"
          description="Upstream endpoint for this key"
          htmlFor="base-url"
        >
          <input id="base-url" defaultValue="https://example.com" />
        </SettingsFieldRow>
      );
    });

    expect(container.textContent).toContain("API base URL");
    expect(container.textContent).toContain("Upstream endpoint for this key");
    const label = container.querySelector('label[for="base-url"]');
    expect(label).toBeTruthy();
    const row = container.firstElementChild as HTMLElement;
    expect(row.className).toContain("border-border");
    expect(row.className).toContain("bg-surface/40");
  });
});

describe("SettingsTextField", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("wires controlled value and onChange through the row", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <SettingsTextField
          id="vercel-token"
          label="Token"
          description="Personal access token"
          value="abc"
          onChange={onChange}
          type="password"
        />
      );
    });

    const input = container.querySelector("#vercel-token") as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect(input?.type).toBe("password");
    expect(input?.value).toBe("abc");

    act(() => {
      if (!input) return;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      nativeInputValueSetter?.call(input, "xyz");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // React 19 synthetic onChange path via property setter + input event
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last).toBe("xyz");
  });
});
