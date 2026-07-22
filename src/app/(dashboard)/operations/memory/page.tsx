import MemoryPageClient from "../../dashboard/memory/MemoryPageClient";

/**
 * EPIC-20 T20-J / Task 0095 — Memory peer under Operations shell.
 * Canonical path: `buildOperationsPath("memory")` → `/operations/memory`.
 *
 * Chrome: Ops hub topbar is layout-owned (`operations/layout.tsx`).
 * This page mounts **only** Memory stacked content — no second tab topbar.
 */
export default function OperationsMemoryPage() {
  return <MemoryPageClient />;
}
