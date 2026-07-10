"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, DeployRelayModal, SettingsTextField } from "@/shared/components";

interface DenoRelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployed: (poolProxyId: string, relayUrl: string) => void;
}

export default function DenoRelayModal({ isOpen, onClose, onDeployed }: DenoRelayModalProps) {
  const t = useTranslations("settings");
  const [denoToken, setDenoToken] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [projectName, setProjectName] = useState(
    process.env.NEXT_PUBLIC_DENO_RELAY_DEFAULT_PROJECT || "omniroute-deno-relay"
  );
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!denoToken.trim()) {
      setError(t("denoRelayTokenRequired"));
      return;
    }
    if (!orgDomain.trim()) {
      setError(t("denoRelayOrgDomainRequired"));
      return;
    }
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/proxy/deno-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          denoToken: denoToken.trim(),
          orgDomain: orgDomain.trim(),
          projectName: projectName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || t("denoRelayDeployFailed"));
      } else {
        setDenoToken("");
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
            terminal
          </span>
          {t("denoRelayModalTitle")}
        </span>
      }
      warning={t("denoRelayWarning")}
      error={error}
      note={t("denoRelayFreeTierNote")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={deploying}>
            {t("cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={handleDeploy} disabled={deploying}>
            {deploying ? t("denoRelayDeploying") : t("denoRelayDeploy")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SettingsTextField
          id="deno-token"
          label={t("denoRelayTokenLabel")}
          description={t("denoRelayTokenHint")}
          type="password"
          value={denoToken}
          onChange={setDenoToken}
          placeholder="ddo_..."
          autoComplete="off"
          disabled={deploying}
        />
        <SettingsTextField
          id="deno-org-domain"
          label={t("denoRelayOrgDomainLabel")}
          description={t("denoRelayOrgDomainHint")}
          type="text"
          value={orgDomain}
          onChange={setOrgDomain}
          placeholder="your-org.deno.net"
          disabled={deploying}
        />
        <SettingsTextField
          id="deno-project-name"
          label={t("denoRelayProjectNameLabel")}
          type="text"
          value={projectName}
          onChange={setProjectName}
          placeholder="omniroute-deno-relay"
          disabled={deploying}
        />
      </div>
    </DeployRelayModal>
  );
}
