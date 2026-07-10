import type { RegistryEntry } from "../../shared.ts";
import { getQoderDefaultHeaders } from "../../shared.ts";

export const qoderProvider: RegistryEntry = {
  id: "qoder",
  alias: "if",
  format: "openai",
  executor: "qoder",
  baseUrl: "https://api.qoder.com/v1/chat/completions",
  authType: "apikey",
  authHeader: "bearer",
  headers: getQoderDefaultHeaders(),
  oauth: {
    clientIdEnv: "QODER_OAUTH_CLIENT_ID",
    clientSecretEnv: "QODER_OAUTH_CLIENT_SECRET",
    tokenUrl: process.env.QODER_OAUTH_TOKEN_URL || "",
    authUrl: process.env.QODER_OAUTH_AUTHORIZE_URL || "",
  },
  models: [
    // Tier-based routing (Qoder docs: https://docs.qoder.com/user-guide/chat/model-tier-selector)
    { id: "auto", name: "Auto (Smart Routing)" },
    { id: "ultimate", name: "Ultimate" },
    { id: "performance", name: "Performance" },
    { id: "efficient", name: "Efficient" },
    { id: "lite", name: "Lite (Free)" },
    // Specific models
    { id: "qwen3.7-max", name: "Qwen3.7-Max" },
    { id: "qwen3.7-plus", name: "Qwen3.7-Plus" },
    { id: "deepseek-v4-pro", name: "DeepSeek-V4-Pro" },
    { id: "deepseek-v4-flash", name: "DeepSeek-V4-Flash" },
    { id: "glm-5.2", name: "GLM-5.2" },
    { id: "kimi-k2.7-code", name: "Kimi-K2.7-Code" },
    { id: "minimax-m3", name: "MiniMax-M3" },
  ],
};
