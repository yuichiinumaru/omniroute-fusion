const ANTIGRAVITY_PROVIDER_ID = "antigravity";

export type AntigravityQuotaFamily = "gemini" | "claude" | "other";
export type AntigravityUiQuotaFamily = "claude" | "gemini_3x" | "gemini_legacy" | "other";

function normalizeModelId(model: string | null | undefined): string {
  return String(model || "")
    .trim()
    .toLowerCase();
}

/**
 * Detailed classification for UI family quota bars:
 * 1. Claude: claude-*, cloud-*, anthropic, gemini-claude-*
 * 2. Gemini 3.x Flash/Pro: gemini-3.*, gemini-3-*, gemini-pro-agent
 * 3. Gemini legacy 2.x/Lite: gemini-2.*, gemini-2-*, gemini-1.*, flash-lite, rev19-*
 * 4. Other: gpt-oss-*, unknown/unclassified models
 */
export function getAntigravityUiQuotaFamily(
  model: string | null | undefined
): AntigravityUiQuotaFamily {
  const normalized = normalizeModelId(model)
    .replace(/^antigravity\//, "")
    .replace(/^agy\//, "");
  const slashIndex = normalized.indexOf("/");
  const bare = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;

  if (!bare) return "other";

  if (
    bare.startsWith("claude-") ||
    bare.startsWith("cloud-") ||
    bare.includes("/claude-") ||
    bare.includes("/cloud-") ||
    bare.includes("anthropic") ||
    bare.includes("gemini-claude-")
  ) {
    return "claude";
  }

  if (bare.startsWith("gemini-") || bare.includes("/gemini-") || bare.includes("gemini")) {
    if (
      bare.startsWith("gemini-3") ||
      bare.includes("/gemini-3") ||
      bare.includes("-3.5-") ||
      bare.includes("-3.1-") ||
      bare.includes("-3-pro-") ||
      bare.includes("gemini-pro-agent")
    ) {
      return "gemini_3x";
    }
    return "gemini_legacy";
  }

  return "other";
}

/**
 * Classify Antigravity models by the coarse quota bucket Google Cloud Code/Antigravity
 * appears to enforce for account fallback / lockouts.
 */
export function getAntigravityQuotaFamily(
  model: string | null | undefined
): AntigravityQuotaFamily {
  const uiFamily = getAntigravityUiQuotaFamily(model);
  if (uiFamily === "gemini_3x" || uiFamily === "gemini_legacy") return "gemini";
  return uiFamily;
}

export function getQuotaScopedModelForProvider(
  provider: string | null | undefined,
  model: string | null | undefined
): string | null {
  if (!model) return null;
  if (provider !== ANTIGRAVITY_PROVIDER_ID) return model;
  const family = getAntigravityQuotaFamily(model);
  return family === "other" ? model : `family:${family}`;
}

export function getQuotaScopeLabelForProvider(
  provider: string | null | undefined,
  model: string | null | undefined
): string {
  if (provider !== ANTIGRAVITY_PROVIDER_ID) return "model";
  return getAntigravityQuotaFamily(model) === "other" ? "model" : "family";
}
