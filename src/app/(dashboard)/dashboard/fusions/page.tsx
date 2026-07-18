"use client";

// Fusions list shell (Task 0015). Full editor is Task 0016.

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/shared/components/Button";
import Card from "@/shared/components/Card";
import EmptyState from "@/shared/components/EmptyState";
import { CardSkeleton } from "@/shared/components/Loading";
import { useNotificationStore } from "@/store/notificationStore";
import RoutingHubSubnav from "@/shared/components/RoutingHubSubnav";
import { filterFusionCombos } from "./fusionEditorTypes";

type FusionCombo = {
  id: string;
  name: string;
  strategy?: string;
  models?: Array<string | Record<string, unknown>>;
  isHidden?: boolean;
  description?: string | null;
};

type FeedbackState = { type: "success" | "error"; message: string } | null;

function panelCount(combo: FusionCombo): number {
  return Array.isArray(combo.models) ? combo.models.length : 0;
}

function strategyLabel(strategy: string | undefined): string {
  if (strategy === "conditional-fusion") return "Conditional Fusion";
  if (strategy === "fusion") return "Fusion";
  return strategy || "Unknown";
}

function strategyBadgeClass(strategy: string | undefined): string {
  if (strategy === "conditional-fusion") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  }
  return "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30";
}

export default function FusionsPage() {
  const router = useRouter();
  const notify = useNotificationStore();

  const [combos, setCombos] = useState<FusionCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadFusions = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/combos");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Failed to load fusions"
        );
      }
      const all = Array.isArray(data.combos) ? (data.combos as FusionCombo[]) : [];
      setCombos(filterFusionCombos(all));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load fusions";
      setFeedback({ type: "error", message });
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadFusions();
  }, [loadFusions]);

  const sortedFusions = useMemo(
    () => [...combos].sort((a, b) => a.name.localeCompare(b.name)),
    [combos]
  );

  const handleCreate = () => {
    router.push("/dashboard/fusions/new");
  };

  const openFusion = (id: string) => {
    router.push(`/dashboard/fusions/${id}`);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFusion(id);
    }
  };

  const handleDelete = async (combo: FusionCombo) => {
    if (!confirm(`Delete fusion "${combo.name}"? This cannot be undone.`)) return;
    setDeletingId(combo.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/combos/${combo.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Failed to delete fusion"
        );
      }
      setCombos((prev) => prev.filter((c) => c.id !== combo.id));
      notify.success(`Deleted fusion "${combo.name}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete fusion";
      setFeedback({ type: "error", message });
      notify.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-main">Fusions</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Panel + judge model combos. Parallel panel answers, one synthesized result.
          </p>
        </div>
        <Button icon="add" onClick={handleCreate}>
          Create Fusion
        </Button>
      </div>

      <RoutingHubSubnav active="fusions" />

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : sortedFusions.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon="🔮"
            title="No fusions yet"
            description="Create a fusion combo to fan prompts across panel models and synthesize one answer with a judge."
            actionLabel="Create Fusion"
            onAction={handleCreate}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedFusions.map((combo) => {
            const count = panelCount(combo);
            return (
              <Card
                key={combo.id}
                hover
                padding="md"
                className="flex flex-col gap-4"
                role="link"
                tabIndex={0}
                aria-label={`Edit fusion ${combo.name}`}
                onClick={() => openFusion(combo.id)}
                onKeyDown={(event) => handleCardKeyDown(event, combo.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-text-main">{combo.name}</h2>
                    {combo.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-text-muted">{combo.description}</p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${strategyBadgeClass(
                      combo.strategy
                    )}`}
                  >
                    {strategyLabel(combo.strategy)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                  <span>
                    {count} panel model{count === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/fusions/${combo.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex"
                  >
                    <Button variant="secondary" size="sm" icon="edit">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    icon="delete"
                    loading={deletingId === combo.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(combo);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
