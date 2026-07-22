"use client";

/**
 * EPIC-20 T20-E / Task 0090 — Agents fusion (CLI Agents + CLI Code).
 * Content-only under Operations shell (0087). Exactly one topbar lives in layout —
 * this client never mounts OperationsTopbar / PageTabBar.
 *
 * Detail route strategy **A**: list fused here; detail stays at
 * `/dashboard/cli-agents/[id]` and `/dashboard/cli-code/[id]`.
 *
 * View density: grid | list, optional persist via localStorage key
 * `omniroute.operations.agents.viewMode`.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, CardSkeleton, Collapsible, Input } from "@/shared/components";
import { CliToolCard, CliConceptCard, CliComparisonCard } from "@/shared/components/cli";
import { CLI_TOOLS } from "@/shared/constants/cliTools";
import { EXPECTED_CODE_COUNT } from "@/shared/schemas/cliCatalog";
import type { CliCatalogEntry } from "@/shared/schemas/cliCatalog";
import { useToolBatchStatuses } from "@/shared/hooks/cli/useToolBatchStatuses";
import { cn } from "@/shared/utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────

export const AGENTS_VIEW_MODE_STORAGE_KEY = "omniroute.operations.agents.viewMode" as const;

export type AgentsViewMode = "grid" | "list";

type DetectionFilter = "all" | "installed" | "not_installed";
type BaseUrlFilter = "all" | "full" | "partial";

interface ProviderConnection {
  isActive?: boolean;
  [key: string]: unknown;
}

interface ProvidersResponse {
  connections?: ProviderConnection[];
}

const AGENT_TOOLS: CliCatalogEntry[] = Object.values(CLI_TOOLS).filter(
  (tool) => tool.category === "agent"
);

const CODE_TOOLS: CliCatalogEntry[] = Object.values(CLI_TOOLS).filter(
  (tool) => tool.category === "code" && tool.baseUrlSupport !== "none"
);

if (CODE_TOOLS.length !== EXPECTED_CODE_COUNT) {
  console.warn(
    `[AgentsFusion] Expected ${EXPECTED_CODE_COUNT} code tools, found ${CODE_TOOLS.length}.`
  );
}

// ── View-mode helpers (exported for unit tests) ───────────────────────────────

export function parseAgentsViewMode(raw: string | null | undefined): AgentsViewMode | null {
  if (raw === "grid" || raw === "list") return raw;
  return null;
}

export function readAgentsViewModePreference(): AgentsViewMode {
  if (typeof window === "undefined") return "grid";
  try {
    return parseAgentsViewMode(window.localStorage.getItem(AGENTS_VIEW_MODE_STORAGE_KEY)) ?? "grid";
  } catch {
    return "grid";
  }
}

export function writeAgentsViewModePreference(mode: AgentsViewMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AGENTS_VIEW_MODE_STORAGE_KEY, mode);
    // Notify same-tab subscribers (storage event is cross-tab only)
    window.dispatchEvent(
      new StorageEvent("storage", { key: AGENTS_VIEW_MODE_STORAGE_KEY, newValue: mode })
    );
  } catch {
    // ignore quota / private mode
  }
}

function subscribeAgentsViewMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === AGENTS_VIEW_MODE_STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getAgentsViewModeSnapshot(): AgentsViewMode {
  return readAgentsViewModePreference();
}

function getAgentsViewModeServerSnapshot(): AgentsViewMode {
  return "grid";
}

/** SSR-safe view mode preference (localStorage). */
export function useAgentsViewModePreference(): [AgentsViewMode, (mode: AgentsViewMode) => void] {
  const mode = useSyncExternalStore(
    subscribeAgentsViewMode,
    getAgentsViewModeSnapshot,
    getAgentsViewModeServerSnapshot
  );
  const setMode = useCallback((next: AgentsViewMode) => {
    writeAgentsViewModePreference(next);
  }, []);
  return [mode, setMode];
}

function matchesSearch(tool: CliCatalogEntry, q: string): boolean {
  if (!q) return true;
  const haystack = `${tool.name} ${tool.id} ${tool.vendor} ${tool.description}`.toLowerCase();
  return haystack.includes(q);
}

function matchesDetection(
  toolId: string,
  detectionFilter: DetectionFilter,
  installed: boolean
): boolean {
  if (detectionFilter === "all") return true;
  if (detectionFilter === "installed") return installed;
  return !installed;
}

// ── View mode control ─────────────────────────────────────────────────────────

function AgentsViewModeControl({
  mode,
  onChange,
}: {
  mode: AgentsViewMode;
  onChange: (mode: AgentsViewMode) => void;
}) {
  const t = useTranslations("cliAgents");
  const options: Array<{ mode: AgentsViewMode; label: string; icon: string }> = [
    { mode: "grid", label: t("viewModeGrid"), icon: "view_module" },
    { mode: "list", label: t("viewModeList"), icon: "view_agenda" },
  ];

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-bg-subtle p-0.5"
      role="radiogroup"
      aria-label={t("viewModeAria")}
      data-testid="agents-view-mode-control"
    >
      {options.map((option) => {
        const isActive = mode === option.mode;
        return (
          <label
            key={option.mode}
            data-testid={`agents-view-mode-${option.mode}`}
            data-active={isActive ? "true" : "false"}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer",
              isActive
                ? "bg-bg-primary text-text-main shadow-sm"
                : "text-text-muted hover:bg-bg-primary/70 hover:text-text-main"
            )}
          >
            <input
              type="radio"
              name="agents-view-mode"
              value={option.mode}
              checked={isActive}
              onChange={() => onChange(option.mode)}
              className="sr-only"
              aria-label={option.label}
            />
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              {option.icon}
            </span>
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

// ── Tool list ─────────────────────────────────────────────────────────────────

function ToolList({
  tools,
  statuses,
  viewMode,
  detailBase,
  hasActiveProviders,
  loading,
  emptyLabel,
}: {
  tools: CliCatalogEntry[];
  statuses: ReturnType<typeof useToolBatchStatuses>["statuses"];
  viewMode: AgentsViewMode;
  detailBase: "/dashboard/cli-agents" | "/dashboard/cli-code";
  hasActiveProviders: boolean;
  loading: boolean;
  emptyLabel: string;
}) {
  if (loading) {
    return (
      <div
        className={
          viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "flex flex-col gap-2"
        }
        data-view-layout={viewMode}
        data-testid="agents-tool-skeleton"
      >
        {Array.from({ length: Math.min(tools.length || 4, 6) }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted"
        data-testid="agents-empty-state"
      >
        <span className="material-symbols-outlined text-[36px]" aria-hidden="true">
          search_off
        </span>
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={
        viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "flex flex-col gap-2"
      }
      data-view-layout={viewMode}
      data-testid="agents-tool-list"
    >
      {tools.map((tool) => (
        <CliToolCard
          key={tool.id}
          tool={tool}
          batchStatus={statuses?.[tool.id] ?? null}
          detailHref={`${detailBase}/${tool.id}`}
          hasActiveProviders={hasActiveProviders}
          layout={viewMode}
        />
      ))}
    </div>
  );
}

// ── Main fusion client ────────────────────────────────────────────────────────

export default function AgentsFusionClient() {
  const tAgents = useTranslations("cliAgents");
  const tCode = useTranslations("cliCode");
  const tCommon = useTranslations("cliCommon");

  const { statuses, loading, refetch } = useToolBatchStatuses();

  const [hasActiveProviders, setHasActiveProviders] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/providers")
      .then<ProvidersResponse>((res) => (res.ok ? res.json() : Promise.resolve({ connections: [] })))
      .then((data) => {
        if (cancelled) return;
        const active = (data.connections ?? []).filter((c) => c.isActive !== false);
        setHasActiveProviders(active.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasActiveProviders(false);
      })
      .finally(() => {
        if (!cancelled) setProvidersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [search, setSearch] = useState("");
  const [detectionFilter, setDetectionFilter] = useState<DetectionFilter>("all");
  const [baseUrlFilter, setBaseUrlFilter] = useState<BaseUrlFilter>("all");
  const [viewMode, setViewMode] = useAgentsViewModePreference();

  const handleViewModeChange = useCallback(
    (mode: AgentsViewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  const q = search.trim().toLowerCase();

  const filteredAgents = useMemo(() => {
    return AGENT_TOOLS.filter((tool) => {
      if (!matchesSearch(tool, q)) return false;
      const installed = statuses?.[tool.id]?.detection.installed ?? false;
      return matchesDetection(tool.id, detectionFilter, installed);
    });
  }, [q, detectionFilter, statuses]);

  const filteredCode = useMemo(() => {
    return CODE_TOOLS.filter((tool) => {
      if (!matchesSearch(tool, q)) return false;
      const installed = statuses?.[tool.id]?.detection.installed ?? false;
      if (!matchesDetection(tool.id, detectionFilter, installed)) return false;
      if (baseUrlFilter !== "all" && tool.baseUrlSupport !== baseUrlFilter) return false;
      return true;
    });
  }, [q, detectionFilter, baseUrlFilter, statuses]);

  const isLoadingOverall = loading || providersLoading;

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="operations-agents-fusion"
      data-operations-agents-fusion=""
    >
      {/* Shared toolbar — search / detection / base-url (code) / grid-list / refresh */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-text-main leading-tight">
              {tAgents("fusionPageTitle")}
            </h1>
            <p className="text-sm text-text-muted mt-0.5">{tAgents("fusionPageSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AgentsViewModeControl mode={viewMode} onChange={handleViewModeChange} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refetch()}
              icon="refresh"
              aria-label={tCommon("card.refreshDetection")}
            >
              {tCommon("card.refreshDetection")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
          <div className="flex-1 min-w-[180px] max-w-md w-full">
            <Input
              placeholder={tAgents("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon="search"
              aria-label={tAgents("searchPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-[11px] text-text-muted uppercase tracking-wide">
              {tAgents("detectionFilterLabel")}
            </label>
            <select
              value={detectionFilter}
              onChange={(e) => setDetectionFilter(e.target.value as DetectionFilter)}
              className="h-8 px-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label={tAgents("detectionFilterLabel")}
            >
              <option value="all">{tAgents("detectionAll")}</option>
              <option value="installed">{tAgents("detectionInstalled")}</option>
              <option value="not_installed">{tAgents("detectionNotInstalled")}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-[11px] text-text-muted uppercase tracking-wide">
              {tCode("filterBaseUrlLabel")}
            </label>
            <select
              value={baseUrlFilter}
              onChange={(e) => setBaseUrlFilter(e.target.value as BaseUrlFilter)}
              className="h-8 px-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label={tCode("filterBaseUrlLabel")}
            >
              <option value="all">{tCode("baseUrlAll")}</option>
              <option value="full">{tCode("baseUrlFull")}</option>
              <option value="partial">{tCode("baseUrlPartial")}</option>
            </select>
          </div>
        </div>
      </div>

      {!providersLoading && !hasActiveProviders && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-500 flex-shrink-0">warning</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {tCommon("detail.noActiveProviders")}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {tCommon("detail.noActiveProvidersDesc")}
            </p>
            <Link
              href="/dashboard/providers"
              className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-medium hover:underline"
            >
              {tCommon("detail.openProviders")}
            </Link>
          </div>
        </div>
      )}

      {/* 1 — CLI Agents (default expanded) */}
      <div id="cli-agents" data-agents-block="cli-agents" data-testid="agents-block-cli-agents">
        <Collapsible
          title={tAgents("pageTitle")}
          subtitle={tAgents("pageSubtitle")}
          icon="smart_toy"
          defaultOpen={true}
          trailing={
            <span className="text-xs text-text-muted whitespace-nowrap">
              {tAgents("visibleCount", { count: filteredAgents.length })}
            </span>
          }
        >
          <ToolList
            tools={filteredAgents}
            statuses={statuses}
            viewMode={viewMode}
            detailBase="/dashboard/cli-agents"
            hasActiveProviders={hasActiveProviders}
            loading={isLoadingOverall}
            emptyLabel={tAgents("emptyState")}
          />
        </Collapsible>
      </div>

      {/* 2 — CLI Code (default expanded) */}
      <div id="cli-code" data-agents-block="cli-code" data-testid="agents-block-cli-code">
        <Collapsible
          title={tCode("pageTitle")}
          subtitle={tCode("pageSubtitle")}
          icon="terminal"
          defaultOpen={true}
          trailing={
            <span className="text-xs text-text-muted whitespace-nowrap">
              {tCode("visibleCount", { count: filteredCode.length })}
            </span>
          }
        >
          <ToolList
            tools={filteredCode}
            statuses={statuses}
            viewMode={viewMode}
            detailBase="/dashboard/cli-code"
            hasActiveProviders={hasActiveProviders}
            loading={isLoadingOverall}
            emptyLabel={tCode("emptyState")}
          />
        </Collapsible>
      </div>

      {/* Explainers — bottom, default collapsed (Epic §3 / operator law) */}
      <div
        data-testid="agents-explainers"
        data-agents-explainers=""
        data-explainer-placement="bottom"
      >
        <Collapsible
          title={tAgents("explainersTitle")}
          subtitle={tAgents("explainersSubtitle")}
          icon="info"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-4">
            <CliConceptCard currentType="agent" />
            <CliConceptCard currentType="code" />
            <CliComparisonCard currentType="agent" />
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
