import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL("../../" + relativePath, import.meta.url), "utf8");
}

test("analytics page is redirect shell; storytelling lives on Dashboard hub (0080+0081)", () => {
  // Server shell redirects ops → Observe and storytelling → Dashboard (no content mount).
  const page = readSource("src/app/(dashboard)/dashboard/analytics/page.tsx");
  const hub = readSource("src/app/(dashboard)/home/DashboardStoryHubClient.tsx");
  const topbar = readSource("src/app/(dashboard)/home/DashboardTopbar.tsx");
  const home = readSource("src/app/(dashboard)/home/page.tsx");

  assert.ok(page.includes("buildObserveComboHealthPath"));
  assert.ok(
    page.includes("resolveEpic19RouteTraceDestination") ||
      page.includes("buildObserveRouteTracePath")
  );
  assert.ok(page.includes("buildDashboardStoryPath"));
  assert.ok(page.includes("redirect"));
  assert.ok(page.includes("combo-health"));
  assert.ok(page.includes("route-trace") || page.includes("route-explain"));
  assert.equal(page.includes("<AnalyticsPageClient"), false);

  // Single-topbar rework: navigation is DashboardTopbar only (no nested strips).
  assert.equal(
    /import\s*\{[^}]*PageTabBar/.test(hub) ||
      /import\s+PageTabBar\b/.test(hub) ||
      /<PageTabBar\b/.test(hub),
    false,
    "story hub must not import/mount PageTabBar"
  );
  assert.equal(
    /import\s+CostsSubnav\b/.test(hub) || /<CostsSubnav\b/.test(hub),
    false,
    "story hub must not import/mount CostsSubnav"
  );
  assert.ok(home.includes("<DashboardTopbar"), "home must mount DashboardTopbar");
  assert.ok(topbar.includes('data-dashboard-topbar=""'));
  assert.ok(
    hub.includes("useSearchParams"),
    "active tab must be URL-driven via searchParams"
  );
  for (const label of ["Evals", "Search", "Utilization", "Compression", "Costs"]) {
    assert.ok(
      topbar.includes('labelFallback: "' + label + '"'),
      `missing topbar peer label ${label}`
    );
  }
  for (const tabId of [
    "overview",
    "evals",
    "search",
    "utilization",
    "compression",
    "costs-overview",
  ]) {
    assert.ok(
      topbar.includes('"' + tabId + '"') || topbar.includes("'" + tabId + "'"),
      `missing topbar story tab id ${tabId}`
    );
  }
  // Operational tabs live under Observe ?panel= — not the Dashboard topbar.
  assert.equal(hub.includes('id: "combo-health"'), false);
  assert.equal(hub.includes('id: "route-trace"'), false);
  assert.equal(topbar.includes('storyTab: "combo-health"'), false);
  assert.equal(topbar.includes('storyTab: "route-trace"'), false);
});

test("endpoint page uses S5 tabs + protocol homes (not embedded MCP/A2A peers)", () => {
  // Task 0024 / S5: MCP and A2A are dedicated homes (/dashboard/mcp|a2a), not peer
  // EndpointTab values. Shell tabs are apis | catalog | context-sources.
  const source = readSource("src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx");

  assert.ok(
    source.includes('type EndpointTab = "apis" | "catalog" | "context-sources"'),
    "EndpointTab must be S5 catalog shell, not pre-S5 mcp|a2a peers"
  );
  assert.ok(source.includes("ApiEndpointsTab"));
  assert.ok(
    source.includes('activeEndpointTab === "catalog" ? <ApiEndpointsTab /> : null') ||
      source.includes('activeEndpointTab === "catalog"')
  );
  // Protocol homes bar — deep links, not embedded dashboard pages as tabs.
  assert.ok(source.includes('href="/dashboard/mcp"'));
  assert.ok(source.includes('href="/dashboard/a2a"'));
  assert.equal(
    source.includes("<McpDashboardPage") || source.includes("<MCPDashboard"),
    false,
    "MCP dashboard must not be re-embedded as an endpoint peer tab"
  );
  assert.equal(
    source.includes("<A2ADashboardPage") || source.includes("<A2ADashboard"),
    false,
    "A2A dashboard must not be re-embedded as an endpoint peer tab"
  );
});

test("settings root redirects to section pages instead of rendering a tab shell", () => {
  const pageSource = readSource("src/app/(dashboard)/dashboard/settings/page.tsx");

  assert.ok(pageSource.includes('import { redirect } from "next/navigation"'));
  // Task 0054 / 0025: paths via buildSettingsPath SSoT (not dual hardcoded literals)
  assert.ok(
    /general:\s*buildSettingsPath\(\s*["']general["']\s*\)/.test(pageSource) ||
      pageSource.includes('general: "/dashboard/settings/general"'),
    "general route must use buildSettingsPath('general') or literal /dashboard/settings/general"
  );
  assert.ok(
    /resilience:\s*buildSettingsPath\(\s*["']resilience["']\s*\)/.test(pageSource) ||
      pageSource.includes('resilience: "/dashboard/settings/resilience"'),
    "resilience route must use buildSettingsPath('resilience') or literal path"
  );
  assert.ok(pageSource.includes("redirect(resolveSettingsRoute(tab))"));
});

test("provider limit status chips use English fallback labels", () => {
  const source = readSource(
    "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.tsx"
  );

  assert.ok(source.includes('critical: tr("statCritical", "Critical")'));
  assert.ok(source.includes('alert: tr("statAlert", "Alert")'));
  assert.ok(source.includes('ok: tr("statHealthy", "Healthy")'));
  assert.doesNotMatch(source, /Crítico|Alerta|Saudável/);
});

test("provider limits collapsed rows show quota resets and progress bars inline", () => {
  const source = readSource(
    "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.tsx"
  );

  assert.ok(source.includes("const renderInlineQuotaSummary = (quotas: any[]) =>"));
  assert.ok(source.includes("const cd = formatCountdown(q.resetAt)"));
  assert.ok(source.includes("`⏱ ${cd}`"));
  assert.ok(source.includes("h-1 w-14 rounded-sm"));
  assert.ok(source.includes("getQuotaBarWidthClass(pct)"));
  assert.ok(source.includes("getQuotaToneClasses(pct)"));
  assert.ok(source.includes("renderInlineQuotaSummary(quota.quotas)"));
});
