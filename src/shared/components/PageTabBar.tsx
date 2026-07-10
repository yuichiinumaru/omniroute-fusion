"use client";

import { cn } from "@/shared/utils/cn";

export interface PageTabBarOption {
  value: string;
  label: string;
  icon?: string;
}

export interface PageTabBarProps {
  options: PageTabBarOption[];
  value: string;
  onChange: (value: string) => void;
  /**
   * When a string, writes the selection to `window.history` search params
   * (default `"tab"`). Pass `false` for pure controlled mode with no URL writes.
   */
  syncSearchParam?: string | false;
  /**
   * When the selected value equals this, the search param is deleted instead of set
   * (hub default tab pattern used by Analytics overview).
   */
  defaultValue?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * Replace or delete a single URL search param without navigation (SSR-safe no-op).
 * Used by PageTabBar URL sync and available for call sites that need custom cleanup.
 */
export function writeTabSearchParam(
  paramName: string,
  nextValue: string,
  options?: { defaultValue?: string; deleteParams?: string[] }
): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (options?.defaultValue !== undefined && nextValue === options.defaultValue) {
    url.searchParams.delete(paramName);
  } else {
    url.searchParams.set(paramName, nextValue);
  }
  for (const extra of options?.deleteParams ?? []) {
    url.searchParams.delete(extra);
  }
  window.history.replaceState(null, "", url.toString());
}

/**
 * Hub-style page tab bar (Analytics / Observe / nested settings).
 * Controlled via `value` + `onChange`; optional `?tab=` (or custom) URL sync.
 */
export default function PageTabBar({
  options,
  value,
  onChange,
  syncSearchParam = "tab",
  defaultValue,
  "aria-label": ariaLabel,
  className,
}: PageTabBarProps) {
  const handleSelect = (next: string) => {
    if (syncSearchParam !== false) {
      writeTabSearchParam(syncSearchParam, next, { defaultValue });
    }
    onChange(next);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1",
        className
      )}
    >
      {options.map((tab) => {
        const selected = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => handleSelect(tab.value)}
            className={cn(
              "focus-ring inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
              selected
                ? "bg-surface text-text-main shadow-sm"
                : "text-text-muted hover:bg-surface/70 hover:text-text-main"
            )}
          >
            {tab.icon ? (
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {tab.icon}
              </span>
            ) : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
