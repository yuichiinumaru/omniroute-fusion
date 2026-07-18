// @vitest-environment jsdom
/**
 * Behavioral coverage for Task 0027: ApiManager settings rows use shared Toggle
 * via SettingsToggleRow (create-key self-service cluster pattern).
 */
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SettingsToggleRow from "@/shared/components/SettingsToggleRow";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function CreateKeySelfServiceCluster() {
  const [manageEnabled, setManageEnabled] = useState(false);
  const [selfUsageEnabled, setSelfUsageEnabled] = useState(true);
  const [accountQuotaEnabled, setAccountQuotaEnabled] = useState(false);
  const [usageCommandEnabled, setUsageCommandEnabled] = useState(false);

  return (
    <div data-testid="create-key-cluster">
      <SettingsToggleRow
        label="Management access"
        description="Allow this key to call management APIs"
        checked={manageEnabled}
        onChange={setManageEnabled}
      />
      <SettingsToggleRow
        label="Own usage visibility"
        description="See own usage"
        checked={selfUsageEnabled}
        onChange={(checked) => {
          setSelfUsageEnabled(checked);
          if (!checked) setAccountQuotaEnabled(false);
        }}
      />
      <SettingsToggleRow
        label="Shared account quota visibility"
        description="See shared quotas"
        checked={accountQuotaEnabled}
        disabled={!selfUsageEnabled}
        onChange={setAccountQuotaEnabled}
      />
      <SettingsToggleRow
        label="Local usage command"
        description="Allow @@om-usage"
        checked={usageCommandEnabled}
        onChange={setUsageCommandEnabled}
      />
    </div>
  );
}

describe("ApiManager SettingsToggleRow migration cluster", () => {
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

  it("renders four labeled switches with type=button and aria-labels", () => {
    act(() => {
      root.render(<CreateKeySelfServiceCluster />);
    });

    const switches = Array.from(
      container.querySelectorAll('[role="switch"]')
    ) as HTMLButtonElement[];
    expect(switches).toHaveLength(4);
    for (const sw of switches) {
      expect(sw.type).toBe("button");
      expect(sw.getAttribute("aria-label")).toBeTruthy();
    }

    expect(switches[0].getAttribute("aria-label")).toBe("Management access");
    expect(switches[0].getAttribute("aria-checked")).toBe("false");
    expect(switches[1].getAttribute("aria-checked")).toBe("true");
  });

  it("clears dependent account-quota when own-usage is turned off", () => {
    act(() => {
      root.render(<CreateKeySelfServiceCluster />);
    });

    const switches = () =>
      Array.from(container.querySelectorAll('[role="switch"]')) as HTMLButtonElement[];

    // Enable account quota (depends on self-usage which starts true)
    act(() => {
      switches()[2].click();
    });
    expect(switches()[2].getAttribute("aria-checked")).toBe("true");
    expect(switches()[2].disabled).toBe(false);

    // Turn off own-usage → account quota clears + disables
    act(() => {
      switches()[1].click();
    });
    expect(switches()[1].getAttribute("aria-checked")).toBe("false");
    expect(switches()[2].getAttribute("aria-checked")).toBe("false");
    expect(switches()[2].disabled).toBe(true);
  });

  it("toggles management access on click", () => {
    act(() => {
      root.render(<CreateKeySelfServiceCluster />);
    });

    const manage = container.querySelector(
      '[role="switch"][aria-label="Management access"]'
    ) as HTMLButtonElement;
    act(() => {
      manage.click();
    });
    expect(manage.getAttribute("aria-checked")).toBe("true");
  });
});
