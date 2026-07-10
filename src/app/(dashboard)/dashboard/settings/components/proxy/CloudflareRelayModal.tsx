"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, DeployRelayModal, SettingsTextField } from "@/shared/components";

interface CloudflareRelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployed: (poolProxyId: string, relayUrl: string) => void;
}

// Domain form for Cloudflare Workers relay deploy; chrome from DeployRelayModal.
export default function CloudflareRelayModal({
  isOpen,
  onClose,
  onDeployed,
}: CloudflareRelayModalProps) {
  const t = useTranslations("settings");
  const [accountId, setAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [projectName, setProjectName] = useState(
    process.env.NEXT_PUBLIC_CLOUDFLARE_RELAY_DEFAULT_PROJECT || "omniroute-relay"
  );
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!accountId.trim() || !apiToken.trim()) {
      setError(t("cloudflareRelayCredsRequired"));
      return;
    }
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/proxy/cloudflare-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: accountId.trim(),
          apiToken: apiToken.trim(),
          projectName: projectName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || t("cloudflareRelayDeployFailed"));
      } else {
        setApiToken("");
        onDeployed(data.poolProxyId as string, data.relayUrl as string);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unknownError"));
    } finally {
      setDeploying(false);
    }
  };

  return (
    <DeployRelayModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">
            cloud
          </span>
          {t("cloudflareRelayModalTitle")}
        </span>
      }
      warning={
        <>
          <p>{t("cloudflareRelayWarning")}</p>
          <p className="text-text-muted">{t("cloudflareRelayTokenHowto")}</p>
        </>
      }
      warningTone="orange"
      error={error}
      note={t("cloudflareRelayFreeTierNote")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={deploying}>
            {t("cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={handleDeploy} disabled={deploying}>
            {deploying ? t("cloudflareRelayDeploying") : t("cloudflareRelayDeploy")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SettingsTextField
          id="cloudflare-account-id"
          label={t("cloudflareRelayAccountIdLabel")}
          description={t("cloudflareRelayAccountIdHint")}
          type="text"
          value={accountId}
          onChange={setAccountId}
          placeholder="your-cloudflare-account-id"
          autoComplete="off"
          disabled={deploying}
        />
        <SettingsTextField
          id="cloudflare-api-token"
          label={t("cloudflareRelayApiTokenLabel")}
          description={t("cloudflareRelayApiTokenHint")}
          type="password"
          value={apiToken}
          onChange={setApiToken}
          placeholder="cloudflare-api-token"
          autoComplete="off"
          disabled={deploying}
        />
        <SettingsTextField
          id="cloudflare-project-name"
          label={t("cloudflareRelayProjectNameLabel")}
          type="text"
          value={projectName}
          onChange={setProjectName}
          placeholder="omniroute-relay"
          disabled={deploying}
        />
      </div>
    </DeployRelayModal>
  );
}
