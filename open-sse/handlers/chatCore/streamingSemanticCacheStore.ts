/**
 * chatCore streaming semantic-cache store (Quality Gate v2 / Fase 9 — chatCore god-file
 * decomposition, #3501).
 *
 * Extracted from handleChatCore's onStreamComplete callback: after a 200 streaming response is
 * assembled, store it under its signature so a future temp=0 request can be served from cache.
 * Side-effect only (cache write + debug log), wrapped in fail-open try/catch. Behaviour is
 * byte-identical to the previous inline block — including the `_streamed` strip, the early
 * skip-on-too-large, and the `Number(...) || 0` token accounting. The early return was the last
 * statement of the callback, so returning from this helper is equivalent.
 */
import {
  canServeSemanticCacheStreamHit as defaultCanServeStreamHit,
  extractSemanticCacheSignatureExtras as defaultExtractExtras,
  generateSignature as defaultGenerateSignature,
  setCachedResponse as defaultSetCachedResponse,
  isCacheableForWrite as defaultIsCacheableForWrite,
} from "@/lib/semanticCache";
import { isSmallEnoughForSemanticCache as defaultIsSmallEnough } from "../../utils/estimateSize.ts";

type LoggerLike = { debug?: (...args: unknown[]) => void } | null | undefined;

type CacheBody = {
  messages?: unknown;
  input?: unknown;
  temperature?: unknown;
  top_p?: unknown;
  tools?: unknown;
  tool_choice?: unknown;
  response_format?: unknown;
  seed?: unknown;
  stop?: unknown;
  max_tokens?: unknown;
  max_completion_tokens?: unknown;
};

export interface StreamingSemanticCacheStoreDeps {
  isCacheableForWrite: typeof defaultIsCacheableForWrite;
  isSmallEnoughForSemanticCache: typeof defaultIsSmallEnough;
  generateSignature: typeof defaultGenerateSignature;
  setCachedResponse: typeof defaultSetCachedResponse;
  extractSemanticCacheSignatureExtras?: typeof defaultExtractExtras;
  canServeSemanticCacheStreamHit?: typeof defaultCanServeStreamHit;
}

const DEFAULT_DEPS: StreamingSemanticCacheStoreDeps = {
  isCacheableForWrite: defaultIsCacheableForWrite,
  isSmallEnoughForSemanticCache: defaultIsSmallEnough,
  generateSignature: defaultGenerateSignature,
  setCachedResponse: defaultSetCachedResponse,
  extractSemanticCacheSignatureExtras: defaultExtractExtras,
  canServeSemanticCacheStreamHit: defaultCanServeStreamHit,
};

interface StreamingCacheArgs {
  enabled: boolean;
  streamStatus: number;
  streamResponseBody: Record<string, unknown> | null | undefined;
  body: CacheBody;
  headers: unknown;
  model: string;
  apiKeyId?: string | number;
  streamUsage?: Record<string, unknown> | null;
  log?: LoggerLike;
  clientResponseFormat?: string | null;
}

function streamTokensSaved(streamUsage: Record<string, unknown> | null | undefined): number {
  const u = streamUsage as Record<string, unknown> | null;
  return (Number(u?.prompt_tokens ?? 0) || 0) + (Number(u?.completion_tokens ?? 0) || 0);
}

function writeStreamingCacheEntry(
  args: StreamingCacheArgs,
  deps: StreamingSemanticCacheStoreDeps
): void {
  try {
    const cleanBody = { ...(args.streamResponseBody as Record<string, unknown>) };
    delete cleanBody._streamed;
    if (!deps.isSmallEnoughForSemanticCache(cleanBody)) return;
    const extractExtras =
      deps.extractSemanticCacheSignatureExtras ?? defaultExtractExtras;
    const extras = extractExtras(args.body as Record<string, unknown>, {
      clientResponseFormat: args.clientResponseFormat,
      stream: true,
    });
    const sig = deps.generateSignature(
      args.model,
      args.body.messages ?? args.body.input,
      args.body.temperature,
      args.body.top_p,
      args.apiKeyId ?? undefined,
      extras
    );
    const tokensSaved = streamTokensSaved(args.streamUsage);
    deps.setCachedResponse(sig, args.model, cleanBody, tokensSaved);
    args.log?.debug?.("CACHE", `Stored streaming response for ${args.model} (${tokensSaved} tokens)`);
  } catch {
    // Cache write failed — non-critical
  }
}

export function storeStreamingSemanticCacheResponse(
  args: StreamingCacheArgs,
  deps: StreamingSemanticCacheStoreDeps = DEFAULT_DEPS
): void {
  // Stream bodies are OpenAI-shaped; do not store for Claude/Gemini clients (F-01-W2-002).
  const canServeStream =
    deps.canServeSemanticCacheStreamHit ?? defaultCanServeStreamHit;
  if (
    !args.enabled ||
    args.streamStatus !== 200 ||
    !args.streamResponseBody ||
    !canServeStream(args.clientResponseFormat) ||
    !deps.isCacheableForWrite(args.body, args.headers)
  ) {
    return;
  }
  writeStreamingCacheEntry(args, deps);
}
