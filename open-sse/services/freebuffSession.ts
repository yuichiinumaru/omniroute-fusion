import { z } from "zod";
import type { ProviderCredentials } from "../executors/base.ts";
import { sanitizeErrorMessage } from "../utils/error.ts";
import { getProviderErrorRuleMatch } from "../config/providerErrorRules.ts";

export const FreebuffAdmissionNestedErrorSchema = z
  .object({
    message: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
  })
  .passthrough()
  .refine(
    (data) => Boolean(data.message || data.code || data.type),
    { message: "Nested error object must contain message, code, or type" }
  );

export const FreebuffAdmissionErrorPayloadSchema = z
  .object({
    error: z.union([
      z.string().min(1),
      FreebuffAdmissionNestedErrorSchema,
    ]).optional(),
    message: z.string().min(1).optional(),
    reason: z.string().min(1).optional(),
    retry_after: z.number().positive().optional(),
  })
  .passthrough()
  .refine(
    (data) =>
      Boolean(
        (typeof data.error === "string" && data.error.length > 0) ||
        (typeof data.error === "object" && data.error !== null) ||
        (typeof data.message === "string" && data.message.length > 0) ||
        (typeof data.reason === "string" && data.reason.length > 0) ||
        (typeof data.retry_after === "number" && data.retry_after > 0)
      ),
    { message: "Freebuff admission error payload must contain at least one descriptive error field" }
  );

export const FreebuffSessionAdmissionResponseSchema = z
  .object({
    instanceId: z.string().min(1).optional(),
    id: z.string().min(1).optional(),
    session_id: z.string().min(1).optional(),
    expiresAt: z.union([z.number(), z.string().min(1)]),
    quota: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .refine(
    (data) => Boolean(data.instanceId || data.id || data.session_id),
    { message: "Freebuff admission response must contain instanceId (or id/session_id)" }
  )
  .transform((data) => ({
    instanceId: (data.instanceId || data.id || data.session_id)!,
    expiresAt: data.expiresAt,
    quota: data.quota,
  }));

export class ProviderError extends Error {
  public status: number;
  public code: string;
  public reason?: string;
  public retryAfter?: number;
  public retryAfterMs?: number;
  public provider?: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      reason?: string;
      retryAfter?: number;
      retryAfterMs?: number;
      provider?: string;
    }
  ) {
    super(message);
    this.name = "ProviderError";
    this.status = options?.status ?? 500;
    this.code = options?.code ?? "provider_error";
    this.reason = options?.reason;
    this.retryAfter = options?.retryAfter;
    this.retryAfterMs =
      options?.retryAfterMs ?? (options?.retryAfter ? options.retryAfter * 1000 : undefined);
    this.provider = options?.provider ?? "freebuff";
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

const TOKEN_PATTERNS: readonly RegExp[] = [
  /\b(?:Bearer|Basic|Token)\s+[A-Za-z0-9._\-+/=]{4,}\b/gi,
  /\bauth_[A-Za-z0-9_.\-]{4,}\b/gi,
  /\bcf_[A-Za-z0-9_.\-]{4,}\b/gi,
  /\beyJ[A-Za-z0-9_\-]{8,}(?:\.[A-Za-z0-9_\-]{4,})*\b/g,
  /\bakia[0-9a-z_.\-]{4,}\b/gi,
  /\bAKIA[0-9A-Z_.\-]{4,}\b/g,
  /\bsk-[A-Za-z0-9_.\-]{4,}\b/g,
  /\bghp_[A-Za-z0-9]{8,}\b/gi,
  /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/gi,
  /\b(?:cb-auth-token|cb_auth_token)[A-Za-z0-9_.\-]*\b/gi,
  /\b(?:SECRET|TOKEN|PASSWORD|PASSWD|API[_-]?KEY|AUTH[_-]?TOKEN)[_:\-\s=]+[A-Za-z0-9_.\-]{4,}\b/gi,
  /\b(?:token|secret|password|passwd|api_?key|auth_?token|fingerprint_?hash)\s*[:=]\s*["']?[A-Za-z0-9_.\-]+["']?/gi,
  /\b[A-Fa-f0-9]{32,}\b/g,
];

export function sanitizeFreebuffErrorMessage(message: unknown): string {
  const sanitized = sanitizeErrorMessage(message);
  let result = sanitized;
  for (const pattern of TOKEN_PATTERNS) {
    result = result.replace(pattern, "<token>");
  }
  return result;
}

export interface FreebuffSession {
  instanceId: string;
  model: string;
  expiresAt: number; // Unix timestamp in ms
  acquiredAt: number; // Unix timestamp in ms
  quota?: Record<string, unknown>;
}

export type FreebuffSessionInfo = FreebuffSession;

export interface EnsureSessionOptions {
  signal?: AbortSignal;
  forceRenew?: boolean;
  sessionUrl?: string;
  userAgent?: string;
}

const DEFAULT_SESSION_URL = "https://codebuff.com/api/v1/freebuff/session";
const DEFAULT_USER_AGENT = "ai-sdk/openai-compatible/0.1.0/codebuff";
const SESSION_EXPIRATION_BUFFER_MS = 60_000; // 1 minute safety buffer
const DEFAULT_SESSION_TTL_MS = 3600_000; // 1 hour

const sessions = new Map<string, FreebuffSession>();
export const inFlightSessions = new Map<string, Promise<string>>();

export function getSessionKey(credentials?: ProviderCredentials): string {
  return (
    credentials?.connectionId ||
    credentials?.accessToken ||
    credentials?.apiKey ||
    "default"
  );
}

export function getFreebuffSession(credentials?: ProviderCredentials): FreebuffSession | undefined {
  const key = getSessionKey(credentials);
  return sessions.get(key);
}

export function setFreebuffSession(
  credentials: ProviderCredentials | undefined,
  session: FreebuffSession
): void {
  const key = getSessionKey(credentials);
  sessions.set(key, session);
}

export function clearAllFreebuffSessions(): void {
  sessions.clear();
  inFlightSessions.clear();
}

export async function releaseFreebuffSession(
  credentials?: ProviderCredentials,
  options?: { signal?: AbortSignal; sessionUrl?: string; userAgent?: string }
): Promise<boolean> {
  const key = getSessionKey(credentials);
  const existing = sessions.get(key);
  sessions.delete(key);
  if (existing?.model) {
    inFlightSessions.delete(`${key}:${existing.model}`);
  }

  const token = credentials?.accessToken || credentials?.apiKey || "";
  const sessionUrl = options?.sessionUrl || DEFAULT_SESSION_URL;
  const userAgent = options?.userAgent || DEFAULT_USER_AGENT;

  if (!token) return true;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "User-Agent": userAgent,
    };
    if (existing?.instanceId) {
      headers["x-freebuff-instance-id"] = existing.instanceId;
    }
    if (existing?.model) {
      headers["x-freebuff-model"] = existing.model;
    }

    const res = await fetch(sessionUrl, {
      method: "DELETE",
      headers,
      signal: options?.signal,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureFreebuffSession(
  credentials?: ProviderCredentials,
  model = "deepseek-v4-pro",
  options?: EnsureSessionOptions
): Promise<string> {
  const key = getSessionKey(credentials);
  const existing = sessions.get(key);
  const now = Date.now();

  if (
    !options?.forceRenew &&
    existing &&
    existing.model === model &&
    existing.expiresAt - now > SESSION_EXPIRATION_BUFFER_MS
  ) {
    return existing.instanceId;
  }

  const inFlightKey = `${key}:${model}`;
  if (!options?.forceRenew && inFlightSessions.has(inFlightKey)) {
    return await inFlightSessions.get(inFlightKey)!;
  }

  const token = credentials?.accessToken || credentials?.apiKey || "";
  const sessionUrl = options?.sessionUrl || DEFAULT_SESSION_URL;
  const userAgent = options?.userAgent || DEFAULT_USER_AGENT;

  const admitSession = async (retryOnConflict = true): Promise<string> => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-freebuff-model": model,
      "User-Agent": userAgent,
      Accept: "application/json",
    };

    const res = await fetch(sessionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ model }),
      signal: options?.signal,
    });

    if (res.status === 409 && retryOnConflict) {
      // Model locked or session superseded -> release and retry once
      await releaseFreebuffSession(credentials, options);
      return admitSession(false);
    }

    if (!res.ok) {
      const retryAfterHeader = res.headers.get("retry-after");
      let retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
      if (typeof retryAfterSec === "number" && (!Number.isFinite(retryAfterSec) || retryAfterSec <= 0)) {
        retryAfterSec = undefined;
      }

      let rawText = "";
      try {
        rawText = await res.text();
      } catch {
        rawText = `HTTP_${res.status}`;
      }

      let parsedReason: string | undefined;
      let parsedMessage: string | undefined;
      let rawJson: unknown = undefined;

      try {
        rawJson = JSON.parse(rawText);
        const parsed = FreebuffAdmissionErrorPayloadSchema.safeParse(rawJson);
        if (parsed.success) {
          const d = parsed.data;
          if (typeof d.error === "string") {
            parsedReason = d.error;
            parsedMessage = d.message || d.error;
          } else if (d.error && typeof d.error === "object") {
            parsedMessage = d.error.message;
            parsedReason = d.error.code;
          } else if (d.message) {
            parsedMessage = d.message;
          }
          if (d.reason) {
            parsedReason = d.reason;
          }
          if (typeof d.retry_after === "number" && d.retry_after > 0) {
            retryAfterSec = d.retry_after;
          }
        } else {
          parsedMessage = rawText;
        }
      } catch {
        parsedMessage = rawText;
      }

      const lower = `${parsedReason || ""} ${parsedMessage || ""} ${rawText}`.toLowerCase();
      let code = `HTTP_${res.status}`;
      let reason: string | undefined = parsedReason;

      if (res.status === 429) {
        code = "rate_limit_exceeded";
        if (lower.includes("free_mode_capacity_deferred")) {
          reason = "free_mode_capacity_deferred";
        } else if (lower.includes("ip_capped")) {
          reason = "ip_capped";
        } else if (lower.includes("rate_limited")) {
          reason = "rate_limited";
        } else if (!reason) {
          reason = "rate_limit_exceeded";
        }

        const ruleMatch = getProviderErrorRuleMatch(
          "freebuff",
          429,
          res.headers,
          rawJson ?? { error: reason, reason, message: parsedMessage }
        );
        if (!retryAfterSec && ruleMatch?.cooldownMs) {
          retryAfterSec = Math.ceil(ruleMatch.cooldownMs / 1000);
        }
        if (!retryAfterSec || retryAfterSec <= 0) {
          retryAfterSec = 5;
        }
      } else if (res.status === 409) {
        code = "model_locked";
        reason = reason || "model_locked";
      } else if (res.status === 428) {
        code = "waiting_room_required";
        reason = reason || "waiting_room_required";
      } else if (res.status === 410) {
        code = "session_expired";
        reason = reason || "session_expired";
      } else if (res.status === 401) {
        code = "unauthorized";
        reason = reason || "unauthorized";
      }

      const displayMessage = parsedMessage || rawText || `HTTP_${res.status}`;
      const safeErrText = sanitizeFreebuffErrorMessage(displayMessage);
      const errMsg =
        res.status === 429
          ? `Freebuff session admission rate limit exceeded (429): ${safeErrText}`
          : `Freebuff session admission failed (${res.status}): ${safeErrText}`;

      throw new ProviderError(errMsg, {
        status: res.status,
        code,
        reason,
        retryAfter: res.status === 429 ? retryAfterSec : undefined,
        retryAfterMs: res.status === 429 ? (retryAfterSec ? retryAfterSec * 1000 : 5000) : undefined,
        provider: "freebuff",
      });
    }

    let data: { instanceId: string; expiresAt: number | string; quota?: Record<string, unknown> } | null = null;
    try {
      const parsedJson = await res.json();
      const schemaValidation = FreebuffSessionAdmissionResponseSchema.safeParse(parsedJson);
      if (schemaValidation.success) {
        data = schemaValidation.data;
      } else {
        throw new ProviderError("Invalid session admission response format", {
          status: 502,
          code: "invalid_response",
          provider: "freebuff",
        });
      }
    } catch (e: unknown) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(
        `Freebuff session admission malformed JSON: ${sanitizeFreebuffErrorMessage(e)}`,
        { status: 502, code: "malformed_json", provider: "freebuff" }
      );
    }

    const instanceId =
      (typeof data?.instanceId === "string" && data.instanceId.trim()) ||
      res.headers.get("x-freebuff-instance-id") ||
      "";

    if (!instanceId) {
      throw new ProviderError("Freebuff session admission did not return instanceId", {
        status: 502,
        code: "missing_instance_id",
        provider: "freebuff",
      });
    }

    let expiresAtMs: number;
    if (typeof data?.expiresAt === "number" && Number.isFinite(data.expiresAt)) {
      expiresAtMs = data.expiresAt > 10000000000 ? data.expiresAt : data.expiresAt * 1000;
    } else if (typeof data?.expiresAt === "string") {
      const parsed = Date.parse(data.expiresAt);
      expiresAtMs = Number.isNaN(parsed) ? Date.now() + DEFAULT_SESSION_TTL_MS : parsed;
    } else {
      expiresAtMs = Date.now() + DEFAULT_SESSION_TTL_MS;
    }

    const quota =
      data?.quota && typeof data.quota === "object" && !Array.isArray(data.quota)
        ? (data.quota as Record<string, unknown>)
        : undefined;

    const newSession: FreebuffSession = {
      instanceId,
      model,
      expiresAt: expiresAtMs,
      acquiredAt: Date.now(),
      quota,
    };

    sessions.set(key, newSession);
    return instanceId;
  };

  const admissionPromise = (async (): Promise<string> => {
    try {
      return await admitSession(true);
    } finally {
      inFlightSessions.delete(inFlightKey);
    }
  })();

  inFlightSessions.set(inFlightKey, admissionPromise);
  return await admissionPromise;
}
