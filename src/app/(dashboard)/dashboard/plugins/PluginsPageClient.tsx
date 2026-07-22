"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, EmptyState, Badge } from "@/shared/components";
import { useNotificationStore } from "@/store/notificationStore";
import { useTranslations } from "next-intl";

interface PluginInfo {
  name: string;
  version: string;
  description?: string;
  author?: string;
  status: string;
  enabled: boolean;
  hooks: string[];
}

interface MarketplacePlugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  verified?: boolean;
  tags?: string[];
}

/**
 * Plugins marketplace + installed list (re-homed under Operations → Integrations, Task 0094).
 * Nested config stays at `/dashboard/plugins/[name]/config`.
 */
export function PluginsPageClient() {
  const { addNotification } = useNotificationStore();
  const t = useTranslations("plugins");
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"installed" | "marketplace">("installed");
  const [marketplacePlugins, setMarketplacePlugins] = useState<MarketplacePlugin[]>([]);
  const [marketplaceUrl, setMarketplaceUrl] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch("/api/plugins");
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
    fetch("/api/settings")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.pluginMarketplaceUrl) setMarketplaceUrl(data.pluginMarketplaceUrl);
      })
      .catch(() => {});
  }, [fetchPlugins]);
  
  const fetchMarketplace = useCallback(async () => {
    try {
      const res = await fetch("/api/plugins/marketplace");
      if (res.ok) {
        const data = await res.json();
        setMarketplacePlugins(data.plugins || []);
      }
    } catch {}
  }, []);
  
  useEffect(() => {
    if (activeTab === "marketplace") {
      fetchMarketplace();
    }
  }, [activeTab, fetchMarketplace]);
  
  const handleSaveUrl = async () => {
    setSavingUrl(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginMarketplaceUrl: marketplaceUrl || null }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        addNotification({ type: "error", message: errData?.error || "Failed to save" });
        return;
      }
      addNotification({ type: "success", message: t("marketplaceUrlSaved") });
      await fetchMarketplace();
    } catch {
      addNotification({ type: "error", message: t("saveConfigurationFailed") });
    } finally {
      setSavingUrl(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/plugins/scan", { method: "POST" });
      if (res.ok) {
        addNotification({ type: "success", message: t("pluginScanComplete") });
        await fetchPlugins();
      }
    } catch {
      addNotification({ type: "error", message: t("pluginScanFailed") });
    } finally {
      setScanning(false);
    }
  };

  const handleToggle = async (name: string, enable: boolean) => {
    const endpoint = enable ? "activate" : "deactivate";
    try {
      const res = await fetch(`/api/plugins/${name}/${endpoint}`, { method: "POST" });
      if (res.ok) {
        addNotification({ type: "success", message: enable ? t("activated", { name }) : t("deactivated", { name }) });
        await fetchPlugins();
      }
    } catch {
      addNotification({ type: "error", message: enable ? t("activateFailed", { name }) : t("deactivateFailed", { name }) });
    }
  };

  const handleUninstall = async (name: string) => {
    if (!confirm(t("uninstallConfirm", { name }))) return;
    try {
      const res = await fetch(`/api/plugins/${name}`, { method: "DELETE" });
      if (res.ok) {
        addNotification({ type: "success", message: t("uninstalled", { name }) });
        await fetchPlugins();
      }
    } catch {
      addNotification({ type: "error", message: t("uninstallFailed", { name }) });
    }
  };

  if (loading) {
    return <div className="py-2 text-sm text-text-muted">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6" data-testid="plugins-page-client">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-main">{t("title")}</h2>
        <div className="flex gap-2">
          <Button variant={activeTab === "installed" ? "primary" : "secondary"} onClick={() => setActiveTab("installed")}>
            {t("installedTab")}
          </Button>
          <Button variant={activeTab === "marketplace" ? "primary" : "secondary"} onClick={() => setActiveTab("marketplace")}>
            {t("marketplaceTab")}
          </Button>
        </div>
      </div>

      {activeTab === "marketplace" && (
        <Card className="p-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-main mb-1">{t("marketplaceUrlLabel")}</label>
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-main placeholder:text-text-muted/60 focus:ring-1 focus:ring-accent/30 focus:border-accent/50 focus:outline-none transition-all"
              placeholder={t("marketplaceUrlPlaceholder")}
              value={marketplaceUrl}
              onChange={(e) => setMarketplaceUrl(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveUrl} disabled={savingUrl}>
            {t("saveMarketplaceUrl")}
          </Button>
        </Card>
      )}

      {activeTab === "installed" ? (
        <>
          <div className="flex items-center justify-end">
            <Button onClick={handleScan} disabled={scanning}>
              {scanning ? t("scanning") : t("scanForPlugins")}
            </Button>
          </div>
          {plugins.length === 0 ? (
            <EmptyState
              title={t("noPlugins")}
              description={t("noPluginsDescription")}
            />
          ) : (
            <div className="grid gap-4">
              {plugins.map((plugin) => (
                <Card key={plugin.name} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{plugin.name}</h3>
                      <p className="text-sm text-text-muted">
                        v{plugin.version}
                        {plugin.author ? ` by ${plugin.author}` : ""}
                        {plugin.description ? ` — ${plugin.description}` : ""}
                      </p>
                      <div className="mt-1 flex gap-1">
                        {plugin.hooks.map((hook) => (
                          <span
                            key={hook}
                            className="rounded bg-blue-500/10 dark:bg-blue-500/15 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-300"
                          >
                            {hook}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={plugin.enabled ? "secondary" : "primary"}
                        onClick={() => handleToggle(plugin.name, !plugin.enabled)}
                      >
                        {plugin.enabled ? t("deactivate") : t("activate")}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleUninstall(plugin.name)}
                      >
                        {t("uninstall")}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-4">
          {marketplacePlugins.length === 0 ? (
             <div className="text-text-muted py-4">{t("marketplaceEmpty")}</div>
          ) : (
            marketplacePlugins.map((plugin) => (
              <Card key={plugin.name} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {plugin.name}
                      {plugin.verified && <Badge variant="success">{t("verified")}</Badge>}
                    </h3>
                    <p className="text-sm text-text-muted">
                      v{plugin.version} by {plugin.author} — {plugin.description}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {plugin.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-slate-500/10 dark:bg-slate-500/15 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => {
                        addNotification({ type: "info", message: t("marketplaceInstallComingSoon") });
                      }}
                    >
                      {t("install")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default PluginsPageClient;
