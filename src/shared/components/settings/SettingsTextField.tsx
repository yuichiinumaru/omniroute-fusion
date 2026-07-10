"use client";

import { useId } from "react";
import { cn } from "@/shared/utils/cn";
import SettingsFieldRow from "./SettingsFieldRow";

export interface SettingsTextFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number" | "email" | "url";
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  name?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}

/**
 * Typed text/number/password field using SettingsFieldRow density.
 */
export default function SettingsTextField({
  label,
  description,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  autoComplete,
  className,
  inputClassName,
  id: externalId,
  name,
  min,
  max,
  step,
}: SettingsTextFieldProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;

  return (
    <SettingsFieldRow
      label={label}
      description={description}
      htmlFor={inputId}
      disabled={disabled}
      className={className}
    >
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
        className={cn(
          "w-full text-sm bg-surface-alt border border-border rounded px-3 py-2",
          "text-text-main placeholder:text-text-muted",
          "focus:outline-none focus:border-primary",
          "disabled:opacity-60",
          inputClassName
        )}
      />
    </SettingsFieldRow>
  );
}
