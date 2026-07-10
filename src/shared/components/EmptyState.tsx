"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";
import Button from "./Button";

/**
 * EmptyState — dashboard empty placeholder (token-aware Tailwind).
 *
 * Usage:
 *   <EmptyState
 *     icon="inbox"
 *     title="No providers yet"
 *     description="Add your first API provider to get started."
 *     actionLabel="Add Provider"
 *     onAction={() => router.push('/providers/add')}
 *   />
 */

interface EmptyStateProps {
  /** Material Symbol name or emoji/string glyph. */
  icon?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: (() => void) | null;
  className?: string;
}

function isMaterialIcon(icon: string): boolean {
  // Material symbols are snake_case identifiers; emoji / multi-byte glyphs are not.
  return /^[a-z0-9_]+$/i.test(icon);
}

export default function EmptyState({
  icon = "inbox",
  title,
  description = "",
  actionLabel = "",
  onAction = null,
  className,
}: EmptyStateProps) {
  const t = useTranslations("common");
  const resolvedTitle = title ?? t("nothingHere");
  const material = isMaterialIcon(icon);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "min-h-[200px] px-6 py-12",
        className
      )}
    >
      <div
        className="mb-4 text-text-muted opacity-80 motion-safe:animate-[emptyBounce_2s_ease-in-out_infinite]"
        role="img"
        aria-hidden="true"
      >
        {material ? (
          <span className="material-symbols-outlined text-[48px] leading-none">{icon}</span>
        ) : (
          <span className="text-5xl leading-none">{icon}</span>
        )}
      </div>
      <h3 className="m-0 text-lg font-semibold text-text-main">{resolvedTitle}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
      <style>{`
        @keyframes emptyBounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-\\[emptyBounce_2s_ease-in-out_infinite\\] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
