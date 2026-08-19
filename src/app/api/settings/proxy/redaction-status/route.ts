import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { createErrorResponseFromUnknown } from "@/lib/api/errorResponse";
import { isEffectivePiiRedactionEnabled } from "@/lib/proxyRedactionGate";
import { resolveFeatureFlag } from "@/shared/utils/featureFlags";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const isRedactionOn = isEffectivePiiRedactionEnabled();
    const effectiveValue = resolveFeatureFlag("PII_REDACTION_ENABLED");

    return Response.json({
      piiRedactionEnabled: isRedactionOn,
      effectiveValue,
      requiresBypass: !isRedactionOn,
    });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to check PII redaction status");
  }
}
