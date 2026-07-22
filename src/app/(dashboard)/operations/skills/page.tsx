import SkillsStackPageClient from "./SkillsStackPageClient";

/**
 * EPIC-20 T20-H / Task 0093 — Skills peer under Operations shell.
 * Canonical path: `buildOperationsPath("skills")` → `/operations/skills`.
 *
 * Chrome: Ops hub topbar is layout-owned (`operations/layout.tsx`).
 * This page mounts **only** Core Skills → Agent Skills stack content.
 */
export default function OperationsSkillsPage() {
  return <SkillsStackPageClient />;
}
