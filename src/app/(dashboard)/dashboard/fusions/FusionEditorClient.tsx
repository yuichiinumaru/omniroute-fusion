"use client";

/**
 * Fusion Editor — panels, judge, triggers, tuning (Task 0016).
 * Focused UX only; does not import ComboEditor (Decision D6).
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Button from "@/shared/components/Button";
import Card from "@/shared/components/Card";
import Collapsible from "@/shared/components/Collapsible";
import { CardSkeleton } from "@/shared/components/Loading";
import { ROUTING_STRATEGIES } from "@/shared/constants/routingStrategies";
import { useNotificationStore } from "@/store/notificationStore";
import FusionUnitRow from "./FusionUnitRow";
import {
  FUSION_UI_DEFAULTS,
  buildSavePayload,
  emptyFusionForm,
  formFromCombo,
  parseApiError,
  uniqueFusionName,
  unitDisplayLabel,
  type ComboRecord,
  type ComboRefOption,
  type FusionEditorForm,
  type FusionUnit,
  type TriggerMode,
} from "./fusionEditorTypes";

const ModelSelectModal = dynamic(() => import("@/shared/components/ModelSelectModal"), {
  ssr: false,
});

type PickerTarget =
  | { scope: "panel"; index: number }
  | { scope: "judge" }
  | { scope: "acting" }
  | null;

const FALLBACK_STRATEGY_OPTIONS = ROUTING_STRATEGIES.filter(
  (s) => s.value !== "fusion" && s.value !== "conditional-fusion"
);

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

function PatternTagInput({
  label,
  help,
  values,
  placeholder,
  onChange,
  testId,
}: {
  label: string;
  help?: string;
  values: string[];
  placeholder?: string;
  onChange: (next: string[]) => void;
  testId?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const next = draft.trim();
    if (!next) return;
    if (values.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...values, next]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <label className="text-xs font-medium text-text-main">{label}</label>
      {help ? <p className="text-[11px] text-text-muted">{help}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {values.map((pattern) => (
          <span
            key={pattern}
            className="inline-flex items-center gap-1 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] px-2 py-0.5 text-[11px] text-text-main"
          >
            {pattern}
            <button
              type="button"
              className="text-text-muted hover:text-red-500"
              aria-label={`Remove ${pattern}`}
              onClick={() => onChange(values.filter((p) => p !== pattern))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          placeholder={placeholder || "pattern"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="flex-1 text-xs py-2 px-2.5 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-text-main focus:border-primary focus:outline-none"
        />
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

/**
 * Human-readable judge resolution for the editor preview.
 * Shows the WINNER only, plus a short note about which fallback tier won.
 * Precedence (runtime): top-level `judge` → legacy `config.judgeModel` → first panel.
 */
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

export default function FusionEditorClient({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const notify = useNotificationStore();
  const t = useTranslations("combos");

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FusionEditorForm>(emptyFusionForm);
  const [existingConfig, setExistingConfig] = useState<Record<string, unknown> | null>(null);
  const [comboRefs, setComboRefs] = useState<ComboRefOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  // Required by ModelSelectModal — without activeProviders the modal shows zero models
  // (it only lists providers that have live connections). Same pattern as Combos page.
  const [activeProviders, setActiveProviders] = useState<
    Array<{ provider: string; id?: string | number }>
  >([]);
  const [modelAliases, setModelAliases] = useState<Record<string, string>>({});

  const loadEditor = useCallback(async () => {
    setLoadError(null);
    if (!isNew) setLoading(true);
    try {
      const [optionsRes, comboRes, providersRes, aliasesRes] = await Promise.all([
        fetch("/api/combos/builder/options"),
        isNew ? Promise.resolve(null) : fetch(`/api/combos/${id}`),
        fetch("/api/providers"),
        fetch("/api/models/alias"),
      ]);

      if (providersRes.ok) {
        const providersData = await providersRes.json().catch(() => ({}));
        const connections = Array.isArray(providersData.connections)
          ? providersData.connections
          : [];
        // Include active/success connections so ModelSelectModal can group models.
        // Also keep unknown/null status connections — otherwise freshly imported
        // keys with no health check yet would hide entire providers from the picker.
        const active = connections.filter((c: { testStatus?: string | null }) => {
          const status = (c.testStatus || "").toLowerCase();
          return (
            status === "active" ||
            status === "success" ||
            status === "" ||
            status === "unknown" ||
            status === "untested"
          );
        });
        setActiveProviders(active);
      }

      if (aliasesRes.ok) {
        const aliasesData = await aliasesRes.json().catch(() => ({}));
        setModelAliases(
          aliasesData && typeof aliasesData.aliases === "object" && aliasesData.aliases
            ? (aliasesData.aliases as Record<string, string>)
            : {}
        );
      }

      if (optionsRes.ok) {
        const optionsData = await optionsRes.json().catch(() => ({}));
        const refs = Array.isArray(optionsData.comboRefs)
          ? (optionsData.comboRefs as ComboRefOption[])
          : [];
        setComboRefs(refs);
      } else {
        // Fallback: list combos for combo-ref picker
        const listRes = await fetch("/api/combos");
        const listData = await listRes.json().catch(() => ({}));
        const all = Array.isArray(listData.combos) ? (listData.combos as ComboRecord[]) : [];
        setComboRefs(
          all
            .filter((c) => !c.isHidden && typeof c.name === "string")
            .map((c) => ({
              id: c.id,
              name: c.name,
              strategy: c.strategy,
              stepCount: Array.isArray(c.models) ? c.models.length : 0,
            }))
        );
      }

      if (isNew) {
        setForm(emptyFusionForm());
        setExistingConfig(null);
        return;
      }

      if (!comboRes) return;
      const data = await comboRes.json().catch(() => ({}));
      if (!comboRes.ok) {
        throw new Error(parseApiError(data, "Failed to load fusion"));
      }
      const combo = data as ComboRecord;
      setExistingConfig(
        combo.config && typeof combo.config === "object" && !Array.isArray(combo.config)
          ? (combo.config as Record<string, unknown>)
          : null
      );
      setForm(formFromCombo(combo));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load fusion";
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }, [id, isNew, notify]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);

  const updateForm = useCallback((patch: Partial<FusionEditorForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const setPanel = (index: number, unit: FusionUnit | null) => {
    setForm((prev) => {
      const panels = [...prev.panels];
      if (!unit) {
        panels.splice(index, 1);
      } else {
        panels[index] = unit;
      }
      return { ...prev, panels };
    });
  };

  const addPanel = (kind: "model" | "combo-ref" = "model") => {
    setForm((prev) => ({
      ...prev,
      panels: [
        ...prev.panels,
        kind === "combo-ref"
          ? {
              kind: "combo-ref" as const,
              comboName: comboRefs.find((r) => r.name !== prev.name.trim())?.name || "",
            }
          : { kind: "model" as const, model: "" },
      ],
    }));
  };

  const movePanel = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.panels.length) return prev;
      const panels = [...prev.panels];
      const [item] = panels.splice(index, 1);
      panels.splice(target, 0, item);
      return { ...prev, panels };
    });
  };

  const applyPickedModel = (model: unknown) => {
    if (!pickerTarget) return;
    const rec = model && typeof model === "object" ? (model as Record<string, unknown>) : null;
    const qualified =
      typeof rec?.value === "string"
        ? rec.value
        : typeof model === "string"
          ? model
          : "";
    if (!qualified) return;

    const providerId =
      typeof rec?.providerId === "string" && rec.providerId.trim()
        ? rec.providerId.trim()
        : undefined;
    const unit: FusionUnit = {
      kind: "model",
      model: qualified,
      ...(providerId ? { providerId } : {}),
    };

    if (pickerTarget.scope === "judge") {
      updateForm({ judge: unit });
    } else if (pickerTarget.scope === "acting") {
      updateForm({ acting: unit });
    } else {
      setPanel(pickerTarget.index, unit);
    }
    setPickerTarget(null);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      notify.error(tx(t, "nameRequired", "Name is required"));
      return;
    }
    if (form.panels.length === 0) {
      notify.error("Add at least one panel model or combo ref");
      return;
    }
    const incompletePanel = form.panels.some(
      (p) =>
        (p.kind === "model" && !p.model.trim()) ||
        (p.kind === "combo-ref" && !p.comboName.trim())
    );
    if (incompletePanel) {
      notify.error("Every panel needs a model or combo reference");
      return;
    }
    if (
      form.judge?.kind === "model" &&
      form.judge.model !== undefined &&
      form.judge.model.trim() === ""
    ) {
      notify.error("Judge model is empty — clear it or pick a model");
      return;
    }
    if (form.judge?.kind === "combo-ref" && !form.judge.comboName.trim()) {
      notify.error("Judge combo ref is empty — clear it or pick a combo");
      return;
    }
    if (form.triggers.mode === "text-match" && form.triggers.textPatterns.length === 0) {
      notify.error("Add at least one text pattern for text-match triggers");
      return;
    }

    setSaving(true);
    try {
      let targetId = id;
      let payloadForm = form;

      if (isNew) {
        // Ensure unique name if user left default empty naming race
        const listRes = await fetch("/api/combos");
        const listData = await listRes.json().catch(() => ({}));
        if (!listRes.ok) {
          throw new Error(parseApiError(listData, "Failed to prepare fusion create"));
        }
        const all = Array.isArray(listData.combos) ? (listData.combos as ComboRecord[]) : [];
        const names = all.map((c) => c.name).filter(Boolean);
        if (names.includes(name)) {
          throw new Error("A combo with this name already exists");
        }
        if (!name) {
          payloadForm = { ...form, name: uniqueFusionName(names) };
        }

        const createBody = buildSavePayload(payloadForm, null, "create");
        const createRes = await fetch("/api/combos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createBody),
        });
        const createData = await createRes.json().catch(() => ({}));
        if (!createRes.ok) {
          throw new Error(parseApiError(createData, "Failed to create fusion"));
        }
        targetId = typeof createData.id === "string" ? createData.id : "";
        notify.success(`Created fusion "${createBody.name}"`);
        if (targetId) {
          router.replace(`/dashboard/fusions/${targetId}`);
          return;
        }
        router.push("/dashboard/fusions");
        return;
      }

      const body = buildSavePayload(payloadForm, existingConfig, "update");
      const res = await fetch(`/api/combos/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseApiError(data, "Failed to save fusion"));
      }
      setExistingConfig(
        body.config && typeof body.config === "object" ? body.config : existingConfig
      );
      if (data && typeof data === "object") {
        setForm(formFromCombo(data as ComboRecord));
      }
      notify.success(`Saved fusion "${body.name}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save fusion";
      notify.error(message);
    } finally {
      setSaving(false);
    }
  };

  const strategyPreview =
    form.triggers.mode === "always" ? "fusion" : "conditional-fusion";

  const strategyLabel = useMemo(() => {
    if (strategyPreview === "conditional-fusion") {
      return tx(t, "conditionalFusion", "Conditional Fusion");
    }
    return tx(t, "fusion", "Fusion");
  }, [strategyPreview, t]);

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (loadError && !isNew) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text-main">Fusion editor</h1>
          <Link href="/dashboard/fusions">
            <Button variant="secondary" icon="arrow_back">
              Back to Fusions
            </Button>
          </Link>
        </div>
        <Card padding="lg">
          <p className="text-sm text-red-600 dark:text-red-300">{loadError}</p>
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={() => void loadEditor()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="fusion-editor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-main">
            {isNew ? "New fusion" : "Edit fusion"}
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Configure panel models, judge, triggers, and tuning. Saves as combo strategy{" "}
            <code className="text-text-main">{strategyPreview}</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/fusions">
            <Button variant="secondary" icon="arrow_back">
              Back
            </Button>
          </Link>
          <Button icon="save" loading={saving} onClick={() => void handleSave()}>
            Save fusion
          </Button>
        </div>
      </div>

      {/* Basics */}
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-main">Basics</h2>
          <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-0.5 text-[11px] font-medium text-fuchsia-700 dark:text-fuchsia-300">
            {strategyLabel}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-main">
              {tx(t, "comboName", "Combo Name")}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder={tx(t, "comboNamePlaceholder", "my-fusion")}
              className="w-full text-sm py-2 px-2.5 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-text-main focus:border-primary focus:outline-none"
              data-testid="fusion-name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-main">
              {tx(t, "comboDescription", "Description")}
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              placeholder={tx(t, "comboDescriptionPlaceholder", "Optional")}
              className="w-full text-sm py-2 px-2.5 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-text-main focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Acting — Epic 0004: final voice / primary executor */}
      <Card padding="md" className="space-y-3" data-testid="fusion-acting">
        <div>
          <h2 className="text-sm font-semibold text-text-main">
            {tx(t, "fusionActingSection", "Acting")}
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            {tx(
              t,
              "fusionActingHelp",
              "Primary executor (e.g. builder). On trigger miss it answers alone; on fusion it receives the judge review and produces the final answer. Leave empty for legacy panels→judge final voice."
            )}
          </p>
        </div>
        <FusionUnitRow
          testId="fusion-acting-row"
          label={tx(t, "fusionActingUnit", "Acting unit")}
          unit={form.acting}
          comboRefs={comboRefs}
          excludeComboName={form.name.trim()}
          allowEmpty
          emptyHint="No acting — judge is final voice (legacy)"
          onChange={(unit) => updateForm({ acting: unit })}
          onPickModel={() => setPickerTarget({ scope: "acting" })}
        />
        <p className="text-[10px] text-text-muted">
          Flow:{" "}
          <span className="font-medium text-text-main">
            Acting → (trigger?) → Panels → Judge → Acting
          </span>
        </p>
      </Card>

      {/* Panels */}
      <Card padding="md" className="space-y-3" data-testid="fusion-panels">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text-main">
              {tx(t, "fusionPanels", "Panels")}
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              {tx(
                t,
                "fusionPanelsHelp",
                "Parallel consultors. Prefer combo-refs so each panel inherits failover and its own system prompt."
              )}
            </p>
          </div>
          <Button type="button" size="sm" icon="add" onClick={() => addPanel("model")}>
            {tx(t, "fusionAddPanel", "Add panel")}
          </Button>
        </div>

        {form.panels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/10 dark:border-white/10 px-4 py-6 text-center text-sm text-text-muted">
            No panels yet. Add a model or combo reference.
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
                onPickModel={() => setPickerTarget({ scope: "panel", index })}
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

      {/* Judge — Decision D1: separate section, not a panel role */}
      <Card padding="md" className="space-y-3" data-testid="fusion-judge">
        <div>
          <h2 className="text-sm font-semibold text-text-main">
            {tx(t, "fusionJudgeSection", "Judge")}
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            {tx(
              t,
              "fusionJudgeModelHelp",
              "Model or combo that synthesizes panel answers. Leave empty to use the first panel."
            )}
          </p>
        </div>
        <FusionUnitRow
          testId="fusion-judge-row"
          label={tx(t, "fusionJudgeModel", "Judge unit")}
          unit={form.judge}
          comboRefs={comboRefs}
          excludeComboName={form.name.trim()}
          allowEmpty
          emptyHint="Falls back to first panel"
          onChange={(unit) => updateForm({ judge: unit })}
          onPickModel={() => setPickerTarget({ scope: "judge" })}
        />
        <div className="rounded-md border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-text-muted">
            {tx(t, "fusionJudgeResolution", "Resolution preview")}
          </p>
          {(() => {
            const preview = resolutionPreview(form);
            return (
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
            );
          })()}
        </div>
      </Card>

      {/* Triggers — Decision D7 */}
      <Card padding="md" className="space-y-3" data-testid="fusion-triggers">
        <div>
          <h2 className="text-sm font-semibold text-text-main">
            {tx(t, "fusionTriggers", "Triggers")}
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            {tx(
              t,
              "fusionTriggersHelp",
              "When to run fusion. Non-always modes save as conditional-fusion with a non-fusion fallback."
            )}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-main">
            {tx(t, "fusionTriggerMode", "Mode")}
          </label>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label={tx(t, "fusionTriggerMode", "Mode")}
          >
            {(
              [
                { value: "always", label: tx(t, "fusionTriggerAlways", "Always") },
                { value: "tool-call", label: tx(t, "fusionTriggerToolCall", "Tool call") },
                { value: "text-match", label: tx(t, "fusionTriggerTextMatch", "Text match") },
              ] as const
            ).map((opt) => {
              const selected = form.triggers.mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-pressed={selected}
                  data-testid={`fusion-trigger-${opt.value}`}
                  onClick={() =>
                    updateForm({
                      triggers: { ...form.triggers, mode: opt.value as TriggerMode },
                    })
                  }
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300"
                      : "border-black/10 dark:border-white/10 text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
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
            label={tx(t, "fusionToolPatterns", "Tool patterns")}
            help={tx(
              t,
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
            label={tx(t, "fusionTextPatterns", "Text patterns")}
            help={tx(
              t,
              "fusionTextPatternsHelp",
              "Substring or glob patterns matched against the user message."
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
              {tx(t, "fusionFallbackStrategy", "Fallback strategy")}
            </label>
            <p className="text-[11px] text-text-muted">
              {tx(
                t,
                "fusionFallbackStrategyHelp",
                "Used when triggers do not match. Fusion strategies are excluded (no recursion)."
              )}
            </p>
            <select
              value={form.fallbackStrategy}
              onChange={(e) => updateForm({ fallbackStrategy: e.target.value })}
              className="w-full max-w-md text-xs py-2 px-2.5 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-text-main focus:border-primary focus:outline-none"
            >
              {FALLBACK_STRATEGY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {tx(t, opt.labelKey, opt.value)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </Card>

      {/* Tuning accordion */}
      <Collapsible
        title={tx(t, "fusionTuning", "Tuning")}
        subtitle={tx(
          t,
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
              {tx(t, "fusionMinPanel", "Min panel")}
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
              className="w-full text-xs py-2 px-2.5 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-text-main focus:border-primary focus:outline-none"
            />
            <p className="text-[10px] text-text-muted">
              {tx(
                t,
                "fusionMinPanelHelp",
                "Successful panel answers required before stragglers get a grace window (default 2)."
              )}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-main">
              {tx(t, "fusionStragglerGraceMs", "Straggler grace (ms)")}
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
              className="w-full text-xs py-2 px-2.5 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-text-main focus:border-primary focus:outline-none"
            />
            <p className="text-[10px] text-text-muted">
              {tx(
                t,
                "fusionStragglerGraceMsHelp",
                "How long to wait for slow panel models once quorum is reached (default 8000)."
              )}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-main">
              {tx(t, "fusionPanelHardTimeoutMs", "Panel hard timeout (ms)")}
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
              className="w-full text-xs py-2 px-2.5 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-text-main focus:border-primary focus:outline-none"
            />
            <p className="text-[10px] text-text-muted">
              {tx(
                t,
                "fusionPanelHardTimeoutMsHelp",
                "Absolute cap so one hung model can't stall the whole panel (default 90000)."
              )}
            </p>
          </div>
        </div>
      </Collapsible>

      <div className="flex justify-end gap-2">
        <Link href="/dashboard/fusions">
          <Button variant="secondary">Cancel</Button>
        </Link>
        <Button icon="save" loading={saving} onClick={() => void handleSave()}>
          Save fusion
        </Button>
      </div>

      <ModelSelectModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={applyPickedModel}
        activeProviders={activeProviders}
        modelAliases={modelAliases}
        title={
          pickerTarget?.scope === "judge"
            ? tx(t, "fusionJudgeModel", "Select judge model")
            : pickerTarget?.scope === "acting"
              ? tx(t, "fusionActingUnit", "Select acting model")
              : tx(t, "addModelToCombo", "Select panel model")
        }
        showCombos={false}
        keepOpenOnSelect={false}
      />
    </div>
  );
}
