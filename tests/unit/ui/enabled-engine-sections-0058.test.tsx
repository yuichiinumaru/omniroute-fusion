// @vitest-environment jsdom
/**
 * Task 0058 — EnabledEngineSections composition under context settings.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Keep EngineConfigPage / custom clients light so this test only asserts
// composition + enable filtering.
vi.mock("@/shared/components/compression/EngineConfigPage", () => ({
  EngineConfigPage: ({ engineId }: { engineId: string }) => (
    <div data-testid={`mock-engine-config-${engineId}`}>engine:{engineId}</div>
  ),
}));

vi.mock(
  "../../../src/app/(dashboard)/dashboard/context/caveman/CavemanContextPageClient",
  () => ({
    default: () => <div data-testid="mock-caveman">caveman</div>,
  })
);

vi.mock("../../../src/app/(dashboard)/dashboard/context/rtk/RtkContextPageClient", () => ({
  default: () => <div data-testid="mock-rtk">rtk</div>,
}));

const containers: HTMLElement[] = [];
const roots: Array<{ unmount: () => void }> = [];

function mountInContainer(ui: React.ReactElement): HTMLElement {
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

function mockCompressionFetch(engines: Record<string, { enabled: boolean }>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = input.toString();
    if (url.includes("/api/settings/compression")) {
      return new Response(JSON.stringify({ enabled: true, engines }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("EnabledEngineSections (Task 0058)", () => {
  it("renders nothing extra when no engines are enabled", async () => {
    mockCompressionFetch({
      lite: { enabled: false },
      caveman: { enabled: false },
      rtk: { enabled: false },
    });

    const { default: EnabledEngineSections } = await import(
      "../../../src/app/(dashboard)/dashboard/context/settings/EnabledEngineSections"
    );

    let container!: HTMLElement;
    await act(async () => {
      container = mountInContainer(<EnabledEngineSections />);
    });
    await flush();

    expect(container.querySelector('[data-testid="enabled-engine-sections"]')).toBeNull();
    expect(container.querySelector('[data-testid="enabled-engine-sections-loading"]')).toBeNull();
  });

  it("renders only enabled engines in catalog order", async () => {
    // Enable rtk + lite + caveman; catalog order is lite (5) < rtk (10) < caveman (20)
    mockCompressionFetch({
      rtk: { enabled: true },
      caveman: { enabled: true },
      lite: { enabled: true },
      ultra: { enabled: false },
    });

    const { default: EnabledEngineSections } = await import(
      "../../../src/app/(dashboard)/dashboard/context/settings/EnabledEngineSections"
    );

    let container!: HTMLElement;
    await act(async () => {
      container = mountInContainer(<EnabledEngineSections />);
    });
    await flush();

    const root = container.querySelector('[data-testid="enabled-engine-sections"]');
    expect(root).toBeTruthy();

    const sections = Array.from(
      container.querySelectorAll("[data-testid^='enabled-engine-section-']")
    );
    const ids = sections.map((el) => el.getAttribute("data-engine-id"));
    expect(ids).toEqual(["lite", "rtk", "caveman"]);

    expect(container.querySelector('[data-testid="mock-engine-config-lite"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="mock-rtk"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="mock-caveman"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="mock-engine-config-ultra"]')).toBeNull();
  });

  it("shows an error state when settings fetch fails (fail-soft)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const { default: EnabledEngineSections } = await import(
      "../../../src/app/(dashboard)/dashboard/context/settings/EnabledEngineSections"
    );

    let container!: HTMLElement;
    await act(async () => {
      container = mountInContainer(<EnabledEngineSections />);
    });
    await flush();

    expect(container.querySelector('[data-testid="enabled-engine-sections-error"]')).toBeTruthy();
  });
});
