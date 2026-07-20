/**
 * Fusion trigger matching — pure helpers for conditional-fusion / gated fusion.
 *
 * Modes (combo.config.triggers.mode):
 *   - always     → fusion always fires
 *   - tool-call  → fusion when the **latest** assistant message carries tool_calls
 *                 whose names match toolPatterns (glob); not sticky across history
 *   - text-match → fusion when the latest user message contains any textPatterns
 *                 (case-insensitive substring, not glob)
 *
 * Extracted from combo.ts so trigger logic is unit-testable without the full
 * routing engine (Task 0014 / Decision D7).
 */

export type FusionTriggerMode = "always" | "tool-call" | "text-match";

export type FusionTriggersConfig = {
  mode?: FusionTriggerMode | string;
  toolPatterns?: string[];
  textPatterns?: string[];
  requireApproval?: boolean;
};

/** Default tool globs when tool-call mode has no patterns configured. */
export const DEFAULT_FUSION_TOOL_PATTERNS: readonly string[] = [
  "write*",
  "edit*",
  "create*",
];

const FORBIDDEN_FALLBACK_STRATEGIES = new Set(["fusion", "conditional-fusion"]);

/**
 * Minimal glob match: supports `*` (any chars) and `?` (single char).
 * No escape sequences, no bracket expressions.
 */
export function matchGlob(input: string, pattern: string): boolean {
  const regexStr =
    "^" +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".") +
    "$";
  try {
    return new RegExp(regexStr).test(input);
  } catch {
    return false;
  }
}

/**
 * Check whether any tool call on the **latest assistant message** matches one
 * of the given glob-style patterns (EPIC-11 / Task 0068).
 *
 * Window: scan messages from the end for the first `role === "assistant"`.
 * Match only that message's `tool_calls`. If the latest assistant has no
 * `tool_calls` (or none match), return false — do **not** walk sticky history
 * for an older tool_calls-bearing assistant. This keeps conditional-fusion
 * cost-controlled in multi-turn agent loops after a write tool turn.
 *
 * Tool name resolution: prefers `function.name`, falls back to bare `name`.
 */
export function hasMatchingToolCall(
  body: Record<string, unknown>,
  patterns: string[]
): boolean {
  if (!patterns.length) return false;
  const messages = Array.isArray(body.messages) ? body.messages : [];

  // Find the latest assistant message only (N=1 window).
  let latestAssistant: Record<string, unknown> | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    // SAFETY: messages elements are untyped chat payloads; narrow before field access.
    const msg = messages[i] as Record<string, unknown> | null | undefined;
    if (!msg || typeof msg !== "object") continue;
    if (msg.role !== "assistant") continue;
    latestAssistant = msg;
    break;
  }
  if (!latestAssistant) return false;

  const toolCalls = latestAssistant.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return false;

  return toolCalls.some((tc: unknown) => {
    if (!tc || typeof tc !== "object") return false;
    // SAFETY: OpenAI tool_call shape after object check — function.name is optional.
    const call = tc as Record<string, unknown>;
    const func = call.function as Record<string, unknown> | undefined;
    const name: string | undefined =
      typeof func?.name === "string"
        ? func.name
        : typeof call.name === "string"
          ? call.name
          : undefined;
    if (!name) return false;
    return patterns.some((pattern) => matchGlob(name, pattern));
  });
}

/**
 * Extract plain text from a message content field (string or multimodal parts).
 * Pure — no translator imports (keeps this module dependency-light for tests).
 */
function messageContentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const part of content) {
    if (typeof part === "string") {
      parts.push(part);
      continue;
    }
    if (!part || typeof part !== "object") continue;
    // SAFETY: object check above; multimodal part fields accessed as optional strings only.
    const rec = part as Record<string, unknown>;
    if (typeof rec.text === "string") parts.push(rec.text);
    else if (typeof rec.content === "string") parts.push(rec.content);
  }
  return parts.join("\n");
}

/**
 * Latest user-role message text (OpenAI chat messages only for trigger gate).
 */
export function extractLatestUserText(body: Record<string, unknown>): string {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    // SAFETY: chat message elements are untyped JSON; narrow with typeof checks.
    const msg = messages[i] as Record<string, unknown> | null | undefined;
    if (!msg || typeof msg !== "object") continue;
    if (msg.role !== "user") continue;
    return messageContentToText(msg.content);
  }
  return "";
}

/**
 * Case-insensitive substring match of any pattern against the latest user message.
 * Not glob — users configure plain keywords like "security" / "review".
 */
export function hasMatchingText(body: Record<string, unknown>, patterns: string[]): boolean {
  if (!patterns.length) return false;
  const text = extractLatestUserText(body);
  if (!text) return false;
  const haystack = text.toLowerCase();
  return patterns.some((pattern) => {
    if (typeof pattern !== "string" || !pattern) return false;
    return haystack.includes(pattern.toLowerCase());
  });
}

/**
 * Decide whether fusion should fire for this request given triggers config.
 *
 * Missing / undefined mode defaults to `"tool-call"` (schema default) so
 * conditional-fusion without an explicit mode keeps historical tool-call behavior.
 * Empty toolPatterns fall back to DEFAULT_FUSION_TOOL_PATTERNS.
 * text-match with empty/missing textPatterns never matches.
 */
export function shouldTriggerFusion(
  body: Record<string, unknown>,
  triggers: FusionTriggersConfig | null | undefined
): boolean {
  // SAFETY: mode is schema-validated at write; runtime defaults for partial configs.
  const mode = (triggers?.mode ?? "tool-call") as string;
  if (mode === "always") return true;

  if (mode === "tool-call") {
    const patterns =
      Array.isArray(triggers?.toolPatterns) && triggers.toolPatterns.length > 0
        ? triggers.toolPatterns
        : [...DEFAULT_FUSION_TOOL_PATTERNS];
    return hasMatchingToolCall(body, patterns);
  }

  if (mode === "text-match") {
    const patterns = Array.isArray(triggers?.textPatterns) ? triggers.textPatterns : [];
    return hasMatchingText(body, patterns);
  }

  // Unknown mode — do not fire fusion (fail closed for the expensive path).
  return false;
}

/**
 * Runtime guard for Decision D8: fallbackStrategy must not recurse into fusion.
 * Schema already rejects these; this is defense-in-depth for raw/stored configs.
 * Returns default `"priority"` when absent, empty, or forbidden.
 */
export function resolveFusionFallbackStrategy(
  fallback: unknown,
  defaultStrategy = "priority"
): string {
  if (typeof fallback !== "string") return defaultStrategy;
  const trimmed = fallback.trim();
  if (!trimmed) return defaultStrategy;
  if (FORBIDDEN_FALLBACK_STRATEGIES.has(trimmed.toLowerCase())) {
    return defaultStrategy;
  }
  return trimmed;
}

/**
 * True when strategy "fusion" should still apply the trigger gate
 * (triggers present and mode is not "always").
 */
export function fusionStrategyHasConditionalTriggers(
  triggers: FusionTriggersConfig | null | undefined
): boolean {
  if (!triggers || typeof triggers !== "object") return false;
  const mode = triggers.mode ?? "tool-call";
  return mode !== "always";
}
