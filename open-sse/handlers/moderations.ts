import { CORS_HEADERS } from "../utils/cors.ts";
/**
 * Moderation Handler
 *
 * Handles POST /v1/moderations (OpenAI Moderations API format).
 */

import { getModerationProvider, parseModerationModel } from "../config/moderationRegistry.ts";
import { errorResponse } from "../utils/error.ts";
import { attachOmniRouteMetaHeaders } from "@/domain/omnirouteResponseMeta";
import { generateRequestId } from "@/shared/utils/requestId";

/**
 * Handle moderation request
 *
 * @param {Object} options
 * @param {Object} options.body - JSON body { model, input }
 * @param {Object} options.credentials - Provider credentials { apiKey }
 * @returns {Response}
 */
/** @returns {Promise<unknown>} */
export async function handleModeration({ body, credentials }) {
  const startTime = Date.now();
  if (!body.input) {
    return errorResponse(400, "input is required");
  }

  // Default to latest moderation model
  const model = body.model || "omni-moderation-latest";
  const { provider: providerId, model: modelId } = parseModerationModel(model);
  const providerConfig = providerId ? getModerationProvider(providerId) : null;

  if (!providerConfig) {
    return errorResponse(
      400,
      `No moderation provider found for model "${model}". Available: openai`
    );
  }

  const token = credentials?.apiKey || credentials?.accessToken;
  if (!token) {
    return errorResponse(401, `No credentials for moderation provider: ${providerId}`);
  }

  try {
    const res = await fetch(providerConfig.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: modelId,
        input: body.input,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      // Hard Rule #12: never return raw upstream bodies (may embed stacks/paths).
      let errorMessage: string;
      try {
        const parsed = JSON.parse(errText) as {
          error?: { message?: unknown } | string;
          message?: unknown;
        };
        const raw =
          (typeof parsed?.error === "object" && parsed.error && "message" in parsed.error
            ? parsed.error.message
            : null) ||
          (typeof parsed?.error === "string" ? parsed.error : null) ||
          (typeof parsed?.message === "string" ? parsed.message : null);
        errorMessage = raw ? String(raw) : errText || `Moderation upstream error (${res.status})`;
      } catch {
        errorMessage = errText || `Moderation upstream error (${res.status})`;
      }
      const response = errorResponse(res.status, errorMessage);
      // Preserve CORS on error responses (errorResponse only sets Content-Type).
      const headers = new Headers(response.headers);
      for (const [k, v] of Object.entries(CORS_HEADERS)) {
        headers.set(k, v);
      }
      return new Response(response.body, { status: response.status, headers });
    }

    const data = await res.json();
    const headers = new Headers({ ...CORS_HEADERS, "Content-Type": "application/json" });
    attachOmniRouteMetaHeaders(headers, {
      provider: providerId,
      model: modelId,
      costUsd: 0,
      latencyMs: Date.now() - startTime,
      requestId: generateRequestId(),
    });
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    return errorResponse(500, `Moderation request failed: ${err.message}`);
  }
}
