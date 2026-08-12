import { test } from "node:test";
import assert from "node:assert/strict";
import { updateThinkingBudgetSchema } from "../../src/shared/validation/schemas/settings.ts";
import { comboRuntimeConfigSchema } from "../../src/shared/validation/schemas/combo.ts";
import {
  setThinkingBudgetConfig,
  getThinkingBudgetConfig,
  resolveThinkingPolicy,
  applyThinkingBudget,
  isTokenBudgetCapable,
  DEFAULT_THINKING_CONFIG,
  ThinkingMode,
} from "../../open-sse/services/thinkingBudget.ts";
import {
  supportsReasoning,
  isAdaptiveThinkingOnly,
} from "../../src/lib/modelCapabilities.ts";

test("Global Policy: schema accepts all valid modes and effort levels including xhigh and max", () => {
  const validInputs = [
    { mode: "passthrough", effortLevel: "medium", customBudget: 10240 },
    { mode: "auto" },
    { mode: "custom", customBudget: 50000, effortLevel: "xhigh" },
    { mode: "adaptive", effortLevel: "max" },
    { effortLevel: "none" },
    { effortLevel: "low" },
    { effortLevel: "high" },
  ];

  for (const input of validInputs) {
    const result = updateThinkingBudgetSchema.safeParse(input);
    assert.equal(result.success, true, `Expected valid input to pass Zod schema: ${JSON.stringify(input)}`);
  }
});

test("Global Policy: default remains passthrough and dynamic updates take effect immediately", () => {
  // Reset to default
  setThinkingBudgetConfig(DEFAULT_THINKING_CONFIG);
  assert.equal(getThinkingBudgetConfig().mode, ThinkingMode.PASSTHROUGH);

  const initialBody = { model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hello" }] };
  const passthroughResult = applyThinkingBudget(initialBody) as Record<string, unknown>;
  assert.equal(passthroughResult.thinking, undefined);

  // Dynamically update global config to custom with xhigh effort
  setThinkingBudgetConfig({ mode: ThinkingMode.CUSTOM, customBudget: 32000, effortLevel: "xhigh" });
  assert.equal(getThinkingBudgetConfig().mode, ThinkingMode.CUSTOM);

  // Next request dynamically uses updated global policy without process restart
  const updatedResult = applyThinkingBudget(initialBody) as Record<string, unknown>;
  assert.notEqual(updatedResult.thinking, undefined);
  const thinkingObj = updatedResult.thinking as Record<string, unknown>;
  assert.equal(thinkingObj.type, "enabled");
  assert.equal(thinkingObj.budget_tokens, 32000);

  // Cleanup: restore default passthrough
  setThinkingBudgetConfig(DEFAULT_THINKING_CONFIG);
});

test("Combo Policy: schema validates reasoningPolicy, reasoningEffort, and thinkingBudgetTokens", () => {
  const comboConfig = {
    reasoningPolicy: "adaptive",
    reasoningEffort: "high",
    thinkingBudgetTokens: 64000,
  };

  const parsed = comboRuntimeConfigSchema.safeParse(comboConfig);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.reasoningPolicy, "adaptive");
    assert.equal(parsed.data.reasoningEffort, "high");
    assert.equal(parsed.data.thinkingBudgetTokens, 64000);
  }
});

test("Precedence Hierarchy: Model > Provider > Combo > Global > Passthrough", () => {
  // 1. Combo overrides Global
  setThinkingBudgetConfig({ mode: ThinkingMode.PASSTHROUGH });

  const contextComboOnly = {
    model: "claude-3-7-sonnet",
    comboConfig: { config: { reasoningPolicy: "custom", reasoningEffort: "low", thinkingBudgetTokens: 2048 } },
  };
  const policyCombo = resolveThinkingPolicy(contextComboOnly);
  assert.equal(policyCombo.level, "combo");
  assert.equal(policyCombo.mode, "custom");
  assert.equal(policyCombo.customBudget, 2048);
  assert.equal(policyCombo.source, "combo-config");

  // 2. Provider overrides Combo & Global
  const contextProviderAndCombo = {
    model: "claude-3-7-sonnet",
    provider: "anthropic",
    credentials: { providerSpecificData: { requestDefaults: { reasoningEffort: "high", thinkingBudgetTokens: 32000 } } },
    comboConfig: { config: { reasoningPolicy: "custom", reasoningEffort: "low", thinkingBudgetTokens: 2048 } },
  };
  const policyProvider = resolveThinkingPolicy(contextProviderAndCombo);
  assert.equal(policyProvider.level, "provider");
  assert.equal(policyProvider.effortLevel, "high");
  assert.equal(policyProvider.customBudget, 32000);
  assert.equal(policyProvider.source, "provider-config");

  // 3. Model Suffix overrides Provider, Combo, and Global
  const contextModelSuffix = {
    model: "claude-3-7-sonnet-xhigh",
    provider: "anthropic",
    credentials: { providerSpecificData: { requestDefaults: { reasoningEffort: "low", thinkingBudgetTokens: 1024 } } },
    comboConfig: { config: { reasoningPolicy: "passthrough" } },
  };
  const policyModel = resolveThinkingPolicy(contextModelSuffix);
  assert.equal(policyModel.level, "model");
  assert.equal(policyModel.effortLevel, "xhigh");
  assert.equal(policyModel.source, "model-suffix");
});

test("Capability Classification: separates effort-only, token-budget, adaptive-only, and unsupported targets", () => {
  // Effort-only target (OpenAI o3-mini)
  assert.equal(supportsReasoning({ provider: "openai", model: "o3-mini" }), true);
  assert.equal(isTokenBudgetCapable("o3-mini", "openai"), false);
  assert.equal(isAdaptiveThinkingOnly("o3-mini"), false);

  // Token-budget target (Claude 3.7 Sonnet)
  assert.equal(supportsReasoning({ provider: "anthropic", model: "claude-3-7-sonnet" }), true);
  assert.equal(isTokenBudgetCapable("claude-3-7-sonnet", "anthropic"), true);

  // Adaptive-only target (Claude Opus 4.7)
  assert.equal(supportsReasoning({ provider: "anthropic", model: "claude-opus-4-7" }), true);
  assert.equal(isAdaptiveThinkingOnly("claude-opus-4-7"), true);
  assert.equal(isTokenBudgetCapable("claude-opus-4-7", "anthropic"), false);

  // Unsupported target (gpt-4o-mini)
  assert.equal(supportsReasoning({ provider: "openai", model: "gpt-4o-mini" }), false);
  assert.equal(isTokenBudgetCapable("gpt-4o-mini", "openai"), false);
});

test("Unsupported Controls: effort-only target ignores token budget parameter during request application", () => {
  const contextEffortOnly = {
    body: { model: "o3-mini", messages: [{ role: "user", content: "hi" }] },
    model: "o3-mini",
    provider: "openai",
    mode: ThinkingMode.CUSTOM,
    customBudget: 64000,
    effortLevel: "high",
  };

  const processed = applyThinkingBudget(contextEffortOnly.body, contextEffortOnly) as Record<string, unknown>;
  // For effort-only OpenAI o3-mini, reasoning_effort is emitted; budget_tokens is NOT invented in thinking.budget_tokens
  assert.equal(processed.reasoning_effort, "high");
  assert.equal(processed.thinking, undefined);
});
