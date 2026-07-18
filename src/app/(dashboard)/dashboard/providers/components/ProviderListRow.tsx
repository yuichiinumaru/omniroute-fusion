"use client";

import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge, Toggle } from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import {
  isAnthropicCompatibleProvider,
  isClaudeCodeCompatibleProvider,
  isOpenAICompatibleProvider,
} from "@/shared/constants/providers";
import {
  connectionStatusToneToBadgeVariant,
  resolveProviderCardAuthStatusCopy,
  translateConnectionStatusCopy,
} from "@/shared/utils/connectionStatusPresentation";

import { CategoryDot } from "./CategoryDot";

interface ProviderStats {
  total?: number;
  connected?: number;
  error?: number;
  warning?: number;
  errorCode?: string | null;
  errorTime?: string | null;
  allDisabled?: boolean;
  expiryStatus?: "expired" | "expiring_soon" | string | null;
  rawErrorCode?: string | number | null;
  lastErrorType?: string | null;
  lastError?: string | null;
  latestTestStatus?: string | null;
}

const KIND_LABEL: Record<string, string> = {
  llm: "Chat",
  embedding: "Embed",
  image: "Image",
  imageToText: "I→T",
  tts: "TTS",
  stt: "STT",
  webSearch: "Search",
  webFetch: "Fetch",
  video: "Video",
  music: "Music",
};

const DOT_COLORS: Record<string, string> = {
  free: "bg-green-500",
  "no-auth": "bg-stone-500",
  oauth: "bg-blue-500",
  apikey: "bg-amber-500",
  compatible: "bg-orange-500",
  "web-cookie": "bg-purple-500",
  search: "bg-teal-500",
  audio: "bg-rose-500",
  local: "bg-emerald-500",
  "upstream-proxy": "bg-indigo-500",
  "cloud-agent": "bg-violet-500",
};

interface ProviderListRowProps {
  providerId: string;
  provider: {
    id?: string;
    name: string;
    color?: string;
    apiType?: string;
    deprecated?: boolean;
    deprecationReason?: string;
    hasFree?: boolean;
    freeNote?: string;
    subscriptionRisk?: boolean;
    serviceKinds?: string[];
  };
  stats: ProviderStats;
  authType?: string;
  onToggle: (active: boolean) => void;
}

function getStatusDisplay(connected: number, error: number, warning: number, t: ReturnType<typeof useTranslations>) {
  const parts: string[] = [];
  if (connected > 0) parts.push(t("connected", { count: connected }));
  if (warning > 0) parts.push(t("warningCount", { count: warning }));
  if (error > 0) parts.push(t("errorCountNoCode", { count: error }));
  if (parts.length === 0) parts.push(t("noConnections"));
  return parts;
}

export default function ProviderListRow({
  providerId,
  provider,
  stats,
  authType = "apikey",
  onToggle,
}: ProviderListRowProps) {
  const t = useTranslations("providers");
  const tc = useTranslations("common");

  const connected = Number(stats.connected || 0);
  const error = Number(stats.error || 0);
  const warning = Number(stats.warning || 0);
  const total = Number(stats.total || 0);
  const allDisabled = Boolean(stats.allDisabled);

  const authStatusCopy = resolveProviderCardAuthStatusCopy({
    authType,
    expiryStatus: stats.expiryStatus,
    rawErrorCode: stats.rawErrorCode,
    lastErrorType: stats.lastErrorType,
    lastError: stats.lastError,
    latestTestStatus: stats.latestTestStatus,
  });
  const authStatusLabels = authStatusCopy
    ? translateConnectionStatusCopy(authStatusCopy, (key, fallback) => {
        try {
          if (typeof t.has === "function" && !t.has(key as never)) return fallback;
          const out = t(key as never);
          if (!out || out === key) return fallback;
          if (String(out).startsWith("__MISSING__:")) {
            return String(out).slice("__MISSING__:".length) || fallback;
          }
          return String(out);
        } catch {
          return fallback;
        }
      })
    : null;

  const isCompatible = isOpenAICompatibleProvider(providerId);
  const isCcCompatible = isClaudeCodeCompatibleProvider(providerId);
  const isAnthropicCompatible = isAnthropicCompatibleProvider(providerId) && !isCcCompatible;

  const staticIconPath = (() => {
    if (isCompatible) {
      return provider.apiType === "responses" ? "/providers/oai-r.png" : "/providers/oai-cc.png";
    }
    if (isAnthropicCompatible || isCcCompatible) return "/providers/anthropic-m.png";
    return null;
  })();

  const handleToggle = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle(allDisabled);
  };

  const statusStrings = getStatusDisplay(connected, error, warning, t);
  const serviceKinds = provider.serviceKinds ?? [];
  const dotLabels: Record<string, string> = {
    free: tc("free"),
    "no-auth": t("noAuthLabel"),
    oauth: t("oauthLabel"),
    apikey: t("apiKeyLabel"),
    compatible: t("compatibleLabel"),
    "web-cookie": t("webCookieProviders"),
    search: t("searchProvidersHeading"),
    audio: t("audioProvidersHeading"),
    local: t("localProviders"),
    "upstream-proxy": t("upstreamProxyProviders"),
    "cloud-agent": t("cloudAgentProviders"),
  };

  const isLlmProvider =
    serviceKinds.includes("llm") ||
    (serviceKinds.length === 0 &&
      authType !== "search" &&
      authType !== "audio" &&
      authType !== "cloud-agent" &&
      authType !== "upstream-proxy" &&
      authType !== "no-auth");

  return (
    <Link
      href={`/dashboard/providers/${providerId}`}
      className={`block group rounded-lg border border-border bg-bg-primary hover:bg-black/[0.02] dark:hover:bg-white/[0.02] hover:border-primary/40 transition-colors ${allDisabled ? "opacity-50" : ""} ${provider.deprecated ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5 min-w-0">
        {/* Provider icon */}
        <div
          className="size-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${provider.color || "#64748b"}15` }}
        >
          {staticIconPath ? (
            <Image
              src={staticIconPath}
              alt={provider.name}
              width={22}
              height={22}
              className="object-contain rounded-lg max-w-[22px] max-h-[22px]"
              sizes="22px"
            />
          ) : (
            <ProviderIcon providerId={provider.id || providerId} size={18} type="color" />
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${provider.deprecated ? "line-through opacity-60" : ""}`}
            title={provider.name}
          >
            {provider.name}
          </span>
          {provider.deprecated && (
            <span
              className="material-symbols-outlined text-[14px] leading-none text-text-muted shrink-0"
              title={provider.deprecationReason || t("deprecatedProvider")}
              aria-label={t("deprecated")}
            >
              block
            </span>
          )}
          {provider.subscriptionRisk === true && (
            <span
              className="material-symbols-outlined text-[14px] leading-none text-amber-500 shrink-0"
              title={t("riskNotice.tooltip")}
              aria-label={t("riskNotice.tooltip")}
            >
              info
            </span>
          )}
          <CategoryDot
            color={DOT_COLORS[authType] || DOT_COLORS.apikey}
            hasFree={provider.hasFree === true}
            label={dotLabels[authType] || t("apiKeyLabel")}
            freeLabel={t("hasFreeTooltip")}
          />
        </div>

        {/* Service badges */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {serviceKinds.map((k) => (
            <span
              key={k}
              className="text-[10px] px-1.5 py-0.5 rounded bg-bg-subtle border border-border text-text-muted leading-none"
            >
              {KIND_LABEL[k] ?? k}
            </span>
          ))}
          {isCompatible && (
            <Badge variant="default" size="sm">
              {provider.apiType === "responses" ? t("responses") : t("chat")}
            </Badge>
          )}
          {isCcCompatible && (
            <Badge variant="default" size="sm">
              CC
            </Badge>
          )}
          {isAnthropicCompatible && (
            <Badge variant="default" size="sm">
              {t("messages")}
            </Badge>
          )}
        </div>

        {/* Accounts count */}
        <span className="text-xs text-text-muted tabular-nums shrink-0 min-w-[3ch] text-right">
          {total > 0 ? total : "—"}
        </span>

        {/* Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          {allDisabled ? (
            <Badge variant="default" size="sm">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">pause_circle</span>
                {t("disabled")}
              </span>
            </Badge>
          ) : (
            <>
              {connected > 0 && (
                <Badge variant="success" size="sm" dot>
                  {statusStrings[0]}
                </Badge>
              )}
              {warning > 0 && (
                <Badge variant="warning" size="sm" dot>
                  {statusStrings.find((s) => s.includes(String(warning))) ?? ""}
                </Badge>
              )}
              {error > 0 && (
                <Badge variant="error" size="sm" dot>
                  {statusStrings.find((s) => s.includes(String(error))) ?? ""}
                </Badge>
              )}
              {authStatusCopy && authStatusLabels && (
                <span
                  title={`${authStatusLabels.title}: ${authStatusLabels.detail} (${authStatusLabels.cta})`}
                >
                  <Badge
                    variant={connectionStatusToneToBadgeVariant(authStatusCopy.tone)}
                    size="sm"
                    dot
                  >
                    {authStatusLabels.badge}
                  </Badge>
                </span>
              )}
              {stats.expiryStatus === "expiring_soon" && (
                <Badge variant="warning" size="sm" dot>
                  {t("expiringSoonBadge")}
                </Badge>
              )}
              {connected === 0 && error === 0 && warning === 0 && !authStatusCopy && !stats.expiryStatus && (
                <span className="text-xs text-text-muted">{t("noConnections")}</span>
              )}
            </>
          )}
        </div>

        {/* Toggle + Test */}
        <div className="flex items-center gap-2 shrink-0">
          {total > 0 && (
            <div onClick={handleToggle}>
              <Toggle
                size="xs"
                checked={!allDisabled}
                onChange={() => {}}
                title={allDisabled ? t("enableProvider") : t("disableProvider")}
              />
            </div>
          )}
          {isLlmProvider && (
            <span className="material-symbols-outlined text-text-muted text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
              play_arrow
            </span>
          )}
          {!isLlmProvider && (
            <span className="material-symbols-outlined text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
              chevron_right
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}