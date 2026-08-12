"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components";
import { useTranslations } from "next-intl";

const MODES = [
  {
    value: "passthrough",
    labelKey: "passthrough",
    descKey: "passthroughDesc",
    icon: "arrow_forward",
  },
  {
    value: "auto",
    labelKey: "auto",
    descKey: "autoDesc",
    icon: "auto_awesome",
  },
  {
    value: "custom",
    labelKey: "custom",
    descKey: "customDesc",
    icon: "tune",
  },
  {
    value: "adaptive",
    labelKey: "adaptive",
    descKey: "adaptiveDesc",
    icon: "trending_up",
  },
];

const EFFORTS = [
  { value: "none", labelKey: "effortNone", fallback: "None (0 tokens)" },
  { value: "low", labelKey: "effortLow", fallback: "Low (1K tokens)" },
  { value: "medium", labelKey: "effortMedium", fallback: "Medium (10K tokens)" },
  { value: "high", labelKey: "effortHigh", fallback: "High (128K tokens)" },
  { value: "xhigh", labelKey: "effortXhigh", fallback: "X-High (128K tokens)" },
  { value: "max", labelKey: "effortMax", fallback: "Max (128K tokens)" },
];

export default function ThinkingBudgetTab() {
  const [config, setConfig] = useState({
    mode: "passthrough",
    customBudget: 10240,
    effortLevel: "medium",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const t = useTranslations("settings");

  useEffect(() => {
    fetch("/api/settings/thinking-budget")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async (updates: Partial<typeof config>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/settings/thinking-budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        setStatus("saved");
        setTimeout(() => setStatus(""), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const getEffortLabel = (e: (typeof EFFORTS)[0]) => {
    try {
      const translated = t(e.labelKey);
      if (translated && translated !== e.labelKey) return translated;
    } catch {
      // Fallback if i18n key not present
    }
    return e.fallback;
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              psychology
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{t("thinkingBudgetTitle")}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                Global Fallback Level (Lowest Priority)
              </span>
            </div>
            <p className="text-sm text-text-muted">{t("thinkingBudgetDesc")}</p>
          </div>
        </div>
        {status === "saved" && (
          <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span> {t("saved")}
          </span>
        )}
        {status === "error" && (
          <span className="text-xs font-medium text-rose-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">error</span> Error saving
          </span>
        )}
      </div>

      {/* Scope Precedence Banner */}
      <div className="p-3 mb-5 rounded-lg bg-surface/30 border border-border/30 text-xs flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 font-medium text-text-main">
          <span className="material-symbols-outlined text-[16px] text-violet-400">format_list_bulleted</span>
          Resolution Precedence: <span className="font-mono text-violet-400">Model Suffix &gt; Provider &gt; Combo &gt; Global</span>
        </div>
        <p className="text-text-muted leading-relaxed">
          Global policy acts as the baseline fallback. A narrower override at Combo, Provider, or Model level will take precedence.
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => save({ mode: m.value })}
            disabled={loading || saving}
            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
              config.mode === m.value
                ? "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20"
                : "border-border/50 hover:border-border hover:bg-surface/30"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] mt-0.5 ${
                config.mode === m.value ? "text-violet-500" : "text-text-muted"
              }`}
            >
              {m.icon}
            </span>
            <div className="min-w-0">
              <p
                className={`text-sm font-medium ${config.mode === m.value ? "text-violet-400" : ""}`}
              >
                {t(m.labelKey)}
              </p>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{t(m.descKey)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Custom budget slider */}
      {config.mode === "custom" && (
        <div className="p-4 rounded-lg bg-surface/30 border border-border/30 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">{t("tokenBudget")}</p>
            <span className="text-sm font-mono tabular-nums text-violet-400">
              {config.customBudget.toLocaleString()} {t("tokens")}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="131072"
            step="1024"
            value={config.customBudget}
            onChange={(e) => save({ customBudget: parseInt(e.target.value) })}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>{t("off")}</span>
            <span>1K</span>
            <span>10K</span>
            <span>64K</span>
            <span>128K</span>
          </div>
          <p className="text-xs text-text-muted/80 mt-2 leading-relaxed">
            Note: Token budgets apply to token-budget capable models (e.g. Claude Sonnet, Gemini). Effort-only models (OpenAI o1/o3/o4/gpt-5, DeepSeek) map this budget to effort tiers.
          </p>
        </div>
      )}

      {/* Adaptive effort level */}
      {config.mode === "adaptive" && (
        <div className="p-4 rounded-lg bg-surface/30 border border-border/30 mb-4">
          <p className="text-sm font-medium mb-1">{t("baseEffortLevel")}</p>
          <p className="text-xs text-text-muted mb-3">{t("adaptiveHint")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {EFFORTS.map((e) => (
              <button
                key={e.value}
                onClick={() => save({ effortLevel: e.value })}
                disabled={loading || saving}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  config.effortLevel === e.value
                    ? "border-violet-500/50 bg-violet-500/10 text-violet-400 font-semibold"
                    : "border-border/50 text-text-muted hover:border-border"
                }`}
              >
                {getEffortLabel(e)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Capability Reference Card */}
      <div className="p-3 rounded-lg bg-surface/20 border border-border/20 text-xs flex flex-col gap-2">
        <span className="font-semibold text-text-main flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-violet-400">info</span>
          Target Reasoning Capabilities Guide
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-muted">
          <div className="p-2 rounded bg-black/5 dark:bg-white/5">
            <span className="font-medium text-text-main">Effort-tier Models:</span> OpenAI o1/o3/o4/gpt-5, DeepSeek, GLM. Uses effort levels (none–max). Token budget is ignored.
          </div>
          <div className="p-2 rounded bg-black/5 dark:bg-white/5">
            <span className="font-medium text-text-main">Token-budget Models:</span> Claude 3.7 Sonnet, Gemini 2.0 Thinking. Uses numeric token budgets.
          </div>
          <div className="p-2 rounded bg-black/5 dark:bg-white/5">
            <span className="font-medium text-text-main">Adaptive-only Models:</span> Claude Opus 4.7+. Uses adaptive effort scaling without fixed token budgets.
          </div>
          <div className="p-2 rounded bg-black/5 dark:bg-white/5">
            <span className="font-medium text-text-main">Non-reasoning Models:</span> gpt-4o-mini, standard models. Reasoning parameters automatically stripped.
          </div>
        </div>
      </div>
    </Card>
  );
}
