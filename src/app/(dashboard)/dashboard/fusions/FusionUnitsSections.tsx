"use client";

import Button from "@/shared/components/Button";
import Card from "@/shared/components/Card";
import FusionUnitRow from "./FusionUnitRow";
import {
  unitDisplayLabel,
  type ComboRefOption,
  type FusionEditorForm,
  type FusionUnit,
} from "./fusionEditorTypes";

type Tx = (key: string, fallback: string) => string;

type PickerScope =
  | { scope: "panel"; index: number }
  | { scope: "judge" }
  | { scope: "acting" };

/**
 * Acting + Panels + Judge cards for the fusion editor.
 * Extracted from FusionEditorClient (path-to-100 size split toward ≤500 LOC).
 */
export default function FusionUnitsSections({
  form,
  comboRefs,
  strategyLabel,
  updateForm,
  addPanel,
  setPanel,
  movePanel,
  onPickModel,
  tx,
}: {
  form: FusionEditorForm;
  comboRefs: ComboRefOption[];
  strategyLabel: string;
  updateForm: (patch: Partial<FusionEditorForm>) => void;
  addPanel: (kind: "model" | "combo-ref") => void;
  setPanel: (index: number, unit: FusionUnit | null) => void;
  movePanel: (index: number, direction: -1 | 1) => void;
  onPickModel: (target: PickerScope) => void;
  tx: Tx;
}) {
  const preview = resolutionPreview(form);

  return (
    <>
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-main">
            {tx("fusionBasics", "Basics")}
          </h2>
          <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-0.5 text-[11px] font-medium text-fuchsia-700 dark:text-fuchsia-300">
            {strategyLabel}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-main">
              {tx("comboName", "Combo Name")}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder={tx("comboNamePlaceholder", "my-fusion")}
              className="w-full text-sm py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
              data-testid="fusion-name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-main">
              {tx("comboDescription", "Description")}
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              placeholder={tx("comboDescriptionPlaceholder", "Optional")}
              className="w-full text-sm py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </Card>

      <Card padding="md" className="space-y-3" data-testid="fusion-acting">
        <div>
          <h2 className="text-sm font-semibold text-text-main">
            {tx("fusionActingSection", "Acting")}
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            {tx(
              "fusionActingHelp",
              "Primary executor (e.g. builder). On trigger miss it answers alone; on fusion it receives the judge review and produces the final answer. Leave empty for legacy panels→judge final voice."
            )}
          </p>
        </div>
        <FusionUnitRow
          testId="fusion-acting-row"
          label={tx("fusionActingUnit", "Acting unit")}
          unit={form.acting}
          comboRefs={comboRefs}
          excludeComboName={form.name.trim()}
          allowEmpty
          emptyHint={tx("fusionActingEmptyHint", "No acting — judge is final voice (legacy)")}
          onChange={(unit) => updateForm({ acting: unit })}
          onPickModel={() => onPickModel({ scope: "acting" })}
        />
        <p className="text-[10px] text-text-muted">
          Flow:{" "}
          <span className="font-medium text-text-main">
            Acting → (trigger?) → Panels → Judge → Acting
          </span>
        </p>
      </Card>

      <Card padding="md" className="space-y-3" data-testid="fusion-panels">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text-main">
              {tx("fusionPanels", "Panels")}
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              {tx(
                "fusionPanelsHelp",
                "Parallel consultors. Prefer combo-refs so each panel inherits failover and its own system prompt."
              )}
            </p>
          </div>
          <Button type="button" size="sm" icon="add" onClick={() => addPanel("model")}>
            {tx("fusionAddPanel", "Add panel")}
          </Button>
        </div>

        {form.panels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-text-muted">
            {tx("fusionNoPanelsYet", "No panels yet. Add a model or combo reference.")}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {form.panels.map((panel, index) => (
              <FusionUnitRow
                key={`panel-${index}`}
                testId={`fusion-panel-${index}`}
                label={`Panel ${index + 1}`}
                unit={panel}
                comboRefs={comboRefs}
                excludeComboName={form.name.trim()}
                onChange={(unit) => {
                  if (!unit) setPanel(index, null);
                  else setPanel(index, unit);
                }}
                onPickModel={() => onPickModel({ scope: "panel", index })}
                onRemove={() => setPanel(index, null)}
                onMoveUp={() => movePanel(index, -1)}
                onMoveDown={() => movePanel(index, 1)}
                canMoveUp={index > 0}
                canMoveDown={index < form.panels.length - 1}
              />
            ))}
          </div>
        )}
      </Card>

      <Card padding="md" className="space-y-3" data-testid="fusion-judge">
        <div>
          <h2 className="text-sm font-semibold text-text-main">
            {tx("fusionJudgeSection", "Judge")}
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            {tx(
              "fusionJudgeModelHelp",
              "Model or combo that synthesizes panel answers. Leave empty to use the first panel."
            )}
          </p>
        </div>
        <FusionUnitRow
          testId="fusion-judge-row"
          label={tx("fusionJudgeModel", "Judge unit")}
          unit={form.judge}
          comboRefs={comboRefs}
          excludeComboName={form.name.trim()}
          allowEmpty
          emptyHint={tx("fusionJudgeEmptyHint", "Falls back to first panel")}
          onChange={(unit) => updateForm({ judge: unit })}
          onPickModel={() => onPickModel({ scope: "judge" })}
        />
        <div className="rounded-md border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-text-muted">
            {tx("fusionJudgeResolution", "Resolution preview")}
          </p>
          <div className="mt-0.5 space-y-0.5" data-testid="fusion-judge-preview">
            <p className="text-xs text-text-main">
              <span className="text-text-muted">Will use: </span>
              <span className="font-medium">{preview.winner}</span>
            </p>
            <p className="text-[11px] text-text-muted">{preview.via}</p>
            <p className="text-[10px] text-text-muted/80">
              Precedence: explicit judge field → legacy judgeModel → first panel only
              (not all panels).
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}

function resolutionPreview(form: FusionEditorForm): { winner: string; via: string } {
  if (form.judge) {
    return { winner: unitDisplayLabel(form.judge), via: "explicit judge field" };
  }
  if (form.panels[0]) {
    return {
      winner: unitDisplayLabel(form.panels[0]),
      via: "fallback: first panel (no judge set)",
    };
  }
  return { winner: "—", via: "set a judge or add a panel" };
}
