"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  resolveStatusVocabulary,
  statusGlowClass,
} from "@/shared/constants/statusVocabulary";
import { cn } from "@/shared/utils/cn";

/**
 * Header chip when the fleet is in a degraded state.
 * Uses status vocabulary (degraded → warning + soft glow on this health surface only).
 */
export default function DegradationBadge() {
  const [isDegraded, setDegraded] = useState(false);
  const t = useTranslations("common"); // Or a specific namespace if needed
  const degraded = resolveStatusVocabulary("degraded");

  useEffect(() => {
    const checkDegradation = async () => {
      try {
        const res = await fetch("/api/health/degradation?summary=true");
        if (res.ok) {
          const data = await res.json();
          setDegraded(data.isDegraded);
        }
      } catch {
        // Ignore error
      }
    };

    checkDegradation();
    const interval = setInterval(checkDegradation, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!isDegraded) return null;

  return (
    <Link
      href="/dashboard/health"
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors border",
        degraded.bgClass,
        degraded.borderClass,
        degraded.textClass,
        "hover:bg-amber-500/20",
        statusGlowClass("degraded")
      )}
      title={t("warning")}
      data-status={degraded.id}
    >
      <span className="material-symbols-outlined text-[16px]">healing</span>
      <span className="text-xs font-semibold whitespace-nowrap">{degraded.label}</span>
    </Link>
  );
}
