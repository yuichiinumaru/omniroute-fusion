import { NextResponse } from "next/server";
import { getProviderConnectionById, updateProviderConnection } from "@/lib/db/providers";
import { getAccessToken, updateProviderCredentials } from "@/sse/services/tokenRefresh";
import { rotationGroupFor } from "@omniroute/open-sse/services/refreshSerializer.ts";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";
import {
  connectionUsesOAuthRefresh,
  isLongLivedImportCredential,
} from "@/shared/utils/connectionAuthMode";

type RefreshResult = {
  accessToken?: string;
  expiresIn?: number;
  error?: string;
};

/**
 * POST /api/providers/[id]/refresh
 * Manually trigger an OAuth token refresh for a provider connection.
 * Useful when the dashboard shows a stale/expired token and the user
 * doesn't want to wait for the next auto-refresh cycle.
 *
 * T12 — Manual Token Refresh UI
 *
 * Dual-mode policy: gate on connection auth mode (not only provider id).
 * Static apikey / cookie / none never enter OAuth refresh.
 * Windsurf long-lived import is a no-op skip (no RT by design).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const connection = await getProviderConnectionById(id);
    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Connection-level gate (api_key aliases, cookie, blank+apiKey) — not string === "oauth".
    if (!connectionUsesOAuthRefresh(connection)) {
      return NextResponse.json(
        { error: "Only OAuth connections support manual token refresh" },
        { status: 400 }
      );
    }

    // Windsurf / Devin long-lived import keys: refresh is product no-op (see
    // refreshWindsurfToken + isLongLivedImportCredential). Do not 422 operators.
    if (isLongLivedImportCredential(connection)) {
      return NextResponse.json({
        success: true,
        skipped: true,
        connectionId: id,
        provider: connection.provider,
        message:
          "Long-lived import token (Windsurf/Devin) — no OAuth refresh token by design. " +
          "Re-import from the IDE if the access token was revoked.",
        expiresAt: connection.tokenExpiresAt || connection.expiresAt || null,
        refreshedAt: new Date().toISOString(),
      });
    }

    if (!connection.refreshToken && !connection.accessToken) {
      return NextResponse.json(
        { error: "No token credentials available for refresh" },
        { status: 422 }
      );
    }

    if (typeof connection.provider !== "string" || connection.provider.length === 0) {
      return NextResponse.json({ error: "Connection provider is invalid" }, { status: 422 });
    }

    const provider = connection.provider;

    // Codex/OpenAI multi-account family-revocation cascade guard.
    // These two providers share the same Auth0 client_id and can revoke sibling
    // accounts when several refresh_tokens are rotated proactively. Other
    // serialized providers (for example Kiro) still support safe manual refresh;
    // the serializer only prevents concurrent sibling refreshes.
    const rotationGroup = rotationGroupFor(provider);
    if (rotationGroup === "openai-auth0") {
      return NextResponse.json({
        success: true,
        skipped: true,
        connectionId: id,
        provider,
        message:
          "Rotating-refresh provider: the token refreshes automatically on the next request. " +
          "Manual/bulk refresh is intentionally skipped to avoid Auth0 token-family revocation.",
        expiresAt: connection.tokenExpiresAt || connection.expiresAt || null,
        refreshedAt: new Date().toISOString(),
      });
    }

    const credentials = {
      connectionId: id,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.expiresAt,
      expiresIn: connection.expiresIn,
      idToken: connection.idToken,
      providerSpecificData: connection.providerSpecificData,
    };

    // Use the existing getAccessToken helper which knows how to refresh
    // tokens for each provider type (Claude, GitHub, Gemini, etc.).
    // Pass onPersist so the DB write happens atomically INSIDE the per-connection
    // mutex — prevents the race where a concurrent request reads stale credentials
    // between the network call and the DB update.
    let persistedCredentials: RefreshResult | null = null;
    const newCredentials = (await getAccessToken(provider, credentials, async (result) => {
      await updateProviderCredentials(id, result);
      persistedCredentials = result;
    })) as RefreshResult | null;

    if (newCredentials && typeof newCredentials === "object" && newCredentials.error) {
      if (
        newCredentials.error === "unrecoverable_refresh_error" ||
        newCredentials.error === "refresh_token_reused" ||
        newCredentials.error === "invalid_grant"
      ) {
        await updateProviderConnection(id, {
          testStatus: "invalid",
          lastError: "Refresh token expired. Please re-authenticate this account.",
        });
        return NextResponse.json(
          { error: "Token refresh failed — provider returned no new token", requiresReauth: true },
          { status: 401 }
        );
      }
    }

    if (!newCredentials?.accessToken) {
      return NextResponse.json(
        { error: "Token refresh failed — provider returned no new token" },
        { status: 502 }
      );
    }

    // If onPersist was not called (e.g. no connectionId in credentials path), persist now.
    if (!persistedCredentials) {
      await updateProviderCredentials(id, newCredentials);
    }

    const resolvedCreds = persistedCredentials || newCredentials;
    const expiresAt = resolvedCreds.expiresAt
      ? resolvedCreds.expiresAt
      : resolvedCreds.expiresIn
        ? new Date(Date.now() + resolvedCreds.expiresIn * 1000).toISOString()
        : null;

    return NextResponse.json({
      success: true,
      connectionId: id,
      provider,
      expiresAt,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[T12] Token refresh failed:", error);
    // Hard Rule #12: never return raw err.message / stacks to clients.
    const safe = sanitizeErrorMessage(error) || "Token refresh failed";
    return NextResponse.json({ error: safe }, { status: 500 });
  }
}
