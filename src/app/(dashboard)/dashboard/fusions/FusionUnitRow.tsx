"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import Button from "@/shared/components/Button";
import {
  FUSION_COGNITIVE_LENS_IDS,
  FUSION_SYSTEM_ADDON_MAX_CHARS,
  type FusionCognitiveLensId,
} from "@/shared/constants/fusionCognitiveLenses";
import type { ComboRefOption, FusionModelUnit, FusionUnit } from "./fusionEditorTypes";
import { unitDisplayLabel } from "./fusionEditorTypes";

type FusionUnitRowProps = {
  label: string;
  unit: FusionUnit | null;
  comboRefs: ComboRefOption[];
  excludeComboName?: string;
  allowEmpty?: boolean;
  emptyHint?: string;
  onChange: (unit: FusionUnit | null) => void;
  onPickModel: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  testId?: string;
  /**
   * EPIC-22: show cognitive lens + systemAddon controls.
   * Only enable for **panel** model rows (not judge/acting/combo-ref).
   */
  showCognitiveFields?: boolean;
};

function tx(
  t: { (key: string): string; has?: (key: string) => boolean },
  key: string,
  fallback: string
): string {
  try {
    if (typeof t.has === "function" && !t.has(key)) return fallback;
    return t(key);
  } catch {
    return fallback;
  }
}

/** Human labels for closed lens ids (i18n keys under combos.fusionCognitiveLens_*). */
const LENS_LABEL_FALLBACKS: Record<FusionCognitiveLensId, string> = {
  "first-principles": "First principles",
  adversarial: "Adversarial",
  security: "Security",
  systems: "Systems",
  implementation: "Implementation",
  "skeptical-evidence": "Skeptical evidence",
  custom: "Custom",
};

type ModelPatch = {
  model?: string;
  providerId?: string;
  connectionId?: string | null;
  label?: string;
  /** `null` clears the field; omit leaves previous. */
  thinkingMode?: FusionCognitiveLensId | null;
  /** `null` clears the field; omit leaves previous. */
  systemAddon?: string | null;
};

/**
 * Preserve model-only meta when editing one field (provider pin, cognitive lens, label).
 */
function patchModelUnit(unit: FusionUnit | null, patch: ModelPatch): FusionModelUnit {
  const base: FusionModelUnit =
    unit?.kind === "model" ? { ...unit } : { kind: "model", model: "" };

  const next: FusionModelUnit = {
    kind: "model",
    model: patch.model !== undefined ? patch.model : base.model,
  };

  const providerId = patch.providerId !== undefined ? patch.providerId : base.providerId;
  if (providerId) next.providerId = providerId;

  const connectionId =
    patch.connectionId !== undefined ? patch.connectionId : base.connectionId;
  if (connectionId !== undefined) next.connectionId = connectionId;

  const label = patch.label !== undefined ? patch.label : base.label;
  if (label) next.label = label;

  if (patch.thinkingMode === null) {
    // cleared
  } else if (patch.thinkingMode !== undefined) {
    next.thinkingMode = patch.thinkingMode;
  } else if (base.thinkingMode) {
    next.thinkingMode = base.thinkingMode;
  }

  if (patch.systemAddon === null) {
    // cleared
  } else if (patch.systemAddon !== undefined) {
    if (patch.systemAddon !== "") next.systemAddon = patch.systemAddon;
  } else if (base.systemAddon !== undefined && base.systemAddon !== "") {
    next.systemAddon = base.systemAddon;
  }

  return next;
}

/**
 * Single panel/judge/acting row: switch between model picker and combo-ref dropdown.
 * Does not embed ComboEditor (Decision D6).
 */
export default function FusionUnitRow({
  label,
  unit,
  comboRefs,
  excludeComboName,
  allowEmpty = false,
  emptyHint,
  onChange,
  onPickModel,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  testId,
  showCognitiveFields = false,
}: FusionUnitRowProps) {
  const t = useTranslations("combos");
  const fieldId = useId();
  const lensSelectId = `${fieldId}-lens`;
  const lensHelpId = `${fieldId}-lens-help`;
  const addonFieldId = `${fieldId}-addon`;
  const addonHelpId = `${fieldId}-addon-help`;
  const entryKind: "model" | "combo-ref" | "empty" = unit
    ? unit.kind
    : allowEmpty
      ? "empty"
      : "model";

  const filteredRefs = comboRefs.filter((ref) => ref.name !== excludeComboName);

  const setKind = (kind: "model" | "combo-ref") => {
    if (kind === "model") {
      if (unit?.kind === "model") return;
      // Switching to model clears combo-ref; start without cognitive fields.
      onChange({ kind: "model", model: "" });
      return;
    }
    if (unit?.kind === "combo-ref") return;
    // Switching to combo-ref drops thinkingMode / systemAddon (no cognitive on refs).
    const first = filteredRefs[0];
    onChange({ kind: "combo-ref", comboName: first?.name || "" });
  };

  const notSetLabel = emptyHint || tx(t, "fusionUnitNotSet", "Not set");
  const modelKindLabel = tx(t, "fusionUnitModel", "Model");
  const comboRefKindLabel = tx(t, "fusionUnitComboRef", "Combo ref");
  const pickModelLabel = tx(t, "fusionPickModel", "Pick model");
  const selectComboRefLabel = tx(t, "fusionSelectComboRef", "Select a combo to reference");
  const comboRefHint = tx(
    t,
    "fusionComboRefHint",
    "Non-fusion combos are recommended. Fusion refs are allowed; runtime depth guards apply."
  );
  const moveUpLabel = tx(t, "moveUp", "Move up");
  const moveDownLabel = tx(t, "moveDown", "Move down");
  const removeLabel = tx(t, "removeModel", "Remove");
  const clearLabel = tx(t, "fusionClearUnit", "Clear");
  const modelPlaceholder = tx(t, "fusionModelPlaceholder", "provider/model (or pick)");
  const comboRefTitle = tx(
    t,
    "fusionComboRefTitle",
    "Combo refs may nest; fusion→fusion depth is guarded at runtime"
  );
  const fusionDepthGuardedLabel = tx(t, "fusionFusionDepthGuarded", "(fusion — depth guarded)");
  const cognitiveLensLabel = tx(t, "fusionCognitiveLens", "Cognitive lens");
  const cognitiveLensHelp = tx(
    t,
    "fusionCognitiveLensHelp",
    "Optional framing injected into this panel's system prompt. Empty = no lens."
  );
  const cognitiveLensNone = tx(t, "fusionCognitiveLensNone", "None (default)");
  const systemAddonLabel = tx(t, "fusionCognitiveSystemAddon", "System addon");
  const systemAddonHelp = tx(
    t,
    "fusionCognitiveSystemAddonHelp",
    "Optional extra instructions. Required when lens is Custom."
  );
  const systemAddonPlaceholder = tx(
    t,
    "fusionCognitiveSystemAddonPlaceholder",
    "Optional operator prose for this panel…"
  );

  const showLensUi = showCognitiveFields && (entryKind === "model" || entryKind === "empty");
  const modelUnit = unit?.kind === "model" ? unit : null;
  const customMissingAddon =
    modelUnit?.thinkingMode === "custom" &&
    !(typeof modelUnit.systemAddon === "string" && modelUnit.systemAddon.trim());

  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-black/8 dark:border-white/8 bg-black/[0.015] dark:bg-white/[0.02] p-3 flex flex-col gap-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-text-main truncate">{label}</span>
          {unit ? (
            <span className="text-[11px] text-text-muted truncate">{unitDisplayLabel(unit)}</span>
          ) : (
            <span className="text-[11px] text-text-muted">{notSetLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onMoveUp ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon="arrow_upward"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              aria-label={moveUpLabel}
            />
          ) : null}
          {onMoveDown ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon="arrow_downward"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              aria-label={moveDownLabel}
            />
          ) : null}
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon="delete"
              onClick={onRemove}
              aria-label={removeLabel}
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-white/10 overflow-hidden text-xs">
          <button
            type="button"
            className={`px-2.5 py-1.5 ${
              entryKind === "model" || entryKind === "empty"
                ? "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300"
                : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            onClick={() => setKind("model")}
          >
            {modelKindLabel}
          </button>
          <button
            type="button"
            className={`px-2.5 py-1.5 border-l border-white/10 ${
              entryKind === "combo-ref"
                ? "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300"
                : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            onClick={() => setKind("combo-ref")}
            title={comboRefTitle}
          >
            {comboRefKindLabel}
          </button>
        </div>
      </div>

      {(entryKind === "model" || entryKind === "empty") && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={modelUnit ? modelUnit.model : ""}
            placeholder={modelPlaceholder}
            onChange={(e) => {
              const model = e.target.value;
              if (!model.trim() && allowEmpty) {
                onChange(null);
                return;
              }
              onChange(patchModelUnit(unit, { model }));
            }}
            className="flex-1 text-xs py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
          />
          <Button type="button" variant="secondary" size="sm" icon="search" onClick={onPickModel}>
            {pickModelLabel}
          </Button>
          {allowEmpty && unit ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              {clearLabel}
            </Button>
          ) : null}
        </div>
      )}

      {showLensUi ? (
        <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
          <div className="flex flex-col gap-1">
            <label htmlFor={lensSelectId} className="text-xs font-medium text-text-main">
              {cognitiveLensLabel}
            </label>
            <select
              id={lensSelectId}
              data-testid={testId ? `${testId}-lens` : undefined}
              value={modelUnit?.thinkingMode ?? ""}
              aria-describedby={lensHelpId}
              onChange={(e) => {
                const raw = e.target.value;
                const model = modelUnit?.model ?? "";
                if (!raw) {
                  onChange(patchModelUnit(unit, { model, thinkingMode: null }));
                  return;
                }
                if (!(FUSION_COGNITIVE_LENS_IDS as readonly string[]).includes(raw)) return;
                onChange(
                  patchModelUnit(unit, {
                    model,
                    thinkingMode: raw as FusionCognitiveLensId,
                  })
                );
              }}
              className="w-full text-xs py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
            >
              <option value="">{cognitiveLensNone}</option>
              {FUSION_COGNITIVE_LENS_IDS.map((id) => (
                <option key={id} value={id}>
                  {tx(t, `fusionCognitiveLens_${id}`, LENS_LABEL_FALLBACKS[id])}
                </option>
              ))}
            </select>
            <p id={lensHelpId} className="text-[10px] text-text-muted">
              {cognitiveLensHelp}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={addonFieldId} className="text-xs font-medium text-text-main">
              {systemAddonLabel}
            </label>
            <textarea
              id={addonFieldId}
              data-testid={testId ? `${testId}-addon` : undefined}
              value={modelUnit?.systemAddon ?? ""}
              rows={2}
              maxLength={FUSION_SYSTEM_ADDON_MAX_CHARS}
              placeholder={systemAddonPlaceholder}
              aria-describedby={addonHelpId}
              aria-invalid={customMissingAddon || undefined}
              required={modelUnit?.thinkingMode === "custom"}
              onChange={(e) => {
                const systemAddon = e.target.value;
                const model = modelUnit?.model ?? "";
                onChange(
                  patchModelUnit(unit, {
                    model,
                    systemAddon: systemAddon === "" ? null : systemAddon,
                  })
                );
              }}
              className={`w-full text-xs py-2 px-2.5 rounded border bg-white/5 text-text-main focus:border-primary focus:outline-none resize-y min-h-[2.5rem] ${
                customMissingAddon
                  ? "border-red-500/50"
                  : "border-white/10"
              }`}
            />
            <p id={addonHelpId} className="text-[10px] text-text-muted">
              {systemAddonHelp}
            </p>
          </div>
        </div>
      ) : null}

      {entryKind === "combo-ref" && (
        <div className="flex flex-col gap-1">
          <select
            value={unit?.kind === "combo-ref" ? unit.comboName : ""}
            onChange={(e) => {
              const comboName = e.target.value;
              if (!comboName && allowEmpty) {
                onChange(null);
                return;
              }
              onChange({ kind: "combo-ref", comboName });
            }}
            className="w-full text-xs py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
          >
            <option value="">{selectComboRefLabel}</option>
            {filteredRefs.map((ref) => {
              const isFusion =
                ref.strategy === "fusion" || ref.strategy === "conditional-fusion";
              return (
                <option key={ref.id} value={ref.name}>
                  {ref.name}
                  {ref.strategy ? ` · ${ref.strategy}` : ""}
                  {typeof ref.stepCount === "number" ? ` · ${ref.stepCount} steps` : ""}
                  {isFusion ? ` ${fusionDepthGuardedLabel}` : ""}
                </option>
              );
            })}
          </select>
          <p className="text-[10px] text-text-muted">{comboRefHint}</p>
        </div>
      )}
    </div>
  );
}
