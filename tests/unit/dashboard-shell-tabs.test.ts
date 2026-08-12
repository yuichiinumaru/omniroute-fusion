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

test("endpoint context-sources leave Endpoint; MCP/A2A stay protocol homes", () => {
  // EPIC-20: context-sources → Integrations (0094); Endpoint fusion is 0088.
  // MCP/A2A remain dedicated homes — never re-embedded as Endpoint peer tabs.
  const source = readSource("src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx");
  const endpointPage = readSource("src/app/(dashboard)/dashboard/endpoint/page.tsx");
  const integrations = readSource(
    "src/app/(dashboard)/operations/integrations/IntegrationsPageClient.tsx"
  );

  assert.ok(
    endpointPage.includes('buildOperationsPath("integrations")') ||
      endpointPage.includes("buildOperationsPath('integrations')"),
    "endpoint page must redirect context-sources to Integrations"
  );
  assert.ok(
    integrations.includes('data-integrations-section="context-sources"'),
    "Context Sources live on Integrations stack"
  );
  assert.equal(
    source.includes('activeEndpointTab === "context-sources"'),
    false,
    "Endpoint client must not keep dual context-sources body"
  );
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
    /resilience:\s*buildSettingsPath\(\s*["']routing["']\s*\)/.test(pageSource) ||
      pageSource.includes('resilience: "/dashboard/settings/routing"'),
    "resilience route must use buildSettingsPath('routing') or literal path"
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
