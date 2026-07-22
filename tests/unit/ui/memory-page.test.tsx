// @vitest-environment jsdom
/**
 * Memory single-page stack (EPIC-20 T20-J / Task 0095).
 * Tab topbar removed — sections stacked with Collapsible.
 */
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
    toString: () => "",
  }),
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values) {
      return `${key}:${JSON.stringify(values)}`;
    }
    return key;
  },
  getTranslations: () => async (key: string) => key,
}));

vi.mock("swr", () => ({
  default: () => ({ data: null, error: null, isLoading: false, mutate: vi.fn() }),
}));

vi.mock(
  "../../../src/app/(dashboard)/dashboard/memory/components/MemoryConceptCard",
  () => ({
    default: () => React.createElement("div", { "data-testid": "concept-card" }, "ConceptCard"),
  }),
);

vi.mock(
  "../../../src/app/(dashboard)/dashboard/memory/components/tabs/MemoriesTab",
  () => ({
    default: () =>
      React.createElement("div", { "data-testid": "memories-tab-content" }, "MemoriesTab"),
  }),
);

vi.mock(
  "../../../src/app/(dashboard)/dashboard/memory/components/tabs/PlaygroundTab",
  () => ({
    default: () =>
      React.createElement("div", { "data-testid": "playground-tab-content" }, "PlaygroundTab"),
  }),
);

vi.mock(
  "../../../src/app/(dashboard)/dashboard/memory/components/tabs/EngineTab",
  () => ({
    default: () =>
      React.createElement("div", { "data-testid": "engine-tab-content" }, "EngineTab"),
  }),
);

vi.mock(
  "../../../src/app/(dashboard)/dashboard/memory/hooks/useMemorySettings",
  () => ({
    useMemorySettings: () => ({
      settings: { enabled: true },
      isLoading: false,
      isError: false,
      mutate: vi.fn(),
      save: vi.fn(async () => true),
    }),
  }),
);

const cleanupCallbacks: Array<() => void> = [];

function makeContainer(): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  cleanupCallbacks.push(() => container.remove());
  return container;
}

describe("MemoryPageClient (0095 single-scroll stack)", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    while (cleanupCallbacks.length > 0) cleanupCallbacks.pop()?.();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders section markers in Memories → Engine → Playground order", async () => {
    const { default: MemoryPageClient } = await import(
      "../../../src/app/(dashboard)/dashboard/memory/MemoryPageClient"
    );
    const container = makeContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(<MemoryPageClient />);
    });

    const sections = Array.from(container.querySelectorAll("[data-section]")).map((el) =>
      el.getAttribute("data-section")
    );
    expect(sections).toEqual(["memories", "engine", "playground", "concept"]);
  });

  it("does not mount tab-* L1 navigation buttons", async () => {
    const { default: MemoryPageClient } = await import(
      "../../../src/app/(dashboard)/dashboard/memory/MemoryPageClient"
    );
    const container = makeContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(<MemoryPageClient />);
    });
    for (const tab of ["memories", "playground", "engine"]) {
      expect(container.querySelector(`[data-testid='tab-${tab}']`)).toBeNull();
    }
  });

  it("defaults Memories expanded (content visible); Engine/Playground collapsed", async () => {
    const { default: MemoryPageClient } = await import(
      "../../../src/app/(dashboard)/dashboard/memory/MemoryPageClient"
    );
    const container = makeContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(<MemoryPageClient />);
    });
    expect(container.querySelector("[data-testid='memories-tab-content']")).toBeTruthy();
    // Collapsed sections do not mount children (Collapsible open && children)
    expect(container.querySelector("[data-testid='playground-tab-content']")).toBeNull();
    expect(container.querySelector("[data-testid='engine-tab-content']")).toBeNull();
    expect(container.querySelector("[data-testid='concept-card']")).toBeNull();
  });

  it("renders enable toggle", async () => {
    const { default: MemoryPageClient } = await import(
      "../../../src/app/(dashboard)/dashboard/memory/MemoryPageClient"
    );
    const container = makeContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(<MemoryPageClient />);
    });
    expect(container.querySelector("[data-testid='memory-enabled-toggle']")).toBeTruthy();
  });
});
