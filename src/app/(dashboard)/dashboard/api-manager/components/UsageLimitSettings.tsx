"use client";

import { Input, SettingsToggleRow } from "@/shared/components";

export function UsageLimitSettings({
  enabled,
  dailyLimitUsd,
  weeklyLimitUsd,
  // enabledLabel/disabledLabel retained for caller API compatibility (pill text was
  // replaced by the shared Toggle; the row label is fixed on SettingsToggleRow).
  enabledLabel: _enabledLabel,
  disabledLabel: _disabledLabel,
  onEnabledChange,
  onDailyLimitUsdChange,
  onWeeklyLimitUsdChange,
}: {
  enabled: boolean;
  dailyLimitUsd: string;
  weeklyLimitUsd: string;
  enabledLabel: string;
  disabledLabel: string;
  onEnabledChange: (enabled: boolean) => void;
  onDailyLimitUsdChange: (value: string) => void;
  onWeeklyLimitUsdChange: (value: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-col gap-3">
      <SettingsToggleRow
        id="usage-limit-settings"
        label="USD usage quota"
        description="Blocks this key with a 400 API error after its local USD spend reaches the configured daily or weekly quota."
        checked={enabled}
        onChange={onEnabledChange}
        className="border-emerald-500/20 bg-emerald-500/5"
      />
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Daily quota (USD)</label>
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
            <label className="text-xs text-text-muted mb-1 block">Weekly quota (USD)</label>
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
        <p className="mt-2 text-[11px] text-text-muted">
          Weekly quota follows the cached Claude weekly reset when available; otherwise it falls back
          to a rolling 7 day window. Daily quota uses the Fortaleza calendar day.
        </p>
      </div>
    </div>
  );
}
