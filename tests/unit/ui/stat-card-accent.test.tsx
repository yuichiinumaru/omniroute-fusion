// @vitest-environment jsdom
/**
 * Task 0028 — StatCard optional accent bar is backward-compatible (default none).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => {
    const t = (key: string) => key;
    return t;
  },
}));

import { StatCard } from "@/shared/components/analytics/charts";

describe("StatCard accent bar (Task 0028)", () => {
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

  it("renders without accent bar when accent is omitted (backward compatible)", () => {
    act(() => {
      root.render(<StatCard label="Requests" value={42} />);
    });
    expect(container.querySelector("[data-statcard-accent]")).toBeNull();
    expect(container.textContent).toContain("Requests");
    expect(container.textContent).toContain("42");
  });

  it("renders top accent bar when accent is set", () => {
    act(() => {
      root.render(<StatCard label="Cost" value="$1.20" accent="warning" icon="payments" />);
    });
    const bar = container.querySelector("[data-statcard-accent='warning']");
    expect(bar).toBeTruthy();
    expect(bar?.className).toMatch(/bg-amber-500/);
    expect(container.textContent).toContain("Cost");
    expect(container.textContent).toContain("$1.20");
  });

  it("supports compact density without breaking accent", () => {
    act(() => {
      root.render(<StatCard label="OK" value="1" accent="success" compact />);
    });
    const bar = container.querySelector("[data-statcard-accent='success']");
    expect(bar).toBeTruthy();
    expect(bar?.className).toMatch(/bg-green-500/);
  });

  it("info accent uses primary track (aligned with STATUS_TONE_ACCENT_CLASS)", () => {
    act(() => {
      root.render(<StatCard label="Active" value="3" accent="info" />);
    });
    const bar = container.querySelector("[data-statcard-accent='info']");
    expect(bar).toBeTruthy();
    expect(bar?.className).toMatch(/bg-primary/);
    expect(bar?.className).not.toMatch(/bg-blue-500/);
  });
});
