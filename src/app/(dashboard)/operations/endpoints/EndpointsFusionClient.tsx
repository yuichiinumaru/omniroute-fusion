"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import ApiManagerPageClient from "@/app/(dashboard)/dashboard/api-manager/ApiManagerPageClient";
import EndpointPageClient from "@/app/(dashboard)/dashboard/endpoint/EndpointPageClient";
import ApiEndpointsTab from "@/app/(dashboard)/dashboard/endpoint/ApiEndpointsTab";

/**
 * EPIC-20 T20-C / Task 0088 — Endpoint fusion body for `/operations/endpoints`.
 *
 * Vertical stack only (Keys → APIs → Catalog). Does **not** mount OperationsTopbar
 * (shell layout owns that) and does **not** mount Endpoint dual strip / protocol homes.
 */
export default function EndpointsFusionClient() {
  return (
    <div
      className="flex flex-col gap-4"
      data-testid="endpoints-fusion"
      data-endpoints-fusion=""
    >
      <div id="api-keys">
        <FusionBlock
          id="api-keys"
          title="API Keys"
          description="Access tokens and key policies"
          defaultOpen
        >
          <ApiManagerPageClient />
        </FusionBlock>
      </div>

      <div id="apis">
        <FusionBlock
          id="apis"
          title="Endpoints"
          description="Proxy base URLs, tunnels, and models"
          defaultOpen
        >
          <EndpointPageClient machineId="" />
        </FusionBlock>
      </div>

      <div id="api-catalog" data-endpoints-catalog="">
        <FusionBlock
          id="catalog"
          title="API Catalog"
          description="OpenAPI-style endpoint catalog"
          defaultOpen
        >
          <ApiEndpointsTab />
        </FusionBlock>
      </div>
    </div>
  );
}

type FusionBlockProps = {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Uncapped collapsible (no max-height clip) for large fused clients.
 * Conditional render keeps heavy trees unmounted when collapsed.
 */
function FusionBlock({
  id,
  title,
  description,
  defaultOpen = true,
  children,
}: FusionBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className="border border-black/5 dark:border-white/5 rounded-lg"
      data-endpoints-fusion-block={id}
      data-testid={`endpoints-fusion-block-${id}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3 text-left",
          "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors",
          "rounded-t-lg",
          !open && "rounded-b-lg"
        )}
        aria-expanded={open}
        aria-controls={`endpoints-fusion-panel-${id}`}
        id={`endpoints-fusion-heading-${id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-text-main truncate">{title}</span>
          {description ? (
            <span className="text-xs text-text-muted truncate hidden sm:inline">{description}</span>
          ) : null}
        </div>
        <span
          className="material-symbols-outlined text-[20px] text-text-muted transition-transform duration-200 shrink-0"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>
      {open ? (
        <div
          id={`endpoints-fusion-panel-${id}`}
          role="region"
          aria-labelledby={`endpoints-fusion-heading-${id}`}
          className="px-4 pb-4 pt-1"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
