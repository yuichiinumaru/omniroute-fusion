import type { AntigravityClientProfile } from "@/shared/constants/antigravityClientProfile";
import {
  ANTIGRAVITY_IDE_FALLBACK_VERSION,
  getCachedAntigravityCliVersion,
  getCachedAntigravityIdeVersion,
  resolveAntigravityCliVersion,
  resolveAntigravityIdeVersion,
} from "./antigravityVersion.ts";

export const ANTIGRAVITY_IDE_NODE_API_CLIENT = "google-api-nodejs-client/10.3.0";
export const ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT = "gl-node/22.21.1";
export const ANTIGRAVITY_NODE_API_CLIENT = ANTIGRAVITY_IDE_NODE_API_CLIENT;
export const ANTIGRAVITY_CREDIT_PROBE_API_CLIENT = ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT;
export const ANTIGRAVITY_API_CLIENT = ANTIGRAVITY_CREDIT_PROBE_API_CLIENT;

const ANTIGRAVITY_OS_TYPE = "darwin";
const ANTIGRAVITY_ARCH = "arm64";
export const ANTIGRAVITY_CHROME_VERSION = "142.0.7444.175";
export const ANTIGRAVITY_ELECTRON_VERSION = "39.2.3";
function withOptionalBearerAuth(
  headers: Record<string, string>,
  accessToken?: string | null
): Record<string, string> {
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export function antigravityIdeUserAgent(version = getCachedAntigravityIdeVersion()): string {
  return `antigravity/ide/${version} ${ANTIGRAVITY_OS_TYPE}/${ANTIGRAVITY_ARCH}`;
}

export function antigravityCliUserAgent(
  version = getCachedAntigravityCliVersion(),
  authMethod = "consumer"
): string {
  return `antigravity/cli/${version} (aidev_client; os_type=${ANTIGRAVITY_OS_TYPE}; arch=${ANTIGRAVITY_ARCH}; auth_method=${authMethod})`;
}

export function antigravityIdeNodeUserAgent(version = getCachedAntigravityIdeVersion()): string {
  return `antigravity/${version} ${ANTIGRAVITY_OS_TYPE}/${ANTIGRAVITY_ARCH} ${ANTIGRAVITY_IDE_NODE_API_CLIENT}`;
}

export function getAntigravityOAuthUserAgent(profile: AntigravityClientProfile): string {
  return profile === "cli" ? antigravityCliUserAgent() : antigravityIdeNodeUserAgent();
}

/** Fallback exports for existing consumers. */
export const antigravityUserAgent = antigravityIdeUserAgent;
export const antigravityNativeOAuthUserAgent = antigravityIdeNodeUserAgent;
export const resolveAntigravityUserAgent = async () => antigravityIdeUserAgent(await resolveAntigravityIdeVersion());

export function getAntigravityContentHeaders(
  profile: AntigravityClientProfile,
  accessToken?: string | null
): Record<string, string> {
  return withOptionalBearerAuth(
    {
      "Content-Type": "application/json",
      "User-Agent": profile === "cli" ? antigravityCliUserAgent() : antigravityIdeUserAgent(),
    },
    accessToken
  );
}

export function getAntigravityIdeNodeHeaders(accessToken?: string | null): Record<string, string> {
  return withOptionalBearerAuth(
    {
      "Content-Type": "application/json",
      "User-Agent": antigravityIdeNodeUserAgent(),
      "X-Goog-Api-Client": ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT,
    },
    accessToken
  );
}

/** Native loadCodeAssist body metadata captured from both official clients. */
export function getAntigravityLoadCodeAssistMetadata(): Record<string, string> {
  return {
    ideType: "ANTIGRAVITY",
  };
}

export function getAntigravityLoadCodeAssistClientMetadata(): string {
  return JSON.stringify(getAntigravityLoadCodeAssistMetadata());
}

export const ANTIGRAVITY_LOAD_CODE_ASSIST_USER_AGENT = `vscode/1.X.X (Antigravity/${ANTIGRAVITY_IDE_FALLBACK_VERSION})`;
export const ANTIGRAVITY_LOAD_CODE_ASSIST_API_CLIENT = "";

type AntigravityHeaderProfile = "loadCodeAssist" | "fetchAvailableModels" | "models";

export function getAntigravityHeaders(
  profile: AntigravityHeaderProfile,
  accessToken?: string | null
): Record<string, string> {
  switch (profile) {
    case "loadCodeAssist":
      return withOptionalBearerAuth(
        {
          "Content-Type": "application/json",
          "User-Agent": antigravityNativeOAuthUserAgent(),
        },
        accessToken
      );
    case "fetchAvailableModels":
    case "models":
      return withOptionalBearerAuth(
        {
          "Content-Type": "application/json",
          "User-Agent": antigravityUserAgent(),
        },
        accessToken
      );
    default:
      return withOptionalBearerAuth({ "Content-Type": "application/json" }, accessToken);
  }
}

/** X-Goog-Api-Client used by Antigravity's credit probe path. */
export function getAntigravityCreditProbeApiClientHeader(): string {
  return ANTIGRAVITY_CREDIT_PROBE_API_CLIENT;
}

/** X-Goog-Api-Client used by harness/native Node Antigravity paths. */
export function getAntigravityApiClientHeader(): string {
  return ANTIGRAVITY_API_CLIENT;
}

export const ANTIGRAVITY_VERSION = ANTIGRAVITY_IDE_FALLBACK_VERSION;
