import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import ThinkingBudgetTab from "../../../src/app/(dashboard)/dashboard/settings/components/ThinkingBudgetTab.tsx";
import { updateThinkingBudgetSchema } from "../../../src/shared/validation/schemas/settings.ts";
import { DEFAULT_THINKING_CONFIG } from "../../../open-sse/services/thinkingBudget.ts";

const root = join(import.meta.dirname, "../../..");

function readComponentSource() {
  const filePath = join(
    root,
    "src/app/(dashboard)/dashboard/settings/components/ThinkingBudgetTab.tsx"
  );
  assert.ok(existsSync(filePath), `ThinkingBudgetTab.tsx must exist at ${filePath}`);
  return readFileSync(filePath, "utf8");
}

test("Task 0141: ThinkingBudgetTab component export and module signature", () => {
  assert.equal(
    typeof ThinkingBudgetTab,
    "function",
    "ThinkingBudgetTab must be exported as a React client component function"
  );
  assert.equal(
    ThinkingBudgetTab.name,
    "ThinkingBudgetTab",
    "Exported component function name must be ThinkingBudgetTab"
  );
});

test("Task 0141: ThinkingBudgetTab renders resolution precedence banner and global fallback status badge", () => {
  const src = readComponentSource();

  // Resolution Precedence Banner
  assert.ok(
    src.includes("Resolution Precedence:"),
    "ThinkingBudgetTab must render Resolution Precedence label"
  );
  assert.ok(
    src.includes("Model Suffix &gt; Provider &gt; Combo &gt; Global") ||
      src.includes("Model Suffix > Provider > Combo > Global"),
    "ThinkingBudgetTab must render precedence order: Model Suffix > Provider > Combo > Global"
  );
  assert.ok(
    src.includes(
      "Global policy acts as the baseline fallback. A narrower override at Combo, Provider, or Model level will take precedence."
    ),
    "ThinkingBudgetTab must document baseline precedence fallback behavior"
  );

  // Global Fallback Status Badge
  assert.ok(
    src.includes("Global Fallback Level (Lowest Priority)"),
    "ThinkingBudgetTab title header must render Global Fallback Level (Lowest Priority) badge"
  );
});

test("Task 0141: ThinkingBudgetTab passthrough default and mode selector controls", () => {
  const src = readComponentSource();

  // Passthrough Default
  assert.ok(
    src.includes('mode: "passthrough"') || src.includes("mode: 'passthrough'"),
    "ThinkingBudgetTab default state must be passthrough"
  );
  assert.equal(
    DEFAULT_THINKING_CONFIG.mode,
    "passthrough",
    "Component default mode must match runtime service default (passthrough)"
  );

  // Mode Selector Options
  const requiredModes = ["passthrough", "auto", "custom", "adaptive"];
  for (const mode of requiredModes) {
    assert.ok(
      src.includes(`value: "${mode}"`) || src.includes(`value: '${mode}'`),
      `ThinkingBudgetTab must include mode selector option: ${mode}`
    );
  }

  // Material symbols icons for modes
  const requiredIcons = ["arrow_forward", "auto_awesome", "tune", "trending_up"];
  for (const icon of requiredIcons) {
    assert.ok(
      src.includes(icon),
      `ThinkingBudgetTab must include icon for mode control: ${icon}`
    );
  }
});

test("Task 0141: ThinkingBudgetTab target reasoning capabilities guide", () => {
  const src = readComponentSource();

  // Capabilities Guide Title
  assert.ok(
    src.includes("Target Reasoning Capabilities Guide"),
    "ThinkingBudgetTab must render Target Reasoning Capabilities Guide"
  );

  // 4 Target Categories
  assert.ok(
    src.includes("Effort-tier Models:"),
    "Capabilities guide must document Effort-tier Models (OpenAI o1/o3/o4/gpt-5, DeepSeek, GLM)"
  );
  assert.ok(
    src.includes("Token-budget Models:"),
    "Capabilities guide must document Token-budget Models (Claude 3.7 Sonnet, Gemini 2.0 Thinking)"
  );
  assert.ok(
    src.includes("Adaptive-only Models:"),
    "Capabilities guide must document Adaptive-only Models (Claude Opus 4.7+)"
  );
  assert.ok(
    src.includes("Non-reasoning Models:"),
    "Capabilities guide must document Non-reasoning Models (gpt-4o-mini, standard models)"
  );
});

test("Task 0141: ThinkingBudgetTab effort controls and supported tiers", () => {
  const src = readComponentSource();

  // 6 Effort Levels (including xhigh and max per Task 0141 requirement)
  const requiredEfforts = ["none", "low", "medium", "high", "xhigh", "max"];
  for (const effort of requiredEfforts) {
    assert.ok(
      src.includes(`value: "${effort}"`) || src.includes(`value: '${effort}'`),
      `ThinkingBudgetTab must expose effort level option: ${effort}`
    );
  }

  // Fallbacks for i18n
  assert.ok(src.includes("None (0 tokens)"), "Must include fallback label for none effort");
  assert.ok(src.includes("Low (1K tokens)"), "Must include fallback label for low effort");
  assert.ok(src.includes("Medium (10K tokens)"), "Must include fallback label for medium effort");
  assert.ok(src.includes("High (128K tokens)"), "Must include fallback label for high effort");
  assert.ok(src.includes("X-High (128K tokens)"), "Must include fallback label for xhigh effort");
  assert.ok(src.includes("Max (128K tokens)"), "Must include fallback label for max effort");

  // Custom Token Budget Slider Contract
  assert.ok(src.includes("customBudget"), "Must include customBudget state property");
  assert.ok(src.includes('type="range"'), "Must render range input for custom token budget");
  assert.ok(src.includes('max="131072"'), "Custom budget range slider max must be 131,072 tokens");
});

test("Task 0141: ThinkingBudgetTab API contract and Zod validation integration", () => {
  const src = readComponentSource();

  // API endpoint paths
  assert.ok(
    src.includes('fetch("/api/settings/thinking-budget"') ||
      src.includes("fetch('/api/settings/thinking-budget'"),
    "ThinkingBudgetTab must fetch settings from /api/settings/thinking-budget"
  );
  assert.ok(
    src.includes('method: "PUT"') || src.includes("method: 'PUT'"),
    "ThinkingBudgetTab save handler must submit updates via PUT"
  );

  // Validate that payloads generated by the component pass Zod schema
  const samplePayloads = [
    { mode: "passthrough", customBudget: 10240, effortLevel: "medium" },
    { mode: "auto", customBudget: 10240, effortLevel: "medium" },
    { mode: "custom", customBudget: 64000, effortLevel: "medium" },
    { mode: "adaptive", customBudget: 10240, effortLevel: "xhigh" },
    { mode: "adaptive", customBudget: 10240, effortLevel: "max" },
  ];

  for (const payload of samplePayloads) {
    const parsed = updateThinkingBudgetSchema.safeParse(payload);
    assert.equal(
      parsed.success,
      true,
      `Component payload ${JSON.stringify(payload)} must pass updateThinkingBudgetSchema`
    );
  }
});
