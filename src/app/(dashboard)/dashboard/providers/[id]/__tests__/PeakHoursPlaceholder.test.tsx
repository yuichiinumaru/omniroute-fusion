// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PeakHoursPlaceholderCard from "../components/PeakHoursPlaceholderCard";
import ProviderPageHeader from "../components/ProviderPageHeader";
import ProviderDetailPageClient from "../ProviderDetailPageClient";

const mockParams = { id: "openai" };

vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => `/dashboard/providers/${mockParams.id}`,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) => (namespace ? `${namespace}.${key}` : key),
}));

const t = ((key: string) => key) as any;
t.has = () => false;

const cleanupCallbacks: Array<() => void> = [];

function emptyJsonResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => "",
    headers: { get: () => null },
  } as unknown as Response;
}

const mockProviderNode = {
  id: "zai",
  prefix: "zai",
};

describe("Peak Hours Bootstrap (Task 0137)", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation((input: any) => {
      const url = typeof input === "string" ? input : input?.url || "";
      if (url.includes("/api/providers/node/")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockProviderNode,
          headers: { get: () => null },
        } as unknown as Response);
      }
      return Promise.resolve(emptyJsonResponse());
    });
    vi.stubGlobal("fetch", fetchMock);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    while (cleanupCallbacks.length > 0) cleanupCallbacks.pop()?.();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders PeakHoursPlaceholderCard correctly", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    
    act(() => {
      root.render(<PeakHoursPlaceholderCard t={t} />);
    });
    cleanupCallbacks.push(() => {
      act(() => root.unmount());
      el.remove();
    });

    expect(el.textContent).toContain("Peak Hours");
    expect(el.textContent).toContain("zai-peak-hours");
    const link = el.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://github.com/Icaruk/zai-peak-hours");
  });

  it("renders Peak Hours link in ProviderPageHeader for zai provider", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    const providerInfo = {
      id: "zai",
      name: "zai",
      color: "#000",
    };

    act(() => {
      root.render(
        <ProviderPageHeader
          providerId="zai"
          providerInfo={providerInfo}
          connectionsCount={0}
          isOpenAICompatible={false}
          isAnthropicProtocolCompatible={false}
          onOpenTutorial={vi.fn()}
          t={t}
        />
      );
    });
    cleanupCallbacks.push(() => {
      act(() => root.unmount());
      el.remove();
    });

    const link = el.querySelector('a[href="#peak-hours"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Peak Hours");
  });

  it("does not render Peak Hours link in ProviderPageHeader for other providers", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    const providerInfo = {
      id: "openai",
      name: "OpenAI",
      color: "#000",
    };

    act(() => {
      root.render(
        <ProviderPageHeader
          providerId="openai"
          providerInfo={providerInfo}
          connectionsCount={0}
          isOpenAICompatible={false}
          isAnthropicProtocolCompatible={false}
          onOpenTutorial={vi.fn()}
          t={t}
        />
      );
    });
    cleanupCallbacks.push(() => {
      act(() => root.unmount());
      el.remove();
    });

    const link = el.querySelector('a[href="#peak-hours"]');
    expect(link).toBeNull();
  });
});
