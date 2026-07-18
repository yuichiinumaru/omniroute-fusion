"use client";

import FreeBudgetCard from "@/app/(dashboard)/dashboard/usage/components/FreeBudgetCard";
import ProvidersTopBar from "../providers/components/ProvidersTopBar";

export default function FreeTiersPage() {
  return (
    <div className="flex flex-col gap-4">
      <ProvidersTopBar currentPath="/dashboard/free-tiers" />
      <FreeBudgetCard />
    </div>
  );
}
