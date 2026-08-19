"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";

export type CursorAuthModalProps = {
  isOpen: boolean;
  initialMode?: "auto" | "paste";
  onSuccess?: () => void;
  onClose: () => void;
  reauthConnection?: unknown;
};

/**
 * Cursor Auth Modal
 * Supports:
 * 1. "Experimental Auto" CLI login flow (`cursor-agent logout && cursor-agent login` with stdout URL capture)
 * 2. "Paste Auth.json" manual import from `~/.config/cursor/auth.json` or `state.vscdb`
 */
export default function CursorAuthModal({
  isOpen,
  initialMode = "auto",
  onSuccess,
  onClose,
  reauthConnection: _,
}: CursorAuthModalProps) {
  const t = useTranslations("cursorAuthModal");
  const [activeTab, setActiveTab] = useState<"auto" | "paste">(initialMode);

  // Auto-detect & manual state
  const [accessToken, setAccessToken] = useState("");
  const [machineId, setMachineId] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  // Experimental Auto CLI capture state
  const [cliStarting, setCliStarting] = useState(false);
  const [cliStarted, setCliStarted] = useState(false);
  const [cliSessionId, setCliSessionId] = useState<string | null>(null);
  const [cliAuthUrl, setCliAuthUrl] = useState<string | null>(null);
  const [cliMessage, setCliMessage] = useState<string | null>(null);
  const [cliCapturing, setCliCapturing] = useState(false);
  const [cliError, setCliError] = useState<string | null>(null);
  const [cliCopied, setCliCopied] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync activeTab when modal opens with initialMode
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setPasteError(null);
      setCliError(null);
    }
  }, [isOpen, initialMode]);

  // Start CLI Login flow
  const startCliLogin = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setCliStarting(true);
    setCliStarted(false);
    setCliSessionId(null);
    setCliAuthUrl(null);
    setCliError(null);
    setCliMessage(null);

    try {
      const res = await fetch("/api/oauth/cursor/start-cli-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.safeMessage || data.error || "Failed to start Cursor CLI login");
      }

      setCliSessionId(data.captureSessionId || null);
      setCliAuthUrl(data.authUrl || null);
      setCliMessage(data.safeMessage || "Cursor CLI login started. Open the URL to authorize.");
      setCliStarted(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Failed to start Cursor CLI login";
      setCliError(msg);
    } finally {
      setCliStarting(false);
    }
  }, []);

  // Auto-start CLI login when entering "auto" tab
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === "auto" && !cliStarted && !cliStarting && !cliSessionId && !cliError) {
      startCliLogin();
    }
  }, [isOpen, activeTab, cliStarted, cliStarting, cliSessionId, cliError, startCliLogin]);

  // Auto-detect tokens for paste tab
  useEffect(() => {
    if (!isOpen || activeTab !== "paste" || autoDetected || autoDetecting) return;

    const autoDetect = async () => {
      setAutoDetecting(true);
      setPasteError(null);

      try {
        const res = await fetch("/api/oauth/cursor/auto-import");
        const data = await res.json().catch(() => ({}));

        if (data.found || data.success) {
          setAutoDetected(true);
        }
      } catch {
        // Silently ignore auto-detect error, user can paste manually
      } finally {
        setAutoDetecting(false);
      }
    };

    autoDetect();
  }, [isOpen, activeTab, autoDetected, autoDetecting]);

  const handleConfirmCliCapture = async () => {
    if (!cliSessionId) {
      setCliError("No active capture session. Click 'Retry Auto Login' to retry.");
      return;
    }

    setCliCapturing(true);
    setCliError(null);

    try {
      const res = await fetch("/api/oauth/cursor/capture-cli-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captureSessionId: cliSessionId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.safeMessage || "Failed to capture Cursor authentication");
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to capture Cursor authentication";
      setCliError(msg);
    } finally {
      setCliCapturing(false);
    }
  };

  const handleCancelCliCapture = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (cliSessionId) {
      try {
        await fetch("/api/oauth/cursor/cancel-cli-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ captureSessionId: cliSessionId }),
        });
      } catch {
        /* ignore */
      }
    }
    setCliSessionId(null);
    setCliStarted(false);
    onClose();
  };

  // Helper when user pastes a full auth.json into the textarea
  const handleAccessTokenChange = (val: string) => {
    setPasteError(null);
    const trimmed = val.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.accessToken === "string") {
          setAccessToken(parsed.accessToken);
          if (typeof parsed.machineId === "string") setMachineId(parsed.machineId);
          return;
        }
        if (typeof parsed.token === "string") {
          setAccessToken(parsed.token);
          if (typeof parsed.machineId === "string") setMachineId(parsed.machineId);
          return;
        }
      } catch {
        // Not valid JSON, keep as raw string
      }
    }
    setAccessToken(val);
  };

  const handleImportToken = async () => {
    if (!accessToken.trim()) {
      setPasteError(t("errorEnterToken"));
      return;
    }

    setImporting(true);
    setPasteError(null);

    try {
      const body: Record<string, string> = { accessToken: accessToken.trim() };
      if (machineId.trim()) body.machineId = machineId.trim();

      const res = await fetch("/api/oauth/cursor/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || t("errorImportFailed"));
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setPasteError(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={t("title")} onClose={handleCancelCliCapture} size="md">
      <div className="flex flex-col gap-4">
        {/* Mode Tabs */}
        <div className="flex gap-2 border-b border-border pb-2">
          <button
            type="button"
            className={`text-sm px-3 py-1.5 rounded-t font-medium transition-colors ${
              activeTab === "auto"
                ? "font-semibold border-b-2 border-primary text-primary"
                : "text-text-muted hover:text-text-main"
            }`}
            onClick={() => {
              setActiveTab("auto");
            }}
          >
            Experimental Auto
          </button>
          <button
            type="button"
            className={`text-sm px-3 py-1.5 rounded-t font-medium transition-colors ${
              activeTab === "paste"
                ? "font-semibold border-b-2 border-primary text-primary"
                : "text-text-muted hover:text-text-main"
            }`}
            onClick={() => {
              setActiveTab("paste");
            }}
          >
            Paste Auth.json
          </button>
        </div>

        {/* Tab 1: Experimental Auto CLI Login */}
        {activeTab === "auto" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-text-muted">
              Executes <code>cursor-agent login</code> in your local environment, captures the authentication URL, and securely imports the resulting credentials from <code>~/.config/cursor/auth.json</code>.
            </p>

            {cliStarting && (
              <div className="text-center py-6">
                <div className="size-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-primary animate-spin">
                    progress_activity
                  </span>
                </div>
                <h3 className="text-sm font-semibold mb-1">Starting CLI Login...</h3>
                <p className="text-xs text-text-muted">Running cursor-agent logout &amp;&amp; cursor-agent login</p>
              </div>
            )}

            {!cliStarting && cliStarted && (
              <div className="space-y-3">
                {cliAuthUrl ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-text-main">
                    <p className="font-semibold mb-1 text-primary">Browser Authentication URL</p>
                    <p className="text-text-muted mb-2">
                      Open the URL below in your browser to sign in to Cursor:
                    </p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        readOnly
                        value={cliAuthUrl}
                        className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-background border border-border rounded-md select-all text-text-main"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={cliCopied ? "check" : "content_copy"}
                        onClick={() => {
                          if (cliAuthUrl) {
                            navigator.clipboard.writeText(cliAuthUrl);
                            setCliCopied(true);
                            setTimeout(() => setCliCopied(false), 2000);
                          }
                        }}
                      >
                        {cliCopied ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        icon="open_in_new"
                        onClick={() => {
                          if (cliAuthUrl) {
                            window.open(cliAuthUrl, "_blank", "noopener,noreferrer");
                          }
                        }}
                      >
                        Open URL
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-300">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <p>
                        {cliMessage || "Cursor CLI login has started in the background. Complete the login prompt in your browser/terminal."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-sidebar/50 p-3 text-xs text-text-muted">
                  <p>
                    Step 1: Open the authentication link and authorize your Cursor account in the browser.
                  </p>
                  <p className="mt-1">
                    Step 2: Return here and click <strong>&quot;Logged in, proceed&quot;</strong> below to complete connection.
                  </p>
                </div>
              </div>
            )}

            {cliError && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 flex flex-col gap-2">
                <p className="text-xs text-red-600 dark:text-red-400">{cliError}</p>
                <div className="flex justify-end">
                  <Button size="sm" variant="secondary" onClick={startCliLogin}>
                    Retry Auto Login
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleConfirmCliCapture}
                fullWidth
                disabled={!cliSessionId || cliCapturing || cliStarting}
              >
                {cliCapturing ? "Capturing..." : "Logged in, proceed"}
              </Button>
              <Button onClick={handleCancelCliCapture} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Auth.json (Manual) */}
        {activeTab === "paste" && (
          <div className="flex flex-col gap-4">
            {autoDetecting && (
              <div className="text-center py-4">
                <span className="material-symbols-outlined text-2xl text-primary animate-spin mb-1">
                  progress_activity
                </span>
                <p className="text-xs text-text-muted">{t("readingFromCursor")}</p>
              </div>
            )}

            {autoDetected && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">
                    check_circle
                  </span>
                  <p className="text-xs text-green-800 dark:text-green-200">
                    {t("tokensAutoDetected")}
                  </p>
                </div>
              </div>
            )}

            {!autoDetected && !autoDetecting && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Paste the contents of <code>~/.config/cursor/auth.json</code> or your raw Access Token from Cursor IDE database.
                </p>
              </div>
            )}

            {/* Access Token / Auth JSON Input */}
            <div>
              <label className="block text-xs font-medium mb-1.5">
                {t("accessToken")} or auth.json <span className="text-red-500">{t("required")}</span>
              </label>
              <textarea
                value={accessToken}
                onChange={(e) => handleAccessTokenChange(e.target.value)}
                placeholder='Paste raw token or {"accessToken": "eyJ...", ...}'
                rows={3}
                className="w-full px-3 py-2 text-xs font-mono border border-border rounded-lg bg-background focus:outline-none focus:border-primary resize-none text-text-main"
              />
            </div>

            {/* Machine ID Input */}
            <div>
              <label className="block text-xs font-medium mb-1.5">
                {t("machineId")} <span className="text-text-muted text-xs">{t("optional")}</span>
              </label>
              <Input
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                placeholder={t("machineIdPlaceholder")}
                className="font-mono text-xs"
              />
            </div>

            {pasteError && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400">{pasteError}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {autoDetected ? (
                <Button
                  onClick={() => {
                    onSuccess?.();
                    onClose();
                  }}
                  fullWidth
                >
                  Done
                </Button>
              ) : (
                <Button
                  onClick={handleImportToken}
                  fullWidth
                  disabled={importing || !accessToken.trim()}
                >
                  {importing ? t("importing") : t("importToken")}
                </Button>
              )}
              <Button onClick={onClose} variant="ghost" fullWidth>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
