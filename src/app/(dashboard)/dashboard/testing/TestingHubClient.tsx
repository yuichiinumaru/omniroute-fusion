"use client";

import Link from "next/link";
import { TESTING_HUB_GROUPS } from "@/shared/constants/testingHub";
import { cn } from "@/shared/utils/cn";

/**
 * Testing hub landing page (Task 0060 Option A).
 * Discovers playground, translator, search tools, batch, media generation lab, and
 * plugins via grouped link cards — does not embed heavy page content.
 * Lab routes (playground / translator / search-tools) are not sidebar items;
 * this hub is their primary in-product discovery surface.
 */
export default function TestingHubClient() {
  return (
    <div className="flex flex-col gap-8" data-testid="testing-hub">
      <p className="text-sm text-text-muted max-w-3xl">
        Launch experimental and verification surfaces: interactive labs, batch jobs, media
        generation, and plugins. Deep links to existing pages stay intact. Playground, Translator,
        and Search Tools are not listed in the sidebar — open them from this hub, the command
        palette, or a direct URL.
      </p>

      {TESTING_HUB_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`testing-group-${group.id}`} className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
                {group.icon}
              </span>
            </div>
            <div>
              <h2 id={`testing-group-${group.id}`} className="text-base font-semibold text-text-main">
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
                data-testing-hub-link={link.id}
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
                  {link.isLab ? (
                    <span className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                      lab
                    </span>
                  ) : null}
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
