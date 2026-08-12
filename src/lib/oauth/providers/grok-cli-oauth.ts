/**
 * Grok Build (xAI) OAuth Provider — Browser PKCE Flow helpers
 *
 * Shares the auth.x.ai authorize/token endpoints and public client id with
 * Grok Build CLI — see GROK_BUILD_OAUTH_CONFIG in ../constants/oauth.ts —
 * scoped to the Grok Build (cli-chat-proxy.grok.com) entitlement.
 */

import { GROK_BUILD_OAUTH_CONFIG } from "../constants/oauth";

const BASE64_BLOCK_SIZE = 4;
const GROK_BUILD_DEFAULT_TTL_SEC = 21600;

/**
 * Redact JWT-shaped substrings from an upstream error message before it
 * surfaces in UI / logs. xAI has historically echoed authorization codes
 * or tokens inside `error_description` and HTTP error bodies; without this
 * guard, OAuth error paths would leak credentials verbatim to the
 * dashboard and to the operator's log aggregator.
 *
 * Mirrors the helper in grok-cli.ts so both throw-sites in the provider
 * follow the same redaction contract.
 */
const GROK_BUILD_JWT_SHAPE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const GROK_BUILD_BEARER_SHAPE = /\bBearer\s+[A-Za-z0-9_\-.\~\+/=]{6,}/gi;
const GROK_BUILD_TOKEN_COOKIE_SHAPE =
  /\b(?:token|cookie|session)\b\s*[:=]\s*[^\s;,"]{6,}/gi;
const GROK_BUILD_REDACTED_PLACEHOLDER = "[REDACTED]";

export function redactGrokBuildSecrets(value: string): string {
  let out = value.replace(GROK_BUILD_JWT_SHAPE, GROK_BUILD_REDACTED_PLACEHOLDER);
  out = out.replace(GROK_BUILD_BEARER_SHAPE, `Bearer ${GROK_BUILD_REDACTED_PLACEHOLDER}`);
  out = out.replace(GROK_BUILD_TOKEN_COOKIE_SHAPE, (match) => {
    const prefix = match.match(/^\b(?:token|cookie|session)\b\s*[:=]\s*/i)?.[0] ?? "";
    return prefix ? `${prefix}${GROK_BUILD_REDACTED_PLACEHOLDER}` : GROK_BUILD_REDACTED_PLACEHOLDER;
  });
  return out;
}

/**
 * Extract display metadata from an id_token returned by xAI's token endpoint.
 * xAI validates the access token upstream.
 */
export function decodeXaiIdTokenIdentity(idToken: unknown): {
  email: string | null;
  name: string | null;
} {
  if (typeof idToken !== "string") return { email: null, name: null };
  const parts = idToken.split(".");
  if (parts.length !== 3) return { email: null, name: null };

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = (BASE64_BLOCK_SIZE - (base64.length % BASE64_BLOCK_SIZE)) % BASE64_BLOCK_SIZE;
    const payload = JSON.parse(
      Buffer.from(base64 + "=".repeat(padding), "base64").toString("utf8")
    );
    return {
      email: payload.email || payload.preferred_username || null,
      name: payload.name || null,
    };
  } catch {
    return { email: null, name: null };
  }
}

export function buildGrokBuildAuthUrl(
  config: typeof GROK_BUILD_OAUTH_CONFIG,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const params = {
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scope,
    code_challenge: codeChallenge,
    code_challenge_method: config.codeChallengeMethod,
    state,
  };
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");
  return `${config.authorizeUrl}?${query}`;
}

export async function exchangeGrokBuildToken(
  config: typeof GROK_BUILD_OAUTH_CONFIG,
  code: string,
  redirectUri: string,
  codeVerifier: string,
  state?: string
): Promise<Record<string, unknown>> {
  const params: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  };
  if (typeof state === "string" && state.length > 0) {
    params.state = state;
  }
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    // Redact any JWT-shaped substring before including the upstream text in
    // the throw — xAI has historically echoed tokens in error bodies.
    const error = await response.text();
    throw new Error(`Grok Build token exchange failed: ${redactGrokBuildSecrets(error)}`);
  }

  return response.json();
}

/**
 * Grok Build's device-code (and PKCE) token-endpoint response returns the
 * long-lived access token as the SAME JWT the paste-token import reads from
 * auth.json — so it still carries Grok's custom identity claims
 * (principal_type/principal_id/team_id/tier). The browser-PKCE exchange, by
 * contrast, returns an opaque bearer token. Decode + return the claims when
 * the access token is that JWT; otherwise return null so callers can tell the
 * two apart.
 *
 * The executor (open-sse/executors/grok-cli.ts) reads principalType/principalId
 * straight off providerSpecificData on every refresh, and userId for request
 * headers — so these keys MUST survive the device-code flow too, not just the
 * paste-token import. Mirrors parseJwtPayload() in grok-cli.ts (kept local to
 * avoid a circular import).
 */
function extractGrokBuildAccessClaims(
  accessToken: string
): {
  principalType: string | null;
  principalId: string | null;
  teamId: string | null;
  organizationId: string | null;
  sub: string | null;
  tier: number | null;
} | null {
  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;

  let base64 = parts[1];
  switch (base64.length % 4) {
    case 2:
      base64 += "==";
      break;
    case 3:
      base64 += "=";
      break;
  }
  base64 = base64.replace(/-/g, "+").replace(/_/g, "/");

  try {
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return {
      principalType: typeof payload.principal_type === "string" ? payload.principal_type : null,
      principalId: typeof payload.principal_id === "string" ? payload.principal_id : null,
      teamId: typeof payload.team_id === "string" ? payload.team_id : null,
      organizationId:
        typeof payload.organization_id === "string" ? payload.organization_id : null,
      sub: typeof payload.sub === "string" ? payload.sub : null,
      tier: typeof payload.tier === "number" ? payload.tier : null,
    };
  } catch {
    return null;
  }
}

/**
 * Detect an OAuth token-endpoint response (browser PKCE exchange output),
 * which uses snake_case `access_token`, as opposed to the paste-token import
 * shape (`{ accessToken: <JWT string or auth.json blob> }`).
 */
export function isGrokBuildBrowserTokens(tokens: unknown): tokens is Record<string, unknown> {
  return (
    !!tokens &&
    typeof tokens === "object" &&
    typeof (tokens as Record<string, unknown>).access_token === "string"
  );
}

/**
 * Map a browser PKCE token-endpoint response into the same field shape the
 * paste-token mapTokens() in grok-cli.ts produces, so downstream refresh
 * (which reads generically off config.tokenUrl + refresh_token, not
 * provider-specific code) keeps working unmodified regardless of which flow
 * acquired the tokens.
 */
export function mapGrokBuildBrowserTokens(tokens: Record<string, unknown>): {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresIn: number;
  tokenType: string;
  scope: string;
  email: string | null;
  name: string | null;
  providerSpecificData: Record<string, unknown>;
} {
  const identity = decodeXaiIdTokenIdentity(tokens.id_token);
  const rawExpiresIn = typeof tokens.expires_in === "number" ? tokens.expires_in : NaN;
  // #5775 follow-up: clamp to a positive TTL instead of letting a non-positive
  // expiresIn be read as "not expiring" downstream by AutoCombo.
  const expiresIn = Math.max(
    1,
    Number.isFinite(rawExpiresIn) ? rawExpiresIn : GROK_BUILD_DEFAULT_TTL_SEC
  );

  const accessToken = typeof tokens.access_token === "string" ? tokens.access_token : "";

  // The device-code flow returns the long-lived Grok Build JWT as access_token,
  // carrying the same custom identity claims (principal_type/principal_id/
  // team_id/tier) the paste-token import reads. The executor reads these off
  // providerSpecificData on every refresh + for request headers, so they must
  // survive this flow too — otherwise a device-code (the PRIMARY) login would
  // silently degrade refresh/header behavior compared to a paste-token import.
  // The browser-PKCE exchange returns an opaque bearer token, which decodes to
  // no claims here, leaving providerSpecificData untouched for that path.
  const accessClaims = extractGrokBuildAccessClaims(accessToken);
  const providerSpecificData: Record<string, unknown> = {
    scope: typeof tokens.scope === "string" ? tokens.scope : GROK_BUILD_OAUTH_CONFIG.scope,
    tokenType: typeof tokens.token_type === "string" ? tokens.token_type : "Bearer",
  };
  if (accessClaims) {
    providerSpecificData.principalType = accessClaims.principalType;
    providerSpecificData.principalId = accessClaims.principalId;
    providerSpecificData.tier = accessClaims.tier;
    // Mirror paste-token identity resolution (grok-cli.ts::resolveGrokIdentity)
    // exactly so behavior is identical regardless of which flow acquired the
    // tokens: team/org principals key the connection off principal_id, which
    // overrides the raw team_id / organization_id claims.
    const isTeam = accessClaims.principalType?.toLowerCase() === "team";
    const isOrganization = accessClaims.principalType?.toLowerCase() === "organization";
    providerSpecificData.userId =
      isTeam || isOrganization ? accessClaims.principalId : accessClaims.sub;
    providerSpecificData.teamId = isTeam
      ? accessClaims.principalId
      : accessClaims.teamId;
    providerSpecificData.organizationId = isOrganization
      ? accessClaims.principalId
      : accessClaims.organizationId;
  }

  return {
    accessToken,
    refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : null,
    idToken: typeof tokens.id_token === "string" ? tokens.id_token : null,
    expiresIn,
    tokenType: typeof tokens.token_type === "string" ? tokens.token_type : "Bearer",
    scope: typeof tokens.scope === "string" ? tokens.scope : GROK_BUILD_OAUTH_CONFIG.scope,
    email: identity.email,
    name: identity.name || identity.email,
    providerSpecificData,
  };
}
