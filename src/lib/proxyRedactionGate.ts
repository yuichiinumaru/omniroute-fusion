import { randomBytes } from "node:crypto";
import { isFeatureFlagEnabled } from "@/shared/utils/featureFlags";
import { logAuditEvent, recordMandatoryAuditLog } from "@/lib/compliance";
import { PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE } from "@/shared/constants/proxyRedaction";

export { recordMandatoryAuditLog, PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE };

export class ProxyRedactionRequiredError extends Error {
  status = 409;
  type = "conflict" as const;
  code = "PII_REDACTION_REQUIRED";

  constructor(
    message = "PII redaction must be enabled before enabling proxy routing. Either enable PII redaction or provide a valid bypass token."
  ) {
    super(message);
    this.name = "ProxyRedactionRequiredError";
  }
}

export interface PiiRedactionCheckOptions {
  disabledGuardrails?: string[] | null;
}

/**
 * Checks whether PII redaction is effectively active in the system / request context.
 * Effective PII redaction requires:
 * 1. PII_REDACTION_ENABLED feature flag to be ON (checked via DB override > env > default)
 * 2. The request context must not suppress the pii-masker guardrail via disabledGuardrails
 */
export function isEffectivePiiRedactionEnabled(options?: PiiRedactionCheckOptions): boolean {
  const isRedactionFlagOn = isFeatureFlagEnabled("PII_REDACTION_ENABLED");
  if (!isRedactionFlagOn) {
    return false;
  }

  if (options?.disabledGuardrails && Array.isArray(options.disabledGuardrails)) {
    const hasPiiDisabled = options.disabledGuardrails.some((g) => {
      const normalized = String(g).trim().toLowerCase().replace(/_/g, "-");
      return (
        normalized === "pii-masker" ||
        normalized === "pii-redaction" ||
        normalized === "pii" ||
        normalized === "piimasker"
      );
    });
    if (hasPiiDisabled) {
      return false;
    }
  }

  return true;
}

interface BypassTokenRecord {
  token: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  actor?: string;
  reason?: string;
}

const DEFAULT_BYPASS_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

const bypassTokens = new Map<string, BypassTokenRecord>();

function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, record] of bypassTokens.entries()) {
    if (record.used || record.expiresAt <= now) {
      bypassTokens.delete(token);
    }
  }
}

export type AuditLogFunction = (entry: {
  action: string;
  actor?: string;
  target?: string;
  details?: unknown;
  metadata?: unknown;
  ipAddress?: string;
  resourceType?: string;
  status?: string;
  requestId?: string;
  createdAt?: string;
}) => void;

let auditLogger: AuditLogFunction = recordMandatoryAuditLog;

/**
 * Allows overriding the audit logger in tests to simulate audit log failures.
 * @internal
 */
export function setAuditLoggerForTesting(fn: AuditLogFunction | null): void {
  auditLogger = fn || recordMandatoryAuditLog;
}

export interface CreateBypassTokenOptions {
  phrase?: string;
  confirmationPhrase?: string;
  confirmed?: boolean;
  actor?: string;
  reason?: string;
  ttlMs?: number;
  logAuditEvent?: AuditLogFunction;
}

/**
 * Creates a one-time bypass token when the user explicitly agrees and confirms the risk phrase.
 */
export function createProxyBypassToken(options?: CreateBypassTokenOptions): {
  token: string;
  expiresAt: string;
} {
  cleanupExpiredTokens();

  const phrase = options?.confirmationPhrase ?? options?.phrase;
  const confirmed = options?.confirmed;

  if (phrase !== undefined || confirmed !== undefined) {
    if (!confirmed) {
      throw new Error("Confirmation checkbox must be checked to generate bypass token");
    }
    if (phrase?.trim() !== PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE) {
      throw new Error(
        `Confirmation phrase must match exact text: "${PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE}"`
      );
    }
  }

  const token = `pbt_${randomBytes(24).toString("hex")}`;
  const now = Date.now();
  const ttlMs = options?.ttlMs ?? DEFAULT_BYPASS_TOKEN_TTL_MS;
  const expiresAtMs = now + ttlMs;

  const record: BypassTokenRecord = {
    token,
    createdAt: now,
    expiresAt: expiresAtMs,
    used: false,
    actor: options?.actor,
    reason: options?.reason,
  };

  const logger = options?.logAuditEvent || auditLogger;
  try {
    logger({
      action: "proxy.bypass_token_created",
      actor: options?.actor || "unknown",
      target: "proxy",
      resourceType: "settings",
      status: "success",
      details: {
        tokenPrefix: token.slice(0, 10),
        reason: options?.reason || "Manual high-friction confirmation token issued",
      },
    });
  } catch (auditErr: unknown) {
    const message = auditErr instanceof Error ? auditErr.message : String(auditErr);
    throw new Error(`Failed to record audit log for bypass token creation: ${message}`);
  }

  // Token is committed to in-memory store ONLY AFTER audit persistence succeeds
  bypassTokens.set(token, record);

  return {
    token,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

export interface VerifyBypassTokenOptions {
  consume?: boolean;
  actor?: string;
  logAuditEvent?: AuditLogFunction;
}

/**
 * Verifies and optionally consumes a bypass token.
 */
export function verifyProxyBypassToken(
  token: string | null | undefined,
  options?: VerifyBypassTokenOptions
): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  cleanupExpiredTokens();

  const record = bypassTokens.get(token.trim());
  if (!record) {
    return false;
  }

  const now = Date.now();
  if (record.used || record.expiresAt <= now) {
    bypassTokens.delete(token.trim());
    return false;
  }

  const shouldConsume = options?.consume !== false;
  if (shouldConsume) {
    const logger = options?.logAuditEvent || auditLogger;
    try {
      logger({
        action: "proxy.unredacted_bypass",
        actor: options?.actor || record.actor || "system",
        target: "proxy",
        resourceType: "settings",
        status: "success",
        details: {
          tokenPrefix: token.trim().slice(0, 10),
          reason: record.reason || "Manual high-friction confirmation bypass used",
        },
      });
    } catch (auditErr: unknown) {
      const message = auditErr instanceof Error ? auditErr.message : String(auditErr);
      throw new Error(
        `Failed to record mandatory audit log for unredacted proxy bypass: ${message}`
      );
    }

    record.used = true;
    bypassTokens.delete(token.trim());
  }

  return true;
}

export function clearProxyBypassTokens(): void {
  bypassTokens.clear();
}

export interface AssertProxyRedactionOptions {
  bypassToken?: string | null;
  actor?: string;
  disabledGuardrails?: string[] | null;
}

/**
 * Asserts that effective PII redaction is enabled or a valid bypass token was provided.
 * Throws ProxyRedactionRequiredError (HTTP 409) if neither condition is satisfied.
 */
export function assertProxyRedactionOrBypass(options: AssertProxyRedactionOptions): void {
  if (isEffectivePiiRedactionEnabled({ disabledGuardrails: options.disabledGuardrails })) {
    return;
  }

  if (
    options.bypassToken &&
    verifyProxyBypassToken(options.bypassToken, { consume: true, actor: options.actor })
  ) {
    return;
  }

  throw new ProxyRedactionRequiredError();
}

/**
 * Helper to inspect whether an update payload intends to enable proxy routing.
 */
export function isEnablingProxyConfig(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;

  if (p.proxy && typeof p.proxy === "object") return true;
  if (p.global && typeof p.global === "object") return true;

  if (p.providers && typeof p.providers === "object") {
    for (const v of Object.values(p.providers)) {
      if (v && typeof v === "object") return true;
    }
  }

  if (p.combos && typeof p.combos === "object") {
    for (const v of Object.values(p.combos)) {
      if (v && typeof v === "object") return true;
    }
  }

  if (p.keys && typeof p.keys === "object") {
    for (const v of Object.values(p.keys)) {
      if (v && typeof v === "object") return true;
    }
  }

  if (p.proxyEnabled === true) return true;
  if (p.perKeyProxyEnabled === true) return true;

  if (typeof p.proxyId === "string" && p.proxyId.trim().length > 0) return true;

  if (p.assignment && typeof p.assignment === "object") {
    const a = p.assignment as Record<string, unknown>;
    if (typeof a.proxyId === "string" && a.proxyId.trim().length > 0) return true;
  }

  return false;
}
