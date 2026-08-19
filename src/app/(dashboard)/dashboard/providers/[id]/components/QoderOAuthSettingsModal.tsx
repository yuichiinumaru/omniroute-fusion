"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, Toggle } from "@/shared/components";

interface QoderOAuthSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QoderOAuthSettingsModal({
  isOpen,
  onClose,
  onSuccess,
}: QoderOAuthSettingsModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [authorizeUrl, setAuthorizeUrl] = useState("");
  const [tokenUrl, setTokenUrl] = useState("");
  const [userInfoUrl, setUserInfoUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setEnabled(data.qoderOAuthEnabled === true);
        setAuthorizeUrl(
          typeof data.qoderOAuthAuthorizeUrl === "string" ? data.qoderOAuthAuthorizeUrl : ""
        );
        setTokenUrl(typeof data.qoderOAuthTokenUrl === "string" ? data.qoderOAuthTokenUrl : "");
        setUserInfoUrl(
          typeof data.qoderOAuthUserInfoUrl === "string" ? data.qoderOAuthUserInfoUrl : ""
        );
        setClientId(typeof data.qoderOAuthClientId === "string" ? data.qoderOAuthClientId : "");
        setHasSecret(Boolean(data.hasQoderOAuthClientSecret));
        setClientSecret("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load settings");
        setLoading(false);
      });
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        qoderOAuthEnabled: enabled,
        qoderOAuthAuthorizeUrl: authorizeUrl.trim(),
        qoderOAuthTokenUrl: tokenUrl.trim(),
        qoderOAuthUserInfoUrl: userInfoUrl.trim(),
        qoderOAuthClientId: clientId.trim(),
      };
      if (clientSecret.trim()) {
        payload.qoderOAuthClientSecret = clientSecret.trim();
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save Qoder OAuth settings");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Qoder Browser OAuth Settings" onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-black/[0.02] dark:bg-white/[0.02]">
          <div>
            <p className="font-medium text-sm">Enable Qoder Browser OAuth</p>
            <p className="text-xs text-text-muted">
              Enable browser OAuth dynamically without modifying .env files or restarting.
            </p>
          </div>
          <Toggle
            checked={enabled}
            onChange={() => setEnabled(!enabled)}
            disabled={loading || saving}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Authorize URL"
            placeholder="https://api.qoder.com/oauth/authorize"
            value={authorizeUrl}
            onChange={(e) => setAuthorizeUrl(e.target.value)}
            disabled={loading || saving}
          />
          <Input
            label="Token URL"
            placeholder="https://api.qoder.com/oauth/token"
            value={tokenUrl}
            onChange={(e) => setTokenUrl(e.target.value)}
            disabled={loading || saving}
          />
          <Input
            label="User Info URL"
            placeholder="https://api.qoder.com/api/v1/user/info"
            value={userInfoUrl}
            onChange={(e) => setUserInfoUrl(e.target.value)}
            disabled={loading || saving}
          />
          <Input
            label="Client ID"
            placeholder="qoder-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={loading || saving}
          />
        </div>

        <div>
          <Input
            label="Client Secret"
            type="password"
            placeholder={
              hasSecret ? "•••••••• (secret configured)" : "Enter client secret (optional)"
            }
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            disabled={loading || saving}
          />
          <p className="text-xs text-text-muted mt-1">
            Stored securely in the database. Never exposed in API responses.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={loading}>
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
}
