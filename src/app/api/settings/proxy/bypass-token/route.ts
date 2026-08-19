import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { createErrorResponse, createErrorResponseFromUnknown } from "@/lib/api/errorResponse";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { createProxyBypassTokenSchema } from "@/shared/validation/schemas";
import {
  createProxyBypassToken,
  PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
} from "@/lib/proxyRedactionGate";

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return createErrorResponse({
      status: 400,
      message: "Invalid JSON body",
      type: "invalid_request",
    });
  }

  try {
    const validation = validateBody(createProxyBypassTokenSchema, rawBody);
    if (isValidationFailure(validation)) {
      return createErrorResponse({
        status: 400,
        message: validation.error.message,
        details: validation.error.details,
        type: "invalid_request",
      });
    }

    const { confirmationPhrase, confirmed, reason } = validation.data;

    if (!confirmed || confirmationPhrase.trim() !== PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE) {
      return createErrorResponse({
        status: 400,
        message: `Confirmation phrase must match exact text: "${PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE}" and confirmed must be true`,
        type: "invalid_request",
      });
    }

    const result = createProxyBypassToken({
      confirmationPhrase,
      confirmed,
      reason,
      actor: "management-api",
    });

    return Response.json({
      success: true,
      bypassToken: result.token,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to create proxy bypass token");
  }
}
