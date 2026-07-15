"use client";

// EnabledEngineSections — Task 0058 composition layer.
//
// Renders the detail content for each compression engine that is currently
// enabled in /api/settings/compression, in stable ENGINE_IDS catalog order.
// Standalone mode routes remain available; this only embeds their content
// under /dashboard/context/settings.

import { useEffect, useMemo, useState } from "react";
import {
  ENGINE_IDS,
  engineMeta,
} from "../../../../../../open-sse/services/compression/engineCatalog.ts";
import { EngineConfigPage } from "@/shared/components/compression/EngineConfigPage";
import CavemanContextPageClient from "../caveman/CavemanContextPageClient";
import RtkContextPageClient from "../rtk/RtkContextPageClient";

type EngineToggle = { enabled?: boolean; level?: string };

type CompressionSettingsPayload = {
  engines?: Record<string, EngineToggle>;
};

/**
 * Engines that have a dedicated client page (custom UI) instead of the generic
 * EngineConfigPage shell. All other catalog engines use EngineConfigPage.
 */
const CUSTOM_ENGINE_PAGES: ReadonlySet<string> = new Set(["caveman", "rtk"]);

function EngineSectionBody({ engineId }: { engineId: string }) {
  if (engineId === "caveman") {
    return <CavemanContextPageClient />;
  }
  if (engineId === "rtk") {
    return <RtkContextPageClient />;
  }
  // Generic config + preview shell works for lite/ccr/headroom/aggressive/
  // llmlingua/session-dedup/ultra/relevance (and any future catalog engine
  // that has no custom client).
  return <EngineConfigPage engineId={engineId} />;
}

export default function EnabledEngineSections() {
  const [engines, setEngines] = useState<Record<string, EngineToggle> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/settings/compression")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load compression settings (${res.status})`);
        }
        return res.json() as Promise<CompressionSettingsPayload>;
      })
      .then((data) => {
        if (cancelled) return;
        setEngines(
          data?.engines && typeof data.engines === "object" ? data.engines : {}
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load compression settings");
        setEngines({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const enabledIds = useMemo(() => {
    if (!engines) return [] as string[];
    return ENGINE_IDS.filter((id) => engines[id]?.enabled === true);
  }, [engines]);

  if (loading) {
    return (
      <div
        data-testid="enabled-engine-sections-loading"
        className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-text-muted"
      >
        Loading enabled engines…
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="enabled-engine-sections-error"
        className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        {error}
      </div>
    );
  }

  // No engines enabled → render nothing extra (settings panel alone is enough).
  if (enabledIds.length === 0) {
    return null;
  }

  return (
    <div data-testid="enabled-engine-sections" className="flex flex-col gap-8">
      <div className="border-t border-border/60 pt-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Enabled engines
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          Detail configuration for engines currently turned on. Standalone routes remain available.
        </p>
      </div>

      {enabledIds.map((id) => {
        const meta = engineMeta(id);
        const label = meta?.label ?? id;
        return (
          <section
            key={id}
            data-testid={`enabled-engine-section-${id}`}
            data-engine-id={id}
            data-custom-page={CUSTOM_ENGINE_PAGES.has(id) ? "true" : "false"}
            className="rounded-xl border border-border bg-surface/40"
            aria-label={`${label} engine settings`}
          >
            <div className="border-b border-border/60 px-4 py-2">
              <h3 className="text-sm font-medium text-text-main">{label}</h3>
              {meta?.description ? (
                <p className="text-xs text-text-muted">{meta.description}</p>
              ) : null}
            </div>
            <div className="min-w-0">
              <EngineSectionBody engineId={id} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
