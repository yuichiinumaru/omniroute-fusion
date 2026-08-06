import type { RegistryEntry } from "../../shared.ts";
import {
  GPT_5_6_CODEX_CAPABILITIES,
  GPT_5_5_CODEX_CAPABILITIES,
  GPT_5_4_CODEX_CAPABILITIES,
  getCodexDefaultHeaders,
  resolvePublicCred,
} from "../../shared.ts";

export const codexProvider: RegistryEntry = {
  id: "codex",
  alias: "cx",
  format: "openai-responses",
  executor: "codex",
  baseUrl: "https://chatgpt.com/backend-api/codex/responses",
  authType: "oauth",
  authHeader: "bearer",
  defaultContextLength: 400000,
  headers: getCodexDefaultHeaders(),
  oauth: {
    clientIdEnv: "CODEX_OAUTH_CLIENT_ID",
    clientIdDefault: resolvePublicCred("codex_id"),
    clientSecretEnv: "CODEX_OAUTH_CLIENT_SECRET",
    clientSecretDefault: "",
    tokenUrl: "https://auth.openai.com/oauth/token",
  },
  models: [
    // ── gpt-5.6 family (Task 0126) ────────────────────────────────────────
    // Verified against ../legacy/diegosouzapw-omniroute/open-sse/config/providers/registry/codex/index.ts:28-138.
    // Sol/terra accept ultra+max; luna accepts max only — the executor's
    // MAX_EFFORT_BY_MODEL table gates this and surfaces a wire `effort=max`
    // for ultra clients (Codex-internal coordination signal).
    {
      id: "gpt-5.6-sol",
      name: "GPT 5.6 Sol",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-sol-ultra",
      name: "GPT 5.6 Sol (Ultra)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-sol-max",
      name: "GPT 5.6 Sol (Max)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-sol-xhigh",
      name: "GPT 5.6 Sol (xHigh)",
      ...GPT_5_6_CODEX_CAPABILITIES,
      // Reasoning-heavy tier: more header-wait room than the global default.
      timeoutMs: 1200000,
    },
    {
      id: "gpt-5.6-sol-high",
      name: "GPT 5.6 Sol (High)",
      ...GPT_5_6_CODEX_CAPABILITIES,
      timeoutMs: 1200000,
    },
    {
      id: "gpt-5.6-sol-medium",
      name: "GPT 5.6 Sol (Medium)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-sol-low",
      name: "GPT 5.6 Sol (Low)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-terra",
      name: "GPT 5.6 Terra",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-terra-ultra",
      name: "GPT 5.6 Terra (Ultra)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-terra-max",
      name: "GPT 5.6 Terra (Max)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-terra-xhigh",
      name: "GPT 5.6 Terra (xHigh)",
      ...GPT_5_6_CODEX_CAPABILITIES,
      timeoutMs: 1200000,
    },
    {
      id: "gpt-5.6-terra-high",
      name: "GPT 5.6 Terra (High)",
      ...GPT_5_6_CODEX_CAPABILITIES,
      timeoutMs: 1200000,
    },
    {
      id: "gpt-5.6-terra-medium",
      name: "GPT 5.6 Terra (Medium)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-terra-low",
      name: "GPT 5.6 Terra (Low)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-luna",
      name: "GPT 5.6 Luna",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-luna-max",
      name: "GPT 5.6 Luna (Max)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-luna-xhigh",
      name: "GPT 5.6 Luna (xHigh)",
      ...GPT_5_6_CODEX_CAPABILITIES,
      timeoutMs: 1200000,
    },
    {
      id: "gpt-5.6-luna-high",
      name: "GPT 5.6 Luna (High)",
      ...GPT_5_6_CODEX_CAPABILITIES,
      timeoutMs: 1200000,
    },
    {
      id: "gpt-5.6-luna-medium",
      name: "GPT 5.6 Luna (Medium)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.6-luna-low",
      name: "GPT 5.6 Luna (Low)",
      ...GPT_5_6_CODEX_CAPABILITIES,
    },
    // ── gpt-5.5 family (unchanged) ────────────────────────────────────────
    // Codex OAuth backend caps context at 400K (not the public-API 1.05M).
    // Public refs : openai/codex#19208, #19319, #19464 ; opencode#24171.
    // max_output_tokens is stripped server-side (litellm#21193, codex#4138)
    // so 128K is informational only.
    {
      id: "gpt-5.5",
      name: "GPT 5.5",
      ...GPT_5_5_CODEX_CAPABILITIES,
      contextLength: 400000,
      maxOutputTokens: 128000,
    },
    {
      id: "gpt-5.5-xhigh",
      name: "GPT 5.5 (xHigh)",
      ...GPT_5_5_CODEX_CAPABILITIES,
      contextLength: 400000,
      maxOutputTokens: 128000,
    },
    {
      id: "gpt-5.5-high",
      name: "GPT 5.5 (High)",
      ...GPT_5_5_CODEX_CAPABILITIES,
      contextLength: 400000,
      maxOutputTokens: 128000,
    },
    {
      id: "gpt-5.5-medium",
      name: "GPT 5.5 (Medium)",
      ...GPT_5_5_CODEX_CAPABILITIES,
      contextLength: 400000,
      maxOutputTokens: 128000,
    },
    {
      id: "gpt-5.5-low",
      name: "GPT 5.5 (Low)",
      ...GPT_5_5_CODEX_CAPABILITIES,
      contextLength: 400000,
      maxOutputTokens: 128000,
    },
    // ── gpt-5.4 family (unchanged) ────────────────────────────────────────
    {
      id: "gpt-5.4",
      name: "GPT 5.4",
      ...GPT_5_4_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.4-xhigh",
      name: "GPT 5.4 (xHigh)",
      ...GPT_5_4_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.4-high",
      name: "GPT 5.4 (High)",
      ...GPT_5_4_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.4-medium",
      name: "GPT 5.4 (Medium)",
      ...GPT_5_4_CODEX_CAPABILITIES,
    },
    {
      id: "gpt-5.4-low",
      name: "GPT 5.4 (Low)",
      ...GPT_5_4_CODEX_CAPABILITIES,
    },
    { id: "gpt-5.4-mini", name: "GPT 5.4 Mini", targetFormat: "openai-responses" },
    { id: "gpt-5.3-codex-spark", name: "GPT 5.3 Codex Spark" },
    {
      id: "gpt-5.3-codex",
      name: "GPT 5.3 Codex",
      targetFormat: "openai-responses",
      supportsReasoning: true,
      supportsXHighEffort: true,
    },
  ],
};
