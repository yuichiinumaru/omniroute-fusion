import MediaPageClient from "./MediaPageClient";

/**
 * EPIC-20 T20-L / Task 0097 — Media peer under Operations shell.
 * Canonical path: `buildOperationsPath("media")` → `/operations/media`.
 *
 * Chrome: Ops hub topbar is layout-owned (`operations/layout.tsx`).
 * This page mounts **only** Media content — modality L1 strip lives inside
 * `MediaPageClient` as content chrome (not a second hub topbar strip).
 */
export default function OperationsMediaPage() {
  return <MediaPageClient />;
}
