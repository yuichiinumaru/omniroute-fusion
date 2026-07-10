// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => (key === "nothingHere" ? "Nothing here" : key);
    return t;
  },
}));

import EmptyState from "@/shared/components/EmptyState";

describe("EmptyState (token-aware)", () => {
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

  it("uses design-token utility classes instead of dead CSS vars", () => {
    act(() => {
      root.render(
        <EmptyState
          icon="inbox"
          title="No rows"
          description="Try another filter"
          actionLabel="Reset"
          onAction={() => {}}
        />
      );
    });

    const html = container.innerHTML;
    expect(html).not.toContain("--text-primary");
    expect(html).not.toContain("--text-secondary");
    expect(container.textContent).toContain("No rows");
    expect(container.textContent).toContain("Try another filter");
    expect(container.querySelector("button")).toBeTruthy();
    expect(container.querySelector(".material-symbols-outlined")?.textContent).toBe("inbox");
  });
});
