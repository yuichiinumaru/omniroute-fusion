import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import {
  getProvider,
  generateAuthData,
  exchangeTokens,
  finalizeTokens,
  requestDeviceCode,
  pollForToken,
  resolveBrowserOAuthRedirectUri,
} from "@/lib/oauth/providers";
import {
  persistOAuthConnection,
  buildOAuthConnectionCreatePayload,
} from "@/lib/oauth/connectionPersistence";
import { createDeviceFlowTicket, getDeviceFlowTicketStatus } from "@/lib/oauth/deviceFlowTickets";
import {
  createProviderConnection,
  updateProviderConnection,
  getProviderConnections,
  isCloudEnabled,
  resolveProxyForProvider,
} from "@/models";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import { syncToCloud } from "@/lib/cloudSync";
import { startLocalServer } from "@/lib/oauth/utils/server";
import { runWithProxyContextOrDirect } from "@omniroute/open-sse/utils/proxyFetch.ts";
import {
  jsonObjectSchema,
  oauthDeviceCompleteSchema,
  oauthExchangeSchema,
  oauthImportTokenSchema,
  oauthPollSchema,
} from "@/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { isAuthRequired, isAuthenticated } from "@/shared/utils/apiAuth";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

// Use globalThis to persist callback server state across Next.js HMR reloads
if (!globalThis.__codexCallbackState) {
  globalThis.__codexCallbackState = null;
}
// Windsurf / Devin CLI PKCE callback server state (separate from Codex)
if (!globalThis.__windsurfCallbackState) {
  globalThis.__windsurfCallbackState = null;
}

/** Providers that use the PKCE browser callback flow (like Codex). */
const PKCE_CALLBACK_PROVIDERS = new Set(["codex", "grok-cli"]);

/** Device Code providers whose token grant does not use a PKCE verifier. */
const NO_PKCE_DEVICE_CODE_PROVIDERS = new Set([
  "github",
  "kimi-coding",
  "kilocode",
  "codebuddy-cn",
  "grok-cli",
  "freebuff",
]);

/**
 * Providers whose device flow runs in the user's browser (auth.openai.com blocks
 * datacenter IPs but allows CORS), so the server never polls — it only persists
 * the final tokens via the `device-complete` action. See src/lib/oauth/codexDeviceFlow.ts.
 */
const BROWSER_DEVICE_FLOW_PROVIDERS = new Set(["codex"]);

/**
 * Providers whose PKCE flow has been retired but whose import-token path is
 * still active. Returning 410 Gone on `authorize` / `start-callback-server` /
 * `poll-callback` (instead of 400) tells callers the action is permanently
 * gone and points them at /import-token. windsurf/devin-cli were retired
 * 2026-05-29 because app.devin.ai/editor/signin returned 404 post-rebrand.
 * Phase 2 will reintroduce browser login via Firebase OAuth + RegisterUser.
 */
const RETIRED_PKCE_PROVIDERS = new Set(["windsurf", "devin-cli"]);

/** Providers that allow direct import of a raw API token (no OAuth exchange). */
const IMPORT_TOKEN_PROVIDERS = new Set(["windsurf", "devin-cli", "grok-cli"]);

const startCliLoginSchema = z.object({}).strict();
const captureCliAuthSchema = z.object({
  captureSessionId: z.string().regex(/^[a-f0-9]{64}$/, "Invalid capture session").max(64),
}).strict();
const cancelCliAuthSchema = captureCliAuthSchema;

/**
 * Constant-time string comparison to prevent timing-oracle attacks (CWE-208).
 * Handles null/undefined safely and different-length strings.
 */
function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return a === b;
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Resolve the externally reachable base URL for public share links. Prefers the
 * configured public base URL; otherwise derives it from forwarded headers so the
 * link points at the host the operator actually serves (not an internal origin).
 */
function resolvePublicBaseUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL || process.env.OMNIROUTE_PUBLIC_BASE_URL;
  if (env && env.trim()) return env.trim().replace(/\/+$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

async function requireOAuthRouteAuth(request: Request) {
  if (!(await isAuthRequired(request))) return null;
  if (await isAuthenticated(request)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Dynamic OAuth API Route
 * Handles: authorize, exchange, device-code, poll, start-callback-server, poll-callback
 */

// GET /api/oauth/[provider]/authorize - Generate auth URL
// GET /api/oauth/[provider]/device-code - Request device code (for device_code flow)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string; action: string }> }
) {
  // Phase 1 hotfix (2026-05-29): retired PKCE flows return 410 Gone BEFORE auth.
  // The action permanently does not exist for these providers regardless of who
  // is asking — answering 401 first would mislead callers into thinking the
  // route is gated rather than gone. See spec
  // _tasks/superpowers/specs/2026-05-29-windsurf-login-fix-design.md.
  try {
    const earlyParams = await params;
    if (
      RETIRED_PKCE_PROVIDERS.has(earlyParams.provider) &&
      (earlyParams.action === "authorize" ||
        earlyParams.action === "start-callback-server" ||
        earlyParams.action === "poll-callback")
    ) {
      return NextResponse.json(
        {
          error:
            `Browser OAuth disabled for ${earlyParams.provider} — use import-token via ` +
            `/api/oauth/${earlyParams.provider}/import-token. ` +
            `In the Windsurf/VS Code IDE, run the "Windsurf: Provide Auth Token" command ` +
            `(or click the Jupyter "Get Windsurf Authentication Token" button), then copy+paste the shown token. ` +
            `Opening https://windsurf.com/show-auth-token directly only shows a "Redirecting" page — the IDE must initiate the ?state=... flow.`,
        },
        { status: 410 }
      );
    }
  } catch {
    /* fall through to normal handling */
  }

  const authResponse = await requireOAuthRouteAuth(request);
  if (authResponse) return authResponse;

  try {
    const { provider, action } = await params;
    const { searchParams } = new URL(request.url);

    if (action === "authorize") {
      const requestedRedirectUri =
        searchParams.get("redirect_uri") || "http://localhost:8080/callback";
      const redirectUri = resolveBrowserOAuthRedirectUri(provider, requestedRedirectUri);
      const authData = generateAuthData(provider, redirectUri);
      if (provider === "qoder" && !authData.authUrl) {
        return NextResponse.json({
          ...authData,
          supported: false,
          error:
            "Qoder browser OAuth is experimental and disabled by default. Configure QODER_OAUTH_* environment variables or use a Personal Access Token.",
        });
      }
      // #3861: GitLab Duo needs a self-registered OAuth app. Without a client_id,
      // buildAuthUrl returns null — surface a clear setup message instead of a 500.
      if (provider === "gitlab-duo" && !authData.authUrl) {
        return NextResponse.json({
          ...authData,
          supported: false,
          error:
            "GitLab Duo OAuth is not configured. Register an OAuth application at " +
            "https://gitlab.com/-/profile/applications with redirect URI " +
            'http://localhost:20128/callback and scopes "ai_features read_user", then set ' +
            "GITLAB_DUO_OAUTH_CLIENT_ID (and optionally GITLAB_DUO_OAUTH_CLIENT_SECRET) and restart.",
        });
      }
      return NextResponse.json(authData);
    }

    if (action === "device-code") {
      const providerData = getProvider(provider);
      if (providerData.flowType !== "device_code") {
        return NextResponse.json(
          { error: "Provider does not support device code flow" },
          { status: 400 }
        );
      }

      const authData = generateAuthData(provider, null);
      const startUrl = searchParams.get("startUrl");
      const region = searchParams.get("region") || "us-east-1";

      // Resolve proxy for this provider (provider-level → global → direct)
      const proxy = await resolveProxyForProvider(provider);

      // Request device code (through proxy if configured)
      let deviceData;
      if (
        NO_PKCE_DEVICE_CODE_PROVIDERS.has(provider) ||
        provider === "kiro" ||
        provider === "amazon-q"
      ) {
        // GitHub, Kiro/Amazon Q, Kimi Coding, and KiloCode don't use PKCE for device code
        if ((provider === "kiro" || provider === "amazon-q") && startUrl) {
          const providerOverrideConfig = {
            ...providerData.config,
            startUrl,
            region,
            skipIssuerUrlForRegistration: true,
            registerClientUrl: `https://oidc.${region}.amazonaws.com/client/register`,
            deviceAuthUrl: `https://oidc.${region}.amazonaws.com/device_authorization`,
            tokenUrl: `https://oidc.${region}.amazonaws.com/token`,
            ssoOidcEndpoint: `https://oidc.${region}.amazonaws.com`,
          };

          deviceData = await runWithProxyContextOrDirect(proxy, () =>
            (requestDeviceCode as any)(provider, null, providerOverrideConfig)
          );
        } else {
          deviceData = await runWithProxyContextOrDirect(proxy, () =>
            (requestDeviceCode as any)(provider)
          );
        }
      } else {
        // Qwen and other providers use PKCE
        deviceData = await runWithProxyContextOrDirect(proxy, () =>
          requestDeviceCode(provider, authData.codeChallenge)
        );
      }

      return NextResponse.json({
        ...deviceData,
        codeVerifier: authData.codeVerifier,
      });
    }

    if (action === "start-callback-server") {
      return await handleStartCallbackServer(provider, searchParams);
    }

    if (action === "public-link-status") {
      // Dashboard polls this (authenticated) to learn when the external visitor
      // finished the device flow, so it can notify + refresh the connections.
      const token = searchParams.get("token");
      if (!token) {
        return NextResponse.json({ error: "Missing token" }, { status: 400 });
      }
      const { status, result } = getDeviceFlowTicketStatus(token);
      return NextResponse.json({ status, connection: result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("OAuth GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Start PKCE callback server for Codex, Windsurf, or Devin CLI.
 * Codex uses fixed port 1455; Windsurf/Devin CLI use a random free port (port 0).
 * Returns the auth URL and stores codeVerifier for later exchange.
 */
async function handleStartCallbackServer(provider: string, searchParams: URLSearchParams) {
  if (!PKCE_CALLBACK_PROVIDERS.has(provider)) {
    return NextResponse.json(
      { error: `Callback server not supported for provider: ${provider}` },
      { status: 400 }
    );
  }

  const isWindsurf = provider === "windsurf" || provider === "devin-cli";
  const stateKey = isWindsurf ? "__windsurfCallbackState" : "__codexCallbackState";

  // Clean up existing server if any
  if (globalThis[stateKey]?.close) {
    try {
      globalThis[stateKey].close();
    } catch (e) {
      /* ignore */
    }
  }
  globalThis[stateKey] = null;

  try {
    // Codex: fixed port 1455. Windsurf/Devin CLI: OS-assigned random port (0)
    const serverPort = isWindsurf ? 0 : 1455;
    const { port, close } = await startLocalServer((params) => {
      if (globalThis[stateKey]) {
        globalThis[stateKey].callbackParams = params;
      }
    }, serverPort);

    const redirectUri = `http://localhost:${port}/auth/callback`;
    const authData = generateAuthData(provider, redirectUri);

    // F2 FIX: store the server-generated state alongside verifier so
    // /exchange and /poll-callback can enforce missing/mismatch at the
    // route boundary. PKCE providers always have a non-empty state.
    globalThis[stateKey] = {
      callbackParams: null,
      close,
      port,
      redirectUri,
      codeVerifier: authData.codeVerifier,
      expectedState: authData.state,
      startedAt: Date.now(),
    };

    // Auto-cleanup after 5 minutes
    const startedAt = Date.now();
    setTimeout(() => {
      if (globalThis[stateKey]?.startedAt === startedAt) {
        try {
          close();
        } catch (e) {
          /* ignore */
        }
        globalThis[stateKey] = null;
      }
    }, 300000);

    return NextResponse.json({
      authUrl: authData.authUrl,
      codeVerifier: authData.codeVerifier,
      redirectUri,
      serverPort: port,
    });
  } catch (error) {
    console.error("OAuth start-callback-server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/oauth/[provider]/exchange - Exchange code for tokens and save
// POST /api/oauth/[provider]/poll - Poll for token (device_code flow)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string; action: string }> }
) {
  // Phase 1 hotfix (2026-05-29): retired PKCE flows return 410 Gone BEFORE auth.
  // See GET handler comment.
  try {
    const earlyParams = await params;
    if (
      RETIRED_PKCE_PROVIDERS.has(earlyParams.provider) &&
      earlyParams.action === "poll-callback"
    ) {
      return NextResponse.json(
        {
          error:
            `Browser OAuth disabled for ${earlyParams.provider} — use import-token via ` +
            `/api/oauth/${earlyParams.provider}/import-token. ` +
            `In the Windsurf/VS Code IDE, run the "Windsurf: Provide Auth Token" command ` +
            `(or click the Jupyter "Get Windsurf Authentication Token" button), then copy+paste the shown token. ` +
            `Opening https://windsurf.com/show-auth-token directly only shows a "Redirecting" page — the IDE must initiate the ?state=... flow.`,
        },
        { status: 410 }
      );
    }
  } catch {
    /* fall through to normal handling */
  }

  const authResponse = await requireOAuthRouteAuth(request);
  if (authResponse) return authResponse;

  try {
    const { provider, action } = await params;

    // Phase 1 hotfix (2026-05-29): retired PKCE flows return 410 Gone before
    // body parsing. windsurf/devin-cli `poll-callback` is permanently retired
    // because the upstream PKCE endpoint returns 404. Use /import-token
    // (handled later in this same handler) for those providers instead.
    if (RETIRED_PKCE_PROVIDERS.has(provider) && action === "poll-callback") {
      return NextResponse.json(
        {
          error:
            `Browser OAuth disabled for ${provider} — use import-token via ` +
            `/api/oauth/${provider}/import-token. ` +
            `In the Windsurf/VS Code IDE, run the "Windsurf: Provide Auth Token" command ` +
            `(or click the Jupyter "Get Windsurf Authentication Token" button), then copy+paste the shown token. ` +
            `Opening https://windsurf.com/show-auth-token directly only shows a "Redirecting" page — the IDE must initiate the ?state=... flow.`,
        },
        { status: 410 }
      );
    }

    let rawBody: any = {};
    try {
      rawBody = await request.json();
    } catch {
      if (action !== "poll-callback") {
        return NextResponse.json(
          {
            error: {
              message: "Invalid request",
              details: [{ field: "body", message: "Invalid JSON body" }],
            },
          },
          { status: 400 }
        );
      }
    }

    let body: any = rawBody;
    if (action === "exchange") {
      const validation = validateBody(oauthExchangeSchema, rawBody);
      if (isValidationFailure(validation)) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      body = validation.data;
    } else if (action === "poll") {
      const validation = validateBody(oauthPollSchema, rawBody);
      if (isValidationFailure(validation)) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      body = validation.data;
    } else if (action === "poll-callback") {
      const validation = validateBody(jsonObjectSchema, rawBody || {});
      if (isValidationFailure(validation)) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      body = validation.data;
    } else if (action === "import-token") {
      const validation = validateBody(oauthImportTokenSchema, rawBody);
      if (isValidationFailure(validation)) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      body = validation.data;
    } else if (action === "device-complete") {
      const validation = validateBody(oauthDeviceCompleteSchema, rawBody);
      if (isValidationFailure(validation)) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      body = validation.data;
    } else if (action === "start-cli-login") {
      const validation = validateBody(startCliLoginSchema, rawBody || {});
      if (isValidationFailure(validation)) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      body = validation.data;
    } else if (action === "capture-cli-auth" || action === "cancel-cli-auth") {
      const validation = validateBody(action === "capture-cli-auth" ? captureCliAuthSchema : cancelCliAuthSchema, rawBody);
      if (isValidationFailure(validation)) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      body = validation.data;
    }

    if (action === "start-cli-login") {
      if (provider === "grok-cli") {
        const { startLocalGrokLogin } = await import("@/lib/oauth/grokCliLocalCapture");
        const result = await startLocalGrokLogin({ signal: request.signal });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      if (provider === "cursor") {
        const { startLocalCursorLogin } = await import("@/lib/oauth/cursorCliLocalCapture");
        const result = await startLocalCursorLogin({ signal: request.signal });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      return NextResponse.json({ error: `Not supported for provider: ${provider}` }, { status: 400 });
    }

    if (action === "capture-cli-auth") {
      if (provider === "grok-cli") {
        const { confirmAndCaptureGrokLogin } = await import("@/lib/oauth/grokCliLocalCapture");
        const result = await confirmAndCaptureGrokLogin({ captureSessionId: body.captureSessionId });
        if (!result.ok) {
           return NextResponse.json({ error: result.safeMessage, status: result.status }, { status: 400 });
        }

        await syncToCloudIfEnabled();

        return NextResponse.json({
          success: true,
          connectionId: result.connectionId,
          name: result.identity?.email || "Grok CLI (captured)",
          email: result.identity?.email || null,
          connection: {
            id: result.connectionId,
            provider: "grok-cli",
            email: result.identity?.email || null,
            displayName: result.identity?.email || "Grok CLI (captured)",
          },
        });
      }
      if (provider === "cursor") {
        const { confirmAndCaptureCursorLogin } = await import("@/lib/oauth/cursorCliLocalCapture");
        const result = await confirmAndCaptureCursorLogin({ captureSessionId: body.captureSessionId });
        if (!result.ok) {
           return NextResponse.json({ error: result.safeMessage, status: result.status }, { status: 400 });
        }

        await syncToCloudIfEnabled();

        return NextResponse.json({
          success: true,
          connectionId: result.connectionId,
          name: result.identity?.email || "Cursor (CLI captured)",
          email: result.identity?.email || null,
          connection: {
            id: result.connectionId,
            provider: "cursor",
            email: result.identity?.email || null,
            displayName: result.identity?.email || "Cursor (CLI captured)",
          },
        });
      }
      return NextResponse.json({ error: `Not supported for provider: ${provider}` }, { status: 400 });
    }

    if (action === "cancel-cli-auth") {
      if (provider === "grok-cli") {
        const { cancelCapture } = await import("@/lib/oauth/grokCliLocalCapture");
        const result = cancelCapture(body.captureSessionId);
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      if (provider === "cursor") {
        const { cancelCursorCapture } = await import("@/lib/oauth/cursorCliLocalCapture");
        const result = cancelCursorCapture(body.captureSessionId);
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      return NextResponse.json({ error: `Not supported for provider: ${provider}` }, { status: 400 });
    }

    if (action === "exchange") {
      const { code, redirectUri, connectionId, codeVerifier, state } = body;
      const normalizedState = typeof state === "string" && state.length > 0 ? state : undefined;
      const providerData = getProvider(provider);

      // F2 FIX: PKCE callback-session state must be enforced server-side.
      // For grok-cli, codex, and other grokCli-compatible PKCE callback
      // providers, the generated state is held in the callback server
      // session (expectedState). When such a session exists, the exchange
      // MUST carry a non-empty state that matches exactly (constant-time);
      // missing or mismatched state must reject with 400. Device-code
      // non-PKCE semantics are preserved: non-PKCE flows never create a
      // callback session, so they never enter this guard.
      if (PKCE_CALLBACK_PROVIDERS.has(provider)) {
        const stateKey = provider === "codex" ? "__codexCallbackState" : "__windsurfCallbackState";
        // grok-cli shares __codexCallbackState for PKCE (same as codex).
        const activeKey = provider === "grok-cli" ? "__codexCallbackState" : stateKey;
        const cbSession = globalThis[activeKey as keyof typeof globalThis] as
          | { expectedState?: string | null | undefined }
          | null
          | undefined;
        const expectedState =
          cbSession && typeof cbSession === "object"
            ? (cbSession as { expectedState?: string }).expectedState
            : null;
        if (typeof expectedState === "string" && expectedState.length > 0) {
          const provided = typeof state === "string" && state.length > 0 ? state : null;
          if (!provided) {
            return NextResponse.json(
              {
                error: {
                  message: "OAuth state mismatch",
                  details: [
                    {
                      field: "state",
                      message: "Missing OAuth state. Restart the connection and try again.",
                    },
                  ],
                },
              },
              { status: 400 }
            );
          }
          if (!safeEqual(provided, expectedState)) {
            return NextResponse.json(
              {
                error: {
                  message: "OAuth state mismatch",
                  details: [
                    {
                      field: "state",
                      message: "OAuth state mismatch. Restart the connection and try again.",
                    },
                  ],
                },
              },
              { status: 400 }
            );
          }
        }
      }

      if (
        (providerData.flowType === "authorization_code_pkce" || providerData.supportsBrowserPkce) &&
        !codeVerifier
      ) {
        return NextResponse.json(
          {
            error: {
              message: "Invalid request",
              details: [
                {
                  field: "codeVerifier",
                  message: `Code verifier is required for ${provider} OAuth exchange`,
                },
              ],
            },
          },
          { status: 400 }
        );
      }

      // Resolve proxy for this provider (provider-level → global → direct)
      const proxy = await resolveProxyForProvider(provider);

      // Exchange code for tokens (through proxy if configured)
      const tokenData = await runWithProxyContextOrDirect(proxy, () =>
        exchangeTokens(provider, code, redirectUri, codeVerifier, normalizedState)
      );

      // Normalize: if name is missing, use email or displayName as fallback so accounts
      // always show a real label (e.g. user@gmail.com) instead of "Account #abc123"
      if (!tokenData.name && (tokenData.email || tokenData.displayName)) {
        tokenData.name = tokenData.email || tokenData.displayName;
      }

      // Upsert: update existing connection if same provider+email, else create new
      const expiresAt = tokenData.expiresIn
        ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
        : null;

      let connection: any;
      if (tokenData.email) {
        const existing = await getProviderConnections({ provider });
        const match = existing.find((c: any) => {
          if (c.id && safeEqual(connectionId, c.id)) return true;
          // safeEqual: constant-time comparison to prevent timing attacks (CWE-208, finding #258-6/7)
          if (!safeEqual(c.email, tokenData.email) || c.authType !== "oauth") return false;
          // For Codex, also check workspaceId to avoid overwriting different workspace connections
          if (provider === "codex" && tokenData.providerSpecificData?.workspaceId) {
            const existingWorkspace = c.providerSpecificData?.workspaceId;
            return safeEqual(existingWorkspace, tokenData.providerSpecificData.workspaceId);
          }
          return true;
        });
        const matchId = typeof match?.id === "string" ? match.id : null;
        if (matchId) {
          connection = await updateProviderConnection(matchId, {
            ...tokenData,
            expiresAt,
            testStatus: "active",
            isActive: true,
          });
        }
      }
      if (!connection) {
        connection = await createProviderConnection(
          buildOAuthConnectionCreatePayload(provider, tokenData, expiresAt)
        );
      }

      // Auto sync to Cloud if enabled
      await syncToCloudIfEnabled();

      return NextResponse.json({
        success: true,
        connection: {
          id: connection.id,
          provider: connection.provider,
          email: connection.email,
          displayName: connection.displayName,
        },
      });
    }

    if (action === "poll") {
      const { deviceCode, connectionId, codeVerifier, extraData } = body;

      // Resolve proxy for this provider (provider-level → global → direct)
      const proxy = await resolveProxyForProvider(provider);

      // Poll for token (through proxy if configured)
      let result;
      if (NO_PKCE_DEVICE_CODE_PROVIDERS.has(provider)) {
        // Non-PKCE device providers do not receive a code verifier.
        result = await runWithProxyContextOrDirect(proxy, () =>
          (pollForToken as any)(provider, deviceCode)
        );
      } else if (provider === "kiro" || provider === "amazon-q") {
        // Kiro needs extraData (clientId, clientSecret) from device code response
        result = await runWithProxyContextOrDirect(proxy, () =>
          (pollForToken as any)(provider, deviceCode, null, extraData)
        );
      } else {
        // Qwen and other providers use PKCE
        if (!codeVerifier) {
          return NextResponse.json({ error: "Missing code verifier" }, { status: 400 });
        }
        result = await runWithProxyContextOrDirect(proxy, () =>
          (pollForToken as any)(provider, deviceCode, codeVerifier)
        );
      }

      if (result.success) {
        // Normalize: if name is missing, use email as fallback display label
        if (!result.tokens.name && (result.tokens.email || result.tokens.displayName)) {
          result.tokens.name = result.tokens.email || result.tokens.displayName;
        }

        // Upsert: update existing connection if same provider+email, else create new
        const expiresAt = result.tokens.expiresIn
          ? new Date(Date.now() + result.tokens.expiresIn * 1000).toISOString()
          : null;

        let connection: any;
        if (result.tokens.email) {
          const existing = await getProviderConnections({ provider });
          const match = existing.find((c: any) => {
            if (c.id && safeEqual(connectionId, c.id)) return true;
            // safeEqual: constant-time comparison to prevent timing attacks (CWE-208, finding #258-8/9)
            if (!safeEqual(c.email, result.tokens.email) || c.authType !== "oauth") return false;
            // For Codex, also check workspaceId to avoid overwriting different workspace connections
            if (provider === "codex" && result.tokens.providerSpecificData?.workspaceId) {
              const existingWorkspace = c.providerSpecificData?.workspaceId;
              return safeEqual(existingWorkspace, result.tokens.providerSpecificData.workspaceId);
            }
            return true;
          });
          const matchId = typeof match?.id === "string" ? match.id : null;
          if (matchId) {
            connection = await updateProviderConnection(matchId, {
              ...result.tokens,
              expiresAt,
              testStatus: "active",
              isActive: true,
            });
          }
        }
        if (!connection) {
          connection = await createProviderConnection(
            buildOAuthConnectionCreatePayload(provider, result.tokens, expiresAt)
          );
        }

        // Auto sync to Cloud if enabled
        await syncToCloudIfEnabled();

        return NextResponse.json({
          success: true,
          connection: {
            id: connection.id,
            provider: connection.provider,
          },
        });
      }

      // Still pending or error - don't create connection for pending states
      // F4: the poll errorDescription transits the browser. It MUST be
      // sanitized at the route boundary as defense-in-depth beyond the
      // provider-level redactGrokBuildSecrets() — the route is the last
      // line before NextResponse.json reaches the client. Generic
      // sanitizeErrorMessage preserves actionable prefixes (e.g. "expired")
      // while stripping credentials-shaped fragments.
      const isPending =
        result.pending || result.error === "authorization_pending" || result.error === "slow_down";
      const rawDescription =
        typeof result.errorDescription === "string" ? result.errorDescription : undefined;
      const safeDescription = rawDescription ? sanitizeErrorMessage(rawDescription) : undefined;

      return NextResponse.json({
        success: false,
        error: result.error,
        ...(safeDescription ? { errorDescription: safeDescription } : {}),
        pending: isPending,
      });
    }

    if (action === "poll-callback") {
      const { connectionId } = body;

      // poll-callback is supported for all PKCE callback providers
      if (!PKCE_CALLBACK_PROVIDERS.has(provider)) {
        return NextResponse.json(
          {
            error: `poll-callback only supported for PKCE callback providers: ${[...PKCE_CALLBACK_PROVIDERS].join(", ")}`,
          },
          { status: 400 }
        );
      }

      // Windsurf and Devin CLI share __windsurfCallbackState; Codex/grok-cli share __codexCallbackState.
      const stateKey =
        provider === "codex" || provider === "grok-cli"
          ? "__codexCallbackState"
          : "__windsurfCallbackState";

      if (!globalThis[stateKey]) {
        return NextResponse.json({
          success: false,
          error: "no_server",
          errorDescription: "Callback server not running",
        });
      }

      if (!globalThis[stateKey].callbackParams) {
        return NextResponse.json({ success: false, pending: true });
      }

      // F2 FIX: poll-callback callback-session state enforcement. Missing
      // callback state or mismatched state must reject with 400-like payload
      // before any token exchange. Preserve device-code non-PKCE semantics:
      // only PKCE callback providers ever reach poll-callback, so this is
      // always the correct branch to gate.
      const expectedCallbackState =
        typeof globalThis[stateKey]?.expectedState === "string"
          ? (globalThis[stateKey] as { expectedState: string }).expectedState
          : null;
      if (typeof expectedCallbackState === "string" && expectedCallbackState.length > 0) {
        const incomingState =
          globalThis[stateKey]?.callbackParams?.state as string | null | undefined;
        if (!incomingState || !safeEqual(incomingState, expectedCallbackState)) {
          // Clean up server before rejecting — the callback was consumed
          // (possibly malicious) and the session must not be reused.
          try {
            globalThis[stateKey].close();
          } catch {
            /* ignore */
          }
          globalThis[stateKey] = null;
          return NextResponse.json(
            {
              success: false,
              error: "state_mismatch",
              errorDescription: "OAuth state mismatch. Restart the connection and try again.",
            },
            { status: 400 }
          );
        }
      }

      // Callback received! Extract code and exchange for tokens
      const params = globalThis[stateKey].callbackParams;
      const { redirectUri, codeVerifier, close } = globalThis[stateKey];

      // Clean up server
      try {
        close();
      } catch (e) {
        /* ignore */
      }
      globalThis[stateKey] = null;

      if (params.error) {
        return NextResponse.json({
          success: false,
          error: params.error,
          errorDescription: params.error_description,
        });
      }

      if (!params.code) {
        return NextResponse.json({
          success: false,
          error: "no_code",
          errorDescription: "No authorization code received",
        });
      }

      try {
        // Resolve proxy for this provider
        const proxy = await resolveProxyForProvider(provider);

        // Exchange code for tokens (through proxy if configured)
        const tokenData = await runWithProxyContextOrDirect(proxy, () =>
          exchangeTokens(provider, params.code, redirectUri, codeVerifier, params.state)
        );

        // Normalize: if name is missing, use email as fallback display label
        if (!tokenData.name && (tokenData.email || tokenData.displayName)) {
          tokenData.name = tokenData.email || tokenData.displayName;
        }

        // Upsert: update existing connection if same provider+email, else create new
        const expiresAt = tokenData.expiresIn
          ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
          : null;

        let connection: any;
        if (tokenData.email) {
          const existing = await getProviderConnections({ provider });
          const match = existing.find((c: any) => {
            if (c.id && safeEqual(connectionId, c.id)) return true;
            // safeEqual: constant-time comparison to prevent timing attacks (CWE-208, finding #258-6/7)
            if (!safeEqual(c.email, tokenData.email) || c.authType !== "oauth") return false;
            // For Codex, also check workspaceId to avoid overwriting different workspace connections
            if (provider === "codex" && tokenData.providerSpecificData?.workspaceId) {
              const existingWorkspace = c.providerSpecificData?.workspaceId;
              return safeEqual(existingWorkspace, tokenData.providerSpecificData.workspaceId);
            }
            return true;
          });
          const matchId = typeof match?.id === "string" ? match.id : null;
          if (matchId) {
            connection = await updateProviderConnection(matchId, {
              ...tokenData,
              expiresAt,
              testStatus: "active",
              isActive: true,
            });
          }
        }
        if (!connection) {
          connection = await createProviderConnection(
            buildOAuthConnectionCreatePayload(provider, tokenData, expiresAt)
          );
        }

        await syncToCloudIfEnabled();

        return NextResponse.json({
          success: true,
          connection: {
            id: connection.id,
            provider: connection.provider,
            email: connection.email,
            displayName: connection.displayName,
          },
        });
      } catch (exchangeErr: any) {
        console.error("OAuth exchange error:", exchangeErr);
        return NextResponse.json(
          { success: false, error: "Internal server error" },
          { status: 500 }
        );
      }
    }

    if (action === "import-token") {
      const { token, connectionId } = body;

      if (!IMPORT_TOKEN_PROVIDERS.has(provider)) {
        return NextResponse.json(
          {
            error: `import-token not supported for provider: ${provider}. Supported: ${[...IMPORT_TOKEN_PROVIDERS].join(", ")}`,
          },
          { status: 400 }
        );
      }

      try {
        // Map the raw token via the provider's mapTokens() — skips the HTTP exchange entirely.
        const providerData = getProvider(provider);
        const tokenData = providerData.mapTokens({ accessToken: token });

        // Normalize: if name is missing, use email as fallback display label
        if (!tokenData.name && (tokenData.email || tokenData.displayName)) {
          tokenData.name = tokenData.email || tokenData.displayName;
        }

        const expiresAt = tokenData.expiresIn
          ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
          : null;

        let connection: any;
        if (tokenData.email) {
          const existing = await getProviderConnections({ provider });
          const match = existing.find((c: any) => {
            if (c.id && safeEqual(connectionId, c.id)) return true;
            if (!safeEqual(c.email, tokenData.email) || c.authType !== "oauth") return false;
            return true;
          });
          const matchId = typeof match?.id === "string" ? match.id : null;
          if (matchId) {
            connection = await updateProviderConnection(matchId, {
              ...tokenData,
              expiresAt,
              testStatus: "active",
              isActive: true,
            });
          }
        }
        if (!connection) {
          connection = await createProviderConnection(
            buildOAuthConnectionCreatePayload(provider, tokenData, expiresAt)
          );
        }

        await syncToCloudIfEnabled();

        return NextResponse.json({
          success: true,
          connection: {
            id: connection.id,
            provider: connection.provider,
            email: connection.email,
            displayName: connection.displayName,
          },
        });
      } catch (importErr: any) {
        return NextResponse.json(
          { success: false, error: sanitizeErrorMessage(importErr.message) || "Import failed" },
          { status: 500 }
        );
      }
    }

    if (action === "public-link") {
      // Generate a single-use, short-lived public link so a third party can
      // complete the Codex device flow in their own browser (see Fase 6).
      if (!BROWSER_DEVICE_FLOW_PROVIDERS.has(provider)) {
        return NextResponse.json(
          {
            error: `public-link not supported for provider: ${provider}. Supported: ${[...BROWSER_DEVICE_FLOW_PROVIDERS].join(", ")}`,
          },
          { status: 400 }
        );
      }

      const connectionId =
        rawBody && typeof rawBody.connectionId === "string" ? rawBody.connectionId : undefined;
      const { token, expiresAt } = createDeviceFlowTicket(provider, connectionId);

      return NextResponse.json({
        url: `${resolvePublicBaseUrl(request)}/connect/codex/${token}`,
        token,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    }

    if (action === "device-complete") {
      // The browser-driven Codex device flow already performed the device
      // authorization + token exchange against auth.openai.com (the server's
      // datacenter IP is blocked by Cloudflare, so it cannot). Here we only map
      // the final tokens and persist the connection — no HTTP exchange/poll.
      if (!BROWSER_DEVICE_FLOW_PROVIDERS.has(provider)) {
        return NextResponse.json(
          {
            error: `device-complete not supported for provider: ${provider}. Supported: ${[...BROWSER_DEVICE_FLOW_PROVIDERS].join(", ")}`,
          },
          { status: 400 }
        );
      }

      const {
        access_token: accessToken,
        refresh_token: refreshToken,
        id_token: idToken,
        expires_in: expiresIn,
        connectionId,
      } = body;

      let tokenData: any;
      try {
        tokenData = await finalizeTokens(provider, {
          access_token: accessToken,
          refresh_token: refreshToken,
          id_token: idToken,
          expires_in: expiresIn,
        });
      } catch (finalizeErr: any) {
        return NextResponse.json(
          {
            success: false,
            error: sanitizeErrorMessage(finalizeErr?.message) || "Failed to finalize tokens",
          },
          { status: 500 }
        );
      }

      const connection = await persistOAuthConnection(provider, tokenData, connectionId);

      return NextResponse.json({
        success: true,
        connection: {
          id: connection.id,
          provider: connection.provider,
          email: connection.email,
          displayName: connection.displayName,
        },
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("OAuth POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Sync to Cloud if enabled
 */
async function syncToCloudIfEnabled() {
  try {
    const cloudEnabled = await isCloudEnabled();
    if (!cloudEnabled) return;

    const machineId = await getConsistentMachineId();
    await syncToCloud(machineId);
  } catch (error) {
    console.log("Error syncing to cloud after OAuth:", error);
  }
}
