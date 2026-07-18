"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { cn } from "@/shared/utils/cn";
import {
  HUB_SUBNAV_ACTIVE_CLASS,
  HUB_SUBNAV_INACTIVE_CLASS,
  HUB_SUBNAV_ITEM_BASE_CLASS,
  HUB_SUBNAV_SHELL_CLASS,
} from "@/shared/constants/hubSubnavStyles";

export interface PageTabBarOption {
  value: string;
  label: string;
  icon?: string;
  /** Optional panel id for `aria-controls` when the tab owns a region. */
  panelId?: string;
}

export interface PageTabBarProps {
  /** Tab descriptors; readonly so hub SSoT arrays can pass through without spread. */
  options: readonly PageTabBarOption[];
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
  /**
   * Extra search params to drop on every tab write (single replaceState).
   * Static list or per-next-value resolver — e.g. drop route-trace `id` when leaving.
   */
  deleteParams?: string[] | ((nextValue: string) => string[]);
  "aria-label"?: string;
  className?: string;
  variant?: "default" | "subnav";
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
 * ArrowLeft/Right + Home/End move focus and selection (WAI-ARIA tabs pattern).
 */
export default function PageTabBar({
  options,
  value,
  onChange,
  syncSearchParam = "tab",
  defaultValue,
  deleteParams,
  "aria-label": ariaLabel,
  className,
  variant = "default",
}: PageTabBarProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleSelect = useCallback(
    (next: string) => {
      if (syncSearchParam !== false) {
        const extras =
          typeof deleteParams === "function" ? deleteParams(next) : (deleteParams ?? []);
        writeTabSearchParam(syncSearchParam, next, {
          defaultValue,
          deleteParams: extras,
        });
      }
      onChange(next);
    },
    [syncSearchParam, defaultValue, deleteParams, onChange]
  );

  const focusTabAt = useCallback(
    (index: number) => {
      const len = options.length;
      if (len === 0) return;
      const nextIndex = ((index % len) + len) % len;
      const el = tabRefs.current[nextIndex];
      el?.focus();
      const nextValue = options[nextIndex]?.value;
      if (nextValue !== undefined) {
        handleSelect(nextValue);
      }
    },
    [options, handleSelect]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = options.findIndex((tab) => tab.value === value);
      if (currentIndex < 0) return;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          focusTabAt(currentIndex + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          focusTabAt(currentIndex - 1);
          break;
        case "Home":
          event.preventDefault();
          focusTabAt(0);
          break;
        case "End":
          event.preventDefault();
          focusTabAt(options.length - 1);
          break;
        default:
          break;
      }
    },
    [options, value, focusTabAt]
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        variant === "subnav"
          ? HUB_SUBNAV_SHELL_CLASS
          : "flex flex-wrap items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1",
        className
      )}
    >
      {options.map((tab, index) => {
        const selected = value === tab.value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tab.panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => handleSelect(tab.value)}
            className={cn(
              // subnav: full Routing hub item base (focus ring + density); default: Analytics gray chip.
              variant === "subnav"
                ? HUB_SUBNAV_ITEM_BASE_CLASS
                : "focus-ring inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-all",
              selected
                ? variant === "subnav"
                  ? HUB_SUBNAV_ACTIVE_CLASS
                  : "bg-surface text-text-main shadow-sm"
                : variant === "subnav"
                  ? HUB_SUBNAV_INACTIVE_CLASS
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
