"use client";

import OperationsTopbar from "./OperationsTopbar";

/**
 * EPIC-20 T20-B / Task 0087 — Operations hub shell.
 * Mounts **exactly one** Operations topbar for every `/operations/*` child.
 * Content fusions (0088+) render as `{children}` only — do not re-mount topbar.
 */
export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6" data-operations-shell="">
      <OperationsTopbar />
      {children}
    </div>
  );
}
