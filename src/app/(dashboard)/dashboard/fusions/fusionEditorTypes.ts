/**
 * Shared types + pure helpers for the Fusion editor (Task 0016).
 * Keep this free of React so load/save logic is easy to unit-test later.
 */

import { ROUTING_STRATEGIES } from "@/shared/constants/routingStrategies";

export const FUSION_UI_DEFAULTS = {
  minPanel: 2,
  stragglerGraceMs: 8000,
  panelHardTimeoutMs: 90000,
} as const;

export const FUSION_STRATEGIES = new Set(["fusion", "conditional-fusion"]);

/** Fallback strategies for conditional-fusion miss path — Decision D8 excludes fusion family. */
export const FALLBACK_STRATEGY_OPTIONS = ROUTING_STRATEGIES.filter(
  (s) => s.value !== "fusion" && s.value !== "conditional-fusion"
);

export type TriggerMode = "always" | "tool-call" | "text-match";

/**
 * Model panel/judge/acting unit.
 * `connectionId` is optional account pin: load/save round-trip it when set.
 * ModelSelectModal emits value + providerId; the editor plumbs connectionId when
 * the pick includes it or when exactly one active connection matches providerId.
 */
export type FusionModelUnit = {
  kind: "model";
  model: string;
  providerId?: string;
  connectionId?: string | null;
  label?: string;
};

export type FusionComboRefUnit = {
  kind: "combo-ref";
  comboName: string;
  label?: string;
};

export type FusionUnit = FusionModelUnit | FusionComboRefUnit;

export type FusionTuningForm = {
  minPanel: string;
  stragglerGraceMs: string;
  panelHardTimeoutMs: string;
};

export type FusionTriggersForm = {
  mode: TriggerMode;
  toolPatterns: string[];
  textPatterns: string[];
};

export type FusionEditorForm = {
  name: string;
  description: string;
  /** Optional executor — final voice when set (Epic 0004). */
  acting: FusionUnit | null;
  panels: FusionUnit[];
  judge: FusionUnit | null;
  triggers: FusionTriggersForm;
  fallbackStrategy: string;
  tuning: FusionTuningForm;
};

export type ComboRefOption = {
  id: string;
  name: string;
  strategy?: string;
  stepCount?: number;
};

export type ComboRecord = {
  id: string;
  name: string;
  description?: string | null;
  strategy?: string;
  models?: unknown[];
  judge?: unknown;
  acting?: unknown;
  config?: Record<string, unknown> | null;
  isHidden?: boolean;
};

export function emptyFusionForm(): FusionEditorForm {
  return {
    name: "",
    description: "",
    acting: null,
    panels: [],
    judge: null,
    triggers: {
      mode: "always",
      toolPatterns: ["write*", "edit*", "create*"],
      textPatterns: [],
    },
    fallbackStrategy: "priority",
    tuning: {
      minPanel: "",
      stragglerGraceMs: "",
      panelHardTimeoutMs: "",
    },
  };
}

export function isFusionStrategy(strategy: unknown): boolean {
  return typeof strategy === "string" && FUSION_STRATEGIES.has(strategy);
}

/**
 * List-shell filter (Task 0015): keep only non-hidden fusion-family combos.
 * Shared by `/dashboard/fusions` page so the client filter cannot drift from
 * the editor's isFusionStrategy acceptance set.
 */
export function filterFusionCombos<T extends { strategy?: string; isHidden?: boolean }>(
  combos: readonly T[]
): T[] {
  return combos.filter((c) => !c.isHidden && isFusionStrategy(c.strategy));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function normalizeFusionUnit(entry: unknown): FusionUnit | null {
  if (typeof entry === "string") {
    const model = entry.trim();
    if (!model) return null;
    return { kind: "model", model };
  }

  const rec = asRecord(entry);
  if (!rec) return null;

  if (rec.kind === "combo-ref") {
    const comboName =
      typeof rec.comboName === "string"
        ? rec.comboName.trim()
        : typeof rec.model === "string"
          ? rec.model.trim()
          : "";
    if (!comboName) return null;
    const unit: FusionComboRefUnit = { kind: "combo-ref", comboName };
    if (typeof rec.label === "string" && rec.label.trim()) unit.label = rec.label.trim();
    return unit;
  }

  const model = typeof rec.model === "string" ? rec.model.trim() : "";
  if (!model) return null;

  const unit: FusionModelUnit = { kind: "model", model };
  if (typeof rec.providerId === "string" && rec.providerId.trim()) {
    unit.providerId = rec.providerId.trim();
  }
  if (rec.connectionId === null) unit.connectionId = null;
  else if (typeof rec.connectionId === "string" && rec.connectionId.trim()) {
    unit.connectionId = rec.connectionId.trim();
  }
  if (typeof rec.label === "string" && rec.label.trim()) unit.label = rec.label.trim();
  return unit;
}

export function unitDisplayLabel(unit: FusionUnit | null): string {
  if (!unit) return "—";
  if (unit.kind === "combo-ref") return `Combo → ${unit.comboName}`;
  return unit.model;
}

export function unitToPayload(unit: FusionUnit): Record<string, unknown> | string {
  if (unit.kind === "combo-ref") {
    return {
      kind: "combo-ref",
      comboName: unit.comboName,
      ...(unit.label ? { label: unit.label } : {}),
    };
  }
  // Prefer structured model step when we have provider metadata; plain string is fine too.
  if (unit.providerId || unit.connectionId !== undefined || unit.label) {
    return {
      kind: "model",
      model: unit.model,
      ...(unit.providerId ? { providerId: unit.providerId } : {}),
      ...(unit.connectionId !== undefined ? { connectionId: unit.connectionId } : {}),
      ...(unit.label ? { label: unit.label } : {}),
    };
  }
  return unit.model;
}

function optionalNumberString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return String(Number(value));
  }
  return "";
}

export function formFromCombo(combo: ComboRecord): FusionEditorForm {
  const config = asRecord(combo.config) || {};
  const triggersRec = asRecord(config.triggers) || {};

  const rawMode = typeof triggersRec.mode === "string" ? triggersRec.mode : null;
  let mode: TriggerMode = "always";
  if (rawMode === "tool-call" || rawMode === "text-match" || rawMode === "always") {
    mode = rawMode;
  } else if (combo.strategy === "conditional-fusion") {
    mode = "tool-call";
  }

  const toolPatterns = Array.isArray(triggersRec.toolPatterns)
    ? triggersRec.toolPatterns.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : ["write*", "edit*", "create*"];
  const textPatterns = Array.isArray(triggersRec.textPatterns)
    ? triggersRec.textPatterns.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];

  const panels = (Array.isArray(combo.models) ? combo.models : [])
    .map(normalizeFusionUnit)
    .filter((u): u is FusionUnit => u !== null);

  let judge = normalizeFusionUnit(combo.judge);
  if (!judge && typeof config.judgeModel === "string" && config.judgeModel.trim()) {
    judge = { kind: "model", model: config.judgeModel.trim() };
  }

  const acting = normalizeFusionUnit(combo.acting);

  const fusionTuning = asRecord(config.fusionTuning) || {};

  return {
    name: typeof combo.name === "string" ? combo.name : "",
    description: typeof combo.description === "string" ? combo.description : "",
    acting,
    panels,
    judge,
    triggers: {
      mode,
      toolPatterns: toolPatterns.length > 0 ? toolPatterns : ["write*", "edit*", "create*"],
      textPatterns,
    },
    fallbackStrategy:
      typeof config.fallbackStrategy === "string" && config.fallbackStrategy.trim()
        ? config.fallbackStrategy.trim()
        : "priority",
    tuning: {
      minPanel: optionalNumberString(fusionTuning.minPanel),
      stragglerGraceMs: optionalNumberString(fusionTuning.stragglerGraceMs),
      panelHardTimeoutMs: optionalNumberString(fusionTuning.panelHardTimeoutMs),
    },
  };
}

function parseOptionalInt(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

export type FusionSavePayload = {
  name: string;
  description?: string | null;
  models: Array<Record<string, unknown> | string>;
  /** Present on update (null clears). Omitted on create when unset. */
  judge?: Record<string, unknown> | string | null;
  /** Epic 0004 acting unit. Present on update (null clears). */
  acting?: Record<string, unknown> | string | null;
  strategy: "fusion" | "conditional-fusion";
  config: Record<string, unknown>;
};

/**
 * Build combo CRUD body from editor form.
 * strategy: fusion when triggers.mode is always; conditional-fusion otherwise.
 * judge is top-level (Decision D1). acting is top-level (Epic 0004 / A4).
 * config.judgeModel kept for legacy readers.
 *
 * @param mode create — omit null judge/acting (createComboSchema rejects null);
 *             update — send null to clear (updateComboSchema.nullable).
 */
export function buildSavePayload(
  form: FusionEditorForm,
  existingConfig?: Record<string, unknown> | null,
  mode: "create" | "update" = "update"
): FusionSavePayload {
  const strategy: "fusion" | "conditional-fusion" =
    form.triggers.mode === "always" ? "fusion" : "conditional-fusion";

  const baseConfig: Record<string, unknown> = {
    ...(existingConfig && typeof existingConfig === "object" ? existingConfig : {}),
  };

  // Always rewrite fusion-specific keys from form state.
  delete baseConfig.triggers;
  delete baseConfig.fusionTuning;
  delete baseConfig.fallbackStrategy;
  delete baseConfig.judgeModel;

  const fusionTuning: Record<string, number> = {};
  const minPanel = parseOptionalInt(form.tuning.minPanel);
  const stragglerGraceMs = parseOptionalInt(form.tuning.stragglerGraceMs);
  const panelHardTimeoutMs = parseOptionalInt(form.tuning.panelHardTimeoutMs);
  if (minPanel !== undefined) fusionTuning.minPanel = minPanel;
  if (stragglerGraceMs !== undefined) fusionTuning.stragglerGraceMs = stragglerGraceMs;
  if (panelHardTimeoutMs !== undefined) fusionTuning.panelHardTimeoutMs = panelHardTimeoutMs;
  if (Object.keys(fusionTuning).length > 0) {
    baseConfig.fusionTuning = fusionTuning;
  }

  if (form.triggers.mode === "always") {
    // Explicit always keeps strategy "fusion"; optional triggers block for clarity.
    baseConfig.triggers = { mode: "always" as const };
  } else {
    const triggers: Record<string, unknown> = {
      mode: form.triggers.mode,
      requireApproval: false,
    };
    if (form.triggers.mode === "tool-call") {
      triggers.toolPatterns =
        form.triggers.toolPatterns.length > 0
          ? form.triggers.toolPatterns
          : ["write*", "edit*", "create*"];
    }
    if (form.triggers.mode === "text-match") {
      triggers.textPatterns = form.triggers.textPatterns;
    }
    baseConfig.triggers = triggers;
    // fallbackStrategy only matters when acting is absent (A6/A7).
    baseConfig.fallbackStrategy = form.fallbackStrategy || "priority";
  }

  // Legacy string path for readers that only understand config.judgeModel.
  if (form.judge?.kind === "model" && form.judge.model) {
    baseConfig.judgeModel = form.judge.model;
  }

  const payload: FusionSavePayload = {
    name: form.name.trim(),
    models: form.panels.map(unitToPayload),
    strategy,
    config: baseConfig,
  };

  if (form.description.trim()) {
    payload.description = form.description.trim();
  } else if (mode === "update") {
    payload.description = null;
  }

  if (form.judge) {
    payload.judge = unitToPayload(form.judge);
  } else if (mode === "update") {
    payload.judge = null;
  }

  if (form.acting) {
    payload.acting = unitToPayload(form.acting);
  } else if (mode === "update") {
    payload.acting = null;
  }

  return payload;
}

export function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const rec = data as Record<string, unknown>;
  if (typeof rec.error === "string" && rec.error.trim()) return rec.error;
  const errObj = asRecord(rec.error);
  if (errObj) {
    if (typeof errObj.message === "string" && errObj.message.trim()) return errObj.message;
    if (typeof errObj.firstMessage === "string" && errObj.firstMessage.trim()) {
      return errObj.firstMessage;
    }
  }
  if (typeof rec.message === "string" && rec.message.trim()) return rec.message;
  return fallback;
}

export function uniqueFusionName(existingNames: string[]): string {
  const base = "fusion";
  const names = new Set(existingNames);
  if (!names.has(base)) return base;
  let counter = 1;
  while (names.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}
