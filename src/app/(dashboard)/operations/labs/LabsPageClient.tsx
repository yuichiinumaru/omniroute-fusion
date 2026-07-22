"use client";

import { useSearchParams } from "next/navigation";
import Collapsible from "@/shared/components/Collapsible";
import { PlaygroundStudio } from "@/app/(dashboard)/dashboard/playground/PlaygroundStudio";
import TranslatorPageClient from "@/app/(dashboard)/dashboard/translator/TranslatorPageClient";
import TranslatorConceptCard from "@/app/(dashboard)/dashboard/translator/components/TranslatorConceptCard";
import SearchToolsClient from "@/app/(dashboard)/dashboard/search-tools/SearchToolsClient";
import SearchConceptCard from "@/app/(dashboard)/dashboard/search-tools/components/SearchConceptCard";
import BatchPageClient from "@/app/(dashboard)/dashboard/batch/BatchPageClient";
import BatchFilesPageClient from "@/app/(dashboard)/dashboard/batch/files/BatchFilesPageClient";
import BatchConceptCard from "@/app/(dashboard)/dashboard/batch/components/BatchConceptCard";
import FilesConceptCard from "@/app/(dashboard)/dashboard/batch/components/FilesConceptCard";

/**
 * EPIC-20 Labs fusion (Task 0096).
 * Vertical stack: Playground → Translator → Search Tools → Batch(+Files).
 * Explainers at bottom, default collapsed. Mode chrome is in-block only.
 *
 * Defaults: Playground expanded; Translator / Search / Batch collapsed.
 * `?section=files` expands Batch + Files subsection (batch/files deep-link).
 */
export default function LabsPageClient() {
  const searchParams = useSearchParams();
  const openFiles = searchParams.get("section") === "files";

  return (
    <div className="space-y-4" data-testid="labs-page" data-labs-fusion="">
      <div data-labs-block="playground">
        <Collapsible
          title="Playground"
          subtitle="Chat · Compare · API · Build"
          icon="science"
          defaultOpen={true}
        >
          <PlaygroundStudio modeChrome="inline" />
        </Collapsible>
      </div>

      <div data-labs-block="translator">
        <Collapsible
          title="Translator"
          subtitle="Format conversion between APIs"
          icon="translate"
          defaultOpen={false}
        >
          <TranslatorPageClient showConceptCard={false} />
        </Collapsible>
      </div>

      <div data-labs-block="search-tools">
        <Collapsible
          title="Search Tools"
          subtitle="Search · Scrape · Compare"
          icon="manage_search"
          defaultOpen={false}
        >
          <SearchToolsClient modeChrome="inline" showConceptCard={false} />
        </Collapsible>
      </div>

      <div data-labs-block="batch">
        <Collapsible
          title="Batch"
          subtitle="Async batch jobs"
          icon="view_list"
          defaultOpen={openFiles}
        >
          <div className="space-y-4">
            <BatchPageClient showConceptCard={false} />
            <div data-labs-block="batch-files">
              <Collapsible
                title="Files"
                subtitle="Batch file uploads"
                icon="folder"
                defaultOpen={openFiles}
                variant="inline"
              >
                <BatchFilesPageClient showConceptCard={false} />
              </Collapsible>
            </div>
          </div>
        </Collapsible>
      </div>

      {/* Explainers / concept cards — page bottom, default collapsed */}
      <div className="space-y-2 pt-2" data-testid="labs-explainers">
        <Collapsible title="About Translator" icon="info" defaultOpen={false}>
          <TranslatorConceptCard />
        </Collapsible>
        <Collapsible title="About Search Tools" icon="info" defaultOpen={false}>
          <SearchConceptCard defaultCollapsed={false} />
        </Collapsible>
        <Collapsible title="About Batch" icon="info" defaultOpen={false}>
          <BatchConceptCard />
        </Collapsible>
        <Collapsible title="About Files" icon="info" defaultOpen={false}>
          <FilesConceptCard />
        </Collapsible>
      </div>
    </div>
  );
}
