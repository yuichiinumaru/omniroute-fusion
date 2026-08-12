/**
 * Thinking Budget Control — Phase 2 & 4-Level Precedence Resolver
 *
 * Provides proxy-level control over AI thinking/reasoning budgets.
 * Modes: auto, passthrough, custom, adaptive
 * Precedence: Model > Provider > Combo > Global
 */

import {
  capThinkingBudget,
  getDefaultThinkingBudget,
  getResolvedModelCapabilities,
  isAdaptiveThinkingOnly,
  supportsReasoning,
} from "@/lib/modelCapabilities";
import { splitClaudeEffortSuffix } from "../config/providerModels.ts";

// Thinking budget modes
export const ThinkingMode = {
  AUTO: "auto", // Let provider decide (remove client's budget)
  PASSTHROUGH: "passthrough", // No changes (current behavior)
  CUSTOM: "custom", // Set fixed budget
  ADAPTIVE: "adaptive", // Scale based on request complexity
};
export type ThinkingModeValue = (typeof ThinkingMode)[keyof typeof ThinkingMode];

type JsonRecord = Record<string, unknown>;

export interface ThinkingBudgetConfig {
  mode: ThinkingModeValue;
  customBudget: number;
  effortLevel: string;
}

export type ReasoningPolicyLevel = "model" | "provider" | "combo" | "global" | "passthrough";

export interface ReasoningPolicy {
  level: ReasoningPolicyLevel;
  mode: ThinkingModeValue;
  customBudget?: number;
  effortLevel?: string;
  source: string;
}

export interface ReasoningContext {
  body?: unknown;
  model?: string | null;
  provider?: string | null;
  credentials?: unknown;
  providerConfig?: Record<string, unknown> | null;
  comboConfig?: Record<string, unknown> | null;
  globalConfig?: Partial<ThinkingBudgetConfig> | null;
  mode?: ThinkingModeValue;
  customBudget?: number;
  effortLevel?: string;
  reasoningPolicy?: ReasoningPolicy | null;
}

// Effort → budget token mapping
export const EFFORT_BUDGETS: Record<string, number> = {
  none: 0,
  low: 1024,
  medium: 10240,
  high: 131072, // Handled globally by capThinkingBudget later
  max: 131072, // T11: Claude "max" / "xhigh" — full budget
  xhigh: 131072, // T11: explicit alias used internally
  ultra: 131072, // Codex gpt-5.6 sol/terra top tier alias
};

// thinkingLevel string → budget token mapping
export const THINKING_LEVEL_MAP: Record<string, number> = {
  none: 0,
  low: 4096,
  medium: 8192,
  high: 24576,
  max: 131072, // T11: max = full Claude budget (sub2api: xhigh)
  xhigh: 131072, // T11: explicit xhigh alias
};

// Default config (passthrough = backward compatible)
export const DEFAULT_THINKING_CONFIG: ThinkingBudgetConfig = {
  mode: ThinkingMode.PASSTHROUGH,
  customBudget: 10240,
  effortLevel: "medium",
};

// In-memory config (loaded from DB on startup, or default)
let _config: ThinkingBudgetConfig = { ...DEFAULT_THINKING_CONFIG };

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function getStringField(record: JsonRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

/**
 * Set the thinking budget config (called from settings API or startup)
 */
export function setThinkingBudgetConfig(config: Partial<ThinkingBudgetConfig>) {
  _config = { ...DEFAULT_THINKING_CONFIG, ...config };
}

/**
 * Get current thinking budget config
 */
export function getThinkingBudgetConfig(): ThinkingBudgetConfig {
  return { ..._config };
}

/**
 * Startup hydration
 */
export function hydrateThinkingBudgetConfig(settings: unknown): boolean {
  const tb = toRecord(settings).thinkingBudget;
  if (tb && typeof tb === "object" && !Array.isArray(tb)) {
    setThinkingBudgetConfig(tb as Partial<ThinkingBudgetConfig>);
    return true;
  }
  return false;
}

/**
 * Split trailing reasoning effort suffix off a model string.
 * E.g. "gpt-5.5-xhigh" -> { baseModel: "gpt-5.5", effort: "xhigh" }
 */
export function splitModelReasoningSuffix(model: unknown): {
  baseModel: string;
  effort: string | null;
} {
  const modelId = typeof model === "string" ? model.trim() : "";
  if (!modelId) return { baseModel: "", effort: null };

  const gpt56Match = /^(gpt-5\.6-(?:sol|terra|luna))-(max|ultra)$/i.exec(modelId);
  if (gpt56Match) {
    return { baseModel: gpt56Match[1], effort: gpt56Match[2].toLowerCase() };
  }

  const claudeResult = splitClaudeEffortSuffix(modelId);
  if (claudeResult.effort) {
    return { baseModel: claudeResult.baseModel, effort: claudeResult.effort };
  }

  const suffixes = ["xhigh", "ultra", "high", "medium", "none", "low", "max"];
  const lower = modelId.toLowerCase();
  for (const level of suffixes) {
    if (lower.endsWith(`-${level}`)) {
      return {
        baseModel: modelId.slice(0, -(level.length + 1)),
        effort: level,
      };
    }
  }

  return { baseModel: modelId, effort: null };
}

/**
 * Convert numeric budget to effort level string.
 */
export function budgetToEffortLevel(budget: number): string {
  if (budget <= 0) return "none";
  if (budget <= 1024) return "low";
  if (budget <= 10240) return "medium";
  if (budget < 131072) return "high";
  return "xhigh";
}

/**
 * Convert effort level string to numeric budget.
 */
export function effortLevelToBudget(effort: string): number {
  const normalized = (effort || "").toLowerCase();
  return EFFORT_BUDGETS[normalized] ?? DEFAULT_THINKING_CONFIG.customBudget;
}

/**
 * Check whether a target model & provider explicitly support token-budget reasoning
 * (e.g. Claude extended thinking budget_tokens or Gemini thinkingBudget),
 * as opposed to effort-only controls (reasoning_effort / output_config.effort) or no reasoning.
 */
export function isTokenBudgetCapable(model: string, provider?: string | null): boolean {
  if (!model || !supportsReasoning({ provider: provider || undefined, model })) return false;
  if (isAdaptiveThinkingOnly(model)) return false;

  const lowerModel = model.toLowerCase();
  const lowerProvider = (provider || "").toLowerCase();

  // OpenAI, DeepSeek, GLM models use effort controls, not token budgets
  if (
    lowerProvider === "openai" ||
    lowerProvider === "codex" ||
    lowerProvider === "deepseek" ||
    lowerProvider === "glm" ||
    lowerModel.includes("o1") ||
    lowerModel.includes("o3") ||
    lowerModel.includes("o4") ||
    lowerModel.includes("gpt-5") ||
    lowerModel.includes("deepseek") ||
    lowerModel.includes("glm")
  ) {
    return false;
  }

  const resolved = getResolvedModelCapabilities({ provider: provider || undefined, model });
  if (resolved.supportsThinking === true) return true;

  return (
    lowerModel.includes("claude") ||
    lowerModel.includes("gemini") ||
    lowerModel.endsWith("-thinking") ||
    lowerModel.includes("thinking")
  );
}

function hasGeminiThinkingConfigInBody(bodyRecord: JsonRecord): boolean {
  const gc = toRecord(bodyRecord.generationConfig);
  const tc = toRecord(gc.thinkingConfig);
  const tcSnake = toRecord(gc.thinking_config);
  return (
    tc.thinkingBudget !== undefined ||
    tc.thinkingLevel !== undefined ||
    tcSnake.thinking_budget !== undefined ||
    tcSnake.thinkingLevel !== undefined
  );
}

/**
 * Resolve reasoning policy with explicit four-level precedence:
 *   model > provider > combo > global
 */
export function resolveThinkingPolicy(context: ReasoningContext): ReasoningPolicy {
  const body = toRecord(context.body);
  const modelStr = getStringField(body, "model") || context.model || "";
  const providerStr = context.provider || getStringField(body, "provider") || "";

  if (context.reasoningPolicy) {
    return context.reasoningPolicy;
  }

  // ── Level 1: Model Policy (highest precedence) ──
  const suffixResult = splitModelReasoningSuffix(modelStr);
  if (suffixResult.effort) {
    const effortLevel = suffixResult.effort;
    return {
      level: "model",
      mode: ThinkingMode.CUSTOM,
      effortLevel,
      customBudget: EFFORT_BUDGETS[effortLevel] ?? DEFAULT_THINKING_CONFIG.customBudget,
      source: "model-suffix",
    };
  }

  // Direct context mode override (explicit override)
  if (context.mode !== undefined) {
    return {
      level: "model",
      mode: context.mode,
      customBudget: context.customBudget ?? DEFAULT_THINKING_CONFIG.customBudget,
      effortLevel: context.effortLevel ?? DEFAULT_THINKING_CONFIG.effortLevel,
      source: "explicit-context-override",
    };
  }

  // ── Level 2: Provider Policy ──
  const credsRecord = toRecord(context.credentials);
  const psd = toRecord(credsRecord.providerSpecificData);
  const reqDefaults = toRecord(psd.requestDefaults || context.providerConfig?.requestDefaults);

  const providerReqEffort =
    typeof reqDefaults.reasoningEffort === "string" ? reqDefaults.reasoningEffort : null;
  const providerReqBudget =
    typeof reqDefaults.thinkingBudgetTokens === "number"
      ? reqDefaults.thinkingBudgetTokens
      : null;

  const providerOverrides = toRecord(psd.providerOverrides || context.providerConfig?.providerOverrides);
  const providerOverride = toRecord(providerOverrides[providerStr] || context.providerConfig);

  const pMode =
    typeof providerOverride.reasoningPolicy === "string"
      ? (providerOverride.reasoningPolicy as ThinkingModeValue)
      : null;
  const pEffort =
    providerReqEffort ||
    (typeof providerOverride.reasoningEffort === "string"
      ? providerOverride.reasoningEffort
      : null);
  const pBudget =
    providerReqBudget ??
    (typeof providerOverride.thinkingBudgetTokens === "number"
      ? providerOverride.thinkingBudgetTokens
      : typeof providerOverride.thinkingBudget === "number"
        ? providerOverride.thinkingBudget
        : null);

  if (pMode || pEffort || pBudget !== null) {
    const mode = pMode || ThinkingMode.CUSTOM;
    const effortLevel = pEffort || DEFAULT_THINKING_CONFIG.effortLevel;
    const customBudget =
      pBudget ?? (EFFORT_BUDGETS[effortLevel] ?? DEFAULT_THINKING_CONFIG.customBudget);
    return {
      level: "provider",
      mode,
      effortLevel,
      customBudget,
      source: "provider-config",
    };
  }

  // ── Level 3: Combo Policy ──
  const comboRecord = toRecord(context.comboConfig?.config || context.comboConfig);
  const cMode =
    typeof comboRecord.reasoningPolicy === "string"
      ? (comboRecord.reasoningPolicy as ThinkingModeValue)
      : null;
  const cEffort =
    typeof comboRecord.reasoningEffort === "string" ? comboRecord.reasoningEffort : null;
  const cBudget =
    typeof comboRecord.thinkingBudgetTokens === "number"
      ? comboRecord.thinkingBudgetTokens
      : typeof comboRecord.thinkingBudget === "number"
        ? comboRecord.thinkingBudget
        : null;

  if (cMode || cEffort || cBudget !== null) {
    const mode = cMode || ThinkingMode.CUSTOM;
    const effortLevel = cEffort || DEFAULT_THINKING_CONFIG.effortLevel;
    const customBudget =
      cBudget ?? (EFFORT_BUDGETS[effortLevel] ?? DEFAULT_THINKING_CONFIG.customBudget);
    return {
      level: "combo",
      mode,
      effortLevel,
      customBudget,
      source: "combo-config",
    };
  }

  // ── Level 4: Global Policy ──
  const globalCfg = context.globalConfig || _config;
  if (globalCfg.mode && globalCfg.mode !== ThinkingMode.PASSTHROUGH) {
    return {
      level: "global",
      mode: globalCfg.mode,
      customBudget: globalCfg.customBudget ?? DEFAULT_THINKING_CONFIG.customBudget,
      effortLevel: globalCfg.effortLevel ?? DEFAULT_THINKING_CONFIG.effortLevel,
      source: "global-config",
    };
  }

  return {
    level: "passthrough",
    mode: ThinkingMode.PASSTHROUGH,
    source: "passthrough-default",
  };
}

/**
 * Normalize thinkingLevel string fields into numeric budget.
 */
export function normalizeThinkingLevel(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const result: JsonRecord = { ...(body as JsonRecord) };

  const levelStr = result.thinkingLevel || result.thinking_level;
  if (typeof levelStr === "string" && THINKING_LEVEL_MAP[levelStr.toLowerCase()] !== undefined) {
    const rawBudget = THINKING_LEVEL_MAP[levelStr.toLowerCase()];
    const budget = capThinkingBudget(getStringField(result, "model"), rawBudget);
    result.thinking = {
      type: budget > 0 ? "enabled" : "disabled",
      budget_tokens: budget,
    };
    delete result.thinkingLevel;
    delete result.thinking_level;
  }

  const generationConfig = toRecord(result.generationConfig);
  const thinkingConfig = toRecord(generationConfig.thinkingConfig);
  const thinkingConfigSnake = toRecord(generationConfig.thinking_config);
  const geminiLevel = thinkingConfig.thinkingLevel || thinkingConfigSnake.thinkingLevel;
  if (
    typeof geminiLevel === "string" &&
    THINKING_LEVEL_MAP[geminiLevel.toLowerCase()] !== undefined
  ) {
    const rawBudget = THINKING_LEVEL_MAP[geminiLevel.toLowerCase()];
    const budget = capThinkingBudget(getStringField(result, "model"), rawBudget);
    result.generationConfig = {
      ...generationConfig,
      thinkingConfig: { ...thinkingConfig, thinkingBudget: budget },
    };
    const nextGenerationConfig = result.generationConfig as JsonRecord;
    const nextThinkingConfig = toRecord(nextGenerationConfig.thinkingConfig);
    if (Object.keys(nextThinkingConfig).length > 0) {
      delete nextThinkingConfig.thinkingLevel;
      nextGenerationConfig.thinkingConfig = nextThinkingConfig;
    }
    if ("thinking_config" in nextGenerationConfig) {
      delete nextThinkingConfig.thinking_config;
    }
  }

  return result;
}

/**
 * Ensure models with -thinking suffix have thinking config injected.
 */
export function ensureThinkingConfig(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const bodyRecord = body as JsonRecord;
  const model = getStringField(bodyRecord, "model");

  if (!model.endsWith("-thinking")) return body;
  if (bodyRecord.thinking) return body;

  const result: JsonRecord = { ...bodyRecord };
  result.thinking = {
    type: "enabled",
    budget_tokens: getDefaultThinkingBudget(model) || EFFORT_BUDGETS.medium,
  };
  return result;
}

/**
 * Apply thinking budget control to a request body.
 */
export function applyThinkingBudget(
  body: unknown,
  configOrContext: Partial<ThinkingBudgetConfig> | ReasoningContext | null = null
) {
  if (!body || typeof body !== "object") return body;

  const bodyRecord = body as JsonRecord;
  const rawModelStr = typeof bodyRecord.model === "string" ? bodyRecord.model : "";
  const modelStr = splitModelReasoningSuffix(rawModelStr).baseModel || rawModelStr;

  let context: ReasoningContext;
  if (
    configOrContext &&
    ("mode" in configOrContext ||
      "customBudget" in configOrContext ||
      "effortLevel" in configOrContext) &&
    !("globalConfig" in configOrContext) &&
    !("comboConfig" in configOrContext) &&
    !("providerConfig" in configOrContext) &&
    !("credentials" in configOrContext)
  ) {
    context = {
      body,
      model: rawModelStr,
      mode: configOrContext.mode,
      customBudget: configOrContext.customBudget,
      effortLevel: configOrContext.effortLevel,
    };
  } else {
    context = {
      body,
      model: rawModelStr,
      ...(configOrContext as ReasoningContext),
    };
  }

  const policy = resolveThinkingPolicy(context);
  const providerStr = context.provider || getStringField(bodyRecord, "provider") || "";

  // SAFETY: prefer the model string when no provider is known so parseModel
  // can extract the provider from a "provider/model" prefix (e.g. "groq/llama-4-scout").
  // Passing { provider: undefined, model } would skip parseModel and misclassify.
  const reasoningInput: { provider?: string; model: string } | string = providerStr
    ? { provider: providerStr, model: modelStr }
    : modelStr;

  if (modelStr && !supportsReasoning(reasoningInput)) {
    return stripThinkingConfig(body);
  }

  let processed = normalizeThinkingLevel(body);
  processed = ensureThinkingConfig(processed);

  if (policy.mode === ThinkingMode.PASSTHROUGH) {
    return processed;
  }

  switch (policy.mode) {
    case ThinkingMode.AUTO:
      return stripThinkingConfig(processed);

    case ThinkingMode.PASSTHROUGH:
      return processed;

    case ThinkingMode.CUSTOM:
      return applyCustomPolicy(processed, policy, modelStr, providerStr);

    case ThinkingMode.ADAPTIVE:
      return applyAdaptivePolicy(processed, policy, context, modelStr, providerStr);

    default:
      return processed;
  }
}

/**
 * AUTO mode: strip all thinking configuration, let provider decide
 */
function stripThinkingConfig(body: unknown) {
  const result: JsonRecord = { ...toRecord(body) };

  delete result.thinking;
  delete result.reasoning_effort;
  delete result.reasoning;

  if (result.output_config && typeof result.output_config === "object") {
    const outputConfig = { ...toRecord(result.output_config) };
    delete outputConfig.effort;
    if (Object.keys(outputConfig).length === 0) {
      delete result.output_config;
    } else {
      result.output_config = outputConfig;
    }
  }

  if (result.generationConfig) {
    const generationConfig = { ...toRecord(result.generationConfig) };
    delete generationConfig.thinking_config;
    delete generationConfig.thinkingConfig;
    result.generationConfig = generationConfig;
  }

  return result;
}

/**
 * Apply CUSTOM policy
 */
function applyCustomPolicy(
  body: unknown,
  policy: ReasoningPolicy,
  modelStr: string,
  providerStr: string
) {
  const result: JsonRecord = { ...toRecord(body) };
  const rawBudget = policy.customBudget ?? (policy.effortLevel ? EFFORT_BUDGETS[policy.effortLevel] : DEFAULT_THINKING_CONFIG.customBudget);
  const effortLevel = policy.effortLevel && policy.effortLevel !== DEFAULT_THINKING_CONFIG.effortLevel ? policy.effortLevel : budgetToEffortLevel(rawBudget);

  const isClaude =
    modelStr.includes("claude") ||
    providerStr === "claude" ||
    providerStr.startsWith("anthropic-compatible-");
  const isGemini =
    modelStr.includes("gemini") || providerStr === "gemini" || result.generationConfig !== undefined;
  const isOpenAIOrSimilar =
    modelStr.includes("o1") ||
    modelStr.includes("o3") ||
    modelStr.includes("o4") ||
    modelStr.includes("gpt-5") ||
    modelStr.includes("deepseek") ||
    modelStr.includes("glm") ||
    providerStr === "openai" ||
    providerStr === "codex" ||
    providerStr === "deepseek" ||
    providerStr === "glm";

  if (isAdaptiveThinkingOnly(modelStr)) {
    result.thinking = {
      type: effortLevel === "none" ? "disabled" : "adaptive",
    };
    result.output_config = { effort: effortLevel };
    delete (result.thinking as JsonRecord).budget_tokens;
  } else if (result.thinking || isClaude || (hasThinkingCapableModel(result) && !isOpenAIOrSimilar)) {
    const cappedBudget = capThinkingBudget(modelStr, rawBudget);
    result.thinking = {
      type: cappedBudget > 0 ? "enabled" : "disabled",
      budget_tokens: cappedBudget,
    };
  }

  if (
    result.reasoning_effort !== undefined ||
    result.reasoning !== undefined ||
    (isOpenAIOrSimilar && !isClaude)
  ) {
    if (effortLevel === "none") {
      delete result.reasoning_effort;
      delete result.reasoning;
    } else {
      result.reasoning_effort = effortLevel;
    }

    if (isOpenAIOrSimilar && !toRecord(body).thinking) {
      delete result.thinking;
    }
  }

  const generationConfig = toRecord(result.generationConfig);
  const hasSnake = generationConfig.thinking_config !== undefined;
  const hasCamel = generationConfig.thinkingConfig !== undefined;
  if (hasSnake || hasCamel || isGemini) {
    const cappedBudget = capThinkingBudget(modelStr, rawBudget);
    if (hasSnake || (!hasCamel && isGemini)) {
      const tc = toRecord(generationConfig.thinking_config);
      result.generationConfig = {
        ...generationConfig,
        thinking_config: { ...tc, thinking_budget: cappedBudget },
      };
    }
    if (hasCamel || (!hasSnake && isGemini)) {
      const gen = toRecord(result.generationConfig);
      const tc = toRecord(gen.thinkingConfig);
      result.generationConfig = {
        ...gen,
        thinkingConfig: { ...tc, thinkingBudget: cappedBudget },
      };
    }
  }

  return result;
}

/**
 * Apply ADAPTIVE policy
 */
function applyAdaptivePolicy(
  body: unknown,
  policy: ReasoningPolicy,
  context: ReasoningContext,
  modelStr: string,
  providerStr: string
) {
  const bodyRecord = toRecord(body);
  const messages = Array.isArray(bodyRecord.messages)
    ? bodyRecord.messages
    : Array.isArray(bodyRecord.input)
      ? bodyRecord.input
      : [];
  const messageCount = messages.length;
  const tools = Array.isArray(bodyRecord.tools) ? bodyRecord.tools : [];
  const toolCount = tools.length;

  let lastMsgLength = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgRecord = toRecord(msg);
    if (msgRecord.role === "user") {
      lastMsgLength =
        typeof msgRecord.content === "string"
          ? msgRecord.content.length
          : JSON.stringify(msgRecord.content || "").length;
      break;
    }
  }

  let multiplier = 1.0;
  if (messageCount > 10) multiplier += 0.5;
  if (toolCount > 3) multiplier += 0.3;
  if (lastMsgLength > 2000) multiplier += 0.3;

  const baseBudget =
    EFFORT_BUDGETS[typeof policy.effortLevel === "string" ? policy.effortLevel : "medium"] ||
    getDefaultThinkingBudget(modelStr) ||
    EFFORT_BUDGETS.medium;
  const budget = Math.ceil(baseBudget * multiplier);

  const adaptivePolicy: ReasoningPolicy = {
    ...policy,
    customBudget: budget,
    effortLevel: multiplier > 1.5 ? "high" : policy.effortLevel || "medium",
  };

  return applyCustomPolicy(body, adaptivePolicy, modelStr, providerStr);
}

/**
 * Check if model name suggests thinking capability
 */
export function hasThinkingCapableModel(body: unknown) {
  const model = getStringField(toRecord(body), "model");
  const resolved = getResolvedModelCapabilities(model);
  if (resolved.supportsThinking === true) return true;
  if (resolved.supportsThinking === false) return false;
  return (
    model.includes("claude") ||
    model.includes("o1") ||
    model.includes("o3") ||
    model.includes("o4") ||
    model.includes("gemini") ||
    model.endsWith("-thinking") ||
    model.includes("thinking")
  );
}
