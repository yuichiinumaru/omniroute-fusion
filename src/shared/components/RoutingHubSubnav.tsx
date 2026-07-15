"use client";

import Link from "next/link";
import { cn } from "@/shared/utils/cn";

/**
 * In-page Routing hub subnav (Task 0025 F2 + Task 0058).
 * Flat sidebar keeps a single "Routing" leaf (`combos`); Combos / Fusions /
 * Live / Compression Settings / Compression Studio are discovered here (and via
 * command palette), not as peer sidebar leaves.
 */
export type RoutingHubActive =
  | "combos"
  | "fusions"
  | "live"
  | "compression-settings"
  | "compression-studio";

const LINKS: Array<{
  id: RoutingHubActive;
  href: string;
  label: string;
  icon: string;
}> = [
  { id: "combos", href: "/dashboard/combos", label: "Combos", icon: "layers" },
  { id: "fusions", href: "/dashboard/fusions", label: "Fusions", icon: "hub" },
  { id: "live", href: "/dashboard/combos/live", label: "Live", icon: "sensors" },
  {
    id: "compression-settings",
    href: "/dashboard/context/settings",
    label: "Compression Settings",
    icon: "tune",
  },
  {
    id: "compression-studio",
    href: "/dashboard/compression/studio",
    label: "Compression Studio",
    icon: "compress",
  },
];

export default function RoutingHubSubnav({ active }: { active: RoutingHubActive }) {
  return (
    <nav
      aria-label="Routing sections"
      className="flex flex-wrap items-center gap-1 rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-1"
      data-routing-hub-subnav={active}
    >
      {LINKS.map((link) => {
        const isActive = link.id === active;
        return (
          <Link
            key={link.id}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
              isActive
                ? "border border-primary/20 bg-primary/10 text-primary"
                : "border border-transparent text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-main"
            )}
            aria-current={isActive ? "page" : undefined}
            data-routing-hub-link={link.id}
          >
            <span className="material-symbols-outlined text-[16px]">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
