"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, DeployRelayModal, SettingsTextField } from "@/shared/components";

interface VercelRelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployed: (poolProxyId: string, relayUrl: string) => void;
}

export default function VercelRelayModal({ isOpen, onClose, onDeployed }: VercelRelayModalProps) {
  const t = useTranslations("settings");
  const [token, setToken] = useState("");
  const [projectName, setProjectName] = useState(
    process.env.NEXT_PUBLIC_VERCEL_RELAY_DEFAULT_PROJECT || "omniroute-relay"
  );
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!token.trim()) {
      setError(t("vercelRelayTokenRequired"));
      return;
    }
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/proxy/vercel-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), projectName: projectName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || t("vercelRelayDeployFailed"));
      } else {
        setToken("");
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
            cloud_upload
          </span>
          {t("vercelRelayModalTitle")}
        </span>
      }
      warning={t("vercelRelayWarning")}
      error={error}
      note={t("vercelRelayFreeTierNote")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={deploying}>
            {t("cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={handleDeploy} disabled={deploying}>
            {deploying ? t("vercelRelayDeploying") : t("vercelRelayDeploy")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SettingsTextField
          id="vercel-token"
          label={t("vercelRelayTokenLabel")}
          description={t("vercelRelayTokenHint")}
          type="password"
          value={token}
          onChange={setToken}
          placeholder="vercel_pat_..."
          autoComplete="off"
          disabled={deploying}
        />
        <SettingsTextField
          id="vercel-project-name"
          label={t("vercelRelayProjectNameLabel")}
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
