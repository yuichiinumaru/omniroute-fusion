// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components", () => {
  const Button = ({
    children,
    onClick,
    disabled,
    loading,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    variant?: string;
    size?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled || loading} {...props}>
      {loading ? "loading…" : children}
    </button>
  );
  const Card = ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { padding?: string }) => (
    <div className={className} {...props}>
      {children}
    </div>
  );
  return { Button, Card };
});

const { ConfigurableToolCard } = await import("@/shared/components/cli/ConfigurableToolCard");

const containers: HTMLElement[] = [];
const roots: Root[] = [];

function render(ui: React.ReactElement): HTMLElement {
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

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    act(() => {
      root?.unmount();
    });
  }
  while (containers.length > 0) {
    containers.pop()?.remove();
  }
  document.body.innerHTML = "";
});

describe("ConfigurableToolCard shell", () => {
  it("renders name, description, icon, and status badge in the header", () => {
    const container = render(
      <ConfigurableToolCard
        name="Kilo Code"
        description="VS Code extension"
        icon={<span data-testid="icon-slot">icon</span>}
        statusBadge={<span data-testid="badge-slot">configured</span>}
        isExpanded={false}
        onToggle={() => {}}
      />
    );

    expect(container.textContent).toContain("Kilo Code");
    expect(container.textContent).toContain("VS Code extension");
    expect(container.querySelector("[data-testid='icon-slot']")).not.toBeNull();
    expect(container.querySelector("[data-testid='badge-slot']")).not.toBeNull();
    expect(container.querySelector("[data-testid='configurable-tool-card-expanded']")).toBeNull();
  });

  it("calls onToggle when header is clicked", () => {
    const onToggle = vi.fn();
    const container = render(
      <ConfigurableToolCard name="Cline" isExpanded={false} onToggle={onToggle} />
    );

    const header = container.querySelector(
      "[data-testid='configurable-tool-card-header']"
    ) as HTMLElement;
    act(() => {
      header.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggle on Enter key in header", () => {
    const onToggle = vi.fn();
    const container = render(
      <ConfigurableToolCard name="Cline" isExpanded={false} onToggle={onToggle} />
    );

    const header = container.querySelector(
      "[data-testid='configurable-tool-card-header']"
    ) as HTMLElement;
    act(() => {
      header.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders expanded children and risk notice when isExpanded", () => {
    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded riskNotice={<div data-testid="risk">risk</div>}>
        <div data-testid="child-body">body</div>
      </ConfigurableToolCard>
    );

    expect(
      container.querySelector("[data-testid='configurable-tool-card-expanded']")
    ).not.toBeNull();
    expect(container.querySelector("[data-testid='risk']")).not.toBeNull();
    expect(container.querySelector("[data-testid='child-body']")).not.toBeNull();
    expect(container.textContent).toContain("body");
  });

  it("renders Checking slot with label", () => {
    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.Checking label="Checking Kilo Code…" />
      </ConfigurableToolCard>
    );

    const checking = container.querySelector("[data-testid='configurable-tool-card-checking']");
    expect(checking).not.toBeNull();
    expect(checking?.textContent).toContain("Checking Kilo Code…");
  });

  it("renders RuntimeStatus ready state with paths", () => {
    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.RuntimeStatus
          ready
          title="CLI detected and ready"
          paths={[
            { label: "Binary", value: "/usr/bin/kilo" },
            { label: "Auth", value: "" },
          ]}
        />
      </ConfigurableToolCard>
    );

    const runtime = container.querySelector("[data-testid='configurable-tool-card-runtime']");
    expect(runtime?.getAttribute("data-ready")).toBe("true");
    expect(container.textContent).toContain("CLI detected and ready");
    expect(container.textContent).toContain("/usr/bin/kilo");
    // empty path values are omitted
    expect(container.textContent).not.toContain("Auth:");
  });

  it("renders RuntimeStatus not-ready state", () => {
    const container = render(
      <ConfigurableToolCard name="Cline" isExpanded>
        <ConfigurableToolCard.RuntimeStatus ready={false} title="CLI not detected" />
      </ConfigurableToolCard>
    );

    const runtime = container.querySelector("[data-testid='configurable-tool-card-runtime']");
    expect(runtime?.getAttribute("data-ready")).toBe("false");
    expect(container.textContent).toContain("CLI not detected");
  });

  it("renders ConfiguredBanner children", () => {
    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.ConfiguredBanner>
          <p>OmniRoute configured</p>
        </ConfigurableToolCard.ConfiguredBanner>
      </ConfigurableToolCard>
    );

    expect(
      container.querySelector("[data-testid='configurable-tool-card-configured']")
    ).not.toBeNull();
    expect(container.textContent).toContain("OmniRoute configured");
  });

  it("does not render Message when message is null", () => {
    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.Message message={null} />
      </ConfigurableToolCard>
    );
    expect(container.querySelector("[data-testid='configurable-tool-card-message']")).toBeNull();
  });

  it("renders success and error Message variants", () => {
    const success = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.Message message={{ type: "success", text: "Applied" }} />
      </ConfigurableToolCard>
    );
    const successMsg = success.querySelector("[data-testid='configurable-tool-card-message']");
    expect(successMsg?.getAttribute("data-type")).toBe("success");
    expect(successMsg?.textContent).toContain("Applied");

    const error = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.Message message={{ type: "error", text: "Failed" }} />
      </ConfigurableToolCard>
    );
    const errorMsg = error.querySelector("[data-testid='configurable-tool-card-message']");
    expect(errorMsg?.getAttribute("data-type")).toBe("error");
    expect(errorMsg?.textContent).toContain("Failed");
  });

  it("invokes apply callback and disables apply when applyDisabled", () => {
    const onApply = vi.fn();
    const onReset = vi.fn();
    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.Actions
          applyLabel="Apply"
          onApply={onApply}
          applyDisabled
          showReset
          resetLabel="Reset"
          onReset={onReset}
        />
      </ConfigurableToolCard>
    );

    const apply = container.querySelector(
      "[data-testid='configurable-tool-card-apply']"
    ) as HTMLButtonElement;
    const reset = container.querySelector(
      "[data-testid='configurable-tool-card-reset']"
    ) as HTMLButtonElement;

    expect(apply.disabled).toBe(true);
    act(() => {
      apply.click();
    });
    expect(onApply).not.toHaveBeenCalled();

    act(() => {
      reset.click();
    });
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("hides reset button when showReset is false", () => {
    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.Actions applyLabel="Apply" onApply={() => {}} showReset={false} />
      </ConfigurableToolCard>
    );
    expect(container.querySelector("[data-testid='configurable-tool-card-reset']")).toBeNull();
  });

  it("renders Field label and children", () => {
    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.Field label="Model" htmlFor="model-input">
          <input id="model-input" data-testid="model-input" />
        </ConfigurableToolCard.Field>
      </ConfigurableToolCard>
    );
    expect(container.textContent).toContain("Model");
    expect(container.querySelector("[data-testid='model-input']")).not.toBeNull();
    const label = container.querySelector(
      "[data-testid='configurable-tool-card-field'] label"
    ) as HTMLLabelElement | null;
    expect(label?.htmlFor).toBe("model-input");
  });

  it("toggles backups and restores via callbacks", () => {
    const onToggle = vi.fn();
    const onRestore = vi.fn();
    const backups = [
      {
        id: "b1",
        originalFile: "settings.json",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.Backups
          backups={backups}
          open={false}
          onToggle={onToggle}
          onRestore={onRestore}
          backupsLabel="Backups"
          restoreLabel="Restore"
          emptyLabel="No backups"
        />
      </ConfigurableToolCard>
    );

    const toggle = container.querySelector(
      "[data-testid='configurable-tool-card-backups-toggle']"
    ) as HTMLButtonElement;
    act(() => {
      toggle.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
    // closed: no rows
    expect(container.querySelector("[data-testid='configurable-tool-card-backup-row']")).toBeNull();

    // re-render open
    act(() => {
      const root = roots[roots.length - 1];
      root.render(
        <ConfigurableToolCard name="Kilo" isExpanded>
          <ConfigurableToolCard.Backups
            backups={backups}
            open
            onToggle={onToggle}
            onRestore={onRestore}
            backupsLabel="Backups"
            restoreLabel="Restore"
            emptyLabel="No backups"
          />
        </ConfigurableToolCard>
      );
    });

    expect(container.textContent).toContain("settings.json");
    const restore = container.querySelector(
      "[data-testid='configurable-tool-card-restore']"
    ) as HTMLButtonElement;
    act(() => {
      restore.click();
    });
    expect(onRestore).toHaveBeenCalledWith("b1");
  });

  it("shows empty backups label when open and empty", () => {
    const container = render(
      <ConfigurableToolCard name="Kilo" isExpanded>
        <ConfigurableToolCard.Backups
          backups={[]}
          open
          onToggle={() => {}}
          onRestore={() => {}}
          backupsLabel="Backups"
          restoreLabel="Restore"
          emptyLabel="No backups available"
        />
      </ConfigurableToolCard>
    );
    expect(
      container.querySelector("[data-testid='configurable-tool-card-backups-empty']")?.textContent
    ).toContain("No backups available");
  });
});
