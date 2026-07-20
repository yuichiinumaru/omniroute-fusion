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
import { CardSkeleton } from "@/shared/components/Loading";
import RoutingHubSubnav from "@/shared/components/RoutingHubSubnav";
import { useNotificationStore } from "@/store/notificationStore";
import FusionTriggersSection from "./FusionTriggersSection";
import FusionTuningSection from "./FusionTuningSection";
import FusionUnitsSections from "./FusionUnitsSections";
import {
  buildSavePayload,
  emptyFusionForm,
  formFromCombo,
  parseApiError,
  uniqueFusionName,
  type ComboRecord,
  type ComboRefOption,
  type FusionEditorForm,
  type FusionUnit,
} from "./fusionEditorTypes";

const ModelSelectModal = dynamic(() => import("@/shared/components/ModelSelectModal"), {
  ssr: false,
});

type PickerTarget =
  | { scope: "panel"; index: number }
  | { scope: "judge" }
  | { scope: "acting" }
  | null;

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
    // ModelSelectModal currently emits value + providerId (no account pin).
    // When connectionId is present on the pick (or a single active connection
    // matches the provider), plumb it so load/save round-trips the pin.
    let connectionId: string | null | undefined;
    if (typeof rec?.connectionId === "string" && rec.connectionId.trim()) {
      connectionId = rec.connectionId.trim();
    } else if (rec?.connectionId === null) {
      connectionId = null;
    } else if (providerId) {
      const matches = activeProviders.filter((p) => p.provider === providerId && p.id != null);
      if (matches.length === 1) {
        connectionId = String(matches[0].id);
      }
    }
    const unit: FusionUnit = {
      kind: "model",
      model: qualified,
      ...(providerId ? { providerId } : {}),
      ...(connectionId !== undefined ? { connectionId } : {}),
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
      notify.error(tx(t, "fusionPanelRequired", "Add at least one panel model or combo ref"));
      return;
    }
    const incompletePanel = form.panels.some(
      (p) =>
        (p.kind === "model" && !p.model.trim()) ||
        (p.kind === "combo-ref" && !p.comboName.trim())
    );
    if (incompletePanel) {
      notify.error(
        tx(t, "fusionPanelIncomplete", "Every panel needs a model or combo reference")
      );
      return;
    }
    if (
      form.judge?.kind === "model" &&
      form.judge.model !== undefined &&
      form.judge.model.trim() === ""
    ) {
      notify.error(
        tx(t, "fusionJudgeEmpty", "Judge model is empty — clear it or pick a model")
      );
      return;
    }
    if (form.judge?.kind === "combo-ref" && !form.judge.comboName.trim()) {
      notify.error(
        tx(t, "fusionJudgeComboEmpty", "Judge combo ref is empty — clear it or pick a combo")
      );
      return;
    }
    if (form.triggers.mode === "text-match" && form.triggers.textPatterns.length === 0) {
      notify.error(
        tx(t, "fusionTextPatternRequired", "Add at least one text pattern for text-match triggers")
      );
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

  // Hooks must run before any conditional return (rules-of-hooks).
  const tKey = useCallback(
    (key: string, fallback: string) => tx(t, key, fallback),
    [t]
  );

  // Task 0075: shared Routing hub strip for create + edit (list already mounts it).
  // Prefer one mount in this client so new/[id] inherit without divergent page markup.
  const routingHub = <RoutingHubSubnav active="fusions" />;

  if (loading) {
    return (
      <div className="space-y-6">
        {routingHub}
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (loadError && !isNew) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text-main">
            {tKey("fusionEditTitle", "Fusion editor")}
          </h1>
          <Link href="/dashboard/fusions">
            <Button variant="secondary" icon="arrow_back">
              {tKey("fusionBack", "Back")}
            </Button>
          </Link>
        </div>
        {routingHub}
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
            {isNew
              ? tKey("fusionNewTitle", "New fusion")
              : tKey("fusionEditTitle", "Edit fusion")}
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {tKey(
              "fusionEditorSubtitle",
              "Configure panel models, judge, triggers, and tuning. Saves as combo strategy"
            )}{" "}
            <code className="text-text-main">{strategyPreview}</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/fusions">
            <Button variant="secondary" icon="arrow_back">
              {tKey("fusionBack", "Back")}
            </Button>
          </Link>
          <Button icon="save" loading={saving} onClick={() => void handleSave()}>
            {tKey("fusionSave", "Save fusion")}
          </Button>
        </div>
      </div>

      {routingHub}

      <FusionUnitsSections
        form={form}
        comboRefs={comboRefs}
        strategyLabel={strategyLabel}
        updateForm={updateForm}
        addPanel={addPanel}
        setPanel={setPanel}
        movePanel={movePanel}
        onPickModel={setPickerTarget}
        tx={tKey}
      />
      <FusionTriggersSection form={form} updateForm={updateForm} tx={tKey} />
      <FusionTuningSection form={form} updateForm={updateForm} tx={tKey} />

      <div className="flex justify-end gap-2">
        <Link href="/dashboard/fusions">
          <Button variant="secondary">{tKey("fusionCancel", "Cancel")}</Button>
        </Link>
        <Button icon="save" loading={saving} onClick={() => void handleSave()}>
          {tKey("fusionSave", "Save fusion")}
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
