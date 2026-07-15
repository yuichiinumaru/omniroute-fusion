"use client";

import { useState, useEffect } from "react";
import { Toggle } from "@/shared/components";
import { cn } from "@/shared/utils/cn";
import { useTranslations } from "next-intl";
import { useIsElectron } from "@/shared/hooks/useElectron";
import {
  COMBO_CONFIG_MODE_SETTING_KEY,
  normalizeComboConfigMode,
  type ComboConfigMode,
} from "@/shared/constants/comboConfigMode";
import { PIN_PROVIDER_QUOTA_TO_HOME_KEY } from "@/shared/constants/homeWidgets";
import AccountEmailVisibilitySetting from "./AccountEmailVisibilitySetting";

/**
 * AppearanceTab — Settings > Interface (Task 0061 Option B; route still
 * `/dashboard/settings/appearance` after Task 0053 strip).
 *
 * Theme toggle, color picker, and branding inputs (app name, custom logo,
 * favicon) were removed in Task 0053: the app is dark-only with the coreCyan
 * accent and the brand name/logo come from the default install.
 *
 * What remains on this page are functional interface prefs (not theme/branding):
 *   - Endpoint tunnel visibility toggles
 *   - Pin-information-to-home toggles
 *   - Combo configuration mode (guided vs expert)
 *   - Provider quota auto-refresh
 *   - Account email visibility (global, see #3822)
 *   - Health-check log visibility
 *   - Electron "Start on Login" (Electron installs only)
 */
export default function AppearanceTab() {
  const t = useTranslations("settings");
  const isElectron = useIsElectron();

  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [autostartEnabled, setAutostartEnabled] = useState(false);

  useEffect(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.getAutostartStatus().then(setAutostartEnabled).catch(console.error);
    }
  }, [isElectron]);

  const pinProviderQuotaToHome = settings.pinProviderQuotaToHome === true;
  const showQuickStartOnHome = settings.showQuickStartOnHome !== false;
  const showProviderTopologyOnHome = settings.showProviderTopologyOnHome !== false;
  const autoRefreshProviderQuota = settings.autoRefreshProviderQuota === true;
  const autoRefreshProviderQuotaInterval = Number.isFinite(
    settings.autoRefreshProviderQuotaInterval
  )
    ? Number(settings.autoRefreshProviderQuotaInterval)
    : 180;
  const comboConfigMode = normalizeComboConfigMode(settings[COMBO_CONFIG_MODE_SETTING_KEY]);
  const showCloudflaredTunnel = settings.hideEndpointCloudflaredTunnel !== true;
  const showTailscaleFunnel = settings.hideEndpointTailscaleFunnel !== true;
  const showNgrokTunnel = settings.hideEndpointNgrokTunnel !== true;

  const getSettingsLabel = (key: string, fallback: string) =>
    typeof t.has === "function" && t.has(key) ? t(key) : fallback;

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateSetting = async (key: string, value: any) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, [key]: value }));
      }
    } catch (err) {
      console.error("Failed to update", key, err);
    }
  };

  const comboConfigModeOptions: Array<{
    id: ComboConfigMode;
    icon: string;
    title: string;
    description: string;
  }> = [
    {
      id: "guided",
      icon: "route",
      title: getSettingsLabel("comboConfigModeGuided", "Guided"),
      description: getSettingsLabel(
        "comboConfigModeGuidedDesc",
        "Use the current step-by-step combo builder."
      ),
    },
    {
      id: "expert",
      icon: "tune",
      title: getSettingsLabel("comboConfigModeExpert", "Expert"),
      description: getSettingsLabel(
        "comboConfigModeExpertDesc",
        "Show every combo option on one page and enable direct model entry."
      ),
    },
  ];

  const quotaRefreshInterval = Number.isFinite(autoRefreshProviderQuotaInterval)
    ? Math.min(3600, Math.max(10, Math.floor(autoRefreshProviderQuotaInterval)))
    : 180;

  return (
    <div className="flex flex-col gap-6">
      {/* Endpoint tunnel visibility */}
      <section>
        <div className="mb-3">
          <p className="font-medium">
            {getSettingsLabel("endpointTunnelVisibility", "Endpoint tunnel visibility")}
          </p>
          <p className="text-sm text-text-muted">
            {getSettingsLabel(
              "endpointTunnelVisibilityDesc",
              "Hide tunnel controls from the Endpoint page without changing tunnel state."
            )}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface/40 divide-y divide-border/70">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">
                {getSettingsLabel("showCloudflareTunnel", "Cloudflare Quick Tunnel")}
              </p>
              <p className="text-sm text-text-muted">
                {getSettingsLabel(
                  "showCloudflareTunnelDesc",
                  "Show Cloudflare Quick Tunnel controls on the Endpoint page."
                )}
              </p>
            </div>
            <Toggle
              checked={showCloudflaredTunnel}
              onChange={(checked) => updateSetting("hideEndpointCloudflaredTunnel", !checked)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">
                {getSettingsLabel("showTailscaleFunnel", "Tailscale Funnel")}
              </p>
              <p className="text-sm text-text-muted">
                {getSettingsLabel(
                  "showTailscaleFunnelDesc",
                  "Show Tailscale Funnel controls on the Endpoint page."
                )}
              </p>
            </div>
            <Toggle
              checked={showTailscaleFunnel}
              onChange={(checked) => updateSetting("hideEndpointTailscaleFunnel", !checked)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{getSettingsLabel("showNgrokTunnel", "ngrok Tunnel")}</p>
              <p className="text-sm text-text-muted">
                {getSettingsLabel(
                  "showNgrokTunnelDesc",
                  "Show ngrok Tunnel controls on the Endpoint page."
                )}
              </p>
            </div>
            <Toggle
              checked={showNgrokTunnel}
              onChange={(checked) => updateSetting("hideEndpointNgrokTunnel", !checked)}
              disabled={loading}
            />
          </div>
        </div>
      </section>

      {/* Pin information to Home page */}
      <section>
        <div className="mb-3">
          <p className="font-medium">
            {getSettingsLabel("homePinProviderQuotaToHome", "Pin Information to Home Page")}
          </p>
          <p className="text-sm text-text-muted">
            Choose which sections to pin to the top of the Home page.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface/40 overflow-hidden">
          <div className="divide-y divide-border/70">
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium">
                  {getSettingsLabel("homeProviderQuotaLimits", "Provider Quota Limits")}
                </p>
                <p className="text-sm text-text-muted">
                  {getSettingsLabel(
                    "homeProviderQuotaLimitsDesc",
                    "Pin the Provider Quota status container (with Refresh All button) to the top of the Home page."
                  )}
                </p>
              </div>
              <Toggle
                checked={pinProviderQuotaToHome}
                onChange={async (checked) => {
                  await updateSetting(PIN_PROVIDER_QUOTA_TO_HOME_KEY, checked);
                }}
                disabled={loading}
              />
            </div>

            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium">{getSettingsLabel("homeQuickStart", "Quick Start")}</p>
                <p className="text-sm text-text-muted">
                  {getSettingsLabel(
                    "homeQuickStartDesc",
                    "Show the Quick Start panel on the Home page."
                  )}
                </p>
              </div>
              <Toggle
                checked={showQuickStartOnHome}
                onChange={async (checked) => {
                  await updateSetting("showQuickStartOnHome", checked);
                }}
                disabled={loading}
              />
            </div>

            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium">
                  {getSettingsLabel("homeProviderTopology", "Provider Topology")}
                </p>
                <p className="text-sm text-text-muted">
                  {getSettingsLabel(
                    "homeProviderTopologyDesc",
                    "Show the Provider Topology on the Home page."
                  )}
                </p>
              </div>
              <Toggle
                checked={showProviderTopologyOnHome}
                onChange={async (checked) => {
                  await updateSetting("showProviderTopologyOnHome", checked);
                }}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Combo configuration mode */}
      <section>
        <div className="mb-3">
          <p className="font-medium">
            {getSettingsLabel("comboConfigMode", "Combo configuration mode")}
          </p>
          <p className="text-sm text-text-muted">
            {getSettingsLabel(
              "comboConfigModeDesc",
              "Choose how the combo create and edit dialog is organized."
            )}
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label={getSettingsLabel("comboConfigMode", "Combo configuration mode")}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {comboConfigModeOptions.map((option) => {
            const active = comboConfigMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={loading}
                onClick={() => updateSetting(COMBO_CONFIG_MODE_SETTING_KEY, option.id)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-60",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface/40 text-text-main hover:border-primary/40"
                )}
              >
                <span className="material-symbols-outlined mt-0.5 text-[20px]" aria-hidden="true">
                  {option.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs",
                      active ? "text-primary/80" : "text-text-muted"
                    )}
                  >
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Provider quota auto-refresh */}
      <section>
        <div className="mb-3">
          <p className="font-medium">
            {getSettingsLabel("providerQuotaAutoRefresh", "Provider Quota auto refresh")}
          </p>
          <p className="text-sm text-text-muted">
            {getSettingsLabel(
              "providerQuotaAutoRefreshDesc",
              "Refresh the Provider Limits view automatically while it stays open."
            )}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface/40 divide-y divide-border/70">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">
                {getSettingsLabel("providerQuotaAutoRefreshToggle", "Automatic refresh")}
              </p>
              <p className="text-sm text-text-muted">
                {getSettingsLabel(
                  "providerQuotaAutoRefreshToggleDesc",
                  "Refresh the quota view every few minutes while the page is visible."
                )}
              </p>
            </div>
            <Toggle
              checked={autoRefreshProviderQuota}
              onChange={async (checked) => {
                if (checked && !settings.autoRefreshProviderQuotaInterval) {
                  await updateSetting("autoRefreshProviderQuotaInterval", 180);
                }
                await updateSetting("autoRefreshProviderQuota", checked);
              }}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">
                {getSettingsLabel("providerQuotaAutoRefreshInterval", "Refresh interval")}
              </p>
              <p className="text-sm text-text-muted">
                {getSettingsLabel(
                  "providerQuotaAutoRefreshIntervalDesc",
                  "How often the quota view should refresh, in seconds."
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                max={3600}
                step={10}
                value={quotaRefreshInterval}
                onChange={async (e) => {
                  const next = Math.min(3600, Math.max(10, Number(e.target.value) || 180));
                  await updateSetting("autoRefreshProviderQuotaInterval", next);
                }}
                disabled={loading || !autoRefreshProviderQuota}
                className="h-10 w-28 px-3 rounded-lg bg-surface border border-border text-sm text-text-main focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <span className="text-xs text-text-muted">seconds</span>
            </div>
          </div>
        </div>
      </section>

      <AccountEmailVisibilitySetting />

      {/* Health-check logs visibility */}
      <section className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{t("hideHealthLogs")}</p>
            <p className="text-sm text-text-muted">{t("hideHealthLogsDesc")}</p>
          </div>
          <Toggle
            checked={settings.hideHealthCheckLogs === true}
            onChange={() => updateSetting("hideHealthCheckLogs", !settings.hideHealthCheckLogs)}
            disabled={loading}
          />
        </div>
      </section>

      {/* Electron: start on login */}
      {isElectron && (
        <section className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Start on Login</p>
              <p className="text-xs text-text-muted mt-0.5">
                Automatically launch OmniRoute on system startup and run silently in the
                background tray.
              </p>
            </div>
            <Toggle
              checked={autostartEnabled}
              onChange={async (checked) => {
                if (checked) {
                  const success = await window.electronAPI?.enableAutostart();
                  if (success) setAutostartEnabled(true);
                } else {
                  const success = await window.electronAPI?.disableAutostart();
                  if (success) setAutostartEnabled(false);
                }
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
