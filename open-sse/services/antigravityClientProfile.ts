import {
  DEFAULT_ANTIGRAVITY_CLIENT_PROFILE,
  normalizeAntigravityClientProfile,
  type AntigravityClientProfile,
} from "@/shared/constants/antigravityClientProfile";
import { getRuntimeArch, getRuntimePlatform } from "./cloudCodeHeaders.ts";
import {
  deriveAntigravityMachineId,
  getAntigravityVscodeSessionId,
  type AntigravityCredentialsLike,
} from "./antigravityIdentity.ts";
import {
  antigravityIdeUserAgent,
  antigravityCliUserAgent,
  ANTIGRAVITY_IDE_NODE_API_CLIENT,
  ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT,
  getAntigravityContentHeaders,
  getAntigravityIdeNodeHeaders,
  getAntigravityLoadCodeAssistMetadata,
} from "./antigravityHeaders.ts";
import {
  getCachedAntigravityCliVersion,
  getCachedAntigravityIdeVersion,
  resolveAntigravityCliVersion,
  resolveAntigravityIdeVersion,
} from "./antigravityVersion.ts";

export {
  ANTIGRAVITY_CLIENT_PROFILE_VALUES,
  DEFAULT_ANTIGRAVITY_CLIENT_PROFILE,
  normalizeAntigravityClientProfile,
  type AntigravityClientProfile,
} from "@/shared/constants/antigravityClientProfile";

type AntigravityProfileCredentials = AntigravityCredentialsLike & {
  providerSpecificData?: Record<string, unknown> | null;
};

export function getAntigravityClientProfile(
  credentials?: AntigravityProfileCredentials | null
): AntigravityClientProfile {
  const fromProviderData =
    credentials?.providerSpecificData &&
    typeof credentials.providerSpecificData === "object" &&
    !Array.isArray(credentials.providerSpecificData)
      ? credentials.providerSpecificData.clientProfile
      : undefined;

  return normalizeAntigravityClientProfile(fromProviderData);
}

export function resolveAntigravityClientVersion(
  profile: AntigravityClientProfile
): Promise<string> {
  return profile === "cli" ? resolveAntigravityCliVersion() : resolveAntigravityIdeVersion();
}

function normalizeHarnessPlatform(
  platform: NodeJS.Platform | string = getRuntimePlatform()
): string {
  return platform === "win32" ? "windows" : platform || "unknown";
}

function normalizeHarnessArch(arch: NodeJS.Architecture | string = getRuntimeArch()): string {
  switch (arch) {
    case "x64":
      return "amd64";
    case "ia32":
      return "386";
    default:
      return arch || "unknown";
  }
}

function getHarnessPlatformArch(
  platform: NodeJS.Platform | string = getRuntimePlatform(),
  arch: NodeJS.Architecture | string = getRuntimeArch()
): string {
  return `${normalizeHarnessPlatform(platform)}/${normalizeHarnessArch(arch)}`;
}

export function antigravityHarnessUserAgent(
  version = getCachedAntigravityIdeVersion(),
  platform: NodeJS.Platform | string = getRuntimePlatform(),
  arch: NodeJS.Architecture | string = getRuntimeArch()
): string {
  return `antigravity/${version} ${getHarnessPlatformArch(platform, arch)}`;
}

export function antigravityHarnessLoadCodeAssistUserAgent(
  version = getCachedAntigravityIdeVersion()
): string {
  return `${antigravityHarnessUserAgent(version)} ${ANTIGRAVITY_IDE_NODE_API_CLIENT}`;
}

export function antigravityHarnessApiClientHeader(): string {
  return ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT;
}

export function removeHeaderCaseInsensitive(headers: Record<string, string>, name: string): void {
  const lowerName = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lowerName) {
      delete headers[key];
    }
  }
}

function getProjectHeaderValue(body: unknown): string | null {
  const project =
    body && typeof body === "object" ? (body as Record<string, unknown>).project : null;
  if (typeof project !== "string" || project.trim().length === 0) return null;
  if (project === "test-project" || project === "project-id") return null;
  return project;
}

/** Headers used by OAuth/bootstrap calls (loadCodeAssist, token refresh). */
export function getAntigravityBootstrapHeaders(
  profile: AntigravityClientProfile,
  accessToken?: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

    const identityHeaders = profile === "cli" ? getAntigravityIdeNodeHeaders() : getAntigravityContentHeaders(profile);
    for (const [key, value] of Object.entries(identityHeaders)) {
      headers[key] = value;
    }
    
    if (profile !== "cli") {
      headers["Client-Metadata"] = JSON.stringify(getAntigravityLoadCodeAssistMetadata());
    }
  return headers;
}

/** Apply per-connection client identity to outbound Cloud Code content requests. */
export function applyAntigravityClientProfileHeaders(
  headers: Record<string, string>,
  credentials: AntigravityProfileCredentials | null | undefined,
  body: unknown
): AntigravityClientProfile {
  const profile = getAntigravityClientProfile(credentials);
  if (profile === "cli") {
    headers["User-Agent"] = `antigravity/cli/${getCachedAntigravityCliVersion()} (aidev_client; os_type=darwin; arch=arm64; auth_method=consumer)`;
  } else {
    // Note: The IDE uses the desktop format, matching upstream reference headers.
    headers["User-Agent"] = antigravityIdeUserAgent();
  }
  for (const name of [
    "x-client-name",
    "x-client-version",
    "x-machine-id",
    "x-vscode-sessionid",
    "X-Goog-Api-Client",
    "Client-Metadata",
  ]) {
    removeHeaderCaseInsensitive(headers, name);
  }

  const project = getProjectHeaderValue(body);
  if (project) {
    headers["x-goog-user-project"] = project;
  } else {
    removeHeaderCaseInsensitive(headers, "x-goog-user-project");
  }

  return profile;
}
