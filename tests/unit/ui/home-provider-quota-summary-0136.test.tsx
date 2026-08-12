// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProviderQuotaWidget from "../../../src/app/(dashboard)/home/ProviderQuotaWidget";
import type { ProviderQuotaSummaryResponse } from "../../../src/shared/contracts/quota";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/components/Card", () => ({
  default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section data-testid="card" className={className}>
      {children}
    </section>
  ),
}));

vi.mock("@/shared/components/ProviderIcon", () => ({
  default: ({ providerId }: { providerId: string }) => (
    <span data-testid={`icon-${providerId}`}>{providerId}</span>
  ),
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root.unmount();
    });
  }
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
});

describe("Task 0136: Home Provider Quota Summary UI & Anti-Phantom Chrome", () => {
  it("renders top-six provider quota summary items with canonical names and account counts", async () => {
    const summaryData: ProviderQuotaSummaryResponse = {
      providers: [
        {
          providerId: "antigravity",
          providerName: "Antigravity",
          activeAccountCount: 2,
          hasKnownQuota: true,
          percentRemaining: 70,
          isExhausted: false,
          resetAt: null,
          fetchedAt: "2026-08-06T10:00:00Z",
        },
        {
          providerId: "codex",
          providerName: "OpenAI Codex",
          activeAccountCount: 1,
          hasKnownQuota: true,
          percentRemaining: 40,
          isExhausted: false,
          resetAt: null,
          fetchedAt: "2026-08-06T10:00:00Z",
        },
      ],
      meta: {
        generatedAt: "2026-08-06T10:00:00Z",
        totalActiveConnections: 3,
        totalProviders: 2,
        cappedAt: 6,
      },
    };

    await act(async () => {
      root.render(<ProviderQuotaWidget summaryData={summaryData} />);
    });

    expect(container.textContent).toContain("Provider Quota Summary");
    expect(container.querySelector("[data-testid='quota-summary-item-antigravity']")).not.toBeNull();
    expect(container.querySelector("[data-testid='quota-summary-item-codex']")).not.toBeNull();

    const antiCount = container.querySelector("[data-testid='account-count-antigravity']");
    expect(antiCount?.textContent).toContain("2 accs");

    const codexCount = container.querySelector("[data-testid='account-count-codex']");
    expect(codexCount?.textContent).toContain("1 acc");

    expect(container.textContent).toContain("70% remaining");
    expect(container.textContent).toContain("40% remaining");

    // Anti-phantom chrome check: no PageTabBar or role="tablist"
    const tablists = container.querySelectorAll("[role='tablist'], [data-testid='page-tab-bar']");
    expect(tablists.length).toBe(0);
  });

  it("handles unknown quota without claiming 100% or 0%", async () => {
    const summaryData: ProviderQuotaSummaryResponse = {
      providers: [
        {
          providerId: "openai",
          providerName: "OpenAI",
          activeAccountCount: 1,
          hasKnownQuota: false,
          percentRemaining: null,
          isExhausted: false,
          resetAt: null,
          fetchedAt: null,
        },
      ],
      meta: {
        generatedAt: "2026-08-06T10:00:00Z",
        totalActiveConnections: 1,
        totalProviders: 1,
        cappedAt: 6,
      },
    };

    await act(async () => {
      root.render(<ProviderQuotaWidget summaryData={summaryData} />);
    });

    expect(container.querySelector("[data-testid='unknown-quota-openai']")).not.toBeNull();
    expect(container.textContent).toContain("Unknown quota");
    expect(container.textContent).not.toContain("100% remaining");
    expect(container.textContent).not.toContain("0% remaining");
  });

  it("renders empty state when no providers connected", async () => {
    const summaryData: ProviderQuotaSummaryResponse = {
      providers: [],
      meta: {
        generatedAt: "2026-08-06T10:00:00Z",
        totalActiveConnections: 0,
        totalProviders: 0,
        cappedAt: 6,
      },
    };

    await act(async () => {
      root.render(<ProviderQuotaWidget summaryData={summaryData} />);
    });

    expect(container.querySelector("[data-testid='quota-summary-empty']")).not.toBeNull();
    expect(container.textContent).toContain("No Connected Providers");
  });

  it("caps rendering at six items max", async () => {
    const sixProviders = Array.from({ length: 6 }, (_, i) => ({
      providerId: `p${i + 1}`,
      providerName: `Provider ${i + 1}`,
      activeAccountCount: 1,
      hasKnownQuota: true,
      percentRemaining: 80 - i * 5,
      isExhausted: false,
      resetAt: null,
      fetchedAt: null,
    }));

    const summaryData: ProviderQuotaSummaryResponse = {
      providers: sixProviders,
      meta: {
        generatedAt: "2026-08-06T10:00:00Z",
        totalActiveConnections: 6,
        totalProviders: 8,
        cappedAt: 6,
      },
    };

    await act(async () => {
      root.render(<ProviderQuotaWidget summaryData={summaryData} />);
    });

    const items = container.querySelectorAll("[data-testid^='quota-summary-item-']");
    expect(items.length).toBe(6);
  });
});
