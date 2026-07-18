"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import PageTabBar from "@/shared/components/PageTabBar";
import {
  SETTINGS_TABS,
  buildSettingsPath,
  isSettingsTabValue,
  pathToTabValue,
} from "@/shared/constants/settingsHub";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = pathToTabValue(pathname);

  const handleTabChange = useCallback(
    (value: string) => {
      // Parse, don't trust: PageTabBar is generic string; only known tabs navigate.
      if (!isSettingsTabValue(value)) return;
      router.push(buildSettingsPath(value));
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <PageTabBar
        variant="subnav"
        options={SETTINGS_TABS}
        value={activeTab}
        onChange={handleTabChange}
        syncSearchParam={false}
        aria-label="Settings tabs"
      />
      {children}
    </div>
  );
}
