/**
 * Token Health API Route — Batch G
 *
 * Exposes aggregate health status of OAuth tokens that participate in refresh.
 * Used by TokenHealthBadge in the Header.
 *
 * Dual-mode policy: SQL `authType: "oauth"` is necessary but not sufficient —
 * also require a refresh token (static dual-mode rows never match) and
 * connectionUsesOAuthRefresh so api_key aliases / long-lived Windsurf imports
 * without RT do not skew the badge.
 */

import { getProviderConnections } from "@/lib/localDb";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error.ts";
import { connectionUsesOAuthRefresh } from "@/shared/utils/connectionAuthMode";

export async function GET() {
  try {
    const connections = await getProviderConnections({ authType: "oauth" });
    const oauthConns = (connections || []).filter(
      (c) => c.isActive && c.refreshToken && connectionUsesOAuthRefresh(c)
    );

    const total = oauthConns.length;
    const healthy = oauthConns.filter((c) => c.testStatus === "active" || !c.lastError).length;
    const errored = oauthConns.filter(
      (c) => c.testStatus === "error" || c.lastErrorType === "token_refresh_failed"
    ).length;
    const lastCheck = oauthConns.reduce((latest, c) => {
      if (!c.lastHealthCheckAt) return latest;
      return latest && latest > c.lastHealthCheckAt ? latest : c.lastHealthCheckAt;
    }, null);

    return Response.json({
      total,
      healthy,
      errored,
      warning: total - healthy - errored,
      lastCheckAt: lastCheck,
      status: errored > 0 ? "error" : healthy < total ? "warning" : "healthy",
    });
  } catch (err: unknown) {
    // Hard Rule #12: sanitize full throwable — never cast-and-read .message raw.
    return Response.json(
      { error: sanitizeErrorMessage(err) || "Token health check failed", status: "unknown" },
      { status: 500 }
    );
  }
}
