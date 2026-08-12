"use client";

import { useTranslations } from "next-intl";
import { Card, Badge } from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/errorSanitizer";

export type DegradedKeyWarningItem = {
  id: string;
  providerId: string;
  providerName: string;
  connectionId: string;
  connectionName: string;
  keyId: string;
  status: "warning" | "invalid";
  failures: number;
  lastFailure: string | null;
  reason: string;
};

export type ApiKeyHealthWarningsProps = {
  connections?: Array<{
    id: string;
    provider: string;
    name?: string;
    testStatus?: string;
    lastError?: string | null;
    errorCode?: string | null;
    lastErrorType?: string | null;
    providerSpecificData?: {
      apiKeyHealth?: Record<
        string,
        {
          status: "active" | "warning" | "invalid";
          failures: number;
          lastFailure: string | null;
        }
      >;
      extraApiKeys?: string[];
    };
  }>;
};

export function extractDegradedKeyWarnings(
  connections: ApiKeyHealthWarningsProps["connections"] = []
): DegradedKeyWarningItem[] {
  const warnings: DegradedKeyWarningItem[] = [];

  for (const conn of connections) {
    if (!conn) continue;
    const psd = conn.providerSpecificData;
    const health = psd?.apiKeyHealth;
    if (!health) continue;

    const extras = psd?.extraApiKeys ?? [];
    const extraKeyCount = Array.isArray(extras) ? extras.length : 0;

    for (const [keyId, h] of Object.entries(health)) {
      if (!h || (h.status !== "invalid" && h.status !== "warning")) continue;

      if (keyId.startsWith("extra_")) {
        const idx = Number.parseInt(keyId.slice(6), 10);
        if (Number.isNaN(idx) || idx >= extraKeyCount) continue;
      }

      let rawReason = conn.lastError || conn.lastErrorType || conn.errorCode;
      if (!rawReason) {
        if (h.status === "invalid") {
          rawReason = "API key authentication invalid or failure threshold exceeded";
        } else {
          rawReason = "API key authentication warning";
        }
      }

      const sanitizedReason = sanitizeErrorMessage(rawReason) || "Authentication error";
      const providerInfo = (AI_PROVIDERS as Record<string, { name?: string }>)[conn.provider];
      const providerName = providerInfo?.name || conn.provider || "Unknown Provider";

      warnings.push({
        id: `${conn.id}:${keyId}`,
        providerId: conn.provider,
        providerName,
        connectionId: conn.id,
        connectionName: conn.name || conn.id,
        keyId,
        status: h.status,
        failures: h.failures || 0,
        lastFailure: h.lastFailure || null,
        reason: sanitizedReason,
      });
    }
  }

  return warnings;
}

export default function ApiKeyHealthWarnings({ connections = [] }: ApiKeyHealthWarningsProps) {
  const t = useTranslations("providers");
  const warnings = extractDegradedKeyWarnings(connections);

  if (warnings.length === 0) {
    return null;
  }

  return (
    <Card>
      <div role="region" aria-label="API Key Health Warnings" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
            <h2 className="text-base font-semibold">{t("apiKeyHealthLabel") || "API Key Health Warnings"}</h2>
          </div>
          <span className="text-xs text-text-muted">
            {warnings.length} {warnings.length === 1 ? "key degraded" : "keys degraded"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {warnings.map((w) => (
            <div
              key={w.id}
              className="rounded-lg border border-border bg-bg-subtle p-3.5 flex items-start gap-3"
            >
              <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-surface">
                <ProviderIcon providerId={w.providerId} size={22} type="color" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-text-main text-sm truncate">
                    {w.providerName}
                  </p>
                  <Badge variant={w.status === "invalid" ? "danger" : "warning"}>
                    {w.status}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  <span className="font-medium text-text-main">{w.connectionName}</span> ({w.keyId})
                </p>
                <p className="text-xs text-text-muted mt-1 break-words">
                  {w.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
