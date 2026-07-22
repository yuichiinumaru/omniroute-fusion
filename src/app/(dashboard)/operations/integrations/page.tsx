import IntegrationsPageClient from "./IntegrationsPageClient";

/**
 * EPIC-20 T20-I / Task 0094 — Integrations peer under Operations shell.
 * Canonical path: `buildOperationsPath("integrations")` → `/operations/integrations`.
 *
 * Chrome: Ops hub topbar is layout-owned (`operations/layout.tsx`).
 * This page mounts **only** Integrations stack content (Webhooks → Context Sources → Plugins).
 */
export default function OperationsIntegrationsPage() {
  return <IntegrationsPageClient />;
}
