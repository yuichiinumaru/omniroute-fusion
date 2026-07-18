"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

/**
 * Tier flow illustration for onboarding.
 *
 * Dark-only product theme (Tasks 0052/0053): always use the dark SVG.
 * Do not depend on next-themes — there is no NextThemesProvider and light mode
 * is not supported.
 */
export function TierFlowDiagram() {
  const t = useTranslations("onboarding");
  const src = "/images/tier-flow-dark.svg";

  return (
    <div className="flex flex-col items-center gap-3 my-4">
      <Image
        src={src}
        alt={t("tierFlowDiagramAlt")}
        width={800}
        height={420}
        priority
        className="w-full max-w-2xl rounded-lg border border-white/[0.06]"
      />
      <p className="text-xs text-text-muted max-w-xl text-center">
        Requests flow through your subscription quotas first, then pay-per-token cheap providers,
        then free-tier providers — automatic, zero-config.
      </p>
    </div>
  );
}
