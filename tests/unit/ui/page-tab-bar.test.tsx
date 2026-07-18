// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PageTabBar, { writeTabSearchParam } from "@/shared/components/PageTabBar";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("PageTabBar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    window.history.replaceState(null, "", "/dashboard/analytics");
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders options and calls onChange when a tab is selected", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PageTabBar
          options={[
            { value: "overview", label: "Overview", icon: "analytics" },
            { value: "evals", label: "Evals", icon: "science" },
          ]}
          value="overview"
          onChange={onChange}
          syncSearchParam={false}
          aria-label="Analytics sections"
        />
      );
    });

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist?.getAttribute("aria-label")).toBe("Analytics sections");
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      (tabs[1] as HTMLButtonElement).click();
    });
    expect(onChange).toHaveBeenCalledWith("evals");
  });

  it("syncs ?tab= via history.replaceState by default", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PageTabBar
          options={[
            { value: "overview", label: "Overview" },
            { value: "evals", label: "Evals" },
          ]}
          value="overview"
          onChange={onChange}
          defaultValue="overview"
          aria-label="Analytics sections"
        />
      );
    });

    const tabs = container.querySelectorAll('[role="tab"]');
    act(() => {
      (tabs[1] as HTMLButtonElement).click();
    });

    expect(onChange).toHaveBeenCalledWith("evals");
    expect(window.location.search).toContain("tab=evals");
  });

  it("deletes the search param when selecting defaultValue", () => {
    window.history.replaceState(null, "", "/dashboard/analytics?tab=evals");
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PageTabBar
          options={[
            { value: "overview", label: "Overview" },
            { value: "evals", label: "Evals" },
          ]}
          value="evals"
          onChange={onChange}
          syncSearchParam="tab"
          defaultValue="overview"
        />
      );
    });

    const tabs = container.querySelectorAll('[role="tab"]');
    act(() => {
      (tabs[0] as HTMLButtonElement).click();
    });

    expect(onChange).toHaveBeenCalledWith("overview");
    expect(new URL(window.location.href).searchParams.has("tab")).toBe(false);
  });

  it("drops deleteParams extras in the same replaceState as tab write", () => {
    window.history.replaceState(
      null,
      "",
      "/dashboard/analytics?tab=route-trace&id=req-1"
    );
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PageTabBar
          options={[
            { value: "overview", label: "Overview" },
            { value: "route-trace", label: "Route Trace" },
            { value: "evals", label: "Evals" },
          ]}
          value="route-trace"
          onChange={onChange}
          syncSearchParam="tab"
          defaultValue="overview"
          deleteParams={(next) => (next === "route-trace" ? [] : ["id"])}
        />
      );
    });

    const tabs = container.querySelectorAll('[role="tab"]');
    act(() => {
      (tabs[2] as HTMLButtonElement).click();
    });

    expect(onChange).toHaveBeenCalledWith("evals");
    const url = new URL(window.location.href);
    expect(url.searchParams.get("tab")).toBe("evals");
    expect(url.searchParams.has("id")).toBe(false);
  });

  it("moves selection with ArrowRight / Home / End on the tablist", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PageTabBar
          options={[
            { value: "overview", label: "Overview" },
            { value: "evals", label: "Evals" },
            { value: "search", label: "Search" },
          ]}
          value="overview"
          onChange={onChange}
          syncSearchParam={false}
          aria-label="Analytics sections"
        />
      );
    });

    const tablist = container.querySelector('[role="tablist"]') as HTMLElement;
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs[0]?.getAttribute("tabindex")).toBe("0");

    act(() => {
      tablist.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
    });
    expect(onChange).toHaveBeenCalledWith("evals");

    onChange.mockClear();
    // Re-render selected=evals for further nav (controlled)
    act(() => {
      root.render(
        <PageTabBar
          options={[
            { value: "overview", label: "Overview" },
            { value: "evals", label: "Evals" },
            { value: "search", label: "Search" },
          ]}
          value="evals"
          onChange={onChange}
          syncSearchParam={false}
        />
      );
    });

    act(() => {
      (container.querySelector('[role="tablist"]') as HTMLElement).dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true })
      );
    });
    expect(onChange).toHaveBeenCalledWith("search");

    onChange.mockClear();
    act(() => {
      root.render(
        <PageTabBar
          options={[
            { value: "overview", label: "Overview" },
            { value: "evals", label: "Evals" },
            { value: "search", label: "Search" },
          ]}
          value="search"
          onChange={onChange}
          syncSearchParam={false}
        />
      );
    });

    act(() => {
      (container.querySelector('[role="tablist"]') as HTMLElement).dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true })
      );
    });
    expect(onChange).toHaveBeenCalledWith("overview");
  });
});

describe("writeTabSearchParam", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/dashboard/activity?tab=legacy&id=req-1");
  });

  it("sets custom param names and can delete extras", () => {
    writeTabSearchParam("source", "request", { deleteParams: ["tab"] });
    const url = new URL(window.location.href);
    expect(url.searchParams.get("source")).toBe("request");
    expect(url.searchParams.has("tab")).toBe(false);
    expect(url.searchParams.get("id")).toBe("req-1");
  });

  it("deletes param when value equals defaultValue", () => {
    writeTabSearchParam("source", "activity", { defaultValue: "activity" });
    expect(new URL(window.location.href).searchParams.has("source")).toBe(false);
  });
});
