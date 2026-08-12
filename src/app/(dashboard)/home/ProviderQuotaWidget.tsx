"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import Card from "@/shared/components/Card";
import ProviderIcon from "@/shared/components/ProviderIcon";
import { extractApiErrorMessage } from "@/shared/http/apiErrorMessage";
import { translateUsageOrFallback } from "../dashboard/usage/components/ProviderLimits/i18nFallback";
import {
  aggregateProviderQuotaSummary,
} from "@/lib/quota/providerQuotaSummary";
import type {
  ProviderQuotaSummaryItem,
  ProviderQuotaSummaryResponse,
} from "@/shared/contracts/quota";

interface ProviderQuotaWidgetProps {
  autoRefreshInterval?: number;
  // Optional props for direct fixture/testing support
  connections?: any[];
  limitsCache?: Record<string, any>;
  summaryData?: ProviderQuotaSummaryResponse;
}

function formatAutoRefreshCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function AutoRefreshButtonLabel({
  autoRefreshIntervalMs,
  lastRefreshAllAt,
  refreshingAll,
  tr,
}: {
  autoRefreshIntervalMs: number;
  lastRefreshAllAt: number;
  refreshingAll: boolean;
  tr: (key: string, fallback: string) => string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (autoRefreshIntervalMs <= 0 || refreshingAll) return;

    const tick = () => setNow(Date.now());
    tick();

    const timer = window.setInterval(tick, 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") tick();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefreshIntervalMs, refreshingAll, lastRefreshAllAt]);

  if (refreshingAll) {
    return <>{tr("refreshing", "Refreshing")}</>;
  }

  if (autoRefreshIntervalMs <= 0) {
    return <>{tr("refreshAll", "Refresh All")}</>;
  }

  return (
    <>
      {tr("autoRefreshing", "Auto-refreshing")}{" "}
      {formatAutoRefreshCountdown(Math.max(0, autoRefreshIntervalMs - (now - lastRefreshAllAt)))}
    </>
  );
}

export default function ProviderQuotaWidget({
  autoRefreshInterval = 0,
  connections: propConnections,
  limitsCache: propLimitsCache,
  summaryData: propSummaryData,
}: ProviderQuotaWidgetProps) {
  const t = useTranslations("usage");
  const tr = useCallback(
    (key: string, fallback: string) => translateUsageOrFallback(t, key, fallback),
    [t]
  );

  const [summary, setSummary] = useState<ProviderQuotaSummaryResponse | null>(
    propSummaryData ?? null
  );
  const [loading, setLoading] = useState(!propSummaryData && !propConnections);
  const [refreshingAll, setRefreshingAll] = useState(false);

  const refreshingAllRef = useRef(false);
  const lastRefreshAllAtRef = useRef(Date.now());
  const [lastRefreshAllAt, setLastRefreshAllAt] = useState(() => lastRefreshAllAtRef.current);
  const autoRefreshIntervalMs = autoRefreshInterval > 0 ? autoRefreshInterval * 1000 : 0;

  const loadSummary = useCallback(async () => {
    if (propSummaryData) {
      setSummary(propSummaryData);
      setLoading(false);
      return;
    }

    if (propConnections) {
      const computed = aggregateProviderQuotaSummary(
        propConnections,
        propLimitsCache ?? {},
        {},
        { maxProviders: 6 }
      );
      setSummary(computed);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/providers/quota-summary");
      if (!res.ok) throw new Error("Failed to load quota summary");
      const data = (await res.json()) as ProviderQuotaSummaryResponse;
      setSummary(data);
    } catch {
      // Fallback attempt via client endpoints if dedicated summary endpoint fails
      try {
        const [connRes, limitsRes] = await Promise.all([
          fetch("/api/providers/client"),
          fetch("/api/usage/provider-limits"),
        ]);
        if (connRes.ok) {
          const connData = await connRes.json();
          const limitsData = limitsRes.ok ? await limitsRes.json() : {};
          const computed = aggregateProviderQuotaSummary(
            connData.connections || [],
            limitsData.caches || {},
            {},
            { maxProviders: 6 }
          );
          setSummary(computed);
        } else {
          setSummary({
            providers: [],
            meta: {
              generatedAt: new Date().toISOString(),
              totalActiveConnections: 0,
              totalProviders: 0,
              cappedAt: 6,
            },
          });
        }
      } catch {
        setSummary({
          providers: [],
          meta: {
            generatedAt: new Date().toISOString(),
            totalActiveConnections: 0,
            totalProviders: 0,
            cappedAt: 6,
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }, [propSummaryData, propConnections, propLimitsCache]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const refreshAll = useCallback(async () => {
    if (refreshingAllRef.current) return;
    refreshingAllRef.current = true;
    const now = Date.now();
    lastRefreshAllAtRef.current = now;
    setLastRefreshAllAt(now);
    setRefreshingAll(true);

    try {
      const res = await fetch("/api/usage/provider-limits", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(err, "Refresh failed"));
      }
      await loadSummary();
    } catch (e) {
      console.error("ProviderQuotaWidget refreshAll error:", e);
    } finally {
      refreshingAllRef.current = false;
      setRefreshingAll(false);
    }
  }, [loadSummary]);

  useEffect(() => {
    if (autoRefreshIntervalMs <= 0) return;

    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      if (refreshingAllRef.current) return;
      if (Date.now() - lastRefreshAllAtRef.current >= autoRefreshIntervalMs) {
        void refreshAll();
      }
    };

    maybeRefresh();
    const timer = window.setInterval(maybeRefresh, 1000);
    const handleVisibilityChange = () => maybeRefresh();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefreshIntervalMs, refreshAll]);

  const providers = summary?.providers ?? [];

  return (
    <Card className="overflow-hidden" data-testid="provider-quota-summary-card">
      {/* Header with title + Refresh All */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface/60">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            pie_chart
          </span>
          <div>
            <h3 className="font-semibold text-base">
              {tr("providerQuotaSummary", "Provider Quota Summary")}
            </h3>
            <p className="text-[11px] text-text-muted -mt-0.5">
              {tr("providerQuotaHomeHint", "Top active providers by account count")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          disabled={refreshingAll || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-subtle text-xs font-medium text-text-main disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface transition-colors"
          title={
            autoRefreshIntervalMs > 0
              ? tr("autoRefreshing", "Auto-refreshing")
              : tr("refreshAll", "Refresh All")
          }
        >
          <span
            className={`material-symbols-outlined text-[16px] ${refreshingAll ? "animate-spin" : ""}`}
          >
            {autoRefreshIntervalMs > 0 ? "schedule" : "refresh"}
          </span>
          <span>
            <AutoRefreshButtonLabel
              autoRefreshIntervalMs={autoRefreshIntervalMs}
              lastRefreshAllAt={lastRefreshAllAt}
              refreshingAll={refreshingAll}
              tr={tr}
            />
          </span>
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-text-muted text-sm" data-testid="quota-summary-loading">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            {tr("loadingQuotas", "Loading...")}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-6 text-sm text-text-muted" data-testid="quota-summary-empty">
            {tr("noProviders", "No Connected Providers")}
            <div className="mt-1 text-xs">
              {tr(
                "connectProvidersForQuota",
                "Connect to providers with OAuth or API key to track your quota limits."
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="quota-summary-grid">
            {providers.map((item: ProviderQuotaSummaryItem) => {
              const pct = item.percentRemaining;
              const hasQuota = item.hasKnownQuota && pct !== null;
              const isExhausted = item.isExhausted || (hasQuota && pct === 0);

              let barColor = "bg-emerald-500";
              if (isExhausted) {
                barColor = "bg-rose-500";
              } else if (hasQuota && pct !== null && pct < 50) {
                barColor = "bg-amber-500";
              }

              return (
                <div
                  key={item.providerId}
                  data-testid={`quota-summary-item-${item.providerId}`}
                  className="rounded-lg border border-border bg-surface/40 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <ProviderIcon providerId={item.providerId} size={18} />
                    <span className="font-medium text-sm truncate">{item.providerName}</span>
                    <span
                      data-testid={`account-count-${item.providerId}`}
                      className="text-[11px] text-text-muted ml-auto font-mono bg-surface-subtle px-1.5 py-0.5 rounded"
                      title={`${item.activeAccountCount} active account(s)`}
                    >
                      {item.activeAccountCount} {item.activeAccountCount === 1 ? "acc" : "accs"}
                    </span>
                  </div>

                  {hasQuota ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className={isExhausted ? "text-rose-500 font-semibold" : "text-text-main"}>
                          {isExhausted
                            ? tr("exhausted", "Exhausted (0%)")
                            : `${pct}% ${tr("remaining", "remaining")}`}
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${Math.max(2, pct!)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                      <span className="italic" data-testid={`unknown-quota-${item.providerId}`}>
                        {tr("unknownQuota", "Unknown quota")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 text-[11px] text-right text-text-muted">
          <a href="/dashboard/quota" className="hover:text-primary hover:underline">
            {tr("viewDetails", "View details")}
            <span aria-hidden="true"> &rarr;</span>
          </a>
        </div>
      </div>
    </Card>
  );
}
