"use client";

import Card from "@/shared/components/Card";
import {
  FALLBACK_STRATEGY_OPTIONS,
  type FusionEditorForm,
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
