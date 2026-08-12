"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { parseResponseBody, getErrorMessage } from "@/shared/utils/api";
import { isCredentialBlob, submitCredentialBlob } from "@/shared/components/oauthBlobSubmit";

const GOOGLE_OAUTH_PROVIDERS = new Set(["antigravity", "agy"]);

/** Providers that use a local callback server on a random port (PKCE browser flow). */
const PKCE_CALLBACK_SERVER_PROVIDERS = new Set(["codex", "grok-cli"]);

const DEVICE_CODE_PROVIDERS = new Set([
  "github",
  "kiro",
  "amazon-q",
  "kimi-coding",
  "kilocode",
  "codebuddy-cn",
  "grok-cli",
]);

/**
 * Phase 1 hotfix (2026-05-29): windsurf & devin-cli only support import-token.
 * Their PKCE flow targeting app.devin.ai/editor/signin returned 404 post-rebrand.
 * Phase 2 will reintroduce browser login via Firebase OAuth + RegisterUser.
 * Spec: _tasks/superpowers/specs/2026-05-29-windsurf-login-fix-design.md.
 */
const IMPORT_TOKEN_ONLY_PROVIDERS = new Set(["windsurf", "devin-cli"]);

type OAuthModalProps = {
  isOpen: boolean;
  provider?: string;
  providerInfo?: { name?: string } | null;
  onSuccess?: () => void;
  onClose: () => void;
  idcConfig?: unknown;
  reauthConnection?: null | { id?: string };
};

/**
 * OAuth Modal Component
 * - Localhost: Auto callback via popup message
 * - Remote: Manual paste callback URL
 */
export default function OAuthModal({
  isOpen,
  provider,
  providerInfo,
  onSuccess,
  onClose,
  idcConfig,
  reauthConnection,
}: OAuthModalProps) {
  const t = useTranslations("oauthModal");
  const [step, setStep] = useState("waiting"); // waiting | input | success | error
  const [authData, setAuthData] = useState(null);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [error, setError] = useState(null);
  const [isDeviceCode, setIsDeviceCode] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  const [polling, setPolling] = useState(false);
  // Task 0135: operator-controlled UX toggle. Defaults to true so the modal
  // behaves exactly as before. When false, the modal still spins up the
  // authorization-code flow + Codex PKCE callback server, but skips the
  // automatic `window.open(...)` call and forces the manual paste step so
  // operators in remote / popup-restricted environments can copy the auth
  // URL into a browser of their choice. Device-code and import-token flows
  // intentionally stay untouched — their window.open is informational
  // (verification URL) or not present at all (import-token).
  const [oauthAutoOpen, setOauthAutoOpen] = useState(true);
  // Mirror into a ref so the startOAuthFlow closure always sees the latest
  // value without forcing the callback identity to change (which would
  // re-trigger the mount-effect). The fetch effect updates both atomically.
  const oauthAutoOpenRef = useRef(true);
  useEffect(() => {
    oauthAutoOpenRef.current = oauthAutoOpen;
  }, [oauthAutoOpen]);
  // API-key paste mode: for providers that accept a token directly (windsurf, devin-cli)
  const [showPasteToken, setShowPasteToken] = useState(
    provider === "windsurf" || provider === "devin-cli"
  );
  const [pasteToken, setPasteToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  // grok-cli only (#7013 rework): device_code is the default method (matches
  // DEVICE_CODE_PROVIDERS); flipping this to true routes startOAuthFlow through
  // the browser PKCE / PKCE_CALLBACK_SERVER_PROVIDERS branch instead.
  const [grokBrowserMode, setGrokBrowserMode] = useState(false);

  const supportsTokenPaste =
    provider === "windsurf" || provider === "devin-cli" || provider === "grok-cli";
  // Phase 1 hotfix (2026-05-29): windsurf/devin-cli are import-token-only.
  // Hide the "Browser Login" tab — Phase 2 will restore it via Firebase OAuth.
  const importTokenOnly = IMPORT_TOKEN_ONLY_PROVIDERS.has(provider);
  const popupRef = useRef(null);
  // F1 FIX: per-flow abort controller + timer registry + generation guard so
  // closing the modal unmounts polling, prevents stale state/onSuccess, and
  // makes cancellation deterministic. Both device-code and callback-server loops
  // share this controller — they are mutually exclusive flows.
  const pollingAbortRef = useRef<AbortController | null>(null);
  const pollingTimeoutIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const flowGenerationRef = useRef(0);
  const abortActivePolling = useCallback(() => {
    const cur = pollingAbortRef.current;
    if (cur) {
      try {
        cur.abort();
      } catch {
        /* ignore */
      }
      pollingAbortRef.current = null;
    }
    for (const tid of pollingTimeoutIdsRef.current) {
      clearTimeout(tid);
    }
    pollingTimeoutIdsRef.current.clear();
    flowGenerationRef.current += 1;
  }, []);
  const scheduleCancellableDelay = useCallback(
    (ms: number, signal: AbortSignal): Promise<void> => {
      if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
      return new Promise<void>((resolve, reject) => {
        const tid: ReturnType<typeof setTimeout> = setTimeout(() => {
          pollingTimeoutIdsRef.current.delete(tid);
          if (signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
          } else {
            resolve();
          }
        }, ms);
        pollingTimeoutIdsRef.current.add(tid);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(tid);
            pollingTimeoutIdsRef.current.delete(tid);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true }
        );
      });
    },
    []
  );
  const { copied, copy } = useCopyToClipboard();
  const deviceVerificationUrl =
    deviceData?.verification_uri_complete || deviceData?.verification_uri || "";

  // Client-only runtime values
  const runtimeLocation = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        isLocalhost: false,
        isTrueLocalhost: false,
        placeholderUrl: "/callback?code=...",
      };
    }

    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    const isTrulyLocal = hostname === "localhost" || hostname === "127.0.0.1";

    return {
      isLocalhost: isLocal,
      isTrueLocalhost: isTrulyLocal,
      placeholderUrl: `${window.location.origin}/callback?code=...`,
    };
  }, []);

  const { isLocalhost, isTrueLocalhost, placeholderUrl } = runtimeLocation;
  const callbackProcessedRef = useRef(false);
  const flowStartedRef = useRef(false);

  // Define all useCallback hooks BEFORE the useEffects that reference them

  // Exchange tokens
  const exchangeTokens = useCallback(
    async (code, state) => {
      if (!authData) return;
      try {
        if (!authData.redirectUri || !authData.codeVerifier) {
          throw new Error(
            "OAuth session is incomplete (missing redirect URI or code verifier). Restart the connection and try again."
          );
        }

        const normalizedState = typeof state === "string" && state.length > 0 ? state : undefined;

        const res = await fetch(`/api/oauth/${provider}/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            redirectUri: authData.redirectUri,
            connectionId: reauthConnection?.id,
            codeVerifier: authData.codeVerifier,
            ...(normalizedState ? { state: normalizedState } : {}),
          }),
        });

        const data = (await parseResponseBody(res)) as Record<string, unknown>;
        if (!res.ok) {
          const errorObject =
            typeof data.error === "object" && data.error !== null
              ? (data.error as Record<string, unknown>)
              : null;
          const errMsg = errorObject
            ? (errorObject.message as string) || JSON.stringify(errorObject)
            : data.error || "Exchange failed";
          const details = Array.isArray(errorObject?.details)
            ? (errorObject.details as Array<{ field?: string; message?: string }>)
                .map((detail) => {
                  if (!detail?.message) return null;
                  return detail.field ? `${detail.field}: ${detail.message}` : detail.message;
                })
                .filter(Boolean)
                .join("; ")
            : "";
          throw new Error(details ? `${errMsg} (${details})` : errMsg);
        }

        setStep("success");
        onSuccess?.();
      } catch (err) {
        // Provide actionable guidance for redirect_uri_mismatch on Google OAuth providers
        if (
          err.message?.toLowerCase().includes("redirect_uri_mismatch") &&
          GOOGLE_OAUTH_PROVIDERS.has(provider)
        ) {
          setError(
            "redirect_uri_mismatch: The default Google OAuth credentials only work on localhost. " +
              "For remote use, configure your own OAuth credentials via environment variables: " +
              "ANTIGRAVITY_OAUTH_CLIENT_ID and ANTIGRAVITY_OAUTH_CLIENT_SECRET" +
              ". See the README section 'OAuth on a Remote Server'."
          );
        } else {
          setError(err.message);
        }
        setStep("error");
      }
    },
    [authData, provider, onSuccess, reauthConnection]
  );

  // Save a raw API token directly (windsurf / devin-cli import-token path)
  const handleSaveToken = useCallback(async () => {
    const token = pasteToken.trim();
    if (!token || !provider) return;
    setSavingToken(true);
    setError(null);
    try {
      // POST to /exchange with a synthetic "import_token" payload.
      // The windsurf provider's mapTokens() handles a bare accessToken/apiKey field.
      const res = await fetch(`/api/oauth/${provider}/import-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          connectionId: reauthConnection?.id,
        }),
      });
      const data = (await parseResponseBody(res)) as Record<string, unknown>;
      if (!res.ok) {
        const errMsg = getErrorMessage(data, res.status, "Save failed");
        throw new Error(errMsg);
      }
      setStep("success");
      onSuccess?.();
    } catch (err) {
      // Show error inline inside the paste-token form (don't flip to error step)
      setError(err.message);
    } finally {
      setSavingToken(false);
    }
  }, [pasteToken, provider, onSuccess, reauthConnection]);

  // Poll for device code token — abortable per F1. Every delay and fetch
  // is gated on a per-flow AbortSignal; close/unmount aborts the signal so
  // pending timers/fetches cancel, AbortError is treated as silent
  // cancellation (no error step), and late-arriving responses are ignored
  // via a generation guard before any state/onSuccess mutation.
  const startPolling = useCallback(
    async (deviceCode, codeVerifier, interval, extraData) => {
      // Cancel any in-flight polling from a prior flow session.
      abortActivePolling();
      const controller = new AbortController();
      pollingAbortRef.current = controller;
      const signal = controller.signal;
      const generation = flowGenerationRef.current;
      const isStale = () => generation !== flowGenerationRef.current || signal.aborted;
      const safeSetStep = (next: string) => {
        if (!isStale()) setStep(next as typeof step);
      };
      const safeSetError = (msg: string | null) => {
        if (!isStale()) setError(msg as typeof error);
      };
      const safeSetPolling = (next: boolean) => {
        if (!isStale()) setPolling(next);
      };
      const safeOnSuccess = () => {
        if (!isStale()) onSuccess?.();
      };
      safeSetPolling(true);
      const maxAttempts = 60;

      for (let i = 0; i < maxAttempts; i++) {
        try {
          await scheduleCancellableDelay(interval * 1000, signal);
        } catch (delayErr: unknown) {
          if (
            delayErr instanceof DOMException &&
            (delayErr as DOMException).name === "AbortError"
          ) {
            safeSetPolling(false);
            return;
          }
          // Fallback: treat any abort-shaped rejection as cancellation.
          if (signal.aborted) {
            safeSetPolling(false);
            return;
          }
          throw delayErr;
        }
        if (isStale()) {
          safeSetPolling(false);
          return;
        }

        try {
          const res = await fetch(`/api/oauth/${provider}/poll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceCode,
              connectionId: reauthConnection?.id,
              codeVerifier,
              extraData,
            }),
            signal,
          });

          const data = (await parseResponseBody(res)) as Record<string, unknown>;

          if (isStale()) {
            safeSetPolling(false);
            return;
          }

          if (data.success) {
            safeSetStep("success");
            safeSetPolling(false);
            safeOnSuccess();
            if (!isStale()) pollingAbortRef.current = null;
            return;
          }

          if (data.error === "expired_token" || data.error === "access_denied") {
            throw new Error((data.errorDescription as string) || (data.error as string));
          }

          if (data.error === "slow_down") {
            interval = Math.min(interval + 5, 30);
          }
        } catch (err: unknown) {
          if (isStale()) {
            safeSetPolling(false);
            return;
          }
          const maybeDom = err as DOMException;
          const isAbort =
            (maybeDom && maybeDom.name === "AbortError") ||
            (typeof (err as Error)?.message === "string" &&
              (err as Error).message.includes("aborted")) ||
            signal.aborted;
          if (isAbort) {
            safeSetPolling(false);
            return;
          }
          safeSetError((err as Error).message);
          safeSetStep("error");
          safeSetPolling(false);
          if (!isStale()) pollingAbortRef.current = null;
          return;
        }
      }

      safeSetError("Authorization timeout");
      safeSetStep("error");
      safeSetPolling(false);
      if (!isStale()) pollingAbortRef.current = null;
    },
    [provider, onSuccess, reauthConnection, abortActivePolling, scheduleCancellableDelay]
  );

  // Start OAuth flow. `opts.grokBrowser` lets the grok-cli method tabs force a
  // specific branch synchronously (avoids reading a just-set state value through
  // a stale closure); when omitted, falls back to the grokBrowserMode state.
  const startOAuthFlow = useCallback(
    async (opts?: { grokBrowser?: boolean }) => {
      if (!provider) return;
      try {
        setError(null);

        const grokWantsBrowser = provider === "grok-cli" && (opts?.grokBrowser ?? grokBrowserMode);

        // Device code flow
        if (DEVICE_CODE_PROVIDERS.has(provider) && !grokWantsBrowser) {
        setIsDeviceCode(true);
        setStep("waiting");

        const deviceCodeUrl = new URL(`/api/oauth/${provider}/device-code`, window.location.origin);
        if (
          (provider === "kiro" || provider === "amazon-q") &&
          idcConfig &&
          typeof idcConfig === "object"
        ) {
          const idc = idcConfig as { startUrl?: string; region?: string };
          if (typeof idc.startUrl === "string" && idc.startUrl.trim()) {
            deviceCodeUrl.searchParams.set("startUrl", idc.startUrl.trim());
          }
          if (typeof idc.region === "string" && idc.region.trim()) {
            deviceCodeUrl.searchParams.set("region", idc.region.trim());
          }
        }

        const res = await fetch(deviceCodeUrl.toString());
        const data = (await parseResponseBody(res)) as Record<string, unknown>;
        if (!res.ok) {
          const errMsg = getErrorMessage(data, res.status, "Request failed");
          throw new Error(errMsg);
        }

        setDeviceData(data);

        // Open verification URL
        const verifyUrl = data.verification_uri_complete || data.verification_uri;
        if (verifyUrl) window.open(verifyUrl, "oauth_verify");

        // Start polling - pass extraData for Kiro (contains _clientId, _clientSecret)
        const extraData =
          provider === "kiro" || provider === "amazon-q"
            ? {
                _clientId: data._clientId,
                _clientSecret: data._clientSecret,
                _region: data._region,
              }
            : null;
        startPolling(data.device_code, data.codeVerifier, data.interval || 5, extraData);
        return;
      }

      let forceManual = false;

      // Claude Code and Cline OAuth flows can finish on provider-hosted pages that
      // show an auth code instead of redirecting back to OmniRoute.
      // Start directly in manual mode so users always have an input to paste code/url.
      if (provider === "claude" || provider === "cline") {
        forceManual = true;
      }

      // PKCE callback server providers (Codex, Windsurf, Devin CLI):
      // On localhost, spin up a local callback server and poll for the result.
      // Codex uses a fixed port 1455; Windsurf/Devin CLI use a random OS-assigned port.
      // On remote the server is unreachable — fall through to standard manual flow.
      if (PKCE_CALLBACK_SERVER_PROVIDERS.has(provider)) {
        if (isTrueLocalhost) {
          try {
            const serverRes = await fetch(`/api/oauth/${provider}/start-callback-server`);
            const serverData = (await parseResponseBody(serverRes)) as Record<string, unknown>;
            if (!serverRes.ok)
              throw new Error(
                getErrorMessage(serverData, serverRes.status, "Failed to start callback server")
              );

            setAuthData({ ...serverData, redirectUri: serverData.redirectUri });
            // Task 0135: only auto-open the popup when the operator has not
            // disabled automatic popup behaviour. When disabled, we still
            // expose the URL + step into the manual paste UI, but the
            // callback-server polling continues in the background — if the
            // user completes the flow in a different browser on the same
            // localhost (Codex's 1455 port), the poll loop still catches the
            // success and triggers onSuccess().
            if (oauthAutoOpenRef.current) {
              setStep("waiting");
              popupRef.current = window.open(serverData.authUrl, "oauth_auth");
              // If browser blocked the popup, switch to manual input step immediately
              if (!popupRef.current) {
                setStep("input");
              }
            } else {
              setStep("input");
            }

            // F1 FIX: callback-server polling is also abortable — background poll-callback
            // polling must cancel on modal close/unmount and ignore late success/onSuccess.
            abortActivePolling();
            const cbController = new AbortController();
            pollingAbortRef.current = cbController;
            const cbSignal = cbController.signal;
            const cbGeneration = flowGenerationRef.current;
            const cbIsStale = () =>
              cbGeneration !== flowGenerationRef.current || cbSignal.aborted;
            const cbSafeSetPolling = (next: boolean) => {
              if (!cbIsStale()) setPolling(next);
            };
            const cbSafeSetStep = (next: string) => {
              if (!cbIsStale()) setStep(next as typeof step);
            };
            const cbSafeOnSuccess = () => {
              if (!cbIsStale()) onSuccess?.();
            };
            cbSafeSetPolling(true);
            const maxAttempts = 150;
            let cbTerminalErr: Error | null = null;
            for (let i = 0; i < maxAttempts; i++) {
              try {
                await scheduleCancellableDelay(2000, cbSignal);
              } catch (delayErr: unknown) {
                const isDelayAbort =
                  (delayErr instanceof DOMException &&
                    (delayErr as DOMException).name === "AbortError") ||
                  cbSignal.aborted;
                if (isDelayAbort) {
                  cbSafeSetPolling(false);
                  return;
                }
                throw delayErr;
              }
              if (cbIsStale()) {
                cbSafeSetPolling(false);
                return;
              }

              try {
                const pollRes = await fetch(`/api/oauth/${provider}/poll-callback`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ connectionId: reauthConnection?.id }),
                  signal: cbSignal,
                });
                const pollData = (await parseResponseBody(pollRes)) as Record<string, unknown>;

                if (cbIsStale()) {
                  cbSafeSetPolling(false);
                  return;
                }

                if (pollData.success) {
                  cbSafeSetStep("success");
                  cbSafeSetPolling(false);
                  cbSafeOnSuccess();
                  if (!cbIsStale()) pollingAbortRef.current = null;
                  return;
                }

                if (pollData.error && !pollData.pending) {
                  cbTerminalErr = new Error(
                    (pollData.errorDescription as string) || (pollData.error as string)
                  );
                  break;
                }
              } catch (err: unknown) {
                if (cbIsStale()) {
                  cbSafeSetPolling(false);
                  return;
                }
                const maybeDom = err as DOMException;
                const isAbort =
                  (maybeDom && maybeDom.name === "AbortError") ||
                  (typeof (err as Error)?.message === "string" &&
                    (err as Error).message.includes("aborted")) ||
                  cbSignal.aborted;
                if (isAbort) {
                  cbSafeSetPolling(false);
                  return;
                }
                cbTerminalErr = err as Error;
                break;
              }
            }

            cbSafeSetPolling(false);
            if (!cbIsStale()) pollingAbortRef.current = null;
            if (cbIsStale()) return;
            if (cbTerminalErr) throw cbTerminalErr;
            throw new Error("Authorization timeout");
          } catch (pkceErr) {
            console.warn(
              `${provider} callback server failed, falling back to manual flow`,
              pkceErr
            );
            setPolling(false);
            forceManual = true;
          }
        }
        // Remote: fall through to standard auth code flow below
      }

      // Authorization code flow
      // Redirect URI strategy:
      // - Codex/OpenAI: always port 1455 (registered in OAuth app)
      // - Windsurf/Devin CLI (remote fallback): use localhost with OmniRoute port + /auth/callback
      //   (on true localhost the callback server handles it; this is only reached on remote)
      // - Google OAuth providers (antigravity/agy): default to loopback so the
      //   bundled native/desktop credentials keep working. Prefer 127.0.0.1 over
      //   localhost for the Google native-app handoff; Google documents that localhost
      //   can run into local firewall/name-resolution edge cases. The authorize route
      //   upgrades this to the public callback when custom Google web credentials plus
      //   NEXT_PUBLIC_BASE_URL or OMNIROUTE_PUBLIC_BASE_URL are configured.
      // - Other providers on remote: use actual origin (supports PUBLIC_URL env var)
      // - Localhost: use localhost:port
      let redirectUri: string;
      if (provider === "codex" || provider === "openai") {
        redirectUri = "http://localhost:1455/auth/callback";
      } else if (provider === "grok-cli") {
        redirectUri = "http://127.0.0.1:56122/callback";
      } else if (provider === "windsurf" || provider === "devin-cli") {
        // Remote fallback: use OmniRoute's port with the /auth/callback path Windsurf expects.
        // On true localhost this code is never reached (callback server handles the flow above).
        const port = window.location.port || "20128";
        redirectUri = `http://localhost:${port}/auth/callback`;
      } else if (GOOGLE_OAUTH_PROVIDERS.has(provider)) {
        // Google OAuth built-in credentials only accept loopback redirect URIs.
        // Even in remote deployments we use loopback — user copies the callback URL manually.
        const port = window.location.port || "20128";
        redirectUri = `http://127.0.0.1:${port}/callback`;
      } else if (!isLocalhost) {
        // Behind reverse proxy: use actual origin (e.g., https://omniroute.example.com/callback)
        // Supports PUBLIC_URL env var override, or falls back to window.location.origin.
        const publicUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const origin =
          publicUrl && publicUrl !== "http://localhost:20128"
            ? publicUrl.replace(/\/$/, "")
            : window.location.origin;
        redirectUri = `${origin}/callback`;
      } else {
        const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
        redirectUri = `http://localhost:${port}/callback`;
      }

      const res = await fetch(
        `/api/oauth/${provider}/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      const data = (await parseResponseBody(res)) as Record<string, unknown>;
      if (!res.ok) {
        const errMsg = getErrorMessage(data, res.status, "Authorization failed");
        throw new Error(errMsg);
      }

      if (!data.authUrl) {
        throw new Error(
          data.error ||
            "Browser OAuth is unavailable for this provider in the current environment. Use the supported auth method instead."
        );
      }

      setAuthData({ ...data, redirectUri: data.redirectUri || redirectUri });

      // For non-true-localhost (LAN IPs, remote) or manual fallback: use manual input mode (user pastes callback URL)
      if (!isTrueLocalhost || forceManual) {
        setStep("input");
        if (oauthAutoOpenRef.current) {
          window.open(data.authUrl, "oauth_auth");
        }
      } else {
        // Localhost: Open popup and wait for message — unless the operator
        // disabled automatic popup open via the security-tab toggle
        // (Task 0135). The same-origin postMessage listener is wired up
        // unconditionally, so a manually-opened popup still drives
        // success. We always keep `authData` set so the manual paste step
        // remains meaningful even when no popup was launched.
        if (oauthAutoOpenRef.current) {
          setStep("waiting");
          popupRef.current = window.open(data.authUrl, "oauth_popup", "width=600,height=700");

          // Check if popup was blocked
          if (!popupRef.current) {
            setStep("input");
          }
        } else {
          setStep("input");
        }
      }
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  }, [
    provider,
    isLocalhost,
    isTrueLocalhost,
    startPolling,
    onSuccess,
    reauthConnection,
    idcConfig,
    grokBrowserMode,
    abortActivePolling,
    scheduleCancellableDelay,
  ]);

  // F1 FIX: Reset guard AND abort polling when modal closes/unmounts.
  // Also handles provider switch while modal stays open.
  useEffect(() => {
    if (!isOpen) {
      abortActivePolling();
      setPolling(false);
      flowStartedRef.current = false;
    }
  }, [isOpen, abortActivePolling]);
  useEffect(() => {
    return () => {
      // Unmount safety: if the modal tree unmounts mid-poll (e.g. route change),
      // cancel any in-flight poll timers/fetches so they can't call setters/onSuccess.
      abortActivePolling();
    };
  }, [abortActivePolling]);

  // Task 0135: fetch the operator's `oauthAutoOpen` preference from the
  // settings store once per mount. The route already filters out secrets, so
  // reading this value is safe in the dashboard. If the request fails
  // (network blip, offline load), we fall back to true (current behaviour)
  // so a transient failure never locks the user out of OAuth.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { oauthAutoOpen?: unknown };
        if (cancelled) return;
        if (typeof data.oauthAutoOpen === "boolean") {
          // Update both state (for re-render) and the ref (for the
          // startOAuthFlow closure that may have captured a stale value).
          setOauthAutoOpen(data.oauthAutoOpen);
          oauthAutoOpenRef.current = data.oauthAutoOpen;
        }
      } catch {
        // Network failure / unmounted modal: keep default (true). Do not throw
        // — the OAuth flow must continue regardless of settings availability.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset state and start OAuth when modal opens
  useEffect(() => {
    if (isOpen && provider) {
      if (flowStartedRef.current) return; // Already started, prevent duplicate
      flowStartedRef.current = true;
      setAuthData(null);
      setCallbackUrl("");
      setError(null);
      setIsDeviceCode(false);
      setDeviceData(null);
      setPolling(false);
      // Auto start OAuth
      startOAuthFlow();
    }
  }, [isOpen, provider, startOAuthFlow]);

  // Listen for OAuth callback via multiple methods
  useEffect(() => {
    if (!authData) return;
    callbackProcessedRef.current = false; // Reset when authData changes

    // Handler for callback data - only process once
    // F2 FIX: PKCE callback state must be non-empty and exactly match
    // the server-generated state (authData.state). Missing state or
    // mismatched state must reject before any token exchange. Device-code
    // non-PKCE flows are exempt (they never set authData, so this guard
    // is not entered for them — see the outer `if (!authData) return`).
    const handleCallback = async (data) => {
      if (callbackProcessedRef.current) return; // Already processed

      const { code, state, error: callbackError, errorDescription } = data;

      if (authData?.state) {
        if (!state || state !== authData.state) {
          callbackProcessedRef.current = true;
          setError("OAuth state mismatch. Restart the connection and try again.");
          setStep("error");
          return;
        }
      }

      if (callbackError) {
        callbackProcessedRef.current = true;
        setError(errorDescription || callbackError);
        setStep("error");
        return;
      }

      if (code) {
        callbackProcessedRef.current = true;
        await exchangeTokens(code, state);
      }
    };

    // Method 1: postMessage from popup
    const handleMessage = (event) => {
      // Accept same-origin OR localhost with same port (remote access scenario:
      // dashboard at 192.168.x:port, callback redirects to localhost:port)
      const currentPort = window.location.port;
      let isLoopbackOrigin = false;
      let isLocalhostSamePort = false;
      try {
        const eventUrl = new URL(event.origin);
        isLoopbackOrigin = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(eventUrl.hostname);
        isLocalhostSamePort = isLoopbackOrigin && eventUrl.port === currentPort;
      } catch {
        // Ignore malformed origins.
      }

      const payload = event.data?.data;
      const hasMatchingState = !!authData?.state && payload?.state === authData.state;
      const isGoogleLoopbackRelay =
        GOOGLE_OAUTH_PROVIDERS.has(provider) && isLoopbackOrigin && hasMatchingState;

      if (
        event.origin !== window.location.origin &&
        !isLocalhostSamePort &&
        !isGoogleLoopbackRelay
      ) {
        return;
      }
      if (event.data?.type === "oauth_callback") {
        handleCallback(payload);
      }
    };
    window.addEventListener("message", handleMessage);

    // Method 2: BroadcastChannel
    let channel;
    try {
      channel = new BroadcastChannel("oauth_callback");
      channel.onmessage = (event) => handleCallback(event.data);
    } catch (e) {
      console.log("BroadcastChannel not supported");
    }

    // Method 3: localStorage event
    const handleStorage = (event) => {
      if (event.key === "oauth_callback" && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          handleCallback(data);
          localStorage.removeItem("oauth_callback");
        } catch (e) {
          console.log("Failed to parse localStorage data");
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // Also check localStorage on mount (in case callback already happened)
    try {
      const stored = localStorage.getItem("oauth_callback");
      if (stored) {
        const data = JSON.parse(stored);
        // Only use if recent (within 30 seconds)
        if (data.timestamp && Date.now() - data.timestamp < 30000) {
          handleCallback(data);
          localStorage.removeItem("oauth_callback");
        }
      }
    } catch {
      // localStorage may be unavailable or data may be malformed - ignore silently
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
    };
  }, [authData, exchangeTokens, provider]);

  // Fix #344: Detect when OAuth popup is closed without completing authorization
  // Some providers (like Qoder) redirect to their own chat UI instead of sending a callback,
  // leaving the modal stuck at "Waiting for Authorization" forever.
  useEffect(() => {
    if (step !== "waiting" || isDeviceCode || !popupRef.current) return;

    let closed = false;
    const popupClosedInterval = setInterval(() => {
      if (callbackProcessedRef.current) {
        clearInterval(popupClosedInterval);
        return;
      }
      try {
        if (popupRef.current?.closed) {
          closed = true;
          clearInterval(popupClosedInterval);
          // Popup was closed without completing OAuth — switch to manual input mode
          // so user can paste the callback URL from their browser address bar
          if (step === "waiting") {
            setStep("input");
          }
        }
      } catch {
        // Cross-origin access may throw — ignore
      }
    }, 1000);

    // Safety timeout: 5 minutes
    const safetyTimeout = setTimeout(
      () => {
        if (!callbackProcessedRef.current && step === "waiting") {
          clearInterval(popupClosedInterval);
          setStep("input");
        }
      },
      5 * 60 * 1000
    );

    return () => {
      clearInterval(popupClosedInterval);
      clearTimeout(safetyTimeout);
    };
  }, [step, isDeviceCode]);

  // Handle manual URL input
  const handleManualSubmit = async () => {
    try {
      setError(null);
      if (isCredentialBlob(callbackUrl)) {
        await submitCredentialBlob(provider, callbackUrl, reauthConnection, setStep, onSuccess);
        return;
      }
      if (!authData) {
        throw new Error(
          "OAuth session not initialized. Restart the connection flow and try again."
        );
      }

      const input = callbackUrl.trim();
      let code: string | null = null;
      // F2 FIX: manual input must NOT default missing callback state to
      // authData.state. Only an explicit state on the URL (or raw code#state
      // hash fragment) is accepted; absent state stays null so the
      // downstream exact-match guard correctly rejects it. Device-code non-PKCE
      // flows never reach here because isDeviceCode input is hidden.
      let state: string | null = null;
      let errorParam = null;
      let errorDescription = null;

      try {
        const url = new URL(input);
        code = url.searchParams.get("code");
        const parsedState = url.searchParams.get("state");
        if (parsedState) state = parsedState;
        else {
          const hashState = url.hash.replace(/^#/, "").trim();
          if (hashState) state = hashState;
        }
        errorParam = url.searchParams.get("error");
        errorDescription = url.searchParams.get("error_description");
      } catch {
        // Claude Code remote auth may provide a raw "Authentication Code" like code#state.
        const [rawCode, rawState] = input.split("#", 2);
        code = rawCode || null;
        if (typeof rawState === "string" && rawState.trim().length > 0) state = rawState.trim();
      }

      if (errorParam) {
        throw new Error(errorDescription || errorParam);
      }

      if (!code) {
        throw new Error(
          "No authorization code found. Paste the callback URL or the Authentication Code."
        );
      }

      // F2 FIX: for PKCE session holders, enforce non-empty exact match
      // before exchange — missing/mismatched manual state must reject.
      // Non-PKCE/manual exception: providers whose flow is not PKCE have
      // null authData.state and skip this guard.
      if (authData?.state) {
        if (!state || state !== authData.state) {
          throw new Error("OAuth state mismatch. Restart the connection and try again.");
        }
      }

      await exchangeTokens(code, state);
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  };

  const handlePasteMode = useCallback(() => {
    setShowPasteToken(true);
  }, []);

  const handleBrowserMode = useCallback(() => {
    setShowPasteToken(false);
    if (provider === "grok-cli") setGrokBrowserMode(true);
    startOAuthFlow(provider === "grok-cli" ? { grokBrowser: true } : undefined);
  }, [startOAuthFlow, provider]);

  const handleDeviceCodeMode = useCallback(() => {
    setShowPasteToken(false);
    setGrokBrowserMode(false);
    startOAuthFlow({ grokBrowser: false });
  }, [startOAuthFlow]);

  if (!provider || !providerInfo) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={t("title", { providerName: providerInfo.name })}
      onClose={onClose}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Browser login with optional token-import fallback. grok-cli adds a
            third "Device Code" tab since it keeps BOTH the device_code flow
            (default) and the browser PKCE login alongside the paste-token import. */}
        {supportsTokenPaste && !importTokenOnly && step !== "success" && (
          <div className="flex gap-2 border-b border-border pb-3">
            {provider === "grok-cli" && (
              <button
                className={`text-sm px-3 py-1 rounded-t ${!showPasteToken && !grokBrowserMode ? "font-semibold border-b-2 border-primary text-primary" : "text-text-muted"}`}
                onClick={handleDeviceCodeMode}
              >
                Device Code
              </button>
            )}
            <button
              className={`text-sm px-3 py-1 rounded-t ${!showPasteToken && (provider !== "grok-cli" || grokBrowserMode) ? "font-semibold border-b-2 border-primary text-primary" : "text-text-muted"}`}
              onClick={handleBrowserMode}
            >
              Browser Login
            </button>
            <button
              className={`text-sm px-3 py-1 rounded-t ${showPasteToken ? "font-semibold border-b-2 border-primary text-primary" : "text-text-muted"}`}
              onClick={handlePasteMode}
            >
              {provider === "grok-cli" ? "Import auth.json" : "Paste API Key"}
            </button>
          </div>
        )}

        {/* Paste-token form (Windsurf / Devin CLI / Grok CLI fallback) */}
        {supportsTokenPaste && showPasteToken && step !== "success" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">
              {provider === "windsurf"
                ? 'In the Windsurf / VS Code IDE, run the "Windsurf: Provide Auth Token" command from the command palette (or click the Jupyter "Get Windsurf Authentication Token" button), then copy the shown token and paste it below. Opening windsurf.com/show-auth-token directly only shows a "Redirecting" page — the IDE must initiate the flow.'
                : provider === "grok-cli"
                  ? 'Paste the FULL contents of ~/.grok/auth.json or a raw JWT. A full auth.json contains a refresh_token for automatic token renewal. Prefer the dedicated Import auth.json modal when available.'
                  : 'Provide your WINDSURF_API_KEY (obtained via `devin auth login`, or via the Windsurf IDE "Windsurf: Provide Auth Token" command).'}
            </p>
            <Input
              value={pasteToken}
              onChange={(e) => setPasteToken(e.target.value)}
              placeholder={provider === "grok-cli" ? "eyJ..." : "ws-..."}
              type="password"
              label={provider === "grok-cli" ? "JWT Token" : "API Key / Token"}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button
                onClick={handleSaveToken}
                fullWidth
                disabled={!pasteToken.trim() || savingToken}
              >
                {savingToken ? "Saving…" : "Save Connection"}
              </Button>
              <Button onClick={onClose} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* OAuth flow steps — hidden when paste-token mode is active */}
        {(!supportsTokenPaste || !showPasteToken) && (
          <>
            {/* Waiting Step (Localhost - popup mode) */}
            {step === "waiting" && !isDeviceCode && (
              <div className="text-center py-6">
                <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-primary animate-spin">
                    progress_activity
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("waiting")}</h3>
                <p className="text-sm text-text-muted mb-2">{t("completeAuthInPopup")}</p>
                <p className="text-xs text-text-muted mb-4 opacity-70">{t("popupClosedHint")}</p>
                <Button variant="ghost" onClick={() => setStep("input")}>
                  {t("popupBlocked")}
                </Button>
              </div>
            )}

            {/* Device Code Flow - Waiting */}
            {step === "waiting" && isDeviceCode && deviceData && (
              <>
                <div className="text-center py-4">
                  <p className="text-sm text-text-muted mb-4">{t("deviceCodeVisitUrl")}</p>
                  <div className="bg-sidebar p-4 rounded-lg mb-4">
                    <p className="text-xs text-text-muted mb-1">{t("deviceCodeVerificationUrl")}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm break-all">{deviceVerificationUrl}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={copied === "verify_url" ? "check" : "content_copy"}
                        onClick={() => copy(deviceVerificationUrl, "verify_url")}
                      />
                    </div>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <p className="text-xs text-text-muted mb-1">{t("deviceCodeYourCode")}</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-2xl font-mono font-bold text-primary">
                        {deviceData.user_code}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={copied === "user_code" ? "check" : "content_copy"}
                        onClick={() => copy(deviceData.user_code, "user_code")}
                      />
                    </div>
                  </div>
                </div>
                {polling && (
                  <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    {t("deviceCodeWaiting")}
                  </div>
                )}
              </>
            )}

            {/* Manual Input Step */}
            {step === "input" && !isDeviceCode && (
              <>
                <div className="space-y-4">
                  {/* Remote/LAN server info for Google OAuth providers */}
                  {!isTrueLocalhost && GOOGLE_OAUTH_PROVIDERS.has(provider) && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                      <span className="material-symbols-outlined text-sm align-middle mr-1">
                        warning
                      </span>
                      <strong>
                        {t.rich("googleOAuthWarning", {
                          code: (c) => <code className="font-mono">{c}</code>,
                          a: (c) => (
                            <a
                              href="https://github.com/diegosouzapw/OmniRoute#oauth-on-a-remote-server"
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {c}
                            </a>
                          ),
                        })}
                      </strong>
                    </div>
                  )}
                  {/* Actionable remote paste instruction — shown for ALL remote providers,
                      including Google OAuth (antigravity/agy). The Google
                      loopback creds redirect to 127.0.0.1:<port>/callback, which on a
                      remotely-accessed dashboard lands on the operator's own machine and
                      shows a "can't reach this page" error. That is expected: the URL bar
                      still carries ?code=…, and pasting it below completes the login. Before
                      this, Google providers only saw the discouraging loopback warning and
                      never the "copy the URL and paste it" step, so remote login appeared to
                      hang. */}
                  {!isTrueLocalhost && (
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200">
                      <span className="material-symbols-outlined text-sm align-middle mr-1">
                        info
                      </span>
                      {t("remoteAccessInfo")}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium mb-2">{t("step1OpenUrl")}</p>
                    <div className="flex gap-2">
                      <Input
                        value={authData?.authUrl || ""}
                        readOnly
                        className="flex-1 font-mono text-xs"
                      />
                      <Button
                        variant="secondary"
                        icon={copied === "auth_url" ? "check" : "content_copy"}
                        onClick={() => copy(authData?.authUrl, "auth_url")}
                      >
                        {t("copy")}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">{t("step2PasteCallback")}</p>
                    <p className="text-xs text-text-muted mb-2">
                      {t.rich("step2Hint", {
                        code: (c) => <code className="font-mono">{c}</code>,
                      })}
                    </p>
                    <Input
                      value={callbackUrl}
                      onChange={(e) => setCallbackUrl(e.target.value)}
                      placeholder={
                        provider === "claude" || provider === "cline"
                          ? "code#state or /callback?code=..."
                          : placeholderUrl
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleManualSubmit}
                    fullWidth
                    disabled={!callbackUrl || (!authData && !isCredentialBlob(callbackUrl))}
                  >
                    {t("connect")}
                  </Button>
                  <Button onClick={onClose} variant="ghost" fullWidth>
                    {t("cancel")}
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* Success Step — shown for both OAuth and paste-token flows */}
        {step === "success" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-green-600">
                check_circle
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("success")}</h3>
            <p className="text-sm text-text-muted mb-4">
              {t("successMessage", { providerName: providerInfo.name })}
            </p>
            <Button onClick={onClose} fullWidth>
              {t("done")}
            </Button>
          </div>
        )}

        {/* Error Step — OAuth errors only; paste-token errors shown inline */}
        {step === "error" && !showPasteToken && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-red-600">error</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("error")}</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={startOAuthFlow} variant="secondary" fullWidth>
                {t("tryAgain")}
              </Button>
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
