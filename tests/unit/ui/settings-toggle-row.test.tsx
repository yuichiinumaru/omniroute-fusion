// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsToggleRow from "@/shared/components/SettingsToggleRow";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("SettingsToggleRow", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
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

  it("renders label + description and toggles via shared switch", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <SettingsToggleRow
          label="Management access"
          description="Allow this key to call management APIs"
          checked={false}
          onChange={onChange}
        />
      );
    });

    expect(container.textContent).toContain("Management access");
    expect(container.textContent).toContain("Allow this key to call management APIs");

    const sw = container.querySelector('[role="switch"]') as HTMLButtonElement | null;
    expect(sw).toBeTruthy();
    expect(sw?.getAttribute("aria-checked")).toBe("false");

    act(() => {
      sw?.click();
    });
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
