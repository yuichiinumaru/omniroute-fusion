/**
 * Embedding Handler
 *
 * Handles POST /v1/embeddings requests.
 * Proxies to upstream embedding providers using OpenAI-compatible format.
 *
 * Request format (OpenAI-compatible):
 * {
 *   "model": "nebius/Qwen/Qwen3-Embedding-8B",
 *   "input": "text" | ["text1", "text2"],
 *   "dimensions": 4096,       // optional
 *   "encoding_format": "float" // optional
 * }
 */

import {
  getEmbeddingProvider,
  getEmbeddingModel,
  getEmbeddingModelDefaultParams,
  parseEmbeddingModel,
  type EmbeddingProvider,
} from "../config/embeddingRegistry.ts";
import {
  applyEmbeddingDimensions,
  DIMENSION_OWNED_FIELDS,
} from "../config/embeddingDimensionDialect.ts";
import {
  applyClientMrlToEmbeddingData,
  EMBED_MRL_CLIENT_TRUNCATE_EVENT,
  parseRequestedEmbeddingDim,
  validateRequestedMrlDim,
} from "../utils/embeddingMrl.ts";
import { saveCallLog } from "@/lib/usageDb";
import { createRequestLogger } from "../utils/requestLogger.ts";
import { isDetailedLoggingEnabled } from "@/lib/db/detailedLogs";
import { getCallLogPipelineCaptureStreamChunks } from "@/lib/logEnv";
import { toJsonErrorPayload } from "@/shared/utils/upstreamError";
import { stripStaleEncodingHeaders } from "../utils/upstreamResponseHeaders.ts";
import { sanitizeErrorMessage } from "../utils/error.ts";

interface ClientRawRequest {
  endpoint: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

/**
 * Handle embedding request.
 * Supports both hardcoded cloud providers and dynamic local provider_nodes.
 * When resolvedProvider is passed, uses it directly (injection pattern from route handler).
 * Falls back to hardcoded registry lookup for backward compatibility.
 */
export async function handleEmbedding({
  body,
  credentials,
  log,
  resolvedProvider = null,
  resolvedModel = null,
  clientRawRequest = null,
  apiKeyId = null,
  apiKeyName = null,
  connectionId = null,
}: {
  body: Record<string, unknown>;
  credentials: { apiKey?: string | null; accessToken?: string | null } | null;
  log?: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  resolvedProvider?: EmbeddingProvider | null;
  resolvedModel?: string | null;
  clientRawRequest?: ClientRawRequest | null;
  apiKeyId?: string | null;
  apiKeyName?: string | null;
  connectionId?: string | null;
}) {
  // Use pre-resolved provider/model from route handler if available (supports dynamic provider_nodes).
  let provider: string | null;
  let model: string | null;
  let providerConfig: EmbeddingProvider | null;

  if (resolvedProvider) {
    provider = resolvedProvider.id;
    model = resolvedModel;
    providerConfig = resolvedProvider;
  } else {
    const parsed = parseEmbeddingModel(body.model as string);
    provider = parsed.provider;
    model = parsed.model;
    providerConfig = provider ? getEmbeddingProvider(provider) : null;
  }

  const startTime = Date.now();

  // Set up request logger for pipeline artifact capture
  const detailedLoggingEnabled = await isDetailedLoggingEnabled();
  const captureStreamChunks = getCallLogPipelineCaptureStreamChunks();
  const reqLogger = await createRequestLogger(
    provider || "openai",
    "openai",
    body.model as string,
    {
      enabled: detailedLoggingEnabled,
      captureStreamChunks,
      connectionId: connectionId || undefined,
      model: model || body.model as string,
      provider: provider || undefined,
    }
  );

  // Log client raw request
  if (clientRawRequest) {
    reqLogger.logClientRawRequest(
      clientRawRequest.endpoint,
      clientRawRequest.body,
      clientRawRequest.headers
    );
  }

  // Summarized request body for call log (avoid storing large embedding input arrays)
  const logRequestBody = {
    model: body.model,
    input_count: Array.isArray(body.input) ? body.input.length : 1,
    dimensions: body.dimensions || undefined,
  };

  if (!provider) {
    return {
      success: false,
      status: 400,
      error: `Invalid embedding model: ${body.model}. Use format: provider/model`,
    };
  }

  if (!providerConfig) {
    return {
      success: false,
      status: 400,
      error: `Unknown embedding provider: ${provider}`,
    };
  }

  // Build upstream request — start with standard fields, then forward extra fields
  // the client sent (e.g. input_type, user, truncate for NVIDIA NIM asymmetric models).
  // Dimension-owned keys (`dimensions`, `outputDimensionality`, …) are applied
  // exclusively by the dialect SSoT (EPIC-21 T21-B / Task 0102) so provider-specific
  // mapping cannot reintroduce ad-hoc dual inject.
  const KNOWN_FIELDS = new Set([
    "model",
    "input",
    "encoding_format",
    ...DIMENSION_OWNED_FIELDS,
  ]);

  let upstreamBody: Record<string, unknown> = {
    model: model,
    input: body.input,
  };

  if (body.encoding_format !== undefined) upstreamBody.encoding_format = body.encoding_format;

  for (const [key, value] of Object.entries(body)) {
    if (!KNOWN_FIELDS.has(key) && value !== undefined) {
      upstreamBody[key] = value;
    }
  }

  // Inject model-level default params (e.g. NVIDIA NIM asymmetric models require
  // `input_type`) only for keys the client did not already supply, so a
  // client-sent value is never overwritten. Symmetric models carry no defaults
  // and are unaffected. See issue #1378.
  // Dimension-owned keys are excluded: the dialect SSoT is the sole last-writer
  // for those fields (applied immediately after).
  const defaultParams = getEmbeddingModelDefaultParams(providerConfig, model);
  if (defaultParams) {
    const dimensionOwned = new Set(DIMENSION_OWNED_FIELDS);
    for (const [key, value] of Object.entries(defaultParams)) {
      if (dimensionOwned.has(key)) continue;
      if (upstreamBody[key] === undefined) {
        upstreamBody[key] = value;
      }
    }
  }

  // EPIC-21 T21-B: dimension dialect SSoT (must run after passthrough + defaults).
  // Client contract = OpenAI `dimensions`. Upstream field selection is data-driven:
  // Gemini OpenAI-shim → dimensions only (strips outputDimensionality); default
  // OpenAI-compat → dimensions; future Gemini native baseUrl → outputDimensionality.
  // Preserves Task 0101 D2 contract (no dual inject on production Gemini baseUrl).
  upstreamBody = applyEmbeddingDimensions({
    providerId: provider,
    baseUrl: providerConfig.baseUrl,
    clientDimensions: body.dimensions,
    upstreamBody,
  });

  // EPIC-21 T21-D: pre-upstream MRL dim validation (fail-closed for known MRL models).
  // Saves quota when the client asks for an unsupported Matryoshka cut.
  const embeddingModelEntry = model ? getEmbeddingModel(provider, model) : null;
  const requestedDim = parseRequestedEmbeddingDim(body.dimensions);
  const dimValidation = validateRequestedMrlDim(embeddingModelEntry, requestedDim);
  if (!dimValidation.ok) {
    return {
      success: false,
      status: 400,
      error: sanitizeErrorMessage(dimValidation.message),
    };
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Skip credential injection for local providers (authType: "none")
  const token =
    providerConfig.authType === "none" ? null : credentials?.apiKey || credentials?.accessToken;
  if (token) {
    if (providerConfig.authHeader === "bearer") {
      headers["Authorization"] = `Bearer ${token}`;
    } else if (providerConfig.authHeader === "x-api-key") {
      headers["x-api-key"] = token;
    }
  } else if (providerConfig.authType !== "none") {
    return {
      success: false,
      status: 401,
      error: `No valid authentication token for provider ${provider}. Check provider credentials.`,
    };
  }

  if (log) {
    log.info(
      "EMBED",
      `${provider}/${model} | input: ${Array.isArray(body.input) ? body.input.length + " items" : "1 item"}`
    );
  }

  try {
    // Quota share enforcement (fail-open: errors allow the request through)
    if (apiKeyId && connectionId && provider) {
      try {
        const { enforceQuotaShare } = await import("@/lib/quota/enforce");
        const quotaDecision = await enforceQuotaShare({
          apiKeyId,
          connectionId,
          provider,
          // Per-(key,model) cap — resolved embedding model id (same scope used in logs/routing).
          model: model || undefined,
        });
        if (quotaDecision.kind === "block") {
          return {
            success: false,
            status: quotaDecision.httpStatus ?? 429,
            error: quotaDecision.reason || "Quota share limit reached",
          };
        }
      } catch {
        // fail-open per B16
      }
    }

    // Log provider request
    reqLogger.logTargetRequest(providerConfig.baseUrl, headers, upstreamBody);

    const response = await fetch(providerConfig.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(upstreamBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (log) {
        log.error("EMBED", `${provider} error ${response.status}: ${errorText.slice(0, 200)}`);
      }

      // Log provider response
      reqLogger.logProviderResponse(response.status, "", response.headers, errorText.slice(0, 500));

      // Build client error response
      const clientErrorBody = toJsonErrorPayload(
        errorText.slice(0, 500),
        "Embedding provider error"
      );
      reqLogger.logConvertedResponse(clientErrorBody);

      const pipelinePayloads = detailedLoggingEnabled ? reqLogger.getPipelinePayloads() : null;

      // Save error call log for Logger panel
      saveCallLog({
        method: "POST",
        path: "/v1/embeddings",
        status: response.status,
        model: `${provider}/${model}`,
        provider,
        duration: Date.now() - startTime,
        error: errorText.slice(0, 500),
        requestBody: logRequestBody,
        pipelinePayloads,
        apiKeyId,
        apiKeyName,
        connectionId,
      }).catch(() => {});

      return {
        success: false,
        status: response.status,
        error: errorText,
        headers: stripStaleEncodingHeaders(response.headers),
      };
    }

    const data = await response.json();

    // Log provider response
    reqLogger.logProviderResponse(response.status, "", response.headers, data);

    // Normalize response to OpenAI format
    const rawDataField = data.data || data;

    // EPIC-21 T21-D: client MRL prefix-truncate + L2 renorm when upstream
    // returns N ≥ d for a Matryoshka model. Never silent-truncate non-MRL.
    // Usage fields are left untouched — only data[].embedding lengths adjust.
    const mrlResult = applyClientMrlToEmbeddingData({
      dataField: rawDataField,
      model: embeddingModelEntry,
      requestedDim,
    });
    if (!mrlResult.ok) {
      return {
        success: false,
        status: mrlResult.status,
        error: sanitizeErrorMessage(mrlResult.message),
      };
    }

    if (mrlResult.truncated && log) {
      log.info(
        EMBED_MRL_CLIENT_TRUNCATE_EVENT,
        `${provider}/${model} | ${mrlResult.fromDim}→${mrlResult.toDim}` +
          ` | count=${mrlResult.count ?? 0}` +
          ` | renorm=${mrlResult.renorm === true}`
      );
    }

    const normalizedResponse = {
      object: "list",
      data: mrlResult.data,
      model: `${provider}/${model}`,
      usage: data.usage || { prompt_tokens: 0, total_tokens: 0 },
    };

    // Log client response
    reqLogger.logConvertedResponse(normalizedResponse);

    const pipelinePayloads = detailedLoggingEnabled ? reqLogger.getPipelinePayloads() : null;

    // Save success call log for Logger panel
    // Embeddings only have input tokens (prompt_tokens + total_tokens), no output/completion tokens
    saveCallLog({
      method: "POST",
      path: "/v1/embeddings",
      status: 200,
      model: `${provider}/${model}`,
      provider,
      duration: Date.now() - startTime,
      tokens: {
        prompt_tokens: data.usage?.prompt_tokens || data.usage?.total_tokens || 0,
        completion_tokens: 0,
      },
      requestBody: logRequestBody,
      responseBody: {
        usage: data.usage || null,
        object: "list",
        data_count: data.data?.length || 0,
      },
      pipelinePayloads,
      apiKeyId,
      apiKeyName,
      connectionId,
    }).catch(() => {});

    // Record quota consumption (fire-and-forget, never blocks)
    if (apiKeyId && connectionId && provider) {
      try {
        const { scheduleRecordConsumption } = await import("@/lib/quota/spendRecorder");
        scheduleRecordConsumption({
          apiKeyId,
          connectionId,
          provider,
          // Per-(key,model) cap accounting — same resolved model id used at enforce time.
          model: model || undefined,
          cost: {
            tokens: data.usage?.prompt_tokens || data.usage?.total_tokens || 0,
            requests: 1,
          },
        });
      } catch {
        // fail-open per B29
      }
    }

    return {
      success: true,
      data: normalizedResponse,
      headers: stripStaleEncodingHeaders(response.headers),
    };
  } catch (err) {
    if (log) {
      log.error("EMBED", `${provider} fetch error: ${err.message}`);
    }

    // Log error
    reqLogger.logError(err, upstreamBody);

    const pipelinePayloads = detailedLoggingEnabled ? reqLogger.getPipelinePayloads() : null;

    // Save exception call log for Logger panel
    saveCallLog({
      method: "POST",
      path: "/v1/embeddings",
      status: 502,
      model: `${provider}/${model}`,
      provider,
      duration: Date.now() - startTime,
      error: err.message,
      requestBody: logRequestBody,
      pipelinePayloads,
      apiKeyId,
      apiKeyName,
      connectionId,
    }).catch(() => {});

    return {
      success: false,
      status: 502,
      error: `Embedding provider error: ${sanitizeErrorMessage(err.message)}`,
    };
  }
}
