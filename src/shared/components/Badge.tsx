"use client";

import { cn } from "@/shared/utils/cn";
import {
  resolveStatusVocabulary,
  type StatusBadgeVariant,
} from "@/shared/constants/statusVocabulary";

const variants = {
  default: "bg-black/5 dark:bg-white/10 text-text-muted",
  primary: "bg-primary/10 text-primary",
  success: "bg-green-500/10 text-green-600 dark:text-green-400",
  warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

interface BadgeProps {
  children?: React.ReactNode;
  variant?: keyof typeof variants;
  /**
   * Optional status vocabulary id (healthy / degraded / offline / OPEN / …).
   * When set, resolves tone via `statusVocabulary` and overrides `variant`
   * unless an explicit `variant` is also provided (variant wins for BC).
   */
  status?: string | null;
  size?: keyof typeof sizes;
  dot?: boolean;
  icon?: React.ReactNode;
  /**
   * Soft glow for health / circuit-breaker emphasis only.
   * Uses vocabulary glow budget — no-op for neutral statuses.
   */
  glow?: boolean;
  className?: string;
}

function resolveVariant(
  variant: keyof typeof variants | undefined,
  status: string | null | undefined
): StatusBadgeVariant {
  if (variant) return variant;
  if (status != null && status !== "") {
    return resolveStatusVocabulary(status).badgeVariant;
  }
  return "default";
}

export default function Badge({
  children,
  variant,
  status,
  size = "md",
  dot = false,
  icon,
  glow = false,
  className,
}: BadgeProps) {
  const resolved = resolveVariant(variant, status);
  const vocab = status != null && status !== "" ? resolveStatusVocabulary(status) : null;
  const glowClass = glow && vocab ? vocab.glowClass : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        variants[resolved],
        sizes[size],
        glowClass,
        className
      )}
      data-status={vocab?.id}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            resolved === "success" && "bg-green-500",
            resolved === "warning" && "bg-yellow-500",
            resolved === "error" && "bg-red-500",
            resolved === "info" && "bg-blue-500",
            resolved === "primary" && "bg-primary",
            resolved === "default" && "bg-gray-500"
          )}
        />
      )}
      {icon && (
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
