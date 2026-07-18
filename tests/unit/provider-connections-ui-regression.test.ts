import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROVIDER_DIR = path.resolve(__dirname, "../../src/app/(dashboard)/dashboard/providers/[id]");
const EN_MESSAGES = path.resolve(__dirname, "../../src/i18n/messages/en.json");

// #3501 strangler-fig decomposition: the provider-detail god-component (page.tsx)
// was split into helpers + per-section components. The defensive count labels and
// proxy-toggle markup now live in these files — scan their union.
const providerPageSrc = [
  "providerPageHelpers.ts",
  "components/ConnectionsListPanel.tsx",
  "components/ConnectionRow.tsx",
]
  .map((rel) => readFileSync(path.join(PROVIDER_DIR, rel), "utf-8"))
  .join("\n");
const enMessages = JSON.parse(readFileSync(EN_MESSAGES, "utf-8"));

describe("provider connections UI regression", () => {
  it("keeps English provider count messages available for the provider detail header", () => {
    assert.equal(
      enMessages.providers?.selectedCount,
      "{count, plural, one {# selected} other {# selected}}"
    );
    assert.equal(
      enMessages.providers?.accountsCount,
      "{count, plural, one {# account} other {# accounts}}"
    );
  });

  it("uses defensive provider count labels instead of leaking raw i18n keys", () => {
    assert.match(providerPageSrc, /function\s+providerCountText\s*\(/);
    assert.match(
      providerPageSrc,
      /providerCountText\([\s\S]*"selectedCount"[\s\S]*"\{count\} selected"/
    );
    assert.match(
      providerPageSrc,
      /providerCountText\([\s\S]*"accountsCount"[\s\S]*"\{count\} account"[\s\S]*"\{count\} accounts"/
    );
    assert.doesNotMatch(
      providerPageSrc,
      /\?\s*t\("selectedCount",\s*\{\s*count:\s*selectedIds\.size\s*\}\)\s*:\s*t\("accountsCount",\s*\{\s*count:\s*connections\.length\s*\}\)/
    );
  });

  it("keeps proxy toggle text accessible without repeating active/default labels visually", () => {
    // Whitespace-tolerant: Prettier may format these aria-labels across multiple lines.
    assert.match(
      providerPageSrc,
      /aria-label=\{\s*proxyEnabled\s*\?\s*t\("proxyEnabledTitle"\)\s*:\s*t\("proxyDisabledTitle"\)\s*\}/
    );
    assert.match(
      providerPageSrc,
      /aria-label=\{\s*perKeyProxyEnabled\s*\?\s*t\("perKeyProxyEnabledTitle"\)\s*:\s*t\("perKeyProxyDisabledTitle"\)\s*\}/
    );
    assert.ok(providerPageSrc.includes('<span className="sr-only">{t("proxyOn")}</span>'));
    assert.ok(providerPageSrc.includes('<span className="sr-only">{t("perKeyProxyOff")}</span>'));
    assert.doesNotMatch(providerPageSrc, /\{proxyEnabled \? t\("proxyOn"\) : t\("proxyOff"\)\}/);
    assert.doesNotMatch(
      providerPageSrc,
      /\{perKeyProxyEnabled \? t\("perKeyProxyOn"\) : t\("perKeyProxyOff"\)\}/
    );
  });

  it("fails if Providers selected controls/topbar use 'bg-primary text-white' for active states", () => {
    const parentDir = path.resolve(__dirname, "../../");
    const topBarSrc = readFileSync(
      path.join(parentDir, "src/app/(dashboard)/dashboard/providers/components/ProvidersTopBar.tsx"),
      "utf-8"
    );
    const summaryCardSrc = readFileSync(
      path.join(parentDir, "src/app/(dashboard)/dashboard/providers/components/ProviderSummaryCard.tsx"),
      "utf-8"
    );
    const connectionsPanelSrc = readFileSync(
      path.join(parentDir, "src/app/(dashboard)/dashboard/providers/[id]/components/ConnectionsListPanel.tsx"),
      "utf-8"
    );
    const onboardingSrc = readFileSync(
      path.join(
        parentDir,
        "src/app/(dashboard)/dashboard/providers/components/onboarding/ProviderOnboardingWizard.tsx"
      ),
      "utf-8"
    );

    // Active state model should not be bg-primary text-white (Routing-style tint preferred).
    assert.doesNotMatch(topBarSrc, /bg-primary text-white/);
    assert.doesNotMatch(summaryCardSrc, /bg-primary text-white/);
    assert.doesNotMatch(connectionsPanelSrc, /bg-primary text-white/);
    // Solid primary CTAs on bright cyan must use on-primary (obsidian) text, not white.
    assert.doesNotMatch(onboardingSrc, /bg-primary[^"'`\n]*text-white/);
    assert.match(onboardingSrc, /text-primary-foreground/);
    // Topbar uses shared HUB_SUBNAV_* constants (literal classes live in hubSubnavStyles).
    assert.match(topBarSrc, /HUB_SUBNAV_ACTIVE_CLASS/);
    // Selected chips / step pills use Routing-style active affordance.
    assert.match(summaryCardSrc, /border-primary\/20 bg-primary\/10 text-primary/);
  });

  it("ProvidersTopBar active visual matches RoutingHubSubnav via HUB_SUBNAV SSOT (Task 0057)", () => {
    const parentDir = path.resolve(__dirname, "../../");
    const topBarSrc = readFileSync(
      path.join(parentDir, "src/app/(dashboard)/dashboard/providers/components/ProvidersTopBar.tsx"),
      "utf-8"
    );
    const routingSrc = readFileSync(
      path.join(parentDir, "src/shared/components/RoutingHubSubnav.tsx"),
      "utf-8"
    );
    const stylesSrc = readFileSync(
      path.join(parentDir, "src/shared/constants/hubSubnavStyles.ts"),
      "utf-8"
    );

    // Structural SSOT: both hubs import shared constants (not divergent string copies).
    assert.ok(
      topBarSrc.includes("HUB_SUBNAV_ACTIVE_CLASS"),
      "ProvidersTopBar must import HUB_SUBNAV_ACTIVE_CLASS"
    );
    assert.ok(
      topBarSrc.includes("HUB_SUBNAV_SHELL_CLASS"),
      "ProvidersTopBar must import HUB_SUBNAV_SHELL_CLASS"
    );
    assert.ok(
      topBarSrc.includes("HUB_SUBNAV_INACTIVE_CLASS"),
      "ProvidersTopBar must import HUB_SUBNAV_INACTIVE_CLASS"
    );
    assert.ok(
      topBarSrc.includes("HUB_SUBNAV_ITEM_BASE_CLASS"),
      "ProvidersTopBar must import HUB_SUBNAV_ITEM_BASE_CLASS"
    );
    assert.ok(routingSrc.includes("HUB_SUBNAV_ACTIVE_CLASS"), "RoutingHubSubnav uses SSOT active");
    assert.ok(routingSrc.includes("HUB_SUBNAV_SHELL_CLASS"), "RoutingHubSubnav uses SSOT shell");

    // Contract values live in hubSubnavStyles (single source of truth).
    assert.ok(
      stylesSrc.includes('"border border-primary/20 bg-primary/10 text-primary"') ||
        stylesSrc.includes("'border border-primary/20 bg-primary/10 text-primary'"),
      "hubSubnavStyles must define Routing-style active classes"
    );
    assert.doesNotMatch(topBarSrc, /bg-primary text-white/);
    // Decorative Material icons must not double-speak with visible labels (parity Observe/Routing).
    assert.match(
      topBarSrc,
      /material-symbols-outlined[^>]*aria-hidden="true"/,
      "ProvidersTopBar decorative icons need aria-hidden"
    );
    // No inline copy of active class — must go through constants.
    assert.doesNotMatch(
      topBarSrc,
      /"border border-primary\/20 bg-primary\/10 text-primary"/
    );
  });

  it("asserts peer provider pages mount ProvidersTopBar with correct currentPath (Task 0057)", () => {
    const parentDir = path.resolve(__dirname, "../../");
    const peers: Array<{ relPath: string; currentPath: string }> = [
      {
        relPath: "src/app/(dashboard)/dashboard/providers/page.tsx",
        currentPath: "/dashboard/providers",
      },
      {
        relPath: "src/app/(dashboard)/dashboard/providers/services/page.tsx",
        currentPath: "/dashboard/providers/services",
      },
      {
        relPath: "src/app/(dashboard)/dashboard/provider-stats/page.tsx",
        currentPath: "/dashboard/provider-stats",
      },
      {
        relPath: "src/app/(dashboard)/dashboard/quota/page.tsx",
        currentPath: "/dashboard/quota",
      },
      {
        relPath: "src/app/(dashboard)/dashboard/free-provider-rankings/page.tsx",
        currentPath: "/dashboard/free-provider-rankings",
      },
      {
        relPath: "src/app/(dashboard)/dashboard/free-tiers/page.tsx",
        currentPath: "/dashboard/free-tiers",
      },
      {
        relPath: "src/app/(dashboard)/dashboard/runtime/RuntimePageClient.tsx",
        currentPath: "/dashboard/runtime",
      },
    ];

    const topBarSrc = readFileSync(
      path.join(parentDir, "src/app/(dashboard)/dashboard/providers/components/ProvidersTopBar.tsx"),
      "utf-8"
    );

    // Branded path union + link table cover all peer destinations.
    assert.ok(topBarSrc.includes("PROVIDERS_TOPBAR_PATHS"));
    assert.ok(topBarSrc.includes("ProvidersTopBarPath"));
    for (const { currentPath } of peers) {
      assert.ok(
        topBarSrc.includes(`"${currentPath}"`) || topBarSrc.includes(`'${currentPath}'`),
        `ProvidersTopBar must include href/path ${currentPath}`
      );
    }

    for (const { relPath, currentPath } of peers) {
      const content = readFileSync(path.join(parentDir, relPath), "utf-8");
      assert.ok(
        content.includes("ProvidersTopBar"),
        `Expected ${relPath} to import or use ProvidersTopBar`
      );
      assert.ok(
        content.includes(`currentPath="${currentPath}"`) ||
          content.includes(`currentPath='${currentPath}'`),
        `Expected ${relPath} to mount ProvidersTopBar with currentPath=${currentPath}`
      );
    }

    // Nested services path must use exact services currentPath (not providers root).
    const servicesPage = readFileSync(
      path.join(parentDir, "src/app/(dashboard)/dashboard/providers/services/page.tsx"),
      "utf-8"
    );
    assert.ok(servicesPage.includes('currentPath="/dashboard/providers/services"'));
    assert.equal(
      servicesPage.includes('currentPath="/dashboard/providers"'),
      false,
      "Services page must not mark Providers home as active"
    );
  });

  it("ProviderListRow keeps enable Toggle outside the primary Link (Task 0057 a11y)", () => {
    const parentDir = path.resolve(__dirname, "../../");
    const listRowSrc = readFileSync(
      path.join(parentDir, "src/app/(dashboard)/dashboard/providers/components/ProviderListRow.tsx"),
      "utf-8"
    );

    // Structural contract: Toggle is a sibling of the detail Link, not nested inside it.
    const lastLinkClose = listRowSrc.lastIndexOf("</Link>");
    const toggleIdx = listRowSrc.indexOf("<Toggle");
    assert.ok(lastLinkClose > 0, "ProviderListRow must render a detail Link");
    assert.ok(toggleIdx > 0, "ProviderListRow must render an enable Toggle");
    assert.ok(
      toggleIdx > lastLinkClose,
      "Enable Toggle must not nest inside the provider detail Link"
    );
    // Dead play_arrow affordance removed — list row is navigation-primary.
    assert.doesNotMatch(listRowSrc, /play_arrow/);
    assert.ok(listRowSrc.includes('data-testid="provider-list-row"'));
  });
});
