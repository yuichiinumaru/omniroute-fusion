// @vitest-environment jsdom
/**
 * Pilot regression smoke: ClineToolCard mounts on ConfigurableToolCard shell.
 */
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => {
      if (values?.tool) return `${key}:${String(values.tool)}`;
      return key;
    };
    return t;
  },
  useLocale: () => "en",
}));

vi.mock("@/shared/hooks", () => ({
  DEFAULT_DISPLAY_BASE_URL: "http://localhost:20128",
}));

vi.mock("@/shared/components/ProviderIcon", () => ({
  default: ({ providerId }: { providerId: string }) => (
    <span data-testid="provider-icon">{providerId}</span>
  ),
}));

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
      {children}
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
  const ModelSelectModal = () => null;
  const ManualConfigModal = () => null;
  return { Button, Card, ModelSelectModal, ManualConfigModal };
});

vi.mock("@/app/(dashboard)/dashboard/cli-code/components/CliStatusBadge", () => ({
  default: ({ effectiveConfigStatus }: { effectiveConfigStatus: string | null }) => (
    <span data-testid="status-badge">{effectiveConfigStatus ?? "none"}</span>
  ),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const { default: ClineToolCard } =
  await import("@/app/(dashboard)/dashboard/cli-code/components/ClineToolCard");

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
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).includes("cline-settings")) {
      return {
        ok: true,
        json: async () => ({
          installed: true,
          runnable: true,
          hasOmniRoute: true,
          commandPath: "/usr/bin/cline",
          globalStatePath: "/home/user/.cline/state.json",
          settings: {
            openAiBaseUrl: "http://localhost:20128/v1",
            openAiModelId: "glm/glm-5.2",
          },
        }),
      };
    }
    if (String(url).includes("backups")) {
      return { ok: true, json: async () => ({ backups: [] }) };
    }
    return { ok: true, json: async () => ({}) };
  });
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

describe("ClineToolCard pilot (ConfigurableToolCard shell)", () => {
  it("renders header chrome via shell (collapsed)", () => {
    const container = render(
      <ClineToolCard
        tool={{ name: "Cline", id: "cline" }}
        isExpanded={false}
        onToggle={() => {}}
        hasActiveProviders
        apiKeys={[{ id: "k1", key: "sk-****" }]}
        activeProviders={[]}
      />
    );

    expect(container.querySelector("[data-testid='cline-tool-card']")).not.toBeNull();
    expect(container.textContent).toContain("Cline");
    expect(container.textContent).toContain("toolDescriptions.cline");
    expect(container.querySelector("[data-testid='provider-icon']")?.textContent).toBe("cline");
    expect(container.querySelector("[data-testid='cline-tool-card-expanded']")).toBeNull();
  });

  it("loads status and shows runtime + apply + configured banner when expanded", async () => {
    const container = render(
      <ClineToolCard
        tool={{ name: "Cline", id: "cline" }}
        isExpanded
        onToggle={() => {}}
        hasActiveProviders
        apiKeys={[{ id: "k1", key: "sk-****" }]}
        activeProviders={[]}
      />
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(container.querySelector("[data-testid='cline-tool-card-expanded']")).not.toBeNull();
    expect(
      container.querySelector("[data-testid='configurable-tool-card-runtime']")
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='configurable-tool-card-configured']")
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='configurable-tool-card-actions']")
    ).not.toBeNull();
    expect(container.textContent).toContain("/usr/bin/cline");
    expect(container.textContent).toContain("glm/glm-5.2");
  });

  it("invokes onToggle via shell header", () => {
    const onToggle = vi.fn();
    const container = render(
      <ClineToolCard
        tool={{ name: "Cline", id: "cline" }}
        isExpanded={false}
        onToggle={onToggle}
        hasActiveProviders={false}
      />
    );
    const header = container.querySelector("[data-testid='cline-tool-card-header']") as HTMLElement;
    act(() => {
      header.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
