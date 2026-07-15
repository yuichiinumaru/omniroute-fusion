"use client";

import type { ProviderDisplayMode } from "../providerPageStorage";

type ProviderMessageTranslator = ((key: string, values?: Record<string, unknown>) => string) & {
  has?: (key: string) => boolean;
};

function providerText(
  t: ProviderMessageTranslator,
  key: string,
  fallback: string,
  values?: Record<string, unknown>
): string {
  if (typeof t.has === "function" && t.has(key)) {
    return t(key, values);
  }
  if (values) {
    return Object.entries(values).reduce(
      (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
      fallback
    );
  }
  return fallback;
}

interface ProviderDisplayModeControlProps {
  mode: ProviderDisplayMode;
  onChange(mode: ProviderDisplayMode): void;
  t: ProviderMessageTranslator;
}

export default function ProviderDisplayModeControl({
  mode,
  onChange,
  t,
}: ProviderDisplayModeControlProps) {
  const options: Array<{
    mode: ProviderDisplayMode;
    label: string;
    icon: string;
    disabled?: boolean;
    title: string;
  }> = [
    {
      mode: "grid",
      label: providerText(t, "providerDisplayModeGrid", "Grid"),
      icon: "view_module",
      title: providerText(
        t,
        "providerDisplayModeGridDesc",
        "Show every provider in grouped sections as cards."
      ),
    },
    {
      mode: "list",
      label: providerText(t, "providerDisplayModeList", "List"),
      icon: "view_agenda",
      title: providerText(
        t,
        "providerDisplayModeListDesc",
        "Show one provider per row in a compact list."
      ),
    },
  ];

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-bg-subtle p-0.5"
      role="radiogroup"
      aria-label={providerText(t, "providerDisplayMode", "Provider display mode")}
      data-testid="provider-display-mode-control"
    >
      {options.map((option) => {
        const isActive = mode === option.mode;
        return (
          <label
            key={option.mode}
            title={option.title}
            data-testid={`provider-display-mode-${option.mode}`}
            data-active={isActive ? "true" : "false"}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-bg-primary text-text-main shadow-sm"
                : "text-text-muted hover:bg-bg-primary/70 hover:text-text-main"
            } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <input
              type="radio"
              name="provider-display-mode"
              value={option.mode}
              checked={isActive}
              disabled={option.disabled}
              onChange={() => onChange(option.mode)}
              className="sr-only"
              aria-label={option.title}
            />
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              {option.icon}
            </span>
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
