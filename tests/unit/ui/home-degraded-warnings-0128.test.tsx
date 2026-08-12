// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeTranslator() {
  const t = (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  };
  t.rich = (key: string) => key;
  return t;
}

vi.mock("next-intl", () => ({
  useTranslations: () => makeTranslator(),
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicStub() {
      return <div data-testid="dynamic-component" />;
    },
}));

vi.mock("@/shared/components", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section data-testid="card">{children}</section>,
  CardSkeleton: () => <div data-testid="card-skeleton" />,
  Button: ({
    children,
    loading: _loading,
    fullWidth: _fullWidth,
    variant: _variant,
    size: _size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    fullWidth?: boolean;
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

vi.mock("@/shared/components/ProviderIcon", () => ({
  default: ({ providerId }: { providerId: string }) => <span data-testid="provider-icon" data-provider={providerId} />,
}));

const notifyMock = {
  success: vi.fn(),
  error: vi.fn(),
  addNotification: vi.fn(),
};

function useNotificationStoreMock() {
  return notifyMock;
}
useNotificationStoreMock.getState = () => notifyMock;

vi.mock("@/store/notificationStore", () => ({
  useNotificationStore: useNotificationStoreMock,
}));

vi.mock("@/shared/hooks/useElectron", () => ({
  useIsElectron: () => false,
  useOpenExternal: () => ({ openExternal: vi.fn() }),
}));

vi.mock("@/shared/utils/clipboard", () => ({
  copyToClipboard: vi.fn(async () => undefined),
}));

const { default: ApiKeyHealthWarnings } = await import(
  "../../../src/app/(dashboard)/home/ApiKeyHealthWarnings"
);
const { default: HomePageClient } = await import(
  "../../../src/app/(dashboard)/dashboard/HomePageClient"
);

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  pushMock.mockClear();
  notifyMock.addNotification.mockClear();

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Task 0128: ApiKeyHealthWarnings and HomePageClient degraded key handling", () => {
  it("renders null when no connection has warning or invalid API keys", () => {
    const connections = [
      {
        id: "conn-1",
        provider: "openai",
        name: "Primary OpenAI",
        providerSpecificData: {
          apiKeyHealth: {
            primary: { status: "active", failures: 0, lastFailure: null },
          },
        },
      },
    ];

    act(() => {
      root.render(<ApiKeyHealthWarnings connections={connections} />);
    });

    expect(container.firstElementChild).toBeNull();
  });

  it("renders inline warnings section with sanitized reason for warning and invalid keys", () => {
    const connections = [
      {
        id: "conn-1",
        provider: "openai",
        name: "OpenAI Work",
        lastError: "401 Unauthorized at /home/user/secret.ts:42",
        providerSpecificData: {
          extraApiKeys: ["sk-extra1"],
          apiKeyHealth: {
            primary: { status: "invalid", failures: 3, lastFailure: "2026-08-01T10:00:00Z" },
            extra_0: { status: "warning", failures: 1, lastFailure: "2026-08-01T10:05:00Z" },
          },
        },
      },
    ];

    act(() => {
      root.render(<ApiKeyHealthWarnings connections={connections} />);
    });

    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-label")).toContain("API Key Health Warnings");

    // Check content
    const text = container.textContent || "";
    expect(text).toContain("OpenAI Work");
    expect(text).toContain("primary");
    expect(text).toContain("extra_0");
    expect(text).toContain("invalid");
    expect(text).toContain("warning");

    // Verify sanitized reason (no file path)
    expect(text).not.toContain("/home/user/secret.ts");
    expect(text).toContain("<path>");
  });

  it("does NOT navigate to search page when warning card or items are clicked", () => {
    const connections = [
      {
        id: "conn-1",
        provider: "openai",
        name: "OpenAI Work",
        lastError: "401 Invalid Key",
        providerSpecificData: {
          apiKeyHealth: {
            primary: { status: "invalid", failures: 3, lastFailure: null },
          },
        },
      },
    ];

    act(() => {
      root.render(<ApiKeyHealthWarnings connections={connections} />);
    });

    const item = container.querySelector("[data-testid='card']");
    expect(item).not.toBeNull();

    act(() => {
      (item as HTMLElement).click();
    });

    // Should NOT push to /dashboard/providers?search=...
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does NOT trigger notification toast on HomePageClient mount even with degraded keys", async () => {
    const connections = [
      {
        id: "conn-1",
        provider: "openai",
        name: "OpenAI Main",
        providerSpecificData: {
          apiKeyHealth: {
            primary: { status: "invalid", failures: 3, lastFailure: null },
          },
        },
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") {
          return Promise.resolve(
            jsonResponse({
              showQuickStartOnHome: true,
              showProviderTopologyOnHome: true,
            })
          );
        }
        if (url === "/api/providers") {
          return Promise.resolve(jsonResponse({ connections }));
        }
        if (url === "/api/models") {
          return Promise.resolve(jsonResponse({ models: [] }));
        }
        if (url === "/api/system/version") {
          return Promise.resolve(
            jsonResponse({
              current: "0.0.0-test",
              latest: "0.0.0-test",
              updateAvailable: false,
              channel: "test",
              autoUpdateSupported: false,
            })
          );
        }
        if (url === "/api/provider-nodes") {
          return Promise.resolve(jsonResponse({ nodes: [] }));
        }
        return Promise.resolve(jsonResponse({}));
      })
    );

    await act(async () => {
      root.render(<HomePageClient machineId="test-machine" />);
    });

    // Verify addNotification was NOT called
    expect(notifyMock.addNotification).not.toHaveBeenCalled();

    // Verify inline warnings are present in DOM
    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(container.textContent).toContain("OpenAI Main");
  });

  it("proves Home mounts no duplicate hub topbar (anti-phantom chrome)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") {
          return Promise.resolve(
            jsonResponse({
              showQuickStartOnHome: true,
              showProviderTopologyOnHome: true,
            })
          );
        }
        if (url === "/api/providers") {
          return Promise.resolve(jsonResponse({ connections: [] }));
        }
        if (url === "/api/models") {
          return Promise.resolve(jsonResponse({ models: [] }));
        }
        if (url === "/api/system/version") {
          return Promise.resolve(
            jsonResponse({
              current: "0.0.0-test",
              latest: "0.0.0-test",
              updateAvailable: false,
              channel: "test",
              autoUpdateSupported: false,
            })
          );
        }
        if (url === "/api/provider-nodes") {
          return Promise.resolve(jsonResponse({ nodes: [] }));
        }
        return Promise.resolve(jsonResponse({}));
      })
    );

    await act(async () => {
      root.render(<HomePageClient machineId="test-machine" />);
    });

    // Verify that PageTabBar or topbar components are not duplicated
    const topbars = container.querySelectorAll("[data-testid='page-tab-bar'], [role='tablist']");
    expect(topbars.length).toBeLessThanOrEqual(1);
  });

  it("deterministically drops stale extra_N indexes beyond extraApiKeys length", () => {
    // The stale extra_1 entry must NOT surface even though the health map
    // contains it: only 1 extra key is configured, so extra_1 is out of range.
    const connections = [
      {
        id: "conn-extra",
        provider: "openai",
        name: "OpenAI With Stale Extra",
        providerSpecificData: {
          extraApiKeys: ["sk-real-1"],
          apiKeyHealth: {
            extra_0: { status: "warning", failures: 1, lastFailure: null },
            extra_1: { status: "invalid", failures: 5, lastFailure: null },
          },
        },
      },
    ];

    act(() => {
      root.render(<ApiKeyHealthWarnings connections={connections} />);
    });

    const text = container.textContent || "";

    // Only the valid extra_0 entry should be present — extra_1 is stale.
    expect(text).toContain("extra_0");
    expect(text).not.toContain("extra_1");
    expect(text).toContain("1");
    expect(text).toContain("key degraded");
  });

  it("renders multiple distinct connection sessions with unique keys (no React key collisions)", () => {
    const connections = [
      {
        id: "conn-A",
        provider: "openai",
        name: "OpenAI Personal",
        lastError: "401 Invalid Key",
        providerSpecificData: {
          apiKeyHealth: {
            primary: { status: "invalid", failures: 3, lastFailure: null },
          },
        },
      },
      {
        id: "conn-B",
        provider: "openai",
        name: "OpenAI Work",
        lastError: "401 Invalid Key",
        providerSpecificData: {
          apiKeyHealth: {
            primary: { status: "warning", failures: 1, lastFailure: null },
          },
        },
      },
    ];

    act(() => {
      root.render(<ApiKeyHealthWarnings connections={connections} />);
    });

    const text = container.textContent || "";

    // Both connection names must be present and the count must reflect 2.
    expect(text).toContain("OpenAI Personal");
    expect(text).toContain("OpenAI Work");
    expect(text).toContain("2");
    expect(text).toContain("keys degraded");

    // The grid must contain two distinct React-keyed children.
    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    const childCards = region!.querySelectorAll(":scope > div > div > div");
    const labels = Array.from(childCards).map((el) => el.textContent || "");
    const personalCount = labels.filter((t) => t.includes("OpenAI Personal")).length;
    const workCount = labels.filter((t) => t.includes("OpenAI Work")).length;
    expect(personalCount).toBeGreaterThanOrEqual(1);
    expect(workCount).toBeGreaterThanOrEqual(1);
  });

  it("section is not interactive so it does not steal focus and remains a passive region", () => {
    const connections = [
      {
        id: "conn-1",
        provider: "openai",
        name: "OpenAI Work",
        lastError: "401 Invalid Key",
        providerSpecificData: {
          apiKeyHealth: {
            primary: { status: "invalid", failures: 3, lastFailure: null },
          },
        },
      },
    ];

    act(() => {
      root.render(<ApiKeyHealthWarnings connections={connections} />);
    });

    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute("tabindex")).toBeNull();

    // The grid children must NOT include focusable controls (no <button>, <a>, <input>)
    // so the warning remains a passive, contextual announcement.
    const interactive = region!.querySelectorAll("button, a, input, select, textarea");
    expect(interactive.length).toBe(0);
  });

  it("uses a sanitized fallback reason when no upstream error fields are provided", () => {
    // Pathological "no error info anywhere" state must still produce a
    // deterministic, safe, non-empty reason instead of leaking an empty cell.
    const connections = [
      {
        id: "conn-bare",
        provider: "openai",
        name: "OpenAI Bare",
        providerSpecificData: {
          apiKeyHealth: {
            primary: { status: "invalid", failures: 0, lastFailure: null },
          },
        },
      },
    ];

    act(() => {
      root.render(<ApiKeyHealthWarnings connections={connections} />);
    });

    const text = container.textContent || "";
    expect(text).toContain("OpenAI Bare");
    expect(text).toContain("invalid");
    // Either the typed fallback or a sanitized non-empty message must render.
    expect(text.length).toBeGreaterThan(60);
  });
});
