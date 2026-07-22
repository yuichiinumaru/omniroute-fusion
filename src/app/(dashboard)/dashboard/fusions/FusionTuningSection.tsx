"use client";

import { useId } from "react";
import Collapsible from "@/shared/components/Collapsible";
import {
  FUSION_JUDGE_MODE_IDS,
  type FusionJudgeModeId,
} from "@/shared/constants/fusionCognitiveLenses";
import { FUSION_UI_DEFAULTS, type FusionEditorForm } from "./fusionEditorTypes";

type Tx = (key: string, fallback: string) => string;

const JUDGE_MODE_LABEL_FALLBACKS: Record<FusionJudgeModeId, string> = {
  synthesize: "Synthesize (default)",
  dialectical: "Dialectical",
  "security-review": "Security review",
  "pick-best": "Pick best",
};

/**
 * Advanced fusion tuning accordion (minPanel / grace / hard timeout + judgeMode).
 * Extracted from FusionEditorClient (path-to-100 size split).
 */
export default function FusionTuningSection({
  form,
  updateForm,
  tx,
}: {
  form: FusionEditorForm;
  updateForm: (patch: Partial<FusionEditorForm>) => void;
  tx: Tx;
}) {
  const judgeModeId = useId();
  const judgeModeHelpId = `${judgeModeId}-help`;

  return (
    <Collapsible
      title={tx("fusionTuning", "Tuning")}
      subtitle={tx(
        "fusionTuningHelp",
        "Quorum and timeout controls for panel collection (defaults shown as placeholders)."
      )}
      icon="tune"
      defaultOpen={false}
      className="bg-surface"
    >
      <div className="p-4 grid gap-3 sm:grid-cols-3" data-testid="fusion-tuning">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-main">
            {tx("fusionMinPanel", "Min panel")}
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={form.tuning.minPanel}
            placeholder={String(FUSION_UI_DEFAULTS.minPanel)}
            onChange={(e) =>
              updateForm({ tuning: { ...form.tuning, minPanel: e.target.value } })
            }
            className="w-full text-xs py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
          />
          <p className="text-[10px] text-text-muted">
            {tx(
              "fusionMinPanelHelp",
              "Successful panel answers required before stragglers get a grace window (default 2)."
            )}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-main">
            {tx("fusionStragglerGraceMs", "Straggler grace (ms)")}
          </label>
          <input
            type="number"
            min={0}
            max={120000}
            value={form.tuning.stragglerGraceMs}
            placeholder={String(FUSION_UI_DEFAULTS.stragglerGraceMs)}
            onChange={(e) =>
              updateForm({
                tuning: { ...form.tuning, stragglerGraceMs: e.target.value },
              })
            }
            className="w-full text-xs py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
          />
          <p className="text-[10px] text-text-muted">
            {tx(
              "fusionStragglerGraceMsHelp",
              "How long to wait for slow panel models once quorum is reached (default 8000)."
            )}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-main">
            {tx("fusionPanelHardTimeoutMs", "Panel hard timeout (ms)")}
          </label>
          <input
            type="number"
            min={1000}
            max={600000}
            value={form.tuning.panelHardTimeoutMs}
            placeholder={String(FUSION_UI_DEFAULTS.panelHardTimeoutMs)}
            onChange={(e) =>
              updateForm({
                tuning: { ...form.tuning, panelHardTimeoutMs: e.target.value },
              })
            }
            className="w-full text-xs py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
          />
          <p className="text-[10px] text-text-muted">
            {tx(
              "fusionPanelHardTimeoutMsHelp",
              "Absolute cap so one hung model can't stall the whole panel (default 90000)."
            )}
          </p>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-3">
          <label htmlFor={judgeModeId} className="text-xs font-medium text-text-main">
            {tx("fusionJudgeMode", "Judge mode")}
          </label>
          <select
            id={judgeModeId}
            data-testid="fusion-judge-mode"
            value={form.judgeMode}
            aria-describedby={judgeModeHelpId}
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) {
                updateForm({ judgeMode: "" });
                return;
              }
              if (!(FUSION_JUDGE_MODE_IDS as readonly string[]).includes(raw)) return;
              updateForm({ judgeMode: raw as FusionJudgeModeId });
            }}
            className="w-full max-w-md text-xs py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
          >
            <option value="">
              {tx("fusionJudgeModeDefault", "Default (synthesize)")}
            </option>
            {FUSION_JUDGE_MODE_IDS.map((id) => (
              <option key={id} value={id}>
                {tx(`fusionJudgeMode_${id}`, JUDGE_MODE_LABEL_FALLBACKS[id])}
              </option>
            ))}
          </select>
          <p id={judgeModeHelpId} className="text-[10px] text-text-muted">
            {tx(
              "fusionJudgeModeHelp",
              "How the judge merges panel answers. Empty uses synthesize at runtime."
            )}
          </p>
        </div>
      </div>
    </Collapsible>
  );
}
