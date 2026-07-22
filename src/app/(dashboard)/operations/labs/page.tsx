import { Suspense } from "react";
import LabsPageClient from "./LabsPageClient";

/**
 * EPIC-20 T20-K / Task 0096 — Labs peer under Operations shell.
 * Canonical path: `buildOperationsPath("labs")` → `/operations/labs`.
 *
 * Chrome: Ops hub topbar is layout-owned (`operations/layout.tsx`).
 * This page mounts **only** Labs fusion content — no second hub topbar,
 * no StudioTopBar / SearchToolsTopBar as L1 hub strips.
 */
export default function OperationsLabsPage() {
  return (
    <Suspense fallback={null}>
      <LabsPageClient />
    </Suspense>
  );
}
