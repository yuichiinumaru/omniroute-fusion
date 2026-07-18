"use client";

import { useTranslations } from "next-intl";
import { Input, SettingsToggleRow } from "@/shared/components";

export function UsageLimitSettings({
  enabled,
  dailyLimitUsd,
  weeklyLimitUsd,
  onEnabledChange,
  onDailyLimitUsdChange,
  onWeeklyLimitUsdChange,
}: {
  enabled: boolean;
  dailyLimitUsd: string;
  weeklyLimitUsd: string;
  onEnabledChange: (enabled: boolean) => void;
  onDailyLimitUsdChange: (value: string) => void;
  onWeeklyLimitUsdChange: (value: string) => void;
}) {
  const t = useTranslations("apiManager");

  return (
    <div className="mt-1 flex flex-col gap-3">
      <SettingsToggleRow
        id="usage-limit-settings"
        label={t("usdUsageQuota")}
        description={t("usdUsageQuotaDesc")}
        checked={enabled}
        onChange={onEnabledChange}
        className="border-emerald-500/20 bg-emerald-500/5"
      />
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t("dailyQuotaUsd")}</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={dailyLimitUsd}
              onChange={(event) => onDailyLimitUsdChange(event.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t("weeklyQuotaUsd")}</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={weeklyLimitUsd}
              onChange={(event) => onWeeklyLimitUsdChange(event.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-text-muted">{t("usageQuotaWindowHint")}</p>
      </div>
    </div>
  );
}
