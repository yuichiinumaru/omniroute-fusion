import { randomUUID } from "crypto";
import {
  sanitizeErrorMessage,
  sanitizeUpstreamDetails,
} from "@omniroute/open-sse/utils/error";

export type ApiErrorType = "invalid_request" | "not_found" | "conflict" | "server_error";

interface ApiErrorPayload {
  status: number;
  message: string;
  type?: ApiErrorType;
  details?: unknown;
}

/**
 * Build a management/API JSON error response.
 *
 * Hard Rule #12: `message` and `details` are always sanitized before leaving
 * the process so call sites do not need to remember to strip stack traces.
 */
export function createErrorResponse(payload: ApiErrorPayload): Response {
  const requestId = randomUUID();
  const resolvedType =
    payload.type ||
    (payload.status >= 500
      ? "server_error"
      : payload.status === 404
        ? "not_found"
        : payload.status === 409
          ? "conflict"
          : "invalid_request");

  const safeMessage = sanitizeErrorMessage(payload.message) || "Unexpected server error";
  const safeDetails =
    payload.details === undefined ? undefined : sanitizeUpstreamDetails(payload.details);

  return Response.json(
    {
      error: {
        message: safeMessage,
        type: resolvedType,
        details: safeDetails,
      },
      requestId,
    },
    { status: payload.status }
  );
}

/**
 * Convert an unknown thrown value into a sanitized API error response.
 *
 * Prefer this in route catch blocks over raw `error.message` interpolation.
 */
export function createErrorResponseFromUnknown(
  error: unknown,
  fallbackMessage = "Unexpected server error"
): Response {
  // SAFETY: `error` is `unknown` from catch; we only read optional fields and
  // never trust them without sanitize (message/details go through createErrorResponse).
  const anyError = error as {
    message?: string;
    status?: number;
    type?: ApiErrorType;
    details?: unknown;
  };
  const status = Number(anyError?.status) || 500;
  const rawMessage =
    typeof anyError?.message === "string" && anyError.message.trim().length > 0
      ? anyError.message
      : fallbackMessage;
  return createErrorResponse({
    status,
    message: rawMessage,
    type: anyError?.type,
    details: anyError?.details,
  });
}
