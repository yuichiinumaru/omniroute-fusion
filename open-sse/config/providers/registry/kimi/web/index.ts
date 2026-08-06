import type { RegistryEntry } from "../../../shared.ts";

export const kimi_webProvider: RegistryEntry = {
  id: "kimi-web",
  // Distinct alias: the primary "kimi" provider (dedicated KimiExecutor) keeps
  // the short "kimi" alias; this web/cookie variant is addressed by its own id.
  alias: "kimi-web",
  format: "openai",
  executor: "kimi-web",
  baseUrl: "https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat",
  authType: "bearer",
  authHeader: "authorization",
  models: [
    { id: "k3", name: "Kimi k3 (Reasoning)", toolCalling: true },
    { id: "k2d6", name: "Kimi k2d6 (Reasoning)", toolCalling: true },
  ],
};
