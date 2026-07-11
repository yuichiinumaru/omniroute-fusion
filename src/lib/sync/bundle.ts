import { createHash } from "crypto";
import {
  getApiKeys,
  getCombos,
  getModelAliases,
  getProviderConnections,
  getProviderNodes,
  getSettings,
} from "@/lib/localDb";

type JsonRecord = Record<string, unknown>;

export interface ConfigSyncBundle {
  settings: JsonRecord;
  providerConnections: JsonRecord[];
  providerNodes: JsonRecord[];
  modelAliases: JsonRecord;
  combos: JsonRecord[];
  apiKeys: JsonRecord[];
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function sanitizeSettingsForSync(settings: unknown): JsonRecord {
  const record = asRecord(settings);
  const {
    password: _password,
    requireLogin: _requireLogin,
    cloudEnabled: _cloudEnabled,
    ...safeSettings
  } = record;
  return safeSettings;
}

function sortByStringKeys<T extends JsonRecord>(items: T[], keys: string[]) {
  return [...items].sort((a, b) => {
    for (const key of keys) {
      const leftRaw = a[key];
      const rightRaw = b[key];

      if (typeof leftRaw === "number" || typeof rightRaw === "number") {
        const left = typeof leftRaw === "number" ? leftRaw : Number.MAX_SAFE_INTEGER;
        const right = typeof rightRaw === "number" ? rightRaw : Number.MAX_SAFE_INTEGER;
        if (left !== right) return left - right;
        continue;
      }

      const left = typeof leftRaw === "string" ? String(leftRaw) : "";
      const right = typeof rightRaw === "string" ? String(rightRaw) : "";
      const comparison = left.localeCompare(right, undefined, { numeric: true });
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
}

function pickDefined(record: JsonRecord, keys: string[]) {
  return Object.fromEntries(
    keys.filter((key) => record[key] !== undefined).map((key) => [key, record[key]])
  );
}

/** Metadata-only fields — safe to upload without OMNIROUTE_CLOUD_SYNC_SECRETS. */
const PROVIDER_CONNECTION_METADATA_KEYS = [
  "id",
  "provider",
  "authType",
  "name",
  "displayName",
  "email",
  "priority",
  "globalPriority",
  "defaultModel",
  "isActive",
  "expiresAt",
  "expiresIn",
  "tokenType",
  "scope",
  "projectId",
  "group",
] as const;

/** Credential fields — only included when includeSecrets=true (F-06-W2-001). */
const PROVIDER_CONNECTION_SECRET_KEYS = [
  "accessToken",
  "refreshToken",
  "idToken",
  "apiKey",
  "providerSpecificData",
] as const;

/**
 * Sanitize a provider connection for outbound cloud sync.
 * Default redacts OAuth tokens / API keys (F-06-W2-001).
 * Exported for unit tests / snapshot assertions.
 */
export function sanitizeProviderConnectionForSync(
  connection: unknown,
  options: { includeSecrets?: boolean } = {}
): JsonRecord {
  const record = asRecord(connection);
  const keys: string[] = [...PROVIDER_CONNECTION_METADATA_KEYS];
  if (options.includeSecrets === true) {
    keys.push(...PROVIDER_CONNECTION_SECRET_KEYS);
  }
  return pickDefined(record, keys);
}

function sanitizeProviderNodeForSync(node: unknown): JsonRecord {
  const record = asRecord(node);
  return pickDefined(record, [
    "id",
    "type",
    "name",
    "prefix",
    "apiType",
    "baseUrl",
    "chatPath",
    "modelsPath",
  ]);
}

function sanitizeComboForSync(combo: unknown): JsonRecord {
  const record = asRecord(combo);
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = record;
  return rest;
}

const API_KEY_METADATA_KEYS = [
  "id",
  "name",
  "machineId",
  "allowedModels",
  "allowedCombos",
  "allowedConnections",
  "noLog",
  "autoResolve",
  "isActive",
  "accessSchedule",
  "maxRequestsPerDay",
  "maxRequestsPerMinute",
  "throttleDelayMs",
  "maxSessions",
] as const;

/**
 * Sanitize an API key record for outbound cloud sync.
 * Default omits the plaintext `key` (F-06-W2-001).
 * Exported for unit tests / snapshot assertions.
 */
export function sanitizeApiKeyForSync(
  apiKey: unknown,
  options: { includeSecrets?: boolean } = {}
): JsonRecord {
  const record = asRecord(apiKey);
  const keys: string[] = [...API_KEY_METADATA_KEYS];
  if (options.includeSecrets === true) {
    keys.push("key");
  }
  return pickDefined(record, keys);
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as JsonRecord)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, canonicalizeJson((value as JsonRecord)[key])])
    );
  }

  return value;
}

export function serializeStableJson(value: unknown) {
  return JSON.stringify(canonicalizeJson(value));
}

export function computeConfigSyncVersion(bundle: ConfigSyncBundle) {
  return createHash("sha256").update(serializeStableJson(bundle)).digest("hex");
}

export interface BuildConfigSyncOptions {
  /**
   * When true, include OAuth tokens / API keys in the bundle.
   * Default false (F-06-W2-001) — set only when OMNIROUTE_CLOUD_SYNC_SECRETS=true.
   */
  includeSecrets?: boolean;
}

export async function buildConfigSyncBundle(
  options: BuildConfigSyncOptions = {}
): Promise<ConfigSyncBundle> {
  const includeSecrets = options.includeSecrets === true;
  const [settings, providerConnections, providerNodes, modelAliases, combos, apiKeys] =
    await Promise.all([
      getSettings(),
      getProviderConnections(),
      getProviderNodes(),
      getModelAliases(),
      getCombos(),
      getApiKeys(),
    ]);

  return {
    settings: sanitizeSettingsForSync(settings),
    providerConnections: sortByStringKeys(
      providerConnections.map((connection) =>
        sanitizeProviderConnectionForSync(connection, { includeSecrets })
      ),
      ["provider", "name", "id"]
    ),
    providerNodes: sortByStringKeys(
      providerNodes.map((node) => sanitizeProviderNodeForSync(node)),
      ["type", "name", "id"]
    ),
    modelAliases: asRecord(modelAliases),
    combos: sortByStringKeys(
      combos.map((combo) => sanitizeComboForSync(combo)),
      ["sortOrder", "name", "id"]
    ),
    apiKeys: sortByStringKeys(
      apiKeys.map((apiKey) => sanitizeApiKeyForSync(apiKey, { includeSecrets })),
      ["name", "id"]
    ),
  };
}

export async function buildConfigSyncEnvelope(options: BuildConfigSyncOptions = {}) {
  const bundle = await buildConfigSyncBundle(options);
  const version = computeConfigSyncVersion(bundle);
  return {
    version,
    bundle,
  };
}

export function toLegacyCloudSyncPayload(bundle: ConfigSyncBundle) {
  return {
    providers: bundle.providerConnections,
    providerNodes: bundle.providerNodes,
    modelAliases: bundle.modelAliases,
    combos: bundle.combos,
    apiKeys: bundle.apiKeys,
    settings: bundle.settings,
  };
}
