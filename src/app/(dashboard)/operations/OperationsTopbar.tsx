"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import {
  HUB_SUBNAV_ACTIVE_CLASS,
  HUB_SUBNAV_INACTIVE_CLASS,
  HUB_SUBNAV_ITEM_BASE_CLASS,
  HUB_SUBNAV_SHELL_CLASS,
} from "@/shared/constants/hubSubnavStyles";
import {
  OPERATIONS_DEFAULT_TOPBAR_ID,
  OPERATIONS_HUB_PATH,
  OPERATIONS_TOPBAR_IDS,
  OPERATIONS_TOPBAR_LABELS,
  buildOperationsPath,
  isOperationsTopbarId,
  type OperationsTopbarId,
} from "@/shared/constants/epic20Operations";

/**
 * EPIC-20 T20-B / Task 0087 — single Operations hub topbar.
 * Exactly one strip on every `/operations/*` surface (layout-mounted).
 * Peers + hrefs come only from epic20Operations SSoT (0086).
 */

const TOPBAR_ICONS: Readonly<Record<OperationsTopbarId, string>> = {
  endpoints: "api",
  "core-mcp": "hub",
  agents: "smart_toy",
  "cloud-agents": "cloud",
  "a2a-acp-bridge": "device_hub",
  skills: "auto_awesome",
  integrations: "extension",
  memory: "psychology",
  labs: "science",
  media: "image",
};

/**
 * Resolve active peer from pathname.
 * Hub root `/operations` highlights `OPERATIONS_DEFAULT_TOPBAR_ID` (endpoints).
 */
export function resolveOperationsTopbarActive(
  pathname: string | null | undefined
): OperationsTopbarId {
  if (!pathname) return OPERATIONS_DEFAULT_TOPBAR_ID;
  if (pathname === OPERATIONS_HUB_PATH || pathname === `${OPERATIONS_HUB_PATH}/`) {
    return OPERATIONS_DEFAULT_TOPBAR_ID;
  }
  if (pathname.startsWith(`${OPERATIONS_HUB_PATH}/`)) {
    const segment = pathname.slice(OPERATIONS_HUB_PATH.length + 1).split("/")[0] ?? "";
    if (isOperationsTopbarId(segment)) return segment;
  }
  return OPERATIONS_DEFAULT_TOPBAR_ID;
}

export default function OperationsTopbar({
  active: activeProp,
}: {
  /** Optional override; defaults to pathname resolution. */
  active?: OperationsTopbarId;
}) {
  const pathname = usePathname();
  const active = activeProp ?? resolveOperationsTopbarActive(pathname);

  return (
    <nav
      aria-label="Operations navigation"
      className={cn(HUB_SUBNAV_SHELL_CLASS, "overflow-x-auto shrink-0 mb-4")}
      data-operations-topbar={active}
      data-testid="operations-topbar"
    >
      {OPERATIONS_TOPBAR_IDS.map((id) => {
        const isActive = id === active;
        const href = buildOperationsPath(id);
        return (
          <Link
            key={id}
            href={href}
            className={cn(
              "focus-ring shrink-0",
              HUB_SUBNAV_ITEM_BASE_CLASS,
              isActive ? HUB_SUBNAV_ACTIVE_CLASS : HUB_SUBNAV_INACTIVE_CLASS
            )}
            aria-current={isActive ? "page" : undefined}
            data-operations-topbar-link={id}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {TOPBAR_ICONS[id]}
            </span>
            <span>{OPERATIONS_TOPBAR_LABELS[id]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
