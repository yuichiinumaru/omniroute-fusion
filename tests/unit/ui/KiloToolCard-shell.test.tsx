// @vitest-environment jsdom
/**
 * Pilot regression smoke: KiloToolCard mounts on ConfigurableToolCard shell.
 */
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    const { alt, src, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img alt={alt ?? ""} src={typeof src === "string" ? src : ""} {...rest} />;
  },
}));

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

const { default: KiloToolCard } =
  await import("@/app/(dashboard)/dashboard/cli-code/components/KiloToolCard");

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
    if (String(url).includes("kilo-settings")) {
      return {
        ok: true,
        json: async () => ({
          installed: true,
          runnable: true,
          hasOmniRoute: true,
          commandPath: "/usr/bin/kilo",
          authPath: "/home/user/.kilo/auth.json",
          settings: { auth: ["openai"] },
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

describe("KiloToolCard pilot (ConfigurableToolCard shell)", () => {
  it("renders header chrome via shell (collapsed)", () => {
    const container = render(
      <KiloToolCard
        tool={{ name: "Kilo Code", id: "kilo", color: "#00a" }}
        isExpanded={false}
        onToggle={() => {}}
        hasActiveProviders
        apiKeys={[{ id: "k1", key: "sk-****" }]}
        activeProviders={[]}
      />
    );

    expect(container.querySelector("[data-testid='kilo-tool-card']")).not.toBeNull();
    expect(container.textContent).toContain("Kilo Code");
    expect(container.textContent).toContain("toolDescriptions.kilo");
    expect(container.querySelector("[data-testid='kilo-tool-card-expanded']")).toBeNull();
  });

  it("loads status and shows runtime + apply actions when expanded", async () => {
    const container = render(
      <KiloToolCard
        tool={{ name: "Kilo Code", id: "kilo" }}
        isExpanded
        onToggle={() => {}}
        hasActiveProviders
        apiKeys={[{ id: "k1", key: "sk-****" }]}
        activeProviders={[]}
      />
    );

    // allow effects + fetch
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(container.querySelector("[data-testid='kilo-tool-card-expanded']")).not.toBeNull();
    expect(
      container.querySelector("[data-testid='configurable-tool-card-runtime']")
    ).not.toBeNull();
    expect(
      container.querySelector("[data-testid='configurable-tool-card-actions']")
    ).not.toBeNull();
    expect(container.querySelector("[data-testid='configurable-tool-card-apply']")).not.toBeNull();
    expect(container.textContent).toContain("/usr/bin/kilo");
  });

  it("invokes onToggle via shell header", () => {
    const onToggle = vi.fn();
    const container = render(
      <KiloToolCard
        tool={{ name: "Kilo Code" }}
        isExpanded={false}
        onToggle={onToggle}
        hasActiveProviders={false}
      />
    );
    const header = container.querySelector("[data-testid='kilo-tool-card-header']") as HTMLElement;
    act(() => {
      header.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("disables apply when no model is selected (Actions wiring)", async () => {
    const container = render(
      <KiloToolCard
        tool={{ name: "Kilo Code", id: "kilo" }}
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

    const apply = container.querySelector(
      "[data-testid='configurable-tool-card-apply']"
    ) as HTMLButtonElement | null;
    expect(apply).not.toBeNull();
    expect(apply?.disabled).toBe(true);

    // Click must not POST apply while disabled.
    const postCallsBefore = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url).includes("kilo-settings") &&
        (init as RequestInit | undefined)?.method === "POST"
    ).length;
    act(() => {
      apply?.click();
    });
    const postCallsAfter = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url).includes("kilo-settings") &&
        (init as RequestInit | undefined)?.method === "POST"
    ).length;
    expect(postCallsAfter).toBe(postCallsBefore);
  });
});
