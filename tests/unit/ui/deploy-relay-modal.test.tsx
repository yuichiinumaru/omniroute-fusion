// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeployRelayModal from "@/shared/components/DeployRelayModal";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("DeployRelayModal", () => {
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
    document.body.style.overflow = "";
  });

  it("does not render when closed", () => {
    act(() => {
      root.render(
        <DeployRelayModal isOpen={false} onClose={() => undefined} title="Relay">
          <p>body</p>
        </DeployRelayModal>
      );
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("renders title, warning, error, note, children, and footer via Modal chrome", () => {
    const onClose = vi.fn();
    act(() => {
      root.render(
        <DeployRelayModal
          isOpen
          onClose={onClose}
          title="Vercel Relay"
          warning="Requires a token"
          warningTone="yellow"
          error="Deploy failed"
          note="Free tier applies"
          footer={<button type="button">Deploy</button>}
        >
          <input aria-label="token" />
        </DeployRelayModal>
      );
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(document.body.textContent).toContain("Vercel Relay");
    expect(document.body.textContent).toContain("Requires a token");
    expect(document.body.textContent).toContain("Deploy failed");
    expect(document.body.textContent).toContain("Free tier applies");
    expect(document.body.querySelector('input[aria-label="token"]')).toBeTruthy();
    expect(document.body.querySelector("button")?.textContent).toMatch(/Deploy|Close|close/i);
  });

  it("Vercel/CF/Deno domain modals compose DeployRelayModal (static adoption)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const rootDir = resolve(process.cwd());
    for (const rel of [
      "src/app/(dashboard)/dashboard/settings/components/proxy/VercelRelayModal.tsx",
      "src/app/(dashboard)/dashboard/settings/components/proxy/CloudflareRelayModal.tsx",
      "src/app/(dashboard)/dashboard/settings/components/proxy/DenoRelayModal.tsx",
    ]) {
      const src = readFileSync(resolve(rootDir, rel), "utf8");
      expect(src).toContain("DeployRelayModal");
      expect(src).toContain("SettingsTextField");
      // No hand-rolled fixed overlay dialog chrome
      expect(src).not.toMatch(/fixed inset-0 z-50/);
    }
  });
});
