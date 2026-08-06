"use client";

// Task 0137 — Peak Hours placeholder for z.ai provider
// This is a research/discovery placeholder, NOT a pricing or quota feature.
import { Card } from "@/shared/components";
import { providerText } from "../providerPageHelpers";
import type { ProviderMessageTranslator } from "../providerPageHelpers";

interface PeakHoursPlaceholderCardProps {
  t: ProviderMessageTranslator;
}

export default function PeakHoursPlaceholderCard({ t }: PeakHoursPlaceholderCardProps) {
  const peakHoursTitle = providerText(t, "peakHoursTitle", "Peak Hours");
  const peakHoursDescription = providerText(
    t,
    "peakHoursDescription",
    "Analyze provider traffic patterns and peak hour congestion periods. This feature is currently in research phase."
  );
  const peakHoursResearchNote = providerText(
    t,
    "peakHoursResearchNote",
    "Research Prototype: Performance characteristics during high-volume periods are currently being studied using the z.ai core specifications."
  );
  const peakHoursExternalRefLabel = providerText(
    t,
    "peakHoursExternalRefLabel",
    "For further information and community research, refer to the external open source repository:"
  );
  const peakHoursDisclaimerTitle = providerText(
    t,
    "peakHoursDisclaimerTitle",
    "Non-functional Placeholder:"
  );
  const peakHoursDisclaimerText = providerText(
    t,
    "peakHoursDisclaimerText",
    "No billing rules, routing preferences, or database changes are applied by this component."
  );

  return (
    <div id="peak-hours">
      <Card>
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {peakHoursTitle}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              {peakHoursDescription}
            </p>
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="material-symbols-outlined text-sm text-amber-300">schedule</span>
              <p className="text-xs text-amber-200">
                {peakHoursResearchNote}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-muted">
                {peakHoursExternalRefLabel}
              </p>
              <a
                href="https://github.com/Icaruk/zai-peak-hours"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline w-fit"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
                github.com/Icaruk/zai-peak-hours
              </a>
            </div>
            <div className="mt-2 p-3 rounded-lg bg-surface-alt border border-border">
              <p className="text-xs text-text-muted">
                <strong>{peakHoursDisclaimerTitle}</strong> {peakHoursDisclaimerText}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
