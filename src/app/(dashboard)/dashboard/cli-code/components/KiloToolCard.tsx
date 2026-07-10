"use client";

import { useState, useEffect, useRef } from "react";
import { Button, ModelSelectModal, ManualConfigModal } from "@/shared/components";
import {
  ConfigurableToolCard,
  type ConfigurableToolCardMessage,
  type ConfigurableToolCardBackup,
} from "@/shared/components/cli";
import Image from "next/image";
import CliStatusBadge from "./CliStatusBadge";
import { useTranslations } from "next-intl";
import { DEFAULT_DISPLAY_BASE_URL } from "@/shared/hooks";

type ApiKeyOption = {
  id: string;
  key?: string;
  rawKey?: string;
};

type KiloToolCardProps = {
  tool: {
    id?: string;
    name: string;
    image?: string | null;
    color?: string;
  };
  isExpanded?: boolean;
  onToggle?: () => void;
  baseUrl?: string;
  hasActiveProviders?: boolean;
  apiKeys?: ApiKeyOption[];
  activeProviders?: unknown[];
  cloudEnabled?: boolean;
  batchStatus?: { configStatus?: string | null } | null;
  lastConfiguredAt?: string | null;
};

type KiloStatus = {
  installed?: boolean;
  runnable?: boolean;
  hasOmniRoute?: boolean;
  commandPath?: string;
  authPath?: string;
  settings?: { auth?: string[] };
  error?: string;
};

export default function KiloToolCard({
  tool,
  isExpanded = false,
  onToggle = () => {},
  baseUrl,
  hasActiveProviders,
  apiKeys,
  activeProviders,
  cloudEnabled,
  batchStatus,
  lastConfiguredAt,
}: KiloToolCardProps) {
  const t = useTranslations("cliTools");
  const [kiloStatus, setKiloStatus] = useState<KiloStatus | null>(null);
  const [checkingKilo, setCheckingKilo] = useState(false);
  const [applying, setApplying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<ConfigurableToolCardMessage | null>(null);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [showManualConfigModal, setShowManualConfigModal] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const hasInitializedModel = useRef(false);
  const [backups, setBackups] = useState<ConfigurableToolCardBackup[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const cliReady = !!(kiloStatus?.installed && kiloStatus?.runnable);

  const getConfigStatus = () => {
    if (!cliReady) return null;
    if (!kiloStatus?.hasOmniRoute) return "not_configured";
    return "configured";
  };

  const configStatus = getConfigStatus();
  const effectiveConfigStatus = configStatus || batchStatus?.configStatus || null;

  // (#523) Store the key *id* (not the masked string) so the backend can
  // resolve the real secret from DB before writing to config files.
  useEffect(() => {
    if (apiKeys && apiKeys.length > 0 && !selectedApiKeyId) {
      setSelectedApiKeyId(apiKeys[0].id);
    }
  }, [apiKeys, selectedApiKeyId]);

  useEffect(() => {
    if (isExpanded && !kiloStatus) {
      void checkKiloStatus();
      void fetchBackups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per expand when status unknown
  }, [isExpanded, kiloStatus]);

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/cli-tools/backups?tool=kilo");
      if (res.ok) {
        const data = (await res.json()) as { backups?: ConfigurableToolCardBackup[] };
        setBackups(data.backups || []);
      }
    } catch {
      /* ignore */
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    setRestoringBackup(backupId);
    try {
      const res = await fetch("/api/cli-tools/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "kilo", backupId }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: t("backupRestoredReloading") });
        await checkKiloStatus();
        await fetchBackups();
      } else {
        const data = (await res.json()) as { error?: string | { message?: string } };
        setMessage({
          type: "error",
          text:
            (typeof data.error === "string" ? data.error : data.error?.message) ||
            t("failedRestoreBackup"),
        });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setRestoringBackup(null);
    }
  };

  const checkKiloStatus = async () => {
    setCheckingKilo(true);
    try {
      const res = await fetch("/api/cli-tools/kilo-settings");
      const data = (await res.json()) as KiloStatus;
      setKiloStatus(data);
    } catch (error) {
      setKiloStatus({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setCheckingKilo(false);
    }
  };

  const getEffectiveBaseUrl = () => {
    if (customBaseUrl) return customBaseUrl;
    return baseUrl || DEFAULT_DISPLAY_BASE_URL;
  };

  const handleApply = async () => {
    setApplying(true);
    setMessage(null);
    try {
      const effectiveBaseUrl = getEffectiveBaseUrl();
      const normalizedBaseUrl = effectiveBaseUrl.endsWith("/v1")
        ? effectiveBaseUrl
        : `${effectiveBaseUrl}/v1`;

      // (#523) Prefer keyId lookup so the backend writes the real key to disk.
      const selectedKeyId = selectedApiKeyId?.trim() || null;

      const res = await fetch("/api/cli-tools/kilo-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: normalizedBaseUrl,
          apiKey: !cloudEnabled ? "sk_omniroute" : null,
          keyId: selectedKeyId,
          model: selectedModel,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string | { message?: string };
      };
      if (res.ok) {
        setMessage({ type: "success", text: data.message || t("applied") });
        await checkKiloStatus();
        await fetchBackups();
      } else {
        setMessage({
          type: "error",
          text: (typeof data.error === "string" ? data.error : data.error?.message) || t("failed"),
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setApplying(false);
    }
  };

  const handleReset = async () => {
    setRestoring(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cli-tools/kilo-settings", { method: "DELETE" });
      const data = (await res.json()) as {
        message?: string;
        error?: string | { message?: string };
      };
      if (res.ok) {
        setMessage({ type: "success", text: data.message || t("resetDone") });
        setSelectedModel("");
        hasInitializedModel.current = false;
        await checkKiloStatus();
        await fetchBackups();
      } else {
        setMessage({
          type: "error",
          text: (typeof data.error === "string" ? data.error : data.error?.message) || t("failed"),
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleSelectModel = (model: { value: string }) => {
    setSelectedModel(model.value);
    setModalOpen(false);
  };

  const handleManualConfig = (config: { model?: string; apiKey?: string; baseUrl?: string }) => {
    if (config.model) setSelectedModel(config.model);
    // (#523) Match apiKey string to key id if possible
    if (config.apiKey && apiKeys && apiKeys.length > 0) {
      const prefix = config.apiKey.slice(0, 8);
      const suffix = config.apiKey.slice(-4);
      const matchedKey = apiKeys.find(
        (k) => k.key && k.key.startsWith(prefix) && k.key.endsWith(suffix)
      );
      if (matchedKey) setSelectedApiKeyId(matchedKey.id);
    }
    if (config.baseUrl) setCustomBaseUrl(config.baseUrl);
    setShowManualConfigModal(false);
  };

  const runtimeTitle = cliReady
    ? t("cliDetectedReady", { tool: "Kilo Code" })
    : kiloStatus?.installed
      ? t("cliNotRunnable", { tool: "Kilo Code" })
      : t("cliNotDetected", { tool: "Kilo Code" });

  const icon = tool.image ? (
    <Image
      src={tool.image}
      alt={tool.name}
      width={32}
      height={32}
      className="size-8 object-contain rounded-lg"
      sizes="32px"
      onError={(e) => {
        (e.currentTarget as HTMLElement).style.display = "none";
      }}
    />
  ) : (
    <span className="material-symbols-outlined text-xl" style={{ color: tool.color }}>
      terminal
    </span>
  );

  return (
    <>
      <ConfigurableToolCard
        name={tool.name}
        description={t("toolDescriptions.kilo")}
        icon={icon}
        statusBadge={
          <CliStatusBadge
            effectiveConfigStatus={effectiveConfigStatus}
            batchStatus={batchStatus}
            lastConfiguredAt={lastConfiguredAt}
          />
        }
        isExpanded={isExpanded}
        onToggle={onToggle}
        data-testid="kilo-tool-card"
      >
        {checkingKilo && (
          <ConfigurableToolCard.Checking label={t("checkingCli", { tool: "Kilo Code" })} />
        )}

        {kiloStatus && !checkingKilo && (
          <ConfigurableToolCard.Body>
            <ConfigurableToolCard.RuntimeStatus
              ready={cliReady}
              title={runtimeTitle}
              paths={[
                ...(kiloStatus.commandPath
                  ? [{ label: t("binary"), value: kiloStatus.commandPath }]
                  : []),
                ...(kiloStatus.authPath ? [{ label: t("auth"), value: kiloStatus.authPath }] : []),
              ]}
            />

            {cliReady && (
              <>
                {configStatus === "configured" && (
                  <ConfigurableToolCard.ConfiguredBanner>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {t("omnirouteConfiguredOpenAiCompatible")}
                    </p>
                    <p className="text-xs text-text-muted">
                      {t("providers")}:{" "}
                      <strong>{kiloStatus.settings?.auth?.join(", ") || "—"}</strong>
                    </p>
                  </ConfigurableToolCard.ConfiguredBanner>
                )}

                <ConfigurableToolCard.Field label={t("model")}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      placeholder={t("providerModelPlaceholder")}
                      className="flex-1 px-3 py-2 bg-bg-secondary rounded-lg text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setModalOpen(true)}
                      disabled={!hasActiveProviders}
                    >
                      {t("select")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowManualConfigModal(true)}
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </Button>
                  </div>
                </ConfigurableToolCard.Field>

                <ConfigurableToolCard.Field label={t("apiKey")}>
                  {apiKeys && apiKeys.length > 0 ? (
                    <select
                      value={selectedApiKeyId}
                      onChange={(e) => setSelectedApiKeyId(e.target.value)}
                      className="px-3 py-2 bg-bg-secondary rounded-lg text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      {apiKeys.map((key) => (
                        <option key={key.id} value={key.id}>
                          {key.key}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-text-muted">
                      {cloudEnabled ? t("noApiKeysAvailable") : t("usingDefaultOmniroute")}
                    </p>
                  )}
                </ConfigurableToolCard.Field>

                <ConfigurableToolCard.Actions
                  applyLabel={configStatus === "configured" ? t("updateConfig") : t("applyConfig")}
                  onApply={() => {
                    void handleApply();
                  }}
                  applyDisabled={!selectedModel}
                  applying={applying}
                  showReset={configStatus === "configured"}
                  resetLabel={t("reset")}
                  onReset={() => {
                    void handleReset();
                  }}
                  resetting={restoring}
                />

                <ConfigurableToolCard.Message message={message} />

                <ConfigurableToolCard.Backups
                  backups={backups}
                  open={showBackups}
                  onToggle={() => setShowBackups(!showBackups)}
                  onRestore={(id) => {
                    void handleRestoreBackup(id);
                  }}
                  restoringId={restoringBackup}
                  backupsLabel={t("backups")}
                  restoreLabel={t("restore")}
                  emptyLabel={t("noBackupsAvailable")}
                />
              </>
            )}
          </ConfigurableToolCard.Body>
        )}
      </ConfigurableToolCard>

      <ModelSelectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelectModel}
        selectedModel={selectedModel}
        activeProviders={activeProviders}
        title={t("selectModelForTool", { tool: "Kilo Code" })}
      />
      {showManualConfigModal && (
        <ManualConfigModal
          isOpen={showManualConfigModal}
          onClose={() => setShowManualConfigModal(false)}
          title={t("kiloManualConfiguration")}
          {...({
            onApply: handleManualConfig,
            currentConfig: {
              model: selectedModel,
              apiKey: apiKeys?.find((k) => k.id === selectedApiKeyId)?.key || "",
              baseUrl: customBaseUrl || baseUrl,
            },
          } as Record<string, unknown>)}
        />
      )}
    </>
  );
}
