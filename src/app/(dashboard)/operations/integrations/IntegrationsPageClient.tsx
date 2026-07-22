"use client";

import Collapsible from "@/shared/components/Collapsible";
import { WebhooksPageClient } from "@/app/(dashboard)/dashboard/webhooks/WebhooksPageClient";
import { PluginsPageClient } from "@/app/(dashboard)/dashboard/plugins/PluginsPageClient";
import ContextSourcesSection from "./ContextSourcesSection";

/** Vertical stack order — Webhooks → Context Sources → Plugins (EPIC-20 §2 #7). */
export const INTEGRATIONS_SECTION_ORDER = [
  "webhooks",
  "context-sources",
  "plugins",
] as const;

export type IntegrationsSectionId = (typeof INTEGRATIONS_SECTION_ORDER)[number];

/**
 * EPIC-20 T20-I / Task 0094 — Integrations peer stack.
 * Content only — Operations topbar is layout-owned (0087). Do not re-mount chrome.
 * Order: Webhooks → Context Sources → Plugins; explainers bottom, default collapsed.
 */
export default function IntegrationsPageClient() {
  return (
    <div
      className="flex flex-col gap-4"
      data-testid="operations-integrations"
      data-operations-peer="integrations"
      data-operations-integrations-stack=""
    >
      <p className="text-sm text-text-muted max-w-3xl">
        Connect OmniRoute outward: outbound event webhooks, knowledge context backends, and
        dashboard plugins. One Integrations peer — not three separate destinations.
      </p>

      <section
        id="webhooks"
        data-section="webhooks"
        data-integrations-section="webhooks"
        data-order="1"
        data-testid="integrations-section-webhooks"
      >
        <Collapsible
          title="Webhooks"
          subtitle="HMAC-signed event delivery to Slack, Discord, Telegram, or custom URLs"
          icon="webhook"
          defaultOpen={true}
        >
          <WebhooksPageClient />
        </Collapsible>
      </section>

      <section
        id="context-sources"
        data-section="context-sources"
        data-integrations-section="context-sources"
        data-order="2"
        data-testid="integrations-section-context-sources"
      >
        <Collapsible
          title="Context Sources"
          subtitle="Notion and Obsidian backends for MCP knowledge tools"
          icon="database"
          defaultOpen={true}
        >
          <ContextSourcesSection />
        </Collapsible>
      </section>

      <section
        id="plugins"
        data-section="plugins"
        data-integrations-section="plugins"
        data-order="3"
        data-testid="integrations-section-plugins"
      >
        <Collapsible
          title="Plugins"
          subtitle="Installed and marketplace dashboard plugins"
          icon="extension"
          defaultOpen={true}
        >
          <PluginsPageClient />
        </Collapsible>
      </section>

      <section
        id="integrations-explainers"
        data-section="explainers"
        data-integrations-section="explainers"
        data-order="4"
        data-testid="integrations-section-explainers"
        data-default-collapsed="true"
      >
        <Collapsible
          title="About Integrations"
          subtitle="Concepts and when to use each block"
          icon="info"
          defaultOpen={false}
        >
          <div className="space-y-3 text-sm text-text-muted">
            <p>
              <strong className="text-text-main">Webhooks</strong> push OmniRoute events (usage,
              errors, routing) to chat ops or custom HTTP receivers with HMAC signing.
            </p>
            <p>
              <strong className="text-text-main">Context Sources</strong> wire external knowledge
              stores (Notion workspaces, Obsidian vaults) so MCP tools can read/write operator
              context. These left the Endpoint tab strip so Endpoint stays APIs + Catalog.
            </p>
            <p>
              <strong className="text-text-main">Plugins</strong> are installable dashboard
              extensions. Configure a plugin via its deep route under{" "}
              <code className="text-xs font-mono text-text-main">
                /dashboard/plugins/…/config
              </code>
              .
            </p>
          </div>
        </Collapsible>
      </section>
    </div>
  );
}
