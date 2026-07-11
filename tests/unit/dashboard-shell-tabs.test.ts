import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL("../../" + relativePath, import.meta.url), "utf8");
}

test("analytics page exposes the restored analytics tab shell", () => {
  const source = readSource("src/app/(dashboard)/dashboard/analytics/page.tsx");

  assert.ok(source.includes("PageTabBar"));
  assert.ok(source.includes('aria-label="Analytics sections"'));
  assert.ok(source.includes('syncSearchParam="tab"'));
  for (const label of [
    "Overview",
    "Evals",
    "Search",
    "Utilization",
    "Combo Health",
    "Route Trace",
  ]) {
    assert.ok(source.includes('label: "' + label + '"'));
  }
  for (const tabId of [
    "overview",
    "evals",
    "search",
    "utilization",
    "combo-health",
    "route-trace",
  ]) {
    assert.ok(source.includes('id: "' + tabId + '"'));
  }
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
  assert.ok(pageSource.includes('general: "/dashboard/settings/general"'));
  assert.ok(pageSource.includes('resilience: "/dashboard/settings/resilience"'));
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
