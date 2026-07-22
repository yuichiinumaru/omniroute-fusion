/**
 * Task 0094 / EPIC-20 T20-I — Integrations stack:
 * Webhooks → Context Sources → Plugins under `/operations/integrations`.
 * Legacy webhooks, plugins, endpoint?tab=context-sources redirect; anti-phantom chrome.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS,
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  OPERATIONS_TOPBAR_LABELS,
  buildOperationsPath,
} from "../../../src/shared/constants/epic20Operations";
import { getActiveSidebarHref } from "../../../src/shared/utils/sidebarRouteMatch";
import { resolveOperationsTopbarActive } from "../../../src/app/(dashboard)/operations/OperationsTopbar";

const ROOT = join(import.meta.dirname, "../../..");

/** Locked product stack order (EPIC-20 §2 #7) — mirrored in IntegrationsPageClient. */
const INTEGRATIONS_SECTION_ORDER = ["webhooks", "context-sources", "plugins"] as const;

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

const INTEGRATIONS_PAGE = "src/app/(dashboard)/operations/integrations/page.tsx";
const INTEGRATIONS_CLIENT =
  "src/app/(dashboard)/operations/integrations/IntegrationsPageClient.tsx";
const CONTEXT_SOURCES =
  "src/app/(dashboard)/operations/integrations/ContextSourcesSection.tsx";
const LEGACY_WEBHOOKS = "src/app/(dashboard)/dashboard/webhooks/page.tsx";
const LEGACY_PLUGINS = "src/app/(dashboard)/dashboard/plugins/page.tsx";
const PLUGINS_CLIENT = "src/app/(dashboard)/dashboard/plugins/PluginsPageClient.tsx";
const PLUGINS_CONFIG = "src/app/(dashboard)/dashboard/plugins/[name]/config/page.tsx";
const WEBHOOKS_CLIENT = "src/app/(dashboard)/dashboard/webhooks/WebhooksPageClient.tsx";
const ENDPOINT_PAGE = "src/app/(dashboard)/dashboard/endpoint/page.tsx";
const ENDPOINT_CLIENT = "src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx";
const OPS_LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const OPS_TOPBAR = "src/app/(dashboard)/operations/OperationsTopbar.tsx";
const SEGMENT_PAGE = "src/app/(dashboard)/operations/[segment]/page.tsx";

const PRIMARY_ITEMS = [
  { id: "home", href: "/home", exact: true },
  { id: "providers", href: "/dashboard/providers" },
  { id: "combos", href: "/dashboard/combos" },
  { id: "activity", href: "/dashboard/activity" },
  { id: "operations", href: "/operations" },
  { id: "settings-general", href: "/dashboard/settings/general" },
  { id: "docs", href: "/docs", external: true },
] as const;

describe("0094 — Integrations peer path + Ops topbar SSoT", () => {
  it("integrations is Operations topbar peer #7 with label Integrations", () => {
    assert.equal(OPERATIONS_TOPBAR_IDS.includes("integrations"), true);
    assert.equal(OPERATIONS_TOPBAR_IDS[6], "integrations");
    assert.equal(OPERATIONS_TOPBAR_LABELS.integrations, "Integrations");
    assert.equal(buildOperationsPath("integrations"), "/operations/integrations");
  });

  it("resolveOperationsTopbarActive lights integrations on canonical path", () => {
    assert.equal(
      resolveOperationsTopbarActive(buildOperationsPath("integrations")),
      "integrations"
    );
    assert.equal(resolveOperationsTopbarActive("/operations/integrations"), "integrations");
    assert.equal(resolveOperationsTopbarActive("/operations/integrations/"), "integrations");
  });

  it("canonical Integrations route files exist", () => {
    assert.equal(exists(INTEGRATIONS_PAGE), true, `missing ${INTEGRATIONS_PAGE}`);
    assert.equal(exists(INTEGRATIONS_CLIENT), true, `missing ${INTEGRATIONS_CLIENT}`);
    assert.equal(exists(CONTEXT_SOURCES), true, `missing ${CONTEXT_SOURCES}`);
  });
});

describe("0094 — stack order Webhooks → Context Sources → Plugins", () => {
  it("INTEGRATIONS_SECTION_ORDER freezes product vertical order", () => {
    assert.deepEqual([...INTEGRATIONS_SECTION_ORDER], [
      "webhooks",
      "context-sources",
      "plugins",
    ]);
  });

  it("IntegrationsPageClient mounts three collapsibles in locked order + markers", () => {
    const client = read(INTEGRATIONS_CLIENT);
    assert.ok(client.includes('data-testid="operations-integrations"'));
    assert.ok(client.includes('data-operations-integrations-stack=""'));

    for (const id of INTEGRATIONS_SECTION_ORDER) {
      assert.ok(
        client.includes(`data-integrations-section="${id}"`),
        `missing data-integrations-section=${id}`
      );
      assert.ok(
        client.includes(`data-testid="integrations-section-${id}"`),
        `missing testid for ${id}`
      );
      assert.ok(client.includes(`data-section="${id}"`), `missing data-section=${id}`);
    }

    const wh = client.indexOf('data-integrations-section="webhooks"');
    const cs = client.indexOf('data-integrations-section="context-sources"');
    const pl = client.indexOf('data-integrations-section="plugins"');
    const ex = client.indexOf('data-integrations-section="explainers"');
    assert.ok(wh >= 0 && cs > wh && pl > cs, "order must be webhooks → context-sources → plugins");
    assert.ok(ex > pl, "explainers must be after plugins");
  });

  it("section titles use product labels Webhooks / Context Sources / Plugins", () => {
    const client = read(INTEGRATIONS_CLIENT);
    assert.ok(client.includes('title="Webhooks"'));
    assert.ok(client.includes('title="Context Sources"'));
    assert.ok(client.includes('title="Plugins"'));
  });

  it("mounts functional clients (webhooks + plugins + context sources)", () => {
    const client = read(INTEGRATIONS_CLIENT);
    assert.ok(client.includes("WebhooksPageClient"));
    assert.ok(client.includes("PluginsPageClient"));
    assert.ok(client.includes("ContextSourcesSection"));
    assert.equal(exists(WEBHOOKS_CLIENT), true);
    assert.equal(exists(PLUGINS_CLIENT), true);

    const ctx = read(CONTEXT_SOURCES);
    assert.ok(ctx.includes("NotionSourceCard"));
    assert.ok(ctx.includes("ObsidianSourceCard"));
    assert.ok(ctx.includes('data-testid="context-sources-section"'));
  });
});

describe("0094 — explainers bottom default collapsed", () => {
  it("explainers section is last and Collapsible defaultOpen={false}", () => {
    const client = read(INTEGRATIONS_CLIENT);
    assert.ok(client.includes('data-testid="integrations-section-explainers"'));
    assert.ok(client.includes('data-default-collapsed="true"'));
    assert.ok(client.includes('title="About Integrations"'));

    const explainerIdx = client.indexOf('data-section="explainers"');
    const after = client.slice(explainerIdx);
    assert.ok(
      after.includes("defaultOpen={false}") || after.includes("defaultOpen={ false }"),
      "explainers Collapsible must default collapsed"
    );
  });
});

describe("0094 — legacy redirects via 0086 builders", () => {
  it("matrix rows for webhooks, plugins, context-sources → integrations", () => {
    const want = buildOperationsPath("integrations");
    for (const from of [
      "/dashboard/webhooks",
      "/dashboard/plugins",
      "/dashboard/endpoint?tab=context-sources",
    ]) {
      const row = OPERATIONS_REDIRECT_MATRIX.find((e) => e.from === from);
      assert.ok(row, `missing matrix row for ${from}`);
      assert.equal(row!.to, want);
      assert.equal(row!.ownerTask, "0094");
      assert.equal(row!.hub, "operations");
    }
  });

  it("legacy webhooks page is server redirect shell using builder", () => {
    const page = read(LEGACY_WEBHOOKS);
    assert.equal(page.includes('"use client"'), false, "must be server redirect");
    assert.ok(page.includes("redirect("));
    assert.ok(page.includes("buildOperationsPath"));
    assert.ok(page.includes('"integrations"') || page.includes("'integrations'"));
    assert.equal(
      /import\s+\{?\s*WebhooksPageClient/.test(page) || /<WebhooksPageClient\b/.test(page),
      false,
      "redirect shell must not import/mount webhooks UI"
    );
  });

  it("legacy plugins page is server redirect shell using builder", () => {
    const page = read(LEGACY_PLUGINS);
    assert.equal(page.includes('"use client"'), false, "must be server redirect");
    assert.ok(page.includes("redirect("));
    assert.ok(page.includes("buildOperationsPath"));
    assert.ok(page.includes('"integrations"') || page.includes("'integrations'"));
    assert.equal(
      page.includes("PluginsPageClient") || page.includes("marketplace"),
      false,
      "redirect shell must not re-render plugins UI"
    );
  });

  it("endpoint page redirects context-sources (+ context alias) to integrations", () => {
    const page = read(ENDPOINT_PAGE);
    assert.ok(page.includes("buildOperationsPath"));
    assert.ok(
      page.includes('tab === "context-sources"') || page.includes("tab === 'context-sources'")
    );
    assert.ok(page.includes('tab === "context"') || page.includes("tab === 'context'"));
    assert.ok(
      page.includes('buildOperationsPath("integrations")') ||
        page.includes("buildOperationsPath('integrations')")
    );
  });

  it("plugins nested config deep route remains reachable (not a redirect shell)", () => {
    assert.equal(exists(PLUGINS_CONFIG), true);
    const cfg = read(PLUGINS_CONFIG);
    assert.equal(cfg.includes("redirect("), false, "config page must stay live");
    assert.ok(cfg.includes("PluginConfigPage") || cfg.includes("useTranslations"));
  });
});

describe("0094 — Endpoint context-sources handoff (no dual full UI)", () => {
  it("EndpointPageClient no longer mounts Context Sources as a permanent tab body", () => {
    const client = read(ENDPOINT_CLIENT);
    // Extracted: Notion dual-home under endpoint tab must be gone
    assert.equal(
      client.includes('activeEndpointTab === "context-sources"'),
      false,
      "must not keep context-sources tab body after 0094 handoff"
    );
    // Comment may still mention Context → Integrations (0088/0094 coordination)
    assert.equal(
      /import\s+NotionSourceCard\b/.test(client),
      false,
      "NotionSourceCard must not remain imported on Endpoint after extract"
    );
  });

  it("Context Sources live only on Integrations extract module", () => {
    const ctx = read(CONTEXT_SOURCES);
    assert.ok(ctx.includes("NotionSourceCard"));
    assert.ok(ctx.includes('data-integrations-mount="context-sources"'));
  });
});

describe("0094 — anti-phantom ≤1 Ops topbar + no-new-leaf", () => {
  it("integrations page/client do not re-mount OperationsTopbar or PageTabBar", () => {
    const layoutMounts = (read(OPS_LAYOUT).match(/<OperationsTopbar\b/g) ?? []).length;
    assert.equal(layoutMounts, 1, "layout must mount OperationsTopbar exactly once");

    for (const rel of [INTEGRATIONS_PAGE, INTEGRATIONS_CLIENT, CONTEXT_SOURCES, SEGMENT_PAGE]) {
      const src = read(rel);
      assert.equal((src.match(/<OperationsTopbar\b/g) ?? []).length, 0, rel);
      assert.equal(
        /import\s+PageTabBar\b/.test(src) || /<PageTabBar\b/.test(src),
        false,
        `${rel} must not stack PageTabBar`
      );
      assert.equal(
        /import\s+CostsSubnav\b/.test(src) || /<CostsSubnav\b/.test(src),
        false,
        `${rel} must not stack CostsSubnav`
      );
    }
  });

  it("segment page mounts Integrations for id=integrations", () => {
    const src = read(SEGMENT_PAGE);
    assert.ok(src.includes('id === "integrations"') || src.includes("id === 'integrations'"));
    assert.ok(src.includes("IntegrationsPageClient"));
  });

  it("integrations is not a primary sidebar leaf", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("integrations" as never), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("webhooks" as never), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("plugins" as never), false);
    assert.ok(EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS.includes("integrations"));
    for (const id of ["webhooks", "plugins"] as const) {
      assert.equal(
        PRIMARY_SIDEBAR_ITEMS.some((item) => item.id === id),
        false,
        `${id} must not be primary leaf`
      );
    }
  });

  it("sidebar Operations leaf stays active on /operations/integrations", () => {
    const href = getActiveSidebarHref("/operations/integrations", PRIMARY_ITEMS);
    assert.equal(href, "/operations");
  });

  it("topbar source includes integrations peer via SSoT", () => {
    const topbar = read(OPS_TOPBAR);
    assert.ok(topbar.includes("OPERATIONS_TOPBAR_IDS"));
    assert.ok(topbar.includes("buildOperationsPath"));
    assert.ok(topbar.includes("integrations"));
  });
});

describe("0094 — no new marketplace product features (re-home only)", () => {
  it("plugins client still exposes installed + marketplace tabs (no new install pipeline)", () => {
    const client = read(PLUGINS_CLIENT);
    assert.ok(client.includes("marketplace"));
    assert.ok(client.includes("installed") || client.includes("installedTab"));
    // Coming-soon install remains — no invented secure install flow
    assert.ok(
      client.includes("marketplaceInstallComingSoon") || client.includes("install"),
      "marketplace install affordance preserved"
    );
  });
});
