import { test, expect } from "@playwright/test";
import { gotoDashboardRoute } from "./helpers/dashboardAuth";

test.describe("Protocol visibility", () => {
  test("Connect shell links to MCP and A2A protocol homes (Epic 0005 S5)", async ({ page }) => {
    await gotoDashboardRoute(page, "/dashboard/endpoint");
    await page.waitForLoadState("networkidle");

    const protocolHomes = page.getByTestId("connect-protocol-homes");
    await expect(protocolHomes).toBeVisible();

    const mcpLink = protocolHomes.getByRole("link", { name: /MCP/i });
    const a2aLink = protocolHomes.getByRole("link", { name: /A2A/i });
    await expect(mcpLink).toBeVisible();
    await expect(a2aLink).toBeVisible();
    await expect(mcpLink).toHaveAttribute("href", "/dashboard/mcp");
    await expect(a2aLink).toHaveAttribute("href", "/dashboard/a2a");
  });

  test("MCP and A2A protocol home pages mount without error", async ({ page }) => {
    await gotoDashboardRoute(page, "/dashboard/mcp");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText(/application error|500/i);

    await gotoDashboardRoute(page, "/dashboard/a2a");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText(/application error|500/i);
  });
});
