"use client";

// EnabledEngineSections — Task 0058 composition layer.
//
// Renders the detail content for each compression engine that is currently
// enabled in /api/settings/compression, in stable ENGINE_IDS catalog order.
// Standalone mode routes remain available; this only embeds their content
// under /dashboard/context/settings.
//
// F1: accepts optional controlled `engines` from CompressionPanel via the
// settings page so same-page toggles recompose without a full reload.
// F2: embeds mode clients with `embedded` to suppress standalone chrome.

import { useEffect, useMemo, useState } from "react";
import {
  ENGINE_IDS,
  engineMeta,
} from "../../../../../../open-sse/services/compression/engineCatalog.ts";
import { EngineConfigPage } from "@/shared/components/compression/EngineConfigPage";
import CavemanContextPageClient from "../caveman/CavemanContextPageClient";
import RtkContextPageClient from "../rtk/RtkContextPageClient";
import type { CompressionEngineToggle } from "./CompressionPanel";

/**
 * Boundary / uncontrolled fetch payload may omit fields.
 * Filtering uses strict `enabled === true` so missing/false both exclude.
 */
type EngineToggleBoundary = Partial<CompressionEngineToggle>;

type CompressionSettingsPayload = {
  engines?: Record<string, EngineToggleBoundary>;
};

/**
 * Engines that have a dedicated client page (custom UI) instead of the generic
 * EngineConfigPage shell. All other catalog engines use EngineConfigPage.
 */
const CUSTOM_ENGINE_PAGES: ReadonlySet<string> = new Set(["caveman", "rtk"]);

function EngineSectionBody({ engineId }: { engineId: string }) {
  if (engineId === "caveman") {
    return <CavemanContextPageClient embedded />;
  }
  if (engineId === "rtk") {
    return <RtkContextPageClient embedded />;
  }
  // Generic config + preview shell works for lite/ccr/headroom/aggressive/
  // llmlingua/session-dedup/ultra/relevance (and any future catalog engine
  // that has no custom client).
  return <EngineConfigPage engineId={engineId} embedded />;
}

export default function EnabledEngineSections({
  engines: enginesProp,
}: {
  /**
   * Controlled engines map from CompressionPanel (via settings page).
   * - `undefined` → self-fetch (uncontrolled / unit tests)
   * - `null` → parent still loading
   * - object → use as source of truth (including empty `{}`)
   *
   * Controlled path uses normalized `CompressionEngineToggle` (enabled: boolean).
   * Uncontrolled fetch may still see partial boundary rows.
   */
  engines?: Record<string, CompressionEngineToggle | EngineToggleBoundary> | null;
} = {}) {
  const isControlled = enginesProp !== undefined;
  const [fetchedEngines, setFetchedEngines] = useState<Record<
    string,
    EngineToggleBoundary
  > | null>(null);
  const [loading, setLoading] = useState(!isControlled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isControlled) return;

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
        setFetchedEngines(
          data?.engines && typeof data.engines === "object" ? data.engines : {}
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load compression settings");
        setFetchedEngines({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isControlled]);

  const engines = isControlled ? enginesProp : fetchedEngines;
  const effectiveLoading = isControlled ? enginesProp === null : loading;

  const enabledIds = useMemo(() => {
    if (!engines) return [] as string[];
    return ENGINE_IDS.filter((id) => engines[id]?.enabled === true);
  }, [engines]);

  if (effectiveLoading) {
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
