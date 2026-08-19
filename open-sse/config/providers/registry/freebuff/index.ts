import type { RegistryEntry } from "../../shared.ts";

export const freebuffProvider: RegistryEntry = {
  id: "freebuff",
  alias: "fb",
  format: "openai",
  executor: "freebuff",
  baseUrl: "https://codebuff.com/api/v1/chat/completions",
  authType: "oauth",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  headers: {
    "User-Agent": "ai-sdk/openai-compatible/0.1.0/codebuff",
  },
  oauth: {
    authUrl: "https://codebuff.com/api/auth/cli/code",
    tokenUrl: "https://codebuff.com/api/auth/cli/status",
  },
  // Context lengths sourced from FREEBUFF_MODEL_CONTEXT_WINDOWS in the
  // checked-in Freebuff reference (references/freebuff/common/src/constants/
  // freebuff-models.ts). Every number below was observed from a real provider
  // rejection or verified endpoint metadata — never from spec sheets or memory.
  // Models without an authoritative observed value omit contextLength and fall
  // through to the consumer's own default (131,072 in Freebuff's case).
  models: [
    {
      id: "deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
      supportsReasoning: true,
      toolCalling: true,
      // Observed rejection 2026-08-12: "maximum context length is 1048576 tokens"
      contextLength: 1048576,
    },
    {
      id: "deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
      supportsReasoning: true,
      toolCalling: true,
      // Observed rejection: "model maximum context length: 1048575"
      contextLength: 1048576,
    },
    {
      id: "gpt-5.6-luna",
      name: "GPT-5.6 Luna",
      supportsReasoning: true,
      toolCalling: true,
      // OpenRouter endpoints declare 1,050,000; reference enters 1,000,000 as
      // safe-side rounding (verified 2026-08-01).
      contextLength: 1000000,
    },
    {
      id: "minimax-m3",
      name: "MiniMax M3",
      supportsReasoning: true,
      toolCalling: true,
      // Observed rejection: "model maximum context length: 524287"
      contextLength: 524288,
    },
    {
      id: "mimo-v2.5",
      name: "MiMo 2.5",
      supportsReasoning: true,
      toolCalling: true,
      // No authoritative context length observed in the Freebuff reference.
      // Omitted: consumer falls through to FREEBUFF_DEFAULT_CONTEXT_WINDOW
      // (131,072). Do not invent a value.
    },
    {
      id: "glm-5.2",
      name: "GLM 5.2",
      supportsReasoning: true,
      toolCalling: true,
      // No authoritative context length observed in the Freebuff reference.
      // Omitted: consumer falls through to FREEBUFF_DEFAULT_CONTEXT_WINDOW
      // (131,072). Do not invent a value.
    },
  ],
  passthroughModels: true,
};
