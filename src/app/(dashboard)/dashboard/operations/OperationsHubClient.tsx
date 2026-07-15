"use client";

import Link from "next/link";
import { OPERATIONS_HUB_GROUPS } from "@/shared/constants/operationsHub";
import { cn } from "@/shared/utils/cn";

/**
 * Operations hub landing page (Task 0059 Option A).
 * Discovers API keys, endpoints/protocols, agents, and integrations via
 * grouped link cards — does not embed heavy page content.
 */
export default function OperationsHubClient() {
  return (
    <div className="flex flex-col gap-8" data-testid="operations-hub">
      <p className="text-sm text-text-muted max-w-3xl">
        Launch operational surfaces for API access, endpoint and protocol config, agent tooling,
        webhooks, traffic inspection, memory, and skills. Deep links to existing pages stay intact.
      </p>

      {OPERATIONS_HUB_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`ops-group-${group.id}`} className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
                {group.icon}
              </span>
            </div>
            <div>
              <h2 id={`ops-group-${group.id}`} className="text-base font-semibold text-text-main">
                {group.title}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">{group.description}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.links.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                data-operations-hub-link={link.id}
                className={cn(
                  "focus-ring group flex flex-col gap-2 rounded-xl border border-border bg-surface p-4",
                  "transition-colors hover:border-primary/30 hover:bg-bg-subtle"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[18px] text-text-muted group-hover:text-primary"
                    aria-hidden="true"
                  >
                    {link.icon}
                  </span>
                  <span className="text-sm font-medium text-text-main group-hover:text-primary">
                    {link.label}
                  </span>
                  <span
                    className="material-symbols-outlined ml-auto text-[16px] text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{link.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
