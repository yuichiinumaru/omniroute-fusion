"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

export interface SettingsFieldRowProps {
  label: string;
  description?: string;
  /** Control slot (input, select, number field, custom). */
  children: ReactNode;
  /** Associate label with control when the control has a matching id. */
  htmlFor?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Non-boolean settings row: label + optional description + control slot.
 * Matches SettingsToggleRow surface tokens (border, padding, muted description).
 * Prefer stacking full-width controls (text/select/number) in the children slot.
 */
export default function SettingsFieldRow({
  label,
  description,
  children,
  htmlFor,
  disabled = false,
  className,
  id,
}: SettingsFieldRowProps) {
  const labelId = id ? `${id}-label` : undefined;

  return (
    <div
      id={id}
      className={cn(
        "flex flex-col gap-2 p-3 rounded-lg border border-border bg-surface/40",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
      aria-disabled={disabled || undefined}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {htmlFor ? (
          <label
            id={labelId}
            htmlFor={htmlFor}
            className="text-sm font-medium text-text-main"
          >
            {label}
          </label>
        ) : (
          <p id={labelId} className="text-sm font-medium text-text-main">
            {label}
          </p>
        )}
        {description ? <p className="text-xs text-text-muted">{description}</p> : null}
      </div>
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );
}
