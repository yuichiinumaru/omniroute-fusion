// @vitest-environment jsdom
/**
 * Task 0058 F2 — Caveman embedded chrome: no Advanced CompressionSettingsTab dual-editor.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/shared/components", () => ({
  SegmentedControl: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <div data-testid="segmented-control">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-testid={`seg-${opt.value}`}
          data-active={value === opt.value ? "true" : "false"}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/app/(dashboard)/dashboard/settings/components/CompressionSettingsTab", () => ({
  default: () => <div data-testid="compression-settings-tab">legacy-settings-tab</div>,
}));

const containers: HTMLElement[] = [];
const roots: Array<{ unmount: () => void }> = [];

function mount(ui: React.ReactElement): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => {
    root.render(ui);
  });
  return container;
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => {
    while (roots.length > 0) {
      roots.pop()?.unmount();
    }
  });
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
  while (containers.length > 0) {
    containers.pop()?.remove();
  }
  document.body.innerHTML = "";
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("CavemanContextPageClient embedded (Task 0058 F2)", () => {
  it("standalone: Advanced mounts CompressionSettingsTab", async () => {
    const { default: Caveman } = await import(
      "../../../src/app/(dashboard)/dashboard/context/caveman/CavemanContextPageClient"
    );

    let container!: HTMLElement;
    await act(async () => {
      container = mount(<Caveman />);
    });
    await flush();

    expect(container.querySelector('[data-caveman-embedded="false"]')).toBeTruthy();
    expect(container.querySelector("h1")).toBeTruthy();

    const advanced = container.querySelector('[data-testid="seg-advanced"]') as HTMLButtonElement;
    expect(advanced).toBeTruthy();
    await act(async () => {
      advanced.click();
    });
    await flush();

    expect(container.querySelector('[data-testid="compression-settings-tab"]')).toBeTruthy();
  });

  it("embedded: hides page h1 and never mounts CompressionSettingsTab", async () => {
    const { default: Caveman } = await import(
      "../../../src/app/(dashboard)/dashboard/context/caveman/CavemanContextPageClient"
    );

    let container!: HTMLElement;
    await act(async () => {
      container = mount(<Caveman embedded />);
    });
    await flush();

    expect(container.querySelector('[data-caveman-embedded="true"]')).toBeTruthy();
    expect(container.querySelector("h1")).toBeNull();
    // SegmentedControl (Advanced entry) is standalone-only chrome.
    expect(container.querySelector('[data-testid="segmented-control"]')).toBeNull();
    expect(container.querySelector('[data-testid="compression-settings-tab"]')).toBeNull();
    // Embedded demotes section titles to presentational <p> (no inverted h2 under settings h3).
    expect(container.querySelector("h2")).toBeNull();
  });
});
