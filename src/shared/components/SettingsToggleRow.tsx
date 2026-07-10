"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import Toggle from "./Toggle";

export interface SettingsToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  /** Extra control on the right instead of the shared Toggle (escape hatch). */
  control?: ReactNode;
  id?: string;
}

/**
 * Standard settings row: label + optional description on the left, Toggle on the right.
 * Prefer this over hand-rolled `role="switch"` pills in new settings UI.
 */
export default function SettingsToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = "md",
  className,
  control,
  id,
}: SettingsToggleRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-surface/40",
        disabled && "opacity-60",
        className
      )}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <p id={id ? `${id}-label` : undefined} className="text-sm font-medium text-text-main">
          {label}
        </p>
        {description ? <p className="text-xs text-text-muted">{description}</p> : null}
      </div>
      {control ?? (
        <Toggle
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          size={size}
          ariaLabel={label}
          className="shrink-0"
        />
      )}
    </div>
  );
}
