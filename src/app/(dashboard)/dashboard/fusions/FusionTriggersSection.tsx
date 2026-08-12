"use client";

import Card from "@/shared/components/Card";
import {
  FALLBACK_STRATEGY_OPTIONS,
  type FusionEditorForm,
  type RuleKind,
  type RuleOperator,
  type TriggerMode,
} from "./fusionEditorTypes";
import PatternTagInput from "./PatternTagInput";

type Tx = (key: string, fallback: string) => string;

/**
 * Triggers + fallback strategy card (Decision D7 / D8).
 * Extracted from FusionEditorClient (path-to-100 size split).
 */
export default function FusionTriggersSection({
  form,
  updateForm,
  tx,
}: {
  form: FusionEditorForm;
  updateForm: (patch: Partial<FusionEditorForm>) => void;
  tx: Tx;
}) {
  return (
    <Card padding="md" className="space-y-3" data-testid="fusion-triggers">
      <div>
        <h2 className="text-sm font-semibold text-text-main">
          {tx("fusionTriggers", "Triggers")}
        </h2>
        <p className="text-[11px] text-text-muted mt-0.5">
          {tx(
            "fusionTriggersHelp",
            "When to run fusion. Non-always modes save as conditional-fusion with a non-fusion fallback."
          )}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-main">
          {tx("fusionTriggerMode", "Mode")}
        </label>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label={tx("fusionTriggerMode", "Mode")}
        >
          {(
            [
              { value: "always", label: tx("fusionTriggerAlways", "Always") },
              { value: "tool-call", label: tx("fusionTriggerToolCall", "Tool call") },
              { value: "text-match", label: tx("fusionTriggerTextMatch", "Text match") },
              { value: "rules", label: tx("fusionTriggerRules", "Rules (AND/OR)") },
            ] as const
          ).map((opt) => {
            const selected = form.triggers.mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`fusion-trigger-${opt.value}`}
                onClick={() =>
                  updateForm({
                    triggers: { ...form.triggers, mode: opt.value as TriggerMode },
                  })
                }
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300"
                    : "border-white/10 text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {form.triggers.mode === "tool-call" ? (
        <PatternTagInput
          testId="fusion-tool-patterns"
          label={tx("fusionToolPatterns", "Tool patterns")}
          help={tx(
            "fusionToolPatternsHelp",
            "Glob-style tool name patterns that trigger fusion (e.g. write*)."
          )}
          values={form.triggers.toolPatterns}
          placeholder="write*"
          onChange={(toolPatterns) =>
            updateForm({ triggers: { ...form.triggers, toolPatterns } })
          }
        />
      ) : null}

      {form.triggers.mode === "text-match" ? (
        <PatternTagInput
          testId="fusion-text-patterns"
          label={tx("fusionTextPatterns", "Text patterns")}
          help={tx(
            "fusionTextPatternsHelp",
            "Case-insensitive substrings matched against the latest user message (not glob)."
          )}
          values={form.triggers.textPatterns}
          placeholder="review this"
          onChange={(textPatterns) =>
            updateForm({ triggers: { ...form.triggers, textPatterns } })
          }
        />
      ) : null}

      {form.triggers.mode === "rules" ? (
        <div className="flex flex-col gap-3" data-testid="fusion-rules-container">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-main">
              {tx("fusionRulesOperator", "Operator")}
            </label>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-label={tx("fusionRulesOperator", "Operator")}
            >
              {(["AND", "OR"] as const).map((op) => {
                const selected = form.triggers.operator === op;
                return (
                  <button
                    key={op}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`fusion-rule-operator-${op}`}
                    onClick={() =>
                      updateForm({
                        triggers: { ...form.triggers, operator: op as RuleOperator },
                      })
                    }
                    className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300"
                        : "border-white/10 text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {op === "AND"
                      ? tx("fusionRulesAnd", "AND (All match)")
                      : tx("fusionRulesOr", "OR (Any match)")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2" data-testid="fusion-rules-list">
            <label className="text-xs font-medium text-text-main">
              {tx("fusionRulesListLabel", "Rules")}
            </label>
            {form.triggers.rules.length === 0 ? (
              <p className="text-xs text-text-muted italic">
                {tx("fusionRulesEmpty", "No rules defined. Add a rule below.")}
              </p>
            ) : (
              form.triggers.rules.map((rule, idx) => (
                <div
                  key={rule.id}
                  data-testid={`fusion-rule-row-${idx}`}
                  className="flex items-center gap-2 border border-white/10 rounded-md p-2 bg-white/5"
                >
                  <select
                    data-testid={`fusion-rule-kind-${idx}`}
                    value={rule.kind}
                    onChange={(e) => {
                      const newRules = [...form.triggers.rules];
                      newRules[idx] = {
                        ...newRules[idx],
                        kind: e.target.value as RuleKind,
                      };
                      updateForm({ triggers: { ...form.triggers, rules: newRules } });
                    }}
                    className="text-xs py-1.5 px-2 rounded border border-white/10 bg-white/5 text-text-main focus:outline-none"
                  >
                    <option value="tool-call">
                      {tx("fusionRuleToolCall", "Tool call")}
                    </option>
                    <option value="text-match">
                      {tx("fusionRuleTextMatch", "Text match")}
                    </option>
                  </select>
                  <input
                    type="text"
                    data-testid={`fusion-rule-pattern-${idx}`}
                    value={rule.pattern}
                    placeholder={rule.kind === "tool-call" ? "write*" : "security"}
                    onChange={(e) => {
                      const newRules = [...form.triggers.rules];
                      newRules[idx] = {
                        ...newRules[idx],
                        pattern: e.target.value,
                      };
                      updateForm({ triggers: { ...form.triggers, rules: newRules } });
                    }}
                    className="flex-1 text-xs py-1.5 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    data-testid={`fusion-rule-remove-${idx}`}
                    onClick={() => {
                      const newRules = form.triggers.rules.filter((_, i) => i !== idx);
                      updateForm({ triggers: { ...form.triggers, rules: newRules } });
                    }}
                    className="px-2 py-1 text-xs text-red-500 hover:text-red-400 border border-red-500/20 rounded hover:bg-red-500/10 transition-colors"
                  >
                    {tx("fusionRemoveRule", "Remove")}
                  </button>
                </div>
              ))
            )}

            <button
              type="button"
              data-testid="fusion-add-rule"
              onClick={() => {
                const newRules = [
                  ...form.triggers.rules,
                  {
                    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                    kind: "tool-call" as RuleKind,
                    pattern: "",
                  },
                ];
                updateForm({ triggers: { ...form.triggers, rules: newRules } });
              }}
              className="self-start rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-text-main hover:bg-white/5 transition-colors mt-1"
            >
              + {tx("fusionAddRule", "Add Rule")}
            </button>
          </div>
        </div>
      ) : null}

      {form.triggers.mode !== "always" ? (
        <div className="flex flex-col gap-1" data-testid="fusion-fallback-strategy">
          <label className="text-xs font-medium text-text-main">
            {tx("fusionFallbackStrategy", "Fallback strategy")}
          </label>
          <p className="text-[11px] text-text-muted">
            {tx(
              "fusionFallbackStrategyHelp",
              "Used when triggers do not match. Fusion strategies are excluded (no recursion)."
            )}
          </p>
          <select
            value={form.fallbackStrategy}
            onChange={(e) => updateForm({ fallbackStrategy: e.target.value })}
            className="w-full max-w-md text-xs py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
          >
            {FALLBACK_STRATEGY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {tx(opt.labelKey, opt.value)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </Card>
  );
}
