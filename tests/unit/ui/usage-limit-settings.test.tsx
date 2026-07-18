// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const messages: Record<string, string> = {
      usdUsageQuota: "USD usage quota",
      usdUsageQuotaDesc:
        "Blocks this key with a 400 API error after its local USD spend reaches the configured daily or weekly quota.",
      dailyQuotaUsd: "Daily quota (USD)",
      weeklyQuotaUsd: "Weekly quota (USD)",
      usageQuotaWindowHint:
        "Weekly quota follows the cached Claude weekly reset when available; otherwise it falls back to a rolling 7 day window. Daily quota uses the Fortaleza calendar day.",
    };
    return (key: string) => messages[key] ?? key;
  },
}));

const { UsageLimitSettings } = await import(
  "@/app/(dashboard)/dashboard/api-manager/components/UsageLimitSettings"
);

describe("UsageLimitSettings", () => {
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

  it("renders SettingsToggleRow switch with label and toggles via shared role=switch", () => {
    const onEnabledChange = vi.fn();
    act(() => {
      root.render(
        <UsageLimitSettings
          enabled={false}
          dailyLimitUsd="1.00"
          weeklyLimitUsd="5.00"
          onEnabledChange={onEnabledChange}
          onDailyLimitUsdChange={vi.fn()}
          onWeeklyLimitUsdChange={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain("USD usage quota");
    expect(container.textContent).toContain("Daily quota (USD)");
    expect(container.textContent).toContain("Weekly quota (USD)");

    const sw = container.querySelector('[role="switch"]') as HTMLButtonElement | null;
    expect(sw).toBeTruthy();
    expect(sw?.getAttribute("aria-checked")).toBe("false");
    expect(sw?.getAttribute("aria-label")).toBe("USD usage quota");
    expect(sw?.type).toBe("button");

    act(() => {
      sw?.click();
    });
    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });

  it("reflects checked state when enabled", () => {
    act(() => {
      root.render(
        <UsageLimitSettings
          enabled={true}
          dailyLimitUsd=""
          weeklyLimitUsd=""
          onEnabledChange={vi.fn()}
          onDailyLimitUsdChange={vi.fn()}
          onWeeklyLimitUsdChange={vi.fn()}
        />
      );
    });

    const sw = container.querySelector('[role="switch"]') as HTMLButtonElement | null;
    expect(sw?.getAttribute("aria-checked")).toBe("true");
  });
});
