"use client";

import { useState } from "react";
import Button from "@/shared/components/Button";

/**
 * Tag-style pattern editor for fusion triggers (tool globs / text substrings).
 * Extracted from FusionEditorClient so the editor stays orchestration-sized.
 */
export default function PatternTagInput({
  label,
  help,
  values,
  placeholder,
  onChange,
  testId,
}: {
  label: string;
  help?: string;
  values: string[];
  placeholder?: string;
  onChange: (next: string[]) => void;
  testId?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const next = draft.trim();
    if (!next) return;
    if (values.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...values, next]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <label className="text-xs font-medium text-text-main">{label}</label>
      {help ? <p className="text-[11px] text-text-muted">{help}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {values.map((pattern) => (
          <span
            key={pattern}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/[0.03] dark:bg-white/[0.04] px-2 py-0.5 text-[11px] text-text-main"
          >
            {pattern}
            <button
              type="button"
              className="text-text-muted hover:text-red-500"
              aria-label={`Remove ${pattern}`}
              onClick={() => onChange(values.filter((p) => p !== pattern))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          placeholder={placeholder || "pattern"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="flex-1 text-xs py-2 px-2.5 rounded border border-white/10 bg-white/5 text-text-main focus:border-primary focus:outline-none"
        />
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}
