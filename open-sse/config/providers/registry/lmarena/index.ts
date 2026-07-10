import type { RegistryEntry } from "../../shared.ts";

export const lmarenaProvider: RegistryEntry = {
  id: "lmarena",
  alias: "lma",
  format: "openai",
  executor: "lmarena",
  baseUrl: "https://arena.ai",
  authType: "apikey",
  authHeader: "cookie",
  passthroughModels: true,
  models: [],
};
