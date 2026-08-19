import { z } from "zod";
import { FREEBUFF_CONFIG } from "../constants/oauth";
import { randomUUID } from "crypto";
import { sanitizeErrorMessage } from "../../../../open-sse/utils/error.ts";

export const FreebuffDeviceCodeResponseRawSchema = z
  .object({
    fingerprintId: z.string().min(1).optional(),
    expiresInMs: z.number().optional(),
    loginUrl: z.string().min(1).optional(),
    authUrl: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
    fingerprintHash: z.string().min(1).optional(),
    hash: z.string().min(1).optional(),
    expiresAt: z.union([z.number(), z.string().min(1)]).optional(),
  })
  .passthrough()
  .refine(
    (data) =>
      Boolean(
        (data.loginUrl || data.authUrl || data.url) &&
        (data.fingerprintHash || data.hash)
      ),
    {
      message:
        "Freebuff device code response must contain loginUrl (or authUrl/url) and fingerprintHash (or hash)",
    }
  )
  .transform((data) => ({
    loginUrl: (data.loginUrl || data.authUrl || data.url)!,
    fingerprintHash: (data.fingerprintHash || data.hash)!,
    expiresAt: data.expiresAt,
  }));

export const FreebuffPollUserRawSchema = z
  .object({
    authToken: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
    accessToken: z.string().min(1).optional(),
    access_token: z.string().min(1).optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
  })
  .passthrough();

export const FreebuffPollResponseRawSchema = z
  .object({
    status: z.string().min(1).optional(),
    error: z.string().min(1).optional(),
    error_description: z.string().optional(),
    user: FreebuffPollUserRawSchema.optional(),
    authToken: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
    accessToken: z.string().min(1).optional(),
    access_token: z.string().min(1).optional(),
    email: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough()
  .refine(
    (data) =>
      Boolean(
        (typeof data.status === "string" && data.status.length > 0) ||
        (typeof data.error === "string" && data.error.length > 0) ||
        (typeof data.authToken === "string" && data.authToken.length > 0) ||
        (typeof data.token === "string" && data.token.length > 0) ||
        (typeof data.accessToken === "string" && data.accessToken.length > 0) ||
        (typeof data.access_token === "string" && data.access_token.length > 0) ||
        (data.user && (data.user.authToken || data.user.token || data.user.accessToken || data.user.access_token))
      ),
    { message: "Freebuff poll response must contain non-empty status, error, or authToken" }
  );

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
  /\b[A-Fa-f0-9]{32,}\b/g,
];

function sanitizeFreebuffError(message: unknown): string {
  const sanitized = sanitizeErrorMessage(message);
  let result = sanitized;
  for (const pattern of TOKEN_PATTERNS) {
    result = result.replace(pattern, "<token>");
  }
  return result;
}

export interface FreebuffDeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
  extraData?: {
    fingerprintId: string;
    fingerprintHash: string;
    expiresAt: number;
  };
}

export interface FreebuffPollResult {
  ok: boolean;
  data: Record<string, unknown>;
}

export const freebuff = {
  config: FREEBUFF_CONFIG,
  flowType: "device_code" as const,

  requestDeviceCode: async (config: typeof FREEBUFF_CONFIG): Promise<FreebuffDeviceCodeResponse> => {
    const fingerprintId = randomUUID().replace(/-/g, "");
    const response = await fetch(config.authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": config.userAgent,
      },
      body: JSON.stringify({ fingerprintId }),
    });

    if (!response.ok) {
      const err = await response.text();
      const safeErr = sanitizeFreebuffError(err) || `HTTP_${response.status}`;
      throw new Error(`Freebuff device code request failed (${response.status}): ${safeErr}`);
    }

    let data: z.infer<typeof FreebuffDeviceCodeResponseRawSchema> | null = null;
    try {
      const parsedJson = await response.json();
      const validation = FreebuffDeviceCodeResponseRawSchema.safeParse(parsedJson);
      if (validation.success) {
        data = validation.data;
      } else {
        throw new Error("Invalid device code response format");
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "Invalid device code response format") {
        throw e;
      }
      throw new Error(`Freebuff device code response malformed: ${sanitizeFreebuffError(e)}`);
    }

    const loginUrl =
      (typeof data?.loginUrl === "string" && data.loginUrl) ||
      `https://codebuff.com/auth/cli?code=${fingerprintId}`;
    const fingerprintHash =
      (typeof data?.fingerprintHash === "string" && data.fingerprintHash) ||
      fingerprintId;
    const rawExpires = data?.expiresAt;
    let expiresAtNumber: number;
    if (typeof rawExpires === "number" && Number.isFinite(rawExpires)) {
      expiresAtNumber = rawExpires > 10000000000 ? Math.floor(rawExpires / 1000) : rawExpires;
    } else if (typeof rawExpires === "string") {
      const parsed = Date.parse(rawExpires);
      expiresAtNumber = Number.isNaN(parsed)
        ? Math.floor(Date.now() / 1000) + 600
        : Math.floor(parsed / 1000);
    } else {
      expiresAtNumber = Math.floor(Date.now() / 1000) + 600;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresInSec = expiresAtNumber > nowSec ? expiresAtNumber - nowSec : 600;

    const deviceCodePayload = JSON.stringify({
      fingerprintId,
      fingerprintHash,
      expiresAt: expiresAtNumber,
    });

    return {
      device_code: deviceCodePayload,
      user_code: fingerprintHash,
      verification_uri: loginUrl,
      verification_uri_complete: loginUrl,
      expires_in: expiresInSec,
      interval: 3,
      extraData: {
        fingerprintId,
        fingerprintHash,
        expiresAt: expiresAtNumber,
      },
    };
  },

  pollToken: async (
    config: typeof FREEBUFF_CONFIG,
    deviceCode: string,
    _codeVerifier?: string,
    extraData?: Record<string, unknown>
  ): Promise<FreebuffPollResult> => {
    let fingerprintId = "";
    let fingerprintHash = "";
    let expiresAt: number | undefined;

    if (extraData?.fingerprintId && extraData?.fingerprintHash) {
      fingerprintId = String(extraData.fingerprintId);
      fingerprintHash = String(extraData.fingerprintHash);
      if (typeof extraData.expiresAt === "number") {
        expiresAt = extraData.expiresAt;
      }
    } else if (typeof deviceCode === "string" && deviceCode.startsWith("{")) {
      try {
        const parsed = JSON.parse(deviceCode) as {
          fingerprintId?: string;
          fingerprintHash?: string;
          expiresAt?: number;
        };
        fingerprintId = parsed.fingerprintId || "";
        fingerprintHash = parsed.fingerprintHash || "";
        expiresAt = parsed.expiresAt;
      } catch {
        fingerprintId = deviceCode;
        fingerprintHash = deviceCode;
      }
    } else {
      fingerprintId = deviceCode;
      fingerprintHash = deviceCode;
    }

    const pollPayload: Record<string, unknown> = {
      fingerprintId,
      fingerprintHash,
    };
    if (expiresAt !== undefined) {
      pollPayload.expiresAt = expiresAt;
    }

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": config.userAgent,
      },
      body: JSON.stringify(pollPayload),
    });

    if (response.status === 202) {
      return { ok: false, data: { error: "authorization_pending" } };
    }
    if (response.status === 403) {
      return {
        ok: false,
        data: { error: "access_denied", error_description: "Authorization denied by user" },
      };
    }
    if (response.status === 410) {
      return {
        ok: false,
        data: { error: "expired_token", error_description: "Authorization expired" },
      };
    }

    if (!response.ok) {
      const errText = await response.text();
      const safeErr = sanitizeFreebuffError(errText) || `HTTP_${response.status}`;
      return {
        ok: false,
        data: {
          error: "poll_failed",
          error_description: `Poll failed (${response.status}): ${safeErr}`,
        },
      };
    }

    let data: z.infer<typeof FreebuffPollResponseRawSchema> = {};
    try {
      const parsedJson = await response.json();
      const validation = FreebuffPollResponseRawSchema.safeParse(parsedJson);
      if (validation.success) {
        data = validation.data;
      } else {
        return {
          ok: false,
          data: {
            error: "invalid_response",
            error_description: "Malformed response schema from Freebuff poll endpoint",
          },
        };
      }
    } catch {
      return {
        ok: false,
        data: {
          error: "invalid_response",
          error_description: "Malformed JSON response from Freebuff poll endpoint",
        },
      };
    }

    if (data.status === "pending" || data.error === "authorization_pending") {
      return { ok: false, data: { error: "authorization_pending" } };
    }

    const userObj = data.user;

    const authToken =
      userObj?.authToken ||
      userObj?.token ||
      userObj?.accessToken ||
      data.authToken ||
      data.token ||
      data.accessToken ||
      undefined;

    if (authToken) {
      const email = userObj?.email || data.email || "user@codebuff.com";
      const name =
        userObj?.name ||
        userObj?.displayName ||
        data.name ||
        "Freebuff User";
      return {
        ok: true,
        data: {
          access_token: authToken,
          refresh_token: "",
          token_type: "Bearer",
          expires_in: 86400 * 30, // 30 days
          _userEmail: email,
          _userName: name,
        },
      };
    }

    return {
      ok: false,
      data: {
        error: typeof data.error === "string" ? data.error : "authorization_pending",
        error_description:
          typeof data.error_description === "string" ? data.error_description : undefined,
      },
    };
  },

  mapTokens: (tokens: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    _userEmail?: string;
    _userName?: string;
  }) => ({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresIn: tokens.expires_in || 86400 * 30,
    email: tokens._userEmail,
    displayName: tokens._userName,
    name: tokens._userName,
    providerSpecificData: {},
  }),
};

export default freebuff;
