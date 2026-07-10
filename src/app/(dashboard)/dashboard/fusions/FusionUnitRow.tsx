"use client";

import Button from "@/shared/components/Button";
import type { ComboRefOption, FusionUnit } from "./fusionEditorTypes";
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
};

/**
 * Single panel/judge row: switch between model picker and combo-ref dropdown.
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
}: FusionUnitRowProps) {
  const entryKind: "model" | "combo-ref" | "empty" = unit
    ? unit.kind
    : allowEmpty
      ? "empty"
      : "model";

  const filteredRefs = comboRefs.filter((ref) => ref.name !== excludeComboName);

  const setKind = (kind: "model" | "combo-ref") => {
    if (kind === "model") {
      if (unit?.kind === "model") return;
      onChange({ kind: "model", model: "" });
      return;
    }
    if (unit?.kind === "combo-ref") return;
    const first = filteredRefs[0];
    onChange({ kind: "combo-ref", comboName: first?.name || "" });
  };

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
            <span className="text-[11px] text-text-muted">{emptyHint || "Not set"}</span>
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
              aria-label="Move up"
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
              aria-label="Move down"
            />
          ) : null}
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon="delete"
              onClick={onRemove}
              aria-label="Remove"
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-black/10 dark:border-white/10 overflow-hidden text-xs">
          <button
            type="button"
            className={`px-2.5 py-1.5 ${
              entryKind === "model" || entryKind === "empty"
                ? "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300"
                : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            onClick={() => setKind("model")}
          >
            Model
          </button>
          <button
            type="button"
            className={`px-2.5 py-1.5 border-l border-black/10 dark:border-white/10 ${
              entryKind === "combo-ref"
                ? "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300"
                : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            onClick={() => setKind("combo-ref")}
            title="Combo refs may nest; fusion→fusion depth is guarded at runtime"
          >
            Combo ref
          </button>
        </div>
      </div>

      {(entryKind === "model" || entryKind === "empty") && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={unit?.kind === "model" ? unit.model : ""}
            placeholder="provider/model (or pick)"
            onChange={(e) => {
              const model = e.target.value;
              if (!model.trim() && allowEmpty) {
                onChange(null);
                return;
              }
              onChange({
                kind: "model",
                model,
                ...(unit?.kind === "model" && unit.providerId
                  ? { providerId: unit.providerId }
                  : {}),
                ...(unit?.kind === "model" && unit.connectionId !== undefined
                  ? { connectionId: unit.connectionId }
                  : {}),
              });
            }}
            className="flex-1 text-xs py-2 px-2.5 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-text-main focus:border-primary focus:outline-none"
          />
          <Button type="button" variant="secondary" size="sm" icon="search" onClick={onPickModel}>
            Pick model
          </Button>
          {allowEmpty && unit ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Clear
            </Button>
          ) : null}
        </div>
      )}

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
            className="w-full text-xs py-2 px-2.5 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-text-main focus:border-primary focus:outline-none"
          >
            <option value="">Select a combo to reference</option>
            {filteredRefs.map((ref) => {
              const isFusion =
                ref.strategy === "fusion" || ref.strategy === "conditional-fusion";
              return (
                <option key={ref.id} value={ref.name}>
                  {ref.name}
                  {ref.strategy ? ` · ${ref.strategy}` : ""}
                  {typeof ref.stepCount === "number" ? ` · ${ref.stepCount} steps` : ""}
                  {isFusion ? " (fusion — depth guarded)" : ""}
                </option>
              );
            })}
          </select>
          <p className="text-[10px] text-text-muted">
            Non-fusion combos are recommended. Fusion refs are allowed; runtime depth guards apply.
          </p>
        </div>
      )}
    </div>
  );
}
