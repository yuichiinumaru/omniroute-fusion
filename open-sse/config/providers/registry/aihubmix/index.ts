import type { RegistryEntry } from "../../shared.ts";

export const aihubmixProvider: RegistryEntry = {
  id: "aihubmix",
  alias: "aihubmix",
  format: "openai",
  executor: "default",
  baseUrl: "https://aihubmix.com/v1",
  modelsUrl: "https://aihubmix.com/v1/models",
  authType: "apikey",
  authHeader: "bearer",
  defaultContextLength: 128000,
  models: [
    {
      id: "coding-kimi-k3-free",
      name: "Coding Kimi K3 (Free)",
      toolCalling: true,
      supportsReasoning: true,
      contextLength: 128000,
      maxOutputTokens: 8192,
    },
    {
      id: "coding-glm-5.2-free",
      name: "Coding GLM 5.2 (Free)",
      toolCalling: true,
      supportsReasoning: true,
      contextLength: 128000,
      maxOutputTokens: 8192,
    },
    {
      id: "gemini-3.7-flash-free",
      name: "Gemini 3.7 Flash (Free)",
      toolCalling: true,
      supportsReasoning: true,
      supportsVision: true,
      contextLength: 1048576,
      maxOutputTokens: 65536,
    },
    {
      id: "gemini-3.5-flash-lite-free",
      name: "Gemini 3.5 Flash Lite (Free)",
      toolCalling: true,
      supportsVision: true,
      contextLength: 1048576,
      maxOutputTokens: 65536,
    },
  ],
};
