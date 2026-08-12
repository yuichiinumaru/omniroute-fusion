import test from "node:test";
import assert from "node:assert/strict";

const {
  applyThinkingBudget,
  resolveThinkingPolicy,
  setThinkingBudgetConfig,
  getThinkingBudgetConfig,
  ThinkingMode,
  DEFAULT_THINKING_CONFIG,
  splitModelReasoningSuffix,
  isTokenBudgetCapable,
} = await import("../../open-sse/services/thinkingBudget.ts");

test.beforeEach(() => {
  setThinkingBudgetConfig(DEFAULT_THINKING_CONFIG);
});

test.afterEach(() => {
  setThinkingBudgetConfig(DEFAULT_THINKING_CONFIG);
});

// ─── Precedence Hierarchy ───────────────────────────────────────────────────

test("Precedence: Model policy (suffix) wins over provider, combo, and global policy", () => {
  setThinkingBudgetConfig({ mode: ThinkingMode.CUSTOM, customBudget: 131072, effortLevel: "high" });

  const context = {
    body: {
      model: "gpt-5.5-low",
      messages: [{ role: "user", content: "hello" }],
    },
    provider: "openai",
    providerConfig: {
      requestDefaults: { reasoningEffort: "medium" },
    },
    comboConfig: {
      config: { reasoningEffort: "xhigh", reasoningPolicy: "custom" },
    },
  };

  const policy = resolveThinkingPolicy(context);
  assert.equal(policy.level, "model");
  assert.equal(policy.effortLevel, "low");

  const result = applyThinkingBudget(context.body, context);
  assert.equal(result.reasoning_effort, "low");
  assert.equal(result.thinking, undefined); // Effort-only: no invented budget
});

test("Precedence: Provider policy wins over combo and global policy", () => {
  setThinkingBudgetConfig({ mode: ThinkingMode.CUSTOM, customBudget: 131072, effortLevel: "high" });

  const context = {
    body: {
      model: "o3-mini",
      messages: [{ role: "user", content: "hello" }],
    },
    provider: "openai",
    providerConfig: {
      requestDefaults: { reasoningEffort: "low" },
    },
    comboConfig: {
      config: { reasoningEffort: "xhigh", reasoningPolicy: "custom" },
    },
  };

  const policy = resolveThinkingPolicy(context);
  assert.equal(policy.level, "provider");
  assert.equal(policy.effortLevel, "low");

  const result = applyThinkingBudget(context.body, context);
  assert.equal(result.reasoning_effort, "low");
  assert.equal(result.thinking, undefined);
});

test("Precedence: Combo policy wins over global policy", () => {
  setThinkingBudgetConfig({ mode: ThinkingMode.CUSTOM, customBudget: 131072, effortLevel: "high" });

  const context = {
    body: {
      model: "o3-mini",
      messages: [{ role: "user", content: "hello" }],
    },
    provider: "openai",
    comboConfig: {
      config: { reasoningEffort: "medium", reasoningPolicy: "custom" },
    },
  };

  const policy = resolveThinkingPolicy(context);
  assert.equal(policy.level, "combo");
  assert.equal(policy.effortLevel, "medium");

  const result = applyThinkingBudget(context.body, context);
  assert.equal(result.reasoning_effort, "medium");
  assert.equal(result.thinking, undefined);
});

test("Precedence: Passthrough when no policy is specified anywhere", () => {
  setThinkingBudgetConfig({ mode: ThinkingMode.PASSTHROUGH });

  const context = {
    body: {
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: "hello" }],
    },
    provider: "claude",
  };

  const policy = resolveThinkingPolicy(context);
  assert.equal(policy.level, "passthrough");
  assert.equal(policy.mode, ThinkingMode.PASSTHROUGH);

  const result = applyThinkingBudget(context.body, context);
  assert.deepEqual(result, context.body);
});

// ─── Capability Gates: Effort-Only vs Token-Budget ──────────────────────────

test("Capability Gate: Effort-only models (OpenAI o3-mini) never receive invented token budgets", () => {
  setThinkingBudgetConfig({ mode: ThinkingMode.CUSTOM, customBudget: 8192 });

  const body = {
    model: "o3-mini",
    messages: [{ role: "user", content: "hello" }],
  };

  const result = applyThinkingBudget(body, { provider: "openai" });
  assert.equal(result.reasoning_effort, "medium");
  assert.equal(result.thinking, undefined);
});

test("Capability Gate: Effort-only models (Claude Opus 4.7) receive output_config.effort, not budget_tokens", () => {
  setThinkingBudgetConfig({ mode: ThinkingMode.CUSTOM, customBudget: 10240 });

  const body = {
    model: "claude-opus-4-7",
    messages: [{ role: "user", content: "hello" }],
  };

  const result = applyThinkingBudget(body, { provider: "claude" });
  assert.equal(result.thinking.type, "adaptive");
  assert.equal(result.output_config.effort, "medium");
  assert.equal(result.thinking.budget_tokens, undefined);
});

test("Capability Gate: Token-budget models (Claude Sonnet 4.6) receive bounded budget_tokens", () => {
  setThinkingBudgetConfig({ mode: ThinkingMode.CUSTOM, customBudget: 10240 });

  const body = {
    model: "claude-sonnet-4-6",
    messages: [{ role: "user", content: "hello" }],
  };

  const result = applyThinkingBudget(body, { provider: "claude" });
  assert.equal(result.thinking.type, "enabled");
  assert.equal(result.thinking.budget_tokens, 10240);
});

test("Capability Gate: Token budgets are bounded by model capabilities", () => {
  // gemini-3.1-pro has thinkingBudgetCap of 32768
  setThinkingBudgetConfig({ mode: ThinkingMode.CUSTOM, customBudget: 100000 });

  const body = {
    model: "gemini-3.1-pro",
    messages: [{ role: "user", content: "hello" }],
  };

  const result = applyThinkingBudget(body, { provider: "gemini" });
  assert.equal(result.thinking.budget_tokens, 32768);
  assert.equal(result.generationConfig.thinkingConfig.thinkingBudget, 32768);
});

// ─── Adaptive Non-Forcing Behavior ──────────────────────────────────────────

test("Adaptive Mode: non-reasoning target (gpt-4o-mini) has reasoning params stripped, not forced high", () => {
  setThinkingBudgetConfig({ mode: ThinkingMode.ADAPTIVE, effortLevel: "high" });

  const body = {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "hello" }],
    reasoning_effort: "low",
  };

  const result = applyThinkingBudget(body, { provider: "openai" });
  assert.equal(result.reasoning_effort, undefined);
  assert.equal(result.thinking, undefined);
});

test("Adaptive Mode: effort-only model gets appropriate effort level without token budget", () => {
  setThinkingBudgetConfig({ mode: ThinkingMode.ADAPTIVE, effortLevel: "medium" });

  const body = {
    model: "gpt-5.4",
    messages: [{ role: "user", content: "hello" }],
  };

  const result = applyThinkingBudget(body, { provider: "openai" });
  assert.equal(result.reasoning_effort, "medium");
  assert.equal(result.thinking, undefined);
});

// ─── Model Suffix & Normalization Invariants ────────────────────────────────

test("Suffix Splitting: supports Codex and Claude reasoning effort suffixes", () => {
  assert.deepEqual(splitModelReasoningSuffix("gpt-5.5-xhigh"), { baseModel: "gpt-5.5", effort: "xhigh" });
  assert.deepEqual(splitModelReasoningSuffix("gpt-5.6-sol-max"), { baseModel: "gpt-5.6-sol", effort: "max" });
  assert.deepEqual(splitModelReasoningSuffix("claude-opus-4-8-high"), { baseModel: "claude-opus-4-8", effort: "high" });
  assert.deepEqual(splitModelReasoningSuffix("o3-mini-low"), { baseModel: "o3-mini", effort: "low" });
  assert.deepEqual(splitModelReasoningSuffix("claude-sonnet-4-6"), { baseModel: "claude-sonnet-4-6", effort: null });
});

test("Token Budget Capable classification", () => {
  assert.equal(isTokenBudgetCapable("claude-sonnet-4-6", "claude"), true);
  assert.equal(isTokenBudgetCapable("gemini-3.1-pro", "gemini"), true);
  assert.equal(isTokenBudgetCapable("o3-mini", "openai"), false);
  assert.equal(isTokenBudgetCapable("gpt-5.5", "openai"), false);
  assert.equal(isTokenBudgetCapable("deepseek-v4", "deepseek"), false);
  assert.equal(isTokenBudgetCapable("claude-opus-4-7", "claude"), false);
  assert.equal(isTokenBudgetCapable("gpt-4o-mini", "openai"), false);
});
