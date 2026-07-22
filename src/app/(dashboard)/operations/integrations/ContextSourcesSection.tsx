"use client";

import NotionSourceCard from "@/app/(dashboard)/dashboard/endpoint/components/NotionSourceCard";
import ObsidianSourceCard from "@/app/(dashboard)/dashboard/endpoint/components/ObsidianSourceCard";

/**
 * Context Sources block for Operations → Integrations (Task 0094).
 * Extracted from Endpoint `?tab=context-sources` so the surface has one L1 home.
 * Reuses existing Notion / Obsidian cards (no product feature expansion).
 */
export function ContextSourcesSection() {
  return (
    <div
      className="flex flex-col gap-4"
      data-testid="context-sources-section"
      data-integrations-mount="context-sources"
    >
      <NotionSourceCard />
      <ObsidianSourceCard />
    </div>
  );
}

export default ContextSourcesSection;
