/**
 * Credential keys inside `provider_specific_data` that must be:
 * - encrypted at rest when STORAGE_ENCRYPTION_KEY is set
 * - stripped from management API responses
 *
 * Inventory sources (keep in sync — unit test asserts coverage):
 * - `webSessionDedup.PREFERRED_CREDENTIAL_KEYS`
 * - `WEB_SESSION_CREDENTIAL_REQUIREMENTS[*].storageKeys`
 *
 * Pure data module (no Node crypto) so dashboard + server can share one SSOT.
 */
export const PSD_SECRET_KEYS = [
  // Canonical / preferred credential aliases
  "cookie",
  "token",
  "sessionToken",
  "session-token",
  "sso",
  "sso-rw",
  "access_token",
  "accessToken",
  "copilotToken",
  "cf_clearance",
  // Console / AWS / usage scrapers
  "consoleApiKey",
  "secretAccessKey",
  "awsSecretAccessKey",
  "awsSessionToken",
  "authCookie",
  "openCodeGoAuthCookie",
  "opencodeGoAuthCookie",
  "ollamaUsageCookie",
  "ollamaCloudUsageCookie",
  "ollamaCloudCookie",
  "usageCookie",
  // Web-session storageKeys (provider-specific cookie/token field names)
  "__Secure-next-auth.session-token",
  "__Secure-1PSID",
  "__Secure-1PSIDTS",
  "__Secure-authjs.session-token",
  "abra_sess",
  "sessionKey",
  "userToken",
  "chathubPath",
  "userTenant",
  "convex-session-id",
  "convexSessionId",
  "__client",
  "email",
  "hf-chat",
  "p-b",
  "session",
  "__vercel_session",
  "ssxmod_itna",
  "ssxmod_itna2",
  "cna",
  "tongyi_sso_ticket",
  "duckai",
  "chatglm_session",
  "manus_session",
  "arena-auth-prod-v1",
  "arena-auth-prod-v1.0",
  "arena-auth-prod-v1.1",
] as const;

export type PsdSecretKey = (typeof PSD_SECRET_KEYS)[number];
