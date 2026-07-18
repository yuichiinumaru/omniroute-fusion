// @vitest-environment jsdom
/**
 * Task 0028 — Badge status vocabulary + glow prop surface.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import Badge from "@/shared/components/Badge";

describe("Badge status + glow (Task 0028)", () => {
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

  it("resolves status to vocabulary badge variant classes", () => {
    act(() => {
      root.render(<Badge status="degraded">Degraded</Badge>);
    });
    const el = container.querySelector("[data-status='degraded']");
    expect(el).toBeTruthy();
    expect(el?.className).toMatch(/bg-amber-500\/10/);
    expect(el?.className).toMatch(/text-amber/);
    expect(container.textContent).toContain("Degraded");
  });

  it("explicit variant wins over status (backward compatible)", () => {
    act(() => {
      root.render(
        <Badge status="offline" variant="success">
          Override
        </Badge>
      );
    });
    const el = container.querySelector("[data-status='offline']");
    expect(el).toBeTruthy();
    // status still recorded for a11y/debug, but success styling applied
    expect(el?.className).toMatch(/bg-green-500\/10/);
    expect(el?.className).not.toMatch(/bg-red-500\/10/);
  });

  it("glow is a no-op for neutral statuses", () => {
    act(() => {
      root.render(
        <Badge status="unknown" glow>
          Unknown
        </Badge>
      );
    });
    const el = container.querySelector("[data-status='unknown']");
    expect(el).toBeTruthy();
    // Neutral statuses never receive status-glow-* (or arbitrary shadow utilities).
    expect(el?.className).not.toMatch(/status-glow-/);
    expect(el?.className).not.toMatch(/shadow-\[/);
  });

  it("glow applies soft status-glow utility for critical breaker states", () => {
    act(() => {
      root.render(
        <Badge status="OPEN" glow>
          CB OPEN
        </Badge>
      );
    });
    const el = container.querySelector("[data-status='circuit_open']");
    expect(el).toBeTruthy();
    // Glow is a CSS class (status-glow-danger), not an inline Tailwind shadow-[…].
    expect(el?.className).toMatch(/status-glow-danger/);
    expect(el?.className).not.toMatch(/shadow-\[/);
  });

  it("info status uses primary (coreCyan) track, not legacy blue", () => {
    act(() => {
      root.render(<Badge status="info">Info</Badge>);
    });
    const el = container.querySelector("[data-status='info']");
    expect(el).toBeTruthy();
    expect(el?.className).toMatch(/bg-primary\/10/);
    expect(el?.className).toMatch(/text-primary/);
    expect(el?.className).not.toMatch(/bg-blue-500/);
  });
});
