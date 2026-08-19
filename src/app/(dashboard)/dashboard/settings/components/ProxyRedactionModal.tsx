"use client";

import { useState } from "react";
import { Modal, Button } from "@/shared/components";
import { PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE } from "@/shared/constants/proxyRedaction";

export interface ProxyRedactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnablePiiAndContinue: () => Promise<void> | void;
  onBypassAndContinue: (bypassToken: string) => Promise<void> | void;
}

export default function ProxyRedactionModal({
  isOpen,
  onClose,
  onEnablePiiAndContinue,
  onBypassAndContinue,
}: ProxyRedactionModalProps) {
  const [loadingPii, setLoadingPii] = useState(false);
  const [loadingBypass, setLoadingBypass] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPhraseMatching = confirmationPhrase.trim() === PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE;
  const canBypass = confirmed && isPhraseMatching && !loadingBypass && !loadingPii;

  const handleEnablePii = async () => {
    setError(null);
    setLoadingPii(true);
    try {
      // 1. Enable feature flag in DB
      const res = await fetch("/api/settings/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "PII_REDACTION_ENABLED", value: "true" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to enable PII redaction feature flag");
      }

      // 2. Execute pending action
      await onEnablePiiAndContinue();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to enable PII redaction");
    } finally {
      setLoadingPii(false);
    }
  };

  const handleBypass = async () => {
    if (!canBypass) return;
    setError(null);
    setLoadingBypass(true);
    try {
      // 1. Request one-time bypass token
      const res = await fetch("/api/settings/proxy/bypass-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationPhrase: confirmationPhrase.trim(),
          confirmed: true,
          reason: "User acknowledged unredacted proxy routing risks in dashboard modal",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || data?.error || "Failed to generate bypass token");
      }

      const data = await res.json();
      const token = data.bypassToken;
      if (!token) {
        throw new Error("Server returned no bypass token");
      }

      // 2. Execute pending action with bypass token
      await onBypassAndContinue(token);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to bypass redaction gate");
    } finally {
      setLoadingBypass(false);
    }
  };

  const handleResetAndClose = () => {
    setError(null);
    setConfirmed(false);
    setConfirmationPhrase("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      size="lg"
      title={
        <div className="flex items-center gap-2 text-rose-500 font-bold">
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">
            shield_with_heart
          </span>
          <span>PII Redaction Required for Proxy Routing</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            onClick={handleResetAndClose}
            disabled={loadingPii || loadingBypass}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Hard Rule #20 Protected</span>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-sm">
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1">
          <p className="font-semibold text-rose-400">Security Warning: Unredacted Proxy Routing</p>
          <p className="text-xs leading-relaxed text-rose-200/90">
            Routing LLM traffic through an external proxy without PII Redaction enabled exposes
            sensitive data, API keys, credentials, and prompt context to upstream network proxies.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Primary Safe Path */}
        <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400" aria-hidden="true">
                verified_user
              </span>
              <span className="font-bold text-emerald-400">Recommended: Enable PII Redaction</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300">
              Safe Path
            </span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Enables automatic request-side masking (
            <code className="font-mono text-emerald-300">PII_REDACTION_ENABLED</code>). Sensitive
            entities such as email addresses, SSNs, credit cards, and API credentials will be
            redacted before reaching the external proxy.
          </p>
          <Button
            variant="primary"
            className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            onClick={handleEnablePii}
            loading={loadingPii}
            disabled={loadingBypass}
            icon="lock"
          >
            Enable PII Redaction &amp; Continue
          </Button>
        </div>

        {/* Secondary High-Friction Path */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400" aria-hidden="true">
                warning
              </span>
              <span className="font-bold text-amber-400">High Risk: Route Without Redaction</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300">
              Explicit Bypass
            </span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            If your application strictly requires unredacted raw traffic through an external proxy,
            you must explicitly acknowledge the security exposure. This issues a single-use
            audit-logged bypass token.
          </p>

          <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs pt-1">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-border text-amber-500 focus:ring-amber-500/40"
            />
            <span className="text-text-main font-medium">
              I accept the risks of routing unredacted data through an external proxy
            </span>
          </label>

          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-medium text-text-muted">
              Type the confirmation phrase to enable bypass:
            </label>
            <div className="p-2 rounded bg-black/20 dark:bg-black/40 border border-border text-xs font-mono text-amber-300 select-all">
              {PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE}
            </div>
            <input
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              placeholder="Type phrase exactly as shown above..."
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs font-mono text-text-main focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <Button
            variant="secondary"
            className="w-full justify-center text-amber-400 border-amber-500/40 hover:bg-amber-500/10 font-medium"
            onClick={handleBypass}
            disabled={!canBypass}
            loading={loadingBypass}
            icon="key_off"
          >
            Bypass &amp; Continue (Single Use)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
