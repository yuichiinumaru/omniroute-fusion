"use client";

import Link from "next/link";
import { cn } from "@/shared/utils/cn";
import {
  HUB_SUBNAV_ACTIVE_CLASS,
  HUB_SUBNAV_INACTIVE_CLASS,
  HUB_SUBNAV_ITEM_BASE_CLASS,
  HUB_SUBNAV_SHELL_CLASS,
} from "@/shared/constants/hubSubnavStyles";

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
      className={HUB_SUBNAV_SHELL_CLASS}
      data-routing-hub-subnav={active}
    >
      {LINKS.map((link) => {
        const isActive = link.id === active;
        return (
          <Link
            key={link.id}
            href={link.href}
            className={cn(
              HUB_SUBNAV_ITEM_BASE_CLASS,
              isActive ? HUB_SUBNAV_ACTIVE_CLASS : HUB_SUBNAV_INACTIVE_CLASS
            )}
            aria-current={isActive ? "page" : undefined}
            data-routing-hub-link={link.id}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
