import type { RegistryEntry } from "../../shared.ts";
import { buildGitLabOAuthEndpoints, GITLAB_DUO_DEFAULT_BASE_URL } from "../../shared.ts";

export const gitlabProvider: RegistryEntry = {
  id: "gitlab",
  alias: "gitlab",
  format: "openai",
  executor: "gitlab",
  baseUrl: buildGitLabOAuthEndpoints(GITLAB_DUO_DEFAULT_BASE_URL).publicCompletionsUrl,
  authType: "apikey",
  authHeader: "bearer",
  defaultContextLength: 4096,
  description: "Code completion only, max ~20 tokens",
  models: [
    { id: "gitlab-duo-code-suggestions", name: "GitLab Duo Code Suggestions (Code Completion)" },
    { id: "code-gecko", name: "Code Gecko (GitLab Duo)" },
  ],
};
