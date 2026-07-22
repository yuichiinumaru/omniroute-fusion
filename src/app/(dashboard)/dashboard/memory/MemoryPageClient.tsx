"use client";

import { useTranslations } from "next-intl";
import Collapsible from "@/shared/components/Collapsible";
import MemoryConceptCard from "./components/MemoryConceptCard";
import MemoriesTab from "./components/tabs/MemoriesTab";
import PlaygroundTab from "./components/tabs/PlaygroundTab";
import EngineTab from "./components/tabs/EngineTab";
import { useMemorySettings } from "./hooks/useMemorySettings";

/**
 * EPIC-20 T20-J / Task 0095 — Memory single-scroll body.
 * Stack order (locked): Memories → Engine → Playground → Concept (bottom collapsed).
 * No memories/engine/playground tab topbar L1 (Hard Rule #22).
 * Chrome: Ops hub topbar is layout-owned on `/operations/memory`.
 */
export default function MemoryPageClient() {
  const t = useTranslations("memory");
  const { settings, save } = useMemorySettings();
  const memoryEnabled = settings?.enabled ?? true;

  return (
    <div className="space-y-6" data-testid="memory-page" data-memory-page="">
      {/* Enable toggle — header placement (independent of former tab chrome) */}
      <div className="flex items-center justify-end gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm font-medium text-text-muted">{t("memoryEnabled")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={memoryEnabled}
            data-testid="memory-enabled-toggle"
            onClick={() => void save({ enabled: !memoryEnabled })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              memoryEnabled ? "bg-violet-500" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                memoryEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </div>

      {/* 1. Memories — primary work surface, default expanded */}
      <div data-section="memories" data-testid="section-memories">
        <Collapsible
          title={t("tabs.memories")}
          icon="psychology"
          defaultOpen={true}
        >
          <MemoriesTab />
        </Collapsible>
      </div>

      {/* 2. Engine — status/config, collapsible */}
      <div data-section="engine" data-testid="section-engine">
        <Collapsible title={t("tabs.engine")} icon="settings" defaultOpen={false}>
          <EngineTab />
        </Collapsible>
      </div>

      {/* 3. Playground — retrieve preview, collapsible */}
      <div data-section="playground" data-testid="section-playground">
        <Collapsible title={t("tabs.playground")} icon="science" defaultOpen={false}>
          <PlaygroundTab />
        </Collapsible>
      </div>

      {/* 4. Concept / explainer — bottom, default collapsed */}
      <div data-section="concept" data-testid="section-concept">
        <Collapsible
          title={t("concept.title")}
          icon="info"
          defaultOpen={false}
        >
          <MemoryConceptCard />
        </Collapsible>
      </div>
    </div>
  );
}
